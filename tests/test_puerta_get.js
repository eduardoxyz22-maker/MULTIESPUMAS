/* 🚪 CERRAR LA PUERTA POR DONDE LEEN DE AFUERA (22/11, mejora 451; servidor 2026-11-22-a + herramientas/cerrar_puerta_get.gs).
   El servidor contesta un GET (abrir la dirección /exec en un navegador) con la planilla entera. Nada del panel ni del repositorio lee
   por GET (§4dv). Con GET_CERRADO = 1 contesta `get_cerrado` sin leer la hoja. La pantalla de Propiedades del dueño es de solo lectura
   (más de 50 propiedades): la pone un archivo aparte, `cerrar_puerta_get`, con `cerrarPuertaGetUnaVez` / `abrirPuertaGetUnaVez`.
   Lo que cuida:
   1. El archivo aparte se carga JUNTO con Código.gs sin pisar ningún nombre, y prende / apaga GET_CERRADO.
   2. Con la puerta cerrada: el GET no lee la planilla; la verificación del webhook de Meta (un GET con `hub.challenge`) sigue
      andando; el POST `list` del panel sigue andando; `probarAntesDeImplementar` lo dice.
   3. Lo que podría leer por GET sin querer (Google convierte a veces un POST en GET, §4fx) lo toma como «no corrió» y reintenta: la
      página (`respuesta_de_lectura`), el respaldo de Kommo (`traer_kommo.es_lectura`) y la revisión de correos (`cargar_pedidos.post`).
   Solo datos inventados. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_puerta_get.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 300)) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const APARTE = path.resolve('herramientas/cerrar_puerta_get.gs');

function hacerHoja(filas) {
  const datos = (filas || []).map(f => f.slice());
  const h = {
    _datos: datos, _lecturas: 0,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => { h._lecturas++; return datos.map(f => f.slice()); } }),
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
  return h;
}
function servidor(props0, conAparte) {
  const props = Object.assign({}, props0 || {}), main = hacerHoja([]), otras = {};
  const ss = { getSheetByName: (n) => n === 'Pedidos' ? main : (otras[n] || null), insertSheet: (n) => (otras[n] = hacerHoja([])), getId: () => 'planilla' };
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; } };
  const logs = [];
  const ctx = {
    console, Date, Logger: { log: (t) => logs.push(String(t)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getId: () => 'c' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({ getBytes: () => [] }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
                 getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  if (conAparte) vm.runInContext(fs.readFileSync(APARTE, 'utf8'), ctx);   // como un archivo más del proyecto: carga DESPUÉS
  ctx.getSheet();
  const row = ctx.recToRow({ id: 'p1', fecha: '2026-11-25', cliente: 'CLIENTA INVENTADA', vendedor: 'Mirian Salazar', celular: '70000003', productos: [] });
  main._datos.push(row);
  const get = (params) => ctx.doGet({ parameter: params || {} })._t;
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) }, parameter: {} })._t);
  return { ctx, main, props, get, post, logs };
}

console.log('\n── 1. El archivo aparte ──');
{
  const src = fs.readFileSync(GS, 'utf8'), ap = fs.readFileSync(APARTE, 'utf8');
  const nombres = (ap.match(/^(?:function|var)\s+([A-Za-z_$][\w$]*)/gm) || []).map(l => l.replace(/^(?:function|var)\s+/, ''));   // lo de afuera de las funciones (lo que se comparte)
  const choca = nombres.filter(n => new RegExp('^\\s*(?:function|var)\\s+' + n + '\\b', 'm').test(src));
  chk('⚠️ ningún nombre del archivo aparte existe en Código.gs (todos los archivos del proyecto comparten los nombres)', nombres.length >= 3 && choca.length === 0, { nombres, choca });
  try { new vm.Script(ap); chk('el archivo aparte es JavaScript válido (ES5: sin let/const/=>)', !/\b(let|const)\s|=>|`/.test(ap.replace(/\/\*[\s\S]*?\*\//g, ''))); }
  catch (e) { chk('el archivo aparte es JavaScript válido', false, e.message); }
  const S = servidor({}, true);
  chk('Código.gs sigue entero con el aparte cargado después (probar no dice «código VIEJO»)', S.ctx.probarAntesDeImplementar().lineas.some(l => /✅ Versión de este código: 2026-11-22-a/.test(l)));
  S.ctx.cerrarPuertaGetUnaVez();
  chk('⚠️ cerrarPuertaGetUnaVez pone GET_CERRADO = 1 y lo dice', S.props.GET_CERRADO === '1' && S.logs.some(l => /CERRADA/.test(l)), S.logs);
  chk('verPuertaGetUnaVez dice que está cerrada (no cambia nada)', /CERRADA/.test(S.ctx.verPuertaGetUnaVez()) && S.props.GET_CERRADO === '1');
  S.ctx.abrirPuertaGetUnaVez();
  chk('abrirPuertaGetUnaVez la saca', !('GET_CERRADO' in S.props) && /ABIERTA/.test(S.ctx.verPuertaGetUnaVez()));
}
console.log('\n── 2. Con la puerta cerrada ──');
{
  const S = servidor({ WA_HOOK_KEY: 'clave-meta-123' }, true);
  let g = JSON.parse(S.get({}));
  chk('con la puerta abierta el GET lee la planilla (como hasta hoy)', g.ok === true && Array.isArray(g.pedidos) && g.pedidos.length === 1);
  const pr0 = S.ctx.probarAntesDeImplementar();
  chk('probar avisa que la puerta está ABIERTA y cómo cerrarla', pr0.lineas.some(l => /⚠️ La puerta GET está ABIERTA.*cerrarPuertaGetUnaVez/.test(l)));
  S.ctx.cerrarPuertaGetUnaVez();
  S.ctx.getCacheOlvidar_();
  const lect0 = S.main._lecturas;
  g = JSON.parse(S.get({}));
  chk('⚠️ con GET_CERRADO el GET se niega: `get_cerrado`, sin un solo pedido', g.ok === false && g.error === 'get_cerrado' && !g.pedidos, g);
  chk('⚠️ …y sin leer la hoja', S.main._lecturas === lect0, S.main._lecturas - lect0);
  const v = S.get({ 'hub.mode': 'subscribe', 'hub.challenge': 'reto-4242', 'hub.verify_token': 'clave-meta-123' });
  chk('⚠️ la verificación del webhook de Meta (GET con hub.challenge) sigue andando: devuelve el reto', v === 'reto-4242', v);
  const L = S.post({ action: 'list' });
  chk('⚠️ el POST `list` del panel sigue andando', L.ok === true && L.pedidos.length === 1 && L.pedidos[0].id === 'p1');
  const pr = S.ctx.probarAntesDeImplementar();
  chk('⚠️ probarAntesDeImplementar dice que la puerta GET está CERRADA', pr.lineas.some(l => /✅ La puerta GET está CERRADA/.test(l)), pr.lineas.filter(l => /GET/.test(l)));
}
console.log('\n── 3. Lo que reintenta si Google convierte un POST en GET ──');
{
  const ph = fs.readFileSync(path.resolve('pedidos.html'), 'utf8');
  chk('la página: un `get_cerrado` (también en la lista) es `respuesta_de_lectura` (pasajero: reintenta)', /j\.error==='get_cerrado'\) && \(payload\.action!=='list' \|\| j\.error==='get_cerrado'\)\) throw new Error\('respuesta_de_lectura'\)/.test(ph));
  const py = (code) => cp.spawnSync('python3', ['-c', code], { encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONPATH: path.resolve('.') }) });
  let r = py("import traer_kommo as t; print(t.es_lectura({'ok':False,'error':'get_cerrado'}), t.pasajero({'ok':False,'error':'get_cerrado'}), t.es_lectura({'ok':True,'origen':'repaso'}))");
  chk('⚠️ el respaldo de Kommo toma `get_cerrado` como «Google cambió el aviso por una lectura» y reintenta', String(r.stdout).trim() === 'True True False', r.stdout + r.stderr);
  r = py([
    "import sys, json, types",
    "sys.path.insert(0, 'herramientas/pedidos_correo')",
    "import cargar_pedidos as c",
    "res = [json.dumps({'ok':False,'error':'get_cerrado'}), json.dumps({'ok':True,'pedidos':[]})]",
    "class R: pass",
    "def run(*a, **k):",
    "    o = R(); o.stdout = res.pop(0); o.stderr = ''; return o",
    "c.subprocess.run = run",
    "c.time.sleep = lambda s: None",
    "print(json.dumps(c.post({'action':'list'})))"
  ].join('\n'));
  chk('⚠️ la revisión de correos reintenta una lectura que volvió `get_cerrado`', /"pedidos": \[\]/.test(String(r.stdout)), r.stdout + r.stderr);
}
console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
