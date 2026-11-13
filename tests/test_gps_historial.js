/* 🛰️📚 CÓMO LE FUE A CADA CAMIÓN SEGÚN EL GPS (13/11/2026, mejora 204, servidor 2026-11-13-b).

   El dueño (13/11): un informe por camión con lo que manda el GPS: a qué hora salió, horas fuera, paradas y kilómetros. Hasta acá el GPS
   guardaba SOLO el día en curso (GPS_DIA). Ahora el servidor suma cada día los km y las horas fuera de las bases y deja una fila por día y
   camión en la hoja «Historial GPS»; la ventana «🚚 Entregas por camión» la lee con `gpsHist` y suma por camión.

   LO QUE ESTA PRUEBA CUIDA (el .gs de verdad con un Google y una plataforma de mentira; la página de verdad en Chromium):
     1. Los km con un recorrido inventado: la suma de los tramos (haversine), sin el «baile» del GPS quieto (< 30 m) y sin un salto
        imposible (> 150 km/h); tres saltos seguidos = el camión de verdad está ahí: se sigue desde ahí, sin sumar.
     2. Las horas fuera de PTF, Banzer y Moreno: de la salida a la vuelta; visto primero en la calle no se adivina.
     3. Las salidas a repartir (un traslado PTF → Banzer no es salida) y las paradas del día (con o sin pedido cerca), aunque GPS_PAR se pode.
     4. Una fila por día y camión: a las 21 h (fuera de horario, sin pedirle nada a la plataforma) y, si esa no corrió, en el primer repaso
        del día siguiente; volver a escribir el mismo día REEMPLAZA (no duplica); lo de más de 2 años se borra; las horas van como texto.
     5. `gpsHist` {desde, hasta}: las filas de esos días (sin candado), la más nueva si hay dos del mismo día y placa, el día en curso con
        `c:1`, sin nada de clientes. Sin las propiedades del GPS no se arma la hoja.
     6. probarAntesDeImplementar dice si la hoja existe y cuántas filas tiene; nada de lo de antes del GPS cambia (salió, paradas, GPS_DIA
        dentro de las 8.500 letras).
     7-12. La página: sin servidor nuevo no hay columnas ni pedido (una línea chica lo dice); con el 13-b pide `gpsHist` del mes UNA vez al
        abrir y al cambiar de mes; columnas al final por camión (días con GPS, sale promedio y la más tarde, horas fuera, km, paradas,
        entregas por día con GPS) sacadas de `ecFilasPorCamion`; «Sin datos del GPS en este mes»; error; por chofer, nada; Copiar y
        Excel con lo del GPS al final; 390 px sin scroll de costado.
   Datos SINTÉTICOS (el repo es público): placas que ya están en el código, puntos y pedidos inventados.

   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_gps_historial.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

/* ── Un Google de mentira: hojas que se crean de verdad (getSheetByName las encuentra), con deleteRow y formatos anotados. ── */
const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice()), formatos = [];
  const sh = { _datos: datos, _formatos: formatos, _escrituras: 0, getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }), setFrozenRows: () => {},
    appendRow: (r) => { sh._escrituras++; datos.push(r.slice()); },
    deleteRow: (n) => { sh._escrituras++; datos.splice(n - 1, 1); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1], setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { sh._escrituras++; for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: (f) => { formatos.push(String(fila) + '=' + f); } }) };
  return sh;
}
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };   // hora de Bolivia
const pasar = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); } static now() { return RELOJ.ms; } }

const PTF = { la: -17.7489125, lo: -63.1429219 }, BZ = { la: -17.7197548, lo: -63.1631138 };
const unidad = (placa, pt, o) => Object.assign({ UnitId: 'U-' + placa, UnitPlate: placa, GpsIdentif: '0000', ReportDate: new Date(RELOJ.ms).toISOString().slice(0, 19).replace('T', ' '),
  Latitude: pt.la.toFixed(6), Longitude: pt.lo.toFixed(6), GpsSpeed: '32', Ignition: '1', Conductor: 'CHOFER UNO', Direction: 'N' }, o || {});
const QUIETO = { GpsSpeed: '0', Ignition: '0' }, ANDA = { GpsSpeed: '35' };
const SECRETO = { GPS_APIKEY: 'apikey-de-mentira-123', GPS_USUARIO: 'usuario-mentira', GPS_CLAVE: 'clave-mentira-456' };
const fila = (id, fecha, cli, pt, veh) => { const r = new Array(30).fill(''); r[0] = id; r[1] = fecha; r[2] = '11-' + id; r[3] = 'Vendedora Uno'; r[4] = cli;
  r[8] = 'Norte'; r[9] = 'Calle 1'; r[10] = pt ? ('https://www.google.com/maps?q=' + pt.la + ',' + pt.lo) : ''; r[19] = veh || ''; r[29] = 1; return r; };

