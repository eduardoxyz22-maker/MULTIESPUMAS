/* 🤖 EL BOT DE WHATSAPP (11/10, §4jt, servidor 2026-10-11-a).

   El dueño (11/10): *«un bot que envíe automático esos mensajes al crear el pedido y otro para logística»*. Lo que esta prueba
   cuida, contra el .gs de verdad con un Google y un Meta de mentira (ningún mensaje sale de verdad):
     1. La lista de vendedores por marca es la MISMA que `MARCAS` de pedidos.html.
     2. Apagado (sin WA_ACTIVO=1) guardar no anota nada y el repaso no habla con Meta.
     3. Pedido nuevo: espera 2 minutos y manda `confirmacion_pedido` al cliente y `logistica_pedido_nuevo` a Ernesto y a David,
        con los datos en el orden de las plantillas (sin saltos de línea), y lo anota en la hoja «Bot WhatsApp».
     4. Corregido enseguida: sale UN mensaje con el día último. Cambio de día: `cambio_entrega` + `logistica_cambio` con
        «pasó del … al …»; ida y vuelta: nada.
     5. A quién no: Eduardo (logística sí), ATC, ROHO (ni logística), venta de tienda, sin celular (queda anotado), borrado.
     6. Meta falla: 5xx se reintenta y sale; un token vencido frena la vuelta y guarda lo pendiente; plantilla mal = error sin
        reintento.
     7. 16:00: «sin camión» a logística una vez por día, nunca el domingo. 17:00: recordatorio del próximo día con camión
        («Mañana» / «El martes» saltando domingo y feriado), sin repetir ni al confirmado hoy; nunca después de las 19:00.
     8. WA_PRUEBA manda todo a ese número; `instalarDisparadores` deja `waRepaso`; `probarAntesDeImplementar` lo informa.
   Datos SINTÉTICOS (el repo es público).

   Se corre:  node tests/test_wa_bot.js   (desde la raíz del repo) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

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
/* El reloj: hora de Bolivia (UTC−4) escrita como '2026-10-14 10:00'. */
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
const pasar = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}

