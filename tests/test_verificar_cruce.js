/* El verificador de cruces (herramientas/verificar_cruce_ventas.js), sin red (23/11, revisiones de Jarvis).
   Pasa por el «¿Quién lo atiende?» REAL del .gs (quienAtiende_, cruceOtros_) y el qaVeredicto REAL de pedidos.html, contra un Kommo DE
   MENTIRA (contactos, leads, mensajes paginados, tareas y notas), con el reloj puesto en el momento de cada venta.
   1 cada pedido cuenta por su id
   2 Heaven completo + Sueña sin token: «tuyo» y «compro» incompletos quedan pendientes; un «otro» con evidencia válida es un cruce parcial;
     la alerta del formulario de una venta de Heaven igual se decide (solo mira Heaven)
   3 solo la otra marca atendía: cruce entre marcas, cero destinatarias de la alerta
   4 otra asesora de la misma marca: una alerta; con dos, sigue siendo UNA venta (dos destinatarias)
   5 una tarea creada después de la venta o una nota escrita 30 min después no respaldan un cruce
   6 mensajes válidos en una página posterior (más de 100 mensajes más nuevos): se encuentran
   7 cero pedidos elegibles / todos pendientes: mensajes distintos y sin porcentaje
   8 umbral: 30 pendientes de 100 = verde, 31 = rojo */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'herramientas', 'verificar_cruce_ventas.js'));
let ok = 0, mal = 0;
const chk = (c, m) => { if (c) ok++; else { mal++; console.log('  ✗ ' + m); } };

const T = 1795000000, H = 3600, D = 86400;          // el momento de las ventas
const pg = V.cargarPagina();
const SUENA = ['Juan Pablo Paredes', 'Fernando Peinado', 'Mauricio Merida'];
const marcaDe = (v) => SUENA.some((s) => pg.qaMismo(s, v)) ? 'suena' : 'heaven';

