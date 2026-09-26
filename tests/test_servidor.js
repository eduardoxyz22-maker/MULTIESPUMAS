/* 🛡️ LO QUE EL SERVIDOR TIENE QUE NEGARSE A HACER (§4ce).

   Una auditoría del backend confirmó cinco agujeros, y los cinco se probaron contra el
   código real antes de tocar nada:
     1. Consultar, guardar y borrar pedidos no pedía NINGUNA clave. La dirección del script
        está en el panel, que es una página pública: cualquiera podía bajar la planilla
        entera (nombres, celulares, direcciones) o borrarla.
     2. `borrarFoto` mandaba a la papelera CUALQUIER archivo del Drive del dueño con solo
        pasarle el id, y contestaba «ok» aunque fallara.
     3. Cada guardado pisaba la fila entera sin mirar si alguien la había cambiado: un
        cambio de chofer con una copia vieja borraba el pago que contabilidad acababa de
        registrar (un saldo cancelado volvía a deber Bs 100).
     4. Los porteros de día cerrado y cupos eran solo para pedidos NUEVOS: mover uno
        existente a domingo, a un día cerrado o a un turno lleno entraba sin más.
     5. Dos pedidos con el mismo N° de OC entraban los dos.

   Este archivo carga google-apps-script.gs con un Google de mentira (planilla, Drive,
   propiedades) y le pega como le pegaría el panel — o un intruso.

   Se corre:  node tests/test_servidor.js   (desde la raíz del repo)
   Para probarle los dientes contra el .gs viejo:  GS=/ruta/al/viejo.gs node tests/test_servidor.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const CLAVE = 'clave-del-equipo-123';

/* ── Planilla de mentira ─────────────────────────────────────────────────── */
/* `opts.fechas`: como Sheets, un texto con forma de fecha («2026-08-15», una hora ISO) se vuelve
   Fecha al escribirlo — el peor caso: sin mirar el formato de texto. `opts.maxFilas`: la hoja
   tiene ese tope de filas y escribir más abajo revienta, como en Google, hasta `insertRowsAfter`. */
function hacerPlanilla(filas, opts){
  const datos = filas.map(f => f.slice());
  let max = (opts && opts.maxFilas) || 0;
  const conv = (v) => (opts && opts.fechas && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(v)) ? new Date(v) : v;
  const tope = (ultima) => { if (max && ultima > max) throw new Error('Las coordenadas están fuera de la hoja (fila ' + ultima + ' de ' + max + ')'); };
  const col = (letras) => { let n = 0; for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };
  const sh = {
    _datos: datos, _listas: [],
    getLastRow: () => datos.length,
    getLastColumn: () => (datos[0]||[]).length,
    getMaxRows: () => max || Math.max(1000, datos.length),
    insertRowsAfter: (despues, n) => { if (max) max += n; },
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {},
    appendRow: (r) => { datos.push(r.map(conv)); if (max && datos.length > max) max = datos.length; },
    deleteRow: (n) => { datos.splice(n-1, 1); },
    /* Varias celdas sueltas de una vez («S2», «AD10»), como `Sheet.getRangeList`. Anota qué
       celdas se pidieron, para ver que no se escribió de más. */
    getRangeList: (a1s) => {
      sh._listas.push(a1s.slice());
      return { setValue: (v) => a1s.forEach(a1 => {
        const m = /^([A-Z]+)(\d+)$/.exec(a1); if (!m) throw new Error('A1 inválida: ' + a1);
        const f = +m[2]; tope(f); if (!datos[f-1]) datos[f-1] = []; datos[f-1][col(m[1])-1] = conv(v);
      }) };
    },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila-1]||[])[col-1],
      setValue: (v) => { tope(fila); if(!datos[fila-1]) datos[fila-1]=[]; datos[fila-1][col-1]=conv(v); },
      getValues: () => {
        const out=[];
        for(let i=0;i<(nFilas||1);i++){
          const f=datos[fila-1+i]||[], r=[];
          for(let j=0;j<(nCols||1);j++) r.push(f[col-1+j]);
          out.push(r);
        }
        return out;
      },
      /* Escribe en SU rango, desde la columna `col` (25/09: antes reemplazaba la fila entera y una
         escritura de UNA columna borraba el resto de la fila en la prueba). */
      setValues: (v) => { tope(fila - 1 + v.length); for(let i=0;i<v.length;i++){ const r=datos[fila-1+i]||(datos[fila-1+i]=[]); for(let j=0;j<v[i].length;j++) r[col-1+j]=conv(v[i][j]); } },
      setNumberFormat: () => {},
      setFontWeight: () => {}
    })
  };
  return sh;
}
/* ── Drive de mentira: una carpeta de fotos y un archivo AJENO ───────────── */
function hacerDrive(){
  const CARPETA_FOTOS='carpeta-fotos', OTRA='carpeta-contabilidad';
  const archivos = {
    'foto-1':   { padres:[CARPETA_FOTOS], papelera:false },
    'balance':  { padres:[OTRA],          papelera:false }   // ⚠️ NO es una foto de entrega
  };
  const carpeta = (id) => ({ getId: () => id });
  return {
    _archivos: archivos,
    getFoldersByName: (n) => ({ hasNext: () => true, next: () => carpeta(CARPETA_FOTOS) }),
    createFolder: () => carpeta(CARPETA_FOTOS),
    getFileById: (id) => {
      const a = archivos[id]; if(!a) throw new Error('No existe: '+id);
      return {
        getParents: () => { let i=0; return { hasNext: () => i<a.padres.length, next: () => carpeta(a.padres[i++]) }; },
        setTrashed: (v) => { a.papelera=!!v; }
      };
    }
  };
}

function hacerScriptApp(){
  const triggers = [];
  const crear = (fn, tipo, v) => { const t = { fn, tipo, v, getHandlerFunction: () => fn }; triggers.push(t); return t; };
  return {
    _triggers: triggers,
    newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => crear(fn, 'after', ms) }),
                                               everyMinutes: (n) => ({ create: () => crear(fn, 'every', n) }),
                                               everyDays: (n) => ({ atHour: (h) => ({ create: () => crear(fn, 'daily', h) }), create: () => crear(fn, 'daily', 0) }) }) }),
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
  };
}
function cargar(filas, props, fuente){   // `fuente`: otro texto del .gs (§11: un pegado cortado)
  const sh = hacerPlanilla(filas), drive = hacerDrive();
  const shR = hacerPlanilla([]);                       // la hoja «Rechazos» (§4el), aparte de la de pedidos
  /* Hojas que crea un script aparte (25/09: «Respaldo entregados», de herramientas/): con el
     tope de filas de una hoja nueva bien bajo y convirtiendo fechas, que es el peor caso. */
  const otras = {};
  const OTRAS = { 'Respaldo entregados':1 };
  const cont = { flush: 0 };
  const cache = { _m: {},
    get(k){ return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
    put(k, v){ this._m[k] = String(v); },
    putAll(o){ for (const k in o) this._m[k] = String(o[k]); },
    remove(k){ delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => n==='Rechazos' ? shR : (OTRAS[n] ? (otras[n]||null) : sh),
      insertSheet: (n) => n==='Rechazos' ? shR : (OTRAS[n] ? (otras[n]=hacerPlanilla([], { fechas:true, maxFilas:3 })) : sh) }),
      flush: () => { cont.flush++; } },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props && props[k] != null) ? props[k] : null,
      setProperty: (k, v) => { props[k] = v; },
      /* ⚠️ El doble tiene que tener TODO lo que el .gs usa: sin `deleteProperty`, el
         camino que olvida la carpeta de fotos cacheada reventaba con «not a function»
         y el test lo leía como si el servidor estuviera roto (§4dt). */
      deleteProperty: (k) => { if (props) delete props[k]; },
      setProperties: (o) => { if (props) Object.assign(props, o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
    /* La caché del script (§4du): un mapa en memoria; el vencimiento no se simula.
       ⚠️ UNA sola instancia por planilla: en Google `getScriptCache()` devuelve siempre la
       misma caché. Devolver un objeto nuevo por llamada hacía que guardar y leer cayeran en
       mapas distintos, y el test decía «3 lecturas» con el servidor bien. */
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType:{JSON:'json'}, createTextOutput: (t) => ({ _t:t, setMimeType(){ return this; } }) },
    DriveApp: drive,
    Utilities: { formatDate: (d)=>String(d), base64Decode: () => [], newBlob: () => ({}) },
    /* `getTemporaryActiveUserKey` (§4dv): la marca del navegador que el .gs recorta a 6 letras. */
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGHIJKLMNOP' },
    /* Los disparadores de tiempo (§4eg): una lista en memoria. `after` y `everyMinutes`
       solo anotan; nada se dispara solo, el test llama a la función a mano. */
    ScriptApp: hacerScriptApp()
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fuente != null ? fuente : fs.readFileSync(GS,'utf8'), ctx);
  const leer = (r) => JSON.parse(r._t);
  const post = (body) => leer(ctx.doPost({ postData:{ contents: JSON.stringify(body) }, parameter:{} }));
  const get  = (params) => leer(ctx.doGet({ parameter: params||{} }));
  return { ctx, sh, shR, drive, post, get, leer, otras, cont };
}

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona',
  'Dirección','Link Maps','Pagado','Saldo (Bs)','ts','_productos_json','Método pago',
  'Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)',
  'Nota de venta','A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega'];

/* Fechas relativas: un martes y un miércoles próximos (siempre entregables), y un domingo. */
function proximo(dow){ const d=new Date(); d.setDate(d.getDate()+1); while(d.getDay()!==dow) d.setDate(d.getDate()+1);
  const m=d.getMonth()+1, day=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day; }
const MARTES=proximo(2), MIERCOLES=proximo(3), DOMINGO=proximo(0), JUEVES=proximo(4);
const AHORA = Date.now();
const anioOC = String(new Date().getMonth()+1).padStart(2,'0');   // la serie del mes en curso

/* Una fila de pedido (29 columnas, como la planilla real de hoy, SIN la col Revisión). */
function fila(o){
  const b = Object.assign({id:'x', fecha:MARTES, oc:'', vend:'Carola Chavez', cli:'CLIENTE', turno:'AM',
    saldo:0, ts:AHORA, acuenta:0, nro:1, pagado:'NO', chofer:'', obs:'', fotos:''}, o);
  return [b.id,b.fecha,b.oc,b.vend,b.cli,'COLCHON × 1','70111222',b.turno,'Norte','calle x','',b.pagado,b.saldo,b.ts,
    '[{"desc":"COLCHON","cant":1,"precio":1000}]','Efectivo',b.obs,'','NO','',b.chofer,'','640',b.acuenta,'','',b.nro,'NO',b.fotos];
}
/* El pedido como lo manda el panel (a partir de una fila leída). */
function pedido(ctx, sh, id){
  const r = sh._datos.find(f => f[0]===id);
  return ctx.rowToRec_ ? ctx.rowToRec_(r) : null;
}
const conClave = (body) => Object.assign({ key:CLAVE }, body);

