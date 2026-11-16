/* 📥 301 · EL EXCEL DEL STOCK: SOLTARLO Y «USAR LOS TRES» (15/11, dueño: aprobado).

   El 13/11 se subieron 6 Excel (dos vueltas de los tres almacenes): cada vuelta era abrir Stock, «📥 Subir existencias», buscar el
   archivo en la ventana de Windows y confirmar PTF, Banzer e IM de a uno.
   · Soltar el archivo sobre el panel (con Stock abierto o con la contraseña) abre la vista previa de siempre (`onExistArchivo`).
   · Si NINGUNO de los almacenes del archivo tiene nada para mirar, la vista previa ofrece «✅ Usar los 3», que hace lo de «Usar» en cada
     uno (`confirmarImportExist`), de a uno, mirando cada uno otra vez antes: si alguno resulta tener algo, se para ahí.

   Lo que se mira (Excel armados en la prueba, con la forma del reporte de Moreno; datos sintéticos):
     1. Sin la bandera (`EXIST_SOLTAR_PRUEBA`) la vista previa es la de siempre (sin «Usar los 3») y soltar no hace nada.
     2. Con los tres que cuadran: «✅ Los 3 almacenes cierran», cada uno con «✓ todo cierra» y los turnos, y «✅ Usar los 3 (…)».
     3. Tocarlo deja los tres conteos del día (como «Usar» en cada uno), cierra la vista previa y dice cuáles usó.
     4. Con una diferencia sin explicar en PTF, o en Banzer (el que sigue), no se ofrece: se va uno por uno como siempre.
     5. Si mientras tanto el que sigue deja de cuadrar, usa PTF y se para en Banzer con su vista previa abierta, y lo dice.
     6. Cambiar «¿Qué almacén es?» saca el botón.
     7. Soltar el Excel (con la contraseña) abre la vista previa; mientras se arrastra, «📥 Soltá acá el Excel…»; un archivo que no es
        .xlsx se avisa y no se lee; sin contraseña y sin Stock abierto, soltar no hace nada.

   Reloj clavado en el viernes 16/10/2026 10:20 de Bolivia. Red cortada.
   Se corre:  node tests/test_excel_soltar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

/* ── un .xlsx de verdad (ZIP sin comprimir), como el de `test_existencias_tres.js` ── */
function crc32(buf) { let crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xEDB88320) : (c >>> 1); crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function zip(files) {
  const partes = [], central = []; let off = 0;
  files.forEach(f => {
    const name = Buffer.from(f.name, 'utf8'), data = Buffer.from(f.data, 'utf8'), crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    partes.push(lh, name, data);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, name); off += 30 + name.length + data.length;
  });
  const cd = Buffer.concat(central), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10); eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat(partes.concat([cd, eocd]));
}
const escX = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function reporte({ al = '16/10/2026', pie = '16/10/2026 10:10:16', cab = '01-05-103  IM - PRODUCTOTERMINADO', bloques }) {
  const celda = (ref, v) => typeof v === 'number' ? `<c r='${ref}' s='11'><v>${v}</v></c>` : `<c r='${ref}' t='inlineStr' s='11'><is><t>${escX(v)}</t></is></c>`;
  let n = 0; const filas = []; const fila = (cs) => { n++; filas.push(`<row r="${n}">${cs.map(([c, v]) => celda(c + n, v)).join('')}</row>`); };
  fila([['C', 'MULTIESPUMAS']]);
  fila([['C', 'MORENO'], ['X', 'EXISTENCIAS ALMACEN  AL '], ['AR', al]]);
  fila([['BC', '(Productos con existencia <> 0)']]);
  fila([['F', 'Almacén Inicial :'], ['P', cab], ['AK', 'Almacén Final :'], ['AX', cab]]);
  fila([['C', 'Línea de Productos'], ['BA', 'Cantidad']]);
  fila([['G', 'Código Producto'], ['W', 'Nombre Producto'], ['AZ', ' CUI'], ['BD', 'Unidad']]);
  let gral = 0;
  bloques.forEach(b => {
    fila([['Y', Number(b.cod)], ['AE', b.alm]]);
    fila([['B', 'COLCHONES PROPIOS']]); fila([['D', 'HEAVEN']]);
    b.items.forEach(it => fila([['G', it[0]], ['W', it[1]], ['AY', it[2]], ['BD', 'PZA']]));
    const s = b.items.reduce((a, it) => a + it[2], 0);
    fila([['H', 'SUBTOTAL'], ['M', 'HEAVEN'], ['AV', s]]);
    fila([['Q', 'TOTAL :'], ['U', b.alm], ['AV', s]]); gral += s;
  });
  fila([['AF', 'TOTAL GENERAL :'], ['AV', gral]]);
  if (pie) fila([['B', 'iv380_34'], ['Z', 'Página 1 de 1'], ['AZ', 'Fecha : ' + pie + ' - logistica']]);
  const hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + filas.join('') + '</sheetData></worksheet>';
  return zip([{ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>' },
    { name: 'xl/worksheets/sheet1.xml', data: hoja }]);
}
const LOG = 'PRODUCTOS TERMINADOS FAB.', BZ = 'Almacen Distribucion Banzer', IM = 'IM - PRODUCTOTERMINADO';
const TRES = reporte({ bloques: [
  { cod: '105003', alm: LOG, items: [['CH1201', 'TITANIO ICE 2.5PLZ 160X190CM', 13], ['CH1129', 'COLCHON TITANIO LATEX 140X190', 4]] },
  { cod: '105025', alm: BZ, items: [['CH1201', 'TITANIO ICE 2.5PLZ 160X190CM', 7], ['CH1129', 'COLCHON TITANIO LATEX 140X190', 2]] },
  { cod: '105103', alm: IM, items: [['CH1201', 'TITANIO ICE 2.5PLZ 160X190CM', 30]] }] });

/* El stock de ayer: los tres conteos IGUALES al Excel (sin pedidos en el medio) = todo cuadra. `dif` cambia uno. */
function BASE(o) {
  var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
  CONNECTED = true; UNLOCKED = !!o.unlocked; SERVER_AUTH = 'abierto';
  try { localStorage.removeItem(LS_PEND); } catch (e) {}
  if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; } if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO = 'ok';
  apiSave = function (rec) { return Promise.resolve({ ok: true, pedido: rec }); };
  apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
  window._toasts = []; var _t = toast; toast = function (m, k, ms) { window._toasts.push(String(m)); return _t(m, k, ms); };
  var K = stockClave({ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201' }), K2 = stockClave({ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129' });
  window.K = K; window.K2 = K2;
  STOCK = stockVacio(); STOCK_CARGADO = true; STATE = [];
  var ayer = '2026-10-15', t0 = Date.now() - 86400000;
  STOCK.c = { f: ayer, hora: '18:00:00', u: {}, solo0: true, alm: o.LOG, t: t0 }; STOCK.c.u[K] = 13 + (o.difPtf || 0); STOCK.c.u[K2] = 4;
  STOCK.g = {}; STOCK.g[o.BZ] = { f: ayer, hora: '18:00:00', u: {}, solo0: true, t: t0, rs: {} }; STOCK.g[o.BZ].u[K] = 7 + (o.difBz || 0); STOCK.g[o.BZ].u[K2] = 2;
  STOCK.g[o.IM] = { f: ayer, hora: '18:00:00', u: {}, solo0: true, t: t0, rs: {} }; STOCK.g[o.IM].u[K] = 30;
  STOCK.al = {}; STOCK.al[o.LOG] = 'log'; STOCK.al[o.BZ] = 'sale'; STOCK.al[o.IM] = 'otro';
  STOCK.p = []; stockOlvidarIndice();
  window._vista = function () { var R = EXIST_IMP, t = document.getElementById('exs-tres'); return { alm: R ? R.almacen : null, cola: (EXIST_COLA || []).length, tres: t ? t.innerText.replace(/\s+/g, ' ').trim() : '', modal: document.getElementById('modal').classList.contains('on'), usar: ((document.getElementById('exist-usar') || {}).textContent || '') }; };
  window._fechas = function () { return { c: STOCK.c.f + ' ' + STOCK.c.hora, bz: STOCK.g[o.BZ].f, im: STOCK.g[o.IM].f, cK: STOCK.c.u[K], bzK: STOCK.g[o.BZ].u[K], imK: STOCK.g[o.IM].u[K] }; };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const nueva = async (flag, o) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.EXIST_SOLTAR_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-10-16T10:20:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.evaluate(BASE, Object.assign({ LOG, BZ, IM }, o || {}));
    return { ctx, page };
  };
  const subir = async (page) => {
    await page.setInputFiles('#exist-input', { name: 'Excel_16-10-2026_10_12_15.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: TRES });
    await page.waitForFunction(() => !!EXIST_IMP, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(200);
    return page.evaluate(() => _vista());
  };
  const B64 = TRES.toString('base64');
  const soltar = (page, nombre, tipo) => page.evaluate(([b64, nombre, tipo]) => {
    var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    var dt = new DataTransfer(); dt.items.add(new File([u], nombre, { type: tipo }));
    var ov = new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }); document.body.dispatchEvent(ov);
    var z = document.getElementById('exs-zona'), zona = !!(z && !z.hidden) ? z.innerText.replace(/\s+/g, ' ').trim() : '';
    var dr = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); document.body.dispatchEvent(dr);
    return { zona: zona, tomado: dr.defaultPrevented, sigue: !!(z && !z.hidden) };
  }, [B64, nombre, tipo]);

  // ═══ 1. sin la bandera ═══
  let { ctx, page } = await nueva(false, { unlocked: true });
  let v = await subir(page);
  chk('1a sin la bandera: la vista previa de siempre, sin «Usar los 3»', v.alm === LOG && v.tres === '' && /seguir con Banzer/.test(v.usar), v);
  await page.evaluate(() => existCancelar());
  let s = await soltar(page, 'Excel_16-10-2026_10_12_15.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  chk('1b …y soltar un archivo no hace nada (como siempre)', !s.tomado && !s.zona, s);
  await ctx.close();

  // ═══ 2-3. todo cuadra ═══
  ({ ctx, page } = await nueva(true, { unlocked: true }));
  v = await subir(page);
  chk('2a «✅ Los 3 almacenes cierran» con los tres y «✓ todo cierra»', /Los 3 almacenes cierran/.test(v.tres) && (v.tres.match(/✓ todo cierra/g) || []).length === 3, v.tres);
  chk('2b …dice los turnos de los que salen camiones (PTF y Banzer) y no de Moreno', /PTF .*🌅/.test(v.tres) && /Banzer .*🌅/.test(v.tres), v.tres);
  chk('2c el botón «✅ Usar los 3 (PTF, Banzer, …)»', /Usar los 3 \(PTF, Banzer, /.test(v.tres), v.tres);
  await page.click('#exs-tres-btn');
  await page.waitForFunction(() => !EXIST_IMP && !EXIST_GUARDANDO, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  let f = await page.evaluate(() => Object.assign(_fechas(), _vista(), { t: _toasts.slice(-1)[0] || '' }));
  chk('3a deja los tres conteos del día (como «Usar» en cada uno)', /^2026-10-16 10:10:16$/.test(f.c) && f.bz === '2026-10-16' && f.im === '2026-10-16' && f.cK === 13 && f.bzK === 7 && f.imK === 30, f);
  chk('3b cierra la vista previa y dice cuáles usó', !f.modal && /Usados 3: PTF, Banzer, /.test(f.t), f.t);
  await ctx.close();

  // ═══ 4. con algo para mirar, no se ofrece ═══
  for (const [nom, o] of [['PTF', { difPtf: -2 }], ['Banzer (el que sigue)', { difBz: 3 }]]) {
    ({ ctx, page } = await nueva(true, Object.assign({ unlocked: true }, o)));
    v = await subir(page);
    chk('4 con una diferencia sin explicar en ' + nom + ' no se ofrece (uno por uno, como siempre)', v.alm === LOG && v.tres === '' && /seguir con Banzer/.test(v.usar), v);
    await ctx.close();
  }

  // ═══ 5. el que sigue deja de cuadrar mientras tanto ═══
  ({ ctx, page } = await nueva(true, { unlocked: true }));
  v = await subir(page);
  await page.evaluate(() => { STOCK.g['Almacen Distribucion Banzer'].u[K] = 4; stockOlvidarIndice(); });   // ahora Banzer tiene +3 sin explicar
  await page.click('#exs-tres-btn');
  await page.waitForTimeout(800);
  f = await page.evaluate(() => Object.assign(_fechas(), _vista(), { t: _toasts.slice(-1)[0] || '' }));
  chk('5a usa PTF y se para en Banzer, con su vista previa abierta', /^2026-10-16/.test(f.c) && f.bz === '2026-10-15' && f.alm === BZ && f.modal, f);
  chk('5b …y lo dice («✋ … Banzer… quedó abierto»)', /Usados 1: PTF/.test(f.t) && /✋/.test(f.t) && /Banzer/.test(f.t), f.t);
  await ctx.close();

  // ═══ 6. cambiar qué almacén es ═══
  ({ ctx, page } = await nueva(true, { unlocked: true }));
  v = await subir(page);
  await page.selectOption('#exist-rol', 'otro'); await page.waitForTimeout(100);
  v = await page.evaluate(() => _vista());
  chk('6 cambiar «¿Qué almacén es?» saca el botón', v.tres === '', v);
  await page.evaluate(() => existCancelar());

  // ═══ 7. soltar ═══
  s = await soltar(page, 'Excel_16-10-2026_10_12_15.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  chk('7a mientras se arrastra: «📥 Soltá acá el Excel…»; al soltar lo toma', /Soltá acá el Excel/.test(s.zona) && s.tomado && !s.sigue, s);
  await page.waitForFunction(() => !!EXIST_IMP, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200);
  v = await page.evaluate(() => Object.assign(_vista(), { stock: document.getElementById('stock-overlay').style.display }));
  chk('7b …abre Stock y la vista previa de siempre (PTF, 1 de 3)', v.alm === LOG && v.cola === 2 && v.modal && v.stock === 'flex', v);
  await page.evaluate(() => existCancelar());
  s = await soltar(page, 'foto.png', 'image/png');
  const t = await page.evaluate(() => _toasts.slice(-1)[0] || '');
  chk('7c un archivo que no es .xlsx: se avisa y no se lee', s.tomado && /Soltá el Excel/.test(t) && !(await page.evaluate(() => !!EXIST_IMP)), t);
  await ctx.close();
  ({ ctx, page } = await nueva(true, { unlocked: false }));
  s = await soltar(page, 'Excel_16-10-2026_10_12_15.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  chk('7d sin contraseña y sin Stock abierto, soltar no hace nada', !s.tomado && !s.zona, s);
  await ctx.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
