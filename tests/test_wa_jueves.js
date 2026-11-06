/* 🤖 LO NUEVO DEL BOT DE WHATSAPP DEL JUEVES 05/11 (§4ok-E, servidor 2026-11-05-a).

   El dueño aprobó el plan del 05/11 (PLAN_JUEVES_05-11.json). Esta prueba cuida, contra el .gs de verdad con un Google, un Meta y un
   Kommo de mentira (ningún mensaje sale de verdad), lo del bot:
     97. El aviso a logística sale a las 08:45 (días hábiles) con lo de HOY: sin camión + productos sin revisar o «✗ no hay». La lista
         de las 16:00 ya no sale. Mientras Meta no apruebe la plantilla nueva, sale la «sin camión» de antes (solo con algo sin camión).
    100. `pago_recibido`: un cobro NUEVO (no una corrección) le avisa al cliente cuánto recibimos y cuánto le queda; una vez por pago.
    102. El vigía de leads: cada hora de 8 a 22, las últimas 3 h contra las mismas de hace 7 días; < 25 % (con ≥ 8 la semana pasada)
         → `alerta_leads` a WA_DUENO una vez, y `alerta_leads_volvieron` al volver. Sin WA_DUENO, nada.
    105. `reclamo_fabrica`: a las 10:00 (días hábiles), con la fila `__reclamo_fab__` que deja la página al terminar los Excel.
    108. El cliente manda su ubicación: queda en su pedido si no tenía pin exacto; si tenía otro a más de 300 m, no se pisa y queda
         para «Usar esta ubicación». La confirmación y el recordatorio de un pedido sin pin exacto la piden.
    109. `atc_recojo` (al guardar la ATC con fecha y la víspera) y `atc_devolucion` (al programar la devolución).
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

// ══ 100. pago_recibido ══════════════════════════════════════════════════════════════════════
console.log('\n── 100. Un cobro NUEVO le avisa al cliente cuánto recibimos y cuánto le queda; una vez por pago ──');
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  /* Una venta de ayer, entregada hoy: 3.200, a cuenta 2.000 → saldo 1.200 (la confirmación ya salió ayer: se carga directo). */
  const v = ped({ id: 'pg1', oc: '11-050', fecha: '2026-11-05', entregado: true, saldo: 1200, metodoPago: '~Efectivo 2000 @2026-11-04 #640' });
  S.cargar([v]);
  /* Contabilidad registra un QR de 700 (aplicarCobros: el renglón va al final, sin tocar el anticipo). */
  let p = S.leer('pg1'); p.metodoPago = '~Efectivo 2000 @2026-11-04 #640 + QR BNB 700 @2026-11-05 #1001 %IMG1'; p.saldo = 500;
  S.guardar(p);
  const cola = JSON.parse(S.P.WA_PAGO_COLA || '[]');
  chk('guardar el cobro nuevo lo anota (renglón 0 de los cobros) y deja el disparador de una vez', cola.length === 1 && cola[0].id === 'pg1' && cola[0].i === 0 && S.triggers.some(t => t.fn === 'waDespierta'), cola);
  chk('…el anticipo («~») no es un cobro nuevo, y la venta ya entregada igual cuenta', S.ctx.waCobros_(p.metodoPago).length === 1);
  pasar(1); S.repaso();
  chk('antes de los 2 minutos no sale', S.salen('pago_recibido').length === 0);
  pasar(2); S.repaso();
  let s = S.salen('pago_recibido');
  chk('a los 3 minutos: pago_recibido al cliente', s.length === 1 && s[0].to === '59170111222', S.salen());
  chk('…«Juan · Heaven Colchones · Bs 700 · por QR BNB · OC 11-050 · Tu saldo es Bs 500. · el contacto»', s[0] && JSON.stringify(s[0].p) ===
      JSON.stringify(['Juan', 'Heaven Colchones', 'Bs 700', 'por QR BNB', 'OC 11-050', 'Tu saldo es Bs 500.', 'tu vendedora por el WhatsApp de siempre']), s[0] && s[0].p);
  chk('la hoja lo anota como «Pago recibido» y WA_PAGOS guarda pedido|renglón|monto', S.hoja().some(f => f[3] === 'Pago recibido' && f[7] === '✅ enviado') && !!JSON.parse(S.P.WA_PAGOS)['pg1|0|700'], S.P.WA_PAGOS);
  S.limpiar();
  /* Corregir ese pago (mismo número de renglones: el monto) no manda nada. */
  p = S.leer('pg1'); p.metodoPago = '~Efectivo 2000 @2026-11-04 #640 + QR BNB 750 @2026-11-05 #1001 %IMG1'; p.saldo = 450; S.guardar(p);
  pasar(3); S.repaso();
  chk('corregir el monto de un pago ya avisado: nada', S.salen('pago_recibido').length === 0 && !JSON.parse(S.P.WA_PAGO_COLA).length);
  /* El segundo pago, en efectivo, cierra la venta. */
  p = S.leer('pg1'); p.metodoPago += ' + Efectivo 450 @2026-11-05 #1002'; p.saldo = 0; p.pagado = true; S.guardar(p);
  pasar(3); S.repaso();
  s = S.salen('pago_recibido');
  chk('otro pago: «Bs 450 · en efectivo · Tu pedido quedó pagado 🎉»', s.length === 1 && s[0].p[2] === 'Bs 450' && s[0].p[3] === 'en efectivo' && s[0].p[5] === 'Tu pedido quedó pagado 🎉', s.map(x => x.p));
  S.limpiar();
  /* Un pago que se guarda dos veces (la cola del celular lo reenvía) no se avisa dos veces. */
  p = S.leer('pg1'); S.guardar(p); pasar(3); S.repaso();
  chk('volver a guardar lo mismo: nada', S.salen('pago_recibido').length === 0);
}
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  const base = (o) => ped(Object.assign({ fecha: '2026-11-06', saldo: 1200, metodoPago: '~Efectivo 2000 @2026-11-04' }, o));
  S.cargar([
    base({ id: 'x1', vendedor: 'Eduardo Añez' }), base({ id: 'x2', vendedor: 'ROHO' }), base({ id: 'x3', vendedor: 'ALBA' }),
    base({ id: 'x4', oc: 'ATC 11-002' }), base({ id: 'x5', oc: 'RPT 11-003' }), base({ id: 'x6', direccion: 'SALIÓ DE TIENDA · Central', fecha: '' }),
    base({ id: 'x7', celular: '3345566' }), base({ id: 'x8' }), base({ id: 'x9', metodoPago: 'Efectivo %IMGX', pagado: true, saldo: 0 }),
    base({ id: 'x10', fecha: '' })
  ]);
  const cobra = (id, txt) => { const q = S.leer(id); q.metodoPago = q.metodoPago + ' + ' + txt; q.saldo = 500; S.guardar(q); };
  ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x10'].forEach(id => cobra(id, 'Efectivo 700 @2026-11-05'));
  cobra('x8', 'QR 700 @2026-10-20');   // anotado tarde: el pago es de hace más de 3 días
  { const q = S.leer('x9'); q.metodoPago = 'Efectivo 3200 @2026-11-05 %IMGX'; S.guardar(q); }   // le anotaron el monto a la «PAGADA sin monto»
  pasar(3); S.repaso();
  const s = S.salen('pago_recibido');
  chk('a quién no: Eduardo, ROHO, internos (ALBA), ATC, RPT, venta de tienda; solo la de sin fecha («avisa cuándo») sí',
      s.length === 1 && s[0].to === '59170111222' && JSON.parse(S.P.WA_PAGOS || '{}')['x10|0|700'], s.map(x => x.to));
  chk('…sin celular de WhatsApp queda anotado en la hoja', S.hoja().some(f => f[1] === 'x7' && f[3] === 'Pago recibido' && /celular/.test(f[8])), S.hoja().map(f => f[1] + ':' + f[8]));
  chk('…un pago anotado tarde (fecha de hace más de 3 días) y el monto anotado a una «PAGADA sin monto» no se avisan',
      !S.hoja().some(f => f[1] === 'x8' || f[1] === 'x9'));
  chk('WA_INTERNOS = CONTA_INTERNOS de la página', (() => {
    const html = fs.readFileSync(path.resolve('pedidos.html'), 'utf8'), m = html.match(/var CONTA_INTERNOS=(\[[^\]]*\]);/);
    return !!m && JSON.stringify(vm.runInNewContext(m[1]).slice().sort()) === JSON.stringify(S.ctx.WA_INTERNOS.slice().sort()); })());
}
{
  /* Un pago corregido en los 2 minutos de espera sale con lo corregido; uno borrado, no sale. */
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  S.cargar([ped({ id: 'c1', saldo: 1200, metodoPago: '~Efectivo 2000 @2026-11-04' }), ped({ id: 'c2', saldo: 1200, metodoPago: '~Efectivo 2000 @2026-11-04' })]);
  let q = S.leer('c1'); q.metodoPago += ' + Tarjeta 600 @2026-11-05'; q.saldo = 600; S.guardar(q);
  pasar(1); q = S.leer('c1'); q.metodoPago = q.metodoPago.replace('Tarjeta 600', 'Tarjeta 1200'); q.saldo = 0; q.pagado = true; S.guardar(q);
  let r = S.leer('c2'); r.metodoPago += ' + Efectivo 300 @2026-11-05'; r.saldo = 900; S.guardar(r);
  pasar(1); r = S.leer('c2'); r.metodoPago = '~Efectivo 2000 @2026-11-04'; r.saldo = 1200; S.guardar(r);
  pasar(2); S.repaso();
  const s = S.salen('pago_recibido');
  chk('corregido en la espera: sale UNO, con «Bs 1.200 · con tarjeta · quedó pagado»', s.length === 1 && s[0].p[2] === 'Bs 1.200' && s[0].p[3] === 'con tarjeta' && /pagado/.test(s[0].p[5]), s.map(x => x.p));
  chk('borrado en la espera: no sale y la hoja dice por qué', S.hoja().some(f => f[1] === 'c2' && /ya no está/.test(f[8])), S.hoja().map(f => f[1] + ':' + f[8]));
  chk('el recargo por entrega pactado se dice aparte', S.ctx.waSaldoPago_({ pagado: true, saldo: 0, metodoPago: '~Efectivo 100 + ^150' }) === 'Tu pedido quedó pagado 🎉 Solo falta el recargo por entrega (Bs 150), al recibir.');
}

