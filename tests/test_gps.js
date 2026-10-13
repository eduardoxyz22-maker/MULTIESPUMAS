/* 🛰️ EL GPS DE LOS CAMIONES (13/10, §4ko, servidor 2026-10-13-a).

   El dueño (13/10): *«Sí, armá lo del GPS»*, con la documentación de la plataforma (gettoken: apikey + usuario + contraseña → token
   de 6 horas; getdata: apikey + token → cada unidad; 30 segundos entre pedidos). Lo que esta prueba cuida, contra el .gs de verdad
   con un Google y una plataforma de mentira (nada sale a internet):
     1. Los depósitos y las placas del .gs son los de la página (ALM_UBIC, VEHICULO_PLACA).
     2. Sin GPS_APIKEY/GPS_USUARIO/GPS_CLAVE no pide nada ni escribe nada, y la lectura del panel va como siempre (sin `gps`).
     3. Fuera de horario (antes de las 6, desde las 21), el domingo y un feriado: no pide nada.
     4. Una vuelta = un pedido: primero el token (con usuario y clave), a la vuelta siguiente las posiciones (con el token, en UTC);
        nunca dos pedidos en menos de 30 s. Las posiciones van en la lectura (`gps`), con la placa sin guiones.
     5. «Salió»: estuvo en PTF y pasa 15 minutos lejos → la hora en que se alejó. Ir de PTF a Banzer a cargar no cuenta. Visto por
        primera vez en la calle: no se adivina. Volver → «volvió». Otro día empieza de cero.
     6. Token rechazado → se olvida y la vuelta siguiente pide otro; a las 5 h 30 se renueva solo.
     7. Ni la apikey, ni la clave, ni el token aparecen en lo que lee el panel ni en el resumen.
     8. `instalarDisparadores` deja gpsRepaso cada minuto; `probarAntesDeImplementar` lo informa; `probarGps` dice qué camión es
        cada placa.
   Datos SINTÉTICOS (el repo es público).

   Se corre:  node tests/test_gps.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return { _datos: datos, getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }), setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1], setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {} }) };
}
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };   // hora de Bolivia
const pasar = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); } static now() { return RELOJ.ms; } }

/* Los puntos: PTF y Banzer como en la página; «lejos» = ~1,5 km al sur de PTF. */
const PTF = { la: -17.7489125, lo: -63.1429219 }, BZ = { la: -17.7197548, lo: -63.1631138 };
const LEJOS = { la: -17.762, lo: -63.1429 }, CERCA_PTF = { la: -17.7490, lo: -63.1430 };
const unidad = (placa, pt, o) => Object.assign({ UnitId: 'U-' + placa, UnitPlate: placa, GpsIdentif: '0000', ReportDate: new Date(RELOJ.ms).toISOString().slice(0, 19).replace('T', ' '),
  Latitude: (pt.la >= 0 ? '+' : '') + pt.la.toFixed(6), Longitude: pt.lo.toFixed(6), GpsSpeed: '32', Ignition: '1', Conductor: 'CHOFER UNO', Direction: 'N' }, o || {});

