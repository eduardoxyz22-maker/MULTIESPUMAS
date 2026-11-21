/* 📞 (20/11) «¿QUIÉN LO ATIENDE?» — dueño: una pestaña con un buscador de celular que diga si otra vendedora lo está atendiendo.
   Regla (Comunicación Interna 032-2026 + respuestas del dueño del 20/11): 15 días; conversar = un mensaje del CLIENTE y uno de la
   VENDEDORA con no más de 24 h entre los dos (uno solo no cuenta; el bot no es la vendedora); una tarea abierta con fecha futura en
   Kommo = la fecha acordada (la excepción).

   LO QUE CUIDA:
   A. Servidor (el .gs real con un Kommo de mentira, datos INVENTADOS):
      1. celular que no se entiende → `cel`; nada a Kommo.
      2. busca el número en los contactos y vuelve a mirar el teléfono (la búsqueda de Kommo busca en todo).
      3. los mensajes se piden por el CONTACTO (por el lead Kommo contesta 204, probado el 20/11 con la cuenta de verdad).
      4. la regla del par: cliente + vendedora a ≤ 24 h (justo 24 h vale, un segundo más no); el bot (created_by 0) no cuenta.
      5. el par más nuevo dice quién; responsable, etapa, sucursal, último mensaje de cada lado.
      6. tareas abiertas con fecha futura; las vencidas no.
      7. Sueña sin token → `sinToken`, sin preguntar.
      8. anota la consulta en la hoja «Quién atiende» (quién buscó, el número, el resultado) y NO toma el candado.
      9. la misma búsqueda seguida sale de la caché.
   B. Página (QA_PRUEBA):
      10. la pestaña está escondida en Playwright y aparece con QA_PRUEBA.
      11. los carteles: libre (y con quién fue la última), lo atiende OTRA, lo atendés VOS, fecha acordada, ya compró.
      12. sin el servidor nuevo dice qué falta y muestra los pedidos del panel con ese celular.
      13. un número mal escrito pide el número completo; con o sin 591 es el mismo.
   Se corre:  node tests/test_quien_atiende.js   ·  contra otro .gs: GS=… */
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

const AHORA = Date.parse('2026-11-20T10:00:00-04:00'), S = Math.floor(AHORA / 1000), H = 3600, D = 86400;
const U_CAR = 901, U_MAR = 902;

function kommo() {
  const K = {
    pipelines:{ _embedded:{ pipelines:[{ id:500, name:'Ventas', _embedded:{ statuses:[{ id:101, name:'Nueva consulta' }, { id:103, name:'Cotizacion enviada' }, { id:142, name:'Logrado con éxito' }] } }] } },
    usuarios:{ _embedded:{ users:[{ id:U_CAR, name:'Carola Chavez - Tienda Banzer' }, { id:U_MAR, name:'Maria Flores - Buenos Aires' }] } },
    contactos:{}, leads:{}, eventos:[], tareas:[], notas:[]
  };
  const contacto = (id, nombre, tel, leads) => { K.contactos[id] = { id, name:nombre, custom_fields_values:[{ field_code:'PHONE', values:[{ value:tel }] }], _embedded:{ leads:leads.map(x => ({ id:x })) } }; };
  const lead = (id, o) => { K.leads[id] = Object.assign({ id, name:'Lead ' + id, status_id:103, pipeline_id:500, responsible_user_id:U_CAR, created_at:S - 30 * D, updated_at:S - D }, o); };
  const ev = (contactoId, leadId, tipo, ts, quien) => K.eventos.push({ c:contactoId, type:tipo, entity_type:'lead', entity_id:leadId, created_at:ts, created_by:quien || 0 });
  return { K, contacto, lead, ev };
}