// ══ 109. La ATC: recojo y devolución ═══════════════════════════════════════════════════════════
console.log('\n── 109. atc_recojo al guardarla y la víspera; atc_devolucion al programar la vuelta ──');
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  const ATC = (o) => ped(Object.assign({ oc: 'ATC 11-012', fecha: '2026-11-09', turno: 'AM', saldo: 0, pagado: true, metodoPago: '', vehiculo: '', chofer: '',
    productos: [{ desc: 'TITANIO LATEX', medida: '140x190', cant: 1, atc: { mot: 'Hundimiento', det: 'se hunde del lado derecho', tipo: 'gar' } }] }, o));
  const a = ATC({ id: 'at1', cliente: 'MARIA LOPEZ' });
  S.guardar(a); pasar(3); S.repaso();
  let s = S.salen();
  const r = s.find(x => x.pl === 'atc_recojo');
  chk('ATC nueva con fecha: atc_recojo al cliente (y la confirmación de una venta NO)', !!r && r.to === '59170111222' && !s.some(x => /^confirmacion_pedido/.test(x.pl)), s.map(x => x.pl));
  chk('…«Maria · Heaven Colchones · ATC 11-012 · el lunes 09/11 por la mañana · 9:00 y las 12:00 · contacto»: sin productos ni saldo', r && JSON.stringify(r.p) ===
      JSON.stringify(['Maria', 'Heaven Colchones', 'ATC 11-012', 'el lunes 09/11 por la mañana', '9:00 y las 12:00', 'tu vendedora por el WhatsApp de siempre']), r && r.p);
  chk('…y logística recibe lo de siempre (pedido nuevo)', s.filter(x => x.pl === 'logistica_pedido_nuevo_v2').length === 2, s.map(x => x.pl));
  S.limpiar();
  /* Cambiarle el día del recojo: otro atc_recojo con el día nuevo. */
  a.fecha = '2026-11-10'; a.turno = 'PM'; S.guardar(a); pasar(3); S.repaso();
  s = S.salen('atc_recojo');
  chk('cambió el día del recojo: atc_recojo con «el martes 10/11 por la tarde» (no cambio_entrega)', s.length === 1 && s[0].p[3] === 'el martes 10/11 por la tarde' && !S.salen().some(x => /^cambio_entrega/.test(x.pl)), S.salen().map(x => x.pl));
  S.limpiar();
  /* La víspera (lunes 09/11 a las 19:00, es PM): una vez. */
  poner('2026-11-09 17:05'); S.repaso();
  chk('lunes 17:05: el recojo es de la tarde, todavía no', S.salen('atc_recojo').length === 0);
  poner('2026-11-09 19:05'); S.repaso();
  s = S.salen('atc_recojo');
  chk('lunes 19:05: la víspera, «mañana, martes 10/11 por la tarde»', s.length === 1 && s[0].p[3] === 'mañana, martes 10/11 por la tarde', S.salen());
  chk('…anotada como «ATC: recojo (víspera)»', S.hoja().some(f => f[3] === 'ATC: recojo (víspera)' && f[7] === '✅ enviado'));
  S.limpiar(); poner('2026-11-09 20:00'); S.repaso();
  chk('…y no se repite', S.salen('atc_recojo').length === 0);
  /* Se recogió el martes; el viernes logística programa la devolución para el martes 17/11 (la ATC pasa a vivir en ese día). */
  poner('2026-11-13 11:00');
  const b = S.leer('at1'); b.fecha = '2026-11-17'; b.turno = 'PM'; b.entregado = false;
  b.productos = b.productos.map(x => Object.assign({}, x, { atc: Object.assign({}, x.atc, { pdev: '2026-11-17', pturno: 'PM', rec: '2026-11-10' }) }));
  S.guardar(b); pasar(3); S.repaso();
  s = S.salen('atc_devolucion');
  chk('programar la devolución: atc_devolucion «el martes 17/11 por la tarde»', s.length === 1 && s[0].p[2] === 'ATC 11-012' && s[0].p[3] === 'el martes 17/11 por la tarde', S.salen().map(x => x.pl));
  chk('…y ningún atc_recojo (ya se recogió)', S.salen('atc_recojo').length === 0);
  S.limpiar(); poner('2026-11-16 19:05'); S.repaso();
  chk('la víspera de la devolución no repite nada (la devolución se avisa al programarla)', !S.salen().some(x => /^atc_/.test(x.pl)), S.salen().map(x => x.pl));
}
{
  poner('2026-11-05 10:00');
  const S = servidor(ON);
  const ATC = (o) => ped(Object.assign({ oc: 'ATC 11-0' + (++nId), fecha: '2026-11-09', saldo: 0, pagado: true, metodoPago: '',
    productos: [{ desc: 'SOFT', medida: '100x190', cant: 1, atc: { mot: 'Ruido', det: 'hace ruido al moverse' } }] }, o));
  [ATC({ id: 'ae', vendedor: 'Eduardo Añez' }), ATC({ id: 'ar', vendedor: 'ROHO' }), ATC({ id: 'ai', vendedor: 'FABRICA' }), ATC({ id: 'ac', celular: '' })].forEach(x => S.guardar(x));
  S.guardar(ped({ id: 'rpt', oc: 'RPT 11-004', cliente: 'Mia Plaza' }));
  pasar(3); S.repaso();
  chk('a quién no: Eduardo, ROHO e internos (FABRICA); la RPT tampoco recibe nada', !S.salen().some(x => /^atc_|^confirmacion/.test(x.pl)), S.salen().map(x => x.pl + '→' + x.to));
  chk('…sin celular queda anotado en la hoja', S.hoja().some(f => f[1] === 'ac' && f[3] === 'ATC: recojo' && /celular/.test(f[8])), S.hoja().map(f => f[1] + ':' + f[3] + ':' + f[8]));
  chk('waAtcEsDev_: con pdev = la fecha es la devolución; con pdev de otro día (o sin pdev), el recojo',
      S.ctx.waAtcEsDev_({ fecha: '2026-11-17', productos: [{ atc: { pdev: '2026-11-17' } }] }) === true &&
      S.ctx.waAtcEsDev_({ fecha: '2026-11-10', productos: [{ atc: { pdev: '2026-11-17' } }] }) === false && S.ctx.waAtcEsDev_({ fecha: '2026-11-10', productos: [{}] }) === false);
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exitCode = FAIL ? 1 : 0;