/* ── el Kommo de mentira: una cuenta por subdominio ── */
function cuentaVacia(usuarios) { return { users: usuarios, contacts: [], leads: [], events: [], tasks: [], notes: [] }; }
const USU_H = [{ id: 11, name: 'Isabel Robledo - Central' }, { id: 12, name: 'Maria Flores - Buenos Aires' }, { id: 13, name: 'Mirian Salazar - Central' }];
const USU_S = [{ id: 21, name: 'Fernando Peinado' }, { id: 22, name: 'Mauricio Merida' }];
function armarKommo() { return { heaven: cuentaVacia(USU_H), suena: cuentaVacia(USU_S) }; }
let K = armarKommo(), LLAMADAS = [];
let nid = 1000;
/* un cliente con un lead en esa cuenta; devuelve el id del lead */
function cliente(mk, cel, resp, estado) {
  const cid = ++nid, lid = ++nid;
  K[mk].contacts.push({ id: cid, name: 'Cliente ' + cid, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '+591 ' + cel }] }], _embedded: { leads: [{ id: lid }] } });
  K[mk].leads.push({ id: lid, pipeline_id: 1, status_id: estado || 10, responsible_user_id: resp, created_at: T - 30 * D, updated_at: T - D });
  return { cid, lid };
}
/* una conversación: el cliente escribe y la persona contesta media hora después */
function charla(mk, lid, u, ts) {
  K[mk].events.push({ type: 'incoming_chat_message', entity_type: 'lead', entity_id: lid, created_at: ts, created_by: 0 });
  K[mk].events.push({ type: 'outgoing_chat_message', entity_type: 'lead', entity_id: lid, created_at: ts + 1800, created_by: u });
}
const subMk = (url) => /\/\/eanez\./.test(url) ? 'heaven' : (/\/\/gerenciamultiespumasviscarra\./.test(url) ? 'suena' : '');
function pedir(url) {
  LLAMADAS.push(url);
  const mk = subMk(url), C = K[mk]; if (!C) return { code: 401, body: '' };
  const u = new URL(url), ruta = u.pathname.replace('/api/v4', ''), q = u.searchParams, todos = (k) => q.getAll(k).map(String);
  const json = (o) => ({ code: 200, body: JSON.stringify(o) });
  if (ruta === '/users') return json({ _embedded: { users: C.users } });
  if (ruta === '/leads/pipelines') return json({ _embedded: { pipelines: [{ id: 1, name: 'Embudo', _embedded: { statuses: [{ id: 10, name: 'Nueva consulta' }, { id: 20, name: 'Compradores' }, { id: 142, name: 'Ganado' }, { id: 143, name: 'Perdido' }] } }] } });
  if (ruta === '/contacts') { const x = C.contacts.filter((c) => c.custom_fields_values[0].values[0].value.replace(/\D/g, '').indexOf(q.get('query')) >= 0); return x.length ? json({ _embedded: { contacts: x } }) : { code: 204, body: '' }; }
  if (ruta === '/leads') { const ids = todos('filter[id][]'), x = C.leads.filter((l) => ids.indexOf(String(l.id)) >= 0); return x.length ? json({ _embedded: { leads: x } }) : { code: 204, body: '' }; }
  if (ruta === '/tasks') {
    const ids = todos('filter[entity_id][]'), et = q.get('filter[entity_type]');
    const x = C.tasks.filter((t) => t.entity_type === et && ids.indexOf(String(t.entity_id)) >= 0 && !t.is_completed);
    return x.length ? json({ _embedded: { tasks: x } }) : { code: 204, body: '' };
  }
  if (/\/notes$/.test(ruta)) {
    const et = ruta.split('/')[1], ids = todos('filter[entity_id][]'), desde = Number(q.get('filter[updated_at][from]')) || 0;
    const x = C.notes.filter((n) => n.entity_type === et && ids.indexOf(String(n.entity_id)) >= 0 && n.created_at >= desde).map((n) => JSON.parse(JSON.stringify(n)));
    return x.length ? json({ _embedded: { notes: x } }) : { code: 204, body: '' };
  }
  if (ruta === '/events') {
    const cids = todos('filter[entity_id][]'), tipos = todos('filter[type][]'), desde = Number(q.get('filter[created_at][from]')) || 0;
    const hasta = q.get('filter[created_at][to]') != null ? Number(q.get('filter[created_at][to]')) : Infinity;
    const leadsDe = {}; C.contacts.filter((c) => cids.indexOf(String(c.id)) >= 0).forEach((c) => c._embedded.leads.forEach((l) => { leadsDe[l.id] = 1; }));
    const x = C.events.filter((e) => leadsDe[e.entity_id] && tipos.indexOf(e.type) >= 0 && e.created_at >= desde && e.created_at <= hasta).sort((a, b) => b.created_at - a.created_at);
    const lim = Number(q.get('limit')) || 100, pag = Number(q.get('page')) || 1, trozo = x.slice((pag - 1) * lim, pag * lim);
    if (!trozo.length) return { code: 204, body: '' };
    return json({ _embedded: { events: trozo }, _links: x.length > pag * lim ? { next: { href: 'x' } } : {} });
  }
  return { code: 404, body: '' };
}
let PROPS = { KOMMO_TOKEN: 'tok-h', KOMMO_TOKEN_SUENA: 'tok-s' };
const gs = V.cargarGs({ pedir, props: new Proxy({}, { get: (o, k) => PROPS[k], has: (o, k) => k in PROPS, ownKeys: () => Object.keys(PROPS), getOwnPropertyDescriptor: (o, k) => (k in PROPS ? { enumerable: true, configurable: true, value: PROPS[k] } : undefined) }) });
const evaluar = (p) => {
  V.ENV.T = Math.floor(Number(p.ts) / 1000);
  Object.keys(V.ENV.cache).forEach((k) => { delete V.ENV.cache[k]; });
  return gs.quienAtiende_({ cel: String(p.celular).replace(/\D/g, '').slice(-8), quien: String(p.vendedor) });
};
const correr = (ventas) => V.resumir(ventas, evaluar, pg, marcaDe, gs.cruceOtros_);
const venta = (id, v, cel, ts, extra) => Object.assign({ id, vendedor: v, celular: cel, ts: (ts || T) * 1000, oc: '11-' + id }, extra || {});
const nuevo = () => { K = armarKommo(); LLAMADAS = []; };

/* 0 */
chk(typeof gs.quienAtiende_ === 'function' && typeof gs.cruceOtros_ === 'function' && typeof pg.qaVeredicto === 'function', '0 carga el .gs y la página reales');

/* 1 */
{
  const VEND = pg.VENDEDORES.filter((v) => !/eduardo|roho/i.test(v));
  const P = [venta('a', 'Isabel Robledo', '70011111', T - 5000), venta('b', 'Isabel Robledo', '70011111', T - 1000), venta('b', 'Isabel Robledo', '70011111', T - 1000),
    venta('c', 'Eduardo Añez', '70022222', T - 900), venta('d', 'Isabel Robledo', '123', T - 900), Object.assign(venta('e', 'Isabel Robledo', '70033333', T - 900), { oc: 'ATC 11-001' })];
  const L = V.ventasARevisar(P, pg, VEND, T - D, T);
  chk(L.length === 2 && L[0].id === 'a' && L[1].id === 'b', '1 dos pedidos del mismo cliente y asesora + una fila repetida = 2 ventas: ' + L.map((p) => p.id));
}

