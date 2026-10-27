/* 🔁 (§4nl, 27/10, auditoría de Astra A02 y A05) Los pases entre tiendas del «🏬 Stock de las tiendas» (§4na).
   A02 · Un pase cuyo guardado SÍ entró pero la respuesta de Google se perdió (las dos, con el reintento de adentro): la pantalla decía
         «❌ No se guardó: http404. Probá de nuevo», y al volver a anotarlo estrenaba OTRO id → dos pases, 4 unidades en vez de 2.
         Ahora el pase lleva su id desde que se arma y lo conserva hasta que el servidor confirma: el reintento va con el MISMO id y la
         junta por id no lo duplica; la pantalla dice «no sé si llegó».
   A05 · `tstJuntar` podaba los pases de más de 120 días aunque todavía contaran para una tienda con un conteo más viejo: guardar
         cualquier cosa (el conteo de OTRA tienda) le cambiaba el saldo. Ahora solo se poda lo que los conteos de las DOS ya absorbieron.
   El panel de verdad contra el google-apps-script.gs de verdad (arnés de test_borr_misma.js). Datos inventados.
   Reloj clavado en el jueves 05/11/2026 a las 09:00 de Bolivia.
   Se corre:  node tests/test_astra_pases.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const RELOJ = '2026-11-05T09:00:00-04:00';
const TST = '__tiendas_stock__';

/* ── El servidor: el .gs real con un Google de mentira (igual que test_borr_misma.js) ── */
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
  const tiendas = () => { const f = fila(TST); try { return JSON.parse((f && f.observaciones) || '{}'); } catch(e) { return {}; } };
  return { ctx, sh, post, fila, guardar, tiendas };
}
/* La fila de las tiendas, como la arma `filaSistema` en el panel. */
const filaTiendas = (D) => ({ id:TST, fecha:'', turno:'', vendedor:'', productos:[], cliente:'🏬 STOCK DE LAS TIENDAS (no tocar: lo lee el panel)',
  celular:'', zona:'', direccion:'', maps:'', pagado:false, saldo:0, ts:Date.parse('2026-10-31T20:00:00-04:00'), metodoPago:'', observaciones:JSON.stringify(D),
  estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:0, verificado:false, fotos:[] });

