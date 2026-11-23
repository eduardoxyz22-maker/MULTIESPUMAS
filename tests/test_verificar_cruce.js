/* El verificador de cruces (herramientas/verificar_cruce_ventas.js), sin red (23/11, revisiones de Jarvis).
   Pasa por el «¿Quién lo atiende?» REAL del .gs (quienAtiende_, cruceOtros_) y el qaVeredicto / cruceOtros REALES de pedidos.html, contra
   un Kommo DE MENTIRA (subdominios inventados: contactos, leads, mensajes de a 100, tareas y notas de a 250, con `_links.next`), con el reloj
   puesto en el momento de cada venta. En cada caso, sí + no + pendientes = pedidos, en las cuatro preguntas. */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'herramientas', 'verificar_cruce_ventas.js'));
let ok = 0, mal = 0;
const chk = (c, m) => { if (c) ok++; else { mal++; console.log('  ✗ ' + m); } };

const T = 1795000000, D = 86400;          // el momento de las ventas
const pg = V.cargarPagina();
const SUENA = ['Juan Pablo Paredes', 'Fernando Peinado', 'Mauricio Merida'];
const marcaDe = (v) => SUENA.some((s) => pg.qaMismo(s, v)) ? 'suena' : 'heaven';
const SUB = { heaven: 'heaven-prueba', suena: 'suena-prueba' };   // nunca los de verdad
const PROPS_BASE = { KOMMO_TOKEN: 'falso-h', KOMMO_TOKEN_SUENA: 'falso-s', KOMMO_SUBDOMAIN: SUB.heaven, KOMMO_SUBDOMAIN_SUENA: SUB.suena };

