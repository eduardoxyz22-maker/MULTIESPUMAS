/* 💲 UN REINTENTO VIEJO NO VUELVE A PONER LOS PRECIOS DE ANTES (25/10, auditoría Codex/Astra FLW-1, §4mk).

   El caso de la auditoría, con el panel de verdad contra el google-apps-script.gs de verdad (planilla de mentira):
   1. A edita una observación y guarda: el servidor GRABA pero la respuesta se pierde → queda en la cola de A.
   2. B corrige los precios: 1.500 + 1.500 → 2.000 + 1.000 (mismo total).
   3. A reintenta desde la cola: el servidor dice «conflicto». Antes `mismoContenido` no miraba el precio, lo tomaba por
      un «ok tardío» y A se quedaba con el sello de B y SUS precios viejos; al editar solo la dirección, la planilla volvía
      a 1.500 + 1.500. Ahora A ve la fila de B y la planilla queda en 2.000 + 1.000.
   4. Control: sin cambio de B, el mismo reintento sigue siendo un «ok tardío» (no duplica ni avisa «otra persona»).

   Reloj CLAVADO (16/09/2026 10:00 de Bolivia, como test_codex28_flujos). Solo datos sintéticos.
   Se corre:  node tests/test_flw1_precios.js     (PEDIDOS=… para correrla contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';
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
    if (rule.mode === 'perdida') return window.__gs(body).then(function(){ throw new TypeError('Failed to fetch'); });   // el servidor GRABÓ y la respuesta se perdió
    if (rule.mode === 'tarde') { var pr = window.__gs(body); return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(pr.then(resp)); }; }); }
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
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
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
      await refrescarEstado();
    });
    return page;
  };
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };
  const precios = (r) => (r && r.productos || []).map(x => Number(x.precio)||0);
  const base = () => pedido({ id:'p-flw1', cliente:'CLIENTE PRECIOS', nota:'5100', saldo:3000,
    productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:1500},{desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'', cant:1, precio:1500}] });
  /* A edita la observación con el formulario; el servidor graba y la respuesta se pierde. */
  const aEditaObsYSePierde = (A) => A.evaluate(async () => {
    __regla({ act:'save', id:'p-flw1', mode:'perdida' });
    __regla({ act:'save', id:'p-flw1', mode:'drop', n:9 });   // y los reintentos solos tampoco llegan: queda en la cola (la señal volvió recién después)
    editPedido('p-flw1'); await esperar(300);
    var o=document.getElementById('f-obs'); o.value='LLAMAR ANTES'; o.dispatchEvent(new Event('input',{bubbles:true}));
    submitPedido(); await esperar(1500); await quieto(); try{ closeModal(); }catch(e){}
    var n=getPending().filter(function(q){ return String(q.id)==='p-flw1'; }).length;
    __ctl.rules=[];
    return n;
  });

  await esc('1. B corrige los precios mientras A tiene un guardado sin respuesta', async () => {
    const S = servidor();
    const r0 = S.guardar(base());
    chk('(partida) el pedido está en la planilla con 1.500 + 1.500', r0.ok && precios(S.fila('p-flw1')).join('+')==='1500+1500', r0);
    const A = await abrir(S);
    const enCola = await aEditaObsYSePierde(A);
    const f1 = S.fila('p-flw1');
    chk('(partida) el guardado de A llegó a la planilla y quedó en su cola', enCola>=1 && f1.observaciones==='LLAMAR ANTES', { enCola, obs:f1.observaciones });
    const corr = Object.assign({}, f1, { productos:[Object.assign({}, f1.productos[0], {precio:2000}), Object.assign({}, f1.productos[1], {precio:1000})] });
    const rB = S.guardar(corr);
    chk('(partida) B corrigió los precios: 2.000 + 1.000', rB.ok && precios(S.fila('p-flw1')).join('+')==='2000+1000', rB.error);
    const rA = await A.evaluate(async () => {
      window._toasts=[];
      await flushPending(); await esperar(800); await quieto();
      var p=findById('p-flw1');
      return { precios:(p&&p.productos||[]).map(function(x){ return Number(x.precio)||0; }), rev:p&&p.rev, cola:getPending().filter(function(q){ return String(q.id)==='p-flw1'; }).length,
               aviso:window._toasts.filter(function(t){ return /lo modificó otra persona/.test(t); }).length };
    });
    chk('3a. el reintento de A NO se toma por un «ok tardío»: A ve los precios de B (2.000 + 1.000)', rA.precios.join('+')==='2000+1000', rA);
    chk('3b. y se le avisa que otra persona lo cambió', rA.aviso>=1, rA);
    const rA2 = await A.evaluate(async () => {
      editPedido('p-flw1'); await esperar(300);
      var d=document.getElementById('f-direccion'); d.value='CALLE NUEVA 456'; d.dispatchEvent(new Event('input',{bubbles:true}));
      submitPedido(); await esperar(1500); await quieto(); try{ closeModal(); }catch(e){}
      return true;
    });
    const f2 = S.fila('p-flw1');
    chk('3c. A corrige solo la dirección: la planilla SIGUE en 2.000 + 1.000 (antes volvía a 1.500 + 1.500)', precios(f2).join('+')==='2000+1000' && f2.direccion==='CALLE NUEVA 456', { precios:precios(f2), dir:f2.direccion });
  });

  await esc('2. Control: sin cambio de nadie, el reintento sigue siendo un «ok tardío»', async () => {
    const S = servidor();
    S.guardar(base());
    const A = await abrir(S);
    await aEditaObsYSePierde(A);
    const filas0 = S.sh._datos.length;
    const r = await A.evaluate(async () => {
      window._toasts=[];
      await flushPending(); await esperar(800); await quieto();
      return { cola:getPending().filter(function(q){ return String(q.id)==='p-flw1'; }).length,
               aviso:window._toasts.filter(function(t){ return /lo modificó otra persona/.test(t); }).length,
               obs:(findById('p-flw1')||{}).observaciones };
    });
    chk('4a. el reintento idéntico sale de la cola sin avisar «otra persona»', r.cola===0 && r.aviso===0 && r.obs==='LLAMAR ANTES', r);
    chk('4b. y no duplica la fila', S.sh._datos.length===filas0, S.sh._datos.length+' vs '+filas0);
  });

  chk('sin errores en las páginas', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
