/* 🔀 (20/11) «TU CLIENTE ACABA DE COMPRAR» — dueño: al cargar un pedido, si otra asesora (de la MISMA marca) lo está atendiendo según
   Kommo, a ella le llega un WhatsApp UNA vez; la venta nunca se frena. Servidor 2026-11-20-c (cruce*) + el cartel del formulario.

   LO QUE CUIDA (el .gs real con un Kommo y un Meta de mentira; datos INVENTADOS):
   1. Se encola solo una venta NUEVA (no al corregirla) de una vendedora de Heaven o Sueña, OC, con celular; no ATC, ni Eduardo, ni
      un borrador de Kommo, ni con el bot apagado.
   2. Espera un minuto antes de mirar.
   3. La regla de «¿Quién lo atiende?»: Isabel le vende a la clienta que atendía Carola (conversaron hace 3 días) → un mensaje a Carola.
      La que vendió era la que atendía → nada. Una vendedora de la OTRA marca → nada (dueño: «c no»). Lead perdido no retiene.
   4. Una sola vez: otra vuelta, o corregir el pedido, no manda otra.
   5. Kommo no contesta → se vuelve a probar (CRUCE_INTENTOS) y después se deja; Sueña sin token → nada, sin reintentar.
   6. El mensaje: `asesora_cliente_compro` al celular de Carola de WA_VENDEDORAS, con los 7 datos en orden; sin su número, anotado.
   7. La plantilla tiene los mismos 7 datos que el ejemplo, y el cuerpo entra en el tope de Meta.
   8. Página: el cartel en «Nuevo pedido» (solo avisa) con CRUCE_PRUEBA; nada al editar ni para la otra marca.
   Se corre:  node tests/test_cruce_ventas.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return { _datos:datos, getLastRow:() => datos.length, getLastColumn:() => (datos[0] || []).length,
    getDataRange:() => ({ getValues:() => datos.map(f => f.slice()) }), setFrozenRows:() => {}, appendRow:(r) => { datos.push(r.slice()); },
    deleteRow:(n) => { datos.splice(n - 1, 1); }, deleteRows:(n, k) => { datos.splice(n - 1, k); },
    getRange:(fila, col, nF, nC) => ({
      getValue:() => (datos[fila - 1] || [])[col - 1], setValue:(v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues:() => { const out = []; for (let i = 0; i < (nF || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nC || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues:(v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight:() => {}, setNumberFormat:() => {} }) };
}
const RELOJ = { ms:Date.parse('2026-11-20T15:00:00-04:00') };
const S = () => Math.floor(RELOJ.ms / 1000), H = 3600, D = 86400;
class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(RELOJ.ms); } static now() { return RELOJ.ms; } }
const pasar = (min) => { RELOJ.ms += min * 60000; };
const U_CAR = 901, U_ISA = 903, U_MAU = 950;

/* Kommo de mentira (la forma de test_quien_atiende): la clienta 70011122 conversó con CAROLA hace 3 días (Heaven). */
function kommoHeaven(o) {
  o = o || {};
  const K = { usuarios:{ _embedded:{ users:[{ id:U_CAR, name:'Carola Chavez - Tienda Banzer' }, { id:U_ISA, name:'Isabel Robledo - Central' }] } },
    pipelines:{ _embedded:{ pipelines:[{ id:500, name:'Ventas', _embedded:{ statuses:[{ id:103, name:'Cotizacion enviada' }, { id:142, name:'Logrado' }, { id:143, name:'Perdido' }] } }] } },
    contactos:{ 61:{ id:61, name:'CLIENTA INVENTADA', custom_fields_values:[{ field_code:'PHONE', values:[{ value:'+591 70011122' }] }], _embedded:{ leads:[{ id:71 }] } } },
    leads:{ 71:{ id:71, name:'Lead 71', status_id:o.perdido ? 143 : 103, pipeline_id:500, responsible_user_id:U_CAR, created_at:S() - 20 * D, updated_at:S() - 3 * D } },
    eventos:[{ c:61, type:'incoming_chat_message', entity_type:'lead', entity_id:71, created_at:S() - 3 * D, created_by:0 },
             { c:61, type:'outgoing_chat_message', entity_type:'lead', entity_id:71, created_at:S() - 3 * D + 2 * H, created_by:U_CAR }],
    tareas:[] };
  return K;
}
function servidor(props, K, ops) {
  ops = ops || {};
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({ WA_ACTIVO:'1', WA_TOKEN:'tok', WA_PHONE_ID:'123', KOMMO_TOKEN:'k-heaven' }, props || {});
  Object.keys(P).forEach(k => { if (P[k] == null) delete P[k]; });
  const meta = [], kommo = [], cache = { _m:{}, get(k) { return this._m[k] != null ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll() {}, remove(k) { delete this._m[k]; }, removeAll() {} };
  const resp = (code, o) => ({ getResponseCode:() => code, getContentText:() => o == null ? '' : JSON.stringify(o) });
  const qs = (u) => { const q = {}; (u.split('?')[1] || '').split('&').forEach(p => { if (!p) return; const i = p.indexOf('='), k = decodeURIComponent(i < 0 ? p : p.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(p.slice(i + 1)); (q[k] = q[k] || []).push(v); }); return q; };
  const ctx = {
    console, Date:FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent,
    SpreadsheetApp:{ getActiveSpreadsheet:() => ({ getSheetByName:(n) => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet:(n) => (hojas[n] = hacerPlanilla([])) }), flush() {} },
    PropertiesService:{ getScriptProperties:() => ({ getProperty:(k) => P[k] != null ? P[k] : null, getProperties:() => Object.assign({}, P), setProperty:(k, v) => { P[k] = String(v); }, deleteProperty:(k) => { delete P[k]; }, setProperties:(o) => Object.assign(P, o) }) },
    LockService:{ getScriptLock:() => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService:{ getScriptCache:() => cache },
    ContentService:{ MimeType:{ JSON:'json' }, createTextOutput:(t) => ({ _t:t, setMimeType() { return this; } }) },
    DriveApp:{}, Utilities:{ formatDate:(d) => String(d) }, Logger:{ log() {} },
    Session:{ getScriptTimeZone:() => 'America/La_Paz', getTemporaryActiveUserKey:() => 'ABCDEFGH' },
    ScriptApp:{ newTrigger:() => ({ timeBased:() => ({ after:() => ({ create:() => ({}) }), everyMinutes:() => ({ create:() => ({}) }) }) }), getProjectTriggers:() => [], deleteTrigger:() => {} },
    UrlFetchApp:{ fetch:(url, op) => {
      op = op || {};
      if (/graph\.facebook\.com/.test(url)) { const body = op.payload ? JSON.parse(op.payload) : null; meta.push(body); return resp(200, { messages:[{ id:'wamid.' + meta.length }] }); }
      const host = url.split('/api/v4')[0], ruta = url.split('/api/v4')[1] || '', p = ruta.split('?')[0], q = qs(ruta);
      kommo.push({ host, p });
      if (String(op.method || 'get').toLowerCase() !== 'get') return resp(405, {});
      if (/gerencia/.test(host)) return ops.suena ? ops.suena(p, q) : resp(204, null);
      if (ops.falla) return resp(500, {});
      if (p === '/users') return resp(200, K.usuarios);
      if (p === '/leads/pipelines') return resp(200, K.pipelines);
      if (p === '/contacts') { const t = (q.query || [''])[0]; const cs = Object.values(K.contactos).filter(c => c.custom_fields_values[0].values.some(v => String(v.value).replace(/\D/g, '').indexOf(t) >= 0)); return cs.length ? resp(200, { _embedded:{ contacts:cs } }) : resp(204, null); }
      if (p === '/leads') { const L = (q['filter[id][]'] || []).map(i => K.leads[i]).filter(Boolean); return L.length ? resp(200, { _embedded:{ leads:L } }) : resp(204, null); }
      if (p === '/events') {
        const ent = (q['filter[entity][]'] || [])[0], ids = q['filter[entity_id][]'] || [], tipos = q['filter[type][]'] || [], desde = Number((q['filter[created_at][from]'] || ['0'])[0]), hasta = Number((q['filter[created_at][to]'] || ['0'])[0]) || 9e12;
        if (ent !== 'contact') return resp(204, null);
        const E = K.eventos.filter(e => ids.indexOf(String(e.c)) >= 0 && tipos.indexOf(e.type) >= 0 && e.created_at >= desde && e.created_at <= hasta).sort((a, b) => b.created_at - a.created_at);
        return E.length ? resp(200, { _embedded:{ events:E } }) : resp(204, null);
      }
      if (p === '/tasks') return ops.tareas500 ? resp(500, {}) : resp(204, null);
      return resp(404, {});
    } }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData:{ contents:JSON.stringify(b) }, parameter:{} })._t);
  const guardar = (rec) => { const r = post({ action:'save', pedido:rec }); if (r.ok) rec.rev = r.pedido.rev; return r; };
  const cola = () => JSON.parse(P.CRUCE_COLA || '[]');
  const cx = () => meta.filter(b => b && b.template && b.template.name === 'asesora_cliente_compro');
  return { ctx, sh, P, meta, kommo, post, guardar, cola, cx, hoja:() => (hojas['Bot WhatsApp'] ? hojas['Bot WhatsApp']._datos.slice(1) : []) };
}
let nId = 0;
function ped(o) {
  return Object.assign({ id:'c' + (++nId), fecha:'2026-11-25', oc:'11-3' + (10 + nId), vendedor:'Isabel Robledo', cliente:'CLIENTA INVENTADA',
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:1, precio:4200 }], celular:'70011122', turno:'AM', zona:'Norte',
    direccion:'Calle Falsa 1', maps:'https://www.google.com/maps?q=-17.75,-63.18', pagado:false, saldo:4200, ts:RELOJ.ms, metodoPago:'', observaciones:'',
    estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'900', acuenta:0, facturarA:'', nit:'', rev:0 }, o || {});
}
const VEND = { WA_VENDEDORAS:'Carola Chavez:70000001, Isabel Robledo:70000002, Mauricio Merida:70000003' };

