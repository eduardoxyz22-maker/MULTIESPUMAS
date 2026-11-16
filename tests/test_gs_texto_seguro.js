/* 🧾📏 SERVIDOR 2026-11-16-a: LO QUE ENCONTRÓ LA REVISIÓN DE FABLE ANTES DE IMPLEMENTAR (puntos 3 y 6, y dos menores).
     1. Texto seguro en las celdas: `celdaTexto_` / `celdaLeer_` (un texto que empieza con «=», «+», «-», «@» o «'» va con «'» adelante, y se
        saca al leer); números, booleanos y fechas pasan sin tocar; `celTexto_` y `mallCelda_` siguen igual para lo que ya hacían.
     2. «Pedidos»: `recToRow` marca los campos de texto libre y `rowToRec_` devuelve el texto original (con la planilla de prueba, que conserva
        el «'», y con una que se lo come, como Google); el id, la fecha, el JSON y los números no se tocan.
     3. Guardar por `doPost`: la fila queda marcada, la lectura devuelve lo que se escribió y las columnas de TEXTO quedan con formato `@` una vez
        (TXT_COLS), nunca la fecha, el sello, la plata ni el JSON.
     4. Kommo: un nombre que es solo un teléfono es genérico; la reparación del nombre escribe como texto.
     5. «Bot WhatsApp»: lo que escribe un cliente («=HYPERLINK(…)») y su nombre de perfil («+591 …») quedan como texto, y el panel los recibe tal
        cual; «Borrados», «Geo» e «IA comprobantes» también.
     6. El aviso de Meta («entregado», «leído») va a la fila de SU mensaje aunque la hoja se haya recortado en el medio.
     7. El cierre del día (v3 y Black Friday) con 9 vendedoras de nombre largo y «por qué se movió»: el cuerpo ya rellenado ≤ 1.024 (sin el tope
        se pasaba); el del mes también; recortes con «…» y por « · ».
     8. Meta contesta 132005 (demasiado largo): sale el respaldo. Si lo nuevo del cierre (`waCdMas_`) falla, el cierre sale igual (v2, 7 datos).
     9. `waFletePendiente_` lee «1.500» como 1.500 (antes 1,5).
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta y Claude de mentira.
   Se corre:  node tests/test_gs_texto_seguro.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otro) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); } };

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
/* La planilla de mentira. `opts.google`: como Google con formato automático, un «'» de adelante NO queda guardado (es la marca de «texto»). Si
   no, queda (como una columna con formato de texto, o la planilla de las otras pruebas). `formatos` anota cada `setNumberFormat` por A1. */
function hacerPlanilla(filas, opts) {
  const datos = filas.map(f => f.slice()), formatos = [];
  const g = (v) => (opts && opts.google && typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v;
  const sh = {
    _datos: datos, _formatos: formatos, _antesDeLeer: null,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.map(g)); },
    deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => {
      if (typeof fila === 'string') return { setNumberFormat: (f) => { formatos.push([fila, f]); return this; }, setFontWeight() {} };
      return {
        getValue: () => (datos[fila - 1] || [])[col - 1],
        setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = g(v); return { setFontWeight() {} }; },
        getValues: () => {
          const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); }
          if (sh._antesDeLeer) { const h = sh._antesDeLeer; sh._antesDeLeer = null; h(); }   // (§6) otra ejecución recorta la hoja justo después de leer
          return out;
        },
        setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = g(v[i][j]); } },
        setFontWeight: () => {}, setNumberFormat: (f) => { formatos.push([fila + ',' + col, f]); }
      };
    }
  };
  return sh;
}
const RELOJ = { ms: Date.parse('2026-11-12T10:00:00-04:00') };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props, opts) {
  const sh = hacerPlanilla([HDR], opts), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 }, triggers = [];
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : JSON.stringify(body)) });
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet: (n) => (hojas[n] = hacerPlanilla([], opts)) }),
                      flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com|anthropic\.com/.test(url)) return res(500, {});
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      return res(r ? r.code : 200, r ? (r.body || {}) : { messages: [{ id: 'wamid.out' + (++meta.n) }] });
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
  const leer = (r) => JSON.parse(r._t);
  const post = (body) => leer(ctx.doPost({ postData: { contents: JSON.stringify(body) }, parameter: {} }));
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  return { ctx, sh, hojas, P, meta, cargar, post, salen, repaso: () => ctx.waRepaso() };
}
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const P = (id, vend, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + String(id).toUpperCase(), fecha: '2026-11-20', turno: 'AM',
  celular: '', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 1000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: '', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '',
  ts: TS('2026-11-02'), nroDia: 0, fotos: [], rev: 1 }, o || {});
