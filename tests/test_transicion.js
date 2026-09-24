/* 🧓 LA PÁGINA VIEJA Y LA NUEVA A LA VEZ (§4fz-b, revisión del 24/09, antes de publicar)

   El día que se publica el panel nuevo conviven dos cosas un rato: computadoras con la página
   VIEJA abierta (la de `ebc3eab`, que no conoce las recepciones con nombre) y otras con la
   nueva; primero con el servidor de siempre (20-a) y después con el nuevo (23-b), que a la
   vieja le contesta `actualizar` y le deja el stock y el arqueo en SU cola hasta que recargue.

   Un agente de revisión encontró que esa mezcla corrompía datos en silencio:
     · el stock: la página vieja reescribe cada foto de almacén SIN `rs` ni `t`, y la nueva, al
       leerla, volvía a restar las recogidas ya restadas (Moreno 10 → 7 → 4), y tiraba la llegada
       que anotó la vieja (la entrada de 2 desaparecía y la recogida se reabría);
     · el arqueo: lo que la vieja dejó en la cola pisaba, al recargar, la corrección que otro hizo
       después (Efectivo 950 volvía a 900); y una pestaña nueva que anotaba ANTES de que llegara
       la planilla hacía lo mismo con el espejo del navegador, y además avisaba en rojo «no se
       pudo juntar» tres veces;
     · dos entradas iguales (una vieja ya numerada y otra que agrega la página vieja) recibían el
       mismo id fijo y la junta dejaba una.

   Arnés del agente: el `.gs` real en Node (planilla de mentira) + navegadores reales. La página
   vieja y el servidor 20-a salen de git (`ebc3eab`). Solo datos sintéticos: el repo es público.

   Se corre:  node tests/test_transicion.js           (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/la/pedidos.html/de/antes node tests/test_transicion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), cp = require('child_process');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const NUEVO = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS23 = process.env.GS || path.resolve('google-apps-script.gs');
const IM = 'IM - PRODUCTOTERMINADO';
const hoy = new Date(Date.now() - 4*3600000).toISOString().slice(0,10);   // en hora de Bolivia, como los navegadores de la prueba

/* La página vieja y el servidor 20-a, tal como están publicados hoy. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'transicion-'));
const git = (ref) => cp.execSync('git show '+ref, { maxBuffer:64*1024*1024 });
fs.writeFileSync(path.join(TMP,'pedidos.html'), git('ebc3eab:pedidos.html'));
fs.writeFileSync(path.join(TMP,'productos-mes.js'), git('ebc3eab:productos-mes.js'));
fs.writeFileSync(path.join(TMP,'gs20a.gs'), git('ebc3eab:google-apps-script.gs'));
const VIEJO = path.join(TMP,'pedidos.html'), GS20 = path.join(TMP,'gs20a.gs');

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
function servidor(GS){
  const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
    '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
    'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); }, putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n==='Rechazos' ? shR : sh, insertSheet: (n) => n==='Rechazos' ? shR : sh }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty:(k)=>props[k]!=null?props[k]:null, setProperty:(k,v)=>{ props[k]=v; },
      deleteProperty:(k)=>{ delete props[k]; }, setProperties:(o)=>{ Object.assign(props,o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
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
  const stock = () => { const f=fila('__stock__'); try{ return JSON.parse(f.observaciones); }catch(e){ return null; } };
  return { ctx, sh, shR, post, fila, stock };
}
/* Stock: contado K1 = 10; Moreno (IM) tiene K3 = 10 y hay una recogida de 3 de K3 sin recibir.
   Arqueo del mes: Efectivo = 900. */
