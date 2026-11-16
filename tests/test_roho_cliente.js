/* 🧾 ROHO: NINGÚN PEDIDO SIN EL NOMBRE DEL CLIENTE (16/11; dueño: «algunos pedidos salen sin nombre de cliente siendo que están…
   eso es gravísimo si no tomas todos los datos… revisá qué pasó y cómo no vuelva a pasar»).
   El sábado 15/11 a la noche entraron 18 pedidos de ROHO con el cliente, el celular, la dirección, el NIT y «quién recibe» VACÍOS
   (todo lo de las columnas K a R del reporte). El importador solo exigía nota, fecha y producto: un archivo sin esas columnas (o
   con los títulos cambiados) se importaba entero sin decir nada, y al volver a subir el Excel bueno los 18 quedaban «ya estaban».

   LO QUE CUIDA (página de verdad; en §6-§8 contra el .gs de verdad, con un Google de mentira):
   1. Un Excel SIN «NOMBRE CLIENTE» (o sin teléfono/WhatsApp, o sin dirección) no importa NADA y dice qué columna falta.
   2. Una nota en varias filas junta los datos de TODAS: el nombre o el celular que vienen en la 2ª fila no se pierden.
   3. Una nota sin nombre en ninguna fila NO se crea: va a «no se pueden» con el motivo, a la vista.
   4. Las entidades en hexadecimal del reporte («&#xa;», «&#xa0;») se traducen (antes quedaban escritas en el nombre y en las
      observaciones); un enlace de Google Maps de la referencia va al pedido.
   5. Los títulos con tilde o con otra forma obvia («NOMBRE DEL CLIENTE», «CELULAR», «DIRECCIÓN») se leen.
   6. «📥 Crear» no corre dos veces a la vez (doble toque) y la última barrera no crea un pedido sin nombre.
   7. 🩹 Volver a subir el Excel COMPLETA los ya cargados: solo lo vacío (cliente, celular, dirección, NIT, referencia); no toca
      la fecha, el turno, los productos ni lo que alguien escribió; no ofrece los completos ni una entrega vieja ya hecha.
   8. El servidor (2026-11-16-a) no crea un pedido NUEVO sin cliente (`falta_cliente`, a «Rechazos»), venga de donde venga; sí deja
      corregir uno que ya está, las filas del sistema y los borradores de Kommo.
   Datos INVENTADOS (el repo es público). Reloj clavado en el lunes 16/11/2026, 10:00 de Bolivia.
   Se corre:  node tests/test_roho_cliente.js   (dientes: PEDIDOS=<pedidos.html viejo> GS=<.gs viejo>) */
const { chromium } = require('playwright');
const fs = require('fs'), vm = require('vm'), path = require('path'), zlib = require('zlib');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