const SISTEMA = (id, obj) => P(id, '', { oc: '', cliente: 'FILA DEL SISTEMA', fecha: '', turno: '', productos: [], observaciones: JSON.stringify(obj), ts: TS('2026-11-01', '09:00') });
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', WA_HOOK_KEY: 'clave-hook',
  WA_DUENO: 'Eduardo:59177000007' };
const fijo = (S, n) => { const pl = Array.from(S.ctx.WA_PLANTILLAS).find(x => x.n === n); return pl ? pl.t.replace(/\{\{\d+\}\}/g, '').length : NaN; };
const cuerpo = (S, x) => fijo(S, x.pl) + x.p.reduce((a, t) => a + t.length, 0);

seccion('1. celdaTexto_ / celdaLeer_', () => {
  const S = servidor({}), C = S.ctx;
  chk('1a las cuatro existen', ['celdaTexto_', 'celdaLeer_', 'filaTexto_', 'filaLeer_'].every(f => typeof C[f] === 'function'));
  const marcados = ['=1+1', '+ 2 almohadas', '-centro', '@x', "'hola", "''x", '=IMPORTDATA("http://x")', '-', '+591 70000000'];
  chk('1b lo que Google toma por fórmula (y el «\'» de adelante) va con «\'»', marcados.every(x => C.celdaTexto_(x) === "'" + x), marcados.map(x => C.celdaTexto_(x)));
  const iguales = ['hola', '12', '', ' =con espacio', '— guion largo', 'Carola Chavez', '11-012', '[{"a":1}]', '{"v":1}', 'ATC 10-001'];
  chk('1c lo demás, tal cual (también «12» y «11-012»: nada de «parece un número»)', iguales.every(x => C.celdaTexto_(x) === x), iguales.map(x => C.celdaTexto_(x)));
  const d = new Date(2026, 10, 12);
  chk('1d un número, un booleano, una fecha y null pasan sin tocar', C.celdaTexto_(12) === 12 && C.celdaTexto_(-5) === -5 && C.celdaTexto_(true) === true && C.celdaTexto_(d) === d && C.celdaTexto_(null) === null &&
      C.celdaLeer_(-5) === -5 && C.celdaLeer_(d) === d);
  const todos = marcados.concat(iguales);
  chk('1e ida y vuelta con la marca guardada (formato de texto, o la planilla de prueba): celdaLeer_(celdaTexto_(x)) === x', todos.every(x => C.celdaLeer_(C.celdaTexto_(x)) === x), todos.filter(x => C.celdaLeer_(C.celdaTexto_(x)) !== x));
  const google = (v) => (typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v;
  const sinAmb = todos.filter(x => !/^'[=+\-@']/.test(x));   // «'=…» escrito así a propósito: en Google no se distingue de la marca
  chk('1f ida y vuelta como Google (se come el «\'» de la marca)', sinAmb.every(x => C.celdaLeer_(google(C.celdaTexto_(x))) === x), sinAmb.filter(x => C.celdaLeer_(google(C.celdaTexto_(x))) !== x));
  chk('1g celTexto_ como antes: null → «», un número → texto, «+591…» marcado; mallCelda_/mallDeCelda_ con la misma regla',
      C.celTexto_(null) === '' && C.celTexto_(70000000) === '70000000' && C.celTexto_('+591 7') === "'+591 7" && C.mallCelda_('-x') === "'-x" && C.mallCelda_(null) === '' &&
      C.mallDeCelda_("'-x") === '-x' && C.mallDeCelda_("'''x") === "''x" && C.mallDeCelda_(null) === '');
  chk('1h filaTexto_ solo toca los textos', JSON.stringify(C.filaTexto_(['=a', 5, '-17.7', true, 'b'])) === JSON.stringify(["'=a", 5, "'-17.7", true, 'b']));
});

