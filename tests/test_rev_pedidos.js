/* 🔎 REVISIÓN DE PEDIDOS (25/09): lo que se carga, se guarda, se encola y se borra.

   Panel de verdad contra el google-apps-script.gs de verdad (cargado en Node con una planilla
   de mentira, como test_concurrencia.js): el `fetch` del panel entra por `doPost`, así que el
   ida y vuelta pasa por `recToRow`/`rowToRec_`, el sello, los porteros y la OC del servidor.
   Cada página acepta REGLAS para sus próximos pedidos al servidor:
     · 'drop'   — no llega (sin red);
     · 'lose'   — el servidor lo procesa y la respuesta se pierde (el 404 del redirect, §4fa);
     · 'hold'   — queda en el aire hasta `__soltar(nombre)`, y ahí llega;
     · 'tarde'  — el servidor contesta YA (la foto de ese momento) y la respuesta llega al soltarla.

   ⚠️ El reloj de la página está CLAVADO (`page.clock.setFixedTime`) en el miércoles 16/09/2026 a
   las 10 de Bolivia: las fechas de entrega de los fixtures son fijas y no se pudren con el
   calendario. Con el reloj quieto, `saveReciente` (90 s) no vence solo: donde hace falta que
   pase el rato, la prueba corre la hora de `SAVE_ULTIMO` para atrás.

   Se corre:  node tests/test_rev_pedidos.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev_pedidos.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
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
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
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
    page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
    await page.clock.setFixedTime(new Date(opts.reloj || RELOJ));
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

  // ══ 1. LA COLA NO PISA LO QUE ENTRA MIENTRAS SE MANDA ═════════════════════════════════
  await esc('1. Un cambio que entra a la cola MIENTRAS la cola se está mandando', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'q1', cliente:'UNO', oc:'09-001' }));
    S.guardar(pedido({ id:'q2', cliente:'DOS', oc:'09-002', fecha:'2026-09-18' }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      // sin señal: el chofer marca entregado q1 → a la cola
      __regla({ act:'save', id:'q1', mode:'drop', n:2 });
      var p1=findById('q1'); p1.entregado=true; persistPedido(p1); await esperar(2500); await quieto();
      var antes=getPending().map(function(x){ return x.id; });
      // vuelve la señal: se manda la cola, y el servidor tarda con q1
      __regla({ act:'save', id:'q1', mode:'hold', name:'H1' });
      var fl=flushPending(); await esperar(300);
      // mientras tanto otro cambio (q2) tampoco llega → a la cola
      __regla({ act:'save', id:'q2', mode:'drop', n:2 });
      var p2=findById('q2'); p2.observaciones='CAMBIO DE Q2 MIENTRAS SE MANDABA LA COLA'; persistPedido(p2); await esperar(2500);
      var durante=getPending().map(function(x){ return x.id; });
      __soltar('H1'); await fl; await quieto();
      var despues=getPending().map(function(x){ return x.id; });
      await flushPending(); await quieto();
      return { antes:antes, durante:durante, despues:despues, final:getPending().map(function(x){ return x.id; }),
               aviso:window._toasts.filter(function(t){ return /DOS/.test(t); })[0]||'' };
    });
    chk('el cambio de q2 quedó en la cola mientras se mandaba q1 (el panel dijo «se manda solo»)', r.durante.indexOf('q2')>=0 && /cola/.test(r.aviso), r);
    chk('⚠️ al terminar de mandar q1, q2 SIGUE en la cola (antes la cola se reemplazaba y q2 se borraba sin mandarse)', r.despues.indexOf('q2')>=0 && r.despues.indexOf('q1')<0, r.despues);
    chk('…y con la próxima vuelta llega a la planilla', S.fila('q2').observaciones==='CAMBIO DE Q2 MIENTRAS SE MANDABA LA COLA' && r.final.length===0, { obs:S.fila('q2').observaciones, cola:r.final });
    chk('…y q1 también llegó (entregado)', S.fila('q1').entregado===true);
  });

  await esc('1b. Lo que falla o rebota en la vuelta sigue como siempre', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'f1', cliente:'FALLA', oc:'09-001' }));
    S.guardar(pedido({ id:'f2', cliente:'RECHAZO', oc:'09-002', fecha:'2026-09-18' }));
    const A = await abrir(S);
    // Otro dispositivo guarda f2 después: el de la cola choca (conflicto = «no» firme, sale de la cola).
    const r = await A.evaluate(async () => {
      __regla({ act:'save', mode:'drop', n:4 });
      var a=findById('f1'); a.observaciones='f1 sin señal'; persistPedido(a);
      var b=findById('f2'); b.observaciones='f2 sin señal'; persistPedido(b);
      await esperar(3500); await quieto();
      return getPending().map(function(x){ return x.id; }).sort();
    });
    const f2 = S.fila('f2'); f2.observaciones = 'OTRO DISPOSITIVO'; S.guardar(f2);
    const r2 = await A.evaluate(async () => {
      __regla({ act:'save', id:'f1', mode:'drop', n:2 });      // f1 vuelve a fallar
      await flushPending(); await quieto();
      return getPending().map(function(x){ return x.id; });
    });
    chk('las dos quedaron en la cola sin señal', JSON.stringify(r)===JSON.stringify(['f1','f2']), r);
    chk('la que vuelve a fallar se queda en la cola; la rechazada en firme sale', JSON.stringify(r2)===JSON.stringify(['f1']), r2);
    chk('…y la rechazada no pisó lo del otro dispositivo', S.fila('f2').observaciones==='OTRO DISPOSITIVO', S.fila('f2').observaciones);
  });

  chk('sin errores de JavaScript en la página', !errores.length, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
