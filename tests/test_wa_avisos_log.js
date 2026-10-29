/* 📥✅💾 DOS AVISOS MÁS A LOGÍSTICA Y EL RESPALDO DIARIO (29/10, §4no, servidor 2026-10-29-a).

   El dueño (29/10) eligió la «2» y la «4» de la lista de mejoras:
     · la 2: que el bot le avise a logística por WhatsApp, sin que nadie tenga el panel abierto, a las 10:00 si falta el Excel de
       existencias de hoy (`logistica_excel_falta`) y a las 19:00 (el sábado 13:30) si quedan entregas de hoy sin marcar en el
       ✅ Cierre de entregas (`logistica_cierre_falta`);
     · la 4: el respaldo diario de la planilla (`backupDiario`, que ya existía pero había que prender a mano) lo instala
       `instalarDisparadores`, y `probarAntesDeImplementar` dice cuántas copias hay y de cuándo es la última.
   Secciones:
     1. El Excel: qué almacén falta (PTF de `STOCK.c`, Banzer e IM de `STOCK.g`; un nombre viejo que no se sube hace más de 7 días
        no se reclama), a las 09:50 nada, a las 10:05 a Ernesto y a Alba (no a David), una vez por día, sábado sí, domingo y feriado
        no, con todo subido no sale, subido mientras esperaba el reintento no sale, sin la fila del stock «de hace días».
     2. El cierre: las entregas de HOY sin ✅ (sin ventas de tienda, borradores de Kommo ni filas del sistema; ATC y RPT sí), la
        mañana primero, «1 pedido» / «3 pedidos», la lista entera hasta 250 letras con «y N más», a las 18:50 nada, a las 19:05 sí,
        el sábado a las 13:35, con todo marcado no sale.
     3. A quién: WA_AVISOS manda sobre WA_PEDIR_HOY; sin ninguna de las dos, nada; WA_PRUEBA lo desvía.
     4. Las plantillas (WA_PLANTILLAS, WA_TIPOS) y probarAntesDeImplementar (a quién van, el respaldo con y sin disparador).
     5. instalarDisparadores deja `backupDiario` una vez por día, sin duplicarlo.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia.

   Se corre:  node tests/test_wa_avisos_log.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

/* ── El servidor de mentira (como test_wa_pedir_hoy.js) ── */
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
/* Drive de mentira: la carpeta de los respaldos con las copias que se le pongan (fechas). */
function hacerDrive(copias) {
  const archivos = (copias || []).map(t => ({ getDateCreated: () => new Date(Date.parse(t.replace(' ', 'T') + ':00-04:00')) }));
  const it = (L) => { let i = 0; return { hasNext: () => i < L.length, next: () => L[i++] }; };
  return {
    getFoldersByName: (n) => it(copias ? [{ getName: () => n, getFiles: () => it(archivos) }] : []),
    createFolder: () => { throw new Error('probar no crea carpetas'); }
  };
}
function servidor(props, drive) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 };
  const triggers = [];
  const nuevo = (fn, tipo, extra) => { const t = Object.assign({ fn, tipo, getHandlerFunction: () => fn }, extra || {}); triggers.push(t); return t; };
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
    DriveApp: drive || {}, Utilities: { formatDate: (d) => String(d) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => nuevo(fn, 'after', { ms }) }),
                                                 everyMinutes: (n) => ({ create: () => nuevo(fn, 'every', { n }) }),
                                                 everyDays: (d) => ({ atHour: (h) => ({ create: () => nuevo(fn, 'daily', { d, h }) }) }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  /* Las filas van directo a la hoja (sin pasar por «guardar»: así no se encolan las confirmaciones de cada pedido). */
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const fila = (id) => sh._datos.findIndex((f, i) => i > 0 && String(f[0]) === id);
  const cambiar = (id, cambio) => { const i = fila(id), p = Object.assign(ctx.rowToRec_(sh._datos[i]), cambio); sh._datos[i] = ctx.recToRow(p); };
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  const limpiar = () => { meta.llamadas.length = 0; };
  return { ctx, sh, P, meta, triggers, cargar, cambiar, hoja, salen, limpiar, repaso: () => ctx.waRepaso() };
}
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001, David:59172000002',
             WA_PEDIR_HOY: 'Ernesto:59171000001, Alba:59173000003' };