const RARO = { cliente: '+ 2 almohadas', nota: '=1+1', direccion: '-centro', observaciones: '@llamar antes', zona: '-Norte', facturarA: '=SUM(A1)', nit: '+591',
  vendedor: 'Carola Chavez', chofer: '-', metodoPago: 'Efectivo 500', turno: 'AM', maps: '', estado: '', garantia: '', vehiculo: '' };
seccion('2. «Pedidos»: recToRow y rowToRec_', () => {
  const S = servidor({}), C = S.ctx;
  const p = P('t1', 'Carola Chavez', Object.assign({ celular: '+591 7000 0000', productos: [{ desc: '- 2 ALMOHADAS', medida: '50x70', cant: 2, precio: 100 }], saldo: -5, acuenta: 100, nroDia: 3 }, RARO));
  const row = C.recToRow(p);
  const col = (h) => row[HDR.indexOf(h)];
  chk('2a Cliente, Nota, Dirección, Observaciones, Zona, Facturar a, NIT, Chofer y Productos con «\'»',
      col('Cliente') === "'+ 2 almohadas" && col('Nota de venta') === "'=1+1" && col('Dirección') === "'-centro" && col('Observaciones') === "'@llamar antes" &&
      col('Zona') === "'-Norte" && col('Facturar a') === "'=SUM(A1)" && col('NIT') === "'+591" && col('Chofer') === "'-" && /^'- 2 ALMOHADAS/.test(col('Productos')), row);
  chk('2b el celular como antes («\'+591 …»), el vendedor y el método de pago sin tocar', col('Celular') === "'+591 7000 0000" && col('Vendedor') === 'Carola Chavez' && col('Método pago') === 'Efectivo 500');
  chk('2c el id, la fecha, el JSON de productos y los números NO llevan «\'»', col('id') === 't1' && col('Fecha') === '2026-11-20' && /^\[/.test(col('_productos_json')) &&
      col('Saldo (Bs)') === -5 && col('A cuenta (Bs)') === 100 && col('N° del día') === 3 && col('ts') === p.ts, [col('id'), col('Fecha'), col('Saldo (Bs)')]);
  const r = C.rowToRec_(row);
  const campos = ['cliente', 'nota', 'direccion', 'observaciones', 'zona', 'facturarA', 'nit', 'vendedor', 'chofer', 'metodoPago', 'turno'];
  chk('2d rowToRec_ devuelve el texto original (la marca guardada)', campos.every(k => r[k] === p[k]) && r.celular === '+591 7000 0000' && r.productos[0].desc === '- 2 ALMOHADAS',
      campos.filter(k => r[k] !== p[k]).map(k => k + '=' + r[k]));
  const google = row.map(v => (typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v);
  const rg = C.rowToRec_(google);
  chk('2e …y también con la planilla de Google (que no devuelve el «\'»)', campos.every(k => rg[k] === p[k]) && rg.celular === '+591 7000 0000', campos.filter(k => rg[k] !== p[k]));
  const sinJson = row.slice(); sinJson[HDR.indexOf('_productos_json')] = '';
  chk('2f sin el JSON, los productos salen del texto sin la marca', /^- 2 ALMOHADAS/.test(C.rowToRec_(sinJson).productos[0].desc), C.rowToRec_(sinJson).productos);
  const normal = P('t2', 'Mirian Salazar', { cliente: 'JUAN PEREZ', observaciones: 'llamar antes', nota: '4567' });
  chk('2g un pedido de siempre queda igual que antes (sin ninguna marca)', C.recToRow(normal).every(v => typeof v !== 'string' || v.charAt(0) !== "'"));
});

seccion('3. Guardar por doPost y leer', () => {
  const S = servidor({});
  const p = P('g1', 'Carola Chavez', Object.assign({ rev: 0, ts: TS('2026-11-12', '09:00'), fecha: '2026-11-20' }, RARO));
  const r = S.post({ action: 'save', pedido: p });
  chk('3a guardó', r.ok === true, r);
  const fila = S.sh._datos.find(f => f[0] === 'g1');
  chk('3b la fila tiene la marca en el cliente, la nota y la dirección', fila && fila[4] === "'+ 2 almohadas" && fila[22] === "'=1+1" && fila[9] === "'-centro", fila && [fila[4], fila[22], fila[9]]);
  chk('3c el eco del guardado (la fila releída) dice el texto original', r.pedido && r.pedido.cliente === '+ 2 almohadas' && r.pedido.nota === '=1+1' && r.pedido.direccion === '-centro', r.pedido);
  const L = S.post({ action: 'list' });
  const q = (L.pedidos || []).find(x => x.id === 'g1') || {};
  chk('3d la lectura del panel también', q.cliente === '+ 2 almohadas' && q.observaciones === '@llamar antes' && q.facturarA === '=SUM(A1)' && q.nit === '+591', q);
  const fmt = S.sh._formatos.map(x => x.join(' '));
  const quiero = ['C:C', 'D:D', 'E:E', 'F:F', 'H:H', 'I:I', 'J:J', 'K:K', 'P:P', 'Q:Q', 'R:R', 'T:T', 'U:U', 'V:V', 'W:W', 'Y:Y', 'Z:Z'].map(a => a + ' @');
  chk('3e las columnas de TEXTO con formato «@» (N° OC, Vendedor … NIT) y «Celular»', quiero.every(a => fmt.indexOf(a) >= 0) && fmt.indexOf('G:G @') >= 0, fmt);
  chk('3f nunca la fecha (B), ts (N), la plata (M, X), el JSON (O), el N° del día (AA) ni el sello', !fmt.some(a => /^(A|B|L|M|N|O|S|X|AA|AB|AC|AD):/.test(a)), fmt);
  chk('3g queda anotado (TXT_COLS = 1) y el segundo guardado no lo repite', S.P.TXT_COLS === '1' && (S.post({ action: 'save', pedido: Object.assign({}, p, { rev: r.pedido.rev, zona: 'Sur' }) }).ok === true) &&
      S.sh._formatos.length === fmt.length, [S.P.TXT_COLS, S.sh._formatos.length]);
  const G = servidor({}, { google: true });
  const r2 = G.post({ action: 'save', pedido: P('g2', 'Carola Chavez', Object.assign({ rev: 0, ts: TS('2026-11-12', '09:00') }, RARO)) });
  const q2 = ((G.post({ action: 'list' }).pedidos) || []).find(x => x.id === 'g2') || {};
  chk('3h con una planilla «como Google» (no guarda el «\'»): el panel lee lo mismo', r2.ok === true && q2.cliente === '+ 2 almohadas' && q2.nota === '=1+1' && G.sh._datos[1][4] === '+ 2 almohadas', [q2.cliente, G.sh._datos[1][4]]);
});

seccion('4. Kommo: el nombre', () => {
  const S = servidor({}), C = S.ctx;
  const gen = ['+591 70000000', '(591) 70-123-456', '70000000', "'+591 70000000", 'Lead #39357288', '', '591 7012 3456'];
  const no = ['Juan Perez', 'Juan 7000000', '123-45', 'Tienda 24', 'MULTICENTER'];
  chk('4a un nombre que es solo un teléfono es genérico (también con la marca «\'»)', gen.every(t => C.nombreGenerico_(t) === true), gen.filter(t => !C.nombreGenerico_(t)));
  chk('4b un nombre de verdad (aunque tenga números) no', no.every(t => C.nombreGenerico_(t) === false), no.filter(t => C.nombreGenerico_(t)));
  /* La reparación del nombre escribe la celda del cliente como texto. */
  S.cargar([P('kommo-77', 'Carola Chavez', { cliente: '+591 70000000', estado: S.ctx.BORRADOR_EST, oc: '' })]);
  const fila = S.sh._datos.findIndex(f => f[0] === 'kommo-77') + 1;
  chk('4c el borrador con un teléfono por nombre queda marcado en la hoja y kSnapshot_ lo lee sin la marca (genérico: se repara)',
      S.sh._datos[fila - 1][4] === "'+591 70000000" && S.ctx.kSnapshot_(S.sh, true).borr['77'].cliente === '+591 70000000' && !!S.ctx.borradorGenerico_(S.sh, '77'), S.sh._datos[fila - 1][4]);
  const ok = S.ctx.repararNombreAplicar_(S.sh, { id: '77', nombre: '-Lucía Pérez' });
  chk('4d repararNombreAplicar_ escribe «-Lucía Pérez» como texto y la lectura lo devuelve igual', ok === true && S.sh._datos[fila - 1][4] === "'-Lucía Pérez" &&
      S.ctx.rowToRec_(S.sh._datos[fila - 1]).cliente === '-Lucía Pérez', S.sh._datos[fila - 1][4]);
});

let nW = 0;
const hook = (S, from, msg, nombre) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: nombre || 'Cliente' } }],
           messages: [Object.assign({ id: 'wamid.in' + (++nW), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const estado = (S, wamid, st) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, statuses: [{ id: wamid, status: st, timestamp: String(Math.floor(RELOJ.ms / 1000)), recipient_id: '59170000001' }] } }] }] }) } });