const SECRETO = { GPS_APIKEY: 'apikey-de-mentira-123', GPS_USUARIO: 'usuario-mentira', GPS_CLAVE: 'clave-mentira-456' };
function servidor(props, opt) {
  opt = opt || {};
  const sh = hacerPlanilla([HDR].concat(opt.filas || [])), P = Object.assign({}, props || {}), triggers = [], cache = new Map();
  const geo = opt.geo ? hacerPlanilla([['link', 'lat', 'lng', 'aprox']].concat(opt.geo)) : null;
  const lecturas = { pedidos: 0, geo: 0, enRepaso: 0 };   // cuántas veces se leyó la planilla entera (y la hoja Geo); enRepaso = las del GPS
  const gdr = sh.getDataRange; sh.getDataRange = () => { lecturas.pedidos++; return gdr(); };
  if (geo) { const g2 = geo.getDataRange; geo.getDataRange = () => { lecturas.geo++; return g2(); }; }
  const gps = { llamadas: [], unidades: [], tokenN: 0, responder: null };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : (n === 'Geo' ? geo : null), insertSheet: () => hacerPlanilla([]) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      const accion = url.replace(/^.*\/v1\//, ''); gps.llamadas.push({ url, accion, campos: Object.assign({}, o.payload), ms: RELOJ.ms, metodo: o.method });
      let r = gps.responder ? gps.responder(accion, o.payload) : null;
      if (!r) {
        if (accion === 'gettoken') r = { code: 200, body: { status: 200, data: 'tok-' + (++gps.tokenN) } };
        else if (accion === 'getdata') r = { code: 200, body: { status: 200, data: gps.unidades } };
        else r = { code: 404, body: { status: 404 } };
      }
      return { getResponseCode: () => r.code, getContentText: () => typeof r.body === 'string' ? r.body : JSON.stringify(r.body) };
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.has(k) ? cache.get(k) : null, put: (k, v) => { cache.set(k, v); }, putAll() {}, remove: (k) => { cache.delete(k); }, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; }, getContent() { return t; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: (ms) => { RELOJ.ms += ms; } },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, tipo: 'after', ms, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
        everyMinutes: (n) => ({ create: () => { const t = { fn, tipo: 'every', n, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
        everyDays: () => ({ atHour: () => ({ create: () => { const t = { fn, tipo: 'daily', getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }) }),
      getProjectTriggers: () => triggers.slice(), deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); } }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  return { ctx, P, gps, cache, triggers, post, sh, lecturas, repaso: () => { const n = lecturas.pedidos, r = ctx.gpsRepaso(); lecturas.enRepaso += lecturas.pedidos - n; return r; }, lista: () => post({ action: 'list' }) };
}
/* Dos vueltas seguidas (token + posiciones), un minuto entre cada una. */
const arrancar = (S) => { S.repaso(); pasar(1); return S.repaso(); };
const unid = (S, placa) => { const L = S.lista(), g = L.gps, x = g && g.u.filter(x => x.p === placa)[0];
  return x && Object.assign({}, x, L.gpsDia && L.gpsDia.u[placa] ? { ev: L.gpsDia.u[placa].ev, par: L.gpsDia.u[placa].par } : {}); };   // (13-b) el día viene aparte

// ══ 1. Lo mismo que la página ══════════════════════════════════════════════
console.log('\n── 1. Los depósitos y las placas: los de pedidos.html ──');
{
  const html = fs.readFileSync(path.resolve('pedidos.html'), 'utf8');
  const tomar = (ini, fin) => { const i = html.indexOf(ini); return html.slice(i + ini.length - 1, html.indexOf(fin, i) + 1); };
  const ALM = vm.runInNewContext('(' + tomar('var ALM_UBIC=[', '];') + ')');
  const VP = vm.runInNewContext('(' + tomar('var VEHICULO_PLACA = {', '};') + ')');
  const S = servidor();
  const dep = S.ctx.GPS_DEPOSITOS.map(d => d.id + ':' + d.lat + ',' + d.lng).join('|'), pag = ALM.map(a => a.id + ':' + a.lat + ',' + a.lng).join('|');
  chk('PTF y Banzer tienen las mismas coordenadas en el .gs y en la página', dep === pag, { dep, pag });
  const pl = {}; Object.keys(VP).forEach(k => { pl[VP[k].toUpperCase().replace(/[^A-Z0-9]/g, '')] = k; });
  chk('las placas del .gs son las de VEHICULO_PLACA (sin guiones)', JSON.stringify(pl) === JSON.stringify(S.ctx.GPS_PLACAS), { pl, gs: S.ctx.GPS_PLACAS });
  const MP = vm.runInNewContext('(' + tomar('var GPS_MORENO={', '}') + ')');
  chk('(13-b) el pin de Moreno es el mismo en el .gs y en la página (GPS_MORENO)', MP.lat === S.ctx.GPS_MORENO.lat && MP.lng === S.ctx.GPS_MORENO.lng, { pag: MP, gs: S.ctx.GPS_MORENO });
  chk('la placa se compara sin guiones ni espacios: «6663-CCP», «6663 ccp» y «6663CCP» son la misma',
      S.ctx.gpsPlaca_('6663-CCP') === '6663CCP' && S.ctx.gpsPlaca_('6663 ccp') === '6663CCP');
}

// ══ 2. Sin configurar ══════════════════════════════════════════════════════
console.log('\n── 2. Sin las tres propiedades no hace nada ──');
{
  const S = servidor({ GPS_APIKEY: 'solo-la-apikey' }); poner('2026-10-14 10:00');
  const r = S.repaso(); pasar(1); S.repaso();
  chk('no habla con la plataforma', S.gps.llamadas.length === 0, S.gps.llamadas.length);
  chk('no escribe ninguna propiedad del GPS', !Object.keys(S.P).some(k => /^GPS_(ULTIMO|DIA|TOKEN_AUTO|ULT_MS)$/.test(k)), Object.keys(S.P));
  chk('dice qué falta', r.error === 'sin configurar' && S.ctx.gpsConfig_().faltan.join(',') === 'GPS_USUARIO,GPS_CLAVE', S.ctx.gpsConfig_().faltan);
  const L = S.lista();
  chk('la lectura del panel va como siempre, sin `gps`', L.ok && Array.isArray(L.pedidos) && !('gps' in L), Object.keys(L));
}

// ══ 3. Horario ═════════════════════════════════════════════════════════════
console.log('\n── 3. Fuera de horario, el domingo y un feriado: nada ──');
{
  const S = servidor(SECRETO);
  [['2026-10-14 05:30', 'antes de las 6'], ['2026-10-14 21:00', 'desde las 21'], ['2026-10-18 10:00', 'el domingo'], ['2026-11-02 10:00', 'el 2 de noviembre (feriado)']].forEach(([h, que]) => {
    poner(h); const r = S.repaso();
    chk(que + ': no pide nada', S.gps.llamadas.length === 0 && r.error === 'fuera de horario', r);
  });
}

// ══ 4. Un pedido por vuelta ════════════════════════════════════════════════
console.log('\n── 4. Primero el token, después las posiciones; nunca dos pedidos en 30 s ──');
{
  const S = servidor(SECRETO); poner('2026-10-14 08:00');
  S.gps.unidades = [unidad('6663-CCP', PTF), unidad('6409TIG', LEJOS, { GpsSpeed: '41.6', Ignition: '0' }), unidad('XYZ999', BZ, { Latitude: '0', Longitude: '0' })];
  let r = S.repaso();
  const c0 = S.gps.llamadas[0] || {};
  chk('la primera vuelta pide SOLO el token, por POST, con apikey, token vacío, usuario y clave',
      S.gps.llamadas.length === 1 && c0.accion === 'gettoken' && c0.metodo === 'post' && c0.campos.apikey === SECRETO.GPS_APIKEY && c0.campos.token === '' &&
      c0.campos.username === SECRETO.GPS_USUARIO && c0.campos.password === SECRETO.GPS_CLAVE, c0);
  chk('…y lo guarda (GPS_TOKEN_AUTO, vale 5 h 30)', JSON.parse(S.P.GPS_TOKEN_AUTO || '{}').k === 'tok-1' && JSON.parse(S.P.GPS_TOKEN_AUTO).hasta === RELOJ.ms + 330 * 60000, S.P.GPS_TOKEN_AUTO);
  pasar(0.4); r = S.repaso();
  chk('a los 24 segundos no pide nada (la plataforma pide 30)', S.gps.llamadas.length === 1 && r.error === 'muy seguido', r);
  pasar(0.6); r = S.repaso();
  const c1 = S.gps.llamadas[1] || {};
  chk('la vuelta siguiente pide las posiciones con la apikey y el token, en UTC',
      c1.accion === 'getdata' && c1.campos.apikey === SECRETO.GPS_APIKEY && c1.campos.token === 'tok-1' && c1.campos.UseUTCDate === '1' && !('password' in c1.campos), c1.campos);
  chk('…y anota cuántas vio', r.ok && r.n === 2 && JSON.parse(S.P.GPS_ULTIMO).n === 2, r);
  const g = S.lista().gps;
  chk('la lectura del panel trae `gps` con la hora y las unidades (sin la que está en 0,0)', g && g.t === RELOJ.ms && g.u.length === 2, g && g.u.map(x => x.p));
  const a = g.u.filter(x => x.p === '6663CCP')[0], b = g.u.filter(x => x.p === '6409TIG')[0];
  chk('cada una con la placa sin guiones, la posición, la velocidad y el motor', a && a.pl === '6663-CCP' && Math.abs(a.la - PTF.la) < 2e-6 && Math.abs(a.lo - PTF.lo) < 2e-6 && a.v === 32 && a.m === 1 && b.v === 42 && b.m === 0, { a, b });
  chk('…en qué depósito está (PTF, a pocos metros) y si está afuera', a.dep.id === 'ptf' && a.dep.m < 5 && a.f === 0 && b.f === 1, { a: a.dep, b: b.dep });
  const rd = S.gps.unidades[0].ReportDate;
  chk('la hora del reporte (pedida en UTC) se lee en UTC', a.r === Date.parse(rd.replace(' ', 'T') + 'Z'), [a.r, rd]);
  chk('sin repaso por 10 minutos, la caché vence y la lectura vuelve sin `gps`', (S.cache.delete('gps_pos'), !('gps' in S.lista())));
}

// ══ 5. Salió y volvió ══════════════════════════════════════════════════════
console.log('\n── 5. «Salió»: estuvo en PTF y pasa 15 minutos lejos ──');
{
  const S = servidor(SECRETO); poner('2026-10-14 08:00');
  S.gps.unidades = [unidad('6663-CCP', PTF), unidad('5655-KSC', PTF), unidad('6021-URL', LEJOS)];
  arrancar(S);                                                      // 08:01 posiciones: dos en PTF, una en la calle
  pasar(1); S.gps.unidades = [unidad('6663-CCP', LEJOS), unidad('5655-KSC', LEJOS), unidad('6021-URL', LEJOS)]; S.repaso();   // 08:02 se van
  let a = unid(S, '6663CCP');
  chk('recién salido de PTF: afuera, pero todavía no «salió» (puede ir a Banzer a cargar)', a.f === 1 && a.s === '', a);
  for (let i = 0; i < 6; i++) { pasar(1); S.repaso(); }             // 08:08
  pasar(1); S.gps.unidades = [unidad('6663-CCP', LEJOS), unidad('5655-KSC', BZ), unidad('6021-URL', LEJOS)]; S.repaso();   // 08:09 el KSC llega a Banzer
  for (let i = 0; i < 8; i++) { pasar(1); S.repaso(); }             // 08:17
  a = unid(S, '6663CCP'); let k = unid(S, '5655KSC'), u = unid(S, '6021URL');
  chk('15 minutos lejos: «salió» a la hora en que se alejó (08:02), de PTF', a.s === '08:02' && a.sd === 'ptf' && a.ul === '08:02', a);
  chk('el que fue de PTF a Banzer a cargar NO salió (está adentro de Banzer)', k.s === '' && k.f === 0 && k.dep.id === 'banzer', k);
  chk('el que se vio por primera vez en la calle: no se adivina', u.s === '' && u.f === 1, u);
  pasar(1); S.gps.unidades = [unidad('6663-CCP', LEJOS), unidad('5655-KSC', LEJOS), unidad('6021-URL', LEJOS)]; S.repaso();   // 08:18 KSC sale de Banzer
  for (let i = 0; i < 15; i++) { pasar(1); S.repaso(); }            // 08:33
  k = unid(S, '5655KSC');
  chk('…y cuando sale de Banzer y pasan 15 minutos, «salió» 08:18 de Banzer', k.s === '08:18' && k.sd === 'banzer', k);
  poner('2026-10-14 13:00'); S.gps.unidades = [unidad('6663-CCP', CERCA_PTF), unidad('5655-KSC', LEJOS), unidad('6021-URL', LEJOS)]; S.repaso();
  a = unid(S, '6663CCP');
  chk('vuelve a PTF: «volvió 13:00» y la primera salida queda', a.vu === '13:00' && a.s === '08:02' && a.f === 0, a);
  pasar(1); S.gps.unidades = [unidad('6663-CCP', LEJOS), unidad('5655-KSC', LEJOS), unidad('6021-URL', LEJOS)]; S.repaso();
  for (let i = 0; i < 16; i++) { pasar(1); S.repaso(); }
  a = unid(S, '6663CCP');
  chk('un segundo viaje: la última salida es 13:01, la primera sigue 08:02 y ya no dice «volvió»', a.ul === '13:01' && a.s === '08:02' && a.vu === '', a);
  poner('2026-10-15 08:00'); S.gps.unidades = [unidad('6663-CCP', LEJOS), unidad('5655-KSC', LEJOS), unidad('6021-URL', LEJOS)]; arrancar(S);   // el token de ayer venció: token + posiciones
  a = unid(S, '6663CCP');
  chk('otro día empieza de cero', a.s === '' && JSON.parse(S.P.GPS_DIA).f === '2026-10-15', a);
}

// ══ 6. El token ════════════════════════════════════════════════════════════
console.log('\n── 6. Token rechazado o vencido: pide otro ──');
{
  const S = servidor(SECRETO); poner('2026-10-14 09:00');
  S.gps.unidades = [unidad('6663-CCP', PTF)];
  arrancar(S);
  S.gps.responder = (acc) => acc === 'getdata' ? { code: 200, body: { status: 401, message: 'Token invalido o expirado' } } : null;
  pasar(1); let r = S.repaso();
  chk('la plataforma rechaza el token: lo olvida y lo dice', !S.P.GPS_TOKEN_AUTO && /401/.test(r.error) && /otro token/.test(r.error), r);
  S.gps.responder = null; pasar(1); S.repaso();
  chk('la vuelta siguiente pide un token nuevo', S.gps.llamadas.slice(-1)[0].accion === 'gettoken' && JSON.parse(S.P.GPS_TOKEN_AUTO).k === 'tok-2', S.gps.llamadas.map(c => c.accion));
  pasar(1); S.repaso();
  chk('…y con él, las posiciones', S.gps.llamadas.slice(-1)[0].campos.token === 'tok-2');
  pasar(5 * 60 + 31); S.repaso();
  chk('a las 5 h 30 lo renueva solo', S.gps.llamadas.slice(-1)[0].accion === 'gettoken' && JSON.parse(S.P.GPS_TOKEN_AUTO).k === 'tok-3', S.gps.llamadas.slice(-1)[0].accion);
  S.gps.responder = () => { throw new Error('DNS error'); }; pasar(1); r = S.repaso();
  chk('sin internet: no se cae, lo anota', /no hubo conexión/.test(r.error) && /no hubo conexión/.test(JSON.parse(S.P.GPS_ULTIMO).error), r);
  S.gps.responder = (acc) => acc === 'getdata' ? { code: 500, body: '<html>Error interno</html>' } : null; pasar(1); r = S.repaso();
  chk('la plataforma da un error que no es JSON: lo anota sin el HTML y sin tocar el token', /500/.test(r.error) && !/</.test(r.error) && !!S.P.GPS_TOKEN_AUTO, r);
}

// ══ 7. Nada secreto afuera ═════════════════════════════════════════════════
console.log('\n── 7. Ni la apikey, ni la clave, ni el token en lo que lee el panel ──');
{
  const S = servidor(SECRETO); poner('2026-10-14 09:00');
  S.gps.unidades = [unidad('6663-CCP', PTF)];
  arrancar(S);
  const txt = JSON.stringify(S.lista()) + S.P.GPS_ULTIMO + JSON.stringify(S.ctx.estadoGps());
  chk('la lectura, GPS_ULTIMO y estadoGps no dicen la apikey, la clave, el usuario ni el token',
      !txt.includes(SECRETO.GPS_APIKEY) && !txt.includes(SECRETO.GPS_CLAVE) && !txt.includes(SECRETO.GPS_USUARIO) && !txt.includes('tok-1'));
  S.gps.responder = (acc) => acc === 'getdata' ? { code: 403, body: { status: 403, message: 'apikey ' + SECRETO.GPS_APIKEY + ' sin permiso' } } : null;
  pasar(1); const r = S.repaso();
  chk('(si la plataforma devolviera la apikey en un error, el error queda en GPS_ULTIMO: solo lo ve quien entra al editor)', /403/.test(r.error));
}

// ══ 8. Disparador, probar y probarGps ══════════════════════════════════════
console.log('\n── 8. instalarDisparadores, probarAntesDeImplementar y probarGps ──');
{
  const S = servidor(); poner('2026-10-14 09:00');
  S.ctx.instalarDisparadores();
  const t = S.triggers.filter(x => x.fn === 'gpsRepaso');
  chk('instalarDisparadores deja gpsRepaso cada minuto (y el resto como siempre)', t.length === 1 && t[0].n === 1 && S.triggers.some(x => x.fn === 'waRepaso') && S.triggers.some(x => x.fn === 'kommoRepaso'), S.triggers.map(x => x.fn + ':' + (x.n || '')));
  S.ctx.instalarDisparadores();
  chk('…dos veces no lo duplica', S.triggers.filter(x => x.fn === 'gpsRepaso').length === 1);
  let p = S.ctx.probarAntesDeImplementar().lineas.join('\n');
  chk('probarAntesDeImplementar: sin configurar es ✅ y dice qué falta', /✅ El GPS todavía no está configurado \(faltan GPS_APIKEY, GPS_USUARIO, GPS_CLAVE/.test(p), p.split('\n').filter(l => /GPS/.test(l)));
  Object.assign(S.P, SECRETO); S.gps.unidades = [unidad('6663-CCP', PTF), unidad('ABC123', LEJOS)];
  arrancar(S);
  p = S.ctx.probarAntesDeImplementar().lineas.join('\n');
  chk('…configurado y andando: «el GPS anda» con las placas', /✅ El GPS anda: .* vio 2 unidad/.test(p), p.split('\n').filter(l => /GPS/.test(l)));
  S.gps.responder = () => ({ code: 401, body: { status: 401, message: 'usuario invalido' } }); pasar(1); S.repaso();
  p = S.ctx.probarAntesDeImplementar();
  chk('…con un error: ⚠️ que no frena la implementación', /⚠️ El último repaso del GPS .*401/.test(p.lineas.join('\n')) && p.ok, p.lineas.filter(l => /GPS/.test(l)));
  S.gps.responder = null; delete S.P.GPS_TOKEN_AUTO;
  const n0 = S.gps.llamadas.length, g = S.ctx.probarGps().lineas.join('\n');
  const pedidos = S.gps.llamadas.slice(n0);
  chk('probarGps pide el token y, 30 s después, las posiciones', pedidos.map(c => c.accion).join(',') === 'gettoken,getdata' && pedidos[1].ms - pedidos[0].ms >= 30000, pedidos.map(c => c.accion + '@' + c.ms));
  chk('…y dice qué camión es cada placa, a cuánto está de PTF o Banzer y la hora del reporte', /6663-CCP = Foton nuevo · 32 km\/h · motor encendido · a \d+ m de PTF · reporte «2026-10-14 \d\d:\d\d:\d\d» \(= \d\d:\d\d de Bolivia/.test(g) && /ABC123 \(no es ningún camión del panel\)/.test(g), g);
  chk('…y avisa los camiones del panel que el GPS no ve', /⚠️ El Carry \(6409TIG\) no aparece en el GPS/.test(g) && /Foton insumo/.test(g), g);
  chk('probarGps no guarda posiciones ni toca las salidas', S.cache.get('gps_pos') && JSON.parse(S.cache.get('gps_pos')).u.length === 2 && !/rd/.test(S.cache.get('gps_pos')));
}

// ══ 9. Las paradas, cerca de los pedidos del día (2026-10-13-b) ══════════════
console.log('\n── 9. 🛑 Paradas: 4 min quieto fuera de las bases; el pedido de HOY de ese camión a ≤ 300 m ──');
const MOR = { la: -17.7623355, lo: -63.0675466 };
const CLI_A = { la: -17.7700, lo: -63.1600 }, CLI_A2 = { la: -17.7707, lo: -63.1600 }, CLI_B = { la: -17.7800, lo: -63.1300 };
const CLI_C = { la: -17.7900, lo: -63.1500 }, CLI_D = { la: -17.7600, lo: -63.1800 }, CLI_X = { la: -17.7950, lo: -63.1700 }, ROJO = { la: -17.7750, lo: -63.1450 };
const fila = (id, fecha, cli, pt, veh, o) => { o = o || {}; const r = new Array(30).fill(''); r[0] = id; r[1] = fecha; r[2] = o.oc || ('10-' + id); r[3] = 'Vendedora Uno'; r[4] = cli;
  r[8] = o.zona || 'Norte'; r[9] = o.dir || 'Calle 1'; r[10] = pt ? ('https://www.google.com/maps?q=' + pt.la + ',' + pt.lo) : (o.maps || ''); r[17] = o.estado || ''; r[19] = veh || ''; r[29] = 1; return r; };
const QUIETO = { GpsSpeed: '0', Ignition: '0' }, ANDA = { GpsSpeed: '35' };
const min1 = (S, U) => { pasar(1); S.gps.unidades = U(); return S.repaso(); };
const hh = (ms) => new Date(ms - 4 * 3600000).toISOString().slice(11, 16);
{
  const HOY = '2026-10-14', AYER = '2026-10-13';
  const S = servidor(SECRETO, { filas: [
    fila('pA', HOY, 'Cliente A', CLI_A, 'Foton nuevo'), fila('pA2', HOY, 'Cliente A bis', CLI_A2, 'Foton nuevo'),
    fila('pC', HOY, 'Cliente del Carry', CLI_C, 'Carry'), fila('pL', HOY, 'Cliente sin camión', CLI_B, ''),
    fila('pY', AYER, 'Cliente de ayer', CLI_B, 'Foton nuevo'), fila('kommo-9', HOY, 'Borrador', CLI_B, '', { estado: 'Borrador Kommo' }),
    fila('pG', HOY, 'Cliente link corto', null, 'Foton nuevo', { maps: 'https://maps.app.goo.gl/abc123' }),
    fila('pT', HOY, 'Venta de tienda', CLI_D, 'Foton nuevo', { zona: 'Tienda' }) ],
    geo: [['https://maps.app.goo.gl/abc123', CLI_D.la, CLI_D.lo, '']] });
  poner('2026-10-14 08:00'); S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO)]; arrancar(S);         // 08:01 en PTF, quieto
  for (let i = 0; i < 5; i++) min1(S, () => [unidad('6663-CCP', PTF, QUIETO)]);                     // 08:06 cargando en PTF
  chk('quieto ADENTRO de PTF no es una parada (y no lee la planilla)', !(unid(S, '6663CCP').par || []).length && S.lecturas.enRepaso === 0, unid(S, '6663CCP').par);
  for (let i = 0; i < 4; i++) min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);                     // 08:07-08:10 en la calle
  min1(S, () => [unidad('6663-CCP', CLI_A, QUIETO)]);                                               // 08:11 llega a lo de A
  const t0 = RELOJ.ms;
  for (let i = 0; i < 3; i++) min1(S, () => [unidad('6663-CCP', CLI_A, QUIETO)]);                   // 08:14 (3 min)
  chk('3 minutos quieto en lo de A: todavía no es parada, y la planilla no se leyó', !(unid(S, '6663CCP').par || []).length && S.lecturas.enRepaso === 0, S.lecturas);
  min1(S, () => [unidad('6663-CCP', CLI_A, QUIETO)]);                                               // 08:15 (4 min)
  let a = unid(S, '6663CCP'), p0 = (a.par || [])[0] || [];
  chk('a los 4 minutos: parada desde las 08:11, abierta, con los dos pedidos SUYOS de hoy a ≤ 300 m (el más cerca primero)',
      p0[0] === hh(t0) && p0[1] === '08:15' && p0[5] === 1 && JSON.stringify(p0[4]) === '["pA","pA2"]' && p0[6] === 0, p0);
  chk('…la planilla se leyó UNA vez, recién al registrar la parada', S.lecturas.enRepaso === 1, S.lecturas);
  for (let i = 0; i < 6; i++) min1(S, () => [unidad('6663-CCP', CLI_A, QUIETO)]);                   // 08:21
  a = unid(S, '6663CCP');
  chk('sigue ahí: «hasta» avanza (08:21) y no vuelve a leer la planilla', a.par[0][1] === '08:21' && a.par[0][5] === 1 && S.lecturas.enRepaso === 1, a.par[0]);
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);                                                 // 08:22 se va
  a = unid(S, '6663CCP');
  chk('…y a los 15 minutos de dejar PTF «salió 08:07» (con la parada adentro, igual que antes)', a.s === '08:07' && a.sd === 'ptf', a);
  chk('se va: la parada queda cerrada (08:11 a 08:21)', a.par[0][5] === 0 && a.par[0][1] === '08:21' && a.par.length === 1, a.par);
  for (let i = 0; i < 2; i++) min1(S, () => [unidad('6663-CCP', ROJO, QUIETO)]);                    // semáforo largo: 2 min
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);
  chk('2 minutos en un semáforo: no es parada', unid(S, '6663CCP').par.length === 1, unid(S, '6663CCP').par.length);
  for (let i = 0; i < 6; i++) min1(S, () => [unidad('6663-CCP', CLI_C, QUIETO)]);
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);
  a = unid(S, '6663CCP');
  chk('parado al lado del pedido de OTRO camión (el Carry): parada SIN pedido — nunca se le adjudica', a.par.length === 2 && a.par[1][4].length === 0 && a.par[1][6] == null, a.par[1]);
  for (let i = 0; i < 6; i++) min1(S, () => [unidad('6663-CCP', CLI_B, QUIETO)]);
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);
  a = unid(S, '6663CCP');
  chk('al lado de un pedido de hoy SIN camión: ese sí (ni el de ayer ni el borrador de Kommo)', JSON.stringify(a.par[2][4]) === '["pL"]', a.par[2]);
  for (let i = 0; i < 6; i++) min1(S, () => [unidad('6663-CCP', CLI_D, QUIETO)]);
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);
  a = unid(S, '6663CCP');
  chk('un pedido con enlace corto: el pin sale de la hoja «Geo» (la venta de tienda del mismo lugar no cuenta)', JSON.stringify(a.par[3][4]) === '["pG"]' && S.lecturas.geo >= 1, [a.par[3], S.lecturas]);
  chk('cuatro paradas registradas = cuatro lecturas de la planilla (una por parada, nunca por minuto)', S.lecturas.enRepaso === 4, S.lecturas);
  /* El GPS se duerme con el motor apagado: el último reporte queda quieto y viejo. */
  pasar(1); const dormido = unidad('6663-CCP', CLI_X, QUIETO), tD = RELOJ.ms; S.gps.unidades = [dormido]; S.repaso();
  for (let i = 0; i < 30; i++) { pasar(1); S.repaso(); }
  a = unid(S, '6663CCP'); const pd = a.par[4] || [];
  chk('con el reporte dormido: la parada cuenta hasta 20 min después del último reporte y ahí se queda (no vuelve atrás)', pd[0] === hh(tD) && pd[1] === hh(tD + 20 * 60000) && pd[5] === 1, pd);
  poner('2026-10-14 12:30'); S.gps.unidades = [unidad('6663-CCP', CERCA_PTF, QUIETO)]; S.repaso();
  a = unid(S, '6663CCP');
  chk('vuelve a PTF: «volvió 12:30», la parada abierta se cierra y el registro dice salió y llegó', a.vu === '12:30' && a.par[4][5] === 0 &&
      JSON.stringify(a.ev) === JSON.stringify([['08:07', 'sal', 'ptf', ''], ['12:30', 'lle', 'ptf', 'ptf']]), a.ev);
  const PA = JSON.parse(S.P.GPS_PAR);
  chk('las paradas quedan en la propiedad GPS_PAR de hoy (no en la caché: no se pierden)', PA.f === HOY && PA.u['6663CCP'].length === 5, PA.f);
  chk('…y nada de eso marca ✅ ni toca la planilla', S.sh._datos.slice(1).every(r => r[18] === ''), S.sh._datos.map(r => r[18]));
}

