/* 02/10/2026, §4hh: pagos, retiros, arqueos, entregas y stock durables.
   HTML y Apps Script reales; planilla ficticia, HTTP bloqueado.
   PEDIDOS y GS permiten comprobar la regresión contra una versión anterior. */
let pw; try { pw=require('playwright'); } catch(e) { pw=require('/opt/node22/lib/node_modules/playwright'); }
const { chromium }=pw;
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');

/* ── El servidor: el .gs real con un Google de mentira ── */
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
  const filaCruda = (id) => { const r = sh._datos.find(f => f[0]===id); return r ? r.slice() : null; };
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  const props_ = () => props;
  return { ctx, sh, shR, post, fila, filaCruda, guardar, props: props_, HDR };
}
/* Un pedido sintético completo (los campos de la planilla). */
const pedido = (o) => Object.assign({
  fecha:'2026-09-17', oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-09-15'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

/* Lo que corre ANTES que el panel, en cada carga. */
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
    window.__ctl.log.push({ act: act, id: id, oc: P.pedido ? P.pedido.oc : undefined });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var real = function(){ return window.__gs(body).then(resp); };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { rule = r; r.n--; break; }
    }
    if (!rule) return real();
    if (rule.mode === 'lose') return window.__gs(body).then(function(){ return { ok:false, status:404, json:function(){ return Promise.reject(new Error('no json')); }, text:function(){ return Promise.resolve('<html>404</html>'); } }; });
    if (rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    if (rule.mode === 'hold') return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(real()); }; });
    if (rule.mode === 'tarde') { var pr = window.__gs(body); return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(pr.then(resp)); }; }); }
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined), args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  /* Un dispositivo contra el servidor S, con el reloj clavado en `reloj`. */
  const abrir = async (S, opts) => {
    opts = opts || {};
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.__dialogos = [];
    page.on('pageerror', e => errores.push(e.message));
    page.__respuestas = [];
    page.on('dialog', d => { page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if (si) d.accept(); else d.dismiss(); });
    await page.clock.setFixedTime(new Date(opts.reloj || RELOJ));
    await page.goto(require('url').pathToFileURL(PEDIDOS).href, { waitUntil:'load' });
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
  const esc = async (titulo, fn) => { if(process.env.QA_CASE && !titulo.includes(process.env.QA_CASE))return; console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };

  /* Abre la venta con ✏️ (desde Mis pedidos), le hace `cambio` y guarda. Devuelve lo que se vio. */
  const editar = (A, id, cambio) => A.evaluate(async (a) => {
    window._toasts=[]; window.__ctl.log=[];
    showView('mis'); await esperar(150);
    editPedido(a.id); await esperar(250);
    var o={ cobradoVisto:(document.getElementById('f-cobrado')||{}).value, metodoVisto:segVal('f-metodo'), bancoVisto:segVal('f-banco'), pagadoVisto:segVal('f-pagado') };
    (new Function(a.cambio))();
    submitPedido(); await esperar(700); await quieto();
    o.enForm=document.getElementById('view-form').classList.contains('active');
    o.guardados=window.__ctl.log.filter(function(x){ return x.act==='save'; }).length;
    o.rojos=window._toasts.filter(function(t){ return /^err/.test(t); });
    o.verdes=window._toasts.filter(function(t){ return /^ok/.test(t); });
    try{ closeModal(); }catch(e){}
    return o;
  }, { id:id, cambio:String(cambio||'').replace(/^[^{]*{|}$/g,'') });


  const llenar = async (A, regla) => A.evaluate(async regla => {
    showView('form'); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar';applyVendedorLite();
    document.getElementById('f-cliente').value='CLIENTE FICTICIO DURABLE';
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Calle ficticia 1';
    document.getElementById('f-nota').value='99001';
    document.getElementById('f-fecha').value='2026-09-21';
    document.getElementById('f-saldo').value='3000';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
    if(regla) __regla(regla);
    __ctl.log=[];_toasts=[];
    document.getElementById('f-submit').click();
    document.getElementById('f-submit').click();
    await esperar(250);
    return {ids:STATE.filter(x=>x.cliente==='CLIENTE FICTICIO DURABLE').map(x=>x.id),
      cola:getPending(), envios:__ctl.log.filter(x=>x.act==='save').length};
  }, regla);


for(const mode of ['hold','tarde']) for(const action of ['pago','arqueo','retiro']) await esc('money reload '+action+' '+mode,async()=>{
 const S=servidor(),A=await abrir(S);await llenar(A);await A.evaluate(async()=>{await quieto()});
 const id=await A.evaluate(()=>STATE.find(p=>p.cliente==='CLIENTE FICTICIO DURABLE').id);
 const pre=await A.evaluate(({id,action,mode})=>{__regla({act:'save',mode,name:'money',n:1});
 if(action==='pago'){showContaModal(id);document.getElementById('cta-pago-monto').value='100';document.getElementById('cta-pago-fecha').value='2026-09-16';document.getElementById('cta-pago-nota').value='QA100';CTA_PAGO={metodo:'Efectivo',banco:'',recibio:'',comps:['IMG']};CTA_TIPO='pago';CTA_FORM_ENV=false;ctaRegistrarPago(id);}
 if(action==='arqueo')setCuadreArqueo('Efectivo','123.45');
 if(action==='retiro'){abrirRetiros();document.getElementById('ret-entrega').value='Mirian Salazar';document.getElementById('ret-retira').value='QA CAJERO';document.getElementById('ret-monto').value='100';RET_FORM.notas=['QA100'];guardarRetiroForm();}
 return {saldo:findById(id).saldo,arqueo:ARQUEO,retiros:RETIROS.map(r=>({id:r.id,monto:r.acuenta})),queue:getPending().length,toasts:_toasts};},{id,action,mode});
 chk('intento monetario respaldado antes de respuesta',pre.queue===1,pre); await A.waitForTimeout(350);console.log('BEFORE',action,mode,JSON.stringify(pre));console.log('REQUESTS',JSON.stringify(await A.evaluate(()=>__ctl.log)));
 await A.reload({waitUntil:'load'});await A.waitForTimeout(1700);
 const post=await A.evaluate(id=>({saldo:findById(id)?.saldo,arqueo:ARQUEO,retiros:RETIROS.map(r=>({id:r.id,monto:r.acuenta})),queue:getPending().length}),id);console.log('AFTER',action,mode,JSON.stringify(post),'SERVER_ROWS',JSON.stringify(S.sh._datos.map(r=>({id:r[0],saldo:r[12],acuenta:r[23],obs:r[16]}))));
 if(action==='arqueo'){await A.evaluate(async()=>{await flushPending();await refrescarEstado()});const B=await abrir(S);const other=await B.evaluate(()=>ARQUEO);console.log('OTHER_DEVICE_ARQUEO',mode,JSON.stringify(other));chk('arqueo reaches other device',Object.values(other).includes(123.45),other);}
 chk('survives reload '+action,action==='pago'?post.saldo===2900:action==='arqueo'?Object.values(post.arqueo).includes(123.45):post.retiros.some(r=>r.monto===100),post);
});for(const mode of ['hold','tarde']) for(const action of ['choEntregado','toggleEntregado','quickEntregado']) await esc('Independent reload during '+action+' '+mode,async()=>{
 const S=servidor(), A=await abrir(S); await llenar(A);await A.evaluate(async()=>{await quieto()});
 const id=await A.evaluate(()=>STATE.find(p=>p.cliente==='CLIENTE FICTICIO DURABLE').id);
 const pre=await A.evaluate(({id,action,mode})=>{__regla({act:'save',mode:mode,name:'delivery',n:1});window[action](id);return {entregado:findById(id).entregado,queue:getPending().length}}, {id,action,mode});
 chk('entrega respaldada antes de respuesta',pre.queue===1,pre); await A.waitForTimeout(250);console.log('BEFORE',action,JSON.stringify(pre));
 await A.reload({waitUntil:'load'});await A.waitForTimeout(1500);
 const post=await A.evaluate(id=>({entregado:findById(id)?.entregado,queue:getPending().length}),id);console.log('AFTER',action,mode,JSON.stringify(post),'SERVER',JSON.stringify(S.fila(id)));
 chk('delivery survives reload '+action,post.entregado===true,post);
 });
 for(const mode of ['hold','tarde']) await esc('stock movement '+mode,async()=>{
 const S=servidor(),A=await abrir(S);
 await A.evaluate(async()=>{STOCK=stockVacio();STOCK.c={f:todayStr(),u:{'TITANIO LATEX|140X190':10},t:Date.now()-1000};STOCK_CARGADO=true;guardarStock();await quieto();});
 const before=await A.evaluate(async mode=>{__regla({act:'save',mode,name:'saving',n:1});abrirStockEntrada();document.getElementById('stk-ent-k').value='TITANIO LATEX|140X190';document.getElementById('stk-ent-u').value='3';guardarStockEntrada();await esperar(150);return {entries:STOCK.e,pending:getPending().length,inflight:Object.keys(SAVE_EN_VUELO)};},mode);
 chk('stock respaldado antes de respuesta',before.pending===1,before); await A.reload({waitUntil:'load'});await A.waitForTimeout(500);
 const after=await A.evaluate(async()=>{await refrescarEstado();await flushPending();await quieto();return {entries:STOCK.e,pending:getPending().length};});
 const srv=JSON.parse(S.fila('__stock__').observaciones);
 console.log('STOCK_RELOAD '+JSON.stringify({mode,before,after,serverEntries:srv.e}));
 chk(mode+' preserves entry',srv.e.filter(x=>x.u===3).length===1 && after.pending===0,{after,server:srv.e});
});
for(const tipo of ['pedido','retiro','stock','arqueo']) await esc('Respuesta anterior conserva versión nueva: '+tipo,async()=>{
  const S=servidor();S.guardar(pedido({id:'fila-qa',saldo:100}));const A=await abrir(S);
  if(tipo==='stock')await A.evaluate(async()=>{STOCK=stockVacio();STOCK.c={f:todayStr(),u:{K:10},t:Date.now()-1000};STOCK_CARGADO=true;await guardarStock();});
  if(tipo==='arqueo')await A.evaluate(async()=>{ARQUEO={'mes|2026-09|Efectivo':1};await guardarArqueo(true);});
  const pre=await A.evaluate(async tipo=>{
    __ctl.log=[];__regla({act:'save',mode:'tarde',name:'uno'});__regla({act:'save',mode:'hold',name:'dos'});
    if(tipo==='pedido'){var p=findById('fila-qa');p.direccion='PRIMERA';persistPedido(p);p.direccion='SEGUNDA';persistPedido(p);}
    if(tipo==='retiro'){var r=filaDeRetiro({id:'__ret_qa__',fecha:todayStr(),entrega:'Mirian Salazar',retira:'QA',monto:10,notas:['QA'],tipo:'retiro',fotos:[],obs:''});persistRetiro(r);var r2=Object.assign({},r,{acuenta:20});persistRetiro(r2);}
    if(tipo==='stock'){STOCK.e.push({id:'e1',f:todayStr(),k:'K',u:1,ts:Date.now()});guardarStock();STOCK.e.push({id:'e2',f:todayStr(),k:'K',u:2,ts:Date.now()});guardarStock();}
    if(tipo==='arqueo'){ARQUEO['mes|2026-09|Efectivo']=2;guardarArqueo(true);ARQUEO['mes|2026-09|Efectivo']=3;guardarArqueo(true);}
    await esperar(200);await flushPending();return {q:getPending(),n:__ctl.log.filter(x=>x.act==='save').length};
  },tipo);
  chk('en vuelo no duplica por vaciar cola',pre.n===1,pre.n);
  await A.evaluate(async()=>{__soltar('uno');await esperar(250);});
  const q=await A.evaluate(()=>getPending());
  chk('confirmación anterior no elimina la corrección nueva',q.length===1,q);
  await A.reload({waitUntil:'load'});await A.waitForTimeout(1200);await A.evaluate(async()=>{await flushPending();await quieto();});
  const r=S.fila(tipo==='pedido'?'fila-qa':tipo==='retiro'?'__ret_qa__':tipo==='stock'?'__stock__':'__arqueo_cuadre__');
  chk('recargar guarda exactamente la última versión',tipo==='pedido'?r.direccion==='SEGUNDA':tipo==='retiro'?r.acuenta===20:tipo==='stock'?JSON.parse(r.observaciones).e.length===2:r.observaciones.includes('Efectivo=3'),r);
  chk('cola confirmada vacía',await A.evaluate(()=>getPending().length===0));
});

for(const tipo of ['stock','arqueo']) await esc('Dos equipos fusionan '+tipo,async()=>{
 const S=servidor(),A=await abrir(S);
 if(tipo==='stock')await A.evaluate(async()=>{STOCK=stockVacio();STOCK.c={f:todayStr(),u:{K:10},t:Date.now()-1000};STOCK_CARGADO=true;await guardarStock();});
 else await A.evaluate(async()=>{ARQUEO={'mes|2026-09|Tarjeta':1};await guardarArqueo(true);});
 const B=await abrir(S);
 await A.evaluate(tipo=>{__regla({act:'save',mode:'hold',name:'a'});if(tipo==='stock'){STOCK.e.push({id:'a',f:todayStr(),k:'K',u:3,ts:Date.now()});guardarStock();}else{ARQUEO['mes|2026-09|Efectivo']=123.45;guardarArqueo(true);}},tipo);
 await B.evaluate(async tipo=>{if(tipo==='stock'){STOCK.e.push({id:'b',f:todayStr(),k:'K',u:5,ts:Date.now()});await guardarStock();}else{ARQUEO['mes|2026-09|QR BISA']=55.25;await guardarArqueo(true);}},tipo);
 await A.evaluate(async()=>{__soltar('a');await quieto();await flushPending();});
 const r=S.fila(tipo==='stock'?'__stock__':'__arqueo_cuadre__');
 chk('conserva las dos operaciones sin duplicarlas',tipo==='stock'?JSON.parse(r.observaciones).e.length===2:r.observaciones.includes('Efectivo=123.45')&&r.observaciones.includes('QR BISA=55.25'),r.observaciones);
 chk('sin reintento pendiente luego de fusionar',await A.evaluate(()=>getPending().length===0));
});

await esc('Conflicto de pagos no cobra ni reintenta dos veces',async()=>{
 const S=servidor();S.guardar(pedido({id:'pago-qa',saldo:100}));const A=await abrir(S),B=await abrir(S);
 await A.evaluate(async()=>{await aplicarCobros(findById('pago-qa'),[{metodo:'Efectivo',monto:30,fecha:todayStr(),nota:'QA30'}]);});
 await B.evaluate(async()=>{await aplicarCobros(findById('pago-qa'),[{metodo:'Efectivo',monto:20,fecha:todayStr(),nota:'QA20'}]);});
 chk('el segundo pago no pisa el primero',S.fila('pago-qa').saldo===70,S.fila('pago-qa').saldo);
 chk('rechazo visible, sin reintento ciego',await B.evaluate(()=>getPending().length===0&&_toasts.some(t=>t.includes('otra persona'))));
});

await esc('Almacenamiento lleno: ningún envío desprotegido',async()=>{
 const S=servidor();S.guardar(pedido({id:'espacio-qa'}));const A=await abrir(S);
 const r=await A.evaluate(async()=>{
   __ctl.log=[];const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===LS_PEND)throw new Error('QuotaExceededError');return set.call(this,k,v);};
   const p=findById('espacio-qa');p.entregado=true;const a=await persistPedido(p);
   const b=await guardarArqueo(true);const c=await guardarStock();const d=await persistRetiro(filaDeRetiro({id:'__ret_espacio__',fecha:todayStr(),entrega:'QA',retira:'QA',monto:10,notas:['QA'],tipo:'retiro',fotos:[],obs:''}));
   Storage.prototype.setItem=set;return {r:[a,b,c,d],n:__ctl.log.filter(x=>x.act==='save').length,t:_toasts};
 });
 chk('no manda sin respaldo verificado',r.n===0,r);
 chk('avisa almacenamiento; no promete cola',r.r.every(x=>x.error==='almacenamiento'&&x.local===false)&&r.t.some(t=>t.includes('NO se envió')),r);
});

