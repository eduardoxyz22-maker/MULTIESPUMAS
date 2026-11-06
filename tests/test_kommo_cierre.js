/* 📥 §4ok-91 LA VENTA DEL PANEL CIERRA SU LEAD EN KOMMO — el servidor (acción `kommoCierre`, kcCierre_).

   LO QUE CUIDA:
   1. APAGADO salvo KOMMO_CIERRE = 1: apagado no le pregunta nada a Kommo.
   2. El lead ABIERTO de esa vendedora con el mismo celular (últimos 8) pasa a «Compradores» con price = el total, «Fecha contrato» = el
      día de la venta (12:00 de Bolivia) y la OC en una nota. La etapa y los campos se LEEN de Kommo (acá con ids inventados, distintos
      de los de verdad: si estuvieran escritos a mano, fallaría).
   3. La fila queda con la marca `klead` (sin cambiar el sello) y KOMMO_CIERRE_HECHO lo recuerda: la misma venta otra vez → `ya`; con
      otro total → solo el precio.
   4. Con dudas no hace nada solo: dos leads, ninguno, o sin celular → `dudas` con los leads abiertos de ella (nombre, contacto, etapa).
      Elegido uno → se cierra ése. «Vino a la tienda» → lo crea en «Compradores» con canal «Visita tienda» (con el contacto que ya tenga
      ese celular, si hay).
   5. No usa un lead cerrado (142/143), de otra vendedora, de otro embudo ni el que ya es OTRA venta del panel; uno que espera como
      borrador en la bandeja SÍ (es la misma venta).
   6. Afuera: ATC, RPT, venta de tienda, Eduardo, ROHO, internos, borradores, filas del sistema; la venta que vino de Kommo es `ya`.
   7. Todo lo que habla con Kommo va SIN el candado; el candado se toma un instante para escribir `klead`.
   8. No duplicar: el repaso de Kommo saltea un lead que cerró el panel aunque la marca `klead` no haya llegado a la fila.
   9. probarKommoEscribe: lee y le vuelve a poner a UN lead ya cargado su MISMO precio; dice si el token deja escribir.
   Datos INVENTADOS (el repo es público).

   Se corre:  node tests/test_kommo_cierre.js   (desde la raíz del repo)
   Contra otro .gs:  GS=/ruta/al/otro.gs node tests/test_kommo_cierre.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts','_productos_json',
  'Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta','A cuenta (Bs)','Facturar a','NIT','N° del día',
  'Verificado','Fotos entrega','Revisión'];
const TS = Date.parse('2026-11-04T15:30:00-04:00');   // la venta se cargó el miércoles 04/11 a las 15:30 de Bolivia
function fila(o) {
  const b = Object.assign({ id:'x', fecha:'2026-11-07', oc:'11-050', vend:'Carola Chavez', cli:'CLIENTA INVENTADA', cel:'70011122', zona:'Norte', dir:'Calle Falsa 1',
    prods:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:3500 }], estado:'', rev:1700000000000, ts:TS }, o);
  return [b.id, b.fecha, b.oc, b.vend, b.cli, 'COLCHON SOFT × 1', b.cel, 'AM', b.zona, b.dir, '', 'NO', 0, b.ts, JSON.stringify(b.prods), 'Efectivo', '', b.estado, 'NO',
    '', '', '', '', 0, '', '', 1, 'NO', '', b.rev];
}
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return { _datos:datos, getLastRow:() => datos.length, getLastColumn:() => datos[0].length, getDataRange:() => ({ getValues:() => datos.map(f => f.slice()) }),
    appendRow:(r) => datos.push(r.slice()), setFrozenRows:() => {},
    getRange:(f, c, nf, nc) => ({
      getValue:() => (datos[f - 1] || [])[c - 1],
      setValue:(v) => { datos[f - 1][c - 1] = v; },
      getValues:() => { const out = []; for (let i = 0; i < (nf || 1); i++) { const r = []; for (let j = 0; j < (nc || 1); j++) r.push((datos[f - 1 + i] || [])[c - 1 + j]); out.push(r); } return out; },
      setValues:(v) => { for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) datos[f - 1 + i][c - 1 + j] = v[i][j]; } }) };
}

/* ── Kommo de mentira: ids INVENTADOS (la etapa «Compradores» = 555, «Fecha contrato» = 777, «Canal» = 888 con «Visita tienda» = 8883) ── */
const ETAPA = 555, EMBUDO = 13349719, FC = 777, CANAL = 888, VISITA = 8883, UID_CAROLA = 901, UID_MARIA = 902;
function kommoBase() {
  return {
    pipelines:{ _embedded:{ pipelines:[{ id:EMBUDO, name:'Ventas', is_main:true, _embedded:{ statuses:[
      { id:101, name:'Incoming leads' }, { id:102, name:'Nueva consulta' }, { id:103, name:'Cotizacion enviada' }, { id:ETAPA, name:'Compradores' },
      { id:142, name:'Logrado con éxito' }, { id:143, name:'Venta perdida' } ] } }, { id:999, name:'Otro embudo', _embedded:{ statuses:[{ id:ETAPA + 1, name:'Compradores' }] } }] } },
    campos:{ _embedded:{ custom_fields:[ { id:111, name:'Dirección entrega', type:'text' }, { id:FC, name:'Fecha contrato', type:'date' },
      { id:CANAL, name:'Canal', type:'select', enums:[{ id:8881, value:'Facebook' }, { id:8882, value:'Instagram' }, { id:VISITA, value:'Visita tienda' }] } ] } },
    usuarios:{ _embedded:{ users:[{ id:UID_CAROLA, name:'Carola Chavez - Central' }, { id:UID_MARIA, name:'Maria Flores - Buenos Aires' }] } },
    contactos:{},     // id → contacto
    leads:{}          // id → lead
  };
}
const contacto = (K, id, nombre, tel, leads) => { K.contactos[id] = { id, name:nombre, custom_fields_values:[{ field_id:1, field_code:'PHONE', values:[{ value:tel }] }], _embedded:{ leads:(leads || []).map(x => ({ id:x })) } }; };
const lead = (K, id, o) => { K.leads[id] = Object.assign({ id, name:'Lead ' + id, price:0, status_id:103, pipeline_id:EMBUDO, responsible_user_id:UID_CAROLA, updated_at:1793900000, _embedded:{ contacts:[] } }, o); };

