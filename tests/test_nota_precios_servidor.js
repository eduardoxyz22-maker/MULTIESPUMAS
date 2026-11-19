/* 🧾 MEJORA 353 · LA NOTA DE VENTA CONTRA LOS PRECIOS QUE CARGASTE — EL SERVIDOR (la lectura de comprobantes, pregunta 5, .gs 2026-11-16-a).
   LO QUE CUIDA (con el .gs REAL en Node; Drive, la hoja «IA comprobantes» y Claude de mentira):
   1. La pregunta pasó a la versión 5: el esquema pide los RENGLONES de la nota (producto, medida, cantidad, precio unitario) y si los leyó
      todos sin dudas (las dos claves obligatorias); la pregunta dice que el precio es UNITARIO y que el a cuenta/saldo/transporte no son renglones.
   2. Lo que se guarda (`nl` = [{d, m, c, p}]) va SOLO con «seguro» y con TODOS los renglones con precio; si no, nada (la página no dice nada).
      Lo de antes (nota_total, lo pagado por medio, el voucher) sigue igual.
   3. Una nota leída con la pregunta de antes NO se vuelve a leer sola: solo si la página pide `renglones:1` (lo que se sube en el formulario o
      en «Registrar pago»), y UNA vez. Un voucher o un QR de antes no se releen nunca por esto.
   Fotos y montos INVENTADOS.
   Se corre:  node tests/test_nota_precios_servidor.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
function hoja(filas) {
  const datos = filas.map(f => f.slice());
  return { _datos: datos, getLastRow: () => datos.length, getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    appendRow: (r) => datos.push(r.slice()), setFrozenRows: () => {}, getRange: () => ({ getValues: () => [[]], setValue() {} }) };
}
const respuesta = (code, cuerpo) => ({ getResponseCode: () => code, getContentText: () => typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo || {}) });
const BASE = { es_comprobante: false, legible: true, monto: 0, moneda: '', fecha: '', hora: '', banco_origen: '', banco_destino: '', destinatario: '', ordenante: '',
  referencia: '', tipo: 'otro', nota: '', es_nota_venta: true, nota_total: 3980, nota_efectivo: 0, nota_qr: 3980, nota_tarjeta: 0, nota_transferencia: 0, tarjeta_ultimos4: '',
  tarjeta_lote: '', tarjeta_autorizacion: '', pos_banco: '' };
const LEE = {
  NOTA: Object.assign({}, BASE, { nota_renglones: [{ desc: 'especial ortopedico', medida: '140x190', cant: 1, precio: 3830 }, { desc: 'Almohada', medida: '50x70', cant: 2, precio: '75' }], nota_renglones_seguro: true }),
  DUDA: Object.assign({}, BASE, { nota_renglones: [{ desc: 'ESPECIAL', medida: '140x190', cant: 1, precio: 3830 }], nota_renglones_seguro: false }),
  SINPRECIO: Object.assign({}, BASE, { nota_renglones: [{ desc: 'ESPECIAL', medida: '140x190', cant: 1, precio: 3830 }, { desc: 'ALMOHADA', medida: '', cant: 1, precio: 0 }], nota_renglones_seguro: true }),
  QR: Object.assign({}, BASE, { es_comprobante: true, monto: 3980, moneda: 'BOB', fecha: '2026-11-16', tipo: 'qr', es_nota_venta: false, nota_total: 0, nota_qr: 0, nota_renglones: [], nota_renglones_seguro: false })
};
function cargar(cacheFilas, props) {
  const IAC = hoja([['Foto', 'Leída (Bolivia)', 'Monto', 'Banco destino', 'Fecha', 'Referencia', 'Resultado (JSON)', 'Modelo']].concat(cacheFilas || []));
  const claude = [], FOTOS = { getId: () => 'FOTOS' };
  const foto = (txt) => ({ getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return FOTOS; } }; },
    getMimeType: () => 'image/jpeg', getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => Array.from(Buffer.from(txt)) }) });
  const ARCH = { fNota: foto('NOTA'), fDuda: foto('DUDA'), fSin: foto('SINPRECIO'), fQR: foto('QR'), fVieja: foto('NOTA'), fQRviejo: foto('QR') };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'IA comprobantes' ? IAC : null, insertSheet: () => IAC }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    DriveApp: { getFolderById: (id) => { if (id !== 'FOTOS') throw new Error('no'); return FOTOS; }, getFileById: (id) => { if (!ARCH[id]) throw new Error('no'); return ARCH[id]; } },
    UrlFetchApp: { fetch: () => respuesta(404, {}), fetchAll: (reqs) => reqs.map(q => {
      const b = JSON.parse(q.payload); claude.push(b);
      const txt = Buffer.from(b.messages[0].content[0].source.data, 'base64').toString();
      return respuesta(200, { model: 'm', stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 150 }, content: [{ type: 'text', text: JSON.stringify(LEE[txt]) }] });
    }) },
    Utilities: { base64Encode: (d) => Buffer.from(d.map(x => x < 0 ? x + 256 : x)).toString('base64'), formatDate: (d) => String(d) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, putAll: () => {}, remove: () => {} }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz' },
    ScriptApp: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const pedir = (b) => JSON.parse(ctx.iaComprobantes_(b)._t);
  return { ctx, IAC, claude, pedir, props };
}
const PROPS = () => ({ ANTHROPIC_API_KEY: 'clave-de-prueba', FOTOS_FOLDER_ID: 'FOTOS' });

console.log('\n── 1. La pregunta (versión 5) ──');
{
  const C = cargar([], PROPS()).ctx;
  chk('a. la pregunta es la 5 y los renglones vienen desde la 5', C.IAC_PREGUNTA_V === 5 && C.IAC_RENGLONES_DESDE === 5, [C.IAC_PREGUNTA_V, C.IAC_RENGLONES_DESDE]);
  const S = C.IAC_ESQUEMA, it = S.properties.nota_renglones.items;
  chk('b. el esquema pide `nota_renglones` (producto, medida, cantidad, precio; todo obligatorio) y `nota_renglones_seguro`',
    S.required.indexOf('nota_renglones') >= 0 && S.required.indexOf('nota_renglones_seguro') >= 0 && it.additionalProperties === false &&
    ['desc', 'medida', 'cant', 'precio'].every(k => it.required.indexOf(k) >= 0) && S.properties.nota_renglones_seguro.type === 'boolean');
  chk('c. la pregunta: precio UNITARIO, el a cuenta / saldo / transporte no son renglones, y «seguro» solo sin ninguna duda',
    /precio UNITARIO/.test(C.IAC_PIDE) && /No pongas como renglón el a cuenta, el saldo, el transporte/.test(C.IAC_PIDE) && /nota_renglones_seguro: true SOLO si/.test(C.IAC_PIDE));
  chk('d. lo de antes sigue: la nota de venta, lo pagado por medio y el voucher', /NOTA DE VENTA/.test(C.IAC_PIDE) && S.required.indexOf('nota_efectivo') >= 0 && S.required.indexOf('tarjeta_lote') >= 0);
}

console.log('\n── 2. Lo que se guarda ──');
{
  const a = cargar([], PROPS());
  const r = a.pedir({ fotos: ['fNota', 'fDuda', 'fSin', 'fQR'], renglones: 1 });
  const N = r.res.fNota || {}, D = r.res.fDuda || {}, S = r.res.fSin || {}, Q = r.res.fQR || {};
  chk('a. la nota segura: sus renglones en mayúsculas, con el precio unitario («75» → 75) y la cantidad',
    JSON.stringify(N.nl) === JSON.stringify([{ d: 'ESPECIAL ORTOPEDICO', m: '140x190', c: 1, p: 3830 }, { d: 'ALMOHADA', m: '50x70', c: 2, p: 75 }]) && N.nv === 1 && N.nt === 3980 && N.pv === 5, JSON.stringify(N));
  chk('b. con dudas (seguro = false): NO trae renglones', D.nv === 1 && !('nl' in D), JSON.stringify(D));
  chk('c. un renglón sin precio: NO trae ninguno (si no está seguro, no dice nada)', S.nv === 1 && !('nl' in S), JSON.stringify(S));
  chk('d. un QR: ni nota de venta ni renglones', Q.cp === true && !Q.nv && !('nl' in Q), JSON.stringify(Q));
  const C = a.ctx;
  chk('e. `iacRenglones_`: más de 12 renglones → nada; cantidad 0 → 1; sin renglones → nada',
    C.iacRenglones_({ nota_renglones_seguro: true, nota_renglones: Array.from({ length: 13 }, (_, i) => ({ desc: 'P' + i, medida: '', cant: 1, precio: 1 })) }) === null &&
    C.iacRenglones_({ nota_renglones_seguro: true, nota_renglones: [{ desc: 'x', medida: '', cant: 0, precio: 5 }] })[0].c === 1 &&
    C.iacRenglones_({ nota_renglones_seguro: true, nota_renglones: [] }) === null);
}

console.log('\n── 3. La nota leída antes: se relee SOLO si la página pide los renglones, y una vez ──');
{
  const fila = (id, o) => [id, '14/11 10:00', o.m || '', '', o.f || '', o.ref || '', JSON.stringify(o), 'm'];
  const a = cargar([
    fila('fVieja', { cp: false, le: true, m: 0, nv: 1, nt: 3980, nq: 3980, pv: 4 }),
    fila('fQRviejo', { cp: true, le: true, m: 3980, ti: 'qr', f: '2026-11-14', pv: 4 })
  ], PROPS());
  const C = a.ctx;
  chk('a. `iacReleer_`: sin `renglones`, como antes (una nota de la 4 no se relee; una «no es comprobante» de la 2, sí)',
    C.iacReleer_({ cp: false, nv: 1, pv: 4 }) === false && C.iacReleer_({ cp: false, pv: 2 }) === true && C.iacReleer_({ cp: true, ti: 'tarjeta', pv: 3 }) === false);
  chk('b. con `renglones`: una nota de la 4 se relee; una de la 5, un QR o un error, no',
    C.iacReleer_({ cp: false, nv: 1, pv: 4 }, true) === true && C.iacReleer_({ cp: false, nv: 1, pv: 5 }, true) === false && C.iacReleer_({ cp: true, ti: 'qr', pv: 4 }, true) === false && C.iacReleer_({ err: 'ia', nv: 1 }, true) === false);
  const r0 = a.pedir({ fotos: ['fVieja', 'fQRviejo'] });
  chk('c. la revisión del mes (sin `renglones`): nada se relee, nada se gasta', r0.faltan.length === 0 && a.claude.length === 0 && !!r0.res.fVieja && !!r0.res.fQRviejo, JSON.stringify(r0.faltan));
  const r1 = a.pedir({ fotos: ['fVieja', 'fQRviejo'], renglones: 1, leer: 1 });
  chk('d. con `renglones` y `leer:1`: la nota sale en `faltan` y `releer`, sin gastar; el QR no', JSON.stringify(r1.faltan) === '["fVieja"]' && JSON.stringify(r1.releer) === '["fVieja"]' && a.claude.length === 0, JSON.stringify(r1));
  const r2 = a.pedir({ fotos: ['fVieja', 'fQRviejo'], renglones: 1 });
  chk('e. al leer: solo la nota va a Claude, y vuelve con sus renglones', a.claude.length === 1 && Array.isArray((r2.res.fVieja || {}).nl) && r2.res.fVieja.pv === 5, JSON.stringify(r2.res.fVieja));
  const r3 = a.pedir({ fotos: ['fVieja'], renglones: 1 });
  chk('f. una sola vez: ya leída con la 5, no se repite', r3.faltan.length === 0 && a.claude.length === 1);
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