console.log('\n── 1. Qué se encola ──');
{
  const A = servidor(VEND, kommoHeaven());
  const p1 = ped(); A.guardar(p1);
  chk('a. una venta NUEVA de Isabel (Heaven, OC, con celular) entra a CRUCE_COLA', A.cola().length === 1 && A.cola()[0].id === p1.id, A.cola());
  p1.observaciones = 'corregida'; A.guardar(p1);
  chk('b. corregirla no la vuelve a encolar', A.cola().length === 1);
  A.guardar(ped({ oc:'ATC 11-050' }));
  A.guardar(ped({ vendedor:'Eduardo Añez' }));
  A.guardar(ped({ celular:'' }));
  A.guardar(ped({ id:'kommo-999', estado:'Borrador Kommo', fecha:'' }));
  chk('c. ATC, Eduardo, sin celular y un borrador de Kommo: no', A.cola().length === 1, A.cola().map(x => x.id));
  const B = servidor(Object.assign({}, VEND, { WA_ACTIVO:null }), kommoHeaven());
  B.guardar(ped());
  chk('d. con el bot apagado, nada', B.cola().length === 0);
}

console.log('\n── 2-4. La regla, una sola vez ──');
{
  const A = servidor(VEND, kommoHeaven());
  const p1 = ped(); A.guardar(p1);
  A.ctx.waRepaso();
  chk('2. antes del minuto no se mira (ni se le pregunta a Kommo)', A.cx().length === 0 && A.cola().length === 1 && !A.kommo.length, A.cola());
  pasar(2); A.ctx.waRepaso();
  const m = A.cx();
  chk('⚠️ 3a. Isabel le vendió a la clienta que atendía Carola → UN WhatsApp a Carola', m.length === 1 && m[0].to === '59170000001', m.map(x => x.to));
  const P = m.length ? m[0].template.components[0].parameters.map(x => x.text) : [];
  chk('6a. los 7 datos: Carola, la clienta, …1122, Isabel Robledo, OC, productos, cuándo', P.length === 7 && P[0] === 'Carola' && P[1] === 'CLIENTA INVENTADA' && P[2] === '1122' &&
    P[3] === 'Isabel Robledo' && P[4] === 'OC ' + p1.oc && /TITANIO ICE/.test(P[5]) && /20\/11/.test(P[6]), P);
  chk('3b. la cola quedó vacía', A.cola().length === 0);
  pasar(10); A.ctx.waRepaso();
  p1.observaciones = 'otra corrección'; A.guardar(p1); pasar(5); A.ctx.waRepaso();
  chk('⚠️ 4. otra vuelta y corregir el pedido NO mandan otro', A.cx().length === 1, A.cx().length);
  chk('4b. la hoja «Bot WhatsApp» lo anota como enviado', A.hoja().some(f => f[3] === 'Vendedora: su cliente compró con otra' && /enviado/.test(f[7])), A.hoja().map(f => f[3] + ' ' + f[7]));

  const C = servidor(VEND, kommoHeaven());
  C.guardar(ped({ vendedor:'Carola Chavez' })); pasar(2); C.ctx.waRepaso();
  chk('3c. la que vendió ERA la que atendía (Carola) → nada', C.cx().length === 0 && C.cola().length === 0, C.cx().length);
  const M = servidor(VEND, kommoHeaven());
  M.guardar(ped({ vendedor:'Mauricio Merida' })); pasar(2); M.ctx.waRepaso();
  chk('⚠️ 3d. Mauricio (Sueña) le vende a una clienta de Carola (Heaven): OTRA marca → nada', M.cx().length === 0, M.cx().length);
  const L = servidor(VEND, kommoHeaven({ perdido:true }));
  L.guardar(ped()); pasar(2); L.ctx.waRepaso();
  chk('3e. el lead de Carola está PERDIDO: no retiene → nada', L.cx().length === 0);
}

