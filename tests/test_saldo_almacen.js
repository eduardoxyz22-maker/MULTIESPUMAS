/* 🧾 ¿HAY PARA VENDER? EL CUADRITO DEL SALDO DEBAJO DE CADA PRODUCTO DEL PEDIDO (§4gj, dueño 27/09).

   El dueño: *«Los vendedores no saben cuál es el stock de fábrica y no saben a veces qué vender o si deben decirle al
   cliente cuánto esperar.»* Eligió: debajo de cada producto del formulario, un cuadrito de color que dice si hay
   (✅ podés programar desde el <día>), si hay en Moreno (📥 se trae en 1 día), si está en producción (⏳ que espere
   ~X días, llega el DD/MM) o si no hay (🏭 hay que mandar a producir), con los números «En almacén · Pendientes de
   entrega · Libres/Faltan»; y al GUARDAR, una pregunta si algo quedó sin saldo libre. *«Tenés que tomar en cuenta lo
   que ya está pendiente de entrega con los saldos de almacén»* y *«eso debe actualizarse constantemente»*.

   ⚠️ LO QUE ESTA PRUEBA CUIDA:
   1. Los cinco casos (y el discontinuado), con los números IGUALES a los de `stockData()` (la tabla de Stock).
   2. Aparece recién con el producto completo; nunca para productos de tienda.
   3. La cantidad cuenta, y dos renglones del mismo producto se suman.
   4. La fecha elegida antes de lo posible se avisa (sin frenar).
   5. ATC y venta de tienda sin cuadrito; RPT con cuadrito.
   6. Al editar, el propio pedido no se cuenta.
   7. La pregunta al guardar: sale sin saldo, no sale con saldo, Cancelar no guarda, Aceptar guarda, editando sin tocar
      productos no sale.
   8. Frescura: una lectura nueva repinta, completar un producto con la lectura vieja pide otra (una por minuto como
      mucho), el botón 🔄, el aviso de corte viejo y el de sin conexión, y la pregunta usa el dato de la última lectura.
   9. En el celular (390 y 360): sin scroll horizontal, sin mover los campos de arriba y sin robar el foco.
   10. El caso del dueño con DOS dispositivos contra el servidor de verdad: *«logística carga el corte a las 9 de la
       mañana y hasta las 3 de la tarde ya ingresaron 9 pedidos; otro vendedor no va a poder ver ese saldo si no está
       actualizado»*.

   Datos SINTÉTICOS (el repo es público). Reloj clavado en el miércoles 23/09/2026, 15:00 de Bolivia (día hábil:
   «mañana» es el jueves 24). Lo que hay que fabricar sale 48 h hábiles después de que arranca, ese día se recoge y se
   entrega desde el siguiente (dueño, 28/09, §4gs; antes: 3 días de fábrica + 1).

   Se corre:  node tests/test_saldo_almacen.js   (desde la raíz del repo)
   Dientes contra el panel publicado:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_saldo_almacen.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const RELOJ = '2026-09-23T15:00:00-04:00';          // miércoles, 15:00 de Bolivia
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

/* ── Lo que corre ANTES que el panel en la prueba de una sola página: la «planilla» es `_SRV` ── */
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null, falla:false, demora:0 };
  window._lecturas=0; window._saves=[];
  apiList=function(){
    window._lecturas++;
    var S=window._SRV;
    var sale=function(){
      if(S.falla) return Promise.reject(new Error('sin red'));
      var l=JSON.parse(JSON.stringify(S.pedidos));
      if(S.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(S.stock) });
      return Promise.resolve({ ok:true, pedidos:l });
    };
    return S.demora ? new Promise(function(r){ setTimeout(r, S.demora); }).then(sale) : sale();
  };
  apiSave=function(rec){
    var r=JSON.parse(JSON.stringify(rec)); window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); }
    return Promise.resolve({ ok:true, pedido:r });
  };
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.BAN='01-05-025  Almacen Distribucion Banzer'; window.IMN='IM - PRODUCTOTERMINADO';
  window._d=function(n){ return stockSumarDias(todayStr(), n); };
  /* Los productos del ejemplo (inventados, con códigos del catálogo). */
  window.PR={
    TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
    ALM:{ desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' },
    PIL:{ desc:'PILLOW PEDIC', medida:'140x190', codigo:'CH1682' },
    ORO:{ desc:'ORO BI RELAX', medida:'180x190', codigo:'CH1775' },
    JUN:{ desc:'ESPECIAL JUNIOR', medida:'105x190', codigo:'CH1075' },       // discontinuado (x:1)
    SOM:{ desc:'SOMIER TITANIO ICE', medida:'140x190', codigo:'CH1212' }
  };
  window.K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); });
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2,8), fecha:_d(1), oc:'09-900', vendedor:'Maria Flores',
    cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'', pagado:false, saldo:1000, ts:Date.now()-86400000,
    metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1500', acuenta:0, facturarA:'', nit:'',
    nroDia:1, verificado:false, fotos:[] }, o); };
  window._linea=function(n, cant, x){ return Object.assign({}, PR[n], { cant:cant }, x||{}); };
  /* El stock del ejemplo: corte de acá de hoy 08:30, Banzer y Moreno (IM) de hoy. */
  window._stock=function(op){
    op=op||{};
    var st={ c:{ f:op.fAca||todayStr(), hora:op.hAca||'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-6*3600000 }, e:[], p:op.p||[], a:{},
             g:{}, al:{}, h:[] };
    st.g[BAN]={ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, cod:{}, t:Date.now()-6*3600000, rs:{} };
    st.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-7*3600000, rs:{} };
    st.al[LOG]='log'; st.al[BAN]='sale'; st.al[IMN]='otro';
    Object.keys(op.aca||{}).forEach(function(n){ st.c.u[K[n]]=op.aca[n]; });
    Object.keys(op.ban||{}).forEach(function(n){ st.g[BAN].u[K[n]]=op.ban[n]; });
    Object.keys(op.im||{}).forEach(function(n){ st.g[IMN].u[K[n]]=op.im[n]; });
    return st;
  };
  /* Carga el escenario como lo haría la planilla: por la MISMA lectura que usa el panel (`refrescarEstado`). */
  window._escenario=async function(stock, pedidos){
    window._SRV.stock=stock; window._SRV.pedidos=JSON.parse(JSON.stringify(pedidos||[])); window._SRV.falla=false; window._SRV.demora=0;
    if(!stock) STOCK=stockVacio();                  // la planilla sin fila de stock: la memoria vacía ES el stock
    STOCK_CARGADO=false;
    await refrescarEstado();
    ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  /* Llena el renglón i (lo crea si falta) como lo haría la vendedora, con sus eventos. */
  window._renglon=function(i, o){
    var cards=document.querySelectorAll('#f-productos .prod-card');
    while(cards.length<=i){ addProdRow(); cards=document.querySelectorAll('#f-productos .prod-card'); }
    var c=cards[i], ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.desc!=null){ var d=c.querySelector('.prod-desc'); d.value=o.desc; ev(d); }
    if(o.medida!=null){ var m=c.querySelector('.prod-medida'); m.value=o.medida; ev(m,'change'); }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._caja=function(i){
    var c=document.querySelectorAll('#f-productos .prod-card')[i], b=c && c.querySelector('.prod-saldo');
    if(!b) return { existe:false, hidden:true, cls:'', txt:'', v:null };
    return { existe:true, hidden:!!b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim(), v:b._v||null };
  };
  /* La fila de `stockData()` (la de la tabla de Stock y reposición) y lo que el cuadrito tendría que decir. */
  window._tabla=function(n){
    var o=stockData().lista.filter(function(x){ return x.k===K[n]; })[0]; if(!o) return null;
    var mano=stockHaySalir(o);
    return { comp:o.comp, mano:mano, aca:o.deposito, ban:o.enSale, mor:o.enOtros, alm:(mano==null?null:mano+(o.enOtros||0)+(o.enRecogida||0)) };
  };
  window._llenarDatos=function(cli){
    document.getElementById('f-vendedor').value='Maria Flores';
    document.getElementById('f-cliente').value=cli||'CLIENTE NUEVO';
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-nota').value=String(2000+Math.floor(Math.random()*999));
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-saldo').value='1000';
  };
  window._guardar=async function(){ document.getElementById('f-submit').click(); for(var i=0;i<40;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; } await _esperar(150); };
  window._bump=function(){ try{ saveMirror(); }catch(e){} };
}