// ══ 10. Moreno = recoger; traslados ════════════════════════════════════════
console.log('\n── 10. 📥 Moreno es para RECOGER: ese viaje no es «salió»; de PTF a Banzer sin pararse, tampoco ──');
{
  const HOY = '2026-10-14';
  const S = servidor(SECRETO, { filas: [fila('pU', HOY, 'Cliente del insumo', CLI_A, 'Foton insumo'), fila('pU2', HOY, 'Otro del insumo', CLI_B, 'Foton insumo')] });
  poner('2026-10-14 08:00');
  const todos = (t, u, k) => [unidad('6409-TIG', t[0], t[1]), unidad('6021-URL', u[0], u[1]), unidad('5655-KSC', k[0], k[1])];
  S.gps.unidades = todos([PTF, QUIETO], [PTF, QUIETO], [PTF, QUIETO]); arrancar(S);                                 // 08:01 los tres en PTF
  min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                                                // 08:02 salen
  for (let i = 0; i < 15; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                  // 08:17
  let t = unid(S, '6409TIG');
  chk('15 min afuera: «salió 08:02» (todavía no se sabe adónde va)', t.s === '08:02' && t.sd === 'ptf', t);
  for (let i = 0; i < 3; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                   // 08:20
  min1(S, () => todos([MOR, QUIETO], [LEJOS, ANDA], [BZ, QUIETO]));                                                 // 08:21: el Carry a Moreno, el KSC a Banzer
  t = unid(S, '6409TIG'); let k = unid(S, '5655KSC');
  chk('el Carry llega a Moreno sin haberse parado en ningún pedido: fue a recoger → el «salió» se DESHACE', t.s === '' && t.ul === '' && t.mor === 1 && t.f === 1, t);
  chk('…el registro lo dice: salió de PTF (a recoger) y llegó a Moreno', JSON.stringify(t.ev) === JSON.stringify([['08:02', 'sal', 'ptf', 'rec'], ['08:21', 'lle', 'moreno', 'ptf']]), t.ev);
  chk('…y en Moreno no se registran paradas (está en una base)', !t.par.length, t.par);
  chk('el KSC fue de PTF a Banzer en 19 min sin pararse: traslado, el «salió» también se deshace', k.s === '' && k.f === 0 && k.dep.id === 'banzer' && k.ev[0][3] === 'tra', k.ev);
  for (let i = 0; i < 20; i++) min1(S, () => todos([MOR, QUIETO], [LEJOS, ANDA], [BZ, QUIETO]));                   // 08:41 cargando
  min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                                                // 08:42 el Carry sale de Moreno, el KSC de Banzer
  for (let i = 0; i < 20; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                  // 09:02
  t = unid(S, '6409TIG'); k = unid(S, '5655KSC');
  chk('el Carry sale de Moreno y anda 20 min: NO «salió» (de Moreno a PTF son ~25 min)', t.s === '', t);
  chk('el KSC sale de Banzer: a los 15 min «salió 08:42 de Banzer»', k.s === '08:42' && k.sd === 'banzer', k);
  for (let i = 0; i < 5; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));
  min1(S, () => todos([CERCA_PTF, QUIETO], [LEJOS, ANDA], [LEJOS, ANDA]));                                          // 09:08 el Carry llega a PTF
  t = unid(S, '6409TIG');
  chk('…llega a PTF: un traslado de Moreno a PTF, sin «salió» ni «volvió»; el registro dice de dónde venía',
      t.s === '' && t.vu === '' && JSON.stringify(t.ev.slice(-1)) === JSON.stringify([['09:08', 'lle', 'ptf', 'moreno']]) && !t.ev.some(e => e[1] === 'sal' && e[2] === 'moreno'), t.ev);
  min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                                                // 09:09 ahora sí sale a repartir
  for (let i = 0; i < 15; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));
  t = unid(S, '6409TIG');
  chk('…y cuando sale de PTF a repartir: «salió 09:09»', t.s === '09:09' && t.sd === 'ptf', t);
  /* El insumo (URL): reparte y DESPUÉS va a Moreno; después sale de Moreno directo a un cliente. */
  for (let i = 0; i < 6; i++) min1(S, () => todos([LEJOS, ANDA], [CLI_A, QUIETO], [LEJOS, ANDA]));
  min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));
  for (let i = 0; i < 3; i++) min1(S, () => todos([LEJOS, ANDA], [MOR, QUIETO], [LEJOS, ANDA]));
  let u = unid(S, '6021URL');
  chk('el insumo entregó en lo de su cliente y después fue a Moreno: su «salió 08:02» QUEDA (no fue solo a recoger)', u.s === '08:02' && u.mor === 1 && u.ev[0][3] === '' && u.vu === '', u.ev);
  min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));
  const tSal = RELOJ.ms;
  for (let i = 0; i < 4; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));
  for (let i = 0; i < 5; i++) min1(S, () => todos([LEJOS, ANDA], [CLI_B, QUIETO], [LEJOS, ANDA]));   // 4 min quieto = 5 lecturas
  u = unid(S, '6021URL');
  chk('sale de Moreno directo a otro cliente: con la primera parada cuenta «salió» a la hora en que dejó Moreno', u.ul === hh(tSal) && u.s === '08:02' &&
      u.ev.some(e => e[1] === 'sal' && e[2] === 'moreno' && e[0] === hh(tSal) && e[3] === ''), u.ev);
  /* Moreno → 45 minutos dando vueltas sin pararse en ninguna base: sí salió */
  const S2 = servidor(SECRETO); poner('2026-10-14 08:00');
  S2.gps.unidades = [unidad('6409-TIG', MOR, QUIETO)]; arrancar(S2);
  min1(S2, () => [unidad('6409-TIG', LEJOS, ANDA)]); const t2 = RELOJ.ms;
  for (let i = 0; i < 44; i++) min1(S2, () => [unidad('6409-TIG', LEJOS, ANDA)]);
  chk('de Moreno, 44 min afuera sin parar: todavía no', unid(S2, '6409TIG').s === '', unid(S2, '6409TIG'));
  min1(S2, () => [unidad('6409-TIG', LEJOS, ANDA)]);
  chk('…a los 45 min: «salió» a la hora en que dejó Moreno', unid(S2, '6409TIG').s === hh(t2) && unid(S2, '6409TIG').sd === 'moreno', unid(S2, '6409TIG'));
}