function servidor(props, opt) {
  opt = opt || {};
  const hojas = { Pedidos: hacerPlanilla([HDR].concat(opt.filas || [])) };
  const P = Object.assign({}, props || {}), triggers = [], cache = new Map(), candado = { n: 0 };
  const gps = { llamadas: [], unidades: [], tokenN: 0 };
  const ss = { getSheetByName: (n) => hojas[n] || null, insertSheet: (n) => (hojas[n] = hacerPlanilla([])) };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      const accion = url.replace(/^.*\/v1\//, ''); gps.llamadas.push({ accion, ms: RELOJ.ms });
      const r = accion === 'gettoken' ? { status: 200, data: 'tok-' + (++gps.tokenN) } : (accion === 'getdata' ? { status: 200, data: gps.unidades } : { status: 404 });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) };
    } },
    LockService: { getScriptLock: () => ({ waitLock() { candado.n++; }, releaseLock() {}, tryLock() { candado.n++; return true; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.has(k) ? cache.get(k) : null, put: (k, v) => { cache.set(k, v); }, putAll() {}, remove: (k) => { cache.delete(k); }, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; }, getContent() { return t; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: (ms) => { RELOJ.ms += ms; } },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: { newTrigger: (fn) => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
      getProjectTriggers: () => triggers.slice(), deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  return { ctx, P, gps, cache, hojas, candado, post, repaso: () => ctx.gpsRepaso(), hist: () => hojas['Historial GPS'] || null,
    dia: () => JSON.parse(P.GPS_DIA || 'null') };
}
/* Cada sección por separado: si el .gs no tiene algo (una versión anterior), la sección queda en rojo y las demás siguen. */
const seccion = (fn) => { try { fn(); } catch (e) { chk('la sección terminó sin errores', false, String(e && e.message || e)); } };
const min1 = (S, U) => { pasar(1); S.gps.unidades = U(); return S.repaso(); };
/* Un día nuevo: el token de ayer venció (5 h 30), así que la primera vuelta pide el token y la segunda, un minuto después, las posiciones. */
const arrancar = (S, U) => { S.gps.unidades = U(); const r1 = S.repaso(); pasar(1); S.gps.unidades = U(); const r2 = S.repaso(); return r1.hist ? r1 : r2; };
/* haversine igual que la página y el .gs */
const dist = (a, b) => { const r = Math.PI / 180, dLa = (b.la - a.la) * r, dLo = (b.lo - a.lo) * r;
  const q = Math.sin(dLa / 2) ** 2 + Math.cos(a.la * r) * Math.cos(b.la * r) * Math.sin(dLo / 2) ** 2; return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(q))); };
const redo = (p) => ({ la: Number(p.la.toFixed(6)), lo: Number(p.lo.toFixed(6)) });   // lo que el .gs guarda (6 decimales)
const filasHist = (S) => { const h = S.hist(); return h ? h._datos.slice(1).map(r => ({ f: r[0], cam: r[1], p: r[2], s: r[3], v: r[4], hf: r[5], n: r[6], par: r[7], pc: r[8], km: r[9], t: r[10] })) : []; };

// ══ 1. Kilómetros ══════════════════════════════════════════════════════════
console.log('\n── 1. 📏 Los km: la suma de los tramos, sin el baile del GPS quieto ni los saltos imposibles ──');
seccion(() => {
  const S = servidor(SECRETO);
  poner('2026-11-11 07:58'); S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO)]; S.repaso(); pasar(1); S.repaso();   // 07:59: token y la primera posición
  /* El GPS «baila» en PTF: 10 m para acá y para allá durante 5 minutos. */
  const baile = [{ la: PTF.la + 0.00009, lo: PTF.lo }, { la: PTF.la, lo: PTF.lo + 0.00009 }, { la: PTF.la - 0.00008, lo: PTF.lo }, { la: PTF.la, lo: PTF.lo - 0.00009 }, PTF];
  baile.forEach(pt => min1(S, () => [unidad('6663-CCP', pt, QUIETO)]));
  chk('1a quieto en PTF con el GPS «bailando» 10 m: 0 km', !(S.dia().u['6663CCP'].km), S.dia().u['6663CCP']);
  /* El recorrido: 25 minutos hacia el sur, ~445 m por minuto (≈ 27 km/h), y en el medio un salto imposible de 40 km. */
  const ruta = [PTF]; for (let i = 1; i <= 25; i++) ruta.push({ la: PTF.la - 0.004 * i, lo: PTF.lo + (i % 2 ? 0.0005 : 0) });
  let esperado = 0;
  for (let i = 1; i < ruta.length; i++) {
    if (i === 12) min1(S, () => [unidad('6663-CCP', { la: ruta[11].la - 0.36, lo: ruta[11].lo }, ANDA)]);   // un reporte loco, 40 km al sur en 1 minuto
    min1(S, () => [unidad('6663-CCP', ruta[i], ANDA)]);
    esperado += dist(redo(ruta[i - 1]), redo(ruta[i]));
  }
  const s = S.dia().u['6663CCP'];
  chk('1b el recorrido de 25 tramos suma lo mismo que la cuenta a mano (haversine), redondeado al metro', Math.abs(s.km - esperado) <= 13, { km: s.km, esperado: Math.round(esperado) });
  chk('1c el reporte de 40 km en un minuto no entró (sin él el total estaría lejos de 11 km)', s.km > 10500 && s.km < 12000, s.km);
  /* Despacio: 20 m por minuto. La referencia no se mueve con lo de menos de 30 m: suma cuando pasa los 30 m. */
  const fin = ruta[ruta.length - 1], k0 = s.km;
  for (let i = 1; i <= 3; i++) min1(S, () => [unidad('6663-CCP', { la: fin.la - 0.00018 * i, lo: fin.lo }, { GpsSpeed: '1' })]);
  const k1 = S.dia().u['6663CCP'].km;
  chk('1d avanzando de a 20 m por minuto: los primeros 20 no cuentan, a los 40 m sí (el «baile» no se come lo que avanza de a poco)', k1 - k0 >= 38 && k1 - k0 <= 42, k1 - k0);
  /* Tres reportes seguidos lejos: el camión de verdad está ahí (lo de antes era lo malo): se sigue desde ahí, sin sumar. */
  const lejos = { la: fin.la - 0.1, lo: fin.lo };
  for (let i = 0; i < 3; i++) min1(S, () => [unidad('6663-CCP', lejos, QUIETO)]);
  const k2 = S.dia().u['6663CCP'].km;
  min1(S, () => [unidad('6663-CCP', { la: lejos.la - 0.0045, lo: lejos.lo }, ANDA)]);
  const k3 = S.dia().u['6663CCP'].km;
  chk('1e tres reportes seguidos a 11 km (imposible en un minuto): no suman los 11 km…', k2 === k1, [k1, k2]);
  chk('1f …pero el camión sigue desde ahí: el tramo siguiente (500 m) sí suma', k3 - k2 >= 480 && k3 - k2 <= 520, k3 - k2);
  /* El mismo reporte otra vez (el GPS no mandó nada nuevo): nada. */
  const rep = unidad('6663-CCP', { la: lejos.la - 0.0045, lo: lejos.lo }, ANDA); rep.ReportDate = new Date(RELOJ.ms).toISOString().slice(0, 19).replace('T', ' ');
  pasar(1); S.gps.unidades = [rep]; S.repaso();
  rep.Latitude = (lejos.la - 0.009).toFixed(6); pasar(1); S.repaso();   // misma hora de reporte, otro lugar: no se toma
  chk('1g un reporte con la misma hora que el anterior no suma nada (ni aunque traiga otra posición)', S.dia().u['6663CCP'].km === k3, [S.dia().u['6663CCP'].km, k3]);
  chk('1h GPS_DIA sigue dentro de las 8.500 letras con los números nuevos', S.P.GPS_DIA.length <= 8500, S.P.GPS_DIA.length);
});

