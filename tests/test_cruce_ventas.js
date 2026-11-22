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
    eventos:o.sinCharla ? [] : [{ c:61, type:'incoming_chat_message', entity_type:'lead', entity_id:71, created_at:S() - 3 * D, created_by:0 },
             { c:61, type:'outgoing_chat_message', entity_type:'lead', entity_id:71, created_at:S() - 3 * D + 2 * H, created_by:U_CAR }],
    tareas:[], notas:o.nota ? [{ id:1, entity_id:71, note_type:'common', params:{ text:o.nota }, created_at:S() - D, updated_at:S() - D, created_by:U_CAR }] : [] };
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
      if (p === '/leads/notes' || p === '/contacts/notes') {   // 📝 (2026-11-21-a)
        if (ops.notas500) return resp(500, {});
        const ids = q['filter[entity_id][]'] || [], N = p === '/leads/notes' ? (K.notas || []).filter(n => ids.indexOf(String(n.entity_id)) >= 0) : [];
        return N.length ? resp(200, { _embedded:{ notes:N } }) : resp(204, null);
      }
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
  /* 📝 (2026-11-21-a, dueño 21/11) sin conversación, pero Carola anotó en Kommo que el cliente pasa a comprar */
  const NT = servidor(VEND, kommoHeaven({ sinCharla:true, nota:'Pasará por Banzer a comprar, no hay stock en Mia Plaza' }));
  NT.guardar(ped()); pasar(2); NT.ctx.waRepaso();
  chk('⚠️ 3f. sin charla pero con la NOTA de visita o compra de Carola → UN WhatsApp a Carola', NT.cx().length === 1 && NT.cx()[0].to === '59170000001', NT.cx().map(x => x.to));
  const NN = servidor(VEND, kommoHeaven({ sinCharla:true, nota:'No contesta, volver a llamar' }));
  NN.guardar(ped()); pasar(2); NN.ctx.waRepaso();
  chk('3g. sin charla y con una nota que NO es visita ni compra («no contesta») → nada', NN.cx().length === 0 && NN.cola().length === 0, NN.cx().length);
  const NF = servidor(VEND, kommoHeaven({ sinCharla:true, nota:'Viene a comprar' }), { notas500:true });
  NF.guardar(ped()); pasar(2); NF.ctx.waRepaso();
  chk('3h. Kommo no devuelve las notas: la venta vuelve a la cola (intento 1), no se da por mirada', NF.cx().length === 0 && NF.cola().length === 1 && NF.cola()[0].n === 1, NF.cola());
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

console.log('\n── 12. La lectura dice qué ventas nombraron a quién (para pedir revisión) ──');
{
  const A = servidor({ WA_VENDEDORAS:'Isabel Robledo:70000002' }, kommoHeaven());   // Carola SIN número: igual figura
  const p = ped(); A.guardar(p); pasar(2); A.ctx.waRepaso();
  const l = A.post({ action:'list' }), cx = (l.cx || []).filter(e => e.id === p.id)[0];
  chk('⚠️ la venta de Isabel nombra a Carola en `cx` (aunque a Carola no le llegue el WhatsApp), sin celular ni cliente', cx && cx.n[0] === 'Carola Chavez' && cx.v === 'Isabel Robledo' && !('c' in cx) && !JSON.stringify(cx).includes('70011122'), cx);
  const pl = A.ctx.WA_PLANTILLAS.filter(x => x.n === 'asesora_cliente_compro')[0];
  chk('el WhatsApp a la asesora le dice que puede pedir revisión en Mis pedidos → Para hacer', /pedí revisión desde el panel/.test(pl.t) && /Mis pedidos → Para hacer/.test(pl.t), pl.t.slice(-160));
}

console.log('\n── 13. Podar CRUCE_HECHO no se lleva lo que una asesora todavía puede reclamar ──');
{
  const A = servidor(VEND, kommoHeaven());
  const h = {}, ahoraS = Math.floor(RELOJ.ms / 1000);
  h.reclamable = { t:ahoraS - 5 * 86400, v:'Isabel Robledo', n:['Carola Chavez'] };
  for (let i = 0; i < 200; i++) h['sin' + i] = { t:ahoraS - 3600 + i };
  A.ctx.cruceHechoGuardar_(h);
  const g = JSON.parse(A.P.CRUCE_HECHO);
  chk('con 200 ventas nuevas sin cruce, la que nombra a Carola (de hace 5 días) se queda', !!g.reclamable && Object.keys(g).length <= 150, Object.keys(g).length);
}

