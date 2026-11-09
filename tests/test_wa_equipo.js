/* 👥 SERVIDOR 2026-11-09-a: LO QUE ESCRIBE UN NÚMERO DEL EQUIPO NO ES UN CLIENTE (dueño, 09/11: «si hazlo»).
   El «Buen día» de las 08:30 le llegó a Isabel y el saludo automático de su WhatsApp Business («Gracias por comunicarte a colchones
   HEAVEN…») volvió al bot como si fuera un cliente: tarjeta «No sé de qué pedido es» en la pestaña Bot y la respuesta automática de vuelta.
     1. Una vendedora, logística (WA_LOGISTICA, WA_PEDIR_HOY, WA_AVISOS): fila «👥 Del equipo», sin respuesta, sin Claude, sin tarjeta.
     2. Una ubicación de alguien del equipo no se pega a ningún pedido.
     3. El panel (waRespuestas) no muestra lo del equipo, tampoco las filas de antes (la de Isabel del 09/11).
     4. Lo de siempre sigue igual: un cliente (respuesta automática o Claude), el dueño (el menú), Contabilidad («recibí»/la ayuda).
     5. probarAntesDeImplementar lo dice.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta y Claude de mentira.
   Se corre:  node tests/test_wa_equipo.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); } };

/* ── El servidor de mentira (el mismo de test_wa_13_25_26.js), con Meta y Claude de mentira ── */
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


/* ── Los datos ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const P = (id, vend, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + String(id).toUpperCase(), fecha: '2026-11-14', turno: 'AM',
  celular: '70000011', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, precio: 3000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: '', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '',
  ts: TS('2026-11-02'), nroDia: 0, fotos: [], rev: 1 }, o || {});
const SISTEMA = (id, obs, o) => P(id, '', Object.assign({ oc: '', cliente: 'FILA DEL SISTEMA', fecha: '', turno: '', productos: [], observaciones: obs, celular: '', ts: TS('2026-11-01', '09:00') }, o || {}));
const PIN = 'https://www.google.com/maps?q=-17.7800,-63.1800';
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', KOMMO_TOKEN: '',
  WA_VENDEDORAS: 'Carola Chavez:70000001, Mauricio Merida:70000005', WA_HOOK_KEY: 'clave-hook' };
const textos = (S, to) => S.meta.llamadas.filter(c => c.body && c.body.type === 'text' && (!to || c.body.to === to)).map(c => c.body.text.body);
let nW = 0;
const hook = (S, from, msg, id) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: 'Quien' } }],
           messages: [Object.assign({ id: id || ('wamid.in' + (++nW)), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const txt = (body) => ({ type: 'text', text: { body } });

/* ── Los datos: la vendedora con saludo automático, logística, Contabilidad, el dueño y un cliente ── */
const EQ = Object.assign({}, ON, {
  WA_VENDEDORAS: 'Isabel Robledo:59170000002, Carola Chavez:59170000001',
  WA_PEDIR_HOY: 'Alba:59171000002', WA_AVISOS: 'David:59171000003', WA_CONTABILIDAD: 'Conta:59171000004',
  WA_DUENO: 'Eduardo:59177000007', WA_PRUEBA: '59179999999' });
const IA = { IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'sk-de-mentira' };
const SALUDO = 'Gracias por comunicarte a colchones HEAVEN  MIA PLAZA. Mi nombre es ISABEL. 😊\n\n¿Cómo podemos ayudarte?';
const CLI = '59170000031';
function armar(extra) {
  poner('2026-11-09 08:34');
  const S = servidor(Object.assign({}, EQ, extra || {}));
  S.cargar([P('c1', 'Carola Chavez', { celular: '70000031' })]);
  return S;
}
const filasDe = (S, num) => S.hoja().filter(f => String(f[5]) === num);
const resp = (S) => (S.post({ action: 'waRespuestas' }).resp || []);

