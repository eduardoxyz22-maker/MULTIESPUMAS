/* 💾 PROBAR EL RESPALDO UNA VEZ POR MES (22/11, mejora 453; servidor 2026-11-22-a).
   `backupDiario` deja 30 copias de la planilla en Drive y nadie probó nunca que una SIRVA. `probarRespaldo()` abre la última copia y
   la compara con la planilla de ahora fila por fila (id y sello), sin tocar nada; el resultado va a RESPALDO_PRUEBA y la lectura `list`
   lo lleva chico (`rp`). En la página, «Para hacer» de Administración avisa si falló o si hace más de 40 días que no se prueba.
   Lo que cuida:
   1. Una copia sana: lo cargado, cambiado o borrado DESPUÉS de la copia no es error.
   2. Una copia mala: una fila con el mismo sello pero distinta, una fila de antes de la copia que falta, una copia vieja, una copia
      sin la hoja «Pedidos», ninguna copia: no sirve, y dice por qué.
   3. La lectura lleva `rp` (chico, sin datos de clientes); `probarRespaldoAuto` corre solo los lunes, y solo el primero del mes (o si la
      última falló o tiene más de un mes); `instalarDisparadores` lo agenda; `probarAntesDeImplementar` dice el estado.
   4. Página: el aviso rojo / ámbar en «Para hacer» solo con la contraseña o en un aparato de administración, y solo con el servidor
      nuevo; «📊 Uso del panel» dice «💾 Respaldo probado el …».
   Solo datos inventados. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_respaldo_prueba.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function hacerHoja(filas) {
  const datos = (filas || []).map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); },
    getRange: (fila, col, nFilas, nCols) => {
      if (typeof fila === 'string') return { setNumberFormat: () => {} };
      return {
        getValue: () => (datos[fila - 1] || [])[col - 1],
        setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
        getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
        setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
        setFontWeight: () => {}, setNumberFormat: () => {}
      };
    }
  };
}
/* `copias`: [{ id, nombre, t, filas (o null = sin hoja «Pedidos») }] */
function servidor(copias, props0, conOnWeekDay) {
  const props = Object.assign({}, props0 || {}), main = hacerHoja([]), otras = {};
  const ss = { getSheetByName: (n) => n === 'Pedidos' ? main : (otras[n] || null), insertSheet: (n) => (otras[n] = hacerHoja([])), getId: () => 'planilla' };
  const libros = {};
  (copias || []).forEach(c => { libros[c.id] = { getSheetByName: (n) => (n === 'Pedidos' && c.filas) ? hacerHoja(c.filas) : null }; });
  const archivos = (copias || []).map(c => ({ getId: () => c.id, getName: () => c.nombre, getDateCreated: () => new Date(c.t) }));
  const carpetaB = { getId: () => 'c-bk', getFiles: () => { let i = 0; return { hasNext: () => i < archivos.length, next: () => archivos[i++] }; } };
  const triggers = [];
  const tb = (fn) => {
    const o = { after: () => ({ create: () => triggers.push({ fn, tipo: 'after' }) }), everyMinutes: () => ({ create: () => triggers.push({ fn, tipo: 'min' }) }),
      everyDays: () => ({ atHour: (h) => ({ create: () => triggers.push({ fn, tipo: 'dia', h }) }) }) };
    if (conOnWeekDay) o.onWeekDay = (d) => ({ atHour: (h) => ({ create: () => triggers.push({ fn, tipo: 'semana', d, h }) }) });
    return o;
  };
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: (id) => { if (!libros[id]) throw new Error('No se puede abrir ' + id); return libros[id]; }, flush: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: (n) => { const hay = n === 'Backups Pedidos MultiEspumas' && copias != null; let u = false; return { hasNext: () => hay && !u, next: () => { u = true; return carpetaB; } }; },
                createFolder: () => carpetaB, getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({ getBytes: () => [] }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: (fn) => ({ timeBased: () => tb(fn) }), getProjectTriggers: () => triggers.map(t => ({ getHandlerFunction: () => t.fn })), deleteTrigger: () => {},
                 WeekDay: conOnWeekDay ? { MONDAY: 'MONDAY' } : undefined }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  ctx.getSheet();
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) }, parameter: {} })._t);
  return { ctx, main, props, post, triggers };
}
const AHORA = Date.now();
const H = 3600000;
function fila(ctx, o, rev) {
  const rec = Object.assign({ id: 'x', fecha: '2026-11-25', oc: '11-001', vendedor: 'Mirian Salazar', cliente: 'CLIENTE INVENTADO', celular: '70000002', turno: 'AM', zona: 'Norte',
    direccion: 'Calle 1', maps: '', pagado: false, saldo: 1500, ts: AHORA - 48 * H, metodoPago: 'Efectivo 500 @2026-11-20', observaciones: '', estado: '', entregado: false,
    vehiculo: '', chofer: '', garantia: '', nota: '1', acuenta: 500, facturarA: '', nit: '', nroDia: 1, verificado: false, fotos: [], productos: [{ desc: 'COLCHON', cant: 1, precio: 2000 }] }, o);
  const row = ctx.recToRow(rec); row[ctx.REV_COL - 1] = rev; return row;
}
/* Arma una planilla «de ahora» y su copia de hace `hCopia` horas, con lo que cada prueba cambia. */
function armar(hCopia, cambiarCopia, cambiarHoy, opts) {
  const tCopia = AHORA - hCopia * H;
  const base = servidor([], {});
  const HDR = base.main._datos[0].slice();
  const viejas = [fila(base.ctx, { id: 'a1', cliente: 'UNO' }, tCopia - 10 * H), fila(base.ctx, { id: 'a2', cliente: 'DOS' }, tCopia - 9 * H), fila(base.ctx, { id: 'a3', cliente: 'TRES' }, tCopia - 8 * H)];
  let copia = [HDR].concat(viejas.map(f => f.slice()));
  let hoy = viejas.map(f => f.slice());
  if (cambiarCopia) copia = cambiarCopia(copia, base.ctx, tCopia) || copia;
  if (cambiarHoy) hoy = cambiarHoy(hoy, base.ctx, tCopia) || hoy;
  const S = servidor((opts && opts.sinCopias) ? null : [{ id: 'bk1', nombre: 'Pedidos 2026-11-22_02-15', t: tCopia, filas: (opts && opts.sinHoja) ? null : copia }], {});
  hoy.forEach(f => S.main._datos.push(f));
  return S;
}

