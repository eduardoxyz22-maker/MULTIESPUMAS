/* 📥 EL AVISO DE KOMMO — que traiga la venta, y que NO rompa nada (§4cc).

   Cuando una venta pasa a «Compradores», Kommo le avisa al Apps Script y este deja el
   BORRADOR en la planilla. Es la única parte del sistema que **escribe en la planilla sin
   que nadie la mire**, así que es la que más cuidado necesita.

   ⚠️ LO QUE ESTE TEST CUIDA POR ENCIMA DE TODO:
   1. Que NUNCA toque una fila que ya existe. Solo puede AGREGAR.
   2. Que el borrador vaya con la FECHA VACÍA. Con fecha ocuparía cupo del camión y le
      aparecería al chofer: sería un pedido fantasma en la ruta de mañana.
   3. Que sin clave configurada NO acepte nada. La dirección del Apps Script está dentro
      del panel, que es una página pública: sin clave, cualquiera podría meter pedidos
      falsos en la planilla de la empresa.
   4. Que el mismo lead dos veces no cree dos filas.

   El Apps Script no se puede correr acá, así que se carga el .gs en Node con Google
   simulado: una planilla de mentira en memoria, Kommo de mentira, y las propiedades del
   script de mentira. Lo que se prueba es la LÓGICA, que es donde están los errores.

   Se corre:  node tests/test_hook.js   (desde la raíz del repo) */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

const CLAVE = 'clave-secreta-de-prueba-1234';
const ETAPA = '103450711';          // «Compradores»

