/* 📅 ROHO: UN PEDIDO NUEVO FORZADO ENTRA (20/11; dueño, con la captura: «roho no me deja cargar salen esos errores»).
   Importar ROHO manda `forzar:true` para una nota que cae en un turno lleno o en un día cerrado (logística elige el día «aunque esté
   lleno», §roho_fecha). El servidor hasta la 2026-11-20-c miraba `forzar` SOLO al MOVER un pedido que ya estaba: uno NUEVO pasaba por
   el portero igual y volvía `cupos_llenos` / `dia_cerrado` («3 no entraron»). Desde la 2026-11-20-d entra y toma su N° del día; un
   feriado o un turno sin camión siguen sin entrar.
   Contra el .gs de verdad, con un Google de mentira (el de test_roho_cliente.js). Datos INVENTADOS.
   Se corre:  node tests/test_roho_forzar_servidor.js   (dientes: GS=<.gs viejo>) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

/* ── El servidor de mentira (el de test_factura_conflicto.js) ── */
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1],
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
  };
}
function servidor(src) {
  const HDR = ['id', 'Fecha', 'N° OC', 'Vendedor', 'Cliente', 'Productos', 'Celular', 'Turno', 'Zona', 'Dirección', 'Link Maps', 'Pagado', 'Saldo (Bs)', 'ts',
    '_productos_json', 'Método pago', 'Observaciones', 'Estado stock', 'Entregado', 'Vehículo', 'Chofer', 'Garantía (a nombre de)', 'Nota de venta',
    'A cuenta (Bs)', 'Facturar a', 'NIT', 'N° del día', 'Verificado', 'Fotos entrega', 'Revisión'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; }, removeAll() {} };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Rechazos' ? shR : (n === 'Pedidos' ? sh : null), insertSheet: (n) => n === 'Rechazos' ? shR : hacerPlanilla([]) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); }, getProperties: () => Object.assign({}, props) }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getId: () => 'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
      getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const post = (bodyTxt) => ctx.doPost({ postData: { contents: bodyTxt }, parameter: {} })._t;
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const fila = (id) => filas().filter(r => String(r.id) === String(id))[0] || null;
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action: 'save', pedido: rec })));
  return { post, filas, fila, guardar, rechazos: () => shR._datos.slice(1) };
}

/* Un día hábil que viene (ni sábado, ni domingo, ni feriado) y el sábado y el domingo que vienen. */
const iso = (d) => d.toISOString().slice(0, 10);
const dia = (fn) => { const d = new Date(); d.setUTCHours(12, 0, 0, 0); for (let i = 3; i < 60; i++) { const x = new Date(d.getTime() + i * 864e5); if (fn(x)) return iso(x); } };
let ctxFer = null;
const habil = () => dia(x => x.getUTCDay() >= 1 && x.getUTCDay() <= 5 && !(ctxFer && ctxFer[iso(x)]));
const sabado = () => dia(x => x.getUTCDay() === 6);
const domingo = () => dia(x => x.getUTCDay() === 0);
let n = 0;
const ped = (fecha, turno, o) => Object.assign({ id: 'R' + (++n), oc: String(500000 + n), vendedor: 'ROHO', cliente: 'CLIENTE INVENTADO ' + n, celular: '70000' + String(100 + n),
  direccion: 'Calle Inventada ' + n, zona: 'Norte', nit: '', maps: '', fecha, turno, nroDia: 0, observaciones: 'Importado del Excel de ROHO', garantia: '', facturarA: '',
  nota: '', estado: '', entregado: false, verificado: false, vehiculo: '', chofer: '', fotos: [], pagado: true, saldo: 0, acuenta: 0, metodoPago: '', cobradoBs: 0,
  ts: Date.now(), rev: 0, productos: [{ desc: 'COLCHON INVENTADO 2 PLAZAS', medida: '140x190', codigo: 'CH0000', cant: 1 }] }, o || {});