function cargar(filas, props, K, opts) {
  opts = opts || {};
  const sh = hacerPlanilla([HDR].concat(filas)), llamadas = [], lock = { tomado:false, veces:0, ocupado:!!opts.candadoOcupado };
  const cache = { _m:{}, get(k) { return this._m[k] != null ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { Object.assign(this._m, o); }, remove(k) { delete this._m[k]; } };
  const resp = (code, o) => ({ getResponseCode:() => code, getContentText:() => o == null ? '' : JSON.stringify(o) });
  const qs = (u) => { const q = {}; (u.split('?')[1] || '').split('&').forEach(p => { if (!p) return; const i = p.indexOf('='), k = decodeURIComponent(i < 0 ? p : p.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(p.slice(i + 1)); (q[k] = q[k] || []).push(v); }); return q; };
  const ctx = {
    console, Date,
    SpreadsheetApp:{ getActiveSpreadsheet:() => ({ getSheetByName:() => sh, insertSheet:() => sh }), flush:() => {} },
    PropertiesService:{ getScriptProperties:() => ({ getProperty:(k) => props[k] != null ? props[k] : null, setProperty:(k, v) => { props[k] = String(v); }, deleteProperty:(k) => { delete props[k]; } }) },
    LockService:{ getScriptLock:() => ({ waitLock() { if (lock.ocupado) throw new Error('busy'); lock.tomado = true; lock.veces++; }, releaseLock() { lock.tomado = false; } }) },
    CacheService:{ getScriptCache:() => cache },
    ContentService:{ MimeType:{ JSON:'json' }, createTextOutput:(t) => ({ _t:t, setMimeType() { return this; } }) },
    Utilities:{ formatDate:(d) => String(d) },
    Session:{ getScriptTimeZone:() => 'America/La_Paz', getTemporaryActiveUserKey:() => 'ABCDEFGH' },
    ScriptApp:{ newTrigger:() => ({ timeBased:() => ({ after:() => ({ create:() => ({}) }) }) }), getProjectTriggers:() => [], deleteTrigger:() => {} },
    UrlFetchApp:{ fetch:(url, op) => {
      op = op || {};
      const metodo = String(op.method || 'get').toLowerCase(), ruta = url.split('/api/v4')[1] || '', p = ruta.split('?')[0], q = qs(ruta);
      const cuerpo = op.payload ? JSON.parse(op.payload) : null;
      llamadas.push({ metodo, ruta, p, q, cuerpo, conCandado:lock.tomado, auth:(op.headers || {}).Authorization });
      if (opts.falla && opts.falla(metodo, p)) return resp(opts.falla(metodo, p), { title:'no' });
      if (metodo === 'get' && p === '/leads/pipelines') return resp(200, K.pipelines);
      if (metodo === 'get' && p === '/leads/custom_fields') return resp(200, K.campos);
      if (metodo === 'get' && p === '/users') return resp(200, K.usuarios);
      if (metodo === 'get' && p === '/contacts') {
        if (q.query) { const t = q.query[0]; const cs = Object.values(K.contactos).filter(c => JSON.stringify(c.custom_fields_values).indexOf(t) >= 0); return cs.length ? resp(200, { _embedded:{ contacts:cs } }) : resp(204, null); }
        const ids = q['filter[id][]'] || []; return resp(200, { _embedded:{ contacts:ids.map(i => K.contactos[i]).filter(Boolean) } });
      }
      if (metodo === 'get' && p === '/leads') {
        let L = Object.values(K.leads);
        if (q['filter[id][]']) L = q['filter[id][]'].map(i => K.leads[i]).filter(Boolean);
        if (q['filter[responsible_user_id]']) L = L.filter(l => String(l.responsible_user_id) === q['filter[responsible_user_id]'][0]);
        if (q['filter[pipeline_id]']) L = L.filter(l => String(l.pipeline_id) === q['filter[pipeline_id]'][0]);
        if (q['filter[statuses][0][status_id]']) L = L.filter(l => String(l.status_id) === q['filter[statuses][0][status_id]'][0]);
        L = L.slice().sort((a, b) => b.updated_at - a.updated_at);
        return L.length ? resp(200, { _embedded:{ leads:L } }) : resp(204, null);
      }
      let m;
      if (metodo === 'get' && (m = /^\/leads\/(\d+)$/.exec(p))) return K.leads[m[1]] ? resp(200, K.leads[m[1]]) : resp(404, {});
      if (metodo === 'patch' && (m = /^\/leads\/(\d+)$/.exec(p))) { const l = K.leads[m[1]]; if (!l) return resp(404, {}); Object.assign(l, cuerpo); return resp(200, { id:l.id, updated_at:1 }); }
      if (metodo === 'post' && (m = /^\/leads\/(\d+)\/notes$/.exec(p))) { (K.notas = K.notas || []).push({ lead:m[1], txt:cuerpo[0].params.text }); return resp(200, { _embedded:{ notes:[{ id:1 }] } }); }
      if (metodo === 'post' && p === '/leads/complex') { const id = 70001; lead(K, id, Object.assign({}, cuerpo[0], { id })); return resp(200, [{ id, contact_id:60001 }]); }
      if (metodo === 'post' && p === '/leads') { const id = 70002; lead(K, id, Object.assign({}, cuerpo[0], { id })); return resp(200, { _embedded:{ leads:[{ id }] } }); }
      return resp(404, {});
    } }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData:{ contents:JSON.stringify(b) }, parameter:{} })._t);
  const cerrar = (b) => post(Object.assign({ action:'kommoCierre' }, b));
  const row = (id) => sh._datos.find(f => f[0] === id);
  const klead = (id) => { const r = row(id); try { const a = JSON.parse(r[14]); return a.map(x => x.klead || '').join(','); } catch (e) { return '?'; } };
  return { ctx, sh, llamadas, lock, cache, props, post, cerrar, row, klead, K };
}
const ON = () => ({ KOMMO_TOKEN:'token-de-prueba', KOMMO_CIERRE:'1' });
const escrituras = (a) => a.llamadas.filter(x => x.metodo !== 'get');