seccion('5. Las otras hojas: «Bot WhatsApp», «Borrados», «Geo», «IA comprobantes»', () => {
  poner('2026-11-12 10:00');
  const S = servidor(Object.assign({}, ON, { WA_AUTORESP: '0' }));
  hook(S, '59170000001', { type: 'text', text: { body: '=HYPERLINK("http://x","hola")' } }, '+591 Juan');
  const bot = S.hojas['Bot WhatsApp'] ? S.hojas['Bot WhatsApp']._datos : [];
  const f = bot.find(r => r[3] === '💬 Respondió') || [];
  chk('5a lo que escribió el cliente y su nombre de perfil quedan con «\'» (texto, no fórmula)', f[9] === "'=HYPERLINK(\"http://x\",\"hola\")" && f[4] === "'+591 Juan", [f[4], f[9]]);
  const R = Array.from(S.ctx.waRespuestasLeer_());
  chk('5b el panel lo recibe tal cual (sin la marca)', R.length === 1 && R[0].txt === '=HYPERLINK("http://x","hola")' && R[0].nom === '+591 Juan', R.map(x => [x.nom, x.txt]));
  const at = S.post({ action: 'waRespAtendida', w: R[0] && R[0].w, quien: '-Ernesto' });
  chk('5c «✓ Ya lo atendí» de alguien que se llama «-Ernesto»: la celda con «\'», el panel ve «-Ernesto · …»', at.ok === true && /^'-Ernesto · /.test(String(f[10] || bot.find(r => r[3] === '💬 Respondió')[10])) &&
      /^-Ernesto · /.test(Array.from(S.ctx.waRespuestasLeer_())[0].at), [at, bot.find(r => r[3] === '💬 Respondió')[10]]);
  /* Borrados */
  S.cargar([P('b1', '-Vendedora', { cliente: '=CLIENTE', rev: 0 })]);
  const del = S.post({ action: 'delete', id: 'b1', quien: '@admin' });
  const hb = (S.hojas['Borrados'] || { _datos: [] })._datos.slice(1)[0] || [];
  chk('5d «Borrados»: cliente, vendedor y quién borró como texto (una vez, sin «\'\'»)', del.ok === true && hb[2] === "'=CLIENTE" && hb[3] === "'-Vendedora" && hb[6] === "'@admin", hb);
  /* Geo */
  S.ctx.saveGeoCache([['-raro', -17.78, -63.18, 'aprox']]);
  const geo = S.hojas['Geo']._datos;
  const c = S.ctx.getGeoCache();
  chk('5e «Geo»: el enlace como texto, las coordenadas como números; la caché se lee con el enlace original', geo[geo.length - 1][0] === "'-raro" && geo[geo.length - 1][1] === -17.78 &&
      c['-raro'] && c['-raro'].lat === -17.78, [geo[geo.length - 1], c['-raro']]);
  /* IA comprobantes */
  const sh = S.ctx.iacHoja_(true);
  S.ctx.iacAnotar_(sh, '-abcDEF123', { m: 500, bd: '=BANCO', f: '2026-11-12', ref: '+123', t: RELOJ.ms, md: 'x' });
  const ia = S.hojas['IA comprobantes']._datos;
  chk('5f «IA comprobantes»: el id de la foto, el banco y la referencia como texto; el monto número; lo ya leído se encuentra por su id', ia[ia.length - 1][0] === "'-abcDEF123" &&
      ia[ia.length - 1][2] === 500 && ia[ia.length - 1][3] === "'=BANCO" && ia[ia.length - 1][5] === "'+123" && !!S.ctx.iacCache_()['-abcDEF123'], ia[ia.length - 1]);
});