// ══ 11. Topes: una propiedad aguanta 9 KB ══════════════════════════════════
console.log('\n── 11. Topes: 24 paradas por camión (las con pedido se quedan), 24 anotaciones, < 8.500 letras ──');
{
  const HOY = '2026-10-14', filas = [], pts = [];
  for (let i = 0; i < 30; i++) { const p = { la: -17.80 - i * 0.01, lo: -63.20 }; pts.push(p); if (i % 3 === 0) filas.push(fila('pp' + i, HOY, 'Cliente ' + i, p, 'Foton nuevo')); }
  const S = servidor(SECRETO, { filas }); poner('2026-10-14 06:30');
  S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO), unidad('6409-TIG', PTF, QUIETO), unidad('6021-URL', PTF, QUIETO), unidad('5655-KSC', PTF, QUIETO)]; arrancar(S);
  for (let i = 0; i < 30; i++) {
    for (let j = 0; j < 5; j++) min1(S, () => ['6663-CCP', '6409-TIG', '6021-URL', '5655-KSC'].map(pl => unidad(pl, pts[i], QUIETO)));
    min1(S, () => ['6663-CCP', '6409-TIG', '6021-URL', '5655-KSC'].map(pl => unidad(pl, LEJOS, ANDA)));
  }
  const a = unid(S, '6663CCP'), con = a.par.filter(q => q[4].length);
  chk('30 paradas: quedan 24 por camión', a.par.length === 24 && unid(S, '6409TIG').par.length === 24, a.par.length);
  chk('…las 10 con pedido están todas (se van primero las viejas SIN pedido)', con.length === 10, con.map(q => q[4][0]));
  chk('GPS_PAR (4 camiones × 24 paradas) no pasa las 8.500 letras', S.P.GPS_PAR.length <= 8500, S.P.GPS_PAR.length);
  for (let v = 0; v < 14; v++) {
    min1(S, () => ['6663-CCP', '6409-TIG', '6021-URL', '5655-KSC'].map(pl => unidad(pl, CERCA_PTF, QUIETO)));
    for (let j = 0; j < 17; j++) min1(S, () => ['6663-CCP', '6409-TIG', '6021-URL', '5655-KSC'].map(pl => unidad(pl, LEJOS, ANDA)));
  }
  const b = unid(S, '6663CCP');
  chk('14 viajes = 28 anotaciones: quedan 24, y la PRIMERA salida del día sigue siendo la hora de «Ya salió»', b.ev.length === 24 && b.s === '06:32' && b.ev.some(e => e[0] === '06:32' && e[1] === 'sal'), [b.s, b.ev.length, b.ev[0]]);
  chk('GPS_DIA no pasa las 8.500 letras', S.P.GPS_DIA.length <= 8500, S.P.GPS_DIA.length);
  const Lb = S.lista();
  chk('la lectura del panel lleva el día aparte (`gpsDia`: salidas, registro y paradas) y las posiciones siguen livianas', Lb.gpsDia && Lb.gpsDia.f === HOY && Array.isArray(Lb.gpsDia.u['6663CCP'].par) &&
      Lb.gpsDia.u['6663CCP'].s === b.s && !('par' in Lb.gps.u[0]) && JSON.stringify(Lb.gps).length < 3000 && JSON.stringify(Lb.gpsDia).length < 30000, [JSON.stringify(Lb.gps).length, JSON.stringify(Lb.gpsDia).length]);
  S.cache.delete('gps_pos');
  const Lc = S.lista();
  chk('después de las 21 h (las posiciones vencieron): el día SIGUE llegando, para el cierre de entregas', !('gps' in Lc) && Lc.gpsDia && Lc.gpsDia.u['6663CCP'].par.length === 24, Object.keys(Lc));
  poner('2026-10-15 06:10');
  chk('…pero el de ayer no', !('gpsDia' in S.lista()));
}

