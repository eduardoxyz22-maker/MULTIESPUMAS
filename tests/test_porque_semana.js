/* 🧠🤝 SERVIDOR 2026-11-16-a: LAS MEJORAS 356 («El porqué de la semana, escrito por Claude») Y 362 («Quién necesita una mano esta semana»)
   (el dueño, 16/11, de la página «Mejoras 344 a 389»). Monta el `.gs` REAL con Meta y Claude de mentira.
     1. La plantilla `porque_semana` (4 datos, el botón «Ver el detalle por tienda») en WA_PLANTILLAS y WA_TIPOS; «porque» en el menú.
     2. Los hechos de la semana: equipo, tres semanas, tiendas, vendedoras, marcas, productos, mayoristas, Black Friday, la meta y la proyección; SIN clientes.
     3. El lunes 08:00: sale a los DOS de WA_DUENO, ANTES que «Cómo va cada vendedor»; Claude UNA vez; la frase con un número inventado se tira; la
        cita que falta se agrega; queda en la hoja «IA semanal»; no se repite.
     4. Sin Claude (apagado, sin crédito, lo que contesta no se puede comprobar): las reglas, y lo dice. Sin la plantilla aprobada: texto libre.
     5. El botón y la palabra «porque»: la lectura entera y los números.
     6. El día 1 a las 10:05: el mes, DESPUÉS del mes cerrado.
     7. Las acciones `iaSemana` / `iaPorque` (por doPost, con la clave): leer, armar UNA vez, «otra».
     8. 362 `iaEquipo`: solo quien necesita, por nombre (nunca ranking), un número que no está en SUS datos se va, el video de la lista, una vez por
        semana, «otra» conserva «Ya hablé», `iaEquipoHable`, el tope y Claude apagado.
     9. `probarAntesDeImplementar` lo dice.
   Datos SINTÉTICOS (el repo es público). Reloj de Bolivia.
   Se corre:  node tests/test_porque_semana.js   (desde la raíz del repo; GS=<otro .gs> para probar contra otro) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 900)) : ''); };
const seccion = (t, fn) => { console.log('\n── ' + t + ' ──'); try { fn(); } catch (e) { chk('la sección corre sin reventar', false, String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); } };

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
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
const SRC = fs.readFileSync(GS, 'utf8');
function servidor(props) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {}), cache = {};
  const meta = { llamadas: [], responder: null, n: 0 }, claude = { llamadas: [], responder: null };
  const res = (code, body) => ({ getResponseCode: () => code, getContentText: () => (body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body))) });
  const candado = { waitLock() {}, releaseLock() {}, tryLock() { return true; } };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o) }) },
    UrlFetchApp: { fetch: (url, o) => {
      o = o || {};
      if (/kommo\.com/.test(url)) return res(500, {});
      if (/api\.anthropic\.com/.test(url)) {
        const body = o.payload ? JSON.parse(o.payload) : null; claude.llamadas.push({ url, o, body });
        const r = claude.responder ? claude.responder(body, claude.llamadas.length) : null;
        if (r && r.code) return res(r.code, r.body);
        return res(200, { content: [{ type: 'text', text: JSON.stringify(r || {}) }], stop_reason: 'end_turn', usage: { input_tokens: 4000, output_tokens: 600 }, model: 'claude-opus-5-5' });
      }
      const body = o.payload ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, o, body });
      const r = meta.responder ? meta.responder(body, meta.llamadas.length) : null;
      return res(r ? r.code : 200, r ? (r.body || {}) : { messages: [{ id: 'wamid.' + (++meta.n) }] });
    } },
    LockService: { getScriptLock: () => candado, getDocumentLock: () => candado },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache[k] != null ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, putAll() {}, remove: (k) => { delete cache[k]; }, removeAll() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; }, getContent() { return t; } }) },
    DriveApp: {}, Utilities: { formatDate: (d) => String(d), sleep: () => {} },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyHours: () => ({ create: () => ({}) }),
      everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }), getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const cargar = (lista) => { lista.forEach(p => sh._datos.push(ctx.recToRow(p))); };
  const hoja = (n) => (hojas[n] ? hojas[n]._datos.slice(1) : []);
  const salen = (pl) => meta.llamadas.filter(c => c.body && c.body.template && (!pl || c.body.template.name === pl))
                                    .map(c => ({ to: c.body.to, pl: c.body.template.name, p: c.body.template.components[0].parameters.map(x => x.text), comp: c.body.template.components }));
  const post = (b) => { const o = ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify(b) } }); return JSON.parse(o._t || o.getContent()); };
  const limpiar = () => { meta.llamadas.length = 0; claude.llamadas.length = 0; };
  return { ctx, sh, P, meta, claude, cargar, hoja, salen, post, limpiar, cache, repaso: () => ctx.waRepaso() };
}

/* ── Los datos: tres semanas de noviembre (y octubre para «Cómo va cada vendedor») ── */
const TS = (f, h) => Date.parse(f + 'T' + (h || '11:00') + ':00-04:00');
const P = (id, vend, o) => Object.assign({ id, oc: '11-' + id, vendedor: vend, cliente: 'CLIENTE ' + String(id).toUpperCase(), fecha: '2026-11-25', turno: 'AM',
  celular: '70011' + String(100 + id.length), zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 1000 }],
  saldo: 0, acuenta: 0, pagado: false, metodoPago: '', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '', nota: '',
  ts: TS('2026-11-02'), nroDia: 0, fotos: [], rev: 1 }, o || {});
