/* 🧾🤖 SERVIDOR 2026-11-14-b: LAS COTIZACIONES (mejora 251) Y EL SEGUIMIENTO A LAS 48 HORAS (mejora 274).
     1. `cotGuardar`: el alta en la hoja «Cotizaciones» con el número del mes («COT 11-001», correlativo y sin repetirse), idempotente por id;
        editar exige `rev` (si no, `conflicto` con la actual); valida celular, precio > 0 y cantidad ≥ 1; el total lo calcula el servidor; el
        candado es el PROPIO de la hoja (el del documento), nunca el de doPost.
     2. `cotMarcar` (estado, motivo, pedido, prox, la llamada con t y quien) y `cotLeer` (rango, vendedor, abiertas, tope 120 días).
     3. Kommo, APAGADO salvo KOMMO_COT = 1: apagado no llama a nada; prendido pone al día o crea el lead en «Cotizacion enviada» (canal «Visita
        tienda», etiqueta «Mall», la vendedora, una nota), todo afuera del candado; si falla, la cotización queda y se anota el error.
     4. El bot a las 48 h (COT_BOT): '0'/vacío nada, 'prueba' solo WA_PRUEBA, '1' todos; de lunes a sábado de 10 a 19 sin feriados; una sola
        vez; no a quien ya compró, ni al equipo, ni a Eduardo; si Meta no tiene la plantilla, se devuelve la marca.
     5. Los tres botones (llamar → la vendedora; a las 2 horas sin llamada, el dueño; compré; no), y un toque repetido no contesta de nuevo.
     6. Claude ve la cotización si el cliente escribe y no tiene pedido.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Google, Meta, Kommo y Claude de mentira.
   Se corre:  node tests/test_servidor_cot.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); } };

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getMaxRows: () => Math.max(1000, datos.length), insertRowsAfter: () => {},
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
const pasan = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
/* ── Kommo de mentira (como test_kommo_cierre.js): ids INVENTADOS ── */
const EMBUDO = 13349719, COMPRADORES = 555, COTIZ = 103, AGEND = 104, INTERES = 102, FC = 777, CANAL = 888, VISITA = 8883, UID_FABIAN = 905, UID_CAROLA = 901;
function kommoBase() {
  return {
    pipelines: { _embedded: { pipelines: [{ id: EMBUDO, name: 'Ventas', is_main: true, _embedded: { statuses: [
      { id: 101, name: 'Incoming leads' }, { id: INTERES, name: 'Interesado' }, { id: COTIZ, name: 'Cotizacion enviada' }, { id: AGEND, name: 'Agendado / Visita' },
      { id: COMPRADORES, name: 'Compradores' }, { id: 142, name: 'Logrado con éxito' }, { id: 143, name: 'Venta perdida' }] } }] } },
    campos: { _embedded: { custom_fields: [{ id: FC, name: 'Fecha contrato', type: 'date' }, { id: CANAL, name: 'Canal', type: 'select', enums: [{ id: 8881, value: 'Facebook' }, { id: VISITA, value: 'Visita tienda' }] }] } },
    usuarios: { _embedded: { users: [{ id: UID_CAROLA, name: 'Carola Chavez - Tienda Banzer' }, { id: UID_FABIAN, name: 'Fabián Godoy - Ventura Mall' }] } },
    contactos: {}, leads: {}, notas: []
  };
}
const contacto = (K, id, nombre, tel, leads) => { K.contactos[id] = { id, name: nombre, custom_fields_values: [{ field_id: 1, field_code: 'PHONE', values: [{ value: tel }] }], _embedded: { leads: (leads || []).map(x => ({ id: x })) } }; };
const leadK = (K, id, o) => { K.leads[id] = Object.assign({ id, name: 'Lead ' + id, price: 0, status_id: INTERES, pipeline_id: EMBUDO, responsible_user_id: UID_FABIAN, updated_at: 1793900000, _embedded: { contacts: [] } }, o); };