const EX = 'logistica_excel_falta', CI = 'logistica_cierre_falta';

/* La fila del stock: PTF en `c`, los otros almacenes en `g`, con la fecha de su último Excel. */
const STK = (fPtf, g) => ({ id: '__stock__', oc: '', vendedor: '', cliente: '📦 STOCK', fecha: '', turno: '', productos: [], celular: '',
  observaciones: JSON.stringify({ c: { f: fPtf, u: { 'TITANIO|140x190': 4 } }, g: g || {}, pv: 3 }), entregado: false, rev: 3, ts: 1 });
const G3 = (fB, fIM, viejo) => {
  const g = { '01-05-025  Almacen Distribucion Banzer': { f: fB, u: {} }, 'IM - PRODUCTOTERMINADO': { f: fIM, u: {} } };
  if (viejo) g['Almacen Banzer viejo nombre'] = { f: viejo, u: {} };
  return g;
};
/* Un pedido (las mismas formas que el panel guarda). */
const P = (id, fecha, cliente, o) => Object.assign({ id, oc: '10-' + id, vendedor: 'Maria Flores', cliente, fecha, turno: 'AM', celular: '70000000', zona: 'Norte',
  direccion: 'Calle 1', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, chk: 'ok' }], saldo: 0, acuenta: 0, pagado: true, metodoPago: '',
  estado: '', entregado: false, vehiculo: 'KSC', chofer: 'Luis', ts: Date.parse('2026-10-20T10:00:00-04:00'), fotos: [], rev: 1 }, o || {});

