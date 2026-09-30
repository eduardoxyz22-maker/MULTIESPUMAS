/* 📦 LA LECTURA CON HORA, COMPRIMIDA Y SOLO LO CAMBIADO (30/09, bitácora §4he; el diseño, §4hb).

   El 29/09 a la noche el panel no conectaba: Google tardaba a ratos y cada equipo bajaba la planilla ENTERA (900 KB sin
   comprimir) cada 2 minutos. Con el servidor 2026-09-30-a y la página nueva:
     · la primera lectura va entera y COMPRIMIDA;
     · las siguientes, SOLO LO CAMBIADO (filas con sello nuevo + borrados), con una cuenta de control que el panel rehace;
     · cada lectura dice de cuándo es, y un pedido guardado acá y borrado en otro equipo se da por borrado EN EL ACTO (antes:
       «sospecha» y una segunda lectura 25 s después), sin que una copia vieja (la caché de 20 s de doGet) lo saque de la
       pantalla.

   El panel real contra el google-apps-script.gs REAL corriendo en Node con una planilla de mentira y un gzip de verdad (el de
   Node). Solo datos inventados. Reloj de la página clavado en el martes 29/09/2026 a las 10:00 (el del servidor corre: los
   sellos y las horas de Google salen de ahí).

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 30/09, `4ded824`, o contra el servidor 2026-09-28-a):
   1. (diente) la primera lectura pide la comprimida y la abre: la planilla llega entera y pesa varias veces menos;
   2. (diente) la segunda pide solo lo cambiado (`desde`), llega chica, y el cambio de otro equipo se ve;
   3. (diente) un pedido NUEVO de otro equipo y uno BORRADO en otro equipo llegan por la de lo cambiado;
   4. (diente) guardado acá y borrado allá: el aviso «ya no está en la planilla» sale con la primera lectura posterior, sin
      esperar la segunda;
   5. una lectura VIEJA (la copia de doGet de antes del guardado) no saca de la pantalla lo recién guardado;
   6. la cuenta de control que no da (una fila borrada A MANO en la hoja) hace leer entera, y todo queda igual a la planilla;
   7. cada 15 minutos, entera;
   8. si la comprimida no se puede abrir, se pide sin comprimir, y de ahí en más sin comprimir;
   9. con el servidor de antes (2026-09-28-a) todo sigue como siempre: lectura entera, sin `desde`;
  10. la página de antes (`4ded824`) contra el servidor nuevo: lee y guarda igual (se puede implementar antes de que todos
      hagan F5).

   Se corre:  node tests/test_lectura_delta.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_4ded824.html node tests/test_lectura_delta.js
              GS=/ruta/al/gs_2026-09-28-a.gs node tests/test_lectura_delta.js
   Para la 10 hace falta la página de antes: VIEJA=/ruta/a/pedidos_4ded824.html (si no, la saca de git). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path'), zlib = require('zlib'), os = require('os');
const { execSync } = require('child_process');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const RELOJ = '2026-09-29T10:00:00-04:00';
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

function hacerPlanilla(filas){
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0]||[]).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n-1, 1); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila-1]||[])[col-1],
      setValue: (v) => { if(!datos[fila-1]) datos[fila-1]=[]; datos[fila-1][col-1]=v; },
      getValues: () => { const out=[]; for(let i=0;i<(nFilas||1);i++){ const f=datos[fila-1+i]||[], r=[]; for(let j=0;j<(nCols||1);j++) r.push(f[col-1+j]); out.push(r); } return out; },
      setValues: (v) => { for(let i=0;i<v.length;i++){ const r=datos[fila-1+i]||(datos[fila-1+i]=[]); for(let j=0;j<v[i].length;j++) r[col-1+j]=v[i][j]; } },
      setFontWeight: () => {}
    })
  };
}
/* `Utilities` como en Google: blobs en UTF-8, gzip, base64 con los bytes CON SIGNO de Java. */
function hacerUtilities(){
  const conSigno = (buf) => Array.from(buf).map(x => x > 127 ? x - 256 : x);
  const aBuf = (d) => Buffer.isBuffer(d) ? d : (Array.isArray(d) ? Buffer.from(d.map(x => x < 0 ? x + 256 : x)) : Buffer.from(String(d), 'utf8'));
  const blob = (buf, tipo) => ({ _b: buf, getBytes(){ return conSigno(this._b); }, getDataAsString(){ return this._b.toString('utf8'); }, getContentType(){ return tipo || ''; } });
  return { formatDate: (d)=>String(d), newBlob: (d, tipo) => blob(aBuf(d), tipo), gzip: (b) => blob(zlib.gzipSync(b._b), 'application/x-gzip'),
           ungzip: (b) => blob(zlib.gunzipSync(b._b)), base64Encode: (d) => aBuf(d).toString('base64'), base64Decode: (s) => conSigno(Buffer.from(String(s), 'base64')) };
}
const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function servidor(fuente){
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); },
    putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n==='Rechazos' ? shR : sh, insertSheet: (n) => n==='Rechazos' ? shR : sh }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty:(k)=>props[k]!=null?props[k]:null, setProperty:(k,v)=>{ props[k]=v; },
      deleteProperty:(k)=>{ delete props[k]; }, setProperties:(o)=>{ Object.assign(props,o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){}, tryLock(){ return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType:{JSON:'json'}, createTextOutput: (t) => ({ _t:t, setMimeType(){ return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext:()=>false }), createFolder: () => ({ getId:()=>'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: hacerUtilities(),
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
                 getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fuente != null ? fuente : fs.readFileSync(GS,'utf8'), ctx);
  const post = (bodyTxt) => ctx.doPost({ postData:{ contents: bodyTxt }, parameter:{} })._t;
  const get = () => ctx.doGet({ parameter:{} })._t;
  const fila = (id) => { const r = sh._datos.find(f => f[0]===id); return r ? ctx.rowToRec_(r) : null; };
  const guardar = (p) => JSON.parse(post(JSON.stringify({ action:'save', pedido:p })));
  const borrar = (id) => { const f = fila(id); return JSON.parse(post(JSON.stringify({ action:'delete', id:id, rev:f ? f.rev : 0 }))); };
  return { ctx, sh, props, post, get, fila, guardar, borrar };
}
/* Un pedido inventado, con productos largos (la planilla tiene que pasar los 20 KB para que valga la pena comprimir). */
function pedido(i, fecha, extra){
  const prods = [];
  for (let k = 0; k < 4; k++) prods.push({ desc:'COLCHON HEAVEN TITANIO LATEX MODELO '+k+' ÑANDÚ', medida:'140x190', codigo:'CH'+(1000+k), cant:1, precio:1500+k });
  return Object.assign({ id:'p'+i, fecha:fecha, oc:'09-'+String(100+i), vendedor:'Carola Chavez', cliente:'CLIENTE INVENTADO '+i+' — Ñuñoa', productos:prods,
    celular:'70000'+String(100+i), turno:(i%2?'PM':'AM'), zona:'Norte', direccion:'Calle inventada '+i, maps:'', pagado:false, saldo:1000, ts:Date.now()-86400000,
    metodoPago:'Efectivo 500 @2026-09-20', observaciones:'Obs 🔒 '+i, estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:String(500+i),
    acuenta:500, facturarA:'', nit:'', nroDia:0, verificado:false, fotos:[] }, extra||{});
}
/* Carga la planilla con N pedidos ESCRITOS DIRECTO en la hoja (como si fueran de antes: el portero de cupos no entra) y sus
   sellos de HACE UNA HORA (fuera del margen de 5 minutos de la de lo cambiado). Fechas de octubre de lunes a sábado. */
const FECHAS = []; for (let d = 5; d <= 24; d++) { const f = '2026-10-' + String(d).padStart(2,'0'); if (new Date(f+'T12:00:00').getDay() !== 0) FECHAS.push(f); }
function poblar(S, n){
  for (let i = 1; i <= n; i++) { const p = pedido(i, FECHAS[i % FECHAS.length]); p.rev = Date.now() - 3600000 - i; S.sh._datos.push(S.ctx.recToRow(p)); }
}
const LIBRE = '2026-10-26';                              // un lunes sin ningún pedido: el portero deja cargar
/* El `fetch` del panel habla con el .gs de Node y ANOTA qué pidió y qué volvió (sin datos: tamaños y marcas). Una regla
   `{act:'list', resp:'<texto>'}` contesta ese texto UNA vez en vez del servidor. */
function INIT(){
  window.__ctl = { rules: [], log: [] };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var ent = { act: act, z: !!P.z, desde: P.desde || null, id: String((P.pedido && P.pedido.id) || P.id || '') };
    window.__ctl.log.push(ent);
    var resp = function(t){
      try{ var j = JSON.parse(t); ent.largo = t.length; ent.zResp = j.z || ''; ent.delta = !!j.delta; ent.n = Array.isArray(j.pedidos) ? j.pedidos.length : null; ent.ahora = j.ahora || null; }catch(e){}
      return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } };
    };
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act) { r.n--; if (r.resp != null) return Promise.resolve(resp(r.resp)); if (r.mode==='drop') return Promise.reject(new TypeError('Failed to fetch')); }
    }
    return window.__gs(body).then(resp);
  };
}
async function preparar(page){
  await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    UNLOCKED=true; CONNECTED=true;
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    window._lecturas=function(){ return window.__ctl.log.filter(function(x){ return x.act==='list'; }); };
  });
}
async function equipo(browser, S, archivo){
  const context = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  await context.exposeFunction('__gs', (body) => S.post(body));
  await context.addInitScript(INIT);
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.__errores = [];
  page.on('pageerror', e => page.__errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date(RELOJ));
  await page.goto('file://' + (archivo || PEDIDOS), { waitUntil:'load' });
  await page.waitForTimeout(350);
  await preparar(page);
  return page;
}
function sacarDeGit(ref, archivo){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lectura-delta-'));
  const dest = path.join(dir, path.basename(archivo));
  fs.writeFileSync(dest, execSync('git show ' + ref + ':' + archivo, { maxBuffer: 64*1024*1024 }));
  if (archivo === 'pedidos.html') fs.writeFileSync(path.join(dir, 'productos-mes.js'), execSync('git show ' + ref + ':productos-mes.js', { maxBuffer: 16*1024*1024 }));
  return dest;
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  // ═══ 1-2. Entera y comprimida; después, solo lo cambiado ════════════════════════════════════════════════════════
  console.log('\n── 1-2. La primera lectura, entera y comprimida; la segunda, solo lo cambiado ──');
  const S = servidor();
  poblar(S, 120);
  const planoLargo = S.post(JSON.stringify({ action:'list' })).length;
  const A = await equipo(browser, S);
  const r1 = await A.evaluate(async () => {
    // la lectura con la que ARRANCA la página (cargaInicial), sin tocar nada
    for (var i=0; i<60 && !(_lecturas().length && STATE.length); i++) await esperar(50);
    await esperar(150);
    var L=_lecturas().slice();
    var B=(typeof LISTA_BASE!=='undefined')?LISTA_BASE:null;
    return { l:L, n:STATE.length, base:!!B, baseN:B?B.orden.length:0,
             p50:(findById('p50')||{}).cliente||'', obs:(findById('p7')||{}).observaciones||'' };
  });
  const l1 = r1 && r1.l[0] || {};
  chk('1. (diente) la lectura con la que arranca la página pide la comprimida (z) y ENTERA (sin `desde`)', r1 && r1.l.length===1 && l1.z===true && !l1.desde, r1 && r1.l);
  chk('1. (diente) …el servidor la manda comprimida y pesa varias veces menos que sin comprimir',
      l1.zResp==='gzip64' && l1.largo>0 && l1.largo*3 < planoLargo, { comprimida:l1.largo, sinComprimir:planoLargo });
  chk('1. …y el panel la abre: los 120 pedidos, con los acentos y los emojis intactos',
      r1 && r1.n===120 && r1.p50==='CLIENTE INVENTADO 50 — Ñuñoa' && r1.obs==='Obs 🔒 7', r1 && { n:r1.n, p50:r1.p50, obs:r1.obs });
  chk('1. (diente) queda la copia para la de lo cambiado (120 filas)', r1 && r1.base===true && r1.baseN===120, r1 && { base:r1.base, n:r1.baseN });

  // Otro equipo cambia el chofer del p5.
  const p5 = S.fila('p5'); p5.chofer = 'Luis Pierre'; const g5 = S.guardar(p5);
  const r2 = await A.evaluate(async () => {
    __ctl.log=[]; var ok=await refrescarEstado(); var L=_lecturas();
    return { ok:ok, l:L, chofer:(findById('p5')||{}).chofer||'', n:STATE.length };
  });
  const l2 = r2 && r2.l[0] || {};
  chk('2. (diente) la segunda lectura pide solo lo cambiado (`desde` = la hora de la anterior)', !!l2.desde && r2.l.length===1, r2 && r2.l);
  chk('2. (diente) …llega chica (una fila: la del p5) y sin comprimir (no vale la pena)', l2.delta===true && l2.n===1 && l2.largo < 6000 && !l2.zResp, l2);
  chk('2. …y el cambio del otro equipo se ve (chofer Luis Pierre), con los 120 pedidos', g5.ok===true && r2 && r2.chofer==='Luis Pierre' && r2.n===120, r2 && { chofer:r2.chofer, n:r2.n });

  // ═══ 3. Un pedido nuevo y uno borrado, en otro equipo ═══════════════════════════════════════════════════════════
  console.log('\n── 3. Lo nuevo y lo borrado de otro equipo llegan por la de lo cambiado ──');
  S.guardar(pedido(900, LIBRE, { cliente:'NUEVO DE OTRO EQUIPO' }));
  const b7 = S.borrar('p7');
  const r3 = await A.evaluate(async () => {
    __ctl.log=[]; await refrescarEstado(); var L=_lecturas();
    return { l:L, nuevo:!!findById('p900'), p7:!!findById('p7'), n:STATE.length };
  });
  const l3 = r3 && r3.l[0] || {};
  chk('3. (diente) una sola lectura, de lo cambiado', r3 && r3.l.length===1 && l3.delta===true, r3 && r3.l);
  chk('3. el pedido nuevo de otro equipo aparece, y el borrado (p7) se va', b7.ok===true && r3 && r3.nuevo===true && r3.p7===false && r3.n===120, r3 && { nuevo:r3.nuevo, p7:r3.p7, n:r3.n });
  chk('3. el servidor anotó el borrado para la de lo cambiado (BORRADOS_RECIENTES)', /"p7"/.test(S.props.BORRADOS_RECIENTES||''), (S.props.BORRADOS_RECIENTES||'').slice(0,120));

  // ═══ 4. Guardado acá, borrado allá: el aviso en el acto ═════════════════════════════════════════════════════════
  console.log('\n── 4. Guardado acá y borrado en otro equipo: «ya no está en la planilla» con la primera lectura ──');
  const r4a = await A.evaluate(async () => {
    var p=JSON.parse(JSON.stringify(findById('p9'))); p.chofer='Giordano'; persistPedido(p); await quieto();
    return { okAhora: SAVE_ULTIMO.p9 && SAVE_ULTIMO.p9.okAhora || null, chofer:(findById('p9')||{}).chofer };
  });
  const b9 = S.borrar('p9');
  await A.waitForTimeout(2300);                         // más que la diferencia de relojes que se tolera (2 s)
  const r4 = await A.evaluate(async () => {
    window._toasts=[]; __ctl.log=[]; await refrescarEstado();
    return { p9:!!findById('p9'), aviso:window._toasts.filter(function(t){ return /ya no está en la planilla/.test(t); })[0]||'',
             sospecha:(typeof BORRADO_CONFIRMA_T!=='undefined') && !!BORRADO_CONFIRMA_T, l:_lecturas().length };
  });
  chk('4. el guardado de acá quedó con la hora de Google (okAhora)', r4a && Number(r4a.okAhora)>0 && r4a.chofer==='Giordano', r4a);
  chk('4. (diente) el otro equipo lo borra: con la PRIMERA lectura sale de la pantalla y se avisa (antes: sospecha y otra lectura a los 25 s)',
      b9.ok===true && r4 && r4.p9===false && /El pedido de CLIENTE INVENTADO 9/.test(r4.aviso) && r4.sospecha===false, r4);

  // ═══ 5. Una lectura VIEJA no saca lo recién guardado ════════════════════════════════════════════════════════════
  console.log('\n── 5. La copia de doGet de ANTES del guardado no saca de la pantalla lo recién guardado ──');
  const viejaGet = S.get();                             // la caché de doGet, leída ANTES del alta
  const r5 = await A.evaluate(async (vieja) => {
    var p={ id:'p950', fecha:'2026-10-26', oc:'09-950', vendedor:'Carola Chavez', cliente:'RECIÉN CARGADO', productos:[{desc:'COLCHON',medida:'',codigo:'',cant:1}],
            celular:'', turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:false, saldo:100, ts:Date.now(), metodoPago:'', observaciones:'', estado:'',
            entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:0, verificado:false, fotos:[] };
    upsert(p); await persistPedido(p); await quieto();
    window._toasts=[];
    __ctl.rules.push({ act:'list', resp:vieja, n:1 });   // Google convirtió la lectura en GET y contestó la caché vieja
    await refrescarEstado();
    var o={ trasVieja:!!findById('p950'), aviso:window._toasts.filter(function(t){ return /ya no está/.test(t); }).length };
    await refrescarEstado();
    o.trasBuena=!!findById('p950');
    return o;
  }, viejaGet);
  chk('5. la lectura vieja (de antes del alta) no lo saca de la pantalla ni avisa nada', r5 && r5.trasVieja===true && r5.aviso===0, r5);
  chk('5. …y la siguiente, buena, lo trae', r5 && r5.trasBuena===true, r5);

  // ═══ 6. La cuenta de control que no da ══════════════════════════════════════════════════════════════════════════
  console.log('\n── 6. Una fila borrada A MANO en la hoja: la cuenta no da y se lee entera ──');
  const iP11 = S.sh._datos.findIndex(f => f[0]==='p11');
  S.sh._datos.splice(iP11, 1);                          // sin pasar por doDelete: no queda anotado
  const r6 = await A.evaluate(async () => {
    __ctl.log=[]; await refrescarEstado(); var L=_lecturas();
    var B=(typeof LISTA_BASE!=='undefined')?LISTA_BASE:null;
    return { l:L, p11:!!findById('p11'), n:STATE.length, baseN:B?B.orden.length:-1 };
  });
  const filasHoja = S.sh._datos.length - 1;
  chk('6. la de lo cambiado no da la cuenta → el panel pide la entera en el acto (dos lecturas: la corta y la entera)',
      r6 && r6.l.length===2 && r6.l[0].delta===true && !r6.l[1].desde, r6 && r6.l);
  chk('6. …y la pantalla queda igual a la planilla: sin el p11', r6 && r6.p11===false && r6.baseN===filasHoja, r6 && { p11:r6.p11, base:r6.baseN, hoja:filasHoja });

  // ═══ 7. Cada 15 minutos, entera ═════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 7. Cada 15 minutos, entera ──');
  const r7 = await A.evaluate(async () => {
    __ctl.log=[]; await refrescarEstado(); var corta=_lecturas()[0]||{};
    if(typeof LISTA_BASE!=='undefined' && LISTA_BASE) LISTA_BASE.t -= 16*60000;
    __ctl.log=[]; await refrescarEstado(); var entera=_lecturas()[0]||{};
    return { corta:corta, entera:entera };
  });
  chk('7. con la copia de hace menos de 15 minutos, lo cambiado; pasados 15, entera', r7 && !!r7.corta.desde && !r7.entera.desde && r7.entera.zResp==='gzip64', r7);

  // ═══ 8. Si la comprimida no se puede abrir ══════════════════════════════════════════════════════════════════════
  console.log('\n── 8. La comprimida que no se puede abrir: sin comprimir ──');
  const r8 = await A.evaluate(async () => {
    if(typeof LISTA_BASE!=='undefined') LISTA_BASE=null; __ctl.log=[];
    __ctl.rules.push({ act:'list', resp:JSON.stringify({ ok:true, version:'2026-09-30-a', z:'gzip64', d:'AAAAbasura' }), n:1 });
    var ok=await refrescarEstado(); var L=_lecturas();
    __ctl.log=[]; await refrescarEstado(); var L2=_lecturas();
    return { ok:ok, l:L, l2:L2, fallo:(typeof LISTA_Z_FALLO!=='undefined')?LISTA_Z_FALLO:null, n:STATE.length };
  });
  chk('8. no se pudo abrir → la vuelve a pedir SIN comprimir y la pantalla queda bien', r8 && r8.ok===true && r8.l.length===2 && r8.l[1].z===false && !r8.l[1].zResp && r8.n>100, r8 && { l:r8.l, n:r8.n });
  chk('8. …y de ahí en más, sin comprimir', r8 && r8.fallo===true && r8.l2.every(function(x){ return x.z===false; }), r8 && r8.l2);
  chk('1-8. sin errores de JavaScript', A.__errores.length===0, A.__errores.slice(0,3));

  // ═══ 9. Con el servidor de antes ════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 9. Con el servidor de antes (2026-09-28-a): como siempre ──');
  let gsViejo = null;
  try { gsViejo = execSync('git show 4ded824:google-apps-script.gs', { maxBuffer: 16*1024*1024 }).toString(); } catch (e) {}
  if (!gsViejo) chk('9. hace falta el .gs de antes (git show 4ded824)', false);
  else {
    const V = servidor(gsViejo); poblar(V, 30);
    const B = await equipo(browser, V);
    const r9 = await B.evaluate(async () => {
      __ctl.log=[]; var ok1=await refrescarEstado(); var ok2=await refrescarEstado();
      return { ok1:ok1, ok2:ok2, l:_lecturas(), base:(typeof LISTA_BASE!=='undefined') && !!LISTA_BASE, n:STATE.length };
    });
    chk('9. el servidor viejo ignora `z` y `desde`: la página lee entera las dos veces, sin copia, y anda',
        r9 && r9.ok1 && r9.ok2 && r9.n===30 && r9.base===false && r9.l.length===2 && !r9.l[1].desde && !r9.l[0].zResp, r9);
    chk('9. sin errores de JavaScript', B.__errores.length===0, B.__errores.slice(0,3));
  }

  // ═══ 10. La página de antes contra el servidor nuevo ═══════════════════════════════════════════════════════════
  console.log('\n── 10. La página de antes (4ded824) contra el servidor nuevo ──');
  let vieja = process.env.VIEJA || null;
  try { if (!vieja) vieja = sacarDeGit('4ded824', 'pedidos.html'); } catch (e) { vieja = null; }
  if (!vieja) chk('10. hace falta la página de antes (git show 4ded824)', false);
  else {
    const N = servidor(); poblar(N, 30);
    const C = await equipo(browser, N, vieja);
    const r10 = await C.evaluate(async () => {
      __ctl.log=[]; var ok=await refrescarEstado();
      var p=JSON.parse(JSON.stringify(findById('p3'))); p.chofer='Luis Pierre'; var res=await persistPedido(p); await quieto();
      await refrescarEstado();
      return { ok:ok, n:STATE.length, guardo:!!(res && res.ok), chofer:(findById('p3')||{}).chofer, l:_lecturas() };
    });
    chk('10. la página vieja lee la planilla entera (sin `z` ni `desde`) y guarda igual que siempre',
        r10 && r10.ok===true && r10.n===30 && r10.guardo && r10.chofer==='Luis Pierre' && N.fila('p3').chofer==='Luis Pierre' && r10.l.every(function(x){ return !x.z && !x.desde; }), r10);
    chk('10. sin errores de JavaScript', C.__errores.length===0, C.__errores.slice(0,3));
  }

  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + PASS + ' bien · ' + (FAIL+1) + ' mal'); process.exit(1); });
