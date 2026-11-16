/* 💬 SERVIDOR 2026-11-16-a: EL CHAT DEL EQUIPO ADENTRO DEL PANEL (mejora 344; el dueño eligió 1A, 2A, 3C, 4A y 5B).
     1. Quién es quién: la clave de una persona (sin tildes ni mayúsculas, «ñ» = «n»), las conversaciones escritas siempre igual (`eq`,
        `p:<a>|<b>` en orden, `b:log|<v>`, `b:conta|<v>`) y quién está en cada una (Logística = `log`, Contabilidad = `conta`).
     2. `chatEnviar`: una fila por mensaje en la hoja «Chat», con la hora del SERVIDOR; sin repetir por id (caché y hoja); validado (no se
        escribe en una conversación ajena, el rol tiene que cuadrar, nada vacío); «=…» como texto; hasta 10 por vez; el candado PROPIO
        (del documento), nunca el de doPost; `ocupado` si no se consigue.
     3. `chatLeer`: a cada uno lo suyo (Mirian no recibe lo privado de Carola y Andrea ni la ventanilla de Carola; Logística ve todas las
        suyas y ninguna de Contabilidad); `desde`; la caché vencida → la hoja; el «visto» (una fila por persona, no crece) y quién vio qué.
     4. La lectura `list`: `chat:{v}` sin cambios, `chat:{v, n, t}` con lo sin leer de quien pide; sin leer NUNCA la hoja «Chat» (ni
        «Chat vistos»); sin caché, nada.
     5. `chatBorrar`: solo lo propio y hasta 10 minutos; queda «borrado» (sin texto ni fotos) y la lectura `desde` lo trae.
     6. Las fotos van a su carpeta PROPIA («Fotos chat MultiEspumas»), no a la de las entregas (el barrido de huérfanas las movería).
     7. 4A: lo de más de 90 días se borra (una vez por día al escribir, y el disparador `chatPodar`, que también tira las fotos viejas);
        `instalarDisparadores` lo instala. `antes`: los mensajes anteriores de una conversación, de la hoja.
     8. Nada del chat va a «Rechazos» ni toma el candado de doPost; `probarAntesDeImplementar` lo cuenta.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Google de mentira.
   Se corre:  node tests/test_servidor_chat.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); } };

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas, nombre, lecturas) {
  const datos = filas.map(f => f.slice());
  const cuenta = () => { if (lecturas) lecturas[nombre] = (lecturas[nombre] || 0) + 1; };
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getMaxRows: () => Math.max(1000, datos.length), insertRowsAfter: () => {},
    getDataRange: () => ({ getValues: () => { cuenta(); return datos.map(f => f.slice()); } }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); },
    deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => {
      if (typeof fila === 'string') return { setNumberFormat: () => {} };
      return {
        getValue: () => { cuenta(); return (datos[fila - 1] || [])[col - 1]; },
        setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; return { setFontWeight() {} }; },
        getValues: () => { cuenta(); const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
        setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
        setFontWeight: () => {}, setNumberFormat: () => {}
      };
    }
  };
}
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
const pasan = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props) {
  const lecturas = {};
  const sh = hacerPlanilla([HDR], 'Pedidos', lecturas), hojas = {}, P = Object.assign({}, props || {});
  const candado = { script: 0, doc: 0, docOcupado: false };
  const cache = {}, triggers = [];
  /* Drive de mentira: carpetas por nombre, archivos con su padre y su fecha */
  const drive = { carpetas: {}, archivos: {}, n: 0 };
  const carpeta = (nombre) => {
    if (drive.carpetas[nombre]) return drive.carpetas[nombre];
    const id = 'carpeta_' + nombre.replace(/\W+/g, '_'), c = { id, nombre, compartida: false,
      getId: () => id, setSharing: () => { c.compartida = true; },
      getFiles: () => { const L = Object.values(drive.archivos).filter(f => f.padre === id && !f.papelera); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; },
      createFile: (blob) => { const fid = 'foto' + String(++drive.n).padStart(12, '0'); const f = { id: fid, padre: id, nombre: blob.nombre, creada: RELOJ.ms, papelera: false,
        getId: () => fid, setSharing: () => {}, setTrashed: (v) => { f.papelera = !!v; }, getDateCreated: () => new Date(f.creada),
        getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return { getId: () => f.padre }; } }; } }; drive.archivos[fid] = f; return f; } };
    drive.carpetas[nombre] = c; return c;
  };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([], n, lecturas)) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: {
      getScriptLock: () => ({ waitLock() { candado.script++; }, tryLock() { candado.script++; return true; }, releaseLock() {} }),
      getDocumentLock: () => ({ waitLock() { candado.doc++; if (candado.docOcupado) throw new Error('ocupado'); }, tryLock() { candado.doc++; return !candado.docOcupado; }, releaseLock() {} })
    },
    CacheService: { getScriptCache: () => ({
      get: (k) => (Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null),
      getAll: (ks) => { const o = {}; ks.forEach(k => { if (Object.prototype.hasOwnProperty.call(cache, k)) o[k] = cache[k]; }); return o; },
      put: (k, v) => { cache[k] = String(v); }, putAll: (o) => { Object.keys(o).forEach(k => { cache[k] = String(o[k]); }); },
      remove: (k) => { delete cache[k]; }, removeAll: (ks) => { ks.forEach(k => delete cache[k]); } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, getContent() { return this._t; }, setMimeType() { return this; } }) },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'a' }, Permission: { VIEW: 'v' },
      getFolderById: (id) => { const c = Object.values(drive.carpetas).find(x => x.id === id); if (!c) throw new Error('no'); return c; },
      getFoldersByName: (n) => { let d = !drive.carpetas[n]; return { hasNext: () => !d, next: () => { d = true; return drive.carpetas[n]; } }; },
      createFolder: (n) => carpeta(n),
      getFileById: (id) => { const f = drive.archivos[id]; if (!f) throw new Error('no'); return f; }
    },
    Utilities: { formatDate: () => '20261116_100000', sleep: () => {}, base64Decode: (s) => Array.from(Buffer.from(s, 'base64')), newBlob: (b, tipo, nombre) => ({ b, tipo, nombre }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => { const t = { fn, getHandlerFunction: () => fn }; const fin = { create: () => { triggers.push(t); return t; } };
        return { timeBased: () => ({ after: () => fin, everyMinutes: (m) => { t.cada = m; return fin; }, everyDays: (d) => { t.dias = d; return { atHour: (h) => { t.hora = h; return fin; } }; } }) }; },
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  ctx.SCRIPT_VERSION = '2026-11-16-a';
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const chat = () => (hojas.Chat ? hojas.Chat._datos : null);
  const vistosHoja = () => (hojas['Chat vistos'] ? hojas['Chat vistos']._datos : null);
  return { ctx, sh, hojas, P, candado, cache, lecturas, post, chat, vistosHoja, drive, triggers, carpeta };
}
/* Las personas (claves) y los mensajes */
const MIR = 'mirian salazar', CAR = 'carola chavez', AND = 'andrea orias', EDU = 'eduardo anez';
let N = 0;
const M = (o) => Object.assign({ id: 'c' + (++N) + 'x' + Math.floor(Math.random() * 1e6), conv: 'eq', de: MIR, rol: 'v', dn: 'Mirian Salazar', txt: 'hola ' + N, ap: 'pc-1' }, o || {});
const pk = (a, b) => 'p:' + [a, b].sort().join('|');

seccion('1. Quién es quién', () => {
  poner('2026-11-16 10:00');
  const S = servidor({}), c = S.ctx;
  chk('1a. la clave de una persona: sin tildes, sin mayúsculas, «ñ» = «n», un espacio', c.chatPersona_('  Eduardo   Añez ') === EDU && c.chatPersona_('Carola Chávez') === CAR && c.chatPersona_('Fabián Godoy') === 'fabian godoy');
  chk('1b. el privado se escribe siempre igual (en orden)', c.chatConvNorm_('p:mirian salazar|eduardo anez') === 'p:eduardo anez|mirian salazar' && c.chatConvNorm_('p:Eduardo Añez|Mirian Salazar') === 'p:eduardo anez|mirian salazar');
  chk('1c. no vale un privado con uno mismo, con Bloki ni con el grupo; ni una ventanilla de Logística para Logística',
      c.chatConvNorm_('p:a b|a b') === '' && c.chatConvNorm_('p:bloki|mirian salazar') === '' && c.chatConvNorm_('b:log|log') === '' && c.chatConvNorm_('b:log|bloki') === '' && c.chatConvNorm_('x:hola') === '');
  chk('1d. ventanillas', c.chatConvNorm_('b:log|Mirian Salazar') === 'b:log|mirian salazar' && c.chatConvNorm_('b:conta|carola chavez') === 'b:conta|carola chavez');
  chk('1e. quién está en cada una: el grupo todos; el privado los dos; la ventanilla la vendedora y su puesto',
      c.chatVe_('eq', CAR) && c.chatVe_(pk(MIR, EDU), MIR) && c.chatVe_(pk(MIR, EDU), EDU) && !c.chatVe_(pk(MIR, EDU), CAR) &&
      c.chatVe_('b:log|' + MIR, MIR) && c.chatVe_('b:log|' + MIR, 'log') && !c.chatVe_('b:log|' + MIR, 'conta') && !c.chatVe_('b:log|' + MIR, CAR) && c.chatVe_('b:conta|' + MIR, 'conta'));
});

seccion('2. chatEnviar', () => {
  poner('2026-11-16 10:00');
  const S = servidor({});
  const a = M({ txt: 'Buen día equipo' }), b = M({ conv: pk(MIR, EDU), txt: '=Eduardo, ¿le hago el 10 %?', u: 1, ped: ['p123~11-188'] }), c = M({ conv: 'b:log|' + MIR, txt: '¿Sale mañana el #11-176?' });
  let r = S.post({ action: 'chatEnviar', msgs: [a, b, c] });
  chk('2a. tres mensajes nuevos → n:3, dup:0, con la hora del servidor de cada uno (en orden)', r.ok && r.n === 3 && r.dup === 0 && r.ts[a.id] === RELOJ.ms && r.ts[b.id] === RELOJ.ms + 1 && r.ts[c.id] === RELOJ.ms + 2 && !!r.v, r);
  const H = S.chat();
  chk('2b. la hoja «Chat» nace con sus encabezados', H && H[0].join('|') === 'id|ts|dia|hora|conv|de|rol|nombre|texto|fotos|pedidos|responde|marca|aparato|por', H && H[0]);
  chk('2c. cada mensaje es una fila con el día y la hora de Bolivia', H.length === 4 && H[1][2] === '2026-11-16' && H[1][3] === '10:00' && H[1][4] === 'eq' && H[1][5] === MIR && H[1][8] === 'Buen día equipo', H[1]);
  chk('2d. lo que empieza con «=» va con «\'» adelante; urgente y el pedido nombrado', H[2][8] === "'=Eduardo, ¿le hago el 10 %?" && H[2][12] === 'u' && H[2][10] === 'p123~11-188' && H[2][4] === pk(MIR, EDU), H[2]);
  chk('2e. escribir usó el candado del documento, nunca el de doPost', S.candado.doc >= 1 && S.candado.script === 0, S.candado);
  r = S.post({ action: 'chatEnviar', msgs: [a, b, c] });
  chk('2f. el reintento con los mismos ids no agrega nada (dup:3) y devuelve la hora de cada uno', r.ok && r.n === 0 && r.dup === 3 && S.chat().length === 4 && r.ts[a.id] > 0, r);
  Object.keys(S.cache).forEach(k => { if (/^chat_id_/.test(k)) delete S.cache[k]; });
  const d = M({ txt: 'otro' });
  r = S.post({ action: 'chatEnviar', msgs: [a, d] });
  chk('2g. sin la caché de ids, la hoja dice cuál ya estaba: n:1, dup:1', r.ok && r.n === 1 && r.dup === 1 && S.chat().length === 5, r);
  r = S.post({ action: 'chatEnviar', msgs: [
    M({ conv: pk(CAR, AND), de: MIR }),                      // un privado ajeno
    M({ conv: 'b:log|' + CAR, de: MIR }),                    // la ventanilla de otra
    M({ rol: 'l' }),                                         // dice ser logística sin serlo
    M({ de: 'log', rol: 'v' }),                              // logística con otro rol
    M({ txt: '   ' }),                                       // vacío
    M({ id: 'a b' }),                                        // id con espacios
    M({ conv: 'eq', de: 'bloki', rol: 'b' }),                // Bloki sin quién preguntó
    M({ conv: 'b:log|' + MIR, de: 'log', rol: 'l', dn: 'Logística · Ernesto', txt: 'Sí, va en el Carry' })
  ] });
  chk('2h. no se escribe en una conversación ajena, el rol tiene que cuadrar, nada vacío; lo bueno entra', r.ok && r.n === 1 && r.mal === 7 && r.malos.map(x => x.motivo).join(',').indexOf('conversación') >= 0, r);
  r = S.post({ action: 'chatEnviar', msgs: [M({ conv: pk(MIR, EDU), de: 'bloki', rol: 'b', por: MIR, dn: 'Bloki', txt: 'Mañana quedan 3 lugares' }), M({ conv: pk(CAR, EDU), de: 'bloki', rol: 'b', por: MIR, txt: 'x' })] });
  chk('2i. Bloki escribe donde está quien le preguntó (y no en otro lado)', r.n === 1 && r.mal === 1 && S.chat()[S.chat().length - 1][14] === MIR, r);
  r = S.post({ action: 'chatEnviar', msgs: [M({ txt: 'x'.repeat(1500) })] });
  chk('2j. el texto se corta en 1.000 letras', r.n === 1 && S.chat()[S.chat().length - 1][8].length === 1000);
  r = S.post({ action: 'chatEnviar', msgs: [M({ txt: 'renglón 1\r\nrenglón 2\u0007' })] });
  chk('2k. los renglones quedan; lo demás de control no', S.chat()[S.chat().length - 1][8] === 'renglón 1\nrenglón 2', S.chat()[S.chat().length - 1][8]);
  chk('2l. más de 10 por vez → demasiados; sin lista → sin_mensajes', S.post({ action: 'chatEnviar', msgs: Array.from({ length: 11 }, () => M()) }).error === 'demasiados' && S.post({ action: 'chatEnviar' }).error === 'sin_mensajes');
  S.candado.docOcupado = true;
  r = S.post({ action: 'chatEnviar', msgs: [M()] });
  chk('2m. sin el candado del documento → ocupado (la página reintenta)', r.ok === false && r.error === 'ocupado', r);
  S.candado.docOcupado = false;
  chk('2n. nada del chat fue a «Rechazos» ni tomó el candado de doPost', !S.hojas.Rechazos && S.candado.script === 0, Object.keys(S.hojas));
});

/* Un chat armado: Mirian, Carola, Andrea, Eduardo, Logística y Contabilidad */
function armado() {
  poner('2026-11-16 09:00');
  const S = servidor({});
  const env = (o) => { const m = M(o); const r = S.post({ action: 'chatEnviar', msgs: [m] }); pasan(1); return Object.assign(m, { t: r.ts[m.id] }); };
  const X = {
    eq1: env({ de: EDU, rol: 'd', dn: 'Eduardo Añez', txt: 'Arranca el Black Friday' }),
    eq2: env({ de: CAR, dn: 'Carola Chávez', txt: '@Mirian ¿tenés el catálogo?' }),
    pME: env({ conv: pk(MIR, EDU), txt: '¿Le hago el 10 %?' }),
    pCA: env({ conv: pk(CAR, AND), de: CAR, dn: 'Carola Chávez', txt: 'secreto de Carola y Andrea' }),
    lM: env({ conv: 'b:log|' + MIR, txt: '¿Sale el #11-176?' }),
    lC: env({ conv: 'b:log|' + CAR, de: CAR, txt: '¿El #11-192 sale de Banzer?' }),
    cM: env({ conv: 'b:conta|' + MIR, de: 'conta', rol: 'c', dn: 'Contabilidad', txt: 'El pago del #11-171 dice QR' }),
    lR: env({ conv: 'b:log|' + MIR, de: 'log', rol: 'l', dn: 'Logística · Ernesto', txt: 'Sí, va en el Carry' })
  };
  return { S, X, env };
}

seccion('3. chatLeer: a cada uno lo suyo', () => {
  const { S, X } = armado();
  const leer = (q, o) => S.post(Object.assign({ action: 'chatLeer', cq: q }, o || {}));
  let r = leer(MIR);
  const ids = (r) => (r.msgs || []).map(m => m.i);
  chk('3a. Mirian: el grupo, su privado con Eduardo, sus ventanillas', r.ok && [X.eq1, X.eq2, X.pME, X.lM, X.cM, X.lR].every(m => ids(r).indexOf(m.id) >= 0), ids(r));
  chk('3b. Mirian NO recibe lo privado de Carola y Andrea ni la ventanilla de Carola', ids(r).indexOf(X.pCA.id) < 0 && ids(r).indexOf(X.lC.id) < 0);
  r = leer('log');
  chk('3c. Logística: todas sus ventanillas (de Mirian y de Carola) y el grupo; nada de Contabilidad ni privados', [X.lM, X.lC, X.lR, X.eq1].every(m => ids(r).indexOf(m.id) >= 0) && ids(r).indexOf(X.cM.id) < 0 && ids(r).indexOf(X.pME.id) < 0 && ids(r).indexOf(X.pCA.id) < 0, ids(r));
  r = leer('conta');
  chk('3d. Contabilidad: la suya', ids(r).indexOf(X.cM.id) >= 0 && ids(r).indexOf(X.lM.id) < 0);
  r = leer(EDU);
  chk('3e. Eduardo: el grupo y SU privado con Mirian; no el de Carola y Andrea ni las ventanillas', ids(r).indexOf(X.pME.id) >= 0 && ids(r).indexOf(X.pCA.id) < 0 && ids(r).indexOf(X.lM.id) < 0, ids(r));
  const m0 = leer(MIR).msgs.find(m => m.i === X.pME.id);
  chk('3f. cada mensaje viaja chico: id, hora, conversación, quién, nombre, texto (sin el aparato)', m0 && m0.t === X.pME.t && m0.c === pk(MIR, EDU) && m0.d === MIR && m0.x === '¿Le hago el 10 %?' && m0.ap === undefined, m0);
  r = leer(MIR, { desde: X.lM.t });
  chk('3g. con `desde` solo lo que llegó después', ids(r).join(',') === [X.cM.id, X.lR.id].join(','), ids(r));
  chk('3h. sin quién → error', leer('').error === 'quien' && leer('bloki').error === 'quien');
  // la caché vencida: sale de la hoja
  Object.keys(S.cache).forEach(k => delete S.cache[k]);
  const l0 = S.lecturas.Chat || 0;
  r = leer(MIR);
  chk('3i. sin caché, lo arma de las últimas filas de la hoja (y lo deja en la caché)', r.ok && r.msgs.length === 6 && (S.lecturas.Chat || 0) > l0 && !!S.cache.chat_mv && !!S.cache.chat_ult, r.msgs.length);
  const l1 = S.lecturas.Chat;
  leer(CAR);
  chk('3j. la lectura siguiente sale de la caché (no lee la hoja)', S.lecturas.Chat === l1, [l1, S.lecturas.Chat]);
  // el «visto»
  const v0 = S.cache.chat_v;
  r = leer(MIR, { visto: { [pk(MIR, EDU)]: X.pME.t, eq: X.eq2.t, [pk(CAR, AND)]: X.pCA.t } });
  let VH = S.vistosHoja();
  chk('3k. el visto: una fila por persona, solo de conversaciones suyas', VH && VH.length === 2 && VH[1][0] === MIR && JSON.parse(VH[1][1]).eq === X.eq2.t && JSON.parse(VH[1][1])[pk(CAR, AND)] === undefined, VH);
  chk('3l. el visto cambia la versión de todo (la de `list`)', S.cache.chat_v && S.cache.chat_v !== v0);
  leer(MIR, { visto: { eq: X.eq1.t } });
  leer(MIR, { visto: { eq: X.eq2.t + 5 } });
  leer(EDU, { visto: { [pk(MIR, EDU)]: X.pME.t } });
  VH = S.vistosHoja();
  chk('3m. no crece: Mirian sigue en UNA fila (y el visto nunca va para atrás); Eduardo, otra', VH.length === 3 && JSON.parse(VH[1][1]).eq === X.eq2.t + 5, VH);
  r = leer(MIR);
  chk('3n. quién vio qué: en el privado, Eduardo; en el grupo, Mirian', r.vistos[pk(MIR, EDU)][EDU] === X.pME.t && r.vistos.eq[MIR] === X.eq2.t + 5 && !r.vistos[pk(CAR, AND)], r.vistos);
  r = leer(CAR);
  chk('3o. Carola no recibe los vistos del privado de Mirian con Eduardo', !r.vistos[pk(MIR, EDU)] && r.vistos.eq && r.vistos.eq[MIR] > 0, r.vistos);
  chk('3p. nada de esto tomó el candado de doPost', S.candado.script === 0);
});

seccion('4. La lectura `list` lleva lo sin leer, sin leer la hoja', () => {
  const { S, X, env } = armado();
  S.post({ action: 'chatLeer', cq: MIR, visto: { eq: X.eq1.t } });   // Mirian vio el primero del grupo
  const lst = (o) => S.post(Object.assign({ action: 'list' }, o || {}));
  const c0 = S.lecturas.Chat || 0, cv0 = S.lecturas['Chat vistos'] || 0;
  let r = lst({ cq: MIR });
  chk('4a. Mirian: sin leer = lo de los otros que no vio (Carola en el grupo, Contabilidad, Logística) y la hora del último', r.chat && r.chat.n === 3 && r.chat.t === X.lR.t && !!r.chat.v, r.chat);
  chk('4b. la lectura NO leyó la hoja «Chat» ni «Chat vistos»', (S.lecturas.Chat || 0) === c0 && (S.lecturas['Chat vistos'] || 0) === cv0, S.lecturas);
  const v = r.chat.v;
  r = lst({ cq: MIR, cv: v });
  chk('4c. con la misma versión: solo `v` (30 letras)', r.chat && r.chat.v === v && r.chat.n === undefined && JSON.stringify(r.chat).length < 40, r.chat);
  r = lst({ cq: EDU });
  chk('4d. Eduardo: lo del grupo de Carola y el privado de Mirian', r.chat.n === 2, r.chat);
  r = lst({ cq: 'log' });
  chk('4e. Logística: las preguntas de Mirian y Carola (lo suyo no) y el grupo', r.chat.n === 4, r.chat);
  r = lst({});
  chk('4f. sin quién: solo la versión', r.chat && r.chat.n === undefined);
  env({ conv: pk(MIR, EDU), de: EDU, rol: 'd', dn: 'Eduardo Añez', txt: 'Dale' });
  r = lst({ cq: MIR, cv: v });
  chk('4g. llega un mensaje: cambia la versión y suma', r.chat.v !== v && r.chat.n === 4, r.chat);
  const c1 = S.lecturas.Chat || 0;
  delete S.cache.chat_ult;
  r = lst({ cq: MIR });
  chk('4h. con la caché de mensajes incompleta: `x` (la página lee con chatLeer) y la hoja tampoco', r.chat && r.chat.x === 1 && (S.lecturas.Chat || 0) === c1, r.chat);
  Object.keys(S.cache).forEach(k => delete S.cache[k]);
  r = lst({ cq: MIR });
  chk('4i. sin caché, la lectura no lleva `chat` (y la hoja no se lee)', r.ok && r.chat === undefined && (S.lecturas.Chat || 0) === c1, r.chat);
  chk('4j. y los pedidos viajan igual', Array.isArray(r.pedidos));
  chk('4k. lo que Bloki le contestó a Mirian no le suma a ella', (() => {
    const S2 = armado().S; S2.post({ action: 'chatLeer', cq: MIR, visto: { eq: RELOJ.ms + 1e6 } });
    const r1 = S2.post({ action: 'list', cq: MIR }).chat.n;
    S2.post({ action: 'chatEnviar', msgs: [M({ de: 'bloki', rol: 'b', por: MIR, dn: 'Bloki', txt: 'Mañana quedan 3 lugares' })] });
    const r2 = S2.post({ action: 'list', cq: MIR }).chat.n, r3 = S2.post({ action: 'list', cq: CAR }).chat.n;
    const r0 = S2.post({ action: 'list', cq: CAR + 'x' });
    return r1 === r2 && r3 >= 1; })());
});

seccion('5. chatBorrar', () => {
  const { S, X, env } = armado();
  let r = S.post({ action: 'chatBorrar', id: X.lM.id, cq: CAR });
  chk('5a. lo de otro no se borra', r.ok === false && r.error === 'no_es_tuyo', r);
  r = S.post({ action: 'chatBorrar', id: X.lM.id, cq: MIR });
  const f = S.chat().find(x => x[0] === X.lM.id);
  chk('5b. lo propio sí: sin texto, con la marca de borrado', r.ok && f[8] === '' && /^x\d+$/.test(f[12]), f);
  const lee = S.post({ action: 'chatLeer', cq: 'log', desde: X.lR.t });
  const b = lee.msgs.find(m => m.i === X.lM.id);
  chk('5c. la lectura `desde` trae el borrado (para que desaparezca en la pantalla de los demás)', b && b.bt > 0 && b.x === '', lee.msgs);
  const n = env({ txt: 'me equivoqué' });
  pasan(12);
  r = S.post({ action: 'chatBorrar', id: n.id, cq: MIR });
  chk('5d. pasados los 10 minutos, no', r.ok === false && r.error === 'tarde', r);
  r = S.post({ action: 'chatBorrar', id: X.lM.id, cq: MIR });
  chk('5e. borrar dos veces: ok, ya estaba', r.ok && r.ya === 1, r);
  chk('5f. un borrado no cuenta como sin leer', (() => { const c = S.post({ action: 'list', cq: 'log' }).chat; const c2 = (() => { S.post({ action: 'chatLeer', cq: 'log', visto: {} }); return S.post({ action: 'list', cq: 'log' }).chat; })(); return c.n === c2.n; })());
});

seccion('6. Las fotos del chat, en su carpeta', () => {
  poner('2026-11-16 10:00');
  const S = servidor({});
  const png = 'data:image/jpeg;base64,' + Buffer.from('foto de mentira').toString('base64');
  let r = S.post({ action: 'chatFoto', dataUrl: png, cq: MIR });
  const f = r.ok && S.drive.archivos[r.fotoId];
  chk('6a. la foto va a «Fotos chat MultiEspumas» (no a la de las entregas) y queda compartida', r.ok && f && f.padre === S.drive.carpetas['Fotos chat MultiEspumas'].id && !S.drive.carpetas['Fotos entrega MultiEspumas'] && S.drive.carpetas['Fotos chat MultiEspumas'].compartida, r);
  chk('6b. el id de la carpeta queda en las propiedades', S.P.CHAT_FOTOS_FOLDER_ID === S.drive.carpetas['Fotos chat MultiEspumas'].id);
  chk('6c. sin imagen → formato', S.post({ action: 'chatFoto', dataUrl: 'hola' }).error === 'formato');
  const m = M({ txt: '', fotos: [r.fotoId] });
  r = S.post({ action: 'chatEnviar', msgs: [m] });
  chk('6d. un mensaje solo con la foto entra', r.n === 1 && S.chat()[1][9] === m.fotos[0]);
  r = S.post({ action: 'chatBorrar', id: m.id, cq: MIR });
  chk('6e. borrar el mensaje manda su foto a la papelera', r.ok && S.drive.archivos[m.fotos[0]].papelera === true);
  chk('6f. y no tomó el candado de doPost', S.candado.script === 0);
});

seccion('7. 4A: 90 días, y los anteriores', () => {
  poner('2026-08-01 10:00');
  const S = servidor({});
  const viejo = M({ txt: 'de agosto' }); S.post({ action: 'chatEnviar', msgs: [viejo] });
  const png = 'data:image/jpeg;base64,' + Buffer.from('x').toString('base64');
  const fv = S.post({ action: 'chatFoto', dataUrl: png, cq: MIR }).fotoId;
  poner('2026-11-16 10:00');
  const nuevaF = S.post({ action: 'chatFoto', dataUrl: png, cq: MIR }).fotoId;
  const nuevo = M({ txt: 'de noviembre' }); S.post({ action: 'chatEnviar', msgs: [nuevo] });
  chk('7a. al escribir (una vez por día) se borran las filas de más de 90 días', S.chat().length === 2 && S.chat()[1][0] === nuevo.id, S.chat().map(x => x[0]));
  S.post({ action: 'chatEnviar', msgs: [M({ txt: 'otro' })] });
  chk('7b. el mismo día no se vuelve a podar (CHAT_PODA)', S.P.CHAT_PODA === '2026-11-16');
  const r = S.ctx.chatPodar();
  chk('7c. el disparador tira las fotos del chat de más de 90 días (y deja las nuevas)', r.fotos === 1 && S.drive.archivos[fv].papelera && !S.drive.archivos[nuevaF].papelera, r);
  chk('7d. y deja anotado qué hizo', /"fotos":1/.test(S.P.CHAT_PODA_ULTIMO || ''), S.P.CHAT_PODA_ULTIMO);
  S.ctx.instalarDisparadores();
  const t = S.triggers.find(x => x.fn === 'chatPodar');
  chk('7e. instalarDisparadores instala chatPodar una vez por día (4 am)', t && t.dias === 1 && t.hora === 4 && S.triggers.filter(x => x.fn === 'chatPodar').length === 1, t);
  S.ctx.instalarDisparadores();
  chk('7f. instalarlo dos veces no lo duplica', S.triggers.filter(x => x.fn === 'chatPodar').length === 1);
  // los anteriores
  poner('2026-11-16 11:00');
  const S2 = servidor({});
  const ids = [];
  for (let i = 0; i < 130; i++) { const m = M({ conv: pk(MIR, EDU), txt: 'msj ' + i }); ids.push(m.id); S2.post({ action: 'chatEnviar', msgs: [m] }); pasan(1); }
  S2.post({ action: 'chatEnviar', msgs: [M({ conv: pk(CAR, AND), de: CAR, txt: 'ajeno' })] });
  const t0 = S2.chat()[S2.chat().length - 3][1];
  let a = S2.post({ action: 'chatLeer', cq: MIR, conv: pk(MIR, EDU), antes: t0 });
  chk('7g. «ver los anteriores»: de a 100, los más nuevos de antes de esa hora, en orden', a.ok && a.msgs.length === 100 && a.mas === true && a.msgs[99].x === 'msj 127' && a.msgs[0].x === 'msj 28', [a.msgs.length, a.mas, a.msgs[0] && a.msgs[0].x, a.msgs[99] && a.msgs[99].x]);
  a = S2.post({ action: 'chatLeer', cq: CAR, conv: pk(MIR, EDU), antes: t0 });
  chk('7h. los anteriores de una conversación ajena, no', a.ok === false);
});

seccion('8. probarAntesDeImplementar y lo que no se toca', () => {
  poner('2026-11-16 10:00');
  const S = servidor({});
  const L = [];
  S.ctx.probarChat_((t) => L.push('✓ ' + t), (t) => L.push('⚠ ' + t));
  chk('8a. sin hoja: «se arma sola con el primer mensaje»; sin el disparador, lo dice', L.some(x => /todavía no existe/.test(x)) && L.some(x => /chatPodar/.test(x)), L);
  S.post({ action: 'chatEnviar', msgs: [M()] });
  S.ctx.instalarDisparadores();
  const L2 = [];
  S.ctx.probarChat_((t) => L2.push('✓ ' + t), (t) => L2.push('⚠ ' + t));
  chk('8b. con la hoja: cuántos mensajes; con el disparador, nada que decir', L2.some(x => /1 mensaje/.test(x)) && !L2.some(x => /^⚠/.test(x)), L2);
  chk('8c. la hoja «Pedidos» no se tocó', S.sh._datos.length === 1);
  const r = S.post({ action: 'chatLeer', cq: MIR, visto: { 'p:hacker|x': 1e15 } });
  chk('8d. un visto de una conversación ajena no se anota', r.ok && !(S.vistosHoja() && S.vistosHoja().length > 1));
  chk('8e. el «no» de una acción del chat no se anota en «Rechazos»', (() => { S.candado.docOcupado = true; const x = S.post({ action: 'chatEnviar', msgs: [M()] }); S.candado.docOcupado = false; return x.error === 'ocupado' && !S.hojas.Rechazos; })());
});

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