/* ── el Kommo de mentira ── */
const USU_H = [{ id: 11, name: 'Isabel Robledo - Central' }, { id: 12, name: 'Maria Flores - Buenos Aires' }, { id: 13, name: 'Mirian Salazar - Central' }];
const USU_S = [{ id: 21, name: 'Fernando Peinado' }, { id: 22, name: 'Mauricio Merida' }, { id: 13073611, name: 'multiespumas' }];
const vacia = (users) => ({ users, contacts: [], leads: [], events: [], tasks: [], notes: [], falla: {} });
let K, LLAMADAS, nid = 1000;
const nuevo = () => { K = { heaven: vacia(USU_H), suena: vacia(USU_S) }; LLAMADAS = []; PROPS = Object.assign({}, PROPS_BASE); };
function cliente(mk, cel, resp, lead) {
  let c = K[mk].contacts.filter((x) => x.custom_fields_values[0].values[0].value.replace(/\D/g, '').slice(-8) === cel)[0];
  if (!c) { c = { id: ++nid, name: 'Cliente', custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '+591 ' + cel }] }], _embedded: { leads: [] } }; K[mk].contacts.push(c); }
  const l = Object.assign({ id: ++nid, pipeline_id: 1, status_id: 10, responsible_user_id: resp, created_at: T - 30 * D, updated_at: T - D, closed_at: 0 }, lead || {});
  K[mk].leads.push(l); c._embedded.leads.push({ id: l.id });
  return { cid: c.id, lid: l.id };
}
function charla(mk, lid, u, ts) {
  K[mk].events.push({ type: 'incoming_chat_message', entity_type: 'lead', entity_id: lid, created_at: ts, created_by: 0 });
  K[mk].events.push({ type: 'outgoing_chat_message', entity_type: 'lead', entity_id: lid, created_at: ts + 1800, created_by: u });
}
const tarea = (mk, lid, u, creada) => K[mk].tasks.push({ entity_type: 'leads', entity_id: lid, complete_till: T + 5 * D, created_by: u, responsible_user_id: u, created_at: creada, is_completed: false });
const nota = (mk, lid, u, creada, editada) => K[mk].notes.push({ entity_type: 'leads', entity_id: lid, created_at: creada, updated_at: editada || creada, created_by: u, params: { text: 'Pasará por la sucursal a comprar el sábado' } });
const paginar = (x, q, lim, clave) => {
  const pag = Number(q.get('page')) || 1, trozo = x.slice((pag - 1) * lim, pag * lim);
  if (!trozo.length) return { code: 204, body: '' };
  return { code: 200, body: JSON.stringify({ _embedded: { [clave]: trozo }, _links: x.length > pag * lim ? { next: { href: 'x' } } : {} }) };
};
function pedir(url) {
  LLAMADAS.push(url);
  const mk = url.indexOf('//' + SUB.heaven + '.') >= 0 ? 'heaven' : (url.indexOf('//' + SUB.suena + '.') >= 0 ? 'suena' : '');
  const C = K[mk]; if (!C) return { code: 401, body: '' };
  const u = new URL(url), ruta = u.pathname.replace('/api/v4', ''), q = u.searchParams, todos = (k) => q.getAll(k).map(String);
  if (C.falla[ruta] || C.falla['*']) return { code: C.falla[ruta] || C.falla['*'], body: '' };
  const json = (o) => ({ code: 200, body: JSON.stringify(o) }), copia = (x) => JSON.parse(JSON.stringify(x));
  if (ruta === '/users') return json({ _embedded: { users: C.users } });
  if (ruta === '/leads/pipelines') return json({ _embedded: { pipelines: [{ id: 1, name: 'Embudo', _embedded: { statuses: [{ id: 10, name: 'Nueva consulta' }, { id: 20, name: 'Compradores' }, { id: 142, name: 'Ganado' }, { id: 143, name: 'Perdido' }] } }] } });
  if (ruta === '/contacts') { const x = C.contacts.filter((c) => c.custom_fields_values[0].values[0].value.replace(/\D/g, '').indexOf(q.get('query')) >= 0); return x.length ? json({ _embedded: { contacts: copia(x) } }) : { code: 204, body: '' }; }
  if (ruta === '/leads') { const ids = todos('filter[id][]'), x = C.leads.filter((l) => ids.indexOf(String(l.id)) >= 0); return x.length ? json({ _embedded: { leads: copia(x) } }) : { code: 204, body: '' }; }
  if (ruta === '/tasks') {
    const ids = todos('filter[entity_id][]'), et = q.get('filter[entity_type]');
    return paginar(copia(C.tasks.filter((t) => t.entity_type === et && ids.indexOf(String(t.entity_id)) >= 0 && !t.is_completed)), q, 250, 'tasks');
  }
  if (/\/notes$/.test(ruta)) {
    const et = ruta.split('/')[1], ids = todos('filter[entity_id][]'), desde = Number(q.get('filter[updated_at][from]')) || 0;
    return paginar(copia(C.notes.filter((n) => n.entity_type === et && ids.indexOf(String(n.entity_id)) >= 0 && n.updated_at >= desde).sort((a, b) => b.created_at - a.created_at)), q, 250, 'notes');
  }
  if (ruta === '/events') {
    const cids = todos('filter[entity_id][]'), tipos = todos('filter[type][]'), desde = Number(q.get('filter[created_at][from]')) || 0;
    const hasta = q.get('filter[created_at][to]') != null ? Number(q.get('filter[created_at][to]')) : Infinity;
    const de = {}; C.contacts.filter((c) => cids.indexOf(String(c.id)) >= 0).forEach((c) => c._embedded.leads.forEach((l) => { de[l.id] = 1; }));
    return paginar(C.events.filter((e) => de[e.entity_id] && tipos.indexOf(e.type) >= 0 && e.created_at >= desde && e.created_at <= hasta).sort((a, b) => b.created_at - a.created_at), q, 100, 'events');
  }
  return { code: 404, body: '' };
}
let PROPS = Object.assign({}, PROPS_BASE);
const propsVivas = new Proxy({}, { get: (o, k) => PROPS[k], has: (o, k) => k in PROPS, ownKeys: () => Object.keys(PROPS), getOwnPropertyDescriptor: (o, k) => (k in PROPS ? { enumerable: true, configurable: true, value: PROPS[k] } : undefined) });
const gs = V.cargarGs({ pedir, props: propsVivas });
const evaluar = (p, contexto = gs) => {
  V.ENV.T = Math.floor(Number(p.ts) / 1000);
  Object.keys(V.ENV.cache).forEach((k) => { delete V.ENV.cache[k]; });
  V.ENV.dudas = new Set();
  const r = contexto.quienAtiende_({ cel: String(p.celular).replace(/\D/g, '').slice(-8), quien: String(p.vendedor) });
  if (r) r._dudas = Array.from(V.ENV.dudas);
  return r;
};
const cuadra = (R) => ['ind', 'marca', 'cartel', 'wa'].every((k) => R[k].si + R[k].no + R[k].pend === R.total);
const correr = (ventas, nombre) => { const R = V.resumir(ventas, evaluar, pg, marcaDe, gs.cruceOtros_); chk(cuadra(R), (nombre || '') + ' sí + no + pendientes = pedidos en las cuatro preguntas'); return R; };
const venta = (id, v, cel, extra) => Object.assign({ id, vendedor: v, celular: cel, ts: T * 1000, oc: '11-' + id }, extra || {});
const J = (x) => JSON.stringify(x);

chk(typeof gs.quienAtiende_ === 'function' && typeof gs.cruceOtros_ === 'function' && typeof pg.cruceOtros === 'function' && pg.MARCAS.length === 2, '0 carga el .gs y la página reales');

/* 1 · cada pedido por su id */
{
  const VEND = pg.VENDEDORES.filter((v) => !/eduardo|roho/i.test(v));
  const P = [venta('a', 'Isabel Robledo', '70011111', { ts: (T - 5000) * 1000 }), venta('b', 'Isabel Robledo', '70011111', { ts: (T - 1000) * 1000 }), venta('b', 'Isabel Robledo', '70011111', { ts: (T - 1000) * 1000 }),
    venta('c', 'Eduardo Añez', '70022222'), venta('d', 'Isabel Robledo', '123'), venta('e', 'Isabel Robledo', '70033333', { oc: 'ATC 11-001' })];
  const L = V.ventasARevisar(P, pg, VEND, T - D, T);
  chk(L.length === 2 && L[0].id === 'a' && L[1].id === 'b', '1 dos pedidos del mismo cliente y asesora + una fila repetida = 2 ventas: ' + L.map((p) => p.id));
}