console.log('\n── 5. Kommo no contesta ──');
{
  const A = servidor(VEND, kommoHeaven(), { falla:true });
  A.guardar(ped()); pasar(2); A.ctx.waRepaso();
  chk('a. Kommo con error: no se manda y vuelve a la cola (intento 1)', A.cx().length === 0 && A.cola().length === 1 && A.cola()[0].n === 1, A.cola());
  pasar(6); A.ctx.waRepaso(); pasar(6); A.ctx.waRepaso();
  chk('b. al tercer intento se deja (CRUCE_HECHO lo recuerda) y no se reintenta más', A.cola().length === 0 && JSON.parse(A.P.CRUCE_HECHO || '{}')[Object.keys(JSON.parse(A.P.CRUCE_HECHO || '{}'))[0]].s === 'Kommo no contestó', A.P.CRUCE_HECHO);
  const B = servidor(VEND, kommoHeaven());
  B.guardar(ped({ vendedor:'Mauricio Merida' })); pasar(2); B.ctx.waRepaso();
  chk('c. Sueña SIN token: nada y sin reintentar', B.cx().length === 0 && B.cola().length === 0 && /sin token/.test(B.P.CRUCE_HECHO || ''), B.P.CRUCE_HECHO);
}

console.log('\n── 6. Sin el número de la asesora ──');
{
  const A = servidor({ WA_VENDEDORAS:'Isabel Robledo:70000002' }, kommoHeaven());
  A.guardar(ped()); pasar(2); A.ctx.waRepaso();
  chk('6b. Carola sin número en WA_VENDEDORAS: no sale y queda anotado por qué', A.cx().length === 0 && A.hoja().some(f => /no está en WA_VENDEDORAS/.test(f[8] || '')), A.hoja().map(f => f[7] + ' ' + f[8]));
}