// ══ 1. El Excel de las 10:00 ═══════════════════════════════════════════════════
console.log('\n── 1. El Excel de existencias de las 10:00 ──');
{
  const S = servidor(ON); S.cargar([STK('2026-10-28', G3('2026-10-28', '2026-10-28', '2026-10-10'))]);
  poner('2026-10-29 09:50'); S.repaso();
  chk('09:50: nada', S.salen(EX).length === 0, S.salen());
  poner('2026-10-29 10:05'); S.repaso();
  const s = S.salen(EX);
  chk('10:05: logistica_excel_falta a Ernesto y a Alba (no a David)', s.length === 2 && s.map(x => x.to).sort().join() === '59171000001,59173000003', S.salen());
  chk('los 3 datos: el día, «PTF, Banzer e IM» (en el orden del archivo) y «de ayer»',
    s[0] && s[0].p.join(' | ') === 'jueves 29/10 | PTF, Banzer e IM | de ayer', s[0] && s[0].p);
  chk('el nombre viejo que no se sube desde el 10/10 no se reclama', s[0] && !/viejo/i.test(s[0].p[1]), s[0] && s[0].p);
  chk('la hoja «Bot WhatsApp» lo anota como «Logística: falta el Excel»', S.hoja().filter(f => f[3] === 'Logística: falta el Excel' && f[7] === '✅ enviado').length === 2, S.hoja().map(f => f[3] + ' ' + f[7]));
  S.limpiar(); poner('2026-10-29 10:20'); S.repaso();
  chk('10:20: no se repite', S.salen(EX).length === 0);
}
{
  const S = servidor(ON); S.cargar([STK('2026-10-29', G3('2026-10-29', '2026-10-27'))]);
  poner('2026-10-29 10:05'); S.repaso();
  const s = S.salen(EX);
  chk('PTF y Banzer subidos hoy, IM del martes: solo «IM» y «del martes 27/10»', s.length === 2 && s[0].p[1] === 'IM' && s[0].p[2] === 'del martes 27/10', s.map(x => x.p));
}
{
  const S = servidor(ON); S.cargar([STK('2026-10-27', G3('2026-10-29', '2026-10-28'))]);
  poner('2026-10-29 10:05'); S.repaso();
  const s = S.salen(EX);
  chk('PTF del martes e IM de ayer: «PTF e IM» y el saldo «de ayer» (el más nuevo de los que faltan)', s[0] && s[0].p[1] === 'PTF e IM' && s[0].p[2] === 'de ayer', s.map(x => x.p));
}
{
  const S = servidor(ON); S.cargar([STK('2026-10-29', G3('2026-10-29', '2026-10-29'))]);
  poner('2026-10-29 10:05'); S.repaso();
  chk('con los tres Excel de hoy: no sale ni se anota', S.salen(EX).length === 0 && !S.hoja().some(f => f[3] === 'Logística: falta el Excel'), S.hoja());
}
{
  const S = servidor(ON); S.cargar([P('a1', '2026-10-29', 'SIN STOCK')]);
  poner('2026-10-29 10:05'); S.repaso();
  const s = S.salen(EX);
  chk('sin la fila del stock: falta «PTF» y el saldo es «de hace días»', s[0] && s[0].p[1] === 'PTF' && s[0].p[2] === 'de hace días', s.map(x => x.p));
}
{
  const S = servidor(ON); S.cargar([STK('2026-10-28', G3('2026-10-28', '2026-10-28'))]);
  S.meta.responder = (b) => (b && b.template && b.template.name === EX) ? { code: 503, body: { error: { message: 'ocupado' } } } : null;
  poner('2026-10-29 10:05'); S.repaso();
  chk('Meta ocupado a las 10:05: queda para reintentar', S.hoja().filter(f => f[3] === 'Logística: falta el Excel' && /reintenta/.test(f[7])).length === 2, S.hoja().map(f => f[7]));
  S.meta.responder = null; S.limpiar();
  S.cambiar('__stock__', { observaciones: STK('2026-10-29', G3('2026-10-29', '2026-10-29')).observaciones });
  poner('2026-10-29 10:20'); S.repaso();
  chk('mientras esperaba lo subieron: el reintento no sale', S.salen(EX).length === 0, S.salen());
}
{
  const S = servidor(ON); S.cargar([STK('2026-10-30', G3('2026-10-30', '2026-10-30'))]);
  poner('2026-10-31 10:05'); S.repaso();
  chk('sábado 10:05: sale (el camión sale el sábado)', S.salen(EX).length === 2 && S.salen(EX)[0].p[0] === 'sábado 31/10', S.salen(EX).map(x => x.p));
  S.limpiar(); poner('2026-11-01 10:05'); S.repaso();
  chk('domingo: nada', S.salen(EX).length === 0);
  S.limpiar(); poner('2026-11-02 10:05'); S.repaso();
  chk('feriado (Todos Santos): nada', S.salen(EX).length === 0);
  S.limpiar(); poner('2026-11-03 12:30'); S.repaso();
  chk('el martes, con el bot parado hasta las 12:30 (más de 2 horas): ese día ya no sale', S.salen(EX).length === 0);
}