/* 2 · Sueña sin token (Jarvis, alta 1) */
{
  nuevo(); delete PROPS.KOMMO_TOKEN_SUENA;
  const a = cliente('heaven', '71100001', 12); charla('heaven', a.lid, 12, T - 3 * D);              // Maria conversaba, vende Isabel
  const R = correr([venta('o', 'Isabel Robledo', '71100001')], '2');
  chk(R.ind.si === 1 && R.ind.parcial === 1 && R.cartel.si === 1 && R.wa.si === 1, '2a el cruce que sí se vio se conserva: ' + J(R.ind));
  chk(V.salidaDe(R) === 1 && V.cuentasCaidas(R).join() === 'suena', '2b una cuenta sin token en TODOS los pedidos → rojo, aunque no haya pendientes en el indicio');
  chk(/Sueña no contestó en NINGÚN pedido \(sin token\)/.test(V.informe(R).join('\n')) && /mirando Sueña: 0 sí · 0 no · 1 pendientes → INCOMPLETA/.test(V.informe(R).join('\n')), '2c el informe nombra la cuenta, el motivo y el sentido incompleto');
}
/* 2d · Sueña contesta 401 */
{
  nuevo(); K.suena.falla['*'] = 401;
  const a = cliente('heaven', '71100002', 12); charla('heaven', a.lid, 12, T - 3 * D);
  const R = correr([venta('o', 'Isabel Robledo', '71100002')], '2d');
  chk(V.salidaDe(R) === 1 && /Sueña no contestó en NINGÚN pedido \(error búsqueda HTTP 401\)/.test(V.informe(R).join('\n')) && /INCOMPLETA/.test(V.informe(R).join('\n')), '2d con 401 de Sueña también rojo, con el código y «INCOMPLETA»: ' + V.informe(R).filter((l) => /Sueña/.test(l)).join(' | '));
}
/* 2e · tuyo y compro incompletos quedan pendientes; compro con fecha de contrato válida */
{
  nuevo(); delete PROPS.KOMMO_TOKEN_SUENA;
  const a = cliente('heaven', '71100003', 11); charla('heaven', a.lid, 11, T - 2 * D);              // tuyo
  cliente('heaven', '71100004', 11, { status_id: 20, updated_at: T - 3 * D, custom_fields_values: [{ field_name: 'Fecha contrato', field_type: 'date', values: [{ value: T - 3 * D }] }] });   // compró hace 3 días
  const R = correr([venta('t', 'Isabel Robledo', '71100003'), venta('c', 'Isabel Robledo', '71100004')], '2e');
  chk(R.ind.pend === 2 && R.ind.motivos['tuyo · Sueña sin token'] === 1 && R.ind.motivos['compro · Sueña sin token'] === 1, '2e «tuyo» y «compro» con Sueña sin token quedan pendientes: ' + J(R.ind.motivos));
  PROPS.KOMMO_TOKEN_SUENA = 'falso-s';
  const R2 = correr([venta('c', 'Isabel Robledo', '71100004')], '2f');
  chk(R2.ind.no === 1 && R2.ind.pend === 0 && V.salidaDe(R2) === 0, '2f el mismo «compro» con las dos cuentas completas queda decidido');
}

/* 3 · identidad (Jarvis, alta 2) */
{
  nuevo(); K.heaven.falla['/users'] = 500;
  const a = cliente('heaven', '72200001', 11); charla('heaven', a.lid, 11, T - 2 * D);              // solo conversó la que vende, sin nombres
  const R = correr([venta('x', 'Isabel Robledo', '72200001')], '3a');
  chk(R.ind.si === 0 && R.ind.pend === 1 && /identidad desconocida/.test(Object.keys(R.ind.motivos)[0]), '3a «usuario 11» sin los nombres no es un cruce: pendiente: ' + J(R.ind));
  chk(R.wa.si === 0 && R.wa.pend === 1, '3b y el WhatsApp tampoco (el bot no avisa sin los nombres)');
  nuevo();
  const b = cliente('heaven', '72200002', 11); cliente('suena', '72200002', 21);
  const s = K.suena.leads[0].id; charla('suena', s, 901, T - 2 * D); charla('suena', s, 902, T - D);  // dos usuarios que no están en la lista
  const R2 = correr([venta('y', 'Isabel Robledo', '72200002')], '3c');
  chk(R2.ind.si === 0 && R2.ind.pend === 1, 'un ID de otra cuenta prueba actividad en esa cuenta, pero no quién la realizó');
  chk(R2.marca.si === 1 && R2.marca.asesores === 2, '3c «usuario 901» y «usuario 902» son dos asesores: ' + J(R2.marca));
}

