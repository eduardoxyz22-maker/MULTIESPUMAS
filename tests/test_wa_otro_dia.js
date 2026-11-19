/* 📅 SERVIDOR 2026-11-14-a, MEJORA 217: EL CLIENTE ELIGE EL DÍA NUEVO POR EL BOT. El dueño: «Cuando el cliente escribe «no voy a estar», el
   bot le ofrece con botones dos o tres días que tienen cupo. Lo que elige le llega a logística con un botón «Mover»: logística confirma con
   un toque y el bot le avisa al cliente. Nada se mueve solo.»
     1. Los días (`rdOpciones_`): después de hoy y del día que tenía, el mismo turno primero, solo con lugar (12 / 13, sábado 15 y solo la
        mañana, ni domingo, ni feriado, ni un día cerrado).
     2. Claude dice «no va a estar» (u `otro_dia`): la respuesta sale con los botones (mensaje interactivo de Meta, sin plantilla), Claude
        ve los días en su consulta, el esquema sigue con las 5 obligatorias; una vez por pedido y por día.
     3. Lo que NO lleva botones: otra consulta, un pedido entregado, de tienda, sin día, que retira el cliente, pasado; sin lugar.
     4. El toque: queda el pedido de cambio, una fila «📅 Pidió otro día», al cliente «Listo…» y a logística el cambio de entrega de siempre;
        la fila del pedido NO cambia; repetido, otro día, uno que no se le ofreció, otro número, vencido.
     5. `rdMarcar` (Mover / No, dejarlo / Quitar) y `waRespuestas` → `rd`.
     6. Meta no toma los botones: la respuesta sale como texto. Una respuesta larga: el texto y después los botones.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta y Claude de mentira.
   Se corre:  node tests/test_wa_otro_dia.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); } };

/* ── El servidor de mentira (el de test_wa_equipo.js), con Meta y Claude de mentira ── */
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
const pasarSeg = (s) => { RELOJ.ms += s * 1000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props, op) {
  op = op || {};
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 };
  const claude = { llamadas: [], responder: null };
  const candado = { pedidos: 0 };
  const triggers = [];
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
      if (/kommo\.com/.test(url)) return res(204);
      if (/api\.anthropic\.com/.test(url)) {
        const body = o.payload ? JSON.parse(o.payload) : null; claude.llamadas.push({ url, o, body });
        const r = claude.responder ? claude.responder(body, claude.llamadas.length) : null;
        return res(r ? r.code : 200, r ? r.body : { content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 40 } });
      }
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      return res(r ? r.code : 200, r ? (r.body || {}) : { messages: [{ id: 'wamid.out' + (++meta.n) }] });
    } },
    LockService: { getScriptLock: () => ({ waitLock() { candado.pedidos++; if (op.sinCandado) throw new Error('candado ocupado'); }, releaseLock() {}, tryLock() { candado.pedidos++; return !op.sinCandado; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, putAll() {}, remove() {}, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { const t = { fn, tipo: 'after', ms, getHandlerFunction: () => fn }; triggers.push(t); return t; } }) }) }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
    }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const lista = () => sh._datos.slice(1).map(f => ctx.rowToRec_(f));
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  const limpiar = () => { meta.llamadas.length = 0; claude.llamadas.length = 0; };
  return { ctx, sh, P, meta, claude, candado, triggers, post, cargar, lista, hoja, salen, limpiar };
}