console.log('\n── 1. Una copia sana ──');
{
  const S = armar(8, null, (hoy, ctx, tC) => {
    hoy.push(fila(ctx, { id: 'nuevo', cliente: 'CARGADO DESPUÉS', ts: AHORA - H }, AHORA - H));   // cargado después de la copia
    hoy[1] = fila(ctx, { id: 'a2', cliente: 'DOS', observaciones: 'cambiado después' }, AHORA - 2 * H);   // cambiado después
    hoy.splice(2, 1);                                                                                  // a3 borrado después
    return hoy;
  });
  const R = S.ctx.probarRespaldo();
  chk('⚠️ la copia sirve: lo cargado, cambiado o borrado DESPUÉS de la copia no es error', R.ok === true && R.filasResp === 3 && R.iguales === 1 && R.cambiadas === 1 && R.nuevas === 1 && R.borradas === 1 && R.distintas === 0 && R.faltan === 0, R);
  chk('…y lo dice en palabras', /se abre y tiene las 3 filas/.test(R.detalle), R.detalle);
  const P = JSON.parse(S.props.RESPALDO_PRUEBA || 'null');
  chk('queda guardado en RESPALDO_PRUEBA', !!P && P.ok === true && P.t > 0 && P.archivo === 'Pedidos 2026-11-22_02-15', P && { ok: P.ok, archivo: P.archivo });
  const L = S.post({ action: 'list' });
  chk('⚠️ la lectura `list` lo lleva chico (`rp`): cuándo, si sirve, cuántas filas', !!L.rp && L.rp.ok === 1 && L.rp.fr === 3 && L.rp.t === P.t && JSON.stringify(L.rp).length < 400, L.rp);
  chk('…sin ningún dato de clientes', !/UNO|DOS|TRES|CARGADO|70000002|Calle/.test(JSON.stringify(L.rp)), L.rp);
  chk('…y una planilla sin prueba no lleva `rp`', !('rp' in servidor([], {}).post({ action: 'list' })));
}
console.log('\n── 2. Copias que NO sirven ──');
{
  let S = armar(8, (copia) => { copia[2][4] = 'DOS CAMBIADO EN LA COPIA'; return copia; });
  let R = S.ctx.probarRespaldo();
  chk('⚠️ una fila con el mismo sello pero distinta: no sirve', R.ok === false && R.distintas === 1 && /mismo sello pero distintas \(a2\)/.test(R.detalle), R.detalle);
  S = armar(8, (copia) => { copia.splice(3, 1); return copia; });
  R = S.ctx.probarRespaldo();
  chk('⚠️ falta una fila que ya estaba antes de la copia: no sirve (la copia quedó corta)', R.ok === false && R.faltan === 1 && /a3/.test(R.detalle), R.detalle);
  S = armar(60);
  R = S.ctx.probarRespaldo();
  chk('⚠️ la última copia tiene más de 36 horas: no sirve (el respaldo de cada noche no corre)', R.ok === false && /60 horas/.test(R.detalle), R.detalle);
  S = armar(8, null, null, { sinHoja: true });
  R = S.ctx.probarRespaldo();
  chk('una copia sin la hoja «Pedidos»: no sirve', R.ok === false && /no tiene la hoja/.test(R.detalle), R.detalle);
  S = armar(8, null, null, { sinCopias: true });
  R = S.ctx.probarRespaldo();
  chk('ninguna copia: no sirve, y lo dice', R.ok === false && /no hay ninguna copia/.test(R.detalle), R.detalle);
  const L = S.post({ action: 'list' });
  chk('la lectura lleva la prueba que falló (ok:0)', !!L.rp && L.rp.ok === 0 && /no hay ninguna copia/.test(L.rp.d), L.rp);
  chk('probar no toca la planilla', S.main._datos.length === 4);
}
console.log('\n── 3. Cuándo corre solo ──');
{
  const conFecha = (S, iso, fn) => { const RealDate = Date, fijo = RealDate.parse(iso);
    class F extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fijo); } static now() { return fijo; } }
    S.ctx.Date = F; try { return fn(); } finally { S.ctx.Date = RealDate; } };
  let S = armar(8);
  chk('⚠️ el primer lunes del mes, corre', !!conFecha(S, '2026-12-07T05:30:00-04:00', () => S.ctx.probarRespaldoAuto()));
  S = armar(8);
  chk('un martes, no', conFecha(S, '2026-12-08T05:30:00-04:00', () => S.ctx.probarRespaldoAuto()) === null && !S.props.RESPALDO_PRUEBA);
  S = armar(8);
  S.props.RESPALDO_PRUEBA = JSON.stringify({ t: Date.parse('2026-12-07T05:30:00-04:00'), ok: true });
  chk('⚠️ el segundo lunes con la última bien y de hace una semana, no', conFecha(S, '2026-12-14T05:30:00-04:00', () => S.ctx.probarRespaldoAuto()) === null);
  S.props.RESPALDO_PRUEBA = JSON.stringify({ t: Date.parse('2026-12-07T05:30:00-04:00'), ok: false });
  chk('⚠️ …pero si la última falló, sí (vuelve a probar el lunes siguiente)', !!conFecha(S, '2026-12-14T05:30:00-04:00', () => S.ctx.probarRespaldoAuto()));
  S.props.RESPALDO_PRUEBA = JSON.stringify({ t: Date.parse('2026-11-02T05:30:00-04:00'), ok: true });
  chk('…y si la última tiene más de 31 días, también', !!conFecha(S, '2026-12-14T05:30:00-04:00', () => S.ctx.probarRespaldoAuto()));
  const S2 = servidor([], {}, true);
  S2.ctx.instalarDisparadores();
  const t2 = S2.triggers.find(t => t.fn === 'probarRespaldoAuto');
  chk('⚠️ instalarDisparadores lo agenda los lunes a las 5', !!t2 && t2.tipo === 'semana' && t2.d === 'MONDAY' && t2.h === 5, t2);
  const S3 = servidor([], {}, false);
  S3.ctx.instalarDisparadores();
  const t3 = S3.triggers.find(t => t.fn === 'probarRespaldoAuto');
  chk('…y con un Google sin onWeekDay, cada madrugada (la función mira que sea lunes)', !!t3 && t3.tipo === 'dia' && t3.h === 5, t3);
  const pr = S2.ctx.probarAntesDeImplementar();
  chk('⚠️ probarAntesDeImplementar dice que el respaldo nunca se probó', pr.lineas.some(l => /⚠️ El respaldo de la planilla nunca se probó/.test(l)), pr.lineas.filter(l => /respaldo/i.test(l)));
  S2.props.RESPALDO_PRUEBA = JSON.stringify({ t: Date.now(), ok: true, detalle: 'la copia se abre' });
  const pr2 = S2.ctx.probarAntesDeImplementar();
  chk('…y, probado, que sirve', pr2.lineas.some(l => /✅ El respaldo se probó el .* y sirve/.test(l)), pr2.lineas.filter(l => /respaldo/i.test(l)));
}