/* Meta de mentira: anota cada pedido y contesta lo que diga `meta.responder` (por defecto, 200 con un id). */
function servidor(props) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 };
  const triggers = [];
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
    DriveApp: {}, Utilities: { formatDate: (d) => String(d) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, tipo: 'after', ms, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyMinutes: (n) => ({ create: () => { const t = { fn, tipo: 'every', n, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyDays: () => ({ atHour: () => ({ create: () => { const t = { fn, tipo: 'daily', getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const guardar = (rec) => { const r = post({ action: 'save', pedido: rec }); if (r.ok) rec.rev = r.pedido.rev; return r; };
  const leer = (id) => ctx.rowToRec_(sh._datos.find(f => f[0] === id));
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = () => meta.llamadas.filter(c => c.body && c.body.template).map(c => ({ to: c.body.to, pl: c.body.template.name.replace(/_v2$/, ''), v2: /_v2$/.test(c.body.template.name), p: c.body.template.components[0].parameters.map(x => x.text) }));
  const limpiar = () => { meta.llamadas.length = 0; };
  return { ctx, sh, P, meta, triggers, post, guardar, leer, hoja, salen, limpiar, repaso: () => ctx.waRepaso() };
}
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001, David:59172000002' };
let nId = 0;
function ped(o) {
  return Object.assign({ id: 'p' + (++nId), fecha: '2026-10-15', oc: '10-0' + (40 + nId), vendedor: 'Carola Chavez', cliente: 'JUAN CARLOS ROCA',
    productos: [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1', cant: 1, precio: 3200 }], celular: '70111222', turno: 'PM',
    zona: 'Equipetrol', direccion: 'Av. Banzer 4to anillo', maps: '', pagado: false, saldo: 1200, ts: RELOJ.ms, metodoPago: 'Efectivo 2000',
    observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', garantia: '', nota: '640', acuenta: 2000, facturarA: '', nit: '', rev: 0 }, o || {});
}

// ══ 1. Las marcas son las de la página ══════════════════════════════════════
console.log('\n── 1. Las marcas: la misma lista que MARCAS de pedidos.html ──');
{
  const html = fs.readFileSync(path.resolve('pedidos.html'), 'utf8');
  const bloque = html.slice(html.indexOf('var MARCAS=['), html.indexOf('];', html.indexOf('var MARCAS=[')) + 2);
  const MARCAS = vm.runInNewContext(bloque.replace('var MARCAS=', '(') .replace(/;$/, ')'));
  const S = servidor(ON);
  const pag = {}; MARCAS.forEach(m => { pag[m.k] = m.vendedores.slice().sort().join('|'); });
  const gs = {}; S.ctx.WA_MARCAS.forEach(m => { gs[m.lbl === 'Sueña' ? 'suena' : 'heaven'] = m.vendedores.slice().sort().join('|'); });
  chk('los vendedores de Sueña y Heaven son los mismos en el .gs y en la página', pag.suena === gs.suena && pag.heaven === gs.heaven, { pag, gs });
  chk('«Carola Chávez» (con acento) es Heaven Colchones; «JUAN PABLO PAREDES» es Sueña; otro es Multiespumas',
      S.ctx.waMarca_('Carola Chávez') === 'Heaven Colchones' && S.ctx.waMarca_('JUAN PABLO PAREDES') === 'Sueña' && S.ctx.waMarca_('Lucia Paz') === 'Multiespumas');
  chk('el celular: «70111222», «+591 70111222» y «70111222 / 76543210» → 59170111222; «3345566» → nada',
      S.ctx.waCel_('70111222') === '59170111222' && S.ctx.waCel_('+591 70111222') === '59170111222' && S.ctx.waCel_('70111222 / 76543210') === '59170111222' && S.ctx.waCel_('3345566') === '');
}

// ══ 2. Apagado ═══════════════════════════════════════════════════════════════
console.log('\n── 2. Apagado: guardar no anota nada y no se habla con Meta ──');
{
  poner('2026-10-14 10:00');
  const S = servidor({ WA_TOKEN: 't', WA_PHONE_ID: '1' });
  const r = S.guardar(ped());
  chk('el pedido se guardó', r.ok === true, r);
  chk('sin WA_ACTIVO no hay cola ni disparador', !S.P.WA_COLA && !S.triggers.length, { cola: S.P.WA_COLA, tr: S.triggers.length });
  pasar(10); const rr = S.repaso();
  chk('el repaso dice «apagado» y no llamó a Meta', /apagado/.test(rr.error) && S.meta.llamadas.length === 0, rr);
}

// ══ 3. Pedido nuevo ══════════════════════════════════════════════════════════
console.log('\n── 3. Pedido nuevo: confirmación al cliente y aviso a cada uno de logística ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  const p = ped({ id: 'n1', oc: '10-045', cliente: 'juan carlos roca' });
  S.guardar(p);
  const cola = JSON.parse(S.P.WA_COLA || '[]');
  chk('guardar lo anota en la cola como nuevo', cola.length === 1 && cola[0].id === 'n1' && cola[0].t === 'n', cola);
  chk('…y deja UN disparador de una vez (waDespierta) a los ~2 minutos', S.triggers.filter(t => t.fn === 'waDespierta').length === 1 && S.triggers[0].ms >= 120000, S.triggers.map(t => t.fn + ':' + t.ms));
  S.guardar(ped({ id: 'n1b', fecha: '2026-10-16' }));
  chk('otro pedido enseguida no deja otro disparador', S.triggers.filter(t => t.fn === 'waDespierta').length === 1);
  let r = S.repaso();
  chk('antes de los 2 minutos no sale nada', S.meta.llamadas.length === 0 && r.enviados === 0, r);
  pasar(3); r = S.ctx.waDespierta();
  const s = S.salen();
  chk('a los 3 minutos salen 6 mensajes (2 pedidos × cliente + Ernesto + David)', r.enviados === 6 && s.length === 6, r);
  const c = s.find(x => x.pl === 'confirmacion_pedido' && x.to === '59170111222');
  chk('al cliente: confirmacion_pedido_v2 con los 9 datos en orden (el último, el contacto de la vendedora)', !!c && c.v2 && JSON.stringify(c.p) === JSON.stringify(['Juan', 'OC 10-045', 'Heaven Colchones',
      '1 × TITANIO LATEX 140x190', 'Av. Banzer 4to anillo', 'Saldo a pagar al recibir: Bs 1.200', 'jueves 15/10 por la tarde', '14:30 y las 18:30', 'tu vendedora por el WhatsApp de siempre']), c);
  const lg = s.filter(x => x.pl === 'logistica_pedido_nuevo' && x.p[2] === 'juan carlos roca');
  chk('a Ernesto y a David, por separado: logistica_pedido_nuevo', lg.length === 2 && lg.map(x => x.to).sort().join() === '59171000001,59172000002', lg);
  chk('…con día, turno, cliente, zona, productos y vendedor', JSON.stringify(lg[0].p) === JSON.stringify(['jueves 15/10', 'PM', 'juan carlos roca', 'Equipetrol', '1 × TITANIO LATEX 140x190', 'Carola Chavez']), lg[0] && lg[0].p);
  const call = S.meta.llamadas[0];
  chk('la llamada a Meta: /<WA_PHONE_ID>/messages, token, plantilla en español', /graph\.facebook\.com\/v[\d.]+\/1234567890\/messages$/.test(call.url) &&
      call.o.headers.Authorization === 'Bearer tok-de-mentira' && call.body.messaging_product === 'whatsapp' && call.body.type === 'template' && call.body.template.language.code === 'es', call.url);
  chk('ningún dato lleva saltos de línea ni está vacío', s.every(x => x.p.every(t => t && !/[\n\r\t]/.test(t))));
  const h = S.hoja();
  chk('la hoja «Bot WhatsApp» anota los 6 como enviados, con el id de Meta', h.length === 6 && h.every(f => f[7] === '✅ enviado' && /^wamid\./.test(f[8])), h.map(f => f[7]));
  chk('la cola quedó vacía y el disparador de una vez se borró', JSON.parse(S.P.WA_COLA).length === 0 && !S.triggers.some(t => t.fn === 'waDespierta'));
  S.limpiar(); pasar(5); S.repaso();
  chk('la vuelta siguiente no repite nada', S.meta.llamadas.length === 0);
  const ult = JSON.parse(S.P.WA_ULTIMO);
  chk('WA_ULTIMO queda sin nombres ni números', !/Juan|591/.test(S.P.WA_ULTIMO) && ult.error === '', S.P.WA_ULTIMO);
}

// ══ 4. Correcciones y cambios de día ════════════════════════════════════════
console.log('\n── 4. Corregido enseguida = un mensaje; cambio de día; ida y vuelta = nada ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  const p = ped({ id: 'c1', fecha: '2026-10-15', turno: 'AM' });
  S.guardar(p); pasar(1);
  p.fecha = '2026-10-16'; S.guardar(p);
  pasar(1.5); S.repaso();
  chk('a los 2,5 minutos del primer guardado todavía no sale (la corrección reinició la espera)', S.meta.llamadas.length === 0);
  pasar(1); S.repaso();
  let s = S.salen();
  chk('sale UNA confirmación, con el día corregido, y ningún «cambio»', s.filter(x => x.pl === 'confirmacion_pedido').length === 1 && !s.some(x => /cambio/.test(x.pl)) &&
      s.find(x => x.pl === 'confirmacion_pedido').p[6] === 'viernes 16/10 por la mañana', s.map(x => x.pl + ':' + x.p[6]));
  S.limpiar();
  p.fecha = '2026-10-19'; p.turno = 'PM'; S.guardar(p); pasar(3); S.repaso(); s = S.salen();
  const cc = s.find(x => x.pl === 'cambio_entrega');
  chk('cambio de día: cambio_entrega al cliente con el día y horario nuevos', !!cc && JSON.stringify(cc.p) === JSON.stringify(['Juan', 'Heaven Colchones', 'OC ' + p.oc, 'lunes 19/10 por la tarde', '14:30 y las 18:30', 'tu vendedora por el WhatsApp de siempre']), cc);
  const lc = s.filter(x => x.pl === 'logistica_cambio');
  chk('…y logistica_cambio a los dos: «pasó del viernes 16/10 por la mañana al lunes 19/10 por la tarde»', lc.length === 2 &&
      lc[0].p[2] === 'pasó del viernes 16/10 por la mañana al lunes 19/10 por la tarde' && lc[0].p[0] === 'OC ' + p.oc, lc[0] && lc[0].p);
  S.limpiar();
  p.turno = 'AM'; S.guardar(p); pasar(1); p.turno = 'PM'; S.guardar(p); pasar(3); S.repaso();
  chk('cambió y volvió antes de salir: no se manda nada', S.meta.llamadas.length === 0, S.salen());
  S.limpiar();
  p.zona = 'Norte'; S.guardar(p); pasar(3); S.repaso();
  chk('corregir otra cosa (la zona) no manda nada', S.meta.llamadas.length === 0 && JSON.parse(S.P.WA_COLA).length === 0);
}

// ══ 5. A quién no ════════════════════════════════════════════════════════════
console.log('\n── 5. A quién no se le manda ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  S.guardar(ped({ id: 'e1', vendedor: 'Eduardo Ñanez', cliente: 'MULTICENTER' }));
  S.guardar(ped({ id: 'a1', oc: 'ATC 10-003' }));
  S.guardar(ped({ id: 'r1', vendedor: 'ROHO' }));
  S.guardar(ped({ id: 't1', fecha: '', direccion: 'SALIÓ DE TIENDA · Carmelo', zona: 'TIENDA' }));
  S.guardar(ped({ id: 's1', celular: '3345566', cliente: 'SIN CEL' }));
  S.guardar(ped({ id: 'b1', cliente: 'BORRADO' }));
  S.guardar(ped({ id: 'kommo-999', fecha: '' }));
  const delB = S.post({ action: 'delete', id: 'b1', rev: S.leer('b1').rev });
  chk('(borré b1 antes de que salga)', delB.ok === true, delB);
  pasar(3); S.repaso();
  const s = S.salen(), cli = s.filter(x => ['confirmacion_pedido', 'cambio_entrega', 'recordatorio_entrega'].indexOf(x.pl) >= 0);
  chk('ningún mensaje a clientes (Eduardo, ATC, ROHO, tienda, sin celular, borrado)', cli.length === 0, cli);
  const ln = s.filter(x => x.pl === 'logistica_pedido_nuevo').map(x => x.p[2]);
  chk('logística sí recibe el de Eduardo, la ATC y el sin celular; no el de ROHO, la venta de tienda ni el borrado',
      ln.filter(n => n === 'MULTICENTER').length === 2 && ln.length === 6 && ln.indexOf('SIN CEL') >= 0 && !ln.some(n => n === 'BORRADO'), ln);
  const h = S.hoja(), no = h.filter(f => f[7] === '⏭️ no se manda');
  chk('la hoja dice por qué no salió: sin celular y borrado (lo de Eduardo, ATC y ROHO no se anota)',
      no.some(f => f[1] === 's1' && /celular/.test(f[8])) && no.some(f => f[1] === 'b1' && /borraron/.test(f[8])) && !no.some(f => ['e1', 'a1', 'r1'].indexOf(f[1]) >= 0), no.map(f => f[1] + ':' + f[8]));
  chk('la venta de tienda (sin fecha) y el borrador de Kommo ni entraron a la cola', !h.some(f => f[1] === 't1' || f[1] === 'kommo-999'));
}

// ══ 6. Meta falla ════════════════════════════════════════════════════════════
console.log('\n── 6. Cuando Meta falla ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(Object.assign({}, ON, { WA_LOGISTICA: '' }));
  S.meta.responder = () => ({ code: 503, body: { error: { message: 'Service unavailable', code: 2 } } });
  S.guardar(ped({ id: 'f1' })); pasar(3); let r = S.repaso();
  chk('un 503: queda para reintentar (WA_SALIDA) y la hoja dice «se reintenta»', r.reintentos === 1 && JSON.parse(S.P.WA_SALIDA).length === 1 && /reintenta/.test(S.hoja()[0][7]), r);
  S.meta.responder = null; S.limpiar(); pasar(2); S.repaso();
  chk('antes de los 5 minutos no se reintenta', S.meta.llamadas.length === 0);
  pasar(4); r = S.repaso();
  chk('después sale, armado de nuevo con la planilla', r.enviados === 1 && S.salen()[0].pl === 'confirmacion_pedido' && JSON.parse(S.P.WA_SALIDA).length === 0, r);
  S.meta.responder = () => ({ code: 500, body: {} });
  S.guardar(ped({ id: 'f2' })); pasar(3); S.repaso(); pasar(6); S.repaso(); pasar(6); r = S.repaso();
  chk('tres veces 500: queda como error y no se reintenta más', r.errores === 1 && JSON.parse(S.P.WA_SALIDA).length === 0 && S.hoja().slice(-1)[0][7] === '❌ error', r);
}
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  S.meta.responder = () => ({ code: 401, body: { error: { message: 'Error validating access token', code: 190 } } });
  S.guardar(ped({ id: 'k1' })); S.guardar(ped({ id: 'k2' })); pasar(3);
  const r = S.repaso();
  chk('token vencido: para en el primer mensaje (no le pega a Meta 6 veces)', S.meta.llamadas.length === 1, S.meta.llamadas.length);
  chk('…lo demás queda guardado para cuando se arregle', JSON.parse(S.P.WA_SALIDA).length === 6, S.P.WA_SALIDA);
  chk('…y WA_ULTIMO dice que es el token', /token/i.test(JSON.parse(S.P.WA_ULTIMO).error), S.P.WA_ULTIMO);
}
{
  poner('2026-10-14 10:00');
  const S = servidor(Object.assign({}, ON, { WA_LOGISTICA: '' }));
  S.meta.responder = () => ({ code: 404, body: { error: { message: 'Template name does not exist in the translation', code: 132001 } } });
  S.guardar(ped({ id: 'x1' })); pasar(3); const r = S.repaso();
  chk('plantilla mal cargada en Meta: error con el motivo, sin reintento', r.errores === 1 && !JSON.parse(S.P.WA_SALIDA || '[]').length && /132001/.test(S.hoja()[0][8]), S.hoja()[0]);
}

// ══ 5b. Revisión del 12/10 ═══════════════════════════════════════════════════
console.log('\n── 5b. Revisión del 12/10: Kommo completado, celular mal escrito, recordatorio antes que la confirmación ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  S.guardar(ped({ id: 'kommo-123', cliente: 'DE KOMMO' }));                                   // borrador completado: estado vacío
  S.guardar(ped({ id: 'kommo-777', cliente: 'SIGUE BORRADOR', estado: 'Borrador Kommo' }));  // todavía en la bandeja
  pasar(3); S.repaso();
  const s = S.salen(), conf = s.filter(x => x.pl === 'confirmacion_pedido'), ln = s.filter(x => x.pl === 'logistica_pedido_nuevo').map(x => x.p[2]);
  chk('una venta de Kommo ya completada recibe la confirmación y logística el «pedido nuevo» (antes se salteaba por el id kommo-)',
      conf.length === 1 && ln.filter(n => n === 'DE KOMMO').length === 2, s.map(x => x.pl + ':' + x.p[2]));
  chk('lo que sigue como borrador de Kommo no manda nada', !s.some(x => x.p.indexOf('SIGUE BORRADOR') >= 0), s);
  chk('el celular: un dígito de más o un número de otro país NO arman un celular de otra persona',
      S.ctx.waCel_('775123456') === '' && S.ctx.waCel_('12367123456') === '' && S.ctx.waCel_('+54 9 11 6712 3456') === '' &&
      S.ctx.waCel_('Cel: 70111222') === '59170111222' && S.ctx.waCel_('(591) 70111222') === '59170111222' && S.ctx.waCel_('70111222/76543210') === '59170111222',
      ['775123456', '12367123456', '+54 9 11 6712 3456', 'Cel: 70111222', '(591) 70111222'].map(x => x + '→' + S.ctx.waCel_(x)));
}
{
  poner('2026-10-14 16:59');
  const S = servidor(Object.assign({}, ON, { WA_LOGISTICA: '' }));
  S.guardar(ped({ id: 'q1', cliente: 'A LAS 16:59' }));
  pasar(1); S.repaso();   // 17:00: la confirmación todavía espera sus 2 minutos
  chk('a las 17:00 el pedido de las 16:59 no recibe el recordatorio antes que la confirmación', !S.salen().some(x => x.pl === 'recordatorio_entrega'), S.salen().map(x => x.pl));
  S.limpiar(); pasar(3); S.repaso();
  const s = S.salen().map(x => x.pl);
  chk('a los minutos sale la confirmación (que ya dice el día), y no un recordatorio repetido', s.indexOf('confirmacion_pedido') >= 0 && s.indexOf('recordatorio_entrega') < 0, s);
}

// ══ 7. 16:00 y 17:00 ═════════════════════════════════════════════════════════
console.log('\n── 7. El aviso de las 16:00 y el recordatorio de las 17:00 ──');
{
  poner('2026-10-14 09:00');
  const S = servidor(ON);
  /* Para mañana jueves 15: dos sin camión, uno con camión, uno de Eduardo; uno para el viernes. */
  const a = ped({ id: 'm1', cliente: 'ANA GUTIERREZ', zona: 'Norte', fecha: '2026-10-15', turno: 'AM', saldo: 0, pagado: true });
  const b = ped({ id: 'm2', cliente: 'PEDRO VACA', zona: 'Sur', fecha: '2026-10-15', celular: '76543210' });
  const c = ped({ id: 'm3', cliente: 'CON CAMION', fecha: '2026-10-15', vehiculo: 'Camión 1' });
  const d = ped({ id: 'm4', cliente: 'EDU', vendedor: 'Eduardo', fecha: '2026-10-15', vehiculo: 'Camión 1' });
  const e = ped({ id: 'm5', cliente: 'VIERNES', fecha: '2026-10-16' });
  [a, b, c, d, e].forEach(x => S.guardar(x));
  pasar(5); S.repaso(); S.limpiar();
  poner('2026-10-14 15:50'); S.repaso();
  chk('15:50: nada', S.meta.llamadas.length === 0);
  poner('2026-10-14 16:05'); S.repaso();
  let s = S.salen().filter(x => x.pl === 'logistica_sin_camion');
  chk('16:05: logistica_sin_camion a Ernesto y a David', s.length === 2 && s.map(x => x.to).sort().join() === '59171000001,59172000002', S.salen());
  chk('…«2 pedidos del jueves 15/10: ANA GUTIERREZ (Norte), PEDRO VACA (Sur)»', s[0] && s[0].p[0] === '2' && s[0].p[1] === 'jueves 15/10' && s[0].p[2] === 'ANA GUTIERREZ (Norte), PEDRO VACA (Sur)', s[0] && s[0].p);
  S.limpiar(); poner('2026-10-14 16:40'); S.repaso();
  chk('a las 16:40 no se repite', S.meta.llamadas.length === 0);
  poner('2026-10-14 17:02'); S.repaso();
  s = S.salen();
  chk('17:02: recordatorio a los del jueves que no confirmó hoy… (todos se confirmaron hoy a las 9: ninguno)', s.length === 0, s);
}
{
  poner('2026-10-13 11:00');
  const S = servidor(ON);
  const a = ped({ id: 'r1', cliente: 'ANA GUTIERREZ', fecha: '2026-10-15', turno: 'AM', saldo: 0, pagado: true, productos: [{ desc: 'SMART', medida: '140x190', cant: 1 }], vendedor: 'Fernando Peinado' });
  const b = ped({ id: 'r2', cliente: 'PEDRO VACA', fecha: '2026-10-15', celular: '', metodoPago: 'Efectivo 2000 + ^150' });
  const d = ped({ id: 'r3', cliente: 'EDU', vendedor: 'Eduardo', fecha: '2026-10-15' });
  [a, b, d].forEach(x => S.guardar(x)); pasar(5); S.repaso(); S.limpiar();
  poner('2026-10-14 17:02'); S.repaso();
  const s = S.salen().filter(x => x.pl === 'recordatorio_entrega');
  chk('17:02 del miércoles: recordatorio_entrega solo a ANA (PEDRO sin celular, EDU de Eduardo)', s.length === 1 && s[0].to === '59170111222', S.salen());
  chk('…con «Mañana», la marca Sueña y «Tu compra ya está pagada»', s[0] && JSON.stringify(s[0].p) === JSON.stringify(['Ana', 'Sueña', 'OC ' + a.oc, 'Mañana', '1 × SMART 140x190',
      'Tu compra ya está pagada', 'jueves 15/10 por la mañana', '9:00 y las 12:00', 'tu vendedora por el WhatsApp de siempre']), s[0] && s[0].p);
  chk('la hoja anota que PEDRO no tiene celular', S.hoja().some(f => f[1] === 'r2' && f[3] === 'Recordatorio' && /celular/.test(f[8])));
  chk('el saldo con el recargo pactado: «Saldo a pagar al recibir: Bs 1.200 + Bs 150 del recargo por entrega»', S.ctx.waSaldo_(S.leer('r2')) === 'Saldo a pagar al recibir: Bs 1.200 + Bs 150 del recargo por entrega', S.ctx.waSaldo_(S.leer('r2')));
  S.limpiar(); poner('2026-10-14 17:30'); S.repaso();
  chk('a las 17:30 no se repite', S.meta.llamadas.length === 0);
}
{
  /* Sábado 31/10: el domingo no hay camión y el lunes 02/11 es feriado (Todos Santos) → el próximo es el martes 03/11. */
  poner('2026-10-29 10:00');
  const S = servidor(ON);
  const a = ped({ id: 'q1', cliente: 'MARTA', fecha: '2026-11-03', turno: 'PM' });
  S.guardar(a); pasar(5); S.repaso(); S.limpiar();
  poner('2026-10-31 17:05'); S.repaso();
  let s = S.salen().filter(x => x.pl === 'recordatorio_entrega');
  chk('sábado 17:05: «El martes» (saltea domingo y el feriado del lunes)', s.length === 1 && s[0].pl === 'recordatorio_entrega' && s[0].p[3] === 'El martes' && s[0].p[6] === 'martes 03/11 por la tarde', s);
  S.limpiar();
  S.guardar(ped({ id: 'q2', cliente: 'NUEVO DOMINGO', fecha: '2026-11-03' }));
  poner('2026-11-01 16:05'); S.repaso();
  chk('domingo 16:05: no hay aviso «sin camión» a logística', !S.salen().some(x => x.pl === 'logistica_sin_camion'), S.salen().map(x => x.pl));
  S.limpiar(); poner('2026-11-01 17:05'); S.repaso(); s = S.salen().filter(x => x.pl === 'recordatorio_entrega');
  chk('domingo 17:05: a MARTA no se le repite; a uno nuevo del martes, sí', s.length === 0 || (s.length === 1 && s[0].p[0] === 'Nuevo'), s);
}
{
  poner('2026-10-14 09:00');
  const S = servidor(ON);
  S.guardar(ped({ id: 'z1', fecha: '2026-10-15' })); pasar(5); S.repaso(); S.limpiar();
  poner('2026-10-14 20:10'); S.repaso();
  chk('si el bot estuvo parado y arranca a las 20:10, ya no manda el «Son las 16:00» ni el recordatorio', S.meta.llamadas.length === 0, S.salen());
}

// ══ 8. Prueba, disparadores y probar ═════════════════════════════════════════
console.log('\n── 8. WA_PRUEBA, instalarDisparadores y probarAntesDeImplementar ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(Object.assign({}, ON, { WA_PRUEBA: '79999999' }));
  S.guardar(ped({ id: 'w1' })); pasar(3); S.repaso();
  chk('con WA_PRUEBA todo va a ese número (cliente y logística)', S.salen().length === 3 && S.salen().every(x => x.to === '59179999999'), S.salen().map(x => x.to));
  chk('…y la hoja lo marca «(prueba)»', S.hoja().every(f => /^\(prueba\)/.test(f[4])));
  S.ctx.instalarDisparadores();
  chk('instalarDisparadores deja waRepaso cada 5 minutos (y los de siempre)', S.triggers.some(t => t.fn === 'waRepaso' && t.n === 5) && S.triggers.some(t => t.fn === 'kommoRepaso'), S.triggers.map(t => t.fn));
  S.ctx.instalarDisparadores();
  chk('correrlo dos veces no duplica', S.triggers.filter(t => t.fn === 'waRepaso').length === 1);
  const pr = S.ctx.probarAntesDeImplementar();
  chk('probar: «El bot de WhatsApp está prendido EN PRUEBA, con 2 persona(s) de logística: Ernesto, David»', pr.lineas.some(l => /bot de WhatsApp está prendido EN PRUEBA.*2 persona\(s\).*Ernesto, David/.test(l)), pr.lineas.filter(l => /WhatsApp/.test(l)));
  chk('probar no frena por el bot', pr.lineas.filter(l => /WhatsApp/.test(l) && /^❌/.test(l)).length === 0);
}
{
  const S = servidor({});
  const pr = S.ctx.probarAntesDeImplementar();
  chk('probar con el bot apagado: «apagado: guardar sigue igual»', pr.lineas.some(l => /^✅ El bot de WhatsApp está apagado/.test(l)), pr.lineas.filter(l => /WhatsApp/.test(l)));
  const S2 = servidor({ WA_ACTIVO: '1', WA_LOGISTICA: 'Ernesto:123' });
  const pr2 = S2.ctx.probarAntesDeImplementar();
  chk('prendido sin token: ⚠️ faltan WA_TOKEN o WA_PHONE_ID; número que no entiende: ⚠️', pr2.lineas.some(l => /^⚠️ .*faltan WA_TOKEN/.test(l)) && pr2.lineas.some(l => /^⚠️ En WA_LOGISTICA.*Ernesto/.test(l)), pr2.lineas.filter(l => /WhatsApp|WA_/.test(l)));
  const r = S2.ctx.waRepaso();
  chk('…y el repaso no llama a Meta', S2.meta.llamadas.length === 0 && /WA_TOKEN/.test(r.error), r);
}
{
  poner('2026-10-14 10:00');
  const S = servidor(ON);
  S.guardar({ id: '__stock__', fecha: '', observaciones: '{}' });
  S.guardar({ id: '__ret_1__', fecha: '2026-10-15', cliente: 'retiro' });
  chk('las filas del sistema no entran a la cola', !JSON.parse(S.P.WA_COLA || '[]').length, S.P.WA_COLA);
}

// ══ Las 6 plantillas, creadas desde el editor (12/10: la cuenta de prueba de Meta no deja crearlas a mano) ══
console.log('\n── Las plantillas: crearPlantillasWhatsApp / verPlantillasWhatsApp ──');
{
  const S = servidor(Object.assign({}, ON, { WA_WABA_ID: '2901139558521747' }));
  const T = S.ctx.WA_PLANTILLAS, tipos = S.ctx.WA_TIPOS;
  const nombres = Object.keys(tipos).map(k => tipos[k].plantilla).sort();
  chk('son las 6 de WA_TIPOS, con el mismo nombre', JSON.stringify(T.map(x => x.n).sort()) === JSON.stringify(nombres), T.map(x => x.n));
  const nVars = (t) => (t.match(/\{\{\d+\}\}/g) || []).length;
  const esperado = { confirmacion_pedido_v2: 9, cambio_entrega_v2: 6, recordatorio_entrega_v2: 9, logistica_pedido_nuevo_v2: 6, logistica_cambio_v2: 3, logistica_sin_camion_v2: 3 };
  chk('cada una tiene tantos {{n}} como datos arma waArmar_, y un ejemplo por cada uno', T.every(x => nVars(x.t) === esperado[x.n] && x.e.length === esperado[x.n]), T.map(x => x.n + ':' + nVars(x.t) + '/' + x.e.length));
  chk('ninguna empieza ni termina con un {{n}} ni tiene dos pegados (Meta las rechaza)', T.every(x => !/^\{\{/.test(x.t) && !/\}\}$/.test(x.t.trim()) && !/\}\}\s*\{\{/.test(x.t)));
  S.meta.responder = (b, n) => n === 2 ? { code: 400, body: { error: { code: 100, error_subcode: 2388024, message: 'Content in this language already exists' } } } : { code: 200, body: { id: 'tpl' + n, status: 'PENDING', category: 'UTILITY' } };
  const r = S.ctx.crearPlantillasWhatsApp();
  const ll = S.meta.llamadas;
  chk('crear: 6 llamadas a /2901139558521747/message_templates, en español, Utilidad, con el texto y los ejemplos', ll.length === 6 && ll.every(c => /\/2901139558521747\/message_templates$/.test(c.url) && c.body.language === 'es' && c.body.category === 'UTILITY' && c.body.components[0].type === 'BODY' && c.body.components[0].example.body_text[0].length === esperado[c.body.name]) && /Bearer tok-de-mentira/.test(ll[0].o.headers.Authorization), ll.map(c => c.url));
  chk('la que ya existía queda como estaba y no es un error', r.ok && r.plantillas.filter(x => x.ya).length === 1 && r.plantillas.filter(x => /creada/.test(x.txt)).length === 5, r);
  chk('crear no toca pedidos ni la cola del bot', !S.P.WA_COLA && !S.hoja().length);
  S.limpiar(); S.meta.responder = () => ({ code: 401, body: { error: { code: 190, message: 'Session has expired' } } });
  const r2 = S.ctx.crearPlantillasWhatsApp();
  chk('con el token vencido lo dice («generá otro»)', !r2.ok && r2.plantillas.every(x => /token no sirve/.test(x.txt)), r2.plantillas[0]);
  S.limpiar(); S.meta.responder = () => ({ code: 200, body: { data: [
    { name: 'confirmacion_pedido_v2', language: 'es', status: 'APPROVED', category: 'UTILITY' },
    { name: 'cambio_entrega_v2', language: 'es', status: 'REJECTED', rejected_reason: 'INVALID_FORMAT' },
    { name: 'recordatorio_entrega_v2', language: 'es', status: 'PENDING' },
    { name: 'logistica_pedido_nuevo_v2', language: 'en_US', status: 'APPROVED' } ] } });
  const v = S.ctx.verPlantillasWhatsApp();
  const tx = v.plantillas.map(x => x.txt).join(' | ');
  chk('ver: aprobada / rechazada con el motivo / en revisión / no creada (la de otro idioma no cuenta)', /confirmacion_pedido_v2: ✅ aprobada/.test(tx) && /cambio_entrega_v2: ❌ rechazada · motivo: INVALID_FORMAT/.test(tx) && /recordatorio_entrega_v2: ⏳ en revisión/.test(tx) && /logistica_pedido_nuevo_v2: — no está creada/.test(tx) && v.listas === false, tx);
  chk('ver es un GET, sin cuerpo', S.meta.llamadas.length === 1 && S.meta.llamadas[0].o.method === 'get' && /fields=name,status/.test(S.meta.llamadas[0].url));
  const S2 = servidor(ON);
  chk('sin WA_WABA_ID dice qué falta y no llama a Meta', /WA_WABA_ID/.test(S2.ctx.crearPlantillasWhatsApp().error || '') && S2.meta.llamadas.length === 0);
}

// ══ 10. Lo que Meta avisa (2026-10-12-a): entregado / leído / falló, y lo que contesta el cliente ══════════════
console.log('\n── 10. El webhook de Meta: verificar, estados en la hoja, respuestas, sin clave nada ──');
{
  const S = servidor(Object.assign({ WA_HOOK_KEY: 'clave-hook' }, ON));
  poner('2026-10-14 10:00');
  const p = ped(); S.guardar(p); pasar(3); S.repaso();
  const w = S.hoja().map(f => f[8]).filter(x => /^wamid\./.test(x));
  chk('antes: el bot anotó los mensajes con su wamid', w.length === 3, S.hoja());
  const get = (q) => S.ctx.doGet({ parameter: q })._t;
  chk('verificar: con el token correcto contesta el challenge; con otro, no', get({ wa: 'clave-hook', 'hub.mode': 'subscribe', 'hub.verify_token': 'clave-hook', 'hub.challenge': '987' }) === '987'
      && get({ 'hub.mode': 'subscribe', 'hub.verify_token': 'otra', 'hub.challenge': '987' }) !== '987', get({ 'hub.mode': 'subscribe', 'hub.verify_token': 'otra', 'hub.challenge': '987' }));
  const aviso = (wa, value) => S.ctx.doPost({ parameter: { wa }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages', value: Object.assign({ messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' } }, value) }] }] }) } })._t;
  const ts = String(Math.floor(RELOJ.ms / 1000));
  const meta = () => S.hoja().map(f => f[9] || '');
  chk('el aviso contesta «ok» (nunca un «no»: Meta reintentaría días)', aviso('clave-hook', { statuses: [{ id: w[0], status: 'sent', timestamp: ts }] }) === 'ok');
  aviso('clave-hook', { statuses: [{ id: w[0], status: 'delivered', timestamp: ts }, { id: w[1], status: 'read', timestamp: ts }] });
  aviso('clave-hook', { statuses: [{ id: w[0], status: 'sent', timestamp: ts }, { id: w[1], status: 'delivered', timestamp: ts }] });   // llegan desordenados
  const H = S.hoja();
  chk('la columna «Meta dice»: entregado / leído, y un aviso viejo no lo vuelve atrás', /^✓✓ entregado/.test(H[0][9]) && /^👁️ leído/.test(H[1][9]) && S.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bot WhatsApp')._datos[0][9] === 'Meta dice', meta());
  aviso('clave-hook', { statuses: [{ id: w[2], status: 'failed', timestamp: ts, errors: [{ code: 131042, title: 'Business eligibility payment issue', error_data: { details: 'Message failed to send because there were one or more errors related to your payment method.' } }] }] });
  chk('falló: lo dice con el código y el motivo, en la fila del mensaje', /^❌ falló .*#131042 Business eligibility payment issue · Message failed/.test(S.hoja()[2][9]), S.hoja()[2][9]);
  const est = S.ctx.estadoBotWhatsApp();
  chk('estadoBotWhatsApp lo cuenta y guarda el último fallo', est.metaAvisa && est.meta && est.meta.n >= 6 && est.meta.fallos.length === 1 && /131042/.test(est.meta.fallos[0].e), est.meta);
  const nAntes = S.hoja().length;
  aviso('clave-hook', { contacts: [{ wa_id: '59170111222', profile: { name: 'Juan' } }], messages: [{ id: 'wamid.resp1', from: '59170111222', timestamp: ts, type: 'text', text: { body: 'Gracias, ahí estaré' } }] });
  aviso('clave-hook', { contacts: [{ wa_id: '59170111222', profile: { name: 'Juan' } }], messages: [{ id: 'wamid.resp1', from: '59170111222', timestamp: ts, type: 'text', text: { body: 'Gracias, ahí estaré' } }] });
  const rs = S.hoja().filter(f => f[3] === '💬 Respondió'), ult = rs[rs.length - 1];
  chk('lo que contesta el cliente: UNA fila «💬 Respondió» con su nombre, número y texto (repetido por Meta, no se duplica; + la respuesta automática, desde 12-c)', S.hoja().length === nAntes + 2 && rs.length === 1 && ult[4] === 'Juan' && ult[5] === '59170111222' && ult[9] === 'Gracias, ahí estaré', ult);
  const n2 = S.hoja().length, m2 = JSON.stringify(meta());
  aviso('mala', { statuses: [{ id: w[0], status: 'failed', timestamp: ts, errors: [{ code: 1 }] }] });
  aviso('clave-hook', Object.assign({ statuses: [{ id: w[0], status: 'failed', timestamp: ts, errors: [{ code: 1 }] }] }, { metadata: { phone_number_id: '999-kommo' } }));
  chk('con otra clave, o de OTRO número (el de Kommo), no se anota nada', S.hoja().length === n2 && JSON.stringify(meta()) === m2);
  chk('el aviso de Meta no pasa por «Rechazos» ni por el panel', !S.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rechazos'));
  const S2 = servidor(ON);
  chk('sin WA_HOOK_KEY: ni verifica ni anota', S2.ctx.doGet({ parameter: { 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '5' } })._t !== '5'
      && S2.ctx.doPost({ parameter: { wa: '' }, postData: { contents: '{}' } }) !== undefined && !S2.P.WA_META);
  const pr = S.ctx.probarAntesDeImplementar().lineas.join('\n');
  chk('probarAntesDeImplementar dice cuántos avisos y el último fallo', /Meta avisa lo que pasó con cada mensaje/.test(pr) && /NO entregó 1 mensaje/.test(pr), pr.split('\n').filter(l => /Meta/.test(l)));
}

// ══ 11. (2026-10-12-b) «sin camión» con nombres enteros + avisos de Meta con otra clave ══════════════
console.log('\n── 11. «Sin camión» no parte un nombre; un aviso con otra clave queda contado ──');
{
  poner('2026-10-14 09:00');
  const S = servidor(ON);
  const noms = ['NOELIA ESCALANTE ZAMORA','DAVID MIRANDA','ERIKA MENACHO','SAMUEL LIMA','ABIGAIL CASTRO LOPEZ','ORDOÑEZ BALDERAS ALBERTO','NAOMI CUELLAR','JUAN PEREZ','MIA PLAZA','ROXANA CONTRERAS LOPEZ','MARIA LUISA GUTIERREZ','PEDRO PABLO VACA DIEZ','CARLOS ANDRES ROJAS'];
  noms.forEach((n, i) => S.guardar(ped({ id: 'sc' + i, cliente: n, zona: 'Norte', fecha: '2026-10-15' })));
  pasar(5); S.repaso(); S.limpiar();
  poner('2026-10-14 16:05'); S.repaso();
  const s = S.salen().find(x => x.pl === 'logistica_sin_camion');
  const lista = s ? s.p[2] : '';
  const m = lista.match(/ y (\d+) más$/), dentro = lista.replace(/ y \d+ más$/, '').split(', ');
  chk('13 sin camión: la lista entra en 250 letras, termina en «y N más» y no parte ningún nombre', s && lista.length <= 250 && !!m && dentro.every(x => noms.some(n => x === n + ' (Norte)')) && dentro.length + Number(m[1]) === 13, lista);
  chk('…y el total sigue diciendo 13', s && s.p[0] === '13');
  const S2 = servidor(Object.assign({ WA_HOOK_KEY: 'buena' }, ON));
  S2.ctx.doPost({ parameter: { wa: 'TUCLAVE' }, postData: { contents: '{"entry":[]}' } });
  S2.ctx.doPost({ parameter: { wa: 'TUCLAVE' }, postData: { contents: '{"entry":[]}' } });
  const mal = JSON.parse(S2.P.WA_HOOK_MAL || '{}');
  chk('dos avisos con otra clave en la dirección quedan contados, sin guardar el valor que vino', mal.n === 2 && !/TUCLAVE/.test(S2.P.WA_HOOK_MAL), S2.P.WA_HOOK_MAL);
  const pr = S2.ctx.probarAntesDeImplementar().lineas.join('\n');
  chk('probar lo dice: «con OTRA clave en la dirección… igual a WA_HOOK_KEY»', /2 aviso\(s\) de Meta con OTRA clave/.test(pr), pr.split('\n').filter(l => /Meta/.test(l)));
  chk('estadoBotWhatsApp también', S2.ctx.estadoBotWhatsApp().metaRechazados.n === 2);
}

// ══ 12. (2026-10-12-c) Lo que contesta un cliente: con su pedido, respuesta automática una vez, y para el panel ══════
console.log('\n── 12. El cliente contesta: de qué pedido es, respuesta automática y lo que lee el panel ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(Object.assign({ WA_HOOK_KEY: 'k' }, ON));
  const p = ped({ id: 'rc1', cliente: 'JUAN CARLOS ROCA', vendedor: 'Carola Chavez', celular: '70111222' }); S.guardar(p);
  pasar(3); S.repaso();
  const wConf = S.hoja().find(f => f[3] === 'Confirmación')[8];
  S.limpiar();
  const ts = () => String(Math.floor(RELOJ.ms / 1000));
  const aviso = (msgs) => S.ctx.doPost({ parameter: { wa: 'k' }, postData: { contents: JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: '59170111222', profile: { name: 'Juan Roca' } }], messages: msgs } }] }] }) } });
  aviso([{ id: 'wamid.r1', from: '59170111222', timestamp: ts(), type: 'text', text: { body: 'Quiero modificar mi horario' }, context: { id: wConf } }]);
  const fila = S.hoja().find(f => f[8] === 'wamid.r1');
  chk('la respuesta queda con SU pedido y OC (por el «Responder» sobre la confirmación)', fila && fila[1] === 'rc1' && fila[2] === p.oc && fila[11] > 0, fila);
  const tx = S.meta.llamadas.filter(c => c.body && c.body.type === 'text');
  chk('respuesta automática: un texto al cliente que nombra a su vendedora y la OC', tx.length === 1 && tx[0].body.to === '59170111222' && /vendedora \*Carola\*/.test(tx[0].body.text.body) && /OC 10-/.test(tx[0].body.text.body) && /Juan/.test(tx[0].body.text.body), tx.map(c => c.body.text.body));
  chk('…y queda anotada en la hoja como «Respuesta automática» ✅', S.hoja().some(f => f[3] === 'Respuesta automática' && /enviado/.test(f[7])));
  pasar(10);
  aviso([{ id: 'wamid.r2', from: '59170111222', timestamp: ts(), type: 'text', text: { body: '¿Me escuchan?' } }]);
  chk('un segundo mensaje: se anota (por el último mensaje que le mandó el bot) pero NO se responde de nuevo', S.hoja().find(f => f[8] === 'wamid.r2')[1] === 'rc1' && S.meta.llamadas.filter(c => c.body && c.body.type === 'text').length === 1);
  const r = JSON.parse(S.ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'waRespuestas' }) } })._t);
  chk('waRespuestas: las dos, la más nueva primero, con pedido, nombre, número y texto', r.ok && r.resp.length === 2 && r.resp[0].w === 'wamid.r2' && r.resp[1].txt === 'Quiero modificar mi horario' && r.resp[1].id === 'rc1' && r.resp[1].nom === 'Juan Roca', r.resp);
  const a = JSON.parse(S.ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'waRespAtendida', w: 'wamid.r1', quien: 'Carola Chavez' }) } })._t);
  const r2 = JSON.parse(S.ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify({ action: 'waRespuestas' }) } })._t);
  chk('waRespAtendida: «Carola Chavez · 14/10 10:13» en la columna K y el panel lo lee', a.ok && /^Carola Chavez · 14\/10/.test(r2.resp[1].at) && r2.resp[0].at === '', r2.resp.map(x => x.at));
  const S2 = servidor(Object.assign({ WA_HOOK_KEY: 'k', WA_AUTORESP: '0' }, ON));
  S2.ctx.doPost({ parameter: { wa: 'k' }, postData: { contents: JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '1234567890' }, messages: [{ id: 'wamid.z', from: '59170000000', timestamp: ts(), type: 'text', text: { body: 'hola' } }] } }] }] }) } });
  chk('con WA_AUTORESP=0 no se responde (pero se anota)', S2.meta.llamadas.length === 0 && S2.hoja().some(f => f[8] === 'wamid.z'));
}

