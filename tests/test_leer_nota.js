/* 🧾 MEJORA 216 · LA NOTA DE VENTA SE LEE CON CLAUDE — EL SERVIDOR (acción `leerNota`, .gs 2026-11-14-a).
   El dueño: «se saca una foto a la nota de venta escrita a mano y Claude llena el pedido: N° de nota, cliente, productos, precios y lo
   que pagó a cuenta. Lo mismo que ya hace con los comprobantes de pago, pero para cargar la venta».

   LO QUE CUIDA (con el .gs REAL en Node y Google y Claude de mentira):
   1. La consulta a Claude: la misma forma que los comprobantes (x-api-key, anthropic-version, el beta de `fallbacks`, el modelo de
      IA_COMP_MODELO/IA_MODELO o el de siempre, esfuerzo bajo, salida en JSON fijo con TODAS las claves obligatorias), la foto como
      bloque de imagen base64 (sin el «data:…;base64,» de adelante) y la pregunta que nombra las plazas y los montos de Bolivia.
   2. Lo que vuelve a la página, limpio: montos «1.500» → 1500, cantidad 0 → 1, código en mayúsculas, fecha mal → vacía, método raro → vacío.
   3. Sin candado y sin tocar la planilla: `doPost` no pide el LockService ni abre la hoja. Nada de la foto ni de lo que dice va a Logger,
      console ni Propiedades (NOTA_DIA guarda solo cuántas y los tokens).
   4. El tope del día (NOTA_TOPE_DIA, 80 si no está): se anota antes de preguntar, se devuelve si Claude no contestó, vuelve a 0 al otro día.
   5. Apagado: sin IA_ACTIVA o con IA_NOTA = 0 → «ia_apagada»; sin la clave → «sin_clave»; en pausa → «ia_error»; sin preguntarle a Claude.
   6. Errores: no es una nota → «no_se_lee» (cuenta: Claude la leyó); ocupado (529) → «ocupado» (no cuenta); la clave no sirve (401) →
      «ia_error» y pausa; un 400 que no es del crédito → UNA vez la consulta simple; un 400 de la foto → «no_se_lee» sin repetir.
   7. Foto vacía, mal armada o de otro tipo → «sin_foto»; muy pesada → «grande».
   8. probarAntesDeImplementar dice que la acción está y si Claude puede leer.
   Datos INVENTADOS.
   Se corre:  node tests/test_leer_nota.js   (desde la raíz del repo)
   Contra otro .gs:  GS=/ruta/al/otro.gs node tests/test_leer_nota.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const SRC = fs.readFileSync(GS, 'utf8');

const respuesta = (code, cuerpo) => ({ getResponseCode: () => code, getContentText: () => typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo || {}) });
/* Lo que «lee» Claude en la nota (inventado). */
const LEIDA = {
  es_nota_venta: true, legible: true, nota: '004512', fecha: '2026-11-13', fecha_entrega: '2026-11-17', cliente: 'ROSA PRUEBA INVENTADA',
  celular: '70011223 - 76655443', nit: '1234567', facturar_a: '', direccion: 'Calle Falsa 123, Barrio Ejemplo', total: 4800, acuenta: 1000, saldo: 3800,
  metodo: 'qr', observaciones: 'Llamar antes de llegar', dudas: ['el segundo celular no se lee bien'],
  productos: [ { desc: 'TITANIO ICE', medida: '140x190', cant: 1, precio: 3400, codigo: '' },
               { desc: 'almohada', medida: '50x70', cant: 0, precio: '700,00', codigo: 'cd-1403' } ]
};
function cargar(props, opt) {
  opt = opt || {};
  const claude = [], logs = [], hoja = [], candado = [], propsEscritas = [];
  const P = props || {};
  const contestar = opt.contestar || (() => respuesta(200, { model: 'claude-opus-5-5', stop_reason: 'end_turn', usage: { input_tokens: 3000, output_tokens: 500 },
    content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(LEIDA) }] }));
  const ctx = {
    Date, JSON, Math,
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')) },
    Logger: { log: (...a) => logs.push(a.join(' ')) },
    SpreadsheetApp: new Proxy({}, { get: (t, k) => { hoja.push(String(k)); return () => { throw new Error('la nota no toca la planilla'); }; } }),
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => P[k] != null ? P[k] : null,
      setProperty: (k, v) => { P[k] = String(v); propsEscritas.push(k); },
      setProperties: (o) => { Object.keys(o).forEach(k => { P[k] = String(o[k]); propsEscritas.push(k); }); },
      deleteProperty: (k) => { delete P[k]; } }) },
    UrlFetchApp: { fetch: (url, o) => { claude.push({ url, o, b: JSON.parse(o.payload) }); return contestar(claude.length, JSON.parse(o.payload), o); },
                   fetchAll: () => { throw new Error('no se usa'); } },
    Utilities: { base64Encode: (d) => Buffer.from(d).toString('base64'), formatDate: (d) => String(d) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, getContent() { return this._t; }, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => { candado.push(1); return { waitLock() {}, releaseLock() {} }; } },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, putAll: () => {}, remove: () => {} }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz' },
    DriveApp: new Proxy({}, { get: () => () => { throw new Error('la nota no toca Drive'); } }),
    ScriptApp: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const post = (body) => JSON.parse(ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify(body) } })._t);
  return { ctx, claude, logs, hoja, candado, propsEscritas, P, post };
}
const FOTO = Buffer.from('FOTO-DE-LA-NOTA-INVENTADA-' + 'x'.repeat(200)).toString('base64');
const PROPS = () => ({ IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'clave-de-prueba' });

