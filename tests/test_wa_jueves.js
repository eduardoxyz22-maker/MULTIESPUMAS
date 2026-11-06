/* 🤖 LO NUEVO DEL BOT DE WHATSAPP DEL JUEVES 05/11 (§4ok-E, servidor 2026-11-05-a).

   El dueño aprobó el plan del 05/11 (PLAN_JUEVES_05-11.json). Esta prueba cuida, contra el .gs de verdad con un Google, un Meta y un
   Kommo de mentira (ningún mensaje sale de verdad), lo del bot:
     97. El aviso a logística sale a las 08:45 (días hábiles) con lo de HOY: sin camión + productos sin revisar o «✗ no hay». La lista
         de las 16:00 ya no sale. Mientras Meta no apruebe la plantilla nueva, sale la «sin camión» de antes (solo con algo sin camión).
    100 y 109 (`pago_recibido`, `atc_recojo`, `atc_devolucion`) se SACARON el 06/11 (dueño: «esta no la quiero»): un pago nuevo y una
         ATC no le mandan nada al cliente, como antes del jueves.
    102. El vigía de leads: cada hora de 8 a 22, las últimas 3 h contra las mismas de hace 7 días; < 25 % (con ≥ 8 la semana pasada)
         → `alerta_leads` a WA_DUENO una vez, y `alerta_leads_volvieron` al volver. Sin WA_DUENO, nada.
    105. `reclamo_fabrica`: a las 10:00 (días hábiles), con la fila `__reclamo_fab__` que deja la página al terminar los Excel.
    108. El cliente manda su ubicación: queda en su pedido si no tenía pin exacto; si tenía otro a más de 300 m, no se pisa y queda
         para «Usar esta ubicación». La confirmación y el recordatorio de un pedido sin pin exacto la piden.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia.

   Se corre:  node tests/test_wa_jueves.js   (desde la raíz del repo, con HTTPS_PROXY=http://127.0.0.1:9 como toda la batería)
   Dientes:   GS=/ruta/al/gs_viejo.gs node tests/test_wa_jueves.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

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
/* El reloj: hora de Bolivia (UTC−4) escrita como '2026-11-05 10:00'. */
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
const pasar = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
/* Meta de mentira (graph.facebook.com) y Kommo de mentira (eanez.kommo.com): Kommo devuelve los leads de `kommo.leads` (cada uno con su
   `created_at` en segundos) que caen entre `filter[created_at][from]` y `[to]`, de a `limit`, con `page`. */
function servidor(props) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], responder: null, n: 0 }, kommo = { leads: [], llamadas: [], falla: false };
  const triggers = [];
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
        if (kommo.falla) return { getResponseCode: () => 500, getContentText: () => '' };
        const q = (k) => { const m = url.match(new RegExp('[?&]' + k.replace(/[\[\]]/g, '\\$&') + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; };
        const de = Number(q('filter[created_at][from]')) || 0, a = Number(q('filter[created_at][to]')) || 9e12, lim = Number(q('limit')) || 50, pg = Number(q('page')) || 1;
        const L = kommo.leads.filter(x => x.created_at >= de && x.created_at <= a).slice((pg - 1) * lim, pg * lim);
        if (!L.length) return { getResponseCode: () => 204, getContentText: () => '' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ _embedded: { leads: L } }) };
      }
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      const code = r ? r.code : 200, txt = r ? JSON.stringify(r.body || {}) : JSON.stringify({ messages: [{ id: 'wamid.' + (++meta.n) }] });
      return { getResponseCode: () => code, getContentText: () => txt };
    } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
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
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) }, parameter: {} })._t);
  const guardar = (rec) => { const r = post({ action: 'save', pedido: rec }); if (r.ok) rec.rev = r.pedido.rev; return r; };
  /* Directo a la hoja (sin pasar por guardar): así no se encolan las confirmaciones. */
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const leer = (id) => { const f = sh._datos.find((f, i) => i > 0 && f[0] === id); return f ? ctx.rowToRec_(f) : null; };
  const hoja = () => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text) }));
  const textos = () => meta.llamadas.filter(c => c.body && c.body.type === 'text').map(c => ({ to: c.body.to, t: c.body.text.body }));
  const limpiar = () => { meta.llamadas.length = 0; kommo.llamadas.length = 0; };
  /* Un aviso de Meta (lo que el cliente escribe). */
  const aviso = (msgs, contactos) => ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ entry: [{ changes: [{ value: {
    metadata: { phone_number_id: '1234567890' }, contacts: contactos || [], messages: msgs } }] }] }) } });
  return { ctx, sh, P, meta, kommo, triggers, post, guardar, cargar, leer, hoja, salen, textos, limpiar, aviso, repaso: () => ctx.waRepaso() };
}
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001, David:59172000002',
             WA_PEDIR_HOY: 'Ernesto:59171000001, Alba:59173000003' };