await esc('Alta de retiro sin respuesta, corrección y recarga',async()=>{
 const S=servidor(),A=await abrir(S);
 await A.evaluate(async()=>{__regla({act:'save',mode:'tarde',name:'alta'});var r=filaDeRetiro({id:'__ret_altaqa__',fecha:todayStr(),entrega:'QA',retira:'QA',monto:10,notas:['QA'],tipo:'retiro',fotos:[],obs:''});persistRetiro(r);await esperar(200);persistRetiro(Object.assign({},r,{acuenta:20}));});
 await A.reload({waitUntil:'load'});await A.waitForTimeout(1200);await A.evaluate(async()=>{await flushPending();await quieto();});
 chk('reconoce alta propia y guarda corrección sin duplicar',S.fila('__ret_altaqa__').acuenta===20&&S.sh._datos.filter(r=>r[0]==='__ret_altaqa__').length===1,S.fila('__ret_altaqa__'));
 chk('limpia solo la corrección confirmada',await A.evaluate(()=>getPending().length===0));
});

await esc('Rechazo firme y servidor ocupado',async()=>{
 const S=servidor();S.guardar(pedido({id:'rechazo-qa'}));const A=await abrir(S);
 const r=await A.evaluate(async()=>{
   const post=apiPost;apiPost=function(body){if(body.action==='save')return Promise.resolve({ok:false,error:'feriado'});return post(body);};
   const p=findById('rechazo-qa');p.entregado=true;const firme=await persistPedido(p),nF=getPending().length;
   apiPost=function(body){if(body.action==='save')return Promise.resolve({ok:false,error:'busy'});return post(body);};
   const otro=findById('rechazo-qa');otro.entregado=true;const busy=await persistPedido(otro),nB=getPending().length;
   apiPost=post;return {firme,nF,busy,nB};
 });
 chk('rechazo definitivo no queda reintentándose',r.firme.error==='feriado'&&r.nF===0,r);
 chk('busy conserva el intento pendiente',r.busy.error==='busy'&&r.nB===1,r);
});