const V = (id, vend, dia, saldo, o) => P(id, vend, Object.assign({ ts: TS(dia), saldo }, o || {}));
const SISTEMA = (id, obj) => P(id, '', { oc: '', cliente: 'FILA DEL SISTEMA', fecha: '', turno: '', productos: [], observaciones: JSON.stringify(obj), ts: TS('2026-11-01', '09:00') });
const FIX = [
  V('o1', 'Isabel Robledo', '2026-10-02', 100000, { fecha: '2026-10-05' }),                       // octubre: para que «Cómo va cada vendedor» salga
  V('a1', 'Isabel Robledo', '2026-10-28', 5000),                                                   // 26/10 al 01/11
  V('b1', 'Isabel Robledo', '2026-11-03', 5000), V('b2', 'Carola Chavez', '2026-11-05', 5000),      // 02 al 08/11: Bs 10.000 en 2
  V('c1', 'Isabel Robledo', '2026-11-10', 5000), V('c2', 'Isabel Robledo', '2026-11-11', 5000), V('c3', 'Isabel Robledo', '2026-11-12', 5000),
  V('c4', 'Maria Flores', '2026-11-11', 3000),
  V('c5', 'Carola Chavez', '2026-11-13', 6000), V('c6', 'Carola Chavez', '2026-11-14', 6000),       // 09 al 15/11: Bs 30.000 en 6 (12.000 en Black Friday)
  V('m1', 'Eduardo Añez', '2026-11-04', 20000, { cliente: 'MULTICENTER' }),                          // mayoristas: 20.000 → 8.000
  V('m2', 'Eduardo Añez', '2026-11-12', 8000, { cliente: 'MULTICENTER' }),
  V('x1', 'ROHO', '2026-11-12', 9000), V('x2', 'Carola Chavez', '2026-11-12', 7000, { oc: 'ATC 11-001' }),   // no cuentan
  SISTEMA('__metas__', { v: 1, m: { '2026-11': { heaven: 100000, suena: 20000 } } }),
  SISTEMA('__pry_hist__', { v: 1, d: { '2026-11-14': { h: '17:30', v: 40000, p: 95000, b: { heaven: [37000, 90000, 'c'], suena: [3000, 5000, 'r'] } } } })
];
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001', WA_HOOK_KEY: 'clave-hook',
  WA_DUENO: 'Eduardo:59177000007, Jefe:59177000008', IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'sk-de-mentira' };
