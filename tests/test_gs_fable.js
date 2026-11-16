/* 🔐🛡️🧷 LA REVISIÓN DE FABLE DEL SERVIDOR 2026-11-16-a (16/11/2026), puntos 1, 2, 4 y 5 — contra el .gs de verdad con un Google y
   un Meta de mentira (ningún mensaje sale de verdad). Datos SINTÉTICOS (el repo es público).
     1. La clave del equipo se CIERRA ante un error: si Google no deja leer las Propiedades (falla pasajera o cupo agotado), un `list`
        o un `save` contestan `busy` (el panel reintenta), nunca los datos. Sin clave configurada y leyendo bien, pasa como siempre.
        GET_CERRADO sin poder leer = cerrado. Y la configuración se lee UNA vez por llamada (`getProperties`).
     2. «Rechazos»: un guardado SIN la clave (o un cuerpo que no es JSON) no copia nada de lo que trae (ni el cliente con una
        fórmula) y entran como mucho RECHAZOS_AJENOS_MIN filas por minuto; un rechazo de verdad lleva el texto con «'» si empieza con
        =, +, - o @. Los avisos de Meta con otra clave se cuentan en la caché, no en Propiedades.
     4. La última línea del archivo es `var FIN_DEL_ARCHIVO = '<SCRIPT_VERSION>';`; un pegado cortado no la tiene, y
        probarAntesDeImplementar lo dice con ❌.
     5. El bot: si un mensaje revienta al armarse, vuelve a la salida (n+1) y los demás salen igual; si revienta la lectura de la
        planilla, TODO lo tomado vuelve a la salida; si revienta el porqué de la semana, la vuelta sigue.
   Se corre:  node tests/test_gs_fable.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

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
const pasar = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
/* `opc.propsMal` = las Propiedades no se pueden leer (getProperty y getProperties revientan, como con el cupo agotado);
   `opc.lecturas` cuenta las lecturas de la configuración. */
