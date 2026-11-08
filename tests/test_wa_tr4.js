/* 📥 SERVIDOR 2026-11-07-f: EL PEDIDO QUE CARGA LA REVISIÓN DE CORREOS LE LLEGA AL DUEÑO, PARA SUBIRLO AL TR4 (dueño, 08/11: «por cada pedido
   que generes en el panel, necesito que el bot me envíe un mensaje únicamente a mí con los datos del pedido que acabas de cargar y recordarme
   de que lo debo subir al TR4»).
     1. La plantilla `pedido_correo_tr4` (6 datos, dice «TR4») y su tipo `tr4`.
     2. Un pedido NUEVO guardado con `tr4:1` (lo manda cargar_pedidos.py) → a los 2 minutos, UN mensaje al PRIMERO de WA_DUENO (el jefe no),
        con el N° del panel y del día, el cliente, su número de pedido, los productos con código, cantidad y precio, el total y la entrega.
        Logística recibe su «pedido nuevo» como siempre; al cliente nada (es de Eduardo).
     3. Copacaba: sin «nota», el número sale del «OP-…» de las observaciones; «factura a» cuando es otro nombre.
     4. Sin `tr4` (el formulario del panel), corregir un pedido que ya estaba, o sin WA_DUENO: no sale. WA_PRUEBA lo desvía. Meta sin la
        plantilla aprobada: no sale otra en su lugar.
     5. cargar_pedidos.py manda `tr4:1`.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta de mentira.
   Se corre:  node tests/test_wa_tr4.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); } };

/* ── El servidor de mentira (como test_wa_jueves.js), con Meta, Kommo y Claude de mentira ── */
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
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; return { setFontWeight() {} }; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
  };
}
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
const SEG = (txt) => Math.floor(Date.parse(txt.replace(' ', 'T') + ':00-04:00') / 1000);
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props, op) {
  op = op || {};
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 };
  const kommo = { leads: [], eventos: [], usuarios: [], resp: {}, llamadas: [], falla: false };
  const claude = { llamadas: [], responder: null };
  const candado = { pedidos: 0 };
  const triggers = [];
  const q = (url, k) => { const m = url.match(new RegExp('[?&]' + k.replace(/[\[\]]/g, '\\$&') + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; };
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : JSON.stringify(body)) });
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null),
      insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com/.test(url)) {
        kommo.llamadas.push(url);
        if (kommo.falla) return res(500, {});
        const camino = url.split('/api/v4')[1] || '';
        if (/^\/events/.test(camino)) {
          if (/filter\[entity/.test(url)) return res(204);   // como Kommo de verdad con los mensajes de chat (§4ng)
          const tipo = q(url, 'filter[type]'), de = Number(q(url, 'filter[created_at][from]')) || 0, a = Number(q(url, 'filter[created_at][to]')) || 9e12;
          const lim = Math.min(100, Number(q(url, 'limit')) || 50), pg = Number(q(url, 'page')) || 1;
          const todos = kommo.eventos.filter(e => e.type === tipo && e.created_at >= de && e.created_at <= a).sort((x, y) => y.created_at - x.created_at);
          const L = todos.slice((pg - 1) * lim, pg * lim);
          if (!L.length) return res(204);
          return res(200, { _embedded: { events: L }, _links: todos.length > pg * lim ? { next: { href: 'siguiente' } } : {} });
        }
        if (/^\/users/.test(camino)) return res(200, { _embedded: { users: kommo.usuarios } });
        if (/^\/leads/.test(camino) && /filter\[id\]\[\]=/.test(url)) {
          const ids = (url.match(/filter\[id\]\[\]=([^&]*)/g) || []).map(s => decodeURIComponent(s.split('=')[1]));
          return res(200, { _embedded: { leads: ids.map(id => ({ id: Number(id), responsible_user_id: kommo.resp[id] || 0, status_id: 1 })) } });
        }
        if (/^\/leads/.test(camino)) {
          const de = Number(q(url, 'filter[created_at][from]')) || 0, a = Number(q(url, 'filter[created_at][to]')) || 9e12, lim = Number(q(url, 'limit')) || 50, pg = Number(q(url, 'page')) || 1;
          const L = kommo.leads.filter(x => x.created_at >= de && x.created_at <= a).slice((pg - 1) * lim, pg * lim);
          return L.length ? res(200, { _embedded: { leads: L } }) : res(204);
        }
        return res(404, {});
      }
      if (/api\.anthropic\.com/.test(url)) {
        const body = o.payload ? JSON.parse(o.payload) : null; claude.llamadas.push({ url, o, body });
        const r = claude.responder ? claude.responder(body, claude.llamadas.length) : null;
        return res(r ? r.code : 200, r ? r.body : { content: [{ type: 'text', text: 'Tenés 2 entregas hoy.' }], stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 40 }, model: 'claude-opus-5-5' });
      }
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      return res(r ? r.code : 200, r ? (r.body || {}) : { messages: [{ id: 'wamid.' + (++meta.n) }] });
    } },
    LockService: { getScriptLock: () => ({ waitLock() { candado.pedidos++; if (op.sinCandado) throw new Error('candado ocupado'); }, releaseLock() {}, tryLock() { candado.pedidos++; return !op.sinCandado; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, putAll() {}, remove() {}, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, tipo: 'after', ms, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyMinutes: (n) => ({ create: () => { const t = { fn, tipo: 'every', n, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyHours: (n) => ({ create: () => { const t = { fn, tipo: 'hours', n, getHandlerFunction: () => fn }; triggers.push(t); return t; } }),
                                                 everyDays: () => ({ atHour: () => ({ create: () => { const t = { fn, tipo: 'daily', getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC + (op.extra || ''), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const lista = () => sh._datos.slice(1).map(f => ctx.rowToRec_(f));
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  const limpiar = () => { meta.llamadas.length = 0; kommo.llamadas.length = 0; claude.llamadas.length = 0; };
  return { ctx, sh, P, meta, kommo, claude, candado, triggers, post, cargar, lista, hoja, salen, limpiar, repaso: () => ctx.waRepaso() };
}

const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', KOMMO_TOKEN: '',
  WA_DUENO: 'Eduardo:59170000099, Jefe:59170000098' };
const MULTI = (o) => Object.assign({ id: 'mc1', fecha: '2026-11-10', oc: '11-061', vendedor: 'Eduardo Añez', cliente: 'MULTICENTER',
  productos: [{ desc: 'COLCHON TITANIO ICE', medida: '140x190', codigo: 'CH1220', cant: 2, precio: 4275 }], celular: '', turno: 'PM',
  zona: 'PARQUE INDUSTRIAL', direccion: 'ALMACENES MULTICENTER — Centro de Distribución Santa Cruz', maps: '', pagado: false, saldo: 8550,
  ts: TS('2026-11-09', '08:50'), metodoPago: '', observaciones: 'A CRÉDITO — DEBE Bs 8550. OC Multicenter 33278. · Cargado automáticamente desde el correo.',
  estado: '', entregado: false, vehiculo: '', chofer: '', garantia: '', nota: '33278', acuenta: 0, facturarA: '', nit: '', nroDia: 7,
  verificado: false, fotos: [] }, o || {});
const COPA = (o) => MULTI(Object.assign({ id: 'cp1', oc: '11-062', cliente: 'JOSE CARLOS COPACABA POTOSI', facturarA: 'JOSE CARLOS COPACABA', nota: '',
  celular: '77081968', zona: 'BIMODAL', turno: 'AM', fecha: '2026-11-12', nroDia: 3,
  productos: [{ desc: 'SUENA ESSENTIAL +2CM', medida: '105x190', codigo: 'CH1301', cant: 3, precio: 1200 },
              { desc: 'SUENA CONFORT PLUS +2CM', medida: '105x190', codigo: 'CH1311', cant: 1, precio: 1500.5 }],
  observaciones: 'Pedido OP-01-11-26 de JOSE CARLOS COPACABA (POTOSI), del 06/11, mandado por Juan Carlos Arce. · Cargado automáticamente desde el correo.' }, o || {}));
const despues = (S, min) => { RELOJ.ms += (min || 3) * 60000; S.repaso(); };

seccion('1. la plantilla y el tipo', () => {
  const S = servidor(ON);
  const T = S.ctx.WA_PLANTILLAS.find(x => x.n === 'pedido_correo_tr4'), tipo = S.ctx.WA_TIPOS.tr4;
  chk('pedido_correo_tr4 existe, con 6 datos y 6 ejemplos, y dice «TR4»', !!T && (T.t.match(/\{\{\d+\}\}/g) || []).length === 6 && T.e.length === 6 && /TR4/.test(T.t), T && T.t);
  chk('el tipo `tr4` la usa, sin respaldo (no es al cliente)', !!tipo && tipo.plantilla === 'pedido_correo_tr4' && !tipo.vieja && !tipo.cli, tipo);
});

seccion('2. un pedido de Multicenter que cargó la revisión de correos', () => {
  poner('2026-11-09 13:00');
  const S = servidor(ON);
  const r = S.post({ action: 'save', pedido: MULTI(), av: 1, tr4: 1 });
  chk('se guarda', r.ok === true, r);
  const cola = JSON.parse(S.P.WA_COLA || '[]');
  chk('la cola lo tiene como nuevo y con la marca del correo', cola.length === 1 && cola[0].t === 'n' && cola[0].tr4 === 1, cola);
  S.repaso();
  chk('antes de los 2 minutos no sale nada', S.salen().length === 0, S.salen());
  despues(S, 3);
  const M = S.salen('pedido_correo_tr4');
  chk('a los 2 minutos sale UNO, al dueño (el primero de WA_DUENO) y no al jefe', M.length === 1 && M[0].to === '59170000099', M.map(m => m.to));
  const p = (M[0] || {}).p || [];
  chk('{{1}} el N° del panel y el del día (el que puso el servidor)', p[0] === 'OC 11-061 · N° ' + S.lista().find(x => x.id === 'mc1').nroDia + ' del día' && /N° 1 del día/.test(p[0]), p[0]);
  chk('{{2}} el cliente', p[1] === 'MULTICENTER', p[1]);
  chk('{{3}} su número de pedido (la OC de Multicenter)', p[2] === '33278', p[2]);
  chk('{{4}} los productos con cantidad, código, medida y precio', p[3] === '2 × CH1220 COLCHON TITANIO ICE 140x190 a Bs 4.275', p[3]);
  chk('{{5}} el total = cantidad × precio', p[4] === 'Bs 8.550', p[4]);
  chk('{{6}} la entrega', p[5] === 'martes 10/11 por la tarde', p[5]);
  chk('logística recibe su «pedido nuevo» como siempre, y nada más sale (al cliente nada: es de Eduardo)', S.salen('logistica_pedido_nuevo_v2').length === 1 && S.salen().length === 2, S.salen().map(m => m.pl + '→' + m.to));
  const fila = S.hoja().find(f => f.join(' ').indexOf('pedido_correo_tr4') >= 0);
  chk('queda anotado en la hoja «Bot WhatsApp»', !!fila, S.hoja().length);
  S.limpiar(); despues(S, 10);
  chk('no se repite en el repaso siguiente', !S.salen('pedido_correo_tr4').length, S.salen());
});

seccion('3. Copacaba: el número del «OP-…» y a quién se factura', () => {
  poner('2026-11-09 13:00');
  const S = servidor(ON);
  S.post({ action: 'save', pedido: COPA(), av: 1, tr4: 1 }); despues(S, 3);
  const p = (S.salen('pedido_correo_tr4')[0] || {}).p || [];
  chk('{{2}} el cliente con «factura a» (otro nombre)', p[1] === 'JOSE CARLOS COPACABA POTOSI (factura a JOSE CARLOS COPACABA)', p[1]);
  chk('{{3}} sin nota: el «OP-…» de las observaciones', p[2] === 'OP-01-11-26', p[2]);
  chk('{{4}} dos productos, el precio con centavos', p[3] === '3 × CH1301 SUENA ESSENTIAL +2CM 105x190 a Bs 1.200 · 1 × CH1311 SUENA CONFORT PLUS +2CM 105x190 a Bs 1.500,50', p[3]);
  chk('{{5}} el total 3 × 1.200 + 1.500,50', p[4] === 'Bs 5.100,50', p[4]);
  chk('{{6}} jueves por la mañana', p[5] === 'jueves 12/11 por la mañana', p[5]);
  const S2 = servidor(ON);
  S2.post({ action: 'save', pedido: COPA({ id: 'cp2', observaciones: 'sin número' }), av: 1, tr4: 1 }); despues(S2, 3);
  chk('sin nota ni «OP-…»: «sin número»', ((S2.salen('pedido_correo_tr4')[0] || {}).p || [])[2] === 'sin número', S2.salen('pedido_correo_tr4'));
});

seccion('4. cuándo NO sale', () => {
  poner('2026-11-09 13:00');
  let S = servidor(ON);
  S.post({ action: 'save', pedido: MULTI(), av: 1 }); despues(S, 3);
  chk('guardado desde el panel (sin `tr4`): no sale', !S.salen('pedido_correo_tr4').length && S.salen('logistica_pedido_nuevo_v2').length === 1, S.salen().map(m => m.pl));
  S = servidor(ON);
  S.post({ action: 'save', pedido: MULTI({ rev: 0 }), av: 1 }); despues(S, 3); S.limpiar();
  const ya = S.lista().find(x => x.id === 'mc1');
  S.post({ action: 'save', pedido: Object.assign({}, ya, { turno: 'AM' }), av: 1, tr4: 1 }); despues(S, 3);
  chk('corregir con `tr4` un pedido que ya estaba: no sale (solo el aviso de cambio de siempre)', !S.salen('pedido_correo_tr4').length, S.salen().map(m => m.pl));
  S = servidor(Object.assign({}, ON, { WA_DUENO: '' }));
  const r = S.post({ action: 'save', pedido: MULTI(), av: 1, tr4: 1 }); despues(S, 3);
  chk('sin WA_DUENO: el pedido se guarda igual y no sale a nadie', r.ok === true && !S.salen('pedido_correo_tr4').length, S.salen().map(m => m.pl + '→' + m.to));
  S = servidor(Object.assign({}, ON, { WA_PRUEBA: '59170000777' }));
  S.post({ action: 'save', pedido: MULTI(), av: 1, tr4: 1 }); despues(S, 3);
  const M = S.salen('pedido_correo_tr4');
  chk('con WA_PRUEBA va al número de prueba', M.length === 1 && M[0].to === '59170000777', M.map(m => m.to));
  S = servidor(ON);
  S.meta.responder = (b) => (b && b.template && b.template.name === 'pedido_correo_tr4') ? { code: 404, body: { error: { code: 132001, message: 'Template name does not exist in the translation' } } } : null;
  S.post({ action: 'save', pedido: MULTI(), av: 1, tr4: 1 }); despues(S, 3);
  const pls = S.meta.llamadas.filter(c => c.body && c.body.template && c.body.to === '59170000099').map(c => c.body.template.name);
  chk('Meta sin la plantilla aprobada: se intenta y no se manda OTRA en su lugar', pls.length === 1 && pls[0] === 'pedido_correo_tr4', pls);
  chk('…y el aviso a logística sale igual', S.salen('logistica_pedido_nuevo_v2').length === 1, S.salen().map(m => m.pl));
  S = servidor(Object.assign({}, ON, { WA_ACTIVO: '0' }));
  const r2 = S.post({ action: 'save', pedido: MULTI(), av: 1, tr4: 1 }); despues(S, 3);
  chk('con el bot apagado: se guarda y no sale nada', r2.ok === true && !S.meta.llamadas.length, S.meta.llamadas.length);
});

seccion('5. la revisión de correos manda `tr4`', () => {
  const py = fs.readFileSync(path.resolve(__dirname, '..', 'herramientas', 'pedidos_correo', 'cargar_pedidos.py'), 'utf8');
  chk('cargar_pedidos.py guarda con "tr4": 1', /post\(\{"action": "save", "pedido": rec, "av": 1, "tr4": 1\}\)/.test(py), '');
});

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