const lleno = (props) => { const S = servidor(Object.assign({}, ON, props || {})); S.cargar(FIX); return S; };
/* Claude de mentira: una lectura con una frase que cita bien, una que se olvidó de citar un hecho, y una con un número inventado. */
const BUENA = {
  resumen: { txt: 'Se vendieron Bs 30.000 en 6 ventas: +200 % contra la anterior (Bs 10.000).', de: ['E1'] },
  porque: [{ txt: 'Central pasó de Bs 5.000 a Bs 15.000.', de: ['T1'] }, { txt: 'Black Friday arrancó el 13/11 con Bs 12.000 en 2 ventas.', de: ['B1'] },
           { txt: 'Un número inventado: Bs 99.999.', de: ['E1'] }],
  mirar: [{ txt: 'Los mayoristas bajaron a Bs 8.000.', de: ['M1'] }, { txt: 'Buenos Aires vendió Bs 3.000.', de: ['E1'] }]
};
let nW = 0;
const hook = (S, from, msg) => S.ctx.doPost({ parameter: { wa: 'clave-hook' }, postData: { contents: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'X', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1234567890' }, contacts: [{ wa_id: from, profile: { name: 'Eduardo' } }],
           messages: [Object.assign({ id: 'wamid.in' + (++nW), from, timestamp: String(Math.floor(RELOJ.ms / 1000)) }, msg)] } }] }] }) } });
const textos = (S, to) => S.meta.llamadas.filter(c => c.body && c.body.type === 'text' && (!to || c.body.to === to)).map(c => c.body.text.body);
const filas = (S) => S.hoja('IA semanal').map(r => ({ k: r[0], tipo: r[1], o: JSON.parse(r[6]) }));

seccion('1. La plantilla y el menú', () => {
  const S = servidor(ON), pl = Array.from(S.ctx.WA_PLANTILLAS).find(x => x.n === 'porque_semana'), vars = (t) => (t.match(/\{\{\d+\}\}/g) || []);
  chk('1a porque_semana: {{1}}…{{4}} en orden, un ejemplo por cada uno', !!pl && vars(pl.t).join() === '{{1}},{{2}},{{3}},{{4}}' && pl.e.length === 4, pl && vars(pl.t));
  chk('1b no empieza ni termina con un dato, sin dos pegados; ejemplos sin saltos y de 250 letras o menos', !!pl && !/^\{\{/.test(pl.t) && !/\}\}$/.test(pl.t.trim()) && !/\}\}\s*\{\{/.test(pl.t) &&
      pl.e.every(x => !/[\r\n\t]/.test(x) && x.length <= 250));
  chk('1c el botón «Ver el detalle por tienda» (25 letras o menos) y WA_TIPOS.wp', !!pl && JSON.stringify(pl.bt) === '["Ver el detalle por tienda"]' && [...pl.bt[0]].length <= 25 &&
      S.ctx.WA_TIPOS.wp && S.ctx.WA_TIPOS.wp.plantilla === 'porque_semana' && !S.ctx.WA_TIPOS.wp.vieja);
  chk('1d el menú del dueño dice «porque»', /\*porque\* — por qué se movió la semana/.test(S.ctx.waPregMenu_({ primero: true })));
  chk('1e la semana pasada de un lunes, un miércoles y un domingo', JSON.stringify([S.ctx.wpSemanaPasada_('2026-11-16'), S.ctx.wpSemanaPasada_('2026-11-18'), S.ctx.wpSemanaPasada_('2026-11-22')]) ===
      JSON.stringify([{ d: '2026-11-09', h: '2026-11-15' }, { d: '2026-11-09', h: '2026-11-15' }, { d: '2026-11-09', h: '2026-11-15' }]));
});