function cargar(K, props, falla) {
  props = Object.assign({ KOMMO_TOKEN:'tok-inventado', KOMMO_TOKEN_SUENA:'tok-suena' }, props || {});
  Object.keys(props).forEach(k => { if (props[k] == null) delete props[k]; });
  const hojas = {}, llamadas = [], lock = { veces:0 };
  const hoja = (n) => hojas[n] = hojas[n] || { filas:[], appendRow(r) { this.filas.push(r); }, getRange:() => ({ setFontWeight(){}, setNumberFormat(){} }), setFrozenRows(){} };
  const cache = { _m:{}, get(k) { return this._m[k] != null ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, remove(k) { delete this._m[k]; } };
  const resp = (code, o) => ({ getResponseCode:() => code, getContentText:() => o == null ? '' : JSON.stringify(o) });
  const qs = (u) => { const q = {}; (u.split('?')[1] || '').split('&').forEach(p => { if (!p) return; const i = p.indexOf('='), k = decodeURIComponent(i < 0 ? p : p.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(p.slice(i + 1)); (q[k] = q[k] || []).push(v); }); return q; };
  class FakeDate extends Date { constructor(...a) { a.length ? super(...a) : super(AHORA); } static now() { return AHORA; } }
  const ctx = {
    console, Date:FakeDate,
    SpreadsheetApp:{ getActiveSpreadsheet:() => ({ getSheetByName:(n) => hojas[n] || null, insertSheet:(n) => hoja(n) }), flush:() => {} },
    PropertiesService:{ getScriptProperties:() => ({ getProperty:(k) => props[k] != null ? props[k] : null, getProperties:() => Object.assign({}, props), setProperty:(k, v) => { props[k] = String(v); }, deleteProperty:(k) => { delete props[k]; } }) },
    LockService:{ getScriptLock:() => ({ waitLock() { lock.veces++; }, tryLock() { lock.veces++; return true; }, releaseLock() {} }), getDocumentLock:() => ({ waitLock() { lock.veces++; }, releaseLock() {} }) },
    CacheService:{ getScriptCache:() => cache },
    ContentService:{ MimeType:{ JSON:'json' }, createTextOutput:(t) => ({ _t:t, setMimeType() { return this; } }) },
    Utilities:{ formatDate:(d) => String(d) },
    Session:{ getScriptTimeZone:() => 'America/La_Paz', getTemporaryActiveUserKey:() => 'ABCDEFGH' },
    ScriptApp:{ newTrigger:() => ({ timeBased:() => ({ after:() => ({ create:() => ({}) }) }) }), getProjectTriggers:() => [], deleteTrigger:() => {} },
    UrlFetchApp:{ fetch:(url, op) => {
      op = op || {};
      const metodo = String(op.method || 'get').toLowerCase(), ruta = url.split('/api/v4')[1] || '', p = ruta.split('?')[0], q = qs(ruta);
      llamadas.push({ metodo, p, q, host:url.split('/api/v4')[0] });
      if (metodo !== 'get') return resp(405, {});
      if (/gerencia/.test(url.split('/api/v4')[0]) && !K.enSuena) return resp(204, null);   // el Kommo de Sueña, vacío
      if (falla && falla(p)) return resp(falla(p), { title:'no' });
      if (p === '/users') return resp(200, K.usuarios);
      if (p === '/leads/pipelines') return resp(200, K.pipelines);
      if (p === '/contacts') {
        const t = (q.query || [''])[0];
        const cs = Object.values(K.contactos).filter(c => c.name.toLowerCase().indexOf(t.toLowerCase()) >= 0 || c.custom_fields_values[0].values.some(v => String(v.value).replace(/\D/g, '').indexOf(t) >= 0));   // como Kommo: por los números
        return cs.length ? resp(200, { _embedded:{ contacts:cs } }) : resp(204, null);
      }
      if (p === '/leads') { const L = (q['filter[id][]'] || []).map(i => K.leads[i]).filter(Boolean); return L.length ? resp(200, { _embedded:{ leads:L } }) : resp(204, null); }
      if (p === '/events') {
        const ent = (q['filter[entity][]'] || [])[0], ids = q['filter[entity_id][]'] || [], tipos = q['filter[type][]'] || [], desde = Number((q['filter[created_at][from]'] || ['0'])[0]), hasta = Number((q['filter[created_at][to]'] || ['0'])[0]) || 9e12;
        if (ent !== 'contact') return resp(204, null);   // como Kommo de verdad: por el lead, nada
        const E = K.eventos.filter(e => ids.indexOf(String(e.c)) >= 0 && tipos.indexOf(e.type) >= 0 && e.created_at >= desde && e.created_at <= hasta).sort((a, b) => b.created_at - a.created_at);
        return E.length ? resp(200, { _embedded:{ events:E } }) : resp(204, null);
      }
      if (p === '/tasks') {
        const ids = q['filter[entity_id][]'] || [];
        const et = (q['filter[entity_type]'] || ['leads'])[0], T = K.tareas.filter(t => (t.entity_type || 'leads') === et && ids.indexOf(String(t.entity_id)) >= 0 && !t.is_completed);
        return T.length ? resp(200, { _embedded:{ tasks:T } }) : resp(204, null);
      }
      if (p === '/leads/notes' || p === '/contacts/notes') {   // 📝 (2026-11-21-a) como Kommo: por entidad, tipo y desde cuándo se tocó
        const et = p.split('/')[1], ids = q['filter[entity_id][]'] || [], tipos = q['filter[note_type][]'] || [], desde = Number((q['filter[updated_at][from]'] || ['0'])[0]);
        const N = (K.notas || []).filter(n => (n.et || 'leads') === et && ids.indexOf(String(n.entity_id)) >= 0 && (!tipos.length || tipos.indexOf(n.note_type || 'common') >= 0) && (n.updated_at || n.created_at) >= desde);
        const pg = Number((q['page'] || ['1'])[0]), lim = Number((q['limit'] || ['250'])[0]), P = N.slice((pg - 1) * lim, pg * lim);
        return P.length ? resp(200, Object.assign({ _embedded:{ notes:P } }, N.length > pg * lim ? { _links:{ next:{ href:'x' } } } : {})) : resp(204, null);
      }
      return resp(404, {});
    } }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData:{ contents:JSON.stringify(b) }, parameter:{} })._t);
  return { post, llamadas, hojas, lock, ctx, cache };
}

