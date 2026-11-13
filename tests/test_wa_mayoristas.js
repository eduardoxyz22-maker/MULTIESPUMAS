/* 🏭⏳ SERVIDOR 2026-11-13-b: LO VENCIDO DE LOS MAYORISTAS, LOS LUNES A CONTABILIDAD (mejora 181; el dueño, 13/11: cada lunes a las 8:00 —si
   el lunes es feriado, el siguiente día hábil— un WhatsApp con lo VENCIDO de los mayoristas: el total, cuántas OC y, por cliente, lo vencido,
   cuántas OC y la más atrasada en días; abajo lo que vence en los próximos 7 días; SOLO a Contabilidad, WA_CONTABILIDAD; nunca al dueño).
     1. La plantilla `mayoristas_vencido` (6 datos, ejemplo de 6, UTILITY) y el tipo `mv`; crearPlantillasWhatsApp la crea.
     2. Cuándo y a quién: lunes 08:00 a 10:00; el lunes feriado (02/11) no y el martes sí; una sola vez; no el domingo ni otro día; sin
        WA_CONTABILIDAD a nadie (y al dueño nunca); WA_PRUEBA; bot apagado.
     3. Qué dice: el total vencido, OC y clientes; por cliente (OC y días de la más atrasada, «sin fecha»), el que más debe primero; lo que
        vence en 7 días (de hoy a 7: «hoy», «mié 18/11»), el que vence antes primero; lo sin monto aparte; afuera el equipo, ATC, RPT,
        borradores, filas del sistema, pagadas, lo que no se entregó (hoy sin ✅, mañana, «el cliente avisa cuándo») y lo que vence en 8 o
        más; la venta de tienda y el ✅ adelantado sí; nada vencido ni por vencer → no sale; la lista larga cabe («y N más»); con la
        planilla de ESE momento (un pago anotado antes del reintento ya no sale); un reintento de otro día no sale.
     4. La página y el servidor cuentan IGUAL (`cbzVentas`, `cbzMayCliente`, `cbzClasificar` + `cbzConPlazo`, `cbzMayDatos`,
        `sinMontoAnotado`, `CBZ_PLAZOS`, `CBZ_MAY_ALIAS`, `CONTA_MAYORISTAS`) con los mismos datos inventados, varios días; y la prueba
        tiene dientes: con un plazo cambiado en la página, encuentra la diferencia.
     5. probarAntesDeImplementar (la plantilla, a quién, qué mandaría hoy SIN nombres de clientes; sin WA_CONTABILIDAD lo dice; ❌ si falta
        una función nueva) y estadoBotWhatsApp.
     6. La versión 2026-11-13-b en el .gs, en probarAntesDeImplementar y en la página.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta de mentira.
   Se corre:  node tests/test_wa_mayoristas.js   (desde la raíz del repo; GS=<otro .gs> / PEDIDOS=<otra página> para los dientes) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); } };

/* ── El servidor de mentira (como test_wa_13_25_26.js), con Meta de mentira ── */
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
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; return { setFontWeight() {} }; },
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
const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props, op) {
  op = op || {};
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 };
  const triggers = [];
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : JSON.stringify(body)) });
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com|anthropic\.com/.test(url)) return res(500, {});   // esto no le pregunta nada a Kommo ni a Claude
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      return res(r ? r.code : 200, r ? (r.body || {}) : { messages: [{ id: 'wamid.' + (++meta.n) }] });
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, putAll() {}, remove() {}, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyMinutes: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyHours: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyDays: () => ({ atHour: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC + (op.extra || ''), ctx);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const lista = () => sh._datos.slice(1).map(f => ctx.rowToRec_(f));
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text), n: c.body.template.components.length }));
  const limpiar = () => { meta.llamadas.length = 0; };
  /* Cambiar una fila de la planilla (por id) como lo haría un guardado. */
  const cambiar = (id, o) => { const i = sh._datos.findIndex((f, k) => k > 0 && String(f[0]) === id); const r = Object.assign(ctx.rowToRec_(sh._datos[i]), o); sh._datos[i] = ctx.recToRow(r); };
  return { ctx, sh, P, meta, cargar, lista, hoja, salen, limpiar, cambiar, repaso: () => ctx.waRepaso() };
}

