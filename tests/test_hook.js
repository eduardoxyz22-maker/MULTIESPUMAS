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
  const datos = filas.slice();                    // [0] son los encabezados
  return {
    _datos: datos,
    getLastRow: () => datos.length,
    getLastColumn: () => (datos[0]||[]).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {},
    appendRow: (r) => { datos.push(r.slice()); },
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

/* ── Kommo de mentira ─────────────────────────────────────────────────────── */
const SECRETOS = { nombre:'INES GUTIERREZ SUAREZ', tel:'62241536', dir:'Av. Banzer 4to anillo' };
const KOMMO = {
  '/leads/44001?with=contacts,catalog_elements': {
    id:44001, name:SECRETOS.nombre, price:13020, responsible_user_id:14992463,
    custom_fields_values:[{field_id:1685406, values:[{value:SECRETOS.dir}]}],
    _embedded:{ contacts:[{id:5501}], catalog_elements:[
      {id:342406, metadata:{quantity:2, price:6510}},
      {id:342524, metadata:{quantity:1}}
    ]}
  },
  '/contacts/5501': { id:5501, name:SECRETOS.nombre,
    custom_fields_values:[{field_id:1685346, values:[{value:SECRETOS.tel}]}] },
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
      getProperty: (k) => (props && props[k] != null) ? props[k] : null }) },
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
  vm.runInContext(fs.readFileSync(path.resolve('google-apps-script.gs'),'utf8'), ctx);
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
