/* 💵✅ SERVIDOR 2026-11-07-f: «YA LO RECIBÍ» — CONTABILIDAD ANOTA POR WHATSAPP LA PLATA QUE LE ENTREGA UN CHOFER (el dueño, 08/11: «Si así
   está bien / No, sólo para contabilidad / Sí, es el [número de WA_CONTABILIDAD]»).
     1. La plantilla `efectivo_del_dia_boton` (5 datos, el botón «Ya lo recibí»), el tipo `efc` con la de antes de respaldo, el envío de las
        18:00 con «er|<día>» y, si Meta no la tiene aprobada, la de antes SIN botón.
     2. Tocar el botón → «¿De quién?» con lo que cada chofer tiene SIN RECOGER (la misma cuenta del mensaje), con botones (≤ 2) o lista (≥ 3).
     3. Elegir → el retiro en la planilla: la fila de `filaDeRetiro` de la página (entrega el chofer, retira Contabilidad, FACTURADO, el monto,
        sus cobros TILDADOS, la hora de ahora) y la página lo lee y lo empareja: ese chofer queda en 0 en el Cuadre.
     4. DESHACER (15 min, con el sello), otro monto («Ysrael 500» → ¿Anoto? → sí), «no», «recibí de…», el nombre solo, más de lo que tiene,
        «hola», «gracias», un audio, la lista que venció, dos toques seguidos, Meta repetido, el candado ocupado, Meta sin botones.
     5. Lo de los demás no entra: un cliente, el dueño (sus preguntas), el número de prueba con sus palabras; el bot apagado.
     6. probarAntesDeImplementar / estadoBotWhatsApp.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia. Meta de mentira.
   Se corre:  node tests/test_wa_er.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otra versión) */
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