// ══ 12. El recorrido del día ═══════════════════════════════════════════════
console.log('\n── 12. 🗺️ El recorrido: aparte (`gpsRuta`), sin candado y sin leer la planilla ──');
{
  const S = servidor(SECRETO); poner('2026-10-14 08:00');
  S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO)]; arrancar(S);
  for (let i = 0; i < 10; i++) min1(S, () => [unidad('6663-CCP', PTF, QUIETO)]);                    // 10 min quieto en PTF
  for (let i = 0; i < 10; i++) min1(S, () => [unidad('6663-CCP', { la: PTF.la - (i + 1) * 0.002, lo: PTF.lo }, ANDA)]);   // 10 min andando, ~220 m por minuto
  let locks = 0; const lk = S.ctx.LockService; S.ctx.LockService = { getScriptLock: () => ({ waitLock() { locks++; }, releaseLock() {}, tryLock() { locks++; return true; } }) };
  const n0 = S.lecturas.pedidos, R = S.post({ action: 'gpsRuta' });   // (la lectura de la planilla la haría `list`, no esto)
  S.ctx.LockService = lk;
  const L = R.ruta && R.ruta.u['6663CCP'];
  chk('`gpsRuta` contesta sin candado y sin leer la planilla', R.ok && locks === 0 && S.lecturas.pedidos === n0, { locks, n0, ahora: S.lecturas.pedidos });
  chk('quieto en PTF: un punto cada 5 min (3), no uno por minuto; andando: uno por minuto (10)', L && L.length === 13, L && L.map(q => q[0]));
  chk('cada punto: [minuto del día en Bolivia (el del REPORTE: 08:00), lat, lng, km/h]', L && L[0][0] === 8 * 60 && Math.abs(L[0][1] - PTF.la) < 1e-5 && L[12][3] === 35, L && L[0]);
  chk('la lectura de cada minuto NO lleva el recorrido (pesa): solo las posiciones', !('ruta' in S.lista().gps) && !JSON.stringify(S.lista().gps).includes('gps_ruta'));
  for (let i = 0; i < 400; i++) min1(S, () => [unidad('6663-CCP', { la: -17.70 - i * 0.001, lo: -63.10 }, ANDA)]);
  const L2 = S.post({ action: 'gpsRuta' }).ruta.u['6663CCP'];
  chk('un día largo: no pasa de 300 puntos y queda el día entero (el primero y el último)', L2.length <= 300 && L2[0][0] === 8 * 60 && L2[L2.length - 1][0] === Math.floor((RELOJ.ms - 4 * 3600000) % 86400000 / 60000), [L2.length, L2[0][0], L2[L2.length - 1][0]]);
  chk('…y entra en la caché (< 100 KB)', S.cache.get('gps_ruta').length < 100000, S.cache.get('gps_ruta').length);
  poner('2026-10-15 07:00');
  chk('otro día: el recorrido de ayer no se muestra', S.post({ action: 'gpsRuta' }).ruta === null);
}