// ══ 2-3. Horas fuera, salidas y paradas ═══════════════════════════════════
console.log('\n── 2-3. ⏱️ Horas fuera de las bases, salidas a repartir y paradas del día ──');
const CLI = { la: -17.7750, lo: -63.1500 }, CLI2 = { la: -17.7800, lo: -63.1250 };
const S2 = servidor(SECRETO, { filas: [fila('p1', '2026-11-11', 'Cliente Uno', CLI, 'Foton nuevo')] });
seccion(() => {
  const S = S2;
  poner('2026-11-11 07:58'); S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO), unidad('6409-TIG', PTF, QUIETO), unidad('5655-KSC', CLI2, QUIETO)];
  S.repaso(); pasar(1); S.repaso();                                                                     // 07:59
  const U = (ccp, tig, ksc, o1, o2) => () => [unidad('6663-CCP', ccp, o1 || ANDA), unidad('6409-TIG', tig, o2 || QUIETO), unidad('5655-KSC', ksc || CLI2, QUIETO)];
  min1(S, U(PTF, PTF, null, QUIETO));                                                                    // 08:00 en PTF
  /* CCP: sale a las 08:01, va a lo de Cliente Uno (12 min), se queda 10 min (parada CON pedido), otra parada sin pedido, y vuelve a las 10:00. */
  const ida = []; for (let i = 1; i <= 12; i++) ida.push({ la: PTF.la + (CLI.la - PTF.la) * i / 12, lo: PTF.lo + (CLI.lo - PTF.lo) * i / 12 });
  /* TIG: de PTF a Banzer en 30 minutos sin pararse (un traslado): sale a los 15 min y al llegar NO es salida. */
  const tras = []; for (let i = 1; i <= 30; i++) tras.push({ la: PTF.la + (BZ.la - PTF.la) * i / 30, lo: PTF.lo + (BZ.lo - PTF.lo) * i / 30 });
  for (let i = 0; i < 12; i++) min1(S, U(ida[i], tras[i], null, ANDA, ANDA));                            // 08:01-08:12
  for (let i = 0; i < 10; i++) min1(S, U(CLI, tras[12 + i], null, QUIETO, ANDA));                        // 08:13-08:22 en lo del cliente
  const MED = { la: -17.7700, lo: -63.1350 };
  for (let i = 0; i < 8; i++) min1(S, U(MED, tras[22 + i], null, QUIETO, ANDA));                         // 08:23-08:30 parada sin pedido; el TIG llega a Banzer
  for (let i = 0; i < 89; i++) min1(S, U({ la: -17.7650 + (i % 3) * 0.003, lo: -63.1400 }, BZ, null, ANDA, QUIETO));   // 08:31-09:59 dando vueltas
  min1(S, U(PTF, BZ, null, QUIETO));                                                                     // 10:00 vuelve a PTF
  for (let i = 0; i < 5; i++) min1(S, U(PTF, BZ, null, QUIETO));                                         // 10:05 sigue en PTF
  const d = S.dia().u, ccp = d['6663CCP'], tig = d['6409TIG'], ksc = d['5655KSC'];
  const hf = ccp.fm / 3600000;
  chk('2a el CCP salió a las 08:01 y volvió a las 10:00: ~2 h fuera de las bases (lo que hay entre la primera lectura afuera y la vuelta)', hf > 1.9 && hf < 2.05, hf.toFixed(3));
  chk('2b el KSC, que el GPS vio primero en la calle (nunca en una base hoy): 0 h fuera (no se adivina, como «salió»)', !ksc.fm, ksc.fm);
  chk('2c en la base no suma tiempo (el TIG en Banzer desde las 08:30)', tig.fm / 3600000 < 0.6, (tig.fm / 3600000).toFixed(2));
  chk('3a el CCP: 1 salida a repartir (08:03, cuando quedó a más de 700 m: la regla de «salió») y volvió a las 10:00', ccp.ns === 1 && ccp.s === '08:03' && ccp.v === '10:00', [ccp.ns, ccp.s, ccp.v]);
  chk('3b el TIG fue de PTF a Banzer sin pararse: el viaje quedó como traslado y NO es una salida', !tig.ns && tig.n >= 1 && (tig.ev || []).some(e => e[1] === 'sal' && e[3] === 'tra'), [tig.ns, tig.n, tig.ev]);
  chk('3c paradas del CCP: 2 (una al lado del pedido de hoy, otra sin pedido)', ccp.np === 2 && ccp.nc === 1, [ccp.np, ccp.nc]);
  /* GPS_PAR se poda (tope de paradas): el número del día no se pierde. */
  const PA = JSON.parse(S.P.GPS_PAR); PA.u['6663CCP'] = PA.u['6663CCP'].slice(1); S.P.GPS_PAR = JSON.stringify(PA);
  min1(S, U(PTF, BZ, null, QUIETO));
  chk('3d si GPS_PAR pierde una parada (se poda), el día sigue contando 2', S.dia().u['6663CCP'].np === 2, S.dia().u['6663CCP'].np);
  chk('3e lo de antes sigue igual: «salió 08:03» y «volvió 10:00» en la lectura del panel', (() => { const L = S.post({ action: 'list' }), x = L.gps.u.filter(x => x.p === '6663CCP')[0]; return x.s === '08:03' && x.vu === '10:00'; })());
});