// ══ 4. Página ═══════════════════════════════════════════════════════════════
(async () => {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 }, timezoneId: 'America/La_Paz' });
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-22T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  console.log('\n── 4. Página: «Para hacer» y «Uso del panel» ──');
  const r = await page.evaluate(() => {
    var hoy = Date.now(), dia = 864e5, out = {};
    var item = function () { var I = admHacerDatos().filter(function (x) { return x.k === 'resp'; }); return I[0] || null; };
    window.RSP_PRUEBA = true; UNLOCKED = true; try { quienRol(''); } catch (e) {}
    SERVER_VER = '2026-11-21-a'; rspTomar(null); out.viejo = item();
    SERVER_VER = '2026-11-22-a';
    rspTomar(null); out.nunca = item();
    rspTomar({ t: hoy - 2 * dia, ok: 0, fr: 0, fh: 900, d: 'no hay ninguna copia en la carpeta «Backups Pedidos MultiEspumas»' }); out.mal = item(); out.av = JSON.stringify(ADM_AV.resp);
    rspTomar({ t: hoy - 45 * dia, ok: 1, fr: 900, fh: 910, d: 'la copia se abre' }); out.viejoOk = item();
    rspTomar({ t: hoy - 3 * dia, ok: 1, fr: 900, fh: 910, d: 'la copia se abre' }); out.bien = item(); out.linea = rspLinea();
    UNLOCKED = false; try { localStorage.removeItem(LS_ADM_DEV); } catch (e) {}
    rspTomar({ t: hoy - 2 * dia, ok: 0, d: 'falló' }); out.vendedor = item();
    window.RSP_PRUEBA = false; UNLOCKED = true; out.sinFlag = item();
    window.RSP_PRUEBA = true; usoAbrir(); var lin = document.getElementById('rsp-linea'); out.uso = lin ? lin.textContent : ''; closeModal();
    return out;
  });
  chk('⚠️ con un servidor anterior no dice nada (no se sabe)', r.viejo === null, r.viejo);
  chk('⚠️ con el servidor nuevo y sin ninguna prueba: ámbar «nunca se probó»', !!r.nunca && r.nunca.sev === 'a' && /nunca se probó/.test(r.nunca.t), r.nunca);
  chk('⚠️ la última prueba falló: rojo, con el motivo, y los números en ADM_AV', !!r.mal && r.mal.sev === 'r' && /NO sirve/.test(r.mal.t) && /no hay ninguna copia/.test(r.mal.s) && /"est":"mal"/.test(r.av), { mal: r.mal, av: r.av });
  chk('⚠️ la última bien pero de hace 45 días: ámbar', !!r.viejoOk && r.viejoOk.sev === 'a' && /Hace 45 días/.test(r.viejoOk.t), r.viejoOk);
  chk('bien y reciente: nada en «Para hacer»', r.bien === null, r.bien);
  chk('«💾 Respaldo probado el …: ✅ sirve»', /💾 Respaldo probado el .*: ✅ sirve \(900 filas/.test(r.linea), r.linea);
  chk('⚠️ una vendedora (sin la contraseña ni el aparato de administración) no lo ve', r.vendedor === null, r.vendedor);
  chk('en Playwright sin RSP_PRUEBA, nada', r.sinFlag === null, r.sinFlag);
  chk('«📊 Uso del panel» trae la línea del respaldo', /💾 Respaldo probado el/.test(r.uso), r.uso);
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