await esc('Doble toque no duplica pago, retiro ni entrada',async()=>{
 const S=servidor(),A=await abrir(S);await llenar(A);await A.evaluate(async()=>{await quieto();});
 const id=await A.evaluate(()=>{
  var id=STATE.find(p=>p.cliente==='CLIENTE FICTICIO DURABLE').id;
  showContaModal(id);document.getElementById('cta-pago-monto').value='100';document.getElementById('cta-pago-fecha').value='2026-09-16';document.getElementById('cta-pago-nota').value='QA100';CTA_PAGO={metodo:'Efectivo',banco:'',recibio:'',comps:['IMG']};CTA_TIPO='pago';CTA_FORM_ENV=false;return id;
 });
 // Clics reales: el primer toque cambia el DOM. Invocar a mano el handler de un botón
 // ya quitado no representa un segundo toque del usuario.
 await A.locator('button[onclick^="ctaRegistrarPago("]').dblclick();await A.evaluate(async()=>{await quieto();});
 await A.evaluate(()=>{closeModal();abrirRetiros();document.getElementById('ret-entrega').value='Mirian Salazar';document.getElementById('ret-retira').value='QA';document.getElementById('ret-monto').value='100';RET_FORM.notas=['QA'];});
 await A.locator('button[onclick="guardarRetiroForm()"]').dblclick();await A.evaluate(async()=>{await quieto();});
 await A.evaluate(async()=>{STOCK=stockVacio();STOCK.c={f:todayStr(),u:{'TITANIO LATEX|140X190':10},t:Date.now()-1000};STOCK_CARGADO=true;await guardarStock();abrirStockEntrada();document.getElementById('stk-ent-k').value='TITANIO LATEX|140X190';document.getElementById('stk-ent-u').value='3';});
 await A.locator('button[onclick="guardarStockEntrada()"]').dblclick();await A.evaluate(async()=>{await quieto();});
 const r=await A.evaluate(()=>({retiros:RETIROS.length,entradas:STOCK.e.length}));
 chk('un único pago de 100',S.fila(id).saldo===2900,S.fila(id).saldo);
 chk('un único retiro',r.retiros===1,r.retiros);
 chk('una única llegada',r.entradas===1,r.entradas);
});

chk('sin errores JavaScript',errores.length===0,errores); await browser.close();console.log(PASS+' bien / '+FAIL+' mal');process.exit(FAIL?1:0);})();