/* 2 · Sueña sin token */
{
  nuevo(); PROPS = { KOMMO_TOKEN: 'tok-h' };
  const a = cliente('heaven', '71100001', 11); charla('heaven', a.lid, 11, T - 2 * D);               // tuyo: la que vende conversaba
  const b = cliente('heaven', '71100002', 12); charla('heaven', b.lid, 12, T - 3 * D);               // otro: Maria conversaba, vende Isabel
  const c = cliente('heaven', '71100003', 11, 20);                                                     // compro (Compradores, sin fecha de contrato)
  const R = correr([venta('t', 'Isabel Robledo', '71100001'), venta('o', 'Isabel Robledo', '71100002'), venta('c', 'Isabel Robledo', '71100003')]);
  chk(R.ind.si === 1 && R.ind.parcial === 1 && R.ind.pend === 2, '2a con Sueña sin token: 1 cruce parcial y 2 pendientes (tuyo/compro incompletos): ' + JSON.stringify(R.ind));
  chk(R.cob.suena['sin token'] === 3 && R.cob.heaven.completa === 3, '2b la cobertura se cuenta por cuenta: Heaven completa 3, Sueña sin token 3: ' + JSON.stringify(R.cob));
  chk(R.alerta.si === 1 && R.alerta.no === 2 && R.alerta.pend === 0, '2c la alerta de una venta de Heaven se decide igual (solo mira Heaven): ' + JSON.stringify(R.alerta));
  chk(R.marca.pend === 3 && R.marca.sinCuenta === 3, '2d la comparación Heaven ↔ Sueña queda incompleta: ' + JSON.stringify(R.marca));
  chk(V.salidaDe(R) === 1 && V.informe(R).some((l) => /INCOMPLETA/.test(l)), '2e con 2 de 3 pendientes sale en rojo y dice que la comparación está incompleta');
  PROPS = { KOMMO_TOKEN: 'tok-h', KOMMO_TOKEN_SUENA: 'tok-s' };
}

/* 3 · solo la otra marca */
{
  nuevo();
  cliente('heaven', '72200001', 11);                                                                   // en Heaven, sin charla
  const s = cliente('suena', '72200001', 21); charla('suena', s.lid, 21, T - 2 * D); charla('suena', s.lid, 22, T - D);   // dos asesores de Sueña
  const R = correr([venta('x', 'Isabel Robledo', '72200001')]);
  chk(R.ind.si === 1 && R.marca.si === 1 && R.marca.asesores === 2, '3a una venta con dos asesores de Sueña = 1 venta entre marcas y 2 asesores: ' + JSON.stringify(R.marca));
  chk(R.alerta.si === 0 && R.alerta.no === 1 && R.alerta.destinatarios === 0, '3b y cero destinatarias de la alerta del formulario: ' + JSON.stringify(R.alerta));
}

/* 4 · la misma marca */
{
  nuevo();
  const a = cliente('heaven', '73300001', 12); charla('heaven', a.lid, 12, T - 2 * D);
  const b = cliente('heaven', '73300002', 12); charla('heaven', b.lid, 12, T - 2 * D); charla('heaven', b.lid, 13, T - D);
  const R = correr([venta('a', 'Isabel Robledo', '73300001'), venta('b', 'Isabel Robledo', '73300002')]);
  chk(R.alerta.si === 2 && R.alerta.destinatarios === 3, '4a dos ventas con alerta; la segunda con dos asesoras = 3 destinatarias: ' + JSON.stringify(R.alerta));
  chk(R.porVend['Maria Flores'].avisos === 2 && R.porVend['Mirian Salazar'].avisos === 1 && R.porVend['Isabel Robledo'].alerta === 2, '4b los avisos potenciales van a quien atendía');
}

/* 5 · tarea creada después, nota escrita después */
{
  nuevo();
  const a = cliente('heaven', '74400001', 12);
  K.heaven.tasks.push({ entity_type: 'leads', entity_id: a.lid, complete_till: T + 5 * D, created_by: 12, responsible_user_id: 12, created_at: T + 600, is_completed: false });
  const b = cliente('heaven', '74400002', 12);
  K.heaven.notes.push({ entity_type: 'leads', entity_id: b.lid, created_at: T + 1800, created_by: 12, params: { text: 'Pasará por la sucursal a comprar el sábado' } });
  const c = cliente('heaven', '74400003', 12);
  K.heaven.tasks.push({ entity_type: 'leads', entity_id: c.lid, complete_till: T + 5 * D, created_by: 12, responsible_user_id: 12, created_at: T - 600, is_completed: false });
  const R = correr([venta('a', 'Isabel Robledo', '74400001'), venta('b', 'Isabel Robledo', '74400002'), venta('c', 'Isabel Robledo', '74400003')]);
  chk(R.ind.si === 1 && R.ind.tarea === 1 && R.ind.no === 2, '5 la tarea creada después y la nota de 30 min después no cuentan; la tarea de antes sí: ' + JSON.stringify(R.ind));
}

