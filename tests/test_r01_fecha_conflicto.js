/* 📅⚔️ R-01 (revalidación de Codex, 27/10): LA FECHA DE UNA VENTA DE TIENDA QUE OTRO CAMBIÓ A LA VEZ.

   La «Fecha de la venta» (§4nm) mueve el `ts`. `mismoContenido` lo saltaba, así que si A cambiaba la fecha al 30/09 y B, un instante
   antes, la había guardado en 29/09, el «conflicto» del servidor (con la fila de B, igual a la de A en todo menos el `ts`) se tomaba
   por un «ok tardío»: A veía «guardado», se quedaba con el sello de B y su guardado siguiente (solo las observaciones) volvía a poner
   el 30/09, pisando a B sin que nadie lo viera.

   LO QUE CUIDA (la página de verdad contra el .gs de verdad, con un Google de mentira; B guarda desde afuera):
   1. A no da por guardado su cambio: la pantalla queda con la fecha de la planilla (29/09) y nada queda en la cola.
   2. El guardado siguiente de A (solo observaciones) deja la fecha de B (29/09) en la planilla.
   3. Control: si a A se le pierde la respuesta y nadie más tocó la venta, el reintento se reconoce como ya guardado (sin choque ni
      duplicado) y la fecha queda en 30/09.
   4. Si se le pierde la respuesta y B cambia SOLO la fecha antes del reintento, el reintento tampoco pasa por «ya guardado».
   La venta lleva un pago de OTRO día (05/10), así lo único distinto entre A y B es el `ts`. Ventas inventadas. Reloj clavado en el martes 27/10/2026, 15:00 de Bolivia.
   Se corre:  node tests/test_r01_fecha_conflicto.js   (dientes: PEDIDOS=/ruta/a/pedidos_viejo.html) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,420)):''); };

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
      setValues: (v) => { for(let i=0;i<v.length;i++){ const r=datos[fila-1+i]||(datos[fila-1+i]=[]); for(let j=0;j<v[i].length;j++) r[col-1+j]=v[i][j]; } },
      setFontWeight: () => {}
    })
  };
}
function servidor(src){
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
  vm.runInContext(src, ctx);
  const post = (bodyTxt) => ctx.doPost({ postData:{ contents: bodyTxt }, parameter:{} })._t;
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const fila = (id) => filas().filter(r => String(r.id)===String(id))[0] || null;
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  return { post, filas, fila, guardar };
}
/* La página habla con el servidor de arriba. `__ctl.perder`: el próximo guardado LLEGA a la planilla, pero la respuesta se pierde. */
function INIT(){
  try{ localStorage.setItem('me_mis_vendedor', 'Fernando Peinado'); }catch(e){}
  window.__ctl={ perder:false, saves:0 };
  window.fetch=function(url, o){
    var body=(o && o.body) || '{}', P={}; try{ P=JSON.parse(body); }catch(e){}
    if(P.action==='save') window.__ctl.saves++;
    return window.__gs(body).then(function(t){
      if(P.action==='save' && window.__ctl.perder){ window.__ctl.perder=false; throw new TypeError('Failed to fetch'); }
      return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } };
    });
  };
}
const diaBo = (ts) => new Date(Number(ts) - 4*3600000).toISOString().slice(0,10);
const tsDia = (d) => Date.parse(d+'T10:15:00-04:00');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const venta = (id, nota) => ({ id, nota, oc:'10-9'+nota.slice(-2), cliente:'CLIENTE INVENTADO '+nota, celular:'7000'+nota, nit:'1', turno:'', zona:'TIENDA',
    direccion:'SALIÓ DE TIENDA · Charcas', fecha:'', maps:'', observaciones:'', garantia:'', facturarA:'', estado:'', entregado:true, verificado:true,
    vehiculo:'', chofer:'', nroDia:0, fotos:[], vendedor:'Fernando Peinado', ts:tsDia('2026-10-01'), rev:0, acuenta:0, saldo:0, pagado:true,
    metodoPago:'~Efectivo 1480 @2026-10-05 #'+nota+' %IMG1', productos:[{ desc:'COLCHON CONFORT PLUS', medida:'140x190', cant:1, precio:1480 }] });   // el pago es de OTRO día: no se muda con la fecha

  const abrir = async (S) => {
    const context = await browser.newContext({ viewport:{ width:1500, height:1000 }, timezoneId:'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, rr => rr.abort());
    const p = await context.newPage();
    p.on('pageerror', e => errores.push(e.message));
    p.on('dialog', d => d.accept());
    await p.clock.setFixedTime(new Date('2026-10-27T15:00:00-04:00'));
    await p.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await p.waitForTimeout(400);
    await p.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok';
      try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
      await refrescarEstado();
    });
    return p;
  };
  const leer = (p, id) => p.evaluate((id) => { var q=findById(id), pend=getPending().filter(function(x){ return String(x.id)===id; });
    return { dia:q?isoDeTsBolivia(q.ts):'', rev:q&&q.rev, cola:pend.length, toasts:window._toasts.slice(), edit:typeof EDIT_ID!=='undefined'?EDIT_ID:null }; }, id);
  const guardarFecha = async (p, id, dia) => { await p.evaluate((a) => { window._toasts=[]; showView('form'); editPedido(a.id); }, { id });
    await p.waitForTimeout(200);
    await p.evaluate((a) => { document.getElementById('f-fecha-venta').value=a.dia; submitPedido(); }, { dia }); };
  const guardarObs = async (p, id, obs) => { await p.evaluate((a) => { window._toasts=[]; showView('form'); editPedido(a.id); }, { id });
    await p.waitForTimeout(200);
    await p.evaluate((a) => { document.getElementById('f-obs').value=a.obs; submitPedido(); }, { obs }); };

  /* ── 1 y 2: B cambia la fecha mientras A tiene la venta abierta ── */
  const S = servidor(fs.readFileSync(GS, 'utf8'));
  S.guardar(venta('T1', '9174'));
  const A = await abrir(S);
  let r = await leer(A, 'T1');
  chk('0. A ve la venta del 01/10 que está en la planilla', r.dia==='2026-10-01', r);
  // A abre la venta y elige el 30/09; justo antes de que guarde, B (otra compu) la pone en 29/09 con el sello vigente
  await A.evaluate(() => { showView('form'); editPedido('T1'); });
  await A.waitForTimeout(200);
  const b0 = S.fila('T1'), bRes = S.guardar(Object.assign({}, b0, { ts:tsDia('2026-09-29') }));
  chk('0b. B guardó el 29/09 (sello nuevo)', bRes.ok && diaBo(S.fila('T1').ts)==='2026-09-29', { ok:bRes.ok, rev:S.fila('T1').rev });
  await A.evaluate(() => { window._toasts=[]; document.getElementById('f-fecha-venta').value='2026-09-30'; submitPedido(); });
  await A.waitForTimeout(900);
  r = await leer(A, 'T1');
  chk('1a. la planilla sigue con la fecha de B (29/09)', diaBo(S.fila('T1').ts)==='2026-09-29', diaBo(S.fila('T1').ts));
  chk('1b. A NO lo da por guardado: avisa que otra persona la cambió', !r.toasts.some(t=>/guardad/i.test(t) && !/NO se guard/i.test(t)) && r.toasts.some(t=>/otra persona|NO se guard/i.test(t)), r.toasts);
  chk('1c. la pantalla de A queda con la fecha de la planilla (29/09) y nada queda en la cola', r.dia==='2026-09-29' && r.cola===0, r);
  await guardarObs(A, 'T1', 'solo una nota');
  await A.waitForTimeout(900);
  const f2 = S.fila('T1');
  chk('2. el guardado siguiente de A (solo observaciones) deja la fecha de B (29/09) en la planilla', diaBo(f2.ts)==='2026-09-29' && /solo una nota/.test(f2.observaciones||''), { dia:diaBo(f2.ts), obs:f2.observaciones });
  await A.context().close();

  /* ── 3: control — a A se le pierde la respuesta y nadie más la tocó ── */
  const S2 = servidor(fs.readFileSync(GS, 'utf8'));
  S2.guardar(venta('T2', '9175'));
  const A2 = await abrir(S2);
  await A2.evaluate(() => { window.__ctl.perder=true; });
  await guardarFecha(A2, 'T2', '2026-09-30');
  await A2.waitForTimeout(900);
  const fP = S2.fila('T2');
  chk('3a. el guardado llegó a la planilla aunque la respuesta se perdió (30/09)', diaBo(fP.ts)==='2026-09-30', diaBo(fP.ts));
  await A2.evaluate(async () => { try{ await flushPending(); }catch(e){} });
  await A2.waitForTimeout(700);
  r = await leer(A2, 'T2');
  chk('3b. el reintento se reconoce como ya guardado: cola vacía, sello de la planilla y sin aviso de choque', r.cola===0 && Number(r.rev)===Number(S2.fila('T2').rev) && !r.toasts.some(t=>/otra persona/.test(t)), r);
  chk('3c. una sola fila, del 30/09', S2.filas().filter(x=>x.id==='T2').length===1 && diaBo(S2.fila('T2').ts)==='2026-09-30', S2.filas().length);
  await A2.context().close();

  /* ── 4: a A se le pierde la respuesta y, antes del reintento, B cambia SOLO la fecha ── */
  const S3 = servidor(fs.readFileSync(GS, 'utf8'));
  S3.guardar(venta('T3', '9176'));
  const A3 = await abrir(S3);
  await A3.evaluate(() => { window.__ctl.perder=true; });
  await guardarFecha(A3, 'T3', '2026-09-30');
  await A3.waitForTimeout(900);
  S3.guardar(Object.assign({}, S3.fila('T3'), { ts:tsDia('2026-09-28') }));
  await A3.evaluate(async () => { window._toasts=[]; try{ await flushPending(); }catch(e){} });
  await A3.waitForTimeout(700);
  r = await leer(A3, 'T3');
  chk('4. el reintento NO se toma por «ya guardado»: la planilla sigue en 28/09 (lo de B) y A lo ve así', diaBo(S3.fila('T3').ts)==='2026-09-28' && r.dia==='2026-09-28' && r.cola===0, r);
  await A3.context().close();

  chk('sin errores de la página', !errores.length, errores.slice(0,3));
  console.log('\n' + PASS + ' bien / ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