console.log('\n── 1. La consulta a Claude ──');
{
  const a = cargar(PROPS());
  const r = a.post({ action: 'leerNota', img: 'data:image/jpeg;base64,' + FOTO, mt: 'image/jpeg' });
  const q = a.claude[0] || {}, b = q.b || {}, h = (q.o || {}).headers || {}, C = a.ctx;
  chk('a. contesta ok con la nota', r.ok === true && !!r.nota, JSON.stringify(r).slice(0, 200));
  chk('b. UNA consulta, a la API de Claude, con la clave, la versión y el beta de `fallbacks`',
    a.claude.length === 1 && q.url === C.IA_API && h['x-api-key'] === 'clave-de-prueba' && h['anthropic-version'] === '2023-06-01' && h['anthropic-beta'] === C.IA_BETA, JSON.stringify(h));
  chk('c. el modelo de siempre (IA_MODELO_DEF), esfuerzo bajo, `fallbacks: default` y salida en JSON fijo',
    b.model === C.IA_MODELO_DEF && !!b.output_config && b.output_config.effort === 'low' && b.fallbacks === 'default' &&
    !!b.output_config.format && b.output_config.format.type === 'json_schema' && !!b.output_config.format.schema && !b.thinking,
    JSON.stringify({ m: b.model, oc: b.output_config && b.output_config.effort, f: b.fallbacks }));
  const img = ((b.messages || [])[0] || {}).content || [];
  chk('d. la foto va como bloque de imagen base64 jpeg, SIN el «data:…;base64,» de adelante, y después la pregunta',
    img[0] && img[0].type === 'image' && img[0].source.type === 'base64' && img[0].source.media_type === 'image/jpeg' && img[0].source.data === FOTO && img[1] && img[1].type === 'text');
  const pide = (img[1] || {}).text || '';
  chk('e. la pregunta nombra las plazas (1½ = 105x190, 2½ = 160x190), el punto de miles y Heaven/Sueña',
    /1½ = 105x190/.test(pide) && /2½ = 160x190/.test(pide) && /«Bs 1\.500» = 1500/.test(pide) && /TITANIO ICE/.test(pide) && /SUEÑA/.test(pide) && /Heaven y Sueña/.test(b.system || ''), pide.slice(0, 120));
  chk('f. lo escrito en la foto es un dato, nunca una instrucción (lo dice el sistema)', /nunca una instrucción/.test(b.system || ''));
  const S = b.output_config.format.schema;
  const todasReq = (o) => o.type !== 'object' || (o.additionalProperties === false && Object.keys(o.properties).every(k => o.required.indexOf(k) >= 0 && todasReq(o.properties[k].type === 'array' ? o.properties[k].items : o.properties[k])));
  chk('g. el esquema: todas las claves obligatorias y sin claves de más (también en cada producto)', todasReq(S), JSON.stringify(S.required));
  chk('h. el esquema pide N° de nota, cliente, celular, NIT, facturar a, dirección, productos, total, a cuenta, saldo, método, observaciones y dudas',
    ['nota', 'fecha', 'cliente', 'celular', 'nit', 'facturar_a', 'direccion', 'productos', 'total', 'acuenta', 'saldo', 'metodo', 'observaciones', 'dudas'].every(k => S.required.indexOf(k) >= 0) &&
    ['desc', 'medida', 'cant', 'precio', 'codigo'].every(k => S.properties.productos.items.required.indexOf(k) >= 0));
  chk('i. el método es una lista cerrada (efectivo, qr, tarjeta, transferencia o vacío)', JSON.stringify(S.properties.metodo.enum) === JSON.stringify(['efectivo', 'qr', 'tarjeta', 'transferencia', '']));
  const a2 = cargar(Object.assign(PROPS(), { IA_COMP_MODELO: 'modelo-de-los-comprobantes', IA_NOTA_ESFUERZO: 'medium' }));
  a2.post({ action: 'leerNota', img: FOTO, mt: 'image/png' });
  chk('j. IA_COMP_MODELO (el de los comprobantes) y IA_NOTA_ESFUERZO cambian el modelo y el esfuerzo; `mt` pasa como media_type',
    a2.claude[0].b.model === 'modelo-de-los-comprobantes' && a2.claude[0].b.output_config.effort === 'medium' && a2.claude[0].b.messages[0].content[0].source.media_type === 'image/png');
}

