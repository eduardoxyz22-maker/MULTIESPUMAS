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
function hacerPlanilla(filas){
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length,
    getLastColumn: () => (datos[0]||[]).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {},
    appendRow: (r) => { datos.push(r.slice()); },
    deleteRow: (n) => { datos.splice(n-1, 1); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila-1]||[])[col-1],
      setValue: (v) => { if(!datos[fila-1]) datos[fila-1]=[]; datos[fila-1][col-1]=v; },
      getValues: () => {
        const out=[];
        for(let i=0;i<(nFilas||1);i++){
          const f=datos[fila-1+i]||[], r=[];
          for(let j=0;j<(nCols||1);j++) r.push(f[col-1+j]);
          out.push(r);
        }
        return out;
      },
      setValues: (v) => { for(let i=0;i<v.length;i++) datos[fila-1+i]=v[i].slice(); },
      setFontWeight: () => {}
    })
  };
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

function cargar(filas, props){
  const sh = hacerPlanilla(filas), drive = hacerDrive();
  const cache = { _m: {},
    get(k){ return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
    put(k, v){ this._m[k] = String(v); },
    putAll(o){ for (const k in o) this._m[k] = String(o[k]); },
    remove(k){ delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sh, insertSheet: () => sh }) },
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
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGHIJKLMNOP' }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS,'utf8'), ctx);
  const leer = (r) => JSON.parse(r._t);
  const post = (body) => leer(ctx.doPost({ postData:{ contents: JSON.stringify(body) }, parameter:{} }));
  const get  = (params) => leer(ctx.doGet({ parameter: params||{} }));
  return { ctx, sh, drive, post, get, leer };
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
  const r = a.post({ action:'kommoLeads', key:'kk', leads:['111'] });
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
  const r = a.post({ action:'kommoLeads', key:'kk', leads:['999'] });
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

console.log('\n'+PASS+' bien · '+FAIL+' mal');
process.exit(FAIL?1:0);