/* ── El servidor de verdad (el .gs con un Google de mentira), para los dos dispositivos ── */
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
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  return { ctx, sh, post, filas, guardar };
}
/* Cada página de los dos dispositivos habla con el servidor de arriba. */
function INIT_DOS(vend){
  try{ localStorage.setItem('me_mis_vendedor', vend); }catch(e){}
  window.__ctl={ lecturas:0 };
  window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.fetch=function(url, o){
    var body=(o && o.body) || '{}', P={}; try{ P=JSON.parse(body); }catch(e){}
    if(P.action==='list') window.__ctl.lecturas++;
    return window.__gs(body).then(function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; });
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrirUna = async (vp, movil) => {
    const ctx = await browser.newContext({ viewport:vp, timezoneId:'America/La_Paz', isMobile:!!movil, hasTouch:!!movil });
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.__dialogos=[]; page.__respuestas=[];
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => { if(/^⚠️ ¿PEDIDO REPETIDO\?/.test(d.message())){ d.accept(); return; }   // (§4ih) los pedidos de esta prueba repiten el celular a propósito: esa pregunta no es la del saldo
      page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if(si) d.accept(); else d.dismiss(); });
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  /* Contra un panel viejo algunas cosas no existen: cada bloque se evalúa aparte y, si revienta, vuelve con `__error`. */
  const evDe = (page) => async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const { ctx:ctx1, page } = await abrirUna({ width:1100, height:1000 });
  const ev = evDe(page);

  chk('el reloj de la página está clavado en el miércoles 23/09/2026 (mañana = jueves 24)', await page.evaluate(() => todayStr()==='2026-09-23' && proximoDiaEntrega()==='2026-09-24'));

  /* El escenario de la mayoría de las secciones:
     · TITANIO ICE 160x190: acá 4, Banzer 2, 1 pendiente → ✅ (libres 5);
     · ALMOHADA 50x70: acá 0, Banzer 0, Moreno 5 → 📥;
     · PILLOW PEDIC 140x190: acá 1, 3 pendientes, 6 pedidos a fábrica que llegan el viernes 25 → ⏳;
     · ORO BI RELAX 180x190: nada en ningún lado, 1 pendiente → 🏭;
     · ESPECIAL JUNIOR 105x190 (ya no se fabrica): acá 2 → ✅ «quedan 2»;
     · SOMIER TITANIO ICE 140x190: acá 3, con una entrega de HOY a la mañana ya descontada del corte? No: entregada DESPUÉS
       del corte de hoy (el Excel no la incluye) → acá 3 − 2 entregados = 1. */
  const ESC = () => ({
    stock:_stock({ aca:{ TIT:4, PIL:1, JUN:2, SOM:3 }, ban:{ TIT:2 }, im:{ ALM:5 },
                   p:[ { id:'pf1', k:K.PIL, u:6, tipo:'fabrica', fab:'MORENO', f:_d(-1), esp:'2026-09-25', r:'' } ] }),
    pedidos:[ _P({ id:'t1', productos:[_linea('TIT',1)] }),
              _P({ id:'pl1', fecha:_d(2), productos:[_linea('PIL',2)] }), _P({ id:'pl2', productos:[_linea('PIL',1)] }),
              _P({ id:'o1', productos:[_linea('ORO',1)] }),
              _P({ id:'s1', fecha:todayStr(), entregado:true, productos:[_linea('SOM',2)] }) ]
  });
  await page.evaluate(async (fn) => { var e=eval('('+fn+')')(); await _escenario(e.stock, e.pedidos); _nuevo(); }, ESC.toString());

  // ═══ 1. Los cinco casos, con los números de la tabla ═════════════════════════════════════════
  console.log('\n── 1. Los cinco casos: ✅ disponible · 📥 Moreno · ⏳ producción · 🏭 no hay · gris sin saldo ──');
  let r = await ev(async () => {
    var out={};
    _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.tit=_caja(0); out.tTit=_tabla('TIT');
    _nuevo(); _renglon(0, { codigo:'CD1403', cant:1 }); await _esperar(500); out.alm=_caja(0); out.tAlm=_tabla('ALM');
    _nuevo(); _renglon(0, { codigo:'CH1682', cant:1 }); await _esperar(500); out.pil=_caja(0); out.tPil=_tabla('PIL');
    _nuevo(); _renglon(0, { codigo:'CH1775', cant:1 }); await _esperar(500); out.oro=_caja(0); out.tOro=_tabla('ORO');
    _nuevo(); _renglon(0, { codigo:'CH1075', cant:1 }); await _esperar(500); out.jun=_caja(0); out.tJun=_tabla('JUN');
    _nuevo(); _renglon(0, { codigo:'CH1212', cant:1 }); await _esperar(500); out.som=_caja(0); out.tSom=_tabla('SOM');
    /* (rev8, a conciencia) Con una medida ESTÁNDAR: «Otros 150x190» ahora es 📐 medida especial (el dueño: se fabrica a
       pedido, nunca sale del stock — `tests/test_rev8_saldo.js`). Lo que cuida esto sigue igual: un producto que nadie conoce. */
    _nuevo(); _renglon(0, { desc:'SOMIER ARTESANAL DE PINO', medida:'140x190', cant:1 }); await _esperar(500); out.raro=_caja(0);
    return out;
  });
  const T=r;
  chk('✅ TITANIO ICE 160x190 (acá 4 + Banzer 2, 1 pendiente): cuadrito VERDE «DISPONIBLE · podés programar desde mañana, jueves 24/09»',
      T.tit && T.tit.existe && !T.tit.hidden && /ps-verde/.test(T.tit.cls) && /DISPONIBLE · podés programar desde mañana, jueves 24\/09/.test(T.tit.txt), T.tit && [T.tit.cls, T.tit.txt, T.__error]);
  chk('…con los números: «En almacén 6 · Pendientes de entrega 1 · Libres 5»', /En almacén 6 · Pendientes de entrega 1 · Libres 5/.test((T.tit||{}).txt||''), (T.tit||{}).txt);
  chk('…y son los de la tabla de Stock (`stockData()`): almacén = acá + Banzer + Moreno, pendientes = vendido sin entregar',
      !!(T.tit && T.tit.v && T.tTit && T.tit.v.alm===T.tTit.alm && T.tit.v.pend===T.tTit.comp && T.tTit.alm===6 && T.tTit.comp===1), [T.tit && T.tit.v && [T.tit.v.alm, T.tit.v.pend], T.tTit]);
  /* (29/09) «PTF», no «acá»: los vendedores lo leen desde sus tiendas (dueño). */
  chk('…el desglose chico: «PTF 4 · Banzer 2 · Moreno 0» y de cuándo es el corte («Saldo al corte de hoy 08:30»)',
      /PTF 4 · Banzer 2 · Moreno 0/.test((T.tit||{}).txt||'') && !/acá \d/.test((T.tit||{}).txt||'') && /Saldo al corte de hoy 08:30, ya descontado lo entregado/.test((T.tit||{}).txt||''), (T.tit||{}).txt);
  chk('📥 ALMOHADA 50x70 (solo 5 en Moreno): cuadrito ÁMBAR «HAY EN MORENO · se trae en 1 día: programá desde el viernes 25/09»',
      T.alm && /ps-ambar/.test(T.alm.cls) && /HAY EN MORENO · se trae en 1 día: programá desde el viernes 25\/09/.test(T.alm.txt), T.alm && [T.alm.cls, T.alm.txt]);
  chk('…«En almacén 5 · Pendientes de entrega 0 · Libres 5», igual que la tabla', /En almacén 5 · Pendientes de entrega 0 · Libres 5/.test((T.alm||{}).txt||'') && T.tAlm && T.tAlm.alm===5, [(T.alm||{}).txt, T.tAlm]);
  chk('⏳ PILLOW PEDIC 140x190 (acá 1, 3 pendientes, 6 en producción, pedidos el martes 22): ÁMBAR «EN PRODUCCIÓN · decile al cliente que espere ~2 días (llega el 24/09)» — sale a las 48 h (§4gs)',
      T.pil && /ps-ambar/.test(T.pil.cls) && /EN PRODUCCIÓN · decile al cliente que espere ~2 días \(llega el 24\/09\)/.test(T.pil.txt) && /programá desde el viernes 25\/09/.test(T.pil.txt), T.pil && [T.pil.cls, T.pil.txt]);
  /* (01/10) «Faltan N» lleva la cuenta escrita: el dueño vio «En almacén 2 · Pendientes 3 · Faltan 2» y preguntó por las
     matemáticas (el libre negativo no se muestra). faltan = pendientes + este pedido − en almacén. Rojo contra `3606980`. */
  chk('…«En almacén 1 · Pendientes de entrega 3 · Faltan 3 (3 pendientes + 1 de este pedido − 1 en almacén) · En producción 6»',
      /En almacén 1 · Pendientes de entrega 3 · Faltan 3 \(3 pendientes \+ 1 de este pedido − 1 en almacén\) · En producción 6/.test((T.pil||{}).txt||''), (T.pil||{}).txt);
  chk('🏭 ORO BI RELAX 180x190 (no hay en ningún lado): ROJO «NO HAY · decile al cliente que espere ~3 días: hay que mandar a producir (avisá a logística)»',
      T.oro && /ps-rojo/.test(T.oro.cls) && /NO HAY · decile al cliente que espere ~3 días: hay que mandar a producir \(avisá a logística\)/.test(T.oro.txt), T.oro && [T.oro.cls, T.oro.txt]);
  chk('…se manda a producir hoy (antes de las 17), sale el viernes 25/09 (48 h) y ese día se recoge: «programá desde el sábado 26/09 (sábado: solo AM)»',
      /🏭 Se manda a producir hoy, sale de fábrica el viernes 25\/09 \(48 h\) y ese día se recoge\./.test((T.oro||{}).txt||'') && /programá desde el sábado 26\/09 \(sábado: solo AM\)/.test((T.oro||{}).txt||''), (T.oro||{}).txt);
  chk('…«En almacén 0 · Pendientes de entrega 1 · Faltan 2 (1 pendiente + 1 de este pedido − 0 en almacén)» (01/10: en singular)',
      /En almacén 0 · Pendientes de entrega 1 · Faltan 2 \(1 pendiente \+ 1 de este pedido − 0 en almacén\)/.test((T.oro||{}).txt||''), (T.oro||{}).txt);
  chk('🛑 ESPECIAL JUNIOR (ya no se fabrica), con 2 acá: VERDE y dice «ya no se fabrica: quedan 2»',
      T.jun && /ps-verde/.test(T.jun.cls) && /ya no se fabrica: quedan 2/.test(T.jun.txt), T.jun && [T.jun.cls, T.jun.txt]);
  chk('🚚 lo entregado DESPUÉS del corte ya está descontado: SOMIER TITANIO ICE 140x190 acá 3 − 2 entregados hoy = 1',
      /En almacén 1 · Pendientes de entrega 0 · Libres 1/.test((T.som||{}).txt||'') && T.tSom && T.tSom.aca===1, [(T.som||{}).txt, T.tSom]);
  chk('⬜ un producto que no está ni en el catálogo ni en el almacén: GRIS «Sin saldo cargado: consultá con logística»',
      T.raro && !T.raro.hidden && /ps-gris/.test(T.raro.cls) && /Sin saldo cargado: consultá con logística/.test(T.raro.txt), T.raro && [T.raro.cls, T.raro.txt]);
  chk('ningún cuadrito dice NaN, undefined ni un número negativo',
      ['tit','alm','pil','oro','jun','som','raro'].every(k => T[k] && T[k].txt && !/NaN|undefined|−\d|-\d+ /.test(T[k].txt)), ['tit','alm','pil','oro'].map(k => T[k] && T[k].txt));

  r = await ev(async () => {
    var out={};
    await _escenario(null, []);                       // la planilla todavía no tiene NINGÚN Excel de existencias
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.sin=_caja(0);
    STOCK_CARGADO=false; window._bump(); _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.cargando=_caja(0);
    return out;
  });
  chk('⬜ sin ningún Excel subido todavía: GRIS «Sin saldo cargado: consultá con logística»', r.sin && /ps-gris/.test(r.sin.cls) && /Sin saldo cargado/.test(r.sin.txt), r.sin && [r.sin.cls, r.sin.txt, r.__error]);
  chk('…y mientras la planilla no llegó: «⏳ Cargando el saldo del almacén…»', r.cargando && /Cargando el saldo del almacén/.test(r.cargando.txt), r.cargando && r.cargando.txt);

  // ═══ 2. Aparece recién con el producto completo ════════════════════════════════════════════
  console.log('\n── 2. Aparece recién con el producto completo; nunca en productos de tienda ──');
  await page.evaluate(async (fn) => { var e=eval('('+fn+')')(); await _escenario(e.stock, e.pedidos); _nuevo(); }, ESC.toString());
  r = await ev(async () => {
    var out={};
    _renglon(0, { desc:'ALMOHADA' }); await _esperar(500); out.soloNombre=_caja(0);
    _renglon(0, { medida:'50x70' }); await _esperar(500); out.conMedida=_caja(0);
    _renglon(0, { codigo:'CD1403', cant:1 }); await _esperar(500); out.completo=_caja(0);
    _renglon(0, { cant:'' }); await _esperar(500); out.sinCant=_caja(0);
    _renglon(0, { cant:1 }); await _esperar(300);
    _renglon(1, { desc:'PROTECTOR DE COLCHON', medida:'140x190', cant:2 }); await _esperar(500); out.tienda=_caja(1);
    _renglon(2, { desc:'TITAN' }); await _esperar(500); out.aMedias=_caja(2);
    return out;
  });
  chk('solo el nombre («ALMOHADA», sin medida): no aparece nada todavía', r.soloNombre && r.soloNombre.hidden && (r.soloNombre.existe!==false), r.soloNombre && [r.soloNombre.hidden, r.soloNombre.txt, r.__error]);
  chk('ALMOHADA · 50x70 · CD1403 · cant 1 (el ejemplo del dueño): aparece el cuadrito', r.completo && r.completo.existe && !r.completo.hidden && /HAY EN MORENO/.test(r.completo.txt), r.completo && r.completo.txt);
  chk('…(con la medida elegida ya alcanza: el código es opcional)', r.conMedida && r.conMedida.existe && !r.conMedida.hidden, r.conMedida && r.conMedida.txt);
  chk('…y si se borra la cantidad, se esconde', r.sinCant && r.sinCant.existe && r.sinCant.hidden, r.sinCant && [r.sinCant.hidden]);
  chk('un producto de TIENDA (PROTECTOR DE COLCHON) nunca lleva cuadrito', r.tienda && r.tienda.existe && r.tienda.hidden, r.tienda && [r.tienda.existe, r.tienda.hidden, r.tienda.txt]);
  chk('un nombre a medio escribir («TITAN», sin medida) no dice «no hay»', r.aMedias && r.aMedias.existe && r.aMedias.hidden, r.aMedias && [r.aMedias.hidden, r.aMedias.txt]);

  // ═══ 3. La cantidad cuenta; dos renglones del mismo producto se suman ════════════════════════
  console.log('\n── 3. La cantidad cuenta, y dos renglones del mismo producto se suman ──');
  r = await ev(async () => {
    var out={};
    // SOMIER TITANIO ICE 140x190: libre 1 (acá 3 − 2 entregados hoy)
    _nuevo(); _renglon(0, { codigo:'CH1212', cant:1 }); await _esperar(500); out.uno=_caja(0);
    _renglon(0, { cant:3 }); await _esperar(500); out.tres=_caja(0);
    // TITANIO ICE 160x190: libres 5. Dos renglones: 3 + 3 = 6 → no alcanza; 3 + 2 = 5 → alcanza
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:3 }); _renglon(1, { codigo:'CH1201', cant:3 }); await _esperar(500); out.dosA=_caja(0); out.dosB=_caja(1);
    _renglon(1, { cant:2 }); await _esperar(500); out.dosOkA=_caja(0); out.dosOkB=_caja(1);
    return out;
  });
  chk('SOMIER TITANIO ICE 140x190 con 1 libre: pidiendo 1 es ✅ DISPONIBLE', r.uno && /ps-verde/.test(r.uno.cls), r.uno && [r.uno.cls, r.uno.txt, r.__error]);
  chk('⚠️ pidiendo 3 ya NO es «disponible»: «Libres 1 · Faltan 2» y rojo (hay que mandar a producir)',
      r.tres && !/ps-verde/.test(r.tres.cls) && /Libres 1 · Faltan 2/.test(r.tres.txt) && /NO HAY/.test(r.tres.txt), r.tres && [r.tres.cls, r.tres.txt]);
  chk('⚠️ dos renglones de TITANIO ICE 160x190 (3 + 3 = 6) con 5 libres: los DOS cuadritos dicen que no alcanza («Libres 5 · Faltan 1»)',
      r.dosA && r.dosB && !/ps-verde/.test(r.dosA.cls) && !/ps-verde/.test(r.dosB.cls) && /Libres 5 · Faltan 1/.test(r.dosA.txt) && /Libres 5 · Faltan 1/.test(r.dosB.txt), r.dosA && [r.dosA.txt, r.dosB && r.dosB.txt]);
  chk('…y lo dicen: «este pedido lleva 6 (en 2 renglones)»', /este pedido lleva 6 \(en 2 renglones\)/.test((r.dosA||{}).txt||''), (r.dosA||{}).txt);
  chk('…con 3 + 2 = 5 alcanza justo: los dos en verde', r.dosOkA && /ps-verde/.test(r.dosOkA.cls) && /ps-verde/.test((r.dosOkB||{}).cls||''), r.dosOkA && [r.dosOkA.txt]);

  // ═══ 4. La fecha elegida antes de lo posible ══════════════════════════════════════════════
  console.log('\n── 4. La fecha elegida antes de lo posible se avisa abajo del producto (sin frenar) ──');
  r = await ev(async () => {
    var out={};
    _nuevo(); var f=document.getElementById('f-fecha'); f.value='2026-09-24'; f.dispatchEvent(new Event('change'));
    _renglon(0, { codigo:'CD1403', cant:2 }); await _esperar(500); out.moreno=_caja(0);
    f.value='2026-09-25'; f.dispatchEvent(new Event('change')); await _esperar(500); out.morenoOk=_caja(0);
    _renglon(1, { codigo:'CH1201', cant:1 }); f.value='2026-09-24'; f.dispatchEvent(new Event('change')); await _esperar(500); out.hay=_caja(1);
    return out;
  });
  chk('📥 de Moreno con la entrega para mañana (jueves 24): «⚠️ Para el jueves 24/09 no llega: programá desde el viernes 25/09»',
      r.moreno && /Para el jueves 24\/09 no llega: programá desde el viernes 25\/09/.test(r.moreno.txt), r.moreno && [r.moreno.txt, r.__error]);
  chk('…con la fecha del viernes 25 el aviso se va solo', r.morenoOk && !r.morenoOk.hidden && !/no llega/.test(r.morenoOk.txt), r.morenoOk && r.morenoOk.txt);
  chk('…y lo que está a mano (✅) para mañana no avisa nada', r.hay && /ps-verde/.test(r.hay.cls) && !/no llega/.test(r.hay.txt), r.hay && r.hay.txt);

  // ═══ 5. ATC, venta de tienda y RPT ═════════════════════════════════════════════════════════
  console.log('\n── 5. Una ATC y una venta de tienda no llevan cuadrito; una RPT sí ──');
  r = await ev(async () => {
    var out={};
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.oc=_caja(0);
    segSet('f-doc-tipo','ATC'); setDocTipo(); await _esperar(500); out.atc=_caja(0);
    segSet('f-doc-tipo','RPT'); setDocTipo(); await _esperar(500); out.rpt=_caja(0);
    segSet('f-doc-tipo','OC'); setDocTipo();
    abrirVentaTienda(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.tienda=_caja(0);
    _nuevo(); await _esperar(100);
    return out;
  });
  chk('(control) en una OC el cuadrito está', r.oc && !r.oc.hidden && r.oc.existe, r.oc && [r.oc.hidden, r.__error]);
  chk('🎧 pasando el pedido a ATC (reparación: no sale del stock) el cuadrito se va', r.atc && r.atc.existe && r.atc.hidden, r.atc && [r.atc.hidden]);
  chk('🏪 una RPT (reposición de tienda) sí lo lleva: sale del depósito', r.rpt && !r.rpt.hidden && /DISPONIBLE/.test(r.rpt.txt), r.rpt && r.rpt.txt);
  chk('🏪 una VENTA DE TIENDA (se la lleva del local, sin entrega) no lo lleva', r.tienda && r.tienda.existe && r.tienda.hidden, r.tienda && [r.tienda.hidden]);

  // ═══ 6. Editando, el propio pedido no se cuenta ═══════════════════════════════════════════
  console.log('\n── 6. Al editar, las unidades del propio pedido no se cuentan contra él ──');
  r = await ev(async () => {
    var out={};
    // SOMIER TITANIO ICE 140x190: acá 3, 2 salieron hoy; el pedido «e1» (para el viernes) lleva el único que queda
    await _escenario(_stock({ aca:{ SOM:3 } }), [ _P({ id:'s1', fecha:todayStr(), entregado:true, productos:[_linea('SOM',2)] }),
                                                  _P({ id:'e1', fecha:'2026-09-25', cliente:'CLIENTE EDITADO', productos:[_linea('SOM',1)] }) ]);
    out.tabla=_tabla('SOM');
    editPedido('e1'); await _esperar(600); out.edit=_caja(0);
    // Un pedido con fecha PASADA y sin ✓ se da por salido (§4co) y bajó el depósito; editándolo para reprogramarlo, vuelve
    await _escenario(_stock({ aca:{ SOM:2 }, fAca:_d(-2) }), [ _P({ id:'e2', fecha:_d(-1), cliente:'SIN ENTREGAR', productos:[_linea('SOM',2)] }) ]);
    out.tablaVieja=_tabla('SOM');
    editPedido('e2'); await _esperar(600); out.editVieja=_caja(0);
    return out;
  });
  chk('(partida) en la tabla de Stock el único que queda está comprometido por ese pedido: almacén 1, pendientes 1', r.tabla && r.tabla.alm===1 && r.tabla.comp===1, [r.tabla, r.__error]);
  chk('⚠️ editando ese pedido el cuadrito NO le dice «no hay» a su propio colchón: ✅ «Pendientes de entrega 0 (sin este pedido) · Libres 1»',
      r.edit && /ps-verde/.test(r.edit.cls) && /Pendientes de entrega 0 \(sin este pedido\) · Libres 1/.test(r.edit.txt), r.edit && [r.edit.cls, r.edit.txt]);
  chk('⚠️ un pedido de AYER sin entregar se dio por salido (la tabla lo descontó: acá 0); editándolo para reprogramar, sus 2 vuelven: ✅ «Libres 2»',
      r.tablaVieja && r.tablaVieja.aca===0 && r.editVieja && /ps-verde/.test(r.editVieja.cls) && /En almacén 2 · Pendientes de entrega 0 \(sin este pedido\) · Libres 2/.test(r.editVieja.txt),
      [r.tablaVieja, r.editVieja && r.editVieja.txt]);

  // ═══ 7. La pregunta al guardar ═════════════════════════════════════════════════════════════
  console.log('\n── 7. La pregunta al guardar: solo si algo quedó sin saldo libre ──');
  await page.evaluate(async (fn) => { var e=eval('('+fn+')')(); await _escenario(e.stock, e.pedidos); _nuevo(); }, ESC.toString());
  page.__dialogos.length=0; page.__respuestas=[false];
  r = await ev(async () => {
    var out={}, n0=_saves.length;
    _llenarDatos('SIN SALDO'); _renglon(0, { codigo:'CH1775', cant:1 }); await _esperar(500);
    await _guardar(); out.cancelado=_saves.length-n0; out.sigue=document.getElementById('f-cliente').value;
    return out;
  });
  const dlgNo = page.__dialogos.slice();
  chk('🏭 guardando un producto que no hay, pregunta ANTES de guardar, nombrando el producto, lo que falta y la espera',
      dlgNo.length===1 && /ORO BI RELAX 180x190: no hay saldo libre \(faltan 2\)/.test(dlgNo[0]) && /espera ~3 días/.test(dlgNo[0]) && /Le avisaste al cliente/.test(dlgNo[0]), dlgNo.map(d => d.slice(0,300)));
  chk('…y «Cancelar» vuelve al formulario SIN guardar (el pedido sigue escrito)', r.cancelado===0 && r.sigue==='SIN SALDO', [r, r.__error]);
  page.__dialogos.length=0; page.__respuestas=[true];
  r = await ev(async () => { var n0=_saves.length; await _guardar(); await _esperar(300); var g=_saves.slice(n0).filter(function(s){ return s.cliente==='SIN SALDO'; });
    return { guardados:g.length, prod:g[0]&&g[0].productos&&g[0].productos[0]&&g[0].productos[0].desc }; });
  chk('…«Aceptar» guarda igual: no se frena la venta', r.guardados===1 && r.prod==='ORO BI RELAX' && page.__dialogos.length===1, [r, page.__dialogos.length]);
  page.__dialogos.length=0; page.__respuestas=[];
  r = await ev(async () => { var out={}; if(document.getElementById('modal').classList.contains('on')) closeModal(); _nuevo(); var n0=_saves.length;
    _llenarDatos('CON SALDO'); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); await _guardar(); await _esperar(300);
    out.guardados=_saves.slice(n0).filter(function(s){ return s.cliente==='CON SALDO'; }).length; return out; });
  chk('✅ con saldo NO pregunta nada y guarda', r.guardados===1 && page.__dialogos.length===0, [r, page.__dialogos]);
  page.__dialogos.length=0; page.__respuestas=[];
  r = await ev(async () => { var out={}; if(document.getElementById('modal').classList.contains('on')) closeModal(); _nuevo(); var n0=_saves.length;
    _llenarDatos('MORENO OK'); var f=document.getElementById('f-fecha'); f.value='2026-09-25'; f.dispatchEvent(new Event('change'));
    _renglon(0, { codigo:'CD1403', cant:1 }); await _esperar(500); await _guardar(); await _esperar(300);
    out.guardados=_saves.slice(n0).filter(function(s){ return s.cliente==='MORENO OK'; }).length; return out; });
  chk('📥 de Moreno con una fecha posible: tampoco pregunta (hay saldo libre)', r.guardados===1 && page.__dialogos.length===0, [r, page.__dialogos]);
  page.__dialogos.length=0; page.__respuestas=[true];
  r = await ev(async () => { var out={}; if(document.getElementById('modal').classList.contains('on')) closeModal(); _nuevo(); var n0=_saves.length;
    _llenarDatos('MORENO APURADO'); var f=document.getElementById('f-fecha'); f.value='2026-09-24'; f.dispatchEvent(new Event('change'));
    _renglon(0, { codigo:'CD1403', cant:1 }); await _esperar(500); await _guardar(); await _esperar(300);
    out.guardados=_saves.slice(n0).filter(function(s){ return s.cliente==='MORENO APURADO'; }).length; return out; });
  chk('📥 de Moreno para MAÑANA: pregunta por la fecha («Para el jueves 24/09 no llega: programá desde el viernes 25/09»)',
      page.__dialogos.length===1 && /ALMOHADA 50x70: Para el jueves 24\/09 no llega: programá desde el viernes 25\/09/.test(page.__dialogos[0]) && r.guardados===1, [r, page.__dialogos.map(d=>d.slice(0,250))]);
  // Editando: sin tocar productos no pregunta; subiendo la cantidad, sí
  page.__dialogos.length=0; page.__respuestas=[];
  r = await ev(async () => {
    var out={}; if(document.getElementById('modal').classList.contains('on')) closeModal();
    await _escenario(_stock({ aca:{ ORO:0 } }), [ _P({ id:'ed1', fecha:'2026-09-28', cliente:'VENTA REVISADA', direccion:'Calle vieja', productos:[_linea('ORO',1)] }) ]);
    var n0=_saves.length;
    editPedido('ed1'); await _esperar(600); out.caja=_caja(0);
    document.getElementById('f-direccion').value='Calle nueva 123'; await _guardar(); await _esperar(300);
    out.dir=(_saves.slice(n0).filter(function(s){ return s.id==='ed1'; })[0]||{}).direccion;
    return out;
  });
  chk('✏️ corrigiendo la dirección de una venta de algo que no hay (sin tocar productos): el cuadrito lo muestra, pero al guardar NO pregunta',
      r.dir==='Calle nueva 123' && page.__dialogos.length===0 && r.caja && /ps-rojo/.test(r.caja.cls), [r.dir, page.__dialogos, r.caja && r.caja.cls, r.__error]);
  page.__dialogos.length=0; page.__respuestas=[false];
  r = await ev(async () => {
    var out={}; if(document.getElementById('modal').classList.contains('on')) closeModal();
    var n0=_saves.length; editPedido('ed1'); await _esperar(600);
    _renglon(0, { cant:2 }); await _esperar(500); await _guardar(); await _esperar(300);
    out.guardados=_saves.slice(n0).filter(function(s){ return s.id==='ed1'; }).length; return out;
  });
  chk('✏️ …pero subiéndole la cantidad (1 → 2) sí pregunta, y Cancelar no guarda', page.__dialogos.length===1 && /ORO BI RELAX 180x190 ×2: no hay saldo libre/.test(page.__dialogos[0]) && r.guardados===0,
      [r, page.__dialogos.map(d=>d.slice(0,200))]);
  await ev(() => { cancelEdit(); if(document.getElementById('modal').classList.contains('on')) closeModal(); });

  // ═══ 8. Que se actualice solo ═══════════════════════════════════════════════════════════════
  console.log('\n── 8. Frescura: la lectura nueva repinta, completar pide leer (una por minuto), 🔄, corte viejo y sin conexión ──');
  await page.evaluate(async (fn) => { var e=eval('('+fn+')')(); await _escenario(e.stock, e.pedidos); _nuevo(); }, ESC.toString());
  r = await ev(async () => {
    var out={};
    _renglon(0, { codigo:'CH1201', cant:2 }); await _esperar(500); out.antes=_caja(0);
    var q=document.querySelector('#f-productos .prod-cant'); q.focus();
    // Logística sube el Excel nuevo: TITANIO ICE acá 0. Llega con la lectura automática (la de cada 2 minutos).
    _SRV.stock=_stock({ aca:{ PIL:1 }, ban:{}, im:{ ALM:5 } });
    await autoRefrescar('tic'); await _esperar(200);
    out.despues=_caja(0); out.foco=(document.activeElement===q); out.cant=q.value; out.desc=document.querySelector('#f-productos .prod-desc').value;
    return out;
  });
  chk('(partida) TITANIO ICE con el corte de la mañana: ✅ disponible', r.antes && /ps-verde/.test(r.antes.cls), r.antes && [r.antes.txt, r.__error]);
  chk('🔄 llega una lectura nueva (el Excel nuevo dice 0 acá y 0 en Banzer): el cuadrito se repinta SOLO y pasa a «no hay»',
      r.despues && /ps-rojo/.test(r.despues.cls) && /En almacén 0 · Pendientes de entrega 1 · Faltan 3/.test(r.despues.txt), r.despues && [r.despues.cls, r.despues.txt]);
  chk('…sin tocar los campos ni sacar el foco de donde se está escribiendo', r.despues && !r.despues.hidden && r.foco===true && r.cant==='2' && r.desc==='TITANIO ICE', [r.foco, r.cant, r.desc]);

  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:10 } }), []);
    _nuevo(); await _esperar(100);
    // La última lectura buena es de hace 2 minutos, y mientras tanto la otra vendedora cargó 9.
    ULTIMO_REFRESCO=Date.now()-120000; SALDO_LECTURA_T=0;
    _SRV.pedidos=[ _P({ id:'x1', productos:[_linea('TIT',3)] }), _P({ id:'x2', productos:[_linea('TIT',3)] }), _P({ id:'x3', productos:[_linea('TIT',3)] }) ];
    _SRV.demora=700; var n0=_lecturas;
    _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(550); out.leyendo=_caja(0);
    await _esperar(1200); out.leido=_caja(0); out.lecturas=_lecturas-n0;
    // Otro producto enseguida: la lectura es fresca, no se vuelve a leer
    _renglon(1, { codigo:'CD1403', cant:1 }); await _esperar(600); out.lecturas2=_lecturas-n0;
    return out;
  });
  chk('⏳ completando un producto con la última lectura de hace 2 min: «🔄 Consultando saldo…» mientras lee',
      r.leyendo && /Consultando saldo/.test(r.leyendo.txt), r.leyendo && [r.leyendo.txt, r.__error]);
  chk('⚠️ …y recién ahí contesta con lo NUEVO: «En almacén 10 · Pendientes de entrega 9 · Libres 1» (no 10)',
      r.leido && /En almacén 10 · Pendientes de entrega 9 · Libres 1/.test(r.leido.txt) && /ps-verde/.test(r.leido.cls), r.leido && r.leido.txt);
  chk('…con UNA sola lectura, y un segundo producto enseguida no vuelve a leer', r.lecturas===1 && r.lecturas2===1, [r.lecturas, r.lecturas2]);

  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:10 } }), []);
    _nuevo(); await _esperar(100);
    ULTIMO_REFRESCO=Date.now()-120000; SALDO_LECTURA_T=0;
    _SRV.pedidos=[ _P({ id:'z1', productos:[_linea('TIT',4)] }) ];
    _SRV.demora=800; var n0=_lecturas;
    refrescarEstado();                          // la que ya salió (p. ej. la de entrar al formulario pasado un minuto)
    _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(1600);
    out.caja=_caja(0); out.lecturas=_lecturas-n0; _SRV.demora=0;
    return out;
  });
  chk('…y si ya hay una lectura en camino (la de entrar al formulario), el cuadrito la espera en vez de pedir otra',
      r.lecturas===1 && r.caja && /Pendientes de entrega 4 · Libres 6/.test(r.caja.txt), [r.lecturas, r.caja && r.caja.txt, r.__error]);

  r = await ev(async () => {
    var out={};
    _nuevo(); await _esperar(100);
    ULTIMO_REFRESCO=Date.now()-120000; SALDO_LECTURA_T=0; _SRV.demora=0; _SRV.falla=true;
    var n0=_lecturas;
    _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(700); out.l1=_lecturas-n0; out.caja=_caja(0);
    _renglon(1, { codigo:'CD1403', cant:1 }); await _esperar(700);
    _renglon(2, { codigo:'CH1682', cant:1 }); await _esperar(700); out.l2=_lecturas-n0;
    return out;
  });
  chk('⏱️ tope: sin conexión, completar TRES productos en menos de un minuto pide UNA sola lectura (la planilla viene entera)', r.l1===1 && r.l2===1, [r.l1, r.l2, r.__error]);
  chk('…y el cuadrito lo dice en ámbar: «⚠️ Sin conexión desde hace 2 min: el saldo puede no estar al día»',
      r.caja && /Sin conexión desde hace 2 min: el saldo puede no estar al día/.test(r.caja.txt), r.caja && r.caja.txt);
  await page.clock.setFixedTime(new Date(Date.parse(RELOJ)+90000));      // pasa un minuto y medio
  r = await ev(async () => { var n0=_lecturas; _renglon(0, { cant:2 }); await _esperar(700); return { l:_lecturas-n0 }; });
  chk('…pasado el minuto, completar (o cambiar) un producto vuelve a leer', r.l===1, [r, r.__error]);
  await page.clock.setFixedTime(new Date(RELOJ));

  r = await ev(async () => {
    var out={};
    SALDO_LECTURA_T=0; _SRV.falla=false; await _escenario(_stock({ aca:{ TIT:4 } }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.antes=_caja(0);
    _SRV.stock=_stock({ aca:{ TIT:7 } }); var n0=_lecturas;
    var b=document.querySelector('#f-productos .prod-saldo .ps-act'); out.hayBoton=!!b;
    if(b) b.click(); await _esperar(500); out.fresca=_caja(0); out.lFresca=_lecturas-n0; out.toast=document.getElementById('toast').textContent;
    return out;
  });
  chk('🔄 el cuadrito tiene su botón «Actualizar»', r.hayBoton===true && /🔄 Actualizar/.test((r.antes||{}).txt||''), [r.hayBoton, r.__error]);
  /* (27/09, a conciencia) El dueño pidió un mínimo de 15 s entre lecturas del botón: con la lectura de recién no se lee de
     nuevo (antes leía en cada toque). Pasados los 15 s, lee ya, como antes. `tests/test_rev8_saldo.js` §8. */
  chk('…con la lectura de recién (menos de 15 s) NO vuelve a leer: «El saldo ya está al día: se leyó hace 1 s»',
      r.lFresca===0 && /En almacén 4/.test((r.fresca||{}).txt||'') && /El saldo ya está al día: se leyó hace 1 s/.test(r.toast||''), [r.lFresca, r.toast, r.fresca && r.fresca.txt]);
  await page.clock.setFixedTime(new Date(Date.parse(RELOJ)+16000));      // pasan 16 segundos
  r = await ev(async () => {
    var n0=_lecturas, b=document.querySelector('#f-productos .prod-saldo .ps-act');
    if(b) b.click(); await _esperar(500);
    return { despues:_caja(0), lecturas:_lecturas-n0 };
  });
  await page.clock.setFixedTime(new Date(RELOJ));
  chk('…pasados 15 s lee la planilla YA (aunque la lectura automática sea de hace menos de un minuto) y repinta: de 4 pasa a 7',
      r.lecturas===1 && /En almacén 7/.test((r.despues||{}).txt||''), [r.lecturas, r.despues && r.despues.txt, r.__error]);

  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 }, fAca:'2026-09-21', hAca:'09:00:00' }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.viejo=_caja(0);
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.hoy=_caja(0);
    return out;
  });
  chk('📅 el corte de acá es del lunes: «⚠️ El último corte es del 21/09: pedile a logística que suba el de hoy» (y la respuesta igual se ve)',
      r.viejo && /El último corte es del 21\/09: pedile a logística que suba el de hoy/.test(r.viejo.txt) && /DISPONIBLE/.test(r.viejo.txt) && /Saldo al corte del 21\/09 09:00/.test(r.viejo.txt), r.viejo && [r.viejo.txt, r.__error]);
  chk('…con el corte de hoy no avisa nada de eso, y dice «Saldo al corte de hoy 08:30 · consultado recién»',
      r.hoy && !/El último corte es/.test(r.hoy.txt) && /Saldo al corte de hoy 08:30, ya descontado lo entregado · consultado recién/.test(r.hoy.txt), r.hoy && r.hoy.txt);

  // La pregunta al guardar usa la ÚLTIMA lectura, no la del cuadrito
  page.__dialogos.length=0; page.__respuestas=[false];
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:2 } }), []);
    _nuevo(); _llenarDatos('ULTIMA LECTURA'); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.caja=_caja(0);
    // Justo antes de guardar, otra vendedora se llevó los 2
    _SRV.pedidos=[ _P({ id:'y1', productos:[_linea('TIT',2)] }) ];
    var n0=_saves.length; await _guardar(); out.guardados=_saves.length-n0; out.cajaDespues=_caja(0);
    return out;
  });
  chk('(partida) el cuadrito dice ✅ (su lectura es de antes)', r.caja && /ps-verde/.test(r.caja.cls), r.caja && [r.caja.txt, r.__error]);
  chk('⚠️ al guardar se lee la planilla y la pregunta sale con el dato NUEVO: «faltan 1»', page.__dialogos.length===1 && /TITANIO ICE 160x190: no hay saldo libre \(faltan 1\)/.test(page.__dialogos[0]) && r.guardados===0,
      [r.guardados, page.__dialogos.map(d=>d.slice(0,200))]);
  chk('…y el cuadrito ya dice lo mismo que la pregunta', r.cajaDespues && /ps-rojo/.test(r.cajaDespues.cls) && /Pendientes de entrega 2 · Faltan 1/.test(r.cajaDespues.txt), r.cajaDespues && r.cajaDespues.txt);
  await ev(() => { if(document.getElementById('modal').classList.contains('on')) closeModal(); _nuevo(); });

  // ═══ 9. En el celular ═════════════════════════════════════════════════════════════════════════
  console.log('\n── 9. En el celular: sin scroll de costado, sin mover los campos y sin robar el foco ──');
  for (const ancho of [390, 360]) {
    const { ctx:cm, page:M } = await abrirUna({ width:ancho, height:844 }, true);
    const evM = evDe(M);
    await M.evaluate(async (fn) => { var e=eval('('+fn+')')(); await _escenario(e.stock, e.pedidos); _nuevo(); window.scrollTo(0,0); }, ESC.toString());
    /* Primero sin cantidad (el renglón no está completo: no hay cuadrito), con el dedo en la cantidad; recién ahí se mide
       dónde está el producto, se escribe la cantidad y se vuelve a medir con el cuadrito ya a la vista. */
    await M.fill('#f-productos .prod-cant', '');
    await M.fill('#f-productos .prod-codigo', 'CH1201');
    await M.tap('#f-productos .prod-cant');
    await M.waitForTimeout(500);
    const antes = await evM(() => { var d=document.querySelector('#f-productos .prod-desc').getBoundingClientRect(); return { top:d.top, y:window.scrollY, oculta:_caja(0).hidden }; });
    await M.fill('#f-productos .prod-cant', '1');
    await M.waitForTimeout(600);
    const d1 = await evM(() => { var d=document.querySelector('#f-productos .prod-desc').getBoundingClientRect(); return { top:d.top, y:window.scrollY,
      foco:(document.activeElement||{}).className, caja:_caja(0) }; });
    await M.tap('#f-add-prod'); await M.evaluate(() => { _renglon(1, { codigo:'CD1403', cant:1 }); _renglon(2, { codigo:'CH1775', cant:1 }); });
    await M.waitForTimeout(700);
    const d2 = await evM(() => ({ ancho:document.documentElement.scrollWidth, vista:innerWidth, cajas:[0,1,2].map(function(i){ var c=_caja(i); return c.cls+' | '+c.txt.slice(0,40); }),
      desborda:[].slice.call(document.querySelectorAll('.prod-saldo')).some(function(b){ return !b.hidden && (b.scrollWidth>b.clientWidth+1 || b.getBoundingClientRect().right>innerWidth+0.5); }),
      pestanas:[].slice.call(document.querySelectorAll('.nav button')).map(function(b){ return b.id; }) }));
    chk(ancho+' px: el cuadrito aparece debajo del producto (verde)', d1.caja && !d1.caja.hidden && /ps-verde/.test(d1.caja.cls), d1.caja && [d1.caja.cls, d1.__error]);
    chk(ancho+' px: ⚠️ el campo de arriba NO se movió al aparecer el cuadrito, y el foco sigue en la cantidad',
        antes.oculta===true && d1.caja && !d1.caja.hidden && Math.abs((d1.top||0)-(antes.top||0))<1 && d1.y===antes.y && /prod-cant/.test(d1.foco||''), [antes, d1.top, d1.y, d1.foco]);
    chk(ancho+' px: con tres cuadritos (verde, ámbar, rojo) no hay scroll de costado ni un cuadrito que se salga',
        d2.ancho<=d2.vista && !d2.desborda && d2.cajas && /ps-verde/.test(d2.cajas[0]) && /ps-ambar/.test(d2.cajas[1]) && /ps-rojo/.test(d2.cajas[2]), d2);
    chk(ancho+' px: las pestañas son las de siempre (no se agregó ninguna)', JSON.stringify(d2.pestanas)===JSON.stringify(['tab-form','tab-mis','tab-chofer','tab-conta','tab-atc','tab-admin']), d2.pestanas);
    await cm.close();
  }

  // ═══ 10. Dos dispositivos contra el servidor de verdad ════════════════════════════════════════
  console.log('\n── 10. El caso del dueño: corte a las 9, a las 15 ya entraron 9 pedidos; la otra vendedora tiene que verlo ──');
  await (async () => {
    const S = servidor();
    const K_TIT = 'TITANIO ICE|160X190';
    const hoy = '2026-09-23';
    const r0 = S.guardar({ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:0, observaciones: JSON.stringify({
      c:{ f:hoy, hora:'09:00:00', u:{ [K_TIT]:10 }, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', t:Date.parse('2026-09-23T09:00:00-04:00') },
      e:[], p:[], a:{}, g:{}, al:{ 'PRODUCTOS TERMINADOS FAB.':'log' }, h:[] }) });
    chk('(partida) el servidor tiene el corte de las 09:00 con 10 TITANIO ICE 160x190', !!(r0 && r0.ok), r0);
    const abrirDos = async (vend) => {
      const context = await browser.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, timezoneId:'America/La_Paz' });
      await context.exposeFunction('__gs', (body) => S.post(body));
      await context.addInitScript(INIT_DOS, vend);
      await context.route(/^https?:/, rr => rr.abort());
      const p = await context.newPage();
      p.setDefaultTimeout(8000);
      p.__dialogos=[]; p.__respuestas=[];
      p.on('pageerror', e => errores.push(e.message));
      p.on('dialog', d => { if(/^⚠️ ¿PEDIDO REPETIDO\?/.test(d.message())){ d.accept(); return; }   // (§4ih) ver arriba
        p.__dialogos.push(d.message()); const si = p.__respuestas.length ? p.__respuestas.shift() : true; if(si) d.accept(); else d.dismiss(); });
      await p.clock.setFixedTime(new Date(RELOJ));
      await p.goto('file://' + PEDIDOS, { waitUntil:'load' });
      await p.waitForTimeout(400);
      await p.evaluate(async () => {
        var c=document.getElementById('conn-form'); if(c) c.style.display='none';
        CONNECTED=true;
        if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
        if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
        CARGA_GEN++; CARGA_ESTADO='ok';
        if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
        if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
        await refrescarEstado(); ULTIMO_ERROR='';
        window._caja0=function(){ var b=document.querySelector('#f-productos .prod-card .prod-saldo'); return b ? { hidden:b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim() } : null; };
      });
      return { context, p };
    };
    const vender = async (A, cli, cant) => {
      await A.evaluate(() => { if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); });
      await A.fill('#f-nota', String(3000+Math.floor(Math.random()*900)));
      await A.fill('#f-cliente', cli);
      await A.fill('#f-celular', '71234567');
      await A.fill('#f-productos .prod-codigo', 'CH1201');
      await A.fill('#f-productos .prod-cant', String(cant));
      await A.fill('#f-zona', 'Norte');
      await A.fill('#f-saldo', '3000');
      await A.waitForTimeout(450);
      await A.tap('#f-submit'); await A.waitForTimeout(700);
      await A.evaluate(async () => { for(var i=0;i<60;i++){ await esperar(50); if(!Object.keys(SAVE_EN_VUELO||{}).length) break; } });
    };
    const { context:cB, p:B } = await abrirDos('Carola Chavez');          // la vendedora B abrió el panel temprano
    const { context:cA, p:A } = await abrirDos('Mirian Salazar');
    let rb = await B.evaluate(() => { var o=stockData().lista.filter(function(x){ return x.k==='TITANIO ICE|160X190'; })[0]; return o ? { comp:o.comp, dep:o.deposito } : null; });
    chk('(partida) B abrió con el corte: 10 en almacén, 0 pendientes', rb && rb.dep===10 && rb.comp===0, rb);
    await vender(A, 'CLIENTE A1', 3); await vender(A, 'CLIENTE A2', 3); await vender(A, 'CLIENTE A3', 3);
    const enServ = S.filas().filter(f => /^CLIENTE A/.test(f.cliente||'')).length;
    chk('A cargó 3 pedidos (3 + 3 + 3 = 9 unidades) después del corte, y están en la planilla', enServ===3 && !A.__dialogos.length, [enServ, A.__dialogos]);
    // Pasaron 2 minutos desde la última lectura de B (su panel quedó abierto, sin tocar)
    await B.clock.setFixedTime(new Date(Date.parse(RELOJ)+120000));
    const lecB0 = await B.evaluate(() => window.__ctl.lecturas);
    // B ya está en el formulario (no se toca la pestaña: entrar al formulario ya relee si pasó un minuto, y acá se mide
    // la relectura de COMPLETAR el producto)
    await B.evaluate(() => { if(document.getElementById('modal').classList.contains('on')) closeModal(); resetForm(); });
    await B.fill('#f-productos .prod-codigo', 'CH1201');
    await B.fill('#f-productos .prod-cant', '1');
    await B.waitForTimeout(1500);
    rb = await B.evaluate(() => ({ caja:_caja0(), lecturas:window.__ctl.lecturas }));
    chk('⚠️ B completa el producto: su cuadrito dice «En almacén 10 · Pendientes de entrega 9 · Libres 1» — NO 10 — gracias a la relectura',
        rb.caja && /En almacén 10 · Pendientes de entrega 9 · Libres 1/.test(rb.caja.txt) && /ps-verde/.test(rb.caja.cls), rb.caja && [rb.caja.cls, rb.caja.txt]);
    chk('…y fue UNA lectura, pedida al completar el producto (la última tenía más de un minuto)', rb.lecturas-lecB0===1, [lecB0, rb.lecturas]);
    await B.fill('#f-productos .prod-cant', '2'); await B.waitForTimeout(700);
    rb = await B.evaluate(() => _caja0());
    chk('…si B pide 2, el cuadrito dice que falta 1 («Libres 1 · Faltan 1») y que hay que mandar a producir', rb && /Libres 1 · Faltan 1/.test(rb.txt) && /ps-rojo/.test(rb.cls), rb && rb.txt);
    // B vuelve a 1 (su cuadrito: ✅ libre 1). Segundos antes de que B guarde, A carga el último.
    await B.fill('#f-productos .prod-cant', '1'); await B.waitForTimeout(700);
    const verdeAntes = await B.evaluate(() => _caja0());
    await vender(A, 'CLIENTE A4', 1);
    await B.evaluate(() => { document.getElementById('f-nota').value='4100'; document.getElementById('f-cliente').value='CLIENTE DE B'; document.getElementById('f-celular').value='76543210';
      document.getElementById('f-zona').value='Sur'; document.getElementById('f-saldo').value='3000'; });
    B.__dialogos.length=0; B.__respuestas=[false];
    await B.tap('#f-submit'); await B.waitForTimeout(1500);
    const cajaB = await B.evaluate(() => _caja0());
    const deB = S.filas().filter(f => f.cliente==='CLIENTE DE B').length;
    chk('(partida) antes de guardar, el cuadrito de B todavía decía ✅ (su lectura era de antes del último pedido de A)', verdeAntes && /ps-verde/.test(verdeAntes.cls), verdeAntes && verdeAntes.txt);
    chk('⚠️ al guardar, B lee la planilla y la pregunta sale con el dato de ESA lectura: «no hay saldo libre (faltan 1)»',
        B.__dialogos.length===1 && /TITANIO ICE 160x190: no hay saldo libre \(faltan 1\)/.test(B.__dialogos[0]), B.__dialogos.map(d=>d.slice(0,220)));
    chk('…Cancelar: el pedido de B no llegó a la planilla, y su cuadrito ya dice «Pendientes de entrega 10 · Faltan 1»',
        deB===0 && cajaB && /Pendientes de entrega 10 · Faltan 1/.test(cajaB.txt), [deB, cajaB && cajaB.txt]);
    B.__dialogos.length=0; B.__respuestas=[true];
    await B.tap('#f-submit'); await B.waitForTimeout(1500);
    const deB2 = S.filas().filter(f => f.cliente==='CLIENTE DE B').length;
    chk('…y Aceptar lo guarda igual (se avisa, no se frena la venta)', deB2===1 && B.__dialogos.length===1, [deB2, B.__dialogos.length]);
    await cA.close(); await cB.close();
  })().catch(e => chk('(el escenario de los dos dispositivos no terminó)', false, String(e && e.stack || e).slice(0,400)));

  // ═══ 11. Sin errores ═══════════════════════════════════════════════════════════════════════════
  chk('ningún error de JavaScript en las páginas', errores.length===0, errores.slice(0,5));
  await ctx1.close();
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