/* 4 · más leads de los que se miran (Jarvis, alta 3) */
{
  nuevo();
  const a = cliente('heaven', '73300001', 12, { updated_at: T - 20 * D }); charla('heaven', a.lid, 12, T - 3 * D);   // la conversación, en el lead más viejo
  for (let i = 0; i < 8; i++) cliente('heaven', '73300001', 11, { updated_at: T - D - i });
  const R = correr([venta('x', 'Isabel Robledo', '73300001')], '4');
  chk(R.ind.si === 0 && R.ind.pend === 1 && /más leads de los que se miran/.test(Object.keys(R.ind.motivos)[0]), '4a nueve leads y el de la charla afuera: pendiente, no negativo: ' + J(R.ind.motivos));
  chk(!/Heaven: completa en 1 de 1/.test(V.informe(R).join('\n')) && /más leads de los que se miran 1/.test(V.informe(R).join('\n')), '4b la cuenta no dice «completa»');
  chk(R.cartel.pend === 1 && R.wa.pend === 1, '4c el cartel y el WhatsApp también quedan pendientes');
}

/* 5 · el estado de los leads y las notas a la fecha (Jarvis, alta 4) */
{
  nuevo();
  const a = cliente('heaven', '74400001', 12, { status_id: 142, closed_at: T + D, updated_at: T + D }); charla('heaven', a.lid, 12, T - 2 * D);   // se ganó al día siguiente
  const R = correr([venta('x', 'Isabel Robledo', '74400001')], '5a');
  chk(R.ind.si === 1 && R.wa.si === 1 && R.wa.destinatarias === 1, '5a cerrado como ganado DESPUÉS: el cruce de antes sigue: ' + J(R.ind));
  nuevo();
  const b = cliente('heaven', '74400002', 12, { created_at: T + 3600 }); charla('heaven', b.lid, 12, T - 2 * D);   // el lead se creó después de la venta
  const R2 = correr([venta('y', 'Isabel Robledo', '74400002')], '5b');
  chk(R2.ind.si === 0 && R2.ind.no === 1, '5b un lead creado después de la venta no cuenta: ' + J(R2.ind));
  nuevo();
  const c = cliente('heaven', '74400003', 12); nota('heaven', c.lid, 12, T - 2 * D, T + D);           // nota escrita antes y editada después
  const R3 = correr([venta('z', 'Isabel Robledo', '74400003')], '5c');
  chk(R3.ind.si === 0 && R3.ind.pend === 1 && /nota editada después/.test(Object.keys(R3.ind.motivos)[0]), '5c nota editada después: no se usa su texto y queda pendiente: ' + J(R3.ind.motivos));
  nuevo();
  cliente('heaven', '74400004', 11, { status_id: 20, updated_at: T + D });                              // hoy en «Compradores», tocado después
  const R4 = correr([venta('w', 'Isabel Robledo', '74400004')], '5d');
  chk(R4.ind.no === 1 && R4.infoEtapas.heaven['estado histórico'] === 1, '5d etapa de compra tocada después: se informa y el cruce queda decidido');
}

/* 6 · tareas y notas: lo de después no cuenta, lo de antes sí, y las páginas (Jarvis, pruebas) */
{
  nuevo();
  const a = cliente('heaven', '75500001', 12); tarea('heaven', a.lid, 12, T + 600);
  const b = cliente('heaven', '75500002', 12); nota('heaven', b.lid, 12, T + 1800);
  const c = cliente('heaven', '75500003', 12); tarea('heaven', c.lid, 12, T - 600);
  const d = cliente('heaven', '75500004', 12); tarea('heaven', d.lid, 12, T - 600); nota('heaven', d.lid, 13, T - 900);
  const R = correr(['75500001', '75500002', '75500003', '75500004'].map((c8, k) => venta('t' + k, 'Isabel Robledo', c8)), '6a');
  chk(R.ind.si === 2 && R.ind.no === 2 && R.ind.tarea === 1 && R.ind.tareaNota === 1, '6a tarea y nota de después no; tarea de antes «solo tarea»; tarea de una + nota de otra = «tarea y nota»: ' + J(R.ind));
  nuevo();
  const e = cliente('heaven', '75500005', 12); nota('heaven', e.lid, 12, T - 2 * D);
  for (let i = 0; i < 250; i++) nota('heaven', e.lid, 13, T + 60 + i);
  const R2 = correr([venta('n', 'Isabel Robledo', '75500005')], '6b');
  chk(R2.ind.si === 1 && R2.ind.nota === 1, '6b con 250 notas posteriores, la nota válida de la página siguiente aparece: ' + J(R2.ind));
  nuevo();
  const f = cliente('heaven', '75500006', 11);
  for (let i = 0; i < 251; i++) tarea('heaven', f.lid, 11, T - 600);
  const R3 = correr([venta('m', 'Isabel Robledo', '75500006')], '6c');
  chk(R3.ind.pend === 1 && /tareas con más de una página/.test(Object.keys(R3.ind.motivos)[0]), '6c más de una página de tareas (el .gs lee una): pendiente: ' + J(R3.ind.motivos));
}

