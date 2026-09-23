/* 🤝 DOS DISPOSITIVOS A LA VEZ, DE PUNTA A PUNTA (§4fz → §4fz-b, 23/09)

   Navegadores con el panel de verdad, hablándole al google-apps-script.gs de verdad (cargado en
   Node con una planilla de mentira, como test_servidor.js). Nada de dobles de `apiSave`: el
   `fetch` del panel entra por `doPost`, así que se prueban juntos el sello del servidor y lo que
   hace el panel con la respuesta.

   El `fetch` se instala con `addInitScript`, así que sobrevive a `page.reload()` (la cola y el
   localStorage quedan, como en un celular que recarga), y cada página acepta REGLAS para su
   próximo pedido (arnés de la auditoría adversarial del 23/09):
     · 'lose'  — el servidor lo procesa y la respuesta se pierde (el 404 del redirect, §4fa);
     · 'drop'  — no llega (sin red);
     · 'busy'  — el servidor contesta ocupado;
     · 'hold'  — queda retenido hasta `__soltar(nombre)`.
   Dos páginas del MISMO contexto son dos pestañas del mismo navegador (comparten la cola).

   Lo que pidió Codex (verificación del 23/09) está en la sección 2: la misma recepción
   completa en dos dispositivos, dos recepciones parciales a la vez, la misma parcial dos veces
   y el reenvío después de perder la respuesta. La sección 7 es el panel VIEJO contra el
   servidor nuevo (`actualizar`).

   Se corre:  node tests/test_concurrencia.js           (desde la raíz del repo)
   Dientes:   GS=/ruta/al/viejo.gs …   o   PEDIDOS=/ruta/al/viejo/pedidos.html …
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), cp = require('child_process');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const IM = 'IM - PRODUCTOTERMINADO';
const hoy = (()=>{ const d=new Date(); const m=d.getMonth()+1, dd=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dd<10?'0':'')+dd; })();

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
  /* Guarda como lo haría OTRO dispositivo con el panel nuevo (sello + `juntar`). */
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec, juntar:1 })));
  const stock = () => { const f=fila('__stock__'); try{ return JSON.parse(f.observaciones); }catch(e){ return null; } };
  /* Otro dispositivo toca el stock (con el sello bueno): `cambiar` recibe el JSON y lo modifica. */
  const otroTocaStock = (cambiar) => { const f=fila('__stock__'); const st=JSON.parse(f.observaciones); cambiar(st);
    return guardar({ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:f.rev, observaciones:JSON.stringify(st) }); };
  return { ctx, sh, shR, post, fila, guardar, stock, otroTocaStock };
}
function sembrar(S, extra){
  const p = (rec) => JSON.parse(S.post(JSON.stringify({ action:'save', pedido:rec })));   // la primera vez, como siempre
  p({ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:0, observaciones: JSON.stringify({
    c:{ f:hoy, u:{ 'K1|140x190':10 } }, e:[],
    p:[ { id:'rq1', k:'K3|140x190', u:3, tipo:'recogida', de:IM, fab:'', f:hoy, esp:hoy, r:'' } ],
    a:{}, g:{ [IM]:{ f:hoy, hora:'08:00:00', u:{ 'K3|140x190':10 } } }, al:{ [IM]:'otro' }, h:[] }) });
  p({ id:'__arqueo_cuadre__', fecha:'', cliente:'🧮 ARQUEO', rev:0, observaciones:'mes|'+hoy.slice(0,7)+'|Efectivo=900' });
  p({ id:'V1', fecha:hoy, cliente:'CLIENTE DEBE', vendedor:'Carola Chavez', turno:'AM', saldo:1000, pagado:false, acuenta:0,
      productos:[{desc:'COLCHON',cant:1,precio:1000}], metodoPago:'', nota:'900', oc:'09-900', rev:0 });
  p({ id:'V2', fecha:hoy, cliente:'OTRA VENTA', vendedor:'Carola Chavez', turno:'AM', saldo:500, pagado:false, acuenta:0,
      productos:[{desc:'COLCHON',cant:1,precio:500}], metodoPago:'', nota:'901', oc:'09-901', rev:0 });
  p({ id:'kommo-777', fecha:'', cliente:'VENTA DE KOMMO', vendedor:'Carola Chavez', estado:'Borrador Kommo', saldo:1200, pagado:false,
      productos:[{desc:'COLCHON',cant:1,precio:1200}], metodoPago:'', rev:0 });
  (extra||[]).forEach(p);
}