seccion('2. Los hechos de la semana del 09 al 15/11', () => {
  const S = lleno(); poner('2026-11-16 08:05');
  const lista = S.sh._datos.slice(1).map(f => S.ctx.rowToRec_(f)), F = S.ctx.wpHechos_(lista, 's2026-11-09', S.ctx.waBo_(RELOJ.ms)), t = (id) => (F.H.find(x => x.id === id) || {}).t || '';
  chk('2a E1: el equipo (sin Eduardo, ROHO ni ATC), contra la anterior, con el % y la diferencia', t('E1') === 'Equipo del 09 al 15/11: Bs 30.000 en 6 ventas, 6 productos · la anterior (02 al 08/11): Bs 10.000 en 2 ventas, 2 productos · +200 % en Bs (+Bs 20.000)', t('E1'));
  chk('2b E2: tres semanas', t('E2') === 'Tres semanas: 26/10 al 01/11 Bs 5.000 (1) · 02 al 08/11 Bs 10.000 (2) · 09 al 15/11 Bs 30.000 (6)', t('E2'));
  chk('2c las tiendas, lo que más se movió primero (la tienda de quien vendió en el mes que cuenta)', t('T1') === 'Tienda Central: Bs 15.000 en 3 ventas · la anterior Bs 5.000 en 1 venta · +200 % (+Bs 10.000) · la de antes Bs 5.000' &&
      /^Tienda Tienda Banzer: Bs 12\.000 en 2 ventas · la anterior Bs 5\.000/.test(t('T2')) && /^Tienda Buenos Aires: Bs 3\.000 en 1 venta · la anterior Bs 0 en 0 ventas · nuevo/.test(t('T3')), [t('T1'), t('T2'), t('T3')]);
  chk('2d las vendedoras y las marcas', /^Isabel Robledo \(Central, Heaven\): Bs 15\.000 en 3 ventas/.test(t('V1')) && /^Marca Heaven: Bs 30\.000 en 6 ventas · la anterior Bs 10\.000 · \+200 %$/.test(t('K1')), [t('V1'), t('K1')]);
  chk('2e los productos (colchones y somieres) y los mayoristas aparte, por su nombre', t('P1') === 'Producto SOFT: 6 unidades · la anterior 2 (+4)' &&
      t('M1') === 'Mayoristas (aparte del equipo): Bs 8.000 en 1 OC · la anterior Bs 20.000 en 1 OC · −60 %' && /^Mayorista Multicenter: Bs 8\.000 en 1 OC/.test(t('M2')), [t('P1'), t('M1'), t('M2')]);
  chk('2f Black Friday: los días de la campaña en la semana y lo cargado en ellos; y cómo va contra los días de antes', t('B1') === 'Black Friday (del 13/11 al 30/11): 3 días de la campaña en este período (del 13/11 al 15/11), con Bs 12.000 en 2 ventas' &&
      /^Black Friday al 16\/11: día /.test(t('B2')), [t('B1'), t('B2')]);
  chk('2g la meta del mes en curso y la última foto de la proyección', /^Meta de Heaven en noviembre: Bs 100\.000 · lleva Bs 45\.000 \(45 %\) · se proyecta 90 %/.test(t('G1')) &&
      t('R1') === 'Proyección de noviembre (cálculo del panel del 14/11 a las 17:30): Bs 95.000 · vendido hasta ahí Bs 40.000 · Heaven Bs 90.000 · Sueña Bs 5.000', [t('G1'), t('R1')]);
  const todo = F.H.map(x => x.t).join(' | ');
  chk('2h ningún cliente, celular ni OC en los hechos', !/CLIENTE|70011|11-c|ATC/.test(todo), todo.slice(0, 300));
});