const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props, op) {
  op = op || {};
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 }, claude = { llamadas: [], responder: null };
  const K = op.K || kommoBase(), kommo = [];
  const candado = { script: 0, doc: 0, scriptTomado: false, docTomado: false };
  const cache = {}, triggers = [];
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : JSON.stringify(body)) });
  const qs = (u) => { const q = {}; (u.split('?')[1] || '').split('&').forEach(p => { if (!p) return; const i = p.indexOf('='), k = decodeURIComponent(i < 0 ? p : p.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(p.slice(i + 1)); (q[k] = q[k] || []).push(v); }); return q; };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com/.test(url)) {
        const metodo = String(o.method || 'get').toLowerCase(), ruta = url.split('/api/v4')[1] || '', p = ruta.split('?')[0], q = qs(ruta);
        const cuerpo = o.payload ? JSON.parse(o.payload) : null;
        kommo.push({ metodo, p, q, cuerpo, conCandado: candado.docTomado || candado.scriptTomado });
        if (op.kommoFalla && op.kommoFalla(metodo, p)) return res(op.kommoFalla(metodo, p), { title: 'no' });
        if (metodo === 'get' && p === '/leads/pipelines') return res(200, K.pipelines);
        if (metodo === 'get' && p === '/leads/custom_fields') return res(200, K.campos);
        if (metodo === 'get' && p === '/users') return res(200, K.usuarios);
        if (metodo === 'get' && p === '/contacts') {
          if (q.query) { const t = q.query[0]; const cs = Object.values(K.contactos).filter(c => JSON.stringify(c.custom_fields_values).indexOf(t) >= 0); return cs.length ? res(200, { _embedded: { contacts: cs } }) : res(204, null); }
          return res(204, null);
        }
        if (metodo === 'get' && p === '/leads') {
          let L = Object.values(K.leads);
          if (q['filter[id][]']) L = q['filter[id][]'].map(i => K.leads[i]).filter(Boolean);
          return L.length ? res(200, { _embedded: { leads: L } }) : res(204, null);
        }
        let m;
        if (metodo === 'patch' && (m = /^\/leads\/(\d+)$/.exec(p))) { const l = K.leads[m[1]]; if (!l) return res(404, {}); Object.assign(l, cuerpo); return res(200, { id: l.id }); }
        if (metodo === 'post' && (m = /^\/leads\/(\d+)\/notes$/.exec(p))) { K.notas.push({ lead: m[1], txt: cuerpo[0].params.text }); return res(200, { _embedded: { notes: [{ id: 1 }] } }); }
        if (metodo === 'post' && p === '/leads/complex') { const id = 70001; leadK(K, id, Object.assign({}, cuerpo[0], { id })); return res(200, [{ id, contact_id: 60001 }]); }
        if (metodo === 'post' && p === '/leads') { const id = 70002; leadK(K, id, Object.assign({}, cuerpo[0], { id })); return res(200, { _embedded: { leads: [{ id }] } }); }
        return res(204, null);
      }
      if (/api\.anthropic\.com/.test(url)) {
        const body = o.payload ? JSON.parse(o.payload) : null; claude.llamadas.push({ url, o, body });
        const r = claude.responder ? claude.responder(body, claude.llamadas.length) : null;
        return res(r ? r.code : 200, r ? r.body : { content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 40 } });
      }
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      return res(r ? r.code : 200, r ? (r.body || {}) : { messages: [{ id: 'wamid.out' + (++meta.n) }] });
    } },
    LockService: {
      getScriptLock: () => ({ waitLock() { candado.script++; candado.scriptTomado = true; }, tryLock() { candado.script++; candado.scriptTomado = true; return true; }, releaseLock() { candado.scriptTomado = false; } }),
      getDocumentLock: () => ({ waitLock() { candado.doc++; if (op.docOcupado) throw new Error('ocupado'); candado.docTomado = true; }, tryLock() { candado.doc++; return true; }, releaseLock() { candado.docTomado = false; } })
    },
    CacheService: { getScriptCache: () => ({
      get: (k) => (Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null),
      getAll: (ks) => { const o = {}; ks.forEach(k => { if (Object.prototype.hasOwnProperty.call(cache, k)) o[k] = cache[k]; }); return o; },
      put: (k, v) => { cache[k] = String(v); }, putAll: (o) => { Object.keys(o).forEach(k => { cache[k] = String(o[k]); }); },
      remove: (k) => { delete cache[k]; }, removeAll: (ks) => { ks.forEach(k => delete cache[k]); } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, getContent() { return this._t; }, setMimeType() { return this; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const cots = () => (hojas.Cotizaciones ? hojas.Cotizaciones._datos : null);
  const cot = (id) => post({ action: 'cotLeer', desde: '2026-10-01', hasta: '2026-12-31', abiertas: true }).cots.find(c => c.id === id);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text),
                                                 b: c.body.template.components.slice(1).map(x => x.parameters[0].payload) }));
  const textos = (to) => meta.llamadas.filter(c => c.body && c.body.type === 'text' && (!to || c.body.to === to)).map(c => c.body.text.body);
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  return { ctx, sh, hojas, P, meta, claude, K, kommo, candado, cache, post, cargar, cots, cot, salen, textos, hoja };
}
let N = 0, nW = 0;
const COT = (o) => { N++; return Object.assign({ id: 'cot-' + N, tienda: 'Ventura Mall', vendedor: 'Fabián Godoy', cliente: 'LIDIA INVENTADA ' + N, celular: '70000031',
  productos: [{ desc: 'COLCHON TITANIO ICE', medida: '160x200', codigo: 'CH1222', cant: 1, precio: 9000 }, { desc: 'SOMIER ORO', medida: '160x200', cant: 1, precio: 3400 }] }, o || {}); };
const PED = (o) => { N++; return Object.assign({ id: 'p' + N, fecha: '2026-11-20', oc: '11-' + (100 + N), vendedor: 'Fabián Godoy', cliente: 'CLIENTE ' + N, productos: [{ desc: 'COLCHON', cant: 1, precio: 5000 }],
  celular: '70000031', turno: 'AM', zona: 'Norte', direccion: 'Calle 1', maps: '', pagado: false, saldo: 5000, ts: RELOJ.ms, metodoPago: '', observaciones: '', estado: '', entregado: false,
  vehiculo: '', chofer: '', garantia: '', nota: '', acuenta: 0, facturarA: '', nit: '', nroDia: 0, verificado: false, fotos: [] }, o || {}); };
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', WA_DUENO: 'Eduardo:59170000099, Jefe:59170000098',
  WA_VENDEDORAS: 'Fabián Godoy:70000041, Carola Chavez:70000001', WA_HOOK_KEY: 'clave-hook' };