function INIT(){
  window.__ctl = { rules: [], log: [] };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || '');
    window.__ctl.log.push({ act: act, id: id });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var real = function(){ return window.__gs(body).then(resp); };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { rule = r; r.n--; break; }
    }
    if (!rule) return real();
    /* `perder`: el servidor lo guarda, pero la respuesta no llega (el 404 del redirect vencido de Google, §4fa). */
    if (rule.mode === 'perder') return window.__gs(body).then(function(){ return { ok:false, status:404, json:function(){ return Promise.reject(new Error('x')); }, text:function(){ return Promise.resolve(''); } }; });
    /* `drop`: no llega ni al servidor. */
    if (rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    /* `busy`: el servidor contesta que no (no escribió nada). */
    if (rule.mode === 'busy') return Promise.resolve(resp(JSON.stringify({ ok:false, error:'busy' })));
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const montar = (D) => { const S = servidor(); S.guardar(filaTiendas(D)); return S; };
  const preparar = async (page) => {
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
      await refrescarEstado(); await esperar(200);
    });
  };
  const abrir = async (S, context) => {
    if(!context){
      context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
      await context.exposeFunction('__gs', (body) => S.post(body));
      await context.addInitScript(INIT);
      await context.route(/^https?:/, r => r.abort());
    }
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(350);
    await preparar(page);
    return { page, context };
  };
  /* Anota el pase en la ventana, como la persona: De, A, código, cantidad, Día (hoy) y «Anotar el pase». */
  const anotar = (page, de, a, cod, u) => page.evaluate(async (o) => {
    if(document.getElementById('tst-overlay').style.display!=='flex') abrirTst();
    if(TST_VISTA!=='pase') tstVer('pase');
    document.getElementById('tst-p-de').value=o.de; document.getElementById('tst-p-a').value=o.a;
    document.getElementById('tst-p-c').value=o.cod; tstPaseLeer(); document.getElementById('tst-p-u').value=String(o.u);
    window._toasts=[];
    await tstPaseGuardar(); await esperar(100);
    return { toasts:window._toasts.slice(), vista:TST_VISTA, txt:(document.getElementById('tst-body')||{}).innerText||'' };
  }, { de, a, cod, u });
  const pases = (S) => ((S.tiendas().x)||[]).filter(q => q && !q.an);
  const BASE = () => ({ v:1, s:{
      'Mia Plaza':{ f:'2026-10-31', hora:'19:30', t:1, de:'mano', u:{ 'TITANIO ICE|160x190':5 }, tot:5 },
      'Buenos Aires':{ f:'2026-10-31', hora:'19:30', t:2, de:'mano', u:{}, tot:0 } }, x:[], h:[] });

  console.log('\n── A02 · 1. La respuesta se pierde (dos veces) y se vuelve a anotar igual ──');
  { const S = montar(BASE()), { page, context } = await abrir(S);
    const K = await page.evaluate(() => tstProdDeCodigo('CH1201').k);
    /* Normaliza la clave del conteo a la del panel (por si el alias cambia la escritura). */
    const D0 = BASE(); D0.s['Mia Plaza'].u = {}; D0.s['Mia Plaza'].u[K] = 5; S.guardar(Object.assign(filaTiendas(D0), { rev:S.fila(TST).rev }));
    await page.evaluate(async () => { await refrescarEstado(); await esperar(150); });
    await page.evaluate(() => { __regla({ act:'save', id:'__tiendas_stock__', mode:'perder', n:2 }); });
    const r1 = await anotar(page, 'Mia Plaza', 'Buenos Aires', 'CH1201', 2);
    const p1 = pases(S);
    chk('el servidor lo guardó una vez (la respuesta se perdió, también la del reintento de adentro)', p1.length === 1 && p1[0].u === 2, p1);
    chk('la pantalla NO dice «No se guardó… Probá de nuevo» (no se sabe)', !r1.toasts.some(t => /No se guard[oó]/.test(t) && /Prob[aá] de nuevo/.test(t)), r1.toasts);
    chk('dice que no sabe si llegó y que mire antes de volver a cargarlo', r1.toasts.some(t => /No s[eé] si .*lleg[oó]/.test(t)) && r1.toasts.some(t => /Mir[aá]/.test(t)), r1.toasts);
    chk('la ventana lo muestra en duda, con «🔁 Mandarlo de nuevo»', /No s[eé] si lleg[oó]/.test(r1.txt) && /Mandarlo de nuevo/.test(r1.txt), r1.txt.slice(0, 600));
    const pend = await page.evaluate(() => { try{ return JSON.parse(localStorage.getItem('me_tst_pase_pend')||'[]'); }catch(e){ return 'err'; } });
    chk('el pase queda guardado EN EL APARATO con su id (el mismo que entró a la planilla)', Array.isArray(pend) && pend.length === 1 && p1[0] && pend[0].id === p1[0].id, pend);
    /* La persona sigue la instrucción vieja: vuelve a tocar «Anotar el pase» con lo mismo. */
    const r2 = await anotar(page, 'Mia Plaza', 'Buenos Aires', 'CH1201', 2);
    const p2 = pases(S);
    chk('volver a anotarlo NO lo duplica: un solo pase de 2 en la planilla (antes, dos pases y 4 unidades)', p2.length === 1 && p2[0].u === 2 && p2[0].id === (p1[0] && p1[0].id), p2.map(q => q.id + ':' + q.u));
    chk('con la respuesta, se da por anotado y se cierra el formulario', r2.toasts.some(t => /Pase anotado/.test(t)) && r2.vista === '', r2);
    const s = await page.evaluate((K) => { var T=tstCalcular(); return { mp:T['Mia Plaza'].P[K] && T['Mia Plaza'].P[K].tiene, ba:T['Buenos Aires'].P[K] && T['Buenos Aires'].P[K].tiene,
      pend:(function(){ try{ return JSON.parse(localStorage.getItem('me_tst_pase_pend')||'[]').length; }catch(e){ return -1; } })(), duda:!!document.getElementById('tst-duda') }; }, K);
    chk('los saldos: Mia Plaza 5 → 3, Buenos Aires 0 → 2 (no 1 y 4)', s.mp === 3 && s.ba === 2, s);
    chk('confirmado: ya no queda nada pendiente en el aparato ni el cartel de duda', s.pend === 0 && !s.duda, s);
    await context.close(); }

  console.log('\n── A02 · 2. Se recarga la página: el que entró se reconoce; el que no llegó se manda con el mismo id ──');
  { const S = montar(BASE());
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.post(body)); await context.addInitScript(INIT); await context.route(/^https?:/, r => r.abort());
    let { page } = await abrir(S, context);
    /* a) La respuesta se perdió pero entró: al recargar y abrir la ventana, el panel ve que llegó y lo dice. */
    await page.evaluate(() => { __regla({ act:'save', id:'__tiendas_stock__', mode:'perder', n:2 }); });
    await anotar(page, 'Mia Plaza', 'Buenos Aires', 'CH1201', 1);
    await page.close();
    ({ page } = await abrir(S, context));
    let r = await page.evaluate(async () => { window._toasts=[]; abrirTst(); await esperar(50);
      return { toasts:window._toasts.slice(), duda:!!document.getElementById('tst-duda'), pend:(function(){ try{ return JSON.parse(localStorage.getItem('me_tst_pase_pend')||'[]').length; }catch(e){ return -1; } })() }; });
    chk('recargada: el pase en duda ESTÁ en la planilla → «sí llegó, no lo cargues de nuevo», sin cartel de duda', r.toasts.some(t => /S[IÍ] lleg[oó]/.test(t)) && !r.duda && r.pend === 0, r);
    chk('…y en la planilla sigue uno solo', pases(S).length === 1, pases(S));
    /* b) No llegó ni al servidor (sin señal en el medio): queda en duda y «Mandarlo de nuevo» lo manda con el MISMO id. */
    await page.evaluate(() => { __regla({ act:'save', id:'__tiendas_stock__', mode:'drop', n:2 }); });
    const rb = await anotar(page, 'Charcas', 'Carmelo', 'CH1201', 3);
    const idb = await page.evaluate(() => { try{ return JSON.parse(localStorage.getItem('me_tst_pase_pend')||'[]').map(function(q){ return q.id; }); }catch(e){ return []; } });
    chk('sin respuesta: tampoco dice «No se guardó… Probá de nuevo»', !rb.toasts.some(t => /No se guard[oó]/.test(t)) && idb.length === 1, { t:rb.toasts, idb });
    await page.close();
    ({ page } = await abrir(S, context));
    r = await page.evaluate(async () => { abrirTst(); await esperar(50); var d=document.getElementById('tst-duda'); return { duda:d ? d.innerText.replace(/\s+/g,' ') : '' }; });
    chk('recargada: el que no llegó sigue en duda (lo recuerda el aparato)', /No s[eé] si lleg[oó]/.test(r.duda) && /3 ×/.test(r.duda) && /Charcas/.test(r.duda), r.duda);
    r = await page.evaluate(async () => { window._toasts=[]; var b=document.querySelector('#tst-duda button[data-id]'); if(b) b.click(); for(var i=0;i<40 && TST_ENV;i++) await esperar(50); await esperar(100);
      return { toasts:window._toasts.slice(), duda:!!document.getElementById('tst-duda') }; });
    const pc = pases(S).filter(q => q.de === 'Charcas');
    chk('«🔁 Mandarlo de nuevo» lo guarda con el id que tenía en el aparato, una vez', pc.length === 1 && pc[0].u === 3 && pc[0].id === idb[0] && !r.duda, { pc, idb, r });
    /* c) Un «no» seguro del servidor (ocupado): ahí SÍ es «no se guardó», y no queda nada en duda. */
    await page.evaluate(() => { __regla({ act:'save', id:'__tiendas_stock__', mode:'busy', n:1 }); });
    const rc = await anotar(page, 'Central', 'Mutualista', 'CH1201', 1);
    const pendc = await page.evaluate(() => { try{ return JSON.parse(localStorage.getItem('me_tst_pase_pend')||'[]').length; }catch(e){ return -1; } });
    chk('el servidor dijo que no: «No se guardó… Probá de nuevo», sin cartel de duda ni nada en el aparato', rc.toasts.some(t => /No se guard[oó]: busy/.test(t)) && !/No s[eé] si lleg[oó]/.test(rc.txt) && pendc === 0 && rc.vista === 'pase', { t:rc.toasts, pendc, vista:rc.vista });
    await context.close(); }

  console.log('\n── A05 · La poda de pases viejos no cambia saldos ──');
  { const D = { v:1, s:{
        'Mia Plaza':{ f:'2026-06-30', t:1, de:'mano', u:{}, tot:3 },
        'Charcas':{ f:'2026-06-30', t:2, de:'mano', u:{}, tot:0 },
        'Carmelo':{ f:'2026-10-31', t:3, de:'mano', u:{}, tot:0 },
        'Mutualista':{ f:'2026-10-31', t:4, de:'mano', u:{}, tot:0 } },
      x:[], h:[] };
    const S0 = servidor(); const ctx0 = await browser.newContext({ timezoneId:'America/La_Paz' }); await ctx0.route(/^https?:/, r => r.abort());
    const pg0 = await ctx0.newPage(); await pg0.clock.setFixedTime(new Date(RELOJ)); await pg0.goto('file://' + PEDIDOS, { waitUntil:'load' });
    const K = await pg0.evaluate(() => tstProdDeCodigo('CH1201').k); await ctx0.close();
    D.s['Mia Plaza'].u[K] = 3;
    D.x = [
      { id:'viejo1', f:'2026-07-01', de:'Mia Plaza', a:'Charcas', k:K, u:1, ts:1 },                 // 127 días: todavía cuenta (los dos contados el 30/06)
      { id:'viejo2', f:'2026-06-15', de:'Carmelo', a:'Mutualista', k:K, u:2, ts:2 },                // los dos contados después (31/10): ya está adentro
      { id:'viejo3', f:'2026-06-20', de:'Mia Plaza', a:'Charcas', k:K, u:4, ts:3, an:9 },           // anulado: no cuenta
      { id:'viejo4', f:'2026-06-10', de:'Carmelo', a:'Central', k:K, u:1, ts:4 },                   // Central nunca se contó: no se sabe, se queda
      { id:'nuevo1', f:'2026-11-02', de:'Carmelo', a:'Mutualista', k:K, u:1, ts:5 }                  // reciente
    ];
    const S = montar(D), { page, context } = await abrir(S);
    const antes = await page.evaluate((K) => { var T=tstCalcular(); return { mp:T['Mia Plaza'].P[K].tiene, ch:T['Charcas'].P[K] && T['Charcas'].P[K].tiene }; }, K);
    chk('antes: Mia Plaza 3 − 1 = 2 y Charcas 0 + 1 = 1 (el pase del 01/07 cuenta)', antes.mp === 2 && antes.ch === 1, antes);
    /* Otra tienda guarda su conteo (la junta de siempre, al guardar). */
    await page.evaluate(async () => { TST_PREV={ lista:[{ n:'Buenos Aires', f:'2026-11-05', de:'mano', u:{} }], fuera:[] }; tstPintar(); await tstGuardarConteo(); await esperar(100); });
    const despues = await page.evaluate((K) => { var T=tstCalcular(); return { ba:!!T['Buenos Aires'].base, mp:T['Mia Plaza'].P[K].tiene, ch:T['Charcas'].P[K] && T['Charcas'].P[K].tiene }; }, K);
    chk('después de guardar el conteo de OTRA tienda: Mia Plaza sigue en 2 y Charcas en 1 (antes la poda la subía a 3 y bajaba Charcas a 0)', despues.ba && despues.mp === 2 && despues.ch === 1, despues);
    const ids = (S.tiendas().x || []).map(q => q.id).sort();
    chk('se podan solo los viejos que ya no cuentan: el absorbido por los dos conteos y el anulado; quedan el que cuenta, el de una tienda sin contar y el reciente',
      JSON.stringify(ids) === JSON.stringify(['nuevo1','viejo1','viejo4']), ids);
    const pura = await page.evaluate((D) => { var J=tstJuntar(D, D); return J.x.map(function(q){ return q.id; }).sort(); }, D);
    chk('tstJuntar sola da lo mismo (la misma regla en cualquier junta)', JSON.stringify(pura) === JSON.stringify(['nuevo1','viejo1','viejo4']), pura);
    await context.close(); }

  chk('sin errores de la página', errores.length === 0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