console.log('\n── 1. Apagado por defecto ──');
{
  const K = kommoBase(); contacto(K, 5001, 'CLIENTA INVENTADA', '+591 70011122', [4001]); lead(K, 4001, {});
  const a = cargar([fila({ id:'p1' })], { KOMMO_TOKEN:'token-de-prueba' }, K);
  const r = a.cerrar({ id:'p1', total:3500 });
  chk('⚠️ a. sin KOMMO_CIERRE = 1: `apagado` y ni una llamada a Kommo', r.ok && r.apagado === true && a.llamadas.length === 0, r);
  const b = cargar([fila({ id:'p1' })], { KOMMO_CIERRE:'1' }, K);
  const r2 = b.cerrar({ id:'p1', total:3500 });
  chk('b. prendido pero sin KOMMO_TOKEN: nada (sin_token) y ninguna llamada', r2.ok && r2.hecho === 'nada' && r2.motivo === 'sin_token' && b.llamadas.length === 0, r2);
  const c = cargar([fila({ id:'p1' })], Object.assign(ON(), { PANEL_KEY:'clave-equipo' }), K);
  chk('c. con la clave del equipo puesta, `kommoCierre` la pide', c.cerrar({ id:'p1', total:3500 }).error === 'clave' && c.llamadas.length === 0);
}