seccion('3. El lunes 08:00: el WhatsApp a los dos, antes de «Cómo va cada vendedor»', () => {
  const S = lleno(); S.claude.responder = () => BUENA;
  poner('2026-11-16 07:55'); S.repaso();
  chk('3a a las 07:55 todavía no', S.salen('porque_semana').length === 0);
  poner('2026-11-16 08:05'); S.repaso();
  const wp = S.salen('porque_semana'), todos = S.salen().map(x => x.pl);
  chk('3b sale a los DOS de WA_DUENO, con 4 datos y el botón de esa semana', wp.length === 2 && JSON.stringify(wp.map(x => x.to).sort()) === '["59177000007","59177000008"]' &&
      wp[0].p.length === 4 && wp[0].comp[1] && wp[0].comp[1].parameters[0].payload === 'wp|s2026-11-09', wp.map(x => x.to));
  chk('3c Claude UNA vez (el jefe recibe la misma)', S.claude.llamadas.length === 1, S.claude.llamadas.length);
  chk('3d sale ANTES que «Cómo va cada vendedor»', todos.indexOf('vendedoras_bajan') > todos.lastIndexOf('porque_semana') && todos.indexOf('vendedoras_bajan') >= 0, todos);
  const p = (wp[0] || { p: [] }).p;
  chk('3e {{1}} y {{2}}', p[0] === 'La semana del 09 al 15/11' && p[1] === 'Se vendieron Bs 30.000 en 6 ventas: +200 % contra la anterior (Bs 10.000).', p.slice(0, 2));
  chk('3f {{3}} sin la frase del número inventado', p[2] === 'Central pasó de Bs 5.000 a Bs 15.000 · Black Friday arrancó el 13/11 con Bs 12.000 en 2 ventas', p[2]);
  chk('3g {{4}} las dos para mirar', p[3] === 'Los mayoristas bajaron a Bs 8.000 · Buenos Aires vendió Bs 3.000', p[3]);
  const F = filas(S), it = (F[0] || {}).o || {};
  chk('3h queda UNA fila en «IA semanal» (s2026-11-09), con lo que Claude citó', F.length === 1 && F[0].k === 's2026-11-09' && F[0].tipo === 'porque' && it.via === 'claude', F.map(x => x.k));
  chk('3i la cita que faltaba se agregó (Buenos Aires: E1 → E1 y T3)', JSON.stringify((it.mirar || [])[1] && it.mirar[1].de) === '["E1","T3"]', it.mirar);
  const sys = S.claude.llamadas[0].body;
  chk('3j a Claude: esfuerzo bajo, JSON con esquema, los hechos con su código, sin clientes', sys.output_config && sys.output_config.effort === 'low' && sys.output_config.format.type === 'json_schema' &&
      /\[E1\] Equipo del 09 al 15\/11/.test(sys.messages[0].content) && !/CLIENTE/.test(sys.messages[0].content) && /No hables de cada vendedora contra su mes pasado/.test(sys.system));
  S.limpiar(); poner('2026-11-16 08:40'); S.repaso();
  chk('3k no se repite', S.salen('porque_semana').length === 0 && S.claude.llamadas.length === 0);
  S.limpiar(); poner('2026-11-17 08:05'); S.repaso();
  chk('3l el martes no sale', S.salen('porque_semana').length === 0);
});

seccion('4. Sin Claude y sin la plantilla aprobada', () => {
  const A = lleno({ IA_ACTIVA: '0' }); poner('2026-11-16 08:05'); A.repaso();
  const a = A.salen('porque_semana'), it = (filas(A)[0] || {}).o || {};
  chk('4a Claude apagado: sale igual, con reglas, y {{1}} lo dice «(sin Claude)»; Claude no se llama', a.length === 2 && a[0].p[0] === 'La semana del 09 al 15/11 (sin Claude)' && A.claude.llamadas.length === 0 &&
      it.via === 'reglas' && /apagado/.test(it.motivo), [a.map(x => x.p[0]), it.motivo]);
  chk('4b las reglas: lo que más subió (Central, Tienda Banzer) y Black Friday; para mirar, los mayoristas', /^Central: Bs 15\.000 contra Bs 5\.000 \(\+Bs 10\.000\) · Tienda Banzer: Bs 12\.000 contra Bs 5\.000/.test(a[0].p[2]) &&
      /Black Friday: /.test(a[0].p[2]) && /Mayoristas \(aparte del equipo\): Bs 8\.000/.test(a[0].p[3]), [a[0].p[2], a[0].p[3]]);
  const C = lleno(); C.claude.responder = () => ({ code: 400, body: { error: { message: 'Your credit balance is too low' } } }); poner('2026-11-16 08:05'); C.repaso();
  chk('4c sin crédito: reglas, y Claude queda en pausa', C.salen('porque_semana').length === 2 && /crédito/.test(((filas(C)[0] || {}).o || {}).motivo || '') && Number(C.P.IA_PAUSA_HASTA) > RELOJ.ms, ((filas(C)[0] || {}).o || {}).motivo);
  const D = lleno(); D.claude.responder = () => ({ resumen: { txt: 'Se vendieron Bs 77.777.', de: ['E1'] }, porque: [{ txt: 'Todo bien.', de: [] }], mirar: [] }); poner('2026-11-16 08:05'); D.repaso();
  chk('4d lo que contestó Claude no se puede comprobar con los números: reglas', ((filas(D)[0] || {}).o || {}).via === 'reglas' && /no se pudo comprobar/.test(((filas(D)[0] || {}).o || {}).motivo || ''));
  const T = lleno(); T.claude.responder = () => BUENA; T.meta.responder = (b) => (b.template && b.template.name === 'porque_semana') ? { code: 404, body: { error: { code: 132001, message: 'no existe' } } } : null;
  poner('2026-11-16 08:05'); T.repaso();
  const lib = textos(T, '59177000007');
  chk('4e sin la plantilla aprobada: el mismo mensaje como texto libre (y la hoja lo dice)', lib.length === 1 && /🧠 \*La semana del 09 al 15\/11, en palabras\*/.test(lib[0]) && /· Central pasó de Bs 5\.000 a Bs 15\.000\./.test(lib[0]) && /«porque»/.test(lib[0]) &&
      T.hoja('Bot WhatsApp').some(r => /texto libre: porque_semana sin aprobar/.test(String(r[6]))), lib);
});