// ══ 13. probarAntesDeImplementar cuenta las paradas ════════════════════════
console.log('\n── 13. probarAntesDeImplementar: cuántas paradas de hoy, cuántas cerca de un pedido ──');
{
  const S = servidor(SECRETO, { filas: [fila('pA', '2026-10-14', 'Cliente A', CLI_A, 'Foton nuevo')] }); poner('2026-10-14 08:00');
  S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO)]; arrancar(S);
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);
  for (let i = 0; i < 6; i++) min1(S, () => [unidad('6663-CCP', CLI_A, QUIETO)]);
  min1(S, () => [unidad('6663-CCP', LEJOS, ANDA)]);
  for (let i = 0; i < 6; i++) min1(S, () => [unidad('6663-CCP', CLI_X, QUIETO)]);
  const p = S.ctx.probarAntesDeImplementar().lineas.join('\n');
  chk('«Hoy el GPS anotó 2 parada(s)…; 1 cerca de un pedido del día (… nada se marca ✅)»', /Hoy el GPS anotó 2 parada\(s\) de los camiones; 1 cerca de un pedido del día \(solo se muestran: nada se marca ✅\)/.test(p), p.split('\n').filter(l => /GPS/.test(l)));
  chk('la versión es la 2026-10-13-c', S.ctx.SCRIPT_VERSION === '2026-10-13-c');
}