/* ── Los datos ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const P = (id, vend, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'JUAN ' + String(id).toUpperCase(), fecha: '2026-11-17', turno: 'AM',
  celular: '70000031', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, precio: 3000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: '', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '',
  ts: TS('2026-11-10'), nroDia: 0, fotos: [], rev: 3 }, o || {});
const RELLENO = (fecha, turno, n, pre) => Array.from({ length: n }, (_, i) => P((pre || 'r') + fecha.slice(5) + turno + i, 'Maria Flores', { fecha, turno, celular: '70100' + String(100 + i), cliente: 'OTRO ' + i }));
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', KOMMO_TOKEN: '',
  WA_VENDEDORAS: 'Carola Chavez:70000001', WA_HOOK_KEY: 'clave-hook', IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'sk-de-mentira' };
const CLI = '59170000031';
let nW = 0;
const hook = (S, from, msg, id) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: 'Juan' } }],
           messages: [Object.assign({ id: id || ('wamid.in' + (++nW)), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const txt = (body) => ({ type: 'text', text: { body } });
const toque = (id, title) => ({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id, title: title || 'día' } } });
const RESP_NO = '¡Hola Juan! No hay problema 😊 Elegí abajo el día que te quede mejor y logística te lo confirma por acá.';
const claudeDice = (o) => ({ code: 200, body: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(Object.assign({ categoria: 'no_esta', urgente: false, resumen: 'No va a estar el martes', contestar: true, respuesta: RESP_NO, otro_dia: true }, o || {})) }],
  usage: { input_tokens: 1500, output_tokens: 300 } } });
const conClaude = (S, o) => { S.claude.responder = (b) => { S._visto = b; return claudeDice(typeof o === 'function' ? o(b) : o); }; };
/* El cliente escribe y Claude contesta a los 25 s (la vuelta de respaldo). */
const escribe = (S, t, from) => { hook(S, from || CLI, txt(t)); pasarSeg(25); S.ctx.iaRepaso(0, true); };
const inter = (S, to) => S.meta.llamadas.filter(c => c.body && c.body.type === 'interactive' && (!to || c.body.to === to)).map(c => c.body);
const textos = (S, to) => S.meta.llamadas.filter(c => c.body && c.body.type === 'text' && (!to || c.body.to === to)).map(c => c.body.text.body);
const ops = (S, p, hoy) => S.ctx.rdOpciones_(S.lista().find(x => x.id === p), S.lista(), hoy).map(x => x.title);
const fila = (S, id) => JSON.stringify(S.sh._datos.find(f => f[0] === id));
function armar(extra, pedidos, hora) {
  poner(hora || '2026-11-16 10:00');   // lunes
  const S = servidor(Object.assign({}, ON, extra || {}));
  S.cargar(pedidos || [P('c1', 'Carola Chavez')]);
  return S;
}

