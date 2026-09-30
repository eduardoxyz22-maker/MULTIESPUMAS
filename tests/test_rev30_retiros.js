/* 💵 RETIROS DE EFECTIVO DE LA REVISIÓN EN TRES NIVELES (30/09, bitácora §4hd, RESPUESTA §22-§23): R2-5, R2-3 y R2-2.

   El panel real contra el google-apps-script.gs REAL (2026-09-28-a) corriendo en Node con una planilla de mentira, y dos
   equipos (A y B) cuando hace falta. Reloj clavado en el martes 29/09/2026 a las 10:00. Solo datos inventados.

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 29/09, `2207922`):
   1. R2-5 — abrir el panel SIN conexión:
      a. (diente) los retiros no desaparecen: se ve el que ya estaba y el que espera en la cola, este con «⏳ todavía no está en
         la planilla»;
      b. (diente) cargar el mismo retiro otra vez pregunta «YA HAY UN RETIRO IGUAL» (antes no lo veía y no avisaba);
      c. (diente) …y al volver la señal la planilla tiene UN retiro de 400, no dos (a la vendedora no se le descuenta dos veces);
      d. (diente) el aviso de duplicado mira también la cola, aunque la lista no lo muestre.
   2. R2-3 (diente) — un retiro que quedó en la cola («servidor ocupado») y se corrigió enseguida con conexión: a los 2 minutos
      la cola ya NO manda la versión vieja (antes el monto volvía de 500 a 400 sin aviso).
   3. R2-2 (diente) — corregir un retiro que otro equipo BORRÓ mientras estaba abierto ✏️ no lo vuelve a crear (antes volvía, y
      el efectivo se restaba otra vez), y se dice.

   Se corre:  node tests/test_rev30_retiros.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2207922.html node tests/test_rev30_retiros.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
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
      setValues: (v) => { for(let i=0;i<v.length;i++) datos[fila-1+i]=v[i].slice(); },
      setFontWeight: () => {}
    })
  };
}
function servidor(){
  const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
    '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
    'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); },
    putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; }, removeAll(ks){ (ks||[]).forEach(k=>{ delete this._m[k]; }); },
    getAll(ks){ const o={}; (ks||[]).forEach(k=>{ if(Object.prototype.hasOwnProperty.call(this._m,k)) o[k]=this._m[k]; }); return o; } };
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
    Utilities: { formatDate: (d)=>String(d), base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
                 getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS,'utf8'), ctx);
  const post = (bodyTxt) => ctx.doPost({ postData:{ contents: bodyTxt }, parameter:{} })._t;
  const fila = (id) => { const r = sh._datos.find(f => f[0]===id); return r ? ctx.rowToRec_(r) : null; };
  const guardar = (p) => JSON.parse(post(JSON.stringify({ action:'save', pedido:p })));
  const retiros = () => sh._datos.filter(f => String(f[0]).indexOf('__ret_')===0).map(f => ctx.rowToRec_(f));
  return { ctx, sh, post, fila, guardar, retiros };
}
/* El `fetch` del panel habla con el .gs de Node. Reglas: `drop` = sin señal, `busy` = «servidor ocupado». Con
   localStorage «__SIN_SENAL» = '1' se corta todo desde el arranque (para recargar la página sin conexión). */
