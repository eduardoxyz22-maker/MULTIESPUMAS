/* 💵 EL EFECTIVO SIN RETIRAR, AL DUEÑO (06/11, servidor 2026-11-06-b) Y LO DE LOS CHOFERES A CONTABILIDAD (2026-11-06-c: dueño, *«el dinero
   que reciben los choferes el mensaje debería llegar a contabilidad… no a eduardo»*). 📅 2026-11-06-d: el aviso es el resumen de CADA DÍA
   (dueño: *«cada día… cuánto efectivo ingresó y cuánto no se marcó como recogido… cuánto hay acumulado»*): `efectivo_del_dia`, 5 datos. El dueño: *«avisar retiros de efectivo pendientes o sin cargar
   luego de 48 horas (aplica desde noviembre) y que llegue a mi telf»*; eligió «dos veces, 9:00 y 18:00».
     1. La regla (`waEfePendiente_`): lo cobrado en efectivo (adelanto, cobros, recargo cobrado) queda en la mano de quien lo recibió (el
        chofer con «>Nombre», si no la vendedora); cada retiro cubre lo de ESA persona cobrado hasta su día, primero el del mismo monto y
        después del más viejo; lo que sobra no tapa lo de después; se avisa lo cobrado desde el 01/11 y de hace 2 días o más. Afuera: QR,
        Eduardo, ROHO, internos, ATC, RPT, borradores, filas del sistema.
     2. La lectura de los pagos es la de la página: para los mismos pedidos, `waEfePagos_` (.gs) = `contaPagos` (página) en efectivo, y
        `WA_EFE_FUERA` = `CONTA_EXCLUIR`.
     3. El envío: a las 9:00 y a las 18:00 `efectivo_sin_retirar` al dueño (WA_DUENO) con 4 datos; una vez por turno; no el domingo; sin
        WA_DUENO nada; sin nada pendiente nada; un retiro cargado antes del envío lo saca.
     4. La plantilla está en WA_PLANTILLAS con sus 4 datos y el ejemplo.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia.
   Se corre:  node tests/test_wa_efectivo.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };

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
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', WA_DUENO: 'Eduardo:59177000007' };
const ONC = Object.assign({}, ON, { WA_CONTABILIDAD: 'Contabilidad:59177000008' });   // 🚚 (06-c) lo de los choferes

/* ── Los pedidos ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const V = (id, vend, mp, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + id.toUpperCase(), fecha: '2026-11-10', turno: 'AM',
  celular: '70000000', zona: 'Norte', direccion: 'Calle 1', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, precio: 3000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: mp, estado: '', entregado: false, vehiculo: '', chofer: '', nota: '9' + id.replace(/\D/g, ''),
  ts: TS('2026-11-02'), fotos: [], rev: 1 }, o || {});
const R = (id, entrega, monto, dia, notas) => ({ id: '__ret_' + id + '__', oc: '', vendedor: entrega, chofer: 'Eduardo Añez', cliente: '💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR',
  fecha: '', turno: '', zona: 'FACTURADO', direccion: 'Retiro', productos: [], saldo: 0, acuenta: monto, pagado: false, metodoPago: '', estado: '', entregado: false,
  nota: notas || '', ts: TS(dia, '12:00'), fotos: [], rev: 1 });
const FIX = [
  // Mirian: dos cobros, cada uno con su retiro del mismo monto → nada
  V('m1', 'Mirian Salazar', '~Efectivo 5440 @2026-10-30 #1971'), V('m2', 'Mirian Salazar', '~Efectivo 2140 @2026-11-03 #1980'),
  R('m1', 'Mirian Salazar', 5440, '2026-11-03', '2709'), R('m2', 'Mirian Salazar', 2140, '2026-11-03', '2708'),
  // Maria: 3.410 del 03/11 sin retiro → avisa
  V('f1', 'Maria Flores', '~Efectivo 3410 @2026-11-03 #1938 %IMG1'),
  // Mauricio: dos cobros sin retiro → 3.290 en 2 cobros
  V('u1', 'Mauricio Merida', '~Efectivo 700 @2026-11-03 #2340'), V('u2', 'Mauricio Merida', '~Efectivo 2590 @2026-11-04 #2343'),
  // Luis Pierre (chofer) cobró en la puerta una venta de Fernando → es de Luis, no de Fernando
  V('p1', 'Fernando Peinado', '~QR Ganadero 1000 @2026-11-01 #2463 + Efectivo 1860 @2026-11-04 #2464 >Luis Pierre %IMG2'),
  // Juan Pablo: 5.000 de octubre sin retirar + 900 del 03/11; el retiro de 5.000 del 05/11 es el de octubre → avisa 900
  V('j1', 'Juan Pablo Paredes', '~Efectivo 5000 @2026-10-20 #2370', { ts: TS('2026-10-20') }), V('j2', 'Juan Pablo Paredes', '~Efectivo 900 @2026-11-03 #2384'),
  R('j1', 'Juan Pablo Paredes', 5000, '2026-11-05', '429'),
  // Isabel: 1.000 + 500, retiro de 1.200 → quedan 300 del 03/11
  V('i1', 'Isabel Robledo', '~Efectivo 1000 @2026-11-02 #7001'), V('i2', 'Isabel Robledo', '~Efectivo 500 @2026-11-03 #7002'), R('i1', 'Isabel Robledo', 1200, '2026-11-04', '1'),
  // Carola: el retiro es de ANTES del cobro → no lo cubre
  R('c1', 'Carola Chavez', 900, '2026-11-01', '2'), V('c1', 'Carola Chavez', '~Efectivo 900 @2026-11-02 #8001'),
  // Jonathan: adelanto «suelto» (A cuenta 800 + «Efectivo %IMG», del día de la venta) y un recargo cobrado en efectivo
  V('o1', 'Jonathan Monje', 'Efectivo %IMG3', { acuenta: 800, saldo: 2200, ts: TS('2026-11-02') }), V('o2', 'Jonathan Monje', '^Efectivo 50 @2026-11-03 #9100 + ^ 40'),
  // Andrea: cobrado AYER (05/11) → todavía no
  V('a1', 'Andrea Orias', '~Efectivo 1500 @2026-11-05 #3001'),
  // Lo que no cuenta
  V('x1', 'Maria Flores', '~QR BISA 4000 @2026-11-02 #1939'),                       // QR
  V('x2', 'Eduardo Añez', '~Efectivo 9000 @2026-11-02 #1'),                         // Eduardo
  V('x3', 'ROHO', '~Efectivo 9000 @2026-11-02 #2'),                                 // ROHO
  V('x4', 'ALBA', '~Efectivo 9000 @2026-11-02 #3'),                                 // interno
  V('x5', 'Maria Flores', '~Efectivo 9000 @2026-11-02 #4', { oc: 'ATC 11-001' }),   // ATC
  V('x6', 'Maria Flores', '~Efectivo 9000 @2026-11-02 #5', { oc: 'RPT 11-001' }),   // RPT
  V('x7', 'Maria Flores', '~Efectivo 9000 @2026-11-02 #6', { estado: 'Borrador Kommo', id: 'kommo-77' }),
  V('x8', 'Fabián Godoy', '~Efectivo 9000 @2026-10-25 #7', { ts: TS('2026-10-25') }),   // de octubre: no se avisa
  // Mauricio: un cobro de octubre SIN retiro y un retiro de noviembre del mismo monto: se lo lleva ese (no lo de noviembre)
  V('k1', 'Mauricio Merida', '~Efectivo 400 @2026-10-28 #2330', { ts: TS('2026-10-28') }), R('k1', 'Mauricio Merida', 400, '2026-11-04', '3'),
  // (revisión de Fable) Cobros SIN @fecha: el adelanto escrito y un cobro suelto. No son de ningún día, ni en la página ni acá (2a los compara)
  V('q1', 'Maria Flores', '~Efectivo 500 #1'), V('q2', 'Maria Flores', '~QR BISA 100 @2026-11-02 #1 + Efectivo 300 #2'),
  // (revisión de Fable) El mismo vendedor escrito distinto (de octubre: no cambian lo que se avisa; 2c mira que se junten igual que en la página)
  V('q3', 'JONATHAN  MONJE', '~Efectivo 100 @2026-10-15 #3', { ts: TS('2026-10-15') }), V('q4', 'Fabian Godoy', '~Efectivo 50 @2026-10-16 #4', { ts: TS('2026-10-16') }),
  // (06-e, dueño: «desde noviembre… lo de octubre ya se recogió») Una venta CARGADA en octubre con el pago anotado en noviembre (como la 10-382): no se avisa
  V('w1', 'Isabel Robledo', '~Efectivo 777 @2026-11-03 #7099', { ts: TS('2026-10-30'), fecha: '2026-10-31' })
];

(async () => {
  console.log('\n── 1. La regla ──');
  let S = servidor(ON);
  S.cargar(FIX);
  const E = S.ctx.waEfePendiente_(S.lista(), '2026-11-06');
  const de = (n) => E.find(o => o.nombre === n) || null;
  chk('1a Mirian: cada cobro tiene su retiro del mismo monto → nada', !de('Mirian Salazar'), de('Mirian Salazar'));
  chk('1b Maria: 3.410 del 03/11 sin retiro', de('Maria Flores') && de('Maria Flores').bs === 3410 && de('Maria Flores').desde === '2026-11-03' && de('Maria Flores').n === 1, de('Maria Flores'));
  chk('1c Mauricio: 3.290 en 2 cobros desde el 03/11', de('Mauricio Merida') && de('Mauricio Merida').bs === 3290 && de('Mauricio Merida').n === 2, de('Mauricio Merida'));
  chk('1d el cobro del chofer es de Luis Pierre, no de Fernando (y el QR no cuenta)', de('Luis Pierre') && de('Luis Pierre').bs === 1860 && !de('Fernando Peinado'), [de('Luis Pierre'), de('Fernando Peinado')]);
  chk('1e Juan Pablo: el retiro de 5.000 es el de octubre (mismo monto) → avisa los 900 de noviembre', de('Juan Pablo Paredes') && de('Juan Pablo Paredes').bs === 900, de('Juan Pablo Paredes'));
  chk('1f Isabel: un retiro de 1.200 cubre 1.000 + 200 (del más viejo) → quedan 300 del 03/11', de('Isabel Robledo') && de('Isabel Robledo').bs === 300 && de('Isabel Robledo').desde === '2026-11-03', de('Isabel Robledo'));
  chk('1f2 lo de octubre sin retiro no se avisa (Fabián)', !de('Fabián Godoy'), de('Fabián Godoy'));
  chk('1f3 un retiro de noviembre que es del mismo monto que un cobro de octubre se lo lleva (Mauricio sigue con 3.290)', de('Mauricio Merida') && de('Mauricio Merida').bs === 3290, de('Mauricio Merida'));
  chk('1g Carola: un retiro de ANTES del cobro no lo cubre', de('Carola Chavez') && de('Carola Chavez').bs === 900, de('Carola Chavez'));
  chk('1h Jonathan: el adelanto «suelto» (A cuenta + Efectivo) y el recargo cobrado cuentan; el recargo pactado no', de('Jonathan Monje') && de('Jonathan Monje').bs === 850 && de('Jonathan Monje').n === 2, de('Jonathan Monje'));
  chk('1i lo cobrado ayer todavía no (48 h)', !de('Andrea Orias'), de('Andrea Orias'));
  chk('1j afuera: Eduardo, ROHO, internos, ATC, RPT, borradores', !de('Eduardo Añez') && !de('ROHO') && !de('ALBA') && E.every(o => o.bs < 9000), E.map(o => o.nombre + ' ' + o.bs));
  chk('1k el que más tiene primero', E.length === 7 && E[0].nombre === 'Maria Flores', E.map(o => o.nombre));
  chk('1p 🚚 lo de Luis Pierre (lo recibió en la puerta, «>Luis Pierre») es de chofer; lo de los vendedores no', de('Luis Pierre') && de('Luis Pierre').ch === true && E.filter(o => o.ch).length === 1, E.map(o => o.nombre + (o.ch ? ' (chofer)' : '')));
  chk('1q 🗓️ una venta cargada en octubre con el pago anotado en noviembre NO se avisa (Isabel sigue con 300, no 1.077)', de('Isabel Robledo') && de('Isabel Robledo').bs === 300 && E.viejas && E.viejas.n === 1 && E.viejas.bs === 777, [de('Isabel Robledo'), E.viejas]);
  const Sw = servidor(ON); Sw.cargar([V('w2', 'Carola Chavez', '~Efectivo 600 @2026-11-02 #8101', { ts: TS('2026-10-31') }), V('w3', 'Carola Chavez', '~Efectivo 400 @2026-11-03 #8102'), R('w2', 'Carola Chavez', 600, '2026-11-04', '9')]);
  const Ew = Sw.ctx.waEfePendiente_(Sw.lista(), '2026-11-06');
  chk('1r …y un retiro por esa plata de octubre se la lleva a ella: lo de noviembre (400) sigue sin recoger', Ew.length === 1 && Ew[0].bs === 400, Ew);
  chk('1m un retiro de noviembre sin nada cobrado antes (Carola, 01/11) queda en «sobra» para probarEfectivo', E.sobra && E.sobra.some(x => x.nombre === 'Carola Chavez' && x.bs === 900 && x.f === '2026-11-01'), E.sobra);
  const S1 = servidor(ON); S1.cargar([V('sf1', 'Maria Flores', 'Efectivo 700 #123', { ts: TS('2026-11-02') })]);
  const E1 = S1.ctx.waEfePendiente_(S1.lista(), '2026-11-06');
  chk('1n un cobro en efectivo SIN fecha no entra (como en el Cuadre) pero se cuenta en sinFecha', E1.length === 0 && E1.sinFecha.n === 1 && E1.sinFecha.bs === 700, { E1, sf: E1.sinFecha });
  const pr1 = S1.ctx.probarEfectivo();
  chk('1o probarEfectivo dice cuántos cobros sin fecha hay', pr1.lineas.some(l => /1 cobro\(s\) en efectivo sin fecha/.test(l)), pr1.lineas);
  const E2 = S.ctx.waEfePendiente_(S.lista(), '2026-11-08');
  chk('1l el domingo 08/11 lo de Andrea (05/11) ya entra', !!E2.find(o => o.nombre === 'Andrea Orias'), E2.map(o => o.nombre));

  console.log('\n── 2. La misma lectura que la página ──');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-06T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  const pag = await page.evaluate((fix) => {
    var out = {};
    fix.forEach(function (p) { if (String(p.id).indexOf('__') === 0) return;
      out[p.id] = contaPagos(p).filter(function (c) { return c.metodo === 'Efectivo' && (Number(c.monto) || 0) > 0; })
        .map(function (c) { return [c.fecha, r2(c.monto), limpiaRecibio(c.recibio)]; }); });
    var quien = {};
    fix.forEach(function (p) { if (String(p.id).indexOf('__') === 0) return;
      quien[p.id] = contaPagos(p).filter(function (c) { return c.metodo === 'Efectivo' && (Number(c.monto) || 0) > 0; }).map(function (c) { return normNombre(pagoRecibio(c, p)); }); });
    var pares = [['Carola Chávez', 'Carola Chavez'], ['  maria   flores ', 'Maria Flores'], ['Fabián Godoy', 'FABIAN GODOY'], ['Fernando', 'Fernando Peinado'], ['Peña', 'Pena'], ['ÁLVARO ÑÚÑEZ', 'alvaro nunez']];
    var igualesPag = pares.map(function (x) { return normNombre(x[0]) === normNombre(x[1]); });
    return { pagos: out, fuera: CONTA_EXCLUIR.slice(), quien: quien, pares: pares, igualesPag: igualesPag };
  }, FIX);
  const srv = {}; FIX.forEach(p => { if (String(p.id).indexOf('__') === 0) return; srv[p.id] = S.ctx.waEfePagos_(S.lista().find(q => q.id === p.id)).map(c => [c.fecha, c.monto, c.recibio]); });
  const dif = Object.keys(srv).filter(k => JSON.stringify(srv[k]) !== JSON.stringify(pag.pagos[k]));
  chk('2a los pagos en efectivo que lee el servidor son los que lee la página (contaPagos)', dif.length === 0, dif.map(k => k + ': gs ' + JSON.stringify(srv[k]) + ' · página ' + JSON.stringify(pag.pagos[k])));
  const qSrv = {}; FIX.forEach(p => { if (String(p.id).indexOf('__') === 0) return; const q = S.lista().find(x => x.id === p.id);
    qSrv[p.id] = S.ctx.waEfePagos_(q).map(c => S.ctx.waEfeNorm_(c.recibio || String(q.vendedor || '').replace(/\s+/g, ' ').trim() || '(sin vendedor)')); });
  const difQ = Object.keys(qSrv).filter(k => JSON.stringify(qSrv[k]) !== JSON.stringify(pag.quien[k]));
  chk('2c de quién es cada cobro: el servidor lo junta igual que la página (pagoRecibio, con el vendedor escrito distinto)', difQ.length === 0, difQ.map(k => k + ': gs ' + JSON.stringify(qSrv[k]) + ' · página ' + JSON.stringify(pag.quien[k])));
  const igualesSrv = pag.pares.map(x => S.ctx.waEfeNorm_(x[0]) === S.ctx.waEfeNorm_(x[1]));
  chk('2d dos nombres que la página toma por la misma persona, el servidor también (y al revés: «Fernando» no es Fernando Peinado)', JSON.stringify(igualesSrv) === JSON.stringify(pag.igualesPag) && pag.igualesPag[3] === false, { gs: igualesSrv, pagina: pag.igualesPag });
  chk('2e los cobros sin @fecha: sin día en los dos lados (no se inventa)', JSON.stringify(pag.pagos.q1) === '[["",500,""]]' && JSON.stringify(pag.pagos.q2) === '[["",300,""]]', [pag.pagos.q1, pag.pagos.q2]);
  chk('2b WA_EFE_FUERA = CONTA_EXCLUIR de la página', JSON.stringify(Array.from(S.ctx.WA_EFE_FUERA)) === JSON.stringify(pag.fuera), [S.ctx.WA_EFE_FUERA, pag.fuera]);
  await browser.close();

  console.log('\n── 3. El envío (📅 06-d: el efectivo de CADA DÍA) ──');
  const efe = () => S.salen().filter(x => x.pl === 'efectivo_del_dia');
  const aDue = () => efe().filter(x => x.to === '59177000007'), aCon = () => efe().filter(x => x.to === '59177000008');
  S = servidor(ONC); S.cargar(FIX);
  poner('2026-11-06 08:50'); S.repaso();
  chk('3a a las 08:50 todavía no', efe().length === 0, S.salen());
  S.limpiar(); poner('2026-11-06 09:05'); S.repaso();
  let e = aDue(), ec = aCon();
  chk('3b a las 09:05 sale UNO al dueño y UNO a Contabilidad', e.length === 1 && ec.length === 1 && efe().length === 2, S.salen());
  chk('3c al dueño, 5 datos: el día y la hora, de cuándo es lo que ingresó (ayer), cuánto ingresó, lo acumulado sin recoger y la lista (SIN el chofer)',
      e[0] && e[0].p.length === 5 && /viernes 06\/11, 09:0/.test(e[0].p[0]) && e[0].p[1] === 'ayer, jueves 05/11' && e[0].p[2] === 'Bs 1.500 (1 cobro)' &&
      e[0].p[3] === 'Bs 11.150 de 7 vendedores' && /^⚠️ Maria Flores Bs 3\.410 desde 03\/11 · ⚠️ Mauricio Merida Bs 3\.290 desde 03\/11/.test(e[0].p[4]) && !/Luis Pierre/.test(e[0].p[4]), e[0] && e[0].p);
  chk('3c4 lo cobrado ayer: sin ⚠️ (no tiene 48 h) y con lo que ingresó entre paréntesis', e[0] && / · Andrea Orias Bs 1\.500 desde 05\/11 \(\+Bs 1\.500\)/.test(e[0].p[4]), e[0] && e[0].p[4]);
  chk('3c3 🚚 a Contabilidad, solo lo de los choferes: Luis Pierre Bs 1.860 (de hace 48 h: ⚠️)', ec[0] && ec[0].p[2] === 'Bs 0' && ec[0].p[3] === 'Bs 1.860 de 1 chofer' && ec[0].p[4] === '⚠️ Luis Pierre Bs 1.860 desde 04/11', ec[0] && ec[0].p);
  chk('3c2 la hora va como HH:MM después de la coma', e[0] && /, \d\d:\d\d$/.test(e[0].p[0]), e[0] && e[0].p[0]);
  chk('3d ningún dato pasa de 250 letras ni lleva saltos de línea', e[0] && e[0].p.every(t => t.length <= 250 && !/[\r\n]/.test(t)), e[0] && e[0].p.map(t => t.length));
  S.limpiar(); poner('2026-11-06 09:40'); S.repaso();
  chk('3e una vez por turno (a las 09:40 no se repite)', efe().length === 0, S.salen());
  S.limpiar(); poner('2026-11-06 17:55'); S.repaso();
  chk('3f a las 17:55 todavía no', efe().length === 0);
  // Antes de las 18: se carga el retiro de Maria → el de las 18 ya no la nombra; y entra un cobro de HOY de Isabel
  S.cargar([R('f1', 'Maria Flores', 3410, '2026-11-06'), V('h1', 'Isabel Robledo', '~Efectivo 250 @2026-11-06 #7010', { ts: TS('2026-11-06') })]);
  S.limpiar(); poner('2026-11-06 18:05'); S.repaso(); e = aDue();
  chk('3g a las 18:05 sale el de la tarde: lo que ingresó HOY y lo acumulado con la planilla de ahora (el retiro de Maria ya no la nombra)',
      e.length === 1 && e[0].p[1] === 'hoy, viernes 06/11' && e[0].p[2] === 'Bs 250 (1 cobro)' && e[0].p[3] === 'Bs 7.990 de 6 vendedores' && !/Maria Flores/.test(e[0].p[4]) &&
      / y 1 más$/.test(e[0].p[4]) && aCon().length === 1, e[0] && e[0].p);
  const Ri = S.ctx.waEfeResumen_(S.lista(), '2026-11-06', '2026-11-06', '2026-11-06').find(o => o.nombre === 'Isabel Robledo');
  chk('3g2 Isabel (la que no entró en los 250 de Meta: «y 1 más»): Bs 550 sin recoger desde 03/11, de los que Bs 250 ingresaron hoy', Ri && Ri.bs === 550 && Ri.ing === 250 && Ri.desde === '2026-11-03' && Ri.atr === true, Ri);
  S.limpiar(); poner('2026-11-07 09:05'); S.repaso();
  chk('3h2 el sábado 07/11 sí sale (lo de ayer viernes)', aDue().length === 1 && aCon().length === 1 && aDue()[0].p[1] === 'ayer, viernes 06/11', S.salen());
  S.limpiar(); poner('2026-11-08 09:05'); S.repaso();
  chk('3h el domingo no sale', efe().length === 0, S.salen());
  S.limpiar(); poner('2026-11-09 09:05'); S.repaso();
  chk('3h6 el lunes a las 09:05 lo que ingresó junta sábado y domingo (las tiendas abren el domingo)', aDue().length === 1 && aDue()[0].p[1] === 'del sábado 07/11 al domingo 08/11', aDue().map(x => x.p[1]));
  S.limpiar(); poner('2026-11-10 11:05'); S.repaso();
  chk('3h4 si el primer repaso del martes es a las 11:05 (Google parado de 9 a 11), el de la mañana NO sale tarde…', efe().length === 0, S.salen());
  S.limpiar(); poner('2026-11-10 18:05'); S.repaso();
  chk('3h5 …y a las 18:05 sale el de la tarde, como siempre', aDue().length === 1 && aCon().length === 1, S.salen());
  S.limpiar(); poner('2026-12-25 09:05'); S.repaso();
  chk('3h3 en un feriado (25/12) no sale', efe().length === 0, S.salen());
  const S2 = servidor({ WA_ACTIVO: '1', WA_TOKEN: 't', WA_PHONE_ID: '1', WA_LOGISTICA: 'Ernesto:59171000001' }); S2.cargar(FIX);
  poner('2026-11-06 09:05'); S2.repaso();
  chk('3i sin WA_DUENO ni WA_CONTABILIDAD no sale', S2.salen().filter(x => x.pl === 'efectivo_del_dia').length === 0, S2.salen());
  const S2c = servidor({ WA_ACTIVO: '1', WA_TOKEN: 't', WA_PHONE_ID: '1', WA_LOGISTICA: 'Ernesto:59171000001', WA_CONTABILIDAD: 'Contabilidad:59177000008' }); S2c.cargar(FIX);
  poner('2026-11-06 09:05'); S2c.repaso();
  const e2c = S2c.salen().filter(x => x.pl === 'efectivo_del_dia');
  chk('3i2 sin WA_DUENO pero con WA_CONTABILIDAD: a Contabilidad lo de los choferes igual', e2c.length === 1 && e2c[0].to === '59177000008' && /1 chofer/.test(e2c[0].p[3]), e2c);
  const S2d = servidor(ON); S2d.cargar(FIX);
  poner('2026-11-06 09:05'); S2d.repaso();
  const e2d = S2d.salen().filter(x => x.pl === 'efectivo_del_dia');
  chk('3i3 sin WA_CONTABILIDAD lo de los choferes NO va al dueño (dueño: «no a Eduardo»)', e2d.length === 1 && e2d[0].to === '59177000007' && !/Luis Pierre/.test(e2d[0].p[4]), e2d.map(x => x.to + ' ' + x.p[4]));
  const S3 = servidor(ON); S3.cargar(FIX.filter(p => /^[mx]/.test(p.id) || /^__ret_m/.test(p.id)));
  poner('2026-11-06 09:05'); S3.repaso();
  const e3 = S3.salen().filter(x => x.pl === 'efectivo_del_dia');
  chk('3j con todo recogido sale IGUAL, en 0 (el dueño lo quiere cada día)', e3.length === 1 && e3[0].p[2] === 'Bs 0' && e3[0].p[3] === 'Bs 0, todo recogido' && e3[0].p[4] === 'nada pendiente', e3.map(x => x.p));
  const S4 = servidor(Object.assign({}, ON, { WA_PRUEBA: '59170000099' })); S4.cargar(FIX);
  poner('2026-11-06 09:05'); S4.repaso();
  const e4 = S4.salen().filter(x => x.pl === 'efectivo_del_dia');
  chk('3k con WA_PRUEBA va al número de prueba', e4.length === 1 && e4[0].to === '59170000099', e4);
  /* El resumen y el tramo, directo */
  const Rm = S3.ctx.waEfeResumen_(S3.lista(), '2026-11-03', '2026-11-03', '2026-11-03');
  chk('3l lo que ingresó y se recogió el MISMO día igual cuenta en «ingresó» (Mirian 2.140 el 03/11, retirado ese día)', Rm.length === 1 && Rm[0].nombre === 'Mirian Salazar' && Rm[0].bs === 0 && Rm[0].ing === 2140, Rm);
  const t1 = S.ctx.waEfeTramo_('2026-12-26', 9), t2 = S.ctx.waEfeTramo_('2026-11-06', 18);
  chk('3m después de un feriado la mañana junta los días (sábado 26/12: del jueves 24 al viernes 25); a las 18 es hoy', t1.de === '2026-12-24' && t1.a === '2026-12-25' && t1.txt === 'del jueves 24/12 al viernes 25/12' && t2.de === '2026-11-06' && t2.txt === 'hoy, viernes 06/11', [t1, t2]);

  console.log('\n── 4. La plantilla ──');
  const pl = Array.from(S.ctx.WA_PLANTILLAS).find(x => x.n === 'efectivo_del_dia');
  chk('4a está en WA_PLANTILLAS con {{1}}…{{5}} y un ejemplo de 5 (y la de antes, efectivo_sin_retirar, ya no)', pl && /\{\{5\}\}/.test(pl.t) && !/\{\{6\}\}/.test(pl.t) && pl.e.length === 5 && !Array.from(S.ctx.WA_PLANTILLAS).some(x => x.n === 'efectivo_sin_retirar'), pl);
  chk('4b está en WA_TIPOS (al dueño y a Contabilidad)', S.ctx.WA_TIPOS.ef && S.ctx.WA_TIPOS.ef.plantilla === 'efectivo_del_dia' && S.ctx.WA_TIPOS.efc.plantilla === 'efectivo_del_dia', [S.ctx.WA_TIPOS.ef, S.ctx.WA_TIPOS.efc]);
  poner('2026-11-06 09:05');
  const S6 = servidor(ONC); S6.cargar(FIX);
  const pr = S6.ctx.probarEfectivo();
  chk('4d probarEfectivo() dice las OC de cada persona y cuántos retiros leyó', pr.lineas.some(l => /· Mauricio Merida Bs 3\.290 sin recoger: 11-u1, 11-u2$/.test(l)) && pr.lineas.some(l => /Retiros leídos desde el 2026-10-01: 6\./.test(l)), pr.lineas);
  const S5 = servidor(ON); S5.cargar([V('z1', 'Maria Flores', '~Efectivo 600 @2026-11-02 #1'), R('z1', 'Maria Flores', 0, '2026-11-03', '1')]);
  S5.sh._datos[S5.sh._datos.length - 1][23] = '6OO';   // la columna «A cuenta» con texto (escrita a mano)
  const pr5 = S5.ctx.probarEfectivo();
  chk('4e un retiro con «A cuenta» que no es un número no tapa nada, pero probarEfectivo lo dice', pr5.lineas.some(l => /1 sin un monto que se pueda leer/.test(l)) && /Maria Flores/.test(pr5.lineas[0]), pr5.lineas);
  chk('4c probarEfectivo() dice lo que diría a cada uno y a quién, sin mandar nada', /Vendedores · el aviso de las 9:00 al dueño diría/.test(pr.lineas[0]) && pr.lineas.some(l => /^🚚 Choferes · el aviso de las 9:00 a Contabilidad diría: .*\| Bs 1\.860 de 1 chofer \| ⚠️ Luis Pierre/.test(l)) &&
      pr.lineas.some(l => /Lo de los vendedores le llega a: Eduardo/.test(l)) && pr.lineas.some(l => /Lo de los choferes le llega a: Contabilidad/.test(l)) && pr.lineas.some(l => /Retiros que no tienen efectivo cobrado antes/.test(l)), pr.lineas);
  chk('4f sin WA_CONTABILIDAD probarEfectivo lo avisa (y que al dueño no va)', pr5.lineas.some(l => /Falta la propiedad WA_CONTABILIDAD.*al dueño no va/.test(l)), pr5.lineas);

  chk('sin errores en la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien, ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