console.log('\n── 2. El lead de ella con ese celular pasa a «Compradores» ──');
{
  const K = kommoBase();
  contacto(K, 5001, 'CLIENTA INVENTADA', '+591 70011122', [4001, 4002, 4003, 4004]);
  lead(K, 4001, { name:'Lead #4001', status_id:103, _embedded:{ contacts:[{ id:5001, is_main:true }] } });   // el suyo, abierto
  lead(K, 4002, { status_id:143 });                                     // perdido
  lead(K, 4003, { responsible_user_id:UID_MARIA });                     // de otra vendedora
  lead(K, 4004, { pipeline_id:999 });                                   // de otro embudo
  const a = cargar([fila({ id:'p1', vend:'Carola Chávez' })], ON(), K);
  const rev0 = a.row('p1')[29];
  const r = a.cerrar({ id:'p1', total:3500 });
  const W = escrituras(a), patch = W.find(x => x.metodo === 'patch');
  chk('⚠️ a. cierra el ÚNICO lead abierto de ella con ese celular (no el perdido, el de María ni el de otro embudo)', r.hecho === 'cerrado' && r.lead === '4001' && patch && patch.p === '/leads/4001', r);
  chk('⚠️ b. la etapa y el campo se leyeron de Kommo: status «Compradores» = 555 (no 103450711), «Fecha contrato» = 777',
    patch && patch.cuerpo.status_id === ETAPA && patch.cuerpo.pipeline_id === EMBUDO && patch.cuerpo.custom_fields_values[0].field_id === FC, patch && patch.cuerpo);
  chk('⚠️ c. price = el total, y la fecha = el día de la venta a las 12:00 de Bolivia (04/11)', patch && patch.cuerpo.price === 3500 &&
    patch.cuerpo.custom_fields_values[0].values[0].value === Date.parse('2026-11-04T12:00:00-04:00') / 1000, patch && patch.cuerpo.custom_fields_values);
  chk('d. la OC va en una nota del lead', (K.notas || []).length === 1 && K.notas[0].lead === '4001' && /OC 11-050/.test(K.notas[0].txt) && /Bs 3\.500/.test(K.notas[0].txt), K.notas);
  chk('⚠️ e. la fila queda con la marca klead en sus productos, SIN cambiar el sello', a.klead('p1') === '4001' && a.row('p1')[29] === rev0, a.row('p1')[14]);
  chk('f. KOMMO_CIERRE_HECHO recuerda la venta (lead, total, ok)', (() => { const h = JSON.parse(a.props.KOMMO_CIERRE_HECHO || '{}').p1; return h && h.l === '4001' && h.t === 3500 && h.ok === 1; })(), a.props.KOMMO_CIERRE_HECHO);
  chk('⚠️ g. todo lo que habla con Kommo, SIN el candado; el candado se tomó una sola vez (para la marca)', a.llamadas.length > 0 && a.llamadas.every(x => !x.conCandado) && a.lock.veces === 1,
    a.llamadas.filter(x => x.conCandado).map(x => x.ruta).join(' | ') + ' · candado ' + a.lock.veces);
  chk('h. el token va en el encabezado (de la propiedad, no del código)', a.llamadas.every(x => x.auth === 'Bearer token-de-prueba'));
  const n = a.llamadas.length, r2 = a.cerrar({ id:'p1', total:3500 });
  chk('⚠️ i. la misma venta otra vez: `ya`, sin tocar Kommo', r2.hecho === 'ya' && r2.lead === '4001' && a.llamadas.length === n, r2);
  const r3 = a.cerrar({ id:'p1', total:3800 });
  const p3 = escrituras(a).filter(x => x.metodo === 'patch').slice(-1)[0];
  chk('⚠️ j. con otro total (se corrigió la venta): solo el precio del mismo lead', r3.hecho === 'precio' && p3 && p3.p === '/leads/4001' && JSON.stringify(p3.cuerpo) === '{"price":3800}' && /Total corregido/.test(K.notas.slice(-1)[0].txt), r3);
  chk('k. la meta de Kommo (embudos, campos, usuarios) quedó en la caché: la segunda vez no se volvió a leer', a.llamadas.filter(x => x.p === '/leads/pipelines').length === 1);
}