// ══ 13. (2026-10-12-d) Plantillas v2 con la vieja de respaldo + el WhatsApp de la vendedora ══════════════
console.log('\n── 13. v2 con respaldo y contacto de la vendedora (WA_VENDEDORAS) ──');
{
  poner('2026-10-14 10:00');
  const S = servidor(Object.assign({ WA_VENDEDORAS: 'Carola Chavez:70000001, Maria:+591 7000 0002', WA_HOOK_KEY: 'k' }, ON));
  chk('WA_VENDEDORAS: por nombre entero o por el primero; «Carola Chávez» con acento también', S.ctx.waVendCel_('Carola Chávez') === '59170000001' && S.ctx.waVendCel_('Maria Flores') === '59170000002' && S.ctx.waVendCel_('Isabel Robledo') === '');
  const p = ped({ id: 'v1', vendedor: 'Carola Chavez' }); S.guardar(p);
  S.meta.responder = (b) => (b.template && /_v2$/.test(b.template.name)) ? { code: 404, body: { error: { code: 132001, message: 'Template name does not exist in the translation' } } } : null;
  pasar(3); S.repaso();
  const ll = S.meta.llamadas.map(c => c.body.template.name + ':' + c.body.template.components[0].parameters.length);
  chk('la v2 todavía no aprobada: sale la VIEJA con sus 8 datos (no se pierde el mensaje)', ll.indexOf('confirmacion_pedido_v2:9') >= 0 && ll.indexOf('confirmacion_pedido:8') >= 0, ll);
  chk('…y la hoja anota la plantilla que salió de verdad', S.hoja().some(f => f[3] === 'Confirmación' && f[6] === 'confirmacion_pedido' && /enviado/.test(f[7])), S.hoja().map(f => f[6] + ' ' + f[7]));
  S.limpiar(); S.meta.responder = null;
  const q = ped({ id: 'v2', vendedor: 'Carola Chavez', fecha: '2026-10-16' }); S.guardar(q); pasar(3); S.repaso();
  const c = S.salen().find(x => x.pl === 'confirmacion_pedido' && x.v2);
  chk('con la v2 aprobada: el último dato es «Carola 👉 https://wa.me/59170000001»', c && c.p[8] === 'Carola 👉 https://wa.me/59170000001', c && c.p);
  S.limpiar();
  S.ctx.doPost({ parameter: { wa: 'k' }, postData: { contents: JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: '59170111222', profile: { name: 'Juan' } }], messages: [{ id: 'wamid.q', from: '59170111222', timestamp: String(Math.floor(RELOJ.ms / 1000)), type: 'text', text: { body: 'hola' } }] } }] }] }) } });
  const tx = S.meta.llamadas.filter(c => c.body.type === 'text').map(c => c.body.text.body)[0] || '';
  chk('la respuesta automática trae el enlace directo a la vendedora', /escribile a tu vendedora \*Carola\*:\n👉 https:\/\/wa\.me\/59170000001/.test(tx) && /👋/.test(tx), tx);
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exitCode = FAIL ? 1 : 0;
