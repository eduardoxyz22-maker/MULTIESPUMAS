/* 🏬 SERVIDOR 2026-11-14-b: LA TIENDA DEL MALL (mejoras 252/253, 266, 267 y 277; el dueño las aprobó para Ventura Mall).
     1. `mallToque` / `mallLeer`: los toques del mostrador en la hoja «Mall», sin repetir por id (caché + hoja), validados, con un candado
        PROPIO (el del documento, nunca el de doPost); `mallLeer` por rango (tope 62 días) y lo de HOY desde la caché.
     2. `__cupos_extra__`: el portero suma los cupos de más al límite del día y turno (no abre un domingo); la fila va con sello (`juntar`) igual
        que `__caja_tienda__`; las filas del sistema no cuentan como pedidos.
     3. `apartarCupo` / `soltarCupo`: un lugar apartado 10 minutos; la lectura lo dice (`apartados`); el portero lo cuenta como ocupado para los
        DEMÁS, el guardado con `aparto` no cuenta el suyo y lo suelta; vence solo.
     4. La venta grande: el alta de una venta del equipo desde VENTA_GRANDE_BS (8.000) le llega UNA vez al PRIMERO de WA_DUENO (`venta_grande`),
        con quién, la tienda, el monto y los productos. Sin Eduardo, ROHO, internos, ATC, RPT ni borradores.
     5. La versión.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Google, Meta y Kommo de mentira.
   Se corre:  node tests/test_servidor_mall.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
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
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => { cuenta(); return (datos[fila - 1] || [])[col - 1]; },
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; return { setFontWeight() {} }; },
      getValues: () => { cuenta(); const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
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
function servidor(props, op) {
  op = op || {};
  const lecturas = {};
  const sh = hacerPlanilla([HDR], 'Pedidos', lecturas), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], n: 0 }, kommo = { llamadas: [], usuarios: [] };
  const candado = { script: 0, doc: 0, scriptOcupado: false };
  const cache = {}, triggers = [];
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : JSON.stringify(body)) });
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([], n, lecturas)) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com/.test(url)) {
        kommo.llamadas.push({ url, o });
        if (/\/users/.test(url)) return res(200, { _embedded: { users: kommo.usuarios } });
        return res(204);
      }
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      return res(200, { messages: [{ id: 'wamid.' + (++meta.n) }] });
    } },
    LockService: {
      getScriptLock: () => ({ waitLock() { candado.script++; if (candado.scriptOcupado) throw new Error('ocupado'); }, tryLock() { candado.script++; return !candado.scriptOcupado; }, releaseLock() {} }),
      getDocumentLock: () => ({ waitLock() { candado.doc++; }, tryLock() { candado.doc++; return true; }, releaseLock() {} })
    },
    CacheService: { getScriptCache: () => ({
      get: (k) => (Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null),
      getAll: (ks) => { const o = {}; ks.forEach(k => { if (Object.prototype.hasOwnProperty.call(cache, k)) o[k] = cache[k]; }); return o; },
      put: (k, v) => { cache[k] = String(v); }, putAll: (o) => { Object.keys(o).forEach(k => { cache[k] = String(o[k]); }); },
      remove: (k) => { delete cache[k]; }, removeAll: (ks) => { ks.forEach(k => delete cache[k]); } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, getContent() { return this._t; }, setMimeType() { return this; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const mall = () => (hojas.Mall ? hojas.Mall._datos : null);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  return { ctx, sh, hojas, P, meta, kommo, candado, cache, lecturas, post, cargar, mall, salen };
}
let N = 0;
const HOY = '2026-11-18', MIE = '2026-11-18', JUE = '2026-11-19', DOM = '2026-11-22', AYER = '2026-11-17';
const PED = (o) => { N++; return Object.assign({ id: 'p' + N, fecha: JUE, oc: '11-' + (100 + N), vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + N,
  productos: [{ desc: 'COLCHON TITANIO ICE', medida: '140x190', codigo: 'CH1220', cant: 1, precio: 5000 }], celular: '700000' + String(10 + N).slice(-2),
  turno: 'AM', zona: 'Norte', direccion: 'Calle ' + N, maps: '', pagado: false, saldo: 5000, ts: RELOJ.ms, metodoPago: '', observaciones: '', estado: '',
  entregado: false, vehiculo: '', chofer: '', garantia: '', nota: '', acuenta: 0, facturarA: '', nit: '', nroDia: 0, verificado: false, fotos: [] }, o || {}); };
const TQ = (o) => Object.assign({ id: 'tq-' + (++N), ts: RELOJ.ms, tienda: 'Ventura Mall', v: 'Fabián Godoy', k: 'atiendo', r: '', m: '', ref: '', ap: 'pc-mall' }, o || {});

/* ══ 1. Los toques del mostrador ══ */
seccion('1. mallToque / mallLeer', () => {
  poner(HOY + ' 11:00');
  const S = servidor({});
  const a = TQ({ k: 'llegue' }), b = TQ({ k: 'atiendo', r: 'compró', m: 'precio', ref: 'COT 11-001' }), c = TQ({ k: 'miro', v: '=Fabián' });
  let r = S.post({ action: 'mallToque', toques: [a, b, c] });
  chk('1a. tres toques nuevos → n:3, dup:0', r.ok && r.n === 3 && r.dup === 0 && r.mal === 0, r);
  const M = S.mall();
  chk('1b. la hoja «Mall» nace con sus encabezados (la medida, al final)', M && M[0].join('|') === 'id|ts|dia|hora|tienda|vendedor|tipo|resultado|motivo|ref|aparato|medida', M && M[0]);
  chk('1c. cada toque es una fila, con el día y la hora de Bolivia', M.length === 4 && M[1][2] === HOY && M[1][3] === '11:00' && M[2][7] === 'compró' && M[2][9] === 'COT 11-001', M.slice(1, 3));
  chk('1d. lo que empieza con «=» va con «\'» adelante (no es una fórmula)', M[3][5] === "'=Fabián", M[3][5]);
  chk('1e. escribir usó el candado PROPIO (del documento), nunca el de doPost', S.candado.doc >= 1 && S.candado.script === 0, S.candado);
  r = S.post({ action: 'mallToque', toques: [a, b, c] });
  chk('1f. el reintento con los mismos ids no agrega nada (dup:3)', r.ok && r.n === 0 && r.dup === 3 && S.mall().length === 4, r);
  Object.keys(S.cache).forEach(k => { if (/^mall_id_/.test(k)) delete S.cache[k]; });
  r = S.post({ action: 'mallToque', toques: [a, b, TQ({ k: 'fin' })] });
  chk('1g. sin la caché de ids, la hoja dice cuáles ya estaban: n:1, dup:2', r.ok && r.n === 1 && r.dup === 2 && S.mall().length === 5, r);
  const d = TQ({ k: 'pausa' });
  r = S.post({ action: 'mallToque', toques: [d, d] });
  chk('1h. el mismo id dos veces en un envío entra UNA', r.n === 1 && r.dup === 1, r);
  r = S.post({ action: 'mallToque', toques: [TQ({ k: 'baile' }), TQ({ id: '' }), TQ({ ts: RELOJ.ms - 3 * 86400000 }), TQ({ ts: RELOJ.ms + 3 * 86400000 }), TQ({ k: 'esmio' })] });
  chk('1i. tipo desconocido, sin id y hora corrida más de 2 días no entran (y se dicen); el bueno sí', r.ok && r.n === 1 && r.mal === 4 && r.malos.length === 4 && r.malos[0].motivo.indexOf('tipo') >= 0, r);
  chk('1j. más de 50 por vez → demasiados; sin lista → sin_toques', S.post({ action: 'mallToque', toques: Array.from({ length: 51 }, () => TQ()) }).error === 'demasiados' &&
      S.post({ action: 'mallToque' }).error === 'sin_toques');
  chk('1k. textos recortados a 80', (() => { const t = TQ({ m: 'x'.repeat(200) }); S.post({ action: 'mallToque', toques: [t] }); const f = S.mall()[S.mall().length - 1]; return f[8].length === 80; })());
  /* mallLeer de hoy: de la caché */
  r = S.post({ action: 'mallLeer', desde: HOY, hasta: HOY });
  let n0 = r.toques.length;
  chk('1l. mallLeer de hoy trae todo lo de hoy, en orden de hora, con {id, ts, dia, hora, tienda, v, k, r, m, ref, ap, medida}', r.ok && n0 === 7 && r.toques.every(t => t.dia === HOY) &&
      ['id','ts','dia','hora','tienda','v','k','r','m','ref','ap','medida'].every(k => k in r.toques[0]) && r.toques[2].v === '=Fabián', r.toques.slice(0, 2));
  const antes = S.lecturas.Mall || 0;
  r = S.post({ action: 'mallLeer', desde: HOY });
  chk('1m. la segunda lectura de hoy sale de la caché: ni una lectura de la hoja', r.toques.length === n0 && (S.lecturas.Mall || 0) === antes, { antes, despues: S.lecturas.Mall });
  pasan(1);
  S.post({ action: 'mallToque', toques: [TQ({ k: 'volvi' })] });
  const antes2 = S.lecturas.Mall || 0;
  r = S.post({ action: 'mallLeer', desde: HOY, hasta: HOY });
  chk('1n. un toque nuevo entra a la caché de hoy: la lectura lo trae sin leer la hoja', r.toques.length === n0 + 1 && r.toques[r.toques.length - 1].k === 'volvi' && (S.lecturas.Mall || 0) === antes2,
      { n: r.toques.length, lect: (S.lecturas.Mall || 0) - antes2 });
  /* una caché vieja (armada con otra versión) no se usa */
  S.cache.mall_hoy = JSON.stringify({ d: HOY, v: 'vieja', n: 1 }); S.cache.mall_hoy_0 = '[]';
  r = S.post({ action: 'mallLeer', desde: HOY, hasta: HOY });
  chk('1o. una caché armada con una versión vieja no vale: se lee la hoja', r.toques.length === n0 + 1, r.toques.length);
  /* la medida que no había */
  const md = TQ({ k: 'fin', r: 'no compró', m: 'no había la medida', medida: '140x190' }), md2 = TQ({ k: 'fin', m: 'no había la medida', medida: '  160 x 200 especial de más  ' });
  S.post({ action: 'mallToque', toques: [md, md2] });
  const fm = S.mall().find(f => f[0] === md.id), fm2 = S.mall().find(f => f[0] === md2.id);
  r = S.post({ action: 'mallLeer', desde: HOY, hasta: HOY });
  const lm = r.toques.find(t => t.id === md.id), lm2 = r.toques.find(t => t.id === md2.id);
  chk('1o2. `medida` va en la última columna y vuelve en mallLeer (de la caché y de la hoja); a lo sumo 15 letras; sin medida, vacía',
      fm && fm[11] === '140x190' && fm2[11] === '160 x 200 espec' && lm && lm.medida === '140x190' && lm2.medida === '160 x 200 espec' && r.toques.find(t => t.id === a.id).medida === '' &&
      S.ctx.mallDeFila_(fm).medida === '140x190', [fm && fm[11], fm2 && fm2[11], lm && lm.medida]);
  n0 += 2;
  /* una hoja «Mall» de antes de la medida: se le pone el encabezado */
  const Vj = servidor({});
  Vj.hojas.Mall = (function () { const h = Vj.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Mall'); h._datos.push(['id','ts','dia','hora','tienda','vendedor','tipo','resultado','motivo','ref','aparato']); return h; })();
  Vj.post({ action: 'mallToque', toques: [TQ({ medida: '90x190' })] });
  chk('1o3. una hoja armada antes de la columna «medida» recibe el encabezado y la medida', Vj.mall()[0][11] === 'medida' && Vj.mall()[1][11] === '90x190', Vj.mall());
  /* tienda */
  S.post({ action: 'mallToque', toques: [TQ({ tienda: 'Mia Plaza', k: 'llegue' })] });
  r = S.post({ action: 'mallLeer', desde: HOY, hasta: HOY, tienda: 'ventura mall' });
  chk('1p. `tienda` filtra sin mayúsculas', r.toques.length === n0 + 1 && r.toques.every(t => t.tienda === 'Ventura Mall'), r.toques.length);
  /* días de antes */
  const viejo = TQ({ ts: Date.parse(AYER + 'T18:30:00-04:00'), k: 'fin' });
  S.post({ action: 'mallToque', toques: [viejo] });
  r = S.post({ action: 'mallLeer', desde: AYER, hasta: AYER });
  chk('1q. un toque de ayer (llegó hoy) sale en la lectura de ayer, con día y hora de su ts', r.ok && r.toques.length === 1 && r.toques[0].id === viejo.id && r.toques[0].hora === '18:30', r.toques);
  r = S.post({ action: 'mallLeer', desde: AYER, hasta: HOY });
  chk('1r. de ayer a hoy: los dos días', r.toques.length === n0 + 3 && r.toques[0].id === viejo.id, r.toques.length);
  chk('1s. más de 62 días → rango; fechas mal → fechas', S.post({ action: 'mallLeer', desde: '2026-08-01', hasta: HOY }).error === 'rango' &&
      S.post({ action: 'mallLeer', desde: HOY, hasta: AYER }).error === 'fechas' && S.post({ action: 'mallLeer', desde: '18/11/2026' }).error === 'fechas');
  chk('1t. mallLeer no toma ningún candado', S.candado.script === 0);
  /* con la clave del equipo */
  const K = servidor({ PANEL_KEY: 'clave-x' });
  chk('1u. sin la clave del equipo: error clave (toque y lectura)', K.post({ action: 'mallToque', toques: [TQ()] }).error === 'clave' && K.post({ action: 'mallLeer' }).error === 'clave' &&
      K.post({ action: 'mallToque', key: 'clave-x', toques: [TQ()] }).n === 1);
  /* poda: lo de más de 400 días se va, una vez por día */
  const Pd = servidor({});
  Pd.post({ action: 'mallToque', toques: [TQ()] });
  Pd.mall().splice(1, 0, ['viejo-1', RELOJ.ms - 500 * 86400000, '2025-07-01', '10:00', 'X', 'Y', 'llegue', '', '', '', ''], ['viejo-2', RELOJ.ms - 450 * 86400000, '2025-08-01', '10:00', 'X', 'Y', 'llegue', '', '', '', '']);
  Pd.P.MALL_PODA = '';
  Pd.post({ action: 'mallToque', toques: [TQ()] });
  chk('1v. lo de más de 400 días se borra al escribir (una vez por día)', Pd.mall().length === 3 && Pd.mall().every(f => f[0] !== 'viejo-1' && f[0] !== 'viejo-2') && Pd.P.MALL_PODA === HOY, Pd.mall().map(f => f[0]));
});

/* ══ 2. Los cupos de más ══ */
seccion('2. __cupos_extra__ y el portero', () => {
  poner(HOY + ' 11:00');
  const S = servidor({});
  S.cargar(Array.from({ length: 12 }, () => PED({ fecha: JUE, turno: 'AM' })));
  let r = S.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM' }) });
  chk('2a. con 12 a la mañana: turno lleno (12)', r.ok === false && r.error === 'cupos_llenos' && r.cupos === 12 && r.usados === 12, r);
  r = S.post({ action: 'save', pedido: PED({ id: '__cupos_extra__', fecha: '', oc: '', vendedor: '', cliente: '', productos: [], celular: '', turno: '', observaciones: JSON.stringify({ v: 1, d: { [JUE + '|AM']: 2, [DOM + '|AM']: 5, [JUE + '|PM']: 50, 'mal': 3 } }) }), juntar: true });
  chk('2b. la fila __cupos_extra__ se guarda (fila del sistema, con sello)', r.ok, r);
  let p1 = PED({ fecha: JUE, turno: 'AM' });
  r = S.post({ action: 'save', pedido: p1 });
  chk('2c. con 2 de más a la mañana: entra el 13 (N° 13 del día)', r.ok && r.pedido.nroDia === 13, r.error || r.pedido.nroDia);
  r = S.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM' }) });
  chk('2d. …y el 14', r.ok, r.error);
  r = S.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM' }) });
  chk('2e. el 15 no: turno lleno con cupos 14 y extra 2', r.ok === false && r.error === 'cupos_llenos' && r.cupos === 14 && r.extra === 2, r);
  r = S.post({ action: 'save', pedido: PED({ fecha: DOM, turno: 'AM' }) });
  chk('2f. el domingo sigue cerrado aunque tenga cupos de más', r.ok === false && r.error === 'cupos_llenos' && r.cupos === 0, r);
  const ext = S.ctx.cuposExtraDeTexto_(JSON.stringify({ v: 1, d: { [JUE + '|PM']: 50, [JUE + '|am']: '3', x: 2, [JUE + '|AM ']: 4 } }));
  chk('2g. el JSON se lee con cuidado: tope 20, turno en mayúscula, claves raras afuera', ext[JUE + '|PM'] === 20 && ext[JUE + '|AM'] === 3 && Object.keys(ext).length === 2, ext);
  /* con sello y juntar */
  const fila = S.sh._datos.find(f => f[0] === '__cupos_extra__'), rev = fila[29];
  r = S.post({ action: 'save', pedido: PED({ id: '__cupos_extra__', fecha: '', oc: '', vendedor: '', cliente: '', productos: [], celular: '', turno: '', observaciones: '{"v":1,"d":{}}', rev: rev - 1 }), juntar: true });
  chk('2h. __cupos_extra__ con `juntar` y un sello viejo → conflicto con la fila actual', r.ok === false && r.error === 'conflicto' && r.pedido && r.pedido.id === '__cupos_extra__', r.error);
  r = S.post({ action: 'save', pedido: PED({ id: '__caja_tienda__', fecha: '', oc: '', vendedor: '', cliente: '', productos: [], celular: '', turno: '', observaciones: '{"v":1}' }), juntar: true });
  const revC = S.sh._datos.find(f => f[0] === '__caja_tienda__')[29];
  const r2 = S.post({ action: 'save', pedido: PED({ id: '__caja_tienda__', fecha: '', oc: '', vendedor: '', cliente: '', productos: [], celular: '', turno: '', observaciones: '{"v":2}', rev: revC + 5 }), juntar: true });
  chk('2i. __caja_tienda__ también: nace bien y con un sello que no es el suyo → conflicto', r.ok && r2.error === 'conflicto', [r.error, r2.error]);
  chk('2j. las dos en SISTEMA_JUNTA_OPCIONAL', S.ctx.SISTEMA_JUNTA_OPCIONAL['__cupos_extra__'] === 1 && S.ctx.SISTEMA_JUNTA_OPCIONAL['__caja_tienda__'] === 1);
  /* una fila del sistema con fecha no cuenta como pedido */
  const T = servidor({});
  T.cargar(Array.from({ length: 11 }, () => PED({ fecha: JUE, turno: 'AM' })));
  T.cargar([PED({ id: '__caja_tienda__', fecha: JUE, turno: 'AM' })]);
  r = T.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM' }) });
  chk('2k. una fila `__…` con fecha no ocupa cupo (11 pedidos + el sistema: entra el 12)', r.ok && r.pedido.nroDia === 12, r.error || r.pedido.nroDia);
  /* el bot y el menú del dueño usan el mismo límite */
  const recs = {}; S.ctx.readAll().forEach(p => { recs[p.id] = p; });
  const exR = S.ctx.cuposExtraDeRecs_(recs);
  chk('2l. rdLimite_ (los días que ofrece el bot) suma los de más como el portero', S.ctx.rdLimite_(JUE, 'AM', exR) === 14 && S.ctx.rdLimite_(JUE, 'PM', exR) === 33 && S.ctx.rdLimite_(DOM, 'AM', exR) === 0 && S.ctx.rdLimite_(JUE, 'AM') === 12,
      [S.ctx.rdLimite_(JUE, 'AM', exR), S.ctx.rdLimite_(JUE, 'PM', exR)]);
  const lis = S.ctx.readAll(), txt = S.ctx.waPregEntregasTxt_(lis, S.ctx.waBo_(RELOJ.ms));
  chk('2m. «entregas» del menú del dueño dice los cupos con los de más («mañana 14 de 14»)', /mañana 14 de 14/.test(txt), txt.split('\n').filter(l => /Cupos/.test(l)).join(' | '));
});

/* ══ 3. Apartar el lugar mientras se cobra ══ */
seccion('3. apartarCupo / soltarCupo / el portero', () => {
  poner(HOY + ' 11:00');
  const S = servidor({});
  S.cargar(Array.from({ length: 11 }, () => PED({ fecha: JUE, turno: 'AM' })));
  let a = S.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', quien: 'Fabián Godoy', aparato: 'pc-mall' });
  chk('3a. apartar el último lugar: ok, id, hasta = +10 min, libres 0', a.ok && /^ap-/.test(a.id) && a.hasta === RELOJ.ms + 600000 && a.libres === 0 && a.cupos === 12 && a.usados === 11 && a.apartados === 1, a);
  chk('3b. apartar va con el candado de doPost (corto)', S.candado.script >= 1);
  let b = S.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', quien: 'Carola Chavez', aparato: 'pc-banzer' });
  chk('3c. otro aparato no puede: cupos_llenos con apartados 1', b.ok === false && b.error === 'cupos_llenos' && b.apartados === 1 && b.usados === 11, b);
  let L = S.post({ action: 'list' });
  chk('3d. la lectura dice lo apartado: {"' + JUE + '|AM": [{id, aparato, quien, hasta}]}', L.apartados && L.apartados[JUE + '|AM'] && L.apartados[JUE + '|AM'].length === 1 &&
      L.apartados[JUE + '|AM'][0].id === a.id && L.apartados[JUE + '|AM'][0].aparato === 'pc-mall' && L.apartados[JUE + '|AM'][0].quien === 'Fabián Godoy' && L.apartados[JUE + '|AM'][0].hasta === a.hasta, L.apartados);
  let r = S.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM', vendedor: 'Carola Chavez' }) });
  chk('3e. el guardado de OTRO (sin `aparto`) choca con el apartado: cupos_llenos con apartados 1', r.ok === false && r.error === 'cupos_llenos' && r.apartados === 1 && r.usados === 11, r);
  r = S.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM', vendedor: 'Carola Chavez' }), aparto: 'ap-de-otro' });
  chk('3f. …con un `aparto` que no es el suyo, tampoco', r.ok === false && r.error === 'cupos_llenos', r.error);
  pasan(5);
  const a2 = S.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', quien: 'Fabián Godoy', aparato: 'pc-mall', id: a.id });
  chk('3g. renovar con su id: el MISMO id, 10 minutos más desde ahora', a2.ok && a2.id === a.id && a2.hasta === RELOJ.ms + 600000 && a2.renovado === true, a2);
  r = S.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM', vendedor: 'Fabián Godoy' }), aparto: a.id });
  chk('3h. el guardado de quien apartó (con `aparto`) entra en su lugar', r.ok && r.pedido.nroDia === 12, r.error);
  L = S.post({ action: 'list' });
  chk('3i. …y el apartado se soltó solo', !L.apartados[JUE + '|AM'], L.apartados);
  /* vencer */
  const V = servidor({});
  V.cargar(Array.from({ length: 11 }, () => PED({ fecha: JUE, turno: 'AM' })));
  const av = V.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', quien: 'Fabián', aparato: 'pc-1' });
  pasan(11);
  r = V.post({ action: 'save', pedido: PED({ fecha: JUE, turno: 'AM' }) });
  chk('3j. a los 11 minutos el apartado venció: otro guarda en ese lugar', av.ok && r.ok, r.error);
  const av2 = V.post({ action: 'apartarCupo', fecha: JUE, turno: 'PM', quien: 'Fabián', aparato: 'pc-1', id: av.id });
  chk('3k. renovar uno vencido da OTRO id (y aparta de nuevo si hay lugar)', av2.ok && av2.id !== av.id && av2.renovado === false && av2.turno === 'PM', av2);
  /* soltar */
  let s1 = V.post({ action: 'soltarCupo', id: av2.id }), s2 = V.post({ action: 'soltarCupo', id: av2.id });
  chk('3l. soltar: true la primera vez, false la segunda; sin id → sin_id', s1.ok && s1.soltado === true && s2.ok && s2.soltado === false && V.post({ action: 'soltarCupo' }).error === 'sin_id', [s1, s2]);
  /* mover el apartado a otro turno */
  const W = servidor({});
  const m1 = W.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', aparato: 'pc-2' });
  const m2 = W.post({ action: 'apartarCupo', fecha: JUE, turno: 'PM', aparato: 'pc-2', id: m1.id });
  const LW = W.post({ action: 'list' }).apartados;
  chk('3m. con su id y otro turno: se MUEVE (el mismo id, ya no está a la mañana)', m2.ok && m2.id === m1.id && !LW[JUE + '|AM'] && LW[JUE + '|PM'].length === 1, LW);
  /* errores */
  chk('3n. fecha pasada, feriado y mal escrita', W.post({ action: 'apartarCupo', fecha: AYER, turno: 'AM' }).error === 'fecha_pasada' &&
      W.post({ action: 'apartarCupo', fecha: '2026-12-25', turno: 'AM' }).error === 'feriado' && W.post({ action: 'apartarCupo', fecha: 'mañana' }).error === 'fecha');
  W.cargar([PED({ id: '__dias_cerrados__', fecha: '', observaciones: '🔒 ' + JUE })]);
  chk('3o. un día cerrado no se aparta', W.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM' }).error === 'dia_cerrado');
  chk('3p. el domingo no hay lugar para apartar', W.post({ action: 'apartarCupo', fecha: DOM, turno: 'AM' }).error === 'cupos_llenos');
  /* un aparato no aparta de más */
  const X = servidor({});
  const ids = [1, 2, 3, 4].map(() => X.post({ action: 'apartarCupo', fecha: JUE, turno: 'PM', aparato: 'pc-loco' }).id);
  const LX = X.post({ action: 'list' }).apartados[JUE + '|PM'];
  chk('3q. un aparato con 4 apartados: queda con 3 (se suelta el más viejo)', LX.length === 3 && LX.every(x => x.id !== ids[0]), LX.map(x => x.id));
  /* candado ocupado */
  X.candado.scriptOcupado = true;
  chk('3r. con el candado ocupado: ocupado (la venta se guarda igual después)', X.post({ action: 'apartarCupo', fecha: JUE, turno: 'PM', aparato: 'pc-1' }).error === 'ocupado' &&
      X.post({ action: 'soltarCupo', id: ids[1] }).error === 'ocupado');
  X.candado.scriptOcupado = false;
  /* los cupos de más cuentan para apartar */
  const Y = servidor({});
  Y.cargar(Array.from({ length: 12 }, () => PED({ fecha: JUE, turno: 'AM' })));
  Y.cargar([PED({ id: '__cupos_extra__', fecha: '', observaciones: JSON.stringify({ v: 1, d: { [JUE + '|AM']: 1 } }) })]);
  const y1 = Y.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', aparato: 'a' }), y2 = Y.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', aparato: 'b' });
  chk('3s. con 1 cupo de más: se aparta ese y nada más', y1.ok && y1.cupos === 13 && y2.error === 'cupos_llenos', [y1.ok, y2.error]);
  /* mover un pedido de día (no nuevo) también respeta lo apartado */
  const Z = servidor({});
  const pz = PED({ fecha: '2026-11-20', turno: 'AM' });
  Z.cargar([pz]); Z.cargar(Array.from({ length: 11 }, () => PED({ fecha: JUE, turno: 'AM' })));
  Z.post({ action: 'apartarCupo', fecha: JUE, turno: 'AM', aparato: 'otro' });
  const rz = Z.post({ action: 'save', pedido: Object.assign({}, pz, { fecha: JUE }) });
  chk('3t. mover un pedido al turno con el último lugar apartado por otro: cupos_llenos', rz.ok === false && rz.error === 'cupos_llenos' && rz.apartados === 1, rz);
});

/* ══ 4. La venta grande ══ */
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', WA_DUENO: 'Eduardo:59170000099, Jefe:59170000098' };
seccion('4. La venta grande, al dueño', () => {
  poner(HOY + ' 15:10');
  const S = servidor(ON);
  const g = PED({ vendedor: 'Carola Chavez', saldo: 6000, acuenta: 3400, metodoPago: '~Efectivo 3400 @' + HOY + ' #77',
    productos: [{ desc: 'COLCHON TITANIO ICE', medida: '160x200', codigo: 'CH1222', cant: 2, precio: 3700 }, { desc: 'SOMIER ORO', medida: '160x200', cant: 1, precio: 2000 }] });
  let r = S.post({ action: 'save', pedido: g });
  const cola = JSON.parse(S.P.WA_COLA || '[]');
  chk('4a. el alta de una venta de Bs 9.400 deja en la cola su `g` (aparte de su `n`)', r.ok && cola.some(e => e.id === g.id && e.t === 'g') && cola.some(e => e.id === g.id && e.t === 'n'), cola);
  r = S.post({ action: 'save', pedido: Object.assign({}, g, { direccion: 'Otra calle', rev: r.pedido.rev }) });
  const cola2 = JSON.parse(S.P.WA_COLA || '[]');
  chk('4b. corregirla no agrega otro `g`, y el `n` sigue siendo uno', r.ok && cola2.filter(e => e.t === 'g').length === 1 && cola2.filter(e => e.t === 'n').length === 1, cola2);
  pasan(3);
  S.ctx.waRepaso();
  const vg = S.salen('venta_grande');
  chk('4c. a los 2 minutos sale `venta_grande` UNA vez, solo al PRIMERO de WA_DUENO (el jefe no)', vg.length === 1 && vg[0].to === '59170000099', vg);
  chk('4d. con el vendedor, la tienda (vacía → «—» sin Kommo), «Bs 9.400» y los productos con cantidad y medida',
      vg[0] && vg[0].p.length === 4 && vg[0].p[0] === 'Carola Chavez' && vg[0].p[1] === '—' && vg[0].p[2] === 'Bs 9.400' && vg[0].p[3] === '2 × COLCHON TITANIO ICE 160x200, 1 × SOMIER ORO 160x200', vg[0] && vg[0].p);
  chk('4e. el cliente y logística reciben lo de siempre (confirmación y pedido nuevo)', S.salen().some(x => /^confirmacion_pedido/.test(x.pl)) && S.salen().some(x => /^logistica_pedido_nuevo/.test(x.pl)), S.salen().map(x => x.pl));
  pasan(10); S.ctx.waRepaso();
  chk('4f. otra vuelta del bot no la repite', S.salen('venta_grande').length === 1);
  const hoja = S.hojas['Bot WhatsApp']._datos;
  chk('4g. queda anotado en «Bot WhatsApp» («Dueño: venta grande», ✅)', hoja.some(f => f[3] === 'Dueño: venta grande' && /enviado/.test(f[7])), hoja.map(f => f[3]));
  /* lo que no */
  const NO = [
    ['Bs 7.999', PED({ saldo: 7999 })],
    ['Eduardo', PED({ vendedor: 'Eduardo Añez', saldo: 20000 })],
    ['ROHO', PED({ vendedor: 'ROHO', saldo: 20000 })],
    ['interno (ALBA)', PED({ vendedor: 'ALBA', saldo: 20000 })],
    ['ATC', PED({ oc: 'ATC 11-010', saldo: 20000 })],
    ['RPT', PED({ oc: 'RPT 11-010', saldo: 20000 })],
    ['borrador de Kommo', PED({ id: 'kommo-555', fecha: '', estado: 'Borrador Kommo', saldo: 20000 })]
  ];
  S.meta.llamadas.length = 0;
  NO.forEach(x => S.post({ action: 'save', pedido: x[1] }));
  const colaNo = JSON.parse(S.P.WA_COLA || '[]').filter(e => e.t === 'g');
  chk('4h. no: menos de 8.000, Eduardo, ROHO, interno, ATC, RPT ni un borrador de Kommo', colaNo.length === 0, colaNo);
  /* el borrador que se completa SÍ (recién ahí es venta) */
  const bor = S.sh._datos.find(f => f[0] === 'kommo-555');
  r = S.post({ action: 'save', pedido: Object.assign(S.ctx.rowToRec_(bor), { fecha: JUE, turno: 'PM', estado: '', oc: '11-300' }) });
  chk('4i. el borrador de Kommo completado (Bs 20.000) sí: es el alta de la venta', r.ok && JSON.parse(S.P.WA_COLA || '[]').some(e => e.id === 'kommo-555' && e.t === 'g'), r.error);
  /* venta de tienda, con la tienda en la dirección */
  const vt = PED({ fecha: '', turno: '', zona: 'TIENDA', direccion: 'SALIÓ DE TIENDA · Ventura Mall', vendedor: 'Fabián Godoy', saldo: 0, pagado: true, acuenta: 0,
    metodoPago: 'QR 12400 @' + HOY + ' #99', productos: [{ desc: 'COLCHON CLOUD', medida: '160x200', cant: 1, precio: 12400 }] });
  r = S.post({ action: 'save', pedido: vt });
  pasan(3); S.meta.llamadas.length = 0; S.ctx.waRepaso();
  const vt1 = S.salen('venta_grande').find(x => x.p[0] === 'Fabián Godoy');
  chk('4j. una venta de TIENDA (sin fecha) también, con la tienda de la dirección y lo cobrado («Bs 12.400»)', r.ok && vt1 && vt1.p[1] === 'Ventura Mall' && vt1.p[2] === 'Bs 12.400', S.salen('venta_grande'));
  chk('4k. …y a la venta de tienda no le sale confirmación al cliente', !S.salen().some(x => /^confirmacion_pedido/.test(x.pl) && x.to === '591' + vt.celular), S.salen().map(x => x.pl + '→' + x.to));
  /* el umbral */
  const U = servidor(Object.assign({}, ON, { VENTA_GRANDE_BS: '12.000' }));
  chk('4l. VENTA_GRANDE_BS «12.000» = doce mil; «0» apaga; «abc» = 8.000', U.ctx.vgUmbral_() === 12000 &&
      servidor(Object.assign({}, ON, { VENTA_GRANDE_BS: '0' })).ctx.vgUmbral_() === 0 && servidor(Object.assign({}, ON, { VENTA_GRANDE_BS: 'abc' })).ctx.vgUmbral_() === 8000 &&
      servidor(Object.assign({}, ON, { VENTA_GRANDE_BS: 'Bs 9.500,50' })).ctx.vgUmbral_() === 9500.5 && servidor(ON).ctx.vgUmbral_() === 8000);
  U.post({ action: 'save', pedido: PED({ saldo: 9000 }) }); U.post({ action: 'save', pedido: PED({ saldo: 12500 }) });
  chk('4m. con 12.000: la de 9.000 no, la de 12.500 sí', JSON.parse(U.P.WA_COLA || '[]').filter(e => e.t === 'g').length === 1);
  const O = servidor(Object.assign({}, ON, { VENTA_GRANDE_BS: '0' }));
  O.post({ action: 'save', pedido: PED({ saldo: 50000 }) });
  chk('4n. con 0, nada', JSON.parse(O.P.WA_COLA || '[]').filter(e => e.t === 'g').length === 0);
  const A = servidor(Object.assign({}, ON, { WA_ACTIVO: '0' }));
  A.post({ action: 'save', pedido: PED({ saldo: 50000 }) });
  chk('4o. con el bot apagado (WA_ACTIVO), nada', !A.P.WA_COLA && !A.P.WA_VG);
  /* corregida por debajo antes de salir → no sale */
  const C = servidor(ON);
  const c1 = PED({ saldo: 9000 }); let rc = C.post({ action: 'save', pedido: c1 });
  C.post({ action: 'save', pedido: Object.assign({}, c1, { saldo: 4000, rev: rc.pedido.rev }) });
  pasan(3); C.ctx.waRepaso();
  const hc = C.hojas['Bot WhatsApp']._datos;
  chk('4p. corregida a Bs 4.000 antes de salir: no sale, y queda anotado por qué', C.salen('venta_grande').length === 0 && hc.some(f => f[3] === 'Dueño: venta grande' && /ya no llega/.test(f[8])), hc.map(f => f[8]));
  /* una vez por pedido aunque la borren y la vuelvan a cargar */
  const D = servidor(ON);
  const d1 = PED({ saldo: 9000 }); let rd = D.post({ action: 'save', pedido: d1 });
  D.post({ action: 'delete', id: d1.id, rev: rd.pedido.rev });
  D.post({ action: 'save', pedido: Object.assign({}, d1) });
  chk('4q. borrada y cargada de nuevo con el mismo id: una sola vez (WA_VG)', JSON.parse(D.P.WA_COLA || '[]').filter(e => e.t === 'g').length === 1 && JSON.parse(D.P.WA_VG)[d1.id] > 0);
  /* WA_PRUEBA */
  const Pr = servidor(Object.assign({}, ON, { WA_PRUEBA: '59170000077' }));
  Pr.post({ action: 'save', pedido: PED({ saldo: 9000 }) }); pasan(3); Pr.ctx.waRepaso();
  chk('4r. con WA_PRUEBA va al número de prueba', Pr.salen('venta_grande').length === 1 && Pr.salen('venta_grande')[0].to === '59170000077');
  /* la tienda de Kommo */
  const Kc = servidor(Object.assign({}, ON, { KOMMO_TOKEN: 'tok-kommo' }));
  Kc.kommo.usuarios = [{ id: 11, name: 'Carola Chávez - Tienda Banzer' }, { id: 12, name: 'Fabián Godoy - Ventura Mall' }];
  Kc.post({ action: 'save', pedido: PED({ vendedor: 'Fabián Godoy', saldo: 9000 }) }); Kc.post({ action: 'save', pedido: PED({ vendedor: 'Carola Chavez', saldo: 8500 }) });
  pasan(3); Kc.ctx.waRepaso();
  const kv = Kc.salen('venta_grande').map(x => x.p[0] + '=' + x.p[1]).sort();
  chk('4s. sin la tienda en la dirección: la de su usuario de Kommo («Nombre - Sucursal»), una lectura de /users para las dos', kv.join(',') === 'Carola Chavez=Tienda Banzer,Fabián Godoy=Ventura Mall' &&
      Kc.kommo.llamadas.filter(l => /\/users/.test(l.url)).length === 1, { kv, users: Kc.kommo.llamadas.filter(l => /\/users/.test(l.url)).length });
  /* sin WA_DUENO */
  const Sd = servidor(Object.assign({}, ON, { WA_DUENO: '' }));
  Sd.post({ action: 'save', pedido: PED({ saldo: 9000 }) }); pasan(3); Sd.ctx.waRepaso();
  chk('4t. sin WA_DUENO no sale a nadie', Sd.salen('venta_grande').length === 0);
  /* productos largos */
  const largos = { productos: Array.from({ length: 12 }, (x, i) => ({ desc: 'COLCHON MUY LARGO NUMERO ' + i, medida: '160x200', cant: 1, precio: 1000 })) };
  const t = S.ctx.waVgProds_(largos);
  chk('4u. muchos productos: se recorta con «, y N más»', t.length <= 200 && /, y \d+ más$/.test(t), t);
  /* la plantilla */
  const pl = S.ctx.WA_PLANTILLAS.find(x => x.n === 'venta_grande');
  chk('4v. la plantilla venta_grande: 4 datos, ejemplo de 4, firma de mensaje automático y el tipo `vg`', pl && /\{\{4\}\}/.test(pl.t) && !/\{\{5\}\}/.test(pl.t) && pl.e.length === 4 && /🤖/.test(pl.t) &&
      S.ctx.WA_TIPOS.vg && S.ctx.WA_TIPOS.vg.plantilla === 'venta_grande');
});

/* ══ 5. La versión y probarAntesDeImplementar ══ */
seccion('5. La versión', () => {
  const vG = (SRC.match(/var SCRIPT_VERSION = '([^']+)'/) || [])[1], vE = (SRC.match(/var ESTA_VERSION = '([^']+)'/) || [])[1];
  chk('5a. SCRIPT_VERSION y ESTA_VERSION = 2026-11-14-b (o una posterior), iguales', vG >= '2026-11-14-b' && vE === vG, { vG, vE });
  poner(HOY + ' 15:10');
  const S = servidor(ON);
  S.post({ action: 'mallToque', toques: [TQ()] });
  const pr = S.ctx.probarAntesDeImplementar();
  chk('5b. probarAntesDeImplementar dice lo de la hoja «Mall», los cupos de más y la venta grande, sin ❌ por esto',
      pr.lineas.some(l => /hoja «Mall» tiene 1 toque/.test(l)) && pr.lineas.some(l => /Cupos de más/.test(l)) && pr.lineas.some(l => /venta grande: desde Bs 8\.000/.test(l)) &&
      !pr.lineas.some(l => /^❌/.test(l) && /Mall|venta grande|Faltan funciones/.test(l)), pr.lineas.filter(l => /Mall|Cupos de más|venta grande|Faltan/.test(l)));
  const sinComentarios = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  chk('5c. el .gs sigue siendo ES5 (sin let/const/=>/` en el código)', !/^\s*(let|const)\s/m.test(sinComentarios) && !/=>/.test(sinComentarios) && !/`/.test(sinComentarios));
});

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