// ══ 1. 🔐 LA PUERTA ═════════════════════════════════════════════════════════
console.log('\n── 1. La puerta: sin la clave del equipo no se lee ni se escribe ──');
{
  const a = cargar([HDR, fila({id:'p1', cli:'INES SUAREZ'})], { PANEL_KEY: CLAVE });
  let r = a.post({ action:'list' });
  chk('⚠️ listar SIN clave: rechazado', r.ok===false && r.error==='clave', JSON.stringify(r));
  chk('…y no devolvió ni un pedido', !r.pedidos, JSON.stringify(r).slice(0,80));
  r = a.post({ action:'list', key:'otra' });
  chk('⚠️ listar con clave EQUIVOCADA: rechazado', r.ok===false && r.error==='clave', JSON.stringify(r));
  r = a.post({ action:'delete', id:'p1' });
  chk('⚠️ borrar sin clave: rechazado', r.ok===false && r.error==='clave', JSON.stringify(r));
  chk('…y la fila sigue ahí', a.sh._datos.length===2, a.sh._datos.length);
  r = a.post({ action:'save', pedido:{ id:'intruso', fecha:MARTES, cliente:'FALSO' } });
  chk('⚠️ guardar sin clave: rechazado', r.ok===false && r.error==='clave', JSON.stringify(r));
  chk('…y no escribió nada', a.sh._datos.length===2, a.sh._datos.length);
  r = a.post({ action:'geocode', links:['x'] });
  chk('geocode sin clave: rechazado (es lento y caro)', r.ok===false && r.error==='clave', JSON.stringify(r));
  r = a.post({ action:'borrarFoto', fotoId:'foto-1' });
  chk('borrar foto sin clave: rechazado', r.ok===false && r.error==='clave', JSON.stringify(r));
  chk('…y la foto no fue a la papelera', a.drive._archivos['foto-1'].papelera===false);
  r = a.get({});
  chk('⚠️ el GET (abrir la dirección en el navegador) tampoco vuelca la planilla', r.ok===false && !r.pedidos, JSON.stringify(r).slice(0,80));
  r = a.get({ k: CLAVE });
  chk('el GET con ?k=clave sí (para mirar desde el navegador)', r.ok===true && r.pedidos.length===1, JSON.stringify(r).slice(0,80));
  r = a.post(conClave({ action:'list' }));
  chk('con la clave, listar anda', r.ok===true && r.pedidos.length===1 && r.pedidos[0].cliente==='INES SUAREZ');
  chk('y dice que la puerta tiene llave (auth: clave)', r.auth==='clave', r.auth);
}
{
  /* ⚠️ Sin PANEL_KEY configurada sigue abierto — a propósito, para que publicar esta
     versión no deje al equipo sin trabajar. Pero lo DICE, y el panel lo muestra en rojo. */
  const a = cargar([HDR, fila({id:'p1'})], {});
  const r = a.post({ action:'list' });
  chk('sin PANEL_KEY configurada sigue funcionando (no deja al equipo sin trabajar)', r.ok===true && r.pedidos.length===1);
  chk('⚠️ …pero avisa que está ABIERTO', r.auth==='abierto', r.auth);
}
{
  // La integración con Kommo tiene SU clave y no se ve afectada por la del panel.
  const a = cargar([HDR], { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kommo-k' });
  const r = a.post({ action:'kommoLeads', key:'kommo-k', leads:[] });
  chk('el repaso de Kommo con SU clave sigue entrando', r.ok===true, JSON.stringify(r));
  const r2 = a.post({ action:'kommoLeads', key:CLAVE, leads:[] });
  chk('…y la clave del panel NO sirve para Kommo', r2.ok===false, JSON.stringify(r2));
}

// ══ 2. 🗑️ BORRAR FOTO ═══════════════════════════════════════════════════════
console.log('\n── 2. borrarFoto solo toca la carpeta de fotos ──');
{
  const a = cargar([HDR], { PANEL_KEY: CLAVE });
  let r = a.post(conClave({ action:'borrarFoto', fotoId:'balance' }));
  chk('⚠️ un archivo de OTRA carpeta del Drive: rechazado', r.ok===false && r.error==='no_es_foto', JSON.stringify(r));
  chk('…y NO fue a la papelera', a.drive._archivos['balance'].papelera===false);
  r = a.post(conClave({ action:'borrarFoto', fotoId:'no-existe' }));
  chk('⚠️ un id que no existe: dice que falló (antes decía «ok»)', r.ok===false, JSON.stringify(r));
  r = a.post(conClave({ action:'borrarFoto', fotoId:'' }));
  chk('sin id: dice que falló', r.ok===false, JSON.stringify(r));
  r = a.post(conClave({ action:'borrarFoto', fotoId:'foto-1' }));
  chk('una foto de entrega de verdad: la borra', r.ok===true && a.drive._archivos['foto-1'].papelera===true, JSON.stringify(r));
}

// ══ 3. 🤝 CONFLICTO: nadie pisa lo que otro acaba de guardar ═══════════════
console.log('\n── 3. Dos personas sobre el mismo pedido ──');
{
  const a = cargar([HDR, fila({id:'p1', cli:'JUAN', saldo:100})], { PANEL_KEY: CLAVE });
  // Las dos leen la planilla a la misma hora.
  const lista = a.post(conClave({ action:'list' })).pedidos;
  const deConta = JSON.parse(JSON.stringify(lista[0])), deLogistica = JSON.parse(JSON.stringify(lista[0]));
  chk('la fila vieja (sin sello) se lee con rev 0', deConta.rev===0, deConta.rev);
  // Contabilidad registra el pago.
  deConta.saldo=0; deConta.pagado=true;
  let r = a.post(conClave({ action:'save', pedido: deConta }));
  chk('contabilidad guarda el pago', r.ok===true, JSON.stringify(r).slice(0,100));
  chk('…y recibe un sello de revisión', r.pedido && r.pedido.rev>0, r.pedido && r.pedido.rev);
  const selloConta = r.pedido.rev;
  // Logística, con su copia VIEJA, cambia el chofer.
  deLogistica.chofer='PEDRO';
  r = a.post(conClave({ action:'save', pedido: deLogistica }));
  chk('⚠️ logística con la copia vieja: RECHAZADO', r.ok===false && r.error==='conflicto', JSON.stringify(r).slice(0,120));
  const enHoja = pedido(a.ctx, a.sh, 'p1');
  chk('⚠️ el pago NO se pisó: el saldo sigue en 0', enHoja.saldo===0 && enHoja.pagado===true, JSON.stringify({saldo:enHoja.saldo, pagado:enHoja.pagado}));
  chk('…y el chofer viejo no entró', enHoja.chofer==='', enHoja.chofer);
  chk('el rechazo trae la fila ACTUAL para que el panel la muestre', r.pedido && r.pedido.saldo===0 && r.pedido.rev===selloConta, JSON.stringify(r.pedido||{}).slice(0,100));
  // Logística vuelve a leer, y ahora sí.
  const fresco = r.pedido; fresco.chofer='PEDRO';
  r = a.post(conClave({ action:'save', pedido: fresco }));
  chk('con la fila fresca, el chofer entra', r.ok===true && pedido(a.ctx,a.sh,'p1').chofer==='PEDRO');
  chk('…y el pago sigue', pedido(a.ctx,a.sh,'p1').saldo===0);
  chk('el sello cambió otra vez', r.pedido.rev>selloConta, r.pedido.rev+' > '+selloConta);
}
{
  /* ⚠️ §4cg — la auditoría reprodujo que bastaba OMITIR el sello para pisar el pago igual.
     La primera versión dejaba pasar los guardados sin `rev` «para no trabar a un panel
     viejo cacheado»; pero el panel viejo que más daño hace es justo el de la pestaña
     abierta desde ayer. Ahora: fila sellada + guardado sin sello = rechazado. */
  const a = cargar([HDR, fila({id:'p1', saldo:100})], { PANEL_KEY: CLAVE });
  const l = a.post(conClave({ action:'list' })).pedidos[0];
  const pagado = JSON.parse(JSON.stringify(l)); pagado.saldo=0; pagado.pagado=true;
  a.post(conClave({ action:'save', pedido: pagado }));                   // contabilidad cobra: deja sello
  const viejo = JSON.parse(JSON.stringify(l)); delete viejo.rev; viejo.chofer='ANA';
  const r = a.post(conClave({ action:'save', pedido: viejo }));
  chk('⚠️ una copia vieja SIN sello sobre una fila sellada: RECHAZADA', r.ok===false && r.error==='conflicto', JSON.stringify(r).slice(0,80));
  chk('⚠️ …y el pago sigue ahí', pedido(a.ctx,a.sh,'p1').saldo===0 && pedido(a.ctx,a.sh,'p1').pagado===true);
}
{
  // Las filas de ANTES (nunca selladas) aceptan su primer guardado, con o sin sello, y quedan selladas.
  const a = cargar([HDR, fila({id:'p1'})], { PANEL_KEY: CLAVE });
  const l = a.post(conClave({ action:'list' })).pedidos[0]; delete l.rev; l.chofer='ANA';
  let r = a.post(conClave({ action:'save', pedido: l }));
  chk('una fila de antes (sin sello) acepta su primer guardado aunque venga sin sello', r.ok===true && r.pedido.rev>0, JSON.stringify(r).slice(0,80));
  delete l.rev; l.chofer='BETO';
  r = a.post(conClave({ action:'save', pedido: l }));
  chk('…pero el segundo sin sello ya no entra: la fila quedó sellada', r.ok===false && r.error==='conflicto', JSON.stringify(r).slice(0,80));
}
{
  // Las filas del sistema (días cerrados, arqueo) se reescriben enteras a propósito: no exigen sello.
  const a = cargar([HDR], { PANEL_KEY: CLAVE });
  const cierre = { id:'__dias_cerrados__', fecha:'', observaciones:'🔒 '+JUEVES };
  let r = a.post(conClave({ action:'save', pedido: cierre }));
  chk('la fila de días cerrados entra la primera vez', r.ok===true);
  cierre.observaciones='🔒 '+JUEVES+' '+MIERCOLES;
  r = a.post(conClave({ action:'save', pedido: cierre }));
  chk('…y la segunda también, sin sello (es una fila del sistema)', r.ok===true, JSON.stringify(r).slice(0,80));
}
{
  /* 🤝 §4fz — EL STOCK Y EL ARQUEO SÍ PIDEN SELLO (informe del 23/09): dos dispositivos con la
     misma copia guardaban los dos con ✓ y el segundo borraba lo del primero. El panel manda el
     sello y `juntar`; en conflicto, junta y reguarda (test_concurrencia.js).
     §4fz-b (`2026-09-23-b`): sobre una fila ya sellada, un panel que NO sabe juntar (no manda
     `juntar`) recibe `actualizar` y no toca nada. En `2026-09-23-a` pasaba «para no trabarlo»,
     y era justo el que pisaba la fila entera; su 2° guardado seguido sí llevaba sello, chocaba
     y el panel viejo lo tiraba (auditoría, #8). */
  const a = cargar([HDR], { PANEL_KEY: CLAVE });
  const stk = (obs, rev) => { const o = { id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:obs }; if (rev !== undefined) o.rev = rev; return o; };
  const junta = (pedido) => conClave({ action:'save', pedido:pedido, juntar:1 });
  let r = a.post(junta(stk('{"e":[]}', 0)));
  chk('§4fz · la fila del stock entra la primera vez (con rev 0)', r.ok===true && r.pedido.rev>0, JSON.stringify(r).slice(0,80));
  const base = r.pedido.rev;
  r = a.post(junta(stk('{"e":[{"k":"A","u":5}]}', base)));                   // A: entrada de 5
  chk('…A guarda su entrada con el sello de la versión que leyó', r.ok===true, JSON.stringify(r).slice(0,80));
  const deA = r.pedido.rev;
  r = a.post(junta(stk('{"e":[],"p":[{"id":"q1","k":"B","u":8}]}', base)));   // B: con la copia VIEJA
  chk('⚠️ §4fz · B, con la copia vieja del stock: RECHAZADO (antes pisaba la entrada de A)', r.ok===false && r.error==='conflicto', JSON.stringify(r).slice(0,80));
  chk('⚠️ …la entrada de A sigue en la planilla', /"u":5/.test(pedido(a.ctx,a.sh,'__stock__').observaciones), pedido(a.ctx,a.sh,'__stock__').observaciones);
  chk('…y el rechazo trae la fila actual, para que el panel junte las dos', !!r.pedido && r.pedido.rev===deA && /"u":5/.test(r.pedido.observaciones), JSON.stringify(r.pedido||{}).slice(0,90));
  chk('…y NO se anota en «Rechazos»: el panel lo resuelve solo', !a.shR._datos.some(f => f[3]==='__stock__'), a.shR._datos.length+' filas');
  r = a.post(junta(stk('{"e":[{"k":"A","u":5}],"p":[{"id":"q1","k":"B","u":8}]}', deA)));
  chk('…con el sello nuevo (lo juntado), entra', r.ok===true && /"q1"/.test(pedido(a.ctx,a.sh,'__stock__').observaciones), JSON.stringify(r).slice(0,80));
  const junto = pedido(a.ctx,a.sh,'__stock__').observaciones, selloJunto = r.pedido.rev;
  r = a.post(junta(stk('{"e":[]}')));
  chk('§4fz-b · con `juntar` pero SIN sello sobre una fila sellada: conflicto (no pisa)', r.ok===false && r.error==='conflicto' && pedido(a.ctx,a.sh,'__stock__').observaciones===junto, JSON.stringify(r).slice(0,80));
  // Un panel VIEJO (cacheado, sin `juntar`): con o sin sello, no toca la fila.
  r = a.post(conClave({ action:'save', pedido: stk('{"e":[]}') }));
  chk('⚠️ §4fz-b · un panel VIEJO sin sello (el 1er guardado de ebc3eab): `actualizar`, y la fila NO se toca', r.ok===false && r.error==='actualizar' && pedido(a.ctx,a.sh,'__stock__').observaciones===junto, JSON.stringify(r).slice(0,80));
  r = a.post(conClave({ action:'save', pedido: stk('{"e":[{"k":"Z","u":6}]}', selloJunto) }));
  chk('⚠️ §4fz-b · un panel VIEJO CON el sello bueno (su 2° guardado seguido, #8): `actualizar`, tampoco pisa', r.ok===false && r.error==='actualizar' && pedido(a.ctx,a.sh,'__stock__').observaciones===junto, JSON.stringify(r).slice(0,80));
  const anot = a.shR._datos.filter(f => f[2]==='actualizar');
  chk('…y eso SÍ se anota en «Rechazos» (una computadora con la página vieja), diciendo que hay que recargar', anot.length===2 && /recargar la página/.test(String(anot[0][7])), anot.length?String(anot[0][7]):'no se anotó');
  const b2 = cargar([HDR], { PANEL_KEY: CLAVE });
  r = b2.post(conClave({ action:'save', pedido: stk('{"e":[]}') }));
  chk('§4fz-b · …pero la PRIMERA vez (la fila no existe o nunca se selló) entra igual: no hay nada que pisar', r.ok===true && r.pedido.rev>0, JSON.stringify(r).slice(0,80));
  const arq = { id:'__arqueo_cuadre__', fecha:'', cliente:'🧮 ARQUEO', observaciones:'mes|2026-09|Efectivo=900', rev:0 };
  r = a.post(junta(arq));
  const arqRev = r.pedido.rev;
  arq.observaciones='mes|2026-09|QR BISA=2000'; arq.rev=0;
  r = a.post(junta(arq));
  chk('§4fz · el arqueo con un sello viejo también se rechaza (el panel junta)', r.ok===false && r.error==='conflicto' && r.pedido.rev===arqRev, JSON.stringify(r).slice(0,80));
  arq.rev=arqRev;
  r = a.post(conClave({ action:'save', pedido: arq }));
  chk('§4fz-b · …y un panel viejo tampoco lo pisa: `actualizar`', r.ok===false && r.error==='actualizar' && /Efectivo=900/.test(pedido(a.ctx,a.sh,'__arqueo_cuadre__').observaciones), JSON.stringify(r).slice(0,80));
  const cierre = { id:'__dias_cerrados__', fecha:'', observaciones:'🔒 '+JUEVES, rev:1 };
  r = a.post(conClave({ action:'save', pedido: cierre })); cierre.observaciones='🔒 '+MIERCOLES;
  r = a.post(conClave({ action:'save', pedido: cierre }));
  chk('…pero los días cerrados siguen reescribiéndose enteros, aunque manden sello y no `juntar`', r.ok===true, JSON.stringify(r).slice(0,80));
}
{
  /* 🗑 §4fz — BORRAR TAMBIÉN MIRA EL SELLO (informe del 23/09). Guardar lo exige desde §4ce,
     pero borrar mandaba solo el id: A tenía abierta la venta que debía Bs 1.000, B registró
     el pago en otra computadora, y el «Eliminar» de A —con su vista vieja— se llevaba la
     fila con el pago adentro. */
  const existe = (a, id) => a.sh._datos.some(f => f[0]===id);
  const a = cargar([HDR, fila({id:'p1', cli:'JUAN', saldo:1000})], { PANEL_KEY: CLAVE });
  const b0 = a.post(conClave({ action:'list' })).pedidos[0]; b0.chofer='ANA';
  const vista = a.post(conClave({ action:'save', pedido:b0 })).pedido;   // la fila, sellada, como la ve A
  const deB = JSON.parse(JSON.stringify(vista)); deB.saldo=0; deB.pagado=true;
  const rb = a.post(conClave({ action:'save', pedido:deB }));             // B cobra
  let r = a.post(conClave({ action:'delete', id:'p1', rev:vista.rev }));  // A confirma «Eliminar» con su vista vieja
  chk('⚠️ §4fz · borrar con el sello VIEJO (otra persona cobró en el medio): RECHAZADO', r.ok===false && r.error==='conflicto', JSON.stringify(r).slice(0,100));
  chk('⚠️ …la venta sigue en la planilla, con el pago adentro', existe(a,'p1') && pedido(a.ctx,a.sh,'p1').saldo===0 && pedido(a.ctx,a.sh,'p1').pagado===true);
  chk('…y el rechazo trae la fila ACTUAL, para que el panel diga qué cambió', !!r.pedido && r.pedido.saldo===0 && r.pedido.rev===rb.pedido.rev, JSON.stringify(r.pedido||{}).slice(0,90));
  const anotado = a.shR._datos.filter(f => f[1]==='delete' && f[2]==='conflicto');
  chk('…y queda anotado en «Rechazos» con los dos sellos', anotado.length===1 && /rev enviado \d+ \/ rev hoja \d+/.test(String(anotado[0][7])), anotado.length?String(anotado[0][7]):'no se anotó');
  r = a.post(conClave({ action:'delete', id:'p1', rev:rb.pedido.rev }));
  chk('con el sello actual, se borra', r.ok===true && !existe(a,'p1'), JSON.stringify(r));
}
{
  const existe = (a, id) => a.sh._datos.some(f => f[0]===id);
  /* §4fz-b: un panel VIEJO (cacheado) borra sin sello. En `2026-09-23-a` se lo dejaba «para no
     trabarlo», y era justo el que se llevaba lo que otro acababa de cobrar sin mirar. Ahora, sobre
     una fila sellada, recibe `actualizar` (recargar la página) y NO borra. */
  const a = cargar([HDR, fila({id:'p1'})], { PANEL_KEY: CLAVE });
  const l = a.post(conClave({ action:'list' })).pedidos[0]; l.chofer='ANA';
  a.post(conClave({ action:'save', pedido:l }));                           // la fila queda sellada
  let r = a.post(conClave({ action:'delete', id:'p1' }));
  chk('⚠️ §4fz-b · un borrado SIN sello (panel viejo) sobre una fila sellada: `actualizar`, y la fila sigue', r.ok===false && r.error==='actualizar' && existe(a,'p1'), JSON.stringify(r));
  const anot = a.shR._datos.filter(f => f[1]==='delete' && f[2]==='actualizar');
  chk('…y queda anotado en «Rechazos»', anot.length===1, a.shR._datos.length+' filas');
  // Una fila de antes, nunca sellada, se borra con o sin sello: no hay con qué comparar.
  const a2 = cargar([HDR, fila({id:'p2'}), fila({id:'p3'})], { PANEL_KEY: CLAVE });
  r = a2.post(conClave({ action:'delete', id:'p2', rev:0 }));
  chk('…una fila de antes (nunca sellada) se borra con rev 0', r.ok===true && !existe(a2,'p2'), JSON.stringify(r));
  r = a2.post(conClave({ action:'delete', id:'p3' }));
  chk('…y también sin sello', r.ok===true && !existe(a2,'p3'), JSON.stringify(r));
}

// ══ 4. 🚪 MOVER PASA POR EL PORTERO ═════════════════════════════════════════
console.log('\n── 4. Mover un pedido de fecha o turno ──');
{
  const llenoAM = []; for(let i=0;i<12;i++) llenoAM.push(fila({id:'lleno'+i, fecha:MIERCOLES, turno:'AM', nro:i+1}));
  const filas = [HDR, fila({id:'p1', fecha:MARTES, turno:'AM'})].concat(llenoAM)
    .concat([ ['__dias_cerrados__','','','','','','','','','','','NO',0,0,'','','🔒 '+JUEVES,'','NO','','','','',0,'','',0,'NO',''] ]);
  const a = cargar(filas, { PANEL_KEY: CLAVE });
  const base = () => a.post(conClave({ action:'list' })).pedidos.find(p=>p.id==='p1');
  let p = base(); p.fecha=DOMINGO;
  let r = a.post(conClave({ action:'save', pedido:p }));
  chk('⚠️ mover a DOMINGO: rechazado', r.ok===false && r.error==='cupos_llenos', JSON.stringify(r).slice(0,100));
  p = base(); p.fecha=JUEVES;
  r = a.post(conClave({ action:'save', pedido:p }));
  chk('⚠️ mover a un día CERRADO: rechazado', r.ok===false && r.error==='dia_cerrado', JSON.stringify(r).slice(0,100));
  p = base(); p.fecha=MIERCOLES; p.turno='AM';
  r = a.post(conClave({ action:'save', pedido:p }));
  chk('⚠️ mover a un turno LLENO (12/12 AM): rechazado', r.ok===false && r.error==='cupos_llenos', JSON.stringify(r).slice(0,100));
  chk('…y sigue en su fecha de antes', pedido(a.ctx,a.sh,'p1').fecha===MARTES, pedido(a.ctx,a.sh,'p1').fecha);
  p = base(); p.fecha=MIERCOLES; p.turno='PM';
  r = a.post(conClave({ action:'save', pedido:p }));
  chk('mover al turno PM del mismo día (libre): entra', r.ok===true, JSON.stringify(r).slice(0,80));
  chk('…y el N° del día se lo da el servidor para el día nuevo', r.pedido.nroDia===13, r.pedido.nroDia);
  // Corregir algo SIN mover no pasa por el portero, aunque el día esté cerrado.
  const cerr = cargar([HDR, fila({id:'c1', fecha:JUEVES}),
    ['__dias_cerrados__','','','','','','','','','','','NO',0,0,'','','🔒 '+JUEVES,'','NO','','','','',0,'','',0,'NO',''] ], { PANEL_KEY: CLAVE });
  p = cerr.post(conClave({ action:'list' })).pedidos.find(x=>x.id==='c1'); p.chofer='LUIS';
  r = cerr.post(conClave({ action:'save', pedido:p }));
  chk('corregir un pedido que YA está en un día cerrado (sin moverlo): entra', r.ok===true, JSON.stringify(r).slice(0,80));
  /* 🛡️ §4cg — la auditoría reprodujo que `forzar:true` pasaba con solo la clave del EQUIPO,
     que no dice quién es administración. Con la puerta con llave, forzar exige ADMIN_KEY. */
  p = base(); p.fecha=JUEVES;
  r = a.post(conClave({ action:'save', pedido:p, forzar:true }));
  chk('⚠️ «forzar» con la clave del equipo pero SIN ADMIN_KEY configurada: rechazado', r.ok===false && r.error==='admin' && r.motivo==='sin_clave', JSON.stringify(r).slice(0,90));
  chk('…y el pedido no se movió', pedido(a.ctx,a.sh,'p1').fecha!==JUEVES, pedido(a.ctx,a.sh,'p1').fecha);
  const adm = cargar([HDR, fila({id:'p1', fecha:MARTES, turno:'AM'}),
    ['__dias_cerrados__','','','','','','','','','','','NO',0,0,'','','🔒 '+JUEVES,'','NO','','','','',0,'','',0,'NO',''] ],
    { PANEL_KEY: CLAVE, ADMIN_KEY:'la-de-administracion' });
  p = adm.post(conClave({ action:'list' })).pedidos.find(x=>x.id==='p1'); p.fecha=JUEVES;
  r = adm.post(conClave({ action:'save', pedido:p, forzar:true, adminKey:'otra' }));
  chk('⚠️ con ADMIN_KEY configurada y una clave EQUIVOCADA: rechazado', r.ok===false && r.error==='admin' && r.motivo==='clave_mal', JSON.stringify(r).slice(0,90));
  r = adm.post(conClave({ action:'save', pedido:p, forzar:true, adminKey:'la-de-administracion' }));
  chk('con la clave de administración correcta entra al día cerrado', r.ok===true && pedido(adm.ctx,adm.sh,'p1').fecha===JUEVES, JSON.stringify(r).slice(0,80));
  chk('la respuesta dice que la puerta interna tiene llave (adminAuth: clave)', r.adminAuth==='clave', r.adminAuth);
  const abierta = cargar([HDR, fila({id:'p1', fecha:MARTES, turno:'AM'}),
    ['__dias_cerrados__','','','','','','','','','','','NO',0,0,'','','🔒 '+JUEVES,'','NO','','','','',0,'','',0,'NO',''] ], {});
  p = abierta.post({ action:'list' }).pedidos.find(x=>x.id==='p1'); p.fecha=JUEVES;
  r = abierta.post({ action:'save', pedido:p, forzar:true });
  chk('con la puerta ABIERTA (sin PANEL_KEY) forzar sigue como siempre — no hay candado interno sin candado externo', r.ok===true, JSON.stringify(r).slice(0,80));
  // Un pedido NUEVO sigue teniendo el mismo portero de siempre.
  r = a.post(conClave({ action:'save', pedido:{ id:'n1', fecha:MIERCOLES, turno:'AM', cliente:'N', ts:AHORA } }));
  chk('un pedido NUEVO a un turno lleno: rechazado como siempre', r.ok===false && r.error==='cupos_llenos');
  // Un borrador de Kommo (sin fecha) que se completa con fecha pasa por el portero.
  const b = cargar([HDR, fila({id:'kommo-1', fecha:'', turno:''})], { PANEL_KEY: CLAVE });
  p = b.post(conClave({ action:'list' })).pedidos[0]; p.fecha=DOMINGO; p.turno='AM';
  r = b.post(conClave({ action:'save', pedido:p }));
  chk('completar un borrador de Kommo para un domingo: rechazado', r.ok===false, JSON.stringify(r).slice(0,80));
  p.fecha=MARTES;
  r = b.post(conClave({ action:'save', pedido:p }));
  chk('…y para el martes entra, con su N° del día', r.ok===true && r.pedido.nroDia===1, JSON.stringify(r.pedido||{}).slice(0,60));
}

// ══ 5. 🔢 OC REPETIDA ═══════════════════════════════════════════════════════
console.log('\n── 5. N° de OC repetido ──');
{
  const a = cargar([HDR, fila({id:'p1', oc:anioOC+'-045', cli:'PEPITO'})], { PANEL_KEY: CLAVE });
  // El número lo generó el panel y chocó: se le da el siguiente libre.
  let r = a.post(conClave({ action:'save', pedido:{ id:'p2', fecha:MARTES, turno:'AM', oc:anioOC+'-045', cliente:'JUANITO', ts:AHORA } }));
  chk('⚠️ OC automática repetida: entra con el SIGUIENTE número', r.ok===true && r.pedido.oc===anioOC+'-046', JSON.stringify(r.pedido&&{oc:r.pedido.oc}));
  chk('…y avisa de quién era la repetida', r.pedido.ocCambiada && r.pedido.ocCambiada.de===anioOC+'-045' && r.pedido.ocCambiada.con==='PEPITO', JSON.stringify(r.pedido.ocCambiada));
  chk('en la hoja quedaron las dos distintas', pedido(a.ctx,a.sh,'p2').oc===anioOC+'-046');
  // La serie ATC es OTRA serie: «ATC 09-045» no choca con «09-045».
  r = a.post(conClave({ action:'save', pedido:{ id:'p3', fecha:MARTES, turno:'AM', oc:'ATC '+anioOC+'-045', cliente:'ATC', ts:AHORA } }));
  chk('«ATC MM-045» no choca con la venta «MM-045»', r.ok===true && r.pedido.oc==='ATC '+anioOC+'-045', JSON.stringify(r.pedido&&{oc:r.pedido.oc}));
  // Un número escrito A MANO (ROHO manda el suyo) que ya existe: se rechaza y que la persona mire.
  const b = cargar([HDR, fila({id:'r1', oc:'4521', vend:'ROHO', cli:'ROHO SRL', fecha:MARTES})], { PANEL_KEY: CLAVE });
  r = b.post(conClave({ action:'save', pedido:{ id:'r2', fecha:MIERCOLES, turno:'AM', oc:'4521', vendedor:'ROHO', cliente:'ROHO SRL', ts:AHORA } }));
  chk('⚠️ OC manual repetida: RECHAZADA', r.ok===false && r.error==='oc_repetida', JSON.stringify(r).slice(0,120));
  chk('…y dice con quién choca', r.otro && r.otro.cliente==='ROHO SRL' && r.otro.fecha===MARTES, JSON.stringify(r.otro));
  chk('…y no escribió la fila', b.sh._datos.length===2, b.sh._datos.length);
  // Editar un pedido que ya tenía su OC (aunque esté repetida de antes) sigue pudiéndose.
  const c = cargar([HDR, fila({id:'v1', oc:anioOC+'-010', cli:'A'}), fila({id:'v2', oc:anioOC+'-010', cli:'B'})], { PANEL_KEY: CLAVE });
  let p = c.post(conClave({ action:'list' })).pedidos.find(x=>x.id==='v2'); p.chofer='X';
  r = c.post(conClave({ action:'save', pedido:p }));
  chk('editar un pedido que ya tenía su OC repetida de antes: entra (no cambió la OC)', r.ok===true, JSON.stringify(r).slice(0,80));
  p = c.post(conClave({ action:'list' })).pedidos.find(x=>x.id==='v2'); p.oc=anioOC+'-011';
  r = c.post(conClave({ action:'save', pedido:p }));
  chk('cambiarle la OC a una libre: entra', r.ok===true);
  p = c.post(conClave({ action:'list' })).pedidos.find(x=>x.id==='v2'); p.oc=anioOC+'-010';
  r = c.post(conClave({ action:'save', pedido:p }));
  chk('⚠️ cambiarle la OC a una que YA tiene otro: rechazado', r.ok===false && r.error==='oc_repetida', JSON.stringify(r).slice(0,80));
  // Misma OC, OTRO año: el correlativo arranca de nuevo, no es repetida.
  const anioPasado = new Date(); anioPasado.setFullYear(anioPasado.getFullYear()-1);
  const d = cargar([HDR, fila({id:'y1', oc:anioOC+'-001', ts:anioPasado.getTime()})], { PANEL_KEY: CLAVE });
  r = d.post(conClave({ action:'save', pedido:{ id:'y2', fecha:MARTES, turno:'AM', oc:anioOC+'-001', cliente:'N', ts:AHORA } }));
  chk('la misma OC del año pasado no cuenta como repetida', r.ok===true && r.pedido.oc===anioOC+'-001', JSON.stringify(r.pedido&&{oc:r.pedido.oc}));
  // Sin OC no hay nada que chocar.
  r = d.post(conClave({ action:'save', pedido:{ id:'y3', fecha:MARTES, turno:'AM', oc:'', cliente:'N', ts:AHORA } }));
  chk('sin OC, entra sin drama', r.ok===true);
}

// ══ 6. La columna nueva no rompe lo que había ═══════════════════════════════
console.log('\n── 6. La columna Revisión ──');
{
  const a = cargar([HDR, fila({id:'p1'})], { PANEL_KEY: CLAVE });
  a.post(conClave({ action:'list' }));
  chk('la hoja de 29 columnas recibe el encabezado «Revisión» (col 30) sola', a.sh._datos[0][29]==='Revisión', a.sh._datos[0][29]);
  chk('las filas viejas se leen igual que antes', a.post(conClave({action:'list'})).pedidos[0].cliente==='CLIENTE');
  chk('la versión del script subió', a.ctx.SCRIPT_VERSION>='2026-09-05-b', a.ctx.SCRIPT_VERSION);
}

/* ══ 7. El candado: lo que NO tiene que trabar (§4dt) ═══════════════════════════
   El dueño, con el botón clavado en «Enviando…»: *"qué pasa con el servidor, al subir
   fotos, al entrar, al cambiar algo tarda minutos"*. El servidor atiende de a uno, y con
   el candado tomado estaban dos cosas que no lo necesitan:
     · LEER la planilla (`readAll` es un solo `getValues`, una foto atómica), y cada
       dispositivo lee al entrar y cada minuto;
     · HABLAR CON KOMMO (hasta 4 pedidos de red por venta), con el repaso corriendo cada
       10 minutos.
   Nadie se da cuenta mirando el código: hay que mirar el ORDEN de lo que pasa. */
console.log('\n── 7. El candado no traba las lecturas ni espera a Kommo ──');
{
  const a = cargar([HDR, fila({id:'p1'})], { PANEL_KEY: CLAVE });
  let ev = [];
  a.ctx.LockService = { getScriptLock: () => ({ waitLock(){ ev.push('candado'); }, releaseLock(){ ev.push('suelta'); } }) };
  ev = [];
  const l = a.post(conClave({ action:'list' }));
  chk('⚠️ LEER la planilla no toma el candado (era el cuello de botella del panel)',
      l.ok===true && Array.isArray(l.pedidos) && ev.length===0, ev.join(',') || 'ninguno');
  ev = [];
  const s = a.post(conClave({ action:'save', pedido:{ id:'p9', fecha:MARTES, turno:'AM', cliente:'N', ts:AHORA } }));
  chk('…pero GUARDAR sí lo toma (dos personas no pueden pisarse)', s.ok===true && ev[0]==='candado' && ev.indexOf('suelta')>0, ev.join(','));
  ev = [];
  a.post(conClave({ action:'delete', id:'p1' }));
  chk('…y borrar también', ev[0]==='candado', ev.join(','));
}
{
  // ⚠️ Sin `KOMMO_TOKEN` configurado, `kGet_` ni sale a la red: el test no probaría nada.
  const a = cargar([HDR], { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira' });
  const orden = [];
  a.ctx.LockService = { getScriptLock: () => ({ waitLock(){ orden.push('candado'); }, releaseLock(){ orden.push('suelta'); } }) };
  a.ctx.UrlFetchApp = { fetch: () => { orden.push('kommo'); return { getResponseCode: () => 200,
    getContentText: () => JSON.stringify({ id:111, status_id:1, pipeline_id:1, responsible_user_id:9, price:0 }) }; } };
  /* Desde §4et el repaso de GitHub ENCOLA y contesta (como el webhook): el trabajo lo hace
     el disparador. Se llama a mano acá para mirar el orden; contra un .gs anterior la
     respuesta ya viene procesada. */
  const r0 = a.post({ action:'kommoLeads', key:'kk', leads:['111'] });
  const r = r0.diferido ? a.ctx.kommoProcesarCola() : r0;
  const iC = orden.indexOf('candado');
  chk('⚠️ lo que se le pregunta a Kommo pasa ANTES de tomar el candado, no adentro',
      r.ok===true && orden.indexOf('kommo')>=0 && (iC<0 || orden.indexOf('kommo')<iC) && (iC<0 || orden.slice(iC).indexOf('kommo')<0),
      orden.join(' → '));
}
{
  /* El caso de TODOS los días: el repaso corre, mira una venta que no da para borrador
     (Kommo no la devuelve, o no está en la etapa que dispara) y no hay nada que escribir.
     ⚠️ Con `leads:[]` este test no probaría nada: esa puerta ya existía. Hace falta que la
     lista TRAIGA ids y que igual no quede nada por escribir. */
  const a = cargar([HDR], { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira' });
  const orden = [];
  a.ctx.LockService = { getScriptLock: () => ({ waitLock(){ orden.push('candado'); }, releaseLock(){ orden.push('suelta'); } }) };
  const r0 = a.post({ action:'kommoLeads', key:'kk', leads:['999'] });
  const r = r0.diferido ? a.ctx.kommoProcesarCola() : r0;
  chk('un repaso que no encuentra nada para cargar ni toca el candado (corre 144 veces por día)',
      r.ok===true && r.creados===0 && orden.length===0, orden.join(',') || 'ninguno');
}
{
  // La carpeta de fotos se busca UNA vez y su id queda guardado.
  const props = { PANEL_KEY: CLAVE };
  const a = cargar([HDR], props);
  let busquedas = 0;
  const carpeta = { getId: () => 'CARPETA1', createFile: () => ({ getId: () => 'F1', setSharing(){}, getParents: () => ({ hasNext: () => false }) }), setSharing(){} };
  a.ctx.DriveApp = { getFoldersByName: () => { busquedas++; return { hasNext: () => true, next: () => carpeta }; },
                     getFolderById: (id) => { if(id!=='CARPETA1') throw new Error('no existe'); return carpeta; },
                     createFolder: () => carpeta, Access:{ANYONE_WITH_LINK:1}, Permission:{VIEW:1} };
  a.ctx.Utilities.base64Decode = () => [1,2,3];
  const foto = { action:'foto', key:CLAVE, dataUrl:'data:image/jpeg;base64,AAAA', cliente:'C' };
  a.post(foto); a.post(foto); a.post(foto);
  chk('⚠️ la carpeta de fotos se busca en Drive UNA sola vez, no en cada foto',
      busquedas===1 && props.FOTOS_FOLDER_ID==='CARPETA1', busquedas+' búsquedas · id '+props.FOTOS_FOLDER_ID);
}

/* ══ 8. Los GET de afuera: se anotan y no leen la hoja entera cada vez (§4du) ════════
   El registro de Ejecuciones del 10/09 mostró un chorro de `doGet` cada 3-4 segundos, de
   3 a 5 s cada uno, y NADA de este repositorio llama al /exec con GET. Mientras se
   identifica al que llama, el servidor tiene que (1) decir qué parámetros trae cada GET
   —sin valores: pueden ser claves— y (2) contestar desde la caché en vez de leer la
   planilla entera por cada uno. Un guardado borra la caché: nadie lee nada viejo. */
console.log('\n── 8. Los GET de afuera ──');
{
  const a = cargar([HDR, fila({id:'p1'}), fila({id:'p2'})], { PANEL_KEY: '' });
  let lecturas = 0; const orig = a.sh.getDataRange; a.sh.getDataRange = function(){ lecturas++; return orig.call(this); };
  const logs = []; a.ctx.console = { log: (t) => logs.push(String(t)), error: () => {}, warn: () => {} };
  const g1 = a.get({}), g2 = a.get({}), g3 = a.get({ _: '123', k: 'secreto-que-no-va-al-registro' });
  chk('⚠️ tres GET seguidos leen la planilla UNA sola vez (los otros dos salen de la caché)',
      lecturas===1 && g1.ok===true && g1.pedidos.length===2 && g3.ok===true && g3.pedidos.length===2, lecturas+' lecturas');
  chk('…y cada GET queda anotado con los NOMBRES de sus parámetros, nunca los valores',
      logs.length===3 && /parámetros: ninguno/.test(logs[0]) && /parámetros: _,k/.test(logs[2]) && !logs.join(' ').includes('secreto'), logs.join(' | ').slice(0,160));
  // Se guarda un pedido → la caché se borra → el próximo GET vuelve a leer, y ya lo trae.
  const s = a.post(conClave({ action:'save', pedido:{ id:'p3', fecha:MARTES, turno:'AM', cliente:'N', ts:AHORA } }));
  const g4 = a.get({});
  chk('un guardado borra la caché: el GET siguiente lee de nuevo y ya trae el pedido nuevo',
      s.ok===true && lecturas===2 && g4.pedidos.length===3, lecturas+' lecturas · '+g4.pedidos.length+' pedidos');
  // El POST 'list' del panel NO pasa por la caché: siempre la hoja de verdad.
  a.post(conClave({ action:'list' })); a.post(conClave({ action:'list' }));
  chk('la lista por POST (la del panel) no usa la caché: lee la hoja siempre', lecturas===4, lecturas+' lecturas');
  // Sin CacheService (un Google raro) sigue contestando, solo que leyendo cada vez.
  delete a.ctx.CacheService;
  const g5 = a.get({});
  chk('sin caché disponible contesta igual, leyendo la hoja', g5.ok===true && g5.pedidos.length===3);
}

/* ══ 9. Quién lee por GET, visible sin Cloud Logging (§4dv) ═══════════════════════
   El dueño no pudo desplegar las filas de Ejecuciones («Registros de Cloud» en gris), así
   que el console.log de §4du no le sirvió de nada. El servidor tiene que anotar cada GET en
   la caché —firmas, nunca valores—, copiar un resumen a las Propiedades del script (que sí
   se ven en ⚙️ Configuración) como mucho una vez por minuto, contestarlo por POST con
   {action:'getlog'} y, con GET_CERRADO puesto, negarse sin leer la hoja. */
console.log('\n── 9. Quién lee por GET ──');
{
  const props = { PANEL_KEY: '' };
  const a = cargar([HDR, fila({id:'p1'})], props);
  let escrituras = 0;
  a.ctx.PropertiesService = { getScriptProperties: () => ({
    getProperty: (k) => (props[k] != null) ? props[k] : null,
    setProperty: (k, v) => { props[k] = v; },
    deleteProperty: (k) => { delete props[k]; },
    setProperties: (o) => { escrituras++; Object.assign(props, o); } }) };
  a.ctx.console = { log: () => {}, error: () => {}, warn: () => {} };
  let lecturas = 0; const orig = a.sh.getDataRange; a.sh.getDataRange = function(){ lecturas++; return orig.call(this); };
  a.get({}); a.get({}); a.get({ _: '1', k: 'secreto-valor' });
  a.ctx.Session.getTemporaryActiveUserKey = () => 'ZZZZZZ999';                 // otro navegador
  a.ctx.doGet({ parameter: { hoja: 'x' }, queryString: 'hoja=x', pathInfo: 'pedidos' });
  const r = a.post(conClave({ action:'getlog' }));
  const g = r.get || {};
  const firmas = g.firmas || [];
  chk('⚠️ {action:"getlog"} cuenta los GET y los agrupa por firma (nombres de parámetros + ruta), la más repetida primero',
      r.ok===true && g.n===4 && firmas.length===3 && firmas[0].p==='ninguno' && firmas[0].n===2, JSON.stringify(firmas).slice(0,200));
  chk('…y en toda la respuesta no hay UN valor de parámetro', !JSON.stringify(r).includes('secreto') && !JSON.stringify(r).includes('=x'), '');
  const fk = firmas.find(f => f.p==='_,k'), fh = firmas.find(f => f.p==='hoja');
  chk('cada firma dice qué dispositivos y de dónde salió la respuesta (hoja / caché)',
      fk && fk.disp.length===1 && fk.disp[0]==='ABCDEF' && fk.como.cache===1 && firmas[0].como.hoja===1 && firmas[0].como.cache===1 && fh && fh.r==='pedidos' && fh.disp[0]==='ZZZZZZ',
      JSON.stringify([fk&&fk.disp, fk&&fk.como, fh&&fh.r, fh&&fh.disp]));
  chk('la marca del navegador va recortada (6 letras): distingue, no identifica', JSON.stringify(g).indexOf('ABCDEFG')<0 && JSON.stringify(g).indexOf('ABCDEF')>=0, '');
  chk('las últimas lecturas vienen con hora, largo de consulta y ruta',
      (g.ult||[]).length===4 && g.ult[3].q==='hoja=x'.length && g.ult[3].r==='pedidos' && typeof g.ult[0].t==='number' && g.ult[3].c==='cache', JSON.stringify((g.ult||[])[3]));
  /* La copia a las Propiedades sale con el PRIMER GET y después como mucho una vez por
     minuto: con cuatro GET en el mismo minuto hay UNA escritura, que dice «1 lectura». */
  chk('⚠️ el resumen se copia a las Propiedades del script UNA vez por minuto, no en cada GET (tienen cupo diario)',
      escrituras===1 && /1 lectura GET/.test(props.GET_RESUMEN||'') && /«ninguno» ×1/.test(props.GET_RESUMEN||'') && !String(props.GET_RESUMEN+props.GET_ULTIMOS).includes('secreto'),
      escrituras+' escrituras · '+String(props.GET_RESUMEN).slice(0,140));
  // 🚪 GET_CERRADO. Pasó el minuto (se vence la marca en la caché): el GET siguiente vuelve a copiar.
  a.ctx.CacheService.getScriptCache().remove('get_log_prop');
  props.GET_CERRADO = '1';
  const antes = lecturas;
  const gc = a.get({});
  chk('⚠️ con GET_CERRADO=1 el GET vuelve con «no», SIN pedidos y sin leer la hoja',
      gc.ok===false && gc.error==='get_cerrado' && !gc.pedidos && lecturas===antes, JSON.stringify(gc).slice(0,100));
  chk('…pasado el minuto, el resumen en las Propiedades se actualiza (5 lecturas, «ninguno» ×3) y GET_ULTIMOS lista las firmas legibles',
      escrituras===2 && /5 lecturas GET/.test(props.GET_RESUMEN||'') && /«ninguno» ×3/.test(props.GET_RESUMEN||'') && /cerrado 1/.test(props.GET_RESUMEN||'') &&
      /parámetros: _,k/.test(props.GET_ULTIMOS||'') && /dispositivo: ABCDEF/.test(props.GET_ULTIMOS||'') && /ruta: pedidos/.test(props.GET_ULTIMOS||'') && !String(props.GET_RESUMEN+props.GET_ULTIMOS).includes('secreto'),
      escrituras+' escrituras · '+String(props.GET_RESUMEN).slice(0,200));
  const rl = a.post(conClave({ action:'list' }));
  chk('…el panel (POST list) sigue leyendo como siempre', rl.ok===true && rl.pedidos.length===1, '');
  const r2 = a.post(conClave({ action:'getlog' }));
  chk('…y el informe dice que la puerta está cerrada y que igual insistieron',
      r2.get.cerrado===true && r2.get.n===5 && r2.get.firmas[0].como.cerrado===1, JSON.stringify(r2.get.firmas[0].como));
  props.GET_CERRADO = '0';
  chk('GET_CERRADO=0 (o borrarla) reabre', a.get({}).ok===true, '');
  // Con PANEL_KEY puesta, un GET con la clave mal también queda anotado (como «clave»), sin el valor.
  props.PANEL_KEY = CLAVE;
  const gm = a.get({ k: 'clave-equivocada' });
  const r3 = a.post(conClave({ action:'getlog' }));
  const fc = (r3.get.firmas||[]).find(f => f.p==='k');
  chk('un GET con la clave mal se anota como «clave mal», sin el valor', gm.ok===false && gm.error==='clave' && fc && fc.como.clave===1 && !JSON.stringify(r3).includes('equivocada'), JSON.stringify(fc&&fc.como));
}
{
  // Sin CacheService: el GET contesta igual y el informe lo dice, sin reventar.
  const a = cargar([HDR, fila({id:'p1'})], { PANEL_KEY: '' });
  delete a.ctx.CacheService;
  a.ctx.console = { log: () => {}, error: () => {}, warn: () => {} };
  const g = a.get({});
  const r = a.post(conClave({ action:'getlog' }));
  chk('sin caché disponible el GET contesta igual y el informe avisa que no pudo anotar', g.ok===true && r.ok===true && r.get.sinCache===true && r.get.n===0, JSON.stringify(r.get).slice(0,120));
}

/* ── ⚡ El webhook de Kommo contesta al instante y el trabajo lo hace un disparador (§4eg) ── */
console.log('\n── El aviso de Kommo: encolar y contestar; repaso cada 5 minutos ──');
if (typeof cargar([HDR], {}).ctx.kommoRepaso !== 'function') {
  chk('⚠️ el .gs tiene la cola del webhook y el repaso cada 5 minutos (§4eg)', false, 'faltan kommoRepaso / kommoProcesarCola: es el .gs viejo');
} else {
{
  const props = { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira' };
  const a = cargar([HDR], props);
  const red = [], ev = [];
  a.ctx.LockService = { getScriptLock: () => ({ waitLock(){ ev.push('candado'); }, releaseLock(){ ev.push('suelta'); } }) };
  a.ctx.UrlFetchApp = { fetch: (url) => { red.push(url); return { getResponseCode: () => 200,
    getContentText: () => JSON.stringify({ id:44001, name:'CLIENTE DE PRUEBA', status_id:103450711, pipeline_id:13349719, responsible_user_id:9, price:100 }) }; } };
  const hook = (params) => a.leer(a.ctx.doPost({ parameter: params }));
  const r = hook({ k:'kk', 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':'103450711', 'leads[status][0][pipeline_id]':'13349719' });
  chk('⚠️ el webhook contesta OK sin hablar con Kommo ni tomar el candado (Kommo lo apagaba por tardar)',
      r.ok===true && r.encolados===1 && red.length===0 && ev.length===0, JSON.stringify(r).slice(0,100)+' · red '+red.length+' · '+ev.join(','));
  chk('…y no escribió nada todavía', a.sh._datos.length===1, a.sh._datos.length);
  chk('…el id quedó en la cola', JSON.parse(props.KOMMO_COLA||'[]').join(',')==='44001', props.KOMMO_COLA);
  chk('…y dejó UN disparador para procesarla', a.ctx.ScriptApp._triggers.filter(t => t.fn==='kommoProcesarCola').length===1, a.ctx.ScriptApp._triggers.length);
  hook({ k:'kk', 'leads[status][0][id]':'44002', 'leads[status][0][status_id]':'103450711' });
  chk('un segundo aviso se suma a la cola y NO agrega otro disparador', JSON.parse(props.KOMMO_COLA).length===2 && a.ctx.ScriptApp._triggers.length===1, props.KOMMO_COLA+' · '+a.ctx.ScriptApp._triggers.length);
  const rc = a.ctx.kommoProcesarCola();
  chk('⚠️ el disparador procesa la cola: habla con Kommo y crea los borradores', rc.ok===true && rc.creados===2 && red.length>0 && a.sh._datos.length===3, JSON.stringify(rc).slice(0,100));
  chk('…con la fecha vacía y marcados como borrador', a.sh._datos[1][HDR.indexOf('Fecha')]==='' && a.sh._datos[1][HDR.indexOf('Estado stock')]==='Borrador Kommo');
  chk('…vacía la cola y se borra a sí mismo', JSON.parse(props.KOMMO_COLA).length===0 && a.ctx.ScriptApp._triggers.length===0, props.KOMMO_COLA+' · '+a.ctx.ScriptApp._triggers.length);
  const rc2 = a.ctx.kommoProcesarCola();
  chk('procesar la cola vacía no hace nada', rc2.creados===0 && a.sh._datos.length===3);
  hook({ k:'kk', 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':'103450711' });
  const rc3 = a.ctx.kommoProcesarCola();
  chk('⚠️ el mismo lead avisado de nuevo NO se duplica', rc3.creados===0 && a.sh._datos.length===3, JSON.stringify(rc3).slice(0,90));
  chk('sin clave sigue sin aceptar nada (ni encola)', hook({ k:'mala', 'leads[status][0][id]':'5' }).ok===false && JSON.parse(props.KOMMO_COLA).length===0);
}
{
  // Sin ScriptApp (no autorizado todavía): el webhook hace el trabajo en el momento, como antes.
  const props = { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira' };
  const a = cargar([HDR], props);
  delete a.ctx.ScriptApp;
  a.ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200,
    getContentText: () => JSON.stringify({ id:44009, name:'OTRO', status_id:103450711, pipeline_id:13349719, responsible_user_id:9, price:100 }) }) };
  const r = a.leer(a.ctx.doPost({ parameter: { k:'kk', 'leads[status][0][id]':'44009', 'leads[status][0][status_id]':'103450711' } }));
  chk('sin disparadores disponibles el webhook crea el borrador en el momento (como antes)', r.ok===true && r.creados===1 && a.sh._datos.length===2, JSON.stringify(r).slice(0,90));
  chk('…y no deja nada colgado en la cola', JSON.parse(props.KOMMO_COLA||'[]').length===0, props.KOMMO_COLA);
}
{
  // El repaso cada 5 minutos: le pregunta a Kommo por «Compradores» de las últimas horas.
  const props = { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira', KOMMO_COLA:'["777"]' };
  const a = cargar([HDR, fila({ id:'kommo-555', cli:'YA ESTABA' })], props);
  const urls = [];
  a.ctx.UrlFetchApp = { fetch: (url) => { urls.push(url);
    if (/\/leads\?/.test(url)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ _embedded:{ leads:[{ id:555 }, { id:556 }] } }) };
    const id = Number((url.match(/\/leads\/(\d+)/)||[])[1]);
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ id, name:'CLI '+id, status_id:103450711, pipeline_id:13349719, responsible_user_id:9, price:50 }) }; } };
  const r = a.ctx.kommoRepaso();
  const consulta = urls.find(u => /\/leads\?/.test(u)) || '';
  chk('⚠️ pregunta por la etapa «Compradores» del embudo de ventas, ordenado por actualización',
      /status_id\]=103450711/.test(consulta) && /pipeline_id\]=13349719/.test(consulta) && /order\[updated_at\]=desc/.test(consulta),
      consulta.slice(consulta.indexOf('/leads'), consulta.indexOf('/leads')+120));
  chk('…con una ventana de tiempo hacia atrás (from = ahora − 6 h)', (() => { const m = consulta.match(/updated_at\]\[from\]=(\d+)/); const v = m && Number(m[1]); return !!v && Math.abs((Math.floor(Date.now()/1000) - 6*3600) - v) < 30; })(), consulta.slice(-40));
  chk('⚠️ primero vacía la cola del webhook (777) y después lo que vio en Kommo (556); 555 ya estaba', r.creados===2 && r.cola===1 && r.vistos===2 && a.sh._datos.length===4, JSON.stringify(r));
  chk('…los nuevos son 777 y 556, y 555 no se duplicó', a.sh._datos.map(f => f[0]).sort().join(',')==='id,kommo-555,kommo-556,kommo-777', a.sh._datos.map(f => f[0]).join(','));
  chk('deja el resumen del último repaso, sin nombres', /"vistos":2/.test(props.KOMMO_REPASO_ULTIMO) && !/CLI /.test(props.KOMMO_REPASO_ULTIMO), props.KOMMO_REPASO_ULTIMO);
  const r2 = a.ctx.kommoRepaso();
  chk('repasar de nuevo no crea nada más', r2.creados===0 && a.sh._datos.length===4, JSON.stringify(r2));
  chk('el repaso de GitHub se entera del último repaso del script', !!a.post({ action:'kommoLeads', key:'kk', leads:[] }).ultimoRepaso);
}
{
  // Kommo contesta 204 cuando no hay nada: no es un error.
  const a = cargar([HDR], { PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira' });
  a.ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 204, getContentText: () => '' }) };
  const r = a.ctx.kommoRepaso();
  chk('sin ventas en la ventana (204) el repaso dice 0 y sin error', r.vistos===0 && r.error==='' && r.creados===0, JSON.stringify(r));
  a.ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 500, getContentText: () => '' }) };
  const r3 = a.ctx.kommoRepaso();
  chk('si Kommo falla, el repaso lo anota y no revienta', /kommo/.test(r3.error), r3.error);
  const msg = a.ctx.instalarDisparadores();
  chk('instalarDisparadores deja UN repaso cada 5 minutos', a.ctx.ScriptApp._triggers.filter(t => t.fn==='kommoRepaso' && t.tipo==='every' && t.v===5).length===1 && /5 minutos/.test(msg), msg);
  a.ctx.instalarDisparadores();
  chk('…y correrlo dos veces no deja dos', a.ctx.ScriptApp._triggers.filter(t => t.fn==='kommoRepaso').length===1, a.ctx.ScriptApp._triggers.length);
  chk('estadoKommo dice si el repaso está instalado', a.ctx.estadoKommo().repasoInstalado===true);
}

}
/* ── ⚠️ Guardados rechazados y colas sin enviar quedan anotados en el servidor (§4el) ── */
console.log('\n── Guardados rechazados y latidos de la cola ──');
if (typeof cargar([HDR], {}).ctx.rechazosInforme_ !== 'function') {
  chk('⚠️ el .gs anota los guardados rechazados (§4el)', false, 'falta rechazosInforme_: es el .gs viejo');
} else {
{
  const props = { PANEL_KEY: CLAVE };
  const a = cargar([HDR, fila({id:'p1', cli:'DON CERRADO'})], props);
  // día cerrado
  a.post(conClave({ action:'save', pedido:{ id:'__dias_cerrados__', fecha:'', observaciones:'CERRADOS '+MARTES, ts:AHORA } }));
  const r = a.post(conClave({ action:'save', pedido:{ id:'p2', fecha:MARTES, turno:'AM', cliente:'DOÑA NUEVA', vendedor:'Mirian Salazar', celular:'70000000', direccion:'x', ts:AHORA }, quien:'Mirian Salazar' }));
  chk('un pedido a un día cerrado sigue rechazado', r.ok===false && r.error==='dia_cerrado', JSON.stringify(r).slice(0,80));
  const filas = a.shR._datos;
  chk('⚠️ …y queda ANOTADO en la hoja Rechazos: motivo, id, cliente, vendedor y quién guardaba', filas.length===2 && filas[1][2]==='dia_cerrado' && filas[1][3]==='p2' && filas[1][4]==='DOÑA NUEVA' && filas[1][5]==='Mirian Salazar' && filas[1][6]==='Mirian Salazar', JSON.stringify(filas[1]||[]).slice(0,160));
  chk('…con la fecha y turno en el detalle, y sin teléfono ni dirección', /fecha /.test(String(filas[1][7])) && !/70000000/.test(JSON.stringify(filas[1])) , String(filas[1][7]));
  chk('…los encabezados quedaron en la fila 1', filas[0][0]==='Fecha' && filas[0][2]==='Motivo');
  // conflicto
  const l = a.post(conClave({ action:'list' }));
  const p1 = l.pedidos.filter(x => x.id==='p1')[0];
  a.post(conClave({ action:'save', pedido:Object.assign({}, p1, { chofer:'A' }) }));
  const c = a.post(conClave({ action:'save', pedido:Object.assign({}, p1, { chofer:'B' }), quien:'Carola Chavez' }));
  chk('un choque de versión también queda anotado, con el rev enviado y el de la hoja', c.error==='conflicto' && filas.length===3 && filas[2][2]==='conflicto' && /rev enviado/.test(String(filas[2][7])), String(filas[2][7]));
  // guardado bien: nada
  a.post(conClave({ action:'save', pedido:{ id:'p9', fecha:MIERCOLES, turno:'AM', cliente:'BIEN', ts:AHORA } }));
  chk('un guardado que entra NO se anota', filas.length===3, filas.length);
  // el informe
  const inf = a.post(conClave({ action:'rechazos' }));
  chk('action:rechazos devuelve los rechazos del más nuevo al más viejo', inf.ok===true && inf.rechazos.rechazos.length===2 && inf.rechazos.rechazos[0].error==='conflicto' && inf.rechazos.rechazos[1].error==='dia_cerrado' && inf.rechazos.total===2, JSON.stringify(inf.rechazos).slice(0,160));
  chk('…cada uno con quién guardaba y el cliente', inf.rechazos.rechazos[1].quien==='Mirian Salazar' && inf.rechazos.rechazos[1].cliente==='DOÑA NUEVA');
}
{
  // la clave: en un list NO se anota (refresca cada 2 min sin clave); al guardar SÍ
  const a = cargar([HDR], { PANEL_KEY: CLAVE });
  a.post({ action:'list' }); a.post({ action:'list' });
  chk('un list sin clave no llena la hoja de rechazos', a.shR._datos.length<=1, a.shR._datos.length);
  const r = a.post({ action:'save', pedido:{ id:'q1', cliente:'SIN CLAVE', vendedor:'Mirian Salazar', ts:AHORA }, quien:'Mirian Salazar' });
  chk('⚠️ un guardado sin clave sí queda anotado (es una venta que se quedó en la cola de alguien)', r.error==='clave' && a.shR._datos.length===2 && a.shR._datos[1][2]==='clave' && a.shR._datos[1][4]==='SIN CLAVE', JSON.stringify(a.shR._datos[1]||[]).slice(0,120));
}
{
  // los latidos: la cola de cada dispositivo
  const props = { PANEL_KEY: CLAVE };
  const a = cargar([HDR], props);
  a.post(conClave({ action:'list', quien:'Mirian Salazar', cola:2, colaIds:['__ret_x__','p7'] }));
  let L = JSON.parse(props.LATIDOS||'{}');
  chk('⚠️ un list con cola>0 deja el latido: quién, cuántos y qué ids', Object.keys(L).length===1 && L.ABCDEF && L.ABCDEF.cola===2 && L.ABCDEF.quien==='Mirian Salazar' && L.ABCDEF.ids.join(',')==='__ret_x__,p7' && L.ABCDEF.clave===true, props.LATIDOS);
  // dos dispositivos distintos de la misma persona: dos latidos (el id lo manda el panel)
  a.post(conClave({ action:'list', quien:'Mirian Salazar', cola:1, colaIds:['p9'], dispositivo:'CEL01' }));
  a.post(conClave({ action:'list', quien:'Mirian Salazar', cola:3, colaIds:['p1','p2','p3'], dispositivo:'PC02' }));
  L = JSON.parse(props.LATIDOS||'{}');
  chk('⚠️ el id de dispositivo que manda el panel separa el celular de la compu (Google da «?» al POST anónimo)', L.CEL01 && L.CEL01.cola===1 && L.PC02 && L.PC02.cola===3, Object.keys(L).join(','));
  a.post(conClave({ action:'list', quien:'Mirian Salazar', cola:0, dispositivo:'CEL01' }));
  a.post(conClave({ action:'list', quien:'Mirian Salazar', cola:0, dispositivo:'PC02' }));
  a.post(conClave({ action:'save', pedido:{ id:'z1', fecha:DOMINGO, turno:'AM', cliente:'DOMINGO', ts:AHORA }, dispositivo:'CEL01' }));
  chk('…y el rechazo también lleva ese id', a.shR._datos.length>=2 && a.shR._datos[a.shR._datos.length-1][8]==='CEL01', JSON.stringify(a.shR._datos[a.shR._datos.length-1]||[]).slice(0,120));
  const inf = a.post(conClave({ action:'rechazos' }));
  chk('…y el informe lo muestra', inf.rechazos.latidos.length===1 && inf.rechazos.latidos[0].cola===2 && inf.rechazos.latidos[0].quien==='Mirian Salazar', JSON.stringify(inf.rechazos.latidos));
  a.post(conClave({ action:'list', quien:'Mirian Salazar', cola:0 }));
  L = JSON.parse(props.LATIDOS||'{}');
  chk('cuando la cola llega a 0 el latido se borra', Object.keys(L).length===0, props.LATIDOS);
  a.post(conClave({ action:'list', quien:'Carola Chavez' }));
  chk('un list sin el dato de cola no escribe nada', !props.LATIDOS || props.LATIDOS==='{}', props.LATIDOS);
}
{
  // 🔍 el eco del guardado es la fila RELEÍDA (§4eo), no el objeto que llegó
  const a = cargar([HDR], { PANEL_KEY: CLAVE });
  const r = a.post(conClave({ action:'save', pedido:{ id:'e1', fecha:MARTES, turno:'AM', cliente:'ECO', vendedor:'Carola Chavez', chofer:'Pepe', fotos:['F1','F2'], productos:[{desc:'X',medida:'1x1',codigo:'A',cant:2}], ts:AHORA, nota:'55', saldo:100, pagado:false } }));
  const l = a.post(conClave({ action:'list' })).pedidos.filter(x => x.id==='e1')[0];
  chk('⚠️ lo que vuelve en `pedido` es lo que quedó en la hoja: mismos campos que el list', r.ok===true && r.mode==='add' && r.pedido.chofer==='Pepe' && r.pedido.fotos.join(',')==='F1,F2' && r.pedido.productos.length===1 && r.pedido.rev===l.rev && r.pedido.nota==='55' && r.pedido.nroDia===l.nroDia, JSON.stringify(r.pedido).slice(0,160));
  const r2 = a.post(conClave({ action:'save', pedido:Object.assign({}, l, { chofer:'Juan' }) }));
  chk('…también al ACTUALIZAR (mode update, chofer nuevo, rev nuevo)', r2.ok===true && r2.mode==='update' && r2.pedido.chofer==='Juan' && r2.pedido.rev>l.rev, JSON.stringify(r2.pedido).slice(0,120));
}
}