/* 7 · los mensajes que valen están en una página posterior */
{
  nuevo();
  const a = cliente('heaven', '76600001', 12); charla('heaven', a.lid, 12, T - 3 * D);
  for (let i = 0; i < 160; i++) K.heaven.events.push({ type: 'outgoing_chat_message', entity_type: 'lead', entity_id: a.lid, created_at: T + 60 + i * 60, created_by: 0 });
  const R = correr([venta('a', 'Isabel Robledo', '76600001')], '7');
  chk(R.ind.si === 1 && R.ind.conv === 1, '7a con 160 mensajes más nuevos que la venta, la charla de antes aparece');
  const ev = LLAMADAS.filter((u) => /\/events\?/.test(u));
  chk(ev.length && ev.every((u) => { const m = /filter\[created_at\]\[to\]=(\d+)/.exec(u); return !!m && Number(m[1]) <= T; }), '7b toda pregunta de mensajes lleva el corte y nunca pasa del momento de la venta');
}

/* 8 · otra marca, cartel y WhatsApp por separado */
{
  nuevo();
  cliente('heaven', '77700001', 11); const s = cliente('suena', '77700001', 21); charla('suena', s.lid, 21, T - 2 * D); charla('suena', s.lid, 22, T - D);
  const R = correr([venta('x', 'Isabel Robledo', '77700001')], '8a');
  chk(R.marca.si === 1 && R.marca.asesores === 2 && R.marca.dir['heaven→suena'].si === 1 && R.cartel.no === 1 && R.wa.no === 1 && R.wa.destinatarias === 0,
    '8a solo la otra marca: 1 venta entre marcas, 2 asesores, sin cartel ni WhatsApp: ' + J([R.marca.si, R.marca.asesores, R.cartel, R.wa.destinatarias]));
  nuevo();
  const a = cliente('heaven', '77700002', 12); charla('heaven', a.lid, 12, T - 2 * D); charla('heaven', a.lid, 13, T - D);
  const R2 = correr([venta('y', 'Isabel Robledo', '77700002')], '8b');
  chk(R2.cartel.si === 1 && R2.wa.si === 1 && R2.wa.destinatarias === 2 && R2.porVend['Maria Flores'].avisos === 1 && R2.porVend['Mirian Salazar'].avisos === 1, '8b dos asesoras de la misma marca: una venta, dos destinatarias');
  /* (Jarvis, media) en Sueña fallan los nombres de los usuarios, pero el alias fijo reconoce a Juan Pablo: el cartel sale, el bot no avisa */
  nuevo(); K.suena.falla['/users'] = 500;
  const j = cliente('suena', '77700003', 13073611); charla('suena', j.lid, 13073611, T - 2 * D);
  const R3 = correr([venta('z', 'Fernando Peinado', '77700003')], '8c');
  chk(R3.cartel.si === 1 && R3.wa.si === 0 && R3.wa.pend === 1 && R3.wa.destinatarias === 0, '8c cartel con el alias y WhatsApp pendiente: dos resultados distintos: ' + J([R3.cartel, R3.wa]));
}

/* 9 · ventas de tienda, aparte */
{
  nuevo();
  const a = cliente('heaven', '78800001', 12); charla('heaven', a.lid, 12, T - 2 * D);
  const R = correr([venta('x', 'Isabel Robledo', '78800001', { direccion: 'SALIÓ DE TIENDA · Central' })], '9');
  const t = V.informe(R).join('\n');
  chk(R.tienda === 1 && R.ind.tienda === 1 && R.cartel.tienda === 1 && R.wa.tienda === 1 && /WhatsApp[^\n]*en ventas de tienda: 1/.test(t), '9 las ventas de tienda se cuentan e imprimen en cada pregunta');
}

/* 10 · sin pedidos / todos pendientes / el umbral */
{
  const R0 = V.resumir([], () => null, pg, marcaDe, gs.cruceOtros_);
  chk(V.salidaDe(R0) === 0 && /Sin pedidos elegibles/.test(V.informe(R0).join(' ')) && !/%/.test(V.informe(R0).join(' ')), '10a cero pedidos: «Sin pedidos elegibles», sin porcentaje');
  const R1 = V.resumir([venta('a', 'Isabel Robledo', '79900001'), venta('b', 'Isabel Robledo', '79900002')], () => null, pg, marcaDe, gs.cruceOtros_);
  const t1 = V.informe(R1).join('\n');
  chk(V.salidaDe(R1) === 1 && /sin porcentaje calculable/.test(t1) && !/Indicio[^\n]*%/.test(t1) && cuadra(R1), '10b todos pendientes: «sin porcentaje calculable» y en rojo');
  const U = (pend) => ({ total: 100, ind: { si: 5, no: 95 - pend, pend }, noContesto: { heaven: 0, suena: 0 } });
  chk(V.salidaDe(U(30)) === 0 && V.salidaDe(U(31)) === 1, '10c con 30 pendientes de 100 verde, con 31 rojo');
  chk(V.salidaDe(Object.assign(U(0), { noContesto: { heaven: 0, suena: 100 } })) === 1, '10d cero pendientes pero una cuenta caída en los 100 pedidos: rojo');
}

