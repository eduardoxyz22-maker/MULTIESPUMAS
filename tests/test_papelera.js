/* 🗑 LA PAPELERA: VER Y RECUPERAR LO BORRADO (22/11, mejora 452; servidor 2026-11-22-a).
   El dueño eligió la 452 con la muestra del 22/11: hasta ahora un pedido borrado quedaba anotado en «Borrados» sin la fila, y
   recuperarlo era buscarlo en un respaldo de Drive. Ahora `doDelete` deja la fila entera en la hoja «Papelera», `borradosLeer` la
   lista (sin candado) y `borradoRecuperar` la vuelve a escribir tal cual con un sello nuevo (con el candado, revalidando adentro).
   Lo que cuida:
   1. Servidor (el .gs real con un Google de mentira): borrar → aparece en `borradosLeer` con quién lo borró → recuperar → la fila
      vuelve IGUAL (productos, pagos, fotos, celular) con sello nuevo; la lectura de lo cambiado la trae y la página no la vuelve a
      sacar (su sello es posterior al borrado); recuperar dos veces no duplica; una copia vieja choca (`conflicto`) en vez de
      borrarla de nuevo; las fotos vuelven de la papelera de Drive y de «Fotos huérfanas»; un borrador de Kommo sale de
      KOMMO_DESCARTADOS; un retiro se recupera; `__dias_cerrados__` NO; lo borrado antes de esta versión se ve sin copia; sin la
      clave del equipo, nada.
   2. Página (Playwright, el panel real contra el .gs real): «🗑 Lo borrado» solo con la contraseña; la lista con quién lo borró;
      «↩️ Recuperar» lo vuelve a la planilla y a la pantalla; el borrado de la página manda quién borró (`quienEdita()`); con un
      servidor anterior la ventana lo dice y no pide nada.
   Solo datos inventados. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_papelera.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || (() => {   // 🗑💾 (23/11) la Papelera y la prueba del respaldo están SOLO en la 2026-11-22-a (descartada por el dueño): se prueba esa, del historial
  const f = require('path').join(require('os').tmpdir(), 'gs_22a_papelera.gs');
  require('fs').writeFileSync(f, require('child_process').execSync('git show 254f324383c81050352c85dba9005cfdc2b63fae:google-apps-script.gs', { cwd: require('path').resolve(__dirname, '..'), maxBuffer: 1e8 }));
  return f;
})();
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const CLAVE = 'clave-de-prueba';

/* ── Un Google de mentira: varias hojas, Drive con carpetas y papelera, propiedades, caché ── */
function hacerHoja(filas) {
  const datos = (filas || []).map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); },
    getRange: (fila, col, nFilas, nCols) => {
      if (typeof fila === 'string') return { setNumberFormat: () => {} };
      return {
        getValue: () => (datos[fila - 1] || [])[col - 1],
        setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
        getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
        setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
        setFontWeight: () => {}, setNumberFormat: () => {}
      };
    }
  };
}
function hacerDrive() {
  const carpetas = { 'Fotos entregas MultiEspumas': 'c-fotos', 'Fotos huérfanas MultiEspumas': 'c-hu' };
  const archivos = {};   // id → { padres:[…], papelera }
  const carpeta = (id) => ({ getId: () => id, getFiles: () => ({ hasNext: () => false, next: () => null }),
    addFile: (f) => { const a = archivos[f.getId()]; if (a && a.padres.indexOf(id) < 0) a.padres.push(id); }, removeFile: () => {},
    setSharing: () => {} });
  return {
    _archivos: archivos,
    getFoldersByName: (n) => { const id = carpetas[n]; let usado = false; return { hasNext: () => !!id && !usado, next: () => { usado = true; return carpeta(id); } }; },
    getFolderById: (id) => carpeta(id),
    createFolder: (n) => { carpetas[n] = 'c-' + n; return carpeta(carpetas[n]); },
    getFileById: (id) => {
      const a = archivos[id]; if (!a) throw new Error('No existe: ' + id);
      return {
        getId: () => id,
        getParents: () => { let i = 0; const ps = a.padres.slice(); return { hasNext: () => i < ps.length, next: () => carpeta(ps[i++]) }; },
        isTrashed: () => !!a.papelera, setTrashed: (v) => { a.papelera = !!v; },
        moveTo: (c) => { a.padres = [c.getId()]; }
      };
    },
    Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 }
  };
}
function servidor(props0) {
  const hojas = {}, props = Object.assign({}, props0 || {});
  const main = hacerHoja([]);
  const ss = {
    getSheetByName: (n) => n === 'Pedidos' ? main : (hojas[n] || null),
    insertSheet: (n) => { hojas[n] = hacerHoja([]); return hojas[n]; },
    getId: () => 'planilla'
  };
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; } };
  const drive = hacerDrive();
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }), getDocumentLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: drive,
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({ getBytes: () => [] }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
                 getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  ctx.getSheet();   // los encabezados de «Pedidos»
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) }, parameter: {} })._t);
  const postTxt = (txt) => ctx.doPost({ postData: { contents: txt }, parameter: {} })._t;
  const fila = (id) => { const r = main._datos.find(f => f[0] === id); return r ? ctx.rowToRec_(r) : null; };
  const poner = (rec, rev) => { const row = ctx.recToRow(rec); row[ctx.REV_COL - 1] = rev; main._datos.push(row); };
  return { ctx, main, hojas, props, drive, post, postTxt, fila, poner };
}
const TS = (d, h) => Date.parse(d + 'T' + (h || '10:00') + ':00-04:00');
const pedido = (o) => Object.assign({
  fecha: '2026-11-25', oc: '11-050', vendedor: 'Mirian Salazar', cliente: 'CLIENTA INVENTADA', celular: '70000001', turno: 'AM', zona: 'Norte',
  direccion: 'Calle Falsa 123', maps: '', pagado: false, saldo: 2000, ts: TS('2026-11-20'), metodoPago: '~QR 1000 @2026-11-20 #5001 %fotoPagoAAA1', observaciones: 'llamar antes',
  estado: '', entregado: false, vehiculo: '', chofer: '', garantia: '', nota: '9001', acuenta: 1000, facturarA: '', nit: '', nroDia: 3, verificado: false,
  fotos: ['fotoEntBBB1'], productos: [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129', cant: 1, precio: 3000 }], rev: 0
}, o);

// ══ 1. Servidor ═════════════════════════════════════════════════════════════
console.log('\n── 1. Borrar deja la fila entera en la Papelera ──');
{
  const S = servidor({});
  S.poner(pedido({ id: 'p1' }), 1763000000000);
  S.drive._archivos['fotoPagoAAA1'] = { padres: ['c-fotos'], papelera: false };
  S.drive._archivos['fotoEntBBB1'] = { padres: ['c-fotos'], papelera: false };
  const antes = S.fila('p1');
  const r = S.post({ action: 'delete', id: 'p1', rev: 1763000000000, quien: 'Logística · Ernesto', dispositivo: 'DEV1' });
  chk('el borrado sale bien y la fila ya no está', r.ok === true && !S.fila('p1'), r);
  const hp = S.hojas['Papelera'];
  chk('⚠️ la hoja «Papelera» tiene la fila entera (JSON) con quién borró', !!hp && hp._datos[0][0] === 'Hora (ms)' && hp._datos.length === 2 &&
      hp._datos[1][1] === 'p1' && JSON.parse(hp._datos[1][2]).celular === '70000001' && hp._datos[1][4] === 'Logística · Ernesto', hp && hp._datos.slice(0, 2));
  const hb = S.hojas['Borrados'];
  chk('«Borrados» sigue igual: 9 columnas, quién borró, sin celular ni dirección', !!hb && hb._datos[1].length === 9 && hb._datos[1][6] === 'Logística · Ernesto' &&
      !hb._datos[1].some(v => String(v).indexOf('70000001') >= 0 || String(v).indexOf('Calle Falsa') >= 0), hb && hb._datos[1]);

  console.log('\n── 2. borradosLeer lo lista ──');
  let L = S.post({ action: 'borradosLeer' });
  const x = (L.borrados || []).find(b => b.id === 'p1');
  chk('⚠️ borradosLeer trae el borrado con quién lo borró, la hora y la fila para mostrar', L.ok === true && !!x && x.quien === 'Logística · Ernesto' && x.t > 0 &&
      x.rec && x.rec.cliente === 'CLIENTA INVENTADA' && x.rec.productos.length === 1 && x.ya === 0 && x.sinCopia === 0, x);

  console.log('\n── 3. Recuperar ──');
  /* lo que haría el barrido de cada día: la foto de la entrega a «Fotos huérfanas», la del pago a la papelera de Drive */
  S.drive._archivos['fotoEntBBB1'].padres = ['c-hu'];
  S.drive._archivos['fotoPagoAAA1'].papelera = true;
  const lst0 = S.post({ action: 'list' });
  const desde = lst0.ahora;
  const t0 = Date.now();
  const R = S.post({ action: 'borradoRecuperar', id: 'p1', t: x.t, quien: 'Administración' });
  const desp = S.fila('p1');
  chk('⚠️ recuperar vuelve a escribir la fila', R.ok === true && !!desp, R);
  const sin = (p) => { const q = Object.assign({}, p); delete q.rev; return JSON.stringify(q); };
  chk('⚠️ …IGUAL a como estaba: productos, pagos, fotos, celular, dirección, observaciones', !!desp && sin(desp) === sin(antes), desp && { antes: sin(antes).slice(0, 160), desp: sin(desp).slice(0, 160) });
  chk('⚠️ …con un sello NUEVO (posterior al borrado)', !!desp && desp.rev >= t0 && desp.rev > x.t, desp && desp.rev);
  chk('⚠️ las fotos vuelven: la de la papelera de Drive sale de la papelera y la de «Fotos huérfanas» vuelve a la carpeta de fotos',
      S.drive._archivos['fotoPagoAAA1'].papelera === false && S.drive._archivos['fotoEntBBB1'].padres[0] === 'c-fotos' && R.fotos === 2 && R.fotosPerdidas === 0, { a: S.drive._archivos, R });
  chk('la Papelera anota que se recuperó', /↩️ .*Administración/.test(String(S.hojas['Papelera']._datos[1][3])), S.hojas['Papelera']._datos[1][3]);
  const D = S.post({ action: 'list', desde: desde });
  const enD = (D.pedidos || []).find(p => p.id === 'p1'), bD = (D.borrados || []).find(b => b[0] === 'p1');
  chk('⚠️ la lectura de lo cambiado la trae, con sello posterior al borrado (la página aplica el borrado y después la deja)',
      D.delta === true && !!enD && (!bD || enD.rev > Number(bD[1])), { delta: D.delta, enD: !!enD, bD });
  L = S.post({ action: 'borradosLeer' });
  const x2 = (L.borrados || []).find(b => b.id === 'p1');
  chk('borradosLeer ahora dice que ya está y que se recuperó', !!x2 && x2.ya === 1 && /↩️/.test(x2.rcp), x2);

  console.log('\n── 4. Dos veces, y una copia vieja ──');
  const R2 = S.post({ action: 'borradoRecuperar', id: 'p1', t: x.t, quien: 'Administración' });
  chk('⚠️ recuperar dos veces no duplica: «ya_esta» y una sola fila', R2.ok === false && R2.error === 'ya_esta' && S.main._datos.filter(f => f[0] === 'p1').length === 1, R2);
  const viejo = Object.assign({}, antes, { observaciones: 'una copia vieja que alguien tenía abierta' });
  const g = S.post({ action: 'save', pedido: viejo });
  chk('⚠️ una copia vieja (el sello de antes) no pisa lo recuperado: conflicto', g.ok === false && g.error === 'conflicto' && S.fila('p1').observaciones === 'llamar antes', g.error);
  const d2 = S.post({ action: 'delete', id: 'p1', rev: 1763000000000 });
  chk('⚠️ …ni lo vuelve a borrar con el sello viejo', d2.ok === false && d2.error === 'conflicto' && !!S.fila('p1'), d2.error);
}
console.log('\n── 5. Fotos que ya no existen, OC repetida ──');
{
  const S = servidor({});
  S.poner(pedido({ id: 'p2', metodoPago: '~QR 1000 @2026-11-20 #5001 %fotoYaNoEsta9' , fotos: [] }), 1763000000001);
  S.post({ action: 'delete', id: 'p2', rev: 1763000000001, quien: 'Administración' });
  S.poner(pedido({ id: 'p3', cliente: 'OTRA CLIENTA', oc: '11-050' }), 1763000000002);   // otro tomó el mismo N° mientras tanto
  const R = S.post({ action: 'borradoRecuperar', id: 'p2', quien: 'Administración' });
  chk('se recupera igual y dice cuántas fotos ya no se pudieron recuperar', R.ok === true && R.fotosPerdidas === 1 && !!S.fila('p2'), R);
  chk('…y que el N° de OC ya lo tiene otro pedido (no se cambia solo)', !!R.ocRepetida && R.ocRepetida.oc === '11-050' && R.ocRepetida.id === 'p3' && S.fila('p2').oc === '11-050', R.ocRepetida);
}
console.log('\n── 6. Filas del sistema, retiros y Kommo ──');
{
  const S = servidor({});
  const dc = { id: '__dias_cerrados__', fecha: '', cliente: '🔒 DÍAS CERRADOS', observaciones: '2026-11-30', productos: [] };
  S.poner(Object.assign(pedido({}), dc), 5);
  S.post({ action: 'delete', id: '__dias_cerrados__', rev: 5 });
  chk('⚠️ una fila del sistema (__dias_cerrados__) no va a la Papelera', !(S.hojas['Papelera'] && S.hojas['Papelera']._datos.some(f => f[1] === '__dias_cerrados__')));
  const Rd = S.post({ action: 'borradoRecuperar', id: '__dias_cerrados__' });
  chk('⚠️ …y no se puede recuperar', Rd.ok === false && Rd.error === 'no_se_recupera' && !S.fila('__dias_cerrados__'), Rd);
  S.poner(pedido({ id: '__ret_77', fecha: '2026-11-20', cliente: '💵 RETIRO', saldo: 800, productos: [], fotos: [], metodoPago: '' }), 6);
  S.post({ action: 'delete', id: '__ret_77', rev: 6, quien: 'Contabilidad' });
  const Rr = S.post({ action: 'borradoRecuperar', id: '__ret_77', quien: 'Contabilidad' });
  chk('⚠️ un retiro (__ret_…) sí se recupera', Rr.ok === true && !!S.fila('__ret_77') && S.fila('__ret_77').saldo === 800, Rr);
  S.poner(pedido({ id: 'kommo-4111', estado: 'Borrador Kommo', fecha: '', oc: '', nota: '', productos: [], fotos: [], metodoPago: '' }), 7);
  S.post({ action: 'delete', id: 'kommo-4111', rev: 7, quien: 'Maria Flores' });
  const desc0 = JSON.parse(S.props.KOMMO_DESCARTADOS || '{}');
  chk('borrar un borrador de Kommo lo descarta (como siempre)', desc0['4111'] != null, desc0);
  const Rk = S.post({ action: 'borradoRecuperar', id: 'kommo-4111', quien: 'Administración' });
  const desc1 = JSON.parse(S.props.KOMMO_DESCARTADOS || '{}');
  chk('⚠️ recuperarlo lo saca de KOMMO_DESCARTADOS (el repaso no lo trata como descartado)', Rk.ok === true && !!S.fila('kommo-4111') && desc1['4111'] == null, { Rk, desc1 });
}
console.log('\n── 7. Lo borrado antes de esta versión, y la clave ──');
{
  const S = servidor({});
  S.ctx.hojaBorrados_();
  const ms = Date.now() - 3 * 86400000;
  S.hojas['Borrados']._datos.push([new Date(ms), 'pviejo', 'CLIENTE VIEJO', 'Carola Chavez', '2026-11-18', '11-001', 'Isabel Robledo', 'DEVX', ms]);
  const L = S.post({ action: 'borradosLeer' });
  const v = (L.borrados || []).find(b => b.id === 'pviejo');
  chk('⚠️ lo borrado antes de esta versión se ve (de «Borrados»), marcado sin copia', !!v && v.sinCopia === 1 && v.cliente === 'CLIENTE VIEJO' && v.quien === 'Isabel Robledo', v);
  const Rv = S.post({ action: 'borradoRecuperar', id: 'pviejo' });
  chk('…y no se puede recuperar (no quedó la fila)', Rv.ok === false && Rv.error === 'sin_copia', Rv);
  const Sk = servidor({ PANEL_KEY: CLAVE });
  const Lk = Sk.post({ action: 'borradosLeer' }), Rk = Sk.post({ action: 'borradoRecuperar', id: 'x' });
  chk('⚠️ sin la clave del equipo no se lee ni se recupera nada', Lk.ok === false && Lk.error === 'clave' && Rk.ok === false && Rk.error === 'clave', { Lk, Rk });
  const Lk2 = Sk.post({ action: 'borradosLeer', key: CLAVE });
  chk('…con la clave, sí', Lk2.ok === true && Array.isArray(Lk2.borrados), Lk2.ok);
}

// ══ 2. Página ═══════════════════════════════════════════════════════════════
const RELOJ = '2026-11-22T10:00:00-04:00';
function INIT() {
  window.__log = [];
  window.esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); };
  window.fetch = function (url, o) {
    var body = (o && o.body) || '{}', P = {}; try { P = JSON.parse(body); } catch (e) {}
    window.__log.push(P);
    if (window.__version && P.action !== 'list') { /* nada */ }
    return window.__gs(body).then(function (t) {
      if (window.__version) { try { var j = JSON.parse(t); j.version = window.__version; t = JSON.stringify(j); } catch (e) {} }
      return { ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(t)); }, text: function () { return Promise.resolve(t); } };
    });
  };
}
(async () => {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const abrir = async (S) => {
    const context = await browser.newContext({ viewport: { width: 1300, height: 900 }, timezoneId: 'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.postTxt(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(350);
    await page.evaluate(async () => {
      var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
      CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok';
      if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; }
      window._toasts = []; var _t = toast; toast = function (m, k, ms) { window._toasts.push(String(k || '') + ': ' + String(m)); return _t(m, k, ms); };
      await refrescarEstado(); await esperar(200);
    });
    return { page, context };
  };
  console.log('\n── 8. Página: el botón, la lista y «Recuperar» ──');
  {
    const S = servidor({});
    S.poner(pedido({ id: 'pw1', oc: '11-061', cliente: 'CLIENTE DE PRUEBA UNO' }), 1763100000000);
    S.poner(pedido({ id: 'pw2', oc: '11-062', cliente: 'CLIENTE DE PRUEBA DOS' }), 1763100000001);
    const { page, context } = await abrir(S);
    const b0 = await page.evaluate(() => { window.LBR_PRUEBA = true; UNLOCKED = false; lbrBotonPintar(); var a = !!document.getElementById('lbr-btn');
      UNLOCKED = true; lbrBotonPintar(); var b = document.getElementById('lbr-btn'); return { sin: a, con: !!b, enAjustes: !!(b && b.closest('.at-aj')), at: !!(b && b.classList.contains('at-t')), d: b && b.getAttribute('data-d') }; });
    chk('⚠️ «🗑 Lo borrado» aparece SOLO con la contraseña, en «Ajustes y claves» con la forma de siempre', !b0.sin && b0.con && b0.enAjustes && b0.at && !!b0.d, b0);
    const sinFlag = await page.evaluate(() => { window.LBR_PRUEBA = false; var b = document.getElementById('lbr-btn'); if (b) b.remove(); lbrBotonPintar(); var r = !!document.getElementById('lbr-btn'); window.LBR_PRUEBA = true; lbrBotonPintar(); return r; });
    chk('en Playwright sin LBR_PRUEBA no aparece', sinFlag === false);
    /* el borrado de la página manda quién borró (quienEdita) */
    const dq = await page.evaluate(async () => { try { localStorage.removeItem('me_mis_vendedor'); } catch (e) {}
      quienRol('logistica');
      var q = quienEdita(); await realDelete('pw1'); await esperar(2500); return { q: q, enEstado: !!findById('pw1') }; });
    const hp = S.hojas['Papelera'];
    chk('⚠️ borrar desde la página manda quién borró (quienEdita) y queda en la Papelera', !S.fila('pw1') && !!hp && hp._datos.some(f => f[1] === 'pw1' && f[4] === dq.q && !!dq.q), { q: dq.q, p: hp && hp._datos.map(f => [f[1], f[4]]) });
    const vista = await page.evaluate(async () => { abrirLoBorrado(); await esperar(600); var ov = document.getElementById('lbr-overlay');
      return { abierto: ov.style.display === 'flex', adm: ov.classList.contains('adm-ov'), txt: document.getElementById('lbr-body').innerText, info: document.getElementById('lbr-info').textContent, btn: !!document.querySelector('#lbr-body .lbr-rec') }; });
    chk('⚠️ la ventana (adm-ov) lista lo borrado: N°, cliente, total, quién lo borró y cuándo', vista.abierto && vista.adm && /11-061/.test(vista.txt) && /CLIENTE DE PRUEBA UNO/.test(vista.txt) &&
        /Lo borró/.test(vista.txt) && /total Bs/.test(vista.txt) && vista.btn && /1 borrado/.test(vista.info), vista);
    const busca = await page.evaluate(async () => { lbrBuscar('nada que ver'); var a = document.getElementById('lbr-body').innerText; lbrBuscar('prueba uno'); var b = document.getElementById('lbr-body').innerText; return { a: a, b: b }; });
    chk('el buscador filtra', /Nada con/.test(busca.a) && /CLIENTE DE PRUEBA UNO/.test(busca.b), busca);
    const rec = await page.evaluate(async () => { lbrBuscar(''); var b = document.querySelector('#lbr-body .lbr-rec'); b.click(); await esperar(2500);
      return { enEstado: !!findById('pw1'), txt: document.getElementById('lbr-body').innerText, toasts: window._toasts.slice(-3) }; });
    chk('⚠️ «↩️ Recuperar» (pregunta y) lo vuelve a la planilla y a la pantalla', !!S.fila('pw1') && rec.enEstado && /Recuperado/.test(rec.txt) && rec.toasts.some(t => /volvió a la planilla/.test(t)), rec);
    chk('…y en la planilla quedó una sola fila', S.main._datos.filter(f => f[0] === 'pw1').length === 1);
    const otraVez = await page.evaluate(async () => { var n = window.__log.length; lbrRecuperar(0); await esperar(400); return window.__log.slice(n).filter(function (p) { return p.action === 'borradoRecuperar'; }).length; });
    chk('lo ya recuperado no se vuelve a pedir', otraVez === 0, otraVez);
    /* servidor anterior */
    const viejo = await page.evaluate(async () => { var v = SERVER_VER; SERVER_VER = '2026-11-21-a'; var n = window.__log.length; abrirLoBorrado(); await esperar(300);
      var r = { txt: document.getElementById('lbr-body').innerText, pidio: window.__log.slice(n).some(function (p) { return p.action === 'borradosLeer'; }) }; SERVER_VER = v; lbrCerrar(); return r; });
    chk('⚠️ con un servidor sin la Papelera la ventana lo dice (sin mandar a implementar nada) y no pide nada', /no está en el servidor que usa el panel/.test(viejo.txt) && !viejo.pidio, viejo);
    await context.close();
  }
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