(async () => {
  seccion('1. Una vendedora o logística le escriben al bot: «👥 Del equipo» y nada más', () => {
    const S = armar();
    hook(S, '59170000002', txt(SALUDO));
    const f = filasDe(S, '59170000002');
    chk('1a el saludo de Isabel queda anotado como «👥 Del equipo», con el texto y que no se contesta',
        f.length === 1 && f[0][3] === '👥 Del equipo' && /MIA PLAZA/.test(f[0][9]) && /^— del equipo \(vendedora\): no se contesta$/.test(f[0][12]) && !f[0][1], f);
    chk('1b no hay fila «💬 Respondió» ni «Respuesta automática», y a Isabel no le sale nada', !S.hoja().some(x => x[3] === '💬 Respondió' || x[3] === 'Respuesta automática') && textos(S).length === 0,
        S.hoja().map(x => x[3]));
    chk('1c el panel no la muestra (waRespuestas vacío)', resp(S).length === 0, resp(S));
    hook(S, '59171000001', txt('ok'));          // Ernesto (WA_LOGISTICA)
    hook(S, '59171000002', txt('listo'));       // Alba (WA_PEDIR_HOY)
    hook(S, '59171000003', txt('👍 visto'));    // David (WA_AVISOS)
    const L = ['59171000001', '59171000002', '59171000003'].map(n => (filasDe(S, n)[0] || [])[12]);
    chk('1d logística (WA_LOGISTICA, WA_PEDIR_HOY y WA_AVISOS): «👥 Del equipo (logística)», sin respuesta',
        L.every(x => x === '— del equipo (logística): no se contesta') && textos(S).length === 0 && resp(S).length === 0, L);
    chk('1e no toma el candado del panel ni lee la planilla de pedidos para buscar un pedido', S.candado.pedidos === 0, S.candado.pedidos);
  });

  seccion('2. Con Claude prendido: tampoco le contesta al equipo', () => {
    const S = armar(IA);
    hook(S, '59170000002', txt(SALUDO));
    chk('2a ni Claude ni «⏳» ni respuesta automática', S.claude.llamadas.length === 0 && !S.hoja().some(x => String(x[12] || '').charAt(0) === '⏳') && textos(S).length === 0,
        { c: S.claude.llamadas.length, h: S.hoja().map(x => x[3] + '|' + x[12]) });
    hook(S, CLI, txt('¿a qué hora llega mi colchón?'));
    chk('2b un cliente sigue igual: «💬 Respondió» con «⏳» (Claude lo contesta con 4 s de quietud; el reloj de la prueba no corre)',
        S.hoja().some(x => x[3] === '💬 Respondió' && String(x[5]) === CLI && String(x[12] || '').charAt(0) === '⏳') && textos(S).length === 0,
        { c: S.claude.llamadas.length, h: S.hoja().map(x => x[3] + '|' + x[12]) });
  });

  seccion('3. Una ubicación de alguien del equipo no se pega a ningún pedido', () => {
    const S = armar();
    hook(S, '59170000001', { type: 'location', location: { latitude: -17.78, longitude: -63.18, name: 'Tienda' } });
    const f = filasDe(S, '59170000001');
    chk('3a «👥 Del equipo», sin pedido ni columna de ubicación, y nada le sale', f.length === 1 && f[0][3] === '👥 Del equipo' && !f[0][1] && !f[0][16] && textos(S).length === 0, f);
    chk('3b el pedido del cliente sigue sin pin', !String(S.lista().find(p => p.id === 'c1').maps || ''), S.lista().find(p => p.id === 'c1').maps);
  });

  seccion('4. Lo de siempre sigue igual', () => {
    const S = armar();
    hook(S, CLI, txt('hola, ¿cuándo me traen?'));
    chk('4a un cliente: «💬 Respondió» y la respuesta automática de siempre', S.hoja().some(x => x[3] === '💬 Respondió' && String(x[5]) === CLI) && S.hoja().some(x => x[3] === 'Respuesta automática') &&
        textos(S, CLI).length === 1, S.hoja().map(x => x[3]));
    chk('4b …y el panel lo muestra', resp(S).length === 1 && resp(S)[0].num === CLI, resp(S));
    S.limpiar(); hook(S, '59177000007', txt('hola'));
    chk('4c el dueño: el menú de siempre (no «Del equipo»)', /^🤖 \*Preguntame por acá\*/.test(textos(S, '59177000007')[0] || '') && !filasDe(S, '59177000007').some(x => x[3] === '👥 Del equipo'),
        textos(S, '59177000007'));
    S.limpiar(); hook(S, '59171000004', txt('hola'));
    chk('4d Contabilidad: la ayuda de «Ya lo recibí» de siempre (no «Del equipo»)', textos(S, '59171000004').length === 1 && !filasDe(S, '59171000004').some(x => x[3] === '👥 Del equipo'),
        { t: textos(S, '59171000004'), h: filasDe(S, '59171000004').map(x => x[3]) });
    S.limpiar(); hook(S, '59179999999', txt('hola'));
    chk('4e el número de prueba (WA_PRUEBA) no es del equipo: sigue con lo suyo', !filasDe(S, '59179999999').some(x => x[3] === '👥 Del equipo'), filasDe(S, '59179999999').map(x => x[3]));
    chk('4f waEquipoCels_: vendedoras, logística (las tres listas), Contabilidad y el dueño; el de prueba no', (() => {
      const c = S.ctx.waEquipoCels_(S.ctx.waConfig_());
      return ['59170000002', '59170000001', '59171000001', '59171000002', '59171000003', '59171000004', '59177000007'].every(n => c[n]) && !c['59179999999'] && !c[CLI];
    })());
  });

  seccion('5. Las filas de antes: el panel deja de mostrar lo del equipo', () => {
    const S = armar();
    // Como quedó el 09/11 con el servidor 07-f: el saludo de Isabel y la respuesta automática que le salió, y un cliente de verdad.
    const ms = RELOJ.ms - 3600000;
    const fila = (num, nom, t, w) => ['09/11 07:34', '', '', '💬 Respondió', nom, num, '', '💬 mensaje', w, t, '', ms, '', '', '', '', ''];
    S.ctx.waHoja_();   // crea la hoja con sus encabezados
    const h = S.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bot WhatsApp');
    h.appendRow(fila('59170000002', 'Heaven Isabel', SALUDO, 'wamid.viejo1'));
    h.appendRow(fila(CLI, 'Cliente', 'gracias!', 'wamid.viejo2'));
    const r = resp(S);
    chk('5a el saludo de Isabel ya no sale en la pestaña Bot; el del cliente sí', r.length === 1 && r[0].num === CLI, r.map(x => x.num + ' ' + x.txt));
  });

  seccion('6. probarAntesDeImplementar lo dice', () => {
    const S = armar();
    const L = S.ctx.probarAntesDeImplementar().lineas;
    chk('6a «👥 Lo que escribe uno de los 7 número(s) del equipo… no se toma como un cliente»', L.some(l => /^✅ 👥 Lo que escribe uno de los 7 número\(s\) del equipo/.test(l)), L.filter(l => /👥/.test(l)));
    chk('6b la versión es la 2026-11-09-a y nada frena', L.some(l => l === '✅ Versión de este código: 2026-11-09-a') && !L.some(l => /^❌/.test(l)), L.filter(l => /^❌|Versión/.test(l)));
  });

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