seccion('5. El botón y la palabra «porque»', () => {
  const S = lleno(); S.claude.responder = () => BUENA; poner('2026-11-16 08:05'); S.repaso(); S.limpiar();
  poner('2026-11-16 09:00'); hook(S, '59177000008', { type: 'button', button: { payload: 'wp|s2026-11-09', text: 'Ver el detalle por tienda' } });
  const t = textos(S, '59177000008').join('\n');
  chk('5a el botón trae la lectura con de dónde sale cada frase', /🧠 \*La semana del 09 al 15\/11\* \(contra la del 02 al 08\/11\)/.test(t) && /Central pasó de Bs 5\.000 a Bs 15\.000\. _\(T1\)_/.test(t), t.slice(0, 400));
  chk('5b y los números por tienda, vendedora, marca, producto y mayoristas', /\*🏬 Por tienda\*\n\[T1\] Tienda Central/.test(t) && /\*🧑‍💼 Por vendedora\*/.test(t) && /\[P1\] Producto SOFT/.test(t) && /\*🏭 Mayoristas\*/.test(t), t.length);
  chk('5c Claude no se vuelve a llamar', S.claude.llamadas.length === 0);
  S.limpiar(); hook(S, '59177000007', { type: 'text', text: { body: '¿Por qué?' } });
  chk('5d «¿Por qué?» trae la última', /La semana del 09 al 15\/11/.test(textos(S, '59177000007').join('\n')), textos(S, '59177000007'));
  S.limpiar(); hook(S, '59177000007', { type: 'text', text: { body: 'porque mes' } });
  chk('5e «porque mes» sin ninguna del mes: lo dice', /Todavía no hay una lectura de un mes/.test(textos(S, '59177000007').join('\n')), textos(S, '59177000007'));
});

seccion('6. El día 1: el mes, después del mes cerrado', () => {
  const S = lleno(); S.cargar([V('d1', 'Carola Chavez', '2026-11-20', 4000, { fecha: '2026-12-02' })]);
  S.claude.responder = (b) => ({ resumen: { txt: 'Noviembre cerró con lo de siempre.', de: ['E1'] }, porque: [{ txt: 'Central creció.', de: ['T1'] }], mirar: [] });
  poner('2026-12-01 10:05'); S.repaso();
  const todos = S.salen().map(x => x.pl), m = S.salen('porque_semana');
  chk('6a a las 10:05 del 01/12 sale el del mes a los dos, después de «cierre_del_mes»', m.length === 2 && todos.indexOf('cierre_del_mes') >= 0 && todos.indexOf('cierre_del_mes') < todos.indexOf('porque_semana'), todos);
  chk('6b {{1}} «Noviembre 2026 entero» y el botón del mes', m[0] && m[0].p[0] === 'Noviembre 2026 entero' && m[0].comp[1].parameters[0].payload === 'wp|m2026-11', m[0] && m[0].p);
  const u = S.claude.llamadas[0].body.messages[0].content;
  chk('6c los números del mes: por el mes en que cuenta la venta (como Proyección), contra octubre', /\[E1\] Equipo noviembre: Bs 45\.000 en 9 ventas/.test(u) && /octubre: Bs 100\.000 en 1 venta/.test(u), u.slice(0, 300));
});