// ══ 4. La hoja: una fila por día y camión ═════════════════════════════════
console.log('\n── 4. 📚 La hoja «Historial GPS»: a las 21 h, una fila por día y camión; el mismo día se reemplaza ──');
seccion(() => {
  const S = S2;
  chk('4a durante el día la hoja todavía no existe', !S.hist());
  poner('2026-11-11 20:59'); S.gps.unidades = [unidad('6663-CCP', PTF, QUIETO), unidad('6409-TIG', BZ, QUIETO), unidad('5655-KSC', CLI2, QUIETO)]; S.repaso();
  const n0 = S.gps.llamadas.length;
  poner('2026-11-11 21:00'); const r = S.repaso();
  chk('4b a las 21:00 (fuera de horario) escribe el día, sin pedirle nada a la plataforma', r.error === 'fuera de horario' && r.hist === 3 && S.gps.llamadas.length === n0, r);
  let F = filasHist(S);
  const h = S.hist() || hacerPlanilla([[]]);   // (contra un .gs sin esto, la hoja no existe: que la prueba lo diga en rojo, sin caerse)
  chk('4c el encabezado de la hoja', JSON.stringify(h._datos[0]) === JSON.stringify(['fecha', 'camión', 'placa', 'primera salida', 'última vuelta', 'horas fuera', 'salidas', 'paradas', 'paradas en un pedido', 'km', 'actualizado']), h._datos[0]);
  chk('4d fecha, camión, placa y las dos horas van como TEXTO (si no, Google las vuelve fechas)', h._formatos.indexOf('A:E=@') >= 0 && h._formatos.indexOf('K:K=@') >= 0, h._formatos);
  const fc = F.filter(x => x.p === '6663CCP')[0] || {};
  chk('4e tres filas del 11/11 (una por placa): Foton nuevo, Carry, Foton encarpado', F.length === 3 && F.every(x => x.f === '2026-11-11') && F.map(x => x.cam).sort().join('|') === 'Carry|Foton encarpado|Foton nuevo', F.map(x => x.f + ' ' + x.cam + ' ' + x.p));
  chk('4f la del Foton nuevo: salió 08:03, volvió 10:00, ~2 h fuera, 1 salida, 2 paradas (1 en un pedido) y los km en número', fc.s === '08:03' && fc.v === '10:00' && fc.hf > 1.9 && fc.hf < 2.05 && fc.n === 1 && fc.par === 2 && fc.pc === 1 && typeof fc.km === 'number' && fc.km > 3, fc);
  const esc0 = h._escrituras;
  for (let i = 0; i < 5; i++) { pasar(1); S.repaso(); }
  chk('4g a las 21:01-21:05 no vuelve a escribir (el día ya está: GPS_DIA con `h`)', h._escrituras === esc0 && S.dia().h === 1 && filasHist(S).length === 3, [h._escrituras, esc0]);
  /* Volver a escribir el mismo día reemplaza: no duplica. */
  const st = S.dia(); st.u['6663CCP'].km = 99999; delete st.h; S.P.GPS_DIA = JSON.stringify(st);
  pasar(1); S.repaso();
  F = filasHist(S);
  chk('4h volver a escribir el 11/11 REEMPLAZA su fila (sigue habiendo 3, con los km nuevos)', F.length === 3 && F.filter(x => x.p === '6663CCP')[0].km === 100, F.map(x => x.p + ':' + x.km));
  /* El 12/11 el disparador de las 21 h no corre: el día va en el primer repaso del 13/11, antes de empezar el nuevo. */
  poner('2026-11-12 08:00'); arrancar(S, () => [unidad('6663-CCP', PTF, QUIETO)]);
  chk('4i el primer repaso del 12/11 no reescribe el 11/11 (ya estaba)', filasHist(S).length === 3 && S.dia().f === '2026-11-12', filasHist(S).length);
  for (let i = 0; i < 3; i++) min1(S, () => [unidad('6663-CCP', { la: PTF.la - 0.01 * (i + 1), lo: PTF.lo }, ANDA)]);
  poner('2026-11-13 06:00'); const r2 = arrancar(S, () => [unidad('6663-CCP', PTF, QUIETO)]);
  F = filasHist(S);
  chk('4j sin el cierre de las 21 h, el 12/11 va en el primer repaso del 13/11 (y GPS_DIA empieza el 13)', F.filter(x => x.f === '2026-11-12').length === 1 && S.dia().f === '2026-11-13' && r2.hist === 1, [F.map(x => x.f + ' ' + x.p), r2]);
  const k12 = F.filter(x => x.f === '2026-11-12')[0];
  chk('4k …con sus km (3 tramos de ~1,1 km) y sin salida (no estuvo 15 min lejos)', k12 && k12.km > 3 && k12.km < 3.6 && k12.n === 0, k12);
  chk('4l en total: 4 filas, ninguna repetida', F.length === 4 && new Set(F.map(x => x.f + '|' + x.p)).size === 4, F.length);
  /* Lo de más de dos años se borra solo al escribir. */
  h._datos.splice(1, 0, ['2024-10-01', 'Carry', '6409TIG', '08:00', '17:00', 5, 1, 3, 1, 40, '2024-10-01T21:00:00.000Z']);
  const st2 = S.dia(); delete st2.h; S.P.GPS_DIA = JSON.stringify(st2);
  poner('2026-11-13 21:00'); S.gps.unidades = []; S.repaso();
  F = filasHist(S);
  chk('4m una fila de hace más de 2 años se borra sola al escribir', !F.some(x => x.f === '2024-10-01') && F.some(x => x.f === '2026-11-13'), F.map(x => x.f));
});