console.log('\n── 2. Lo que vuelve a la página ──');
{
  const a = cargar(PROPS());
  const r = a.post({ action: 'leerNota', img: FOTO, mt: 'image/jpeg' }), n = r.nota || {};
  chk('a. N° de nota, fecha, entrega, cliente, celular, NIT, dirección, observaciones y dudas', n.nota === '004512' && n.fecha === '2026-11-13' && n.entrega === '2026-11-17' &&
    n.cliente === 'ROSA PRUEBA INVENTADA' && n.celular === '70011223 - 76655443' && n.nit === '1234567' && n.facturarA === '' && n.direccion === 'Calle Falsa 123, Barrio Ejemplo' &&
    n.observaciones === 'Llamar antes de llegar' && n.dudas.length === 1, JSON.stringify(n));
  chk('b. montos: total 4800, a cuenta 1000, saldo 3800, método qr', n.total === 4800 && n.acuenta === 1000 && n.saldo === 3800 && n.metodo === 'qr');
  const p0 = (n.productos || [])[0] || {}, p1 = (n.productos || [])[1] || {};
  chk('c. productos: el primero tal cual', n.productos.length === 2 && p0.desc === 'TITANIO ICE' && p0.medida === '140x190' && p0.cant === 1 && p0.precio === 3400 && p0.codigo === '', JSON.stringify(p0));
  chk('d. el segundo, limpio: cantidad 0 → 1, «700,00» → 700, el código en mayúsculas y sin guion', p1.cant === 1 && p1.precio === 700 && p1.codigo === 'CD1403', JSON.stringify(p1));
  chk('e. usadas 1 de 80 (el tope de siempre) y lo que costó', r.usadas === 1 && r.tope === 80 && r.usd > 0, JSON.stringify({ u: r.usadas, t: r.tope, usd: r.usd }));
  const C = a.ctx;
  chk('f. los montos de Bolivia en texto: «Bs 1.500» 1500 · «1.500,50» 1500.5 · «2.500.-» 2500 · «1,250.75» 1250.75 · «abc» 0 · -5 → 0',
    C.notaBs_('Bs 1.500') === 1500 && C.notaBs_('1.500,50') === 1500.5 && C.notaBs_('2.500.-') === 2500 && C.notaBs_('1,250.75') === 1250.75 && C.notaBs_('abc') === 0 && C.notaBs_(-5) === 0 && C.notaBs_(3400) === 3400);
  const m = C.notaNormal_({ fecha: '13/11/2026', metodo: 'cheque', nota: 'N° 4512', productos: [{ desc: '', medida: '', cant: 1, precio: 1, codigo: '' }, null, { desc: 'SOMIER ORO', cant: 2.6, precio: 0 }] });
  chk('g. fecha que no es AAAA-MM-DD → vacía; método raro → vacío; renglón sin producto → afuera; cantidad 2.6 → 3', m.fecha === '' && m.metodo === '' && m.nota === '4512' && m.productos.length === 1 && m.productos[0].cant === 3, JSON.stringify(m));
  const muchos = C.notaNormal_({ productos: Array.from({ length: 40 }, (_, i) => ({ desc: 'P' + i, medida: '', cant: 1, precio: 1, codigo: '' })) });
  chk('h. 25 productos como mucho', muchos.productos.length === 25);
}