console.log('\n── 3. Con dudas no hace nada solo ──');
{
  const K = kommoBase();
  contacto(K, 5001, 'CLIENTA INVENTADA', '70011122', [4001, 4002]); contacto(K, 5009, 'OTRA CLIENTA', '79990000', [4009]);
  lead(K, 4001, { name:'Consulta colchón', price:3000, _embedded:{ contacts:[{ id:5001 }] } });
  lead(K, 4002, { name:'Consulta somier', _embedded:{ contacts:[{ id:5001 }] } });
  lead(K, 4009, { name:'Lead de otra clienta', _embedded:{ contacts:[{ id:5009, is_main:true }] } });
  const a = cargar([fila({ id:'p1' }), fila({ id:'p2', oc:'11-051', cel:'71112233' })], ON(), K);
  const r = a.cerrar({ id:'p1', total:3500 });
  chk('⚠️ a. dos leads suyos con ese celular: `dudas` (motivo «dos») con los dos, y NINGUNA escritura', r.hecho === 'dudas' && r.motivo === 'dos' && r.leads.length === 2 && escrituras(a).length === 0 && a.klead('p1') === '', r);
  chk('b. cada lead dice su nombre, el contacto, el teléfono y la etapa', r.leads.some(l => l.id === '4001' && l.n === 'Consulta colchón' && l.cli === 'CLIENTA INVENTADA' && /70011122/.test(l.tel) && l.et === 'Cotizacion enviada' && l.p === 3000), r.leads);
  const r2 = a.cerrar({ id:'p1', total:3500, lead:'4002' });
  chk('⚠️ c. la vendedora toca cuál es: se cierra ése', r2.hecho === 'cerrado' && r2.lead === '4002' && K.leads[4002].status_id === ETAPA && a.klead('p1') === '4002', r2);
  const w0 = escrituras(a).length, r3 = a.cerrar({ id:'p2', total:2000 });
  chk('⚠️ d. ningún lead con ese celular: `dudas` (motivo «ninguno»), puede crear, y le muestra sus últimos leads abiertos (no el que ya es la p1)', r3.hecho === 'dudas' && r3.motivo === 'ninguno' && r3.puedeCrear === true &&
    r3.leads.some(l => l.id === '4009') && !r3.leads.some(l => l.id === '4002') && escrituras(a).length === w0, r3);
  const c = cargar([fila({ id:'p3', cel:'' })], ON(), K);
  const r4 = c.cerrar({ id:'p3', total:2000 });
  chk('e. sin celular: `dudas` (sin_celular), no ofrece crear', r4.hecho === 'dudas' && r4.motivo === 'sin_celular' && r4.puedeCrear === false && escrituras(c).length === 0, r4);
  const w1 = escrituras(a).length, r5 = a.cerrar({ id:'p2', total:2000, lead:'4002' });
  chk('⚠️ f. elegir un lead que ya es OTRA venta del panel (lo cerró la p1): no se usa, y no se escribe nada', r5.hecho === 'nada' && /ya no se puede usar/.test(r5.motivo) && escrituras(a).length === w1 && a.klead('p2') === '', r5);
}

console.log('\n── 4. «Vino a la tienda»: se crea el lead en «Compradores» ──');
{
  const K = kommoBase();
  const a = cargar([fila({ id:'p1', cel:'72223344', cli:'CLIENTE DE TIENDA' })], ON(), K);
  const r = a.cerrar({ id:'p1', total:4200, crear:1 });
  const cx = escrituras(a).find(x => x.p === '/leads/complex');
  chk('⚠️ a. sin contacto: /leads/complex en «Compradores», de ella, con el total, la fecha y canal «Visita tienda»', r.hecho === 'creado' && r.lead === '70001' && cx &&
    cx.cuerpo[0].status_id === ETAPA && cx.cuerpo[0].responsible_user_id === UID_CAROLA && cx.cuerpo[0].price === 4200 &&
    cx.cuerpo[0].custom_fields_values.some(f => f.field_id === CANAL && f.values[0].enum_id === VISITA) && cx.cuerpo[0].custom_fields_values.some(f => f.field_id === FC), cx && cx.cuerpo);
  chk('b. el contacto nuevo lleva el nombre y el celular', cx && cx.cuerpo[0]._embedded.contacts[0].name === 'CLIENTE DE TIENDA' && cx.cuerpo[0]._embedded.contacts[0].custom_fields_values[0].values[0].value === '72223344');
  chk('⚠️ c. la fila queda con la marca del lead nuevo y el registro lo recuerda', a.klead('p1') === '70001' && JSON.parse(a.props.KOMMO_CIERRE_HECHO).p1.l === '70001');
  const K2 = kommoBase(); contacto(K2, 5050, 'CLIENTE DE TIENDA', '72223344', [4050]); lead(K2, 4050, { responsible_user_id:UID_MARIA, status_id:142 });
  const b = cargar([fila({ id:'p1', cel:'72223344', cli:'CLIENTE DE TIENDA' })], ON(), K2);
  const r2 = b.cerrar({ id:'p1', total:4200, crear:1 });
  const px = escrituras(b).find(x => x.p === '/leads');
  chk('⚠️ d. el contacto con ese celular YA existe (con leads de otra o cerrados): se le une, no se duplica', r2.hecho === 'creado' && px && px.cuerpo[0]._embedded.contacts[0].id === 5050 && !escrituras(b).some(x => x.p === '/leads/complex'), r2);
  const K3 = kommoBase(); contacto(K3, 5060, 'X', '72223344', [4060]); lead(K3, 4060, {});
  const c = cargar([fila({ id:'p1', cel:'72223344' })], ON(), K3);
  const r3 = c.cerrar({ id:'p1', total:4200, crear:1 });
  chk('e. «crear» pero ahora sí hay UN lead suyo con ese celular: cierra ése, no crea otro', r3.hecho === 'cerrado' && r3.lead === '4060' && !escrituras(c).some(x => /^\/leads(\/complex)?$/.test(x.p) && x.metodo === 'post'), r3);
}