/* 11 · el mismo nombre con o sin tilde */
{
  nuevo();
  const R = correr([venta('m1', 'Maria Flores', '70100001'), venta('m2', 'María Flores', '70100002')], '11');
  chk(Object.keys(R.porVend).length === 1 && R.porVend['Maria Flores'].ventas === 2, '11 «María Flores» y «Maria Flores» en una fila');
}

/* Un catálogo HTTP 200 puede omitir al vendedor. Un tercero identificado en el mismo caso sigue contando. */
{
  nuevo();
  K.heaven.users = USU_H.filter((u) => u.id !== 11);
  const a = cliente('heaven', '70200001', 11);
  charla('heaven', a.lid, 11, T - 2 * D);
  const p = venta('autor', 'Isabel Robledo', '70200001');
  const R = correr([p], 'identidad propia');
  chk(R.ind.si === 0 && R.ind.pend === 1 && R.cob.heaven['autor sin identificar'] === 1,
    'el ID propio omitido en una lista de usuarios exitosa queda pendiente');
  charla('heaven', a.lid, 12, T - D);
  const R2 = correr([p], 'tercero conocido');
  chk(R2.ind.si === 1 && R2.ind.parcial === 1 && R2.cartel.si === 1,
    'la presencia de un autor sin nombre conserva la conversación identificada de otra asesora');
}

/* La primera venta con etapa de compra se evalúa igual con o sin un catálogo cargado previamente. */
{
  for (const mk of ['heaven', 'suena']) {
    nuevo();
    const contexto = V.cargarGs({ pedir, props: propsVivas });
    const responsable = mk === 'heaven' ? 11 : 21;
    const vendedor = mk === 'heaven' ? 'Isabel Robledo' : 'Fernando Peinado';
    cliente(mk, '70200002', responsable, { status_id: 20, updated_at: T + D });
    const p = venta('etapa', vendedor, '70200002');
    const resumen = () => V.resumir([p], (venta) => evaluar(venta, contexto), pg, marcaDe, contexto.cruceOtros_);
    const primera = resumen(), segunda = resumen();
    const todasNo = (R) => ['ind', 'marca', 'cartel', 'wa'].every((k) => R[k].no === 1 && R[k].pend === 0);
    chk([primera, segunda].every((R) => R.infoEtapas[mk]['estado histórico'] === 1 && todasNo(R) && R.cob[mk].completa === 1 && V.salidaDe(R) === 0),
      'la etapa histórica se informa desde la primera consulta y las cuatro preguntas se deciden en ' + mk);
    K[mk].falla['/leads/pipelines'] = 503;
    const sinEtapas = resumen();
    chk(todasNo(sinEtapas) && sinEtapas.infoEtapas[mk]['catálogo de etapas no disponible'] === 1 &&
      V.salidaDe(sinEtapas) === 0 && V.informe(sinEtapas).some((l) => l.includes('catálogo de etapas no disponible 1')),
      'el catálogo ausente se informa aunque las cuatro preguntas estén decididas en ' + mk);
    delete K[mk].falla['/leads/pipelines'];
    const recuperada = resumen();
    chk(recuperada.infoEtapas[mk]['estado histórico'] === 1 && !recuperada.infoEtapas[mk]['catálogo de etapas no disponible'],
      'se recupera el catálogo de etapas en ' + mk);
    const tercero = mk === 'heaven' ? 12 : 22;
    charla(mk, K[mk].leads[0].id, tercero, T - D);
    const conCharla = resumen();
    chk(['ind', 'cartel', 'wa'].every((k) => conCharla[k].si === 1 && conCharla[k].parcial === 0),
      'la conversación de otra persona mantiene los tres positivos con cobertura completa en ' + mk);
  }
}

/* Las observaciones de etapas se cuentan una vez por pedido, incluso si otra cuenta falla o hay varios leads. */
{
  nuevo();
  K.suena.falla['*'] = 401;
  const historico = { status_id: 20, updated_at: T + 10 };
  cliente('heaven', '70200004', 11, historico);
  cliente('heaven', '70200004', 11, historico);
  const b = cliente('heaven', '70200005', 12, historico);
  charla('heaven', b.lid, 12, T - D);
  const R = correr([venta('a', 'Isabel Robledo', '70200004'), venta('b', 'Isabel Robledo', '70200005')], 'etapa y cuenta caída');
  chk(R.infoEtapas.heaven['estado histórico'] === 2 && R.cob.heaven.completa === 2 && R.cob.suena['error búsqueda HTTP 401'] === 2,
    'tres leads en dos pedidos dan dos observaciones de Heaven y los dos errores de Sueña se conservan, con la operación y el código: ' + J(R.cob.suena));
  chk(R.ind.pend === 1 && R.ind.si === 1 && R.ind.parcial === 1 && R.marca.pend === 2 && V.salidaDe(R) === 1,
    'la cuenta caída deja pendiente la comparación y el positivo sigue siendo parcial');
  chk(['cartel', 'wa'].every((k) => R[k].si === 1 && R[k].no === 1 && R[k].pend === 0 && R[k].parcial === 0),
    'las dos preguntas locales conservan su denominador y su cobertura');
  chk(V.informe(R).some((l) => l.includes('Etapas de Heaven') && l.includes('estado histórico 2')) &&
    !V.informe(R).some((l) => l.includes('pendientes:') && l.includes('estado histórico')),
    'la observación de Heaven se imprime aparte de los motivos de los pendientes');
}

