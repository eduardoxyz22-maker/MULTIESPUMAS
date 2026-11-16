/* 💬 EL CHAT DEL EQUIPO ADENTRO DEL PANEL (mejora 344, 16/11; el dueño eligió 1A, 2A, 3C, 4A y 5B). La página (`chat.js`) contra el `.gs`
   DE VERDAD (con un Google de mentira en Node): varias «personas», cada una en su navegador, que se escriben.
     1. Sin `CHAT_PRUEBA` (Playwright) no aparece nada; con un servidor anterior al 2026-11-16-a, tampoco el botón.
     2. La clave de cada persona es la MISMA en la página y en el servidor.
     3. Mirian le escribe a Eduardo por privado: «✓ Enviado»; a Eduardo le llega el número rojo con la lectura de la planilla (sin abrir el
        chat), abre, lo ve y a Mirian le vuelve «✓✓ Visto». La pestaña del navegador dice «(1)».
     4. Lo privado no lo ve una tercera (Carola), ni la ventanilla de Logística de otra; Logística ve todas las suyas.
     5. @Bloki contesta con los números del panel (sin IA) y en el grupo NO dice plata; por privado sí contesta.
     6. «#11-188» es la ficha del pedido (abre la ficha de siempre).
     7. Fotos: elegir, pegar con Ctrl + V; suben a la carpeta del chat y se ven en el mensaje.
     8. Sin señal: queda en la cola del aparato y sale después, sin duplicar.
     9. Avisos: el de Windows (`escritorio.js`, tipo «chat»), Bloki (un aviso más) y el sonido callado con el 🔇 de Bloki.
    10. Quién sos: sin nombre lo pide; «Administración» pregunta si es Eduardo; ROHO no tiene chat. Práctica: lee, no manda.
    11. Dónde vive: 420 px en la compu de 1366 (Bloki se corre), 640 en la de 1920 (dos columnas), el celular en una columna; Esc cierra;
        borrar lo propio; el grupo «visto por N de M».
   Datos SINTÉTICOS (el repo es público).   Se corre:  node tests/test_chat.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/* ── El servidor de verdad (el .gs con un Google de mentira) ── */
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length, getMaxRows: () => Math.max(1000, datos.length), insertRowsAfter: () => {},
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
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
function servidor(version) {
  const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
    '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
    'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
  const sh = hacerPlanilla([HDR]), hojas = {}, props = {}, cache = {}, drive = { carpetas: {}, archivos: {}, n: 0 }, candado = { script: 0, doc: 0 };
  const carpeta = (nombre) => {
    if (drive.carpetas[nombre]) return drive.carpetas[nombre];
    const id = 'carpeta_' + nombre.replace(/\W+/g, '_'), c = { id, nombre, getId: () => id, setSharing: () => {},
      getFiles: () => { const L = Object.values(drive.archivos).filter(f => f.padre === id); let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; },
      createFile: (blob) => { const fid = 'fotochat' + String(++drive.n).padStart(10, '0'); const f = { id: fid, padre: id, papelera: false, getId: () => fid, setSharing: () => {}, setTrashed: (v) => { f.papelera = !!v; },
        getDateCreated: () => new Date(), getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return { getId: () => id }; } }; } }; drive.archivos[fid] = f; return f; } };
    drive.carpetas[nombre] = c; return c;
  };
  const ctx = {
    console, Date, JSON, Math,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => Object.assign(props, o) }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() { candado.script++; }, releaseLock() {}, tryLock() { return true; } }), getDocumentLock: () => ({ waitLock() { candado.doc++; }, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), getAll: (ks) => { const o = {}; ks.forEach(k => { if (k in cache) o[k] = cache[k]; }); return o; },
      put: (k, v) => { cache[k] = String(v); }, putAll: (o) => { for (const k in o) cache[k] = String(o[k]); }, remove: (k) => { delete cache[k]; }, removeAll: (ks) => ks.forEach(k => delete cache[k]) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, getContent() { return this._t; }, setMimeType() { return this; } }) },
    DriveApp: { Access: { ANYONE_WITH_LINK: 'a' }, Permission: { VIEW: 'v' },
      getFolderById: (id) => { const c = Object.values(drive.carpetas).find(x => x.id === id); if (!c) throw new Error('no'); return c; },
      getFoldersByName: (n) => { let d = !drive.carpetas[n]; return { hasNext: () => !d, next: () => { d = true; return drive.carpetas[n]; } }; },
      createFolder: (n) => carpeta(n), getFileById: (id) => { const f = drive.archivos[id]; if (!f) throw new Error('no'); return f; } },
    Utilities: { formatDate: () => '20261116_100000', sleep: () => {}, base64Decode: (s) => Array.from(Buffer.from(s, 'base64')), newBlob: (b, t, n) => ({ b, t, n }),
      gzip: () => { throw new Error('sin gzip'); }, base64Encode: (b) => Buffer.from(b).toString('base64') },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }), getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  ctx.SCRIPT_VERSION = version || '2026-11-16-a';
  const llamadas = [];
  const post = (body) => { let a = ''; try { a = JSON.parse(body).action || 'save'; } catch (e) {} llamadas.push(a); return ctx.doPost({ postData: { contents: body }, parameter: {} })._t; };
  return { ctx, sh, hojas, props, cache, drive, candado, post, llamadas };
}
/* Cada página habla con ese servidor. `__ctl.caido`: sin señal. */
function INIT(o) {
  try {
    if (o.vend != null) localStorage.setItem('me_mis_vendedor', o.vend); else localStorage.removeItem('me_mis_vendedor');
    if (o.rol) localStorage.setItem('me_quien_rol', o.rol); else localStorage.removeItem('me_quien_rol');
    sessionStorage.setItem('me_quien_ok', 'ok');
  } catch (e) {}
  if (o.chat) window.CHAT_PRUEBA = 1;
  if (o.asis) window.ASIS_PRUEBA = 1;
  if (o.esc) window.ESC_PRUEBA = 1;
  if (o.son) window.SON_PRUEBA = 1;
  window.__ctl = { caido: false, acciones: [] };
  window.fetch = function (url, op) {
    var body = (op && op.body) || '{}', P = {}; try { P = JSON.parse(body); } catch (e) {}
    window.__ctl.acciones.push(P.action || 'save');
    if (window.__ctl.caido) return Promise.reject(new TypeError('Failed to fetch'));
    return window.__gs(body).then(function (t) { return { ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(t)); }, text: function () { return Promise.resolve(t); } }; });
  };
  /* Avisos de Windows de mentira (como test_escritorio) */
  window.__notifs = [];
  var N = function (t, op) { window.__notifs.push({ t: t, b: (op || {}).body, tag: (op || {}).tag, req: (op || {}).requireInteraction }); this.close = function () {}; };
  N.permission = 'granted'; N.requestPermission = function () { return Promise.resolve('granted'); };
  window.Notification = N;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const abrir = async (S, o, vp) => {
    const context = await browser.newContext({ viewport: vp || { width: 1366, height: 768 }, timezoneId: 'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT, o);
    await context.route(/^https?:/, r => r.abort());
    const p = await context.newPage();
    p.setDefaultTimeout(10000);
    p.on('pageerror', e => errores.push((o.vend || o.rol || '?') + ': ' + e.message));
    p.on('dialog', d => d.accept());
    await p.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.evaluate(async () => {
      var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
      CONNECTED = true;
      if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      CARGA_GEN++; CARGA_ESTADO = 'ok';
      if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; }
      if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
      await refrescarEstado(); ULTIMO_ERROR = '';
    });
    await p.waitForTimeout(300);
    return { context, p };
  };
  const leerYa = (P) => P.evaluate(async () => { CHAT.leyendo = false; await chatLeerYa(); });
  const lista = (P) => P.evaluate(async () => { await refrescarEstado(); });
  const escribir = async (P, txt) => { await P.fill('#cht-tx', txt); await P.press('#cht-tx', 'Enter'); await P.waitForTimeout(400); await P.evaluate(async () => { for (let i = 0; i < 40 && (CHAT.enviando || CHAT.cola.length); i++) await new Promise(r => setTimeout(r, 50)); }); };
  const msgsDe = (P, c) => P.evaluate((c) => Object.keys(CHAT.msgs).map(k => CHAT.msgs[k]).filter(m => !c || m.c === c).sort((a, b) => a.t - b.t), c);

  /* ══ 1. Apagado ══ */
  {
    const S = servidor();
    const { context, p } = await abrir(S, { vend: 'Mirian Salazar' });
    const r = await p.evaluate(() => ({ btn: !!document.getElementById('cht-btn'), panel: !!document.getElementById('cht-panel'), chat: typeof window.CHAT }));
    chk('1a. sin CHAT_PRUEBA (Playwright): ni botón ni panel (el archivo se cargó igual)', !r.btn && !r.panel && r.chat === 'object', r);
    const pl = await p.evaluate(() => { var o = { action: 'list' }; chatListaPedir(o); return o; });
    chk('1b. …y la lectura de la planilla no lleva nada del chat', pl.cq === undefined, pl);
    await context.close();
    const S2 = servidor('2026-11-15-a');
    const b = await abrir(S2, { vend: 'Mirian Salazar', chat: 1 });
    const r2 = await b.p.evaluate(() => { var x = document.getElementById('cht-btn'); return { hay: !!x, oculto: x ? x.hidden : null, ver: SERVER_VER }; });
    chk('1c. con el servidor anterior (2026-11-15-a) el botón no aparece', r2.hay && r2.oculto === true && r2.ver === '2026-11-15-a', r2);
    await b.context.close();
  }

  /* ══ 2..11. El chat de verdad ══ */
  const S = servidor();
  const PED_ID = 'ped-rosa';
  S.sh._datos.push(S.ctx.recToRow({ id: PED_ID, fecha: '2026-11-18', oc: '11-188', vendedor: 'Mirian Salazar', cliente: 'ROSA MENDEZ', celular: '70000011', turno: 'AM', zona: 'Norte', direccion: 'Calle 1',
    productos: [{ desc: 'COLCHON TITANIO ICE', medida: '140x190', codigo: 'CH1220', cant: 1, precio: 5000 }], pagado: false, saldo: 1250, acuenta: 3750, metodoPago: '', ts: Date.now() - 864e5, rev: 1, fotos: [] }));
  const M = await abrir(S, { vend: 'Mirian Salazar', chat: 1, asis: 1, esc: 1 });
  const ED = await abrir(S, { vend: 'Eduardo Añez', chat: 1, asis: 1, esc: 1 });
  const CA = await abrir(S, { vend: 'Carola Chavez', chat: 1 });
  const LO = await abrir(S, { vend: '', rol: 'logistica', chat: 1 });

  /* 2. La clave de cada persona */
  {
    const nombres = ['Mirian Salazar', 'Eduardo Añez', 'Carola Chávez', 'Fabián Godoy', '  maria   FLORES ', 'Jonathan Monje', 'Andrea Orias', 'Ñandú Pérez-López'];
    const clavesPag = await M.p.evaluate((L) => L.map(n => window.chatClave ? chatClave(n) : null), nombres);
    const clavesSrv = nombres.map(n => S.ctx.chatPersona_(n));
    chk('2a. la clave de cada persona es la misma en la página y en el servidor', JSON.stringify(clavesPag) === JSON.stringify(clavesSrv), { clavesPag, clavesSrv });
    const b = await M.p.evaluate(() => { var x = document.getElementById('cht-btn'); return { ver: x && !x.hidden, txt: x && x.textContent }; });
    chk('2b. con el servidor 2026-11-16-a el botón «💬 Chat» está arriba', b.ver && /Chat/.test(b.txt), b);
  }

  /* 3. Mirian → Eduardo por privado */
  const P_ME = 'p:eduardo anez|mirian salazar';
  {
    await M.p.click('#cht-btn');
    await M.p.waitForTimeout(400);
    let r = await M.p.evaluate(() => ({ on: document.body.classList.contains('cht-on'), lista: [].map.call(document.querySelectorAll('#cht-lst .cht-it b'), b => b.textContent) }));
    chk('3a. abrir: el panel a la derecha con el grupo, Logística, Contabilidad, Eduardo y las compañeras', r.on && r.lista.indexOf('Todo el equipo') >= 0 && r.lista.indexOf('Logística') >= 0 && r.lista.indexOf('Contabilidad') >= 0 && r.lista.indexOf('Eduardo Añez') >= 0 && r.lista.indexOf('Carola Chavez') >= 0, r.lista);
    await M.p.evaluate((c) => chatAbrir(c), P_ME);
    const nota = await M.p.evaluate(() => document.querySelector('.cht-nota').textContent);
    chk('3b. el privado dice que no es para claves ni cosas personales (2A)', /Lo ven ustedes dos en el panel/.test(nota) && /no es para claves ni cosas personales/.test(nota), nota);
    await escribir(M.p, 'Eduardo, un cliente quiere 2 TITANIO ICE 160. ¿Le hago el 10 %?');
    const L = await msgsDe(M.p, P_ME);
    const fila = S.hojas.Chat && S.hojas.Chat._datos[1];
    chk('3c. el mensaje llegó a la hoja «Chat» con la hora del servidor', L.length === 1 && !L[0].pend && fila && fila[4] === P_ME && /TITANIO ICE 160/.test(fila[8]), { L, fila });
    const ck = await M.p.evaluate(() => { var m = document.querySelector('.cht-m.yo'); return m && m.textContent; });
    chk('3d. Mirian ve «✓ Enviado»', /✓ Enviado/.test(ck || ''), ck);
    chk('3e. mandar no tomó el candado de doPost', S.candado.script === 0, S.candado);
    /* Eduardo: con la lectura de la planilla (chat cerrado) le aparece el número */
    const antes = await ED.p.evaluate(() => __ctl.acciones.filter(a => a === 'chatLeer').length);
    await lista(ED.p);
    await ED.p.waitForTimeout(2600);   // el reloj del chat lee una vez (para el texto del aviso)
    r = await ED.p.evaluate(() => ({ n: document.getElementById('cht-n').textContent, oculto: document.getElementById('cht-n').hidden, tit: document.title, leer: __ctl.acciones.filter(a => a === 'chatLeer').length }));
    chk('3f. a Eduardo le aparece el «1» rojo con la lectura de la planilla, sin abrir el chat', r.n === '1' && !r.oculto, r);
    chk('3g. la pestaña del navegador dice «(1)»', /^\(1\)/.test(r.tit), r.tit);
    chk('3h. con el chat cerrado hizo UNA lectura del chat (para el texto del aviso)', r.leer - antes === 1, [antes, r.leer]);
    /* el aviso de Windows y Bloki */
    const av = await ED.p.evaluate(() => ({ esc: (typeof escPendientes === 'function' ? escPendientes() : []).filter(x => x.tipo === 'chat'), bk: (typeof asisAvisos === 'function' ? asisAvisos() : []).filter(a => /^chat\|/.test(a.k)) }));
    chk('3i. el aviso de Windows (tipo «chat») con quién y qué', av.esc.length === 1 && /Mirian/.test(av.esc[0].t) && /TITANIO/.test(av.esc[0].b) && av.esc[0].tag === 'chat|' + P_ME, av.esc);
    chk('3j. Bloki lo dice: «Mirian te escribió», con «Abrir el chat»', av.bk.length === 1 && /Mirian te escribió/.test(av.bk[0].t) && /chatAbrir/.test(av.bk[0].b[1]), av.bk);
    /* Eduardo abre: lo ve */
    await ED.p.click('#cht-btn');
    await ED.p.waitForTimeout(800);
    r = await ED.p.evaluate((c) => { var it = document.querySelector('#cht-lst [data-cc="' + c + '"]'); return { uno: CHAT.uno, cur: CHAT.cur, it: it && it.textContent, rojo: !!(it && it.querySelector('.cht-cn.r')), primera: (document.querySelector('#cht-lst .cht-sc + .cht-it, #cht-lst .cht-it') || {}).textContent }; }, P_ME);
    chk('3k. en la compu de 1366 (una columna) abre la lista: Mirian con su número rojo', r.uno === true && r.cur === null && /Mirian Salazar/.test(r.it) && /TITANIO/.test(r.it) && r.rojo, r);
    await ED.p.click('#cht-lst [data-cc="' + P_ME + '"]');
    await ED.p.waitForTimeout(500);
    r = await ED.p.evaluate(() => ({ cur: CHAT.cur, txt: (document.getElementById('cht-ms') || {}).textContent || '', nue: !!document.getElementById('cht-nue') }));
    chk('3k2. tocarla abre la conversación, con la raya «sin leer»', r.cur === 'p:eduardo anez|mirian salazar' && /TITANIO ICE 160/.test(r.txt) && r.nue, r);
    await ED.p.waitForTimeout(1200);
    r = await ED.p.evaluate(() => ({ n: document.getElementById('cht-n').hidden, tit: document.title }));
    chk('3l. visto: el número se va', r.n === true && !/^\(\d/.test(r.tit), r);
    const vis = S.hojas['Chat vistos'] && S.hojas['Chat vistos']._datos.find(x => x[0] === 'eduardo anez');
    chk('3m. el «visto» viajó a la hoja «Chat vistos»', vis && JSON.parse(vis[1])[P_ME] > 0, vis);
    await leerYa(M.p); await M.p.waitForTimeout(300);
    const ck2 = await M.p.evaluate(() => { var m = document.querySelector('.cht-m.yo'); return m && m.textContent; });
    chk('3n. a Mirian le vuelve «✓✓ Visto»', /✓✓ Visto/.test(ck2 || ''), ck2);
    /* Eduardo contesta */
    await escribir(ED.p, 'Dale, hacele el 10 % si lleva el somier');
    await leerYa(M.p); await M.p.waitForTimeout(300);
    r = await M.p.evaluate(() => ({ txt: document.getElementById('cht-ms').textContent }));
    chk('3o. Mirian (con la conversación abierta) ve la respuesta en la lectura siguiente', /hacele el 10 %/.test(r.txt), r);
  }

  /* 4. Lo privado no lo ve una tercera */
  {
    await CA.p.click('#cht-btn'); await CA.p.waitForTimeout(800);
    const L = await msgsDe(CA.p);
    const conv = await CA.p.evaluate(() => [].map.call(document.querySelectorAll('#cht-lst .cht-it b'), b => b.textContent));
    chk('4a. Carola no recibe el privado de Mirian con Eduardo', !L.some(m => m.c === P_ME) && conv.indexOf('Eduardo Añez') >= 0, { L: L.map(m => m.c), conv });
    await M.p.evaluate(() => chatAbrir('b:log|mirian salazar'));
    const nota = await M.p.evaluate(() => document.querySelector('.cht-nota').textContent);
    chk('4b. la ventanilla de Logística dice quién la contesta y que las otras no la ven', /quien esté en Logística/.test(nota) && /otras vendedoras no ven/.test(nota), nota);
    await escribir(M.p, '¿Sale el #11-188 el miércoles?');
    await CA.p.evaluate(async () => { CHAT.leyendo = false; await chatLeerYa(); });
    const L2 = await msgsDe(CA.p);
    chk('4c. Carola no ve la ventanilla de Mirian', !L2.some(m => /^b:log\|mirian/.test(m.c)), L2.map(m => m.c));
    await LO.p.click('#cht-btn'); await LO.p.waitForTimeout(800);
    const L3 = await msgsDe(LO.p);
    const lst = await LO.p.evaluate(() => [].map.call(document.querySelectorAll('#cht-lst .cht-it b'), b => b.textContent));
    chk('4d. Logística ve la pregunta de Mirian (su ventanilla) y no el privado con Eduardo', L3.some(m => m.c === 'b:log|mirian salazar') && !L3.some(m => m.c === P_ME), L3.map(m => m.c));
    chk('4e. Logística tiene una conversación por vendedora', lst.indexOf('Mirian Salazar') >= 0 && lst.indexOf('Carola Chavez') >= 0 && lst.indexOf('Todo el equipo') >= 0, lst);
    await LO.p.evaluate(() => chatAbrir('b:log|mirian salazar'));
    await escribir(LO.p, 'Sí, va en el Carry a la mañana 🚚');
    await leerYa(M.p);
    const ult = (await msgsDe(M.p, 'b:log|mirian salazar')).pop();
    chk('4f. la respuesta de Logística le llega a Mirian con «Logística»', ult && ult.d === 'log' && /Carry/.test(ult.x) && /Logística/.test(ult.n), ult);
  }

  /* 5. @Bloki */
  {
    await M.p.evaluate(() => chatAbrir('eq'));
    await escribir(M.p, '@Bloki ¿hay lugar el sábado?');
    let L = await msgsDe(M.p, 'eq');
    let bk = L.filter(m => m.r === 'b').pop();
    chk('5a. @Bloki contesta en el grupo, como «Bloki», con los números del panel', bk && bk.d === 'bloki' && bk.b === 'mirian salazar' && /lugar|cupo|camión|sábado/i.test(bk.x) && !/No sé contestar/.test(bk.x), bk);
    const pie = await M.p.evaluate(() => { var b = [].slice.call(document.querySelectorAll('.cht-m.bk')).pop(); return b && b.textContent; });
    chk('5b. el pie dice «Con los números del panel … · sin IA»', /Con los números del panel de las \d\d:\d\d · sin IA/.test(pie || ''), pie);
    await escribir(M.p, '@Bloki ¿cuánto le falta pagar a Rosa Mendez?');
    L = await msgsDe(M.p, 'eq'); bk = L.filter(m => m.r === 'b').pop();
    chk('5c. en el grupo NO dice plata: «preguntámelo por privado»', bk && /Eso es plata/.test(bk.x) && !/Bs/.test(bk.x), bk && bk.x);
    const priv = await M.p.evaluate(() => chatBlokiTexto('@Bloki ¿cuánto le falta pagar a Rosa Mendez?', 'p:eduardo anez|mirian salazar'));
    chk('5d. por privado contesta lo del cliente', !/Eso es plata/.test(priv) && /ROSA|Rosa|1\.250|1250|falta/i.test(priv), priv);
    const ven = await M.p.evaluate(() => chatBlokiTexto('@Bloki ¿quiénes me deben?', 'b:log|mirian salazar'));
    chk('5e. en la ventanilla tampoco dice plata', /Eso es plata/.test(ven), ven);
    const nose = await M.p.evaluate(() => chatBlokiTexto('@Bloki contame un chiste', 'eq'));
    chk('5f. lo que no sabe, lo dice (y qué sí contesta), sin IA', /No sé contestar eso todavía/.test(nose) && /stock/.test(nose), nose);
    const ia = S.llamadas.filter(a => a === 'bloki').length;
    chk('5g. nada fue a Claude (ni la acción `bloki` del servidor)', ia === 0, S.llamadas.filter(a => a === 'bloki'));
    await leerYa(ED.p);
    const nEd = await ED.p.evaluate(() => (typeof escPendientes === 'function' ? escPendientes() : []).filter(x => x.tipo === 'chat' && /grupo/.test(x.t)).length);
    chk('5h. lo del grupo que no nombra a Eduardo no le saca aviso de Windows (solo suma al número)', nEd === 0, nEd);
  }

  /* 6. #11-188 */
  {
    await M.p.evaluate(() => chatAbrir('b:log|mirian salazar'));
    await M.p.waitForTimeout(300);
    const chip = await M.p.evaluate(() => { var b = document.querySelector('#cht-ms .cht-ped'); return b && { t: b.textContent, pid: b.getAttribute('data-pid') }; });
    chk('6a. «#11-188» es una ficha chica con el cliente y el día', chip && /11-188/.test(chip.t) && /ROSA/.test(chip.t) && chip.pid === PED_ID, chip);
    const filaP = S.hojas.Chat._datos.find(x => /#11-188/.test(x[8] || ''));
    chk('6b. el mensaje guarda el id fijo del pedido', filaP && filaP[10] === PED_ID + '~11-188', filaP && filaP[10]);
    await M.p.click('#cht-ms .cht-ped');
    await M.p.waitForTimeout(400);
    const mo = await M.p.evaluate(() => ({ on: document.getElementById('modal').classList.contains('on'), txt: document.getElementById('modal-box').textContent, chat: document.body.classList.contains('cht-on') }));
    chk('6c. tocarla abre la ficha de siempre (y el chat sigue ahí)', mo.on && /ROSA MENDEZ/.test(mo.txt) && mo.chat, { on: mo.on, chat: mo.chat });
    await M.p.evaluate(() => closeModal());
    await M.p.fill('#cht-tx', 'mirá el #11-188');
    await M.p.evaluate(() => { var t = document.getElementById('cht-tx'); t.setSelectionRange(t.value.length, t.value.length); });
    await M.p.fill('#cht-tx', '#ros'); await M.p.dispatchEvent('#cht-tx', 'input');
    const ac = await M.p.evaluate(() => { var a = document.getElementById('cht-acm'); return { ver: !a.hidden, t: a.textContent }; });
    chk('6d. escribir «#» busca los pedidos (cliente, OC, nota, celular)', ac.ver && /11-188/.test(ac.t) && /ROSA/.test(ac.t), ac);
    await M.p.press('#cht-tx', 'Enter');
    const v = await M.p.inputValue('#cht-tx');
    chk('6e. Enter elige: queda «#11-188 »', v === '#11-188 ', v);
    await M.p.fill('#cht-tx', '');
  }

  /* 7. Fotos */
  {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await M.p.setInputFiles('#cht-file', { name: 'captura.png', mimeType: 'image/png', buffer: png });
    await M.p.evaluate(async () => { for (let i = 0; i < 60 && CHAT.fotos.some(f => f.estado === 'sube'); i++) await new Promise(r => setTimeout(r, 50)); });
    let r = await M.p.evaluate(() => ({ f: CHAT.fotos.map(f => ({ e: f.estado, id: f.fid })), tira: document.getElementById('cht-fotos').hidden }));
    chk('7a. elegir una foto: se achica y sube (a la carpeta del chat)', r.f.length === 1 && r.f[0].e === 'ok' && !r.tira && S.drive.archivos[r.f[0].id] && S.drive.archivos[r.f[0].id].padre === S.drive.carpetas['Fotos chat MultiEspumas'].id, r);
    await M.p.evaluate(() => {
      var t = document.getElementById('cht-tx'); t.focus();
      var bin = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var dt = new DataTransfer(); dt.items.add(new File([u], 'pegada.png', { type: 'image/png' }));
      t.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await M.p.evaluate(async () => { for (let i = 0; i < 60 && CHAT.fotos.some(f => f.estado === 'sube'); i++) await new Promise(r => setTimeout(r, 50)); });
    r = await M.p.evaluate(() => CHAT.fotos.map(f => f.estado));
    chk('7b. pegar una captura con Ctrl + V también la sube', r.length === 2 && r.every(e => e === 'ok'), r);
    await escribir(M.p, 'la etiqueta');
    const L = await msgsDe(M.p, 'b:log|mirian salazar');
    const ult = L.pop();
    const img = await M.p.evaluate(() => { var b = [].slice.call(document.querySelectorAll('#cht-ms .cht-foto img')); return b.map(x => x.getAttribute('src')); });
    chk('7c. el mensaje lleva las dos fotos y se ven (miniatura de Drive)', ult && ult.f.length === 2 && img.length >= 2 && img.every(s => /lh3\.googleusercontent\.com\/d\/fotochat/.test(s)), { f: ult && ult.f, img });
    await M.p.click('#cht-ms .cht-foto');
    const vis = await M.p.evaluate(() => { var v = document.getElementById('cht-visor'); var o = { ver: !v.hidden, src: (v.querySelector('img') || {}).src }; v.hidden = true; return o; });
    chk('7d. tocar la foto la abre grande', vis.ver && /=w1600/.test(vis.src), vis);
  }

  /* 8. Sin señal */
  {
    await M.p.evaluate(() => { __ctl.caido = true; });
    await M.p.fill('#cht-tx', 'mensaje sin señal'); await M.p.press('#cht-tx', 'Enter');
    await M.p.waitForTimeout(500);
    let r = await M.p.evaluate(() => ({ cola: JSON.parse(localStorage.getItem('me_chat_cola') || '[]').length, pend: Object.keys(CHAT.msgs).map(k => CHAT.msgs[k]).filter(m => m.pend).length, txt: [].slice.call(document.querySelectorAll('.cht-m.yo')).pop().textContent }));
    chk('8a. sin señal queda en la cola del aparato, a la vista con «sin enviar · reintentar»', r.cola === 1 && r.pend === 1 && /sin enviar/.test(r.txt), r);
    const n0 = S.hojas.Chat._datos.length;
    await M.p.evaluate(async () => { __ctl.caido = false; CHAT.reintentoEn = 0; await chatEnviarYa(); });
    r = await M.p.evaluate(() => ({ cola: JSON.parse(localStorage.getItem('me_chat_cola') || '[]').length, pend: Object.keys(CHAT.msgs).map(k => CHAT.msgs[k]).filter(m => m.pend).length }));
    chk('8b. con señal sale solo y la cola queda vacía', r.cola === 0 && r.pend === 0 && S.hojas.Chat._datos.length === n0 + 1, r);
    const m = S.hojas.Chat._datos[S.hojas.Chat._datos.length - 1];
    const otra = JSON.parse(S.post(JSON.stringify({ action: 'chatEnviar', msgs: [{ id: m[0], conv: m[4], de: m[5], rol: m[6], dn: 'x', txt: m[8] }] })));
    chk('8c. un reintento del mismo mensaje no se duplica', otra.ok && otra.dup === 1 && S.hojas.Chat._datos.length === n0 + 1, otra);
  }

  /* 9. Avisos: urgente, el grupo con @nombre, sonido callado */
  {
    await M.p.evaluate((c) => chatAbrir(c), P_ME);
    await M.p.click('#cht-turg');
    await escribir(M.p, 'URGENTE: el cliente está en la tienda');
    await ED.p.evaluate(() => chatCerrar());
    await lista(ED.p); await ED.p.waitForTimeout(2600);
    let av = await ED.p.evaluate(() => (escPendientes() || []).filter(x => x.tipo === 'chat'));
    const u = av.find(x => /URGENTE/.test(x.b));
    chk('9a. lo urgente: el aviso de Windows en rojo y fijo', u && u.kd === 'err' && u.fijo === true && /urgente/.test(u.t), av);
    const bk = await ED.p.evaluate(() => asisAvisos().filter(a => /^chat\|/.test(a.k))[0]);
    chk('9b. y Bloki en rojo', bk && bk.sev === 'ro', bk);
    await CA.p.evaluate(() => chatAbrir('eq'));
    await escribir(CA.p, '@Eduardo ¿abrimos el domingo?');
    await leerYa(ED.p);
    av = await ED.p.evaluate(() => (escPendientes() || []).filter(x => x.tipo === 'chat' && /grupo/.test(x.t)));
    chk('9c. en el grupo, con @Eduardo sí le avisa', av.length === 1 && /Carola en el grupo/.test(av[0].t), av);
    const son = await ED.p.evaluate(async () => { window.SON_PRUEBA = 1; localStorage.setItem('me_asis_mudo', '1'); SON_LOG.length = 0; CHAT.leyendo = false;
      CHAT.msgs = {}; CHAT.datos = true; CHAT.ultAhora = 0; await chatLeerYa(); var a = SON_LOG.slice(); localStorage.removeItem('me_asis_mudo'); return a; });
    chk('9d. el 🔇 de Bloki calla el chat', son.indexOf('chat') < 0, son);
    const n = await ED.p.evaluate(async () => {
      /* lo que había al abrir se da por visto (escritorio.js, §4ns): se lo olvida y se mira como si la página llevara una hora abierta, sin foco */
      document.hasFocus = function () { return false; }; localStorage.removeItem('me_esc_vistos'); ESC.sembrado = true; ESC.t0 = Date.now() - 3600e3;
      var q = { v: '', adm: false }; try { q.v = asisVendedor(); q.adm = asisVeAdm(); } catch (e) {} ESC.qk = q.v + '|' + (q.adm ? 1 : 0);
      __notifs.length = 0; escRevisar(); await new Promise(r => setTimeout(r, 200));
      return __notifs.filter(x => /🗨️/.test(x.t)).map(x => ({ t: x.t, req: x.req, tag: x.tag })); });
    chk('9e. el aviso de Windows sale (el urgente queda fijo en la esquina)', n.length >= 1 && n.some(x => x.req === true), n);
  }

  /* 10. Quién sos, ROHO, práctica */
  {
    const NAD = await abrir(S, { vend: '', chat: 1 });
    await NAD.p.click('#cht-btn'); await NAD.p.waitForTimeout(300);
    let t = await NAD.p.evaluate(() => document.getElementById('cht-cc').textContent);
    chk('10a. sin nombre: «Primero decime quién sos»', /Primero decime quién sos/.test(t), t);
    await NAD.context.close();
    const AD = await abrir(S, { vend: '', rol: 'admin', chat: 1 });
    await AD.p.click('#cht-btn'); await AD.p.waitForTimeout(300);
    t = await AD.p.evaluate(() => document.getElementById('cht-cc').textContent);
    chk('10b. Administración: «¿Sos Eduardo?»', /Sos Eduardo/.test(t), t);
    await AD.p.click('[data-yo="eduardo"]'); await AD.p.waitForTimeout(900);
    const L = await msgsDe(AD.p);
    chk('10c. «Sí, soy Eduardo» y ve lo suyo', L.some(m => m.c === P_ME), L.map(m => m.c));
    await AD.context.close();
    const RO = await abrir(S, { vend: 'ROHO', chat: 1 });
    await RO.p.click('#cht-btn'); await RO.p.waitForTimeout(300);
    t = await RO.p.evaluate(() => document.getElementById('cht-cc').textContent);
    chk('10d. ROHO: «El chat es del equipo»', /El chat es del equipo/.test(t), t);
    await RO.context.close();
    const n0 = S.hojas.Chat._datos.length;
    const r = await CA.p.evaluate(() => { window.PRACTICA = true; var ok = chatMandar('hola de práctica'); window.PRACTICA = false; return ok; });
    chk('10e. en práctica no manda nada', r === false && S.hojas.Chat._datos.length === n0, r);
  }

  /* 11. Dónde vive */
  {
    await M.p.evaluate(() => chatAbrir('eq'));
    await M.p.waitForTimeout(300);
    let r = await M.p.evaluate(() => { var p = document.getElementById('cht-panel').getBoundingClientRect(), a = document.getElementById('asis'); return { w: Math.round(p.width), right: Math.round(p.right), top: Math.round(p.top), uno: CHAT.uno, asis: a ? getComputedStyle(a).right : '' }; });
    chk('11a. compu de 1366: 420 px a la derecha, debajo del encabezado', r.w === 420 && r.right === 1366 && r.top > 20, r);
    chk('11b. Bloki se corre a la izquierda del chat', r.asis === '432px', r.asis);
    await M.p.keyboard.press('Escape');
    r = await M.p.evaluate(() => document.body.classList.contains('cht-on'));
    chk('11c. Esc cierra el chat', r === false, r);
    const G = await abrir(S, { vend: 'Isabel Robledo', chat: 1 }, { width: 1920, height: 1080 });
    await G.p.click('#cht-btn'); await G.p.waitForTimeout(500);
    r = await G.p.evaluate(() => { var p = document.getElementById('cht-panel'); return { w: Math.round(p.getBoundingClientRect().width), uno: CHAT.uno, z: zoomPag(), lista: getComputedStyle(p.querySelector('.cht-cl')).display, conv: getComputedStyle(p.querySelector('.cht-cc')).display }; });
    chk('11d. compu de 1920 (panel agrandado): 640 px, dos columnas (la lista y la conversación)', r.uno === false && r.lista !== 'none' && r.conv !== 'none' && Math.abs(r.w - 640 * r.z) < 4, r);
    await G.context.close();
    const CEL = await abrir(S, { vend: 'Maria Flores', chat: 1 }, { width: 390, height: 844 });
    await CEL.p.click('#cht-btn'); await CEL.p.waitForTimeout(500);
    r = await CEL.p.evaluate(() => { var p = document.getElementById('cht-panel'); return { w: Math.round(p.getBoundingClientRect().width), uno: CHAT.uno, cur: CHAT.cur, lista: getComputedStyle(p.querySelector('.cht-cl')).display, conv: getComputedStyle(p.querySelector('.cht-cc')).display }; });
    chk('11e. celular: la pantalla entera, una columna (primero la lista)', r.w === 390 && r.uno === true && r.lista !== 'none' && r.conv === 'none', r);
    await CEL.p.click('#cht-lst [data-cc="eq"]'); await CEL.p.waitForTimeout(300);
    r = await CEL.p.evaluate(() => { var p = document.getElementById('cht-panel'); return { lista: getComputedStyle(p.querySelector('.cht-cl')).display, conv: getComputedStyle(p.querySelector('.cht-cc')).display, atras: !!document.getElementById('cht-atras') }; });
    chk('11f. tocar una conversación la abre, con «←» para volver', r.lista === 'none' && r.conv !== 'none' && r.atras, r);
    await CEL.context.close();
    /* el grupo: visto por N de M; borrar lo propio */
    await M.p.evaluate(() => chatAbrir('eq'));
    await escribir(M.p, 'me equivoqué de grupo');
    const vv = await M.p.evaluate(() => { var b = [].slice.call(document.querySelectorAll('.cht-m.yo .cht-vis')).pop(); return b && b.textContent; });
    chk('11g. en el grupo: «✓✓ visto por N de M»', /visto por \d+ de \d+/.test(vv || ''), vv);
    const id = await M.p.evaluate(() => [].slice.call(document.querySelectorAll('.cht-m.yo')).pop().getAttribute('data-mid'));
    await M.p.evaluate((id) => document.querySelector('[data-bb="' + id + '"]').click(), id);
    await M.p.waitForTimeout(500);
    const b = await M.p.evaluate((id) => ({ m: CHAT.msgs[id], txt: document.querySelector('[data-mid="' + id + '"]').textContent }), id);
    const fila = S.hojas.Chat._datos.find(x => x[0] === id);
    chk('11h. borrar lo propio: «🗑 Mensaje borrado» y fuera de la hoja', b.m.bt > 0 && /Mensaje borrado/.test(b.txt) && fila[8] === '', b);
    await leerYa(CA.p);
    const enCa = await CA.p.evaluate((id) => CHAT.msgs[id], id);
    chk('11i. a las demás también les desaparece', enCa && enCa.bt > 0 && !enCa.x, enCa);
  }

  chk('Z. ningún error de JavaScript en las páginas', errores.length === 0, errores.slice(0, 5));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
