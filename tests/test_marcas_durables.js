/* 🔒 LAS MARCAS NO SE PIERDEN SI SE RECARGA O SE CORTA LA SEÑAL (25/10, auditoría Codex/Astra ORD-1, FLW-2 y ORD-2, §4mk).

   El panel de verdad contra el google-apps-script.gs de verdad (planilla de mentira). Cada caso RECARGA la página en el medio:
   1. ORD-1 · «✅ Verificado» (y los otros cuatro botones que guardaban sin resguardo) con la petición colgada → recargar → llega a
      la planilla. Antes la marca vivía solo en la memoria y en la copia local: recargar la perdía.
   2. FLW-2 · una tilde de la Lista de carga y recargar ANTES de los 700 ms del respiro → llega a la planilla y la ve OTRO aparato.
   3. FLW-2 · con una tilde anterior colgada en el aire, una tilde nueva y recargar → llegan las dos.
   4. ORD-2 · Administración mueve un pedido a un feriado con la clave (forzado) sin señal → al volver la señal se manda FORZADO y
      entra (antes salía de la cola rechazado por «feriado»). Una corrección posterior del mismo pedido NO sale forzada.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_marcas_durables.js     (PEDIDOS=… para correrla contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-10-27T10:00:00-04:00';
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');

/* ── El servidor: el .gs real con un Google de mentira (igual que test_rev5_pedidos.js) ── */
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
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); }, putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; }, removeAll(){} };
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
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  const borrar = (id, rev) => JSON.parse(post(JSON.stringify({ action:'delete', id:id, rev:rev })));
  return { ctx, sh, shR, post, fila, guardar, borrar };
}
const pedido = (o) => Object.assign({
  fecha:'2026-09-17', oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-09-15'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

function INIT(){
  window.__ctl = { rules: [], log: [], holds: {} };
  window.__soltar = function(name){ var f = window.__ctl.holds[name]; if(f){ delete window.__ctl.holds[name]; f(); return true; } return false; };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || P.fotoId || '');
    window.__ctl.log.push({ act: act, id: id });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var real = function(){ return window.__gs(body).then(resp); };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { rule = r; r.n--; break; }
    }
    if (!rule) return real();
    if (rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    if (rule.mode === 'cuelga') return new Promise(function(){});   // la petición se queda colgada: ni llega ni contesta
    if (rule.mode === 'perdida') return window.__gs(body).then(function(){ throw new TypeError('Failed to fetch'); });   // el servidor GRABÓ y la respuesta se perdió
    if (rule.mode === 'tarde') { var pr = window.__gs(body); return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(pr.then(resp)); }; }); }
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  const preparar = async (page) => {
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      await refrescarEstado();
    });
  };
  const abrir = async (S) => {
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(350);
    await preparar(page);
    return page;
  };
  /* Recargar como lo hace la persona (F5): misma pestaña, mismo localStorage. Después la señal vuelve y se manda la cola. */
  const recargar = async (P) => {
    await P.reload({ waitUntil:'load' }); await P.waitForTimeout(350); await preparar(P);
    await P.evaluate(async () => { await flushPending(); await esperar(600); await quieto(); });
  };
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };
  const base = (o) => pedido(Object.assign({ id:'p-ord', cliente:'CLIENTE MARCAS', nota:'5200', fecha:'2026-10-29', ts:TS('2026-10-20') }, o||{}));

  await esc('1. ORD-1: «Verificado» con la petición colgada y recargar', async () => {
    const S = servidor(); S.guardar(base());
    const A = await abrir(S);
    await A.evaluate(async () => { __regla({ act:'save', id:'p-ord', mode:'cuelga' }); toggleVerificado('p-ord'); await esperar(200); try{ closeModal(); }catch(e){} });
    chk('(partida) la planilla todavía no lo tiene', !S.fila('p-ord').verificado);
    await recargar(A);
    chk('1. después de recargar, «Verificado» llegó a la planilla (antes se perdía)', S.fila('p-ord').verificado===true, S.fila('p-ord').verificado);
    const S2 = servidor(); S2.guardar(base({ productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}] }));
    const B = await abrir(S2);
    await B.evaluate(async () => { __regla({ act:'save', id:'p-ord', mode:'cuelga' }); setProdChk('p-ord', 0, 'ok', ''); await esperar(200); try{ closeModal(); }catch(e){} });
    await recargar(B);
    chk('1b. lo mismo con la marca «✔ hay» de un producto', (S2.fila('p-ord').productos[0]||{}).chk==='ok', S2.fila('p-ord').productos[0]);
  });

  await esc('2. FLW-2: una tilde de la carga y recargar antes de los 700 ms', async () => {
    const S = servidor(); S.guardar(base());
    const A = await abrir(S), B = await abrir(S);
    const k = await A.evaluate(() => { var k=cargaChkKey('2026-10-29','Carry','TITANIO LATEX 140x190'); setCargaChk(k, true); return k; });
    await A.reload({ waitUntil:'load' });   // en el medio segundo del respiro
    await A.waitForTimeout(350); await preparar(A);
    await A.evaluate(async () => { await flushPending(); await esperar(600); await quieto(); });
    const enB = await B.evaluate(async (k) => { await refrescarEstado(); await esperar(150); return !!CARGA_CHK[k]; }, k);
    chk('2. la tilde llegó a la planilla y el OTRO aparato la ve (antes quedaba solo en la copia de A)', enB, k);
  });

  await esc('3. FLW-2: con una tilde colgada en el aire, otra tilde y recargar', async () => {
    const S = servidor(); S.guardar(base());
    const A = await abrir(S), B = await abrir(S);
    const ks = await A.evaluate(async () => {
      __regla({ act:'save', id:CARGA_ID, mode:'cuelga' });
      var k1=cargaChkKey('2026-10-29','Carry','TITANIO LATEX 140x190'), k2=cargaChkKey('2026-10-29','Carry','ESPECIAL 140x190');
      setCargaChk(k1, true); await esperar(1200);   // la primera ya salió y quedó colgada
      setCargaChk(k2, true); await esperar(100);
      return [k1, k2];
    });
    await recargar(A);
    const enB = await B.evaluate(async (ks) => { await refrescarEstado(); await esperar(150); return ks.map(function(k){ return !!CARGA_CHK[k]; }); }, ks);
    chk('3. llegan las dos tildes (la colgada y la nueva)', enB[0] && enB[1], enB);
  });

  await esc('4. ORD-2: mover a un feriado con la clave, sin señal, y volver la señal', async () => {
    const S = servidor(); S.guardar(base());
    const A = await abrir(S);
    await A.evaluate(async () => {
      __regla({ act:'save', id:'p-ord', mode:'drop', n:9 });
      var p=findById('p-ord'); reproAplicar(p, '2026-11-02', 'AM', true); await esperar(800); await quieto();
      __ctl.rules=[];
    });
    chk('(partida) sin señal: la planilla sigue con el día de antes', S.fila('p-ord').fecha==='2026-10-29', S.fila('p-ord').fecha);
    await recargar(A);
    const f=S.fila('p-ord');
    chk('4a. al volver la señal se manda FORZADO y entra (antes: rechazado por «feriado» y fuera de la cola)', f.fecha==='2026-11-02', f.fecha);
    const r = await A.evaluate(async () => {
      var p=findById('p-ord'); p.observaciones='OTRA COSA'; __regla({ act:'save', id:'p-ord', mode:'drop', n:9 });
      persistPedido(p); await esperar(600); __ctl.rules=[];
      var q=getPending().filter(function(x){ return x.id==='p-ord'; })[0];
      return { enCola:!!q, forzada:q ? forzarColaEs(q) : null };
    });
    chk('4b. una corrección posterior del mismo pedido que cae a la cola NO sale forzada', r.enCola && r.forzada===false, r);
  });

  chk('sin errores en las páginas', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
