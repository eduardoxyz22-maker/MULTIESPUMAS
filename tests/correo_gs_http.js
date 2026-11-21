/* (21/11) El .gs REAL detrás de un HTTP local (127.0.0.1) para probar herramientas/pedidos_correo/cargar_pedidos.py
   (lo usa tests/test_correo_cargar.py; nada sale a la red, la planilla es de mentira). Se corre: node tests/correo_gs_http.js <carpeta>
   La carpeta trae semilla.json (filas iniciales) y modo.txt: 'ok' | 'perder1' (el 1er save se ESCRIBE y contesta una página de error)
   | 'get1' (el 1er save NO corre y contesta como doGet, §4fx). Escribe puerto.txt al arrancar; GET /filas devuelve la planilla. */
'use strict';
const http = require('http'), fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = path.resolve(__dirname, '..');
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return { _datos: datos, getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }), getMaxColumns: () => 40, getMaxRows: () => 5000,
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1],
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {} }) };
}
function servidor(o) {
  o = o || {};
  const src = fs.readFileSync(o.gs || process.env.GS || path.join(REPO, 'google-apps-script.gs'), 'utf8');
  const HDR = ['id', 'Fecha', 'N° OC', 'Vendedor', 'Cliente', 'Productos', 'Celular', 'Turno', 'Zona', 'Dirección', 'Link Maps', 'Pagado', 'Saldo (Bs)', 'ts',
    '_productos_json', 'Método pago', 'Observaciones', 'Estado stock', 'Entregado', 'Vehículo', 'Chofer', 'Garantía (a nombre de)', 'Nota de venta',
    'A cuenta (Bs)', 'Facturar a', 'NIT', 'N° del día', 'Verificado', 'Fotos entrega', 'Revisión'];
  const hojas = { Pedidos: hacerPlanilla([HDR]) }, props = Object.assign({}, o.props || {});
  const hoja = (n) => hojas[n] || (hojas[n] = hacerPlanilla([]));
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; }, removeAll() {}, getAll() { return {}; } };
  const reloj = { t: o.ahora || Date.now() };
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(reloj.t); } static now() { return reloj.t; } }
  const fetches = [];
  const ctx = { console, Date: FD,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => hojas[n] || null, insertSheet: (n) => hoja(n) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); }, getProperties: () => Object.assign({}, props) }) },
    UrlFetchApp: { fetch: (u, op) => { fetches.push({ u, op }); return (o.fetch ? o.fetch(u, op) : null) || { getResponseCode: () => 404, getContentText: () => '{}' }; }, fetchAll: (L) => L.map(() => ({ getResponseCode: () => 404, getContentText: () => '{}' })) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; }, hasLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getId: () => 'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({}), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
      getProjectTriggers: () => [], deleteTrigger: () => {} } };
  ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
  const sh = hojas.Pedidos;
  const post = (bodyTxt) => ctx.doPost({ postData: { contents: bodyTxt }, parameter: {} })._t;
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  return { ctx, post, filas, props, hojas, reloj, fetches, fila: (id) => filas().filter(r => String(r.id) === String(id))[0] || null,
    guardar: (rec, extra) => JSON.parse(post(JSON.stringify(Object.assign({ action: 'save', pedido: rec }, extra || {})))) };
}
const dir = process.argv[2]; const S = servidor({ ahora: Date.now() });
setInterval(() => { S.reloj.t = Date.now(); }, 200);
const semilla = JSON.parse(fs.readFileSync(path.join(dir, 'semilla.json'), 'utf8'));
semilla.forEach(r => { const x = S.guardar(r, r._forzar ? { forzar: true } : {}); if (!x.ok) console.error('semilla', r.id, x.error); });
let nSave = 0;
const srv = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => {
  let modo = 'ok'; try { modo = fs.readFileSync(path.join(dir, 'modo.txt'), 'utf8').trim(); } catch (e) { }
  let P = {}; try { P = JSON.parse(b); } catch (e) { }
  if (req.url.startsWith('/filas')) { res.end(JSON.stringify(S.filas().map(f => ({ id: f.id, oc: f.oc, cliente: f.cliente, fecha: f.fecha, turno: f.turno, nota: f.nota, nroDia: f.nroDia, saldo: f.saldo, vendedor: f.vendedor })))); return; }
  if (P.action === 'save') { nSave++;
    if (modo === 'perder1' && nSave === 1) { S.post(b); res.statusCode = 200; res.end('<html><body>Error 500 de Google</body></html>'); return; }
    if (modo === 'get1' && nSave === 1) { res.end(S.post(JSON.stringify({ action: 'list' }))); return; } }
  res.end(S.post(b)); }); });
srv.listen(0, '127.0.0.1', () => { fs.writeFileSync(path.join(dir, 'puerto.txt'), String(srv.address().port)); });