console.log('\n── 11. Las capturas de la revisión no son fotos sueltas ──');
{
  const A = servidor(VEND, kommoHeaven());
  const p = ped({ productos:[{ desc:'COLCHON', cant:1, crv:{ t:1, por:'Isabel Robledo', de:['Carola Chavez'], fot:['capRev9'] } }] });
  A.guardar(p);
  const set = A.ctx.idsFotoEnUso_();
  chk('el barrido de fotos huérfanas no se lleva las capturas de un pedido de revisión', !!set.capRev9, Object.keys(set));
}

console.log('\n── 7. La plantilla ──');
{
  const A = servidor(VEND, kommoHeaven());
  const pl = A.ctx.WA_PLANTILLAS.filter(x => x.n === 'asesora_cliente_compro')[0];
  const nums = pl ? (pl.t.match(/\{\{(\d+)\}\}/g) || []).map(x => Number(x.replace(/\D/g, ''))) : [];
  chk('a. existe, con los datos 1 a 7 y un ejemplo de 7', pl && Math.max.apply(null, nums) === 7 && new Set(nums).size === 7 && pl.e.length === 7, nums);
  chk('b. WA_TIPOS.cx la nombra y la versión es la 2026-11-20-c o una posterior', A.ctx.WA_TIPOS.cx && A.ctx.WA_TIPOS.cx.plantilla === 'asesora_cliente_compro' && A.ctx.SCRIPT_VERSION >= '2026-11-20-c' && A.ctx.FIN_DEL_ARCHIVO === A.ctx.SCRIPT_VERSION);
  const lleno = pl.t.replace(/\{\{(\d+)\}\}/g, (_, i) => pl.e[i - 1]);
  chk('c. el cuerpo lleno entra en 1.000 letras', lleno.length < 1000, lleno.length);
}

