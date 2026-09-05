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
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sh, insertSheet: () => sh }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props && props[k] != null) ? props[k] : null }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
    ContentService: { MimeType:{JSON:'json'}, createTextOutput: (t) => ({ _t:t, setMimeType(){ return this; } }) },
    DriveApp: drive,
    Utilities: { formatDate: (d)=>String(d), base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => 'America/La_Paz' }
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
  // Un panel VIEJO (cacheado) que no sabe de sellos no se queda sin poder guardar.
  const a = cargar([HDR, fila({id:'p1'})], { PANEL_KEY: CLAVE });
  const l = a.post(conClave({ action:'list' })).pedidos[0];
  a.post(conClave({ action:'save', pedido: l }));                        // deja sello
  const viejo = JSON.parse(JSON.stringify(l)); delete viejo.rev; viejo.chofer='ANA';
  const r = a.post(conClave({ action:'save', pedido: viejo }));
  chk('un panel viejo que no manda sello sigue pudiendo guardar', r.ok===true, JSON.stringify(r).slice(0,80));
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
  // Administración confirmó y forzó: pasa.
  p = base(); p.fecha=JUEVES;
  r = a.post(conClave({ action:'save', pedido:p, forzar:true }));
  chk('con «forzar» (administración confirmó) entra al día cerrado', r.ok===true, JSON.stringify(r).slice(0,80));
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
  chk('la versión del script subió', a.ctx.SCRIPT_VERSION>='2026-09-05-a', a.ctx.SCRIPT_VERSION);
}

console.log('\n'+PASS+' bien · '+FAIL+' mal');
process.exit(FAIL?1:0);