console.log('\n── 5. Qué lead se puede usar ──');
{
  const K = kommoBase();
  contacto(K, 5001, 'CLIENTA INVENTADA', '70011122', [4001, 4002]);
  lead(K, 4001, {}); lead(K, 4002, { status_id:ETAPA });
  /* 4001 ya es otra venta (la marca klead en otra fila); 4002 espera como borrador en la bandeja → es esta misma venta */
  const otra = fila({ id:'vieja', oc:'10-001', prods:[{ desc:'COLCHON', cant:1, precio:100, klead:'4001' }] });
  const borr = fila({ id:'kommo-4002', oc:'', estado:'Borrador Kommo', prods:[] });
  const a = cargar([otra, borr, fila({ id:'p1' })], ON(), K);
  const r = a.cerrar({ id:'p1', total:3500 });
  chk('⚠️ a. el lead que ya es otra venta del panel no se usa; el que espera como borrador SÍ (es la misma venta)', r.hecho === 'cerrado' && r.lead === '4002' && a.klead('p1') === '4002', r);
  const K2 = kommoBase(); contacto(K2, 5001, 'C', '70011122', [4001]); lead(K2, 4001, {});
  const comp = fila({ id:'kommo-4001', oc:'11-002', estado:'' });   // un borrador YA completado: es una venta
  const b = cargar([comp, fila({ id:'p1' })], ON(), K2);
  chk('b. un borrador YA completado (fila kommo-<lead> sin la marca de borrador) es otra venta: no se usa', b.cerrar({ id:'p1', total:3500 }).motivo === 'ninguno');
  const K3 = kommoBase(); K3.usuarios = { _embedded:{ users:[{ id:1, name:'Otra Persona - Central' }] } };
  const c = cargar([fila({ id:'p1' })], ON(), K3);
  const r3 = c.cerrar({ id:'p1', total:3500 });
  chk('c. la vendedora no está entre los usuarios de Kommo: nada (lo dice) y ninguna escritura', r3.hecho === 'nada' && /usuarios de Kommo/.test(r3.motivo) && escrituras(c).length === 0, r3);
}

console.log('\n── 6. Lo que no cierra un lead ──');
{
  const K = kommoBase(); contacto(K, 5001, 'C', '70011122', [4001]); lead(K, 4001, {});
  const casos = [
    ['ATC', fila({ id:'a1', oc:'ATC 11-001' }), 'ATC o RPT'], ['RPT', fila({ id:'a2', oc:'RPT 11-001' }), 'ATC o RPT'],
    ['venta de tienda', fila({ id:'a3', dir:'SALIÓ DE TIENDA · Central', zona:'Tienda' }), 'venta de tienda'],
    ['Eduardo', fila({ id:'a4', vend:'Eduardo Añez' }), 'venta de Eduardo'], ['ROHO', fila({ id:'a5', vend:'ROHO' }), 'pedido de ROHO'],
    ['interno (ALBA)', fila({ id:'a6', vend:'ALBA' }), 'pedido interno'], ['borrador sin completar', fila({ id:'a7', estado:'Borrador Kommo' }), 'borrador de Kommo'],
    ['fila del sistema', fila({ id:'__stock__' }), 'fila del sistema'] ];
  const a = cargar(casos.map(c => c[1]), ON(), K);
  casos.forEach(([nom, f, mot], i) => { const r = a.cerrar({ id:f[0], total:3500 }); chk((i ? '' : '⚠️ ') + String.fromCharCode(97 + i) + '. ' + nom + ': nada («' + mot + '»)', r.hecho === 'nada' && r.motivo === mot, r); });
  chk('i. …y ni una llamada a Kommo', a.llamadas.length === 0, a.llamadas.length);
  const b = cargar([fila({ id:'kommo-4001', estado:'' })], ON(), K);
  const r = b.cerrar({ id:'kommo-4001', total:3500 });
  chk('j. la venta que vino de Kommo (borrador completado): `ya`, con su lead, sin llamar', r.hecho === 'ya' && r.lead === '4001' && b.llamadas.length === 0, r);
  const c = cargar([fila({ id:'p1', prods:[{ desc:'COLCHON', cant:1, precio:3500, klead:'4999' }] })], ON(), K);
  const r2 = c.cerrar({ id:'p1', total:3500 });
  chk('k. una venta ya unida a mano («Sí, es la misma»): `ya`, sin llamar', r2.hecho === 'ya' && r2.lead === '4999' && c.llamadas.length === 0, r2);
  chk('l. sin total: nada', c.cerrar({ id:'p1', total:0 }).motivo === 'sin_total' && c.cerrar({ id:'no-existe', total:5 }).motivo === 'no_esta');
}