/* Lo que corre ANTES que el panel, en cada carga y recarga. */
function INIT(){
  window.__ctl = { rules: [], log: [], holds: {} };
  window.__soltar = function(name){ var f = window.__ctl.holds[name]; if(f){ delete window.__ctl.holds[name]; f(); return true; } return false; };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || '');
    window.__ctl.log.push({ act: act, id: id, rev: P.pedido ? P.pedido.rev : P.rev, juntar: !!P.juntar });
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
    if (rule.mode === 'busy') return Promise.resolve(resp(JSON.stringify({ ok:false, error:'busy' })));
    if (rule.mode === 'hold') return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(real()); }; });
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
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
  /* Un dispositivo = un contexto nuevo. `mismo` = otra pestaña del mismo navegador. */
  const abrir = async (S, nombre, opts) => {
    opts = opts || {};
    const context = opts.mismo ? opts.mismo.context() : await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    if (!opts.mismo) { contextos.push(context); await context.exposeFunction('__gs', (body) => S.post(body)); await context.addInitScript(INIT); await context.route(/^https?:/, r => r.abort()); }
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(nombre+': '+e.message));
    page.on('dialog', d => d.accept());
    await page.goto('file://' + (opts.file || PEDIDOS), { waitUntil:'load' });
    await prep(page);
    return page;
  };
  const recargar = async (page) => { await page.reload({ waitUntil:'load' }); await prep(page); };
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  /* Espera hasta que se cumpla (sin plazo fijo): con la batería cargando la máquina, 600 ms no
     alcanzaban para un borrado que relee la planilla antes (salió 49/1 una vez). */
  const hasta = async (cond, ms) => { const fin = Date.now() + (ms||15000); while (Date.now() < fin) { if (await cond()) return true; await new Promise(r => setTimeout(r, 100)); } return false; };
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };
  const entradasDe = (s, de) => (s.e||[]).filter(x => x.de===de);
  const moreno = (s) => { const g = s.g && s.g[IM] && s.g[IM].u; return g ? g[Object.keys(g)[0]] : null; };
  const rq = (s, id) => (s.p||[]).filter(x => x.id===(id||'rq1'))[0] || null;
  /* Recibir `u` unidades de un pedido a fábrica o recogida, como el botón «✅ Llegó» con su casilla. */
  const recibir = (page, id, u) => page.evaluate(async (a) => {
    var inp=document.createElement('input'); inp.id='stk-rec-'+a.id; inp.value=String(a.u); document.body.appendChild(inp);
    recibirStockPedido(a.id); inp.remove(); await quieto();
  }, { id:id, u:u });

  // ══ 1. Dos anotaciones DISTINTAS a la vez (la base de §4fz) ═════════════════════════
  await esc('1. Stock: una entrada de A y un pedido a fábrica de B, con la misma copia', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await A.evaluate(async () => { var k=Object.keys(STOCK.c.u)[0]; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock(); await quieto(); });
    await B.evaluate(async () => { STOCK.p=(STOCK.p||[]).concat([{ id:'q1', k:'K2|140X190', u:8, fab:'MORENO', f:todayStr(), esp:'', r:'' }]); guardarStock(); await quieto(); });
    const s = S.stock();
    chk('⚠️ §4fz · la entrada de 5 de A SIGUE en la planilla después del guardado de B', (s.e||[]).filter(x => x.u===5).length===1, JSON.stringify(s.e));
    chk('…y el pedido a fábrica de 8 de B también', (s.p||[]).some(x => x.id==='q1' && x.u===8), JSON.stringify(s.p));
    const r = await B.evaluate(() => ({ e:(STOCK.e||[]).length, p:(STOCK.p||[]).length, rojos:window._toasts.filter(function(t){ return /^err/.test(t); }) }));
    chk('…B quedó con las dos en pantalla, sin ningún aviso rojo', r.e===1 && r.p===2 && !r.rojos.length, r);
    chk('…y no quedó ningún «rechazo» del stock anotado en el servidor', !S.shR._datos.some(f => f[3]==='__stock__'), S.shR._datos.length+' filas');
  });

  // ══ 2. LAS RECEPCIONES (lo que pidió Codex) ═════════════════════════════════════════
  await esc('2a. La MISMA recogida completa recibida en A y en B', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await recibir(A, 'rq1', 3); await recibir(B, 'rq1', 3);
    const s = S.stock(), q = rq(s);
    chk('⚠️ §4fz-b · una sola entrada de 3 al depósito (antes: dos)', entradasDe(s,'rq1').length===1 && entradasDe(s,'rq1')[0].u===3, entradasDe(s,'rq1').map(x=>x.u));
    chk('⚠️ …Moreno queda en 7, no en 4', moreno(s)===7, moreno(s));
    chk('…la recogida queda recibida una vez (3 de 3, con una recepción)', q && q.r && q.ru===3 && (q.recs||[]).length===1, q && { ru:q.ru, u:q.u, r:q.r, recs:(q.recs||[]).length });
    const t = await B.evaluate(() => window._toasts.filter(function(x){ return /DOS dispositivos/.test(x); }));
    chk('…y B avisa que la llegada se anotó dos veces y se contó una', t.length===1, t[0]);
  });
  await esc('2b. Dos recepciones PARCIALES de verdad a la vez (1 y 2 de 3)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await recibir(A, 'rq1', 1); await recibir(B, 'rq1', 2);
    const s = S.stock(), q = rq(s);
    chk('⚠️ §4fz-b · quedan las DOS entradas (1 y 2)', entradasDe(s,'rq1').map(x=>x.u).sort().join(',')==='1,2', entradasDe(s,'rq1').map(x=>x.u));
    chk('…Moreno 10 − 1 − 2 = 7', moreno(s)===7, moreno(s));
    chk('…y la recogida queda completa (3 de 3)', q && q.r && q.ru===3, q && { ru:q.ru, u:q.u, r:q.r });
    const t = await B.evaluate(() => window._toasts.filter(function(x){ return /casi a la vez/.test(x); }));
    chk('…B avisa que dos dispositivos anotaron llegadas casi a la vez (por si era la misma)', t.length===1, t[0]);
  });
  await esc('2c. La MISMA parcial anotada dos veces (2 y 2 de 3: pasa lo pedido)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await recibir(A, 'rq1', 2); await recibir(B, 'rq1', 2);
    const s = S.stock(), q = rq(s);
    chk('⚠️ §4fz-b · se cuenta UNA (no 4 de 3): una entrada de 2', entradasDe(s,'rq1').length===1 && entradasDe(s,'rq1')[0].u===2, entradasDe(s,'rq1').map(x=>x.u));
    chk('…Moreno 8, y la recogida sigue abierta con 1 pendiente', moreno(s)===8 && q && !q.r && q.u===1, q && { moreno:moreno(s), u:q.u, r:q.r });
    const t = await B.evaluate(() => window._toasts.filter(function(x){ return /DOS dispositivos/.test(x); }));
    chk('…y se avisa', t.length===1, t[0]);
  });
  await esc('2d. Reenvío después de perder la respuesta (recogida y entrada)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    await A.evaluate(async () => { __regla({act:'save', id:'__stock__', mode:'lose'}); });
    await recibir(A, 'rq1', 3);
    let s = S.stock();
    chk('⚠️ §4fz-b · la recogida con la respuesta perdida: una entrada y Moreno 7', entradasDe(s,'rq1').length===1 && moreno(s)===7, { e:entradasDe(s,'rq1').map(x=>x.u), moreno:moreno(s) });
    await A.evaluate(async () => { var k=Object.keys(STOCK.c.u)[0];
      __regla({act:'save', id:'__stock__', mode:'lose'}); __regla({act:'save', id:'__stock__', mode:'drop'});   // se pierde, y el reintento no sale
      STOCK.e=(STOCK.e||[]).concat([{ id:'e5', f:todayStr(), k:k, u:5, fab:'', ts:Date.now() }]); guardarStock(); await quieto();
      await flushPending(); await quieto(); });
    s = S.stock();
    const cola = await A.evaluate(() => getPending().length);
    chk('⚠️ …una entrada de 5 que se perdió, quedó en la cola y salió después: está UNA vez', (s.e||[]).filter(x=>x.u===5).length===1, (s.e||[]).map(x=>x.u));
    chk('…y la cola quedó vacía', cola===0, cola);
  });

  // ══ 3. Recargas y memoria ═════════════════════════════════════════════════════════
  await esc('3a. Recargar con el stock en la cola, y anotar algo más (E2)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    await A.evaluate(() => { var k=Object.keys(STOCK.c.u)[0]; CONNECTED=false; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock(); });
    await recargar(A);
    await A.evaluate(async () => { await quieto(); await esperar(300); STOCK.p=(STOCK.p||[]).concat([{ id:'fpX', k:'K2|140X190', u:4, fab:'MORENO', f:todayStr(), esp:'', r:'' }]); guardarStock(); await quieto(); });
    const s = S.stock();
    chk('⚠️ §4fz-b · no se borró nada: conteo, Moreno, la recogida y la entrada de 5 siguen, más lo nuevo',
        s.c && s.c.f && moreno(s)===10 && !!rq(s) && (s.e||[]).some(x=>x.u===5) && !!rq(s,'fpX'), { cf:s.c.f, moreno:moreno(s), p:(s.p||[]).map(x=>x.id), e:(s.e||[]).map(x=>x.u) });
  });
  await esc('3b. Recargar con el stock en la cola mientras B recibió la recogida (E3)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await A.evaluate(() => { var k=Object.keys(STOCK.c.u)[0]; CONNECTED=false; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock(); });
    await recibir(B, 'rq1', 3);
    await recargar(A);
    await A.evaluate(async () => { await quieto(); await esperar(300); await flushPending(); await quieto(); });
    const s = S.stock(), q = rq(s);
    chk('⚠️ §4fz-b · la recogida de B sigue recibida y Moreno en 7 (antes la cola de A la reabría)', q && q.r && moreno(s)===7, q && { r:q.r, moreno:moreno(s) });
    chk('…y la entrada de 5 de A también está', (s.e||[]).some(x=>x.u===5) && entradasDe(s,'rq1').length===1, (s.e||[]).map(x=>x.u+(x.de?('←'+x.de):'')));
  });
  await esc('3c. La memoria de la pestaña se perdió con un cambio en la cola', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    await A.evaluate(() => { var k=Object.keys(STOCK.c.u)[0]; CONNECTED=false; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock();
      try{ sessionStorage.removeItem(SS_SIS); }catch(e){} });   // la memoria de la pestaña se perdió (el navegador sin lugar, datos borrados)
    S.otroTocaStock(st => { st.p.push({ id:'qC', k:'K2|140x190', u:8, fab:'MORENO', f:hoy, esp:'', r:'' }); });
    await recargar(A);
    await A.evaluate(async () => { await quieto(); await esperar(300); await flushPending(); await quieto(); });
    const s = S.stock();
    chk('⚠️ §4fz-b · la entrada de la cola llega igual, sin pisar lo que otro guardó', (s.e||[]).some(x=>x.u===5) && !!rq(s,'qC') && !!rq(s), { e:(s.e||[]).map(x=>x.u), p:(s.p||[]).map(x=>x.id) });
  });
  await esc('3d. Una foto VIEJA en la cola no revive lo que se canceló después', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    await A.evaluate(async () => { __regla({act:'save', id:'__stock__', mode:'busy'});
      STOCK.p=(STOCK.p||[]).concat([{ id:'fpV', k:'K2|140X190', u:4, fab:'MORENO', f:todayStr(), esp:'', r:'' }]); guardarStock(); await quieto(); });
    const antes = await A.evaluate(() => getPending().map(function(x){ return x.id; }));
    await A.evaluate(async () => { cancelarStockPedido('fpV'); await quieto(); await flushPending(); await quieto(); });
    const s = S.stock();
    chk('(partida) el primer guardado quedó en la cola', antes.indexOf('__stock__')>=0, antes);
    chk('⚠️ §4fz-b · el pedido cancelado NO vuelve a la planilla cuando sale la cola', !rq(s,'fpV'), (s.p||[]).map(x=>x.id));
  });

  // ══ 4. Dos pestañas del mismo navegador ═══════════════════════════════════════════
  await esc('4. La pestaña B manda la cola de la pestaña A y hay choque (E4)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'); const B = await abrir(S,'B', { mismo:A });
    await A.evaluate(() => { var k=Object.keys(STOCK.c.u)[0]; CONNECTED=false; STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:5, fab:'' }]); guardarStock(); CONNECTED=true; });
    S.otroTocaStock(st => { st.p.push({ id:'qC', k:'K2|140x190', u:8, fab:'MORENO', f:hoy, esp:'', r:'' }); });
    /* B manda la cola cuando la VE: entre pestañas el localStorage llega con un instante de
       retraso, y con la batería cargando la máquina B vaciaba la cola antes de ver lo de A (salió
       49/1 dos veces: B no mandaba nada). En la vida real B la manda a los 2 minutos o al tocar
       «Reintentar». */
    await hasta(() => B.evaluate(() => getPending().some(function(x){ return x.id==='__stock__'; })));
    await B.evaluate(async () => { await flushPending(); await quieto(); });
    const s = S.stock();
    chk('⚠️ §4fz-b · la entrada de A está en la planilla (antes B la tiraba en silencio)', (s.e||[]).filter(x=>x.u===5).length===1, (s.e||[]).map(x=>x.u));
    chk('…con lo que guardó el otro dispositivo', !!rq(s,'qC'), (s.p||[]).map(x=>x.id));
  });

  // ══ 5. Otras juntas ═══════════════════════════════════════════════════════════════
  await esc('5a. El mismo «Unir» hecho en dos dispositivos (E6)', async () => {
    const S = servidor(); sembrar(S);
    S.otroTocaStock(st => { st.c.u['KX|140x190']=2; st.e=[{ id:'eX', f:hoy, k:'KX|140x190', u:4, fab:'' }]; });
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    const unir = (P) => P.evaluate(async () => {
      var ks=Object.keys(STOCK.c.u), kx=ks.filter(function(k){ return /^KX/.test(k); })[0], k1=ks.filter(function(k){ return /^K1/.test(k); })[0];
      var sel=document.createElement('select'); sel.id='stk-unir-a'; var o=document.createElement('option'); o.value=k1; sel.appendChild(o); document.body.appendChild(sel); sel.value=k1;
      guardarStockUnir(kx); sel.remove(); await quieto(); });
    await unir(A); await unir(B);
    const s = S.stock(), k1 = Object.keys(s.c.u).filter(k=>/^K1/.test(k))[0];
    chk('⚠️ §4fz-b · una sola entrada de 4, renombrada (antes: dos)', (s.e||[]).length===1 && /^K1/.test(s.e[0].k), (s.e||[]).map(x=>x.k+':'+x.u));
    chk('…y el conteo suma una vez: 10 + 2 = 12', s.c.u[k1]===12, s.c.u);
  });
  await esc('5b. Excel nuevo de Moreno en B después de una recepción en A', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await recibir(A, 'rq1', 3);
    await B.evaluate(async (IM) => { var k=Object.keys(STOCK.g[IM].u)[0]; var u={}; u[k]=7;
      STOCK.g[IM]={ f:todayStr(), u:u, hora:'15:00:00', solo0:false, cod:{}, t:Date.now(), rs:{} }; guardarStock(); await quieto(); }, IM);
    const s = S.stock();
    chk('§4fz-b · la foto nueva manda (Moreno 7, no 7 − 3 = 4: la recepción ya estaba adentro del Excel)', moreno(s)===7 && s.g[IM].hora==='15:00:00', moreno(s));
    chk('…y la recogida sigue recibida, con su entrada', rq(s).r && entradasDe(s,'rq1').length===1, rq(s));
  });
  await esc('5c. Una llegada anotada ANTES del conteo de otro no se suma dos veces', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await B.evaluate(() => { var k=Object.keys(STOCK.c.u)[0]; CONNECTED=false; STOCK.e=(STOCK.e||[]).concat([{ id:'eB', f:todayStr(), k:k, u:5, fab:'', ts:Date.now() }]); guardarStock(); });
    await A.evaluate(async () => { await esperar(20); var k=Object.keys(STOCK.c.u)[0]; var u={}; u[k]=15; STOCK.c={ f:todayStr(), u:u, t:Date.now() }; STOCK.e=[]; guardarStock(); await quieto(); });
    await B.evaluate(async () => { CONNECTED=true; await flushPending(); await quieto(); });
    const s = S.stock(), k1 = Object.keys(s.c.u)[0];
    chk('§4fz-b · el conteo de A (15) queda, y la entrada de 5 de B —anotada antes— no se le suma', s.c.u[k1]===15 && !(s.e||[]).some(x=>x.u===5), { c:s.c.u, e:(s.e||[]).map(x=>x.u) });
    await A.evaluate(async () => { var k=Object.keys(STOCK.c.u)[0]; STOCK.e=(STOCK.e||[]).concat([{ id:'eA', f:todayStr(), k:k, u:2, fab:'', ts:Date.now() }]); guardarStock(); await quieto(); });
    chk('…pero una llegada DESPUÉS del conteo sí suma', (S.stock().e||[]).some(x=>x.u===2), (S.stock().e||[]).map(x=>x.u));
  });

  // ══ 6. Arqueo ═════════════════════════════════════════════════════════════════════
  await esc('6a. Arqueo: la caja de A y el extracto de B', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await A.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|Efectivo']=950; guardarArqueo(); await quieto(); });
    await B.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|QR BISA']=2000; guardarArqueo(); await quieto(); });
    const arq = String(S.fila('__arqueo_cuadre__').observaciones);
    chk('⚠️ §4fz · quedan los dos', /Efectivo=950/.test(arq) && /QR BISA=2000/.test(arq), arq);
  });
  await esc('6b. Arqueo: A lo anota sin señal y recarga; B corrigió otra forma (E7)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await A.evaluate(() => { CONNECTED=false; ARQUEO['mes|'+todayStr().slice(0,7)+'|QR BISA']=2000; guardarArqueo(); });
    await B.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|Efectivo']=950; guardarArqueo(); await quieto(); });
    await recargar(A);
    await A.evaluate(async () => { await quieto(); await esperar(300); await flushPending(); await quieto(); });
    const arq = String(S.fila('__arqueo_cuadre__').observaciones);
    chk('⚠️ §4fz-b · la corrección de B (950) no se revierte, y el QR de A entra', /Efectivo=950/.test(arq) && /QR BISA=2000/.test(arq), arq);
  });

  // ══ 7. Borrar ═════════════════════════════════════════════════════════════════════
  await esc('7a. Borrar desde una vista vieja una venta que B acaba de cobrar', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await B.evaluate(async () => { var p=findById('V1'); p.saldo=0; p.pagado=true; p.metodoPago='QR BISA 1000 @'+todayStr()+' #900 %QB1'; persistPedido(p); await quieto(); });
    const r = await A.evaluate(async () => { window._toasts=[]; var res=await realDelete('V1'); var p=findById('V1');
      return { conflicto:!!(res&&res.conflicto), enA:!!p, pagado:p&&p.pagado, toasts:window._toasts.slice() }; });
    chk('⚠️ §4fz · NO se borra', !!S.fila('V1') && S.fila('V1').pagado===true, S.fila('V1')?'sigue, pagada':'¡la borró!');
    chk('…A la ve de nuevo, pagada, y el aviso dice qué cambió', r.enA && r.pagado===true && r.toasts.some(t => /NO se borró/.test(t) && /PAGADA/.test(t)), r.toasts.slice(-1)[0]);
    const r2 = await A.evaluate(async () => { var res=await realDelete('V2'); return { ok:res&&res.ok, enA:!!findById('V2') }; });
    chk('§4fz · (control) una venta que nadie cambió se borra', r2.ok===true && !r2.enA && !S.fila('V2'), r2);
  });
  await esc('7b. Borrar con un guardado PROPIO en el aire (P1)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    const r = await A.evaluate(async () => {
      __regla({act:'save', id:'V1', mode:'hold', name:'sv'});
      var p=findById('V1'); p.chofer='ANA'; persistPedido(p);
      window._toasts=[]; setTimeout(function(){ __soltar('sv'); }, 800);
      var out=await realDelete('V1'); await quieto(); await refrescarEstado();
      return { ok:out&&out.ok, conflicto:!!(out&&out.conflicto), enA:!!findById('V1') };
    });
    chk('⚠️ §4fz-b · se borra, y el guardado que estaba en el aire NO la vuelve a crear', !S.fila('V1') && r.ok && !r.enA, { planilla:S.fila('V1')?'¡volvió!':'borrada', r:r });
  });
  await esc('7c. Borrar con la respuesta perdida (E9)', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    const r = await A.evaluate(async () => {
      __regla({act:'delete', id:'V1', mode:'lose'});
      window._toasts=[]; var out=await realDelete('V1');
      return { ok:out&&out.ok, enA:!!findById('V1'), toasts:window._toasts.slice() };
    });
    chk('⚠️ §4fz-b · se borró, y no vuelve a la pantalla diciendo «sigue ahí» (antes: al corregirla se recreaba)', !S.fila('V1') && r.ok && !r.enA, r);
  });
  await esc('7d. Retiros: uno que salió de la cola y uno que sigue en la cola', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    await A.evaluate(async () => {
      CONNECTED=false;
      await persistRetiro(filaDeRetiro({ id:'__ret_p1__', fecha:todayStr(), entrega:'Carola Chavez', retira:'Contabilidad', monto:500, notas:['900'], tipo:'Facturado', fotos:[], obs:'' }));
      CONNECTED=true; await flushPending(); await quieto();
      window._toasts=[]; borrarRetiro('__ret_p1__');
    });
    await hasta(async () => !S.fila('__ret_p1__') || (await A.evaluate(() => window._toasts.some(function(t){ return /^err/.test(t); }))));
    chk('⚠️ §4fz-b · el retiro que salió de la cola se borra (antes: falso «lo corrigió otra persona»)', !S.fila('__ret_p1__'), S.fila('__ret_p1__')?'sigue':'borrado');
    await A.evaluate(async () => {
      CONNECTED=false;
      await persistRetiro(filaDeRetiro({ id:'__ret_p2__', fecha:todayStr(), entrega:'Carola Chavez', retira:'Contabilidad', monto:700, notas:['901'], tipo:'Facturado', fotos:[], obs:'' }));
      CONNECTED=true; window._toasts=[]; borrarRetiro('__ret_p2__');
    });
    await hasta(() => A.evaluate(() => window._toasts.some(function(t){ return /Retiro borrado|No se pudo|no confirmó/.test(t); })));
    await A.evaluate(async () => { await flushPending(); await quieto(); });
    chk('⚠️ §4fz-b · el retiro que seguía en la cola NO se crea al salir la cola (P2)', !S.fila('__ret_p2__'), S.fila('__ret_p2__')?'¡se creó!':'no está');
  });
  await esc('7e. «Descartar» un borrador de Kommo que otra ya completó', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await B.evaluate(async () => { var b=BORRADORES.filter(function(x){ return x.id==='kommo-777'; })[0];
      var p=JSON.parse(JSON.stringify(b)); p.estado=''; p.fecha=todayStr(); p.turno='AM'; p.zona='Norte'; p.nota='950';
      BORRADORES=BORRADORES.filter(function(x){ return x.id!=='kommo-777'; }); STATE.unshift(p); persistPedido(p); await quieto(); });
    await A.evaluate(() => { window._toasts=[]; descartarBorrador('kommo-777'); });
    await hasta(() => A.evaluate(() => window._toasts.some(function(t){ return /NO se descartó|No se pudo|no confirmó/.test(t); })) );
    const t = await A.evaluate(() => window._toasts.slice());
    chk('⚠️ §4fz · no se borra el pedido que completó B', !!S.fila('kommo-777'), S.fila('kommo-777')?'sigue':'¡lo borró!');
    chk('…y lo dice', t.some(x => /NO se descartó/.test(x)), t.slice(-1)[0]);
  });

  // ══ 8. El panel VIEJO contra el servidor nuevo ═════════════════════════════════════
  let VIEJO = null;
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-viejo-'));
    fs.writeFileSync(path.join(dir,'pedidos.html'), cp.execSync('git show ebc3eab:pedidos.html', { maxBuffer:64*1024*1024 }));
    fs.writeFileSync(path.join(dir,'productos-mes.js'), cp.execSync('git show ebc3eab:productos-mes.js', { maxBuffer:16*1024*1024 }));
    VIEJO = path.join(dir,'pedidos.html');
  } catch(e) { console.log('\n(sin git: se saltea la sección 8, panel viejo)'); }
  if (VIEJO) await esc('8. Panel VIEJO (ebc3eab, abierto desde antes de publicar) contra este servidor', async () => {
    const S = servidor(); sembrar(S);
    const N = await abrir(S,'nuevo');
    await N.evaluate(async () => { STOCK.p=(STOCK.p||[]).concat([{ id:'qN', k:'K2|140X190', u:8, fab:'MORENO', f:todayStr(), esp:'', r:'' }]); guardarStock(); await quieto(); });
    const V = await abrir(S,'viejo', { file:VIEJO });
    const antes = S.fila('__stock__').observaciones;
    await V.evaluate(async () => { var k=Object.keys(STOCK.c.u)[0];
      STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:k, u:6, fab:'' }]); guardarStock(); await esperar(400);
      STOCK.e=STOCK.e.concat([{ f:todayStr(), k:k, u:7, fab:'' }]); guardarStock(); await esperar(600); });
    await hasta(() => S.shR._datos.filter(f => f[2]==='actualizar').length >= 2 || !/qN/.test(S.fila('__stock__').observaciones));
    const despues = S.fila('__stock__').observaciones;
    chk('⚠️ §4fz-b · el panel viejo NO pisa el stock (el servidor le contesta `actualizar`)', despues===antes && /qN/.test(despues), despues===antes?'intacto':'¡lo pisó!');
    chk('…ni su 2° guardado seguido, que sí llevaba sello (#8 de la auditoría)', !/"u":7/.test(despues), '');
    chk('…y queda anotado en «Rechazos» para que Administración vea la computadora vieja', S.shR._datos.some(f => f[2]==='actualizar'), S.shR._datos.length+' filas');
    const vd = await V.evaluate(async () => { var r=await apiDelete('V2'); return r; });
    chk('⚠️ §4fz-b · un borrado del panel viejo (sin sello) tampoco pasa', !!S.fila('V2') && vd && vd.error==='actualizar', vd);
    const vs = await V.evaluate(async () => { var p=findById('V1'); p.chofer='BETO'; var r=await apiSave(p); return r && r.ok; });
    chk('…pero los pedidos los sigue guardando como siempre (eso ya pedía sello desde §4ce)', vs===true && S.fila('V1').chofer==='BETO', S.fila('V1').chofer);
    // Esa computadora recarga y le llega el panel nuevo: lo que tenía en la cola se junta.
    await V.goto('file://'+PEDIDOS, { waitUntil:'load' }); await prep(V);
    await V.evaluate(async () => { await quieto(); await esperar(300); await flushPending(); await quieto(); });
    const s = S.stock();
    chk('⚠️ §4fz-b · al recargar con el panel nuevo, lo que el viejo dejó en la cola entra, junto con lo del otro', (s.e||[]).some(x=>x.u===6) && (s.e||[]).some(x=>x.u===7) && !!rq(s,'qN'), { e:(s.e||[]).map(x=>x.u), p:(s.p||[]).map(x=>x.id) });
  });

  chk('sin errores JS en los navegadores', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