let nId = 0;
function ped(o) {
  return Object.assign({ id: 'p' + (++nId), fecha: '2026-11-06', oc: '11-0' + (40 + nId), vendedor: 'Carola Chavez', cliente: 'JUAN CARLOS ROCA',
    productos: [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1', cant: 1, precio: 3200, chk: 'ok' }], celular: '70111222', turno: 'AM',
    zona: 'Equipetrol', direccion: 'Av. Banzer 4to anillo', maps: 'https://www.google.com/maps?q=-17.75,-63.18', pagado: false, saldo: 1200, ts: RELOJ.ms,
    metodoPago: '~Efectivo 2000 @2026-11-04', observaciones: '', estado: '', entregado: false, vehiculo: 'KSC', chofer: 'Luis', garantia: '', nota: '640',
    acuenta: 2000, facturarA: '', nit: '', rev: 0 }, o || {});
}

// ══ 97. El aviso a logística: 08:45 con lo de HOY ═══════════════════════════════════════════════
console.log('\n── 97. 08:45: lo de HOY sin camión + productos sin revisar o «✗ no hay»; las 16:00 ya no ──');
{
  const S = servidor(ON), HOY = '2026-11-05', MAN = '2026-11-06';
  S.cargar([
    ped({ id: 'h1', fecha: HOY, cliente: 'ANA GUTIERREZ', zona: 'Norte', vehiculo: '', chofer: '', nroDia: 2 }),                                   // sin camión, producto ✔
    ped({ id: 'h2', fecha: HOY, cliente: 'PEDRO VACA', zona: 'Sur', vehiculo: '', chofer: '', nroDia: 1,
          productos: [{ desc: 'SOMIER ORO', medida: '140x190', codigo: 'CH9', cant: 1 }] }),                                                        // sin camión y sin revisar
    ped({ id: 'h3', fecha: HOY, cliente: 'LUIS ROCA', nroDia: 4, productos: [{ desc: 'SOFT', medida: '100x190', codigo: 'CH3', cant: 2, chk: 'no' },
                                                                  { desc: 'PROTECTOR IMPERMEABLE', medida: '140x190', cant: 1 }] }),                // con camión: ✗ no hay (el protector no cuenta)
    ped({ id: 'h4', fecha: HOY, cliente: 'TODO LISTO' }),                                                                                           // con camión y ✔: no aparece
    ped({ id: 'h5', fecha: HOY, cliente: 'YA ENTREGADO', vehiculo: '', chofer: '', entregado: true }),
    ped({ id: 'h6', fecha: MAN, cliente: 'DE MAÑANA', vehiculo: '', chofer: '', productos: [{ desc: 'SOFT', medida: '100x190', codigo: 'CH3', cant: 1 }] }),
    ped({ id: 'h7', fecha: HOY, cliente: 'ATC SIN CAMION', oc: 'ATC 11-003', vehiculo: '', chofer: '', nroDia: 3, productos: [{ desc: 'TITANIO', medida: '140x190', cant: 1 }] })
  ]);
  poner('2026-11-04 16:05'); S.repaso();
  chk('miércoles 16:05: ya no sale ninguna lista a logística', !S.salen().some(x => /^logistica_(sin_camion|hoy_falta)/.test(x.pl)), S.salen().map(x => x.pl));
  poner(HOY + ' 08:40'); S.repaso();
  chk('jueves 08:40: todavía nada', S.salen('logistica_hoy_falta').length === 0);
  poner(HOY + ' 08:47'); S.repaso();
  const s = S.salen('logistica_hoy_falta');
  chk('08:47: logistica_hoy_falta a Ernesto y a David (WA_LOGISTICA), no a Alba', s.length === 2 && s.map(x => x.to).sort().join() === '59171000001,59172000002', S.salen());
  const p = s[0] ? s[0].p : [];
  chk('…el día y los 3 sin camión de HOY en el orden del día (sin el entregado ni el de mañana; la ATC sí, como siempre)',
      p[0] === 'jueves 05/11' && p[1] === '3 pedidos' && p[2] === 'PEDRO VACA (Sur), ANA GUTIERREZ (Norte), ATC SIN CAMION (Equipetrol)', p);
  chk('…y los productos de hoy sin revisar o «✗ no hay» (sin la ATC, el protector ni lo de mañana)',
      p[3] === '2 productos' && p[4] === '1× SOMIER ORO 140×190 (PEDRO VACA), 2× SOFT 100×190 (LUIS ROCA · ✗ no hay)', p.slice(3));
  chk('la hoja lo anota como «Logística: lo de hoy (sin camión o sin revisar)»', S.hoja().filter(f => /lo de hoy/.test(f[3]) && f[7] === '✅ enviado').length === 2, S.hoja().map(f => f[3]));
  S.limpiar(); poner(HOY + ' 09:30'); S.repaso();
  chk('09:30: no se repite', S.salen('logistica_hoy_falta').length === 0);
}
{
  /* Meta todavía no aprobó la nueva: sale la «sin camión» de antes con lo que está sin camión (3 datos); sin nada sin camión, no sale nada. */
  const S = servidor(ON), HOY = '2026-11-05';
  S.meta.responder = (b) => b && b.template && b.template.name === 'logistica_hoy_falta' ? { code: 404, body: { error: { code: 132001, message: 'Template name does not exist in the translation' } } } : null;
  S.cargar([ped({ id: 'v1', fecha: HOY, cliente: 'ANA GUTIERREZ', zona: 'Norte', vehiculo: '', chofer: '' })]);
  poner(HOY + ' 08:50'); S.repaso();
  const v = S.salen('logistica_sin_camion_v2');
  chk('sin aprobar: sale logistica_sin_camion_v2 con «1», el día y la lista', v.length === 2 && v[0].p.join(' | ') === '1 | jueves 05/11 | ANA GUTIERREZ (Norte)', S.salen());
  const S2 = servidor(ON);
  S2.meta.responder = S.meta.responder;
  S2.cargar([ped({ id: 'v2', fecha: HOY, cliente: 'SOLO SIN REVISAR', productos: [{ desc: 'SOFT', medida: '100x190', codigo: 'CH3', cant: 1 }] })]);
  poner(HOY + ' 08:50'); S2.repaso();
  chk('…con todo con camión y solo productos sin revisar: la de antes NO sale (diría «quedan 0 sin camión»); queda el error en la hoja',
      S2.salen('logistica_sin_camion_v2').length === 0 && S2.salen('logistica_sin_camion').length === 0 && S2.hoja().some(f => f[7] === '❌ error'), S2.salen());
}
{
  const S = servidor(ON);
  S.cargar([ped({ id: 'd1', fecha: '2026-11-08', vehiculo: '', chofer: '' }), ped({ id: 'd2', fecha: '2026-11-07', vehiculo: '', chofer: '' }),
            ped({ id: 'd3', fecha: '2026-11-09', vehiculo: '', chofer: '' })]);
  poner('2026-11-08 08:50'); S.repaso();
  chk('domingo 08:50: nada', S.salen('logistica_hoy_falta').length === 0);
  poner('2026-11-07 08:50'); S.repaso();
  chk('sábado 08:50: sí (se trabaja)', S.salen('logistica_hoy_falta').length === 2);
  const S2 = servidor(ON); S2.cargar([ped({ id: 'f1', fecha: '2026-11-02', vehiculo: '', chofer: '' })]);
  poner('2026-11-02 08:50'); S2.repaso();
  chk('lunes 02/11 (feriado, Todos Santos) 08:50: nada', S2.salen('logistica_hoy_falta').length === 0);
  const S3 = servidor(ON); S3.cargar([ped({ id: 'n1', fecha: '2026-11-05' })]);
  poner('2026-11-05 08:50'); S3.repaso();
  chk('con todo con camión y revisado: no sale nada', S3.salen('logistica_hoy_falta').length === 0 && !S3.hoja().length);
  /* Un reintento que quedó para otro día ya no dice la verdad. */
  const a = S3.ctx.waArmar_({ k: 'sc', a: 'Ernesto', dia: '2026-11-04', n: 1 }, {}, S3.ctx.waConfig_(), S3.ctx.waBo_(Date.now()));
  chk('un reintento del día anterior no sale («era del miércoles 04/11»)', !!a.saltar && /miércoles 04\/11/.test(a.saltar), a);
}

// ══ 100 y 109: sacados (06/11) ════════════════════════════════════════════════════════════════
/* El dueño, el 06/11, sobre «al cliente: aviso de pago recibido (100) y del recojo o la devolución de su ATC (109)»: «esta no la quiero».
   Queda como antes del jueves: un pago nuevo no le manda nada al cliente, y una ATC tampoco (logística recibe lo de siempre). */
console.log('\n── 100 y 109 sacados: un pago nuevo y una ATC no le mandan nada al cliente ──');
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  S.cargar([ped({ id: 'pg1', oc: '11-050', fecha: '2026-11-05', saldo: 1200, metodoPago: '~Efectivo 2000 @2026-11-04 #640' })]);
  const p = S.leer('pg1'); p.metodoPago += ' + QR BNB 700 @2026-11-05 #1001 %IMG1'; p.saldo = 500; S.guardar(p);
  pasar(3); S.repaso();
  chk('un cobro nuevo: nada al cliente (ni pago_recibido ni otra plantilla)', !S.salen().some(x => x.to === '59170111222') && !S.P.WA_PAGO_COLA, S.salen().map(x => x.pl + '→' + x.to));
  chk('…y el servidor ya no tiene nada de eso', ['waPagoAlGuardar_', 'waCobros_', 'waAtcEsDev_', 'waNoClienteAtc_'].every(f => typeof S.ctx[f] === 'undefined') &&
      ['pago', 'atc', 'atcv', 'atd'].every(k => !S.ctx.WA_TIPOS[k]) && !S.ctx.WA_PLANTILLAS.some(x => /^(pago_recibido|atc_recojo|atc_devolucion)$/.test(x.n)));
}
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  const a = ped({ id: 'at1', oc: 'ATC 11-012', cliente: 'MARIA LOPEZ', fecha: '2026-11-09', turno: 'AM', saldo: 0, pagado: true, metodoPago: '', vehiculo: '', chofer: '',
    productos: [{ desc: 'TITANIO LATEX', medida: '140x190', cant: 1, atc: { mot: 'Hundimiento', det: 'se hunde del lado derecho', tipo: 'gar' } }] });
  S.guardar(a); pasar(3); S.repaso();
  let s = S.salen();
  chk('una ATC nueva: al cliente nada; logística recibe lo de siempre (pedido nuevo)', !s.some(x => x.to === '59170111222') &&
      s.filter(x => x.pl === 'logistica_pedido_nuevo_v2').length === 2, s.map(x => x.pl + '→' + x.to));
  S.limpiar();
  poner('2026-11-08 17:05'); S.repaso();
  chk('la víspera de su recojo: tampoco le llega nada', !S.salen().some(x => x.to === '59170111222'), S.salen().map(x => x.pl + '→' + x.to));
}