seccion('7. Las acciones del panel: iaSemana e iaPorque', () => {
  const S = lleno(); S.claude.responder = () => BUENA; poner('2026-11-17 10:00');
  let r = S.post({ action: 'iaSemana' });
  chk('7a sin nada guardado: listas vacías y si Claude puede', r.ok && JSON.stringify(r.items) === '{"porque":[],"equipo":[]}' && r.ia === '', r);
  r = S.post({ action: 'iaPorque' });
  chk('7b iaPorque arma la de la semana pasada (09 al 15/11) y la guarda', r.ok && r.item && r.item.k === 's2026-11-09' && S.claude.llamadas.length === 1 && filas(S).length === 1, r.item && r.item.k);
  r = S.post({ action: 'iaPorque' });
  chk('7c otra vez: la guardada, sin pagar', r.ok && r.ya && S.claude.llamadas.length === 1);
  r = S.post({ action: 'iaPorque', otra: 1 });
  chk('7d «otra»: Claude de nuevo, la misma fila', r.ok && !r.ya && S.claude.llamadas.length === 2 && filas(S).length === 1);
  r = S.post({ action: 'iaSemana', tipos: ['porque'] });
  chk('7e iaSemana la devuelve', r.ok && r.items.porque.length === 1 && r.items.porque[0].k === 's2026-11-09' && !r.items.equipo, r.items && Object.keys(r.items));
  S.cache['ia_sem_corre|s2026-11-02'] = '1';
  r = S.post({ action: 'iaPorque', k: 's2026-11-02' });
  chk('7f si otro la está armando: «ocupado» (no se paga dos veces)', !r.ok && r.error === 'ocupado', r);
  const K = lleno({ PANEL_KEY: 'clave-equipo' });
  r = K.post({ action: 'iaSemana' });
  chk('7g pide la clave del equipo', !r.ok && r.error === 'clave', r);
});

