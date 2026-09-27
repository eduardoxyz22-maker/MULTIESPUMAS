/* 💵 LA PLATA EN EL FORMULARIO, SEXTA VUELTA (27/09): las dos decisiones del dueño del 26/09 a las 20:37.

   A. CORREGIR EL PRECIO DE UNA VENTA CON PAGOS REGISTRADOS CONSERVA ESOS PAGOS. Antes, cambiar el saldo (el precio) de una
      venta con historial preguntaba «⚠️ … ese historial se borra» y lo rehacía SOLO con el adelanto: un QR de Bs 1.000
      registrado en Contabilidad desaparecía. Ahora los pagos quedan tal cual (fecha, recibo, >chofer, imágenes, el adelanto
      y el 2° método del mixto) y el saldo y «pagado» se recalculan como en Contabilidad (`aplicarCobros`).
   B. «SÍ, PAGADO» AL EDITAR UNA VENTA CON ADELANTO deja el adelanto en SU día y anota el resto HOY como un cobro nuevo (lo
      mismo que registrar el pago del saldo en Contabilidad). Antes todo quedaba en UN renglón con fecha de hoy: el adelanto
      se mudaba del cuadre de su día al de hoy, y `p.acuenta` pasaba a 0.

   Mismo banco de pruebas que test_rev5_pedidos.js: el panel de verdad contra el google-apps-script.gs de verdad (cargado en
   Node con una planilla de mentira), así el ida y vuelta pasa por `recToRow`/`rowToRec_` y el sello del servidor.
   Las preguntas (`confirm`) se contestan con `page.__respuestas` (true = Aceptar); sin respuesta anotada, Aceptar. Todas
   quedan en `page.__dialogos`.

   ⚠️ Reloj CLAVADO en el miércoles 16/09/2026 a las 10 de Bolivia: las fechas de los fixtures son fijas.

   Se corre:  node tests/test_rev6_plata_form.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev6_plata_form.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const J = (o) => JSON.stringify(o);
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia
const HOY = '2026-09-16', DIA_X = '2026-09-10', DIA_Q = '2026-09-14';
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
  return { ctx, sh, post, fila, guardar };
}
/* Una venta sintética de Bs 3.000, cargada el 10/09 (el día X), con entrega el viernes 18/09. */
const pedido = (o) => Object.assign({
  fecha:'2026-09-18', oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS(DIA_X), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

/* Lo que corre ANTES que el panel, en cada carga. */
function INIT(){
  window.__ctl = { log: [] };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    window.__ctl.log.push({ act: P.action || 'save', id: String((P.pedido && P.pedido.id) || P.id || '') });
    return window.__gs(body).then(function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; });
  };
}
/* Ayudas que viven en la página (se instalan después de cargarla). */
function AYUDAS(){
  window.abrirEd = async function(id){
    window._toasts=[]; window.__ctl.log=[];
    showView('mis'); await esperar(150);
    editPedido(id); await esperar(250);
    return { cobrado:document.getElementById('f-cobrado').value, acuenta:document.getElementById('f-acuenta').value,
             saldo:document.getElementById('f-saldo').value, pagado:segVal('f-pagado'), metodo:segVal('f-metodo'), mixto:MIXTO };
  };
  window.tocarSi = async function(){ document.querySelector('#f-pagado button[data-val="SI"]').click(); await esperar(40); return document.getElementById('f-cobrado').value; };
  window.elegirMetodo = function(m, b){ segSet('f-metodo', m); updateBancoVisibility(); if(b) segSet('f-banco', b); };
  window.gato = function(){ var b=document.getElementById('modal-box'); return !!(b && /Falta el comprobante/.test(b.textContent||'')); };
  window.guardarEd = async function(){
    submitPedido(); await esperar(700); await quieto();
    var o={ enForm:document.getElementById('view-form').classList.contains('active'),
            guardados:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length,
            rojos:window._toasts.filter(function(t){ return /^err/.test(t); }),
            verdes:window._toasts.filter(function(t){ return /^ok/.test(t); }), gato:gato() };
    try{ closeModal(); }catch(e){}
    return o;
  };
  /* La plata de una venta como la ven Contabilidad (ficha, «Ya ingresó», lo que falta) y el Cuadre. */
  window.plata = function(id){
    var p=findById(id); if(!p) return null;
    return { mp:p.metodoPago, acuenta:Number(p.acuenta)||0, saldo:Number(p.saldo)||0, pagado:!!p.pagado,
             total:ventaTotal(p), cobrado:contaCobrado(p), falta:contaFaltaCobrar(p), exceso:excesoCobro(p),
             pagos:contaPagos(p).map(function(c){ return [c.anticipo?'ant':(esEnvio(c)?'env':'cobro'), cobroMetodoTxt(c), Number(c.monto)||0, c.fecha||'', limpiaNota(c.nota), compsArr(c.comps!=null?c.comps:c.comp)]; }) };
  };
  window.cuadreDia = function(fecha, id){
    segSet('cua-mode','dia'); document.getElementById('cua-dia').value=fecha;
    var v=document.getElementById('cua-vendedor'); if(v) v.value='';
    return cuadrePagos().filter(function(x){ return x.p.id===id; }).map(function(x){ return [x.metodo+(x.banco?(' '+x.banco):''), x.monto]; });
  };
  window.excelFila = async function(cliente){
    window.__XLSX=null;
    buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
    downloadBlob=function(){};
    showView('conta'); await esperar(120);
    segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','mes'); document.getElementById('cta-mes').value=HOY_MES; setContaModo('mes');
    var s=document.getElementById('cta-search'); if(s) s.value='';
    exportConta();
    if(!window.__XLSX) return null;
    var m=window.__XLSX[0].matrix, h=m[0].map(function(c){ return c&&c.v; }), v=function(x){ return (x&&typeof x==='object')?x.v:x; };
    var iCl=h.indexOf('CLIENTE');
    for(var i=1;i<m.length;i++){ if(v(m[i][iCl])===cliente){
      return { cobrado:Number(v(m[i][h.indexOf('TOTAL COBRADO (Bs)')]))||0, saldo:Number(v(m[i][h.indexOf('SALDO (Bs)')]))||0,
               total:Number(v(m[i][h.indexOf('TOTAL VENTA (Bs)')]))||0, pagado:String(v(m[i][h.indexOf('PAGADO')])||''),
               pagos:String(v(m[i][h.indexOf('PAGOS (fecha · método · monto · nota)')])||'') };
    } }
    return null;
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  const abrir = async (S) => {
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.__dialogos = []; page.__respuestas = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => { page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if (si) d.accept(); else d.dismiss(); });
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(350);
    await page.evaluate(async (mes) => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      window.HOY_MES=mes;
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
      await refrescarEstado();
    }, HOY.slice(0,7));
    await page.evaluate(AYUDAS);
    return page;
  };
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };
  const sinBorrar = (dlg) => !dlg.some(d => /se borra|Se va a BORRAR/.test(d));

  // ══ A. CORREGIR EL PRECIO CONSERVA LOS PAGOS REGISTRADOS ══════════════════════════════════════════
  await esc('A. Corregir el precio de una venta con pagos registrados', async () => {
    const S = servidor();
    const MP1 = '~Efectivo 500 @'+DIA_X+' #1101 %IMGA1 + QR BISA 1000 @'+DIA_Q+' #1750 %IMGQ1';
    for (const id of ['a1','a2','a3','a4','a10','a11','a12']) S.guardar(pedido({ id, cliente:'PRECIO '+id.toUpperCase(), oc:'09-1'+id.slice(1).padStart(2,'0'), nota:'1101', metodoPago:MP1, acuenta:500, saldo:1500 }));
    S.guardar(pedido({ id:'a5', cliente:'PRECIO SUELTO', oc:'09-105', nota:'1105', metodoPago:'Efectivo %IMGS5', acuenta:500, saldo:2500 }));
    const MP6 = '~Efectivo 300 @'+DIA_X+' #1106 %IMGM1 + QR BISA 200 @'+DIA_X+' #1106 %IMGM2 + Tarjeta 1000 @'+DIA_Q+' #1751 %IMGT6';
    S.guardar(pedido({ id:'a6', cliente:'PRECIO MIXTO', oc:'09-106', nota:'1106', metodoPago:MP6, acuenta:500, saldo:1500 }));
    const MP7 = '~Efectivo 500 @'+DIA_X+' #1107 %IMGA7 + QR BISA 1000 @'+DIA_Q+' #1752 %IMGQ7 + ^Efectivo 100 @'+DIA_X+' #1107 %IMGA7';
    S.guardar(pedido({ id:'a7', cliente:'PRECIO FLETE', oc:'09-107', nota:'1107', metodoPago:MP7, acuenta:500, saldo:1500 }));
    S.guardar(pedido({ id:'a8', cliente:'PRECIO CHOFER', oc:'09-108', nota:'1108', acuenta:500, saldo:1500,
      metodoPago:'~Efectivo 500 @'+DIA_X+' #1108 >Luis Pierre %IMGA8 + QR BISA 1000 @'+DIA_Q+' #1753 %IMGQ8' }));
    const A = await abrir(S);

    // a1 · el precio sube de 3.000 a 3.200 (precio del ítem y saldo 1.500 → 1.700)
    const cuadAntes = await A.evaluate(({x,q}) => ({ x:cuadreDia(x,'a1'), q:cuadreDia(q,'a1') }), {x:DIA_X, q:DIA_Q});
    let vis = await A.evaluate(() => abrirEd('a1'));
    let r = await A.evaluate(async () => { document.querySelector('#f-productos .prod-precio').value='3200'; document.getElementById('f-saldo').value='1700'; return guardarEd(); });
    let f = S.fila('a1');
    chk('⚠️ A · subir el precio 3.000 → 3.200 NO pregunta «¿borrar el historial?» (no se borra nada)', sinBorrar(A.__dialogos) && r.guardados===1 && !r.rojos.length, { dialogos:A.__dialogos.map(d=>d.slice(0,70)), rojos:r.rojos });
    chk('⚠️ A · …y los DOS pagos quedan tal cual: el adelanto (10/09, recibo 1101, imagen) y el QR de 1.000 (14/09, recibo 1750, captura)', f.metodoPago===MP1, f.metodoPago);
    chk('⚠️ A · …saldo 1.700, «A cuenta» 500, NO pagada, y el precio del ítem en 3.200', Number(f.saldo)===1700 && Number(f.acuenta)===500 && f.pagado===false && f.productos[0].precio===3200, { saldo:f.saldo, acuenta:f.acuenta, pagado:f.pagado, precio:f.productos[0].precio });
    await A.evaluate(() => refrescarEstado());
    let pl = await A.evaluate(() => plata('a1'));
    chk('⚠️ A · Contabilidad: total 3.200, ya ingresó 1.500, falta 1.700', pl.total===3200 && pl.cobrado===1500 && pl.falta===1700, pl);
    const cuadDesp = await A.evaluate(({x,q}) => ({ x:cuadreDia(x,'a1'), q:cuadreDia(q,'a1') }), {x:DIA_X, q:DIA_Q});
    chk('A · el cuadre del 10/09 y el del 14/09 no cambian (Efectivo 500 · QR BISA 1.000)', J(cuadDesp)===J(cuadAntes) && J(cuadDesp.q)===J([['QR BISA',1000]]), { antes:cuadAntes, despues:cuadDesp });
    chk('A · el aviso verde dice que los pagos quedan como estaban', r.verdes.some(t => /quedan como estaban/.test(t) && /1\.700/.test(t)), r.verdes);

    // a2 · el precio baja a lo que ya entró (1.500): saldo 0 → queda PAGADA con los mismos pagos
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a2'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='0'; return guardarEd(); });
    f = S.fila('a2');
    chk('⚠️ A · precio 1.500 (saldo 0, ya está todo cobrado): se guarda —antes: «Hay pago a cuenta: poné el saldo»—', r.guardados===1 && !r.rojos.length && Number(f.saldo)===0, { rojos:r.rojos, saldo:f.saldo });
    chk('⚠️ A · …queda PAGADA, con los dos pagos tal cual y «A cuenta» 500', f.pagado===true && f.metodoPago===MP1 && Number(f.acuenta)===500 && sinBorrar(A.__dialogos), { pagado:f.pagado, mp:f.metodoPago, dialogos:A.__dialogos.map(d=>d.slice(0,60)) });

    // a3 · el mismo precio 1.500 por «SÍ, pagado» (total 1.500)
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a3'));
    const prop3 = await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { document.getElementById('f-cobrado').value='1500'; return guardarEd(); });
    f = S.fila('a3');
    chk('A · «SÍ, pagado» propone el total 3.000 (500 a cuenta + 1.500 de saldo + el QR de 1.000)', prop3==='3000', prop3);
    chk('⚠️ A · «SÍ, pagado» con total 1.500 (= lo que ya entró): pagada, sin cobro nuevo, los pagos tal cual y «A cuenta» 500',
        r.guardados===1 && f.pagado===true && Number(f.saldo)===0 && f.metodoPago===MP1 && Number(f.acuenta)===500 && sinBorrar(A.__dialogos),
        { mp:f.metodoPago, saldo:f.saldo, acuenta:f.acuenta, dialogos:A.__dialogos.map(d=>d.slice(0,60)) });

    // a4 · precio 1.400: ya entraron 1.500 → cobrada de MÁS (se pregunta y no se borra nada)
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a4'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { document.getElementById('f-cobrado').value='1400'; return guardarEd(); });
    f = S.fila('a4');
    chk('⚠️ A · total 1.400 con 1.500 ya cobrados: avisa «cobrada de MÁS» antes de guardar', A.__dialogos.length===1 && /cobrada de MÁS/.test(A.__dialogos[0]) && /100/.test(A.__dialogos[0]), A.__dialogos.map(d=>d.slice(0,120)));
    chk('⚠️ A · …y aceptando: saldo −100, pagada («hay que verlo»), los pagos tal cual', f.pagado===true && Number(f.saldo)===-100 && f.metodoPago===MP1 && Number(f.acuenta)===500, { saldo:f.saldo, pagado:f.pagado, mp:f.metodoPago });
    await A.evaluate(() => refrescarEstado());
    pl = await A.evaluate(() => plata('a4'));
    chk('A · Contabilidad lo muestra como cobro de más (Bs 100) y el total 1.400', pl.exceso===100 && pl.total===1400 && pl.cobrado===1500, pl);

    // a5 · el adelanto SUELTO (venta nueva con «A cuenta»): cambia el precio y el adelanto sigue igual
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a5'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='2700'; return guardarEd(); });
    f = S.fila('a5');
    chk('A · adelanto suelto: el precio sube (saldo 2.700) y el adelanto queda como estaba (Efectivo con su imagen, 500)', f.metodoPago==='Efectivo %IMGS5' && Number(f.acuenta)===500 && Number(f.saldo)===2700 && !A.__dialogos.length, { mp:f.metodoPago, acuenta:f.acuenta, saldo:f.saldo });

    // a6 · pago mixto en el adelanto (300 + 200) + una tarjeta de 1.000 registrada
    A.__dialogos.length=0;
    vis = await A.evaluate(() => abrirEd('a6'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='1700'; return guardarEd(); });
    f = S.fila('a6');
    chk('⚠️ A · con pago mixto: el precio sube y quedan los TRES pagos tal cual (300 + 200 del adelanto y la tarjeta de 1.000)', f.metodoPago===MP6 && Number(f.acuenta)===500 && Number(f.saldo)===1700 && sinBorrar(A.__dialogos), { mp:f.metodoPago, acuenta:f.acuenta, saldo:f.saldo, dialogos:A.__dialogos.map(d=>d.slice(0,60)) });
    await A.evaluate(() => refrescarEstado());
    pl = await A.evaluate(() => plata('a6'));
    chk('A · …total 3.200 y ya ingresó 1.500', pl.total===3200 && pl.cobrado===1500, pl);

    // a7 · con el flete cobrado
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a7'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='1700'; return guardarEd(); });
    f = S.fila('a7');
    chk('⚠️ A · con el flete cobrado: el precio sube y quedan los pagos Y el flete tal cual', f.metodoPago===MP7 && Number(f.saldo)===1700 && sinBorrar(A.__dialogos), { mp:f.metodoPago, saldo:f.saldo });

    // a8 · el adelanto lo tiene el chofer (>Luis Pierre)
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a8'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='1700'; return guardarEd(); });
    f = S.fila('a8');
    chk('⚠️ A · el adelanto que tiene el chofer sigue a su nombre, y el QR sigue ahí', /^~Efectivo 500 @2026-09-10 #1108 >Luis Pierre %IMGA8 \+ QR BISA 1000 @2026-09-14 #1753 %IMGQ8$/.test(f.metodoPago) && Number(f.saldo)===1700, f.metodoPago);

    // a10 · cambia «A cuenta» (el adelanto 500 → 600, saldo 1.400): se corrige SOLO el adelanto (§4fr), el QR queda
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a10'));
    r = await A.evaluate(async () => { document.getElementById('f-acuenta').value='600'; document.getElementById('f-saldo').value='1400'; return guardarEd(); });
    f = S.fila('a10');
    chk('⚠️ A · corregir «A cuenta» 500 → 600 corrige el adelanto en SU día y con su recibo, y el QR de 1.000 NO se borra',
        f.metodoPago==='~Efectivo 600 @2026-09-10 #1101 %IMGA1 + QR BISA 1000 @2026-09-14 #1750 %IMGQ1' && Number(f.acuenta)===600 && Number(f.saldo)===1400 && sinBorrar(A.__dialogos),
        { mp:f.metodoPago, acuenta:f.acuenta, dialogos:A.__dialogos.map(d=>d.slice(0,60)) });

    // a11 · «A cuenta» a 0: eso SÍ borra el adelanto → se pregunta nombrando SOLO el adelanto; el QR queda.
    //       (Sin pago, el formulario no guarda con la imagen del adelanto puesta —§4gb, «quitá la imagen»—: se quita también.)
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a11'));
    r = await A.evaluate(async () => { document.getElementById('f-acuenta').value='0'; document.getElementById('f-saldo').value='2000'; updateMetodoVisibility(); FORM_COMPS=[]; return guardarEd(); });
    f = S.fila('a11');
    chk('A · quitar el adelanto pregunta, nombrando el adelanto que se va y diciendo que los otros quedan',
        A.__dialogos.length===1 && /Se va a BORRAR/.test(A.__dialogos[0]) && /500/.test(A.__dialogos[0]) && !/1\.000/.test(A.__dialogos[0]) && /otros pagos quedan/.test(A.__dialogos[0]), A.__dialogos.map(d=>d.slice(0,160)));
    chk('⚠️ A · …y aceptando se va el adelanto, pero el QR de 1.000 registrado queda', f.metodoPago==='QR BISA 1000 @2026-09-14 #1750 %IMGQ1' && Number(f.acuenta)===0 && Number(f.saldo)===2000 && f.pagado===false, { mp:f.metodoPago, acuenta:f.acuenta, saldo:f.saldo });

    // a12 · «Usar como total» con precio 3.200 descuenta también lo cobrado aparte
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a12'));
    const usado = await A.evaluate(async () => { document.querySelector('#f-productos .prod-precio').value='3200'; usarTotalProds(); return document.getElementById('f-saldo').value; });
    r = await A.evaluate(() => guardarEd());
    f = S.fila('a12');
    chk('⚠️ A · «Usar como total» (3.200) deja el saldo en 1.700: descuenta el adelanto Y el QR ya cobrado (antes 2.700)', Number(usado)===1700 && Number(f.saldo)===1700 && f.metodoPago===MP1, { campo:usado, saldo:f.saldo, mp:f.metodoPago });

    // a13 · cambia el precio Y el método del adelanto: el método de un pago registrado no se cambia desde acá (§4gg)
    S.guardar(pedido({ id:'a13', cliente:'PRECIO Y METODO', oc:'09-113', nota:'1101', metodoPago:MP1, acuenta:500, saldo:1500, fecha:'2026-09-21' }));   // el 18/09 AM ya tiene 11 (el cupo es 12)
    await A.evaluate(() => refrescarEstado());
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a13'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='1700'; elegirMetodo('QR','BISA'); return guardarEd(); });
    f = S.fila('a13');
    chk('⚠️ A · precio + método tocados: pregunta como en §4gg y, aceptando, cambia el saldo y los pagos quedan como estaban (antes: «¿borrar el historial?» y el QR se perdía)',
        A.__dialogos.length===1 && /ya están registrados/.test(A.__dialogos[0]) && f.metodoPago===MP1 && Number(f.saldo)===1700, { dialogos:A.__dialogos.map(d=>d.slice(0,60)), mp:f.metodoPago, saldo:f.saldo });

    // a15 · SIN adelanto y con un QR registrado (se pagó una parte en Contabilidad): el precio sube 3.000 → 3.200
    S.guardar(pedido({ id:'a15', cliente:'SIN ADELANTO CON QR', oc:'09-115', nota:'1115', metodoPago:'QR BISA 1000 @'+DIA_Q+' #1750 %IMGQ15', acuenta:0, saldo:2000, fecha:'2026-09-21' }));
    await A.evaluate(() => refrescarEstado());
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a15'));
    r = await A.evaluate(async () => { document.getElementById('f-saldo').value='2200'; return guardarEd(); });
    f = S.fila('a15');
    chk('⚠️ A · sin adelanto y con un cobro registrado: el precio se corrige (antes: «Subiste la imagen pero no anotaste ningún pago» por la captura del QR ya registrado)',
        r.guardados===1 && !r.rojos.length && Number(f.saldo)===2200 && f.metodoPago==='QR BISA 1000 @2026-09-14 #1750 %IMGQ15' && f.pagado===false && !A.__dialogos.length,
        { rojos:r.rojos, saldo:f.saldo, mp:f.metodoPago, dialogos:A.__dialogos.map(d=>d.slice(0,60)) });

    // a14 · sin adelanto, con un QR registrado: tocar «SÍ, pagado» y volver a «NO» repone «A cuenta» y «Saldo» (antes quedaban
    //       en 0, y guardar así —corrigiendo la dirección— dejaba la venta PAGADA sin que nadie lo decidiera)
    S.guardar(pedido({ id:'a14', cliente:'SI Y NO', oc:'09-114', nota:'1114', metodoPago:'QR BISA 1000 @'+DIA_Q+' #1750 %IMGQ14', acuenta:0, saldo:2000, fecha:'2026-09-21' }));
    await A.evaluate(() => refrescarEstado());
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('a14'));
    const sn = await A.evaluate(async () => { await tocarSi(); document.querySelector('#f-pagado button[data-val="NO"]').click(); await esperar(40);
      return { acu:document.getElementById('f-acuenta').value, sal:document.getElementById('f-saldo').value }; });
    r = await A.evaluate(async () => { document.getElementById('f-direccion').value='Calle 14'; return guardarEd(); });
    f = S.fila('a14');
    chk('⚠️ «SÍ» y después «NO» repone «A cuenta» 0 y «Saldo» 2.000 (antes quedaban en 0)', Number(sn.acu)===0 && Number(sn.sal)===2000, sn);
    chk('⚠️ …y corregir la dirección deja la venta como estaba: debe 2.000, el QR registrado sigue', f.direccion==='Calle 14' && Number(f.saldo)===2000 && f.pagado===false && f.metodoPago==='QR BISA 1000 @2026-09-14 #1750 %IMGQ14' && !A.__dialogos.length, { dir:f.direccion, saldo:f.saldo, pagado:f.pagado, mp:f.metodoPago, dialogos:A.__dialogos.map(d=>d.slice(0,60)), rojos:r.rojos, guardados:r.guardados });
  });

  // ══ B. «SÍ, PAGADO» DEJA EL ADELANTO EN SU DÍA Y ANOTA EL RESTO HOY ══════════════════════════════════
  await esc('B. «SÍ, pagado» al editar una venta con adelanto', async () => {
    const S = servidor();
    const AD1 = '~Efectivo 500 @'+DIA_X+' #1201 %IMGB1';
    S.guardar(pedido({ id:'b1', cliente:'PAGA EL RESTO', oc:'09-201', nota:'1201', metodoPago:AD1, acuenta:500, saldo:2500 }));
    S.guardar(pedido({ id:'b2', cliente:'PAGA EL RESTO SUELTO', oc:'09-202', nota:'1202', metodoPago:'Efectivo %IMGS2', acuenta:500, saldo:2500 }));
    const MP3 = '~Efectivo 500 @'+DIA_X+' #1203 %IMGB3 + QR BISA 1000 @'+DIA_Q+' #1750 %IMGQ3';
    S.guardar(pedido({ id:'b3', cliente:'PAGA EL RESTO CON COBRO', oc:'09-203', nota:'1203', metodoPago:MP3, acuenta:500, saldo:1500 }));
    const MP4 = '~Efectivo 300 @'+DIA_X+' #1204 %IMGM1 + QR BISA 200 @'+DIA_X+' #1204 %IMGM2';
    S.guardar(pedido({ id:'b4', cliente:'PAGA EL RESTO MIXTO', oc:'09-204', nota:'1204', metodoPago:MP4, acuenta:500, saldo:2500 }));
    S.guardar(pedido({ id:'b5', cliente:'PAGA EL RESTO FLETE PACTADO', oc:'09-205', nota:'1205', metodoPago:'~Efectivo 500 @'+DIA_X+' #1205 %IMGB5 + ^150', acuenta:500, saldo:2500 }));
    S.guardar(pedido({ id:'b6', cliente:'PAGA EL RESTO FLETE COBRADO', oc:'09-206', nota:'1206', metodoPago:'~Efectivo 500 @'+DIA_X+' #1206 %IMGB6 + ^Efectivo 100 @'+DIA_X+' #1206 %IMGB6', acuenta:500, saldo:2500 }));
    S.guardar(pedido({ id:'b7', cliente:'PAGA EL RESTO EN DOS', oc:'09-207', nota:'1207', metodoPago:'~Efectivo 500 @'+DIA_X+' #1207 %IMGB7', acuenta:500, saldo:2500 }));
    S.guardar(pedido({ id:'b8', cliente:'MIXTO TOCADO', oc:'09-208', nota:'1208', metodoPago:'~Efectivo 300 @'+DIA_X+' #1208 %IMGM8 + QR BISA 200 @'+DIA_X+' #1208 %IMGN8', acuenta:500, saldo:2500 }));
    S.guardar(pedido({ id:'b9', cliente:'LITE SIN METODO', oc:'09-209', nota:'1209', vendedor:'Eduardo Añez', metodoPago:'~Efectivo 500 @'+DIA_X+' #1209', acuenta:500, saldo:2500 }));
    const A = await abrir(S);

    // b1 · adelanto del 10/09 → hoy (16/09) paga el resto por QR
    const cua1 = await A.evaluate(({x,h}) => ({ x:cuadreDia(x,'b1'), h:cuadreDia(h,'b1') }), {x:DIA_X, h:HOY});
    await A.evaluate(() => abrirEd('b1'));
    let prop = await A.evaluate(() => tocarSi());
    chk('B · «SÍ, pagado» propone el total 3.000', prop==='3000', prop);
    // sin la imagen del pago nuevo no se guarda: la que se ve es la del adelanto
    let r = await A.evaluate(async () => { elegirMetodo('QR','BISA'); return guardarEd(); });
    chk('⚠️ B · el pago de lo que faltaba pide SU comprobante (la imagen que se ve es la del adelanto) y no guarda sin él', r.guardados===0 && r.gato && r.enForm && S.fila('b1').metodoPago===AD1, { guardados:r.guardados, gato:r.gato, enForm:r.enForm });
    r = await A.evaluate(async () => { FORM_COMPS=FORM_COMPS.concat(['IMGNEW1']); return guardarEd(); });
    let f = S.fila('b1');
    chk('⚠️ B · el adelanto queda en SU día (10/09, recibo, imagen) y se anota un cobro de 2.500 de HOY por QR con la imagen nueva',
        f.metodoPago===AD1+' + QR BISA 2500 @'+HOY+' #1201 %IMGNEW1', f.metodoPago);
    chk('⚠️ B · …«A cuenta» sigue en 500 (no 0), saldo 0 y PAGADA', Number(f.acuenta)===500 && Number(f.saldo)===0 && f.pagado===true, { acuenta:f.acuenta, saldo:f.saldo, pagado:f.pagado });
    chk('B · …sin preguntar «¿borrar el historial?» y con el aviso de qué se anotó', sinBorrar(A.__dialogos) && r.verdes.some(t => /su día/.test(t) && /2\.500/.test(t)), { dialogos:A.__dialogos.map(d=>d.slice(0,60)), verdes:r.verdes });
    await A.evaluate(() => refrescarEstado());
    let pl = await A.evaluate(() => plata('b1'));
    const cua1d = await A.evaluate(({x,h}) => ({ x:cuadreDia(x,'b1'), h:cuadreDia(h,'b1') }), {x:DIA_X, h:HOY});
    chk('⚠️ B · el cuadre del 10/09 NO cambia (Efectivo 500) y el de hoy suma el QR de 2.500', J(cua1d.x)===J(cua1.x) && J(cua1.x)===J([['Efectivo',500]]) && J(cua1d.h)===J([['QR BISA',2500]]), { antes:cua1, despues:cua1d });
    chk('⚠️ B · la ficha de Contabilidad: el adelanto del 10/09 y el cobro de hoy, cada uno con su imagen',
        J(pl.pagos)===J([['ant','Efectivo',500,DIA_X,'1201',['IMGB1']],['cobro','QR BISA',2500,HOY,'1201',['IMGNEW1']]]), pl.pagos);
    chk('B · «Ya ingresó» 3.000, total 3.000, no falta nada, sin cobro de más', pl.cobrado===3000 && pl.total===3000 && pl.falta===0 && pl.exceso===0, pl);
    const x1 = await A.evaluate(() => excelFila('PAGA EL RESTO'));
    chk('B · el Excel de Contabilidad dice lo mismo: cobrado 3.000, saldo 0, total 3.000, con los dos pagos', !!x1 && x1.cobrado===3000 && x1.saldo===0 && x1.total===3000 && /10\/09/.test(x1.pagos) && /16\/09/.test(x1.pagos), x1);

    // b2 · el adelanto SUELTO (venta nueva con «A cuenta»): pasa a renglón con el día y el recibo de la venta
    await A.evaluate(() => abrirEd('b2'));
    prop = await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { elegirMetodo('QR','BISA'); FORM_COMPS=FORM_COMPS.concat(['IMGNEW2']); return guardarEd(); });
    f = S.fila('b2');
    chk('⚠️ B · adelanto suelto: queda como adelanto del día de la venta (10/09) con su imagen, y el resto (2.500) es un cobro de hoy',
        prop==='3000' && f.metodoPago==='~Efectivo 500 @'+DIA_X+' #1202 %IMGS2 + QR BISA 2500 @'+HOY+' #1202 %IMGNEW2' && Number(f.acuenta)===500 && f.pagado===true, { prop, mp:f.metodoPago, acuenta:f.acuenta });

    // b3 · con un cobro registrado antes (QR de 1.000 el 14/09)
    await A.evaluate(() => abrirEd('b3'));
    prop = await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { elegirMetodo('Tarjeta'); FORM_COMPS=FORM_COMPS.concat(['IMGNEW3']); return guardarEd(); });
    f = S.fila('b3');
    chk('⚠️ B · con un cobro previo: el adelanto y el QR del 14/09 quedan, y el resto (1.500) entra hoy con tarjeta',
        prop==='3000' && f.metodoPago===MP3+' + Tarjeta 1500 @'+HOY+' #1203 %IMGNEW3' && Number(f.acuenta)===500 && Number(f.saldo)===0 && f.pagado===true, { prop, mp:f.metodoPago });

    // b4 · adelanto mixto (300 + 200): propone 3.000 (no 3.200), y el resto puede ir por el MISMO QR que el 2° método
    const vis = await A.evaluate(() => abrirEd('b4'));
    prop = await A.evaluate(() => tocarSi());
    chk('⚠️ B · con adelanto mixto, «SÍ, pagado» propone 3.000 (antes 3.200: sumaba dos veces el 2° método)', vis.mixto===true && prop==='3000', { prop, mixto:vis.mixto });
    r = await A.evaluate(async () => { elegirMetodo('QR','BISA'); FORM_COMPS=FORM_COMPS.concat(['IMGNEW4']); return guardarEd(); });
    f = S.fila('b4');
    chk('⚠️ B · …se guarda aunque el resto vaya por el mismo QR que el 2° método del adelanto (el bloque muestra lo ya registrado)', r.guardados===1 && !r.rojos.length, r.rojos);
    chk('⚠️ B · …el adelanto mixto queda en su día (300 + 200) y el resto (2.500) es un cobro de hoy; «A cuenta» 500',
        f.metodoPago===MP4+' + QR BISA 2500 @'+HOY+' #1204 %IMGNEW4' && Number(f.acuenta)===500 && Number(f.saldo)===0 && f.pagado===true, { mp:f.metodoPago, acuenta:f.acuenta });
    await A.evaluate(() => refrescarEstado());
    const mx4 = await A.evaluate(() => { var p=findById('b4'), m=mixtoDe(p); return { mixto:m?m.monto:null, total:ventaTotal(p), cobrado:contaCobrado(p) }; });
    chk('B · …y el panel lo sigue leyendo igual: 2° método de 200, total 3.000, ya ingresó 3.000', mx4.mixto===200 && mx4.total===3000 && mx4.cobrado===3000, mx4);

    // b5 · flete pactado: sigue pactado, al final
    await A.evaluate(() => abrirEd('b5'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { elegirMetodo('QR','BISA'); FORM_COMPS=FORM_COMPS.concat(['IMGNEW5']); return guardarEd(); });
    f = S.fila('b5');
    chk('⚠️ B · con el flete PACTADO: adelanto en su día, cobro de hoy por 2.500, y el flete sigue por cobrar (150)',
        f.metodoPago==='~Efectivo 500 @'+DIA_X+' #1205 %IMGB5 + QR BISA 2500 @'+HOY+' #1205 %IMGNEW5 + ^150' && f.pagado===true, f.metodoPago);

    // b6 · flete ya cobrado: queda tal cual
    await A.evaluate(() => abrirEd('b6'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { elegirMetodo('Efectivo'); FORM_COMPS=FORM_COMPS.concat(['IMGNEW6']); return guardarEd(); });
    f = S.fila('b6');
    chk('⚠️ B · con el flete COBRADO: el flete queda tal cual y el cobro de hoy (2.500) no lo toca',
        f.metodoPago==='~Efectivo 500 @'+DIA_X+' #1206 %IMGB6 + Efectivo 2500 @'+HOY+' #1206 %IMGNEW6 + ^Efectivo 100 @'+DIA_X+' #1206 %IMGB6' && f.pagado===true, f.metodoPago);

    // b7 · lo que faltaba se paga con DOS métodos («➕ Pagó con dos métodos»)
    await A.evaluate(() => abrirEd('b7'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => {
      elegirMetodo('QR','BISA'); FORM_COMPS=FORM_COMPS.concat(['IMGNEW7']);
      toggleMixto(true); segSet('f-metodo2','Tarjeta'); pintarMixto(); document.getElementById('f-monto2').value='1000'; FORM_COMPS2=['IMGT7']; pintarMixto();
      return guardarEd();
    });
    f = S.fila('b7');
    chk('⚠️ B · lo que faltaba pagado con dos métodos: dos cobros de hoy (QR 1.500 + Tarjeta 1.000) y el adelanto en su día',
        f.metodoPago==='~Efectivo 500 @'+DIA_X+' #1207 %IMGB7 + QR BISA 1500 @'+HOY+' #1207 %IMGNEW7 + Tarjeta 1000 @'+HOY+' #1207 %IMGT7' && Number(f.acuenta)===500 && f.pagado===true, { mp:f.metodoPago, rojos:r.rojos });

    // b8 · el 2° método del ADELANTO, tocado con «SÍ, pagado»: se frena (no se adivina con plata)
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('b8'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { document.getElementById('f-monto2').value='250'; FORM_COMPS=FORM_COMPS.concat(['IMGNEW8']); return guardarEd(); });
    chk('B · cambiar el 2° método del adelanto junto con «SÍ, pagado» NO se guarda y dice dónde se corrige', r.guardados===0 && r.enForm && r.rojos.some(t => /dos métodos/.test(t) && /Corregir este pago/.test(t)) && S.fila('b8').pagado===false, { guardados:r.guardados, rojos:r.rojos });
    await A.evaluate(() => { FORM_COMPS=[]; FORM_COMPS2=[]; cancelEdit(); });    // la imagen de prueba no se sube a ningún lado

    // b9 · Eduardo (formulario sin método obligatorio): un cobro sin método no existe → se pide
    await A.evaluate(() => abrirEd('b9'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { segSet('f-metodo',''); updateBancoVisibility(); return guardarEd(); });
    chk('B · sin método para lo que faltaba (Eduardo) no se guarda: un cobro sin método desaparecería', r.guardados===0 && r.rojos.some(t => /con qué pagó lo que faltaba/.test(t)) && S.fila('b9').pagado===false, r.rojos);
  });

  // ══ C. LO QUE YA ANDABA SIGUE IGUAL ══════════════════════════════════════════════════════════════
  await esc('C. Controles', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'k2', cliente:'YA PAGADA', oc:'09-302', nota:'1302', pagado:true, saldo:0, acuenta:500,
      metodoPago:'~Efectivo 500 @'+DIA_X+' #1302 %IMGK2 + QR BISA 2500 @'+DIA_Q+' #1303 %IMGQK2' }));
    S.guardar(pedido({ id:'k4', cliente:'SIN NINGUN PAGO', oc:'09-304', nota:'1304', metodoPago:'', acuenta:0, saldo:3000 }));
    S.guardar(pedido({ id:'k5', cliente:'SUELTO DIRECCION', oc:'09-305', nota:'1305', metodoPago:'QR BISA %IMGK5', acuenta:700, saldo:2300 }));
    const A = await abrir(S);

    // k1 · venta NUEVA «SÍ, pagado»: un solo pago de hoy, «A cuenta» 0 (§4cb)
    let r = await A.evaluate(async () => {
      showView('form'); await esperar(150); resetForm();
      document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
      document.getElementById('f-cliente').value='NUEVA PAGADA'; document.getElementById('f-celular').value='70000001';
      document.getElementById('f-zona').value='Norte'; document.getElementById('f-nota').value='1301'; document.getElementById('f-fecha').value='2026-09-18';
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      document.querySelector('#f-pagado button[data-val="SI"]').click(); await esperar(40);
      elegirMetodo('QR','BISA'); document.getElementById('f-cobrado').value='3000'; FORM_COMPS=['IMGK1'];
      window.__ctl.log=[]; window._toasts=[];
      return guardarEd();
    });
    const k1 = S.ctx.rowToRec_(S.sh._datos.find(x => x[4]==='NUEVA PAGADA') || []);
    chk('(control) venta NUEVA «SÍ, pagado»: un solo pago de hoy y «A cuenta» 0, como siempre', k1 && k1.metodoPago==='~QR BISA 3000 @'+HOY+' #1301 %IMGK1' && Number(k1.acuenta)===0 && k1.pagado===true, k1 ? k1.metodoPago : r);

    // k2 · venta ya pagada (adelanto + cobro): se corrige la dirección
    A.__dialogos.length=0;
    const vis = await A.evaluate(() => abrirEd('k2'));
    r = await A.evaluate(async () => { document.getElementById('f-direccion').value='Calle corregida'; return guardarEd(); });
    let f = S.fila('k2');
    chk('(control) venta pagada: corregir la dirección no pregunta nada y deja los pagos tal cual', !A.__dialogos.length && f.direccion==='Calle corregida' && f.metodoPago==='~Efectivo 500 @'+DIA_X+' #1302 %IMGK2 + QR BISA 2500 @'+DIA_Q+' #1303 %IMGQK2' && f.pagado===true, { dialogos:A.__dialogos, mp:f.metodoPago });
    chk('B · al reabrirla, «Monto total cobrado» dice lo que entró (3.000), no solo el adelanto (500)', vis.cobrado==='3000' && vis.pagado==='SI', vis);

    // k4 · una venta sin ningún pago que se marca «SÍ, pagado»: como siempre, un pago de hoy
    await A.evaluate(() => abrirEd('k4'));
    await A.evaluate(() => tocarSi());
    r = await A.evaluate(async () => { elegirMetodo('Efectivo'); FORM_COMPS=['IMGK4']; return guardarEd(); });
    f = S.fila('k4');
    chk('(control) venta sin pagos marcada «SÍ, pagado»: un solo pago de hoy por el total', f.metodoPago==='~Efectivo 3000 @'+HOY+' #1304 %IMGK4' && f.pagado===true && Number(f.saldo)===0, f.metodoPago);

    // k5 · adelanto suelto: corregir la dirección no toca nada
    A.__dialogos.length=0;
    await A.evaluate(() => abrirEd('k5'));
    r = await A.evaluate(async () => { document.getElementById('f-direccion').value='Otra calle'; return guardarEd(); });
    f = S.fila('k5');
    chk('(control) adelanto suelto: corregir la dirección deja el adelanto como estaba', f.metodoPago==='QR BISA %IMGK5' && Number(f.acuenta)===700 && Number(f.saldo)===2300 && !A.__dialogos.length && f.direccion==='Otra calle', f.metodoPago);
  });

  chk('sin errores de JavaScript en la página', !errores.length, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
