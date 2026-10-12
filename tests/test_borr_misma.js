/* 📥 «SÍ, ES LA MISMA» DE VERDAD (12/10). El dueño: *«por más que doy "sí, es la misma"… anoche lo hice desde el teléfono y quedó
   vacío, pero hoy al ingresar salieron todos de nuevo»*. Las tarjetas decían «esperando hace 6 días»: la fila NUNCA se borró de la
   planilla. `borrEsLaMisma` sacaba la tarjeta de la pantalla y, si Google no hacía el borrado (ocupado, sin respuesta), lo callaba.
   El panel de verdad contra el google-apps-script.gs de verdad (arnés de test_codex28_flujos.js).
   ⚠️ LO QUE CUIDA (rojo contra lo publicado, `e2f1021`):
   1. Con el servidor bien: la fila del borrador sale de la planilla y el ✓ llega con la respuesta.
   2. Google contesta «ocupado»: la tarjeta VUELVE a la bandeja y se dice, en rojo.
   3. Diez seguidas: se borran las diez, DE A UNO (nunca dos borrados a la vez).
   Solo datos sintéticos. Se corre:  node tests/test_borr_misma.js */
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
    if (act==='delete'){ window.__enVuelo=(window.__enVuelo||0)+1; window.__maxVuelo=Math.max(window.__maxVuelo||0, window.__enVuelo); }
    var fin=function(x){ if(act==='delete') window.__enVuelo--; return x; };
    if (!rule) return real().then(fin);
    if (rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    if (rule.mode === 'busy') return Promise.resolve(resp(JSON.stringify({ ok:false, error:'busy' })));
    if (rule.mode === 'tarde') { var pr = window.__gs(body); return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(pr.then(resp)); }; }); }
    return real();
  };
}


(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const montar = (n) => {
    const S = servidor();
    for (let i = 0; i < n; i++) {
      const lead = String(41110000 + i), cel = '7269' + String(1000 + i);
      const row = S.ctx.recToRow(pedido({ id:'kommo-'+lead, cliente:'Lead #'+lead, fecha:'', oc:'', nota:'', celular:cel, saldo:5000+i, zona:'', direccion:'',
        productos:[], estado:'Borrador Kommo', vendedor:'Maria Flores', ts:TS('2026-09-10') }));
      row[29] = 1757000000000 + i; S.sh._datos.push(row);
      S.guardar(pedido({ id:'man'+i, cliente:'CLIENTE '+i, celular:cel, saldo:5000+i, vendedor:'Maria Flores', nota:String(1500+i), oc:'09-'+(100+i) }));
    }
    return S;
  };
  const abrir = async (S) => {
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(350);
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
      await refrescarEstado(); await esperar(200);
    });
    return { page, context };
  };
  const borradores = (S) => S.sh._datos.filter(f => String(f[0]).indexOf('kommo-') === 0).length;

  console.log('\n── 1. Con el servidor bien ──');
  { const S = montar(1), { page, context } = await abrir(S);
    const r = await page.evaluate(async () => { borrEsLaMisma('kommo-41110000','man0'); var t0=window._toasts.slice(); await esperar(2500); await quieto();
      return { t0:t0, toasts:window._toasts, bandeja:BORRADORES.length }; });
    chk('la fila del borrador sale de la planilla', borradores(S) === 0, S.sh._datos.map(f => f[0]));
    chk('el ✓ llega con la respuesta del servidor (no antes)', !r.t0.some(t => /✓ Listo/.test(t)) && r.toasts.some(t => /✓ Listo/.test(t)) && r.bandeja === 0, r);
    await context.close(); }

  console.log('\n── 2. Google contesta «ocupado» ──');
  { const S = montar(1), { page, context } = await abrir(S);
    const r = await page.evaluate(async () => { __regla({ act:'delete', mode:'busy', n:5 }); borrEsLaMisma('kommo-41110000','man0'); await esperar(3500); await quieto();
      return { toasts:window._toasts, bandeja:BORRADORES.map(function(b){ return b.id; }) }; });
    chk('la fila sigue en la planilla (no se borró)', borradores(S) === 1);
    chk('la tarjeta vuelve a la bandeja y se dice en rojo (antes desaparecía callada)', r.bandeja.indexOf('kommo-41110000') >= 0 && r.toasts.some(t => /^err: .*No se pudo quitar/.test(t)), r);
    await context.close(); }

  console.log('\n── 3. Diez seguidas ──');
  { const S = montar(10), { page, context } = await abrir(S);
    const r = await page.evaluate(async () => { window.__maxVuelo=0;
      for(var i=0;i<10;i++) borrEsLaMisma('kommo-'+(41110000+i), 'man'+i);
      for(var k=0;k<60 && BORR_SERIE_PEND();k++) await esperar(500);
      await esperar(1500); await quieto();
      return { max:window.__maxVuelo, bandeja:BORRADORES.length, ok:window._toasts.filter(function(t){ return /✓ Listo/.test(t); }).length };
      function BORR_SERIE_PEND(){ return window.__enVuelo>0 || window._toasts.filter(function(t){ return /✓ Listo|No se pudo/.test(t); }).length<10; }
    });
    chk('se borran las diez filas de la planilla', borradores(S) === 0, borradores(S));
    chk('de a uno: nunca dos borrados a la vez', r.max === 1, r);
    await context.close(); }

  chk('sin errores de la página', errores.length === 0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