/* ── 🖼️ El barrido de fotos huérfanas (§4ep) ── */
console.log('\n── Fotos huérfanas: el barrido diario ──');
if (typeof cargar([HDR], {}).ctx.barrerFotosHuerfanas !== 'function') {
  chk('⚠️ el .gs tiene el barrido de fotos huérfanas (§4ep)', false, 'falta barrerFotosHuerfanas: es el .gs viejo');
} else {
{
  const DIA = 86400000, ahora = Date.now();
  // un pedido usa F_PAGO en su pago y F_ENT como foto de entrega; F_HUERF_VIEJA y F_HUERF_NUEVA no las nombra nadie
  const props = { PANEL_KEY: CLAVE };
  const a = cargar([HDR, fila({ id:'p1', obs:'' })], props);
  a.sh._datos[1][15] = '~QR BISA 100 @2026-09-10 #1 %F_PAGO';
  a.sh._datos[1][28] = 'F_ENT';
  // Drive de mentira: carpetas con archivos que se pueden mover y tirar
  const hacerArchivo = (id, nombre, creado) => ({ _id:id, _nombre:nombre, _creado:creado, _papelera:false, _carpeta:null,
    getId(){ return this._id; }, getName(){ return this._nombre; }, getDateCreated(){ return new Date(this._creado); },
    setTrashed(v){ this._papelera=!!v; }, moveTo(f){ this._carpeta._archivos = this._carpeta._archivos.filter(x => x!==this); this._carpeta=f; f._archivos.push(this); } });
  const hacerCarpeta = (id, nombre) => { const c = { _id:id, _nombre:nombre, _archivos:[], getId(){ return this._id; }, getName(){ return this._nombre; },
    getFiles(){ const arr=this._archivos.slice(); let i=0; return { hasNext:()=>i<arr.length, next:()=>arr[i++] }; },
    createFile(){ return hacerArchivo('nuevo', 'x', ahora); }, setSharing(){}, addFile(f){ this._archivos.push(f); f._carpeta=this; }, removeFile(f){ this._archivos=this._archivos.filter(x=>x!==f); } }; return c; };
  const fotos = hacerCarpeta('CF', 'Fotos entregas MultiEspumas'), huerf = hacerCarpeta('CH', 'Fotos huérfanas MultiEspumas');
  [['F_PAGO', 'entrega_DON_A__p1__por_Carola_20260910_100000.jpg', ahora-5*DIA], ['F_ENT', 'entrega_DON_A_20260911_100000.jpg', ahora-3*DIA],
   ['F_HUERF_VIEJA', 'entrega_DON_B__por_Mirian_Salazar_20260915_150000.jpg', ahora-2*DIA], ['F_HUERF_NUEVA', 'entrega_DON_C_20260918_100000.jpg', ahora-3600000]]
    .forEach(([id, n, t]) => fotos.addFile(hacerArchivo(id, n, t)));
  huerf.addFile(hacerArchivo('F_MUY_VIEJA', 'entrega_x.jpg', ahora-40*DIA));
  huerf.addFile(hacerArchivo('F_RECIENTE_HU', 'entrega_y.jpg', ahora-10*DIA));
  a.ctx.DriveApp = { getFoldersByName: (n) => { const c = n==='Fotos huérfanas MultiEspumas' ? huerf : fotos; let done=false; return { hasNext:()=>!done, next:()=>{ done=true; return c; } }; },
                     getFolderById: (id) => { if(id==='CF') return fotos; throw new Error('no existe'); }, createFolder: (n) => hacerCarpeta('CX', n), Access:{ANYONE_WITH_LINK:1}, Permission:{VIEW:1} };
  props.FOTOS_FOLDER_ID = 'CF';
  const r = a.ctx.barrerFotosHuerfanas();
  const enFotos = fotos._archivos.map(f => f._id).sort().join(','), enHuerf = huerf._archivos.map(f => f._id).sort().join(',');
  chk('⚠️ solo la huérfana con más de un día se mueve a «Fotos huérfanas»; las usadas y la recién subida se quedan', enFotos==='F_ENT,F_HUERF_NUEVA,F_PAGO' && /F_HUERF_VIEJA/.test(enHuerf), enFotos+' | '+enHuerf);
  chk('…la de más de 30 días en huérfanas va a la papelera y la de 10 días no', huerf._archivos.filter(f => f._id==='F_MUY_VIEJA')[0].getName && huerf._archivos.find(f => f._id==='F_MUY_VIEJA')._papelera===true && huerf._archivos.find(f => f._id==='F_RECIENTE_HU')._papelera===false, JSON.stringify(huerf._archivos.map(f => [f._id, f._papelera])));
  chk('el resumen dice cuántas revisó, cuántas movió y cuántas tiró', r.revisadas===4 && r.movidas===1 && r.papelera===1 && r.error==='' && r.lista.length===1 && /Mirian_Salazar/.test(r.lista[0].nombre), JSON.stringify(r).slice(0,160));
  chk('…y queda guardado para la pestaña de Administración', /"movidas":1/.test(props.HUERFANAS_ULTIMO||''), (props.HUERFANAS_ULTIMO||'').slice(0,80));
  const inf = a.post(conClave({ action:'rechazos' }));
  chk('action:rechazos lo incluye', inf.ok===true && inf.rechazos.huerfanas && inf.rechazos.huerfanas.movidas===1, JSON.stringify(inf.rechazos.huerfanas).slice(0,100));
  const r2 = a.ctx.barrerFotosHuerfanas();
  chk('correrlo de nuevo no mueve nada más', r2.movidas===0 && fotos._archivos.length===3, JSON.stringify(r2).slice(0,100));
  a.ctx.instalarDisparadores();
  chk('instalarDisparadores deja el barrido diario además del repaso de Kommo', a.ctx.ScriptApp._triggers.some(t => t.fn==='barrerFotosHuerfanas' && t.tipo==='daily') && a.ctx.ScriptApp._triggers.some(t => t.fn==='kommoRepaso'), JSON.stringify(a.ctx.ScriptApp._triggers.map(t => t.fn)));
  // el nombre lleva dueño y pedido
  a.ctx.Utilities.base64Decode = () => [1,2,3];
  let nombre = '';
  a.ctx.DriveApp.getFolderById = () => ({ getId: () => 'CF', createFile: (blob) => ({ getId: () => 'FNEW', setSharing(){} , getName(){ return nombre; } }), setSharing(){} });
  a.ctx.Utilities.newBlob = (b, mime, n) => { nombre = n; return {}; };
  const f = a.post(conClave({ action:'foto', id:'pmx123', cliente:'Doña Rosa', quien:'Mirian Salazar', dataUrl:'data:image/jpeg;base64,AAAA' }));
  chk('el archivo se nombra con cliente, pedido y quién lo subió', f.ok===true && /^entrega_Do_a_Rosa__pmx123__por_Mirian_Salazar_.+\.jpg$/.test(nombre)   /* la fecha la pone Utilities.formatDate (simulado acá) */, nombre);
  const f2 = a.post(conClave({ action:'foto', id:'form', cliente:'Nuevo', quien:'Carola Chavez', dataUrl:'data:image/jpeg;base64,AAAA' }));
  chk('…y desde el formulario (sin pedido todavía) va sin id pero con quién', f2.ok===true && /^entrega_Nuevo__por_Carola_Chavez_/.test(nombre), nombre);
}
}

