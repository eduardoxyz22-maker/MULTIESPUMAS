/* 💰 LA PLATA DE LA REVISIÓN EN TRES NIVELES (30/09, bitácora §4hc, RESPUESTA §22): R2-1, A2-1, R2-4 y el freno (X-2).

   Ventas creadas desde el FORMULARIO (no fabricadas a mano) y corregidas desde la ficha de Contabilidad, contra el
   google-apps-script.gs REAL (2026-09-28-a) corriendo en Node con una planilla de mentira. Solo datos inventados.

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 29/09, `2207922`):
   1. A2-1 (diente): una venta cargada «SÍ, pagado» por 2.500 a la que después se le agrega una almohada de 300: «Usar como
      total» tiene que poner de saldo 300 (lo cobrado va en el anticipo con «A cuenta» 0, §4cb), y la venta quedar en 2.800.
      Antes ponía 2.800 y la venta quedaba en 5.300, con el chofer saliendo a cobrar 2.800.
   2. R2-1 a (diente): adelanto mixto Efectivo 1.000 + QR BISA 500 y Contabilidad pasa el anticipo a QR BISA (los dos pagos
      quedan del MISMO método: §4gy A2 ya no los reconoce como mixto, pero «A cuenta» los sigue sumando). «SÍ, pagado» tiene
      que proponer 3.000, no 3.500.
   3. R2-1 b (diente): en esa venta, corregir «A cuenta» desde el formulario se frena y manda a Contabilidad (como el adelanto
      en dos métodos de §4gh B). Antes la venta quedaba en 3.500.
   4. R2-1 c (diente): «Usar como total» propone 1.500, no 1.000 (la venta quedaba en 2.500).
   5. R2-4 (diente): mixto + un tercer pago del mismo día y recibo; Contabilidad corrige el BANCO del 2° método: «A cuenta» sigue
      en 1.500 (antes bajaba a 1.000).
   6. La venta que ya estaba así ANTES del 29/09 («~Efectivo 1000 + Efectivo 500», A cuenta 1.500) (diente): «SÍ, pagado»
      propone 3.000 y queda en 3.000.
   7. X-2 (no se rompe): el freno «Hay pago a cuenta: poné el saldo por cobrar» sigue parando una venta «SÍ, pagado» reabierta
      con NO, A cuenta 2.000 y saldo 0 (el arreglo que propuso el auditor de plata lo apagaba).
   8. Subir el adelanto a mano en una venta con un QR registrado aparte: «Usar como total» descuenta el adelanto NUEVO más el QR
      (500 → 800 con QR 1.000 en una venta de 3.000 → saldo 1.200). El arreglo que propuso el meta-auditor daba 1.500.

   Se corre:  node tests/test_rev30_plata.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2207922.html node tests/test_rev30_plata.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

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
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); },
    putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; }, removeAll(ks){ (ks||[]).forEach(k=>{ delete this._m[k]; }); },
    getAll(ks){ const o={}; (ks||[]).forEach(k=>{ if(Object.prototype.hasOwnProperty.call(this._m,k)) o[k]=this._m[k]; }); return o; } };
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
  const guardar = (p) => JSON.parse(post(JSON.stringify({ action:'save', pedido:p })));
  return { ctx, sh, post, fila, guardar };
}
function INIT(){
  window.__ctl = { log: [] };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    window.__ctl.log.push({ act: P.action || 'save', id: String((P.pedido && P.pedido.id) || P.id || '') });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    return window.__gs(body).then(resp);
  };
}
async function equipo(browser, S, reloj){
  const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  await context.exposeFunction('__gs', (body) => S.post(body));
  await context.addInitScript(INIT);
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  page.__errores = []; page.__dialogos = [];
  page.on('pageerror', e => page.__errores.push(e.message));
  page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date(reloj));
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
  page.__ctx = context;
  return page;
}
function venta(id, metodoPago, o){
  return Object.assign({ id:id, oc:'09-600', nota:'100', turno:'AM', celular:'70000000', nit:'1', zona:'Norte', direccion:'CALLE X', fecha:'2026-09-21', maps:'',
    observaciones:'', garantia:'', facturarA:'', estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, fotos:[],
    vendedor:'Mirian Salazar', cliente:'CLIENTE '+id.toUpperCase(), ts:new Date('2026-09-14T11:00:00-04:00').getTime(),
    productos:[{desc:'COLCHON ORTOPEDICO',medida:'140x190',cant:1,precio:3000}], pagado:false, saldo:0, acuenta:0,
    metodoPago:metodoPago }, o||{});
}
async function crearVenta(page, o){
  return page.evaluate(async (o) => {
    showView('form'); await esperar(150); resetForm(); await esperar(80);
    document.getElementById('f-vendedor').value='Mirian Salazar'; try{ applyVendedorLite(); }catch(e){}
    document.getElementById('f-cliente').value=o.cliente; document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='CALLE 1';
    document.getElementById('f-nota').value=o.nota; document.getElementById('f-fecha').value=o.fecha;
    var c=document.querySelector('#f-productos .prod-card');
    c.querySelector('.prod-desc').value='COLCHON INVENTADO'; c.querySelector('.prod-precio').value=String(o.precio);
    if(o.pagado){
      document.querySelector('#f-pagado button[data-val="SI"]').click(); await esperar(60);
      segSet('f-metodo', o.metodo); updateBancoVisibility(); if(o.banco) segSet('f-banco', o.banco);
      document.getElementById('f-cobrado').value=String(o.cobrado); FORM_COMPS=['IMGP1'];
    } else {
      document.getElementById('f-acuenta').value=String(o.acuenta); document.getElementById('f-saldo').value=String(o.saldo);
      document.getElementById('f-acuenta').dispatchEvent(new Event('input')); updateMetodoVisibility(); await esperar(40);
      segSet('f-metodo', o.metodo); updateBancoVisibility(); if(o.banco) segSet('f-banco', o.banco); FORM_COMPS=['IMGA1'];
      if(o.m2){ toggleMixto(true); await esperar(40); segSet('f-metodo2', o.m2.metodo); pintarMixto(); await esperar(30);
        if(o.m2.banco) segSet('f-banco2', o.m2.banco); document.getElementById('f-monto2').value=String(o.m2.monto); FORM_COMPS2=['IMGQ1']; pintarMixto(); }
    }
    window._toasts=[];
    submitPedido(); await esperar(900); await quieto();
    return (STATE.filter(function(p){ return p.cliente===o.cliente; })[0]||{}).id;
  }, o);
}
const cuenta = (page, id) => page.evaluate((id) => { var p=findById(id); if(!p) return null;
  return { mp:p.metodoPago, acuenta:Number(p.acuenta)||0, saldo:Number(p.saldo)||0, pagado:!!p.pagado, total:ventaTotal(p), cobrado:contaCobrado(p) }; }, id);
const planilla = (page, S, id) => page.evaluate((f) => ({ total:ventaTotal(f), cobrado:contaCobrado(f), saldo:Number(f.saldo)||0, acuenta:Number(f.acuenta)||0, pagado:!!f.pagado }), S.fila(id));
const num = (t) => { var s=String(t||'').replace(/[^\d.,]/g,''); if(!s) return 0; var u=Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if(u>=0 && s.length-u-1===2) return Number(s.slice(0,u).replace(/[.,]/g,'')+'.'+s.slice(u+1)); return Number(s.replace(/[.,]/g,'')); };

/* La venta del mixto de R2-1: creada desde el formulario y con el anticipo pasado a QR BISA desde la ficha de Contabilidad. */
async function mixtoMismoMetodo(browser){
  const S = servidor();
  const A = await equipo(browser, S, '2026-09-14T10:00:00-04:00');
  const id = await crearVenta(A, { cliente:'CLIENTE X2', nota:'5002', fecha:'2026-09-17', precio:3000, pagado:false, acuenta:1500, saldo:1500, metodo:'Efectivo', m2:{ metodo:'QR', banco:'BISA', monto:500 } });
  const errA = A.__errores.slice();
  await A.__ctx.close();
  const C = await equipo(browser, S, '2026-09-15T10:00:00-04:00');
  await C.evaluate(async (id) => {
    var clic=function(re){ var b=Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return re.test(x.innerText); })[0]; if(b){ b.click(); return true; } return false; };
    showView('conta'); await esperar(150); showContaModal(id); await esperar(100);
    clic(/Corregir$/); await esperar(80); clic(/^QR$/); await esperar(80); clic(/BISA/); await esperar(80); clic(/Guardar$/); await esperar(1200); await quieto();
    try{ closeModal(); }catch(e){} }, id);
  const errC = C.__errores.slice();
  await C.__ctx.close();
  return { S, id, errores:errA.concat(errC) };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];

  /* ── 1. A2-1 ── */
  { const S = servidor();
    const A = await equipo(browser, S, '2026-09-14T10:00:00-04:00');
    const id = await crearVenta(A, { cliente:'CLIENTE X1', nota:'5001', fecha:'2026-09-17', precio:2500, pagado:true, metodo:'Efectivo', cobrado:2500 });
    errores.push(...A.__errores); await A.__ctx.close();
    const B = await equipo(browser, S, '2026-09-16T11:00:00-04:00');
    const r = await B.evaluate(async (id) => {
      var o={}; showView('mis'); await esperar(150); editPedido(id); await esperar(350);
      addProdRow('ALMOHADA','',null,1,300); await esperar(50);
      document.querySelector('#f-pagado [data-val="NO"]').click(); await esperar(150);
      usarTotalProds(); await esperar(80); o.saldo=document.getElementById('f-saldo').value;
      window._toasts=[]; submitPedido(); await esperar(1000); await quieto();
      return o; }, id);
    const p = await planilla(B, S, id);
    chk('1. A2-1: «Usar como total» en una venta cargada «SÍ, pagado» (2.500) + almohada de 300 pone de saldo 300, no 2.800', num(r.saldo)===300, { saldo:r.saldo });
    chk('1b. …y la venta queda en 2.800 (antes 5.300), con 2.500 cobrados y 300 por cobrar', p.total===2800 && p.cobrado===2500 && p.saldo===300 && !p.pagado, p);
    errores.push(...B.__errores); await B.__ctx.close(); }

  /* ── 2-4. R2-1 a, b, c ── */
  { const { S, id, errores:e0 } = await mixtoMismoMetodo(browser); errores.push(...e0);
    const B = await equipo(browser, S, '2026-09-16T11:00:00-04:00');
    const ant = await cuenta(B, id);
    chk('2·0. la venta de prueba es la de R2-1: anticipo QR BISA 1.000 + QR BISA 500, A cuenta 1.500, total 3.000', /~QR BISA 1000/.test(ant.mp) && /\+ QR BISA 500/.test(ant.mp) && ant.acuenta===1500 && ant.total===3000, ant);
    const r = await B.evaluate(async (id) => {
      var o={}; showView('mis'); await esperar(150); editPedido(id); await esperar(350);
      document.querySelector('#f-pagado [data-val="SI"]').click(); await esperar(200);
      o.propone=document.getElementById('f-cobrado').value; FORM_COMPS=compsArr(FORM_COMPS).concat(['IMGN']); try{ renderCompForm(); }catch(e){}
      window._toasts=[]; submitPedido(); await esperar(1000); await quieto(); return o; }, id);
    const p = await planilla(B, S, id);
    chk('2. R2-1 a: «SÍ, pagado» propone 3.000 (antes 3.500: el 2° pago se contaba dos veces)', num(r.propone)===3000, { propone:r.propone });
    chk('2b. …y la venta queda pagada en 3.000, con 3.000 cobrados', p.total===3000 && p.cobrado===3000 && p.pagado, p);
    errores.push(...B.__errores); await B.__ctx.close(); }
  { const { S, id, errores:e0 } = await mixtoMismoMetodo(browser); errores.push(...e0);
    const B = await equipo(browser, S, '2026-09-16T11:00:00-04:00');
    const r = await B.evaluate(async (id) => {
      var o={}; showView('mis'); await esperar(150); editPedido(id); await esperar(350);
      document.getElementById('f-acuenta').value='1600'; document.getElementById('f-saldo').value='1400'; document.getElementById('f-acuenta').dispatchEvent(new Event('input')); await esperar(50);
      window._toasts=[]; window.__ctl.log=[]; submitPedido(); await esperar(1000); await quieto();
      o.aviso=window._toasts.slice(-1)[0]||''; o.saves=window.__ctl.log.filter(function(x){ return x.act==='save'; }).length; return o; }, id);
    const p = await planilla(B, S, id);
    chk('3. R2-1 b: corregir «A cuenta» en un adelanto registrado en dos pagos del mismo método se frena y manda a Contabilidad', r.saves===0 && /más de un pago/.test(r.aviso) && /Contabilidad/.test(r.aviso), { saves:r.saves, aviso:String(r.aviso).slice(0,160) });
    chk('3b. …y la venta sigue en 3.000 (antes quedaba en 3.500)', p.total===3000 && p.acuenta===1500, p);
    errores.push(...B.__errores); await B.__ctx.close(); }
  { const { S, id, errores:e0 } = await mixtoMismoMetodo(browser); errores.push(...e0);
    const B = await equipo(browser, S, '2026-09-16T11:00:00-04:00');
    const r = await B.evaluate(async (id) => {
      var o={}; showView('mis'); await esperar(150); editPedido(id); await esperar(350);
      usarTotalProds(); await esperar(80); o.saldo=document.getElementById('f-saldo').value;
      window._toasts=[]; submitPedido(); await esperar(1000); await quieto(); return o; }, id);
    const p = await planilla(B, S, id);
    chk('4. R2-1 c: «Usar como total» propone 1.500 de saldo (antes 1.000)', num(r.saldo)===1500, { saldo:r.saldo });
    chk('4b. …y la venta sigue en 3.000 (antes quedaba en 2.500)', p.total===3000, p);
    errores.push(...B.__errores); await B.__ctx.close(); }

  /* ── 5. R2-4 ── */
  { const S = servidor();
    S.guardar(venta('v4', '~Efectivo 1000 @2026-09-14 #100 %IMGA1 + QR BISA 500 @2026-09-14 #100 %IMGQ1 + Tarjeta 300 @2026-09-14 #100 %IMGT1', { saldo:1200, acuenta:1500 }));
    const C = await equipo(browser, S, '2026-09-28T10:00:00-04:00');
    const r = await C.evaluate(async () => {
      var clic=function(re){ return Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return re.test(x.innerText); }); };
      showView('conta'); await esperar(150); showContaModal('v4'); await esperar(100);
      var eds=clic(/Corregir$/); if(eds[1]) eds[1].click(); await esperar(80);           // el 2° renglón = el QR del mixto
      var ec=clic(/Econ/); if(ec[0]) ec[0].click(); await esperar(80);
      var g=clic(/Guardar$/); if(g[0]) g[0].click(); await esperar(1200); await quieto(); try{ closeModal(); }catch(e){}
      var p=findById('v4');
      showView('mis'); await esperar(150); editPedido('v4'); await esperar(350);
      document.querySelector('#f-pagado [data-val="SI"]').click(); await esperar(200);
      var o={ acuenta:Number(p.acuenta)||0, mp:p.metodoPago, total:ventaTotal(p), propone:document.getElementById('f-cobrado').value };
      try{ resetForm(); }catch(e){}
      return o; });
    const f = S.fila('v4');
    chk('5. R2-4: corregir el BANCO del 2° método (con otro pago del mismo día y recibo) deja «A cuenta» en 1.500 (antes 1.000)', r.acuenta===1500 && (Number(f.acuenta)||0)===1500 && /QR Econ[oó]mico 500/i.test(r.mp), { acuenta:r.acuenta, planilla:f.acuenta, mp:r.mp });
    chk('5b. …el total sigue en 3.000 y «SÍ, pagado» propone 3.000', r.total===3000 && num(r.propone)===3000, { total:r.total, propone:r.propone });
    errores.push(...C.__errores); await C.__ctx.close(); }

  /* ── 6. La venta que ya estaba así antes del 29/09 ── */
  { const S = servidor();
    S.guardar(venta('v2', '~Efectivo 1000 @2026-09-14 #100 %IMGA1 + Efectivo 500 @2026-09-14 #100 %IMGQ1', { saldo:1500, acuenta:1500 }));
    const Vd = await equipo(browser, S, '2026-09-28T10:00:00-04:00');
    const r = await Vd.evaluate(async () => {
      var o={}; showView('mis'); await esperar(150); editPedido('v2'); await esperar(350);
      document.querySelector('#f-pagado [data-val="SI"]').click(); await esperar(200);
      o.propone=document.getElementById('f-cobrado').value;
      FORM_COMPS=compsArr(FORM_COMPS).concat(['IMGNUEVA']);
      window._toasts=[]; submitPedido(); await esperar(1500); await quieto(); return o; });
    const p = await planilla(Vd, S, 'v2');
    chk('6. una venta vieja «~Efectivo 1.000 + Efectivo 500» (A cuenta 1.500): «SÍ, pagado» propone 3.000 (antes 3.500)', num(r.propone)===3000, { propone:r.propone });
    chk('6b. …y queda pagada en 3.000', p.total===3000 && p.pagado, p);
    errores.push(...Vd.__errores); await Vd.__ctx.close(); }

  /* ── 7. X-2: el freno «poné el saldo» sigue ── */
  { const S = servidor();
    const A = await equipo(browser, S, '2026-09-14T10:00:00-04:00');
    const id = await crearVenta(A, { cliente:'CLIENTE Y1', nota:'6001', fecha:'2026-09-17', precio:2500, pagado:true, metodo:'Efectivo', cobrado:2500 });
    errores.push(...A.__errores); await A.__ctx.close();
    const B = await equipo(browser, S, '2026-09-16T11:00:00-04:00');
    const r = await B.evaluate(async (id) => {
      var o={}; showView('mis'); await esperar(150); editPedido(id); await esperar(350);
      document.querySelector('#f-pagado [data-val="NO"]').click(); await esperar(150);
      document.getElementById('f-acuenta').value='2000'; document.getElementById('f-acuenta').dispatchEvent(new Event('input'));
      document.getElementById('f-saldo').value='0'; await esperar(50);
      window._toasts=[]; window.__ctl.log=[]; submitPedido(); await esperar(1000); await quieto();
      o.aviso=window._toasts.slice(-1)[0]||''; o.saves=window.__ctl.log.filter(function(x){ return x.act==='save'; }).length; return o; }, id);
    const p = await planilla(B, S, id);
    chk('7. X-2: el freno «Hay pago a cuenta: poné el saldo por cobrar» sigue parando (A cuenta 2.000, saldo 0 en una venta «SÍ, pagado» de 2.500)', r.saves===0 && /poné el saldo/.test(r.aviso), { saves:r.saves, aviso:String(r.aviso).slice(0,120) });
    chk('7b. …y el adelanto de 2.500 no se reescribió', p.total===2500 && p.cobrado===2500, p);
    errores.push(...B.__errores); await B.__ctx.close(); }

  /* ── 8. Subir el adelanto con un QR registrado aparte ── */
  { const S = servidor();
    S.guardar(venta('v8', '~Efectivo 500 @2026-09-14 #100 %IMGA1 + QR BISA 1000 @2026-09-20 #777 %IMGQ8', { saldo:1500, acuenta:500 }));
    const Vd = await equipo(browser, S, '2026-09-28T10:00:00-04:00');
    const r = await Vd.evaluate(async () => {
      var p=findById('v8'), o={ total0:ventaTotal(p) };
      showView('mis'); await esperar(150); editPedido('v8'); await esperar(350);
      document.getElementById('f-acuenta').value='800'; document.getElementById('f-acuenta').dispatchEvent(new Event('input')); await esperar(50);
      usarTotalProds(); await esperar(80); o.saldo=document.getElementById('f-saldo').value;
      try{ resetForm(); }catch(e){}
      return o; });
    chk('8. subir el adelanto de 500 a 800 con un QR de 1.000 registrado aparte: «Usar como total» deja 1.200 de saldo (3.000 − 800 − 1.000)', r.total0===3000 && num(r.saldo)===1200, r);
    errores.push(...Vd.__errores); await Vd.__ctx.close(); }

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
