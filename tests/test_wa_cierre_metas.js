/* 🎯🏬🛍️📈📅💬🌙💳 SERVIDOR 2026-11-15-a: LAS MEJORAS 321, 331, 332, 336, 339, 340 Y 341 (el dueño, 15/11, de la página «Mejoras 282 a 343»).
     1. Las plantillas nuevas: cierre_del_dia_v3 (9 datos), cierre_del_dia_bf (10), cierre_del_mes (9 y dos botones), logistica_excel_tarde (3); en
        WA_TIPOS (cd con la v2 y la primera de respaldo y `bf`; cm; ext con logistica_excel_falta de respaldo); sin empezar ni terminar con un dato.
     2. 332: el cierre del día suma la meta de cada marca (lo vendido, la proyección de la foto, lo que falta por día hábil desde mañana) y lo de hoy
        por tienda (las que abrían en 0 con 🟠; el domingo, solo las que abren el domingo); sin metas lo dice; los respaldos.
     3. 340: «El mes» dice por qué se movió la proyección (ventas nuevas o la cuenta, qué marca cambió de forma; «casi todo es la cuenta»).
     4. 339: Black Friday: la plantilla de la campaña con su dato; el viernes y el último día también a las 15:00; los demás días no; los respaldos.
     5. 336: el día 1 a las 10:00 el mes que cerró, a los dos de WA_DUENO, con cada dato; los botones «Ver por vendedora» y «Ver por tienda»; el
        día 2 no; un mes sin ventas no sale; el mes cerrado en el Cierre comercial usa lo guardado.
     6. 341: «tiendas», «tienda charcas», «mayoristas», «meta» y «mes cerrado»; el menú; Claude ve esos números.
     7. 321: a las 19:00, con el cierre de entregas hecho, el Excel de la tarde (PTF, Banzer, IM); con el de la tarde no sale; con el cierre sin
        hacer sale ese aviso y no este; el sábado 13:30; el respaldo.
     8. 331: el voucher: lote, autorización y banco del POS (versión 4 de la pregunta); lo de antes no se relee solo.
     9. La página y el servidor cuentan igual con los mismos datos: VENDEDOR_SUCURSAL/sucursalDeVendedor, pryVentas (amb, marca, mes, día y hora de
        carga, monto, tienda), metaVendidoMes/metaMarcaDatos, BF_DIAS/bfCampana/bfnDatos, ccmCuenta (abierto con ajustes y cerrado) y cxPryTiendas.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta y Claude de mentira.
   Se corre:  node tests/test_wa_cierre_metas.js   (desde la raíz del repo; GS=<otro .gs> o PEDIDOS=<otra página> para probar contra otras) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 900)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); } };

/* ── El servidor de mentira (como test_wa_13_25_26.js), con Meta y Claude de mentira ── */
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
function servidor(props) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 }, claude = { llamadas: [], responder: null }, triggers = [];
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : JSON.stringify(body)) });
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com/.test(url)) return res(500, {});
      if (/api\.anthropic\.com/.test(url)) {
        const body = o.payload ? JSON.parse(o.payload) : null; claude.llamadas.push({ url, o, body });
        return res(200, { content: [{ type: 'text', text: 'Charcas va bien.' }], stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 40 }, model: 'claude-opus-5-5' });
      }
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
      newTrigger: (fn) => ({ timeBased: () => ({ after: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
        everyMinutes: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
        everyHours: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
        everyDays: () => ({ atHour: () => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }) }),
      getProjectTriggers: () => triggers.slice(), deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const lista = () => sh._datos.slice(1).map(f => ctx.rowToRec_(f));
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text), comp: c.body.template.components }));
  const limpiar = () => { meta.llamadas.length = 0; claude.llamadas.length = 0; };
  return { ctx, sh, P, meta, claude, cargar, lista, hoja, salen, limpiar, repaso: () => ctx.waRepaso() };
}

/* ── Los datos ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const P = (id, vend, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + String(id).toUpperCase(), fecha: '2026-11-20', turno: 'AM',
  celular: '', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 1000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: '', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '',
  ts: TS('2026-11-02'), nroDia: 0, fotos: [], rev: 1 }, o || {});
const V = (id, vend, fecha, ts, saldo, o) => P(id, vend, Object.assign({ fecha, ts, saldo }, o || {}));
const SISTEMA = (id, obj) => P(id, '', { oc: '', cliente: 'FILA DEL SISTEMA', fecha: '', turno: '', productos: [], observaciones: JSON.stringify(obj), ts: TS('2026-11-01', '09:00') });
const ESC = { suena: { t: [['min', 100, 2], ['pres', 80, 2.5]], bono: 0 }, heaven: { t: [['min', 100, 2], ['pres', 100, 2.75], ['pres', 120, 3]], bono: 1 } };
const METAS = { v: 1, m: {
  /* Metas INVENTADAS (no las de la planilla). */
  '2026-10': { t: 1, heaven: 600000, suena: 250000, esc: ESC, vd: { 'Maria Flores': [90000, 120000], 'Carola Chavez': [100000, 140000], 'Isabel Robledo': [110000, 140000],
    'Mirian Salazar': [100000, 130000], 'Jonathan Monje': [100000, 130000], 'Mauricio Merida': [70000, 100000], 'Juan Pablo Paredes': [65000, 95000], 'Fernando Peinado': [70000, 100000] } },
  '2026-11': { t: 2, heaven: 800000, suena: 260000, esc: ESC, vd: { 'Maria Flores': [90000, 115000], 'Carola Chavez': [105000, 130000], 'Isabel Robledo': [95000, 120000],
    'Mirian Salazar': [90000, 115000], 'Jonathan Monje': [90000, 115000], 'Andrea Orias': [90000, 115000], 'Fabián Godoy': [85000, 110000],
    'Mauricio Merida': [70000, 100000], 'Juan Pablo Paredes': [65000, 95000], 'Fernando Peinado': [70000, 0] } } } };
const PRY = { v: 1, d: {
  '2026-10-31': { h: '17:05', dt: 27, dr: 0, v: 800000, p: 800000, b: { heaven: [560000, 560000, 'r'], suena: [240000, 240000, 'r'] } },
  '2026-11-11': { h: '17:05', dt: 8, dr: 16, v: 400000, p: 900000, b: { heaven: [300000, 700000, 'r'], suena: [100000, 200000, 'r'] } },
  '2026-11-12': { h: '17:10', dt: 9, dr: 15, v: 445000, p: 1010000, b: { heaven: [340000, 790000, 'c'], suena: [105000, 220000, 'r'] } },
  '2026-11-14': { h: '17:30', dt: 11, dr: 13, v: 470000, p: 1000000, b: { heaven: [360000, 780000, 'c'], suena: [110000, 220000, 'r'] },
                  t: { 'Tienda Banzer': [325300, 400000], 'Carmelo': [90100, 100000] } } } };
/* El Cierre comercial: septiembre CERRADO (con lo que entró y su %); octubre abierto, con una venta sacada (ex). */
const CCM = { v: 1, m: {
  '2026-09': { c: TS('2026-10-05', '10:00'), por: 'Eduardo', esc: ESC,
    vt: [{ v: 'Maria Flores', g: 'heaven', n: 1, bs: 5000, ti: 0, pc: 3, co: 150, to: 150, mi: 100000, pr: 130000 },
         { v: 'Carola Chavez', g: 'heaven', n: 0, bs: 0, ti: 0, pc: 2, co: 0, to: 0 },
         { v: 'Mirian Salazar', g: 'heaven', n: 1, bs: 800000, ti: 0, pc: 2, co: 16000, to: 16000, mi: 125000, pr: 160000 }],
    s: { s9a: [0, 5000, 0], s9c: [2, 800000, 0], oPag: [0, 3000, 0] } },
  '2026-10': { ex: { oEx: '2026-10-30' } } } };
