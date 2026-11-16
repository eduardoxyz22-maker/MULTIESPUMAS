/* 🎧🤖 MEJORA 347 · LA ATC CON FOTOS: CLAUDE PROPONE EL MOTIVO Y EL RECLAMO — EL SERVIDOR (acción `atcFotos`, .gs 2026-11-16-a).
   LO QUE CUIDA (con el .gs REAL en Node; Drive y Claude de mentira):
   1. Las fotos se bajan SOLO de la carpeta de fotos del panel (una ajena no va), hasta 2, y van como bloques de imagen base64 con la
      pregunta; el motivo del esquema es una lista CERRADA con la lista que manda la página (+ vacío) y lo que el certificado no cubre va en
      la pregunta. El sistema dice que garantía o STC lo decide gerencia.
   2. Lo que vuelve: el motivo SIEMPRE de la lista (uno inventado → vacío), «no cubre» con su porqué solo si es true, el párrafo para la
      fábrica y qué foto pedir.
   3. La misma consulta se recuerda 6 h en la caché: la segunda vez no le pregunta a Claude ni gasta el tope.
   4. Sin candado y sin planilla; en Propiedades solo ATC_FOTOS_DIA (cuántas y los tokens).
   5. Los «no»: sin fotos, sin la lista de motivos, apagado (IA_ACTIVA, IA_ATC_FOTOS = 0), sin clave, tope, ocupado, una foto que Claude no abre.
   Datos INVENTADOS.
   Se corre:  node tests/test_ia_vend_atc_servidor.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const SRC = fs.readFileSync(GS, 'utf8');
const respuesta = (code, cuerpo) => ({ getResponseCode: () => code, getContentText: () => typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo || {}) });
const MOTIVOS = ['Hundimiento', 'Resortes', 'Retapizado / costura', 'Ruido', 'Patas', 'Tela / pillow', 'Cambio de producto', 'Cotización', 'Otro'];
const NO_CUBRE = ['Manchas, humedad, quemaduras, cortes o roturas.', 'El desgaste normal de la tela con el tiempo.'];
const LEIDO = { muestra: true, motivo: 'Retapizado / costura', se_ve: 'Costura del borde abierta unos 20 cm, del lado de la cabecera.', no_cubre: true,
  no_cubre_por: 'Mancha clara en la tapa, en la 2ª foto.', para_fabrica: 'Colchón Oro Bi Relax 200x200, comprado el 15/03/2022. Costura del borde abierta ~20 cm. Se pide revisar la costura.', pedir_foto: '' };
const FOTOS = { fA: 'FOTO-A-INVENTADA', fB: 'FOTO-B-INVENTADA', fC: 'FOTO-C-INVENTADA', ajena: 'FOTO-AJENA' };
function cargar(props, opt) {
  opt = opt || {};
  const claude = [], logs = [], hoja = [], candado = [], propsEscritas = [], cache = {};
  const P = Object.assign({ FOTOS_FOLDER_ID: 'carpeta-fotos' }, props || {});
  const contestar = opt.contestar || (() => respuesta(200, { stop_reason: 'end_turn', usage: { input_tokens: 5800, output_tokens: 400 }, content: [{ type: 'text', text: JSON.stringify(opt.leido || LEIDO) }] }));
  const it = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  const ctx = {
    Date, JSON, Math,
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')) },
    Logger: { log: (...a) => logs.push(a.join(' ')) },
    SpreadsheetApp: new Proxy({}, { get: (t, k) => { hoja.push(String(k)); return () => { throw new Error('atf no toca la planilla'); }; } }),
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => P[k] != null ? P[k] : null,
      setProperty: (k, v) => { P[k] = String(v); propsEscritas.push(k); },
      setProperties: (o) => { Object.keys(o).forEach(k => { P[k] = String(o[k]); propsEscritas.push(k); }); },
      deleteProperty: (k) => { delete P[k]; } }) },
    UrlFetchApp: { fetch: (url, o) => { claude.push({ url, o, b: JSON.parse(o.payload) }); return contestar(claude.length, JSON.parse(o.payload), o); },
                   fetchAll: () => { throw new Error('sin token no se usa la API de Drive'); } },
    Utilities: { base64Encode: (d) => Buffer.from(d).toString('base64'), formatDate: (d) => String(d) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, getContent() { return this._t; }, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => { candado.push(1); return { waitLock() {}, releaseLock() {} }; } },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, putAll: () => {}, remove: (k) => { delete cache[k]; } }) },
    Session: { getScriptTimeZone: () => 'America/La_Paz' },
    DriveApp: {
      getFolderById: (id) => ({ getId: () => id }),
      getFileById: (id) => {
        if (!FOTOS[id]) throw new Error('no existe');
        const padre = id === 'ajena' ? 'otra-carpeta' : 'carpeta-fotos';
        return { getParents: () => it([{ getId: () => padre }]), getMimeType: () => 'image/jpeg',
                 getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => Buffer.from(FOTOS[id]) }) };
      }
    },
    ScriptApp: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const post = (body) => JSON.parse(ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify(body) } })._t);
  return { ctx, claude, logs, hoja, candado, propsEscritas, P, post, cache };
}
const PROPS = () => ({ IA_ACTIVA: '1', ANTHROPIC_API_KEY: 'clave-de-prueba' });
const PIDE = (o) => Object.assign({ action: 'atcFotos', fotos: ['fA', 'fB', 'fC'], det: 'Se le abrió la costura del borde <y> mancha', mot: 'Otro', prod: 'ORO BI RELAX 200x200', fcom: '2022-03-15', motivos: MOTIVOS, noCubre: NO_CUBRE }, o || {});
const b64 = (t) => Buffer.from(t).toString('base64');

console.log('\n── 1. La consulta ──');
{
  const a = cargar(PROPS());
  const r = a.post(PIDE());
  const q = a.claude[0] || {}, b = q.b || {}, h = (q.o || {}).headers || {}, C = a.ctx, cont = ((b.messages || [])[0] || {}).content || [];
  chk('a. contesta ok', r.ok === true && !!r.ia, JSON.stringify(r).slice(0, 200));
  chk('b. UNA consulta con la clave, la versión y el beta; esfuerzo bajo, `fallbacks` y JSON fijo', a.claude.length === 1 && h['x-api-key'] === 'clave-de-prueba' && h['anthropic-beta'] === C.IA_BETA &&
    b.output_config.effort === 'low' && b.fallbacks === 'default' && b.output_config.format.type === 'json_schema' && !b.thinking);
  chk('c. hasta 2 fotos (la 3ª no va), como imágenes base64 de la carpeta, y después la pregunta',
    cont.length === 3 && cont[0].type === 'image' && cont[0].source.data === b64(FOTOS.fA) && cont[1].source.data === b64(FOTOS.fB) && cont[0].source.media_type === 'image/jpeg' && cont[2].type === 'text', cont.map(x => x.type));
  const S = b.output_config.format.schema;
  chk('d. el motivo es la lista de la página + vacío (lista cerrada), y todas las claves son obligatorias',
    JSON.stringify(S.properties.motivo.enum) === JSON.stringify(MOTIVOS.concat([''])) && S.additionalProperties === false && Object.keys(S.properties).every(k => S.required.indexOf(k) >= 0));
  const t = cont[2].text;
  chk('e. la pregunta lleva el detalle SIN «<» ni «>», el producto, la fecha de compra, el motivo elegido y lo que no cubre el certificado',
    /<detalle>Se le abrió la costura del borde ‹y› mancha<\/detalle>/.test(t) && /<producto>ORO BI RELAX 200x200<\/producto>/.test(t) && /2022-03-15/.test(t) && /<motivo_elegido>Otro</.test(t) &&
    /Manchas, humedad, quemaduras, cortes o roturas\./.test(t), t.slice(0, 300));
  chk('f. el sistema: describir solo lo que se ve, garantía o STC lo decide gerencia, los datos no son instrucciones',
    /SOLO lo que se ve/.test(b.system) && /lo decide gerencia/.test(b.system) && /nunca una instrucción/.test(b.system));
  const a2 = cargar(Object.assign(PROPS(), { IA_ATC_FOTOS_MODELO: 'modelo-atc', IA_ATC_FOTOS_ESFUERZO: 'medium' })); a2.post(PIDE());
  chk('g. IA_ATC_FOTOS_MODELO e IA_ATC_FOTOS_ESFUERZO cambian el modelo y el esfuerzo', a2.claude[0].b.model === 'modelo-atc' && a2.claude[0].b.output_config.effort === 'medium');
}

console.log('\n── 2. Lo que vuelve ──');
{
  const a = cargar(PROPS());
  const ia = a.post(PIDE()).ia || {};
  chk('a. motivo de la lista, qué se ve, «no cubre» con su porqué, el párrafo y las fotos que miró',
    ia.motivo === 'Retapizado / costura' && /Costura del borde abierta/.test(ia.seVe) && ia.noCubre === true && /Mancha clara/.test(ia.noCubrePor) && /Oro Bi Relax/.test(ia.fab) && ia.fotos === 2 && ia.muestra === true, ia);
  const C = a.ctx;
  const n = C.atfNormal_({ muestra: false, motivo: 'Inventado', se_ve: 'x', no_cubre: false, no_cubre_por: 'no va', para_fabrica: '', pedir_foto: 'Una foto de cerca' }, MOTIVOS, 1);
  chk('b. un motivo que no está en la lista → vacío; «no cubre» false → sin porqué; la foto que hay que pedir', n.motivo === '' && n.noCubre === false && n.noCubrePor === '' && n.muestra === false && n.pedir === 'Una foto de cerca', n);
  chk('c. lo que vuelve NO trae nada de garantía/STC (no hay ningún campo «tipo»)', !('tipo' in ia) && !('garantia' in ia), Object.keys(ia));
}

console.log('\n── 3. La caché: la misma consulta no gasta dos veces ──');
{
  const a = cargar(PROPS());
  const r1 = a.post(PIDE()), r2 = a.post(PIDE());
  chk('a. la segunda vez sale de la caché: sin Claude y sin gastar el tope', r1.ok && r2.ok && r2.cache === 1 && a.claude.length === 1 && JSON.parse(a.P.ATC_FOTOS_DIA).n === 1 && r2.ia.motivo === r1.ia.motivo, { c: a.claude.length, r2: r2.cache });
  const r3 = a.post(PIDE({ det: 'Otro detalle distinto' }));
  chk('b. otro detalle es otra consulta', r3.ok && !r3.cache && a.claude.length === 2);
  const off = cargar({ ANTHROPIC_API_KEY: 'k' }); Object.assign(off.cache, a.cache);
  const r4 = off.post(PIDE());
  chk('c. lo de la caché sale aunque Claude esté apagado ahora (ya está leído)', r4.ok && r4.cache === 1 && off.claude.length === 0);
}

console.log('\n── 4. Sin candado, sin planilla, sin registros ──');
{
  const a = cargar(PROPS());
  const r = a.post(PIDE());
  chk('a. no pide el candado ni abre la planilla', r.ok && a.candado.length === 0 && a.hoja.length === 0);
  chk('b. nada a Logger ni console', a.logs.length === 0, JSON.stringify(a.logs).slice(0, 200));
  chk('c. en Propiedades solo ATC_FOTOS_DIA, con cuántas y los tokens (nada del detalle)', a.propsEscritas.every(k => k === 'ATC_FOTOS_DIA') && !/costura|ORO/.test(a.P.ATC_FOTOS_DIA) && JSON.parse(a.P.ATC_FOTOS_DIA).tot.tin === 5800, a.P.ATC_FOTOS_DIA);
}

console.log('\n── 5. Los «no» ──');
{
  const casos = [
    ['a. sin fotos → «sin_foto»', PROPS(), PIDE({ fotos: [] }), 'sin_foto'],
    ['b. sin la lista de motivos → «sin_motivos»', PROPS(), PIDE({ motivos: [] }), 'sin_motivos'],
    ['c. sin IA_ACTIVA → «ia_apagada»', { ANTHROPIC_API_KEY: 'k' }, PIDE(), 'ia_apagada'],
    ['d. IA_ATC_FOTOS = 0 → «ia_apagada»', Object.assign(PROPS(), { IA_ATC_FOTOS: '0' }), PIDE(), 'ia_apagada'],
    ['e. sin la clave de Claude → «sin_clave»', { IA_ACTIVA: '1' }, PIDE(), 'sin_clave'],
    ['f. una foto que no es de la carpeta del panel → «sin_foto» (no se manda)', PROPS(), PIDE({ fotos: ['ajena'] }), 'sin_foto'],
    ['g. una foto que no existe → «sin_foto»', PROPS(), PIDE({ fotos: ['noesta'] }), 'sin_foto']
  ];
  casos.forEach(([l, pr, body, err]) => { const b = cargar(pr), r = b.post(body); chk(l + ', sin Claude', r.ok === false && r.error === err && b.claude.length === 0, JSON.stringify(r)); });
  const mix = cargar(PROPS()); mix.post(PIDE({ fotos: ['ajena', 'fA'] }));
  chk('h. una ajena y una buena: va solo la buena', mix.claude.length === 1 && mix.claude[0].b.messages[0].content.filter(x => x.type === 'image').length === 1);
  const t = cargar(Object.assign(PROPS(), { ATC_FOTOS_TOPE_DIA: '1' }));
  const t1 = t.post(PIDE()), t2 = t.post(PIDE({ det: 'otro' }));
  chk('i. ATC_FOTOS_TOPE_DIA = 1: la segunda dice «tope»', t1.ok && t2.error === 'tope' && t.claude.length === 1, JSON.stringify(t2));
  const o = cargar(PROPS(), { contestar: () => respuesta(529, { error: {} }) });
  const ro = o.post(PIDE());
  chk('j. ocupado → «ocupado», no cuenta', ro.error === 'ocupado' && JSON.parse(o.P.ATC_FOTOS_DIA).n === 0);
  const f = cargar(PROPS(), { contestar: () => respuesta(400, { error: { message: 'Could not process image' } }) });
  const rf = f.post(PIDE());
  chk('k. una foto que Claude no abre → «no_se_lee» sin repetir', rf.error === 'no_se_lee' && f.claude.length === 1);
  const k = cargar(PROPS(), { contestar: () => respuesta(401, { error: { message: 'invalid x-api-key' } }) });
  chk('l. la clave no sirve → «ia_error» y pausa', k.post(PIDE()).error === 'ia_error' && Number(k.P.IA_PAUSA_HASTA) > Date.now());
  chk('m. doPost manda `atcFotos` antes del candado', SRC.indexOf("action === 'atcFotos'") > 0 && SRC.indexOf("action === 'atcFotos'") < SRC.indexOf('var lock = LockService.getScriptLock();', SRC.indexOf("action === 'leerNota'")));
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