// ══ 2. El cierre de entregas de las 19:00 ═══════════════════════════════════════
console.log('\n── 2. El cierre de entregas de las 19:00 ──');
const HOY = [
  P('b1', '2026-10-29', 'JUAN PEREZ GOMEZ', { turno: 'PM', nroDia: 5 }),
  P('b2', '2026-10-29', 'ANA ROJAS', { turno: 'AM', nroDia: 2 }),
  P('b3', '2026-10-29', 'LUIS VACA', { oc: 'ATC 10-012', turno: 'AM', nroDia: 3 }),
  P('b4', '2026-10-29', 'YA ENTREGADO', { entregado: true }),
  P('b5', '2026-10-29', 'VENTA TIENDA', { direccion: 'SALIÓ DE TIENDA · Carmelo', zona: 'TIENDA' }),
  P('b6', '2026-10-29', 'BORRADOR', { estado: 'Borrador Kommo' }),
  P('b7', '2026-10-30', 'MAÑANA', {}),
  P('b8', '2026-10-28', 'AYER SIN MARCAR', {}),
  STK('2026-10-29', G3('2026-10-29', '2026-10-29'))
];
{
  const S = servidor(ON); S.cargar(HOY);
  poner('2026-10-29 18:50'); S.repaso();
  chk('18:50: nada', S.salen(CI).length === 0, S.salen());
  poner('2026-10-29 19:05'); S.repaso();
  const s = S.salen(CI);
  chk('19:05: logistica_cierre_falta a Ernesto y a Alba', s.length === 2 && s.map(x => x.to).sort().join() === '59171000001,59173000003', S.salen());
  chk('«3 pedidos»: los de hoy sin ✅ (la ATC también); sin el entregado, la venta de tienda, el borrador, el de mañana ni el de ayer',
    s[0] && s[0].p[0] === 'jueves 29/10' && s[0].p[1] === '3 pedidos', s[0] && s[0].p);
  chk('la mañana primero y en el orden del día; el cliente con sus dos primeras palabras',
    s[0] && s[0].p[2] === 'OC 10-b2 (ANA ROJAS) · ATC 10-012 (LUIS VACA) · OC 10-b1 (JUAN PEREZ)', s[0] && s[0].p[2]);
  chk('la hoja lo anota como «Logística: falta el cierre»', S.hoja().filter(f => f[3] === 'Logística: falta el cierre' && f[7] === '✅ enviado').length === 2);
  S.limpiar(); poner('2026-10-29 19:30'); S.repaso();
  chk('19:30: no se repite', S.salen(CI).length === 0);
}
{
  const S = servidor(ON); S.cargar(HOY.map(p => (p.fecha === '2026-10-29' && p.id !== '__stock__') ? Object.assign({}, p, { entregado: true }) : p));
  poner('2026-10-29 19:05'); S.repaso();
  chk('con todo lo de hoy marcado: no sale ni se anota', S.salen(CI).length === 0 && !S.hoja().some(f => f[3] === 'Logística: falta el cierre'), S.hoja());
}
{
  const S = servidor(ON); S.cargar([HOY[1]]);
  poner('2026-10-29 19:05'); S.repaso();
  chk('con uno: «1 pedido»', S.salen(CI)[0] && S.salen(CI)[0].p[1] === '1 pedido', S.salen(CI).map(x => x.p));
}
{
  const muchos = []; for (let i = 1; i <= 20; i++) muchos.push(P('m' + i, '2026-10-29', 'CLIENTE NUMERO' + i + ' APELLIDO', { nroDia: i }));
  const S = servidor(ON); S.cargar(muchos);
  poner('2026-10-29 19:05'); S.repaso();
  const t = S.salen(CI)[0] && S.salen(CI)[0].p[2];
  chk('con 20: entran enteros los que caben y «y N más», sin pasar de 250 letras', !!t && /^OC 10-m1 \(CLIENTE NUMERO1\)/.test(t) && /\) y \d+ más$/.test(t) && t.length <= 250, t);
  chk('ningún dato con saltos de línea', S.salen().every(x => x.p.every(v => v && !/[\n\r]/.test(v))));
}
{
  const S = servidor(ON); S.cargar([P('s1', '2026-10-31', 'SABADO AM', {}), STK('2026-10-31', G3('2026-10-31', '2026-10-31'))]);
  poner('2026-10-31 13:20'); S.repaso();
  chk('sábado 13:20: nada todavía', S.salen(CI).length === 0);
  poner('2026-10-31 13:35'); S.repaso();
  chk('sábado 13:35: sale (el sábado sale solo la mañana)', S.salen(CI).length === 2 && S.salen(CI)[0].p[0] === 'sábado 31/10', S.salen(CI).map(x => x.p));
}
{
  const S = servidor(ON); S.cargar([P('d1', '2026-11-01', 'DOMINGO', {}), P('f1', '2026-11-02', 'FERIADO', {})]);
  poner('2026-11-01 19:05'); S.repaso(); poner('2026-11-02 19:05'); S.repaso();
  chk('domingo y feriado: nada', S.salen(CI).length === 0);
}
{
  const S = servidor(ON); S.cargar(HOY);
  S.meta.responder = (b) => (b && b.template && b.template.name === CI) ? { code: 503, body: { error: { message: 'ocupado' } } } : null;
  poner('2026-10-29 19:05'); S.repaso();
  S.meta.responder = null; S.limpiar();
  ['b1', 'b2', 'b3'].forEach(id => S.cambiar(id, { entregado: true }));
  poner('2026-10-29 19:20'); S.repaso();
  chk('mientras esperaba el reintento hicieron el cierre: no sale', S.salen(CI).length === 0, S.salen());
}