function servidor() {
  /* El cliente 70011122: un contacto con dos leads, de Carola (conversaron hace 3 días) y de María (hace 20 días, sin par) */
  const k = kommo();
  k.contacto(61, 'CLIENTA INVENTADA', '+591 700-11122', [71, 72]);
  k.contacto(62, 'OTRO 70011122 EN EL NOMBRE', '76543210', [79]);   // el número en el NOMBRE, otro teléfono: no es este
  k.lead(71, { responsible_user_id:U_CAR, status_id:103, updated_at:S - 3 * D });
  k.lead(72, { responsible_user_id:U_MAR, status_id:101, updated_at:S - 20 * D });
  k.lead(79, { responsible_user_id:U_MAR });
  k.ev(61, 71, 'incoming_chat_message', S - 3 * D, 0);
  k.ev(61, 71, 'outgoing_chat_message', S - 3 * D + 2 * H, U_CAR);       // par: el cliente y Carola a 2 h
  k.ev(61, 71, 'outgoing_chat_message', S - 3 * D + 5 * H, 0);           // el bot, después: no corre el par
  k.ev(61, 72, 'outgoing_chat_message', S - 20 * D, U_MAR);
  k.ev(61, 72, 'incoming_chat_message', S - 20 * D + 30 * H, 0);         // 30 h después: no es par
  k.ev(61, 72, 'outgoing_chat_message', S - 20 * D + 31 * H, 0);         // el bot contesta: tampoco
  k.ev(62, 79, 'incoming_chat_message', S - D, 0);
  k.ev(62, 79, 'outgoing_chat_message', S - D + H, U_MAR);
  k.K.tareas.push({ id:1, entity_type:'leads', entity_id:72, complete_till:S + 5 * D, responsible_user_id:U_MAR, created_by:U_MAR, text:'Llamar: compra el mes que viene', is_completed:false });
  k.K.tareas.push({ id:2, entity_type:'leads', entity_id:71, complete_till:S - D, responsible_user_id:U_CAR, created_by:U_CAR, text:'vencida', is_completed:false });

  const A = cargar(k.K);
  let r = A.post({ action:'quienAtiende', cel:'12', quien:'Maria Flores' });
  chk('1 · un celular que no se entiende → «cel» y nada a Kommo', r.ok === false && r.error === 'cel' && !A.llamadas.length, r);

  r = A.post({ action:'quienAtiende', cel:'591 70011122', quien:'Maria Flores' });
  const H1 = r.cuentas && r.cuentas[0], L = (H1 && H1.leads) || [], l71 = L.find(x => x.id === '71'), l72 = L.find(x => x.id === '72');
  chk('2a · contesta ok, con la regla (15 días, 24 h) y la hora de Google', r.ok && r.dias === 15 && r.parH === 24 && r.ahora === S, { ok:r.ok, dias:r.dias, parH:r.parH });
  chk('2b · encuentra los 2 leads de ESE número (no el contacto que lo tiene en el nombre)', L.length === 2 && !L.some(x => x.id === '79') && H1.contactos === 1, L.map(x => x.id));
  const ev = A.llamadas.filter(c => c.p === '/events');
  chk('3 · los mensajes se piden por el CONTACTO: lo reciente (17 días) aparte de la historia (60 días)', ev.length === 2 && ev.every(c => c.q['filter[entity][]'][0] === 'contact' && c.q['filter[entity_id][]'].join() === '61') && Number(ev[0].q['filter[created_at][from]'][0]) === S - 17 * D && Number(ev[1].q['filter[created_at][to]'][0]) === S - 17 * D - 1, ev.map(c => c.q));
  chk('4a · Carola: par cliente + vendedora a 2 h → última conversación hace 3 días', l71 && l71.par && l71.par.quien === 'Carola Chavez' && l71.par.ts === S - 3 * D + 2 * H, l71 && l71.par);
  chk('4b · el bot después del par no lo corre', l71 && l71.par && l71.par.ts === S - 3 * D + 2 * H);
  chk('4c · María: el cliente contestó 30 h después y lo demás fue el bot → SIN par', l72 && l72.par === null, l72 && l72.par);
  chk('5a · responsable, sucursal (de « - Tienda Banzer») y etapa', l71 && l71.resp === 'Carola Chavez' && l71.suc === 'Tienda Banzer' && l71.et === 'Cotizacion enviada', l71);
  chk('5b · último mensaje del cliente y de una vendedora (el bot no)', l72 && l72.ultCli === S - 20 * D + 30 * H && l72.ultVend && l72.ultVend.quien === 'Maria Flores', l72);
  chk('5c · el nombre del contacto', l71 && l71.cli === 'CLIENTA INVENTADA');
  chk('6 · la tarea abierta con fecha futura va (la vencida no), con quién la puso y SIN su texto', l72 && l72.tarea && l72.tarea.ts === S + 5 * D && l72.tarea.puso === 'Maria Flores' && !('txt' in l72.tarea) && l71 && !l71.tarea, { t72:l72 && l72.tarea, t71:l71 && l71.tarea });
  const A7 = cargar(k.K, { KOMMO_TOKEN_SUENA:null }), r7 = A7.post({ action:'quienAtiende', cel:'70099999', quien:'Maria Flores' }), S2 = r7.cuentas && r7.cuentas[1];
  chk('7 · Sueña sin token → «sinToken», sin preguntarle a nadie, e INCOMPLETO (la hoja no dice «Libre»)', S2 && S2.marca === 'suena' && S2.sinToken === true && !A7.llamadas.some(c => /gerencia/.test(c.host)) && r7.incompleto === true && /No se pudo consultar/.test(A7.hojas['Quién atiende'].filas[1][4]), S2);
  const fh = (A.hojas['Quién atiende'] || { filas:[] }).filas;
  chk('8a · la consulta queda anotada: encabezado + una fila (quién buscó, el número, el resultado)', fh.length === 2 && fh[1][1] === 'Maria Flores' && fh[1][2] === '70011122' && fh[1][3] === '' && /^Atiende: Carola Chavez, Maria Flores$/.test(fh[1][4]), fh);
  chk('8b · no toma el candado', A.lock.veces === 0, A.lock.veces);
  const n0 = A.llamadas.length;
  const r2 = A.post({ action:'quienAtiende', cel:'70011122', quien:'Isabel' });
  chk('9 · la misma búsqueda seguida sale de la caché (y se anota igual)', r2.cache === true && A.llamadas.length === n0 && (A.hojas['Quién atiende'].filas.length === 3), { cache:r2.cache, nuevas:A.llamadas.length - n0 });

  /* 4d · el borde de las 24 h */
  const k2 = kommo();
  k2.contacto(63, 'BORDE', '71112222', [81, 82]);
  k2.lead(81); k2.lead(82, { responsible_user_id:U_MAR });
  k2.ev(63, 81, 'incoming_chat_message', S - 4 * D, 0); k2.ev(63, 81, 'outgoing_chat_message', S - 4 * D + 24 * H, U_CAR);
  k2.ev(63, 82, 'incoming_chat_message', S - 4 * D, 0); k2.ev(63, 82, 'outgoing_chat_message', S - 4 * D + 24 * H + 1, U_MAR);
  const B = cargar(k2.K), rb = B.post({ action:'quienAtiende', cel:'71112222' });
  const b81 = rb.cuentas[0].leads.find(x => x.id === '81'), b82 = rb.cuentas[0].leads.find(x => x.id === '82');
  chk('4d · justo 24 h vale; 24 h y un segundo no', b81 && b81.par && b82 && b82.par === null, { b81:b81 && b81.par, b82:b82 && b82.par });
  /* 14 · por NOMBRE: dos clientes que se llaman igual, con números distintos → dos contactos, cada uno con el final de su número */
  const k3 = kommo();
  k3.contacto(91, 'ANA ROJAS VACA', '70001111', [911]);
  k3.contacto(92, 'Ana Rojas', '+591 7999-2222', [921]);
  k3.contacto(93, 'MARIANA ROJAS', '71113333', [931]);        // «Mariana» no es «Ana»
  k3.contacto(94, 'ANA MARIA SOLIZ', '71114444', [941]);      // sin «Rojas»
  k3.lead(911, { responsible_user_id:U_CAR }); k3.lead(921, { responsible_user_id:U_MAR }); k3.lead(931); k3.lead(941);
  k3.ev(91, 911, 'incoming_chat_message', S - 2 * D, 0); k3.ev(91, 911, 'outgoing_chat_message', S - 2 * D + H, U_CAR);
  const N = cargar(k3.K);
  let rn = N.post({ action:'quienAtiende', nombre:'Ana', quien:'Isabel' });
  chk('14a · con UNA palabra no busca (salen demasiados) → «nombre»', rn.ok === false && rn.error === 'nombre' && !N.llamadas.length, rn);
  rn = N.post({ action:'quienAtiende', nombre:'ana rojas', quien:'Isabel Robledo' });
  const LN = rn.cuentas[0].leads;
  chk('14b · encuentra a las DOS «Ana Rojas» (no a Mariana ni a Ana María Soliz)', rn.ok && rn.nombre === 'ana rojas' && LN.length === 2 && LN.map(x => x.id).sort().join() === '911,921' && rn.cuentas[0].contactos === 2 && rn.cuentas[0].porNombre, LN.map(x => x.id));
  chk('14c · cada lead dice de qué contacto es y el final de SU número', LN.find(x => x.id === '911').t4 === '1111' && LN.find(x => x.id === '921').t4 === '2222' && !('cid' in LN[0]), LN.map(x => [x.id, x.t4]));
  chk('14d · la conversación sale en la que corresponde (Carola, la …1111)', LN.find(x => x.id === '911').par && LN.find(x => x.id === '911').par.quien === 'Carola Chavez' && !LN.find(x => x.id === '921').par);
  const fn = N.hojas['Quién atiende'].filas;
  chk('14e · la hoja anota el nombre buscado', fn.length === 2 && fn[1][3] === 'ana rojas' && fn[1][2] === '', fn);
  global.__RN = rn;

  /* ── Revisión de Fable ── */
  /* A1 · Kommo falla: nunca «Libre», no se guarda en la caché y la hoja no dice «Libre» */
  const kf = kommo(); kf.contacto(61, 'CLIENTA', '70011122', [71]); kf.lead(71);
  const F = cargar(kf.K, {}, (p) => p === '/events' ? 500 : 0);
  let rf = F.post({ action:'quienAtiende', cel:'70011122', quien:'Maria Flores' });
  chk('A1a · /events con error → msgOk false e «incompleto»', rf.ok && rf.cuentas[0].msgOk === false && rf.incompleto === true, { msgOk:rf.cuentas[0].msgOk, inc:rf.incompleto });
  chk('A1b · la hoja anota «No se pudo consultar», no «Libre»', /No se pudo consultar/.test(F.hojas['Quién atiende'].filas[1][4]), F.hojas['Quién atiende'].filas[1]);
  const n0f = F.llamadas.length; F.post({ action:'quienAtiende', cel:'70011122', quien:'Maria Flores' });
  chk('A1c · un resultado incompleto NO queda en la caché (reintentar vuelve a preguntar)', F.llamadas.length > n0f);
  const F2 = cargar(kf.K, {}, (p) => p === '/tasks' ? 429 : 0);
  rf = F2.post({ action:'quienAtiende', cel:'70011122' });
  chk('A1d · /tasks con error → tareasOk false', rf.cuentas[0].tareasOk === false && rf.incompleto === true);
  const F3 = cargar(kf.K, {}, (p) => p === '/contacts' ? 401 : 0);
  rf = F3.post({ action:'quienAtiende', cel:'70011122' });
  chk('A1e · la búsqueda falla (401) → error e incompleto', /HTTP 401/.test(rf.cuentas[0].error || '') && rf.incompleto === true, rf.cuentas[0]);

  /* A3 · Sueña: el usuario 13073611 («Alberto Pareja» en Kommo) se muestra como Juan Pablo Paredes */
  const ks = kommo(); ks.K.enSuena = true; ks.K.usuarios._embedded.users.push({ id:13073611, name:'Alberto Pareja' });
  ks.contacto(81, 'CLIENTE SUENA', '72220000', [881]); ks.lead(881, { responsible_user_id:13073611 });
  ks.ev(81, 881, 'incoming_chat_message', S - D, 0); ks.ev(81, 881, 'outgoing_chat_message', S - D + H, 13073611);
  const SU = cargar(ks.K);
  const rsu = SU.post({ action:'quienAtiende', cel:'72220000' });
  const ls = (rsu.cuentas[1].leads || [])[0];
  chk('A3 · en Sueña, Juan Pablo Paredes (no «Alberto Pareja»)', ls && ls.resp === 'Juan Pablo Paredes' && ls.par && ls.par.quien === 'Juan Pablo Paredes', ls && { resp:ls.resp, par:ls.par });

  /* A4 · dos vendedoras en el MISMO lead: salen las dos, con desde cuándo */
  const k4 = kommo(); k4.contacto(41, 'MISMO LEAD', '73330000', [411]); k4.lead(411, { responsible_user_id:U_CAR });
  k4.ev(41, 411, 'incoming_chat_message', S - 5 * D, 0); k4.ev(41, 411, 'outgoing_chat_message', S - 5 * D + H, U_CAR);
  k4.ev(41, 411, 'outgoing_chat_message', S - 2 * H, U_MAR); k4.ev(41, 411, 'incoming_chat_message', S - H, 0);
  const A4 = cargar(k4.K), r4 = A4.post({ action:'quienAtiende', cel:'73330000' }), l4 = r4.cuentas[0].leads[0];
  chk('A4 · el lead trae a las dos: María (la más nueva) y Carola (desde hace 5 días)', l4.pares.length === 2 && l4.pares[0].quien === 'Maria Flores' && l4.pares[1].quien === 'Carola Chavez' && l4.pares[1].desde === S - 5 * D + H, l4.pares);
  global.__R4 = r4;

  /* M5 · una tarea del bot o a más de 90 días no es «fecha acordada» */
  const k5 = kommo(); k5.contacto(51, 'TAREAS', '74440000', [511, 512]); k5.lead(511); k5.lead(512);
  k5.K.tareas.push({ entity_type:'leads', entity_id:511, complete_till:S + 3 * D, responsible_user_id:U_MAR, created_by:0, is_completed:false });
  k5.K.tareas.push({ entity_type:'leads', entity_id:512, complete_till:S + 200 * D, responsible_user_id:U_MAR, created_by:U_MAR, is_completed:false });
  k5.K.tareas.push({ entity_type:'contacts', entity_id:51, complete_till:S + 9 * D, responsible_user_id:U_CAR, created_by:U_CAR, is_completed:false });
  const r5 = cargar(k5.K).post({ action:'quienAtiende', cel:'74440000' }), L5 = r5.cuentas[0].leads;
  chk('M5 · la del bot y la de 200 días no cuentan; la puesta en el CONTACTO sí (a los dos leads)', L5.every(l => l.tarea && l.tarea.ts === S + 9 * D && l.tarea.quien === 'Carola Chavez'), L5.map(l => l.tarea));

  /* B3 · un teléfono fijo de 7 números · B4 · un contacto sin leads vivos */
  const kb = kommo(); kb.contacto(71, 'FIJO', '+591 3 3345678', [999]);
  const rb3 = cargar(kb.K).post({ action:'quienAtiende', cel:'3345678' });
  chk('B3/B4 · el fijo de 7 se encuentra; su lead borrado (204) no es un error: «sin ningún lead» no', rb3.cuentas[0].contactos === 1 && !rb3.cuentas[0].error && !rb3.incompleto, rb3.cuentas[0]);

  /* M6 · tope por persona y día */
  const kt = kommo(); kt.contacto(61, 'X', '70011122', []);
  const T = cargar(kt.K); let rt = null;
  for (let i = 0; i < 81; i++) rt = T.post({ action:'quienAtiende', cel:'70011122', quien:'Isabel Robledo' });
  chk('M6a · la búsqueda 81 del día → «tope»', rt.ok === false && rt.error === 'tope', rt);
  chk('M6b · otra persona sigue pudiendo', T.post({ action:'quienAtiende', cel:'70011122', quien:'Carola Chavez' }).ok === true);
  chk('M6c · por nombre, palabras ENTERAS: «co nu» no busca (una de 3+ letras) y «ana roj» no es «Ana Rojas»',
      N.post({ action:'quienAtiende', nombre:'co nu' }).error === 'nombre' && (N.post({ action:'quienAtiende', nombre:'ana roj' }).cuentas[0].leads || []).length === 0);
  /* M3 · João Peña */
  const kj = kommo(); kj.contacto(31, 'João Peña', '75550000', [311]); kj.lead(311);
  const rj = cargar(kj.K).post({ action:'quienAtiende', nombre:'joao pena', nombreOrig:'João Peña' });
  chk('M3 · «João Peña» se encuentra (ã, ñ)', (rj.cuentas[0].leads || []).length === 1, rj.cuentas[0]);
  /* 📝 (2026-11-21-a, dueño 21/11: «si la vendedora avisa en notas que pasará por X sucursal a comprar… debería avisar»; eligió «solo visita o compra») */
  const kn = kommo(); kn.contacto(81, 'LUIS INVENTADO', '77460001', [811]); kn.lead(811, { responsible_user_id:U_CAR, status_id:103 });
  const nota = (id, txt, ts, quien, o) => kn.K.notas.push(Object.assign({ id, entity_id:811, note_type:'common', params:{ text:txt }, created_at:ts, updated_at:ts, created_by:quien }, o || {}));
  nota(1, 'Pasará por la sucursal Banzer a comprar, acá no hay stock', S - 2 * D, U_CAR);
  let An = cargar(kn.K), rnN = An.post({ action:'quienAtiende', cel:'77460001', quien:'Maria Flores' }), ln = rnN.cuentas[0].leads[0];
  chk('N1 · una nota de VISITA o COMPRA de Carola hace 2 días va en el lead (quién, cuándo, el texto corto)', ln && ln.nota && ln.nota.quien === 'Carola Chavez' && ln.nota.ts === S - 2 * D && /Banzer/.test(ln.nota.txt) && rnN.cuentas[0].notasOk === true, ln && ln.nota);
  chk('N2 · y la hoja dice «Atiende: Carola Chavez» (sin conversación ni tarea)', /^Atiende: Carola Chavez$/.test(An.hojas['Quién atiende'].filas[1][4]), An.hojas['Quién atiende'].filas[1]);
  const nq = An.llamadas.filter(c => /notes$/.test(c.p));
  chk('N3 · las notas se piden comunes y de los últimos 15 días, de los leads y de los contactos', nq.length === 2 && nq.every(c => c.q['filter[note_type][]'][0] === 'common' && Number(c.q['filter[updated_at][from]'][0]) === S - 15 * D), nq.map(c => c.p + ' ' + JSON.stringify(c.q)));
  const otraNota = (txt, ts, quien, o) => { kn.K.notas = []; nota(9, txt, ts, quien, o); const r9 = cargar(kn.K).post({ action:'quienAtiende', cel:'77460001' }); return r9.cuentas[0].leads[0].nota; };
  chk('N4 · «no contesta» no es una visita ni una compra: no cuenta', otraNota('No contesta, llamar de nuevo', S - D, U_CAR) === null);
  chk('N5 · una de hace 20 días no cuenta', otraNota('Viene a la tienda el sábado', S - 20 * D, U_CAR, { updated_at:S - D }) === null);
  chk('N6 · la del sistema (created_by 0) no cuenta', otraNota('Compra en la tienda', S - D, 0) === null);
  chk('N7 · la que escribe el propio panel («🧾 Venta cargada en el panel de pedidos…») no cuenta', otraNota('🧾 Venta cargada en el panel de pedidos: OC 11-270 · Bs 4.500', S - D, U_CAR) === null);
  chk('N8 · con tildes y mayúsculas: «VENDRÁ el lunes», «lo compra mañana», «visitó la tienda» sí',
      !!otraNota('VENDRÁ el lunes', S - D, U_CAR) && !!otraNota('lo compra mañana', S - D, U_CAR) && !!otraNota('visitó la tienda', S - D, U_CAR));
  chk('N9 · «comprobante» o «pasaje» no son una compra ni una visita', otraNota('mandó el comprobante del pasaje', S - D, U_CAR) === null);
  kn.K.notas = []; kn.K.notas.push({ id:5, et:'contacts', entity_id:81, note_type:'common', params:{ text:'Pasa por Mia Plaza a comprar' }, created_at:S - D, updated_at:S - D, created_by:U_CAR });
  rnN = cargar(kn.K).post({ action:'quienAtiende', cel:'77460001' });
  chk('N10 · una nota en el CONTACTO también vale para su lead', rnN.cuentas[0].leads[0].nota && rnN.cuentas[0].leads[0].nota.quien === 'Carola Chavez', rnN.cuentas[0].leads[0]);
  const Fn = cargar(kn.K, {}, (pp) => /notes$/.test(pp) ? 500 : 0), rf2 = Fn.post({ action:'quienAtiende', cel:'77460001' });
  chk('N11 · Kommo no devuelve las notas → notasOk false e INCOMPLETO (nunca «Libre»)', rf2.cuentas[0].notasOk === false && rf2.incompleto === true && /No se pudo consultar/.test(Fn.hojas['Quién atiende'].filas[1][4]), rf2.cuentas[0]);
  /* (Revisión de Fable, 21/11) Frases: «pas…» solo con lo que sigue, las que dicen que NO, las de otra tienda o de la competencia, y las del panel */
  const FR = [['Pasa mañana a ver los colchones', true], ['quiere que le reservemos el de 140', true], ['retira el sábado en Banzer', true],
              ['se acercará al local de Mia Plaza', true], ['Irá a la tienda el lunes', true],
              ['el paso siguiente es mandarle la cotización', false], ['le pasé la cotización por WhatsApp', false], ['No va a comprar, está caro', false],
              ['compró en otra tienda', false], ['compró con la competencia', false], ['No le interesa', false], ['no comprende el precio', false],
              ['🙅 Cotización COT-12: no compra — caro', false], ['Cotización COT-5: 1 colchón · total Bs 3.000', false],
              /* revisión 2 de Fable: un «no» en otro pedazo de la nota no la anula; «pasará el 25», «quedó en pasar»; «no vino» no */
              ['No compró hoy, vuelve el sábado a comprar', true], ['Cliente no viene hoy sino el lunes', true], ['Pasará el 25', true],
              ['quedó en pasar', true], ['Pasará el sábado a comprar, no le interesa el somier', true], ['La competencia le ofrece más barato, viene mañana a comparar', true],
              ['quedó en venir y nunca vino', false], ['no nos visitó', false]];
  const malF = FR.filter(([t, si]) => !!otraNota(t, S - D, U_CAR) !== si).map(x => x[0]);
  chk('N17 · las frases: «pasa mañana/reservar/retira/irá» sí; «el paso siguiente», «le pasé», «no va a comprar», «compró en otra», «competencia», las del panel no', !malF.length, malF);
  /* Páginas: 300 notas en el lead, la de visita en la segunda página → se lee; con más de 4 páginas llenas → incompleto */
  kn.K.notas = []; for (let i = 0; i < 260; i++) nota(100 + i, i === 255 ? 'Pasa por Banzer a comprar el sábado' : 'Llamar de nuevo ' + i, S - D - i, U_CAR);
  let rp = cargar(kn.K).post({ action:'quienAtiende', cel:'77460001' });
  chk('N18 · la nota de visita en la SEGUNDA página de notas también cuenta', rp.cuentas[0].notasOk === true && rp.cuentas[0].leads[0].nota && /Banzer/.test(rp.cuentas[0].leads[0].nota.txt), rp.cuentas[0].leads[0].nota);
  kn.K.notas = []; for (let i = 0; i < 1100; i++) nota(100 + i, 'Llamar de nuevo ' + i, S - D, U_CAR);
  rp = cargar(kn.K).post({ action:'quienAtiende', cel:'77460001' });
  chk('N19 · más de 4 páginas llenas de notas → notasOk false e INCOMPLETO (nunca «Libre»)', rp.cuentas[0].notasOk === false && rp.incompleto === true, rp.cuentas[0].notasOk);
  /* La del formulario mira solo la marca de quien vende */
  kn.K.notas = [];
  const As = cargar(kn.K), rs = As.post({ action:'quienAtiende', cel:'77460001', quien:'Maria Flores', auto:1, solo:'heaven' });
  chk('N20 · la del formulario con `solo:heaven` pregunta solo a Heaven (una cuenta)', rs.cuentas.length === 1 && rs.cuentas[0].marca === 'heaven', rs.cuentas.map(c => c.marca));
  const rs2 = As.post({ action:'quienAtiende', cel:'77460001', quien:'Maria Flores', auto:1, solo:'cualquiera' });
  chk('N21 · un `solo` que no es una marca se ignora (las dos cuentas)', rs2.cuentas.length === 2, rs2.cuentas.map(c => c.marca));
  kn.K.notas = []; nota(1, 'Pasará por la sucursal Banzer a comprar, acá no hay stock', S - 2 * D, U_CAR);
  global.__RNOTA = cargar(kn.K).post({ action:'quienAtiende', cel:'77460001' });
  return r;
}

