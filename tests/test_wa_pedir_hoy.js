/* 🏭 «PEDIR HOY» POR WHATSAPP A ERNESTO Y ALBA (27/10, §4ne, servidor 2026-10-27-a).

   El dueño (27/10): el WhatsApp de las 16:00 con lo que falta pedir a producción, *«a Alba tb»*. Es el MISMO aviso que Bloki le grita
   a logística en el panel (`semanaUrgentes`), pero desde el servidor: sale aunque nadie tenga el panel abierto. La regla está pasada
   al .gs renglón por renglón; esta prueba arma LOS MISMOS pedidos en la página y en el .gs y compara.
     1. La lista: en la página (`semanaUrgentes`) y en el .gs (`waPhUrgentes_`) da los mismos renglones, a distintas horas y días (antes
        y después del corte, el sábado antes y después de las 12, el domingo, el feriado del 02/11, el martes 03/11). Y los plazos
        (`semanaPlazos` / `waPhPlazos_`) dan los mismos días.
     2. Lo que cuenta y lo que no (protectores, sábanas con acento, bolsas, MDF sin mueble, «VARIOS», ATC, venta de tienda, entregado,
        borrador de Kommo, filas del sistema, lo pedido a producción, «No hay» del estado, la marca vieja «prod»).
     3. El envío: a las 15:50 nada; a las 16:05 `logistica_pedir_hoy` a Ernesto y a Alba (no a David), con los 5 datos (cuántos, hasta
        qué día, la hora del corte, la lista por día y los plazos con «ya no llega»); una vez por día; el sábado a las 11:30; ni el
        domingo ni el feriado; sin WA_PEDIR_HOY nada; sin nada urgente nada; un reintento pasado el corte no sale; WA_PRUEBA lo desvía.
     4. La plantilla: está en WA_PLANTILLAS con sus 5 datos y el ejemplo; `probarAntesDeImplementar` dice a quién va.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia.

   Se corre:  node tests/test_wa_pedir_hoy.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

/* ── El servidor de mentira (como test_wa_bot.js) ── */
const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); },
    deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1],
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
  };
}
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
function servidor(props) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 };
  const triggers = [];
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      const code = r ? r.code : 200, txt = r ? JSON.stringify(r.body || {}) : JSON.stringify({ messages: [{ id: 'wamid.' + (++meta.n) }] });
      return { getResponseCode: () => code, getContentText: () => txt };
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, putAll() {}, remove() {}, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, tipo: 'after', ms, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyMinutes: (n) => ({ create: () => { const t = { fn, tipo: 'every', n, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyDays: () => ({ atHour: () => ({ create: () => { const t = { fn, tipo: 'daily', getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  /* Las filas van directo a la hoja (sin pasar por «guardar»: así no se encolan las confirmaciones de cada pedido). */
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = () => meta.llamadas.filter(c => c.body && c.body.template).map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  const limpiar = () => { meta.llamadas.length = 0; };
  const lista = () => sh._datos.slice(1).map(f => ctx.rowToRec_(f));
  return { ctx, sh, P, meta, triggers, cargar, hoja, salen, limpiar, lista, repaso: () => ctx.waRepaso() };
}
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001, David:59172000002',
             WA_PEDIR_HOY: 'Ernesto:59171000001, Alba:59173000003' };

/* ── Los pedidos: los MISMOS en la página y en el servidor ── */
const P = (id, fecha, cliente, x, o) => Object.assign({ id, oc: '10-' + id, vendedor: 'Maria Flores', cliente, fecha, turno: 'AM', celular: '70000000', zona: 'Norte',
  direccion: 'Calle 1', productos: (Array.isArray(x) ? x : [x || {}]).map(y => Object.assign({ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1 }, y)),
  saldo: 0, acuenta: 0, pagado: true, metodoPago: '', estado: '', entregado: false, vehiculo: '', chofer: '', ts: Date.parse('2026-10-20T10:00:00-04:00'), fotos: [], rev: 1 }, o || {});
const FIX = [
  P('a01', '2026-10-30', 'PEREZ VIERNES', { chk: '' }),                                         // ⬜
  P('a02', '2026-11-03', 'GOMEZ MARTES', { chk: 'no', desc: 'SOMIER ORO' }),                   // 🔴
  P('a03', '2026-11-04', 'ROJAS MIERCOLES', { chk: '' }),                                      // ⬜ el 04/11 (E2 a las 16:05 del jueves)
  P('a04', '2026-11-05', 'LOPEZ JUEVES', { chk: '' }),                                         // ⬜ fuera de los 5 días hábiles del jueves
  P('a05', '2026-10-30', 'VACA LISTO', { chk: 'ok' }),                                         // ✔
  P('a06', '2026-10-30', 'SOSA FABRICA', { chk: 'no', enProd: true, prodF: '2026-10-27' }),    // 🏭 pedido a producción
  P('a07', '2026-10-31', 'ARCE ESTADO', { chk: '' }, { estado: 'No hay' }),                     // 🔴 por el estado del pedido
  P('a08', '2026-10-30', 'SOLO PROTECTOR', { desc: 'PROTECTOR DE COLCHON', chk: '' }),          // de tienda: no entra
  P('a09', '2026-10-30', 'MEZCLA', [{ chk: '', desc: 'TITANIO ICE', medida: '160x190' }, { desc: 'SÁBANA 2 PLAZAS', chk: '' }, { desc: 'BOLSA PARA ALMOHADA' }]),
  P('a10', '2026-10-30', 'ATC CLIENTE', { chk: '' }, { oc: 'ATC 10-005' }),                    // ATC: no
  P('a11', '2026-10-30', 'VENTA TIENDA', { chk: '' }, { direccion: 'SALIÓ DE TIENDA · Carmelo', zona: 'TIENDA' }),
  P('a12', '2026-10-30', 'YA ENTREGADO', { chk: '' }, { entregado: true }),
  P('a13', '2026-10-30', 'BORRADOR', { chk: '' }, { estado: 'Borrador Kommo' }),
  P('__stock__', '2026-10-30', 'STOCK', { chk: '' }),
  P('a14', '2026-10-30', 'MARCA IM', { chk: 'im' }),                                           // 📥 recoger: listo
  P('a15', '2026-10-30', 'MARCA PROD VIEJA', { chk: 'prod' }),                                  // 🏭 (la marca vieja)
  P('a16', '2026-10-30', 'LLEGO DE FABRICA', { chk: '', enProd: true, prodR: '2026-10-28' }),  // ya llegó y nadie marcó: ⬜
  P('a17', '2026-10-29', 'HOY MISMO', { chk: '', desc: 'ESPECIAL SEMIORTOPEDICO', medida: '105x190', cant: 2 }),   // ⬜ de hoy
  P('a18', '2026-10-28', 'AYER', { chk: '' }),                                                 // ayer: fuera de la semana
  P('a19', '2026-10-31', 'SUCURSAL CENTRAL', { chk: '' }, { oc: 'RPT 10-003' }),               // RPT: sí cuenta
  P('a20', '2026-10-30', 'MDF Y VARIOS', [{ desc: 'MDF 1,5', chk: '' }, { desc: 'VARIOS', chk: '' }, { desc: 'RECOGER FIBRA', chk: '' }, { desc: 'PROTETOR COLCHAO', chk: '' }]),
  P('a21', '2026-10-30', 'CABECERA MDF', { desc: 'CABECERA MDF 160', chk: '' }),               // un mueble de MDF sí se fabrica
  P('a22', '2026-10-31', 'TARDE PM', { chk: '' }, { turno: 'PM' }),
  P('a23', '2026-11-03', 'PROD TARDE', { chk: 'no', enProd: true, prodF: '2026-11-03' })       // pedido el martes: sale el jueves, ⚠️ tarde
];

/* La página con el reloj clavado en esa hora de Bolivia: devuelve lo que dicen `semanaUrgentes` y `semanaPlazos`. */
async function pagina(browser, cuando, errores) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date(cuando.replace(' ', 'T') + ':00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  const r = await page.evaluate((fix) => {
    try { CONNECTED = false; CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    loadFromServer = function () {}; apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    STATE = JSON.parse(JSON.stringify(fix));
    return { urg: semanaUrgentes().map(l => l.p.id + '#' + l.i + ':' + l.e).sort(), plazos: semanaPlazos(),
             todas: semanaDatos().tot.lineas.map(l => l.p.id + '#' + l.i + ':' + l.e).sort() };
  }, FIX);
  await page.close();
  return r;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];

  // ══ 1. La misma lista en la página y en el servidor ══════════════════════════
  console.log('\n── 1. La misma lista en la página y en el servidor, a distintas horas ──');
  const MOMENTOS = ['2026-10-29 15:50', '2026-10-29 16:05', '2026-10-29 16:40', '2026-10-31 11:40', '2026-10-31 12:10', '2026-11-01 10:00', '2026-11-02 16:05', '2026-11-03 10:00', '2026-11-03 16:45'];
  const S1 = servidor(ON); S1.cargar(FIX);
  const lista = S1.lista();
  const enPag = {};
  for (const m of MOMENTOS) {
    const pg = await pagina(browser, m, errores); enPag[m] = pg;
    poner(m); const B = S1.ctx.waBo_(RELOJ.ms);
    const sv = S1.ctx.waPhUrgentes_(lista, B).map(l => l.p.id + '#' + l.i + ':' + l.e).sort();
    const pz = S1.ctx.waPhPlazos_(B);
    /* las líneas de toda la semana (no solo las urgentes): la regla de cada renglón, entera */
    const dias = S1.ctx.waPhDias_(B.hoy), todas = [];
    lista.forEach(p => { if (!S1.ctx.waPhEntra_(p, dias)) return; (p.productos || []).forEach((x, i) => { const e = S1.ctx.waPhLinea_(p, x, B); if (e) todas.push(p.id + '#' + i + ':' + e); }); });
    todas.sort();
    chk(m + ': los mismos renglones urgentes (' + sv.length + ')', JSON.stringify(sv) === JSON.stringify(pg.urg), { pagina: pg.urg, servidor: sv });
    chk(m + ': los mismos plazos (arranca, sale de fábrica, se entrega desde, la próxima ocasión)', ['A', 'sale', 'E1', 'A2', 'E2'].every(k => pz[k] === pg.plazos[k]), { pagina: pg.plazos, servidor: pz });
    chk(m + ': y el estado de cada renglón de la semana es el mismo (' + todas.length + ')', JSON.stringify(todas) === JSON.stringify(pg.todas), { pagina: pg.todas, servidor: todas });
  }

  // ══ 2. Lo que cuenta y lo que no ═════════════════════════════════════════════
  console.log('\n── 2. Lo que cuenta y lo que no (jueves 29/10 a las 16:05) ──');
  {
    const u = enPag['2026-10-29 16:05'].urg;
    const ids = u.map(x => x.split('#')[0]);
    chk('⬜ PEREZ (vie 30), 🔴 GOMEZ (mar 03/11), 🔴 ARCE por «No hay», ⬜ de hoy, RPT y el turno PM entran', ['a01', 'a02', 'a07', 'a17', 'a19', 'a22'].every(i => ids.includes(i)), u);
    chk('el 04/11 ya no (se llega pidiéndolo mañana) y el 05/11 ni está en la semana; ayer tampoco', !ids.includes('a03') && !ids.includes('a04') && !ids.includes('a18'), u);
    chk('con stock, 📥, lo pedido a producción y la marca vieja «prod» no', !['a05', 'a06', 'a14', 'a15', 'a23'].some(i => ids.includes(i)), u);
    chk('lo que llegó de fábrica sin marca sigue ⬜ (nadie dijo de dónde sale)', u.includes('a16#0:rev'), u);
    chk('protectores, sábanas con acento, bolsas, MDF sin mueble, «VARIOS», «RECOGER…» y «PROTETOR» no; la cabecera de MDF sí',
      !ids.includes('a08') && u.includes('a09#0:rev') && !u.includes('a09#1:rev') && !u.includes('a09#2:rev') && !ids.includes('a20') && u.includes('a21#0:rev'), u);
    chk('ATC, venta de tienda, entregado, borrador de Kommo y la fila del stock no', !['a10', 'a11', 'a12', 'a13', '__stock__'].some(i => ids.includes(i)), u);
    chk('el domingo y el feriado del 02/11: nada', enPag['2026-11-01 10:00'].urg.length === 0 && enPag['2026-11-02 16:05'].urg.length === 0);
    chk('pasado el corte del jueves (16:40) entra también el 04/11: lo pedido ya arranca el viernes', enPag['2026-10-29 16:40'].urg.some(x => x.indexOf('a03#') === 0), enPag['2026-10-29 16:40'].urg);
    const S = servidor(ON);
    chk('un «VARIOS» CON código cuenta en el servidor (la diferencia anotada: la página mira si el código es del catálogo)',
      S.ctx.waPhNoCuenta_({ desc: 'VARIOS', codigo: 'CH1201' }) === false && S.ctx.waPhNoCuenta_({ desc: 'VARIOS' }) === true);
  }

  // ══ 3. El envío ══════════════════════════════════════════════════════════════
  console.log('\n── 3. El envío a Ernesto y Alba ──');
  {
    const S = servidor(ON); S.cargar(FIX);
    poner('2026-10-29 15:50'); S.repaso();
    chk('15:50: nada', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0, S.salen());
    poner('2026-10-29 16:05'); const r = S.repaso();
    const s = S.salen().filter(x => x.pl === 'logistica_pedir_hoy');
    chk('16:05: logistica_pedir_hoy a Ernesto y a Alba, no a David', s.length === 2 && s.map(x => x.to).sort().join() === '59171000001,59173000003', S.salen());
    const pz = s[0] && s[0].p;
    const nUrg = enPag['2026-10-29 16:05'].urg.length;
    chk('los 5 datos: cuántos, hasta qué día, la hora del corte, la lista y los plazos', pz && pz.length === 5 && pz[0] === nUrg + ' productos' && pz[1] === 'martes 03/11' && pz[2] === '16:30', pz);
    chk('la lista va por día y en orden, lo más urgente primero: hoy, con producto, medida y cliente enteros, y «y N más» al final', pz &&
      /^jueves 29\/10: 2× ESPECIAL SEMIORTOPEDICO 105×190 \(HOY MISMO\) · viernes 30\/10: 1× COLCHON TITANIO 140×190 \(PEREZ VIERNES\)/.test(pz[3]) &&
      /\) y \d+ más$/.test(pz[3]) && pz[3].length <= 250, pz && pz[3]);
    {
      /* con pocos, entra todo y sin «más» */
      const S9 = servidor(ON); poner('2026-10-29 16:05'); const B9 = S9.ctx.waBo_(RELOJ.ms);
      const pocos = S9.ctx.waPhUrgentes_(FIX.filter(p => ['a02', 'a17'].includes(p.id)), B9), q = S9.ctx.waPhParams_(pocos, B9);
      chk('con dos productos la lista entra entera: «jueves 29/10: … · martes 03/11: …»', q[0] === '2 productos' &&
        q[3] === 'jueves 29/10: 2× ESPECIAL SEMIORTOPEDICO 105×190 (HOY MISMO) · martes 03/11: 1× SOMIER ORO 140×190 (GOMEZ MARTES)' &&
        q[4] === 'Lo que se pide hoy sale de fábrica el sábado 31/10 (48 h) y se entrega desde el martes 03/11. Lo del jueves 29/10, si hay que fabricarlo, ya no llega: reprogramalo o avisale al cliente.', q);
      const uno = S9.ctx.waPhParams_(S9.ctx.waPhUrgentes_(FIX.filter(p => p.id === 'a02'), B9), B9);
      chk('con uno: «1 producto» y sin «ya no llega» (el martes llega pidiéndolo hoy)', uno[0] === '1 producto' && !/ya no llega/.test(uno[4]), uno);
    }
    chk('los plazos: sale de fábrica el sábado 31/10, se entrega desde el martes 03/11; lo del jueves y el viernes ya no llega', pz &&
      /sale de fábrica el sábado 31\/10 \(48 h\) y se entrega desde el martes 03\/11\./.test(pz[4]) && /Lo del jueves 29\/10 y del viernes 30\/10 y del sábado 31\/10, si hay que fabricarlo, ya no llega/.test(pz[4]), pz && pz[4]);
    chk('ningún dato con saltos de línea ni de más de 250 letras', s.every(x => x.p.every(t => t && !/[\n\r]/.test(t) && t.length <= 250)), s.map(x => x.p.map(t => t.length)));
    chk('la hoja «Bot WhatsApp» lo anota como «Logística: pedir hoy»', S.hoja().filter(f => f[3] === 'Logística: pedir hoy' && f[7] === '✅ enviado').length === 2, S.hoja().map(f => f[3] + ' ' + f[7]));
    S.limpiar(); poner('2026-10-29 16:20'); S.repaso();
    chk('16:20: no se repite', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0);
    S.limpiar(); poner('2026-10-29 16:40'); S.repaso();
    chk('pasado el corte: tampoco', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0);
    S.limpiar(); poner('2026-10-31 11:20'); S.repaso();
    chk('sábado 11:20: nada todavía', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0);
    poner('2026-10-31 11:35'); S.repaso();
    const sa = S.salen().filter(x => x.pl === 'logistica_pedir_hoy');
    chk('sábado 11:35: sale, con el corte de las 12:00', sa.length === 2 && sa[0].p[2] === '12:00', sa.map(x => x.p.slice(0, 3)));
    S.limpiar(); poner('2026-11-01 16:05'); S.repaso();
    chk('domingo: nada', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0);
    S.limpiar(); poner('2026-11-02 16:05'); S.repaso();
    chk('feriado (Todos Santos): nada', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0);
  }
  {
    const S = servidor(Object.assign({}, ON, { WA_PEDIR_HOY: '' })); S.cargar(FIX);
    poner('2026-10-29 16:05'); S.repaso();
    chk('sin WA_PEDIR_HOY no sale nada (y el «sin camión» de siempre sigue)', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0, S.salen().map(x => x.pl));
  }
  {
    const S = servidor(ON); S.cargar(FIX.filter(p => ['a05', 'a06', 'a14', 'a08'].includes(p.id)));
    poner('2026-10-29 16:05'); const r = S.repaso();
    chk('sin nada urgente: no sale ni se anota', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0 && !S.hoja().some(f => f[3] === 'Logística: pedir hoy'), r);
  }
  {
    const S = servidor(ON); S.cargar(FIX);
    S.meta.responder = (b) => (b && b.template && b.template.name === 'logistica_pedir_hoy') ? { code: 503, body: { error: { message: 'ocupado' } } } : null;
    poner('2026-10-29 16:05'); S.repaso();
    chk('Meta ocupado a las 16:05: queda para reintentar', S.hoja().filter(f => f[3] === 'Logística: pedir hoy' && /reintenta/.test(f[7])).length === 2, S.hoja().map(f => f[7]));
    S.meta.responder = null; S.limpiar(); poner('2026-10-29 16:40'); S.repaso();
    chk('el reintento llega pasado el corte: no sale y queda anotado por qué', S.salen().filter(x => x.pl === 'logistica_pedir_hoy').length === 0 &&
      S.hoja().filter(f => f[3] === 'Logística: pedir hoy' && /corte/.test(f[8])).length === 2, S.hoja().slice(-2).map(f => f[7] + ' ' + f[8]));
  }
  {
    const S = servidor(Object.assign({}, ON, { WA_PRUEBA: '70999888' })); S.cargar(FIX);
    poner('2026-10-29 16:05'); S.repaso();
    const s = S.salen().filter(x => x.pl === 'logistica_pedir_hoy');
    chk('con WA_PRUEBA va todo a ese número', s.length === 2 && s.every(x => x.to === '59170999888'), s.map(x => x.to));
  }

  // ══ 4. La plantilla y probar ═════════════════════════════════════════════════
  console.log('\n── 4. La plantilla y probarAntesDeImplementar ──');
  {
    const S = servidor(ON);
    const pl = S.ctx.WA_PLANTILLAS.find(x => x.n === 'logistica_pedir_hoy');
    const vars = pl ? (pl.t.match(/\{\{\d\}\}/g) || []) : [];
    chk('logistica_pedir_hoy está en WA_PLANTILLAS con {{1}}…{{5}} y un ejemplo de 5 datos', !!pl && vars.join() === '{{1}},{{2}},{{3}},{{4}},{{5}}' && pl.e.length === 5, pl && vars);
    chk('…no empieza ni termina con un dato (Meta la rechaza)', !!pl && !/^\{\{/.test(pl.t) && !/\}\}$/.test(pl.t.trim()));
    chk('WA_TIPOS.ph apunta a esa plantilla', S.ctx.WA_TIPOS.ph && S.ctx.WA_TIPOS.ph.plantilla === 'logistica_pedir_hoy');
    const pr = S.ctx.probarAntesDeImplementar();
    const txt = JSON.stringify(pr);
    chk('probarAntesDeImplementar dice a quién va «pedir hoy»', /Pedir hoy.{0,80}Ernesto, Alba/.test(txt), (txt.match(/Pedir hoy[^"]{0,120}/) || [''])[0]);
    const S2 = servidor(Object.assign({}, ON, { WA_PEDIR_HOY: 'Alba:123' }));
    chk('…y avisa un número que no entiende', /WA_PEDIR_HOY hay número/.test(JSON.stringify(S2.ctx.probarAntesDeImplementar())));
    chk('estadoBotWhatsApp lo cuenta', JSON.stringify(S.ctx.estadoBotWhatsApp().pedirHoy) === '["Ernesto","Alba"]');
    chk('la versión es la 2026-10-27-a en el .gs y en la página', S.ctx.SCRIPT_VERSION === '2026-10-27-a' && /var SCRIPT_VERSION_ESPERADA='2026-10-27-a'/.test(fs.readFileSync(PEDIDOS, 'utf8')));
  }

  chk('sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