const TITANIO = (cant, precio, o) => Object.assign({ desc: 'COLCHON TITANIO ICE', medida: '140x190', cant, precio }, o || {});
const SOFT = (cant, medida) => ({ desc: 'COLCHON SOFT', medida: medida || '140x190', cant, precio: 1000 });
const FIX = [
  // Septiembre (para «contra septiembre» y los ajustes del cierre de septiembre, que se pagan en octubre)
  V('s9a', 'Maria Flores', '2026-09-20', TS('2026-09-15'), 6000),              // entró por 5.000: ajuste +1.000 al 3 %
  V('s9b', 'Carola Chavez', '2026-09-22', TS('2026-09-30'), 4000),             // no entró en el cierre: ajuste al 2 %
  V('s9c', 'Mirian Salazar', '2026-09-10', TS('2026-09-05'), 800000),          // entró igual: nada
  // Octubre (el equipo)
  V('o1', 'Maria Flores', '2026-10-10', TS('2026-10-05'), 130000, { productos: [TITANIO(2, 20000), { desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 90000 }] }),
  V('o2', 'Carola Chavez', '2026-10-12', TS('2026-10-08'), 150000, { productos: [{ codigo: 'CH1220', desc: 'COLCHON', medida: '140x190', cant: 1, precio: 0 }] }),   // TITANIO por el código
  V('o3', 'Isabel Robledo', '2026-10-15', TS('2026-10-10'), 120000),
  V('o4', 'Mirian Salazar', '2026-10-20', TS('2026-10-11'), 100000),
  V('o5', 'Jonathan Monje', '2026-10-22', TS('2026-10-12'), 80000),
  V('o6', 'Mauricio Merida', '2026-10-05', TS('2026-10-01'), 110000),
  V('o7', 'Juan Pablo Paredes', '2026-10-07', TS('2026-10-02'), 60000),
  V('o8', 'Fernando Peinado', '2026-10-09', TS('2026-10-03'), 70000),
  V('o9', 'Isabel Robledo', '', TS('2026-10-18'), 5000, { zona: 'Tienda', direccion: 'Salió de tienda · Mia Plaza', turno: '' }),
  V('o10', 'Maria Flores', '2026-10-25', TS('2026-10-20'), 9000, { productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1, precio: 0 }, { desc: 'SOMIER ORO', medida: '160x190', cant: 1, precio: 3000 }] }),
  V('oEx', 'Carola Chavez', '2026-10-28', TS('2026-10-22'), 7000),             // sacada en el Cierre comercial (ex)
  V('oPag', 'Maria Flores', '2026-10-03', TS('2026-09-28'), 3000),             // ya pagada en septiembre (s)
  // Octubre: los mayoristas (Eduardo) y lo que no cuenta
  V('e1', 'Eduardo Añez', '2026-10-08', TS('2026-10-03'), 20000, { cliente: 'MULTICENTER' }),
  V('e2', 'Eduardo Añez', '2026-10-15', TS('2026-10-10'), 30000, { cliente: 'TIENDA AMIGA ER S.A.' }),
  V('e3', 'Eduardo Añez', '2026-10-20', TS('2026-10-16'), 15000, { cliente: 'MULTICENTER' }),
  V('x1', 'ROHO', '2026-10-05', TS('2026-10-02'), 9000),
  V('x2', 'Carola Chavez', '2026-10-05', TS('2026-10-02'), 7000, { oc: 'ATC 10-001' }),
  V('x3', 'ALBA', '2026-10-05', TS('2026-10-02'), 9000),
  V('kommo-1', 'Carola Chavez', '', TS('2026-10-02'), 9000, { estado: 'Borrador Kommo', oc: '' }),
  // Noviembre: lo de antes del 12, lo cargado el 11 y el 12 (antes de Black Friday), la campaña (13 y 14), los mayoristas
  V('n1', 'Carola Chavez', '2026-11-05', TS('2026-11-03'), 300000),
  V('n2', 'Juan Pablo Paredes', '2026-11-06', TS('2026-11-04'), 90100),
  V('n3', 'Carola Chavez', '2026-12-04', TS('2026-11-05'), 50000),                                               // entrega en diciembre: no es de noviembre
  V('n4', 'Maria Flores', '2026-11-04', TS('2026-10-28'), 2000, { productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 2000, vmes: '2026-10' }] }),   // «cuenta en octubre»
  V('a1', 'Isabel Robledo', '2026-11-19', TS('2026-11-11', '09:00'), 7000),
  V('h1', 'Carola Chavez', '2026-11-18', TS('2026-11-12', '10:00'), 20300),
  V('h2', 'Maria Flores', '2026-11-18', TS('2026-11-12', '11:00'), 10400),
  V('h3', 'Isabel Robledo', '2026-11-18', TS('2026-11-12', '12:00'), 9300),
  V('h4', 'Mirian Salazar', '2026-11-18', TS('2026-11-12', '13:00'), 9200),
  V('h5', 'Fernando Peinado', '2026-11-18', TS('2026-11-12', '14:00'), 6400),
  V('h6', 'Mauricio Merida', '2026-11-18', TS('2026-11-12', '15:00'), 3500),
  V('h7', 'Pedro Nuevo', '', TS('2026-11-12', '16:00'), 500, { zona: 'Tienda', direccion: 'SALIÓ DE TIENDA · Ventura Mall', turno: '' }),   // sin tienda en la lista: la escrita
  V('h8', 'Ana Externa', '2026-11-20', TS('2026-11-12', '20:00'), 300),                                              // sin tienda
  V('b1', 'Carola Chavez', '2026-11-20', TS('2026-11-13', '11:00'), 5000, { productos: [SOFT(2)] }),
  V('b2', 'Mauricio Merida', '2026-11-21', TS('2026-11-13', '12:00'), 4000, { productos: [SOFT(1)] }),
  V('b3', 'Maria Flores', '2026-11-22', TS('2026-11-14', '10:00'), 6000, { productos: [TITANIO(1, 6000, { medida: '160x190' })] }),
  V('e4', 'Eduardo Añez', '2026-11-05', TS('2026-11-03'), 8000, { cliente: 'MULTICENTER' }),
  V('e5', 'Eduardo Añez', '2026-11-06', TS('2026-11-04'), 40000, { cliente: 'ROHO TIENDA 1' }),
  V('b4', 'Eduardo Añez', '2026-11-23', TS('2026-11-14', '10:30'), 2000, { cliente: 'TIENDA AMIGA' }),
  SISTEMA('__metas__', METAS), SISTEMA('__pry_hist__', PRY), SISTEMA('__cierre_comercial__', CCM)
];
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', WA_HOOK_KEY: 'clave-hook',
  WA_DUENO: 'Eduardo:59177000007, Jefe:59177000008', WA_PEDIR_HOY: 'Ernesto:59171000001, Alba:59173000003' };