(async () => {
  seccion('1. Los días: después de hoy y del que tenía, el mismo turno primero, solo con lugar', () => {
    const S = armar({}, [P('c1', 'Carola Chavez'), P('c2', 'Carola Chavez', { fecha: '2026-11-20', turno: 'PM', celular: '70000032' }),
      P('c3', 'Carola Chavez', { fecha: '2026-11-25', celular: '70000033' }), P('c4', 'Carola Chavez', { fecha: '2026-11-16', turno: 'PM', celular: '70000034' })]);
    chk('1a martes 17 a la mañana (hoy lunes 16): «Mié 18 · mañana», «Mié 18 · tarde», «Jue 19 · mañana»', JSON.stringify(ops(S, 'c1', '2026-11-16')) === JSON.stringify(['Mié 18 · mañana', 'Mié 18 · tarde', 'Jue 19 · mañana']), ops(S, 'c1', '2026-11-16'));
    const o = S.ctx.rdOpciones_(S.lista().find(x => x.id === 'c1'), S.lista(), '2026-11-16');
    chk('1b cada botón: id «rd|<pedido>|<día>|<turno>» y un título de 20 letras como mucho', o.length === 3 && o[0].id === 'rd|c1|2026-11-18|AM' && o[1].id === 'rd|c1|2026-11-18|PM' && o.every(x => x.title.length <= 20), o);
    chk('1c viernes 20 a la tarde: el sábado solo la mañana, el domingo no: «Sáb 21 · mañana», «Lun 23 · tarde», «Lun 23 · mañana»',
        JSON.stringify(ops(S, 'c2', '2026-11-16')) === JSON.stringify(['Sáb 21 · mañana', 'Lun 23 · tarde', 'Lun 23 · mañana']), ops(S, 'c2', '2026-11-16'));
    chk('1d nunca ANTES del día que tenía (RD_ANTES_DEL_DIA = false): uno del miércoles 25 arranca el jueves 26', ops(S, 'c3', '2026-11-16')[0] === 'Jue 26 · mañana' && S.ctx.RD_ANTES_DEL_DIA === false, ops(S, 'c3', '2026-11-16'));
    chk('1e uno de HOY a la tarde: desde mañana, la tarde primero', JSON.stringify(ops(S, 'c4', '2026-11-16')) === JSON.stringify(['Mar 17 · tarde', 'Mar 17 · mañana', 'Mié 18 · tarde']), ops(S, 'c4', '2026-11-16'));
  });

  seccion('1b. Los días: turno lleno, sábado lleno, día cerrado y feriado', () => {
    let S = armar({}, [P('c1', 'Carola Chavez')].concat(RELLENO('2026-11-18', 'AM', 12)));
    chk('1f el miércoles a la mañana con 12 de 12: «Mié 18 · tarde», «Jue 19 · mañana», «Jue 19 · tarde»', JSON.stringify(ops(S, 'c1', '2026-11-16')) === JSON.stringify(['Mié 18 · tarde', 'Jue 19 · mañana', 'Jue 19 · tarde']), ops(S, 'c1', '2026-11-16'));
    S = armar({}, [P('c1', 'Carola Chavez')].concat(RELLENO('2026-11-18', 'AM', 11)));
    chk('1g …con 11 de 12 todavía hay lugar', ops(S, 'c1', '2026-11-16')[0] === 'Mié 18 · mañana', ops(S, 'c1', '2026-11-16'));
    S = armar({}, [P('c2', 'Carola Chavez', { fecha: '2026-11-20', turno: 'PM' })].concat(RELLENO('2026-11-21', 'AM', 15)));
    chk('1h el sábado con 15 de 15: no se ofrece', ops(S, 'c2', '2026-11-16')[0] === 'Lun 23 · tarde', ops(S, 'c2', '2026-11-16'));
    S = armar({}, [P('c1', 'Carola Chavez'), P('__dias_cerrados__', '', { oc: '', cliente: 'FILA DEL SISTEMA', fecha: '', turno: '', productos: [], celular: '', observaciones: '🔒 2026-11-18,2026-11-19' })]);
    chk('1i el miércoles y el jueves CERRADOS por Administración: arranca el viernes', ops(S, 'c1', '2026-11-16')[0] === 'Vie 20 · mañana', ops(S, 'c1', '2026-11-16'));
    S = armar({}, [P('n1', 'Carola Chavez', { fecha: '2026-12-24' })], '2026-12-21 10:00');
    chk('1j el 24/12: Navidad (feriado) no, el sábado 26 sí', JSON.stringify(ops(S, 'n1', '2026-12-21')) === JSON.stringify(['Sáb 26 · mañana', 'Lun 28 · mañana', 'Lun 28 · tarde']), ops(S, 'n1', '2026-12-21'));
  });

  seccion('2. «No voy a estar»: la respuesta de Claude con los botones de los días con lugar', () => {
    const S = armar();
    const antes = fila(S, 'c1');
    conClaude(S, {});
    escribe(S, 'no voy a estar el martes 😕');
    const I = inter(S, CLI);
    chk('2a UN mensaje interactivo de botones al cliente (Meta lo deja sin plantilla: el cliente acaba de escribir) y ningún texto suelto',
        I.length === 1 && I[0].interactive.type === 'button' && textos(S, CLI).length === 0, { I, t: textos(S) });
    const B = I[0] && I[0].interactive.action.buttons;
    chk('2b los tres días: «Mié 18 · mañana», «Mié 18 · tarde», «Jue 19 · mañana», con su id rd|c1|…', B && B.length === 3 && B.every(b => b.type === 'reply') &&
        JSON.stringify(B.map(b => b.reply.title)) === JSON.stringify(['Mié 18 · mañana', 'Mié 18 · tarde', 'Jue 19 · mañana']) && B[2].reply.id === 'rd|c1|2026-11-19|AM', B);
    const body = I[0] && I[0].interactive.body.text;
    chk('2c el cuerpo: la firma, lo que escribió Claude y «¿Qué día te queda mejor?» (≤ 1.024 letras)', body === '🤖 _Asistente automático · Heaven Colchones_\n\n' + RESP_NO + '\n\n' + S.ctx.RD_PREGUNTA && body.length <= 1024, body);
    const u = S._visto.messages[0].content;
    chk('2d Claude vio los días ANTES de <mensaje_cliente> («Días que hoy tienen lugar en el camión: miércoles 18/11 por la mañana, …»)',
        /Días que hoy tienen lugar en el camión: miércoles 18\/11 por la mañana, miércoles 18\/11 por la tarde, jueves 19\/11 por la mañana\./.test(u) && u.indexOf('Días que hoy') < u.indexOf('<mensaje_cliente>') &&
        /<mensaje_cliente>\n[^\n]*Juan: no voy a estar el martes 😕\n<\/mensaje_cliente>$/.test(u), u.slice(-600));
    const sc = S._visto.output_config.format.schema;
    chk('2e el esquema: `otro_dia` opcional (las 5 obligatorias de siempre) y el sistema dice qué es', !!sc.properties.otro_dia && sc.required.length === 5 && sc.required.indexOf('otro_dia') < 0 && /otro_dia: true si el cliente no va a estar/.test(S._visto.system), sc.required);
    const r = S.hoja().find(f => f[3] === '🤖 Respuesta IA');
    chk('2f la hoja: «🤖 Respuesta IA» con «(botones)», enviado, y lo que salió en la columna P', r && r[6] === '(botones)' && r[7] === '✅ enviado' && r[15] === body, r);
    const of = JSON.parse(S.P.RD_OFRECE || '{}').c1;
    chk('2g queda anotado qué se le ofreció (RD_OFRECE: día, número, los tres días y cómo estaba)', of && of.d === '2026-11-16' && of.c === CLI && JSON.stringify(of.o) === JSON.stringify(['2026-11-18|AM', '2026-11-18|PM', '2026-11-19|AM']) && of.de === '2026-11-17|AM', of);
    chk('2h la fila del pedido NO cambió (ni fecha, ni turno, ni sello)', fila(S, 'c1') === antes);
    chk('2i la fila del cliente: «no_esta» y queda para la vendedora (no la da por atendida)', S.hoja().some(f => f[3] === '💬 Respondió' && f[13] === 'no_esta' && !f[10]), S.hoja().filter(f => f[3] === '💬 Respondió').map(f => f.slice(10, 14)));
    S.limpiar(); conClaude(S, { respuesta: 'Ok, ya le paso a tu vendedora 🙏' });
    escribe(S, '¿y el jueves?');
    chk('2j el mismo día, otro mensaje: Claude contesta en TEXTO (los botones, una vez por pedido y por día)', inter(S).length === 0 && textos(S, CLI).length === 1, { i: inter(S).length, t: textos(S) });
    poner('2026-11-17 08:00'); S.limpiar(); conClaude(S, {});
    S.cargar([]);   // (sigue el mismo pedido, para el martes: hoy)
    escribe(S, 'hoy no voy a estar');
    chk('2k al otro día (la entrega es HOY): otra vez los botones, desde mañana', inter(S, CLI).length === 1 && inter(S, CLI)[0].interactive.action.buttons[0].reply.title === 'Mié 18 · mañana', inter(S, CLI).map(x => x.interactive.action.buttons.map(b => b.reply.title)));
  });

  seccion('2b. `otro_dia` sin «no_esta» también; Claude sin contestar, la frase de siempre', () => {
    let S = armar(); conClaude(S, { categoria: 'cambio', otro_dia: true, respuesta: '¡Hola! Elegí abajo el día que te quede mejor 😊' });
    escribe(S, '¿me lo pueden pasar a otro día?');
    chk('2l categoría «cambio» con otro_dia = true: con botones', inter(S, CLI).length === 1, S.meta.llamadas.map(c => c.body && c.body.type));
    S = armar(); conClaude(S, { categoria: 'no_esta', otro_dia: false, contestar: false, respuesta: '' });
    escribe(S, 'no voy a estar');
    const I = inter(S, CLI);
    chk('2m «no_esta» aunque otro_dia venga en false; sin texto de Claude: «No hay problema 😊» + la pregunta', I.length === 1 && I[0].interactive.body.text === '🤖 _Asistente automático · Heaven Colchones_\n\nNo hay problema 😊\n\n' + S.ctx.RD_PREGUNTA, I.map(x => x.interactive.body.text));
  });

  seccion('3. Lo que NO lleva botones', () => {
    let S = armar(); conClaude(S, { categoria: 'hora', otro_dia: false, respuesta: 'Llega el martes por la mañana 🚚' });
    escribe(S, '¿a qué hora llega?');
    chk('3a otra consulta (la hora): texto, sin botones, y nada anotado en RD_OFRECE', inter(S).length === 0 && textos(S, CLI).length === 1 && !JSON.parse(S.P.RD_OFRECE || '{}').c1, { i: inter(S).length, t: textos(S) });
    chk('3b …pero Claude igual vio los días (para no prometer otro)', /Días que hoy tienen lugar/.test(S._visto.messages[0].content));
    const casos = [
      ['entregado', { entregado: true }], ['venta de tienda', { direccion: 'SALIO DE TIENDA', zona: 'Tienda' }],
      ['«el cliente avisa cuándo» (sin día)', { fecha: '', turno: '', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, avisa: '2026-11-25' }] }],
      ['lo retira el cliente', { observaciones: 'EL CLIENTE RETIRA DE FABRICA' }], ['con la fecha pasada', { fecha: '2026-11-14' }]
    ];
    casos.forEach(([nom, o], i) => {
      const T = armar({}, [P('c1', 'Carola Chavez', o)]);
      const ped = { p: T.lista().find(x => x.id === 'c1') };
      chk('3' + 'cdefg'[i] + ' ' + nom + ': rdParaOfrecer_ no ofrece nada', T.ctx.rdParaOfrecer_(ped, { de: CLI }, T.lista(), T.ctx.waBo_(RELOJ.ms)).length === 0, T.ctx.rdNoVa_(ped.p, '2026-11-16'));
    });
    S = armar({}, [P('c1', 'Carola Chavez', { entregado: true })]); conClaude(S, {});
    escribe(S, 'no voy a estar');
    chk('3h por el webhook, un pedido entregado: Claude contesta en texto, sin botones', inter(S).length === 0 && textos(S, CLI).length === 1, { i: inter(S).length });
    const llenos = [];
    ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-07', '2026-12-08']
      .forEach(f => { llenos.push.apply(llenos, RELLENO(f, 'AM', 12)); llenos.push.apply(llenos, RELLENO(f, 'PM', 13)); });
    llenos.push.apply(llenos, RELLENO('2026-11-21', 'AM', 15)); llenos.push.apply(llenos, RELLENO('2026-11-28', 'AM', 15)); llenos.push.apply(llenos, RELLENO('2026-12-05', 'AM', 15));
    S = armar({}, [P('c1', 'Carola Chavez')].concat(llenos)); conClaude(S, {});
    escribe(S, 'no voy a estar');
    chk('3i sin lugar en los próximos 21 días: texto, sin botones (ni la pista para Claude)', inter(S).length === 0 && textos(S, CLI).length === 1 && !/Días que hoy tienen lugar/.test(S._visto.messages[0].content), { i: inter(S).length });
    S = armar({}, [P('c1', 'Eduardo Añez')]); conClaude(S, {});
    escribe(S, 'no voy a estar');
    chk('3j un pedido de Eduardo (el bot no le habla a ese cliente): sin botones', inter(S).length === 0, inter(S).length);
  });

  seccion('4. El cliente toca un día: se anota, se le contesta y logística se entera; el pedido no se toca', () => {
    const S = armar(); conClaude(S, {});
    escribe(S, 'no voy a estar el martes');
    const antes = fila(S, 'c1');
    S.limpiar(); pasarSeg(60);
    hook(S, CLI, toque('rd|c1|2026-11-18|AM', 'Mié 18 · mañana'), 'wamid.toque1');
    const pend = JSON.parse(S.P.RD_PEND || '[]');
    chk('4a queda UN pedido de cambio: c1 al miércoles 18 a la mañana, con cómo estaba y el número', pend.length === 1 && pend[0].id === 'c1' && pend[0].f === '2026-11-18' && pend[0].t === 'AM' && pend[0].de === '2026-11-17|AM' && pend[0].num === CLI && !pend[0].est && /^c1@/.test(pend[0].k), pend);
    const f = S.hoja().find(x => x[3] === '📅 Pidió otro día');
    chk('4b la fila «📅 Pidió otro día»: «Pidió otro día: miércoles 18/11 por la mañana (tenía: martes 17/11 por la mañana)», con el wamid', f && f[1] === 'c1' && f[7] === '📅 eligió' && f[8] === 'wamid.toque1' &&
        f[9] === 'Pidió otro día: miércoles 18/11 por la mañana (tenía: martes 17/11 por la mañana)', f);
    const T = textos(S, CLI);
    chk('4c al cliente: «Listo ✅ Le pedimos a logística pasar tu entrega al *miércoles 18/11 por la mañana*. Te confirmamos por acá 😊»', T.length === 1 &&
        T[0] === '🤖 _Asistente automático · Heaven Colchones_\n\nListo ✅ Le pedimos a logística pasar tu entrega al *miércoles 18/11 por la mañana*. Te confirmamos por acá 😊', T);
    const L = S.salen();
    chk('4d a logística (Ernesto) la plantilla de siempre del cambio de entrega, con «Mover»', L.length === 1 && L[0].to === '59171000001' && L[0].pl === 'logistica_cambio_v2' && L[0].p[0] === 'OC 11-c1' && L[0].p[1] === 'JUAN C1' &&
        L[0].p[2] === 'el cliente pidió por el bot pasarla del martes 17/11 por la mañana al miércoles 18/11 por la mañana: si se puede, tocá «Mover» en el panel (pestaña Bot o la ficha del pedido)', L);
    chk('4e …anotado «📅 Otro día → Logística» y «📅 Otro día → cliente»', S.hoja().some(x => x[3] === '📅 Otro día → Logística' && x[7] === '✅ enviado') && S.hoja().some(x => x[3] === '📅 Otro día → cliente' && x[7] === '✅ enviado'));
    chk('4f la fila del pedido NO cambió: nada se mueve solo', fila(S, 'c1') === antes);
    const R = S.post({ action: 'waRespuestas' });
    chk('4g waRespuestas trae `rd` con el pedido de cambio (y no lo muestra como un mensaje más del cliente)', R.ok && R.rd.length === 1 && R.rd[0].id === 'c1' && R.rd[0].f === '2026-11-18' && R.rd[0].t === 'AM' && R.rd[0].de === '2026-11-17|AM' &&
        !R.resp.some(x => /Pidió otro día|Mié 18/.test(x.txt)), R.rd);
    S.limpiar(); hook(S, CLI, toque('rd|c1|2026-11-18|AM', 'Mié 18 · mañana'), 'wamid.toque1');
    chk('4h Meta manda el mismo toque dos veces (mismo wamid): nada nuevo', S.meta.llamadas.length === 0 && S.hoja().filter(x => x[3] === '📅 Pidió otro día').length === 1);
    S.limpiar(); hook(S, CLI, toque('rd|c1|2026-11-18|AM', 'Mié 18 · mañana'));
    chk('4i lo toca otra vez: «Ya se lo pedimos…», logística no recibe otro y sigue UNO', /Ya se lo pedimos a logística: pasar tu entrega al \*miércoles 18\/11 por la mañana\*/.test(textos(S, CLI)[0] || '') && S.salen().length === 0 &&
        JSON.parse(S.P.RD_PEND).filter(x => !x.est).length === 1, { t: textos(S), p: S.P.RD_PEND });
    S.limpiar(); hook(S, CLI, toque('rd|c1|2026-11-18|PM', 'Mié 18 · tarde'));
    const p2 = JSON.parse(S.P.RD_PEND).filter(x => !x.est);
    chk('4j elige OTRO de los días ofrecidos: reemplaza al de antes (sigue uno, ahora a la tarde) y logística se entera', p2.length === 1 && p2[0].t === 'PM' && S.salen().length === 1 && /miércoles 18\/11 por la tarde/.test(S.salen()[0].p[2]), p2);
    S.limpiar(); hook(S, CLI, toque('rd|c1|2026-11-20|AM', 'Vie 20 · mañana'));
    chk('4k un día que NO se le ofreció: «⚠️ no se anotó», «Ese día ya no se puede elegir desde acá» con su vendedora, sin logística',
        /^— no se anotó: ese día no se le ofreció/.test((S.hoja().filter(x => x[3] === '📅 Pidió otro día').pop() || [])[12]) &&
        /Ese día ya no se puede elegir desde acá 🙏 Escribile a Carola 👉 https:\/\/wa\.me\/59170000001/.test(textos(S, CLI)[0] || '') && S.salen().length === 0 && JSON.parse(S.P.RD_PEND).filter(x => !x.est).length === 1, textos(S));
    S.limpiar(); hook(S, '59170000099', toque('rd|c1|2026-11-18|AM', 'Mié 18 · mañana'));
    chk('4l el mismo botón desde OTRO número: no se anota', /el pedido es de otro número/.test((S.hoja().filter(x => x[3] === '📅 Pidió otro día').pop() || [])[12]) && S.salen().length === 0, S.hoja().slice(-2));
    chk('4m el candado: corto, solo para anotar (lo pidió el toque)', S.candado.pedidos > 0, S.candado.pedidos);
  });

  seccion('4b. El botón vence, el pedido cambió mientras tanto, y la plantilla vieja de respaldo', () => {
    let S = armar(); conClaude(S, {});
    escribe(S, 'no voy a estar');
    pasarSeg(73 * 3600); S.limpiar();
    hook(S, CLI, toque('rd|c1|2026-11-18|AM'));
    chk('4n a las 73 h el botón ya venció: no se anota', !(JSON.parse(S.P.RD_PEND || '[]').length) && S.hoja().some(x => /el botón ya venció/.test(String(x[12] || ''))) && S.salen().length === 0, S.hoja().slice(-2).map(x => x[12]));
    S = armar(); conClaude(S, {});
    escribe(S, 'no voy a estar');
    const r = S.lista().find(x => x.id === 'c1'); r.fecha = '2026-11-19'; r.turno = 'PM';
    const i = S.sh._datos.findIndex(f => f[0] === 'c1'); S.sh._datos[i] = S.ctx.recToRow(r);
    S.limpiar(); hook(S, CLI, toque('rd|c1|2026-11-18|AM'));
    chk('4o la vendedora lo movió mientras tanto: no se anota (el pedido cambió de día)', !(JSON.parse(S.P.RD_PEND || '[]').length) && S.hoja().some(x => /cambió de día después/.test(String(x[12] || ''))) && S.salen().length === 0, S.hoja().slice(-2).map(x => x[12]));
    S = armar(); conClaude(S, {});
    escribe(S, 'no voy a estar');
    S.limpiar(); S.meta.responder = (b) => (b && b.template && b.template.name === 'logistica_cambio_v2') ? { code: 404, body: { error: { code: 132001, message: 'Template name does not exist' } } } : null;
    hook(S, CLI, toque('rd|c1|2026-11-19|AM'));
    const L = S.salen().filter(x => x.pl === 'logistica_cambio');
    chk('4p sin la v2 aprobada: la de antes («logistica_cambio», 3 datos), como el resto del bot', L.length === 1 && L[0].p.length === 3 && /jueves 19\/11 por la mañana/.test(L[0].p[2]), S.salen());
  });

  seccion('5. El panel: Mover / No, dejarlo / Quitar (rdMarcar) y lo que vuelve en waRespuestas', () => {
    const S = armar(); conClaude(S, {});
    escribe(S, 'no voy a estar');
    hook(S, CLI, toque('rd|c1|2026-11-18|AM'));
    const k = S.post({ action: 'waRespuestas' }).rd[0].k;
    chk('5a sin `k` o con un `est` que no es: «no id»', S.post({ action: 'rdMarcar', est: 'hecho' }).error === 'no id' && S.post({ action: 'rdMarcar', k, est: 'borrar' }).error === 'no id');
    chk('5b uno que no existe: «no está»', S.post({ action: 'rdMarcar', k: 'otro@1', est: 'hecho' }).error === 'no está');
    const antes = fila(S, 'c1');
    const r = S.post({ action: 'rdMarcar', k, est: 'hecho', quien: 'Ernesto' });
    chk('5c «Mover» (hecho): ok, y waRespuestas ya no lo trae', r.ok && r.est === 'hecho' && S.post({ action: 'waRespuestas' }).rd.length === 0, r);
    const x = JSON.parse(S.P.RD_PEND)[0];
    chk('5d queda quién y cuándo, y la hoja lo dice («📅 Otro día: lo movieron», Ernesto)', x.est === 'hecho' && x.por === 'Ernesto' && x.at === RELOJ.ms && S.hoja().some(f => f[3] === '📅 Otro día: lo movieron' && f[4] === 'Ernesto'), x);
    chk('5e rdMarcar tampoco toca la fila del pedido (lo mueve el panel, con su 📅 Reprogramar)', fila(S, 'c1') === antes);
    chk('5f otro aparato marca el mismo: ok «ya» (no lo pisa)', (() => { const y = S.post({ action: 'rdMarcar', k, est: 'no', quien: 'David' }); return y.ok && y.ya && JSON.parse(S.P.RD_PEND)[0].est === 'hecho'; })());
    const S2 = armar(); conClaude(S2, {});
    escribe(S2, 'no voy a estar'); hook(S2, CLI, toque('rd|c1|2026-11-18|AM'));
    const k2 = S2.post({ action: 'waRespuestas' }).rd[0].k;
    const n = S2.post({ action: 'rdMarcar', k: k2, est: 'no', quien: 'Ernesto' });
    chk('5g «No, dejarlo»: queda «no» y sale de la lista', n.ok && JSON.parse(S2.P.RD_PEND)[0].est === 'no' && S2.post({ action: 'waRespuestas' }).rd.length === 0 && S2.hoja().some(f => f[3] === '📅 Otro día: quedó como estaba'));
    chk('5h un servidor sin pedidos de cambio: `rd` = []', JSON.stringify(armar().post({ action: 'waRespuestas' }).rd) === '[]');
    const S3 = armar();
    S3.P.RD_PEND = JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ k: 'x' + i + '@1', id: 'x' + i, oc: '11-' + i, cli: 'CLIENTE ' + i, f: '2026-11-18', t: 'AM', de: '2026-11-17|AM', ts: RELOJ.ms - (40 - i) * 1000, num: '5917000' + (1000 + i), est: i < 20 ? 'hecho' : '' })));
    S3.ctx.rdPendGuardar_(S3.ctx.rdPendLeer_());
    const a3 = JSON.parse(S3.P.RD_PEND);
    chk('5i el tope (30 y 8.500 letras): primero se van los ya resueltos, los pendientes quedan', a3.length <= 30 && S3.P.RD_PEND.length <= 8500 && a3.filter(x => !x.est).length === 20, { n: a3.length, largo: S3.P.RD_PEND.length });
  });

  seccion('6. Meta no toma los botones: la respuesta igual llega (texto); una respuesta larga: texto y después los botones', () => {
    let S = armar(); conClaude(S, {});
    S.meta.responder = (b) => (b && b.type === 'interactive') ? { code: 400, body: { error: { code: 131009, message: 'Parameter value is not valid' } } } : null;
    escribe(S, 'no voy a estar');
    chk('6a botones rechazados: la respuesta de Claude como texto, y no se anota como ofrecido', textos(S, CLI).length === 1 && textos(S, CLI)[0] === '🤖 _Asistente automático · Heaven Colchones_\n\n' + RESP_NO && !JSON.parse(S.P.RD_OFRECE || '{}').c1 &&
        S.hoja().some(f => f[3] === '🤖 Respuesta IA' && f[6] === '(texto)' && f[7] === '✅ enviado'), textos(S));
    S = armar(); const largo = 'Hola Juan. ' + 'Te cuento todo con detalle. '.repeat(40);
    conClaude(S, { respuesta: largo });
    escribe(S, 'no voy a estar');
    const ord = S.meta.llamadas.filter(c => c.body && c.body.to === CLI).map(c => c.body.type);
    chk('6b respuesta de más de 1.024 letras: primero el texto, después la pregunta con los botones', JSON.stringify(ord) === '["text","interactive"]' && inter(S, CLI)[0].interactive.body.text === S.ctx.RD_PREGUNTA && !!JSON.parse(S.P.RD_OFRECE || '{}').c1, ord);
  });

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