// ══ 3. A quién ══════════════════════════════════════════════════════════════════
console.log('\n── 3. A quién van ──');
{
  const S = servidor(Object.assign({}, ON, { WA_AVISOS: 'Ernesto:59171000001' })); S.cargar([STK('2026-10-28', G3('2026-10-28', '2026-10-28'))]);
  poner('2026-10-29 10:05'); S.repaso();
  chk('con WA_AVISOS van solo ahí (no a Alba de WA_PEDIR_HOY)', S.salen(EX).map(x => x.to).join() === '59171000001', S.salen(EX).map(x => x.to));
}
{
  const S = servidor(Object.assign({}, ON, { WA_PEDIR_HOY: '' })); S.cargar([STK('2026-10-28', G3('2026-10-28', '2026-10-28'))].concat(HOY.slice(0, 3)));
  poner('2026-10-29 10:05'); S.repaso(); poner('2026-10-29 19:05'); S.repaso();
  chk('sin WA_PEDIR_HOY ni WA_AVISOS: ninguno de los dos sale', S.salen(EX).length === 0 && S.salen(CI).length === 0, S.salen().map(x => x.pl));
}
{
  const S = servidor(Object.assign({}, ON, { WA_PRUEBA: '70999888' })); S.cargar([STK('2026-10-28', G3('2026-10-28', '2026-10-28'))]);
  poner('2026-10-29 10:05'); S.repaso();
  chk('con WA_PRUEBA va todo a ese número', S.salen(EX).length === 2 && S.salen(EX).every(x => x.to === '59170999888'), S.salen(EX).map(x => x.to));
}
{
  const S = servidor(Object.assign({}, ON, { WA_ACTIVO: '0' })); S.cargar([STK('2026-10-28', G3('2026-10-28', '2026-10-28'))]);
  poner('2026-10-29 10:05'); S.repaso();
  chk('con el bot apagado (WA_ACTIVO): nada', S.salen().length === 0);
}