// ══ 5. gpsHist ═════════════════════════════════════════════════════════════
console.log('\n── 5. 📖 `gpsHist` {desde, hasta}: sin candado, la más nueva de cada día y placa, y el día en curso ──');
seccion(() => {
  const S = S2;
  /* Una fila repetida (dos repasos a la vez, o alguien la copió): manda la escrita después. */
  (S.hist() || hacerPlanilla([[]]))._datos.push(['2026-11-11', 'Foton nuevo', '6663CCP', '07:00', '', 0, 0, 0, 0, 1, '2026-11-11T20:00:00.000Z']);
  const c0 = S.candado.n;
  let r = S.post({ action: 'gpsHist', desde: '2026-11-01', hasta: '2026-11-30' });
  chk('5a contesta ok con la versión, sin tomar el candado', r.ok === true && r.version === S.ctx.SCRIPT_VERSION && S.candado.n === c0, [r.ok, r.version, S.candado.n - c0]);
  const k = r.filas.map(x => x.f + '|' + x.p);
  chk('5b una fila por día y placa, ordenadas por día', JSON.stringify(k) === JSON.stringify(k.slice().sort()) && new Set(k).size === k.length && k.length === 5, k);
  const f11 = r.filas.filter(x => x.f === '2026-11-11' && x.p === '6663CCP')[0];
  chk('5c de dos filas del mismo día y placa, la escrita después (la de 08:03, no la vieja de 07:00)', f11 && f11.s === '08:03' && f11.km === 100, f11);
  chk('5d trae solo números y horas: ni clientes, ni pedidos, ni posiciones', r.filas.every(x => Object.keys(x).every(c => /^(f|cam|p|s|v|hf|n|par|pc|km|c)$/.test(c))) && !/Cliente|p1|-17\./.test(JSON.stringify(r)), Object.keys(r.filas[0]));
  r = S.post({ action: 'gpsHist', desde: '2026-11-12', hasta: '2026-11-12' });
  chk('5e desde/hasta recortan los días', r.filas.length === 1 && r.filas[0].f === '2026-11-12', r.filas.map(x => x.f));
  /* El día en curso, desde GPS_DIA, mientras no está en la hoja. */
  poner('2026-11-14 09:00'); arrancar(S, () => [unidad('6663-CCP', PTF, QUIETO)]);
  for (let i = 0; i < 3; i++) min1(S, () => [unidad('6663-CCP', { la: PTF.la - 0.01 * (i + 1), lo: PTF.lo }, ANDA)]);
  r = S.post({ action: 'gpsHist', desde: '2026-11-14', hasta: '2026-11-14' });
  chk('5f el día en curso viene de GPS_DIA con `c:1` (todavía no está en la hoja)', !!r.filas && r.filas.length === 1 && r.filas[0].c === 1 && r.filas[0].km > 3 && !(S.hist() || { _datos: [] })._datos.some(x => x[0] === '2026-11-14'), r.filas);
  /* Sin las propiedades del GPS: nada. */
  const V = servidor({});
  poner('2026-11-11 21:00'); V.repaso();
  const rv = V.post({ action: 'gpsHist', desde: '2026-11-01', hasta: '2026-11-30' });
  chk('5g sin GPS_APIKEY / GPS_USUARIO / GPS_CLAVE no se arma la hoja y `gpsHist` contesta vacío (gps:0)', !V.hist() && rv.ok && rv.filas.length === 0 && rv.gps === 0, rv);
});

// ══ 6. probarAntesDeImplementar ════════════════════════════════════════════
console.log('\n── 6. ✅ probarAntesDeImplementar ──');
seccion(() => {
  const V = servidor(SECRETO);
  let L = V.ctx.probarAntesDeImplementar().lineas.join('\n');
  chk('6a sin la hoja: «todavía no existe: se arma sola a las 21 h…»', /La hoja «Historial GPS» todavía no existe: se arma sola a las 21 h/.test(L), L.split('\n').filter(l => /Historial GPS/.test(l)));
  L = S2.ctx.probarAntesDeImplementar();
  const linea = L.lineas.filter(l => /Historial GPS/.test(l)).join(' ');
  chk('6b con la hoja: cuántas filas y de cuántos días (sin datos de clientes)', /✅ La hoja «Historial GPS» tiene 6 fila\(s\) de 3 día\(s\), del 2026-11-11 al 2026-11-13/.test(linea) && !/Cliente/.test(linea), linea);
  chk('6c las funciones nuevas están en la lista de «el código está entero»', /El código está entero/.test(L.lineas.join('\n')) && ['gpsHistPaso_', 'gpsHistGuardar_', 'gpsHistCierre_', 'gpsHistLeer_'].every(n => typeof S2.ctx[n] === 'function'));
  chk('6d la versión sigue siendo la 2026-11-13-b (lo del GPS va en la misma)', S2.ctx.SCRIPT_VERSION === '2026-11-13-b', S2.ctx.SCRIPT_VERSION);
});