/* ── Los datos (inventados). El lunes de la prueba es el 16/11/2026. ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const P = (id, vend, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + String(id).toUpperCase(), fecha: '2026-11-14', turno: 'AM',
  celular: '70000011', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, precio: 3000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: '', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '',
  facturarA: '', ts: TS('2026-11-02'), nroDia: 0, fotos: [], rev: 1 }, o || {});
const E = (id, cliente, fecha, saldo, o) => P(id, 'Eduardo Añez', Object.assign({ cliente, fecha, saldo }, o || {}));
const TIENDA = { direccion: 'SALIÓ DE TIENDA · Central', zona: 'TIENDA', turno: '' };
const MAY = [
  E('m1', 'MULTICENTER', '2026-08-10', 2000),                                    // +60 → vence 09/10: 38 días vencida
  E('m2', 'Multicenter SRL', '2026-09-01', 1500),                                // +60 → 31/10: 16
  E('m3', 'Multicenter', '2026-10-20', 3000),                                    // +60 → 19/12: por vencer, lejos
  E('m4', 'SRA. PEREZ', '2026-09-17', 800, { observaciones: 'pedido de Multicenter es la OC 33300' }),   // Multicenter por la nota: vence HOY
  E('m5', 'Señora Villareal', '2026-09-20', 500),                                // alias → Multicenter: vence 19/11 (en 3)
  E('n1', 'Multicenter', '', 700, { ts: 0 }),                                    // entregada SIN FECHA: cuenta vencida
  E('f1', 'Juana Rojas', '2026-09-10', 600, { facturarA: 'MULTICENTER S.R.L.' }),// Multicenter por «Facturar a»: 09/11, 7
  P('x1', 'EDUARDO ANEZ', { cliente: 'Multi Center', fecha: '2026-10-01', saldo: 1000 }),   // Eduardo sin ñ; vence 30/11 (en 14): no entra en 7
  E('t1', 'TIENDA AMIGA ER S.A.', '2026-06-15', 12000),                         // +120 → 13/10: 34
  E('t2', 'Tienda Amiga', '2026-07-25', 4000),                                   // +120 → 22/11 (domingo, en 6)
  E('t3', 'TIENDAAMIGA', '2026-07-30', 1000),                                    // +120 → 27/11 (en 11): no entra en 7
  E('c1', 'JOSE CARLOS COPACABA', '2026-10-01', 3000),                           // +15 → 16/10: 31
  E('d1', 'Copacaba', '2026-10-25', 2000, { acuenta: 1000, metodoPago: '~Efectivo 1000 @2026-10-25' }),   // +15 → 09/11: 7
  E('c2', 'JUAN CARLOS ARCE', '2026-11-10', 1200),                               // Copacaba: vence 25/11 (en 9): no entra
  E('c3', 'Juan Carlos Arce', '2026-11-20', 1500),                               // todavía no se entregó: no es deuda
  E('l1', 'LUIS FRANCO', '2026-10-30', 2500),                                    // +15 → 14/11: 2
  E('r1', 'Roho', '2026-09-01', 5000),                                           // +60 → 31/10: 16
  E('k1', 'Ferretería López.', '2026-11-12', 600),                               // al entregar: 4
  E('k2', 'FERRETERIA LOPEZ', '2026-11-16', 400, { entregado: true }),           // hoy con ✅: vence hoy
  E('k3', 'FERRETERIA  LOPEZ', '2026-11-16', 350),                               // hoy sin ✅: no es deuda
  E('e1', 'Electrocenter', '2026-11-18', 900, { entregado: true }),              // ✅ adelantado: vence el 18/11 (en 2)
  E('s1', 'CLIENTE MOSTRADOR', '', 300, Object.assign({ ts: TS('2026-11-02') }, TIENDA)),   // venta de tienda del 02/11, al entregar: 14
  E('z1', 'MULTICENTER', '2026-11-05', 0),                                       // SIN MONTO: aparte
  E('z2', 'CAMSA', '2026-11-06', 0),                                             // SIN MONTO: aparte
  E('z3', 'CAMSA', '', 0, Object.assign({ ts: TS('2026-11-03') }, TIENDA)),      // venta de tienda sin monto: no es «sin monto»
  E('z4', 'CAMSA', '2026-11-04', 0, { metodoPago: 'QR 500 @2026-11-04' }),       // tiene un cobro: no es «sin monto» (y no debe)
  E('p1', 'MULTICENTER', '2026-08-02', 0, { pagado: true, metodoPago: 'QR 3000 @2026-08-02' }),   // pagada
  E('a1', 'MULTICENTER', '2026-08-01', 999, { oc: 'ATC 11-002' }),               // ATC: afuera
  E('a2', 'MULTICENTER', '2026-08-01', 888, { oc: 'RPT 11-003' }),               // RPT: afuera
  E('b1', 'MULTICENTER', '', 777, { estado: 'Borrador Kommo' }),                 // borrador de Kommo: afuera
  E('q1', 'Tienda Amiga', '', 2222, { productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 2222, avisa: '2026-11-20' }] }),   // «el cliente avisa cuándo»
  P('v1', 'Carola Chavez', { cliente: 'CLIENTE DEL EQUIPO', fecha: '2026-08-01', saldo: 9000 }),       // del equipo: afuera
  P('v2', 'ROHO', { cliente: 'ROHO', fecha: '2026-08-01', saldo: 9000 }),                                // de ROHO: afuera
  P('__ret_1__', 'Eduardo Añez', { oc: '', cliente: '💵 RETIRO', fecha: '', saldo: 0, acuenta: 500, productos: [] }),   // fila del sistema
  P('__stock__', '', { oc: '', cliente: 'FILA DEL SISTEMA', fecha: '', productos: [], observaciones: '{}' })
];
const LUNES = '2026-11-16';
const CONTA = '59177000009', DUENO = '59177000007';
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001',
  WA_DUENO: 'Eduardo:' + DUENO, WA_CONTABILIDAD: 'Eliana:' + CONTA };
const conMay = (props, datos) => { const S = servidor(Object.assign({}, ON, props || {})); S.cargar(datos || MAY); return S; };
const mv = (S) => S.salen('mayoristas_vencido');
const NOMBRES = ['Multicenter', 'MULTICENTER', 'Tienda Amiga', 'COPACABA', 'Copacaba', 'ROHO', 'Luis Franco', 'FERRETERIA', 'ELECTROCENTER', 'MOSTRADOR', 'CAMSA', 'Villareal', 'PEREZ', 'Juana'];

(async () => {
  seccion('1. La plantilla y el tipo', () => {
    const S = servidor(Object.assign({}, ON, { WA_WABA_ID: '2901139558521747' }));
    const tipo = S.ctx.WA_TIPOS.mv, pl = Array.from(S.ctx.WA_PLANTILLAS).find(x => x.n === 'mayoristas_vencido');
    const vars = pl ? (pl.t.match(/\{\{\d+\}\}/g) || []) : [];
    chk('1a WA_TIPOS.mv → mayoristas_vencido, sin plantilla de respaldo', !!tipo && tipo.plantilla === 'mayoristas_vencido' && !tipo.vieja && !tipo.cli, tipo);
    chk('1b en WA_PLANTILLAS con {{1}}…{{6}} y un ejemplo de 6', !!pl && vars.join() === '{{1}},{{2}},{{3}},{{4}},{{5}},{{6}}' && pl.e.length === 6, pl && vars);
    chk('1c los ejemplos son como los datos de verdad: sin saltos de línea, ni tabuladores, ni 5 espacios, de 250 letras o menos',
        !!pl && pl.e.every(x => !/[\r\n\t]/.test(x) && !/ {5}/.test(x) && x.length <= 250 && x.length > 0), pl && pl.e.map(x => x.length));
    chk('1d no empieza ni termina con un dato, ni tiene dos pegados, y entra en los 1024 de Meta', !!pl && !/^\{\{/.test(pl.t) && !/\}\}$/.test(pl.t.trim()) && !/\}\}\s*\{\{/.test(pl.t) && pl.t.length < 900, pl && pl.t.length);
    chk('1e el texto dice lo que pidió el dueño (vencido, por cliente con la más atrasada, lo que vence en 7 días) y dónde ver el detalle',
        !!pl && /Vencido \(pasó su plazo de pago\)/.test(pl.t) && /más atrasada/.test(pl.t) && /próximos 7 días/.test(pl.t) && /Contabilidad → 🏭 Mayoristas → 📅 Cobranza/.test(pl.t), pl && pl.t);
    S.meta.responder = (b, n) => ({ code: 200, body: { id: 'tpl' + n, status: 'PENDING', category: 'UTILITY' } });
    const r = S.ctx.crearPlantillasWhatsApp(), c = S.meta.llamadas.find(x => x.body && x.body.name === 'mayoristas_vencido');
    chk('1f crearPlantillasWhatsApp la crea: Utilidad, en español, con el texto y el ejemplo de 6, sin botones', !!c && c.body.category === 'UTILITY' && c.body.language === 'es' &&
        c.body.components.length === 1 && c.body.components[0].text === pl.t && JSON.stringify(c.body.components[0].example.body_text[0]) === JSON.stringify(pl.e) &&
        r.plantillas.some(x => x.n === 'mayoristas_vencido' && x.ok), c && c.body);
  });

  seccion('2. Cuándo y a quién', () => {
    let S = conMay(); poner(LUNES + ' 07:55'); S.repaso();
    chk('2a el lunes 16/11 a las 07:55 todavía no sale', mv(S).length === 0, mv(S));
    poner(LUNES + ' 08:05'); S.repaso();
    let m = mv(S);
    chk('2b a las 08:05 sale UNA vez, SOLO a Contabilidad (WA_CONTABILIDAD), con 6 datos', m.length === 1 && m[0].to === CONTA && m[0].p.length === 6 && m[0].n === 1, m.map(x => x.to));
    chk('2c ⚠️ al dueño (WA_DUENO) ni a logística no les llega', !mv(S).some(x => x.to === DUENO || x.to === '59171000001'), mv(S).map(x => x.to));
    chk('2d queda anotado en la hoja «Bot WhatsApp» para Eliana y la marca del día en WA_HECHO.mv', S.hoja().some(f => f[3] === 'Contabilidad: lo vencido de los mayoristas' && f[4] === 'Eliana' && f[7] === '✅ enviado') &&
        JSON.parse(S.P.WA_HECHO).mv === LUNES, S.hoja().map(f => f.slice(3, 8)));
    S.limpiar(); poner(LUNES + ' 08:10'); S.repaso(); poner(LUNES + ' 09:55'); S.repaso();
    chk('2e una sola vez: a las 08:10 y a las 09:55 ya no sale de nuevo', mv(S).length === 0, mv(S));
    S = conMay(); poner(LUNES + ' 10:05'); S.repaso();
    chk('2f pasadas las 10:00 (2 horas) ya no sale ese día (el bot estuvo parado)', mv(S).length === 0);
    const dias = { '2026-11-15 08:05': 'domingo', '2026-11-17 08:05': 'martes', '2026-11-18 08:05': 'miércoles', '2026-11-21 08:05': 'sábado' };
    const salio = Object.keys(dias).filter(d => { const T = conMay(); poner(d); T.repaso(); return mv(T).length > 0; });
    chk('2g ni el domingo ni el martes, miércoles o sábado de una semana con el lunes hábil', salio.length === 0, salio);
    const fer = conMay(); poner('2026-11-02 08:05'); fer.repaso();
    const mar = conMay(); poner('2026-11-03 08:05'); mar.repaso();
    const mie = conMay(); poner('2026-11-04 08:05'); mie.repaso();
    chk('2h el lunes 02/11 (Todos Santos, feriado) no; el martes 03/11 sí (el primer día hábil de la semana); el miércoles 04/11 no',
        mv(fer).length === 0 && mv(mar).length === 1 && mv(mar)[0].to === CONTA && mv(mar)[0].p[0] === 'martes 03/11' && mv(mie).length === 0, [mv(fer).length, mv(mar).length, mv(mie).length]);
    chk('2i waMvToca_: el lunes hábil sí; el lunes feriado no y su martes sí; el domingo nunca; feriado de Navidad 2026 (viernes) no cambia nada',
        S.ctx.waMvToca_('2026-11-16') && !S.ctx.waMvToca_('2026-11-02') && S.ctx.waMvToca_('2026-11-03') && !S.ctx.waMvToca_('2026-11-15') &&
        !S.ctx.waMvToca_('2026-11-17') && S.ctx.waMvToca_('2026-12-21') && !S.ctx.waMvToca_('2026-12-26'));
    const sinC = conMay({ WA_CONTABILIDAD: '' }); poner(LUNES + ' 08:05'); sinC.repaso();
    chk('2j sin WA_CONTABILIDAD no le llega a nadie (tampoco al dueño) y no queda marcado como hecho', mv(sinC).length === 0 && !(JSON.parse(sinC.P.WA_HECHO || '{}').mv), [mv(sinC), sinC.P.WA_HECHO]);
    const pr = conMay({ WA_PRUEBA: '70000099' }); poner(LUNES + ' 08:05'); pr.repaso();
    chk('2k con WA_PRUEBA va al número de prueba («(prueba) Eliana» en la hoja)', mv(pr).length === 1 && mv(pr)[0].to === '59170000099' && pr.hoja().some(f => f[4] === '(prueba) Eliana'), mv(pr).map(x => x.to));
    const apag = conMay({ WA_ACTIVO: '0' }); poner(LUNES + ' 08:05'); apag.repaso();
    chk('2l con el bot apagado no sale', mv(apag).length === 0);
    const dos = conMay({ WA_CONTABILIDAD: 'Eliana:' + CONTA + ', Contadora:70000010' }); poner(LUNES + ' 08:05'); dos.repaso();
    chk('2m con dos números en WA_CONTABILIDAD, a los dos (y a nadie más)', JSON.stringify(mv(dos).map(x => x.to).sort()) === JSON.stringify(['59170000010', CONTA].sort()), mv(dos).map(x => x.to));
  });

  seccion('3. Qué dice', () => {
    const S = conMay(); poner(LUNES + ' 08:05'); S.repaso();
    const p = (mv(S)[0] || {}).p || [];
    chk('3a {{1}} el día: «lunes 16/11»', p[0] === 'lunes 16/11', p[0]);
    chk('3b {{2}} vencido: Bs 30.200 en 11 OC de 7 clientes (sin el equipo, ROHO vendedor, ATC, RPT, borradores, pagadas, retiros ni lo que no venció)', p[1] === 'Bs 30.200 en 11 OC de 7 clientes', p[1]);
    chk('3c {{3}} por cliente, el que más debe primero (empate: el más atrasado), con OC y días de la más atrasada; Multicenter junta nota, «Facturar a», alias, «Multi Center» y la sin fecha',
        p[2] === 'Tienda Amiga Bs 12.000 (1 OC, 34 d) · Copacaba Bs 5.000 (2 OC, 31 d) · ROHO Bs 5.000 (1 OC, 16 d) · Multicenter Bs 4.800 (4 OC, 38 d; 1 sin fecha) · Luis Franco Bs 2.500 (1 OC, 2 d) · FERRETERIA LOPEZ Bs 600 (1 OC, 4 d) y 1 más', p[2]);
    chk('3d {{3}} entra en un dato de Meta (≤ 250) y lo que no entra va como «y N más»', p[2].length <= 250 && / y 1 más$/.test(p[2]), p[2].length);
    chk('3e {{4}} vence en los próximos 7 días: Bs 6.600 en 5 OC de 4 clientes (hoy con ✅, el ✅ adelantado, lo que vence hoy por su plazo; no lo que vence en 9, 11 o 14 días)', p[3] === 'Bs 6.600 en 5 OC de 4 clientes', p[3]);
    chk('3f {{5}} por cliente, el que vence antes primero: «hoy», «mié 18/11», «dom 22/11»',
        p[4] === 'Multicenter Bs 1.300 (2 OC, hoy) · FERRETERIA LOPEZ Bs 400 (1 OC, hoy) · ELECTROCENTER Bs 900 (1 OC, mié 18/11) · Tienda Amiga Bs 4.000 (1 OC, dom 22/11)', p[4]);
    chk('3g {{6}} lo sin monto anotado, APARTE (no suma arriba): 2 OC (CAMSA y Multicenter); la venta de tienda y la que tiene un cobro no son «sin monto»', p[5] === '2 OC: CAMSA 1 · Multicenter 1', p[5]);
    chk('3h ningún dato con saltos de línea, tabuladores ni más de 250 letras', p.every(x => !/[\r\n\t]/.test(x) && x.length <= 250 && x.length > 0), p.map(x => x.length));
    const D = S.ctx.waMvDatos_(S.lista(), LUNES), mc = D.cli.find(c => c.k === 'Multicenter');
    chk('3i los datos de Multicenter: vencido 4.800 (4, la más atrasada 38 d, 1 sin fecha); por vencer 5.300 (4), en 7 días 1.300 (2), el primero hoy; 1 sin monto; plazo 60',
        !!mc && mc.venc === 4800 && mc.nVenc === 4 && mc.maxVenc === 38 && mc.sinF === 1 && mc.pv === 5300 && mc.nPv === 4 && mc.pv7 === 1300 && mc.nPv7 === 2 && mc.prox7 === LUNES && mc.nSin === 1 && mc.plazo === 60, mc);
    const cp = D.cli.find(c => c.k === 'Copacaba');
    chk('3j Copacaba: «JUAN CARLOS ARCE» es Copacaba; la que todavía no se entregó va aparte (viene), no es deuda', !!cp && cp.venc === 5000 && cp.nVenc === 2 && cp.pv === 1200 && cp.nPv7 === 0 && cp.viene === 1500 && cp.nV === 1, cp);
    const ta = D.cli.find(c => c.k === 'Tienda Amiga');
    chk('3k Tienda Amiga a 120 días; «el cliente avisa cuándo» va con lo que viene, no es deuda', !!ta && ta.plazo === 120 && ta.venc === 12000 && ta.maxVenc === 34 && ta.pv === 5000 && ta.pv7 === 4000 && ta.viene === 2222, ta);
    chk('3l lo que no es de la planilla de Mayoristas no aparece (ni el equipo, ni ROHO como vendedor, ni ATC/RPT, ni el borrador, ni filas del sistema)',
        !D.cli.some(c => /DEL EQUIPO|RETIRO|SISTEMA/.test(c.k)) && D.cli.every(c => c.k !== 'ROHO' || c.venc === 5000), D.cli.map(c => c.k));

    // Con la planilla de ESE momento: Meta falla, se paga una OC, el reintento ya no la trae
    const R = conMay(); poner(LUNES + ' 08:05');
    let fallas = 0;
    R.meta.responder = (b) => (b && b.template && b.template.name === 'mayoristas_vencido' && !fallas++) ? { code: 500, body: { error: { code: 1, message: 'ocupado' } } } : null;
    R.repaso();
    const quedo = JSON.parse(R.P.WA_SALIDA || '[]').filter(x => x.k === 'mv');
    R.cambiar('t1', { pagado: true, saldo: 0, metodoPago: 'QR 12000 @2026-11-16' });
    R.limpiar(); poner(LUNES + ' 08:11'); R.repaso();
    const pr = (mv(R)[0] || {}).p || [];
    chk('3m ⚠️ Meta ocupado → se reintenta a los 5 minutos con la planilla de AHORA: Tienda Amiga pagó y el reintento ya no la trae (Bs 18.200 en 10 OC de 6)',
        quedo.length === 1 && pr[1] === 'Bs 18.200 en 10 OC de 6 clientes' && !/Tienda Amiga Bs 12\.000/.test(pr[2] || ''), [quedo.length, pr[1], pr[2]]);
    const O = conMay(); poner(LUNES + ' 09:58');
    O.meta.responder = (b) => (b && b.template && b.template.name === 'mayoristas_vencido') ? { code: 500, body: { error: { code: 1, message: 'ocupado' } } } : null;
    O.repaso(); O.meta.responder = null; O.limpiar(); poner('2026-11-17 08:05'); O.repaso();
    chk('3n un reintento que llega al otro día no sale (era del lunes) y queda anotado por qué', mv(O).length === 0 && O.hoja().some(f => f[7] === '⏭️ no se manda' && /era del lunes 16\/11/.test(f[8])), O.hoja().map(f => f.slice(6, 9)));

    // Nada vencido ni por vencer → no sale
    const nada = [E('n1', 'MULTICENTER', '2026-11-10', 2000), E('n2', 'Tienda Amiga', '2026-11-20', 900), E('n3', 'CAMSA', '2026-11-05', 0),
                  E('n4', 'Copacaba', '2026-08-01', 0, { pagado: true, metodoPago: 'QR 100 @2026-08-01' }), P('n5', 'Carola Chavez', { fecha: '2026-08-01', saldo: 5000 })];
    const N = conMay({}, nada); poner(LUNES + ' 08:05'); N.repaso();
    chk('3o sin nada vencido ni que venza en 7 días (Multicenter vence en 54 días, lo demás no se entregó, sin monto o pagado; la del equipo no cuenta): NO sale, no se anota y queda hecho',
        mv(N).length === 0 && !N.hoja().some(f => /mayoristas/.test(f[3])) && JSON.parse(N.P.WA_HECHO).mv === LUNES, [mv(N), N.hoja()]);
    const solo = conMay({}, [E('o1', 'LUIS FRANCO', '2026-11-01', 800)]); poner(LUNES + ' 08:05'); solo.repaso();
    const ps = (mv(solo)[0] || {}).p || [];
    chk('3p solo algo que vence en 7 días (Luis Franco, 15 días: vence hoy 16/11): sale con «nada vencido ✅» y sin monto «ninguna»',
        ps[1] === 'nada vencido ✅' && ps[2] === 'ninguno' && ps[3] === 'Bs 800 en 1 OC de 1 cliente' && ps[4] === 'Luis Franco Bs 800 (1 OC, hoy)' && ps[5] === 'ninguna', ps);
    const viejo = conMay({}, [E('o1', 'Roho', '2026-08-01', 1000)]); poner(LUNES + ' 08:05'); viejo.repaso();
    const pv = (mv(viejo)[0] || {}).p || [];
    chk('3q solo vencido: lo de los 7 días dice «nada» y «ninguno»; una OC: «1 OC, 47 d», «1 cliente»', pv[1] === 'Bs 1.000 en 1 OC de 1 cliente' && pv[2] === 'ROHO Bs 1.000 (1 OC, 47 d)' && pv[3] === 'nada' && pv[4] === 'ninguno', pv);
    const sf = conMay({}, [E('o1', 'CAMSA', '', 400, { ts: 0 }), E('o2', 'CAMSA', '', 100, { ts: 0 })]); poner(LUNES + ' 08:05'); sf.repaso();
    chk('3r todas sin fecha de entrega: «(2 OC, todas sin fecha de entrega)»', ((mv(sf)[0] || {}).p || [])[2] === 'CAMSA Bs 500 (2 OC, todas sin fecha de entrega)', ((mv(sf)[0] || {}).p || [])[2]);
    // Lista larga: 14 clientes
    const muchos = []; for (let i = 0; i < 14; i++) muchos.push(E('g' + i, 'COMERCIAL NUMERO ' + (i + 1) + ' DEL ORIENTE', '2026-10-' + String(10 + i), 1000 * (i + 1)));
    const L = conMay({}, muchos); poner(LUNES + ' 08:05'); L.repaso();
    const pl = (mv(L)[0] || {}).p || [];
    chk('3s con 14 clientes vencidos: el total cuenta a los 14 y la lista entra en 250 con «y N más»', pl[1] === 'Bs 105.000 en 14 OC de 14 clientes' && pl[2].length <= 250 && / y \d+ más$/.test(pl[2]) && /^COMERCIAL NUMERO 14 DEL ORIENTE Bs 14\.000/.test(pl[2]), [pl[1], pl[2]]);
  });

  /* ── 4. La página y el servidor cuentan igual ── */
  console.log('\n── 4. La página y el servidor cuentan igual ──');
  try {
    /* Muchos casos inventados, con un generador fijo (siempre los mismos): clientes con y sin tildes, con nota o «Facturar a» de Multicenter,
       fechas de mayo a diciembre, pagadas, con adelanto o cobros, sin monto, ✅, venta de tienda, «avisa cuándo», ATC, RPT, borradores, del equipo. */
    let semilla = 181;
    const az = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    const de = (L) => L[Math.floor(az() * L.length)];
    const CLIS = ['MULTICENTER', 'Multicenter SRL', 'multi center', 'Multi  Center', 'TIENDA AMIGA ER S.A.', 'TiendaAmiga', 'Tienda Amiga - Sucursal Sur', 'Roho', 'ROHO TIENDA 1',
      'JOSE CARLOS COPACABA', 'JOSE CARLOSCOPACABA', 'José Carlos Coapcaba', 'Juan Carlos Arce', 'LUIS FRANCO', 'Luis Franco y Juan Carlos Arce', 'CAMSA', 'Camsa.', 'Ferretería López',
      'FERRETERIA  LOPEZ;', 'Señora Villareal', 'VILLAREAL', 'Sra. Villareal', 'Electrocenter', 'Ñandú Muebles', 'Comercial Ünico', 'Ça Va Tienda', 'Ãngela Ruiz', 'Juana Rojas', '', '   ',
      'Łukasz Ćwik', 'ĀRIEL ŠTERN', 'Muebles Øster', 'İzmir Ltda'];
    const OBS = ['', '', '', 'pedido de multicenter es la OC 33300', 'MULTI CENTER bodega', 'entregar a la tarde', 'multicentro'];
    const FAC = ['', '', '', 'MULTICENTER S.R.L.', 'Camsa', 'Multi Center'];
    const fechaAz = () => { const d = new Date(Date.UTC(2026, 4, 1) + Math.floor(az() * 240) * 86400000); return d.toISOString().slice(0, 10); };
    const GEN = [];
    for (let i = 0; i < 420; i++) {
      const r = az(), saldo = r < 0.15 ? 0 : Math.round(az() * 8000 * 100) / 100, o = {};
      o.observaciones = de(OBS); o.facturarA = de(FAC);
      if (az() < 0.15) o.entregado = true;
      if (az() < 0.12) { o.pagado = true; o.metodoPago = 'QR ' + (100 + i) + ' @2026-09-01'; }
      else if (az() < 0.15) { o.acuenta = 500; o.metodoPago = '~Efectivo 500 @2026-09-01'; }
      else if (az() < 0.1) o.metodoPago = 'QR ' + (50 + i) + ' @2026-10-01 + Efectivo 20 @2026-10-02';
      if (az() < 0.07) Object.assign(o, TIENDA, { ts: TS(fechaAz()) });
      let fecha = fechaAz();
      if (az() < 0.06) { fecha = ''; o.productos = [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: saldo, avisa: '2026-11-25' }]; }
      if (az() < 0.04) { fecha = ''; o.ts = 0; }
      if (o.zona === 'TIENDA') fecha = '';
      if (az() < 0.04) o.oc = de(['ATC 11-0' + i, 'RPT 11-0' + i]);
      if (az() < 0.04) o.estado = 'Borrador Kommo';
      const vend = az() < 0.85 ? de(['Eduardo Añez', 'EDUARDO ANEZ', 'eduardo  añez']) : de(['Carola Chavez', 'ROHO', 'ALBA']);
      GEN.push(P('g' + i, vend, Object.assign({ cliente: de(CLIS), fecha, saldo }, o)));
    }
    const S = servidor(ON); S.cargar(MAY.concat(GEN));
    const L = S.lista(), Lpag = L.filter(p => String(p.id).indexOf('__') !== 0);   // la página no tiene las filas del sistema en STATE (leerCierresDeLista)
    const HOYS = ['2026-11-16T08:05', '2026-11-03T08:05', '2026-12-21T09:00', '2027-01-04T08:30', '2026-09-30T15:00'];
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
    const errores = [];
    const bctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, timezoneId: 'America/La_Paz' });
    await bctx.route(/^https?:\/\//, r => r.abort());
    const page = await bctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    await page.clock.setFixedTime(new Date(HOYS[0] + ':00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    /* Lo que calcula la página, con Contabilidad en Mayoristas y TODO el historial (`cbzVentas`). */
    const pagina = (Ls) => page.evaluate((Ls) => {
      STATE = Ls; segSet('cta-tab', 'mayor');
      var hoy = diaNegocio(), out = { amb: contaAmbito(), hoy: hoy, ventas: cbzVentas().map(function (p) { return p.id; }).sort(), x: {}, cli: {}, nom: {}, sin: {}, may: [] };
      STATE.forEach(function (p) { out.nom[p.id] = cbzMayCliente(p); out.sin[p.id] = sinMontoAnotado(p); });
      cbzVentas().forEach(function (p) { var x = cbzClasificar(p, hoy); out.x[p.id] = x ? [x.que, x.saldo, x.f, x.vence || '', x.venc == null ? null : x.venc, x.plazo == null ? null : x.plazo] : null; });
      out.may = cbzMayDatos().filter(function (c) { return c.n || c.nV || c.nSin; }).map(function (c) { return [c.k, c.plazo, c.debe, c.n, c.venc, c.nVenc, c.maxVenc, c.pv, c.nPv, c.prox, c.viene, c.nV, c.nSin]; })
        .sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
      out.cons = JSON.stringify([CBZ_PLAZOS, CBZ_MAY_ALIAS, CONTA_MAYORISTAS]);
      segSet('cta-tab', 'ventas');
      return out;
    }, Ls);
    /* Lo mismo con el servidor. */
    const servidorDa = (hoy) => {
      const c = S.ctx, out = { ventas: L.filter(p => c.waMvEsVenta_(p)).map(p => p.id).sort(), x: {}, nom: {}, sin: {}, may: [] };
      Lpag.forEach(p => { out.nom[p.id] = c.waMvCliente_(p); out.sin[p.id] = c.waMvSinMonto_(p); });
      L.filter(p => c.waMvEsVenta_(p)).forEach(p => { const x = c.waMvClasificar_(p, hoy); out.x[p.id] = x ? [x.que, x.saldo, x.f, x.vence || '', x.venc == null ? null : x.venc, x.plazo == null ? null : x.plazo] : null; });
      out.may = Array.from(c.waMvDatos_(L, hoy).cli).map(k => [k.k, k.plazo, Math.round((k.venc + k.pv) * 100) / 100, k.nVenc + k.nPv, k.venc, k.nVenc, k.maxVenc, k.pv, k.nPv, k.prox, k.viene, k.nV, k.nSin])
        .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      out.cons = JSON.stringify([c.WA_MV_PLAZOS, c.WA_MV_ALIAS, Array.from(c.WA_MV_MAYORISTAS)]);
      return out;
    };
    const comparar = (pg, sv) => {
      const dif = [];
      if (pg.cons !== sv.cons) dif.push('constantes: página ' + pg.cons + ' · servidor ' + sv.cons);
      if (JSON.stringify(pg.ventas) !== JSON.stringify(sv.ventas)) dif.push('qué ventas entran: página ' + pg.ventas.length + ' · servidor ' + sv.ventas.length);
      Object.keys(pg.nom).forEach(id => { if (pg.nom[id] !== sv.nom[id]) dif.push('cliente ' + id + ': página ' + pg.nom[id] + ' · servidor ' + sv.nom[id]); });
      Object.keys(pg.sin).forEach(id => { if (pg.sin[id] !== sv.sin[id]) dif.push('sin monto ' + id + ': página ' + pg.sin[id] + ' · servidor ' + sv.sin[id]); });
      Object.keys(pg.x).forEach(id => { if (JSON.stringify(pg.x[id]) !== JSON.stringify(sv.x[id])) dif.push('OC ' + id + ': página ' + JSON.stringify(pg.x[id]) + ' · servidor ' + JSON.stringify(sv.x[id])); });
      if (JSON.stringify(pg.may) !== JSON.stringify(sv.may)) {
        const a = {}, b = {}; pg.may.forEach(r => { a[r[0]] = JSON.stringify(r); }); sv.may.forEach(r => { b[r[0]] = JSON.stringify(r); });
        Object.keys(Object.assign({}, a, b)).forEach(k => { if (a[k] !== b[k]) dif.push('ficha ' + k + ': página ' + a[k] + ' · servidor ' + b[k]); });
      }
      return dif;
    };
    let casos = 0, todos = [];
    for (const h of HOYS) {
      await page.clock.setFixedTime(new Date(h + ':00-04:00'));
      const pg = await pagina(Lpag), sv = servidorDa(h.slice(0, 10));
      if (pg.amb !== 'mayor' || pg.hoy !== h.slice(0, 10)) todos.push(h + ': la página no quedó en Mayoristas o en ese día (' + pg.amb + ', ' + pg.hoy + ')');
      casos += Object.keys(pg.x).length;
      comparar(pg, sv).forEach(d => todos.push(h.slice(0, 10) + ' · ' + d));
    }
    chk('4a la página y el servidor dan lo MISMO en ' + HOYS.length + ' días (' + casos + ' OC clasificadas: qué entra, cliente, sin monto, deuda/viene, saldo, vence, días de atraso, plazo, y la ficha de cada cliente)',
        todos.length === 0 && casos > 1000, todos.slice(0, 6));
    const pg0 = await (async () => { await page.clock.setFixedTime(new Date(HOYS[0] + ':00-04:00')); return pagina(Lpag); })();
    const tipos = {}; Object.keys(pg0.x).forEach(id => { const x = pg0.x[id]; const t = !x ? 'nada' : x[0] === 'deuda' ? (!x[3] ? 'sinF' : x[4] > 0 ? 'vencida' : (-x[4] <= 7 ? 'pv7' : 'pv')) : x[0]; tipos[t] = (tipos[t] || 0) + 1; });
    chk('4b (los casos cubren de todo: vencidas, por vencer en 7 y más, sin fecha, por entregar, sin monto, sin deuda)', ['vencida', 'pv7', 'pv', 'sinF', 'viene', 'sinm', 'nada'].every(t => tipos[t] > 0), tipos);
    const nombresRaros = await page.evaluate(() => [cbzMayCliente({ cliente: 'Łukasz Ćwik.' }), cbzMayCliente({ cliente: 'İzmir Ltda' }), cbzMayCliente({ cliente: 'Muebles Øster' })]);
    const nombresGs = [S.ctx.waMvCliente_({ cliente: 'Łukasz Ćwik.' }), S.ctx.waMvCliente_({ cliente: 'İzmir Ltda' }), S.ctx.waMvCliente_({ cliente: 'Muebles Øster' })];
    chk('4c los nombres con letras de otros idiomas quedan igual en los dos lados (Ł y Ø no se descomponen; Ć, İ sí)', JSON.stringify(nombresRaros) === JSON.stringify(nombresGs), [nombresRaros, nombresGs]);
    /* Dientes: si la página cambia la regla y el servidor no, la comparación lo encuentra. */
    const pgMal = await page.evaluate((Ls) => {
      var viejo = CBZ_PLAZOS.ROHO, viejaCon = cbzConPlazo; CBZ_PLAZOS.ROHO = 90;
      cbzConPlazo = function (x) { x = viejaCon(x); if (x && x.venc != null && x.p && x.p.entregado) x.venc += 1; return x; };
      STATE = Ls; segSet('cta-tab', 'mayor');
      var hoy = diaNegocio(), out = { ventas: cbzVentas().map(function (p) { return p.id; }).sort(), x: {}, nom: {}, sin: {}, may: [] };
      cbzVentas().forEach(function (p) { var x = cbzClasificar(p, hoy); out.x[p.id] = x ? [x.que, x.saldo, x.f, x.vence || '', x.venc == null ? null : x.venc, x.plazo == null ? null : x.plazo] : null; });
      out.cons = JSON.stringify([CBZ_PLAZOS, CBZ_MAY_ALIAS, CONTA_MAYORISTAS]);
      CBZ_PLAZOS.ROHO = viejo; cbzConPlazo = viejaCon; segSet('cta-tab', 'ventas');
      return out;
    }, Lpag);
    const sv0 = servidorDa(HOYS[0].slice(0, 10)); sv0.nom = {}; sv0.sin = {}; pgMal.may = sv0.may;
    const difMal = comparar(pgMal, sv0);
    chk('4d ⚠️ dientes: con ROHO a 90 días y el ✅ contando un día más SOLO en la página, la comparación encuentra las diferencias (constantes y OC)',
        difMal.some(d => /^constantes/.test(d)) && difMal.some(d => /^OC /.test(d)) && difMal.filter(d => /^OC /.test(d)).length >= 3, difMal.length + ': ' + difMal.slice(0, 3).join(' | '));
    chk('4e sin errores en la página', errores.length === 0, errores);
    await browser.close();
  } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); }

  seccion('5. probarAntesDeImplementar y estadoBotWhatsApp', () => {
    const S = conMay(); poner('2026-11-13 15:00');
    const L = S.ctx.probarAntesDeImplementar().lineas, M = L.filter(l => /🏭/.test(l));
    chk('5a dice que la plantilla está y cómo crearla', L.some(l => /^✅ 🏭 La plantilla mayoristas_vencido \(lo vencido de los mayoristas, 6 datos\) está en el código: .*crearPlantillasWhatsApp/.test(l)), M);
    chk('5b dice a quién va (SOLO Eliana, WA_CONTABILIDAD; al dueño no) y cuándo sale el próximo (lunes 16/11)',
        L.some(l => /^✅ 🏭 Lo vencido de los mayoristas va los lunes a las 08:00 \(si el lunes es feriado, el primer día hábil de la semana\) SOLO a: Eliana \(WA_CONTABILIDAD; al dueño no\)\. El próximo: lunes 16\/11\./.test(l)), M);
    chk('5c dice qué mandaría hoy (el viernes 13/11), con cantidades: vencido Bs 27.700 en 10 OC de 6, la más atrasada hace 35 días; en 7 días Bs 5.100 en 5 OC de 4; sin monto 2 OC',
        L.some(l => /^✅ 🏭 Con la planilla de ahora diría \(solo cantidades\): vencido Bs 27\.700 en 10 OC de 6 cliente\(s\), la más atrasada hace 35 días · vence en los próximos 7 días: Bs 5\.100 en 5 OC de 4 cliente\(s\) · sin monto anotado \(aparte\): 2 OC\./.test(l)), M);
    chk('5d ⚠️ ningún nombre de cliente en esas líneas del registro', !M.some(l => NOMBRES.some(n => l.indexOf(n) >= 0)), M.filter(l => NOMBRES.some(n => l.indexOf(n) >= 0)));
    chk('5e nada de esto frena (sin ❌) y el código está entero', !L.some(l => /^❌/.test(l)) && L.some(l => /^✅ El código está entero/.test(l)), L.filter(l => /^❌/.test(l)));
    const Sc = conMay({ WA_CONTABILIDAD: '' }); poner('2026-11-13 15:00');
    const Lc = Sc.ctx.probarAntesDeImplementar().lineas;
    chk('5f sin WA_CONTABILIDAD lo dice (⚠️, no frena): no le llega a nadie, al dueño no va', Lc.some(l => /^⚠️ 🏭 Lo vencido de los mayoristas \(los lunes a las 08:00\) no le llega a nadie: falta la propiedad WA_CONTABILIDAD.*Al dueño no va\./.test(l)) && !Lc.some(l => /^❌/.test(l)), Lc.filter(l => /🏭/.test(l)));
    const So = servidor({ WA_CONTABILIDAD: '' }); poner('2026-11-13 15:00');
    const Lo = So.ctx.probarAntesDeImplementar().lineas;
    chk('5f2 …y con el bot APAGADO lo dice sin ⚠️ (como lo demás del bot: no hay nada que atender todavía)', Lo.some(l => /^✅ 🏭 Lo vencido de los mayoristas \(los lunes a las 08:00\) no le llega a nadie: falta la propiedad WA_CONTABILIDAD.*\(sale con el bot de WhatsApp prendido/.test(l)) && !Lo.some(l => /^⚠️ 🏭/.test(l)), Lo.filter(l => /🏭/.test(l)));
    const Sl = conMay(); poner(LUNES + ' 08:30'); const Ll = Sl.ctx.probarAntesDeImplementar().lineas;
    chk('5g el lunes a las 08:30, todavía sin mandar: «El próximo: lunes 16/11»', Ll.some(l => /El próximo: lunes 16\/11/.test(l)), Ll.filter(l => /🏭 Lo vencido/.test(l)));
    Sl.repaso(); const Ll2 = Sl.ctx.probarAntesDeImplementar().lineas;
    chk('5h …y después de mandarlo: «El próximo: lunes 23/11»', Ll2.some(l => /El próximo: lunes 23\/11/.test(l)), Ll2.filter(l => /🏭 Lo vencido/.test(l)));
    const Lf = servidor(ON, { extra: '\nwaMvDatos_ = null;' }).ctx.probarAntesDeImplementar().lineas;
    chk('5i ❌ si falta una de las funciones nuevas (pegado cortado o viejo)', Lf.some(l => /^❌ Faltan funciones: .*waMvDatos_/.test(l)), Lf.filter(l => /Faltan/.test(l)));
    poner('2026-11-13 15:00'); const Eb = S.ctx.estadoBotWhatsApp();
    chk('5j estadoBotWhatsApp dice a quién va y cuándo sale el próximo', !!Eb.mayoristasVencido && JSON.stringify(Eb.mayoristasVencido.a) === '["Eliana"]' && Eb.mayoristasVencido.proximo === LUNES, Eb.mayoristasVencido);
  });

  seccion('6. La versión', () => {
    const ph = fs.readFileSync(PEDIDOS, 'utf8');
    const vG = (SRC.match(/var SCRIPT_VERSION = '([^']+)'/) || [])[1], vE = (SRC.match(/var ESTA_VERSION = '([^']+)'/) || [])[1], vP = (ph.match(/var SCRIPT_VERSION_ESPERADA='([^']+)'/) || [])[1];
    chk('6a la 2026-11-13-b (o una posterior), la MISMA en SCRIPT_VERSION, ESTA_VERSION y SCRIPT_VERSION_ESPERADA de la página', vG >= '2026-11-13-b' && vE === vG && vP === vG, { vG, vE, vP });
    const nuevo = SRC.slice(SRC.indexOf('var WA_HORA_MV'), SRC.indexOf('function probarBotH_'));
    chk('6b lo nuevo del .gs no usa `normalize` (el motor viejo de Apps Script no lo tiene) ni `=>`, `let` o `const`', nuevo.length > 3000 && !/\.normalize\(|=>|\blet\s|\bconst\s/.test(nuevo), nuevo.length);
  });

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