console.log('\n── 3. Sin candado, sin planilla, sin registros ──');
{
  const a = cargar(PROPS());
  const r = a.post({ action: 'leerNota', img: FOTO, mt: 'image/jpeg' });
  chk('a. no pide el candado (LockService)', r.ok && a.candado.length === 0, a.candado.length);
  chk('b. no abre la planilla ni Drive', a.hoja.length === 0, JSON.stringify(a.hoja));
  chk('c. nada a Logger ni console', a.logs.length === 0, JSON.stringify(a.logs).slice(0, 200));
  chk('d. en Propiedades solo NOTA_DIA, y ahí solo cuántas y los tokens (ni el cliente ni la foto)',
    a.propsEscritas.every(k => k === 'NOTA_DIA') && !/ROSA|Calle|FOTO|4512/.test(a.P.NOTA_DIA || '') && JSON.parse(a.P.NOTA_DIA).n === 1 && JSON.parse(a.P.NOTA_DIA).tot.tin === 3000, a.P.NOTA_DIA);
  /* Con la clave del equipo puesta, la nota la pide como todo lo demás. */
  const k = cargar(Object.assign(PROPS(), { PANEL_KEY: 'clave-equipo' }));
  const rk = k.post({ action: 'leerNota', img: FOTO });
  chk('e. con PANEL_KEY puesta y sin la clave del equipo → «clave», sin preguntarle a Claude', rk.ok === false && rk.error === 'clave' && k.claude.length === 0, JSON.stringify(rk));
  const rk2 = k.post({ action: 'leerNota', img: FOTO, key: 'clave-equipo' });
  chk('f. …y con la clave, lee', rk2.ok === true && k.claude.length === 1);
}

console.log('\n── 4. El tope del día ──');
{
  const a = cargar(Object.assign(PROPS(), { NOTA_TOPE_DIA: '2' }));
  const r1 = a.post({ action: 'leerNota', img: FOTO }), r2 = a.post({ action: 'leerNota', img: FOTO }), r3 = a.post({ action: 'leerNota', img: FOTO });
  chk('a. con NOTA_TOPE_DIA = 2: dos leen y la tercera dice «tope» sin preguntarle a Claude', r1.ok && r2.ok && r3.ok === false && r3.error === 'tope' && r3.usadas === 2 && r3.tope === 2 && a.claude.length === 2, JSON.stringify(r3));
  const u = JSON.parse(a.P.NOTA_DIA); u.d = '2020-01-01'; a.P.NOTA_DIA = JSON.stringify(u);
  const r4 = a.post({ action: 'leerNota', img: FOTO });
  chk('b. otro día vuelve a 0 (y lo gastado en total sigue sumando)', r4.ok && r4.usadas === 1 && JSON.parse(a.P.NOTA_DIA).tot.n === 3, a.P.NOTA_DIA);
  /* Claude ocupado: no cuenta. */
  const o = cargar(PROPS(), { contestar: () => respuesta(529, { error: { type: 'overloaded_error', message: 'Overloaded' } }) });
  const ro = o.post({ action: 'leerNota', img: FOTO });
  chk('c. Claude ocupado (529) → «ocupado», y no cuenta en el tope', ro.ok === false && ro.error === 'ocupado' && JSON.parse(o.P.NOTA_DIA).n === 0 && o.claude.length === 1, JSON.stringify(ro));
}