// ══ 7-12. La página ════════════════════════════════════════════════════════
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_gps_dia'); localStorage.removeItem('me_ec_vista'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  loadFromServer=function(){};
  apiSave=function(rec){ var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._posts=[]; window._gpsResp=null;
  apiPost=function(b){ window._posts.push(JSON.parse(JSON.stringify(b)));
    if(b.action==='gpsHist'){ var R=window._gpsResp ? window._gpsResp(b) : { ok:true, filas:[] }; return (R && R.then) ? R : Promise.resolve(R); }
    return Promise.resolve({ ok:true }); };
  var ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); }, n=0;
  var C1={ desc:'COLCHON TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' };
  window._P=function(id, o){ n++; return Object.assign({ id:id, oc:'11-'+(700+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:'2026-11-03', turno:'AM', vendedor:'Mirian Salazar',
    vehiculo:'', chofer:'', zona:'Zona '+id.toUpperCase(), direccion:'Calle '+n, observaciones:'', estado:'', productos:[Object.assign({}, C1)],
    saldo:0, pagado:true, entregado:false, maps:'', ts:ts('2026-11-02'), fotos:[], rev:1, nroDia:n }, o||{}); };
  window._armar=function(){
    n=0;
    STATE=[
      _P('e1',  { vehiculo:'Carry', chofer:'Omar', entregado:true }),                                          // 03/11
      _P('e2',  { fecha:'2026-11-04', vehiculo:'Carry', chofer:'Ysrael' }),                                    // 04/11
      _P('e3',  { fecha:'2026-11-05', vehiculo:'Foton nuevo', chofer:'Luis Pierre', entregado:true }),        // 05/11
      _P('e4',  { fecha:'2026-11-09', vehiculo:'Carry', chofer:'Omar' }),                                      // 09/11 (el GPS no lo vio salir)
      _P('e5',  { fecha:'2026-11-13', vehiculo:'Carry', chofer:'Omar', entregado:true }),                      // hoy, con ✅
      _P('e6',  { fecha:'2026-11-06' }),                                                                         // sin camión
      _P('o1',  { fecha:'2026-10-20', vehiculo:'Carry', chofer:'Omar', ts:ts('2026-10-15') })                  // octubre
    ];
    saveMirror();
  };
  /* Lo que contesta el servidor: el Carry tres días que salió (uno de hoy, en curso) y uno que quedó en la base; el Foton nuevo uno; una
     placa que no es ningún camión del panel. Octubre: nada. */
  window._GPS_NOV=[
    { f:'2026-11-03', cam:'Carry', p:'6409TIG', s:'08:10', v:'17:00', hf:5.5, n:1, par:6, pc:4, km:42.5 },
    { f:'2026-11-04', cam:'Carry', p:'6409TIG', s:'08:40', v:'16:10', hf:4, n:2, par:5, pc:3, km:30 },
    { f:'2026-11-05', cam:'Carry', p:'6409TIG', s:'', v:'', hf:0, n:0, par:0, pc:0, km:0.3 },
    { f:'2026-11-05', cam:'Foton nuevo', p:'6663CCP', s:'07:55', v:'15:00', hf:3, n:1, par:4, pc:2, km:20 },
    { f:'2026-11-05', cam:'', p:'XYZ999', s:'09:00', v:'', hf:1, n:1, par:1, pc:0, km:5 },
    { f:'2026-11-13', cam:'Carry', p:'6409TIG', s:'09:05', v:'', hf:2.25, n:1, par:2, pc:1, km:12.2, c:1 } ];
  window._gpsNormal=function(b){ return { ok:true, filas: b.desde==='2026-11-01' ? JSON.parse(JSON.stringify(window._GPS_NOV)) : [] }; };
  window._abrir=function(){ EC.ym=''; EC.vista=''; abrirEntregasCamion(); };
  window._espera=function(ms){ return new Promise(function(x){ setTimeout(x, ms||30); }); };
  window._tabla=function(){
    var t=document.querySelector('#ec-body .ec-tabla table'); if(!t) return null;
    var cols=[].map.call(t.querySelectorAll('thead th'), function(th){ return th.textContent.trim(); });
    var filas=[].map.call(t.querySelectorAll('tbody tr, tfoot tr'), function(tr){
      return [].map.call(tr.children, function(td, i){ if(i===0) return td.innerText.replace(/\\s+/g,' ').trim(); var b=td.querySelector('.ec-c b'); if(b) return Number(b.textContent);
        var g=td.classList.contains('ec-g') ? td : null; return g ? g.innerText.replace(/\\s+/g,' ').trim() : 0; });
    });
    return { cols:cols, filas:filas };
  };
  window._gpsPosts=function(){ return window._posts.filter(function(p){ return p.action==='gpsHist'; }).map(function(p){ return p.desde+'..'+p.hasta; }); };
  window._linea=function(){ var l=document.getElementById('ec-gps-nota'); return l ? l.textContent : ''; };
`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const nueva = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w || 1300, height: h || 950 }, timezoneId: 'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-13T15:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    return page;
  };
  let page = await nueva();

  console.log('\n── 7. Sin el servidor nuevo: ni columnas ni pedido ──');
  let r = await page.evaluate(async (base) => {
    eval(base); _armar(); SERVER_VER='2026-11-13-a'; window._gpsResp=_gpsNormal;
    _abrir(); await _espera(60);
    var T=_tabla(), o={ cols:T.cols, posts:_gpsPosts(), linea:_linea(), gCeldas:document.querySelectorAll('#ec-body .ec-g').length };
    SERVER_VER=''; ecCerrar(); _abrir(); await _espera(30);
    o.posts2=_gpsPosts(); o.linea2=_linea();
    return o;
  }, BASE);
  chk('7a con el servidor 13-a la tabla es la de siempre (termina en TOTAL), sin celdas del GPS', r.cols[r.cols.length - 1] === 'TOTAL' && r.gCeldas === 0, r.cols);
  chk('7b no le pide `gpsHist` (caería en el guardado del servidor viejo)', r.posts.length === 0 && r.posts2.length === 0, r.posts);
  chk('7c una línea chica: «Lo del GPS aparece desde que se instale el servidor nuevo» (también sin saber la versión)', /aparece desde que se instale el servidor nuevo/.test(r.linea) && /servidor nuevo/.test(r.linea2), [r.linea, r.linea2]);

  console.log('\n── 8. Con el 13-b: una vez al abrir, columnas al final por camión ──');
  r = await page.evaluate(async () => {
    window._posts=[]; SERVER_VER='2026-11-13-b'; window._gpsResp=_gpsNormal;
    ecCerrar(); _abrir();
    var cargando=_linea();
    await _espera(60);
    var T=_tabla(), fila=function(nom){ return T.filas.filter(function(f){ return f[0].indexOf(nom)===0; })[0]; };
    var D=EC.D, F=ecFilasPorCamion(D), carryF=F.filter(function(f){ return f.t==='Carry'; })[0];
    return { cargando:cargando, posts:_gpsPosts(), cols:T.cols, carry:fila('Carry'), nuevo:fila('Foton nuevo'), encarpado:fila('Foton encarpado'), sin:fila('Sin camión anotado'),
      tot:T.filas[T.filas.length-1], linea:_linea(), gps:carryF && carryF.gps, totIdx:T.cols.indexOf('TOTAL') };
  });
  chk('8a al abrir pide `gpsHist` del mes UNA vez (del 01 al 31) y mientras llega dice «Leyendo lo del GPS…»', r.posts.join() === '2026-11-01..2026-11-31' && /Leyendo lo del GPS/.test(r.cargando), [r.posts, r.cargando]);
  chk('8b las columnas del GPS van AL FINAL, después de TOTAL', JSON.stringify(r.cols.slice(r.totIdx)) === JSON.stringify(['TOTAL', '🛰️ Días con GPS', 'Sale (promedio)', 'Horas fuera', 'Km', 'Paradas', 'Entregas por día con GPS']), r.cols);
  const g0 = r.totIdx + 1, cr = r.carry || [];
  chk('8c Carry: 3 días con GPS (el 05/11 quedó en la base y no cuenta), sale 08:38 en promedio (y la más tarde 09:05 del 13/11)',
      cr[g0] === '3' && /^08:38 la más tarde 09:05 \(13\/11\)$/.test(cr[g0 + 1]), cr.slice(g0));
  chk('8d Carry: 11,8 h fuera, 85 km, 13 paradas (8 en un pedido) — la suma del mes', cr[g0 + 2] === '11,8 h' && cr[g0 + 3] === '85 km' && cr[g0 + 4] === '13 8 en un pedido', cr.slice(g0));
  chk('8e Carry: 1,0 entregas por día con GPS (03, 04 y hoy: 3 en 3 días; la del 09/11 no tiene GPS)', cr[g0 + 5] === '1,0 3 en 3 días' && r.gps && r.gps.ent === 3 && r.gps.dias === 3 && r.carry[r.totIdx] === 4, [cr[g0 + 5], r.gps]);
  chk('8f Foton nuevo: 1 día, 07:55 (con un solo día no repite «la más tarde»), 3 h, 20 km, 1,0 por día; Foton encarpado sin GPS: «·»; «Sin camión anotado»: «·»',
      r.nuevo[g0] === '1' && r.nuevo[g0 + 1] === '07:55' && r.nuevo[g0 + 2] === '3 h' && r.nuevo[g0 + 3] === '20 km' && /^1,0/.test(r.nuevo[g0 + 5]) &&
      r.encarpado.slice(g0).every(x => x === '·') && r.sin.slice(g0).every(x => x === '·'), [r.nuevo.slice(g0), r.encarpado.slice(g0), r.sin.slice(g0)]);
  chk('8g TOTAL: horas, km y paradas sumadas (la placa que no es del panel no entra)', r.tot[g0] === '·' && r.tot[g0 + 2] === '14,8 h' && r.tot[g0 + 3] === '105 km' && r.tot[g0 + 4] === '17 10 en un pedido', r.tot.slice(g0));
  chk('8h la línea explica las columnas y dice que incluye hoy, hasta ahora', /Al final de cada camión, lo del GPS/.test(r.linea) && /Incluye hoy, hasta ahora/.test(r.linea), r.linea);
  chk('8i las entregas (las columnas de siempre) no cambian: Carry 4, TOTAL 6', r.carry[r.totIdx] === 4 && r.tot[r.totIdx] === 6, [r.carry[r.totIdx], r.tot[r.totIdx]]);

  console.log('\n── 9. Una vez por mes: cambiar de mes, de vista, volver ──');
  r = await page.evaluate(async () => {
    window._posts=[];
    ecMes(-1); await _espera(60);
    var oct={ posts:_gpsPosts().slice(), linea:_linea(), cols:_tabla().cols, ym:EC.ym };
    ecMes(1); await _espera(40);
    var vuelta=_gpsPosts().slice();
    ecVista('chofer'); await _espera(30);
    var chofer={ cols:_tabla().cols, linea:_linea(), g:document.querySelectorAll('#ec-body .ec-g').length };
    ecVista('camion'); await _espera(30);
    var posts=_gpsPosts().slice();
    ecCerrar(); _abrir(); await _espera(60);
    return { oct:oct, vuelta:vuelta, chofer:chofer, posts:posts, reabre:_gpsPosts().slice(), colsFin:_tabla().cols.length };
  });
  chk('9a ‹ octubre: pide octubre UNA vez; sin filas: «Sin datos del GPS en este mes» y sin columnas',
      r.oct.posts.join() === '2026-10-01..2026-10-31' && /Sin datos del GPS en este mes/.test(r.oct.linea) && r.oct.cols[r.oct.cols.length - 1] === 'TOTAL', r.oct);
  chk('9b › volver a noviembre no lo vuelve a pedir (ya lo tiene en esta apertura)', r.vuelta.join() === '2026-10-01..2026-10-31', r.vuelta);
  chk('9c «Por chofer»: sin columnas ni línea del GPS (el GPS es del camión); volver a «Por camión» tampoco pide', r.chofer.cols[r.chofer.cols.length - 1] === 'TOTAL' && r.chofer.g === 0 && !r.chofer.linea && r.posts.length === 1, r.chofer);
  chk('9d cerrar y abrir de nuevo: lo pide otra vez (una por apertura)', r.reabre.length === 2 && r.reabre[1] === '2026-11-01..2026-11-31' && r.colsFin > 7, r.reabre);

  console.log('\n── 10. Si no llega ──');
  r = await page.evaluate(async () => {
    window._gpsResp=function(){ return Promise.reject(new Error('sin red')); };
    ecCerrar(); _abrir(); await _espera(60);
    var o={ linea:_linea(), cols:_tabla().cols };
    window._gpsResp=function(){ return { ok:false, error:'clave' }; };
    ecCerrar(); _abrir(); await _espera(60);
    o.linea2=_linea(); o.cols2=_tabla().cols;
    window._gpsResp=function(){ return { ok:true, filas:[{ f:'2026-11-05', cam:'', p:'XYZ999', s:'09:00', hf:1, n:1, par:1, pc:0, km:5 }] }; };
    ecCerrar(); _abrir(); await _espera(60);
    o.linea3=_linea(); o.cols3=_tabla().cols;
    window._gpsResp=_gpsNormal;
    return o;
  });
  chk('10a sin red: «No pude leer lo del GPS ahora…» y la tabla de siempre', /No pude leer lo del GPS ahora/.test(r.linea) && r.cols[r.cols.length - 1] === 'TOTAL', r);
  chk('10b el servidor dice que no (ok:false): lo mismo', /No pude leer lo del GPS ahora/.test(r.linea2) && r.cols2[r.cols2.length - 1] === 'TOTAL', r.linea2);
  chk('10c solo una placa que no es ningún camión del panel: «Sin datos del GPS en este mes»', /Sin datos del GPS en este mes/.test(r.linea3) && r.cols3[r.cols3.length - 1] === 'TOTAL', r.linea3);

  console.log('\n── 11. 📋 Copiar y ⬇️ Excel ──');
  r = await page.evaluate(async () => {
    ecCerrar(); _abrir(); await _espera(60);
    var copiado=''; var _ct=copyText; copyText=function(t){ copiado=t; };
    ecCopiar(); copyText=_ct;
    var hojas=null, real=buildXlsx, bytes=0;
    buildXlsx=function(sh){ hojas=JSON.parse(JSON.stringify(sh)); var b=real(sh); bytes=b.length; return b; };
    var _db=downloadBlob; downloadBlob=function(){};
    ecBajar(); buildXlsx=real; downloadBlob=_db;
    var v=function(c){ return (c && typeof c==='object') ? c.v : c; };
    var h1=hojas[0], h2=hojas[1];
    var cab=h1.matrix.filter(function(r){ return v(r[0])==='Camión'; })[0];
    var carry=h1.matrix.filter(function(r){ return v(r[0])==='Carry'; });
    var tot=h1.matrix.filter(function(r){ return v(r[0])==='TOTAL'; })[0];
    var cab2=h2.matrix.filter(function(r){ return v(r[0])==='Chofer'; })[0];
    return { copiado:copiado, cab:(cab||[]).map(v), carry1:(carry[0]||[]).map(function(c){ return c && typeof c==='object' ? { v:c.v, t:c.t } : c; }), carry2Len:(carry[1]||[]).length,
      tot:(tot||[]).map(v), cab2:(cab2||[]).map(v), anchos:h1.cols.length, bytes:bytes };
  });
  chk('11a «📋 Copiar»: debajo del Carry, la línea del GPS', /• Carry: \*4\* \(4 u\.\)[\s\S]*?🛰️ GPS: 3 días · sale 08:38 \(la más tarde 09:05\) · 11,8 h fuera · 85 km · 13 paradas \(8 en un pedido\) · 1,0 entregas por día/.test(r.copiado), r.copiado);
  chk('11b …el Foton nuevo (un día) sin «la más tarde»; nada en «Por chofer» ni en el Foton encarpado (sin GPS)', /🛰️ GPS: 1 día · sale 07:55 · 3 h fuera/.test(r.copiado) &&
      !/\*Por chofer\*[\s\S]*🛰️/.test(r.copiado) && !/Foton encarpado/.test(r.copiado.split('*Por chofer*')[0]), r.copiado);
  const iT = r.cab.indexOf('TOTAL');
  chk('11c Excel «Por camión»: las columnas del GPS al final del bloque de entregas',
      JSON.stringify(r.cab.slice(iT)) === JSON.stringify(['TOTAL', 'DÍAS CON GPS', 'SALE (PROMEDIO)', 'SALE (LA MÁS TARDE)', 'HORAS FUERA', 'KM', 'PARADAS', 'PARADAS EN UN PEDIDO', 'ENTREGAS POR DÍA CON GPS']) && r.anchos === r.cab.length, r.cab);
  const c1 = r.carry1.slice(iT + 1).concat([{}, {}, {}, {}, {}, {}, {}, {}]).map(c => c == null ? {} : c);
  chk('11d el Carry en el Excel: números como número (3 días, 11,8 h, 85 km, 13 y 8 paradas, 1 por día) y las horas como texto',
      c1[0].v === 3 && c1[0].t === 'n' && c1[1] === '08:38' && c1[2] === '09:05 (13/11)' && c1[3].v === 11.8 && c1[4].v === 85 && c1[5].v === 13 && c1[6].v === 8 && c1[7].v === 1 && c1[7].t === 'n', c1);
  chk('11e el TOTAL con las sumas; el bloque de unidades y la hoja «Por chofer» sin el GPS',
      r.tot[iT + 4] === 14.8 && r.tot[iT + 5] === 105 && r.tot[iT + 6] === 17 && r.carry2Len === iT + 1 && r.cab2.indexOf('DÍAS CON GPS') < 0 && r.bytes > 500, [r.tot.slice(iT), r.carry2Len, r.cab2]);
  await page.close();

  console.log('\n── 12. En 390 px ──');
  page = await nueva(390, 844);
  r = await page.evaluate(async (base) => {
    eval(base); _armar(); SERVER_VER='2026-11-13-b'; window._gpsResp=_gpsNormal; _abrir(); await _espera(80);
    var b=document.getElementById('ec-body'), tb=document.querySelector('#ec-body .ec-tabla');
    return { g:document.querySelectorAll('#ec-body .ec-g').length, doc:document.documentElement.scrollWidth, vw:innerWidth, body:b.scrollWidth, bodyW:b.clientWidth, tabla:tb && tb.scrollWidth>tb.clientWidth,
      ov:document.getElementById('ec-overlay').scrollWidth, ovW:document.getElementById('ec-overlay').clientWidth };
  }, BASE);
  chk('12 con las columnas del GPS, en 390 px no hay scroll de costado (la tabla se desliza adentro de su caja)', r.g > 0 && r.doc <= r.vw && r.body <= r.bodyW && r.ov <= r.ovW && r.tabla, r);
  await page.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
