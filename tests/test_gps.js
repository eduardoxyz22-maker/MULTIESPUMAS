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
function servidor(props) {
  const sh = hacerPlanilla([HDR]), P = Object.assign({}, props || {}), triggers = [], cache = new Map();
  const gps = { llamadas: [], unidades: [], tokenN: 0, responder: null };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : null, insertSheet: () => hacerPlanilla([]) }) },
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
  return { ctx, P, gps, cache, triggers, post, repaso: () => ctx.gpsRepaso(), lista: () => post({ action: 'list' }) };
}
/* Dos vueltas seguidas (token + posiciones), un minuto entre cada una. */
const arrancar = (S) => { S.repaso(); pasar(1); return S.repaso(); };
const unid = (S, placa) => { const g = S.lista().gps; return g && g.u.filter(x => x.p === placa)[0]; };

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

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