function servidor(props, opc) {
  opc = opc || {};
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {}), CACHE = {}, cuenta = { getProperties: 0, getProperty: 0 };
  const meta = { llamadas: [], n: 0 };
  const sp = {
    getProperty: (k) => { if (opc.propsMal && opc.propsMal()) throw new Error('Service invoked too many times: properties'); cuenta.getProperty++; return P[k] != null ? P[k] : null; },
    getProperties: () => { if (opc.propsMal && opc.propsMal()) throw new Error('Service invoked too many times: properties'); cuenta.getProperties++; return Object.assign({}, P); },
    setProperty: (k, v) => { P[k] = String(v); }, deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o)
  };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => sp },
    UrlFetchApp: { fetch: (url, o) => {
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + (++meta.n) }] }) };
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => CACHE[k] != null ? CACHE[k] : null, put: (k, v) => { CACHE[k] = String(v); }, putAll() {}, remove: (k) => { delete CACHE[k]; }, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; }, getContent() { return t; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
      getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const postTxt = (b, prm) => ctx.doPost({ postData: { contents: typeof b === 'string' ? b : JSON.stringify(b) }, parameter: prm || {} })._t;
  const post = (b, prm) => JSON.parse(postTxt(b, prm));
  const rech = () => (hojas['Rechazos'] ? hojas['Rechazos']._datos.slice(1) : []);
  const salen = () => meta.llamadas.filter(c => c.body && c.body.template).map(c => ({ to: c.body.to, pl: c.body.template.name.replace(/_v2$/, '') }));
  return { ctx, sh, P, CACHE, cuenta, meta, post, postTxt, rech, salen, hojas, repaso: () => ctx.waRepaso() };
}
let nId = 0;
function ped(o) {
  return Object.assign({ id: 'p' + (++nId), fecha: '2026-10-15', oc: '10-0' + (40 + nId), vendedor: 'Carola Chavez', cliente: 'CLIENTE DE PRUEBA',
    productos: [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1', cant: 1, precio: 3200 }], celular: '70111222', turno: 'PM',
    zona: 'Equipetrol', direccion: 'Av. de prueba 123', maps: 'https://www.google.com/maps?q=-17.75,-63.18', pagado: false, saldo: 1200, ts: RELOJ.ms, metodoPago: 'Efectivo 2000',
    observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', garantia: '', nota: '640', acuenta: 2000, facturarA: '', nit: '', rev: 0 }, o || {});
}

// ══ 1. La clave se cierra ante un error ═════════════════════════════════════
console.log('\n── 1. La clave del equipo se CIERRA si no se puede leer la configuración ──');
{
  poner('2026-10-14 10:00');
  let mal = false;
  const S = servidor({}, { propsMal: () => mal });
  const r0 = S.post({ action: 'save', pedido: ped({ id: 'c1' }) });
  chk('sin clave configurada y leyendo bien: guardar anda como siempre', r0.ok === true, r0);
  const l0 = S.post({ action: 'list' });
  chk('…y la lectura trae los pedidos, con auth «abierto»', Array.isArray(l0.pedidos) && l0.pedidos.length === 1 && l0.auth === 'abierto', { n: (l0.pedidos || []).length, auth: l0.auth });
  mal = true;
  const l1 = S.post({ action: 'list' });
  chk('sin poder leer las Propiedades (cupo agotado): la lectura contesta «busy» y NO trae los pedidos', l1.ok === false && l1.error === 'busy' && !l1.pedidos, { ok: l1.ok, error: l1.error, n: (l1.pedidos || []).length });
  chk('…dice que es por las propiedades y la puerta no figura «abierta»', l1.motivo === 'propiedades' && l1.auth !== 'abierto', { motivo: l1.motivo, auth: l1.auth });
  const g1 = S.post({ action: 'save', pedido: ped({ id: 'c2', cliente: 'NO DEBE ENTRAR' }) });
  chk('…y un guardado tampoco entra (`busy`: el panel lo deja en la cola y reintenta)', g1.ok === false && g1.error === 'busy' && !S.sh._datos.some(f => f[0] === 'c2'), g1);
  chk('sin poder leer, GET_CERRADO da «cerrado» (el panel no usa GET)', S.ctx.getCerrado_() === true);
  const gd = JSON.parse(S.ctx.doGet({ parameter: {} })._t);
  chk('…y un GET no se lleva la planilla', gd.ok === false && !gd.pedidos, gd);
  mal = false;
  S.cuenta.getProperties = 0; S.cuenta.getProperty = 0;
  S.post({ action: 'list' });
  chk('leyendo bien de nuevo: la configuración se lee UNA vez por llamada (getProperties), no clave por clave', S.cuenta.getProperties === 1, S.cuenta);

  const K = servidor({ PANEL_KEY: 'clave-de-prueba' });
  chk('con la clave configurada: la buena pasa', K.post({ action: 'list', key: 'clave-de-prueba' }).ok === true);
  const kMal = K.post({ action: 'list', key: 'otra' });
  chk('…la mala da «clave» (no «busy»)', kMal.ok === false && kMal.error === 'clave' && !kMal.pedidos, kMal);
  chk('…y forzar sin poder leer la configuración no se permite', (() => { let m2 = true; const F = servidor({ PANEL_KEY: 'x', ADMIN_KEY: 'y' }, { propsMal: () => m2 }); F.ctx.cfgOlvidar_(); return F.ctx.forzarOk_({ adminKey: 'y' }).ok === false; })());
}

// ══ 2. «Rechazos» sin el texto de afuera ═════════════════════════════════════
console.log('\n── 2. «Rechazos»: lo que mandó alguien sin la clave no se copia, y con tope por minuto ──');
{
  poner('2026-10-14 10:00');
  const S = servidor({ PANEL_KEY: 'clave-de-prueba' });
  for (let i = 0; i < 10; i++) S.post({ action: 'save', key: 'mala', quien: '=HYPERLINK("http://x")', pedido: ped({ id: 'x' + i, cliente: '=IMPORTDATA("http://x")', vendedor: '+591 70000000' }) });
  const R = S.rech();
  chk('10 guardados sin la clave en el mismo minuto: como mucho ' + S.ctx.RECHAZOS_AJENOS_MIN + ' filas', R.length > 0 && R.length <= S.ctx.RECHAZOS_AJENOS_MIN, R.length);
  chk('…sin el id, el cliente, el vendedor ni «quién» que trajeron (nada de eso entra en la planilla)', R.every(f => !f[3] && !f[4] && !f[5] && !f[6] && !/IMPORTDATA|HYPERLINK|591/.test(f.join('|'))), R[0]);
  chk('…y no suman al total de rechazos de verdad (RECHAZOS_N)', !S.P.RECHAZOS_N, S.P.RECHAZOS_N);
  pasar(1);
  S.post({ action: 'save', key: 'mala', pedido: ped({ id: 'y1' }) });
  chk('al minuto siguiente vuelve a anotar (el tope es por minuto)', S.rech().length === R.length + 1, S.rech().length);
  const nB = S.rech().length;
  S.postTxt('esto no es JSON');
  chk('un cuerpo que no es JSON también entra sin nada de lo que trajo', S.rech().length === nB + 1 && S.rech()[nB][2] === 'bad json' && !S.rech()[nB][4], S.rech()[nB]);
  // un rechazo de verdad (con la clave): texto que empieza con + o = va con «'»
  const nC = S.rech().length;
  const r = S.post({ action: 'save', key: 'clave-de-prueba', pedido: { cliente: '+ 2 almohadas', vendedor: '=1+1' } });
  const f = S.rech()[nC] || [];
  chk('un rechazo de verdad (con la clave) se anota con su cliente, pero «+…» y «=…» van con «\'» (texto, no fórmula)', r.ok === false && f[4] === "'+ 2 almohadas" && f[5] === "'=1+1", { r, f });
  const W = servidor({ WA_HOOK_KEY: 'buena' });
  W.ctx.doPost({ parameter: { wa: 'OTRA' }, postData: { contents: '{"entry":[]}' } });
  chk('un aviso de Meta con otra clave se cuenta en la caché, no en Propiedades', !W.P.WA_HOOK_MAL && JSON.parse(W.CACHE.wa_hook_mal || '{}').n === 1, { p: W.P.WA_HOOK_MAL, c: W.CACHE.wa_hook_mal });
}

// ══ 4. El centinela del final ════════════════════════════════════════════════
console.log('\n── 4. La última línea del archivo dice que el pegado llegó entero ──');
{
  const src = fs.readFileSync(GS, 'utf8');
  const lineas = src.replace(/\s+$/, '').split('\n');
  const ult = lineas[lineas.length - 1];
  const vS = (src.match(/var SCRIPT_VERSION = '([^']+)'/) || [])[1], vE = (src.match(/var ESTA_VERSION = '([^']+)'/) || [])[1];
  chk('la ÚLTIMA línea es «var FIN_DEL_ARCHIVO = \'' + vS + '\';», igual a SCRIPT_VERSION y a ESTA_VERSION', ult === "var FIN_DEL_ARCHIVO = '" + vS + "';" && vS === vE, ult);
  chk('probarAntesDeImplementar lo mira (FIN_DEL_ARCHIVO contra ESTA_VERSION) y la cabecera lo dice', /typeof FIN_DEL_ARCHIVO === 'undefined' \|\| FIN_DEL_ARCHIVO !== ESTA_VERSION/.test(src) && /ÚLTIMA línea del archivo tiene que ser/.test(src.slice(0, 3000)));
  // un pegado cortado: sin las últimas 4 líneas (el centinela y su comentario)
  const corto = lineas.slice(0, lineas.length - 4).join('\n');
  const ctx2 = { console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent };
  vm.createContext(ctx2); vm.runInContext(corto, ctx2);
  chk('un pegado cortado justo antes del final carga igual, pero sin FIN_DEL_ARCHIVO (probar daría ❌ CORTADO)', typeof ctx2.FIN_DEL_ARCHIVO === 'undefined' && typeof ctx2.probarAntesDeImplementar === 'function');
  const S = servidor({});
  let out = null; try { out = S.ctx.probarAntesDeImplementar(); } catch (e) { out = { error: String(e) }; }
  const txt = out && out.lineas ? out.lineas.join('\n') : JSON.stringify(out);
  chk('con el archivo entero, probar dice «El código está entero … y la última línea del archivo»', /El código está entero: \d+ funciones clave y la última línea del archivo/.test(txt), txt.split('\n').filter(l => /entero|CORTADO|Faltan/.test(l)));
  S.ctx.FIN_DEL_ARCHIVO = 'otra';
  let out2 = null; try { out2 = S.ctx.probarAntesDeImplementar(); } catch (e) { out2 = { error: String(e) }; }
  const txt2 = out2 && out2.lineas ? out2.lineas.join('\n') : JSON.stringify(out2);
  chk('con la última línea de otra versión, probar dice ❌ CORTADO', /❌ El código quedó CORTADO: no llegó la última línea/.test(txt2), txt2.split('\n').filter(l => /CORTADO|entero/.test(l)));
}

// ══ 5. El bot no pierde lo que tomó ══════════════════════════════════════════
console.log('\n── 5. El bot: un error al armar un mensaje (o al leer la planilla) no pierde lo tomado ──');
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001, David:59172000002' };
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  const r = S.post({ action: 'save', pedido: ped({ id: 'b1', oc: '10-101' }) });
  chk('el pedido se guardó y quedó en la cola del bot', r.ok === true && /b1/.test(S.P.WA_COLA || ''), S.P.WA_COLA);
  const orig = S.ctx.waArmar_;
  S.ctx.waArmar_ = function (m) { if (m.k === 'conf') throw new Error('Kommo no contestó'); return orig.apply(this, arguments); };
  pasar(3); const rr = S.repaso();
  const sal = JSON.parse(S.P.WA_SALIDA || '[]');
  chk('la confirmación que reventó al armarse vuelve a la salida con n = 1 (no se pierde)', sal.some(m => m.k === 'conf' && m.id === 'b1' && m.n === 1), sal);
  chk('…y los avisos a logística salieron igual en esa vuelta', S.salen().filter(x => /^logistica_pedido_nuevo/.test(x.pl)).length === 2, S.salen());
  const bot = S.hojas['Bot WhatsApp'] ? S.hojas['Bot WhatsApp']._datos.slice(1) : [];
  chk('…y en «Bot WhatsApp» queda «falló al armarlo, se reintenta (1)» con el motivo', bot.some(f => /falló al armarlo, se reintenta \(1\)/.test(f[7] || '') && /Kommo no contestó/.test(f[8] || '')), bot.map(f => f[7]));
  S.ctx.waArmar_ = orig; S.meta.llamadas.length = 0;
  pasar(6); S.repaso();
  chk('en la vuelta siguiente (pasados 5 min) la confirmación sale', S.salen().some(x => /^confirmacion_pedido/.test(x.pl) && x.to === '59170111222'), S.salen());
  chk('…y la salida queda vacía', JSON.parse(S.P.WA_SALIDA || '[]').length === 0, S.P.WA_SALIDA);
  chk('el resultado de la vuelta con error tenía reintentos y no se cortó', rr && rr.reintentos >= 1, rr);
}
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  S.post({ action: 'save', pedido: ped({ id: 'b2', oc: '10-102' }) });
  const origR = S.ctx.readAll;
  S.ctx.readAll = function () { throw new Error('Service Spreadsheets timed out'); };
  pasar(3); const rr = S.repaso();
  const sal = JSON.parse(S.P.WA_SALIDA || '[]');
  const delPed = sal.filter(m => m.id === 'b2');
  chk('si revienta la lectura de la planilla, TODO lo tomado vuelve a la salida: la confirmación y los 2 de logística (y los avisos del día de esa vuelta), sin sumarles intentos',
      delPed.length === 3 && delPed.some(m => m.k === 'conf') && delPed.filter(m => m.k === 'ln').length === 2 && sal.every(m => !m.n), sal);
  chk('…no se mandó nada y la vuelta lo dice', S.meta.llamadas.length === 0 && /falló la vuelta/.test(rr.error || ''), rr);
  S.ctx.readAll = origR;
  pasar(1); S.repaso();
  chk('con la planilla de vuelta, sale todo en la vuelta siguiente', S.salen().length === 3 && JSON.parse(S.P.WA_SALIDA || '[]').length === 0, S.salen());
}
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  S.post({ action: 'save', pedido: ped({ id: 'b3', oc: '10-103' }) });
  S.ctx.wpElegir_ = function () { throw new Error('el porqué reventó'); };
  pasar(3); const rr = S.repaso();
  chk('si revienta el porqué de la semana (adentro del candado), la vuelta sigue y los mensajes salen', S.salen().length === 3 && /porqué de la semana/.test(rr.error || ''), { salen: S.salen(), rr });
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