const CLI = '59170000031', VEND = '59170000041';
const hook = (S, from, msg) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: 'Lidia' } }],
           messages: [Object.assign({ id: 'wamid.in' + (++nW), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const boton = (id, res, txt) => ({ type: 'button', button: { payload: 'cs|' + id + '|' + res, text: txt || res } });

/* ══ 1. cotGuardar ══ */
seccion('1. cotGuardar: número, idempotencia, conflicto y validación', () => {
  poner('2026-11-16 10:00');
  const S = servidor({});
  const a = COT(), b = COT({ cliente: '=ROMPE', celular: '+591 70000032' }), c = COT();
  let r1 = S.post({ action: 'cotGuardar', cot: a }), r2 = S.post({ action: 'cotGuardar', cot: b }), r3 = S.post({ action: 'cotGuardar', cot: c });
  chk('1a. tres altas: COT 11-001, 11-002 y 11-003', r1.ok && r1.nuevo && r1.cot.num === 'COT 11-001' && r2.cot.num === 'COT 11-002' && r3.cot.num === 'COT 11-003', [r1.cot && r1.cot.num, r2.cot && r2.cot.num, r3.cot && r3.cot.num]);
  chk('1b. el alta queda abierta, con el día de Bolivia, total = Σ cantidad × precio (12.400) y vence a los 7 días', r1.cot.estado === 'abierta' && r1.cot.dia === '2026-11-16' &&
      r1.cot.total === 12400 && r1.cot.vence === '2026-11-23' && r1.cot.bot === '' && Array.isArray(r1.cot.llamadas) && r1.cot.rev > 0, r1.cot);
  chk('1c. la hoja «Cotizaciones» nace con sus encabezados y una fila por cotización', S.cots()[0].join('|') === S.ctx.COT_ENC.join('|') && S.cots().length === 4);
  const fb = S.cots()[2];
  chk('1d. lo que empieza con «=» o «+» va con «\'» (no es una fórmula) y se lee sin él', fb[6] === "'=ROMPE" && fb[7] === "'+591 70000032" && r2.cot.cliente === '=ROMPE' && S.cot(b.id).celular === '+591 70000032', [fb[6], fb[7]]);
  chk('1e. escribir usa el candado PROPIO de la hoja (del documento), nunca el de doPost', S.candado.doc >= 3 && S.candado.script === 0, S.candado);
  const r1b = S.post({ action: 'cotGuardar', cot: a });
  chk('1f. el mismo alta otra vez (sin rev) devuelve la que está: el mismo número, sin otra fila', r1b.ok && r1b.ya && r1b.cot.num === 'COT 11-001' && S.cots().length === 4, r1b);
  /* editar */
  pasan(5);
  const ed = Object.assign({}, a, { cliente: 'LIDIA CORREGIDA', productos: [{ desc: 'COLCHON TITANIO ICE', medida: '160x200', cant: 2, precio: 9000 }], rev: r1.cot.rev, estado: 'compro', total: 1 });
  const re = S.post({ action: 'cotGuardar', cot: ed });
  chk('1g. editar con su rev: cambia el cliente y los productos, el total se recalcula (18.000), el rev sube y el número y el estado no cambian',
      re.ok && re.cot.cliente === 'LIDIA CORREGIDA' && re.cot.total === 18000 && re.cot.rev > r1.cot.rev && re.cot.num === 'COT 11-001' && re.cot.estado === 'abierta', re.cot);
  const rc = S.post({ action: 'cotGuardar', cot: Object.assign({}, a, { cliente: 'OTRA', rev: r1.cot.rev }) });
  chk('1h. con el rev viejo: conflicto, con la actual', rc.ok === false && rc.error === 'conflicto' && rc.actual && rc.actual.cliente === 'LIDIA CORREGIDA', rc);
  chk('1i. editar una que no está → no_esta', S.post({ action: 'cotGuardar', cot: COT({ rev: 123 }) }).error === 'no_esta');
  /* validación */
  const mal = (o) => S.post({ action: 'cotGuardar', cot: COT(o) });
  chk('1j. celular que no es de WhatsApp → celular', mal({ celular: '123' }).error === 'celular' && mal({ celular: '' }).error === 'celular');
  chk('1k. precio 0, cantidad 0 o con coma, sin nombre, sin productos → productos (con el motivo)', mal({ productos: [{ desc: 'X', cant: 1, precio: 0 }] }).error === 'productos' &&
      mal({ productos: [{ desc: 'X', cant: 0, precio: 10 }] }).error === 'productos' && mal({ productos: [{ desc: 'X', cant: 1.5, precio: 10 }] }).error === 'productos' &&
      mal({ productos: [{ desc: '', cant: 1, precio: 10 }] }).error === 'productos' && mal({ productos: [] }).error === 'productos' &&
      /precio/.test(mal({ productos: [{ desc: 'X', cant: 1, precio: -5 }] }).motivo));
  chk('1l. sin vendedor → vendedor; vence mal escrito → fechas; sin cot → sin_cot; sin id → sin_id', mal({ vendedor: '' }).error === 'vendedor' && mal({ vence: '23/11' }).error === 'fechas' &&
      S.post({ action: 'cotGuardar' }).error === 'sin_cot' && mal({ id: '' }).error === 'sin_id');
  chk('1m. lo que no entra no deja filas ni gasta números', S.cots().length === 4 && S.post({ action: 'cotGuardar', cot: COT() }).cot.num === 'COT 11-004');
  /* otro mes */
  poner('2026-12-01 09:00');
  chk('1n. en diciembre arranca de nuevo: COT 12-001', S.post({ action: 'cotGuardar', cot: COT() }).cot.num === 'COT 12-001');
  /* el vence que manda la página */
  chk('1o. el vence de la página manda', S.post({ action: 'cotGuardar', cot: COT({ vence: '2026-12-15', entregaDesde: '2026-12-05' }) }).cot.vence === '2026-12-15');
  /* candado ocupado */
  const O = servidor({}, { docOcupado: true });
  chk('1p. con el candado de la hoja ocupado: ocupado (la página reintenta; es idempotente)', O.post({ action: 'cotGuardar', cot: COT() }).error === 'ocupado');
  /* sin repetirse aunque dos guarden «a la vez» (el candado los pone en fila): 10 altas seguidas, 10 números distintos */
  const Z = servidor({}); poner('2026-11-16 10:00');
  const nums = Array.from({ length: 10 }, () => Z.post({ action: 'cotGuardar', cot: COT() }).cot.num);
  chk('1q. diez altas: diez números distintos y seguidos', new Set(nums).size === 10 && nums[9] === 'COT 11-010', nums);
  const Kc = servidor({ PANEL_KEY: 'clave-x' });
  chk('1r. las tres acciones piden la clave del equipo', Kc.post({ action: 'cotGuardar', cot: COT() }).error === 'clave' && Kc.post({ action: 'cotMarcar', id: 'x' }).error === 'clave' &&
      Kc.post({ action: 'cotLeer' }).error === 'clave' && Kc.post({ action: 'cotGuardar', key: 'clave-x', cot: COT() }).ok);
});

/* ══ 2. cotMarcar y cotLeer ══ */
seccion('2. cotMarcar / cotLeer', () => {
  poner('2026-11-16 10:00');
  const S = servidor({});
  const a = S.post({ action: 'cotGuardar', cot: COT() }).cot;
  pasan(30);
  let r = S.post({ action: 'cotMarcar', id: a.id, llamada: { res: 'no atiende', nota: 'volver a llamar' }, quien: 'Fabián Godoy', prox: '2026-11-18' });
  chk('2a. una llamada: se suma con t (ahora) y quien; prox; el rev sube', r.ok && r.cot.llamadas.length === 1 && r.cot.llamadas[0].t === RELOJ.ms && r.cot.llamadas[0].quien === 'Fabián Godoy' &&
      r.cot.llamadas[0].res === 'no atiende' && r.cot.prox === '2026-11-18' && r.cot.rev > a.rev, r.cot);
  r = S.post({ action: 'cotMarcar', id: a.id, estado: 'no', motivo: 'le pareció caro' });
  chk('2b. estado «no» con el motivo (la llamada de antes sigue)', r.ok && r.cot.estado === 'no' && r.cot.motivo === 'le pareció caro' && r.cot.llamadas.length === 1, r.cot);
  r = S.post({ action: 'cotMarcar', id: a.id, estado: 'compro', pedido: 'p-123' });
  chk('2c. compró, con el pedido', r.ok && r.cot.estado === 'compro' && r.cot.pedido === 'p-123');
  /* (14/11) la página manda la hora de la anotación (`llamada.t`): un reintento de la MISMA anotación no la repite */
  r = S.post({ action: 'cotMarcar', id: a.id, llamada: { t: 1794700000000, res: 'compro' } });
  const r2x = S.post({ action: 'cotMarcar', id: a.id, llamada: { t: 1794700000000, res: 'compro' } });
  const r3x = S.post({ action: 'cotMarcar', id: a.id, llamada: { t: 1794700000999, res: 'volver' } });
  chk('2c2. la misma llamada (mismo t de la página) mandada dos veces queda una; otra t, se suma', r.ok && r2x.ok && r2x.cot.llamadas.length === 2 && r3x.cot.llamadas.length === 3, r3x.cot && r3x.cot.llamadas);
  chk('2d. estado desconocido → estado; una que no está → no_esta; sin id → sin_id; prox mal → fechas', S.post({ action: 'cotMarcar', id: a.id, estado: 'perdida' }).error === 'estado' &&
      S.post({ action: 'cotMarcar', id: 'nada' }).error === 'no_esta' && S.post({ action: 'cotMarcar' }).error === 'sin_id' && S.post({ action: 'cotMarcar', id: a.id, prox: 'mañana' }).error === 'fechas');
  /* cotLeer */
  poner('2026-09-01 10:00'); const vieja = S.post({ action: 'cotGuardar', cot: COT({ vendedor: 'Carola Chavez' }) }).cot;
  poner('2026-10-20 10:00'); const oct = S.post({ action: 'cotGuardar', cot: COT() }).cot;
  poner('2026-11-17 10:00'); const nov = S.post({ action: 'cotGuardar', cot: COT({ vendedor: 'Carola Chavez' }) }).cot;
  let L = S.post({ action: 'cotLeer' });
  chk('2e. sin fechas: los últimos 30 días, en orden de hora', L.ok && L.desde === '2026-10-19' && L.hasta === '2026-11-17' && L.cots.map(c => c.id).join(',') === [oct.id, a.id, nov.id].join(','), L.cots.map(c => c.num));
  L = S.post({ action: 'cotLeer', desde: '2026-11-01', hasta: '2026-11-30', vendedor: 'carola chávez' });
  chk('2f. por vendedor, sin tildes ni mayúsculas', L.cots.length === 1 && L.cots[0].id === nov.id, L.cots.map(c => c.vendedor));
  L = S.post({ action: 'cotLeer', desde: '2026-11-01', hasta: '2026-11-30', abiertas: true });
  chk('2g. `abiertas:true` suma la abierta de septiembre (fuera del rango)', L.cots.some(c => c.id === vieja.id) && L.cots.some(c => c.id === nov.id) && !L.cots.some(c => c.id === oct.id && c.dia < '2026-11-01' && c.estado !== 'abierta'), L.cots.map(c => c.num + ' ' + c.estado));
  chk('2h. más de 120 días → rango; fechas mal → fechas', S.post({ action: 'cotLeer', desde: '2026-01-01', hasta: '2026-11-30' }).error === 'rango' && S.post({ action: 'cotLeer', desde: 'ayer' }).error === 'fechas');
  chk('2i. leer no toma ningún candado', (() => { const d = S.candado.doc, s = S.candado.script; S.post({ action: 'cotLeer', abiertas: true }); return S.candado.doc === d && S.candado.script === s; })());
});

/* ══ 3. Kommo ══ */
seccion('3. Kommo (KOMMO_COT)', () => {
  poner('2026-11-16 10:00');
  const A = servidor({ KOMMO_TOKEN: 'tok-kommo' });
  A.post({ action: 'cotGuardar', cot: COT() });
  chk('3a. sin KOMMO_COT = 1 no le pregunta nada a Kommo (aunque haya token)', A.kommo.length === 0, A.kommo.map(x => x.p));
  /* un lead abierto de ella con ese celular */
  const K = kommoBase(); contacto(K, 5001, 'LIDIA', '70000031', [4001]); leadK(K, 4001, { status_id: INTERES });
  const S = servidor({ KOMMO_TOKEN: 'tok-kommo', KOMMO_COT: '1' }, { K });
  let r = S.post({ action: 'cotGuardar', cot: COT() });
  const patch = S.kommo.find(x => x.metodo === 'patch');
  chk('3b. con un lead suyo «Interesado» de ese celular: lo pasa a «Cotizacion enviada» con el total y la etiqueta «Mall»', r.ok && r.cot.kommo === '4001' && patch &&
      patch.cuerpo.status_id === COTIZ && patch.cuerpo.pipeline_id === EMBUDO && patch.cuerpo.price === 12400 && JSON.stringify(patch.cuerpo.tags_to_add) === JSON.stringify([{ name: 'Mall' }]), patch && patch.cuerpo);
  chk('3c. y una nota con el número, los productos, el total y hasta cuándo vale', K.notas.length === 1 && K.notas[0].lead === '4001' && /COT 11-001/.test(K.notas[0].txt) && /TITANIO ICE/.test(K.notas[0].txt) && /Bs 12\.400/.test(K.notas[0].txt) && /23\/11/.test(K.notas[0].txt), K.notas);
  chk('3d. todo lo de Kommo, AFUERA de los candados', S.kommo.length > 0 && S.kommo.every(x => !x.conCandado), S.kommo.filter(x => x.conCandado).map(x => x.p));
  chk('3e. el lead queda anotado en la cotización (sin cambiarle el rev)', S.cot(r.cot.id).kommo === '4001' && S.cot(r.cot.id).rev === r.cot.rev);
  /* sin lead ni contacto: lo crea */
  const K2 = kommoBase(), S2 = servidor({ KOMMO_TOKEN: 'tok-kommo', KOMMO_COT: '1' }, { K: K2 });
  r = S2.post({ action: 'cotGuardar', cot: COT({ celular: '70000077' }) });
  const cx = S2.kommo.find(x => x.p === '/leads/complex');
  chk('3f. sin lead: lo crea en «Cotizacion enviada», a nombre del vendedor, canal «Visita tienda», etiqueta «Mall» y el contacto con el celular', r.cot.kommo === '70001' && cx &&
      cx.cuerpo[0].status_id === COTIZ && cx.cuerpo[0].responsible_user_id === UID_FABIAN && cx.cuerpo[0].custom_fields_values.some(f => f.field_id === CANAL && f.values[0].enum_id === VISITA) &&
      JSON.stringify(cx.cuerpo[0]._embedded.tags) === JSON.stringify([{ name: 'Mall' }]) && cx.cuerpo[0]._embedded.contacts[0].custom_fields_values[0].values[0].value === '70000077', cx && cx.cuerpo);
  /* de otra tienda: sin «Mall» */
  const K3 = kommoBase(), S3 = servidor({ KOMMO_TOKEN: 'tok-kommo', KOMMO_COT: '1' }, { K: K3 });
  S3.post({ action: 'cotGuardar', cot: COT({ tienda: 'Tienda Banzer', vendedor: 'Carola Chavez', celular: '70000078' }) });
  const cx3 = S3.kommo.find(x => x.p === '/leads/complex');
  chk('3g. de otra tienda: sin la etiqueta «Mall», a nombre de su vendedora', cx3 && !cx3.cuerpo[0]._embedded.tags && cx3.cuerpo[0].responsible_user_id === UID_CAROLA, cx3 && cx3.cuerpo[0]);
  /* ya agendado: no se lo vuelve atrás */
  const K4 = kommoBase(); contacto(K4, 5002, 'LIDIA', '70000031', [4002]); leadK(K4, 4002, { status_id: AGEND });
  const S4 = servidor({ KOMMO_TOKEN: 'tok-kommo', KOMMO_COT: '1' }, { K: K4 });
  S4.post({ action: 'cotGuardar', cot: COT() });
  const p4 = S4.kommo.find(x => x.metodo === 'patch');
  chk('3h. un lead ya en «Agendado / Visita» no vuelve a «Cotizacion enviada» (solo el total y la etiqueta)', p4 && p4.cuerpo.status_id == null && p4.cuerpo.price === 12400 && K4.leads[4002].status_id === AGEND, p4 && p4.cuerpo);
  /* un lead en «Compradores» (otra compra) no se usa: se crea otro */
  const K5 = kommoBase(); contacto(K5, 5003, 'LIDIA', '70000031', [4003]); leadK(K5, 4003, { status_id: COMPRADORES });
  const S5 = servidor({ KOMMO_TOKEN: 'tok-kommo', KOMMO_COT: '1' }, { K: K5 });
  r = S5.post({ action: 'cotGuardar', cot: COT() });
  const px5 = S5.kommo.find(x => x.metodo === 'post' && x.p === '/leads');
  chk('3i. un lead en «Compradores» (lo que ya compró) no se toca: lead nuevo unido a su contacto', r.cot.kommo === '70002' && px5 && px5.cuerpo[0]._embedded.contacts[0].id === 5003 && K5.leads[4003].status_id === COMPRADORES, r.cot);
  /* Kommo falla */
  const K6 = kommoBase(); contacto(K6, 5004, 'LIDIA', '70000031', [4004]); leadK(K6, 4004);
  const S6 = servidor({ KOMMO_TOKEN: 'tok-kommo', KOMMO_COT: '1' }, { K: K6, kommoFalla: (m, p) => (m === 'patch' ? 500 : 0) });
  r = S6.post({ action: 'cotGuardar', cot: COT() });
  chk('3j. si Kommo falla: la cotización queda guardada igual y el error anotado (kommoErr)', r.ok && r.cot.num === 'COT 11-001' && !r.cot.kommo && /HTTP 500/.test(r.cot.kommoErr) && /HTTP 500/.test(S6.cot(r.cot.id).kommoErr), r.cot);
  /* marcar «no»: una nota con el motivo */
  const cotS = S.cot(S.post({ action: 'cotLeer', abiertas: true }).cots[0].id);
  S.post({ action: 'cotMarcar', id: cotS.id, estado: 'no', motivo: 'le pareció caro' });
  chk('3k. marcar «no»: una nota con el motivo en su lead', K.notas.length === 2 && K.notas[1].lead === '4001' && /no compra/.test(K.notas[1].txt) && /le pareció caro/.test(K.notas[1].txt), K.notas);
  const n0 = S.kommo.length; S.post({ action: 'cotMarcar', id: cotS.id, llamada: { res: 'x' } });
  chk('3l. una llamada no le dice nada a Kommo', S.kommo.length === n0);
  const A2 = servidor({ KOMMO_TOKEN: 'tok-kommo' }); const c2 = A2.post({ action: 'cotGuardar', cot: COT() }).cot;
  A2.post({ action: 'cotMarcar', id: c2.id, estado: 'no', motivo: 'x' });
  chk('3m. apagado, marcar «no» tampoco', A2.kommo.length === 0);
});

/* ══ 4. El bot a las 48 horas ══ */
const armarBot = (extra, cotO, fecha) => {
  poner(fecha || '2026-11-16 10:00');   // lunes
  const S = servidor(Object.assign({}, ON, extra || {}));
  const c = S.post({ action: 'cotGuardar', cot: COT(cotO) }).cot;
  return { S, c };
};
const cs = (S) => S.salen('cotizacion_seguimiento');
seccion('4. El bot a las 48 horas (COT_BOT)', () => {
  let { S, c } = armarBot({});
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4a. sin COT_BOT: nada', cs(S).length === 0 && S.cot(c.id).bot === '');
  ({ S, c } = armarBot({ COT_BOT: '0' })); poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4b. COT_BOT = 0: nada', cs(S).length === 0);
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-18 09:59'); S.ctx.waRepaso();
  chk('4c. a las 47 h 59 min: todavía no', cs(S).length === 0 && S.cot(c.id).bot === '');
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  const m = cs(S);
  chk('4d. a las 48 h: UN mensaje al cliente, con sus 7 datos', m.length === 1 && m[0].to === CLI && m[0].p.join('|') === ['Lidia', 'Fabián', 'Ventura Mall', 'lunes 16/11',
      '1 × COLCHON TITANIO ICE 160x200, 1 × SOMIER ORO 160x200', 'Bs 12.400', 'lunes 23/11'].join('|'), m);
  chk('4e. con los tres botones: cs|<id>|llamar, compre y no', m[0] && JSON.stringify(m[0].b) === JSON.stringify(['cs|' + c.id + '|llamar', 'cs|' + c.id + '|compre', 'cs|' + c.id + '|no']), m[0] && m[0].b);
  const cc = S.cot(c.id);
  chk('4f. la cotización queda bot = enviado, con la hora', cc.bot === 'enviado' && cc.botT === Date.parse('2026-11-18T10:05:00-04:00'), cc);
  chk('4g. en «Bot WhatsApp» con el N° de la cotización', S.hoja().some(f => f[2] === c.num && f[3] === 'Cliente: seguimiento de la cotización (48 h)' && /enviado/.test(f[7])), S.hoja().map(f => f[2] + ' ' + f[3]));
  pasan(30); S.ctx.waRepaso(); poner('2026-11-19 11:00'); S.ctx.waRepaso();
  chk('4h. nunca un segundo mensaje', cs(S).length === 1);
  /* horario */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-18 19:00'); S.ctx.waRepaso();
  const tarde = cs(S).length;
  poner('2026-11-22 12:00'); S.ctx.waRepaso();   // domingo
  chk('4i. a las 19:00 no, el domingo no', tarde === 0 && cs(S).length === 0);
  poner('2026-11-23 10:00'); S.ctx.waRepaso();
  chk('4j. el lunes a las 10:00 sí', cs(S).length === 1);
  ({ S, c } = armarBot({ COT_BOT: '1' }, {}, '2026-12-22 11:00'));
  poner('2026-12-25 11:00'); S.ctx.waRepaso();
  chk('4k. un feriado (25/12) no', cs(S).length === 0);
  poner('2026-12-26 11:00'); S.ctx.waRepaso();
  chk('4l. …el sábado siguiente sí', cs(S).length === 1);
  /* prueba */
  ({ S, c } = armarBot({ COT_BOT: 'prueba', WA_PRUEBA: '59170000099' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4m. COT_BOT = prueba: a un cliente que no está en WA_PRUEBA, nada', cs(S).length === 0 && S.cot(c.id).bot === '');
  ({ S, c } = armarBot({ COT_BOT: 'prueba', WA_PRUEBA: '59170000031' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4n. COT_BOT = prueba: al celular que está en WA_PRUEBA, sí', cs(S).length === 1 && cs(S)[0].to === CLI);
  /* ya compró */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-17 15:00'); S.cargar([PED({ celular: '7000-0031', ts: RELOJ.ms })]);
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4o. con una venta (OC) del mismo celular cargada después de la cotización: no le escribe', cs(S).length === 0 && S.cot(c.id).bot === '');
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  S.cargar([PED({ ts: Date.parse('2026-11-01T10:00:00-04:00') }), PED({ oc: 'ATC 11-001', ts: Date.parse('2026-11-17T10:00:00-04:00') })]);
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4p. una venta de ANTES de la cotización (o una ATC después) no cuenta: le escribe', cs(S).length === 1);
  /* equipo, Eduardo, cerrada */
  ({ S, c } = armarBot({ COT_BOT: '1' }, { celular: '70000001' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4q. a un número del equipo (una vendedora): no', cs(S).length === 0);
  ({ S, c } = armarBot({ COT_BOT: '1' }, { vendedor: 'Eduardo Añez' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4r. una cotización de Eduardo: no', cs(S).length === 0);
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  S.post({ action: 'cotMarcar', id: c.id, estado: 'no', motivo: 'x' });
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4s. una que ya no está abierta: no', cs(S).length === 0);
  /* Meta sin la plantilla */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  S.meta.responder = (b) => (b.template && b.template.name === 'cotizacion_seguimiento') ? { code: 404, body: { error: { code: 132001, message: 'Template name does not exist in the translation' } } } : null;
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  chk('4t. Meta todavía no tiene la plantilla: la marca vuelve (bot vacío) y hoy no se prueba más', S.cot(c.id).bot === '' && S.P.COT_PL_FALTA === '2026-11-18', S.cot(c.id));
  const intentos = S.meta.llamadas.filter(x => x.body.template && x.body.template.name === 'cotizacion_seguimiento').length;
  pasan(10); S.ctx.waRepaso();
  chk('4u. …otra vuelta ese mismo día no la vuelve a intentar', S.meta.llamadas.filter(x => x.body.template && x.body.template.name === 'cotizacion_seguimiento').length === intentos);
  S.meta.responder = null; poner('2026-11-19 10:05'); S.ctx.waRepaso();
  chk('4v. …al otro día, aprobada, sale', cs(S).length >= 1 && S.cot(c.id).bot === 'enviado');
});

/* ══ 5. Los botones ══ */
seccion('5. Los tres botones y el aviso de las 2 horas', () => {
  let { S, c } = armarBot({ COT_BOT: '1' });
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  poner('2026-11-18 11:20'); S.meta.llamadas.length = 0;
  hook(S, CLI, boton(c.id, 'llamar', 'Que me llamen'));
  let cc = S.cot(c.id);
  chk('5a. «Que me llamen»: bot = llamar, con la hora', cc.bot === 'llamar' && cc.botT === RELOJ.ms && cc.estado === 'abierta', cc);
  chk('5b. al cliente: «¡Listo! Fabián te va a llamar hoy»', S.textos(CLI).length === 1 && /¡Listo! Fabián te va a llamar hoy/.test(S.textos(CLI)[0]) && /Asistente automático/.test(S.textos(CLI)[0]), S.textos(CLI));
  const vl = S.salen('vendedora_llamar_cliente');
  chk('5c. a la vendedora (su número de WA_VENDEDORAS): el cliente, el celular con puntos y lo cotizado', vl.length === 1 && vl[0].to === VEND && vl[0].p[0] === c.cliente && vl[0].p[1] === '700•••31' &&
      /COT 11-001: 1 × COLCHON TITANIO ICE 160x200, 1 × SOMIER ORO 160x200 · Bs 12\.400/.test(vl[0].p[2]), vl);
  chk('5d. en «Bot WhatsApp»: el toque, la respuesta y el aviso a la vendedora (sin pedido en la columna «Pedido»)', S.hoja().some(f => f[3] === '🧾 Cotización: tocó un botón' && f[2] === c.num && f[1] === '') &&
      S.hoja().some(f => f[3] === '🧾 Cotización → cliente') && S.hoja().some(f => f[3] === 'Vendedora: llamar al cliente (cotización)' && /enviado/.test(f[7])), S.hoja().map(f => f[3]));
  hook(S, CLI, boton(c.id, 'llamar', 'Que me llamen'));
  chk('5e. tocarlo de nuevo no contesta otra vez (ni a la vendedora)', S.textos(CLI).length === 1 && S.salen('vendedora_llamar_cliente').length === 1);
  /* las 2 horas */
  poner('2026-11-18 13:19'); S.ctx.waRepaso();
  chk('5f. a la 1 h 59 min sin llamada: todavía nada al dueño', S.salen('cotizacion_sin_llamar').length === 0);
  poner('2026-11-18 13:21'); S.ctx.waRepaso();
  const sl = S.salen('cotizacion_sin_llamar');
  chk('5g. a las 2 h sin ninguna llamada: UNA vez, solo al PRIMERO de WA_DUENO', sl.length === 1 && sl[0].to === '59170000099' && sl[0].p[0] === 'Fabián Godoy' && sl[0].p[1] === c.cliente && sl[0].p[3] === '18/11 11:20', sl);
  pasan(10); S.ctx.waRepaso(); poner('2026-11-19 10:00'); S.ctx.waRepaso();
  chk('5h. nunca dos veces', S.salen('cotizacion_sin_llamar').length === 1);
  /* con la llamada anotada, no */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  poner('2026-11-18 11:20'); hook(S, CLI, boton(c.id, 'llamar'));
  poner('2026-11-18 12:00'); S.post({ action: 'cotMarcar', id: c.id, llamada: { res: 'atendió', nota: 'viene el sábado' }, quien: 'Fabián Godoy' });
  poner('2026-11-18 14:00'); S.ctx.waRepaso();
  chk('5i. si la vendedora anotó una llamada después del toque: el dueño no recibe nada', S.salen('cotizacion_sin_llamar').length === 0);
  /* compré */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso(); S.meta.llamadas.length = 0;
  hook(S, CLI, boton(c.id, 'compre', 'Ya compré'));
  cc = S.cot(c.id);
  chk('5j. «Ya compré»: bot = compre, estado = dice_compro; al cliente «¡Gracias!»', cc.bot === 'compre' && cc.estado === 'dice_compro' && /¡Gracias!/.test(S.textos(CLI)[0] || '') && S.salen('vendedora_llamar_cliente').length === 0, [cc.bot, cc.estado, S.textos(CLI)]);
  hook(S, CLI, boton(c.id, 'no'));
  chk('5k. después de «Ya compré», un «No, gracias» no cambia nada ni contesta', S.cot(c.id).estado === 'dice_compro' && S.textos(CLI).length === 1);
  /* no */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso(); S.meta.llamadas.length = 0;
  hook(S, CLI, boton(c.id, 'no', 'No, gracias'));
  cc = S.cot(c.id);
  chk('5l. «No, gracias»: bot = no, estado = no, motivo «no, gracias (bot)»; al cliente «no te vamos a escribir más»', cc.bot === 'no' && cc.estado === 'no' && cc.motivo === 'no, gracias (bot)' &&
      /no te vamos a escribir más/.test(S.textos(CLI)[0] || ''), [cc.bot, cc.estado, cc.motivo, S.textos(CLI)]);
  /* de otro número */
  ({ S, c } = armarBot({ COT_BOT: '1' }));
  poner('2026-11-18 10:05'); S.ctx.waRepaso(); S.meta.llamadas.length = 0;
  hook(S, '59170000055', boton(c.id, 'no'));
  chk('5m. el botón desde OTRO número no se anota ni se contesta', S.cot(c.id).bot === 'enviado' && S.meta.llamadas.length === 0 && S.hoja().some(f => /otro número/.test(f[9])));
  /* los botones no son mensajes para Claude ni para la pestaña Bot */
  const resp = S.ctx.waRespuestasLeer_ ? S.ctx.waRespuestasLeer_() : [];
  chk('5n. un toque de cotización no aparece como «💬 Respondió» (la pestaña Bot)', !S.hoja().some(f => f[3] === '💬 Respondió') && (!Array.isArray(resp) || resp.length === 0), resp);
});

/* ══ 6. Claude ══ */
seccion('6. Claude ve la cotización', () => {
  const IA = { COT_BOT: '1', IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'sk-de-mentira' };
  const claudeDice = { code: 200, body: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ categoria: 'otro', urgente: false, resumen: 'Pregunta por la cotización', contestar: true, respuesta: 'Hola Lidia 😊 Tu cotización vale hasta el lunes 23/11.', otro_dia: false }) }],
    usage: { input_tokens: 1500, output_tokens: 80 } } };
  let { S, c } = armarBot(IA);
  S.claude.responder = () => claudeDice;
  poner('2026-11-18 10:05'); S.ctx.waRepaso();
  poner('2026-11-18 10:30');
  hook(S, CLI, { type: 'text', text: { body: '¿hasta cuándo vale el precio?' } });
  RELOJ.ms += 25000; S.ctx.iaRepaso(0, true);
  const u = S.claude.llamadas.length ? JSON.stringify(S.claude.llamadas[S.claude.llamadas.length - 1].body.messages[0].content) : '';
  chk('6a. sin pedido y con una cotización abierta: Claude la recibe (<cotizacion> con el número, los productos y el total)', S.claude.llamadas.length >= 1 && /<cotizacion>/.test(u) && u.indexOf(c.num) >= 0 &&
      /TITANIO ICE/.test(u) && /Bs 12\.400/.test(u), u.slice(0, 400));
  chk('6b. …con la regla: sin descuentos, y el contacto de su vendedor', /Nunca ofrezcas descuentos/.test(u) && /wa\.me\/59170000041/.test(u));
  chk('6c. …y la respuesta de Claude le llega, firmada con la marca del vendedor', S.textos(CLI).some(t => /Heaven Colchones/.test(t) && /23\/11/.test(t)), S.textos(CLI));
  /* con un pedido: no */
  ({ S, c } = armarBot(IA));
  S.claude.responder = () => claudeDice;
  S.cargar([PED({ ts: Date.parse('2026-11-01T10:00:00-04:00'), fecha: '2026-11-20' })]);
  poner('2026-11-18 10:30');
  hook(S, CLI, { type: 'text', text: { body: '¿a qué hora llega?' } });
  RELOJ.ms += 25000; S.ctx.iaRepaso(0, true);
  const u2 = S.claude.llamadas.length ? JSON.stringify(S.claude.llamadas[S.claude.llamadas.length - 1].body.messages[0].content) : '';
  chk('6d. con un pedido de ese número: Claude ve el pedido, no la cotización', S.claude.llamadas.length >= 1 && !/<cotizacion>/.test(u2) && /<pedidos>/.test(u2), u2.slice(0, 200));
});

/* ══ 7. Las plantillas y probarAntesDeImplementar ══ */
seccion('7. Plantillas y probarAntesDeImplementar', () => {
  poner('2026-11-18 10:05');
  const S = servidor(Object.assign({}, ON, { WA_WABA_ID: '123' }));
  const T = S.ctx.WA_PLANTILLAS, nv = (t) => (t.match(/\{\{\d+\}\}/g) || []).length;
  const pl = (n) => T.find(x => x.n === n);
  chk('7a. cotizacion_seguimiento (7 datos, «Mensaje automático», 3 botones), vendedora_llamar_cliente (3) y cotizacion_sin_llamar (4)',
      pl('cotizacion_seguimiento') && nv(pl('cotizacion_seguimiento').t) === 7 && pl('cotizacion_seguimiento').e.length === 7 && /Mensaje automático/.test(pl('cotizacion_seguimiento').t) &&
      JSON.stringify(pl('cotizacion_seguimiento').bt) === JSON.stringify(['Que me llamen', 'Ya compré', 'No, gracias']) && pl('vendedora_llamar_cliente') && nv(pl('vendedora_llamar_cliente').t) === 3 &&
      pl('cotizacion_sin_llamar') && nv(pl('cotizacion_sin_llamar').t) === 4 && !/descuento/i.test(pl('cotizacion_seguimiento').t));
  chk('7b. en WA_TIPOS (cs, vl, csl)', S.ctx.WA_TIPOS.cs.plantilla === 'cotizacion_seguimiento' && S.ctx.WA_TIPOS.vl.plantilla === 'vendedora_llamar_cliente' && S.ctx.WA_TIPOS.csl.plantilla === 'cotizacion_sin_llamar');
  S.meta.responder = (b) => (b && b.name === 'cotizacion_seguimiento') ? { code: 200, body: { id: 't1', status: 'PENDING', category: 'MARKETING' } } : { code: 200, body: { id: 't', status: 'PENDING', category: 'UTILITY' } };
  const r = S.ctx.crearPlantillasWhatsApp(), x = r.plantillas.find(y => y.n === 'cotizacion_seguimiento');
  chk('7c. crearPlantillasWhatsApp: si Meta la pone en MARKETING, lo dice y está bien', x && x.ok && /MARKETING/.test(x.txt), x);
  S.post({ action: 'cotGuardar', cot: COT() });
  const pr = S.ctx.probarAntesDeImplementar();
  chk('7d. probarAntesDeImplementar dice la hoja, Kommo y el seguimiento (apagado), sin ❌ por esto',
      pr.lineas.some(l => /hoja «Cotizaciones» tiene 1 cotización/.test(l)) && pr.lineas.some(l => /Kommo para las cotizaciones: apagado/.test(l)) && pr.lineas.some(l => /48 h: apagado/.test(l)) &&
      !pr.lineas.some(l => /^❌/.test(l) && /Cotizaci|Faltan funciones/.test(l)), pr.lineas.filter(l => /Cotizaci|cotizaci|Faltan/.test(l)));
});

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