// ══ 102. El vigía de leads ═════════════════════════════════════════════════════════════════════
console.log('\n── 102. El vigía de leads: < 25 % de la semana pasada → alerta_leads al dueño, una vez; al volver, «volvieron» ──');
{
  const DU = Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007', KOMMO_TOKEN: 'k-de-mentira' });
  const S = servidor(DU);
  const seg = (txt) => Math.floor(Date.parse(txt.replace(' ', 'T') + ':00-04:00') / 1000);
  /* Jueves 29/10 de 8 a 18: 2 leads por hora (20). Jueves 05/11: uno a las 8:30 y nada más. */
  for (let h = 8; h < 18; h++) { S.kommo.leads.push({ id: 1000 + h * 2, created_at: seg('2026-10-29 ' + String(h).padStart(2, '0') + ':10') }); S.kommo.leads.push({ id: 1001 + h * 2, created_at: seg('2026-10-29 ' + String(h).padStart(2, '0') + ':40') }); }
  S.kommo.leads.push({ id: 5000, created_at: seg('2026-11-05 08:30') });
  poner('2026-11-05 07:50'); S.repaso();
  chk('07:50: el vigía no mira (de 8 a 22)', S.kommo.llamadas.length === 0);
  poner('2026-11-05 09:00'); S.repaso();
  chk('09:00: cuenta las últimas 3 h y las mismas de hace 7 días (solo lee: GET /leads con filter[created_at])', S.kommo.llamadas.length === 2 && S.kommo.llamadas.every(u => /\/api\/v4\/leads\?limit=250&page=1&filter\[created_at\]\[from\]=\d+&filter\[created_at\]\[to\]=\d+$/.test(u)), S.kommo.llamadas);
  const est = JSON.parse(S.P.WA_LEADS);
  chk('…a las 09:00: 1 ahora contra 2 la semana pasada (menos de 8: no alcanza para alertar)', est.n === 1 && est.n7 === 2 && !est.alerta && S.salen('alerta_leads').length === 0, est);
  S.limpiar(); poner('2026-11-05 09:30'); S.repaso();
  chk('09:30: no vuelve a contar (una vez por hora)', S.kommo.llamadas.length === 0);
  poner('2026-11-05 11:02'); S.repaso();
  const s = S.salen('alerta_leads');
  chk('11:02: 1 contra 6 → la semana pasada fueron menos de 8: nada', s.length === 0 && JSON.parse(S.P.WA_LEADS).n7 === 6, S.P.WA_LEADS);
  poner('2026-11-05 13:05'); S.repaso();
  const s2 = S.salen('alerta_leads');
  chk('13:05: 0 contra 6 (de 10:05 a 13:05)… sigue sin alcanzar', s2.length === 0, S.P.WA_LEADS);
  /* Más leads la semana pasada al mediodía. */
  for (let i = 0; i < 6; i++) S.kommo.leads.push({ id: 6000 + i, created_at: seg('2026-10-29 14:0' + i) });
  poner('2026-11-05 15:00'); S.repaso();
  const a = S.salen('alerta_leads');
  chk('15:00: 0 contra 12 (≥ 8 y menos del 25 %) → alerta_leads a WA_DUENO', a.length === 1 && a[0].to === '59177000007', S.salen());
  chk('…«de 12:00 a 15:00 · 0 leads · jueves 29/10 · 12 leads»', a[0] && a[0].p.join(' | ') === 'de 12:00 a 15:00 | 0 leads | jueves 29/10 | 12 leads', a[0] && a[0].p);
  chk('…ni a logística ni a Ernesto/Alba', !S.salen().some(x => x.pl === 'alerta_leads' && x.to !== '59177000007'));
  S.limpiar(); poner('2026-11-05 16:00'); S.repaso();
  chk('16:00: sigue sin entrar, pero la alerta no se repite', S.salen('alerta_leads').length === 0 && !!JSON.parse(S.P.WA_LEADS).alerta);
  /* Vuelven: 5 leads entre las 16 y las 17. */
  for (let i = 0; i < 5; i++) S.kommo.leads.push({ id: 7000 + i, created_at: seg('2026-11-05 16:1' + i) });
  poner('2026-11-05 17:01'); S.repaso();
  const v = S.salen('alerta_leads_volvieron');
  chk('17:01: 5 contra 12 (más del 25 %) → alerta_leads_volvieron, una vez', v.length === 1 && v[0].p[1] === '5 leads' && !JSON.parse(S.P.WA_LEADS).alerta, S.salen());
  S.limpiar(); poner('2026-11-05 18:02'); S.repaso();
  chk('18:02: no se repite', S.salen('alerta_leads_volvieron').length === 0 && S.salen('alerta_leads').length === 0);
  chk('WA_LEADS no guarda nombres ni números de nadie', !/591|Eduardo/.test(S.P.WA_LEADS), S.P.WA_LEADS);
}
{
  const S = servidor(Object.assign({}, ON, { KOMMO_TOKEN: 'k' }));
  poner('2026-11-05 15:00'); S.repaso();
  chk('sin WA_DUENO: ni le pregunta a Kommo', S.kommo.llamadas.length === 0 && !S.P.WA_LEADS);
  const S2 = servidor(Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007', KOMMO_TOKEN: 'k' }));
  S2.kommo.falla = true; poner('2026-11-05 15:00'); S2.repaso();
  chk('Kommo no contesta: no manda nada y lo deja anotado', S2.salen('alerta_leads').length === 0 && /Kommo no contestó/.test(JSON.parse(S2.P.WA_LEADS).err || ''), S2.P.WA_LEADS);
  const S3 = servidor(Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007' }));
  poner('2026-11-05 15:00'); S3.repaso();
  chk('sin KOMMO_TOKEN: no manda nada', S3.salen('alerta_leads').length === 0 && S3.kommo.llamadas.length === 0);
  const S4 = servidor(Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007', KOMMO_TOKEN: 'k' }));
  for (let i = 0; i < 600; i++) S4.kommo.leads.push({ id: i, created_at: Math.floor(Date.parse('2026-10-29T13:00:00-04:00') / 1000) + i });
  poner('2026-11-05 15:00'); S4.repaso();
  chk('más de 250 leads: pasa de página (250 + 250 + 100 = 600)', JSON.parse(S4.P.WA_LEADS).n7 === 600 && S4.kommo.llamadas.filter(u => /page=3/.test(u)).length === 1, S4.P.WA_LEADS);
}

// ══ 105. El reclamo a la fábrica ══════════════════════════════════════════════════════════════
console.log('\n── 105. 10:00: reclamo_fabrica al dueño y a logística, con la fila __reclamo_fab__ de hoy ──');
{
  const DU = Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007, Ernesto:59171000001' });   // Ernesto también en WA_PEDIR_HOY: una vez
  const S = servidor(DU);
  const fila = (f, atr, cero) => ({ id: '__reclamo_fab__', fecha: '', oc: '', vendedor: '', cliente: '🏭 RECLAMO A LA FÁBRICA', productos: [], celular: '',
    observaciones: JSON.stringify({ v: 1, f: f, h: '09:40', atr: atr, cero: cero }), entregado: false, rev: 1, ts: 1 });
  S.cargar([fila('2026-11-04', ['VIEJO: faltan 1'], [])]);   // la de ayer
  poner('2026-11-05 09:55'); S.repaso();
  chk('09:55: nada', S.salen('reclamo_fabrica').length === 0);
  poner('2026-11-05 10:02'); S.repaso();
  chk('10:02 con la fila de AYER: no sale (espera la de hoy) y no queda como hecho', S.salen('reclamo_fabrica').length === 0 && JSON.parse(S.P.WA_HECHO).rf !== '2026-11-05', S.P.WA_HECHO);
  /* Logística sube los Excel a las 10:10: la página deja la fila de hoy. */
  const i = S.sh._datos.findIndex(f => f[0] === '__reclamo_fab__');
  S.sh._datos[i] = S.ctx.recToRow(fila('2026-11-05',
    ['TITANIO ICE · 200X200: faltan 7 de 8, tenía que llegar el 03/10 (33 días)', 'SOFT · 140X190: faltan 4, tenía que llegar el 30/10 (6 días)'],
    ['NUEVO ECO FLEX · 140X190: 3 vendidos esperando; el más viejo, OC 10-301 para el 28/10']));
  poner('2026-11-05 10:04'); S.repaso();
  chk('10:04 (a los 2 minutos de la vuelta anterior): todavía no prueba de nuevo', S.salen('reclamo_fabrica').length === 0);
  poner('2026-11-05 10:08'); S.repaso();
  const s = S.salen('reclamo_fabrica');
  chk('10:08: reclamo_fabrica a Eduardo, Ernesto y Alba (Ernesto una sola vez)', s.length === 3 && s.map(x => x.to).sort().join() === '59171000001,59173000003,59177000007', s.map(x => x.to));
  chk('…«jueves 05/11 · 2 productos · la lista · 1 producto · la lista»', s[0] && s[0].p[0] === 'jueves 05/11' && s[0].p[1] === '2 productos' &&
      s[0].p[2] === 'TITANIO ICE · 200X200: faltan 7 de 8, tenía que llegar el 03/10 (33 días) · SOFT · 140X190: faltan 4, tenía que llegar el 30/10 (6 días)' &&
      s[0].p[3] === '1 producto' && /NUEVO ECO FLEX/.test(s[0].p[4]), s[0] && s[0].p);
  chk('…y queda hecho por hoy', JSON.parse(S.P.WA_HECHO).rf === '2026-11-05');
  S.limpiar(); poner('2026-11-05 10:30'); S.repaso();
  chk('10:30: no se repite', S.salen('reclamo_fabrica').length === 0);
}
{
  const S = servidor(Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007' }));
  S.cargar([{ id: '__reclamo_fab__', fecha: '', cliente: 'x', productos: [], observaciones: JSON.stringify({ v: 1, f: '2026-11-05', atr: [], cero: [] }), rev: 1, ts: 1 }]);
  poner('2026-11-05 10:05'); S.repaso();
  chk('sin nada atrasado: no sale, y queda hecho (no vuelve a probar)', S.salen('reclamo_fabrica').length === 0 && JSON.parse(S.P.WA_HECHO).rf === '2026-11-05');
  const S2 = servidor(Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007' }));
  S2.cargar([{ id: '__reclamo_fab__', fecha: '', cliente: 'x', productos: [], observaciones: JSON.stringify({ v: 1, f: '2026-11-08', atr: ['A: faltan 1'], cero: [] }), rev: 1, ts: 1 }]);
  poner('2026-11-08 10:05'); S2.repaso();
  chk('domingo: no sale', S2.salen('reclamo_fabrica').length === 0);
  const S3 = servidor({ WA_ACTIVO: '1', WA_TOKEN: 't', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001' });
  S3.cargar([{ id: '__reclamo_fab__', fecha: '', cliente: 'x', productos: [], observaciones: JSON.stringify({ v: 1, f: '2026-11-05', atr: ['A: faltan 1'], cero: [] }), rev: 1, ts: 1 }]);
  poner('2026-11-05 10:05'); S3.repaso();
  chk('sin WA_DUENO ni WA_AVISOS/WA_PEDIR_HOY: no sale (WA_LOGISTICA no recibe el reclamo)', S3.salen('reclamo_fabrica').length === 0);
  const S4 = servidor(ON);
  S4.cargar([{ id: '__reclamo_fab__', fecha: '', cliente: 'x', productos: [], observaciones: JSON.stringify({ v: 1, f: '2026-11-05', atr: ['A: faltan 1'], cero: [] }), rev: 1, ts: 1 }]);
  poner('2026-11-05 10:05'); S4.repaso();
  chk('sin WA_DUENO: va a los de WA_PEDIR_HOY (Ernesto y Alba)', S4.salen('reclamo_fabrica').map(x => x.to).sort().join() === '59171000001,59173000003', S4.salen());
  /* La fila del sistema se guarda como cualquier otra del sistema (sin sello: gana el último) y no es un pedido para el bot. */
  const r = S4.post({ action: 'save', pedido: { id: '__reclamo_fab__', fecha: '', cliente: 'x', productos: [], observaciones: '{"v":1}', rev: 0 } });
  chk('guardar la fila __reclamo_fab__: entra, sin sello pedido y sin cola del bot', r.ok && !JSON.parse(S4.P.WA_COLA || '[]').some(e => e.id === '__reclamo_fab__'), r);
}

// ══ 108. El cliente manda su ubicación ═════════════════════════════════════════════════════════
console.log('\n── 108. La ubicación del cliente por WhatsApp: a su pedido más próximo, sin pisar un pin exacto; la confirmación la pide ──');
{
  poner('2026-11-05 10:00');
  const S = servidor(Object.assign({}, ON, { WA_HOOK_KEY: 'clave-hook' }));
  const LNK = (la, ln) => 'https://www.google.com/maps?q=' + la.toFixed(6) + ',' + ln.toFixed(6) + '&wa=1';
  S.cargar([
    ped({ id: 'u1', oc: '11-101', celular: '70000101', fecha: '2026-11-06', maps: '', rev: 5 }),
    ped({ id: 'u1b', oc: '11-102', celular: '70000101', fecha: '2026-11-10', maps: '', rev: 5 }),                                     // el mismo cliente, más adelante
    ped({ id: 'u0', oc: '11-100', celular: '70000101', fecha: '2026-11-03', maps: '', rev: 5 }),                                      // ya pasó
    ped({ id: 'u2', oc: '11-103', celular: '70000102', fecha: '2026-11-06', maps: 'https://www.google.com/maps?q=-17.78,-63.17&aprox=1', rev: 5 }),
    ped({ id: 'u3', oc: '11-104', celular: '70000103', fecha: '2026-11-06', maps: 'https://www.google.com/maps?q=-17.760000,-63.180000', rev: 5 }),
    ped({ id: 'u4', oc: '11-105', celular: '70000104', fecha: '2026-11-06', maps: 'https://www.google.com/maps?q=-17.760000,-63.180000', rev: 5 }),
    ped({ id: 'u5', oc: '11-106', celular: '70000105', fecha: '2026-11-06', maps: '', rev: 5 })
  ]);
  const ts = String(Math.floor(RELOJ.ms / 1000));
  const loc = (id, de, la, ln) => S.aviso([{ id: id, from: de, timestamp: ts, type: 'location', location: { latitude: la, longitude: ln, name: 'Mi casa' } }], [{ wa_id: de, profile: { name: 'Juan' } }]);
  const fila = (w) => S.hoja().find(f => f[8] === w);
  loc('wamid.L1', '59170000101', -17.77, -63.19);
  const p1 = S.leer('u1'), f1 = fila('wamid.L1');
  chk('sin ubicación: queda en su pedido MÁS PRÓXIMO (no el de la semana que viene ni el que ya pasó), con la marca «&wa=1»',
      p1.maps === LNK(-17.77, -63.19) && S.leer('u1b').maps === '' && S.leer('u0').maps === '', [p1.maps, S.leer('u1b').maps]);
  chk('…sellada (rev nuevo) y anotada para la lectura de lo cambiado (BORRADOS_RECIENTES)', p1.rev > 5 && JSON.parse(S.P.BORRADOS_RECIENTES || '{}').r.some(x => x[0] === 'u1'), [p1.rev, S.P.BORRADOS_RECIENTES]);
  chk('…la fila «💬 Respondió» es de ESE pedido y dice qué pasó (texto y columna Q)', f1 && f1[1] === 'u1' && /📍 guardada en OC 11-101/.test(f1[9]) && /^guardada\|u1\|/.test(f1[16]), f1);
  chk('…y el bot le contesta él: «Ya tenemos tu ubicación…»', S.textos().some(x => x.to === '59170000101' && /Ya tenemos tu ubicación para tu pedido \*OC 11-101\*/.test(x.t)), S.textos());
  loc('wamid.L2', '59170000102', -17.775, -63.175);
  chk('con una aproximada (&aprox=1, por la dirección escrita): la reemplaza', S.leer('u2').maps === LNK(-17.775, -63.175) && /tenía una aproximada/.test(fila('wamid.L2')[9]), S.leer('u2').maps);
  S.limpiar();
  loc('wamid.L3', '59170000103', -17.77, -63.18);   // ~1,1 km de la que tenía
  const f3 = fila('wamid.L3');
  chk('con OTRO pin exacto a más de 300 m: NO lo pisa', S.leer('u3').maps === 'https://www.google.com/maps?q=-17.760000,-63.180000' && S.leer('u3').rev === 5);
  chk('…queda para «Usar esta ubicación» (columna Q «distinta» con el enlace y los metros)', f3 && /^distinta\|u3\|https:\/\/www\.google\.com\/maps\?q=-17\.770000,-63\.180000&wa=1\|11\d\d$/.test(f3[16]) && /OTRA ubicación \(a 1,1 km\)/.test(f3[9]), f3 && [f3[9], f3[16]]);
  chk('…y al cliente: «se la pasamos a tu vendedora para que la confirme»', S.textos().some(x => /se la pasamos a tu vendedora/.test(x.t)));
  loc('wamid.L4', '59170000104', -17.7605, -63.1802);   // a ~60 m
  chk('con el mismo pin (a menos de 300 m): nada que cambiar', S.leer('u4').rev === 5 && /^igual\|u4/.test(fila('wamid.L4')[16]), fila('wamid.L4')[16]);
  S.aviso([{ id: 'wamid.L5', from: '59170000105', timestamp: ts, type: 'text', text: { body: 'esta es mi ubicación https://maps.google.com/?q=-17.79,-63.21 gracias' } }]);
  chk('un enlace de Maps con el punto, escrito en el mensaje: también', S.leer('u5').maps === LNK(-17.79, -63.21), S.leer('u5').maps);
  loc('wamid.L6', '59170000199', -17.77, -63.19);
  chk('un número sin pedido pendiente: no toca nada y lo dice', /^sin_pedido\|\|/.test(fila('wamid.L6')[16]) && S.textos().some(x => /no encontramos un pedido tuyo/.test(x.t)), fila('wamid.L6'));
  loc('wamid.L7', '59170000101', 40.41, -3.70);       // Madrid
  chk('una ubicación fuera de Bolivia no se toma: queda como un mensaje cualquiera', !fila('wamid.L7')[16] && S.leer('u1').maps === LNK(-17.77, -63.19));
  const R = S.ctx.waRespuestasLeer_();
  const r3 = R.find(x => x.w === 'wamid.L3'), r1 = R.find(x => x.w === 'wamid.L1');
  chk('el panel lo recibe (waRespuestas): `ubi` con qué pasó, el pedido, el enlace y los metros', r3 && r3.ubi && r3.ubi.r === 'distinta' && r3.ubi.id === 'u3' && /&wa=1$/.test(r3.ubi.link) && r3.ubi.m > 1000 && r1 && r1.ubi.r === 'guardada', [r3 && r3.ubi, r1 && r1.ubi]);
}
{
  /* Con Claude prendido: la ubicación la contesta el bot, no Claude. */
  poner('2026-11-05 10:00');
  const S = servidor(Object.assign({}, ON, { WA_HOOK_KEY: 'clave-hook', IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'clave-de-mentira', IA_AL_VUELO: '0' }));
  S.cargar([ped({ id: 'v1', celular: '70000201', fecha: '2026-11-06', maps: '' })]);
  S.aviso([{ id: 'wamid.I1', from: '59170000201', timestamp: String(Math.floor(RELOJ.ms / 1000)), type: 'location', location: { latitude: -17.77, longitude: -63.19 } }]);
  const f = S.hoja().find(x => x[8] === 'wamid.I1');
  chk('con Claude: la fila no queda «⏳» (Claude no la contesta) y no se llama a Claude', f && /^— ubicación/.test(f[12]) && !S.meta.llamadas.some(c => /anthropic/.test(c.url)), f && f[12]);
  chk('…y el bot le contestó', S.textos().some(x => x.to === '59170000201' && /Ya tenemos tu ubicación/.test(x.t)));
}
{
  /* La confirmación y el recordatorio de un pedido SIN pin exacto piden la ubicación. */
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  S.guardar(ped({ id: 'c1', maps: '' })); S.guardar(ped({ id: 'c2', maps: 'https://www.google.com/maps?q=-17.78,-63.17&aprox=1' })); S.guardar(ped({ id: 'c3' }));
  pasar(3); S.repaso();
  const s = S.salen().filter(x => /^confirmacion_pedido/.test(x.pl));
  chk('sin pin y con uno aproximado: confirmacion_pedido_ubic (9 datos); con pin exacto: la v2 de siempre',
      s.filter(x => x.pl === 'confirmacion_pedido_ubic').length === 2 && s.filter(x => x.pl === 'confirmacion_pedido_v2').length === 1 && s.every(x => x.p.length === 9), s.map(x => x.pl));
  S.limpiar();
  poner('2026-11-05 17:05'); S.repaso();
  S.limpiar();
  const S2 = servidor(ON);
  S2.cargar([ped({ id: 'r1', fecha: '2026-11-06', turno: 'AM', maps: '' }), ped({ id: 'r2', fecha: '2026-11-06', turno: 'AM', celular: '70000302' })]);
  poner('2026-11-05 17:05'); S2.repaso();
  const r = S2.salen().filter(x => /^recordatorio_entrega/.test(x.pl));
  chk('el recordatorio: sin pin → recordatorio_entrega_ubic; con pin → la v2', r.map(x => x.pl).sort().join() === 'recordatorio_entrega_ubic,recordatorio_entrega_v2', r.map(x => x.pl));
  /* Meta todavía no aprobó la «_ubic»: sale la v2 con los mismos 9; y si tampoco la v2, la vieja con 8. */
  const S3 = servidor(ON);
  S3.meta.responder = (b) => b && b.template && /_ubic$/.test(b.template.name) ? { code: 404, body: { error: { code: 132001, message: 'no existe' } } } : null;
  poner('2026-11-05 10:00'); S3.guardar(ped({ id: 'm1', maps: '' })); pasar(3); S3.repaso();
  const c = S3.salen().filter(x => /^confirmacion_pedido/.test(x.pl));
  chk('«_ubic» sin aprobar: sale confirmacion_pedido_v2 con los 9 datos', c.map(x => x.pl + ':' + x.p.length).join() === 'confirmacion_pedido_ubic:9,confirmacion_pedido_v2:9', c.map(x => x.pl));
  const S4 = servidor(ON);
  S4.meta.responder = (b) => b && b.template && /_(ubic|v2)$/.test(b.template.name) ? { code: 404, body: { error: { code: 132001, message: 'no existe' } } } : null;
  poner('2026-11-05 10:00'); S4.guardar(ped({ id: 'm2', maps: '' })); pasar(3); S4.repaso();
  const c4 = S4.salen().filter(x => /^confirmacion_pedido/.test(x.pl));
  chk('…y sin la v2 tampoco: la vieja con 8', c4.map(x => x.pl + ':' + x.p.length).join() === 'confirmacion_pedido_ubic:9,confirmacion_pedido_v2:9,confirmacion_pedido:8', c4.map(x => x.pl + ':' + x.p.length));
}

// ══ §4ok-E. probarAntesDeImplementar y estadoBotWhatsApp ═══════════════════════════════════════
console.log('\n── §4ok-E · probarAntesDeImplementar (al final) y estadoBotWhatsApp ──');
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  S.cargar([ped({ id: 'e1', celular: '#ERROR!' }), ped({ id: 'e2', celular: '#ERROR!' })]);
  let L = S.ctx.probarAntesDeImplementar().lineas;
  chk('sin WA_DUENO: «el vigía de leads no corre» y el reclamo va solo a logística', L.some(l => /^✅ El vigía de leads no corre: falta la propiedad WA_DUENO.*solo a logística \(Ernesto, Alba\)/.test(l)), L.filter(l => /WA_DUENO|vigía/.test(l)));
  chk('cuenta los celulares «#ERROR!» que ya quedaron (hay que escribirlos de nuevo)', L.some(l => /^⚠️ 2 pedido\(s\) tienen el celular «#ERROR!»/.test(l)));
  chk('…todavía no hay reclamo a la fábrica', L.some(l => /Todavía no hay reclamo a la fábrica/.test(l)));
  chk('lo del jueves no frena', !L.some(l => /^❌/.test(l) && /vigía|reclamo|#ERROR|WA_DUENO|§4ok-E/.test(l)));
  const S2 = servidor(Object.assign({}, ON, { WA_DUENO: 'Eduardo:59177000007, Malo:123', KOMMO_TOKEN: 'k', WA_LEADS: JSON.stringify({ ts: RELOJ.ms - 600000, n: 1, n7: 20, alerta: RELOJ.ms }) }));
  S2.cargar([{ id: '__reclamo_fab__', fecha: '', cliente: 'x', productos: [], observaciones: JSON.stringify({ v: 1, f: '2026-11-05', atr: ['A', 'B'], cero: ['C'] }), rev: 1, ts: 1 }]);
  L = S2.ctx.probarAntesDeImplementar().lineas;
  chk('con WA_DUENO: a quién, y el último conteo del vigía (en alerta)', L.some(l => /^✅ Al dueño \(Eduardo\).*1 lead\(s\) en 3 h contra 20.*en alerta/.test(l)), L.filter(l => /dueño/.test(l)));
  chk('…un número de WA_DUENO que no entiende: ⚠️', L.some(l => /^⚠️ En WA_DUENO hay número\(s\) que no entiendo: Malo/.test(l)));
  chk('…y el reclamo de hoy que dejó el panel', L.some(l => /reclamo a la fábrica que dejó el panel es del jueves 05\/11 \(2 atrasado\(s\), 1 en 0/.test(l)));
  const e = S2.ctx.estadoBotWhatsApp();
  chk('estadoBotWhatsApp: dueño y vigía', JSON.stringify(e.dueno) === '["Eduardo"]' && e.leads && e.leads.n7 === 20, e);
  const src = fs.readFileSync(GS, 'utf8');
  chk('la cabecera del bot documenta WA_DUENO (y las que maneja el script solo)', /WA_DUENO\s+= \(opcional, §4ok-102\/105/.test(src) && !/WA_PAGO_COLA/.test(src) && /CEL_TEXTO/.test(src));
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exitCode = FAIL ? 1 : 0;