/* 6 · los mensajes que valen están en una página posterior */
{
  nuevo();
  const a = cliente('heaven', '75500001', 12); charla('heaven', a.lid, 12, T - 3 * D);
  for (let i = 0; i < 160; i++) K.heaven.events.push({ type: 'outgoing_chat_message', entity_type: 'lead', entity_id: a.lid, created_at: T + 60 + i * 60, created_by: 0 });   // el bot, DESPUÉS
  const R = correr([venta('a', 'Isabel Robledo', '75500001')]);
  chk(R.ind.si === 1 && R.ind.conv === 1, '6a con 160 mensajes más nuevos que la venta, la charla de antes aparece: ' + JSON.stringify(R.ind));
  chk(LLAMADAS.filter((u) => /\/events\?/.test(u)).every((u) => /filter\[created_at\]\[to\]=\d+/.test(u)), '6b toda pregunta de mensajes lleva el corte de la venta');
  chk(LLAMADAS.filter((u) => /\/events\?/.test(u)).every((u) => { const m = /filter\[created_at\]\[to\]=(\d+)/.exec(u); return !!m && Number(m[1]) <= T; }), '6c y el corte nunca pasa del momento de la venta');
}

/* 7 · sin pedidos / todos pendientes */
{
  const R0 = V.resumir([], () => null, pg, marcaDe, gs.cruceOtros_);
  chk(V.salidaDe(R0) === 0 && V.informe(R0).join(' ').indexOf('Sin pedidos elegibles') >= 0 && !/%/.test(V.informe(R0).join(' ')), '7a cero pedidos: «Sin pedidos elegibles», sin porcentaje');
  const R1 = V.resumir([venta('a', 'Isabel Robledo', '76600001'), venta('b', 'Isabel Robledo', '76600002')], () => null, pg, marcaDe, gs.cruceOtros_);
  const t1 = V.informe(R1).join('\n');
  chk(V.salidaDe(R1) === 1 && /sin porcentaje calculable/.test(t1) && !/Indicio[^\n]*%/.test(t1), '7b todos pendientes: «sin porcentaje calculable» y en rojo');
}

/* 8 · el umbral */
{
  const R = (pend) => ({ total: 100, ind: { si: 5, no: 95 - pend, pend } });
  chk(V.salidaDe(R(30)) === 0 && V.salidaDe(R(31)) === 1, '8 con 30 pendientes de 100 verde, con 31 rojo');
}

/* 9 · el mismo nombre con o sin tilde */
{
  nuevo();
  const R = correr([venta('m1', 'Maria Flores', '77700001'), venta('m2', 'María Flores', '77700002')]);
  chk(Object.keys(R.porVend).length === 1 && R.porVend['Maria Flores'] && R.porVend['Maria Flores'].ventas === 2, '9 «María Flores» y «Maria Flores» en una fila: ' + Object.keys(R.porVend));
}

/* 10 · las piezas del corte */
{
  chk(V.cortarPregunta('https://x.kommo.com/api/v4/events?filter[created_at][from]=1&limit=100&page=1', 50).indexOf('filter[created_at][to]=50&limit=') > 0, '10a el corte se agrega a la pregunta');
  chk(/\[to\]=40&/.test(V.cortarPregunta('https://x/api/v4/events?a=1&filter[created_at][to]=40&limit=100', 50)) && /\[to\]=50&/.test(V.cortarPregunta('https://x/api/v4/events?a=1&filter[created_at][to]=90&limit=100', 50)), '10b un corte que ya estaba queda en el menor');
  const n = V.cortarRespuesta('/leads/notes', 200, JSON.stringify({ _embedded: { notes: [{ created_at: 10, params: { text: 'a' } }, { created_at: 60, params: { text: 'b' } }] } }), 50);
  const nn = JSON.parse(n.body)._embedded.notes;
  chk(nn.length === 2 && nn[0].params.text === 'a' && nn[1].params.text === '', '10c la nota de después se vacía pero la página sigue del mismo largo');
}

if (process.env.CRUCE_EJEMPLO) { nuevo(); PROPS = { KOMMO_TOKEN: 'tok-h' };
  const a = cliente('heaven', '71100001', 11); charla('heaven', a.lid, 11, T - 2 * D); const b = cliente('heaven', '71100002', 12); charla('heaven', b.lid, 12, T - 3 * D); cliente('heaven', '71100003', 11, 20);
  console.log(V.informe(correr([venta('t', 'Isabel Robledo', '71100001'), venta('o', 'Isabel Robledo', '71100002'), venta('c', 'Isabel Robledo', '71100003')])).join('\n')); }
console.log('test_verificar_cruce: ' + ok + ' bien, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