console.log('\n── 5. Apagado ──');
{
  const casos = [
    ['a. sin IA_ACTIVA → «ia_apagada»', { ANTHROPIC_API_KEY: 'k' }, 'ia_apagada'],
    ['b. IA_NOTA = 0 la apaga sola → «ia_apagada»', Object.assign(PROPS(), { IA_NOTA: '0' }), 'ia_apagada'],
    ['c. sin ANTHROPIC_API_KEY → «sin_clave»', { IA_ACTIVA: '1' }, 'sin_clave'],
    ['d. Claude en pausa → «ia_error»', Object.assign(PROPS(), { IA_PAUSA_HASTA: String(Date.now() + 600000), IA_PAUSA_MOTIVO: 'sin crédito' }), 'ia_error']
  ];
  casos.forEach(([l, pr, err]) => {
    const a = cargar(pr), r = a.post({ action: 'leerNota', img: FOTO });
    chk(l + ', sin preguntarle a Claude ni anotar nada', r.ok === false && r.error === err && a.claude.length === 0 && !a.P.NOTA_DIA, JSON.stringify(r));
  });
}

console.log('\n── 6. Errores de Claude ──');
{
  const no = cargar(PROPS(), { contestar: () => respuesta(200, { stop_reason: 'end_turn', usage: { input_tokens: 2500, output_tokens: 200 },
    content: [{ type: 'text', text: JSON.stringify(Object.assign({}, LEIDA, { es_nota_venta: false, productos: [], cliente: '' })) }] }) });
  const rn = no.post({ action: 'leerNota', img: FOTO });
  chk('a. no es una nota de venta → «no_se_lee» con el porqué (y cuenta: Claude la leyó)', rn.ok === false && rn.error === 'no_se_lee' && /nota de venta/.test(rn.detalle || '') && JSON.parse(no.P.NOTA_DIA).n === 1, JSON.stringify(rn));
  const il = cargar(PROPS(), { contestar: () => respuesta(200, { stop_reason: 'end_turn', usage: { input_tokens: 2500, output_tokens: 100 },
    content: [{ type: 'text', text: JSON.stringify(Object.assign({}, LEIDA, { legible: false, productos: [], cliente: '', nota: '' })) }] }) });
  chk('b. ilegible y sin nada leído → «no_se_lee»', il.post({ action: 'leerNota', img: FOTO }).error === 'no_se_lee');
  const k = cargar(PROPS(), { contestar: () => respuesta(401, { error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
  const rk = k.post({ action: 'leerNota', img: FOTO });
  chk('c. la clave no sirve (401) → «ia_error», pausa a Claude y no cuenta', rk.ok === false && rk.error === 'ia_error' && Number(k.P.IA_PAUSA_HASTA) > Date.now() && JSON.parse(k.P.NOTA_DIA).n === 0, JSON.stringify(rk));
  const s = cargar(PROPS(), { contestar: (n) => n === 1 ? respuesta(400, { error: { type: 'invalid_request_error', message: 'output_config: unsupported' } })
    : respuesta(200, { stop_reason: 'end_turn', usage: { input_tokens: 2800, output_tokens: 400 }, content: [{ type: 'text', text: 'Acá está: ' + JSON.stringify(LEIDA) }] }) });
  const rs = s.post({ action: 'leerNota', img: FOTO });
  const b2 = (s.claude[1] || {}).b || {}, h2 = ((s.claude[1] || {}).o || {}).headers || {};
  chk('d. un 400 que no es del crédito → UNA vez la consulta simple (sin beta ni output_config, pidiendo el JSON) y lee igual',
    rs.ok === true && s.claude.length === 2 && !h2['anthropic-beta'] && !b2.output_config && !b2.fallbacks && /SOLO con un objeto JSON/.test(b2.messages[0].content[1].text) && rs.nota.nota === '004512', JSON.stringify({ n: s.claude.length, ok: rs.ok }));
  const f = cargar(PROPS(), { contestar: () => respuesta(400, { error: { type: 'invalid_request_error', message: 'Could not process image' } }) });
  const rf = f.post({ action: 'leerNota', img: FOTO });
  chk('e. un 400 de la foto → «no_se_lee» sin repetir la consulta', rf.ok === false && rf.error === 'no_se_lee' && f.claude.length === 1, JSON.stringify(rf));
  const c = cargar(PROPS(), { contestar: () => respuesta(400, { error: { type: 'invalid_request_error', message: 'Your credit balance is too low' } }) });
  const rc = c.post({ action: 'leerNota', img: FOTO });
  chk('f. sin crédito → «ia_error» y pausa, sin repetir', rc.error === 'ia_error' && c.claude.length === 1 && Number(c.P.IA_PAUSA_HASTA) > Date.now(), JSON.stringify(rc));
  const rf2 = cargar(PROPS(), { contestar: () => respuesta(200, { stop_reason: 'refusal', usage: { input_tokens: 10, output_tokens: 1 }, content: [] }) }).post({ action: 'leerNota', img: FOTO });
  chk('g. Claude no quiso → «ia_error» con el porqué', rf2.ok === false && rf2.error === 'ia_error' && /no quiso/.test(rf2.detalle || ''), JSON.stringify(rf2));
}

console.log('\n── 7. La foto ──');
{
  const a = cargar(PROPS());
  chk('a. sin foto → «sin_foto»', a.post({ action: 'leerNota' }).error === 'sin_foto');
  chk('b. base64 mal armado → «sin_foto»', a.post({ action: 'leerNota', img: 'esto no es base64 !!' }).error === 'sin_foto');
  chk('c. un PDF o un tipo raro → «sin_foto»', a.post({ action: 'leerNota', img: FOTO, mt: 'application/pdf' }).error === 'sin_foto');
  chk('d. más de 5 MB de texto → «grande»', a.post({ action: 'leerNota', img: 'A'.repeat(5000004) }).error === 'grande');
  chk('e. nada de eso le preguntó a Claude ni gastó el tope', a.claude.length === 0 && !a.P.NOTA_DIA);
  const j = cargar(PROPS()); j.post({ action: 'leerNota', img: 'data:image/jpg;base64,' + FOTO });
  chk('f. «image/jpg» del dataURL pasa como image/jpeg', j.claude[0] && j.claude[0].b.messages[0].content[0].source.media_type === 'image/jpeg');
}

console.log('\n── 8. probarAntesDeImplementar ──');
{
  const lin = (pr) => { const a = cargar(pr), L = []; a.ctx.probarNota_((t) => L.push('✅ ' + t), (t) => L.push('⚠️ ' + t)); return L.join('\n'); };
  chk('a. con todo puesto: la acción está y puede leer, con el tope de hoy', /✅ 🧾 «Leer la nota» \(la acción leerNota\) lee con Claude/.test(lin(PROPS())) && /0 de 80/.test(lin(PROPS())), lin(PROPS()));
  chk('b. sin IA_ACTIVA: dice que está apagada', /apagada: falta IA_ACTIVA/.test(lin({ ANTHROPIC_API_KEY: 'k' })));
  chk('c. sin la clave: ⚠️ sin_clave', /⚠️ 🧾 IA_ACTIVA está puesta pero falta ANTHROPIC_API_KEY/.test(lin({ IA_ACTIVA: '1' })));
  chk('d. probarAntesDeImplementar llama a probarNota_ (sección 21)', /probarNota_\(bien, ojo\)/.test(SRC.slice(SRC.indexOf('function probarAntesDeImplementar'), SRC.indexOf('var veredicto'))));
  chk('e. doPost manda `leerNota` ANTES del candado', SRC.indexOf("action === 'leerNota'") > 0 && SRC.indexOf("action === 'leerNota'") < SRC.indexOf('var lock = LockService.getScriptLock();', SRC.indexOf('function doPostCuerpo_')));
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