/* ── La planilla de mentira ────────────────────────────────────────────────── */
function hacerPlanilla(filas){
  /* ⚠️ COPIA DE VERDAD, fila por fila. Con `filas.slice()` las filas quedaban COMPARTIDAS
     con quien las armó: al escribir una celda se mutaba el array original del test, y el
     caso siguiente arrancaba con el valor del anterior. Me dio un falso ✗ (el borrador ya
     completado parecía haber sido tocado, cuando lo tocado había sido el fixture). */
  const datos = filas.map(f => f.slice());        // [0] son los encabezados
  return {
    _datos: datos,
    getLastRow: () => datos.length,
    getLastColumn: () => (datos[0]||[]).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {},
    appendRow: (r) => { datos.push(r.slice()); },
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

/* ── Kommo de mentira ─────────────────────────────────────────────────────── */
const SECRETOS = { nombre:'INES GUTIERREZ SUAREZ', tel:'62241536', dir:'Av. Banzer 4to anillo',
                   nombreErwin:'Erwin Marcelo Meschwitz Lino' };
const KOMMO = {
  /* ⚠️ `status_id` y `pipeline_id` van SIEMPRE: Kommo los manda en todo lead, y el
     servidor los usa para no importar ventas de otras etapas. El fixture no los tenía y
     por eso no habría atrapado nunca ese agujero (§4ch). */
  '/leads/44001?with=contacts,catalog_elements': {
    id:44001, name:SECRETOS.nombre, price:13020, responsible_user_id:14992463,
    status_id:103450711, pipeline_id:13349719,
    custom_fields_values:[{field_id:1685406, values:[{value:SECRETOS.dir}]}],
    _embedded:{ contacts:[{id:5501}], catalog_elements:[
      {id:342406, metadata:{quantity:2, price:6510}},
      {id:342524, metadata:{quantity:1}}
    ]}
  },
  '/contacts/5501': { id:5501, name:SECRETOS.nombre,
    custom_fields_values:[{field_id:1685346, values:[{value:SECRETOS.tel}]}] },
  /* 🏷️ EL CASO DE ERWIN: la vendedora creó la venta desde el chat y Kommo la tituló sola
     «Lead #39357288». El nombre de verdad está en el contacto. */
  '/leads/39357288?with=contacts,catalog_elements': {
    id:39357288, name:'Lead #39357288', price:6660, responsible_user_id:14992463,
    status_id:103450711, pipeline_id:13349719,
    _embedded:{ contacts:[{id:5502, name:SECRETOS.nombreErwin, is_main:true}], catalog_elements:[] }
  },
  '/leads/39357288?with=contacts': {
    id:39357288, name:'Lead #39357288', status_id:103450711, pipeline_id:13349719,
    _embedded:{ contacts:[{id:5502, name:SECRETOS.nombreErwin, is_main:true}] }
  },
  '/contacts/5502': { id:5502, name:SECRETOS.nombreErwin,
    custom_fields_values:[{field_id:1685346, values:[{value:'76317574'}]}] },
  // Un lead de OTRA etapa: aunque el aviso llegue sin decir la etapa, no se importa.
  '/leads/44050?with=contacts,catalog_elements': {
    id:44050, name:'OTRA ETAPA', price:100, responsible_user_id:14992463,
    status_id:102961403, pipeline_id:13349719, _embedded:{ contacts:[], catalog_elements:[] }
  },
  // Un lead de OTRO embudo, pero en una etapa con el mismo número: tampoco.
  '/leads/44060?with=contacts,catalog_elements': {
    id:44060, name:'OTRO EMBUDO', price:100, responsible_user_id:14992463,
    status_id:103450711, pipeline_id:99999999, _embedded:{ contacts:[], catalog_elements:[] }
  },
  '/catalogs/10902/elements?filter[id][]=342406&filter[id][]=342524': {
    _embedded:{ elements:[
      {id:342406, name:'TITANIO ICE 160x190', custom_fields_values:[{field_id:1685378,values:[{value:6510}]}]},
      {id:342524, name:'ALMOHADA 50x70',      custom_fields_values:[{field_id:1685378,values:[{value:25}]}]}
    ]}
  },
  '/users/14992463': { id:14992463, name:'Mirian Salazar - Mia Plaza' },
  // Un lead cuya venta ya fue cargada a mano por la vendedora
  '/leads/44009?with=contacts,catalog_elements': {
    id:44009, name:'CLIENTE YA CARGADO', price:1000, responsible_user_id:14992463,
    status_id:103450711, pipeline_id:13349719,
    _embedded:{ contacts:[], catalog_elements:[] } }
};

/* ── Carga el .gs con Google simulado ─────────────────────────────────────── */
function cargar(filas, props){
  const sh = hacerPlanilla(filas);
  const llamadas = [];
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: () => sh, insertSheet: () => sh }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props && props[k] != null) ? props[k] : null,
      setProperty: (k, v) => { props[k] = v; } }) },
    UrlFetchApp: { fetch: (url) => {
      llamadas.push(url);
      const ruta = decodeURIComponent(url.split('/api/v4')[1] || '');
      const cuerpo = KOMMO[ruta];
      return { getResponseCode: () => cuerpo ? 200 : 404,
               getContentText: () => JSON.stringify(cuerpo || {}) };
    }},
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
    ContentService: { MimeType:{JSON:'json'},
      createTextOutput: (t) => ({ _t:t, setMimeType(){ return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({}) },
    Utilities: { formatDate: (d)=>String(d) },
    Session: { getScriptTimeZone: () => 'America/La_Paz' }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  /* GS=/ruta/viejo.gs para probarle los dientes al test contra una versión anterior. */
  vm.runInContext(fs.readFileSync(process.env.GS || path.resolve('google-apps-script.gs'),'utf8'), ctx);
  return { ctx, sh, llamadas, leer: (r) => JSON.parse(r._t) };
}

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona',
  'Dirección','Link Maps','Pagado','Saldo (Bs)','ts','_productos_json','Método pago',
  'Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)',
  'Nota de venta','A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega'];

/* Un pedido de verdad que ya está en la planilla y NO se puede tocar. */
const PEDIDO_REAL = ['p-viejo','2026-09-05','1024','Carola Chavez','CLIENTE DE ANTES',
  'COLCHON','70111222','AM','Norte','calle x','','SÍ',0,1700000000000,
  '[{"desc":"COLCHON","cant":1,"precio":1000}]','Efectivo','','','NO','','','','640',0,'','',1,'SÍ',''];

const hook = (ctx, params) => ctx.doPost({ parameter: params });

// ══ 1. LA PUERTA: sin clave no entra nadie ═════════════════════════════════
console.log('\n── 1. La puerta ──');
{
  const a = cargar([HDR, PEDIDO_REAL], {});          // sin KOMMO_HOOK_KEY configurada
  const r = a.leer(hook(a.ctx, {k:'lo-que-sea', 'leads[status][0][id]':'44001',
                                'leads[status][0][status_id]':ETAPA}));
  chk('⚠️ sin clave configurada NO acepta nada', r.ok===false, JSON.stringify(r));
  chk('…y no escribió ni una fila', a.sh._datos.length===2, a.sh._datos.length);
}
{
  const a = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = a.leer(hook(a.ctx, {k:'clave-equivocada', 'leads[status][0][id]':'44001',
                                'leads[status][0][status_id]':ETAPA}));
  chk('⚠️ con la clave equivocada tampoco', r.ok===false && /clave/.test(r.error||''), JSON.stringify(r));
  chk('…y tampoco escribió nada', a.sh._datos.length===2, a.sh._datos.length);
}

// ══ 2. Solo la etapa que corresponde ═══════════════════════════════════════
console.log('\n── 2. Solo «Compradores» dispara ──');
{
  const a = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = a.leer(hook(a.ctx, {k:CLAVE, 'leads[status][0][id]':'44001',
                                'leads[status][0][status_id]':'102961403'}));  // «Nueva consulta»
  chk('un lead que pasó a otra etapa NO crea nada', r.ok===true && r.creados===0, JSON.stringify(r));
  chk('…y la planilla quedó igual', a.sh._datos.length===2);
  chk('…y ni le preguntó a Kommo (no gasta llamadas)', a.llamadas.length===0, a.llamadas.length);
}

// ══ 2b. La venta CREADA directo en «Compradores» ══════════════════════════
console.log('\n── 2b. Creada directo en «Compradores» (leads[add]) ──');
{
  /* ⚠️ §4cg — el 05/09 una vendedora creó el lead YA en «Compradores». Kommo no manda
     eso como cambio de etapa (leads[status]) sino como alta (leads[add]), y el aviso solo
     leía el primero: la venta no llegó. Ahora lee status, add y update. */
  const a = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  let r = a.leer(hook(a.ctx, {k:CLAVE, 'leads[add][0][id]':'44001', 'leads[add][0][status_id]':ETAPA}));
  chk('⚠️ un lead creado directo en «Compradores» (leads[add]) crea el borrador', r.ok===true && r.creados===1, JSON.stringify(r).slice(0,110));
  chk('…con su fila', a.sh._datos.length===3 && a.sh._datos[2][0]==='kommo-44001', a.sh._datos.length);
  r = a.leer(hook(a.ctx, {k:CLAVE, 'leads[add][0][id]':'44002', 'leads[add][0][status_id]':'102961403'}));
  chk('un lead creado en OTRA etapa no crea nada', r.creados===0 && a.sh._datos.length===3, JSON.stringify(r).slice(0,80));
  const b = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  r = b.leer(hook(b.ctx, {k:CLAVE, 'leads[update][0][id]':'44001', 'leads[update][0][status_id]':ETAPA}));
  chk('una EDICIÓN de un lead que está en «Compradores» (leads[update]) también lo trae si faltaba', r.creados===1, JSON.stringify(r).slice(0,80));
  const c = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  r = c.leer(hook(c.ctx, {k:CLAVE, 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':ETAPA,
                          'leads[add][0][id]':'44001', 'leads[add][0][status_id]':ETAPA}));
  chk('el mismo lead en dos tipos de aviso a la vez crea UNA sola fila', r.creados===1 && c.sh._datos.length===3, JSON.stringify(r).slice(0,80));
}

// ══ 2c. 🏷️ EL NOMBRE DEL CLIENTE, NO EL NÚMERO DE KOMMO (§4ch) ═════════════
console.log('\n── 2c. «Lead #39357288» tiene que ser el nombre del cliente ──');
{
  /* Reportado con la venta de Erwin: el borrador le apareció a Carola como
     «Lead #39357288». Kommo titula sola las ventas que nacen del chat; el nombre de
     verdad vive en el contacto principal. */
  const a = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = a.leer(hook(a.ctx, {k:CLAVE, 'leads[add][0][id]':'39357288',
                                'leads[add][0][status_id]':ETAPA}));
  chk('la venta entra', r.creados===1, JSON.stringify(r).slice(0,110));
  const f = a.sh._datos[2];
  chk('⚠️ el cliente es el NOMBRE, no «Lead #39357288»',
      f[HDR.indexOf('Cliente')]===SECRETOS.nombreErwin, f[HDR.indexOf('Cliente')]);
  chk('…y trae su celular del contacto', String(f[HDR.indexOf('Celular')])==='76317574', f[HDR.indexOf('Celular')]);
  chk('un título escrito a mano NO se reemplaza por el del contacto',
      (() => { const b = cargar([HDR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
               b.leer(hook(b.ctx, {k:CLAVE, 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':ETAPA}));
               return b.sh._datos[1][HDR.indexOf('Cliente')]===SECRETOS.nombre; })());
  // Qué cuenta como título puesto por Kommo y qué no.
  // (Si se corre contra un .gs viejo, esta función no existe: se avisa en vez de reventar.)
  const gen = a.ctx.nombreGenerico_ || (() => 'no existe nombreGenerico_ en este .gs');
  chk('«Lead #39357288» se reconoce como título de Kommo', gen('Lead #39357288')===true, gen('Lead #39357288'));
  chk('…«39357288» pelado también', gen('39357288')===true);
  chk('…«Negocio #123» también', gen('Negocio #123')===true);
  chk('…y el vacío', gen('')===true && gen(null)===true);
  chk('⚠️ un nombre de persona NO es genérico', gen('Erwin Marcelo Meschwitz Lino')===false);
  chk('…ni una empresa con números', gen('ROHO SRL 2')===false, gen('ROHO SRL 2'));
}

// ══ 2d. 🔧 Reparar el borrador que YA quedó con el número ══════════════════
console.log('\n── 2d. El borrador de Erwin, que ya existe ──');
{
  const BORR = ['kommo-39357288','','','Carola Chavez','Lead #39357288','','76317574','','','','','NO',6660,
    Date.now(),'[]','','','Borrador Kommo','NO','','','','',0,'','',0,'NO',''];
  const a = cargar([HDR, PEDIDO_REAL, BORR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = a.leer(hook(a.ctx, {k:CLAVE, 'leads[add][0][id]':'39357288', 'leads[add][0][status_id]':ETAPA}));
  chk('⚠️ NO lo duplica: sigue habiendo una sola fila del lead', a.sh._datos.length===3, a.sh._datos.length);
  chk('…dice que ya estaba', /ya estaba/.test(JSON.stringify(r.saltados||[])), JSON.stringify(r.saltados));
  chk('⚠️ pero le CORRIGE el nombre', a.sh._datos[2][HDR.indexOf('Cliente')]===SECRETOS.nombreErwin, a.sh._datos[2][HDR.indexOf('Cliente')]);
  chk('…y lo informa', r.reparados===1, r.reparados);
  chk('⚠️ NO le toca el monto ni nada más', Number(a.sh._datos[2][HDR.indexOf('Saldo (Bs)')])===6660);
  chk('⚠️ ni le pone sello de revisión (si no, completarlo daría conflicto)',
      !Number(a.sh._datos[2][HDR.indexOf('Revisión')]||0), a.sh._datos[2][HDR.indexOf('Revisión')]);
  // Si la vendedora ya le escribió el nombre, no se le toca.
  const conNombre = BORR.slice(); conNombre[HDR.indexOf('Cliente')]='ERWIN M. (lo escribí yo)';
  const b = cargar([HDR, conNombre], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  b.leer(hook(b.ctx, {k:CLAVE, 'leads[add][0][id]':'39357288', 'leads[add][0][status_id]':ETAPA}));
  chk('⚠️ si alguien ya le puso nombre a mano, NO se lo pisa',
      b.sh._datos[1][HDR.indexOf('Cliente')]==='ERWIN M. (lo escribí yo)', b.sh._datos[1][HDR.indexOf('Cliente')]);
  // Si ya lo completaron (dejó de ser borrador), tampoco.
  const completo = BORR.slice(); completo[HDR.indexOf('Estado stock')]='';
  const c = cargar([HDR, completo], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  c.leer(hook(c.ctx, {k:CLAVE, 'leads[add][0][id]':'39357288', 'leads[add][0][status_id]':ETAPA}));
  chk('⚠️ si ya lo completaron, tampoco se le toca nada',
      c.sh._datos[1][HDR.indexOf('Cliente')]==='Lead #39357288', c.sh._datos[1][HDR.indexOf('Cliente')]);
}

// ══ 2e. 🚪 El aviso sin etapa, y las etapas y embudos ajenos ═══════════════
console.log('\n── 2e. Avisos incompletos y ventas de otra etapa ──');
{
  /* Algunos avisos de alta llegan SIN decir en qué etapa quedó el lead. Antes se perdían
     en silencio. Ahora pasan al portero de verdad, que lee el lead. */
  const a = cargar([HDR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  let r = a.leer(hook(a.ctx, {k:CLAVE, 'leads[add][0][id]':'44001'}));   // sin status_id
  chk('⚠️ un aviso de alta SIN etapa no se pierde: se consulta el lead y entra', r.creados===1, JSON.stringify(r).slice(0,110));
  const b = cargar([HDR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  r = b.leer(hook(b.ctx, {k:CLAVE, 'leads[add][0][id]':'44050'}));       // sin etapa, y el lead está en otra
  chk('⚠️ …pero si el lead está en OTRA etapa, no entra', r.creados===0 && b.sh._datos.length===1, JSON.stringify(r).slice(0,110));
  const c = cargar([HDR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  r = c.leer(hook(c.ctx, {k:CLAVE, 'leads[add][0][id]':'44060', 'leads[add][0][status_id]':ETAPA}));
  chk('⚠️ un lead de OTRO EMBUDO en una etapa con el mismo número: no entra', r.creados===0, JSON.stringify(r).slice(0,110));
  const d = cargar([HDR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  r = d.leer(hook(d.ctx, {k:CLAVE, 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':ETAPA,
                          'leads[status][0][pipeline_id]':'99999999'}));
  chk('…y si el aviso mismo dice otro embudo, ni se consulta', r.creados===0 && d.llamadas.length===0, d.llamadas.length);
  // El aviso deja rastro para diagnosticar, sin datos de nadie.
  const e = cargar([HDR], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  r = e.leer(hook(e.ctx, {k:CLAVE, 'leads[status][0][id]':'44001', 'leads[status][0][status_id]':ETAPA}));
  chk('el servidor informa cuándo recibió el último aviso de Kommo', !!r.ultimoHook, r.ultimoHook);
  chk('⚠️ ese rastro no lleva nombres ni teléfonos',
      !new RegExp(SECRETOS.nombre).test(JSON.stringify(r)) && !new RegExp(SECRETOS.tel).test(JSON.stringify(r)));
}

// ══ 3. La venta llega ═════════════════════════════════════════════════════
console.log('\n── 3. La venta llega ──');
const A = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
const rA = A.leer(hook(A.ctx, {k:CLAVE, 'leads[status][0][id]':'44001',
                               'leads[status][0][status_id]':ETAPA}));
chk('crea el borrador', rA.ok===true && rA.creados===1, JSON.stringify(rA).slice(0,120));
chk('⚠️ agregó UNA fila, ni una más', A.sh._datos.length===3, A.sh._datos.length);
chk('⚠️ NO tocó el pedido que ya estaba',
    JSON.stringify(A.sh._datos[1])===JSON.stringify(PEDIDO_REAL));

const fila = A.sh._datos[2], col = (n) => fila[HDR.indexOf(n)];
chk('el id lleva el número del lead de Kommo', col('id')==='kommo-44001', col('id'));
chk('⚠️ LA FECHA VA VACÍA: no ocupa cupo ni le aparece al chofer', col('Fecha')==='', JSON.stringify(col('Fecha')));
chk('⚠️ queda marcado como borrador', col('Estado stock')==='Borrador Kommo', col('Estado stock'));
chk('trae el nombre del cliente', col('Cliente')===SECRETOS.nombre, col('Cliente'));
chk('⚠️ trae el celular, que está en el CONTACTO y no en el lead',
    String(col('Celular'))===SECRETOS.tel, col('Celular'));
chk('trae la dirección que sí tiene Kommo', col('Dirección')===SECRETOS.dir, col('Dirección'));
chk('trae el monto de la venta', Number(col('Saldo (Bs)'))===13020, col('Saldo (Bs)'));
chk('⚠️ le saca la sucursal al nombre de la vendedora',
    col('Vendedor')==='Mirian Salazar', col('Vendedor'));
chk('no queda marcado como entregado ni verificado',
    col('Entregado')==='NO' && col('Verificado')==='NO');
chk('no queda marcado como pagado', col('Pagado')==='NO', col('Pagado'));
chk('no le asigna número del día', Number(col('N° del día'))===0, col('N° del día'));

const prods = JSON.parse(col('_productos_json'));
chk('trae los 2 productos del catálogo', prods.length===2, prods.length);
chk('…con su nombre', prods[0].desc==='TITANIO ICE 160x190', prods[0].desc);
chk('…con su cantidad', Number(prods[0].cant)===2, prods[0].cant);
chk('…y con su precio', Number(prods[0].precio)===6510, prods[0].precio);
chk('el producto sin precio en el lead lo saca del catálogo',
    Number(prods[1].precio)===25, prods[1].precio);

// ══ 4. El mismo lead dos veces ════════════════════════════════════════════
console.log('\n── 4. El mismo aviso dos veces ──');
{
  const r2 = A.leer(hook(A.ctx, {k:CLAVE, 'leads[status][0][id]':'44001',
                                 'leads[status][0][status_id]':ETAPA}));
  chk('⚠️ NO crea una segunda fila', r2.creados===0, JSON.stringify(r2).slice(0,110));
  chk('…y dice por qué', /ya estaba/.test(JSON.stringify(r2.saltados||[])), JSON.stringify(r2.saltados));
  chk('la planilla sigue con 3 filas', A.sh._datos.length===3, A.sh._datos.length);
}

// ══ 5. La venta que la vendedora ya cargó a mano ══════════════════════════
console.log('\n── 5. Si ya la había cargado a mano ──');
{
  const yaCargado = PEDIDO_REAL.slice();
  // El panel deja la marca `klead` adentro del JSON de productos cuando ella dice
  // "esta venta ya la tenía". Sin leerla, el aviso crearía la copia igual.
  yaCargado[0] = 'p-a-mano';
  yaCargado[HDR.indexOf('_productos_json')] = '[{"desc":"COLCHON","cant":1,"klead":"44009"}]';
  const b = cargar([HDR, PEDIDO_REAL, yaCargado], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = b.leer(hook(b.ctx, {k:CLAVE, 'leads[status][0][id]':'44009',
                                'leads[status][0][status_id]':ETAPA}));
  chk('⚠️ reconoce la marca que dejó el panel y no duplica', r.creados===0, JSON.stringify(r).slice(0,110));
  chk('…y la planilla no creció', b.sh._datos.length===3, b.sh._datos.length);
}

// ══ 6. Varias ventas en un solo aviso ═════════════════════════════════════
console.log('\n── 6. Varias en un aviso ──');
{
  const c = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = c.leer(hook(c.ctx, {k:CLAVE,
    'leads[status][0][id]':'44001', 'leads[status][0][status_id]':ETAPA,
    'leads[status][1][id]':'44009', 'leads[status][1][status_id]':ETAPA,
    'leads[status][2][id]':'44777', 'leads[status][2][status_id]':'102961403'}));
  chk('trae las 2 que están en «Compradores»', r.creados===2, JSON.stringify(r).slice(0,120));
  // encabezado + el pedido que ya estaba + los 2 borradores = 4. La tercera venta,
  // que iba a «Nueva consulta», no tiene que haber entrado.
  chk('…y saltea la que está en otra etapa', c.sh._datos.length===4, c.sh._datos.length);
  chk('…sin preguntarle a Kommo por esa', !c.llamadas.some(u=>/44777/.test(u)), c.llamadas.length);
}

// ══ 7. Cuando Kommo no contesta ═══════════════════════════════════════════
console.log('\n── 7. Si Kommo no contesta ──');
{
  const d = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const r = d.leer(hook(d.ctx, {k:CLAVE, 'leads[status][0][id]':'99999',
                                'leads[status][0][status_id]':ETAPA}));
  chk('no revienta: contesta ok y no crea nada', r.ok===true && r.creados===0, JSON.stringify(r).slice(0,110));
  chk('…deja anotado el motivo', /no se pudo leer/.test(JSON.stringify(r.saltados||[])), JSON.stringify(r.saltados));
  chk('…y no escribió una fila a medias', d.sh._datos.length===2, d.sh._datos.length);
}
{
  const d2 = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE});   // sin token
  const r = d2.leer(hook(d2.ctx, {k:CLAVE, 'leads[status][0][id]':'44001',
                                  'leads[status][0][status_id]':ETAPA}));
  chk('sin token de Kommo tampoco escribe nada', r.creados===0 && d2.sh._datos.length===2);
}

// ══ 8. El repaso de respaldo usa el MISMO camino ══════════════════════════
console.log('\n── 8. El repaso de respaldo ──');
{
  const e = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const post = (o) => e.ctx.doPost({ parameter:{}, postData:{contents:JSON.stringify(o)} });
  const mal = e.leer(post({action:'kommoLeads', key:'otra', leads:['44001']}));
  chk('⚠️ también exige la clave', mal.ok===false, JSON.stringify(mal));
  chk('…y no escribió nada', e.sh._datos.length===2);
  const bien = e.leer(post({action:'kommoLeads', key:CLAVE, leads:['44001']}));
  chk('con la clave correcta crea el borrador', bien.creados===1, JSON.stringify(bien).slice(0,110));
  chk('…exactamente igual que el webhook',
      e.sh._datos[2][HDR.indexOf('Estado stock')]==='Borrador Kommo' &&
      e.sh._datos[2][HDR.indexOf('Fecha')]==='');
  const otra = e.leer(post({action:'kommoLeads', key:CLAVE, leads:['44001']}));
  chk('y repetirlo no duplica', otra.creados===0 && e.sh._datos.length===3, e.sh._datos.length);
}

// ══ 9. Que no se haya roto lo de siempre ══════════════════════════════════
console.log('\n── 9. Lo que ya funcionaba sigue funcionando ──');
{
  const f = cargar([HDR, PEDIDO_REAL], {KOMMO_HOOK_KEY:CLAVE, KOMMO_TOKEN:'tok'});
  const post = (o) => f.leer(f.ctx.doPost({ parameter:{}, postData:{contents:JSON.stringify(o)} }));
  const lista = post({action:'list'});
  chk('el panel sigue pudiendo bajar la planilla', lista.ok===true && lista.pedidos.length===1,
      JSON.stringify(lista).slice(0,90));
  // Ahora con un borrador adentro: tiene que llegarle al panel CON su marca, que es lo
  // que el panel usa para sacarlo de la lista de pedidos antes de dibujar nada.
  f.leer(f.ctx.doPost({ parameter:{k:CLAVE, 'leads[status][0][id]':'44001',
                                   'leads[status][0][status_id]':ETAPA} }));
  const lista2 = post({action:'list'});
  const borr = lista2.pedidos.filter(p => String(p.id)==='kommo-44001')[0] || {};
  chk('⚠️ el borrador le llega al panel CON su marca', borr.estado==='Borrador Kommo', borr.estado);
  chk('…y sin fecha, que es lo que lo mantiene fuera del camión', borr.fecha==='', JSON.stringify(borr.fecha));
  chk('…con el celular que sacó del contacto', String(borr.celular)===SECRETOS.tel, borr.celular);
  const malJson = f.leer(f.ctx.doPost({ parameter:{}, postData:{contents:'esto no es json'} }));
  chk('un cuerpo roto sigue dando el error de siempre', malJson.ok===false && malJson.error==='bad json');
  chk('la versión del script subió', f.ctx.SCRIPT_VERSION>='2026-09-04-a', f.ctx.SCRIPT_VERSION);
}

console.log('\n'+PASS+' bien · '+FAIL+' mal');
process.exit(FAIL?1:0);