console.log('\n── 9. Revisión de Fable ──');
{
  /* 1 · la venta que llega por la bandeja de Kommo: el borrador ya era una fila; al completarlo es la venta nueva */
  const A = servidor(VEND, kommoHeaven());
  const b = ped({ id:'kommo-777', estado:'Borrador Kommo', fecha:'', oc:'' }); A.guardar(b);
  chk('1a. el borrador solo no entra', A.cola().length === 0);
  b.estado = ''; b.fecha = '2026-11-26'; b.oc = '11-399'; A.guardar(b);
  chk('⚠️ 1b. completarlo desde «Ventas de Kommo por cargar» SÍ entra (es la venta)', A.cola().length === 1 && A.cola()[0].id === 'kommo-777', A.cola());
  b.observaciones = 'corrijo'; A.guardar(b);
  pasar(2); A.ctx.waRepaso();
  chk('1c. …sale UN aviso a Carola, y corregirla después no agrega otro', A.cx().length === 1 && A.cola().length === 0, A.cx().length);
  /* 2 · WA_PRUEBA */
  const P2 = servidor(Object.assign({ WA_PRUEBA:'59179999999' }, VEND), kommoHeaven());
  P2.guardar(ped()); pasar(2); P2.ctx.waRepaso();
  chk('⚠️ 2. con WA_PRUEBA el aviso va al número de prueba, no al de Carola', P2.cx().length === 1 && P2.cx()[0].to === '59179999999', P2.cx().map(x => x.to));
  /* 4 · /users falla: no se adivina quién es quién; se reintenta */
  const K4 = kommoHeaven(); delete K4.usuarios;
  const U = servidor(VEND, K4);
  U.guardar(ped()); pasar(2); U.ctx.waRepaso();
  chk('4. sin los nombres de los usuarios: nada a «usuario 901» y la venta vuelve a la cola', U.cx().length === 0 && U.cola().length === 1 && U.cola()[0].n === 1 && !U.hoja().some(f => /usuario 9/.test(f[4] || '')), { cola:U.cola(), hoja:U.hoja().map(f => f[4]) });
  /* 7 · dos pedidos al mismo cliente en 48 h: un aviso */
  const D2 = servidor(VEND, kommoHeaven());
  D2.guardar(ped()); D2.guardar(ped({ productos:[{ desc:'SOMIER ORO', medida:'140x190', codigo:'S1', cant:1, precio:1500 }] }));
  pasar(2); D2.ctx.waRepaso();
  chk('⚠️ 7. dos pedidos de Isabel a la misma clienta de Carola: UN solo aviso a Carola', D2.cx().length === 1, D2.cx().length);
  /* 9 · quien conversó no es del equipo de la marca (un administrador): nada, y no le llega a otra con el mismo primer nombre */
  const K9 = kommoHeaven(); K9.usuarios._embedded.users.push({ id:990, name:'Carola Admin' });
  K9.eventos.forEach(e => { if (e.created_by === U_CAR) e.created_by = 990; });
  const N9 = servidor(VEND, K9);
  N9.guardar(ped()); pasar(2); N9.ctx.waRepaso();
  chk('9. conversó un usuario que no es vendedora («Carola Admin»): no se avisa a nadie', N9.cx().length === 0 && !N9.hoja().some(f => f[3] === 'Vendedora: su cliente compró con otra'), N9.hoja().map(f => f[3] + ' ' + f[4]));
  /* 8 · CRUCE_HECHO no pasa el tope de letras */
  const H8 = servidor(VEND, kommoHeaven());
  const h = {}; for (let i = 0; i < 400; i++) h['p' + i] = { t:1795000000 + i, c:'7001' + String(i).padStart(4, '0'), a:['Carola Chavez'] };
  H8.P.CRUCE_HECHO = JSON.stringify(h); H8.guardar(ped()); pasar(2); H8.ctx.waRepaso();
  chk('8. CRUCE_HECHO queda por debajo de las 7.000 letras', (H8.P.CRUCE_HECHO || '').length > 0 && (H8.P.CRUCE_HECHO || '').length <= 7000, (H8.P.CRUCE_HECHO || '').length);
  /* 6 · el tope del formulario es aparte */
  const T6 = servidor(VEND, kommoHeaven());
  for (let i = 0; i < 80; i++) T6.post({ action:'quienAtiende', cel:'70011122', quien:'Isabel Robledo' });
  const rm = T6.post({ action:'quienAtiende', cel:'70011122', quien:'Isabel Robledo' }), ra = T6.post({ action:'quienAtiende', cel:'70011122', quien:'Isabel Robledo', auto:1 });
  chk('6. con las 80 búsquedas a mano gastadas, la del formulario (auto) sigue andando', rm.ok === false && rm.error === 'tope' && ra.ok !== false, { rm:rm.error, ra:ra.ok });
}

