/* 🧾💳 §4ok-E3 La IA de comprobantes acepta el VOUCHER DE LA TARJETA, también pegado en la nota de venta.

   El 02/11 Claude marcó «no es un comprobante» tres vouchers de tarjeta de Mia Plaza, pegados en la nota de venta: la pregunta decía
   «una factura o nota de venta sin el pago» → false, y «si es nota de venta, es_comprobante=false». Ahora:
   1. La pregunta (versión 3) nombra el voucher de POS / tarjeta como comprobante (monto, fecha, autorización, últimos 4 dígitos), solo o
      pegado a la nota de venta; el esquema pide `tarjeta_ultimos4`.
   2. La nota de venta CON el voucher pegado queda como comprobante (`cp` true, `nv` 1); sin voucher, como siempre (`cp` false).
   3. Se vuelven a leer SOLO las fotos que la pregunta de antes marcó «no es un comprobante» (sin error), UNA vez: con `leer:1` salen en
      `faltan` (y `releer`) sin gastar, la lectura siguiente las lee con la pregunta nueva, y ya no se repiten.
   Fotos y montos INVENTADOS.

   Se corre:  node tests/test_iac_voucher.js   (desde la raíz del repo)
   Contra otro .gs:  GS=/ruta/al/otro.gs node tests/test_iac_voucher.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + e) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');

function hoja(filas) {
  const datos = filas.map(f => f.slice());
  return { _datos: datos, getLastRow: () => datos.length, getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    appendRow: (r) => datos.push(r.slice()), setFrozenRows: () => {}, getRange: () => ({ getValues: () => [[]], setValue() {} }) };
}
const respuesta = (code, cuerpo) => ({ getResponseCode: () => code, getContentText: () => typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo || {}) });

function cargar(cacheFilas, props) {
  const IAC = hoja([['Foto', 'Leída (Bolivia)', 'Monto', 'Banco destino', 'Fecha', 'Referencia', 'Resultado (JSON)', 'Modelo']].concat(cacheFilas || []));
  const claude = [];
  const FOTOS = { getId: () => 'FOTOS' };
  const foto = (id, txt) => ({ getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return FOTOS; } }; },
    getMimeType: () => 'image/jpeg', getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => Array.from(Buffer.from(txt)) }) });
  const ARCH = { fNota: foto('fNota', 'NOTA+VOUCHER'), fVou: foto('fVou', 'VOUCHER'), fCol: foto('fCol', 'COLCHON'), fQR: foto('fQR', 'QR'), fNueva: foto('fNueva', 'VOUCHER') };
  /* Lo que «ve» Claude en cada foto (con la pregunta nueva): */
  const LEE = {
    'NOTA+VOUCHER': { es_comprobante:true, legible:true, monto:1500, moneda:'BOB', fecha:'2026-11-02', hora:'11:20', banco_origen:'', banco_destino:'', destinatario:'MULTIESPUMAS', ordenante:'',
      referencia:'AUT 445566', tipo:'tarjeta', nota:'voucher pegado en la nota', es_nota_venta:true, nota_total:2000, nota_efectivo:500, nota_qr:0, nota_tarjeta:1500, nota_transferencia:0, tarjeta_ultimos4:'**** 4321' },
    'VOUCHER': { es_comprobante:true, legible:true, monto:800, moneda:'BOB', fecha:'2026-11-02', hora:'15:05', banco_origen:'', banco_destino:'', destinatario:'', ordenante:'',
      referencia:'778899', tipo:'tarjeta', nota:'', es_nota_venta:false, nota_total:0, nota_efectivo:0, nota_qr:0, nota_tarjeta:0, nota_transferencia:0, tarjeta_ultimos4:'9876' },
    'COLCHON': { es_comprobante:false, legible:true, monto:0, moneda:'', fecha:'', hora:'', banco_origen:'', banco_destino:'', destinatario:'', ordenante:'',
      referencia:'', tipo:'otro', nota:'es la foto de un colchón', es_nota_venta:false, nota_total:0, nota_efectivo:0, nota_qr:0, nota_tarjeta:0, nota_transferencia:0, tarjeta_ultimos4:'' }
  };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'IA comprobantes' ? IAC : null, insertSheet: () => IAC }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    DriveApp: { getFolderById: (id) => { if (id !== 'FOTOS') throw new Error('no'); return FOTOS; }, getFileById: (id) => { if (!ARCH[id]) throw new Error('no'); return ARCH[id]; },
      Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 } },
    UrlFetchApp: { fetch: () => respuesta(404, {}), fetchAll: (reqs) => reqs.map(q => {
      if (!/anthropic\.com/.test(q.url)) return respuesta(404, {});
      const b = JSON.parse(q.payload); claude.push(b);
      const txt = Buffer.from(b.messages[0].content[0].source.data, 'base64').toString();
      return respuesta(200, { model: 'm', stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 100 }, content: [{ type: 'text', text: JSON.stringify(LEE[txt] || LEE.COLCHON) }] });
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

console.log('\n── 1. La pregunta ──');
{
  const a = cargar([], {});
  const C = a.ctx;
  chk('⚠️ a. la pregunta pasó a la versión 3 (para releer lo de la 2)', C.IAC_PREGUNTA_V === 3, C.IAC_PREGUNTA_V);
  chk('⚠️ b. nombra el voucher de POS / tarjeta como comprobante, también pegado a la nota de venta',
    /VOUCHER DE TARJETA/.test(C.IAC_PIDE) && /POS/.test(C.IAC_PIDE) && /pegado/.test(C.IAC_PIDE) && /es_comprobante=true, tipo=tarjeta/.test(C.IAC_PIDE));
  chk('c. la nota de venta con el voucher pegado: es_comprobante=true (lo dice la pregunta)', /salvo que tenga el voucher de la tarjeta/.test(C.IAC_PIDE));
  chk('d. el esquema pide los últimos 4 dígitos (y es obligatorio)', !!(C.IAC_ESQUEMA.properties.tarjeta_ultimos4 && C.IAC_ESQUEMA.required.indexOf('tarjeta_ultimos4') >= 0));
  chk('e. lo de antes sigue: la nota de venta y lo que se pagó con cada medio', /NOTA DE VENTA/.test(C.IAC_PIDE) && C.IAC_ESQUEMA.required.indexOf('nota_efectivo') >= 0);
}

console.log('\n── 2. Lo que se guarda de cada lectura (iacNormal_) ──');
{
  const a = cargar([], {}), C = a.ctx;
  const base = { es_comprobante:true, legible:true, monto:800, moneda:'BOB', fecha:'2026-11-02', hora:'15:05', banco_origen:'', banco_destino:'', destinatario:'', ordenante:'',
    referencia:'778899', tipo:'tarjeta', nota:'', es_nota_venta:false, nota_total:0, nota_efectivo:0, nota_qr:0, nota_tarjeta:0, nota_transferencia:0, tarjeta_ultimos4:'9876' };
  const v = C.iacNormal_(base, 'm');
  chk('⚠️ a. un voucher solo: comprobante de tarjeta con monto, fecha, autorización y los 4 dígitos', v.cp === true && v.ti === 'tarjeta' && v.m === 800 && v.f === '2026-11-02' && v.ref === '778899' && v.u4 === '9876' && v.pv === 3, JSON.stringify(v));
  const n = C.iacNormal_(Object.assign({}, base, { monto:1500, es_nota_venta:true, nota_total:2000, nota_efectivo:500, nota_tarjeta:1500, tarjeta_ultimos4:'**** 4321' }), 'm');
  chk('⚠️ b. la nota de venta con el voucher pegado: ES comprobante (el del voucher) y trae lo de la nota', n.cp === true && n.nv === 1 && n.m === 1500 && n.ne === 500 && n.nt === 2000 && n.u4 === '4321', JSON.stringify(n));
  const s = C.iacNormal_(Object.assign({}, base, { es_comprobante:false, tipo:'otro', monto:0, es_nota_venta:true, nota_total:990, nota_efectivo:600, nota_qr:390, tarjeta_ultimos4:'' }), 'm');
  chk('c. la nota de venta SIN voucher: como siempre, no es comprobante', s.cp === false && s.nv === 1 && s.ne === 600 && !s.u4, JSON.stringify(s));
  const q = C.iacNormal_(Object.assign({}, base, { tipo:'qr', es_nota_venta:true, tarjeta_ultimos4:'' }), 'm');
  chk('d. una nota de venta que Claude da por comprobante pero NO es de tarjeta: sigue sin serlo (no se afloja más de lo pedido)', q.cp === false && q.nv === 1, JSON.stringify(q));
  chk('e. «últimos 4» que no son 4 números: no se guarda', !C.iacNormal_(Object.assign({}, base, { tarjeta_ultimos4:'12' }), 'm').u4 && !C.iacNormal_(Object.assign({}, base, { tarjeta_ultimos4:'abcd' }), 'm').u4);
  chk('f. iacReleer_: solo «no es comprobante» de una pregunta anterior, sin error',
    typeof C.iacReleer_ === 'function' && C.iacReleer_({ cp:false, pv:2 }) === true && C.iacReleer_({ cp:false }) === true && C.iacReleer_({ cp:false, nv:1, pv:2 }) === true &&
    C.iacReleer_({ cp:false, pv:3 }) === false && C.iacReleer_({ cp:true, pv:2 }) === false && C.iacReleer_({ err:'ajena' }) === false && C.iacReleer_({ err:'ia', cp:false }) === false && C.iacReleer_(null) === false);
}

console.log('\n── 3. Se releen SOLO las marcadas «no es un comprobante», una vez ──');
{
  const fila = (id, o) => [id, '02/11 10:00', o.m || '', '', o.f || '', o.ref || '', JSON.stringify(o), 'm'];
  const a = cargar([
    fila('fNota', { cp:false, le:true, m:0, nv:1, nt:2000, ne:500, pv:2 }),            // el voucher pegado en la nota: lo de Mia Plaza
    fila('fCol',  { cp:false, le:true, m:0, no:'un colchón', pv:2 }),                  // de verdad no es comprobante: se relee igual (una vez)
    fila('fQR',   { cp:true, le:true, m:3000, ti:'qr', f:'2026-11-01', pv:2 }),         // bien leído con la de antes: NO se relee
    fila('fVou',  { err:'ajena', t:1 })                                                 // con error: no se relee sola
  ], { ANTHROPIC_API_KEY:'clave-de-prueba', FOTOS_FOLDER_ID:'FOTOS' });
  const todas = ['fNota', 'fCol', 'fQR', 'fVou'];
  const r0 = a.pedir({ fotos:todas, leer:1 });
  chk('⚠️ a. con `leer:1` (sin gastar): las dos «no es comprobante» de la pregunta de antes salen como `faltan`, lo demás en `res`',
    r0.ok && JSON.stringify(r0.faltan.slice().sort()) === '["fCol","fNota"]' && !!r0.res.fQR && !!r0.res.fVou && !r0.res.fNota && a.claude.length === 0, JSON.stringify(r0));
  chk('b. …y la respuesta dice cuáles son para releer (`releer`)', JSON.stringify((r0.releer || []).slice().sort()) === '["fCol","fNota"]', JSON.stringify(r0.releer));
  const r1 = a.pedir({ fotos:todas });
  const N = r1.res.fNota || {};
  chk('⚠️ c. al leer: solo esas dos van a Claude, con la pregunta nueva', a.claude.length === 2 && a.claude.every(b => /VOUCHER DE TARJETA/.test(b.messages[0].content[1].text)) && r1.leidas === 2, JSON.stringify({ n:a.claude.length, leidas:r1.leidas }));
  chk('⚠️ d. el voucher pegado en la nota ahora ES comprobante: Bs 1.500 de tarjeta, con la nota (efectivo 500) y los 4 dígitos', N.cp === true && N.m === 1500 && N.ti === 'tarjeta' && N.nv === 1 && N.ne === 500 && N.u4 === '4321' && N.pv === 3, JSON.stringify(N));
  chk('e. el colchón sigue sin ser comprobante (ahora con la pregunta 3)', (r1.res.fCol || {}).cp === false && (r1.res.fCol || {}).pv === 3, JSON.stringify(r1.res.fCol));
  const n1 = a.claude.length, r2 = a.pedir({ fotos:todas, leer:1 }), r3 = a.pedir({ fotos:todas });
  chk('⚠️ f. una sola vez: después ya no se releen (ni con `leer:1` ni leyendo)', r2.faltan.length === 0 && !r2.releer && r3.faltan.length === 0 && a.claude.length === n1 && r3.res.fCol.cp === false, JSON.stringify({ f2:r2.faltan, f3:r3.faltan, n:a.claude.length }));
  const r4 = a.pedir({ fotos:['fNueva'] });
  chk('g. un voucher nuevo, solo: comprobante de tarjeta con sus 4 dígitos', (r4.res.fNueva || {}).cp === true && r4.res.fNueva.u4 === '9876' && r4.res.fNueva.m === 800, JSON.stringify(r4.res.fNueva));
  const r5 = a.pedir({ fotos:['fQR'], forzar:['fQR'] });
  chk('h. `forzar` sigue leyendo lo que la persona pide', a.claude.length === n1 + 2 && !!r5.res.fQR, a.claude.length);
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