const IA = { IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'sk-de-mentira' };
const lleno = (props) => { const S = servidor(Object.assign({}, ON, props || {})); S.cargar(FIX); return S; };
let nW = 0;
const hook = (S, from, msg) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: 'Eduardo' } }],
           messages: [Object.assign({ id: 'wamid.in' + (++nW), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const textos = (S, to) => S.meta.llamadas.filter(c => c.body && c.body.type === 'text' && (!to || c.body.to === to)).map(c => c.body.text.body);
const txt = (body) => ({ type: 'text', text: { body } });

(async () => {
  seccion('1. Las plantillas nuevas', () => {
    const S = servidor(ON), T = Array.from(S.ctx.WA_PLANTILLAS), W = S.ctx.WA_TIPOS, vars = (t) => (t.match(/\{\{\d+\}\}/g) || []);
    const seq = (n) => Array.from({ length: n }, (_, i) => '{{' + (i + 1) + '}}').join();
    [['cierre_del_dia_v3', 9], ['cierre_del_dia_bf', 10], ['cierre_del_mes', 9], ['logistica_excel_tarde', 3]].forEach(([n, k]) => {
      const pl = T.find(x => x.n === n);
      chk('1a ' + n + ': {{1}}…{{' + k + '}} en orden y un ejemplo por cada uno', !!pl && vars(pl.t).join() === seq(k) && pl.e.length === k, pl && vars(pl.t));
      chk('1b ' + n + ': no empieza ni termina con un dato, sin dos pegados', !!pl && !/^\{\{/.test(pl.t) && !/\}\}$/.test(pl.t.trim()) && !/\}\}\s*\{\{/.test(pl.t));
      chk('1c ' + n + ': cada ejemplo sin saltos de línea, ni tabs, ni 4 espacios, y de 200 letras o menos', !!pl && pl.e.every(x => !/[\r\n\t]/.test(x) && !/ {4}/.test(x) && x.length <= 200), pl && pl.e.map(x => x.length));
    });
    const v2 = T.find(x => x.n === 'cierre_del_dia_v2'), v3 = T.find(x => x.n === 'cierre_del_dia_v3'), bf = T.find(x => x.n === 'cierre_del_dia_bf'), cm = T.find(x => x.n === 'cierre_del_mes');
    chk('1d la v3 empieza igual que la v2 hasta «El mes: {{7}}» (los 7 primeros datos son los mismos: la v2 es el respaldo)', !!v3 && v3.t.indexOf(v2.t.split('📈 El mes: {{7}}')[0] + '📈 El mes: {{7}}') === 0, v3 && v3.t.slice(0, 120));
    chk('1e la v3 dice «🎯 La meta: {{8}}» y «🏬 Hoy por tienda: {{9}}»; la de Black Friday además «🛍️ *Black Friday:* {{10}}»', /🎯 La meta: \{\{8\}\}/.test(v3.t) && /🏬 Hoy por tienda: \{\{9\}\}/.test(v3.t) && /🛍️ \*Black Friday:\* \{\{10\}\}/.test(bf.t) && bf.t.indexOf(v3.t.split('\n\n👇')[0]) === 0);
    chk('1f los botones: la v3 y la de Black Friday «Ver qué vendió cada uno»; el mes cerrado «Ver por vendedora» y «Ver por tienda» (≤ 25 letras)',
        JSON.stringify(v3.bt) === JSON.stringify(['Ver qué vendió cada uno']) && JSON.stringify(bf.bt) === JSON.stringify(['Ver qué vendió cada uno']) &&
        JSON.stringify(cm.bt) === JSON.stringify(['Ver por vendedora', 'Ver por tienda']) && cm.bt.every(b => [...b].length <= 25), [v3.bt, bf.bt, cm.bt]);
    chk('1g WA_TIPOS: cd = v3 (respaldo la v2 y la primera, con 7) y bf; cm = cierre_del_mes (sin respaldo); ext = logistica_excel_tarde (respaldo la del Excel de las 10:00, 3)',
        W.cd.plantilla === 'cierre_del_dia_v3' && W.cd.vieja === 'cierre_del_dia_v2' && W.cd.nv === 7 && W.cd.vieja2 === 'cierre_del_dia' && W.cd.nv2 === 7 && W.cd.bf === 'cierre_del_dia_bf' &&
        W.cm.plantilla === 'cierre_del_mes' && !W.cm.vieja && W.ext.plantilla === 'logistica_excel_tarde' && W.ext.vieja === 'logistica_excel_falta' && W.ext.nv === 3, [W.cd, W.cm, W.ext]);
    chk('1h la versión es la 2026-11-15-a (y ESTA_VERSION igual)', S.ctx.SCRIPT_VERSION === '2026-11-15-a' && /var ESTA_VERSION = '2026-11-15-a'/.test(SRC));
  });

  seccion('2. 332 · el cierre del día con la meta y lo de hoy por tienda (jueves 12/11, 21:20)', () => {
    const S = lleno(); poner('2026-11-12 21:20'); S.repaso();
    const cd = S.salen('cierre_del_dia_v3');
    chk('2a sale la v3 a los DOS de WA_DUENO, con 9 datos y el botón del día', cd.length === 2 && JSON.stringify(cd.map(x => x.to).sort()) === '["59177000007","59177000008"]' &&
        cd[0].p.length === 9 && cd[0].comp[1] && cd[0].comp[1].parameters[0].payload === 'cd|2026-11-12', cd.map(x => x.to + ':' + x.p.length));
    const p = (cd[0] || { p: [] }).p;
    chk('2b {{2}} lo cargado hoy del equipo (8 ventas, sin Eduardo ni lo de otros días)', p[1] === 'Bs 59.900 · 8 ventas · 8 productos', p[1]);
    chk('2c {{8}} la meta: lo vendido de noviembre de cada marca (las ventas de Proyección), la proyección de la foto de hoy y lo que falta por día hábil DESDE MAÑANA (15)',
        p[7] === 'Heaven va 46 % de Bs 800.000 → se proyecta 99 %, faltan Bs 28.853 por día hábil (15) · Sueña va 40 % de Bs 260.000 → se proyecta 85 % ⚠️, faltan Bs 10.400 por día hábil (15)', p[7]);
    chk('2d {{9}} lo de hoy por tienda, de más a menos; la que no tiene tienda en la lista con la suya escrita (Ventura Mall); sin tienda aparte; Carmelo abría y vendió 0 (🟠)',
        p[8] === 'Tienda Banzer Bs 20.300 · Buenos Aires Bs 10.400 · Central Bs 9.300 · Mia Plaza Bs 9.200 · Charcas Bs 6.400 · Mutualista Bs 3.500 · Ventura Mall Bs 500 · sin tienda Bs 300 · 🟠 Carmelo Bs 0', p[8]);
    chk('2e {{7}} 340: el mes con por qué se movió desde la foto de ayer (Bs 45.000 ventas nuevas, Bs 65.000 la cuenta, Heaven pasó a «curva»)',
        p[6] === 'Bs 445.000 vendidos · proyección Bs 1.010.000 (Heaven Bs 790.000 · Sueña Bs 220.000) (cálculo de las 17:10) · ▲ subió Bs 110.000 desde ayer: Bs 45.000 son ventas nuevas y Bs 65.000 es la cuenta (Heaven pasó de «ritmo» a «curva»)', p[6]);
    chk('2f ningún dato de más de 250 letras ni con saltos de línea', p.every(t => t.length <= 250 && !/[\r\n]/.test(t)), p.map(t => t.length));
    // Sin metas cargadas
    const N = servidor(ON); N.cargar(FIX.filter(x => x.id !== '__metas__')); poner('2026-11-12 21:20'); N.repaso();
    chk('2g sin metas cargadas: lo dice y dónde se cargan', ((N.salen('cierre_del_dia_v3')[0] || { p: [] }).p[7]) === 'sin metas cargadas para noviembre (Proyección → 🎯 Metas)', N.salen('cierre_del_dia_v3').map(x => x.p[7]));
    // Una marca que ya llegó
    const S2 = servidor(ON); S2.cargar(FIX.map(x => x.id === '__metas__' ? SISTEMA('__metas__', { v: 1, m: { '2026-11': { suena: 90000 } } }) : x)); poner('2026-11-12 21:20'); S2.repaso();
    chk('2h una marca sin meta y otra que ya llegó', ((S2.salen('cierre_del_dia_v3')[0] || { p: [] }).p[7]) === 'Heaven sin meta · Sueña ✅ llegó: Bs 104.000 de Bs 90.000', S2.salen('cierre_del_dia_v3').map(x => x.p[7]));
    // Respaldos: sin la v3 aprobada, la v2 con los 7
    const R = lleno(); R.meta.responder = (b) => (b.template && b.template.name === 'cierre_del_dia_v3') ? { code: 404, body: { error: { code: 132001, message: 'no existe' } } } : null;
    poner('2026-11-12 21:20'); R.repaso();
    const ll = R.meta.llamadas.filter(x => x.body && x.body.template).filter(x => x.body.to === '59177000007');
    chk('2i sin la v3 aprobada: la v2 con los 7 primeros datos (sin la meta ni las tiendas)', ll.length === 2 && ll[1].body.template.name === 'cierre_del_dia_v2' && ll[1].body.template.components[0].parameters.length === 7, ll.map(x => x.body.template.name));
    // El domingo: solo las tiendas que abren el domingo cuentan para el 🟠
    const D = servidor(ON); D.cargar(FIX.concat([V('d1', 'Mirian Salazar', '2026-11-20', TS('2026-11-15', '12:00'), 1000)])); poner('2026-11-15 21:20'); D.repaso();
    const pd = (D.salen('cierre_del_dia_bf')[0] || { p: [] }).p;
    chk('2j el domingo 15/11 (Black Friday): Mia Plaza vendió; de las demás, solo la Tienda Banzer (abre el domingo) sale en 🟠', pd[8] === 'Mia Plaza Bs 1.000 · 🟠 Tienda Banzer Bs 0', pd[8]);
    chk('2k el domingo los días hábiles que quedan son desde el lunes (13)', /\(13\)/.test(pd[7] || ''), pd[7]);
    // Las piezas
    const C = S.ctx, B = C.waBo_(RELOJ.ms);
    chk('2l waTiendaDe_: la tienda de quien vendió en el mes que cuenta (Carola: octubre Central, noviembre Tienda Banzer); sin tienda en la lista, la escrita de la venta de tienda',
        C.waTiendaDe_({ vendedor: 'Carola Chávez' }, '2026-10') === 'Central' && C.waTiendaDe_({ vendedor: 'Carola Chavez' }, '2026-11') === 'Tienda Banzer' &&
        C.waTiendaDe_({ vendedor: 'Pedro', direccion: 'SALIÓ DE TIENDA · Charcas', zona: 'Tienda' }, '2026-11') === 'Charcas' && C.waTiendaDe_({ vendedor: 'Pedro', direccion: 'Calle 1' }, '2026-11') === '');
  });

  seccion('3. 340 · por qué se movió la proyección', () => {
    const S = servidor(ON), C = S.ctx;
    const d = { '2026-11-09': { v: 397744, p: 901520, b: { suena: [65675, 226920, 'r'], heaven: [332069, 674600, 'r'] } },
                '2026-11-10': { v: 442714, p: 1010493, b: { suena: [78735, 230057, 'r'], heaven: [363979, 780435, 'c'] } },
                '2026-11-11': { v: 465149, p: 930337, b: { suena: [91490, 216750, 'r'], heaven: [373659, 713587, 'r'] } },
                '2026-11-13': { v: 470000, p: 1000000, b: {} } };
    const m1 = C.waPryMov_(d, '2026-11-10');
    chk('3a los números del 09 al 10/11 (los de la idea): Bs 108.973 = Bs 44.970 de ventas nuevas + Bs 64.003 de la cuenta, Heaven de «ritmo» a «curva»',
        m1.dv === 44970 && m1.dp === 108973 && m1.cuenta === 64003 && m1.cambios.length === 1 && m1.cambios[0].nom === 'Heaven' && m1.cambios[0].de === 'ritmo' && m1.cambios[0].a === 'curva', m1);
    chk('3b el texto', C.waPryMovTxt_(m1, '2026-11-10', 0) === '▲ subió Bs 108.973 desde ayer: Bs 44.970 son ventas nuevas y Bs 64.003 es la cuenta (Heaven pasó de «ritmo» a «curva»)', C.waPryMovTxt_(m1, '2026-11-10', 0));
    const m2 = C.waPryMov_(d, '2026-11-11');
    chk('3c al otro día bajó: casi todo es la cuenta (ventas nuevas +22.435, la cuenta −102.591), y Heaven volvió a «ritmo»',
        C.waPryMovTxt_(m2, '2026-11-11', 0) === '▼ bajó Bs 80.156 desde ayer: Bs 22.435 son ventas nuevas y −Bs 102.591 es la cuenta (Heaven pasó de «curva» a «ritmo»): casi todo es la cuenta, no es que se vendió más', C.waPryMovTxt_(m2, '2026-11-11', 0));
    chk('3d la foto anterior que no es de ayer: «desde el 11/11»', /^▲ subió Bs 69\.663 desde el 11\/11: /.test(C.waPryMovTxt_(C.waPryMov_(d, '2026-11-13'), '2026-11-13', 0)), C.waPryMovTxt_(C.waPryMov_(d, '2026-11-13'), '2026-11-13', 0));
    chk('3e la primera foto del mes no tiene con qué compararse (null); sin foto de ese día, tampoco', C.waPryMov_(d, '2026-11-09') === null && C.waPryMov_(d, '2026-11-12') === null);
    chk('3f «casi todo es la cuenta» = la cuenta es 75 % o más del salto, del mismo signo y el salto de Bs 1.000 o más',
        C.waPryMovCuenta_({ dp: 100000, cuenta: 75000 }) && !C.waPryMovCuenta_({ dp: 100000, cuenta: 74000 }) && !C.waPryMovCuenta_({ dp: 900, cuenta: 900 }) && !C.waPryMovCuenta_({ dp: 1000, cuenta: -5000 }));
    const largo = { '2026-11-01': { v: 1, p: 1, b: { heaven: [1, 1, 'r'], suena: [1, 1, 'r'] } },
                    '2026-11-02': { h: '17:05', v: 123456789, p: 987654321, b: { heaven: [123456789, 987654321, 'c'], suena: [123456789, 987654321, 'c'], otra: [1, 1, 'c'] } } };
    const t = C.waCdPry_({ observaciones: JSON.stringify({ v: 1, d: largo }) }, C.waBo_(Date.parse('2026-11-02T21:00:00-04:00')));
    chk('3g si no entra en 250 letras se acorta (sin el «pasó de…») o se va', t.length <= 250 && /^Bs 123\.456\.789 vendidos/.test(t), [t.length, t]);
    // En la respuesta a «mes» (25 C)
    const M = lleno(); poner('2026-11-12 21:30'); hook(M, '59177000007', txt('mes'));
    chk('3h la respuesta a «mes» dice por qué se movió', textos(M, '59177000007').some(x => /↕️ ▲ subió Bs 110\.000 desde ayer/.test(x)), textos(M, '59177000007'));
  });

  seccion('4. 339 · Black Friday en el cierre', () => {
    const S = lleno(); poner('2026-11-14 21:20'); S.repaso();
    const bf = S.salen('cierre_del_dia_bf');
    chk('4a el sábado 14/11 sale la de Black Friday (10 datos) a los dos, y no la v3', bf.length === 2 && S.salen('cierre_del_dia_v3').length === 0 && bf[0].p.length === 10, S.salen().map(x => x.pl));
    chk('4b {{10}}: el día de la campaña, lo vendido contra los 2 días hábiles de antes a esta hora, cada marca y lo más vendido',
        (bf[0] || { p: [] }).p[9] === 'día 2 de 15 · en la campaña Bs 15.000 (▼ 78 % contra los 2 días hábiles de antes a esta hora, Bs 66.900) · Heaven ▼ 80 % · Sueña ▼ 60 % · lo más vendido: SOFT 140x190 (3)', (bf[0] || {}).p);
    const R = lleno(); R.meta.responder = (b) => (b.template && b.template.name === 'cierre_del_dia_bf') ? { code: 404, body: { error: { code: 132015, message: 'pausada' } } } : null;
    poner('2026-11-14 21:20'); R.repaso();
    const ll = R.meta.llamadas.filter(x => x.body && x.body.template && x.body.to === '59177000007');
    chk('4c sin la de Black Friday aprobada: la v3 con los 9 datos', ll.length === 2 && ll[1].body.template.name === 'cierre_del_dia_v3' && ll[1].body.template.components[0].parameters.length === 9, ll.map(x => x.body.template.name));
    // 15:00: el viernes 27 y el lunes 30, no los otros días
    const Q = lleno(); const X = [V('bf27', 'Carola Chavez', '2026-12-01', TS('2026-11-27', '10:00'), 8000), V('bf28', 'Carola Chavez', '2026-12-01', TS('2026-11-28', '10:00'), 8000), V('bf30', 'Carola Chavez', '2026-12-02', TS('2026-11-30', '10:00'), 8000)];
    Q.cargar(X);
    poner('2026-11-27 14:55'); Q.repaso();
    chk('4d el viernes de Black Friday a las 14:55: todavía no', Q.salen().filter(x => /^cierre_del_dia/.test(x.pl)).length === 0, Q.salen().map(x => x.pl));
    poner('2026-11-27 15:05'); Q.repaso();
    const q = Q.salen('cierre_del_dia_bf');
    chk('4e a las 15:05 sale (a los dos), con la hora en el día y contando hoy entre los que quedan', q.length === 2 && q[0].p[0] === 'viernes 27/11, a las 15:05' && /con hoy\)/.test(q[0].p[7]), q.map(x => [x.p[0], x.p[7]]));
    Q.limpiar(); poner('2026-11-27 16:30'); Q.repaso();
    chk('4f no se repite', Q.salen().filter(x => /^cierre_del_dia/.test(x.pl)).length === 0);
    poner('2026-11-27 21:20'); Q.repaso();
    chk('4g a la noche sale el de siempre (sin la hora en el día y sin contar hoy)', Q.salen('cierre_del_dia_bf').length === 2 && Q.salen('cierre_del_dia_bf')[0].p[0] === 'viernes 27/11' && !/con hoy/.test(Q.salen('cierre_del_dia_bf')[0].p[7]), Q.salen('cierre_del_dia_bf').map(x => x.p[0]));
    Q.limpiar(); poner('2026-11-28 15:05'); Q.repaso();
    chk('4h el sábado 28 a las 15:00: no (solo el viernes y el último día)', Q.salen().filter(x => /^cierre_del_dia/.test(x.pl)).length === 0);
    poner('2026-11-30 15:05'); Q.repaso();
    chk('4i el lunes 30 (el último día) a las 15:00: sí', Q.salen('cierre_del_dia_bf').length === 2, Q.salen().map(x => x.pl));
    Q.limpiar(); poner('2026-12-01 21:20'); Q.repaso();
    chk('4j el 01/12 (terminó la campaña): la v3 de siempre', Q.salen('cierre_del_dia_v3').length === 2 && Q.salen('cierre_del_dia_bf').length === 0, Q.salen().map(x => x.pl));
    const C = S.ctx;
    chk('4k bfCampana: 2026 del 13 al 30/11 (viernes 27), 2027 del 12 al 29/11 (viernes 26)', JSON.stringify(C.waBfCampana_(2026)) === '{"y":2026,"viernes":"2026-11-27","desde":"2026-11-13","hasta":"2026-11-30"}' &&
        JSON.stringify(C.waBfCampana_(2027)) === '{"y":2027,"viernes":"2027-11-26","desde":"2027-11-12","hasta":"2027-11-29"}', [C.waBfCampana_(2026), C.waBfCampana_(2027)]);
  });

  seccion('5. 336 · el mes que cerró, el día 1 a las 10:00', () => {
    const S = lleno(); poner('2026-11-01 09:55'); S.repaso();
    chk('5a el 01/11 a las 09:55: todavía no', S.salen('cierre_del_mes').length === 0);
    poner('2026-11-01 10:05'); S.repaso();
    const cm = S.salen('cierre_del_mes'), p = (cm[0] || { p: [] }).p;
    chk('5b a las 10:05 sale a los DOS de WA_DUENO, con los botones de octubre', cm.length === 2 && JSON.stringify(cm.map(x => x.to).sort()) === '["59177000007","59177000008"]' &&
        cm[0].comp.length === 3 && cm[0].comp[1].parameters[0].payload === 'cm|2026-10|v' && cm[0].comp[2].parameters[0].payload === 'cm|2026-10|t', cm.map(x => x.to));
    chk('5c {{1}} el mes', p[0] === 'Octubre 2026', p[0]);
    chk('5d {{2}} el equipo (sin Eduardo, ROHO, internos, ATC ni borradores; la venta de tienda sí; «cuenta en octubre» también) contra la suma de las metas de las marcas', p[1] === 'Bs 846.000 en 13 ventas · 100 % de la meta (Bs 850.000)', p[1]);
    chk('5e {{3}} contra septiembre ENTERO', p[2] === '▲ 4 % contra septiembre entero (Bs 810.000)', p[2]);
    chk('5f {{4}} cada marca contra la suya', p[3] === 'Heaven Bs 606.000 (101 % de Bs 600.000) · Sueña Bs 240.000 (96 % de Bs 250.000)', p[3]);
    chk('5g {{5}} las tiendas de octubre (con las de octubre: Carola y Jonathan en Central, Isabel en Mia Plaza): las 3 de arriba y la de abajo',
        p[4] === 'arriba: Central Bs 237.000 · Mia Plaza Bs 225.000 · Buenos Aires Bs 144.000 — abajo: Carmelo Bs 60.000', p[4]);
    chk('5h {{6}} las 3 que más vendieron', p[5] === '🥇 Carola Bs 157.000 · 🥈 Maria Bs 144.000 · 🥉 Isabel Bs 125.000', p[5]);
    chk('5i {{7}} los mayoristas, con el más grande (cbzMayCliente)', p[6] === 'Bs 65.000 en 3 OC · el más grande: Multicenter Bs 35.000 (2 OC)', p[6]);
    chk('5j {{8}} las comisiones con la escala guardada: el tramo, el bono Titanio (también por el código CH1220), los ajustes de septiembre; sin la ya pagada ni la sacada',
        p[7] === 'Bs 18.663 según la escala guardada (Heaven Bs 14.513 · Sueña Bs 4.150)', p[7]);
    chk('5k {{9}} octubre no se cerró en el Cierre comercial: lo recuerda', /^octubre todavía no se cerró: cerralo en Proyección → 🏁 Cierre comercial/.test(p[8]), p[8]);
    chk('5l ningún dato de más de 250 letras', p.every(t => t.length <= 250 && !/[\r\n]/.test(t)), p.map(t => t.length));
    S.limpiar(); poner('2026-11-01 11:30'); S.repaso();
    chk('5m no se repite', S.salen('cierre_del_mes').length === 0);
    poner('2026-11-02 10:05'); S.repaso();
    chk('5n el día 2: no', S.salen('cierre_del_mes').length === 0);
    // Los botones
    S.limpiar(); poner('2026-11-01 12:00'); hook(S, '59177000007', { type: 'button', button: { payload: 'cm|2026-10|v', text: 'Ver por vendedora' } });
    const tv = textos(S, '59177000007').join('\n');
    chk('5o «Ver por vendedora»: cada una con su marca y tienda, lo vendido, % de su presupuesto y su comisión', /^📅 \*Octubre 2026, por vendedora\*/.test(tv) &&
        /\*Carola Chavez\* \(Heaven, Central\)\nBs 157\.000 en 2 ventas · 112 % del presupuesto \(Bs 140\.000\) · comisión Bs 5\.705 \(2,75 %\)/.test(tv) &&
        /\*Mirian Salazar\* \(Heaven, Mia Plaza\)\nBs 100\.000 en 1 venta · 77 % del presupuesto \(Bs 130\.000\) · comisión Bs 2\.000 \(2 %\)/.test(tv) &&
        /\*Jonathan Monje\* \(Heaven, Central\)\nBs 80\.000 en 1 venta · 62 % del presupuesto \(Bs 130\.000\) · comisión Bs 0\n/.test(tv) && /💰 Comisiones: Bs 18\.662,50/.test(tv), tv);
    S.limpiar(); hook(S, '59177000008', { type: 'button', button: { payload: 'cm|2026-10|t', text: 'Ver por tienda' } });
    const tt = textos(S, '59177000008').join('\n');
    chk('5p «Ver por tienda» (también el jefe): cada tienda, su meta (la de sus vendedoras) y quién vendió', /^📅 \*Octubre 2026, por tienda\*/.test(tt) &&
        /\*Central\* · Bs 237\.000 en 3 ventas · 88 % de su meta \(Bs 270\.000\)\nCarola Bs 157\.000 · Jonathan Bs 80\.000/.test(tt), tt);
    S.limpiar(); hook(S, '59177000007', { type: 'button', button: { text: 'Ver por tienda' } });
    chk('5q el botón sin `payload`: el mes pasado', /^📅 \*Octubre 2026, por tienda\*/.test(textos(S, '59177000007').join('\n')), textos(S, '59177000007'));
    // Septiembre cerrado: lo guardado
    const C = S.ctx, L = S.lista(), por = C.waPorId_(L);
    const K9 = C.waCcmCuenta_(C.waPvVentas_(L), por, '2026-09');
    chk('5r un mes cerrado en el Cierre comercial: las comisiones son las guardadas (Bs 16.150)', K9.cerrado && K9.to === 16150, K9.to);
    const cm9 = C.waCmParams_(C.waCmDatos_(L, '2026-09'));
    chk('5s …y dice cuándo se cerró y quién', cm9[8] === '✅ cerrado el 05/10 por Eduardo' && /las del cierre guardado/.test(cm9[7]), [cm9[7], cm9[8]]);
    // Un mes sin ventas no sale
    const N = servidor(ON); N.cargar([SISTEMA('__metas__', METAS)]); poner('2026-12-01 10:05'); N.repaso();
    chk('5t un mes sin ventas del equipo: no sale (queda anotado)', N.salen('cierre_del_mes').length === 0 && N.hoja().some(f => f[3] === 'Dueño: el mes cerrado' && /no tiene ventas/.test(f[8])), N.hoja().map(f => f[3] + ' ' + f[8]));
  });

  seccion('6. 341 · el dueño pregunta por tiendas, mayoristas y la meta', () => {
    const S = lleno(); poner('2026-11-14 18:00');
    hook(S, '59177000007', txt('Tiendas'));
    const t1 = textos(S, '59177000007').join('\n');
    chk('6a «tiendas»: cada tienda en el mes contra su meta, lo de hoy, la proyección si la foto la trae; de más a menos',
        /^🏬 \*Las tiendas · noviembre\* \(al 14\/11, 18:00\)/.test(t1) && /· Tienda Banzer: \*Bs 325\.300\* · 133 % de su meta \(Bs 245\.000\) · se proyecta 163 % ✅ · hoy Bs 0/.test(t1) &&
        /· Carmelo: \*Bs 90\.100\* · 95 % de su meta \(Bs 95\.000\) · se proyecta 105 % ✅ · hoy Bs 0/.test(t1) && /· Buenos Aires: \*Bs 16\.400\* · 14 % de su meta \(Bs 115\.000\) · hoy Bs 6\.000/.test(t1) &&
        t1.indexOf('Tienda Banzer') < t1.indexOf('Carmelo'), t1);
    S.limpiar(); hook(S, '59177000007', txt('tienda charcas'));
    const t2 = textos(S, '59177000007').join('\n');
    chk('6b «tienda charcas»: esa tienda y sus vendedoras', /^🏬 \*Charcas · noviembre\*/.test(t2) && /· Fernando Peinado Bs 6\.400 \(1\) · 9 % de Bs 70\.000/.test(t2), t2);
    S.limpiar(); hook(S, '59177000007', txt('tienda banzer'));
    chk('6c «tienda banzer» = la Tienda Banzer', /^🏬 \*Tienda Banzer · noviembre\*/.test(textos(S, '59177000007').join('\n')), textos(S, '59177000007'));
    S.limpiar(); hook(S, '59177000007', txt('tienda xyz'));
    chk('6d una tienda que no existe: lo dice y nombra las que hay', /No encontré la tienda «xyz»\. Las tiendas: Mutualista, Charcas, Carmelo, Tienda Banzer/.test(textos(S, '59177000007').join('\n')), textos(S, '59177000007'));
    S.limpiar(); hook(S, '59177000007', txt('mayoristas'));
    const t3 = textos(S, '59177000007').join('\n');
    chk('6e «mayoristas»: el total y cada cliente contra octubre a los mismos días hábiles (13/10 a las 18:00: sin la que se cargó el 16/10)',
        /^🏭 \*Mayoristas · noviembre a esta altura\*/.test(t3) && /Total: \*Bs 50\.000\* en 3 OC · octubre al día 13 \(los mismos 11 días hábiles\): Bs 50\.000 en 2 OC · = 0 %/.test(t3) &&
        /· ROHO: Bs 40\.000 \(1 OC\) · octubre Bs 0 \(0\) · nuevo/.test(t3) && /· Multicenter: Bs 8\.000 \(1 OC\) · octubre Bs 20\.000 \(1\) · ▼ 60 %/.test(t3), t3);
    S.limpiar(); hook(S, '59177000007', txt('¿Meta?'));
    const t4 = textos(S, '59177000007').join('\n');
    chk('6f «meta»: cada marca, lo que se proyecta (la foto de hoy) y lo que falta por día CONTANDO HOY (antes de las 20:00: 14)',
        /^🎯 \*La meta de noviembre\* \(al 14\/11, 18:00\)/.test(t4) && /· Heaven: vendido Bs 367\.200 = \*46 %\* de Bs 800\.000 · se proyecta Bs 780\.000 \(98 %\) · faltan Bs 432\.800: \*Bs 30\.914 por día hábil\* en los 14 que quedan contando hoy/.test(t4) &&
        /· Sueña: vendido Bs 104\.000 = \*40 %\* de Bs 260\.000 · se proyecta Bs 220\.000 \(85 % ⚠️\) · faltan Bs 156\.000: \*Bs 11\.143 por día hábil\*/.test(t4) &&
        /La proyección es la del cálculo del panel de las 17:30/.test(t4), t4);
    S.limpiar(); hook(S, '59177000007', txt('mes cerrado'));
    chk('6g «mes cerrado»: el resumen del mes pasado', /^📅 \*Octubre 2026 cerró\*\n\n👥 Equipo: \*Bs 846\.000 en 13 ventas/.test(textos(S, '59177000007').join('\n')), textos(S, '59177000007'));
    S.limpiar(); hook(S, '59177000007', txt('menu'));
    const t5 = textos(S, '59177000007').join('\n');
    chk('6h el menú nombra las palabras nuevas', /\*tiendas\*/.test(t5) && /\*tienda charcas\*/.test(t5) && /\*mayoristas\*/.test(t5) && /\*meta\*/.test(t5) && /\*mes cerrado\*/.test(t5), t5);
    // Claude con esos números
    const A = lleno(IA); poner('2026-11-14 18:00'); hook(A, '59177000007', txt('¿cómo va Charcas este mes?'));
    const u = String((((A.claude.llamadas[0] || {}).body || {}).messages || [{}])[0].content || '');
    chk('6i lo que no es del menú va a Claude, con las tiendas, los mayoristas y la meta en los datos', A.claude.llamadas.length === 1 && /🏬 \*Las tiendas · noviembre\*/.test(u) && /🏭 \*Mayoristas · noviembre a esta altura\*/.test(u) && /🎯 \*La meta de noviembre\*/.test(u), u.slice(0, 300));
    const sis = String(((A.claude.llamadas[0] || {}).body || {}).system || '');
    chk('6j y las reglas le dicen las palabras nuevas', /tiendas, tienda <nombre>, mayoristas, meta, mes cerrado/.test(sis), sis.slice(0, 200));
    // Un cliente que escribe «tiendas» o toca el botón: no recibe nada de esto
    S.limpiar(); hook(S, '59170111222', txt('tiendas')); hook(S, '59170111222', { type: 'button', button: { payload: 'cm|2026-10|v', text: 'Ver por vendedora' } });
    chk('6k un cliente que escribe «tiendas» o toca el botón: no recibe los números', !textos(S).some(x => /Las tiendas|por vendedora/.test(x)), textos(S));
  });

  seccion('7. 321 · el Excel de la tarde a las 19:00', () => {
    const STK = (c, g) => SISTEMA('__stock__', { c: c, g: g || {}, pv: 3 });
    const G = (bz, im) => ({ '01-05-025  Almacen Distribucion Banzer': bz, 'IM - PRODUCTOTERMINADO': im });
    const MAN = { f: '2026-11-12', hora: '08:05:20' }, TAR = { f: '2026-11-12', hora: '18:10:00' };
    const ent = (o) => P('ent1', 'Maria Flores', Object.assign({ fecha: '2026-11-12', entregado: true }, o || {}));
    const caso = (filas, cuando) => { const S = servidor(ON); S.cargar(filas); poner(cuando || '2026-11-12 19:05'); S.repaso(); return S; };
    let S = caso([ent(), STK(MAN, G(MAN, MAN))]);
    const e1 = S.salen('logistica_excel_tarde');
    chk('7a el cierre hecho y solo los Excel de la mañana: logistica_excel_tarde a los de WA_PEDIR_HOY, con qué falta y de cuándo es el último', e1.length === 2 &&
        JSON.stringify(e1[0].p) === JSON.stringify(['jueves 12/11', 'PTF, Banzer e IM', 'de esta mañana (08:05)']) && S.salen('logistica_cierre_falta').length === 0, e1.map(x => x.p));
    chk('7b la hoja lo anota como «Logística: falta el Excel de la tarde»', S.hoja().filter(f => f[3] === 'Logística: falta el Excel de la tarde' && f[7] === '✅ enviado').length === 2);
    S = caso([ent(), STK(TAR, G(TAR, MAN))]);
    chk('7c PTF y Banzer ya tienen el de la tarde: falta solo IM', JSON.stringify((S.salen('logistica_excel_tarde')[0] || {}).p) === JSON.stringify(['jueves 12/11', 'IM', 'de esta mañana (08:05)']), S.salen().map(x => x.p));
    S = caso([ent(), STK(TAR, G(TAR, TAR))]);
    chk('7d con los tres de la tarde: no sale (ni el del cierre: está hecho)', S.salen().filter(x => /^logistica_/.test(x.pl)).length === 0, S.salen().map(x => x.pl));
    S = caso([ent({ entregado: false }), STK(MAN, G(MAN, MAN))]);
    chk('7e falta el cierre: sale ese aviso y NO el del Excel', S.salen('logistica_cierre_falta').length === 2 && S.salen('logistica_excel_tarde').length === 0, S.salen().map(x => x.pl));
    S = caso([ent(), STK({ f: '2026-11-12', t: TS('2026-11-12', '17:40') }, G({ f: '2026-11-11', hora: '18:00:00' }, MAN))]);
    chk('7f sin la hora del Excel vale la hora en que se subió (17:40 = de la tarde: PTF no falta); Banzer (de ayer) e IM (de la mañana) sí; «el último», el más nuevo de esos', JSON.stringify((S.salen('logistica_excel_tarde')[0] || {}).p) === JSON.stringify(['jueves 12/11', 'Banzer e IM', 'de esta mañana (08:05)']), S.salen().map(x => x.p));
    S = caso([P('ent2', 'Maria Flores', { fecha: '2026-11-14', entregado: true }), STK({ f: '2026-11-14', hora: '08:00:00' })], '2026-11-14 13:35');
    chk('7g el sábado a las 13:35 (con el cierre de la mañana hecho)', (S.salen('logistica_excel_tarde')[0] || {}).p && S.salen('logistica_excel_tarde')[0].p[0] === 'sábado 14/11', S.salen().map(x => x.p));
    S = servidor(ON); S.cargar([ent(), STK(MAN, G(MAN, MAN))]); S.meta.responder = (b) => (b.template && b.template.name === 'logistica_excel_tarde') ? { code: 404, body: { error: { code: 132001, message: 'no existe' } } } : null;
    poner('2026-11-12 19:05'); S.repaso();
    const ll = S.meta.llamadas.filter(x => x.body && x.body.template && x.body.to === '59171000001');
    chk('7h sin la plantilla aprobada: la del Excel de las 10:00 con los mismos 3 datos', ll.length === 2 && ll[1].body.template.name === 'logistica_excel_falta' &&
        JSON.stringify(ll[1].body.template.components[0].parameters.map(x => x.text)) === JSON.stringify(['jueves 12/11', 'PTF, Banzer e IM', 'de esta mañana (08:05)']), ll.map(x => x.body.template.name));
    S = caso([ent(), STK(MAN, G(MAN, MAN))], '2026-11-12 18:50');
    chk('7i a las 18:50 todavía no', S.salen().filter(x => /^logistica_/.test(x.pl)).length === 0, S.salen().map(x => x.pl));
  });

  seccion('8. 331 · el voucher de la tarjeta: lote, autorización y banco del POS', () => {
    const S = servidor(ON), C = S.ctx;
    chk('8a la pregunta va por la versión 4 y el esquema pide (obligatorio) el lote, la autorización y el banco del POS',
        C.IAC_PREGUNTA_V === 4 && ['tarjeta_lote', 'tarjeta_autorizacion', 'pos_banco'].every(k => C.IAC_ESQUEMA.properties[k] && C.IAC_ESQUEMA.properties[k].type === 'string' && C.IAC_ESQUEMA.required.indexOf(k) >= 0));
    chk('8b la pregunta explica el lote y que el banco del POS NO es el de la tarjeta del cliente', /tarjeta_lote: .*LOTE/.test(C.IAC_PIDE) && /pos_banco: .*NO el de la tarjeta del cliente/.test(C.IAC_PIDE));
    const base = { es_comprobante: true, legible: true, monto: 6330, moneda: 'BOB', fecha: '2026-11-14', hora: '15:05', banco_origen: '', banco_destino: '', destinatario: '', ordenante: '',
      referencia: '', tipo: 'tarjeta', nota: '', es_nota_venta: false, nota_total: 0, nota_efectivo: 0, nota_qr: 0, nota_tarjeta: 0, nota_transferencia: 0,
      tarjeta_ultimos4: '1234', tarjeta_lote: ' 000112 ', tarjeta_autorizacion: '845 210', pos_banco: 'BISA' };
    const v = C.iacNormal_(base, 'm');
    chk('8c un voucher: el lote, la autorización (sin espacios; y como referencia si no había) y el banco del POS', v.lo === '000112' && v.au === '845210' && v.ref === '845210' && v.pb === 'BISA' && v.u4 === '1234' && v.pv === 4, JSON.stringify(v));
    const q = C.iacNormal_(Object.assign({}, base, { tipo: 'qr', tarjeta_ultimos4: '' }), 'm');
    chk('8d un QR: nada de lote ni POS (sería ruido)', !q.lo && !q.au && !q.pb, JSON.stringify(q));
    const r = C.iacNormal_(Object.assign({}, base, { referencia: '777' }), 'm');
    chk('8e con referencia leída, la referencia queda la que vino', r.ref === '777' && r.au === '845210');
    chk('8f iacReleer_: igual que antes (solo lo «no es comprobante» de una pregunta anterior a la 3): un voucher de la 3 sin lote NO se relee solo (sería pagar otra vez)',
        C.iacReleer_({ cp: false, pv: 2 }) === true && C.iacReleer_({ cp: false, pv: 3 }) === false && C.iacReleer_({ cp: true, ti: 'tarjeta', pv: 3 }) === false);
  });

  seccion('9. probarAntesDeImplementar', () => {
    const S = lleno(); poner('2026-11-14 18:00');
    const L = S.ctx.probarAntesDeImplementar().lineas;
    chk('9a dice que las plantillas nuevas están y a quién va cada cosa, y no frena', L.some(l => /^✅ 🎯🛍️📅🌙 Las plantillas nuevas/.test(l)) && L.some(l => /^✅ 📅 El mes cerrado sale el día 1 a las 10:00 \(el próximo: martes 01\/12\) a: Eduardo, Jefe/.test(l)) &&
        L.some(l => /^✅ 🛍️ Black Friday 2026: del viernes 13\/11 al lunes 30\/11/.test(l)) && L.some(l => /^✅ 💰 Las comisiones de octubre darían Bs 18\.662,50/.test(l)) && !L.some(l => /^❌/.test(l) && !/Kommo|Pedidos/.test(l)), L.filter(l => /🎯|📅|🛍️|💰|🌙|❌/.test(l)));
  });

  /* ══ 10. La página y el servidor cuentan igual ══ */
  console.log('\n── 10. La página y el servidor cuentan igual (los mismos datos) ──');
  try {
    const S = lleno(); poner('2026-11-14 18:00');
    const L = S.lista(), C = S.ctx;
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
    const errores = [];
    const bctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, timezoneId: 'America/La_Paz' });
    await bctx.route(/^https?:\/\//, r => r.abort());
    const page = await bctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    await page.clock.install({ time: new Date('2026-11-14T18:00:00-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const NOMS = ['Carola Chávez', 'carola chavez', 'Jonathan Monje', 'Maria Flores', 'FLORES', 'Mirian Salazar', 'Miriam', 'Isabel Robledo', 'Mauricio Merida', 'Fernando Peinado',
                  'Juan Pablo Paredes', 'Andrea Orias', 'Fabián Godoy', 'GODOY', 'Eduardo Añez', 'ROHO', 'Pedro Nuevo', '', null];
    const DIAS = ['2026-09-15', '2026-10-31', '2026-11-01', '2026-11-14', '2027-01-10'];
    const pag = await page.evaluate(({ L, NOMS, DIAS }) => {
      STATE = L.filter(function (p) { return !esBorrador(p); });
      var o = {};
      o.suc = { desde: VENDEDOR_SUC_DESDE, act: VENDEDOR_SUCURSAL.map(function (x) { return [x[0].source, x[0].flags, x[1]]; }), antes: VENDEDOR_SUCURSAL_ANTES.map(function (x) { return [x[0].source, x[0].flags, x[1]]; }),
                sucs: SUCURSALES.map(function (x) { return x.n; }) };
      o.sv = {}; NOMS.forEach(function (n) { DIAS.forEach(function (d) { o.sv[n + '|' + d] = sucursalDeVendedor(n, d); }); });
      o.pv = {}; pryVentas().forEach(function (x) { if (x.amb === 'tienda' || x.amb === 'mayor') o.pv[x.id] = [x.amb, x.g, x.ym, x.reg, x.m, r2(x.bs), x.st]; });
      o.mv = { '2026-10': metaVendidoMes('2026-10'), '2026-11': metaVendidoMes('2026-11') };
      var R = proyeccionMes('2026-11'); o.mm = R.marcas.map(function (m) { var d = metaMarcaDatos(R, m); return d ? [m.g.k, r2(d.v), r2(d.falta), d.dq, Math.round(d.porDia), d.pv] : [m.g.k, null]; });
      o.bf = { dias: BF_DIAS, c: [2026, 2027, 2028, 2029, 2030].map(function (y) { return window.bfCampana(y); }), d: {} };
      var f = '2026-11-10'; while (f <= '2026-12-09') { [0, 600, 1199, 1201, 1439].forEach(function (mi) { var D = bfnDatos(f, mi);
        o.bf.d[f + '|' + mi] = D ? [D.n, D.nTot, D.hoyHab, D.aDesde, D.aHasta, D.aCorte, D.curso, r2(D.camp.bs), D.camp.n, r2(D.antes.bs), D.antes.n,
          D.marcas.map(function (g) { return [g.k, r2(g.c.bs), r2(g.a.bs)]; }), r2(D.mayor.c.bs), r2(D.mayor.a.bs)] : null; }); f = stockSumarDias(f, 1); }
      o.ccm = {}; ['2026-09', '2026-10', '2026-11'].forEach(function (ym) { var K = ccmCuenta(ym), vis = K.filas.filter(ccmFilaVe), t = 0;
        vis.forEach(function (r) { t = r2(t + r.to); }); o.ccm[ym] = { cerrado: K.cerrado, to: t, filas: vis.map(function (r) { return [normNombre(r.v), r.g, r2(r.bs), r2(r.ti || 0), r.pc, r2(r.to)]; }).sort() }; });
      o.tie = {}; ['2026-10'].forEach(function (ym) { o.tie[ym] = cxPryTiendas(proyeccionMes(ym)).map(function (t) { return [t.st, r2(t.vendido)]; }).sort(); });
      var TI = /\bTITANIO\b/, NO = /\b(SOM+IER(ES|S)?|BOX\s*SPRING|BASES?)\b/; o.cod = { t: [], n: [] };
      Object.keys(CODIGOS).forEach(function (k) { var d = sinTildes(CODIGOS[k].d).toUpperCase(); if (NO.test(d)) o.cod.n.push(k); else if (TI.test(d)) o.cod.t.push(k); });
      return o;
    }, { L, NOMS, DIAS });
    const srvSuc = { desde: C.WA_SUC_DESDE, act: Array.from(C.WA_SUC_VEND).map(x => [x[0].source, x[0].flags, x[1]]), antes: Array.from(C.WA_SUC_VEND_ANTES).map(x => [x[0].source, x[0].flags, x[1]]), sucs: Array.from(C.WA_SUCURSALES) };
    chk('10a VENDEDOR_SUCURSAL, VENDEDOR_SUCURSAL_ANTES, VENDEDOR_SUC_DESDE y los nombres de SUCURSALES son los mismos en la página y en el servidor', JSON.stringify(pag.suc) === JSON.stringify(srvSuc), [pag.suc, srvSuc]);
    const difSv = Object.keys(pag.sv).filter(k => { const q = k.split('|'); return C.waSucDeVend_(q[0] === 'null' ? null : q[0], q[1]) !== pag.sv[k]; });
    chk('10b sucursalDeVendedor = waSucDeVend_ con ' + Object.keys(pag.sv).length + ' nombres y días (antes y después del 01/11)', difSv.length === 0, difSv.slice(0, 5).map(k => k + ' página «' + pag.sv[k] + '»'));
    const srvPv = {}; C.waPvVentas_(L).forEach(x => { srvPv[x.id] = [x.amb, x.g, x.ym, x.reg, x.m, x.bs, x.st]; });
    const ids = Object.keys(pag.pv).concat(Object.keys(srvPv)).filter((x, i, a) => a.indexOf(x) === i), difPv = ids.filter(id => JSON.stringify(pag.pv[id]) !== JSON.stringify(srvPv[id]));
    chk('10c pryVentas = waPvVentas_ venta por venta (' + ids.length + ' ventas del equipo y de los mayoristas): ámbito, marca, mes, día y hora de carga, monto y tienda',
        ids.length > 30 && difPv.length === 0, difPv.slice(0, 5).map(id => id + ': página ' + JSON.stringify(pag.pv[id]) + ' · gs ' + JSON.stringify(srvPv[id])));
    const B14 = C.waBo_(RELOJ.ms), MM = C.waMetaMarcas_(C.waPvVentas_(L), C.waPorId_(L), B14, true);
    const srvMm = ['suena', 'heaven'].map(k => { const m = MM.marcas.find(x => x.k === k); return [k, m.v, m.falta, MM.dq, Math.round(m.porDia), m.pv]; });
    chk('10d metaMarcaDatos = waMetaMarcas_ (con hoy, como la página de día): lo vendido de cada marca, lo que falta, los días que quedan y por día', JSON.stringify(pag.mm) === JSON.stringify(srvMm), [pag.mm, srvMm]);
    const vk = (ym) => { const o = { suena: 0, heaven: 0 }; C.waPvVentas_(L).forEach(x => { if (x.amb === 'tienda' && x.ym === ym && o[x.g] != null) o[x.g] = Math.round((o[x.g] + x.bs) * 100) / 100; }); return o; };
    chk('10e metaVendidoMes de octubre y noviembre = lo del servidor', JSON.stringify(pag.mv) === JSON.stringify({ '2026-10': vk('2026-10'), '2026-11': vk('2026-11') }), [pag.mv, vk('2026-10'), vk('2026-11')]);
    chk('10f BF_DIAS y bfCampana (2026 a 2030) iguales', JSON.stringify(pag.bf.dias) === JSON.stringify(Array.from(C.WA_BF_DIAS)) &&
        JSON.stringify(pag.bf.c) === JSON.stringify([2026, 2027, 2028, 2029, 2030].map(y => C.waBfCampana_(y))), [pag.bf.c, [2026, 2027].map(y => C.waBfCampana_(y))]);
    const V14 = C.waPvVentas_(L), difBf = Object.keys(pag.bf.d).filter(k => {
      const q = k.split('|'), D = C.waBfDatos_(V14, q[0], Number(q[1]));
      const s = D ? [D.n, D.nTot, D.hoyHab, D.aDesde, D.aHasta, D.aCorte, D.curso, D.camp.bs, D.camp.n, D.antes.bs, D.antes.n,
        [['suena', D.marcas.suena.c.bs, D.marcas.suena.a.bs], ['heaven', D.marcas.heaven.c.bs, D.marcas.heaven.a.bs]].concat(pag.bf.d[k] && pag.bf.d[k][11].length > 2 ? [['sin', D.marcas.sin.c.bs, D.marcas.sin.a.bs]] : []),
        D.mayor.c.bs, D.mayor.a.bs] : null;
      return JSON.stringify(s) !== JSON.stringify(pag.bf.d[k]); });
    chk('10g bfnDatos = waBfDatos_ del 10/11 al 09/12, a 5 horas distintas (' + Object.keys(pag.bf.d).length + ' casos): el día de la campaña, los días de antes y su corte, la campaña, antes, cada marca y los mayoristas',
        Object.keys(pag.bf.d).length === 150 && difBf.length === 0, difBf.slice(0, 4).map(k => k + ' página ' + JSON.stringify(pag.bf.d[k])));
    const srvCcm = {}; ['2026-09', '2026-10', '2026-11'].forEach(ym => { const K = C.waCcmCuenta_(C.waPvVentas_(L), C.waPorId_(L), ym);
      srvCcm[ym] = { cerrado: K.cerrado, to: K.to, filas: K.filas.map(r => [C.waEfeNorm_(r.v), r.g, r.bs, r.ti || 0, r.pc, r.to]).sort() }; });
    chk('10h ccmCuenta = waCcmCuenta_: septiembre (cerrado), octubre (abierto: tramo, Titanio por precio y por el código, la ya pagada, la sacada y los ajustes de septiembre) y noviembre',
        JSON.stringify(pag.ccm) === JSON.stringify(srvCcm) && pag.ccm['2026-10'].to === 18662.5 && pag.ccm['2026-09'].to === 16150, [pag.ccm, srvCcm]);
    const CMo = C.waCmDatos_(L, '2026-10'), srvTie = CMo.tiendas.filter(t => t.n).map(t => [t.st, t.bs]).sort();
    chk('10i cxPryTiendas de octubre (cerrado) = las tiendas del mes cerrado del servidor', JSON.stringify(pag.tie['2026-10']) === JSON.stringify(srvTie), [pag.tie['2026-10'], srvTie]);
    chk('10k los códigos de Titanio y de somier (lo que ccmEsTitanio mira de CODIGOS) son los mismos en la página y en el servidor',
        JSON.stringify(pag.cod.t.slice().sort()) === JSON.stringify(Array.from(C.WA_CCM_COD_TITANIO).sort()) && JSON.stringify(pag.cod.n.slice().sort()) === JSON.stringify(Array.from(C.WA_CCM_COD_NO).sort()), pag.cod);
    chk('10j sin errores en la página', errores.length === 0, errores);
    await browser.close();
  } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); }

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