function sembrar(S){
  const p = (rec) => JSON.parse(S.post(JSON.stringify({ action:'save', pedido:rec })));
  p({ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:0, observaciones: JSON.stringify({
    c:{ f:hoy, u:{ 'K1|140x190':10 } }, e:[],
    p:[ { id:'rq1', k:'K3|140x190', u:3, tipo:'recogida', de:IM, fab:'', f:hoy, esp:hoy, r:'' } ],
    a:{}, g:{ [IM]:{ f:hoy, hora:'08:00:00', u:{ 'K3|140x190':10 } } }, al:{ [IM]:'otro' }, h:[] }) });
  p({ id:'__arqueo_cuadre__', fecha:'', cliente:'🧮 ARQUEO', rev:0, observaciones:'mes|'+hoy.slice(0,7)+'|Efectivo=900' });
}
function INIT(){
  /* Los avisos desde que abre la página: el de la cola vieja sale AL CARGAR, antes de que la
     prueba pueda envolver `toast`. */
  window._toastsTodos=[];
  document.addEventListener('DOMContentLoaded', function(){
    var el=document.getElementById('toast'); if(!el) return;
    new MutationObserver(function(){ if(el.textContent) window._toastsTodos.push(el.textContent); }).observe(el, { childList:true, characterData:true, subtree:true });
  });
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length) break; } await esperar(80); };
  window.__soltarList = function(){ window.__listLibre=true; var a=window.__listEspera||[]; window.__listEspera=[]; a.forEach(function(f){ f(); }); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    if ((P.action||'save')==='list' && localStorage.getItem('__HOLD_LIST')==='1' && !window.__listLibre) {
      return new Promise(function(res){ (window.__listEspera=window.__listEspera||[]).push(function(){ res(window.__gs(body).then(resp)); }); });
    }
    return window.__gs(body).then(resp);
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = []; let contextos = [];
  const prep = async (page) => {
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      window._toasts=window._toasts||[]; if(!toast.__env){ var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); }; toast.__env=1; }
    });
  };
  const abrir = async (S, nombre, file, ctxExistente) => {
    let context = ctxExistente;
    if (!context) { context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
      contextos.push(context); await context.exposeFunction('__gs', (body) => S.post(body)); await context.addInitScript(INIT); await context.route(/^https?:/, r => r.abort()); }
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(nombre+': '+e.message));
    page.on('dialog', d => d.accept());
    await page.goto('file://' + file, { waitUntil:'load' });
    await prep(page);
    return page;
  };
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  const moreno = (s) => { const g = s && s.g && s.g[IM] && s.g[IM].u; return g ? g[Object.keys(g)[0]] : null; };
  const memMoreno = (P) => P.evaluate((IM) => { var g=STOCK.g&&STOCK.g[IM]&&STOCK.g[IM].u; return g ? g[Object.keys(g)[0]] : null; }, IM);
  const recibir = (page, id, u) => page.evaluate(async (a) => {
    var inp=document.createElement('input'); inp.id='stk-rec-'+a.id; inp.value=String(a.u); document.body.appendChild(inp);
    recibirStockPedido(a.id); inp.remove(); await quieto();
  }, { id:id, u:u });
  const recargarNuevo = async (V) => {             // esa computadora recarga y le llega el panel nuevo
    await V.goto('file://'+NUEVO, { waitUntil:'load' }); await prep(V);
    await V.evaluate(async () => { await quieto(); await esperar(300); await flushPending(); await quieto(); });
  };
  const rq1 = (s) => { const q=(s.p||[]).filter(x=>x.id==='rq1')[0]||{}; return { moreno:moreno(s), ru:q.ru, cerrada:!!q.r, entradas:(s.e||[]).filter(x=>x.de==='rq1').map(x=>x.u).sort() }; };
  const esc = async (nom, fn) => { console.log('\n── '+nom+' ──'); try { await fn(); } catch(e) { chk(nom+': terminó', false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };

  await esc('1. 20-a: la página VIEJA guarda el stock después de una recogida recibida en la NUEVA', async () => {
    const S = servidor(GS20); sembrar(S);
    const N = await abrir(S, 'N', NUEVO);
    await recibir(N, 'rq1', 3);
    const V = await abrir(S, 'V', VIEJO);
    await V.evaluate(async () => { var k=Object.keys(STOCK.c.u)[0]; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock(); await quieto(); });
    await N.evaluate(async () => { await refrescarEstado(); await quieto(); });
    chk('⚠️ la nueva, al releer lo que escribió la vieja, ve Moreno 7 (antes 4: volvía a restar la recogida)', await memMoreno(N)===7, await memMoreno(N));
    await N.evaluate(async () => { STOCK.p=(STOCK.p||[]).concat([{ id:'qN', k:'K2|140X190', u:8, fab:'MORENO', f:todayStr(), esp:'', r:'' }]); guardarStock(); await quieto(); });
    chk('…y un guardado cualquiera de la nueva deja Moreno 7 en la planilla', moreno(S.stock())===7, moreno(S.stock()));
  });

  await esc('2. 20-a: la página VIEJA sube el Excel de Moreno (que ya trae la recogida descontada)', async () => {
    const S = servidor(GS20); sembrar(S);
    const N = await abrir(S, 'N', NUEVO);
    await recibir(N, 'rq1', 3);
    const V = await abrir(S, 'V', VIEJO);
    await V.evaluate(async (IM) => { var k=Object.keys(STOCK.g[IM].u)[0]; var u={}; u[k]=7;
      STOCK.g[IM]={ f:todayStr(), u:u, hora:'15:00:00', solo0:false, cod:{} }; guardarStock(); await quieto(); }, IM);
    await N.evaluate(async () => { await refrescarEstado(); await quieto(); });
    chk('⚠️ la nueva muestra lo que dice el Excel: Moreno 7 (antes 4)', await memMoreno(N)===7, await memMoreno(N));
  });

  await esc('3. 23-b: la VIEJA deja el stock en su cola (actualizar), recarga y le llega la nueva', async () => {
    const S = servidor(GS23); sembrar(S);
    const N = await abrir(S, 'N', NUEVO);
    await recibir(N, 'rq1', 3);
    const V = await abrir(S, 'V', VIEJO);
    await V.evaluate(async () => { var k=Object.keys(STOCK.c.u)[0]; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock(); await quieto(); });
    chk('el servidor nuevo no dejó que la vieja pise el stock (Moreno sigue en 7, su guardado en su cola)',
        moreno(S.stock())===7 && (await V.evaluate(() => getPending().map(function(x){ return x.id; }))).indexOf('__stock__')>=0);
    await recargarNuevo(V);
    const s = S.stock();
    chk('⚠️ al recargar, lo de la cola vieja entra y Moreno queda en 7 (antes 4)', moreno(s)===7, moreno(s));
    chk('…con la entrada de 5 que anotó la vieja', (s.e||[]).some(x=>x.u===5), (s.e||[]).map(x=>x.u));
  });

  await esc('4. 20-a: recogida de 3, la NUEVA recibe 1 y la VIEJA los otros 2', async () => {
    const S = servidor(GS20); sembrar(S);
    const N = await abrir(S, 'N', NUEVO);
    await recibir(N, 'rq1', 1);
    const V = await abrir(S, 'V', VIEJO);
    await recibir(V, 'rq1', 2);
    await N.evaluate(async () => { await refrescarEstado(); await quieto(); });
    const n = await N.evaluate(() => JSON.parse(JSON.stringify(STOCK)));
    chk('⚠️ la nueva ve Moreno 7, 3 recibidas, cerrada y las dos entradas (1 y 2) (antes: Moreno 6, reabierta, sin la de 2)',
        JSON.stringify(rq1(n))===JSON.stringify({ moreno:7, ru:3, cerrada:true, entradas:[1,2] }), rq1(n));
  });

  await esc('5. 23-b: recogida de 3, la NUEVA recibe 1, la VIEJA 2 (queda en su cola) y recarga', async () => {
    const S = servidor(GS23); sembrar(S);
    const N = await abrir(S, 'N', NUEVO);
    await recibir(N, 'rq1', 1);
    const V = await abrir(S, 'V', VIEJO);
    await recibir(V, 'rq1', 2);
    await recargarNuevo(V);
    chk('⚠️ la planilla queda con Moreno 7, 3 recibidas, cerrada y las entradas 1 y 2 (antes: Moreno 6, reabierta, sin la de 2)',
        JSON.stringify(rq1(S.stock()))===JSON.stringify({ moreno:7, ru:3, cerrada:true, entradas:[1,2] }), rq1(S.stock()));
  });

  await esc('6. 23-b: arqueo — la VIEJA lo deja en su cola, otro corrigió una forma, la VIEJA recarga', async () => {
    const S = servidor(GS23); sembrar(S);
    const V = await abrir(S, 'V', VIEJO);                 // leyó Efectivo=900
    const N = await abrir(S, 'N', NUEVO);
    await N.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|Efectivo']=950; guardarArqueo(); await quieto(); });
    await V.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|QR BISA']=2000; guardarArqueo(); await quieto(); });
    await recargarNuevo(V);
    const obs = String(S.fila('__arqueo_cuadre__').observaciones);
    chk('⚠️ la corrección del otro se queda (Efectivo 950; antes volvía a 900)', /\|Efectivo=950\b/.test(obs), obs);
    chk('…y lo nuevo de la vieja entra (QR BISA 2000)', /\|QR BISA=2000\b/.test(obs), obs);
    const avisos = await V.evaluate(() => window._toastsTodos.join(' | '));
    chk('…y se avisa que un dato de la cola vieja no entró', avisos.indexOf('PÁGINA VIEJA')>=0, avisos);
  });

  await esc('7. 23-b, sin página vieja: pestaña nueva, arqueo anotado ANTES de que llegue la planilla', async () => {
    const S = servidor(GS23); sembrar(S);
    const X = await abrir(S, 'X', NUEVO);                      // ayer: esta compu leyó Efectivo=900 (queda en el espejo del navegador)
    const ctx = X.context(); await X.close();
    const B = await abrir(S, 'B', NUEVO);
    await B.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|Efectivo']=950; guardarArqueo(); await quieto(); });
    await ctx.addInitScript(() => { try{ localStorage.setItem('__HOLD_LIST','1'); }catch(e){} });
    const X2 = await abrir(S, 'X2', NUEVO, ctx);                 // hoy: pestaña nueva, la planilla tarda en llegar
    const r = await X2.evaluate(async () => {
      var antes={ cargado:ARQUEO_CARGADO };
      ARQUEO['mes|'+todayStr().slice(0,7)+'|QR BISA']=2000; guardarArqueo(); await esperar(300);
      __soltarList(); await esperar(300); await quieto(); await refrescarEstado(); await quieto(); await flushPending(); await quieto();
      antes.toasts=window._toasts.slice(); antes.cola=getPending().map(function(x){ return x.id; });
      return antes;
    });
    const obs = String(S.fila('__arqueo_cuadre__').observaciones);
    chk('(la pestaña anotó sin la planilla cargada)', r.cargado===false);
    chk('⚠️ la corrección del otro se queda (Efectivo 950; antes el espejo viejo la volvía a 900)', /\|Efectivo=950\b/.test(obs), obs);
    chk('…y lo anotado entra (QR BISA 2000)', /\|QR BISA=2000\b/.test(obs), obs);
    chk('⚠️ sin el aviso rojo «No se pudo juntar el arqueo… tres intentos»', !r.toasts.some(t => /No se pudo juntar/.test(t)), r.toasts);
    chk('…y la cola queda vacía', r.cola.length===0, r.cola);
  });

  await esc('8. Ids fijos: una entrada igualita agregada por la VIEJA a una que la nueva ya numeró', async () => {
    const S = servidor(GS23); sembrar(S);
    const N = await abrir(S, 'N', NUEVO);
    const r = await N.evaluate(() => {
      var k=Object.keys(STOCK.c.u)[0], f=todayStr();
      var s1=leerStock({ observaciones:JSON.stringify({ c:{f:'2026-01-01',u:{}}, e:[{ f:f, k:k, u:10, fab:'MULTI' }], p:[], a:{}, al:{}, g:{}, h:[] }) });
      var o=JSON.parse(JSON.stringify(s1)); o.e.push({ f:f, k:s1.e[0].k, u:10, fab:'MULTI' });
      var s2=leerStock({ observaciones:JSON.stringify(o) });
      return { ids:s2.e.map(function(x){ return x.id; }), trasJunta:stockFusionar(s1, s1, s2).e.length };
    });
    chk('⚠️ las dos reciben ids distintos (#0 y #1) y la junta deja las dos (antes una)', r.ids[0]!==r.ids[1] && r.trasJunta===2, r);
  });

  chk('ninguna página tiró errores de JavaScript', errores.length===0, errores.slice(0,4).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  try { fs.rmSync(TMP, { recursive:true, force:true }); } catch(e){}
  process.exit(FAIL?1:0);
})();