async function pagina(respuesta) {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const errs = [];
  const abrir = async (prueba) => {
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(AHORA));
    if (prueba) await page.addInitScript(() => { window.QA_PRUEBA = 1; });
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
    return page;
  };
  let page = await abrir(false);
  chk('10a · en Playwright la pestaña está escondida', await page.evaluate(() => document.getElementById('tab-qa').hidden === true));
  await page.close();
  page = await abrir(true);
  chk('10b · con QA_PRUEBA aparece y abre la vista', await page.evaluate(() => { showView('qa'); return !document.getElementById('tab-qa').hidden && document.getElementById('view-qa').classList.contains('active') && document.getElementById('tab-qa').classList.contains('active'); }));
  const buscar = (cel, yo, resp, srv) => page.evaluate(async (a) => {
    SERVER_VER = a.srv || '2026-11-20-a';
    try { localStorage.setItem('me_mis_vendedor', a.yo || ''); } catch (e) {}
    window.__resp = a.resp; window.apiPost = function () { return Promise.resolve(JSON.parse(JSON.stringify(window.__resp))); };
    document.getElementById('qa-cel').value = a.cel; qaBuscar();
    await new Promise(r => setTimeout(r, 80));
    return document.getElementById('qa-res').innerText.replace(/\s+/g, ' ');
  }, { cel, yo, resp, srv });
  let t = await buscar('70011122', 'Maria Flores', respuesta);
  chk('11a · María busca: «Lo está atendiendo Carola Chavez», con la fecha y hasta cuándo vale', /Lo está atendiendo Carola Chavez/.test(t) && /vale hasta el 02\/12/.test(t), t.slice(0, 300));
  chk('11b · la fecha acordada de María (la tarea) es suya: dice «Carola (y vos)», no la nombra como «otra»', /Lo está atendiendo Carola Chavez \(y vos\)/.test(t) && !/Lo está atendiendo [^.(]*Maria Flores/.test(t), t.slice(0, 200));
  chk('11c · cada lead con su marca, etapa, responsable, última conversación y la tarea', /Heaven/.test(t) && /Cotizacion enviada/.test(t) && /Asignado a Carola Chavez \(Tienda Banzer\)/.test(t) && /Fecha acordada/.test(t) && !/mes que viene/.test(t), t);
  chk('11d · el lead de María dice que no hubo conversación (cliente y vendedora a ≤ 24 h)', /ninguna en 60 días/.test(t), t);
  t = await buscar('70011122', 'Carola Chavez', respuesta);
  chk('11e · Carola busca: «Lo está atendiendo Maria Flores» por la fecha acordada (la regla de la excepción)', /Lo está atendiendo Maria Flores/.test(t) && /fecha acordada para el 25\/11/.test(t), t.slice(0, 260));
  const sinTarea = JSON.parse(JSON.stringify(respuesta)); sinTarea.cuentas[0].leads.forEach(l => { l.tarea = null; });
  t = await buscar('70011122', 'Carola Chavez', sinTarea);
  chk('11f · sin la tarea, Carola ve «Lo estás atendiendo vos»', /Lo estás atendiendo vos/.test(t), t.slice(0, 200));
  const viejo = JSON.parse(JSON.stringify(sinTarea)); viejo.ahora += 20 * 86400;
  t = await buscar('70011122', 'Isabel Robledo', viejo);
  chk('11g · 20 días después: «Libre» y con quién fue la última conversación', /Libre: nadie lo está atendiendo/.test(t) && /La última fue con Carola Chavez/.test(t), t.slice(0, 260));
  const compro = JSON.parse(JSON.stringify(viejo)); compro.cuentas[0].leads[0].cerrado = 'ganado'; compro.cuentas[0].leads[0].cierre = viejo.ahora - 2 * 86400;
  t = await buscar('70011122', 'Isabel Robledo', compro);
  chk('11h · si compró hace poco: «Ya compró con …»', /Ya compró con Carola Chavez/.test(t), t.slice(0, 200));
  t = await buscar('70011122', '', respuesta);
  chk('11i · sin nombre elegido, pide elegirlo para saber si sos vos', /Elegí tu nombre/.test(t), t.slice(0, 300));
  /* 12 · sin el servidor nuevo: lo que el panel sabe */
  t = await page.evaluate(async () => {
    STATE = [{ id:'p1', oc:'11-201', cliente:'CLIENTA INVENTADA', celular:'+591 700 11122', vendedor:'Maria Flores', ts:Date.now() - 86400000, fecha:'2026-11-22', productos:[] },
             { id:'p2', oc:'11-202', cliente:'OTRA', celular:'71119999', vendedor:'Isabel Robledo', ts:Date.now(), fecha:'2026-11-22', productos:[] }];
    window.apiPost = function () { window.__llamo = 1; return Promise.resolve({}); };
    SERVER_VER = '2026-11-17-d'; window.__llamo = 0;
    document.getElementById('qa-cel').value = '70011122'; qaBuscar();
    await new Promise(r => setTimeout(r, 50));
    return document.getElementById('qa-res').innerText.replace(/\s+/g, ' ') + (window.__llamo ? ' [LLAMÓ]' : '');
  });
  chk('12 · con un servidor anterior: dice qué falta, no llama y muestra el pedido del panel con ese celular (y no el otro)', /falta una versión nueva del servidor/.test(t) && /OC 11-201/.test(t) && !/11-202/.test(t) && !/LLAMÓ/.test(t), t);
  t = await page.evaluate(async () => { document.getElementById('qa-cel').value = '7001'; qaBuscar(); return document.getElementById('qa-res').innerText; });
  chk('13a · un número incompleto pide el número completo', /celular completo/.test(t), t);
  chk('13b · con o sin 591, con espacios o guiones: los mismos 8', await page.evaluate(() => qaCel8('+591 700-11122') === '70011122' && qaCel8('70011122') === '70011122'));
  chk('13c · la regla está a la vista (15 días, 24 h)', await page.evaluate(() => { var d = document.querySelector('.qa-regla').textContent; return /15 días/.test(d) && /24 horas/.test(d); }));
  /* 15 · la página por NOMBRE */
  t = await buscar('Ana Rojas', 'Isabel Robledo', global.__RN);
  chk('15a · dos «Ana Rojas»: lo dice y pide fijarse el final del celular', /Hay 2 clientes que se llaman «ANA ROJAS»/.test(t) && /final del celular/.test(t), t.slice(0, 300));
  chk('15b · cada una con su cartel: la …1111 la atiende Carola, la …2222 libre', /Cliente 1 · ANA ROJAS VACA · 📱 celular terminado en …1111 ⚠️ Lo está atendiendo Carola Chavez/.test(t) && /Cliente 2 · Ana Rojas · 📱 celular terminado en …2222 ✅ Libre/.test(t), t);
  const una = JSON.parse(JSON.stringify(global.__RN)); una.cuentas[0].leads = una.cuentas[0].leads.filter(l => l.id === '921');
  t = await buscar('ana rojas', 'Isabel Robledo', una);
  chk('15c · si hay una sola: el cartel de siempre + «un cliente con ese nombre (terminado en …2222)»', /Libre: nadie lo está atendiendo/.test(t) && /un cliente con ese nombre \(celular terminado en …2222\)/.test(t) && !/Hay 2 clientes/.test(t), t.slice(0, 300));
  t = await page.evaluate(async () => { document.getElementById('qa-cel').value = 'Ana'; qaBuscar(); return document.getElementById('qa-res').innerText; });
  chk('15d · con una sola palabra pide nombre Y apellido', /nombre Y el apellido/.test(t), t);
  t = await page.evaluate(async () => {
    STATE = [{ id:'p9', oc:'11-301', cliente:'ANA ROJAS VACA', celular:'70001111', vendedor:'Carola Chavez', ts:Date.now(), fecha:'2026-11-25', productos:[] },
             { id:'p8', oc:'11-302', cliente:'MARIANA ROJAS', celular:'71113333', vendedor:'Maria Flores', ts:Date.now(), fecha:'2026-11-25', productos:[] }];
    SERVER_VER = '2026-11-17-d'; document.getElementById('qa-cel').value = 'ana rojas'; qaBuscar();
    await new Promise(r => setTimeout(r, 50)); return document.getElementById('qa-res').innerText.replace(/\s+/g, ' ');
  });
  chk('15e · en el panel, por nombre: Ana Rojas Vaca (…1111) sí, Mariana no', /11-301/.test(t) && /…1111/.test(t) && !/11-302/.test(t), t);
  /* Fable, en la página */
  const inc = JSON.parse(JSON.stringify(viejo)); inc.cuentas[0].msgOk = false;
  t = await buscar('70011122', 'Isabel Robledo', inc);
  chk('A1p · sin los mensajes completos y sin nadie a la vista: «No se pudo saber», nunca «Libre»', /No se pudo saber/.test(t) && !/Libre/.test(t), t.slice(0, 300));
  t = await buscar('73330000', 'Maria Flores', global.__R4);
  chk('A4p · María en el lead de Carola: «Lo está atendiendo Carola Chavez (y vos)», Carola primero', /Lo está atendiendo Carola Chavez \(y vos\)/.test(t) && /Carola Chavez: conversa desde el 15\/11/.test(t) && /primera/.test(t), t.slice(0, 500));
  const perd = JSON.parse(JSON.stringify(sinTarea)); perd.cuentas[0].leads.forEach(l => { l.cerrado = 'perdido'; });
  t = await buscar('70011122', 'Isabel Robledo', perd);
  chk('M7 · un lead PERDIDO no retiene: «Libre» y el lead dice «Perdido: no retiene»', /Libre/.test(t) && /Perdido: no retiene/.test(t), t.slice(0, 300));
  t = await page.evaluate(async () => { window.PRACTICA = 1; window.__llamo = 0; window.apiPost = function () { window.__llamo = 1; return Promise.resolve({ ok:true, practica:1 }); }; SERVER_VER = '2026-11-20-a'; document.getElementById('qa-cel').value = '70011122'; qaBuscar(); await new Promise(r => setTimeout(r, 50)); window.PRACTICA = 0; return document.getElementById('qa-res').innerText + (window.__llamo ? ' [LLAMÓ]' : ''); });
  chk('A2 · en el Modo práctica no pregunta ni dice «Libre»', /Modo práctica/.test(t) && !/Libre/.test(t) && !/LLAMÓ/.test(t), t.slice(0, 200));
  t = await buscar('70011122', 'Isabel Robledo', { ok:true, practica:1, ahora:Date.now() });
  chk('A2b · una respuesta sin «cuentas» no se pinta como «Libre»', !/Libre/.test(t) && /Kommo no contestó/.test(t), t.slice(0, 200));
  /* 📝 la nota en la página */
  t = await buscar('77460001', 'Maria Flores', global.__RNOTA, '2026-11-21-a');
  chk('N12 · María busca: «Lo está atendiendo Carola Chavez» por la nota, con la fecha y lo que dice', /Lo está atendiendo Carola Chavez/.test(t) && /anotó en Kommo el 18\/11/.test(t) && /vale hasta el 03\/12/.test(t) && /Banzer a comprar/.test(t), t.slice(0, 400));
  chk('N13 · el lead muestra «📝 Nota de visita o compra»', /Nota de visita o compra/.test(t), t);
  t = await buscar('77460001', 'Carola Chavez', global.__RNOTA, '2026-11-21-a');
  chk('N14 · Carola busca: «Lo estás atendiendo vos» (lo anotaste)', /Lo estás atendiendo vos/.test(t) && /Lo anotaste en Kommo/.test(t), t.slice(0, 300));
  const nInc = JSON.parse(JSON.stringify(viejo)); nInc.cuentas[0].notasOk = false;
  t = await buscar('70011122', 'Isabel Robledo', nInc);
  chk('N15 · sin las notas: «No se pudo saber», nunca «Libre», y lo dice', /No se pudo saber/.test(t) && /no devolvió las notas/.test(t) && !/Libre/.test(t), t.slice(0, 300));
  chk('N16 · la regla a la vista nombra la nota de visita o compra', await page.evaluate(() => /visita o una compra/.test(document.querySelector('.qa-regla').textContent)));
  chk('B1 · el campo deja escribir nombres largos (teclado de texto, 60 letras)', await page.evaluate(() => { var i = document.getElementById('qa-cel'); return i.inputMode === 'text' && i.maxLength === 60; }));
  chk('sin errores de la página', !errs.length, errs);
  await browser.close();
}

(async () => {
  const r = servidor();
  await pagina(r);
  console.log(`\n${PASS} bien, ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