console.log('\n── 10. Segunda revisión de Fable ──');
{
  /* 5 · al mismo cliente le vende OTRA vendedora dentro de las 48 h: es otro aviso */
  const A = servidor(VEND, kommoHeaven());
  A.guardar(ped()); pasar(2); A.ctx.waRepaso();
  pasar(30); A.guardar(ped({ vendedor:'Maria Flores' })); pasar(2); A.ctx.waRepaso();
  const P = A.cx().map(m => m.template.components[0].parameters[3].text);
  chk('⚠️ 5. Isabel vende y 30 min después Maria a la misma clienta: Carola recibe DOS avisos (uno por cada vendedora)', A.cx().length === 2 && P[0] === 'Isabel Robledo' && P[1] === 'Maria Flores', P);
  pasar(30); A.guardar(ped({ vendedor:'Maria Flores' })); pasar(2); A.ctx.waRepaso();
  chk('5b. otra venta de Maria a la misma clienta: no repite', A.cx().length === 2, A.cx().length);
  /* 4 · sin el número de la asesora, CRUCE_HECHO no guarda el celular ni la cuenta como avisada */
  const B = servidor({ WA_VENDEDORAS:'Isabel Robledo:70000002' }, kommoHeaven());
  B.guardar(ped()); pasar(2); B.ctx.waRepaso();
  const hb = JSON.parse(B.P.CRUCE_HECHO || '{}'), vb = hb[Object.keys(hb)[0]] || {};
  chk('4. Carola sin número: CRUCE_HECHO lo recuerda sin celular ni asesoras (no la da por avisada)', Object.keys(hb).length === 1 && !vb.c && !vb.a, vb);
  B.P.WA_VENDEDORAS = VEND.WA_VENDEDORAS; pasar(5); B.guardar(ped()); pasar(2); B.ctx.waRepaso();
  chk('4b. ya con su número, la venta siguiente a esa clienta SÍ le llega', B.cx().length === 1, B.cx().length);
  /* (revisión 3) falla la lectura de las TAREAS: no se da por mirada, se reintenta */
  const KT = kommoHeaven(); KT.eventos = [];   // sin conversación: solo una tarea la podría retener
  const T = servidor(VEND, KT, { tareas500:true });
  T.guardar(ped()); pasar(2); T.ctx.waRepaso();
  chk('3ª. Kommo no deja leer las tareas: la venta vuelve a la cola (intento 1), no se da por mirada', T.cola().length === 1 && T.cola()[0].n === 1, T.cola());
  /* 6 · lo que preguntó el formulario un momento antes sirve: el cruce no vuelve a llamar a Kommo */
  const okSuena = (p) => p === '/users' ? { getResponseCode:() => 200, getContentText:() => JSON.stringify({ _embedded:{ users:[{ id:13073611, name:'Mauricio Merida' }] } }) }
    : p === '/leads/pipelines' ? { getResponseCode:() => 200, getContentText:() => JSON.stringify({ _embedded:{ pipelines:[] } }) } : { getResponseCode:() => 204, getContentText:() => '' };
  const C = servidor(Object.assign({ KOMMO_TOKEN_SUENA:'k-suena' }, VEND), kommoHeaven(), { suena:okSuena });
  const rf = C.post({ action:'quienAtiende', cel:'70011122', quien:'Isabel Robledo', auto:1 });
  chk('6a. (la consulta completa de las dos cuentas salió entera)', rf.ok !== false && !rf.incompleto && rf.cuentas.length === 2, { inc:rf.incompleto, c:(rf.cuentas || []).map(c => c.marca) });
  const antes = C.kommo.length;
  C.guardar(ped()); pasar(1.2); C.ctx.waRepaso();
  chk('6. con la consulta completa del formulario a la mano, el cruce no le pregunta nada a Kommo y avisa igual', C.kommo.length === antes && C.cx().length === 1, { antes, despues:C.kommo.length, cx:C.cx().length });
}

