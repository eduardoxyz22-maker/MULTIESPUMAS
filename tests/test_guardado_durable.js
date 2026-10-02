/* 02/10/2026, §4hg. Tres regresiones reproducidas por Codex y autorizadas por el dueño:
   guardar + recargar sin respuesta, reemplazar el pedido nuevo y reintentar sin éxito.
   Página y .gs reales; datos FICTICIOS, fetch sustituido por doPost en memoria y HTTP bloqueado.
   node tests/test_guardado_durable.js (PEDIDOS=... permite probar contra el archivo anterior).
   El reloj de los casos está fijo en 16/09/2026; no se usan fechas relativas al día de ejecución. */
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
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };

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
  for(const mode of ['hold','tarde']){
    await esc('1. Recargar '+(mode==='hold'?'ANTES de llegar al servidor':'DESPUÉS de guardar, sin recibir la respuesta'),async()=>{
      const S=servidor(), A=await abrir(S);
      const antes=await llenar(A,{act:'save',mode,name:'envio',n:1});
      chk('el intento se conserva ANTES de recibir respuesta',antes.cola.length===1 && antes.cola[0].id===antes.ids[0],antes);
      chk('doble clic manda una sola solicitud',antes.envios===1,antes.envios);
      await A.evaluate(async()=>{await flushPending();});
      const enVuelo=await A.evaluate(()=>__ctl.log.filter(x=>x.act==='save').length);
      chk('la cola no duplica el envío que sigue en vuelo',enVuelo===1,enVuelo);
      await A.reload({waitUntil:'load'});
      await A.waitForFunction(()=>getPending().length===0 && !Object.keys(SAVE_EN_VUELO).length,{},{timeout:15000});
      await A.evaluate(()=>refrescarEstado());
      const luego=await A.evaluate(()=>({ids:STATE.filter(x=>x.cliente==='CLIENTE FICTICIO DURABLE').map(x=>x.id),cola:getPending().length}));
      const filas=S.sh._datos.filter(f=>f[4]==='CLIENTE FICTICIO DURABLE');
      chk('tras recargar llega UNA fila, con el MISMO id',filas.length===1 && filas[0][0]===antes.ids[0],filas.map(f=>f[0]));
      chk('la pantalla lo recupera y la cola confirmada se limpia',luego.ids.length===1 && luego.ids[0]===antes.ids[0] && luego.cola===0,luego);
      chk('se conservan saldo y dirección',S.fila(antes.ids[0])?.saldo===3000 && S.fila(antes.ids[0])?.direccion==='Calle ficticia 1',S.fila(antes.ids[0])?.saldo);
    });
  }
  await esc('2. Corregir un pedido y recargar durante el envío',async()=>{
    const S=servidor();S.guardar(pedido({id:'edicion',oc:'09-201',direccion:'ANTES'}));const A=await abrir(S);
    await A.evaluate(async()=>{
      editPedido('edicion');await esperar(150);
      document.getElementById('f-direccion').value='DESPUÉS FICTICIO';
      __regla({act:'save',mode:'hold',name:'editar',n:1});
      document.getElementById('f-submit').click();await esperar(250);
    });
    const q=await A.evaluate(()=>getPending());
    chk('la edición guarda su revisión de origen en la cola',q.length===1 && q[0].rev>0 && q[0].direccion==='DESPUÉS FICTICIO',q.map(x=>({id:x.id,rev:x.rev})));
    await A.reload({waitUntil:'load'});await A.waitForFunction(()=>getPending().length===0 && !Object.keys(SAVE_EN_VUELO).length,{},{timeout:15000});
    chk('la edición se recupera sin duplicar y sin tocar el saldo',S.fila('edicion').direccion==='DESPUÉS FICTICIO' && S.fila('edicion').saldo===3000 && S.sh._datos.filter(f=>f[0]==='edicion').length===1,S.fila('edicion').direccion);
  });
  for(const error of ['dia_cerrado','cupos_llenos','oc_repetida','feriado','busy']){
    await esc('3. Respuesta definitiva '+error,async()=>{
      const S=servidor(), original=S.post;
      S.post=body=>JSON.parse(body).action==='save'?JSON.stringify({ok:false,error,fecha:'2026-09-21',turno:'AM',oc:'09-001',nombre:'Feriado ficticio'}):original(body);
      const A=await abrir(S);await llenar(A);
      await A.waitForFunction(()=>!document.getElementById('f-submit').disabled,{},{timeout:15000});
      const r=await A.evaluate(()=>({cola:getPending().length,cliente:document.getElementById('f-cliente').value,toasts:_toasts}));
      chk('el rechazo no queda reintentándose en la cola',r.cola===0,r);
      chk('el formulario conserva los datos para corregirlos',r.cliente==='CLIENTE FICTICIO DURABLE',r.cliente);
      chk('no anuncia éxito ni escribe la venta',!r.toasts.some(x=>/^ok:/.test(x)) && !S.sh._datos.some(f=>f[4]==='CLIENTE FICTICIO DURABLE'),r.toasts);
    });
  }
  await esc('4. La confirmación no borra una corrección más nueva',async()=>{
    const S=servidor(),A=await abrir(S);const a=await llenar(A,{act:'save',mode:'hold',name:'vieja',n:1});
    const r=await A.evaluate(async()=>{
      const q=JSON.parse(JSON.stringify(getPending()[0] || STATE.find(p=>p.cliente==='CLIENTE FICTICIO DURABLE')));q.direccion='CORRECCIÓN MÁS NUEVA';queuePending(q);
      flushPending=()=>Promise.resolve(); // aislar la retirada de la foto confirmada, sin mandar aún la nueva
      __soltar('vieja');await quieto();
      return getPending().map(p=>({id:p.id,direccion:p.direccion}));
    });
    chk('queda en cola exactamente la corrección posterior',r.length===1 && r[0].id===a.ids[0] && r[0].direccion==='CORRECCIÓN MÁS NUEVA',r);
  });
  await esc('5. Sin almacenamiento local no se inicia un envío desprotegido',async()=>{
    const S=servidor(),A=await abrir(S);
    await A.evaluate(()=>{const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===LS_PEND)throw new Error('quota');return orig.call(this,k,v)};});
    await llenar(A);
    const r=await A.evaluate(()=>({n:__ctl.log.filter(x=>x.act==='save').length,cliente:document.getElementById('f-cliente').value,toasts:_toasts,apagado:document.getElementById('f-submit').disabled}));
    chk('no sale a la red si no pudo respaldar',r.n===0,r);
    chk('avisa, conserva el formulario y permite corregir',r.cliente==='CLIENTE FICTICIO DURABLE' && !r.apagado && r.toasts.some(x=>/copia segura/.test(x)),r);
  });
  await esc('6. Pedido NUEVO: cancelar y aceptar antes de abrir otra edición',async()=>{
    const S=servidor();S.guardar(pedido({id:'otra',oc:'09-202',cliente:'OTRA VENTA FICTICIA'}));const A=await abrir(S);
    await A.evaluate(()=>{showView('form');resetForm();document.getElementById('f-cliente').value='BORRADOR FICTICIO';document.querySelector('.prod-desc').value='ALMOHADA';showView('mis');});
    A.__respuestas.push(false);
    await A.evaluate(()=>editPedido('otra'));
    let r=await A.evaluate(()=>({cliente:document.getElementById('f-cliente').value,producto:document.querySelector('.prod-desc').value,id:EDIT_ID,enForm:document.getElementById('view-form').classList.contains('active')}));
    chk('Cancelar vuelve al borrador con todos los campos intactos',r.cliente==='BORRADOR FICTICIO' && r.producto==='ALMOHADA' && !r.id && r.enForm,r);
    chk('la pregunta explica las dos opciones',A.__dialogos.some(x=>/Aceptar:/.test(x)&&/Cancelar:/.test(x)),A.__dialogos);
    A.__respuestas.push(true);await A.evaluate(()=>editPedido('otra'));
    r=await A.evaluate(()=>({cliente:document.getElementById('f-cliente').value,id:EDIT_ID}));
    chk('Aceptar abre la venta elegida sin escribir ni modificarla',r.cliente==='OTRA VENTA FICTICIA' && r.id==='otra' && S.fila('otra').cliente==='OTRA VENTA FICTICIA',r);
    await A.evaluate(()=>resetForm());A.__dialogos.length=0;await A.evaluate(()=>editPedido('otra'));
    chk('el formulario vacío no pregunta',A.__dialogos.length===0,A.__dialogos);
    await A.evaluate(()=>{resetForm();document.getElementById('f-cliente').value='BORRADOR KOMMO FICTICIO';BORRADORES.push({id:'kommo-991',cliente:'DE KOMMO',productos:[]});});
    A.__respuestas.push(false);await A.evaluate(()=>completarBorrador('kommo-991'));
    const k=await A.evaluate(()=>document.getElementById('f-cliente').value);
    chk('Completar desde Kommo respeta la misma cancelación',k==='BORRADOR KOMMO FICTICIO',k);
  });
  for(const tipo of ['red','rechazo','bien']){
    await esc('7. El pie informa el resultado real: '+tipo,async()=>{
      const S=servidor();if(tipo==='rechazo'){const original=S.post;S.post=b=>JSON.parse(b).action==='save'?JSON.stringify({ok:false,error:'feriado',fecha:'2026-09-21',nombre:'FICTICIO'}):original(b);}
      const A=await abrir(S);
      await A.evaluate(tipo=>{queuePending({id:'cola-991',cliente:'COLA FICTICIA',vendedor:'Carola Chavez',fecha:'2026-09-21',productos:[{desc:'ALMOHADA',cant:1}]});if(tipo==='red')__regla({act:'save',mode:'drop',n:20});_toasts=[];window.__retry=null;const old=misReintentarCola;misReintentarCola=function(){return __retry=old();};document.querySelector('#footer a').click();},tipo);
      await A.evaluate(async()=>{await __retry;await quieto();});
      const r=await A.evaluate(()=>({cola:getPending().length,toasts:_toasts}));
      if(tipo==='red') chk('sin red dice pendiente, nunca éxito',r.cola===1 && !r.toasts.some(x=>/^ok:/.test(x)) && r.toasts.some(x=>/cola/.test(x)),r);
      if(tipo==='rechazo') chk('rechazado NO dice que llegó aunque la cola quede vacía',r.cola===0 && !r.toasts.some(x=>/^ok:/.test(x)) && r.toasts.some(x=>/rechazó/.test(x)),r);
      if(tipo==='bien') chk('confirmado sí dice que llegó y limpia la cola',r.cola===0 && r.toasts.some(x=>/^ok:.*llegó/.test(x)) && !!S.fila('cola-991'),r);
    });
  }
  chk('sin errores JavaScript',errores.length===0,errores.slice(0,5));
  await browser.close();console.log('\n'+PASS+' bien · '+FAIL+' mal');process.exit(FAIL?1:0);
})();