function INIT(){
  window.__ctl = { rules: [], log: [] };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  try{ if(localStorage.getItem('__SIN_SENAL')==='1'){ window.__ctl.rules.push({act:'list', mode:'drop', n:999}); window.__ctl.rules.push({act:'save', mode:'drop', n:999}); } }catch(e){}
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || '');
    window.__ctl.log.push({ act: act, id: id, monto: P.pedido ? P.pedido.acuenta : undefined });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { rule = r; r.n--; break; }
    }
    if (rule && rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    if (rule && rule.mode === 'busy') return Promise.resolve(resp(JSON.stringify({ ok:false, error:'busy' })));
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
    /* Anotar un retiro desde la ventana, como Contabilidad. */
    window._anotarRetiro=async function(entrega, monto, nota){
      abrirRetiros(); await esperar(100);
      var R=RET_FORM; R.entrega=entrega; R.retira='Contabilidad'; R.monto=String(monto); R.notas=[String(nota)]; R.fecha=todayStr();
      renderRetiros(); await esperar(50); document.getElementById('ret-entrega').value=entrega;
      guardarRetiroForm(); await esperar(1500); await quieto();
    };
    window._ret=function(){ return RETIROS.map(function(r){ return r.vendedor+' '+r.acuenta; }).sort(); };
    window._colaRet=function(){ return getPending().filter(function(p){ return String(p.id).indexOf('__ret_')===0; }).map(function(p){ return p.vendedor+' '+p.acuenta; }).sort(); };
  });
}
async function equipo(browser, S){
  const context = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  await context.exposeFunction('__gs', (body) => S.post(body));
  await context.addInitScript(INIT);
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.__errores = []; page.__dialogos = [];
  page.on('pageerror', e => page.__errores.push(e.message));
  page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date(RELOJ));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await preparar(page);
  await page.evaluate(async () => { await refrescarEstado(); });
  return page;
}
const retViejo = { id:'__ret_viejo1__', fecha:'', turno:'', vendedor:'Carola Chavez', productos:[], cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR',
  celular:'', zona:'FACTURADO', direccion:'Retiro del 28/09/2026', maps:'', pagado:false, saldo:0, ts:new Date('2026-09-28T12:00:00-04:00').getTime(),
  metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'Contabilidad', garantia:'', nota:'11', acuenta:300, facturarA:'', nit:'',
  nroDia:0, verificado:false, fotos:[] };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  // ═══ 1. R2-5: abrir el panel sin conexión ═════════════════════════════════════════════════════════════════════
  console.log('\n── 1. Abrir el panel sin conexión: los retiros no desaparecen y el duplicado se avisa ──');
  const S1 = servidor();
  S1.guardar(retViejo);
  const A = await equipo(browser, S1);
  const r1 = await A.evaluate(async () => {
    var o={ conSenal:_ret() };
    localStorage.setItem('__SIN_SENAL','1'); window.__ctl.rules.push({act:'list', mode:'drop', n:999}); window.__ctl.rules.push({act:'save', mode:'drop', n:999});
    await _anotarRetiro('Maria Flores', 400, 77);
    o.cola=_colaRet(); o.pantalla=_ret();
    return o;
  });
  chk('1. con señal se ve el retiro de Carola (300); sin señal se anota uno de 400 de Maria Flores, que queda en la cola',
      r1 && JSON.stringify(r1.conSenal)==='["Carola Chavez 300"]' && JSON.stringify(r1.cola)==='["Maria Flores 400"]', r1);
  await A.reload({ waitUntil:'load' });
  await A.waitForTimeout(1200);
  await preparar(A);
  const r1b = await A.evaluate(async () => {
    var o={ pantalla:_ret(), cola:_colaRet(), copia:JSON.parse(localStorage.getItem(LS_RETIROS)||'[]').length };
    abrirRetiros(); await esperar(150);
    var filas=[].slice.call(document.querySelectorAll('#retiros-overlay tr')).map(function(tr){ return tr.innerText.replace(/\s+/g,' '); });
    o.fila400=filas.filter(function(t){ return /400/.test(t) && /Maria/.test(t); })[0]||'';
    o.fila300=filas.filter(function(t){ return /300/.test(t) && /Carola/.test(t); })[0]||'';
    // lo vuelve a cargar igual, sin darse cuenta: el panel tiene que preguntar (y la persona dice «no, es el mismo»)
    var dlg=[]; var _c=window.confirm; window.confirm=function(m){ dlg.push(String(m)); return false; };
    await _anotarRetiro('Maria Flores', 400, 77);
    window.confirm=_c;
    o.pregunto=dlg.filter(function(m){ return /YA HAY UN RETIRO IGUAL/.test(m); }).length;
    o.colaTras=_colaRet();
    return o;
  });
  chk('1a. (diente) recargado sin señal: se ven los DOS retiros (el de la planilla y el de la cola), y la copia del equipo no se vació',
      r1b && JSON.stringify(r1b.pantalla)==='["Carola Chavez 300","Maria Flores 400"]' && r1b.copia===2, r1b && { pantalla:r1b.pantalla, copia:r1b.copia, cola:r1b.cola });
  chk('1a. (diente) …el de la cola dice «⏳ todavía no está en la planilla», y el otro no',
      r1b && /todavía no está en la planilla/.test(r1b.fila400) && !/todavía no está en la planilla/.test(r1b.fila300), r1b && { fila400:r1b.fila400, fila300:r1b.fila300 });
  chk('1b. (diente) cargarlo de nuevo pregunta «YA HAY UN RETIRO IGUAL» (y si dice que no, no se agrega nada a la cola)',
      r1b && r1b.pregunto===1 && JSON.stringify(r1b.colaTras)==='["Maria Flores 400"]', r1b && { pregunto:r1b.pregunto, colaTras:r1b.colaTras });
  const r1c = await A.evaluate(async () => {
    localStorage.removeItem('__SIN_SENAL'); window.__ctl.rules=[]; CARGA_GEN++;
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    closeRetiros(); await flushPending(); await esperar(300); await quieto(); await refrescarEstado();
    return { pantalla:_ret(), cola:_colaRet() };
  });
  const planilla1 = S1.retiros().map(r => r.vendedor+' '+r.acuenta).sort();
  chk('1c. (diente) vuelve la señal: la planilla tiene UN retiro de 400 de Maria Flores (y el de Carola), no dos',
      JSON.stringify(planilla1)==='["Carola Chavez 300","Maria Flores 400"]' && r1c && r1c.cola.length===0, { planilla:planilla1, pantalla:r1c && r1c.pantalla });
  const r1d = await A.evaluate(async () => {
    // Otra vez sin señal: un retiro nuevo a la cola, y la lista (por lo que sea) no lo muestra: el aviso mira la cola igual.
    window.__ctl.rules.push({act:'list', mode:'drop', n:999}); window.__ctl.rules.push({act:'save', mode:'drop', n:999});
    await _anotarRetiro('Isabel Robledo', 250, 90);
    var enCola=_colaRet();
    RETIROS=RETIROS.filter(function(r){ return !(r.vendedor==='Isabel Robledo'); });
    var dlg=[]; var _c=window.confirm; window.confirm=function(m){ dlg.push(String(m)); return false; };
    await _anotarRetiro('Isabel Robledo', 250, 90);
    window.confirm=_c; window.__ctl.rules=[];
    closeRetiros();
    return { enCola:enCola, pregunto:dlg.filter(function(m){ return /YA HAY UN RETIRO IGUAL/.test(m); }).length, cola:_colaRet() };
  });
  chk('1d. (diente) el aviso de duplicado mira también la cola aunque la lista no lo muestre',
      r1d && JSON.stringify(r1d.enCola)==='["Isabel Robledo 250"]' && r1d.pregunto===1 && JSON.stringify(r1d.cola)==='["Isabel Robledo 250"]', r1d);
  chk('1. sin errores de JavaScript en el equipo A', A.__errores.length===0, A.__errores.slice(0,3));

  // ═══ 2. R2-3: la versión vieja de la cola no pisa la corrección ══════════════════════════════════════════════
  console.log('\n── 2. Un retiro corregido con conexión no vuelve al monto viejo que quedó en la cola ──');
  const S2 = servidor();
  const B = await equipo(browser, S2);
  const r2 = await B.evaluate(async () => {
    var o={};
    window._toasts=[]; window.__ctl.log=[];
    __regla({ act:'save', mode:'busy', n:1 });                           // el alta recibe «servidor ocupado» y queda en la cola
    await _anotarRetiro('Carola Chavez', 400, 31);
    var id=(RETIROS.filter(function(r){ return r.vendedor==='Carola Chavez'; })[0]||{}).id; o.id=id;
    o.colaAlta=_colaRet();
    editarRetiro(id); await esperar(50);
    document.getElementById('ret-monto').value='500'; guardarRetiroForm(); await esperar(1500); await quieto();
    o.colaTrasCorregir=_colaRet();
    closeRetiros(); await esperar(50);
    return o;
  });
  const medio2 = r2 && S2.fila(r2.id);
  const r2b = await B.evaluate(async (id) => { window._toasts=[]; await autoRefrescar('tic'); await esperar(600); await quieto();
    return { pantalla:(RETIROS.filter(function(x){ return x.id===id; })[0]||{}).acuenta, cola:_colaRet() }; }, r2 && r2.id);
  const fin2 = r2 && S2.fila(r2.id);
  chk('2. el alta de 400 quedó en la cola y la corrección a 500 entró a la planilla', r2 && JSON.stringify(r2.colaAlta)==='["Carola Chavez 400"]' && medio2 && Number(medio2.acuenta)===500,
      { cola:r2 && r2.colaAlta, planilla:medio2 && medio2.acuenta });
  chk('2. (diente) …y al entrar la corrección, la versión vieja (400) salió de la cola', r2 && r2.colaTrasCorregir.length===0, r2 && r2.colaTrasCorregir);
  chk('2. (diente) a los 2 minutos la planilla sigue en 500 (antes volvía a 400 sin aviso), y la pantalla también',
      fin2 && Number(fin2.acuenta)===500 && r2b && Number(r2b.pantalla)===500 && r2b.cola.length===0, { planilla:fin2 && fin2.acuenta, pantalla:r2b && r2b.pantalla, cola:r2b && r2b.cola });
  chk('2. sin errores de JavaScript en el equipo B', B.__errores.length===0, B.__errores.slice(0,3));

  // ═══ 3. R2-2: corregir un retiro que otro equipo borró ════════════════════════════════════════════════════════
  console.log('\n── 3. Corregir un retiro que otro equipo borró mientras estaba abierto ✏️ no lo vuelve a crear ──');
  const S3 = servidor();
  const C = await equipo(browser, S3), D = await equipo(browser, S3);
  await D.evaluate(async () => {
    var f=filaDeRetiro({ id:'__ret_r22__', fecha:todayStr(), entrega:'Carola Chavez', retira:'Contabilidad', monto:400, notas:['22'], tipo:'Facturado', fotos:[], obs:'' });
    await persistRetiro(f); await quieto();
  });
  const r3a = await C.evaluate(async () => { await refrescarEstado(); abrirRetiros(); await esperar(100); editarRetiro('__ret_r22__'); await esperar(100);
    return { visto:RETIROS.some(function(r){ return r.id==='__ret_r22__'; }) }; });
  await D.evaluate(async () => { await refrescarEstado(); await esperar(100); abrirRetiros(); await esperar(100); borrarRetiro('__ret_r22__'); await esperar(1500); await quieto(); });
  const borrado3 = !S3.fila('__ret_r22__');
  const r3 = await C.evaluate(async () => {
    await refrescarEstado(); await esperar(100);                     // una lectura con la ventana abierta (la de otro guardado, la de cupos…)
    var o={ sigueEnLista:RETIROS.some(function(r){ return r.id==='__ret_r22__'; }) };
    window._toasts=[]; window.__ctl.log=[];
    document.getElementById('ret-monto').value='500'; var ok=guardarRetiroForm(); await esperar(1500); await quieto();
    o.devolvio=ok; o.mando=window.__ctl.log.filter(function(x){ return x.act==='save' && x.id==='__ret_r22__'; }).length;
    o.aviso=window._toasts.filter(function(t){ return /ya no está en la lista/.test(t); })[0]||'';
    o.formVacio=!RET_FORM.id;
    return o;
  });
  const vuelta3 = S3.fila('__ret_r22__');
  chk('3. A abrió ✏️ el retiro de 400, B lo borró de la planilla, y la lectura de A ya no lo trae',
      r3a && r3a.visto && borrado3 && r3 && !r3.sigueEnLista, { visto:r3a && r3a.visto, borrado:borrado3, sigue:r3 && r3.sigueEnLista });
  chk('3. (diente) guardar la corrección NO lo vuelve a crear en la planilla (antes volvía con 500)', !vuelta3 && r3 && r3.mando===0, { enPlanilla:vuelta3 && vuelta3.acuenta, mando:r3 && r3.mando });
  chk('3. (diente) …y lo dice: «Ese retiro ya no está en la lista: lo borraron desde otro equipo…», con el formulario limpio',
      r3 && /lo borraron desde otro equipo/.test(r3.aviso) && r3.formVacio, r3 && { aviso:r3.aviso, formVacio:r3.formVacio });
  chk('3. sin errores de JavaScript en los equipos C y D', C.__errores.length===0 && D.__errores.length===0, C.__errores.concat(D.__errores).slice(0,3));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