seccion('6. El aviso de Meta va a la fila de SU mensaje aunque la hoja se recorte en el medio', () => {
  poner('2026-11-12 10:00');
  const S = servidor(Object.assign({}, ON, { WA_AUTORESP: '0' }));
  const sh = S.ctx.waHoja_();
  for (let i = 0; i < 6; i++) sh.appendRow(['12/11 09:0' + i, '', '', 'Mensaje', 'X', '5917000000' + i, 'pl', '✅ enviado', 'wamid.M' + i]);
  /* Justo después de que el aviso lee la hoja, otra ejecución borra las 2 filas más viejas (como `waAnotar_` al pasar el tope). */
  sh._antesDeLeer = () => sh.deleteRows(2, 2);
  estado(S, 'wamid.M4', 'read');
  const d = sh._datos, i4 = d.findIndex(r => r[8] === 'wamid.M4'), i2 = d.findIndex(r => r[8] === 'wamid.M2');
  chk('6a «leído» quedó en la fila del wamid.M4 (columna J) y no en la que ocupó su lugar', i4 > 0 && /leído/i.test(String(d[i4][9] || '')) && !String(d[i4 + 2] && d[i4 + 2][9] || '') &&
      !/leído/i.test(String((d[i2] || [])[9] || '')), d.map(r => [r[8], r[9]]));
  sh._antesDeLeer = () => sh.deleteRows(2, 10);   // se borró TODO, también la del mensaje
  estado(S, 'wamid.M5', 'delivered');
  chk('6b si la fila del mensaje ya no está, no escribe en ninguna otra (no aparece una fila nueva con «entregado»)', sh._datos.length === 1 && !sh._datos.some(r => /entregado/.test(String(r[9] || ''))), sh._datos);
});