console.log('\n── 7. No duplicar el borrador que dispara este mismo cambio ──');
{
  const K = kommoBase(); contacto(K, 5001, 'C', '70011122', [4001]); lead(K, 4001, { _embedded:{ contacts:[{ id:5001 }] } });
  /* El candado ocupado: la marca klead no llega a la fila. El registro tiene que cuidar igual. */
  const a = cargar([fila({ id:'p1' })], ON(), K, { candadoOcupado:true });
  const r = a.cerrar({ id:'p1', total:3500 });
  chk('a. con el candado ocupado: Kommo igual se actualiza, la marca no llegó (klead:false)', r.hecho === 'cerrado' && r.klead === false && a.klead('p1') === '', r);
  a.lock.ocupado = false;
  /* El aviso de Kommo de «Compradores» llega por este cambio: el lead tiene que quedar «cerrado desde el panel», sin borrador. */
  K.leads[4001] = Object.assign(K.leads[4001], { status_id:ETAPA });
  const nFilas = a.sh._datos.length, rp = a.ctx.kommoProcesarObj_(['4001'], 'webhook');
  chk('⚠️ b. el repaso de Kommo saltea ese lead («cerrado desde el panel») y NO crea un borrador', rp.creados === 0 && (rp.saltados || []).some(s => /4001:cerrado desde el panel/.test(s)) && a.sh._datos.length === nFilas, rp);
  chk('c. kcPropios_ lo tiene', a.ctx.kcPropios_()['4001'] === 1);
  /* Kommo no deja escribir (403): queda `ok:0`, lo dice y la próxima vez se reintenta con ese lead. */
  const K2 = kommoBase(); contacto(K2, 5001, 'C', '70011122', [4001]); lead(K2, 4001, {});
  let mal = true;
  const b = cargar([fila({ id:'p1' })], ON(), K2, { falla:(m, p) => (mal && m === 'patch') ? 403 : 0 });
  const r2 = b.cerrar({ id:'p1', total:3500 });
  chk('⚠️ d. Kommo no deja escribir (403): `error` que dice «permiso», el registro queda a medias (ok:0)', r2.hecho === 'error' && /permiso/.test(r2.motivo) && JSON.parse(b.props.KOMMO_CIERRE_HECHO).p1.ok === 0, r2);
  mal = false;
  const r3 = b.cerrar({ id:'p1', total:3500 });
  chk('e. la vez siguiente se reintenta con el mismo lead y queda hecho', r3.hecho === 'cerrado' && r3.lead === '4001' && JSON.parse(b.props.KOMMO_CIERRE_HECHO).p1.ok === 1, r3);
  /* El tope del registro (una propiedad aguanta 9 KB). */
  for (let i = 0; i < 200; i++) b.ctx.kcHechoPoner_('id-largo-' + i, { l:String(50000 + i), t:1234, ts:1000 + i, ok:1 });
  const H = JSON.parse(b.props.KOMMO_CIERRE_HECHO);
  chk('f. el registro no pasa de su tope (y se van los más viejos)', Object.keys(H).length <= b.ctx.KC_TOPE && b.props.KOMMO_CIERRE_HECHO.length <= b.ctx.KC_TOPE_LETRAS && !!H['id-largo-199'] && !H['id-largo-0'], Object.keys(H).length + ' · ' + b.props.KOMMO_CIERRE_HECHO.length);
}