console.log('\n── 7. La plantilla ──');
{
  const A = servidor(VEND, kommoHeaven());
  const pl = A.ctx.WA_PLANTILLAS.filter(x => x.n === 'asesora_cliente_compro')[0];
  const nums = pl ? (pl.t.match(/\{\{(\d+)\}\}/g) || []).map(x => Number(x.replace(/\D/g, ''))) : [];
  chk('a. existe, con los datos 1 a 7 y un ejemplo de 7', pl && Math.max.apply(null, nums) === 7 && new Set(nums).size === 7 && pl.e.length === 7, nums);
  chk('b. WA_TIPOS.cx la nombra y la versión es la 2026-11-20-c', A.ctx.WA_TIPOS.cx && A.ctx.WA_TIPOS.cx.plantilla === 'asesora_cliente_compro' && A.ctx.SCRIPT_VERSION === '2026-11-20-c' && A.ctx.FIN_DEL_ARCHIVO === '2026-11-20-c');
  const lleno = pl.t.replace(/\{\{(\d+)\}\}/g, (_, i) => pl.e[i - 1]);
  chk('c. el cuerpo lleno entra en 1.000 letras', lleno.length < 1000, lleno.length);
}

console.log('\n── 8. La página: el cartel en «Nuevo pedido» ──');
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('(sin playwright: se saltea la página)'); fin(); return; }
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.route(/^https:\/\//, r => r.abort());
  await pg.addInitScript(() => { window.CRUCE_PRUEBA = 1; });
  await pg.goto('file://' + PEDIDOS);
  await pg.waitForFunction(() => typeof cruceFormPintar === 'function');
  const ahora = S();
  const res = await pg.evaluate(async (ahora) => {
    SERVER_VER = '2026-11-20-c';
    var llamadas = 0;
    window.CRUCE_BODY = null;
    window.apiPost = function (b) {
      if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok:true, pedidos:[] });
      llamadas++; window.CRUCE_BODY = b;
      return Promise.resolve({ ok:true, ahora:ahora, cuentas:[{ marca:'heaven', contactos:1, leads:[{ id:'71', resp:'Carola Chavez', pares:[{ ts:ahora - 3 * 86400 + 7200, desde:ahora - 3 * 86400 + 7200, quien:'Carola Chavez' }] }] }, { marca:'suena', contactos:0, leads:[] }] });
    };
    window.CRUCE_ESPERA_MS = 10;
    showView('form'); resetForm();
    var set = function (id, v) { var e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011122');
    await new Promise(r => setTimeout(r, 300));
    var box = document.getElementById('cruce-form'), out = { isabel:!box.hidden ? box.textContent : '', llamadas:llamadas };
    set('f-vendedor', 'Carola Chavez'); await new Promise(r => setTimeout(r, 300));
    out.carola = box.hidden ? '' : box.textContent;
    set('f-vendedor', 'Mauricio Merida'); await new Promise(r => setTimeout(r, 300));
    out.mauricio = box.hidden ? '' : box.textContent;
    set('f-vendedor', 'Isabel Robledo'); await new Promise(r => setTimeout(r, 300));
    out.auto = window.CRUCE_BODY && window.CRUCE_BODY.auto === 1;
    out.llamadasTotal = llamadas;
    EDIT_ID = 'x1'; cruceFormPintar(); out.editando = box.hidden;
    return out;
  }, ahora);
  chk('⚠️ 8a. Isabel con el celular de una clienta de Carola: el cartel lo dice y avisa que a Carola le llega un WhatsApp', /lo está atendiendo Carola Chavez/.test(res.isabel) && /no se frena nada/.test(res.isabel) && /WhatsApp/.test(res.isabel), res.isabel);
  chk('8b. si la que carga es Carola: nada', res.carola === '', res.carola);
  chk('8c. si la que carga es de la otra marca (Mauricio): nada', res.mauricio === '', res.mauricio);
  chk('8d. al editar un pedido: nada', res.editando === true);
  chk('8f. la consulta del formulario va con `auto` (tope aparte) y el mismo celular no se vuelve a preguntar al cambiar de vendedora', res.auto && res.llamadasTotal === 1, res);
  const g = await pg.evaluate(() => { return { boton:!!document.querySelector('#cruce-form button'), guarda:typeof submitPedido === 'function' }; });
  chk('8e. el cartel no tiene botones ni frena: solo avisa', !g.boton && g.guarda);

  /* Segunda revisión de Fable: el borrador de Kommo (vive en BORRADORES), lo incompleto, el tope y el número que cambia */
  const r2 = await pg.evaluate(async (ahora) => {
    var espera = (ms) => new Promise(r => setTimeout(r, ms));
    var resp = function (inc) { return { ok:true, ahora:ahora, incompleto:inc ? 1 : 0, cuentas:[{ marca:'heaven', contactos:1, error:inc ? 'falló: 500' : undefined, leads:inc ? [] : [{ id:'71', resp:'Carola Chavez', pares:[{ ts:ahora - 3 * 86400 + 7200, desde:ahora - 3 * 86400 + 7200, quien:'Carola Chavez' }] }] }] }; };
    var set = function (id, v) { var e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
    var box = document.getElementById('cruce-form'), out = {};
    window.CRUCE_REINT_MS = 20; window.CRUCE_ESPERA_MS = 10;
    var modo = 'bien', n = 0, cels = [];
    window.apiPost = function (b) { if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok:true, pedidos:[] }); n++; cels.push(b.cel);
      if (modo === 'tope') return Promise.resolve({ ok:false, error:'tope' });
      if (modo === 'inc') { modo = 'bien'; return Promise.resolve(resp(true)); }
      return Promise.resolve(resp(false)); };
    /* g · completar un borrador de Kommo */
    resetForm(); CRUCE_MEMO = {};
    BORRADORES = [{ id:'kommo-71', estado:BORRADOR_EST, vendedor:'Isabel Robledo', celular:'70011122' }];
    EDIT_ID = 'kommo-71'; set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011122'); await espera(200);
    out.borrador = box.hidden ? '' : box.textContent;
    BORRADORES = []; EDIT_ID = null;
    /* h · Kommo contestó a medias sin nadie: vuelve a preguntar y al rato lo ve */
    resetForm(); CRUCE_MEMO = {}; CRUCE_F.k = ''; modo = 'inc'; n = 0;
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011133'); await espera(300);
    out.inc = { n:n, txt:box.hidden ? '' : box.textContent };
    /* h2 · la OTRA marca a medias (Sueña sin token o caída) no hace reintentar */
    resetForm(); CRUCE_MEMO = {}; CRUCE_F.k = ''; n = 0;
    window.apiPost = function (b) { if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok:true, pedidos:[] }); n++;
      return Promise.resolve({ ok:true, ahora:ahora, incompleto:1, cuentas:[{ marca:'heaven', contactos:0, leads:[] }, { marca:'suena', leads:[], error:'falló: 500' }] }); };
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011177'); await espera(300);
    out.otraMarca = n;
    window.apiPost = function (b) { if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok:true, pedidos:[] }); n++; cels.push(b.cel);
      if (modo === 'tope') return Promise.resolve({ ok:false, error:'tope' });
      return Promise.resolve(resp(false)); };
    /* i · con el tope del día no se insiste */
    resetForm(); CRUCE_MEMO = {}; CRUCE_F.k = ''; modo = 'tope'; n = 0;
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011144'); await espera(300);
    out.tope = n;
    /* j · el número cambia antes de que corra la consulta: solo se pregunta el último */
    resetForm(); CRUCE_MEMO = {}; CRUCE_F.k = ''; modo = 'bien'; n = 0; cels = []; window.CRUCE_ESPERA_MS = 80;
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011155'); await espera(20); set('f-celular', '70011166'); await espera(250);
    out.cambia = cels.slice();
    return out;
  }, ahora);
  chk('⚠️ 8g. completando un borrador de Kommo (está en BORRADORES, no en la lista): el cartel sale', /lo está atendiendo Carola Chavez/.test(r2.borrador), r2.borrador);
  chk('8h. Kommo contestó a medias y sin nadie: vuelve a preguntar y el cartel aparece', r2.inc.n === 2 && /Carola Chavez/.test(r2.inc.txt), r2.inc);
  chk('8h2. Heaven contestó bien y Sueña está caída: una sola consulta (la otra marca no hace reintentar)', r2.otraMarca === 1, r2.otraMarca);
  chk('8i. con el tope del día gastado: una sola consulta, sin reintentos', r2.tope === 1, r2.tope);
  chk('8j. el celular cambió antes de preguntar: solo se consulta el último', r2.cambia.length === 1 && r2.cambia[0] === '70011166', r2.cambia);
  await b.close(); fin();
})();
function fin() { console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(FAIL ? 1 : 0); }