/* Un catálogo ausente no invalida la conversación intermarca. Una nota editada sí impide descartar un cruce. */
{
  for (const [mk, vendedor] of [['heaven', 'Fernando Peinado'], ['suena', 'Isabel Robledo']]) {
    nuevo();
    K[mk].falla['/leads/pipelines'] = 503;
    const u = mk === 'heaven' ? 12 : 22;
    const a = cliente(mk, '70200006', u, { status_id: 20 });
    charla(mk, a.lid, u, T - D);
    const p = venta('inter', vendedor, '70200006');
    const R = correr([p], 'catálogo y charla en ' + mk);
    chk(R.ind.si === 1 && R.ind.parcial === 0 && R.marca.si === 1 && R.marca.parcial === 0 &&
      R.marca.asesores === 1 && R.cartel.no === 1 && R.wa.no === 1 && V.salidaDe(R) === 0,
      'con una conversación y sin catálogo, la venta entre marcas queda decidida en ' + mk);
    K[mk].events = [];
    nota(mk, a.lid, u, T - D, T + D);
    const sinTexto = correr([p], 'catálogo y nota editada en ' + mk);
    chk(sinTexto.ind.pend === 1 && sinTexto.marca.pend === 1 && sinTexto.cob[mk]['nota editada después'] === 1 &&
      sinTexto.infoEtapas[mk]['catálogo de etapas no disponible'] === 1 && V.salidaDe(sinTexto) === 1,
      'la nota editada mantiene pendientes las preguntas afectadas en ' + mk);
  }
}

/* El tipo de error de una cuenta: la operación y el código, sin el mensaje */
{
  const e = V.errorDe;
  chk(e('Kommo no contestó la búsqueda (HTTP 401)') === 'error búsqueda HTTP 401' && e('Kommo no contestó los leads (HTTP 0)') === 'error leads sin respuesta de red' &&
    e('falló: algo raro') === 'error local', 'el error dice la operación y el código: búsqueda 401 / leads sin red / local');
}

/* El subtotal de tienda cuenta una venta con evidencia intermarca. */
{
  nuevo();
  const s = cliente('suena', '70200003', 21);
  charla('suena', s.lid, 21, T - D);
  const p = venta('tienda', 'Isabel Robledo', '70200003', { zona: 'TIENDA' });
  const R = correr([p], 'tienda intermarca');
  chk(R.marca.tienda === 1 && V.informe(R).some((l) => l.includes('Con alguien de la OTRA marca') && l.includes('en ventas de tienda: 1')),
    'el informe imprime el subtotal de tienda en la pregunta intermarca');
}

/* 12 · ningún pedido a un subdominio de verdad */
chk(LLAMADAS.length > 0 && LLAMADAS.every((u) => u.indexOf('heaven-prueba') >= 0 || u.indexOf('suena-prueba') >= 0), '12 las pruebas solo hablan con los subdominios inventados');

/* 13 · la lectura del panel (23/11, Jarvis): un `get_cerrado` o una respuesta sin lista se reintenta, con tope, y nunca es «vacía» */
{
  const lista = JSON.stringify({ ok:true, pedidos:[{ id:'p1' }, { id:'p2' }] });
  const correr = (resps) => { const espera = []; let n = 0;
    const pedir = () => { const r = resps[n++]; if (r instanceof Error) throw r; return r; };
    let res, err = ''; try { res = V.leerPanel(pedir, (ms) => espera.push(ms)); } catch (e) { err = e.message; }
    return { res, err, n, espera }; };
  let r = correr([JSON.stringify({ ok:false, error:'get_cerrado' }), lista]);
  chk(r.res && r.res.length === 2 && r.n === 2 && r.espera.length === 1, '13a get_cerrado y después la lista: reintenta UNA vez y lee 2 pedidos', JSON.stringify(r));
  r = correr([JSON.stringify({ ok:true, version:'x' }), new Error('red'), lista]);
  chk(r.res && r.res.length === 2 && r.n === 3, '13b sin lista y sin red: reintenta hasta leer', JSON.stringify(r));
  r = correr([JSON.stringify({ ok:false, error:'get_cerrado' }), JSON.stringify({ ok:false, error:'get_cerrado' }), JSON.stringify({ ok:false, error:'get_cerrado' }), lista]);
  chk(!r.res && r.n === V.LEER_INTENTOS && /no se pudo leer la planilla/.test(r.err) && /get_cerrado/.test(r.err), '13c con tope: tres get_cerrado seguidos = la corrida falla (no sigue con una lista vacía)', JSON.stringify(r));
  r = correr(['<html>Clientes: JUAN PEREZ 71234567</html>', '<html>x</html>', '<html>x</html>']);
  chk(!r.res && !/JUAN|7123/.test(r.err) && /JSON/.test(r.err), '13d una página de Google no se copia al registro (solo «no contestó JSON»)', r.err);
  r = correr([JSON.stringify({ ok:true, pedidos:[] })]);
  chk(Array.isArray(r.res) && r.res.length === 0 && r.n === 1, '13e una lista de verdad vacía se acepta sin reintentar', JSON.stringify(r));
}