/* ── 7 y 8. El cierre del día ── */
const NOMBRES = ['Ana Carola Chavez Mendoza de la Fuente', 'Ana Isabel Robledo Saavedra Gutierrez', 'Ana Mirian Salazar Rojas Vaca Diez',
  'Ana Maria Flores Montenegro Suarez', 'Ana Jonathan Monje Ribera Antelo', 'Ana Andrea Orias Peña Hurtado Rivero',
  'Ana Fabian Godoy Cuellar Justiniano', 'Ana Mauricio Merida Rocha Villarroel', 'Ana Fernando Peinado Arteaga Moreno', 'Ana Juan Pablo Paredes Melgar Zabala'];
const METAS = { v: 1, m: { '2026-11': { heaven: 800000, suena: 260000 } } };
const PRY = { v: 1, d: {
  '2026-11-11': { h: '17:05', dt: 8, dr: 16, v: 400000, p: 900000, b: { heaven: [300000, 700000, 'r'], suena: [100000, 200000, 'r'] } },
  '2026-11-12': { h: '17:10', dt: 9, dr: 15, v: 445000, p: 1010000, b: { heaven: [340000, 790000, 'c'], suena: [105000, 220000, 'c'] } },
  '2026-11-13': { h: '17:10', dt: 10, dr: 14, v: 470000, p: 1110000, b: { heaven: [360000, 860000, 'r'], suena: [110000, 250000, 'r'] } },
  '2026-11-14': { h: '17:30', dt: 11, dr: 13, v: 500000, p: 1300000, b: { heaven: [380000, 1000000, 'c'], suena: [120000, 300000, 'c'] } } } };
