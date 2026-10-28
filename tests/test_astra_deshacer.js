/* ↩️ «DESHACER» SIN PISAR A NADIE Y UN BORRADO QUE NO SE PIERDE AL CERRAR (§4nl, 27/10, auditoría de Astra A01 y A09).
   El panel de verdad contra el google-apps-script.gs de verdad (arnés de test_borr_misma.js), Google de mentira en memoria.
   ⚠️ LO QUE CUIDA (rojo contra e8feb61):
   A01. Deshacer una entrega cuyo guardado volvió con «conflicto» (otro equipo había corregido el pedido) reenviaba los productos de la
        foto vieja con el sello nuevo: el servidor lo aceptaba y la corrección de B (cantidad, marca de logística) se perdía.
        · con el «no» del servidor, «Deshacer» se va solo (no hay nada de acá que deshacer);
        · deshacer sobre una versión más nueva devuelve SOLO lo que la entrega cambió (la marca, el «salió hoy»), nunca la lista vieja;
        · lo mismo con el turno: un cambio de turno rechazado ya no se «deshace» encima del de otro;
        · sin respuesta (a la cola) «Deshacer» sigue: el guardado de acá todavía vale.
   A09. Borrar y cerrar (o recargar) la página dentro de los 5 s: la intención quedaba solo en memoria y el pedido volvía al abrir.
        · se retoma al volver, contra la copia que se vio (si otro lo cambió, NO se borra y se ve lo nuevo);
        · «Deshacer» la cancela; la de otra pestaña en sus 5 s no se toca; una de hace más de 3 días no se ejecuta.
        · (28/10, revalidación de Codex) con el almacenamiento lleno no se promete «se borra en 5 s»: se borra ya y se dice.
   Solo datos inventados. Se corre:  node tests/test_astra_deshacer.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const RELOJ = '2026-10-27T10:00:00-04:00';           // martes, 10 de la mañana en Bolivia; los pedidos son del miércoles 28
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
  const sh = hacerPlanilla([HDR]), otras = {}, props = {};
  const hoja = (n) => n==='Pedidos' ? sh : (otras[n] || (otras[n] = hacerPlanilla([])));
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); }, putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; }, removeAll(){} };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: hoja, insertSheet: hoja }) },
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
  return { ctx, sh, post, fila, guardar };
}
const pedido = (o) => Object.assign({
  fecha:'2026-10-28', oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-10-26'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000, chk:'ok'}], rev:0
}, o);

/* Lo que corre ANTES que el panel, en cada carga (también al volver a abrirlo). */
function INIT(){
  window.__ctl = { rules: [], log: [] };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || '');
    window.__ctl.log.push({ act: act, id: id });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { r.n--; return Promise.reject(new TypeError('Failed to fetch')); }
    }
    return window.__gs(body).then(resp);
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const S = servidor();
  const nombres = { a1:'ROSA FICTICIA', a2:'JUAN FICTICIO', a3:'ANA FICTICIA', a4:'LUIS FICTICIO', a5:'MARTA FICTICIA', a6:'PEDRO FICTICIO',
                    a7:'ELENA FICTICIA', a8:'RAUL FICTICIO', a9:'SARA FICTICIA', a10:'TITO FICTICIO', a11:'NORA FICTICIA' };
  Object.keys(nombres).forEach((id, i) => {
    const r = S.guardar(pedido({ id:id, cliente:nombres[id], celular:'7000'+(1000+i), nota:String(2000+i), oc:'10-'+(300+i), turno: i<7 ? 'AM' : 'PM' }));
    if (!r.ok) console.log('no se pudo sembrar', id, r);
  });
  const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  await context.exposeFunction('__gs', (body) => S.post(body));
  await context.addInitScript(INIT);
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date(RELOJ));
  const preparar = () => page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    window.DESH_PRUEBA=1; DESH_MS=60000;               // la barra no se va sola mientras dura la prueba
    await refrescarEstado(); await esperar(200); await quieto();
  });
  const abrir = async () => { await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(700); await preparar(); };
  const esperarQue = async (fn, ms) => { for (let t = 0; t < (ms||8000); t += 100) { if (fn()) return true; await page.waitForTimeout(100); } return fn(); };
  const lsBorrar = () => page.evaluate(() => { try{ return JSON.parse(localStorage.getItem('me_borrar_pend')||'{}'); }catch(e){ return {}; } });

  await abrir();
  let r = await page.evaluate(() => ['a1','a2','a3','a4','a5'].every(function(id){ return !!findById(id); }));
  chk('(arranque) el panel leyó los pedidos inventados de la planilla de mentira', r, r);

  // ═══ A01 · Deshacer una entrega rechazada ═══
  console.log('\n── A01. Deshacer una entrega cuyo guardado volvió con «conflicto» ──');
  { const b = S.fila('a1'); b.productos[0].cant = 3; b.productos[0].chk = 'no'; const rb = S.guardar(b);
    chk('(B) otro equipo corrige ROSA: cantidad 3 y «✗ no hay»', rb.ok && S.fila('a1').productos[0].cant == 3, rb.ok); }
  r = await page.evaluate(async () => { window._toasts=[]; quickEntregado('a1'); var o={ ofrecio:!!DESH }; await quieto(); await esperar(150);
    o.DESH=!!DESH; o.ver=document.getElementById('desh').classList.contains('ver'); o.cant=findById('a1').productos[0].cant;
    o.conflicto=window._toasts.some(function(t){ return /lo modificó otra persona/.test(t); }); return o; });
  chk('A marca «Entregó» con la versión vieja: el servidor dice «conflicto» y la pantalla queda con lo de B', r.ofrecio && r.conflicto && Number(r.cant)===3, r);
  chk('…y «Deshacer» se va solo: no queda nada de A que deshacer', !r.DESH && !r.ver, r);
  r = await page.evaluate(async () => { var n=window.__ctl.log.filter(function(x){ return x.act==='save'; }).length; deshDeshacer(); await quieto(); await esperar(150);
    return { saves:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length-n }; });
  let f = S.fila('a1');
  chk('tocar «Deshacer» igual (Ctrl+Z tarde) no manda nada', r.saves===0, r);
  chk('la corrección de B sigue en la planilla: cantidad 3 y «✗ no hay»', Number(f.productos[0].cant)===3 && f.productos[0].chk==='no' && !f.entregado, f.productos);

  console.log('');
  r = await page.evaluate(async () => { quickEntregado('a2'); await quieto(); return { DESH:!!DESH, ent:findById('a2').entregado, eF:findById('a2').productos[0].eF||'' }; });
  chk('A marca JUAN entregado (antes de su día): se guarda bien y «Deshacer» queda', r.DESH && r.ent && r.eF==='2026-10-27', r);
  { const b = S.fila('a2'); b.productos[0].cant = 3; b.productos[0].chk = 'no'; const rb = S.guardar(b);
    chk('(B) mientras tanto otro equipo corrige JUAN: cantidad 3 y «✗ no hay» (sobre lo entregado)', rb.ok, rb.ok); }
  r = await page.evaluate(async () => { await refrescarEstado(); await esperar(100); var p=findById('a2'); return { cant:p.productos[0].cant, chk:p.productos[0].chk, DESH:!!DESH }; });
  chk('(A) la lectura trae la versión de B y «Deshacer» sigue a la vista', Number(r.cant)===3 && r.chk==='no' && r.DESH, r);
  r = await page.evaluate(async () => { deshDeshacer(); await quieto(); await esperar(150); var p=findById('a2'); return { ent:p.entregado, cant:p.productos[0].cant, chk:p.productos[0].chk, eF:p.productos[0].eF||'' }; });
  f = S.fila('a2');
  chk('«Deshacer» saca SOLO la entrega (la marca y el «salió hoy»)', !f.entregado && !f.productos[0].eF && !r.ent && !r.eF, { srv:f.productos, ent:f.entregado });
  chk('…y deja lo de B: cantidad 3 y «✗ no hay» (antes volvía la lista vieja: 1 y «✔»)', Number(f.productos[0].cant)===3 && f.productos[0].chk==='no', f.productos);

  console.log('');
  { const b = S.fila('a3'); b.turno = 'PM'; b.productos[0].cant = 2; const rb = S.guardar(b);
    chk('(B) otro equipo pasa ANA a la tarde y le cambia la cantidad', rb.ok, rb.ok); }
  r = await page.evaluate(async () => { cambiarTurno('a3','PM'); var o={ ofrecio:!!DESH }; await quieto(); await esperar(150); o.DESH=!!DESH; o.turno=findById('a3').turno;
    closeModal(); return o; });
  chk('A (con la versión vieja, en la mañana) también la pasa a la tarde: «conflicto», queda la de B', r.ofrecio && r.turno==='PM', r);
  chk('…y «Deshacer» del turno se va solo', !r.DESH, r);
  await page.evaluate(async () => { deshDeshacer(); await quieto(); await esperar(150); closeModal(); });
  f = S.fila('a3');
  chk('la tarde que eligió B queda en la planilla (antes «Deshacer» la volvía a la mañana)', f.turno==='PM' && Number(f.productos[0].cant)===2, { turno:f.turno, cant:f.productos[0].cant });

  console.log('');
  r = await page.evaluate(async () => { __regla({ act:'save', id:'a4', n:2 }); quickEntregado('a4'); await esperar(2200); await quieto();
    return { DESH:!!DESH, cola:getPending().filter(function(q){ return q.id==='a4'; }).map(function(q){ return q.entregado; }) }; });
  chk('sin respuesta del servidor (a la cola) «Deshacer» sigue: el guardado de acá todavía vale', r.DESH && r.cola.join()==='true', r);
  r = await page.evaluate(async () => { deshDeshacer(); await quieto(); await esperar(150); return { ent:findById('a4').entregado, cola:getPending().filter(function(q){ return q.id==='a4'; }).map(function(q){ return q.entregado; }) }; });
  chk('…y deshacer deja la entrega sin marcar (en la cola o en la planilla)', !r.ent && !S.fila('a4').entregado && r.cola.every(x => x===false), r);

  // ═══ A09 · Borrar y cerrar la página dentro de los 5 s ═══
  console.log('\n── A09. Borrar y cerrar la página antes de los 5 s ──');
  r = await page.evaluate(async () => { await quieto(); setPending([]); deletePedido('a5'); return { fuera:!findById('a5'), DESH:!!DESH }; });
  chk('A borra MARTA: sale de la pantalla y empieza la cuenta de 5 s', r.fuera && r.DESH, r);
  await page.goto('about:blank'); await page.waitForTimeout(300);
  chk('(cerró la página) el borrado todavía no llegó a la planilla', !!S.fila('a5'), !!S.fila('a5'));
  await abrir();
  const borrada = await esperarQue(() => !S.fila('a5'));
  r = await page.evaluate(() => ({ esta:!!findById('a5') }));
  let ls = await lsBorrar();
  chk('al volver a abrir el panel, el borrado se termina: MARTA ya no está en la planilla', borrada, !!S.fila('a5'));
  chk('…ni en la pantalla, y la intención guardada se limpió', !r.esta && !ls.a5, { r, ls:Object.keys(ls) });

  console.log('');
  r = await page.evaluate(async () => { setPending([]); deletePedido('a6'); var o={ pend:!!(JSON.parse(localStorage.getItem('me_borrar_pend')||'{}').a6) }; deshDeshacer();
    o.despues=!!(JSON.parse(localStorage.getItem('me_borrar_pend')||'{}').a6); o.esta=!!findById('a6'); return o; });
  chk('borrar PEDRO deja la intención guardada en el aparato; «Deshacer» la cancela', r.pend && !r.despues && r.esta, r);
  const c8 = S.fila('a8'), c9 = S.fila('a9');
  await page.evaluate((x) => { var m=JSON.parse(localStorage.getItem('me_borrar_pend')||'{}');
    m.a8={ c:x.c8, t:Date.now() };                                  // otra pestaña, todavía en sus 5 s
    m.a9={ c:x.c9, t:Date.now()-4*86400000, ya:1 };                 // de hace 4 días
    localStorage.setItem('me_borrar_pend', JSON.stringify(m)); }, { c8, c9 });
  r = await page.evaluate(async () => { deletePedido('a7'); return { fuera:!findById('a7') }; });
  await page.goto('about:blank'); await page.waitForTimeout(300);
  { const b = S.fila('a7'); b.direccion = 'Otra calle 99'; b.celular = '70009999'; const rb = S.guardar(b);
    chk('(B) mientras la página de A estaba cerrada, otro equipo corrige ELENA', r.fuera && rb.ok, rb.ok); }
  await abrir(); await page.waitForTimeout(1500);
  await page.evaluate(async () => { await quieto(); });
  r = await page.evaluate(() => { var p=findById('a7'); return { a6:!!findById('a6'), a7:p ? p.direccion : null, a8:!!findById('a8'), a9:!!findById('a9') }; });
  ls = await lsBorrar();
  chk('PEDRO (deshecho) sigue en la planilla y en la pantalla', !!S.fila('a6') && r.a6, r);
  chk('ELENA, cambiada por B mientras tanto, NO se borra al volver: se ve lo nuevo', !!S.fila('a7') && r.a7==='Otra calle 99' && !ls.a7, { r, ls:Object.keys(ls) });
  chk('la de otra pestaña en sus 5 s no se toca (RAUL sigue y su intención espera)', !!S.fila('a8') && !!ls.a8, { srv:!!S.fila('a8'), ls:Object.keys(ls) });
  chk('una de hace más de 3 días no se ejecuta y se limpia (SARA sigue)', !!S.fila('a9') && r.a9 && !ls.a9, { srv:!!S.fila('a9'), ls:Object.keys(ls) });

  console.log('');
  r = await page.evaluate(async () => { localStorage.removeItem('me_borrar_pend'); setPending([]); DESH_MS=400; deletePedido('a10'); await esperar(900); await quieto();
    for(var i=0;i<40 && JSON.parse(localStorage.getItem('me_borrar_pend')||'{}').a10;i++) await esperar(100);
    return { esta:!!findById('a10'), pend:!!JSON.parse(localStorage.getItem('me_borrar_pend')||'{}').a10, ok:window._toasts.some(function(t){ return /eliminado ✓/i.test(t); }) }; });
  chk('sin cerrar nada: a los 5 s se borra de verdad y la intención guardada se limpia', !S.fila('a10') && !r.esta && !r.pend && r.ok, r);

  /* (28/10, revalidación de Codex) Con el almacenamiento LLENO la intención no queda en el aparato: no se promete «se borra en 5 s». */
  console.log('');
  r = await page.evaluate(async () => { localStorage.removeItem('me_borrar_pend'); setPending([]); DESH_MS=60000; window._toasts=[];
    var o=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='me_borrar_pend'){ var e=new Error('lleno'); e.name='QuotaExceededError'; throw e; } return o.call(this,k,v); };
    try{ deletePedido('a11'); var x={ DESH:!!DESH, cinco:(document.getElementById('desh')||{}).innerText||'' }; await esperar(300); await quieto();
      x.esta=!!findById('a11'); x.toasts=window._toasts.slice(); return x; } finally { Storage.prototype.setItem=o; } });
  chk('almacenamiento lleno: no ofrece «se borra en 5 segundos» ni «Deshacer»', !r.DESH && !/5 segundos/.test(r.cinco), r);
  chk('…lo dice («se borra AHORA, sin Deshacer») y lo borra ya: NORA no está ni en la planilla ni en la pantalla', r.toasts.some(t => /se borra AHORA/.test(t)) && !S.fila('a11') && !r.esta, r);

  chk('sin errores de la página', errores.length === 0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