/* ── Un .xlsx como el que baja ROHO: una hoja, texto en línea (inlineStr), números con t="n". ZIP sin comprimir. ── */
function crc32(buf) { if (zlib.crc32) return zlib.crc32(buf) >>> 0; let c, crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function zip(archivos) {
  const locales = [], centrales = []; let off = 0;
  for (const [nombre, txt] of Object.entries(archivos)) {
    const datos = Buffer.from(txt, 'utf8'), nom = Buffer.from(nombre, 'utf8'), crc = crc32(datos);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 8); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(datos.length, 18); lh.writeUInt32LE(datos.length, 22); lh.writeUInt16LE(nom.length, 26); lh.writeUInt16LE(0, 28);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 10); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(datos.length, 20); ch.writeUInt32LE(datos.length, 24); ch.writeUInt16LE(nom.length, 28); ch.writeUInt32LE(off, 42);
    locales.push(lh, nom, datos); centrales.push(ch, nom); off += 30 + nom.length + datos.length;
  }
  const cd = Buffer.concat(centrales), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(centrales.length / 2, 8); fin.writeUInt16LE(centrales.length / 2, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16);
  return Buffer.concat([...locales, cd, fin]);
}
const xesc = (s) => String(s).replace(/&(?!#x?[0-9a-fA-F]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');   // las entidades «&#xa;» quedan tal cual, como en el reporte
const COLS = 'ABCDEFGHIJKLMNOPQR'.split('');
function hoja(titulos, filas) {
  const celda = (c, r, v) => (typeof v === 'number') ? `<c r="${c}${r}" t="n"><v>${v}</v></c>` : `<c r="${c}${r}" t="inlineStr"><is><t>${xesc(v)}</t></is></c>`;
  const fila = (vals, r) => `<row r="${r}">` + vals.map((v, i) => celda(COLS[i], r, v)).join('') + '</row>';
  return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    [titulos].concat(filas).map((f, i) => fila(f, i + 1)).join('') + '</sheetData></worksheet>';
}
const xlsx = (titulos, filas) => zip({ '[Content_Types].xml': '<Types/>', 'xl/workbook.xml': '<workbook/>',
  'xl/sharedStrings.xml': '<sst count="0" uniqueCount="0"/>', 'xl/worksheets/sheet1.xml': hoja(titulos, filas) });
const serial = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000);
const TIT = ['FECHA', 'FECHA PROGRAMADA', '# NOTA DE VENTA', 'CÓDIGO', 'DESCRIPCION', 'CANTIDAD', 'STATUS', 'NOTA DE VENTA', 'RESUMEN',
  'FECHA NOTA VENTA', 'NOMBRE CLIENTE', 'CI / NIT', 'TELEFONO', 'WHATSAPP *', 'CORREO CLIENTE *', 'DIRECCION *', '*DESCRIPCION DE DOMICILIO', 'NOTAS / QUIEN RECIBE *'];
/* Una fila del reporte. `o` pisa lo que haga falta. */
function F(nota, o) {
  o = o || {};
  const v = { fecha: serial('2026-11-15'), prog: serial(o.entrega || '2026-11-18'), nota: Number(nota), cod: 'DCHRPCM000001', desc: o.desc || 'COLCHON ECO FLEX 2 PLAZAS 140X190CM',
    cant: o.cant != null ? o.cant : 1, st: 'PAGADA', nv: String(nota), res: '&lt;div&gt;foto&lt;/div&gt;', fnv: serial('2026-11-15'),
    cli: o.cli != null ? o.cli : ('CLIENTE INVENTADO ' + nota), nit: o.nit || '', tel: o.tel != null ? o.tel : '+59170000' + String(nota).slice(-3),
    wa: o.wa != null ? o.wa : '+59170000' + String(nota).slice(-3), mail: 'retail@ejemplo.com', dir: o.dir != null ? o.dir : ('Calle Inventada ' + nota + ', Santa Cruz de la Sierra, Bolivia'),
    ref: o.ref != null ? o.ref : 'COORDINAR ENTREGA', rec: o.rec != null ? o.rec : 'QUIEN RECIBE ' + nota };
  return [v.fecha, v.prog, v.nota, v.cod, v.desc, v.cant, v.st, v.nv, v.res, v.fnv, v.cli, v.nit, v.tel, v.wa, v.mail, v.dir, v.ref, v.rec];
}

/* ── El servidor de mentira (el de test_factura_conflicto.js) ── */
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1],
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
  };
}
function servidor(src) {
  const HDR = ['id', 'Fecha', 'N° OC', 'Vendedor', 'Cliente', 'Productos', 'Celular', 'Turno', 'Zona', 'Dirección', 'Link Maps', 'Pagado', 'Saldo (Bs)', 'ts',
    '_productos_json', 'Método pago', 'Observaciones', 'Estado stock', 'Entregado', 'Vehículo', 'Chofer', 'Garantía (a nombre de)', 'Nota de venta',
    'A cuenta (Bs)', 'Facturar a', 'NIT', 'N° del día', 'Verificado', 'Fotos entrega', 'Revisión'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; }, removeAll() {} };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Rechazos' ? shR : (n === 'Pedidos' ? sh : null), insertSheet: (n) => n === 'Rechazos' ? shR : hacerPlanilla([]) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); }, getProperties: () => Object.assign({}, props) }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getId: () => 'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
      getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const post = (bodyTxt) => ctx.doPost({ postData: { contents: bodyTxt }, parameter: {} })._t;
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const fila = (id) => filas().filter(r => String(r.id) === String(id))[0] || null;
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action: 'save', pedido: rec })));
  return { post, filas, fila, guardar, rechazos: () => shR._datos.slice(1) };
}
function INIT() {
  window.fetch = function (url, o) {
    var body = (o && o.body) || '{}';
    return window.__gs(body).then(function (t) {
      return { ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(t)); }, text: function () { return Promise.resolve(t); } };
    });
  };
}
/* Un pedido de ROHO ya cargado (como los del sábado, o completo). */
const rohoPed = (id, nota, o) => Object.assign({ id, oc: String(nota), vendedor: 'ROHO', cliente: '', celular: '', direccion: '', zona: '', nit: '', maps: '',
  fecha: '2026-11-18', turno: 'AM', nroDia: 3, observaciones: 'Importado del Excel de ROHO', garantia: '', facturarA: '', nota: '', estado: '',
  entregado: false, verificado: false, vehiculo: '', chofer: '', fotos: [], pagado: true, saldo: 0, acuenta: 0, metodoPago: '', cobradoBs: 0,
  ts: Date.parse('2026-11-15T21:37:00-04:00'), rev: 0, productos: [{ desc: 'COLCHON ECO FLEX 2 PLAZAS 140X190CM', medida: '140x190', codigo: 'CH0000', cant: 1 }] }, o || {});

