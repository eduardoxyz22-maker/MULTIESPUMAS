/* 🔐 LA CLAVE DEL EQUIPO EN DOS FASES (23/11/2026; dueño: «tengo listo para el viernes, ese día lo haré»).
   El archivo aparte herramientas/clave_equipo.gs junto con el .gs del servidor, en el MISMO contexto (como en Apps Script, donde
   todos los archivos del proyecto comparten los nombres), con un Google de mentira:
     1. ningún nombre del archivo aparte existe en el servidor;
     2. FASE 1: generar inventa las dos claves «próximas», las muestra en la ventana y NO las prende (el servidor sigue abierto);
        sin ventana no crea nada; si ya había una ADMIN_KEY, la usa; nada de las claves va al registro;
     3. FASE 2: activar prende las dos: sin la clave la lectura da «clave», con ella anda; forzar pide la de administración;
     4. desactivar vuelve a como hoy; cambiar la del equipo con la clave prendida deja afuera la de antes;
     5. las claves: 10 letras sin 0/o/1/l/i, distintas cada vez.
   Por defecto contra el .gs del repo; GS=<otro .gs> para correrlo contra otro (p. ej. la 21-a, la que está implementada).
   Se corre:  node tests/test_clave_equipo.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const AP = path.resolve('herramientas/clave_equipo.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 300)) : ''); };
const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hoja(filas) {
  const d = filas.map(f => f.slice());
  return { _datos: d, getLastRow: () => d.length, getLastColumn: () => (d[0] || []).length, getName: () => 'Pedidos',
    getDataRange: () => ({ getValues: () => d.map(f => f.slice()) }), setFrozenRows() {}, appendRow: r => d.push(r.slice()),
    deleteRow: n => d.splice(n - 1, 1), deleteRows: (n, k) => d.splice(n - 1, k),
    getRange: (f, c, nf, nc) => ({ getValue: () => (d[f - 1] || [])[c - 1], setValue: v => { (d[f - 1] = d[f - 1] || [])[c - 1] = v; },
      getValues: () => { const o = []; for (let i = 0; i < (nf || 1); i++) { const r = d[f - 1 + i] || [], x = []; for (let j = 0; j < (nc || 1); j++) x.push(r[c - 1 + j] == null ? '' : r[c - 1 + j]); o.push(x); } return o; },
      setValues: v => { for (let i = 0; i < v.length; i++) { const r = d[f - 1 + i] || (d[f - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[c - 1 + j] = v[i][j]; } },
      setFontWeight() {}, setNumberFormat() { return this; }, setNumberFormats() { return this; } }) };
}
function montar(props, opc) {
  opc = opc || {};
  const P = Object.assign({}, props || {}), CACHE = {}, LOG = [], VENTANAS = [], sh = hoja([HDR]), hojas = {};
  const sp = { getProperty: k => P[k] != null ? P[k] : null, getProperties: () => Object.assign({}, P),
    setProperty: (k, v) => { P[k] = String(v); }, deleteProperty: k => { delete P[k]; }, setProperties: o => Object.assign(P, o) };
  const ctx = {
    console, Date, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, parseInt,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: n => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet: n => (hojas[n] = hoja([])) }),
      getUi: () => { if (opc.sinUi) throw new Error('Cannot call SpreadsheetApp.getUi() from this context'); return { showModalDialog: (h, t) => { if (opc.ventanaFalla) throw new Error('no'); VENTANAS.push({ t, html: h._html }); } }; }
    },
    HtmlService: { createHtmlOutput: html => ({ _html: html, setWidth() { return this; }, setHeight() { return this; } }) },
    PropertiesService: { getScriptProperties: () => sp },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: k => CACHE[k] != null ? CACHE[k] : null, put: (k, v) => { CACHE[k] = String(v); }, putAll() {}, remove: k => { delete CACHE[k]; }, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ _t: t, setMimeType() { return this; }, getContent() { return t; } }) },
    DriveApp: {}, Utilities: { formatDate: d => String(d), getUuid: () => crypto.randomUUID() },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log: m => LOG.push(String(m)) },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }), getProjectTriggers: () => [], deleteTrigger() {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx, { filename: 'Código.gs' });
  vm.runInContext(fs.readFileSync(AP, 'utf8'), ctx, { filename: 'clave_equipo.gs' });
  const post = b => { try { ctx.cfgOlvidar_(); } catch (e) {} return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t); };
  return { ctx, P, LOG, VENTANAS, post };
}
const ABC = /^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/;

console.log('\n── 1. Los nombres del archivo aparte no existen en el servidor ──');
{
  const gs = fs.readFileSync(GS, 'utf8'), ap = fs.readFileSync(AP, 'utf8');
  const nombres = (ap.match(/^(?:function|var)\s+([A-Za-z0-9_]+)/gm) || []).map(x => x.replace(/^(function|var)\s+/, ''));
  const choca = nombres.filter(n => new RegExp('^(?:function|var)\\s+' + n + '\\b', 'm').test(gs));
  chk('ninguna función ni variable del archivo aparte está también en el servidor', nombres.length >= 10 && !choca.length, { nombres: nombres.length, choca });
  chk('el archivo aparte no escribe nada en la planilla ni manda mensajes', !/appendRow|setValue|UrlFetchApp|MailApp|GmailApp/.test(ap));
}

console.log('\n── 2. FASE 1: generar no prende nada ──');
{
  const S = montar({});
  const r = S.ctx.generarClavesUnaVez();
  const eq = S.P.PANEL_KEY_PROXIMA, ad = S.P.ADMIN_KEY_PROXIMA;
  chk('genera las dos claves «próximas»', r === 'generadas' && ABC.test(eq || '') && ABC.test(ad || '') && eq !== ad, { r, eq: !!eq, ad: !!ad });
  chk('…y NO pone PANEL_KEY ni ADMIN_KEY (el servidor sigue sin pedir clave)', S.P.PANEL_KEY == null && S.P.ADMIN_KEY == null);
  chk('…las muestra en UNA ventana de la planilla, con las dos', S.VENTANAS.length === 1 && S.VENTANAS[0].html.indexOf(eq) >= 0 && S.VENTANAS[0].html.indexOf(ad) >= 0);
  chk('…y ninguna clave va al registro de ejecución', !S.LOG.some(l => l.indexOf(eq) >= 0 || l.indexOf(ad) >= 0), S.LOG);
  const l0 = S.post({ action: 'list' }), l1 = S.post({ action: 'list', key: eq });
  chk('el panel sin clave sigue leyendo (auth «abierto») y con la clave cargada también', l0.ok === true && l0.auth === 'abierto' && l1.ok === true, { l0: l0.auth, l1: l1.ok });
  chk('generar otra vez no las cambia', S.ctx.generarClavesUnaVez() === 'ya estaban' && S.P.PANEL_KEY_PROXIMA === eq && S.P.ADMIN_KEY_PROXIMA === ad);
  chk('mostrar las vuelve a enseñar (ventana), sin el registro', S.ctx.mostrarClavesUnaVez() === 'mostradas' && S.VENTANAS.length === 2 && !S.LOG.some(l => l.indexOf(eq) >= 0));
  chk('ver dice que no rige y que están generadas, sin mostrarlas', /NO pide clave/.test(S.ctx.verClavesUnaVez()) && /generadas/.test(S.ctx.verClavesUnaVez()) && S.ctx.verClavesUnaVez().indexOf(eq) < 0);

  const N = montar({}, { sinUi: true });
  chk('sin la ventana de la planilla (corrido sin la planilla abierta): no crea nada', N.ctx.generarClavesUnaVez() === 'sin ventana' && N.P.PANEL_KEY_PROXIMA == null && N.P.ADMIN_KEY_PROXIMA == null);
  const V = montar({}, { ventanaFalla: true });
  chk('si la ventana falla al mostrarse: deshace las claves (nadie las vio)', V.ctx.generarClavesUnaVez() === 'sin ventana' && V.P.PANEL_KEY_PROXIMA == null && V.P.ADMIN_KEY_PROXIMA == null);
  const A = montar({ ADMIN_KEY: 'admin-ya-puesta' });
  A.ctx.generarClavesUnaVez();
  chk('si el servidor ya tenía una ADMIN_KEY, la próxima es ESA (los aparatos que la tienen no la pierden)', A.P.ADMIN_KEY_PROXIMA === 'admin-ya-puesta');
}

console.log('\n── 3. FASE 2: activar ──');
{
  const S = montar({});
  chk('activar sin haber generado: no prende nada', S.ctx.activarClavesUnaVez() === 'sin claves' && S.P.PANEL_KEY == null);
  S.ctx.generarClavesUnaVez();
  const eq = S.P.PANEL_KEY_PROXIMA, ad = S.P.ADMIN_KEY_PROXIMA;
  chk('activar pone PANEL_KEY y ADMIN_KEY con las próximas', S.ctx.activarClavesUnaVez() === 'activadas' && S.P.PANEL_KEY === eq && S.P.ADMIN_KEY === ad);
  const sin = S.post({ action: 'list' }), mal = S.post({ action: 'list', key: 'otra' }), bien = S.post({ action: 'list', key: eq });
  chk('sin la clave: «clave» y sin la planilla', sin.ok === false && sin.error === 'clave' && !sin.pedidos, sin);
  chk('con otra clave: «clave»', mal.ok === false && mal.error === 'clave', mal);
  chk('con la clave del equipo: lee, y la lectura dice «clave» (el panel deja de mostrar el aviso rojo)', bien.ok === true && Array.isArray(bien.pedidos) && bien.auth === 'clave', { ok: bien.ok, auth: bien.auth });
  S.ctx.cfgOlvidar_();
  chk('forzar sin la clave de administración: no', S.ctx.forzarOk_({}).ok === false);
  S.ctx.cfgOlvidar_();
  chk('forzar con la clave de administración: sí', S.ctx.forzarOk_({ adminKey: ad }).ok === true);
  chk('ver dice que rige, sin mostrarlas', /PIDE la clave/.test(S.ctx.verClavesUnaVez()) && S.ctx.verClavesUnaVez().indexOf(eq) < 0);
  chk('el registro nunca tuvo las claves', !S.LOG.some(l => l.indexOf(eq) >= 0 || l.indexOf(ad) >= 0));

  console.log('\n── 4. Volver atrás y cambiar la del equipo ──');
  chk('desactivar: el servidor vuelve a aceptar sin clave', S.ctx.desactivarClavesUnaVez() === 'desactivadas' && S.post({ action: 'list' }).ok === true);
  chk('…y activar otra vez usa las mismas', S.ctx.activarClavesUnaVez() === 'activadas' && S.P.PANEL_KEY === eq);
  chk('cambiar la del equipo con la clave prendida', S.ctx.cambiarClaveEquipoUnaVez() === 'cambiada' && S.P.PANEL_KEY !== eq && S.P.PANEL_KEY === S.P.PANEL_KEY_PROXIMA && ABC.test(S.P.PANEL_KEY));
  chk('…la de antes ya no vale y la nueva sí', S.post({ action: 'list', key: eq }).error === 'clave' && S.post({ action: 'list', key: S.P.PANEL_KEY }).ok === true);
  chk('…y la de administración no cambió', S.P.ADMIN_KEY === ad);
  const N = montar({}); N.ctx.generarClavesUnaVez(); const p0 = N.P.PANEL_KEY_PROXIMA;
  N.ctx.SpreadsheetApp.getUi = () => { throw new Error('sin ventana'); };
  chk('cambiar sin ventana: no cambia nada', N.ctx.cambiarClaveEquipoUnaVez() === 'sin ventana' && N.P.PANEL_KEY_PROXIMA === p0);
}

console.log('\n── 5. Las claves ──');
{
  const S = montar({}), vistas = new Set();
  let todas = true;
  for (let i = 0; i < 300; i++) { const k = S.ctx.claveEqNueva_(); if (!ABC.test(k)) todas = false; vistas.add(k); }
  chk('300 claves: todas de 10 letras/números sin 0, o, 1, l, i, y todas distintas', todas && vistas.size === 300, vistas.size);
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exitCode = FAIL ? 1 : 0;