/* ── 📥 10. Kommo en el servidor (§4et): descartar se respeta, el candado no espera a Kommo,
      el repaso de GitHub encola, busy no vacía la cola, el busy del hook no va a Rechazos,
      y los productos de otro catálogo llegan con nombre ── */
console.log('\n── 10. Kommo en el servidor (§4et) ──');
if (typeof cargar([HDR], {}).ctx.kommoRepaso !== 'function') {
  chk('⚠️ el .gs tiene el repaso de Kommo (§4eg) — la sección 10 lo necesita', false, 'es el .gs viejo');
} else {
const LEAD10 = (id, extra) => Object.assign({ id, name:'CLIENTE '+id, status_id:103450711, pipeline_id:13349719,
  responsible_user_id:9, price:100, _embedded:{ contacts:[], catalog_elements:[] } }, extra || {});
/* Kommo de mentira: `fn(url)` devuelve el JSON, o null = 404. Devuelve la lista de URLs pedidas. */
const kommoFake10 = (a, fn) => { const red = []; a.ctx.UrlFetchApp = { fetch: (url) => { red.push(url); const r = fn(url);
  return { getResponseCode: () => r ? 200 : 404, getContentText: () => JSON.stringify(r || {}) }; } }; return red; };
const hook10 = (a) => (params) => a.leer(a.ctx.doPost({ parameter: params, postData:{ contents:'' } }));
const candadoQue = (ev, ocupado) => ({ getScriptLock: () => ({ waitLock(){ ev.push('candado'); if (ocupado) throw new Error('busy'); }, releaseLock(){ ev.push('suelta'); } }) });
const KPROPS = () => ({ PANEL_KEY: CLAVE, KOMMO_HOOK_KEY:'kk', KOMMO_TOKEN:'tok-de-mentira' });
const DIA = 86400000, hoyDia = Math.floor(Date.now() / DIA);
{
  // A. «Descartar» tiene que descartar: el repaso no lo vuelve a traer
  const props = KPROPS();
  const a = cargar([HDR], props);
  delete a.ctx.ScriptApp;                       // sin disparadores el hook crea en el momento (más corto de leer)
  const red = kommoFake10(a, (url) => {
    if (/\/leads\?/.test(url)) return { _embedded:{ leads:[{ id:44001 }] } };   // sigue en «Compradores», tocado hace poco
    if (/\/leads\/44001/.test(url)) return LEAD10(44001);
    return null; });
  const r1 = hook10(a)({ k:'kk', 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':'103450711' });
  chk('el webhook crea el borrador kommo-44001', r1.creados===1 && a.sh._datos.length===2 && a.sh._datos[1][0]==='kommo-44001', JSON.stringify(r1).slice(0,80));
  const d = a.post(conClave({ action:'delete', id:'kommo-44001' }));
  const memo = JSON.parse(props.KOMMO_DESCARTADOS || '{}');
  chk('⚠️ la vendedora lo descarta: la fila se va y el lead queda anotado en KOMMO_DESCARTADOS (con el día)', d.ok===true && a.sh._datos.length===1 && memo['44001']===hoyDia, props.KOMMO_DESCARTADOS);
  const n0 = red.length;
  const rep = a.ctx.kommoRepaso();
  chk('⚠️ el repaso de 5 minutos NO lo vuelve a crear (antes reaparecía en cada repaso)', rep.creados===0 && a.sh._datos.length===1, JSON.stringify(rep));
  const rg = a.post({ action:'kommoLeads', key:'kk', leads:['44001'] });
  chk('…ni el repaso de GitHub: lo saltea como «descartado»', rg.creados===0 && a.sh._datos.length===1 && /44001:descartado/.test(JSON.stringify(rg.saltados||[])), JSON.stringify(rg.saltados));
  chk('…y por ese lead ya no le pregunta nada a Kommo', red.slice(n0).filter(u => /\/leads\/44001/.test(u)).length===0, red.slice(n0).join(' '));
  props.KOMMO_DESCARTADOS = JSON.stringify({ '44001': hoyDia - 61 });
  const rep2 = a.ctx.kommoRepaso();
  chk('un descarte de hace más de 60 días ya no cuenta: si la venta vuelve, entra', rep2.creados===1 && a.sh._datos.length===2, JSON.stringify(rep2));
  const pb = { PANEL_KEY: CLAVE };
  const b = cargar([HDR, fila({ id:'p1' })], pb);
  b.post(conClave({ action:'delete', id:'p1' }));
  chk('borrar un pedido que no vino de Kommo no anota nada', b.sh._datos.length===1 && pb.KOMMO_DESCARTADOS==null, pb.KOMMO_DESCARTADOS);
  // tope: 300 leads; se olvidan los más viejos y la propiedad entra en los 9 KB de Google
  const pc = KPROPS(), c = cargar([HDR], pc), o = {};
  for (let i = 0; i < 300; i++) o['5' + String(i).padStart(4, '0')] = hoyDia - (i % 50);
  pc.KOMMO_DESCARTADOS = JSON.stringify(o);
  if (typeof c.ctx.kDescartar_ === 'function') c.ctx.kDescartar_('60001');
  const o2 = JSON.parse(pc.KOMMO_DESCARTADOS), idos = Object.keys(o).filter(k => o2[k]==null);
  chk('la memoria tiene tope (300) y suelta primero el más viejo', o2['60001']===hoyDia && Object.keys(o2).length===300 && idos.length===1 && o[idos[0]]===hoyDia-49, idos.join(',')+' · '+Object.keys(o2).length);
  chk('…y entra en el límite de 9 KB de una propiedad', pc.KOMMO_DESCARTADOS.length < 9000, pc.KOMMO_DESCARTADOS.length);
}
{
  // B. El repaso «ya estaba» no toma el candado para hablar con Kommo
  const BORR = fila({ id:'kommo-39357288', cli:'Lead #39357288', fecha:'', turno:'' }); BORR[HDR.indexOf('Estado stock')] = 'Borrador Kommo';
  const leadGen = LEAD10(39357288, { name:'Lead #39357288', _embedded:{ contacts:[{ id:5502, is_main:true }], catalog_elements:[] } });
  const conContacto = (nombre) => (url) => /\/contacts\//.test(url) ? { id:5502, name:nombre } : leadGen;
  const a = cargar([HDR, BORR], KPROPS()); delete a.ctx.ScriptApp;
  const orden = []; a.ctx.LockService = candadoQue(orden, false);
  a.ctx.UrlFetchApp = { fetch: (url) => { orden.push('kommo'); return { getResponseCode: () => 200, getContentText: () => JSON.stringify(conContacto('')(url)) }; } };
  const r = a.post({ action:'kommoLeads', key:'kk', leads:['39357288'] });
  chk('⚠️ un lead que YA ESTABA sin nombre (y el contacto tampoco): le pregunta a Kommo SIN tomar el candado (antes: candado → kommo → suelta, en cada repaso)',
      r.ok===true && r.creados===0 && orden.indexOf('kommo')>=0 && orden.indexOf('candado')<0, orden.join(' → '));
  const b = cargar([HDR, BORR], KPROPS()); delete b.ctx.ScriptApp;
  const orden2 = []; b.ctx.LockService = candadoQue(orden2, false);
  b.ctx.UrlFetchApp = { fetch: (url) => { orden2.push('kommo'); return { getResponseCode: () => 200, getContentText: () => JSON.stringify(conContacto('ERWIN DE PRUEBA')(url)) }; } };
  const r2 = b.post({ action:'kommoLeads', key:'kk', leads:['39357288'] });
  const iC = orden2.indexOf('candado');
  chk('⚠️ …y cuando SÍ hay nombre para reparar: Kommo ANTES del candado y nada de red adentro', r2.reparados===1 && iC>0 && orden2.slice(0, iC).indexOf('kommo')>=0 && orden2.slice(iC).indexOf('kommo')<0, orden2.join(' → '));
  chk('…con el nombre escrito en la hoja', b.sh._datos[1][HDR.indexOf('Cliente')]==='ERWIN DE PRUEBA', b.sh._datos[1][HDR.indexOf('Cliente')]);
  const OK = BORR.slice(); OK[HDR.indexOf('Cliente')] = 'DOÑA CON NOMBRE';
  const c = cargar([HDR, OK], KPROPS()); delete c.ctx.ScriptApp;
  const ev = []; c.ctx.LockService = candadoQue(ev, false);
  const red = kommoFake10(c, () => ({}));
  const r3 = c.post({ action:'kommoLeads', key:'kk', leads:['39357288'] });
  chk('⚠️ el caso de cada 5 minutos —todo «ya estaba» y con nombre— no toma el candado ni sale a la red', r3.ok===true && r3.creados===0 && ev.length===0 && red.length===0, (ev.join(',')||'sin candado')+' · red '+red.length);
  // adentro se vuelve a mirar: si mientras se hablaba con Kommo alguien completó el borrador, no se le pisa el nombre
  const d = cargar([HDR, BORR], KPROPS()); delete d.ctx.ScriptApp;
  d.ctx.UrlFetchApp = { fetch: (url) => {
    d.sh._datos[1][HDR.indexOf('Estado stock')] = ''; d.sh._datos[1][HDR.indexOf('Cliente')] = 'LA COMPLETÓ LA VENDEDORA';
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(conContacto('NOMBRE DE KOMMO')(url)) }; } };
  const r4 = d.post({ action:'kommoLeads', key:'kk', leads:['39357288'] });
  chk('si mientras tanto la vendedora completó el borrador, adentro del candado no se le pisa el nombre', r4.reparados===0 && d.sh._datos[1][HDR.indexOf('Cliente')]==='LA COMPLETÓ LA VENDEDORA', d.sh._datos[1][HDR.indexOf('Cliente')]);
}
{
  // C. Servidor ocupado: la cola del webhook se queda
  const props = Object.assign(KPROPS(), { KOMMO_COLA:'["44001"]' });
  const a = cargar([HDR], props);
  a.ctx.LockService = candadoQue([], true);
  kommoFake10(a, (url) => /\/leads\/44001/.test(url) ? LEAD10(44001) : (/\/leads\?/.test(url) ? { _embedded:{ leads:[] } } : null));
  const r = a.ctx.kommoProcesarCola();
  chk('con el candado ocupado el disparador contesta busy y no escribe', r.ok===false && r.error==='busy' && a.sh._datos.length===1, JSON.stringify(r));
  chk('⚠️ …y el id SE QUEDA en la cola (antes salía igual, y la venta quedaba sin nada que la trajera)', JSON.parse(props.KOMMO_COLA).join(',')==='44001', props.KOMMO_COLA);
  chk('…con otro disparador esperando para reintentar', a.ctx.ScriptApp._triggers.filter(t => t.fn==='kommoProcesarCola').length===1, a.ctx.ScriptApp._triggers.length);
  const rr = a.ctx.kommoRepaso();
  chk('⚠️ kommoRepaso con busy: la cola sigue y el resumen DICE «busy» (antes: cola vacía y 0 creados sin explicación)', JSON.parse(props.KOMMO_COLA).join(',')==='44001' && rr.creados===0 && /busy/.test(rr.error), JSON.stringify(rr));
  a.ctx.LockService = candadoQue([], false);
  const r2 = a.ctx.kommoProcesarCola();
  chk('cuando el candado se libera, la cola se procesa y se vacía', r2.creados===1 && a.sh._datos.length===2 && JSON.parse(props.KOMMO_COLA).length===0, JSON.stringify(r2).slice(0,80));
}
{
  // D. El busy del hook no va a la hoja Rechazos
  const a = cargar([HDR], KPROPS()); delete a.ctx.ScriptApp;
  a.ctx.LockService = candadoQue([], true);
  kommoFake10(a, (url) => /\/leads\/44001/.test(url) ? LEAD10(44001) : null);
  const r = hook10(a)({ k:'kk', 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':'103450711' });
  chk('sin disparadores y con el candado ocupado, el hook contesta busy', r.ok===false && r.error==='busy', JSON.stringify(r));
  chk('⚠️ …y NO queda en la hoja Rechazos como un «save» sin id ni cliente (confundía a Administración)', a.shR._datos.length<=1, JSON.stringify(a.shR._datos[1]||[]));
  const s = a.post(conClave({ action:'save', pedido:{ id:'z1', fecha:MARTES, turno:'AM', cliente:'DE VERDAD', ts:AHORA } }));
  chk('…mientras que un guardado del panel con el candado ocupado sí se sigue anotando', s.error==='busy' && a.shR._datos.length===2 && a.shR._datos[1][1]==='save' && a.shR._datos[1][4]==='DE VERDAD', JSON.stringify(a.shR._datos[1]||[]).slice(0,100));
}
{
  // E. Productos de otro catálogo
  const a = cargar([HDR], KPROPS()); delete a.ctx.ScriptApp;
  const red = kommoFake10(a, (url) => {
    if (/\/leads\/44001/.test(url)) return LEAD10(44001, { _embedded:{ contacts:[], catalog_elements:[
      { id:777, metadata:{ quantity:2, catalog_id:12345 } }, { id:888, metadata:{ quantity:1, catalog_id:10902 } }, { id:999, metadata:{ quantity:3 } }] } });
    if (/\/catalogs\/12345\/elements/.test(url)) return { _embedded:{ elements:[{ id:777, name:'SOMMIER DE OTRO CATALOGO' }] } };
    if (/\/catalogs\/10902\/elements/.test(url)) return { _embedded:{ elements:[{ id:888, name:'COLCHON DEL CATALOGO' }, { id:999, name:'ALMOHADA SIN CATALOG_ID' }] } };
    return null; });
  const r = hook10(a)({ k:'kk', 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':'103450711' });
  const prods = JSON.parse(a.sh._datos[1] ? a.sh._datos[1][HDR.indexOf('_productos_json')] : '[]');
  chk('⚠️ un producto de OTRO catálogo (metadata.catalog_id) llega con su nombre (antes: desc vacía)', r.creados===1 && prods.length===3 && prods[0].desc==='SOMMIER DE OTRO CATALOGO' && prods[0].cant===2, JSON.stringify(prods));
  chk('…los del catálogo de siempre y los que no dicen catálogo siguen saliendo del 10902', prods.length===3 && prods[1].desc==='COLCHON DEL CATALOGO' && prods[2].desc==='ALMOHADA SIN CATALOG_ID' && prods[2].cant===3, JSON.stringify(prods));
  const cats = red.filter(u => /\/catalogs\//.test(u));
  chk('…una consulta por catálogo, cada una con sus ids', cats.length===2 && /12345\/elements.*777/.test(cats.find(u => /12345/.test(u))||'') && !/777/.test(cats.find(u => /10902/.test(u))||'x777'), cats.join(' '));
}
{
  // F. El repaso de GitHub encola y contesta al instante
  const props = KPROPS();
  const a = cargar([HDR], props);
  const ev = []; a.ctx.LockService = candadoQue(ev, false);
  const red = kommoFake10(a, (url) => { const id = Number((url.match(/\/leads\/(\d+)/)||[])[1]); return id ? LEAD10(id) : null; });
  const r = a.post({ action:'kommoLeads', key:'kk', leads:['44001', '44002'] });
  chk('⚠️ el repaso de GitHub contesta al instante: encola sin hablar con Kommo ni tomar el candado (con 9 leads cortaba a los 90 s)',
      r.ok===true && r.origen==='repaso' && r.diferido===true && r.encolados===2 && red.length===0 && ev.length===0, JSON.stringify(r).slice(0,140));
  chk('…dice la versión, el último aviso y el último repaso (lo que imprime el workflow)', r.version===a.ctx.SCRIPT_VERSION && ('ultimoHook' in r) && ('ultimoRepaso' in r), Object.keys(r).join(','));
  chk('…los ids quedaron en la cola con un disparador esperando', JSON.parse(props.KOMMO_COLA).join(',')==='44001,44002' && a.ctx.ScriptApp._triggers.filter(t => t.fn==='kommoProcesarCola').length===1, props.KOMMO_COLA);
  const rc = a.ctx.kommoProcesarCola();
  chk('…y el disparador crea los dos borradores', rc.creados===2 && a.sh._datos.length===3 && JSON.parse(props.KOMMO_COLA).length===0, JSON.stringify(rc).slice(0,100));
  const r0 = a.post({ action:'kommoLeads', key:'kk', leads:[] });
  chk('con la lista vacía contesta sin encolar nada (así el workflow mira la versión igual)', r0.ok===true && r0.origen==='repaso' && r0.encolados===0 && a.ctx.ScriptApp._triggers.length===0, JSON.stringify(r0).slice(0,100));
  const b = cargar([HDR], KPROPS()); delete b.ctx.ScriptApp;
  kommoFake10(b, (url) => /\/leads\/44003/.test(url) ? LEAD10(44003) : null);
  const rb = b.post({ action:'kommoLeads', key:'kk', leads:['44003'] });
  chk('sin disparadores el repaso de GitHub crea en el momento, como antes', rb.ok===true && rb.origen==='repaso' && !rb.diferido && rb.creados===1 && b.sh._datos.length===2, JSON.stringify(rb).slice(0,100));
}
}

/* ── ✅ 11. Probar antes de implementar (§4fz-b) ──────────────────────────────────────
   El 23/09 el .gs que se pegó y se implementó dejó a TODO el equipo sin conexión. Volver a
   la versión anterior arregló el panel, pero el repaso de Kommo siguió parado desde las
   11:24: los disparadores corren el código GUARDADO, no el implementado. Esta función se
   corre desde el editor ANTES de implementar y no escribe nada. */
console.log('\n── 11. probarAntesDeImplementar: la prueba del editor antes de implementar ──');
{
  const tiene = (r, re) => !!(r && r.lineas && r.lineas.some(l => re.test(l)));
  const hay = (a) => typeof a.ctx.probarAntesDeImplementar === 'function';
  const src = fs.readFileSync(GS, 'utf8');
  chk('existe probarAntesDeImplementar() y va ARRIBA de todo (un pegado cortado la conserva)',
      src.indexOf('function probarAntesDeImplementar') > 0 && src.indexOf('function probarAntesDeImplementar') < src.indexOf('function jsonOut'));
  {
    // A. El archivo entero, con disparadores y un repaso reciente
    const props = { KOMMO_REPASO_ULTIMO: JSON.stringify({ ts:new Date(Date.now()-2*60000).toISOString(), cola:0, vistos:0, creados:0, error:'' }) };
    const a = cargar([HDR, fila({id:'p1'}), fila({id:'p2'})], props);
    if (!hay(a)) chk('A · la prueba existe', false, 'no está en este .gs');
    else {
      a.ctx.instalarDisparadores();
      const hoja0 = JSON.stringify(a.sh._datos), props0 = JSON.stringify(props), tr0 = a.ctx.ScriptApp._triggers.map(t => t.fn).join(',');
      const r = a.ctx.probarAntesDeImplementar();
      chk('A · archivo entero, disparadores y repaso al día: «✅ Se puede implementar», sin avisos',
          r.ok===true && r.malas===0 && r.avisos===0 && /^✅ Se puede implementar\.$/.test(r.veredicto), r.lineas.join(' | '));
      chk('A · …dice la versión y lee la planilla como el panel (2 filas)', tiene(r, new RegExp(a.ctx.SCRIPT_VERSION)) && tiene(r, /2 filas/), r.lineas.join(' | '));
      chk('A · …y NO escribe nada: ni la planilla, ni las propiedades, ni los disparadores',
          JSON.stringify(a.sh._datos)===hoja0 && JSON.stringify(props)===props0 && a.ctx.ScriptApp._triggers.map(t => t.fn).join(',')===tr0);
    }
  }
  {
    // B. Sin disparadores, el repaso parado desde las 11:24 de Bolivia (lo del 23/09) y una venta en la cola
    const props = { KOMMO_REPASO_ULTIMO: JSON.stringify({ ts:'2026-09-23T15:24:05.435Z', cola:0, vistos:0, creados:0, error:'' }), KOMMO_COLA:'["44001"]' };
    const a = cargar([HDR, fila({id:'p1'})], props);
    if (!hay(a)) chk('B · la prueba existe', false);
    else {
      const r = a.ctx.probarAntesDeImplementar();
      chk('B · sin disparadores: avisa qué ejecutar (instalarDisparadores) pero no frena la implementación',
          r.ok===true && r.avisos>=3 && tiene(r, /instalarDisparadores/) && /Se puede implementar \(mirá los ⚠️/.test(r.veredicto), r.lineas.join(' | '));
      chk('B · …el repaso parado se nombra con la hora de Bolivia (23/09 11:24), como el del incidente', tiene(r, /desde el 23\/09 11:24 \(hora Bolivia\)/), r.lineas.join(' | '));
      chk('B · …y la venta que espera en la cola', tiene(r, /1 venta\(s\) de Kommo esperando/), r.lineas.join(' | '));
    }
  }
  {
    // C. El pegado CORTADO justo antes de kommoRepaso, con su disparador instalado (lo que frenaba el repaso)
    const corte = src.indexOf('\nfunction kommoRepaso(');
    const a = cargar([HDR, fila({id:'p1'})], {}, corte > 0 ? src.slice(0, corte + 1) : '');
    if (!hay(a)) chk('C · la prueba existe (aunque el código esté cortado)', false);
    else {
      a.ctx.ScriptApp.newTrigger('kommoRepaso').timeBased().everyMinutes(5).create();
      const r = a.ctx.probarAntesDeImplementar();
      chk('⚠️ C · código cortado: «❌ NO IMPLEMENTAR»', r.ok===false && /^❌ NO IMPLEMENTAR/.test(r.veredicto), r.veredicto);
      chk('C · …nombra lo que falta (kommoRepaso y la última del archivo, borradorDeLead_)', tiene(r, /Faltan funciones: .*kommoRepaso.*borradorDeLead_/), r.lineas.join(' | '));
      chk('C · …y que el disparador de kommoRepaso apunta a una función que no está', tiene(r, /disparador de «kommoRepaso» pero esa función no está/), r.lineas.join(' | '));
      chk('C · …la planilla igual se lee (el panel andaría; lo que se frena son los disparadores)', tiene(r, /se lee como la lee el panel: 1 fila\./), r.lineas.join(' | '));
    }
  }
  {
    // D. Pegado en el Apps Script de OTRA planilla, y un disparador ajeno que se nombra y no se toca
    const a = cargar([['Nombre','Teléfono'], ['x','y']], {});
    if (!hay(a)) chk('D · la prueba existe', false);
    else {
      a.ctx.ScriptApp.newTrigger('backupDiario').timeBased().everyDays(1).create();
      const r = a.ctx.probarAntesDeImplementar();
      chk('D · en otra planilla (sin la columna «id»): ❌', r.ok===false && tiene(r, /no empieza con la columna «id»/), r.lineas.join(' | '));
      chk('D · un disparador de otra función que SÍ existe no se marca como roto', !tiene(r, /disparador de «backupDiario»/) && a.ctx.ScriptApp._triggers.length===1, r.lineas.join(' | '));
    }
  }
  /* Revisión del 24/09 (agente antes de publicar): tres huecos por los que la prueba decía ✅. */
  {
    // E. Código VIEJO además del nuevo: pegado arriba sin borrar (o un 2° archivo .gs que carga después)
    const m = src.match(/var ESTA_VERSION = '([^']+)'/);
    chk('E · el literal de la prueba es igual a SCRIPT_VERSION (si se sube una sin la otra, esto avisa)',
        !!m && m[1] === (src.match(/var SCRIPT_VERSION = '([^']+)'/)||[])[1], m ? m[1] : 'no está el literal');
    const a = cargar([HDR, fila({id:'p1'})], { KOMMO_REPASO_ULTIMO: JSON.stringify({ ts:new Date(Date.now()-60000).toISOString(), error:'' }) },
                     src + "\nvar SCRIPT_VERSION = '2026-09-20-a';\n");
    if (!hay(a)) chk('E · la prueba existe', false);
    else {
      a.ctx.instalarDisparadores();
      const r = a.ctx.probarAntesDeImplementar();
      chk('⚠️ E · con la SCRIPT_VERSION de un código viejo cargada después: ❌ (antes: ✅ con el servidor viejo andando)',
          r.ok===false && tiene(r, /quedó código VIEJO además del nuevo/) && /^❌ NO IMPLEMENTAR/.test(r.veredicto), r.lineas.join(' | '));
    }
  }
  {
    // F. Un disparador de una función que ya no existe en ningún código: avisa y no frena
    const a = cargar([HDR, fila({id:'p1'})], { KOMMO_REPASO_ULTIMO: JSON.stringify({ ts:new Date(Date.now()-60000).toISOString(), error:'' }) });
    if (!hay(a)) chk('F · la prueba existe', false);
    else {
      a.ctx.instalarDisparadores();
      a.ctx.ScriptApp.newTrigger('funcionQueYaNoExiste').timeBased().everyDays(1).create();
      const r = a.ctx.probarAntesDeImplementar();
      chk('F · un disparador ajeno a una función inexistente: ⚠️ «borralo en Activadores», pero se puede implementar',
          r.ok===true && tiene(r, /disparador de «funcionQueYaNoExiste», una función que ya no existe.*Borralo en Activadores/), r.lineas.join(' | '));
    }
  }
  {
    // G. Un repaso que CORRE pero falla adentro: Ejecuciones dice «Completada» y la hora está al día
    const prueba = (error) => {
      const a = cargar([HDR, fila({id:'p1'})], { KOMMO_REPASO_ULTIMO: JSON.stringify({ ts:new Date(Date.now()-60000).toISOString(), cola:0, vistos:0, creados:0, error }) });
      if (!hay(a)) return null;
      a.ctx.instalarDisparadores();
      return a.ctx.probarAntesDeImplementar();
    };
    const r1 = prueba('kEmb_ is not defined');
    chk('⚠️ G · el repaso al día pero con un error del CÓDIGO («kEmb_ is not defined»): ❌ (antes: ✅ «corrió hace 1 minuto»)',
        !!r1 && r1.ok===false && tiene(r1, /falló con un error del CÓDIGO: «kEmb_ is not defined»/), r1 ? r1.lineas.join(' | ') : 'sin prueba');
    const r2 = prueba('kommo no contestó');
    chk('G · un error de AFUERA («kommo no contestó»): ⚠️ que nombra el token del script, y se puede implementar',
        !!r2 && r2.ok===true && tiene(r2, /avisó: «kommo no contestó».*KOMMO_TOKEN/), r2 ? r2.lineas.join(' | ') : 'sin prueba');
  }
  {
    // H. 📏 Cuánto ocupan el stock y el arqueo en su celda (el tope de Google es 50.000 letras)
    const HDR30 = HDR.concat(['Revisión']), iObs = HDR.indexOf('Observaciones');
    const sistema = (id, largo) => { const f = HDR30.map(() => ''); f[0] = id; f[iObs] = 'x'.repeat(largo); return f; };
    const prueba = (largoStock) => {
      const a = cargar([HDR30, fila({id:'p1'}), sistema('__stock__', largoStock), sistema('__arqueo_cuadre__', 1200)],
                       { KOMMO_REPASO_ULTIMO: JSON.stringify({ ts:new Date(Date.now()-60000).toISOString(), error:'' }) });
      if (!hay(a)) return null;
      a.ctx.instalarDisparadores();
      return a.ctx.probarAntesDeImplementar();
    };
    const r1 = prueba(20000), r2 = prueba(36000), r3 = prueba(43000);
    chk('H · con lugar: ✅ «El stock ocupa 20000 de las 50000 letras de su celda (40%)», y el arqueo también se mide',
        !!r1 && r1.ok===true && r1.avisos===0 && tiene(r1, /El stock ocupa 20000 de las 50000 letras de su celda \(40%\)/) && tiene(r1, /El arqueo ocupa 1200/), r1 ? r1.lineas.join(' | ') : 'sin prueba');
    chk('H · con poco lugar (36.000): ⚠️ y se puede implementar', !!r2 && r2.ok===true && tiene(r2, /El stock ocupa 36000.*queda poco lugar/), r2 ? r2.lineas.join(' | ') : 'sin prueba');
    chk('⚠️ H · casi lleno (43.000): ❌ NO implementar (la versión nueva lo haría crecer y dejaría de guardarse)',
        !!r3 && r3.ok===false && tiene(r3, /El stock ocupa 43000.*NO implementar/), r3 ? r3.lineas.join(' | ') : 'sin prueba');
  }
}

/* ── 📏 12. Una celda de Google aguanta 50.000 letras (revisión del 24/09) ──────────────────────
   El stock entero va en UNA celda. Pasado el tope, setValues tira una excepción: el panel veía
   «sin conexión» en cada guardado del stock, sin saber por qué. */
console.log('\n── 12. Una celda que no entra: «no» claro, sin tocar la hoja ──');
{
  const a = cargar([HDR], {});
  const obs = (n) => '{"c":{"f":"","u":{}},"e":[],"p":[],"a":{},"al":{},"g":{},"h":[],"x":"' + 'y'.repeat(n) + '"}';
  const r1 = a.post({ action:'save', juntar:1, pedido:{ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:0, observaciones:obs(49000) } });
  chk('un stock que entra en la celda se guarda', r1.ok===true && a.sh._datos.length===2, JSON.stringify(r1).slice(0,120));
  const antes = JSON.stringify(a.sh._datos);
  const r2 = a.post({ action:'save', juntar:1, pedido:{ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:r1.pedido.rev, observaciones:obs(50100) } });
  chk('⚠️ uno que NO entra: «celda_llena» con el campo y el largo (antes: excepción de Google = «sin conexión»)',
      r2.ok===false && r2.error==='celda_llena' && r2.campo==='Observaciones' && r2.largo>50000, JSON.stringify(r2).slice(0,200));
  chk('…sin tocar la hoja', JSON.stringify(a.sh._datos)===antes);
  chk('…y queda anotado en «Rechazos» con el motivo', a.shR._datos.some(f => f.indexOf('celda_llena')>=0 && /aguanta 50000/.test(f.join(' '))),
      JSON.stringify(a.shR._datos[a.shR._datos.length-1]||[]).slice(0,200));
}

/* ── 📦 13. Marcar entregados los pedidos de agosto (pedido del dueño, 25/09) ──────────────────
   «Marca todos los pedidos de agosto entregado por si logística olvidó hacerlo». Va en un archivo
   APARTE (herramientas/marcar-entregados-agosto.gs) que el dueño agrega al proyecto y corre desde
   el editor: ver (no toca nada) → marcar (candado, sello nuevo, respaldo) → deshacer. Se prueba
   con el .gs de esta rama Y con el publicado hoy (20-a, commit ebc3eab): tiene que andar con los dos. */
console.log('\n── 13. Marcar entregados los pedidos de agosto (archivo aparte) ──');
{
  const EXTRA = fs.readFileSync(path.resolve('herramientas/marcar-entregados-agosto.gs'), 'utf8');
  let gs20a = null;
  try { gs20a = require('child_process').execSync('git show ebc3eab:google-apps-script.gs', { maxBuffer:64*1024*1024 }).toString(); } catch (e) {}
  const versiones = [['esta rama', fs.readFileSync(GS,'utf8')]].concat(gs20a ? [['la publicada hoy (20-a)', gs20a]] : []);
  if (!gs20a) chk('se pudo leer el .gs publicado (ebc3eab) para probar contra él', false, 'git show falló');

  /* ⚠️ Todos los archivos de un proyecto de Apps Script comparten los nombres: uno repetido en el
     archivo aparte PISARÍA al de Código.gs (los disparadores y el panel correrían el de acá). */
  const nombres = (src) => new Set([...src.matchAll(/^(?:function\s+([A-Za-z0-9_$]+)|var\s+([A-Za-z0-9_$]+))/gm)].map(m => m[1]||m[2]));
  const propios = [...nombres(EXTRA)];
  versiones.forEach(([nom, src]) => {
    const g = nombres(src), choca = propios.filter(n => g.has(n));
    chk('ningún nombre del archivo aparte existe en el .gs de ' + nom, choca.length===0, choca.join(', '));
  });

  const HDR30 = HDR.concat(['Revisión']), iEnt = HDR.indexOf('Entregado'), iEst = HDR.indexOf('Estado stock');
  const f30 = (o, extra) => { const r = fila(o).concat([o.rev || 1000]); if (extra) extra(r); return r; };
  const armar = () => [
    f30({ id:'a1', fecha:new Date(2026,7,5), oc:'08-001', cli:'CLIENTE UNO' }),     // fila 2 · Sheets devuelve la fecha como Date
    f30({ id:'a2', fecha:'2026-08-20', oc:'RPT 08-003', cli:'MIA PLAZA', rev:2000 }),// fila 3
    f30({ id:'a3', fecha:'2026-08-12', oc:'08-004', cli:'YA ENTREGADO' }, r => { r[iEnt]='SÍ'; }),
    f30({ id:'a4', fecha:'2026-08-15', oc:'ATC 08-002', cli:'RECLAMO' }),
    f30({ id:'a5', fecha:'2026-09-02', oc:'09-001', cli:'SEPTIEMBRE' }),
    f30({ id:'a6', fecha:'', oc:'', cli:'VENTA DE TIENDA' }),
    f30({ id:'kommo-1', fecha:'', oc:'', cli:'BORRADOR' }, r => { r[iEst]='Borrador Kommo'; }),
    f30({ id:'__stock__', fecha:'2026-08-01', oc:'', cli:'📦 STOCK' }),
    f30({ id:'a7', fecha:'2026-08-28', oc:'08-009', cli:'NO HABIA', rev:9e12 }, r => { r[iEst]='No hay'; }),  // fila 10 · sello «del futuro»
  ];

  versiones.forEach(([nom, src]) => {
    console.log('   · con el .gs de ' + nom);
    const filas = armar();
    const a = cargar([HDR30].concat(filas), {}, src + '\n' + EXTRA);
    const f = (id) => a.sh._datos.find(x => x[0]===id);
    const antes = JSON.stringify(a.sh._datos);
    const v = a.ctx.verPendientesAgosto();
    chk('['+nom+'] ver: 3 para marcar (2 OC, una con la fecha como Date, y 1 RPT), 1 ATC aparte, y NO toca nada',
        v.ok===true && v.marcar===3 && v.porTipo.OC===2 && v.porTipo.RPT===1 && v.atc===1 && JSON.stringify(a.sh._datos)===antes, JSON.stringify(v).slice(0,200));
    chk('['+nom+'] …la lista dice cuáles, señala el «No hay · reprogramar» y deja la ATC para revisar a mano',
        v.lineas.some(l => /08-001/.test(l)) && v.lineas.some(l => /RPT 08-003/.test(l)) && v.lineas.some(l => /08-009.*No hay/.test(l)) &&
        v.noHay===1 && v.lineas.some(l => /ATC.*revisalas a mano/.test(l)) && v.lineas.some(l => /ATC 08-002/.test(l)), v.lineas.join(' | ').slice(0,300));

    const revViejo = { a1:f('a1')[29], a2:f('a2')[29], a7:f('a7')[29] };
    const m = a.ctx.marcarEntregadosAgosto();
    chk('['+nom+'] ⚠️ marcar: a1, a2 y a7 quedan «SÍ»', m.ok===true && m.marcados===3 && ['a1','a2','a7'].every(id => f(id)[iEnt]==='SÍ'), JSON.stringify(m).slice(0,160));
    chk('['+nom+'] …y NADA más cambia: la ATC, septiembre, la venta de tienda, el borrador y el stock siguen en «NO»',
        ['a4','a5','a6','kommo-1','__stock__'].every(id => f(id)[iEnt]==='NO') && f('a3')[iEnt]==='SÍ');
    const tocadas = new Set(['1,'+iEnt,'1,29','2,'+iEnt,'2,29','9,'+iEnt,'9,29']);   // [fila de datos, columna]
    const antesF = JSON.parse(antes), ahora = a.sh._datos;
    let otras = [];
    for (let i = 0; i < antesF.length; i++) for (let j = 0; j < 30; j++) {
      if (tocadas.has(i+','+j)) continue;
      const x = antesF[i][j], y = ahora[i][j];
      if (JSON.stringify(x instanceof Date ? x.toISOString() : x) !== JSON.stringify(y instanceof Date ? y.toISOString() : y)) otras.push(i+','+j);
    }
    chk('['+nom+'] …ni ninguna otra celda de la hoja (cliente, fecha, sellos de las otras filas)', otras.length===0 && ahora.length===antesF.length, otras.slice(0,5).join(' '));
    chk('['+nom+'] ⚠️ se escriben SOLO las celdas de esas filas, no la columna entera',
        JSON.stringify(a.sh._listas)===JSON.stringify([['S2','S3','S10'],['AD2','AD3','AD10']]), JSON.stringify(a.sh._listas));
    const sello = f('a1')[29];
    chk('['+nom+'] ⚠️ …con UN sello nuevo, más alto que el de cada fila (también el «del futuro»)',
        sello===f('a2')[29] && sello===f('a7')[29] && ['a1','a2','a7'].every(id => Number(sello) > Number(revViejo[id])), sello);
    chk('['+nom+'] …y escrito de verdad antes de soltar el candado (flush)', a.cont.flush >= 1, a.cont.flush);
    const vieja = a.ctx.rowToRec_(f('a1')); vieja.rev = revViejo.a1; vieja.entregado = false;   // la copia de un panel abierto desde antes
    const r = a.post({ action:'save', pedido:vieja });
    chk('['+nom+'] ⚠️ …un panel con la copia VIEJA choca (conflicto) en vez de volver a desmarcarlo', r.ok===false && r.error==='conflicto' && f('a1')[iEnt]==='SÍ', JSON.stringify(r).slice(0,100));
    const hr = a.otras['Respaldo entregados'];
    chk('['+nom+'] …el respaldo: una fila por pedido marcado (la hoja nueva creció para que entren)',
        !!hr && hr._datos.length===4 && hr._datos.slice(1).map(x => x[2]).sort().join(',')==='a1,a2,a7', hr ? JSON.stringify(hr._datos.slice(1)).slice(0,160) : 'sin hoja');

    const m2 = a.ctx.marcarEntregadosAgosto();
    chk('['+nom+'] marcar otra vez no encuentra nada (ni duplica el respaldo)', m2.marcados===0 && hr._datos.length===4);

    /* Dos tandas: logística desmarca a7 en el panel y se vuelve a marcar. Deshacer va de la última
       para atrás — con la hora de cada tanda vuelta Fecha por Sheets (el doble lo hace). */
    f('a7')[iEnt] = 'NO';
    const t0 = Date.now(); while (Date.now() - t0 < 3) {}             // otra hora para la segunda tanda
    const m3 = a.ctx.marcarEntregadosAgosto();
    chk('['+nom+'] una segunda tanda marca solo lo que faltaba (a7)', m3.marcados===1 && f('a7')[iEnt]==='SÍ' && hr._datos.length===5, JSON.stringify(m3).slice(0,120));
    chk('['+nom+'] (la hora de la tanda quedó como Fecha en el respaldo: el peor caso)', hr._datos[1][0] instanceof Date);
    const d1 = a.ctx.deshacerEntregadosAgosto();
    chk('['+nom+'] ⚠️ deshacer: solo la ÚLTIMA tanda (a7 vuelve a «NO», a1 y a2 siguen «SÍ»)',
        d1.deshechos===1 && f('a7')[iEnt]==='NO' && f('a1')[iEnt]==='SÍ' && f('a2')[iEnt]==='SÍ', JSON.stringify(d1));
    const d2 = a.ctx.deshacerEntregadosAgosto();
    chk('['+nom+'] ⚠️ deshacer otra vez: la tanda anterior (a1 y a2); el que ya estaba entregado (a3) no se toca',
        d2.deshechos===2 && f('a1')[iEnt]==='NO' && f('a2')[iEnt]==='NO' && f('a7')[iEnt]==='NO' && f('a3')[iEnt]==='SÍ', JSON.stringify(d2));
    chk('['+nom+'] …todo queda anotado como deshecho, y deshacer una vez más no hace nada',
        hr._datos.slice(1).every(x => /^deshecho /.test(String(x[5]))) && a.ctx.deshacerEntregadosAgosto().deshechos===0);
  });

  /* Pegado en OTRO proyecto (o con Código.gs cortado): dice qué falta y no toca nada. */
  const solo = cargar([HDR30].concat(armar()), {}, EXTRA);
  const antesSolo = JSON.stringify(solo.sh._datos);
  let rs = null, err = null;
  try { rs = [solo.ctx.verPendientesAgosto(), solo.ctx.marcarEntregadosAgosto(), solo.ctx.deshacerEntregadosAgosto()]; } catch (e) { err = e.message; }
  chk('sin Código.gs al lado: no revienta, dice qué falta y no toca nada',
      !err && rs.every(x => x.ok===false && x.error==='falta' && x.falta.indexOf('rowToRec_')>=0) && JSON.stringify(solo.sh._datos)===antesSolo,
      err || JSON.stringify(rs && rs[0]).slice(0,160));
}

// ══ 14. 🔁 DÍAS CERRADOS Y TILDES DE LA CARGA CON SELLO (2026-09-26-a, revisión de Codex) ═════
/* Codex reprodujo dos computadoras que leen a la vez los días cerrados y guardan cada una su día: quedaba
   una sola fecha. Desde 2026-09-26-a, un panel que manda `juntar` pide sello en estas dos filas; uno que
   no lo manda (el de antes del 26/09) sigue como siempre. Contra un .gs viejo (GS=…) esta sección falla. */
console.log('\n── 14. Días cerrados y tildes de la carga: sello si el panel manda `juntar` ──');
{
  const a = cargar([HDR], {});
  const sistema = (id, obs, rev) => ({ id, fecha:'', cliente:'FILA DEL SISTEMA', observaciones:obs, rev: rev||0 });
  [['__dias_cerrados__', '🔒 2026-10-01', '🔒 2026-10-02'], ['__carga_chk__', '2026-10-01|K1', '2026-10-02|K2']].forEach(([id, obsA, obsB]) => {
    let r = a.post({ action:'save', pedido: sistema(id, ''), juntar:1 });
    chk('['+id+'] la primera vez se crea (no hay sello que comparar)', r.ok===true && r.pedido && r.pedido.rev>0, JSON.stringify(r).slice(0,100));
    const rev1 = r.pedido.rev;
    // A y B leyeron la fila con rev1. A guarda su cambio:
    r = a.post({ action:'save', pedido: sistema(id, obsA, rev1), juntar:1 });
    chk('['+id+'] A guarda con el sello que leyó', r.ok===true && r.pedido.rev>rev1, JSON.stringify(r).slice(0,100));
    const rev2 = r.pedido.rev;
    // B guarda el suyo con el sello VIEJO:
    r = a.post({ action:'save', pedido: sistema(id, obsB, rev1), juntar:1 });
    chk('['+id+'] ⚠️ B, con el sello viejo y `juntar`: conflicto, y le devuelve la fila de A para juntar',
        r.ok===false && r.error==='conflicto' && r.pedido && r.pedido.rev===rev2 && String(r.pedido.observaciones)===obsA, JSON.stringify(r).slice(0,140));
    chk('['+id+'] ⚠️ …y lo de A sigue en la planilla (B no lo pisó)', String(pedido(a.ctx, a.sh, id).observaciones)===obsA, pedido(a.ctx, a.sh, id).observaciones);
    chk('['+id+'] …el choque NO se anota en «Rechazos» (el panel lo junta solo)', !a.shR._datos.some(f => f.indexOf(id)>=0), a.shR._datos.length+' filas');
    // B junta y vuelve a guardar con el sello de ahora:
    r = a.post({ action:'save', pedido: sistema(id, obsA+' '+obsB.replace('🔒 ',''), rev2), juntar:1 });
    chk('['+id+'] B junta y guarda con el sello nuevo: entra', r.ok===true && r.pedido.rev>rev2, JSON.stringify(r).slice(0,100));
    // Un panel de ANTES (sin `juntar`) no se traba: guarda como siempre, aunque su sello sea viejo.
    r = a.post({ action:'save', pedido: sistema(id, obsA, rev1) });
    chk('['+id+'] un panel de antes del 26/09 (sin `juntar`) guarda como siempre: no se le contesta `actualizar` ni `conflicto`', r.ok===true, JSON.stringify(r).slice(0,100));
  });
  // Los pedidos siguen igual: sin sello sobre una fila sellada, conflicto (con o sin `juntar`).
  const b = cargar([HDR, fila({id:'p1'})], {});
  const l = b.post({ action:'list' }).pedidos[0]; l.chofer='ANA';
  let r = b.post({ action:'save', pedido:l });
  const viejo = JSON.parse(JSON.stringify(l)); viejo.rev=l.rev||0; viejo.chofer='BETO';
  r = b.post({ action:'save', pedido:viejo, juntar:1 });
  chk('un pedido común con el sello viejo sigue chocando, mande o no `juntar`', r.ok===false && r.error==='conflicto', JSON.stringify(r).slice(0,100));
}

console.log('\n'+PASS+' bien · '+FAIL+' mal');
process.exit(FAIL?1:0);