(async () => {
  /* ═════════════ §8 primero: el servidor solo ═════════════ */
  console.log('\n── 8. El servidor no crea un pedido NUEVO sin cliente ──');
  {
    const S = servidor(fs.readFileSync(GS, 'utf8'));
    let r = S.guardar(rohoPed('X1', 300001));
    chk('8a. un pedido nuevo de ROHO sin cliente → falta_cliente, y no entra a la planilla', r.ok === false && r.error === 'falta_cliente' && !S.fila('X1'), r);
    chk('8b. …y queda anotado en «Rechazos»', S.rechazos().some(f => /falta_cliente/.test(f.join('|'))), S.rechazos().length);
    r = S.guardar(rohoPed('X2', 300002, { cliente: '   ' }));
    chk('8c. un nombre de puros espacios tampoco', r.ok === false && r.error === 'falta_cliente', r);
    r = S.guardar(rohoPed('X3', 300003, { cliente: 'CLIENTE INVENTADO X3' }));
    chk('8d. con el nombre entra como siempre', r.ok === true && S.fila('X3') && S.fila('X3').cliente === 'CLIENTE INVENTADO X3', r);
    const rev = Number(S.fila('X3').rev);
    r = S.guardar(Object.assign({}, S.fila('X3'), { cliente: '', rev }));
    chk('8e. corregir uno que YA está (aunque quede sin nombre) no lo frena este control: es una edición', r.ok === true, r);
    r = S.guardar({ id: '__prueba_sistema__', fecha: '', cliente: '', observaciones: '{}', productos: [] });
    chk('8f. una fila del sistema sin cliente entra', r.ok === true, r);
    r = S.guardar({ id: '__ret_prueba', fecha: '', cliente: '', vendedor: 'Maria Flores', acuenta: 100, productos: [] });
    chk('8g. un retiro de efectivo sin cliente entra', r.ok === true, r);
    r = S.guardar(rohoPed('kommo-777', '', { vendedor: 'Maria Flores', estado: 'Borrador Kommo', fecha: '', oc: '' }));
    chk('8h. un borrador de Kommo sin cliente entra', r.ok === true, r);
  }

  /* ═════════════ La página ═════════════ */
  const browser = await chromium.launch();
  const S = servidor(fs.readFileSync(GS, 'utf8'));
  // Lo que ya estaba en la planilla: dos del sábado SIN datos, uno completo con algo escrito a mano, uno viejo entregado sin referencia.
  [rohoPed('R1', 400001), rohoPed('R2', 400002, { fecha: '2026-11-17', turno: 'PM', observaciones: 'Importado del Excel de ROHO' })].forEach(p => {
    // el servidor nuevo no los deja nacer sin nombre: se ponen como quedaron en la hoja (se escribieron con un servidor viejo)
    const r = S.guardar(Object.assign({}, p, { cliente: 'TEMP' })); const f = S.fila(p.id);
    S.guardar(Object.assign({}, f, { cliente: '', rev: Number(f.rev) }));
  });
  S.guardar(rohoPed('R3', 400003, { cliente: 'NOMBRE ESCRITO A MANO', celular: '71111111', direccion: 'Dirección corregida a mano', observaciones: 'Llamar antes · Importado del Excel de ROHO' }));
  S.guardar(rohoPed('R4', 400004, { cliente: 'CLIENTE VIEJO', celular: '72222222', direccion: 'Calle vieja', fecha: '2026-08-20', entregado: true, observaciones: '' }));
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.exposeFunction('__gs', (body) => S.post(body));
  await ctx.addInitScript(INIT);
  await ctx.route(/^https?:/, rr => rr.abort());
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', d => d.accept());
  await p.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await p.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await p.evaluate(async () => {
    CARGA_GEN++; CARGA_ESTADO = 'ok';
    try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._toasts = []; var _t = toast; toast = function (m, k, ms) { window._toasts.push(String(m)); return _t(m, k, ms); };
    await refrescarEstado();
  });
  const leer = async (buf) => p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const R = rohoArmarPedidos(xlsxHoja(await xlsxDescomprimir(bin.buffer)));
    const lista = (a) => (a || []).map(x => ({ oc: x.oc, cliente: x.cliente, celular: x.celular, direccion: x.direccion, maps: x.maps, nit: x.nit, obs: x.obs, malo: x.malo, completa: x.completa, prods: (x.productos || []).length }));
    return { error: R.error || '', nuevos: lista(R.nuevos), malos: lista(R.malos), viejos: lista(R.viejos), yaEstan: lista(R.yaEstan), completar: lista(R.completar) };
  }, buf.toString('base64'));

  console.log('\n── 1. Sin las columnas del cliente no se importa nada ──');
  let r = await leer(xlsx(TIT.map(t => t === 'NOMBRE CLIENTE' ? 'OBSERVACION' : t), [F(500001), F(500002)]));
  chk('1a. sin «NOMBRE CLIENTE»: error que nombra la columna, ningún pedido', /NOMBRE CLIENTE/.test(r.error) && !r.nuevos.length, r.error);
  r = await leer(xlsx(TIT.map(t => /TELEFONO|WHATSAPP/.test(t) ? 'OTRA COSA' : t), [F(500001)]));
  chk('1b. sin teléfono ni WhatsApp: error', /TELEFONO o WHATSAPP/.test(r.error) && !r.nuevos.length, r.error);
  r = await leer(xlsx(TIT.map(t => /DIRECCION|DOMICILIO/.test(t) ? 'OTRA COSA' : t), [F(500001)]));
  chk('1c. sin dirección ni referencia: error', /DIRECCION/.test(r.error) && !r.nuevos.length, r.error);
  r = await p.evaluate(async (b64) => { window._toasts = []; const blob = new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'roho.xlsx');
    onRohoArchivo({ target: { files: [blob] } }); await new Promise(res => setTimeout(res, 600)); return { t: window._toasts.join(' | '), imp: !!ROHO_IMP && ROHO_IMP.nuevos && ROHO_IMP.nuevos.length };
  }, xlsx(TIT.map(t => t === 'NOMBRE CLIENTE' ? 'OBSERVACION' : t), [F(500001)]).toString('base64'));
  chk('1d. con el botón: el aviso lo dice («no importé nada») y no queda nada para crear', /No importé nada/.test(r.t) && !r.imp, r);

  console.log('\n── 2-5. Lo que trae el Excel ──');
  const filas = [
    F(600001),                                                                                        // normal
    F(600002, { cli: '', tel: '', wa: '', rec: '' }), F(600002, { desc: 'ALMOHADA 50X70', cli: 'NOMBRE EN LA SEGUNDA FILA', tel: '+59171234500' }),   // el nombre viene en la 2ª fila
    F(600003, { cli: '' }), F(600003, { desc: 'ALMOHADA 50X70', cli: '' }),                           // sin nombre en ninguna fila
    F(600004, { cli: 'ANA&#xa0;PRUEBA', rec: 'ANA PRUEBA&#xa;CEL.70000004&#xa;LLAMAR ANTES', ref: 'Portón verde&#xa;https://maps.app.goo.gl/AbCdEfG123&#xa;casa 4' }),
  ];
  r = await leer(xlsx(TIT, filas));
  const nota = (oc) => r.nuevos.concat(r.malos).find(x => x.oc === String(oc)) || {};
  chk('2a. la nota partida en dos filas toma el nombre de la 2ª', nota(600002).cliente === 'NOMBRE EN LA SEGUNDA FILA', nota(600002));
  chk('2b. …y el celular de la 2ª', nota(600002).celular === '71234500', nota(600002).celular);
  chk('2c. …con sus dos productos', nota(600002).prods === 2, nota(600002).prods);
  chk('3a. la nota sin nombre en ninguna fila NO se crea', !r.nuevos.some(x => x.oc === '600003'), r.nuevos.map(x => x.oc));
  chk('3b. …va a «no se pueden» con el motivo', /NOMBRE DEL CLIENTE/.test(nota(600003).malo || ''), nota(600003).malo);
  chk('4a. «&#xa0;» en el nombre se traduce (sin «&#»)', nota(600004).cliente === 'ANA PRUEBA', nota(600004).cliente);
  chk('4b. «&#xa;» en quién recibe y la referencia se traducen', !/&#/.test(nota(600004).obs) && /Recibe: ANA PRUEBA CEL\.70000004 LLAMAR ANTES/.test(nota(600004).obs), nota(600004).obs);
  chk('4c. el enlace de Maps de la referencia va al pedido, entero', nota(600004).maps === 'https://maps.app.goo.gl/AbCdEfG123', nota(600004).maps);
  chk('4d. la dirección sin «Santa Cruz de la Sierra, Bolivia»', nota(600001).direccion === 'Calle Inventada 600001', nota(600001).direccion);
  r = await p.evaluate(() => [xmlDes('A&#xa;B'), xmlDes('A&#xA0;B'), xmlDes('&#241;and&#xf1;u'), xmlDes('&amp;#xa;'), xmlDes('&#x110000;')]);
  chk('4e. xmlDes: hexadecimal y decimal; «&amp;#xa;» queda como texto; un número imposible no rompe', r[0] === 'A\nB' && r[1] === 'A B' && r[2] === 'ñandñu' && r[3] === '&#xa;' && r[4] === '&#x110000;', r);
  const tit2 = TIT.slice(); tit2[10] = 'NOMBRE DEL CLIENTE'; tit2[12] = 'CELULAR'; tit2[15] = 'DIRECCIÓN';
  r = await leer(xlsx(tit2, [F(600005)]));
  chk('5. «NOMBRE DEL CLIENTE», «CELULAR» y «DIRECCIÓN» se leen', !r.error && r.nuevos[0] && r.nuevos[0].cliente === 'CLIENTE INVENTADO 600005' && r.nuevos[0].celular && /Calle Inventada/.test(r.nuevos[0].direccion), r.error || r.nuevos[0]);

  console.log('\n── 6. «Crear»: una sola tanda y nunca sin nombre ──');
  r = await p.evaluate(async () => {
    var llamadas = 0, _a = apiSave;
    apiSave = function (rec) { llamadas++; return new Promise(function (res) { setTimeout(function () { res({ ok: true, pedido: rec }); }, 60); }); };
    var base = { fecha: '2026-11-19', productos: [{ desc: 'COLCHON', medida: '140x190', codigo: '', cant: 1 }], celular: '71234567', direccion: 'Calle', zona: '', pagado: true, obs: 'Importado del Excel de ROHO', nit: '', maps: '' };
    ROHO_IMP = { nuevos: [Object.assign({ oc: '700001', cliente: 'UNO' }, base), Object.assign({ oc: '700002', cliente: '' }, base), Object.assign({ oc: '700003', cliente: 'TRES' }, base)],
                 viejos: [], yaEstan: [], sinFecha: [], malos: [], completar: [], filas: 3 };
    ROHO_TURNO = 'AM'; ROHO_CREANDO = false; renderImportRoho();
    window._toasts = [];
    confirmarImportRoho(); confirmarImportRoho();          // doble toque
    await new Promise(function (res) { setTimeout(res, 900); });
    apiSave = _a;
    var t = (document.getElementById('modal-box').textContent || '').replace(/\s+/g, ' ');
    return { llamadas: llamadas, creados: STATE.filter(function (x) { return /^70000[123]$/.test(x.oc); }).map(function (x) { return x.oc; }), t: t, toasts: window._toasts.join(' | ') };
  });
  chk('6a. el doble toque no arma dos tandas: 2 guardados (el sin nombre no se manda)', r.llamadas === 2, r.llamadas);
  chk('6b. el segundo toque lo dice', /Ya se están creando/.test(r.toasts), r.toasts);
  chk('6c. el de la nota sin nombre no se creó y el resultado lo dice', r.creados.indexOf('700002') < 0 && /700002/.test(r.t) && /nombre del cliente/.test(r.t), { creados: r.creados, t: r.t.slice(0, 400) });
  await p.evaluate(async () => { STATE = STATE.filter(function (x) { return !/^70000[123]$/.test(x.oc); }); try { closeModal(); } catch (e) {} await refrescarEstado(); });

  console.log('\n── 7. 🩹 Completar los ya cargados (contra el servidor) ──');
  const exc = xlsx(TIT, [
    F(400001, { cli: 'CLIENTE INVENTADO R1', tel: '+59173000001', dir: 'Calle R1 casa 1, Santa Cruz de la Sierra, Bolivia', ref: 'Frente al parque', rec: 'R1 RECIBE', nit: '1234567' }),
    F(400002, { entrega: '2026-11-17', cli: 'CLIENTE INVENTADO R2', tel: '+59173000002', dir: 'Calle R2', ref: 'Edificio azul', rec: 'R2 RECIBE' }),
    F(400003, { cli: 'OTRO NOMBRE DEL EXCEL', tel: '+59173000003', dir: 'Otra calle del Excel', ref: 'Casa 3', rec: 'R3 RECIBE' }),
    F(400004, { entrega: '2026-08-20', cli: 'CLIENTE VIEJO', tel: '+59172222222', dir: 'Calle vieja', ref: 'Referencia vieja', rec: 'R4 RECIBE' }),
  ]);
  r = await leer(exc);
  const cmp = (oc) => r.completar.find(x => x.oc === String(oc));
  chk('7a. ofrece completar los 2 del sábado (con cliente, celular y dirección)', cmp(400001) && cmp(400002) && cmp(400001).completa.join() .indexOf('cliente') >= 0 && cmp(400002).completa.indexOf('celular') >= 0 && cmp(400002).completa.indexOf('direccion') >= 0, r.completar.map(x => x.oc + ':' + x.completa.join('+')));
  chk('7b. el que tiene el nombre escrito a mano solo se completa en lo que le falta (la referencia), nunca el nombre', !cmp(400003) || cmp(400003).completa.join() === 'observaciones', cmp(400003) && cmp(400003).completa);
  chk('7c. la entrega vieja ya hecha (solo le falta la referencia) no se ofrece', !cmp(400004), cmp(400004));
  // la vista previa con el botón
  r = await p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    ROHO_IMP = rohoArmarPedidos(xlsxHoja(await xlsxDescomprimir(bin.buffer))); ROHO_TURNO = 'AM'; ROHO_VIEJOS = false; renderImportRoho();
    const box = document.getElementById('roho-completar');
    return { box: box ? box.textContent.replace(/\s+/g, ' ') : '', btn: !!document.getElementById('roho-completar-btn'), cols: (document.querySelector('.roho-cols') || {}).textContent || '' };
  }, exc.toString('base64'));
  chk('7d. la vista previa muestra el recuadro «🩹 … sin el nombre del cliente» con su botón', /2 sin el nombre del cliente/.test(r.box) && r.btn, r.box.slice(0, 300));
  chk('7e. y qué columnas del cliente leyó', /✓ Nombre/.test(r.cols) && /✓ Teléfono/.test(r.cols) && /✓ Quién recibe/.test(r.cols), r.cols);
  const antes = { r1: S.fila('R1'), r2: S.fila('R2'), r3: S.fila('R3'), r4: S.fila('R4') };
  await p.evaluate(() => { rohoCompletar(); rohoCompletar(); });
  await p.waitForTimeout(1500);
  const r1 = S.fila('R1'), r2 = S.fila('R2'), r3 = S.fila('R3'), r4 = S.fila('R4');
  chk('7f. R1 en la planilla: cliente, celular, dirección, NIT y referencia', r1.cliente === 'CLIENTE INVENTADO R1' && String(r1.celular) === '73000001' && r1.direccion === 'Calle R1 casa 1' && String(r1.nit) === '1234567' && /📍 Frente al parque/.test(r1.observaciones) && /Recibe: R1 RECIBE/.test(r1.observaciones), { c: r1.cliente, cel: r1.celular, d: r1.direccion, nit: r1.nit, o: r1.observaciones });
  chk('7g. R2 completo y su fecha y turno (17/11 PM) NO cambiaron', r2.cliente === 'CLIENTE INVENTADO R2' && r2.fecha === '2026-11-17' && String(r2.turno) === 'PM' && r2.direccion === 'Calle R2', { c: r2.cliente, f: r2.fecha, t: r2.turno });
  chk('7h. los productos, la fecha y el N° del día de R1 quedaron igual', JSON.stringify(r1.productos) === JSON.stringify(antes.r1.productos) && r1.fecha === antes.r1.fecha && String(r1.nroDia) === String(antes.r1.nroDia), { antes: antes.r1.productos, ahora: r1.productos });
  chk('7i. «Importado del Excel de ROHO» no se repite en las observaciones', (r1.observaciones.match(/Importado del Excel de ROHO/g) || []).length === 1, r1.observaciones);
  chk('7j. lo escrito a mano en R3 (nombre, celular, dirección) NO se tocó', r3.cliente === 'NOMBRE ESCRITO A MANO' && String(r3.celular) === '71111111' && r3.direccion === 'Dirección corregida a mano' && /Llamar antes/.test(r3.observaciones), { c: r3.cliente, cel: r3.celular, d: r3.direccion, o: r3.observaciones });
  chk('7k. la entrega vieja R4 no se tocó', Number(r4.rev) === Number(antes.r4.rev), { antes: antes.r4.rev, ahora: r4.rev });
  r = await p.evaluate(() => ({ prog: (document.getElementById('roho-completar-prog') || {}).textContent || '', toasts: window._toasts.join(' | '), cola: getPending().length }));
  chk('7l. dice cuántos se completaron, el doble toque no corre dos veces y nada queda en la cola', /completado/.test(r.prog) && /Ya se están completando/.test(r.toasts) && r.cola === 0, r);
  r = await leer(exc);
  chk('7m. volver a subir el mismo Excel ya no ofrece completar los del sábado', !r.completar.some(x => x.oc === '400001' || x.oc === '400002'), r.completar.map(x => x.oc));

  chk('sin errores de la página', !errores.length, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