console.log('\n── 8. La página: el cartel en «Nuevo pedido» ──');
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('(sin playwright: se saltea la página)'); fin(); return; }
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.route(/^https:\/\//, r => r.abort());
  pg.on('dialog', d => d.accept());
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
  chk('⚠️ 8a. Isabel con el celular de una clienta de Carola: el cartel lo dice y avisa que a Carola le llega un WhatsApp', /puede ser de Carola Chavez/.test(res.isabel) && /no se frena nada/.test(res.isabel) && /WhatsApp/.test(res.isabel), res.isabel);
  chk('8b. si la que carga es Carola: nada', res.carola === '', res.carola);
  chk('8c. si la que carga es de la otra marca (Mauricio): nada', res.mauricio === '', res.mauricio);
  chk('8d. al editar un pedido: nada', res.editando === true);
  chk('8f. la consulta del formulario va con `auto` (tope aparte) y el mismo celular no se vuelve a preguntar al cambiar de vendedora', res.auto && res.llamadasTotal === 1, res);
  const g = await pg.evaluate(async () => { EDIT_ID = null; cruceFormPintar(); await new Promise(r => setTimeout(r, 300)); var bs = Array.from(document.querySelectorAll('#cruce-form button')).map(b => b.textContent.trim()); return { bs:bs, guarda:typeof submitPedido === 'function' }; });
  chk('8e. el cartel no frena ni tiene botones: solo avisa', g.bs.length === 0 && g.guarda, g.bs);
  const gn = await pg.evaluate(async (ahora) => {
    CRUCE_MEMO = {}; CRUCE_F.k = '';
    window.apiPost = function (b) {
      if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok:true, pedidos:[] });
      return Promise.resolve({ ok:true, ahora:ahora, cuentas:[{ marca:'heaven', contactos:1, notasOk:true, leads:[{ id:'71', resp:'Carola Chavez', pares:[], nota:{ ts:ahora - 86400, quien:'Carola Chavez', txt:'Pasará por Banzer a comprar' } }] }, { marca:'suena', contactos:0, leads:[] }] });
    };
    var set = function (id, v) { var e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70022233'); await new Promise(r => setTimeout(r, 300));
    var box = document.getElementById('cruce-form'); return box.hidden ? '' : box.textContent;
  }, ahora);
  chk('⚠️ 8g. 📝 con la NOTA de Carola (sin charla): el cartel la nombra y dice qué anotó', /puede ser de Carola Chavez/.test(gn) && /anotó en Kommo/.test(gn) && /Banzer a comprar/.test(gn), gn);

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
    /* h3 · …y esa memoria (Sueña caída) no le sirve a una vendedora de Sueña con el mismo celular: vuelve a preguntar */
    set('f-vendedor', 'Mauricio Merida'); await espera(300);
    out.otraMarcaSuena = n;
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
  /* (dueño, 20/11) el formulario dice «puede ser de…» (sin botón); la que RECLAMA (Carola, a la que le llega el WhatsApp) pide revisión desde
     «Mis pedidos → Para hacer», con los requisitos de la Comunicación Interna 032-2026, y Administración decide */
  const r3 = await pg.evaluate(async (ahora) => {
    var espera = (ms) => new Promise(r => setTimeout(r, ms));
    var set = function (id, v) { var e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles:true })); };
    window.apiPost = function (b) { if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok:true, pedidos:[] });
      return Promise.resolve({ ok:true, ahora:ahora, cuentas:[{ marca:'heaven', contactos:1, leads:[{ id:'71', resp:'Carola Chavez', pares:[{ ts:ahora - 3 * 86400 + 7200, desde:ahora - 3 * 86400 + 7200, quien:'Carola Chavez' }] }] }] }); };
    resetForm(); CRUCE_MEMO = {}; CRUCE_F.k = ''; window.CRUCE_ESPERA_MS = 10;
    set('f-vendedor', 'Isabel Robledo'); set('f-celular', '70011188'); await espera(200);
    var box = document.getElementById('cruce-form'), out = { txt:box.textContent, botones:box.querySelectorAll('button').length };
    /* la venta de Isabel ya guardada; el servidor dice que nombró a Carola (y a Maria, sin número: igual puede pedir) */
    var ped = { id:'crvP1', oc:'11-777', fecha:'2026-11-25', vendedor:'Isabel Robledo', cliente:'CLIENTA INVENTADA', celular:'70011188', productos:[{ desc:'COLCHON', cant:1 }], rev:3, ts:Date.now() };
    STATE.push(ped);
    crxTomar([{ id:'crvP1', v:'Isabel Robledo', n:['Carola Chavez'], t:Math.floor(Date.now() / 1000) - 3600 }, { id:'noExiste', v:'X', n:['Carola Chavez'], t:Math.floor(Date.now() / 1000) }]);
    out.hacerIsa = crxHacer('Isabel Robledo');
    out.hacerMaria = crxHacer('Maria Flores');
    var H = crxHacer('Carola Chavez'); out.hacer = H ? { n:H.n, t:H.t } : null;
    crxAbrir(); out.lista = (document.getElementById('modal-box') || {}).textContent || '';
    crvFormAbrir('crvP1'); await espera(20);
    var mb = document.getElementById('modal-box'); out.ventana = mb ? mb.textContent : '';
    document.getElementById('crvf-ok').click(); await espera(10);
    out.faltaVacio = document.getElementById('crvf-falta').textContent;
    var setv = function (id, v) { var e = document.getElementById(id); if (e.type === 'checkbox') { e.checked = !!v; e.dispatchEvent(new Event('change')); } else e.value = v; };
    var hoy = diaNegocio();
    setv('crvf-g', 1); setv('crvf-g-t', 'cot'); setv('crvf-g-f', isoMasDiasSimple(hoy, -20)); setv('crvf-g-p', 'le mando la cotización del 160 el viernes'); setv('crvf-d', 1);
    document.getElementById('crvf-ok').click(); await espera(10);
    out.falta20 = document.getElementById('crvf-falta').textContent;
    setv('crvf-g-f', isoMasDiasSimple(hoy, -3));
    window.fotoCronometro = function () { return Promise.resolve('data:image/jpeg;base64,AAA'); };
    var nFoto = 0; window.subirFoto = function () { nFoto++; return Promise.resolve({ ok:true, fotoId:'fotoRev' + nFoto }); };
    setv('crvf-o-t', 'mia');
    await crvFotosElegidas({ target:{ files:[{ name:'a.jpg' }], value:'' } }, 0); await espera(20);
    document.getElementById('crvf-ok').click(); await espera(10);
    out.falta1foto = document.getElementById('crvf-falta').textContent;
    await crvFotosElegidas({ target:{ files:[{ name:'b.jpg' }], value:'' } }, 0); await espera(20);
    document.getElementById('crvf-ok').click(); await espera(10);
    out.faltaKommo = document.getElementById('crvf-falta').textContent;
    crvFotoQuitar(1);
    await crvFotosElegidas({ target:{ files:[{ name:'k.jpg' }], value:'' } }, 1); await espera(20);
    /* lo que está subiendo ocupa lugar: con 2 y 2 subiendo, de 3 nuevas no sube ninguna */
    var antes = CRUCE_F.fot.slice(), antesK = CRUCE_F.fotKm.slice(), nSub = nFoto; CRUCE_F.fotSub = 2;
    await crvFotosElegidas({ target:{ files:[{}, {}, {}], value:'' } }, 1); await espera(20);
    out.lugar = nFoto - nSub; CRUCE_F.fotSub = 0; CRUCE_F.fot = antes; CRUCE_F.fotKm = antesK;
    setv('crvf-o-t', '');
    document.getElementById('crvf-ok').click(); await espera(10);
    out.faltaOtra = document.getElementById('crvf-falta').textContent;
    setv('crvf-o-t', 'mia');
    window.refrescarEstadoYa = function () { return Promise.resolve(); };
    /* (Fable 1) el servidor dice `conflicto` (logística tocó la venta mientras ella completaba): un error que no es conflicto deja todo */
    var guardados = [], modo = 'error';
    window.guardarDurable = function (p) { guardados.push(JSON.parse(JSON.stringify(p)));
      if (modo === 'error') { return Promise.resolve({ ok:false, error:'busy', motivo:'ocupado' }); }
      if (modo === 'conflicto') { modo = 'ok'; var fr = JSON.parse(JSON.stringify(STATE.find(x => x.id === 'crvP1'))); fr.rev = 9; fr.estado = 'Listo'; fr.productos[0].chk = 'ok'; return Promise.resolve({ ok:false, error:'conflicto', pedido:fr }); }
      return Promise.resolve({ ok:true }); };
    document.getElementById('crvf-ok').click(); await espera(40);
    out.errSigue = { falta:(document.getElementById('crvf-falta') || {}).textContent || '', fotos:CRUCE_F.fot.length, ok:!!document.getElementById('crvf-ok') && !document.getElementById('crvf-ok').disabled };
    modo = 'conflicto'; guardados = [];
    document.getElementById('crvf-ok').click(); await espera(60);
    out.reintentos = guardados.length; out.sobreFresca = guardados.length === 2 && guardados[1].rev === 9 && guardados[1].estado === 'Listo' && guardados[1].productos[0].chk === 'ok' && !!crvDe(guardados[1]);
    guardados = guardados.slice(1);
    out.crv = guardados.length ? crvDe(guardados[0]) : null;
    out.vendedorIgual = guardados.length ? guardados[0].vendedor : '';
    if (guardados.length) { var ix = STATE.findIndex(x => x.id === 'crvP1'); STATE[ix] = guardados[0]; }
    out.listaDespues = (document.getElementById('modal-box') || {}).textContent || '';
    var H2 = crxHacer('Carola Chavez'); out.hacerDespues = H2 ? H2.t : null;
    /* (Fable 4) otra asesora nombrada en la misma venta: ya tiene pedido de revisión, no le insiste */
    crxTomar([{ id:'crvP1', v:'Isabel Robledo', n:['Carola Chavez', 'Maria Flores'], t:Math.floor(Date.now() / 1000) - 3600 }]);
    var HM = crxHacer('Maria Flores'); out.maria = HM ? { n:HM.n, sev:HM.sev, t:HM.t } : null;
    /* (Fable 2) los 15 días se cuentan desde el DÍA DE LA VENTA, no desde hoy */
    var vieja = { id:'crvP2', oc:'11-700', fecha:'2026-11-25', vendedor:'Isabel Robledo', cliente:'OTRA CLIENTA', celular:'70011177', productos:[{ desc:'X', cant:1 }], rev:1, ts:Date.now() - 10 * 86400000 };
    STATE.push(vieja); crxTomar([{ id:'crvP2', v:'Isabel Robledo', n:['Carola Chavez'], t:Math.floor(Date.now() / 1000) - 10 * 86400 }]); CRX_V = 'Carola Chavez';
    crvFormAbrir('crvP2'); await espera(20);
    var dv = isoMasDiasSimple(diaNegocio(), -10);
    setv('crvf-g', 1); setv('crvf-g-t', 'cot'); setv('crvf-g-p', 'le mando la cotización el viernes'); setv('crvf-d', 1); setv('crvf-o-t', 'mia');
    setv('crvf-g-f', isoMasDiasSimple(dv, -8)); out.f8antes = crvFormLeer().falta.join(' | ');
    setv('crvf-g-f', isoMasDiasSimple(dv, 2)); out.fDespues = crvFormLeer().falta.join(' | ');
    out.ventanaDia = (document.getElementById('modal-box') || {}).textContent || '';
    closeModal();
    var her = heredarMarcas([{ desc:'COLCHON', cant:1 }], STATE.find(x => x.id === 'crvP1').productos); out.hereda = !!(her[0].crv && her[0].crv.por === 'Carola Chavez');
    /* Administración */
    var vqa = document.getElementById('view-qa'); vqa.classList.add('active');
    var pug = function () { qaPugnaPintar(); var bx = document.getElementById('qa-pugna'); return { oculto: bx.hidden, txt: bx.textContent, html: bx.innerHTML, abierto: !!(bx.querySelector('details') || {}).open, items: bx.querySelectorAll('.crv-cx').length }; };
    var hacerAdm = function () { try { return (admHacerDatos() || []).filter(function (x) { return x && /^cr[vx]$/.test(x.k); }).length; } catch (e) { return 'err:' + e.message; } };
    UNLOCKED = false; var P0 = pug(); out.sinClave = P0.oculto && P0.txt === '';
    UNLOCKED = true; var P1 = pug(); out.pugna = P1; out.hacerAdmN = hacerAdm();
    guardados = [];
    crvAbrir(); var cm = document.querySelector('#modal-box .crv-modal'); out.listaAdm = cm ? cm.textContent : ''; out.listaAdmH = cm ? cm.innerHTML : '';
    crvResolver('crvP1', 'Carola Chavez');
    out.resuelto = guardados.length ? crvDe(guardados[0]) : null;
    var PD = pug(); out.despues = /sin pedidos de revisión/.test(PD.txt); out.despuesTxt = PD.txt.slice(0, 200);
    if (guardados.length) { var ix2 = STATE.findIndex(x => x.id === 'crvP1'); STATE[ix2] = guardados[0]; }
    out.ficha = crvFichaHtml(findById('crvP1'));
    crvAbrir(); out.decididas = (document.querySelector('#modal-box .crv-modal') || {}).textContent || '';
    /* 🔀 (22/11) los cruces avisados, haya reclamo o no: uno sin reclamo (crvP3) y el decidido (crvP1) */
    STATE.push({ id:'crvP3', oc:'11-701', fecha:'2026-11-26', vendedor:'Mirian Salazar', cliente:'CLIENTE SIN RECLAMO', celular:'70011188', productos:[{ desc:'X', cant:1 }], rev:1, ts:Date.now() - 86400000 });
    crxTomar([{ id:'crvP1', v:'Isabel Robledo', n:['Carola Chavez'], t:Math.floor(Date.now() / 1000) - 3600 },
              { id:'crvP3', v:'Mirian Salazar', n:['Isabel Robledo'], t:Math.floor(Date.now() / 1000) - 86400 },
              { id:'crvViejo', v:'X', n:['Y'], t:Math.floor(Date.now() / 1000) - 3 * 86400 },
              { id:'crvP3', v:'Mirian Salazar', n:['Isabel Robledo'], t:Math.floor(Date.now() / 1000) - 40 * 86400 }]);
    var PX = pug(); out.cxPugna = PX;
    crvAbrir(); var cxs = document.querySelector('#modal-box .crv-cxs');
    out.cxTxt = cxs ? cxs.textContent : ''; out.cxAbierto = !!(cxs && cxs.open); out.cxItems = cxs ? cxs.querySelectorAll('.crv-cx').length : -1;
    UNLOCKED = false; out.cxSinClave = pug().oculto; UNLOCKED = true; out.cxHacerAdm = hacerAdm(); vqa.classList.remove('active');
    try { closeModal(); } catch (e) {}
    return out;
  }, ahora);
  chk('⚠️ 8k. el cartel de quien carga dice «puede ser de» y que tener mensajes no prueba que lo atendió, sin botones', /puede ser de Carola Chavez/.test(r3.txt) && /no significa que lo haya atendido/.test(r3.txt) && r3.botones === 0, r3.txt);
  chk('⚠️ 8l. «Para hacer» de Carola (la que reclama): «otra vendedora le vendió a un cliente que atendías»; a Isabel y a Maria, nada', r3.hacer && r3.hacer.n === 1 && /cliente que atendías/.test(r3.hacer.t) && r3.hacerIsa === null && r3.hacerMaria === null, r3);
  chk('8m. la lista dice quién cargó la venta y ofrece «Pedir revisión» (no lista lo que ya no está en la planilla)', /Isabel Robledo le cargó una venta a CLIENTA INVENTADA/.test(r3.lista) && /Pedir revisión/.test(r3.lista) && (r3.lista.match(/le cargó una venta/g) || []).length === 1, r3.lista.slice(0, 300));
  chk('⚠️ 8q. «Pedir revisión» abre los requisitos de la Comunicación Interna 032-2026 (gestión en 15 días, fecha acordada, por qué no es de la otra, §8, capturas)', /032-2026/.test(r3.ventana) && /15 días antes de esta venta/.test(r3.ventana) && /fecha futura/.test(r3.ventana) && /no es de Isabel Robledo/.test(r3.ventana) && /mínimo 2/.test(r3.ventana) && /Captura de Kommo/.test(r3.ventana) && /§8/.test(r3.ventana), r3.ventana.slice(0, 200));
  chk('⚠️ 8r. sin completar no deja pedirla y dice qué falta', /cómo demostrás/.test(r3.faltaVacio) && /mínimo 2 capturas/.test(r3.faltaVacio) && /de Kommo/.test(r3.faltaVacio) && /§8/.test(r3.faltaVacio) && /no es de la otra/.test(r3.faltaVacio), r3.faltaVacio);
  chk('8s. una gestión de hace 20 días no alcanza (son 15)', /más de 15 días/.test(r3.falta20), r3.falta20);
  chk('⚠️ 8v. capturas: con 1 pide mínimo 2; con 2 sin ninguna de Kommo pide la de Kommo', /mínimo 2 capturas/.test(r3.falta1foto) && !/mínimo 2/.test(r3.faltaKommo) && /de Kommo/.test(r3.faltaKommo), { uno:r3.falta1foto, kommo:r3.faltaKommo });
  chk('8w. «por qué la venta no es de la otra» también es obligatorio', /no es de la otra/.test(r3.faltaOtra), r3.faltaOtra);
  chk('8z. lo que está subiendo ocupa lugar (máximo 4)', r3.lugar === 0, r3.lugar);
  chk('⚠️ 8u. completo: queda en la venta (quién pide, quién vendió, requisitos y capturas con la de Kommo) sin cambiar la vendedora', r3.crv && r3.crv.por === 'Carola Chavez' && r3.crv.vende === 'Isabel Robledo' && r3.crv.req.g.t === 'cot' && r3.crv.req.o.t === 'mia' && r3.crv.req.d === 1 && r3.crv.fot.length === 2 && r3.crv.fotK.length === 1 && r3.crv.fotK[0] === r3.crv.fot[1] && r3.vendedorIgual === 'Isabel Robledo', r3.crv);
  chk('⚠️ 8c1. (Fable 1) si no se pudo guardar, la ventana sigue abierta con los datos y las capturas, y lo dice', /No se pudo guardar el pedido de revisión/.test(r3.errSigue.falta) && r3.errSigue.fotos === 2 && r3.errSigue.ok, r3.errSigue);
  chk('⚠️ 8c2. (Fable 1) si otro tocó la venta en el medio (conflicto), el pedido de revisión va sobre la fila nueva (sin pisar lo de logística)', r3.reintentos === 2 && r3.sobreFresca, r3.reintentos);
  chk('8t. después dice «Pediste revisión… pendiente» y deja de pedirla en «Para hacer»', /Pediste revisión/.test(r3.listaDespues) && /pendiente de Administración/.test(r3.listaDespues) && /revisión pedida/.test(r3.hacerDespues || ''), { l:r3.listaDespues.slice(0, 200), h:r3.hacerDespues });
  chk('8c3. (Fable 4) a otra asesora nombrada en una venta que ya tiene pedido de revisión no se le pide de nuevo', r3.maria && r3.maria.sev === 'i' && /revisión pedida/.test(r3.maria.t), r3.maria);
  chk('⚠️ 8c4. (Fable 2) los 15 días se cuentan desde el día de la venta: 8 días antes de una venta de hace 10 vale; después de la venta, no', !/15 días/.test(r3.f8antes) && !/antes de la venta/.test(r3.f8antes) && /antes de la venta/.test(r3.fDespues) && /el <b>|el \d{2}\/\d{2}\/\d{4}/.test(r3.ventanaDia), { a:r3.f8antes, d:r3.fDespues });
  chk('8n. si Isabel corrige la venta, el pedido de revisión se conserva', r3.hereda);
  chk('⚠️ 8o. «¿Quién lo atiende?» → «🔀 Ventas en pugna» (solo con la contraseña) lo muestra con todo lo presentado; en «Para hacer» de Administración, nada', r3.sinClave && !r3.pugna.oculto && r3.pugna.abierto && /Ventas en pugna/.test(r3.pugna.txt) && /1 pedido de revisión/.test(r3.pugna.txt) && /CLIENTA INVENTADA/.test(r3.pugna.txt) && /Es de Isabel Robledo/.test(r3.pugna.txt) && /Es de Carola Chavez/.test(r3.pugna.txt) && r3.hacerAdmN === 0 && /CLIENTA INVENTADA/.test(r3.listaAdm) && /respondió mi cotización/.test(r3.pugna.txt) && /salió de mi gestión/.test(r3.pugna.txt) && /Captura de Kommo/.test(r3.pugna.html) && /Captura de Kommo/.test(r3.listaAdmH), { p:r3.pugna.txt.slice(0, 300), adm:r3.hacerAdmN });
  chk('8p. «Es de Carola Chavez» (con confirmación) lo anota y sale de la lista', r3.resuelto && r3.resuelto.r === 'Carola Chavez' && r3.resuelto.rt > 0 && r3.despues, r3.resuelto);
  chk('🔀 8z4. sin reclamos pendientes, «Ventas en pugna» igual muestra los cruces (plegado, solo con la contraseña); Administración no los avisa', !r3.cxPugna.oculto && !r3.cxPugna.abierto && /sin pedidos de revisión · 2 cruces en 15 días/.test(r3.cxPugna.txt) && r3.cxPugna.items === 2 && /CLIENTE SIN RECLAMO/.test(r3.cxPugna.txt) && r3.cxSinClave && r3.cxHacerAdm === 0, { t:r3.cxPugna.txt.slice(0, 200), adm:r3.cxHacerAdm });
  chk('🔀 8z5. «Cruces avisados» lista los de los 15 días (sin los viejos ni los que ya no están), quién cargó, a quién se avisó y el estado', r3.cxItems === 2 && r3.cxAbierto && /Cruces avisados/.test(r3.cxTxt) && /11-701 · CLIENTE SIN RECLAMO/.test(r3.cxTxt) && /sin reclamo/.test(r3.cxTxt) && /La cargó Mirian Salazar · según Kommo lo atendía Isabel Robledo/.test(r3.cxTxt) && /decidido: es de Carola Chavez/.test(r3.cxTxt), r3.cxTxt.slice(0, 500));
  chk('⚠️ 8z3. la decisión se ve en la ficha del pedido y en «Ya decididas», con «Cambiar»', /Revisión del cliente: es de Carola Chavez/.test(r3.ficha) && /Ya decididas/.test(r3.decididas) && /Decidido: es de Carola Chavez/.test(r3.decididas) && /Cambiar/.test(r3.decididas), { ficha:r3.ficha.slice(0, 200) });
  chk('⚠️ 8g. completando un borrador de Kommo (está en BORRADORES, no en la lista): el cartel sale', /puede ser de Carola Chavez/.test(r2.borrador), r2.borrador);
  chk('8h. Kommo contestó a medias y sin nadie: vuelve a preguntar y el cartel aparece', r2.inc.n === 2 && /Carola Chavez/.test(r2.inc.txt), r2.inc);
  chk('8h2. Heaven contestó bien y Sueña está caída: una sola consulta (la otra marca no hace reintentar)', r2.otraMarca === 1, r2.otraMarca);
  chk('8h3. con ese mismo celular, una vendedora de Sueña no usa la memoria con Sueña caída: vuelve a preguntar', r2.otraMarcaSuena >= 2, r2.otraMarcaSuena);
  chk('8i. con el tope del día gastado: una sola consulta, sin reintentos', r2.tope === 1, r2.tope);
  chk('8j. el celular cambió antes de preguntar: solo se consulta el último', r2.cambia.length === 1 && r2.cambia[0] === '70011166', r2.cambia);
  await b.close(); fin();
})();
function fin() { console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(FAIL ? 1 : 0); }