/* ── Los datos ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const V = (id, vend, mp, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + id.toUpperCase(), fecha: '2026-11-10', turno: 'AM',
  celular: '70000000', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, precio: 3000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: mp, observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '9' + id.replace(/\D/g, ''),
  ts: TS('2026-11-02'), nroDia: 0, fotos: [], rev: 1 }, o || {});
const CONTA = '59177000008', DUENO = '59177000007', CLIENTE = '59170111222', PRUEBA = '59170000099';
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', KOMMO_TOKEN: '',
  WA_HOOK_KEY: 'clave-hook', WA_DUENO: 'Eduardo:' + DUENO, WA_CONTABILIDAD: 'Contabilidad:' + CONTA };
/* Luis Pierre: 1.000 (04/11) + 860 (05/11) = 1.860 · Ysrael: 910 (06/11) · lo de octubre está cerrado · lo de una vendedora no es de un chofer. */
const FIX = [
  V('l1', 'Carola Chavez', '~Efectivo 1000 @2026-11-04 #7001 >Luis Pierre', { ts: TS('2026-11-04', '09:00') }),
  V('l2', 'Maria Flores', '~Efectivo 860 @2026-11-05 #7002 >Luis Pierre', { ts: TS('2026-11-05', '09:00') }),
  V('y1', 'Mauricio Merida', '~Efectivo 910 @2026-11-06 #7003 >Ysrael', { ts: TS('2026-11-06', '09:00') }),
  V('v1', 'Isabel Robledo', '~Efectivo 500 @2026-11-05 #7004', { ts: TS('2026-11-05', '10:00') }),
  V('o1', 'Carola Chavez', '~Efectivo 777 @2026-10-20 #7005 >Luis Pierre', { ts: TS('2026-10-20'), fecha: '2026-10-22' })
];
const FER = V('f1', 'Jonathan Monje', '~Efectivo 2400 @2026-11-06 #7006 >Fernando', { ts: TS('2026-11-06', '10:00') });
let nW = 0;
const hook = (S, from, msg, id) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: 'Quien' } }],
           messages: [Object.assign({ id: id || ('wamid.in' + (++nW)), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const txt = (body) => ({ type: 'text', text: { body } });
const boton = () => ({ type: 'button', button: { payload: 'er|2026-11-06', text: 'Ya lo recibí' } });
const toca = (id, title) => ({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id, title: title || id } } });
const fila = (id, title) => ({ type: 'interactive', interactive: { type: 'list_reply', list_reply: { id, title: title || id } } });
/* Toca un botón (o una fila de la lista) del ÚLTIMO mensaje con botones que le mandó el bot a ese número: `cual` = su lugar (0, 1…) o
   qué es ('t' = Los dos/Todos, 'si', 'no'). Los botones llevan `er:<qué>:<id de la pregunta>` (revisión del 08/11, B1). */
const ultInter = (S, to) => { const L = S.meta.llamadas.filter(c => c.body && c.body.type === 'interactive' && c.body.to === to); return L[L.length - 1] || null; };
const opciones = (c) => c.body.interactive.type === 'button' ? c.body.interactive.action.buttons.map(b => b.reply) : c.body.interactive.action.sections[0].rows;
const tocarDe = (c, cual) => {
  const it = typeof cual === 'number' ? opciones(c)[cual] : opciones(c).find(x => x.id.indexOf('er:' + cual + ':') === 0);
  return c.body.interactive.type === 'button' ? toca(it.id, it.title) : fila(it.id, it.title);
};
const tocar = (S, to, cual) => tocarDe(ultInter(S, to), cual);
const enviados = (S, to) => S.meta.llamadas.filter(c => c.body && !c.body.template && !c.body.name && (!to || c.body.to === to));
const ultimo = (S, to) => { const L = enviados(S, to); return L[L.length - 1] || null; };
const cuerpo = (c) => !c ? '' : (c.body.type === 'text' ? c.body.text.body : c.body.interactive.body.text);
const retiros = (S) => S.lista().filter(p => /^__ret_/.test(p.id));
const arma = (props, op) => { const S = servidor(Object.assign({}, ON, props || {}), op); S.cargar(FIX); return S; };

(async () => {
  poner('2026-11-06 18:10');

  seccion('1. La plantilla, el tipo y el envío de las 18:00', () => {
    const S = arma();
    const pl = Array.from(S.ctx.WA_PLANTILLAS).find(x => x.n === 'efectivo_del_dia_boton');
    chk('1a efectivo_del_dia_boton: 5 datos, 5 ejemplos y el botón «Ya lo recibí» (≤ 25 letras)', pl && (pl.t.match(/\{\{\d\}\}/g) || []).length === 5 && pl.e.length === 5 &&
        JSON.stringify(pl.bt) === '["Ya lo recibí"]' && [...pl.bt[0]].length <= 25, pl);
    const T = S.ctx.WA_TIPOS.efc;
    chk('1b el tipo `efc` usa la del botón y, sin aprobar, la de antes (efectivo_del_dia, 5 datos)', T.plantilla === 'efectivo_del_dia_boton' && T.vieja === 'efectivo_del_dia' && T.nv === 5, T);
    poner('2026-11-06 18:05'); S.repaso();
    const a = S.meta.llamadas.filter(c => c.body && c.body.template && c.body.to === CONTA);
    chk('1c a las 18:05 a Contabilidad sale con el botón: «er|2026-11-06»', a.length === 1 && a[0].body.template.name === 'efectivo_del_dia_boton' &&
        a[0].body.template.components[1].type === 'button' && a[0].body.template.components[1].parameters[0].payload === 'er|2026-11-06', a.map(c => c.body.template));
    chk('1d …con lo de los choferes (Luis Pierre 1.860 + Ysrael 910 = Bs 2.770 de 2 choferes)', a[0] && a[0].body.template.components[0].parameters[3].text === 'Bs 2.770 de 2 choferes', a[0] && a[0].body.template.components[0].parameters.map(x => x.text));
    const S2 = arma(); S2.meta.responder = (b) => (b.template && b.template.name === 'efectivo_del_dia_boton') ? { code: 404, body: { error: { code: 132001, message: 'Template name does not exist in the translation' } } } : null;
    poner('2026-11-06 18:05'); S2.repaso();
    const b = S2.meta.llamadas.filter(c => c.body && c.body.template && c.body.to === CONTA).map(c => ({ n: c.body.template.name, k: c.body.template.components.length }));
    chk('1e si Meta todavía no la aprobó, sale la de antes (efectivo_del_dia) SIN botón', b.length === 2 && b[1].n === 'efectivo_del_dia' && b[1].k === 1, b);
    poner('2026-11-06 18:10');
  });

  seccion('2. Tocar «Ya lo recibí» → ¿de quién?', () => {
    const S = arma();
    hook(S, CONTA, boton());
    const c = ultimo(S, CONTA), I = c && c.body.interactive;
    const k0 = c && I.action.buttons[0].reply.id.split(':')[2];
    chk('2a contesta con botones (2 choferes): «Luis Pierre 1.860», «Ysrael 910» y «Los dos», cada uno con el id de ESTA pregunta', c && c.body.type === 'interactive' && I.type === 'button' &&
        JSON.stringify(I.action.buttons.map(x => [x.reply.id, x.reply.title])) === JSON.stringify([['er:0:' + k0, 'Luis Pierre 1.860'], ['er:1:' + k0, 'Ysrael 910'], ['er:t:' + k0, 'Los dos']]) && /^[a-z0-9]{4,}$/.test(k0), I);
    chk('2b el texto dice cuántos cobros y desde cuándo (sin la vendedora ni lo de octubre)', /1\. \*Luis Pierre\* Bs 1\.860 \(2 cobros, desde el 04\/11\)/.test(cuerpo(c)) && /2\. \*Ysrael\* Bs 910 \(1 cobro, desde el 06\/11\)/.test(cuerpo(c)) &&
        !/Isabel|777/.test(cuerpo(c)) && cuerpo(c).length <= 1024, cuerpo(c));
    chk('2c todavía no carga nada', retiros(S).length === 0);
    const H = S.hoja();
    chk('2d lo que tocó queda en «Bot WhatsApp» con su wamid (Meta a veces avisa dos veces)', H.some(f => /Contabilidad: inicio/.test(f[3]) && /^wamid\.in/.test(f[8])) && H.some(f => /Contabilidad: respuesta/.test(f[3]) && f[6] === '(botones)' && /enviado/.test(f[7])), H);
    chk('2e los botones van con títulos de 20 letras como mucho', I.action.buttons.every(x => [...x.reply.title].length <= 20));
  });

  seccion('3. Elegir → el retiro en la planilla, como lo carga la página', () => {
    const S = arma();
    hook(S, CONTA, boton()); const t0 = tocar(S, CONTA, 0); S.limpiar();
    const antes = S.candado.pedidos;
    hook(S, CONTA, t0);
    const R = retiros(S);
    chk('3a un retiro: entrega Luis Pierre, retira Contabilidad, Bs 1.860, FACTURADO, la hora de ahora', R.length === 1 && R[0].vendedor === 'Luis Pierre' && R[0].chofer === 'Contabilidad' &&
        R[0].acuenta === 1860 && R[0].zona === 'FACTURADO' && R[0].ts === RELOJ.ms && R[0].fecha === '' && R[0].cliente === '💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR' &&
        R[0].direccion === 'Retiro del 06/11/2026' && /^__ret_.+__$/.test(R[0].id), R[0]);
    chk('3b con sus dos cobros TILDADOS (la regla del efectivo los toma primero)', R[0] && R[0].garantia === 'efe:l1|2026-11-04|1000;l2|2026-11-05|860', R[0] && R[0].garantia);
    chk('3b2 (C2/C3) con los N° de nota de venta y de recibo de esos cobros en «Nota» (el aviso de repetido de la página y ✏️ Corregir los necesitan)', R[0] && R[0].nota === '91, 7001, 92, 7002', R[0] && R[0].nota);
    chk('3c dice quién lo cargó', R[0] && /Lo cargó el bot: Contabilidad tocó «Ya lo recibí» por WhatsApp el 06\/11 18:10/.test(R[0].observaciones), R[0] && R[0].observaciones);
    chk('3d lo guardó con el candado del panel', S.candado.pedidos > antes);
    const t = cuerpo(ultimo(S, CONTA));
    chk('3e contesta «Anoté…» con los cobros y hasta cuándo se deshace', /✅ Anoté en el panel: \*Luis Pierre\* le entregó \*Bs 1\.860\* a Contabilidad\. Es todo lo que tenía sin recoger \(2 cobros: OC 11-l1, OC 11-l2\)/.test(t) &&
        /DESHACER\* \(hasta las 18:25\)/.test(t), t);
    const P2 = S.ctx.waErPend_(S.lista(), '2026-11-06');
    chk('3f ahora solo Ysrael tiene efectivo sin recoger (la cuenta del mensaje)', P2.length === 1 && P2[0].nombre === 'Ysrael' && P2[0].bs === 910, P2.map(o => [o.nombre, o.bs]));
    const E = S.ctx.waEfeDe_(S.ctx.waEfeResumen_(S.lista(), '2026-11-06', '2026-11-06', '2026-11-06'), true);
    chk('3g …y el mensaje de las 9:00 de mañana ya no lo nombra con plata sin recoger', !E.some(o => o.nombre === 'Luis Pierre' && o.bs > 0.005), E.map(o => [o.nombre, o.bs]));
    globalThis.LISTA_TRAS_LUIS = S.lista();
  });

  seccion('4. DESHACER', () => {
    const S = arma();
    hook(S, CONTA, boton()); hook(S, CONTA, tocar(S, CONTA, 0));
    const idL = retiros(S)[0].id;
    poner('2026-11-06 18:20');
    hook(S, CONTA, txt('Deshacer'));
    chk('4a borra el retiro que cargó el bot', retiros(S).length === 0, retiros(S));
    chk('4b …y lo dice', /↩️ Borré del panel el retiro de \*Luis Pierre\* \(Bs 1\.860\)/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    chk('4c el borrado queda anotado como cualquier borrado (las otras computadoras lo sacan de su copia)', String(S.P.BORRADOS_RECIENTES || '').indexOf(idL) >= 0, S.P.BORRADOS_RECIENTES);
    hook(S, CONTA, txt('deshacer'));
    chk('4d un segundo DESHACER no tiene nada que deshacer', /No tengo nada reciente para deshacer/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    poner('2026-11-06 18:10');
    const S2 = arma(); hook(S2, CONTA, boton()); hook(S2, CONTA, tocar(S2, CONTA, 0));
    poner('2026-11-06 18:26'); hook(S2, CONTA, txt('deshacer'));
    chk('4e pasados los 15 minutos ya no deshace (se borra desde el panel)', retiros(S2).length === 1 && /No tengo nada reciente/.test(cuerpo(ultimo(S2, CONTA))), cuerpo(ultimo(S2, CONTA)));
    poner('2026-11-06 18:10');
    const S3 = arma(); hook(S3, CONTA, boton()); hook(S3, CONTA, tocar(S3, CONTA, 0));
    const i = S3.sh._datos.findIndex(f => /^__ret_/.test(f[0])); S3.sh._datos[i][29] = 999;   // alguien lo corrigió en el panel (otro sello)
    hook(S3, CONTA, txt('deshacer'));
    chk('4f si alguien lo corrigió en el panel, NO lo borra y lo dice', retiros(S3).length === 1 && /lo corrigieron en el panel después: no lo borré/.test(cuerpo(ultimo(S3, CONTA))), cuerpo(ultimo(S3, CONTA)));
    const S4 = arma(); hook(S4, CONTA, txt('Luis Pierre 1860')); hook(S4, CONTA, txt('Ysrael 910')); hook(S4, CONTA, txt('deshacer'));
    chk('4g deshace solo lo último (Ysrael); lo de antes (Luis Pierre) sigue', retiros(S4).length === 1 && retiros(S4)[0].vendedor === 'Luis Pierre', retiros(S4).map(r => r.vendedor));
  });

  seccion('5. Otro monto, «no», «recibí de…», el nombre solo, más de lo que tiene', () => {
    const S = arma();
    hook(S, CONTA, txt('Ysrael 500'));
    let c = ultimo(S, CONTA);
    chk('5a «Ysrael 500» pregunta antes, con «le quedarían Bs 410»', c && c.body.type === 'interactive' && /^er:si:[a-z0-9]+,er:no:[a-z0-9]+$/.test(c.body.interactive.action.buttons.map(x => x.reply.id).join(',')) &&
        /¿Anoto que \*Ysrael\* te entregó \*Bs 500\*\? En el panel tiene Bs 910 sin recoger: le quedarían \*Bs 410\*/.test(cuerpo(c)) && retiros(S).length === 0, cuerpo(c));
    hook(S, CONTA, tocar(S, CONTA, 'si'));
    let R = retiros(S);
    chk('5b «Sí» → el retiro de Bs 500 con su cobro tildado (C1: del más viejo al más nuevo hasta el monto)', R.length === 1 && R[0].vendedor === 'Ysrael' && R[0].acuenta === 500 && R[0].garantia === 'efe:y1|2026-11-06|910' &&
        /Otro monto: se tildaron sus cobros más viejos hasta Bs 500/.test(R[0].observaciones) && R[0].nota === '91, 7003', R[0]);
    chk('5c …y dice cuánto le queda', /Le quedan \*Bs 410\* sin recoger/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    const P = S.ctx.waErPend_(S.lista(), '2026-11-06');
    chk('5d la regla le deja Bs 410 sin recoger', P.find(o => o.nombre === 'Ysrael').bs === 410, P.map(o => [o.nombre, o.bs]));
    hook(S, CONTA, txt('luis 300')); hook(S, CONTA, txt('no'));
    chk('5e «Luis 300» y después «no»: no anota nada', retiros(S).length === 1 && /Listo, no anoté nada/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    hook(S, CONTA, txt('Ysrael 5000'));
    chk('5f más de lo que tiene: no lo anota y explica', retiros(S).length === 1 && /\*Ysrael\* tiene Bs 410 sin recoger en el panel: no puedo anotar Bs 5\.000/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    hook(S, CONTA, txt('Ysrael'));
    c = ultimo(S, CONTA);
    chk('5g el nombre solo, de la nada, pregunta antes («todo lo que tiene»)', retiros(S).length === 1 && c.body.type === 'interactive' && /¿Anoto que \*Ysrael\* te entregó \*Bs 410\*\? Es todo lo que tiene/.test(cuerpo(c)), cuerpo(c));
    hook(S, CONTA, txt('sí'));
    chk('5h «sí» escrito también vale', retiros(S).length === 2 && retiros(S)[1].acuenta === 410 && /^efe:y1\|2026-11-06\|910$/.test(retiros(S)[1].garantia), retiros(S).map(r => [r.vendedor, r.acuenta, r.garantia]));
    hook(S, CONTA, txt('Recibí de Luis Pierre'));
    R = retiros(S);
    chk('5i «Recibí de Luis Pierre» lo anota directo (todo lo que tiene)', R.length === 3 && R[2].vendedor === 'Luis Pierre' && R[2].acuenta === 1860, R.map(r => [r.vendedor, r.acuenta]));
    hook(S, CONTA, txt('recibí'));
    chk('5j sin nada pendiente: «No hay efectivo de choferes sin recoger»', /No hay efectivo de choferes sin recoger en el panel/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    const S2 = arma(); hook(S2, CONTA, txt('Pedro 300'));
    chk('5k un nombre que no es de ningún chofer con plata: lo dice y muestra la lista', retiros(S2).length === 0 && /No encuentro a «pedro»/.test(cuerpo(ultimo(S2, CONTA))) && ultimo(S2, CONTA).body.type === 'interactive', cuerpo(ultimo(S2, CONTA)));
    const S3 = arma(); hook(S3, CONTA, txt('recibí')); hook(S3, CONTA, txt('2'));
    chk('5l contestando la lista con el número (2 = Ysrael) también anota', retiros(S3).length === 1 && retiros(S3)[0].vendedor === 'Ysrael' && retiros(S3)[0].acuenta === 910, retiros(S3).map(r => [r.vendedor, r.acuenta]));
    const S4 = arma(); hook(S4, CONTA, boton()); hook(S4, CONTA, tocar(S4, CONTA, 't'));
    chk('5m «Los dos» carga un retiro por chofer', retiros(S4).length === 2 && retiros(S4).map(r => r.vendedor + ' ' + r.acuenta).sort().join(', ') === 'Luis Pierre 1860, Ysrael 910', retiros(S4).map(r => [r.vendedor, r.acuenta]));
  });

  seccion('6. Lo que no es un retiro', () => {
    const S = arma();
    hook(S, CONTA, txt('Hola, buenas tardes'));
    chk('6a «hola» → la ayuda (Contabilidad no es un cliente: ni Claude ni la respuesta automática)', /Este número es del bot del panel/.test(cuerpo(ultimo(S, CONTA))) && S.claude.llamadas.length === 0 && retiros(S).length === 0, cuerpo(ultimo(S, CONTA)));
    const n = enviados(S, CONTA).length;
    hook(S, CONTA, txt('gracias'));
    chk('6b «gracias» no se contesta (pero queda anotado)', enviados(S, CONTA).length === n && S.hoja().some(f => /Contabilidad: nada/.test(f[3])), S.hoja().slice(-1));
    hook(S, CONTA, { type: 'audio', audio: { id: 'a1' } });
    chk('6c un audio → «no puedo escuchar audios» + la ayuda', /no puedo escuchar audios/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    hook(S, CONTA, txt('ok'));
    chk('6d un «ok» suelto (sin pregunta del bot) no anota ni contesta', enviados(S, CONTA).length === n + 1 && retiros(S).length === 0);
    const S2 = arma(); hook(S2, CONTA, boton()); poner('2026-11-06 19:20'); hook(S2, CONTA, tocar(S2, CONTA, 0));
    chk('6e la lista venció (más de 60 min): no carga y manda la de ahora', retiros(S2).length === 0 && /Ese botón es de una lista anterior: te mando la de ahora/.test(cuerpo(ultimo(S2, CONTA))) && ultimo(S2, CONTA).body.type === 'interactive', cuerpo(ultimo(S2, CONTA)));
    poner('2026-11-06 18:10');
    const S3 = arma(); hook(S3, CONTA, boton()); const t3 = tocar(S3, CONTA, 0); hook(S3, CONTA, t3, 'wamid.dos'); hook(S3, CONTA, t3, 'wamid.dos');
    chk('6f Meta avisa dos veces el mismo toque: un solo retiro', retiros(S3).length === 1, retiros(S3).length);
    const S4 = arma(); hook(S4, CONTA, boton()); hook(S4, CONTA, txt('Luis Pierre')); hook(S4, CONTA, txt('Luis Pierre 1860'));
    chk('6g dos veces el mismo chofer: la segunda dice que ya lo anotó (un solo retiro)', retiros(S4).length === 1 && /✅ Ya anoté el retiro de \*Luis Pierre\* \(Bs 1\.860\) hace un momento/.test(cuerpo(ultimo(S4, CONTA))), cuerpo(ultimo(S4, CONTA)));
  });

  seccion('7. Botones, lista y respaldo en texto', () => {
    const S = arma(); S.cargar([FER]);
    hook(S, CONTA, boton());
    const c = ultimo(S, CONTA), I = c.body.interactive;
    chk('7a con 3 choferes va una LISTA (Fernando, Luis Pierre, Ysrael y «Todos»), filas de 24 letras como mucho', I.type === 'list' && /^er:0:(\w+),er:1:\1,er:2:\1,er:t:\1$/.test(I.action.sections[0].rows.map(r => r.id).join(',')) &&
        I.action.sections[0].rows[0].title === 'Fernando 2.400' && I.action.sections[0].rows.every(r => [...r.title].length <= 24 && [...(r.description || '')].length <= 72) && [...I.action.button].length <= 20, I);
    hook(S, CONTA, tocar(S, CONTA, 't'));
    chk('7b «Todos» carga los tres', retiros(S).length === 3, retiros(S).map(r => [r.vendedor, r.acuenta]));
    const S2 = arma(); S2.meta.responder = (b) => b.type === 'interactive' ? { code: 400, body: { error: { code: 131009, message: 'Parameter value is not valid' } } } : null;
    hook(S2, CONTA, boton());
    const t = ultimo(S2, CONTA);
    chk('7c si Meta no acepta los botones, va en texto con «Escribí el número»', t.body.type === 'text' && /1\. \*Luis Pierre\*/.test(t.body.text.body) && /Escribí el número \(1, 2…\) o \*todos\*/.test(t.body.text.body), t.body);
    hook(S2, CONTA, txt('todos'));
    chk('7d …y «todos» escrito carga los dos', retiros(S2).length === 2, retiros(S2).length);
    const S3 = servidor(Object.assign({}, ON), { sinCandado: true }); S3.cargar(FIX);
    hook(S3, CONTA, boton()); hook(S3, CONTA, tocar(S3, CONTA, 1));
    chk('7e con el panel ocupado (candado): no anota y dice que pruebe en un minuto', retiros(S3).length === 0 && /El panel está ocupado guardando otra cosa/.test(cuerpo(ultimo(S3, CONTA))), cuerpo(ultimo(S3, CONTA)));
    const nombreLargo = V('n1', 'Carola Chavez', '~Efectivo 12345,50 @2026-11-06 #7009 >Cristhian Alejandro Gutierrez', { ts: TS('2026-11-06', '10:00') });
    const S4 = arma(); S4.cargar([nombreLargo]); hook(S4, CONTA, boton());
    const tit = ultimo(S4, CONTA).body.interactive.action.sections[0].rows.map(r => r.title);
    chk('7f un nombre largo se corta para que entre (con el monto entero)', tit.some(x => /…\s12\.345,50$/.test(x) && [...x].length <= 24), tit);
  });

  seccion('8. Lo de los demás no entra', () => {
    const S = arma();
    hook(S, CLIENTE, txt('recibí'));
    chk('8a un cliente que escribe «recibí» no carga nada ni ve botones', retiros(S).length === 0 && !enviados(S, CLIENTE).some(c => c.body.type === 'interactive'), enviados(S, CLIENTE).map(c => c.body));
    hook(S, DUENO, txt('recibí'));
    chk('8b el dueño tampoco (sus mensajes son preguntas al bot, la 25 C)', retiros(S).length === 0 && !enviados(S, DUENO).some(c => c.body.type === 'interactive'), enviados(S, DUENO).map(c => cuerpo(c)));
    hook(S, DUENO, toca('er:0:abc12'));
    chk('8c ni tocando un botón «er:0:…» que no le mandamos', retiros(S).length === 0);
    const P = servidor(Object.assign({}, ON, { WA_PRUEBA: PRUEBA })); P.cargar(FIX);
    hook(P, PRUEBA, txt('ventas'));
    chk('8d el número de prueba con sus palabras («ventas») sigue con las preguntas del dueño, no con esto', !/Este número es del bot del panel/.test(cuerpo(ultimo(P, PRUEBA))) && /Ventas cargadas|ventas/i.test(cuerpo(ultimo(P, PRUEBA))), cuerpo(ultimo(P, PRUEBA)));
    hook(P, PRUEBA, boton());
    chk('8e …y tocando «Ya lo recibí» (le llega con WA_PRUEBA) sí pregunta de quién', ultimo(P, PRUEBA).body.type === 'interactive', cuerpo(ultimo(P, PRUEBA)));
    hook(P, PRUEBA, tocar(P, PRUEBA, 1));
    chk('8f …y carga el retiro, diciendo que lo tocó el número de prueba', retiros(P).length === 1 && /El número de prueba tocó/.test(retiros(P)[0].observaciones), retiros(P).map(r => r.observaciones));
    const A = servidor(Object.assign({}, ON, { WA_ACTIVO: '0' })); A.cargar(FIX);
    hook(A, CONTA, boton()); hook(A, CONTA, txt('Ysrael 910'));
    chk('8g con el bot apagado no contesta ni carga (queda anotado)', retiros(A).length === 0 && enviados(A, CONTA).length === 0 && A.hoja().length >= 2, A.hoja().length);
  });

  seccion('9. probar y estado', () => {
    const S = arma();
    const pr = S.ctx.probarAntesDeImplementar();
    const L = (pr && (pr.lineas || pr.bien || [])).concat ? (pr.lineas || []).concat(pr.bien || []) : [];
    const todo = JSON.stringify(pr);
    chk('9a probarAntesDeImplementar dice lo del botón «Ya lo recibí» a Contabilidad', /Ya lo recibí/.test(todo) && /carga el retiro en el panel/.test(todo), todo.slice(0, 300));
    hook(S, CONTA, boton());
    const est = S.ctx.estadoBotWhatsApp();
    chk('9b estadoBotWhatsApp: a quién (Contabilidad) y cuántos esperan respuesta', JSON.stringify(est.contabilidad) === '["Contabilidad"]' && est.yaLoRecibiEsperando === 1, [est.contabilidad, est.yaLoRecibiEsperando]);
  });

  seccion('11. La revisión del 08/11 (súper revisor): lo que cargaba mal', () => {
    /* B1: un botón de una lista VIEJA no carga a otro chofer */
    let S = arma(); S.cargar([FER]);
    hook(S, CONTA, boton()); const lista1 = ultInter(S, CONTA);
    hook(S, CONTA, tocarDe(lista1, 0));                                   // Fernando (el de más plata) → cargado
    hook(S, CONTA, tocarDe(lista1, 1));                                   // «Luis Pierre» de la lista 1: ya no es la pregunta abierta
    chk('11a (B1) un botón de una lista ya contestada no carga nada y manda la de ahora', retiros(S).length === 1 && retiros(S)[0].vendedor === 'Fernando' &&
        /Ese botón es de una lista anterior: te mando la de ahora/.test(cuerpo(ultimo(S, CONTA))), retiros(S).map(r => r.vendedor));
    hook(S, CONTA, tocarDe(lista1, 1));                                   // otra vez la lista 1, con la lista 2 abierta (Luis = er:0 ahí)
    chk('11b (B1) …ni con otra lista abierta en la que ese número es OTRO chofer', retiros(S).length === 1, retiros(S).map(r => r.vendedor));
    S = arma(); hook(S, CONTA, txt('Ysrael 500')); const conf1 = ultInter(S, CONTA); hook(S, CONTA, txt('Luis 300'));
    hook(S, CONTA, tocarDe(conf1, 'si'));
    chk('11c (B1) el «Sí» de una pregunta anterior no anota lo de la pregunta nueva', retiros(S).length === 0, retiros(S).map(r => [r.vendedor, r.acuenta]));
    hook(S, CONTA, txt('Luis 300')); hook(S, CONTA, tocar(S, CONTA, 'si'));
    chk('11d …y el de la pregunta de ahora sí', retiros(S).length === 1 && retiros(S)[0].vendedor === 'Luis Pierre' && retiros(S)[0].acuenta === 300, retiros(S).map(r => [r.vendedor, r.acuenta]));
    /* B2: «Los dos» carga solo los de ESA lista, y uno vencido no carga nada */
    poner('2026-11-06 09:05');
    S = arma(); hook(S, CONTA, boton()); const losDos = tocar(S, CONTA, 't');
    S.cargar([FER]); poner('2026-11-06 09:30'); hook(S, CONTA, losDos);
    chk('11e (B2) «Los dos» carga a los dos de esa lista, no a Fernando (que entró después)', retiros(S).map(r => r.vendedor).sort().join(',') === 'Luis Pierre,Ysrael', retiros(S).map(r => r.vendedor));
    S = arma(); hook(S, CONTA, boton()); const losDos2 = tocar(S, CONTA, 't'); poner('2026-11-06 18:20'); hook(S, CONTA, losDos2);
    chk('11f (B2) «Los dos» del mensaje de la mañana a la tarde (vencido): no carga nada y manda la lista de ahora', retiros(S).length === 0 && /lista anterior/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    poner('2026-11-06 18:10');
    /* B3: dos avisos del mismo «Sí» a la vez (el segundo leyó WA_ER antes de que el primero guardara) */
    S = arma(); hook(S, CONTA, txt('Luis Pierre 1000')); const si3 = tocar(S, CONTA, 'si');
    const viejo = S.P.WA_ER, leerOrig = S.ctx.waErEstLeer_;
    hook(S, CONTA, si3, 'wamid.b3a');
    let unaVez = true; S.ctx.waErEstLeer_ = function () { if (unaVez) { unaVez = false; return JSON.parse(viejo); } return leerOrig(); };
    hook(S, CONTA, si3, 'wamid.b3b');
    S.ctx.waErEstLeer_ = leerOrig;
    chk('11g (B3) dos avisos del mismo «Sí» cargan UN retiro; el segundo dice que ya está', retiros(S).length === 1 && /Eso ya lo anoté \(llegó dos veces\)/.test(cuerpo(ultimo(S, CONTA))), [retiros(S).length, cuerpo(ultimo(S, CONTA))]);
    /* B4: un «ok» a la lista de un solo chofer no carga */
    S = arma(); hook(S, CONTA, txt('Luis Pierre 1860')); hook(S, CONTA, txt('efectivo')); hook(S, CONTA, txt('ok'));
    chk('11h (B4) «ok» a la lista («¿De quién?») no carga nada: pide tocar el nombre', retiros(S).length === 1 && /Tocá el nombre del chofer/.test(cuerpo(ultimo(S, CONTA))), [retiros(S).length, cuerpo(ultimo(S, CONTA))]);
    /* B6: «recibí 500» y después el chofer → pregunta con 500 */
    S = arma(); hook(S, CONTA, txt('recibí 500'));
    const l6 = ultInter(S, CONTA);
    chk('11i (B6) «recibí 500» pregunta de quién recibió Bs 500 (sin «Los dos»)', /¿De quién recibiste Bs 500\?/.test(cuerpo(l6)) && !opciones(l6).some(o => /^er:t:/.test(o.id)), cuerpo(l6));
    hook(S, CONTA, tocarDe(l6, 1));
    chk('11j …al tocar el chofer pregunta «¿Anoto Bs 500?» (no carga todo)', retiros(S).length === 0 && /¿Anoto que \*Ysrael\* te entregó \*Bs 500\*\?/.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    hook(S, CONTA, tocar(S, CONTA, 'si'));
    chk('11k …y con «Sí» anota Bs 500', retiros(S).length === 1 && retiros(S)[0].acuenta === 500, retiros(S).map(r => [r.vendedor, r.acuenta]));
    /* C1: «otro monto» con un cobro de octubre del mismo monto: va a noviembre, y lo que dice que queda es lo que queda */
    const OCT = V('o2', 'Carola Chavez', '~Efectivo 1000 @2026-10-25 #7008 >Luis Pierre', { ts: TS('2026-10-25'), fecha: '2026-10-27' });
    S = arma(); S.cargar([OCT]);
    hook(S, CONTA, txt('Luis Pierre 1000')); hook(S, CONTA, tocar(S, CONTA, 'si'));
    const P1 = S.ctx.waErPend_(S.lista(), '2026-11-06').find(o => o.nombre === 'Luis Pierre');
    const E1 = S.ctx.waEfeDe_(S.ctx.waEfeResumen_(S.lista(), '2026-11-06', '2026-11-06', '2026-11-06'), true).find(o => o.nombre === 'Luis Pierre');
    chk('11l (C1) «Luis Pierre 1000» con un cobro de octubre de Bs 1.000: el retiro tilda el de noviembre (04/11)', retiros(S)[0] && retiros(S)[0].garantia === 'efe:l1|2026-11-04|1000', retiros(S)[0] && retiros(S)[0].garantia);
    chk('11m (C1) …el bot dice «le quedan Bs 860» y es lo que queda en la cuenta y en el aviso de las 18:00', /Le quedan \*Bs 860\*/.test(cuerpo(ultimo(S, CONTA))) && P1 && P1.bs === 860 && E1 && E1.bs === 860, [cuerpo(ultimo(S, CONTA)), P1 && P1.bs, E1 && E1.bs]);
    S = arma(); hook(S, CONTA, txt('Luis Pierre 1200')); hook(S, CONTA, tocar(S, CONTA, 'si'));
    chk('11n (C1) un monto que cruza dos cobros tilda los dos (1.000 entero y 200 del de 860)', retiros(S)[0] && retiros(S)[0].garantia === 'efe:l1|2026-11-04|1000;l2|2026-11-05|860' &&
        S.ctx.waErPend_(S.lista(), '2026-11-06').find(o => o.nombre === 'Luis Pierre').bs === 660, retiros(S)[0] && retiros(S)[0].garantia);
    /* C4: Contabilidad también en WA_DUENO */
    S = arma({ WA_DUENO: 'Eduardo:' + DUENO + ', Contabilidad:' + CONTA });
    hook(S, CONTA, txt('ventas'));
    chk('11o (C4) un número que está en WA_CONTABILIDAD y en WA_DUENO: «ventas» sigue siendo una pregunta del dueño', !/Este número es del bot del panel/.test(cuerpo(ultimo(S, CONTA))) && /venta/i.test(cuerpo(ultimo(S, CONTA))), cuerpo(ultimo(S, CONTA)));
    hook(S, CONTA, boton()); hook(S, CONTA, tocar(S, CONTA, 0));
    chk('11p (C4) …y «Ya lo recibí» le anda igual', retiros(S).length === 1, retiros(S).length);
    const pr = JSON.stringify(S.ctx.probarAntesDeImplementar());
    chk('11q (C4) probarAntesDeImplementar avisa del cruce', /está en WA_CONTABILIDAD y también en WA_DUENO/.test(pr), pr.slice(0, 200));
  });

  /* 10. La página lee la fila que cargó el bot como un retiro suyo y la empareja: Luis Pierre en 0 en el Cuadre de noviembre. */
  console.log('\n── 10. La página: la fila del bot es un retiro como los del panel ──');
  try {
    const L = globalThis.LISTA_TRAS_LUIS;
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/La_Paz' });
    const page = await ctx.newPage(); const errores = [];
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-06T18:30:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.waitForTimeout(300);
    const out = await page.evaluate(async (L) => {
      CONNECTED = true; UNLOCKED = true; try { localStorage.removeItem(LS_PEND); } catch (e) {}
      CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = ''; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
      if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(L)) }); };
      window._guardados = []; apiSave = function (x) { window._guardados.push(x); return Promise.resolve({ ok: true, pedido: x }); };
      await refrescarEstado(); await new Promise(r => setTimeout(r, 150));
      const bot = L.find(p => /^__ret_/.test(p.id));
      const r = retiroDe(bot), f = filaDeRetiro(Object.assign({}, r, { fecha: '2026-11-06' }));
      showView('conta'); try { setContaTab('cuadre'); } catch (e) {}
      const E = cuadreEfectivo({ modo: 'mes', val: '2026-11' }, '');
      const luis = E.filas.find(o => o.nombre === 'Luis Pierre') || null;
      return { r: { entrega: r.entrega, retira: r.retira, monto: r.monto, tipo: r.tipo, tick: r.tick.length, fecha: r.fecha },
               f: { cliente: f.cliente, zona: f.zona, chofer: f.chofer, garantia: f.garantia, direccion: f.direccion, vendedor: f.vendedor, nota: f.nota },
               bot: { cliente: bot.cliente, zona: bot.zona, chofer: bot.chofer, garantia: bot.garantia, direccion: bot.direccion, vendedor: bot.vendedor, nota: bot.nota },
               notas: r.notas,
               luis: luis && { cobrado: luis.cobrado, ret: luis.ret, falta: luis.falta } };
    }, L);
    /* ✏️ Corregir y guardar, en su propia llamada: guardado en la misma, la llamada a veces se cortaba con «Execution context was destroyed»
       aunque la página no navegaba (pasaba también con la página de antes; 13/11). */
    await page.waitForTimeout(150);
    out.edit = await page.evaluate((L) => { const bot = L.find(p => /^__ret_/.test(p.id)); try { editarRetiro(bot.id); window._g0 = window._guardados ? window._guardados.length : 0; var ok = guardarRetiroForm(); return { ok: ok !== false, aviso: (document.querySelector('.toast') || {}).textContent || '' }; } catch (e) { return { err: String(e) }; } }, L);
    await page.waitForTimeout(300);
    chk('10a la página lo lee como un retiro: entrega Luis Pierre, retira Contabilidad, Bs 1.860, Facturado, del 06/11, con 2 cobros tildados',
        out.r.entrega === 'Luis Pierre' && out.r.retira === 'Contabilidad' && out.r.monto === 1860 && out.r.tipo === 'Facturado' && out.r.fecha === '2026-11-06' && out.r.tick === 2, out.r);
    chk('10b la fila del bot es la que armaría la página (filaDeRetiro): título, FACTURADO, Contabilidad, los tildes, las notas y «Retiro del…»', JSON.stringify(out.f) === JSON.stringify(out.bot), { pagina: out.f, bot: out.bot });
    chk('10e (C3) la página lee sus 4 notas y ✏️ Corregir lo deja guardar (antes pedía «Anotá al menos un N° de nota»)', out.notas.length === 4 && out.edit && out.edit.ok === true, { notas: out.notas, edit: out.edit });
    chk('10c en el Cuadre de noviembre Luis Pierre queda en 0 (cobró 1.860, retiró 1.860)', out.luis && out.luis.cobrado === 1860 && out.luis.ret === 1860 && Math.abs(out.luis.falta) < 0.005, out.luis);
    /* S1 (13 A): la regla «lo retira el cliente» del .gs (waRetira_) es la de la página (fichaRetira): con estas direcciones y observaciones,
       y con la planilla real si se corre con REAL=<copia de la lista>. */
    const MUESTRAS = [['RECOGE DE TIENDA BANZER', ''], ['Av. Banzer 4to anillo', 'EL CLIENTE PASARA A RECOGER DE FABRICA'], ['Calle Retiro de los Andes 12', ''],
      ['Barrio Las Palmas, casa 3', ''], ['', 'cliente lo recoge el sábado'], ['Mia Plaza', 'VENDRA A BUSCAR EN LA TIENDA'], ['Zona Norte', 'recogerá de PTF'],
      ['Equipetrol', 'llamar antes, recoger colchón viejo'], ['Plan 3000', 'el cliente pasa por el depósito'], ['RETIRA EN ALMACÉN', ''], ['', '']];
    let Lr = MUESTRAS.map((m, i) => ({ id: 'm' + i, direccion: m[0], observaciones: m[1], zona: 'Norte', productos: [] }));
    if (process.env.REAL) Lr = Lr.concat(JSON.parse(fs.readFileSync(process.env.REAL, 'utf8')).pedidos.filter(p => !/^__/.test(String(p.id))).map(p => ({ id: p.id, direccion: p.direccion, observaciones: p.observaciones, zona: p.zona, productos: [] })));
    const pagR = await page.evaluate((L) => L.map(p => !!fichaRetira(p)), Lr);
    const Sx = arma(), srvR = Lr.map(p => !!Sx.ctx.waRetira_(p));
    const difR = Lr.filter((p, i) => pagR[i] !== srvR[i]).map(p => p.id);
    chk('10f (S1) «lo retira el cliente»: el .gs dice lo mismo que la página (fichaRetira) en ' + Lr.length + ' pedidos (' + srvR.filter(Boolean).length + ' lo retiran)', difR.length === 0 && srvR.filter(Boolean).length >= 5, difR.slice(0, 10));
    chk('10d la página no tiró errores', errores.length === 0, errores);
    await browser.close();
  } catch (e) { chk('la sección 10 corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); }

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