/* 14 · (23/11) lo que va al panel: un renglón por pedido con indicio, solo id y nombres del equipo; una fila del sistema, sin el cliente */
{
  nuevo();
  const a = cliente('heaven', '71100001', 12); charla('heaven', a.lid, 12, T - 3 * D);              // Maria conversaba, vende Isabel
  cliente('heaven', '71100009', 11);                                                                 // sin cruce
  const R = correr([venta('o', 'Isabel Robledo', '71100001', { cliente: 'JUAN PEREZ', direccion: 'CALLE FALSA 123' }), venta('n', 'Isabel Robledo', '71100009', { cliente: 'OTRO CLIENTE' })], '14');
  const it = R.items[0] || {};
  chk(R.items.length === 1 && it.id === 'o' && it.v === 'Isabel Robledo' && it.m === 'h' && it.mm === 1 && it.wa === 1, '14a un renglón para el pedido con indicio (y ninguno para el otro): ' + J(R.items));
  chk(J(it.o) === J([['Maria Flores', 'h', 'c', 0, String(a.lid)]]), '14b quién atendía, de qué marca, por qué (conversaba) y en qué lead: ' + J(it.o));
  const f = V.filaRevision(R, 2, 14, 1763900000000), o = JSON.parse(f.observaciones);
  chk(f.id === V.REV_ID && f.fecha === '' && /^🔎/.test(f.cliente) && o.n === 2 && o.d === 14 && o.i.length === 1, '14c una fila del sistema sin fecha, con cuántas se miraron: ' + J({ id: f.id, n: o.n, d: o.d }));
  chk(!/JUAN|PEREZ|CALLE|71100001|OTRO CLIENTE/.test(JSON.stringify(f)), '14d nada del cliente: ni el nombre, ni la dirección, ni el celular');
  const mandados = []; let resp = [JSON.stringify({ ok: true, pedidos: [] }), JSON.stringify({ ok: true })];
  const g = V.guardarRevision(V.filaRevision(R, 2, 14, 1), [{ id: V.REV_ID, rev: 55 }], (c) => { mandados.push(JSON.parse(c)); return resp.shift(); });
  chk(g.ok && mandados.length === 2 && mandados[1].action === 'save' && mandados[1].pedido.id === V.REV_ID && mandados[1].pedido.rev === 55,
    '14e guarda UNA fila (si Google contesta la lectura, reintenta) con el sello que ya tenía: ' + J({ g, n: mandados.length, rev: (mandados[1] || {}).pedido && mandados[1].pedido.rev }));
  chk(mandados.every((c) => c.pedido.id === V.REV_ID), '14f nunca manda otra fila');
  const g2 = V.guardarRevision(V.filaRevision(R, 2, 14, 1), [], () => JSON.stringify({ ok: false, error: 'clave<script>' }));
  chk(!g2.ok && g2.error === 'clavescript', '14g un «no» del servidor se informa con su código, sin copiar nada más: ' + J(g2));
  const muchos = { items: Array.from({ length: 900 }, (_, i) => ({ id: 'id' + i, v: 'Isabel Robledo', m: 'h', o: [['Maria Flores', 'h', 'c', 0]], mm: 1, wa: 1, yo: 0, td: 0, ts: i })) };
  const fm = V.filaRevision(muchos, 900, 14, 1);
  chk(fm.observaciones.length <= 45000 && JSON.parse(fm.observaciones).i.length > 0, '14h con muchísimos, la fila entra en la celda: ' + fm.observaciones.length);
}

if (process.env.CRUCE_EJEMPLO) {
  nuevo(); delete PROPS.KOMMO_TOKEN_SUENA;
  const a = cliente('heaven', '71100001', 12); charla('heaven', a.lid, 12, T - 3 * D);
  const b = cliente('heaven', '71100003', 11); charla('heaven', b.lid, 11, T - 2 * D);
  const R = V.resumir([venta('o', 'Isabel Robledo', '71100001'), venta('t', 'Isabel Robledo', '71100003')], evaluar, pg, marcaDe, gs.cruceOtros_);
  console.log(V.informe(R).join('\n'));
}
console.log('test_verificar_cruce: ' + ok + ' bien, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