function cierreLleno(dia, props) {
  const S = servidor(Object.assign({}, ON, props || {}));
  const L = [];
  NOMBRES.forEach((n, i) => { for (let k = 0; k < 2; k++) L.push(P('c' + i + k, n, { ts: TS(dia, '0' + (8 + k) + ':' + (10 + i)), saldo: 10000 + i * 1111 + k, fecha: '2026-11-25' })); });
  L.push(SISTEMA('__metas__', METAS), SISTEMA('__pry_hist__', PRY));
  S.cargar(L);
  return S;
}
seccion('7. El cierre del día y el del mes no pasan de 1.024 letras', () => {
  const S0 = servidor({});
  ['cierre_del_dia_v3', 'cierre_del_dia_bf', 'cierre_del_mes', 'cierre_del_dia_v2', 'cierre_del_dia'].forEach(n =>
    chk('7a ' + n + ': el texto fijo se mide (' + fijo(S0, n) + ' letras)', S0.ctx.waPlantillaFijo_(n) === fijo(S0, n) && fijo(S0, n) > 100));
  /* Sin el tope (WA_CUERPO_TOPE enorme), el mismo cierre se pasaba: la prueba no es de adorno. */
  poner('2026-11-12 21:20');
  const SIN = cierreLleno('2026-11-12'); SIN.ctx.WA_CUERPO_TOPE = 1e9; SIN.repaso();
  const sin = SIN.salen('cierre_del_dia_v3')[0];
  chk('7b sin el tope, este cierre de 10 vendedoras pasaba de 1.024 letras', !!sin && cuerpo(SIN, sin) > 1024, sin && cuerpo(SIN, sin));
  poner('2026-11-12 21:20');
  const S = cierreLleno('2026-11-12'); S.repaso();
  const v3 = S.salen('cierre_del_dia_v3')[0];
  chk('7c con el tope: sale la v3 con 9 datos y el cuerpo ≤ 1.024 (≤ WA_CUERPO_TOPE)', !!v3 && v3.p.length === 9 && cuerpo(S, v3) <= S.ctx.WA_CUERPO_TOPE, v3 && [cuerpo(S, v3), v3.p.map(t => t.length)]);
  chk('7d lo recortado termina en «…», ningún dato vacío ni de más de 250, y lo que entraba queda igual (el día, lo vendido, las entregas)',
      !!v3 && v3.p.some(t => /…$/.test(t)) && v3.p.every(t => t.length > 0 && t.length <= 250) && v3.p[0] === sin.p[0] && v3.p[1] === sin.p[1] && v3.p[4] === sin.p[4], v3 && v3.p);
  const cort = v3 ? v3.p.filter((t, i) => t !== sin.p[i]) : [];
  chk('7e cada dato recortado es el principio del original (cortado por « · » si se pudo)', cort.length > 0 && v3.p.every((t, i) => t === sin.p[i] || sin.p[i].indexOf(t.replace(/…$/, '')) === 0), cort);
  /* Black Friday: el sábado 14/11, la de la campaña (10 datos). */
  poner('2026-11-14 21:20');
  const B = cierreLleno('2026-11-14'); B.repaso();
  const bf = B.salen('cierre_del_dia_bf')[0];
  chk('7f Black Friday: la de la campaña con 10 datos y el cuerpo ≤ 1.024', !!bf && bf.p.length === 10 && cuerpo(B, bf) <= 1000, bf && [cuerpo(B, bf), bf.p.map(t => t.length)]);
  /* Las de respaldo (los primeros datos de la misma lista) también entran. */
  const C = S.ctx, prm = v3 ? v3.p : [];
  chk('7g y los respaldos con esos mismos datos también entran (v2 y la primera, con 7)', [['cierre_del_dia_v2', 7], ['cierre_del_dia', 7]].every(([n, k]) => fijo(S, n) + prm.slice(0, k).reduce((a, t) => a + t.length, 0) <= 1000));
  /* El mes: 9 datos de 250 letras. */
  const largos = Array.from({ length: 9 }, (_, i) => Array.from({ length: 30 }, (_, k) => 'Dato' + i + ' parte ' + k).join(' · ').slice(0, 250));
  const cm = Array.from(C.waCuerpoTopeTodas_([['cierre_del_mes', 9]], largos));
  chk('7h cierre_del_mes con 9 datos de 250: entra, recortado por « · » y con «…»', fijo(S, 'cierre_del_mes') + cm.reduce((a, t) => a + t.length, 0) <= 1000 && cm.every(t => /…$/.test(t) && !/ ·…$/.test(t) && t.length >= C.WA_PARAM_MIN),
      cm.map(t => t.length));
  const cortos = ['a', 'b', 'c'];
  chk('7i lo que ya entra no se toca', JSON.stringify(Array.from(C.waCuerpoTopeTodas_([['cierre_del_mes', 9]], cortos))) === JSON.stringify(cortos));
  chk('7j waRecorte_: corta por « · » en la segunda mitad y no parte un emoji', C.waRecorte_('uno · dos · tres · cuatro', 16) === 'uno · dos…' && C.waRecorte_('ab😀cd', 4).length <= 4 &&
      !/[\ud800-\udbff]…$/.test(C.waRecorte_('ab😀cd', 4)), [C.waRecorte_('uno · dos · tres · cuatro', 16), C.waRecorte_('ab😀cd', 4)]);
});