// ══ 14. (2026-10-13-c) La puerta de los depósitos no es una parada ═════════
console.log('\n── 14. 🚪 Quieto a < 700 m de PTF, Banzer o Moreno y sin pedido cerca: no es parada ni vuelve «salió» un traslado ──');
{
  /* La captura del dueño (13/10 12:36): el 5655-KSC «se paró 6 min», «se paró 17 min (sin pedido de hoy cerca)» y a las 12:33 «llegó a PTF»:
     venía de Moreno y esperaba afuera de PTF. */
  const HOY = '2026-10-14';
  const PUERTA_PTF = { la: PTF.la - 0.004, lo: PTF.lo }, PUERTA_BZ = { la: BZ.la + 0.004, lo: BZ.lo }, VECINO = { la: PTF.la + 0.004, lo: PTF.lo };
  const S = servidor(SECRETO, { filas: [fila('pV', HOY, 'Vecino de PTF', VECINO, 'Foton nuevo')] });
  poner('2026-10-14 11:00');
  const todos = (k, z, c) => [unidad('5655-KSC', k[0], k[1]), unidad('6409-TIG', z[0], z[1]), unidad('6663-CCP', c[0], c[1])];
  S.gps.unidades = todos([MOR, QUIETO], [PTF, QUIETO], [PTF, QUIETO]); arrancar(S);                                // 11:01: KSC en Moreno, TIG y CCP en PTF
  for (let i = 0; i < 25; i++) min1(S, () => todos([LEJOS, ANDA], [LEJOS, ANDA], [LEJOS, ANDA]));                   // 11:26: KSC de Moreno a PTF; TIG a Banzer; CCP al vecino
  for (let i = 0; i < 6; i++) min1(S, () => todos([PUERTA_PTF, QUIETO], [PUERTA_BZ, QUIETO], [VECINO, QUIETO]));      // 11:32: esperan en la puerta / CCP entrega
  for (let i = 0; i < 17; i++) min1(S, () => todos([PUERTA_PTF, QUIETO], [BZ, QUIETO], [LEJOS, ANDA]));              // 11:49: KSC sigue en la puerta (17 min), TIG entra a Banzer
  min1(S, () => todos([CERCA_PTF, QUIETO], [BZ, QUIETO], [LEJOS, ANDA]));                                             // 11:50: KSC entra a PTF
  const k = unid(S, '5655KSC'), t = unid(S, '6409TIG'), c = unid(S, '6663CCP');
  chk('el KSC esperó 23 min en la puerta de PTF sin pedido cerca: NO es parada', !(k.par || []).length, k.par);
  chk('…y de Moreno a PTF en 49 min, esperando en la puerta: NO «salió» (los 45 min cuentan lejos de las bases)', k.s === '' && !k.ev.some(e => e[1] === 'sal'), k.ev);
  chk('…el registro: llegó a PTF desde Moreno', JSON.stringify(k.ev.slice(-1)) === JSON.stringify([['11:50', 'lle', 'ptf', 'moreno']]), k.ev);
  chk('…la planilla se leyó UNA vez por esa espera (no una por minuto)', S.lecturas.enRepaso <= 3, S.lecturas);
  chk('el TIG esperó en la puerta de Banzer y entró: sigue siendo un traslado (no «salió»)', t.s === '' && !(t.par || []).length && t.ev[0][3] === 'tra', t.ev);
  chk('el CCP se paró a 450 m de PTF, al lado de SU pedido: esa sí es parada (un cliente vecino)', (c.par || []).length === 1 && JSON.stringify(c.par[0][4]) === '["pV"]', c.par);
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