seccion('8. 362: iaEquipo', () => {
  const S = lleno(); poner('2026-11-16 10:00');
  const DATOS = [
    { vend: 'Isabel Robledo', tienda: 'Central', semanas: [5000, 5000, 15000], ventas4: 5, factura: { sin: 18, de: 18 }, avisos: { dia: 3 } },
    { vend: 'Carola Chavez', tienda: 'Tienda Banzer', semanas: [0, 5000, 12000], ventas4: 3, factura: { sin: 0, de: 3 } },
    { vend: 'Maria Flores', tienda: 'Buenos Aires', semanas: [0, 0, 3000], ventas4: 1, cruzada: { colchones: 9, con: 0 } }
  ];
  const VIDEOS = [{ k: 'pedido', t: 'Cómo cargar un pedido' }, { k: 'pago', t: 'Cómo cobrar el saldo' }];
  S.claude.responder = () => ({ personas: [
    { vend: 'Maria Flores', necesita: true, bien: 'Cargó 3000 esta semana.', cuesta: 'De 9 colchones, 0 llevaron almohada o protector.', ayuda: 'Mostrarle cómo ofrecer el protector: 5 minutos.', video: 'nada' },
    { vend: 'Isabel Robledo', necesita: true, bien: 'Vendió Bs 15000 la última semana.', cuesta: 'Ninguna de sus 18 ventas tiene N° de factura o remisión.', ayuda: 'Que lo anote 5 minutos con Contabilidad.', video: 'pago' },
    { vend: 'Carola Chavez', necesita: false, bien: '', cuesta: '', ayuda: '', video: '' },
    { vend: 'Pedro Inventado', necesita: true, bien: 'x', cuesta: 'y', ayuda: 'z', video: '' },
    { vend: 'Isabel Robledo', necesita: true, bien: 'repetida', cuesta: 'repetida', ayuda: 'repetida', video: '' }] });
  let r = S.post({ action: 'iaEquipo', semana: '2026-11-18', datos: DATOS, videos: VIDEOS });
  const it = r.item || {};
  chk('8a la semana es la del lunes (16/11) y se guarda «e2026-11-16»', r.ok && it.semana === '2026-11-16' && filas(S).some(x => x.k === 'e2026-11-16' && x.tipo === 'equipo'), r);
  chk('8b solo quien necesita, por NOMBRE (nunca un ranking), sin el inventado ni la repetida; el resto aparte',
      JSON.stringify((it.personas || []).map(p => p.vend)) === '["Isabel Robledo","Maria Flores"]' && JSON.stringify(it.resto) === '["Carola Chavez"]', it);
  const isa = (it.personas || [])[0] || {}, mar = (it.personas || [])[1] || {};
  chk('8c un número que no está en SUS datos se va (María: «3000» sí está; Isabel: «15000» sí); el video de la lista o nada', isa.video === 'pago' && mar.video === '' && isa.bien === 'Vendió Bs 15000 la última semana.' && mar.bien === 'Cargó 3000 esta semana.', [isa, mar]);
  const sys = S.claude.llamadas[0].body;
  chk('8d a Claude: sin culpar, sin comparar, sus datos y los videos; esquema JSON', /Sin culpar/.test(sys.system) && /Nunca compares a una persona con otra ni armes un ranking/.test(sys.system) &&
      /<videos>\npedido: Cómo cargar un pedido/.test(sys.messages[0].content) && /"vend":"Isabel Robledo"/.test(sys.messages[0].content) && sys.output_config.format.type === 'json_schema');
  r = S.post({ action: 'iaEquipo', semana: '2026-11-16', datos: DATOS, videos: VIDEOS });
  chk('8e otra vez la misma semana: la guardada, sin pagar', r.ok && r.ya && S.claude.llamadas.length === 1);
  r = S.post({ action: 'iaEquipoHable', semana: '2026-11-16', vend: 'Isabel Robledo' });
  chk('8f «Ya hablé con ella» queda en la fila de la semana', r.ok && r.hab && r.hab['isabel robledo'] > 0 && ((filas(S).find(x => x.k === 'e2026-11-16') || {}).o || {}).hab['isabel robledo'] > 0, r);
  S.claude.responder = () => ({ personas: [{ vend: 'Maria Flores', necesita: true, bien: '', cuesta: 'Le cuesta 77 cosas.', ayuda: 'Ayuda con 88.', video: '' }] });
  r = S.post({ action: 'iaEquipo', semana: '2026-11-16', datos: DATOS, videos: VIDEOS, otra: 1 });
  chk('8g «otra»: Claude de nuevo, conserva «Ya hablé»; quien queda sin lo que le cuesta ni cómo ayudar no sale', r.ok && !r.ya && S.claude.llamadas.length === 2 && r.item.hab['isabel robledo'] > 0 &&
      r.item.personas.length === 0 && r.item.resto.length === 3, r.item);
  r = S.post({ action: 'iaEquipoHable', semana: '2026-11-16', vend: 'Isabel Robledo', si: false });
  chk('8h deshacer «Ya hablé»', r.ok && !r.hab['isabel robledo'], r);
  chk('8i sin semana o sin datos: un «no» claro', S.post({ action: 'iaEquipo', datos: DATOS }).error === 'sin_semana' && S.post({ action: 'iaEquipo', semana: '2026-11-23', datos: [] }).error === 'sin_datos');
  const T = lleno({ IA_SEMANA_TOPE_DIA: '1' }); T.claude.responder = () => ({ personas: [] }); poner('2026-11-16 10:00');
  T.post({ action: 'iaEquipo', semana: '2026-11-16', datos: DATOS });
  r = T.post({ action: 'iaEquipo', semana: '2026-11-23', datos: DATOS });
  chk('8j el tope del día (IA_SEMANA_TOPE_DIA)', !r.ok && r.error === 'tope' && T.claude.llamadas.length === 1, r);
  const A = lleno({ IA_ACTIVA: '0' });
  r = A.post({ action: 'iaEquipo', semana: '2026-11-16', datos: DATOS });
  chk('8k Claude apagado: «ia_apagada», nada guardado', !r.ok && r.error === 'ia_apagada' && filas(A).length === 0, r);
});

seccion('9. probarAntesDeImplementar', () => {
  const S = lleno(); poner('2026-11-16 10:00');
  const pr = S.ctx.probarAntesDeImplementar(), L = pr.lineas.filter(l => /porqué|porque_semana|IA semanal/.test(l));
  chk('9a dice a quién va, si Claude puede y la hoja, sin ❌ por esto', L.some(l => /El porqué de la semana sale los lunes a las 08:00/.test(l) && /Eduardo y Jefe/.test(l)) &&
      L.some(l => /la hoja «IA semanal» tiene 0 lectura/.test(l)) && !pr.lineas.some(l => /^❌/.test(l) && /porqu|equipo|IA semanal/.test(l)), L);
});

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