seccion('8. Meta dice «demasiado largo» (132005) y lo nuevo del cierre falla', () => {
  const S0 = servidor({});
  chk('8a 132005 está en WA_PLANTILLA_FALTA (se prueba el respaldo) y en WA_PLANTILLA_LARGA; los de antes siguen', [132001, 132015, 132016, 132005].every(c => S0.ctx.WA_PLANTILLA_FALTA.indexOf(c) >= 0) &&
      S0.ctx.WA_PLANTILLA_LARGA.indexOf(132005) >= 0);
  poner('2026-11-12 21:20');
  const S = cierreLleno('2026-11-12');
  S.meta.responder = (body) => (body && body.template && body.template.name === 'cierre_del_dia_v3') ? { code: 400, body: { error: { code: 132005, message: '(#132005) Translated text too long' } } } : null;
  S.repaso();
  chk('8b con 132005 en la v3, sale la v2 (7 datos)', S.salen('cierre_del_dia_v3').length === 1 && S.salen('cierre_del_dia_v2').length === 1 && S.salen('cierre_del_dia_v2')[0].p.length === 7, S.salen().map(x => x.pl));
  poner('2026-11-12 21:20');
  const F = cierreLleno('2026-11-12');
  F.ctx.waCdMas_ = () => { throw new Error('se rompió la meta'); };
  F.repaso();
  const v2 = F.salen('cierre_del_dia_v2')[0];
  chk('8c si waCdMas_ revienta, el cierre sale igual: la v2 con los 7 datos de siempre (y no la v3)', !!v2 && v2.p.length === 7 && F.salen('cierre_del_dia_v3').length === 0 && /^Bs [\d.]+ · 20 ventas/.test(v2.p[1]), F.salen().map(x => x.pl + ':' + x.p.length));
});

seccion('9. waFletePendiente_ lee la plata como la página', () => {
  const C = servidor({}).ctx;
  const casos = [['^ 1.500', 1500], ['^ 150', 150], ['^ 1.500,50', 1500.5], ['^ 150.50', 150.5], ['Efectivo 500 + ^ 1.500', 1500], ['^Efectivo 200', 0], ['^ 1,500', 1500], ['', 0]];
  chk('9a «1.500» = 1.500 (antes 1,5), con coma de decimales, y lo ya cobrado no cuenta', casos.every(([t, n]) => C.waFletePendiente_(t) === n), casos.map(([t]) => t + ' → ' + C.waFletePendiente_(t)));
});

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