// ══ 4. Las plantillas y probar ══════════════════════════════════════════════════
console.log('\n── 4. Las plantillas y probarAntesDeImplementar ──');
{
  const S = servidor(ON);
  [[EX, 3], [CI, 3]].forEach(([n, k]) => {
    const pl = S.ctx.WA_PLANTILLAS.find(x => x.n === n), vars = pl ? (pl.t.match(/\{\{\d\}\}/g) || []) : [];
    chk(n + ' está en WA_PLANTILLAS con {{1}}…{{' + k + '}} y un ejemplo de ' + k + ' datos', !!pl && vars.join() === Array.from({ length: k }, (_, i) => '{{' + (i + 1) + '}}').join() && pl.e.length === k, pl && vars);
    chk('…no empieza ni termina con un dato (Meta la rechaza)', !!pl && !/^\{\{/.test(pl.t) && !/\}\}$/.test(pl.t.trim()));
  });
  chk('WA_TIPOS.ex y WA_TIPOS.ci apuntan a esas plantillas', S.ctx.WA_TIPOS.ex.plantilla === EX && S.ctx.WA_TIPOS.ci.plantilla === CI);
  const txt = JSON.stringify(S.ctx.probarAntesDeImplementar());
  chk('probarAntesDeImplementar dice a quién van los avisos', /Excel del día \(10:00\) y del cierre de entregas \(19:00\) van a: Ernesto, Alba \(los de WA_PEDIR_HOY\)/.test(txt), (txt.match(/avisos del Excel[^"]{0,140}/) || [''])[0]);
  const S2 = servidor(Object.assign({}, ON, { WA_AVISOS: 'Alba:123' }));
  chk('…y avisa un número de WA_AVISOS que no entiende', /WA_AVISOS hay número/.test(JSON.stringify(S2.ctx.probarAntesDeImplementar())));
  chk('la versión es la 2026-10-29-a en el .gs', S.ctx.SCRIPT_VERSION === '2026-10-29-a');
}
{
  poner('2026-10-29 11:00');
  const sinNada = JSON.stringify(servidor(ON, hacerDrive(null)).ctx.probarAntesDeImplementar());
  chk('respaldo: sin copias ni disparador, pide «instalarDisparadores»', /Todavía no hay ninguna copia de respaldo de la planilla: ejecutá «instalarDisparadores»/.test(sinNada), (sinNada.match(/respaldo[^"]{0,120}/) || [''])[0]);
  const S0 = servidor(ON, hacerDrive([])); S0.ctx.instalarDisparadores();
  const recien = S0.ctx.probarAntesDeImplementar().lineas.find(l => /Respaldo de la planilla/.test(l)) || '';
  chk('respaldo: recién instalado, sin copias todavía, ✅ «la primera copia sale esta madrugada»', /^✅ Respaldo de la planilla: el disparador está; la primera copia sale esta madrugada/.test(recien), recien);
  const S3 = servidor(ON, hacerDrive(['2026-10-27 02:10', '2026-10-29 02:12', '2026-10-28 02:11']));
  const sinDisp = JSON.stringify(S3.ctx.probarAntesDeImplementar());
  chk('respaldo: 3 copias sin disparador, dice la última y avisa', /3 copia\(s\).{0,80}la última del 29\/10 02:12, pero no está el disparador/.test(sinDisp), (sinDisp.match(/Respaldo de la planilla[^"]{0,200}/) || [''])[0]);
  S3.ctx.instalarDisparadores();
  const conDisp = S3.ctx.probarAntesDeImplementar();
  const linea = conDisp.lineas.find(l => /Respaldo de la planilla/.test(l)) || '';
  chk('respaldo: con el disparador y una copia de esta madrugada, ✅', /^✅ Respaldo de la planilla: 3 copia\(s\).{0,80}la última del 29\/10 02:12\.$/.test(linea), linea);
  poner('2026-10-31 11:00');
  const viejo = (S3.ctx.probarAntesDeImplementar().lineas.find(l => /Respaldo de la planilla/.test(l)) || '');
  chk('respaldo: la última de hace dos días, ⚠️ «mirá backupDiario en Ejecuciones»', /^⚠️ .*tiene más de un día\. Mirá «backupDiario» en Ejecuciones\.$/.test(viejo), viejo);
}

// ══ 5. instalarDisparadores ═════════════════════════════════════════════════════
console.log('\n── 5. instalarDisparadores ──');
{
  const S = servidor(ON);
  S.ctx.instalarDisparadores(); S.ctx.instalarDisparadores();
  const b = S.triggers.filter(t => t.fn === 'backupDiario');
  chk('deja backupDiario una vez por día de 2 a 3 (y correrlo dos veces no lo duplica)', b.length === 1 && b[0].tipo === 'daily' && b[0].d === 1 && b[0].h === 2, S.triggers.map(t => t.fn + ':' + t.tipo));
  chk('…y los de siempre siguen (Kommo, bot, GPS, fotos)', ['kommoRepaso', 'waRepaso', 'gpsRepaso', 'barrerFotosHuerfanas'].every(fn => S.triggers.filter(t => t.fn === fn).length === 1), S.triggers.map(t => t.fn));
  chk('el mensaje lo nombra', /backupDiario/.test(S.ctx.instalarDisparadores()));
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