(() => {
  const src = fs.readFileSync(GS, 'utf8');
  const S = servidor(src);
  const guardarF = (rec) => JSON.parse(S.post(JSON.stringify({ action: 'save', pedido: rec, forzar: true })));
  try { ctxFer = vm.runInNewContext(src.match(/var FERIADOS_GS\s*=\s*(\{[\s\S]*?\});/)[1] ? '(' + src.match(/var FERIADOS_GS\s*=\s*(\{[\s\S]*?\});/)[1] + ')' : '({})'); } catch (e) { ctxFer = {}; }
  const D = habil();

  console.log('\n── 1. Un turno lleno ──');
  for (let i = 0; i < 12; i++) { const r = S.guardar(ped(D, 'AM')); if (!r.ok) { chk('1-pre. llenar el AM', false, r); break; } }
  let r = S.guardar(ped(D, 'AM'));
  chk('1a. sin forzar, el 13.º del AM sigue rebotando (cupos_llenos)', r.ok === false && r.error === 'cupos_llenos', r);
  const p13 = ped(D, 'AM');
  r = guardarF(p13);
  chk('1b. FORZADO, el pedido nuevo entra aunque el AM esté lleno', r.ok === true && !!S.fila(p13.id), r);
  chk('1c. …y toma su N° del día (13)', S.fila(p13.id) && Number(S.fila(p13.id).nroDia) === 13, S.fila(p13.id) && S.fila(p13.id).nroDia);
  const p14 = ped(D, 'AM'); r = guardarF(p14);
  chk('1d. otro más forzado: N° 14 (no repite)', r.ok === true && Number(S.fila(p14.id).nroDia) === 14, S.fila(p14.id) && S.fila(p14.id).nroDia);

  console.log('\n── 2. Un día cerrado ──');
  const D2 = dia(x => x.getUTCDay() >= 1 && x.getUTCDay() <= 5 && iso(x) !== D && !(ctxFer && ctxFer[iso(x)]));
  S.guardar({ id: '__dias_cerrados__', fecha: '', cliente: '', observaciones: D2, productos: [] });
  r = S.guardar(ped(D2, 'PM'));
  chk('2a. sin forzar, a un día cerrado rebota (dia_cerrado)', r.ok === false && r.error === 'dia_cerrado', r);
  const pc = ped(D2, 'PM'); r = guardarF(pc);
  chk('2b. FORZADO, entra al día cerrado', r.ok === true && !!S.fila(pc.id), r);

  console.log('\n── 3. Lo que nunca se fuerza ──');
  r = guardarF(ped(domingo(), 'AM'));
  chk('3a. un domingo, ni forzado', r.ok === false, r);
  r = guardarF(ped(sabado(), 'PM'));
  chk('3b. la tarde del sábado, ni forzado', r.ok === false, r);
  const fer = Object.keys(ctxFer || {}).filter(f => f > iso(new Date()))[0];
  if (fer) { r = guardarF(ped(fer, 'AM')); chk('3c. un feriado, ni forzado (error feriado)', r.ok === false && r.error === 'feriado', r); }
  else chk('3c. (sin feriados futuros en la lista)', true);

  console.log('\n── 4. Lo de siempre no cambia ──');
  const D3 = dia(x => x.getUTCDay() >= 1 && x.getUTCDay() <= 5 && iso(x) !== D && iso(x) !== D2 && !(ctxFer && ctxFer[iso(x)]));
  const pn = ped(D3, 'AM'); r = S.guardar(pn);
  chk('4a. un pedido nuevo con lugar entra sin forzar, N° 1', r.ok === true && Number(S.fila(pn.id).nroDia) === 1, r);
  const f = S.fila(p13.id); r = f ? guardarF(Object.assign({}, f, { fecha: D3, rev: Number(f.rev) })) : { ok: false, error: 'no estaba' };
  chk('4b. mover uno que ya estaba, forzado, como siempre', r.ok === true && S.fila(p13.id) && S.fila(p13.id).fecha === D3, r);
  r = guardarF(ped(D, 'AM', { cliente: '' }));
  chk('4c. forzado pero sin el nombre del cliente: falta_cliente', r.ok === false && r.error === 'falta_cliente', r);

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