console.log('\n── 8. Faltan cosas en Kommo: no se escribe ──');
{
  const K = kommoBase(); contacto(K, 5001, 'C', '70011122', [4001]); lead(K, 4001, {});
  K.pipelines._embedded.pipelines[0]._embedded.statuses = K.pipelines._embedded.pipelines[0]._embedded.statuses.filter(s => s.name !== 'Compradores');
  const a = cargar([fila({ id:'p1' })], ON(), K);
  const r = a.cerrar({ id:'p1', total:3500 });
  chk('⚠️ a. sin la etapa «Compradores» en el embudo: error que lo dice y ninguna escritura', r.hecho === 'error' && /Compradores/.test(r.motivo) && escrituras(a).length === 0, r);
  const K2 = kommoBase(); K2.campos._embedded.custom_fields = K2.campos._embedded.custom_fields.filter(f => f.id !== FC);
  const b = cargar([fila({ id:'p1' })], ON(), K2);
  const r2 = b.cerrar({ id:'p1', total:3500 });
  chk('b. sin el campo «Fecha contrato»: error y ninguna escritura', r2.hecho === 'error' && /Fecha contrato/.test(r2.motivo) && escrituras(b).length === 0, r2);
  const c = cargar([fila({ id:'p1' })], ON(), kommoBase());
  c.cache.put('kc_curso_p1', '1');
  chk('c. la misma venta en curso (otro pedido al mismo tiempo): `en_curso`, sin llamar', c.cerrar({ id:'p1', total:3500 }).hecho === 'en_curso' && c.llamadas.length === 0);
}

console.log('\n── 9. ▶️ probarKommoEscribe y probarAntesDeImplementar ──');
{
  const K = kommoBase(); lead(K, 4100, { status_id:ETAPA, price:6500 }); lead(K, 4101, { status_id:ETAPA, price:999, updated_at:1793999999 });
  const cargado = fila({ id:'kommo-4100', estado:'' });   // 4100 ya está en la planilla; 4101 no
  const a = cargar([cargado], { KOMMO_TOKEN:'token-de-prueba' }, K);
  const r = a.ctx.probarKommoEscribe(), W = escrituras(a);
  chk('⚠️ a. le vuelve a poner a UN lead YA cargado su MISMO precio, y nada más', r.ok && W.length === 1 && W[0].metodo === 'patch' && W[0].p === '/leads/4100' && JSON.stringify(W[0].cuerpo) === '{"price":6500}' && K.leads[4100].price === 6500,
    W.map(x => x.metodo + ' ' + x.ruta + ' ' + JSON.stringify(x.cuerpo)).join(' | '));
  chk('b. dice la etapa y el campo que leyó, y que se puede prender', r.lineas.join('\n').indexOf('«Compradores» = 555') >= 0 && /Fecha contrato» = 777/.test(r.lineas.join('\n')) && /DEJA ESCRIBIR/.test(r.lineas.join('\n')) && /KOMMO_CIERRE = 1/.test(r.lineas.join('\n')), r.lineas);
  chk('c. avisa que la etapa leída no es la de KOMMO_ETAPA (la del aviso de los borradores)', /distinta de KOMMO_ETAPA/.test(r.lineas.join('\n')));
  const b = cargar([cargado], { KOMMO_TOKEN:'token-de-prueba' }, K, { falla:(m) => m === 'patch' ? 403 : 0 });
  const r2 = b.ctx.probarKommoEscribe();
  chk('⚠️ d. si Kommo no deja escribir (403): ❌ y dice qué hacer (permisos de la integración «Panel de pedidos»)', !r2.ok && /NO dejó escribir/.test(r2.lineas.join('\n')) && /Panel de pedidos/.test(r2.lineas.join('\n')), r2.lineas);
  const c = cargar([], { KOMMO_TOKEN:'token-de-prueba' }, K);
  const r3 = c.ctx.probarKommoEscribe();
  chk('e. sin ningún lead de «Compradores» cargado en la planilla: no escribe nada y lo dice', !r3.ok && escrituras(c).length === 0 && /No encontré un lead/.test(r3.lineas.join('\n')));
  const d = cargar([], {}, K);
  chk('f. sin KOMMO_TOKEN: lo dice y no llama', !d.ctx.probarKommoEscribe().ok && d.llamadas.length === 0);
  if (typeof a.ctx.probarAntesDeImplementar === 'function') {
    let L = [];
    try { L = a.ctx.probarAntesDeImplementar().lineas; } catch (e) { L = ['revento: ' + e.message]; }
    chk('g. probarAntesDeImplementar dice si el cierre de Kommo está prendido o apagado', L.some(l => /cierre de las ventas en Kommo está apagado/.test(l)), L.filter(l => /Kommo/.test(l)).join(' | '));
  }
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
