/* 💰 LA REVISIÓN DEL 29/09 EN PEDIDOS Y PLATA (§4gy): A2 (el pago mixto falso) y A4 (el retiro borrado que volvía).

   A2 · «↩️ Era un pago de la venta» sobre un flete cobrado en el MISMO formulario de la venta. `_cobrarAhora` lo escribe con
        el mismo método, día y recibo que el pago de la venta, y `mixtoEn` lo tomaba por el 2° método de un pago mixto:
        · en una venta «SÍ, pagado» aparecía un mixto «Efectivo + Efectivo», el formulario ya no dejaba corregir ni la
          dirección («El segundo método es igual al primero») y seguir su aviso mudaba los 3.300 al día de hoy;
        · en un mixto de verdad, con dos candidatos el mixto dejaba de reconocerse.
        Ahora el 2° método nunca es el mismo método (y banco, si es QR) que el anticipo —el formulario no lo deja—, y con
        varios candidatos vale el que cierra el «A cuenta».
   A4 · Corregir un retiro no mandaba el sello: si otro equipo lo había borrado, la corrección lo volvía a crear (el
        servidor 2026-09-28-a solo contesta `borrado` si llega el sello), y el efectivo se restaba otra vez en el cuadre.

   El panel de verdad contra el google-apps-script.gs de verdad (en Node, con una planilla de mentira), con el banco de
   pruebas de test_codex28_flujos.js; las cuentas de plata, con la página sola.
   ⚠️ Cada punto con «A2»/«A4» falla contra lo publicado (`040e1df`). Relojes CLAVADOS (septiembre de 2026).
   Se corre:  node tests/test_rev29_pedidos.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_040e1df.html node tests/test_rev29_pedidos.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* ── El servidor: el .gs real con un Google de mentira (igual que test_codex28_flujos.js) ── */
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
  return { ctx, sh, post, fila };
}

function INIT(){
  window.__ctl = { rules: [], log: [] };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || P.fotoId || '');
    window.__ctl.log.push({ act: act, id: id, rev: P.pedido ? P.pedido.rev : P.rev });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { rule = r; r.n--; break; }
    }
    if (rule && rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    return window.__gs(body).then(resp);
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  /* Un equipo contra el servidor S, con el reloj clavado en `reloj`. */
  const abrir = async (S, reloj) => {
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.__dialogos = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
    await page.clock.setFixedTime(new Date(reloj || '2026-09-16T10:00:00-04:00'));
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
  /* La página sola (sin servidor): los guardados quedan en `window._saves`. */
  const sola = async () => {
    const page = await browser.newPage({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-09-28T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER); if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      window._saves=[]; apiSave=function(x){ window._saves.push(JSON.parse(JSON.stringify(x))); return Promise.resolve({ok:true}); };
      apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
      apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
      window.dormir=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      /* Una venta inventada con los cobros `cobros` (en el formato de textoCobros). */
      window._venta=function(id, cobros, o){
        return Object.assign({ id:id, oc:'09-600', nota:'100', turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:'2026-09-21', maps:'',
          observaciones:'', garantia:'', facturarA:'', estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, fotos:[],
          vendedor:'Juan Pablo Paredes', cliente:'CLIENTE '+id, ts:new Date('2026-09-14T11:00:00-04:00').getTime(),
          productos:[{desc:'COLCHON ORTOPEDICO',medida:'140x190',cant:1,precio:3000}], pagado:false, saldo:0, acuenta:0, cobradoBs:0,
          metodoPago:textoCobros(cobros), rev:5 }, o||{});
      };
      window._foto=function(p){ var m=mixtoDe(p); return { mixto:m?(m.metodo+(m.banco?' '+m.banco:'')+' '+m.monto):null, total:ventaTotal(p), cobrado:contaCobrado(p),
        fuera:cobradoFueraDeAcuenta(p), saldo:p.saldo, pagado:p.pagado, acuenta:p.acuenta }; };
      window._eraUnPago=async function(id){
        showContaModal(id);
        var b=Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return /Era un pago de la venta/.test(x.innerText); })[0];
        if(!b) return false;
        b.click(); await dormir(250); closeModal(); return true;
      };
    });
    return page;
  };

  /* ══ A4 · un retiro borrado desde otro equipo no vuelve con la corrección ══ */
  {
    const S = servidor();
    const A = await abrir(S), B = await abrir(S);
    const r0 = await A.evaluate(async () => {
      var f=filaDeRetiro({ id:'__ret_t1__', fecha:todayStr(), entrega:'Carola Chavez', retira:'Contabilidad', monto:400, notas:['11'], tipo:'Facturado', fotos:[], obs:'' });
      var res=await persistRetiro(f); await quieto();
      return { ok:!!(res && res.ok), rev:(RETIROS.filter(function(r){ return r.id==='__ret_t1__'; })[0]||{}).rev };
    });
    chk('(partida) A guardó un retiro de 400 y quedó sellado', r0.ok && !!S.fila('__ret_t1__') && r0.rev>0, r0);
    const bOk = await B.evaluate(async () => {
      await refrescarEstado(); await esperar(100);
      abrirRetiros(); await esperar(100);
      borrarRetiro('__ret_t1__'); await esperar(1500); await quieto();
      return !RETIROS.some(function(r){ return r.id==='__ret_t1__'; });
    });
    chk('(partida) B lo borró desde la ventana de retiros', bOk && !S.fila('__ret_t1__'), { bOk, fila:S.fila('__ret_t1__') });
    const r1 = await A.evaluate(async () => {
      window.__ctl.log=[]; window._toasts=[];
      abrirRetiros(); await esperar(100);
      editarRetiro('__ret_t1__'); await esperar(100);
      document.getElementById('ret-monto').value='500';
      guardarRetiroForm(); await esperar(1500); await quieto();
      var s=window.__ctl.log.filter(function(x){ return x.act==='save' && x.id==='__ret_t1__'; });
      return { revs:s.map(function(x){ return x.rev; }), toast:window._toasts.slice(-1)[0]||'', enPantalla:RETIROS.some(function(r){ return r.id==='__ret_t1__'; }) };
    });
    const f1 = S.fila('__ret_t1__');
    chk('A4a. la corrección de A manda el sello con el que vio el retiro', r1.revs.length>=1 && r1.revs.every(function(v){ return Number(v)>0; }), r1);
    chk('A4b. el retiro borrado por B NO vuelve a la planilla con la corrección de A', !f1, { vuelve:!!f1, monto:f1 && f1.acuenta });
    chk('A4c. A deja de verlo (no resta en su cuadre) y el aviso dice que lo borraron y que la corrección no se guardó',
      !r1.enPantalla && /BORRARON/i.test(r1.toast) && /no se guardó/i.test(r1.toast), r1);
    // Desde la cola de un celular sin señal: A corrige sin red, B borra, vuelve la red.
    await A.evaluate(async () => {
      var f=filaDeRetiro({ id:'__ret_t2__', fecha:todayStr(), entrega:'Carola Chavez', retira:'Contabilidad', monto:300, notas:['12'], tipo:'Facturado', fotos:[], obs:'' });
      await persistRetiro(f); await quieto();
      __regla({ act:'save', mode:'drop', n:5 });
      abrirRetiros(); await esperar(100);
      editarRetiro('__ret_t2__'); await esperar(100);
      document.getElementById('ret-monto').value='350';
      guardarRetiroForm(); await esperar(4000); await quieto();
    });
    await B.evaluate(async () => { await refrescarEstado(); await esperar(100); abrirRetiros(); await esperar(100); borrarRetiro('__ret_t2__'); await esperar(1500); await quieto(); });
    const cola = await A.evaluate(() => getPending().filter(function(p){ return p.id==='__ret_t2__'; }).map(function(p){ return { rev:p.rev, monto:p.acuenta }; }));
    chk('A4d. la corrección sin señal queda en la cola CON el sello (y B ya lo borró)', cola.length===1 && Number(cola[0].rev)>0 && !S.fila('__ret_t2__'), cola);
    await A.evaluate(async () => { window.__ctl.rules=[]; await flushPending(); await esperar(500); await quieto(); });
    const f2 = S.fila('__ret_t2__');
    chk('A4e. …y al volver la red, la cola NO recrea el retiro borrado', !f2, { vuelve:!!f2, monto:f2 && f2.acuenta });
    // Lo de siempre sigue andando: corregir dos veces seguidas un retiro que nadie borró.
    const r3 = await A.evaluate(async () => {
      var f=filaDeRetiro({ id:'__ret_t3__', fecha:todayStr(), entrega:'Maria Flores', retira:'Contabilidad', monto:200, notas:['13'], tipo:'Facturado', fotos:[], obs:'' });
      await persistRetiro(f); await quieto();
      window._toasts=[];
      abrirRetiros(); await esperar(100); editarRetiro('__ret_t3__'); await esperar(100);
      document.getElementById('ret-monto').value='250'; guardarRetiroForm(); await esperar(1200); await quieto();
      abrirRetiros(); await esperar(100); editarRetiro('__ret_t3__'); await esperar(100);
      document.getElementById('ret-monto').value='260'; guardarRetiroForm(); await esperar(1200); await quieto();
      return { toasts:window._toasts.filter(function(t){ return /^err/.test(t); }), ver:(RETIROS.filter(function(r){ return r.id==='__ret_t3__'; })[0]||{}).acuenta };
    });
    const f3 = S.fila('__ret_t3__');
    chk('A4f. un retiro que nadie borró se corrige dos veces seguidas sin trabas (queda 260)', !!f3 && Number(f3.acuenta)===260 && !r3.toasts.length, { planilla:f3 && f3.acuenta, r3 });
  }

  /* ══ A2 · de punta a punta: el formulario, Contabilidad y el .gs real ══ */
  {
    const S = servidor();
    const A = await abrir(S, '2026-09-14T10:00:00-04:00');
    const id = await A.evaluate(async () => {
      showView('form'); await esperar(150); resetForm();
      document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
      document.getElementById('f-cliente').value='PAGADA CON FLETE';
      document.getElementById('f-celular').value='70000001';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='4321';
      document.getElementById('f-fecha').value='2026-09-16';
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      document.querySelector('#f-pagado [data-val="SI"]').click(); await esperar(50);
      document.querySelector('#f-metodo [data-val="Efectivo"]').click(); await esperar(50);
      document.getElementById('f-cobrado').value='3000';
      FORM_COMPS=['RECIBO4321']; try{ renderCompForm(); }catch(e){}
      var fe=document.getElementById('f-envio'); fe.value='300'; pintarEnvioCobrado(); await esperar(50);
      document.querySelector('#f-envio-cob [data-val="SI"]').click(); await esperar(50);
      submitPedido(); await esperar(1800); await quieto(); try{ closeModal(); }catch(e){}
      var p=STATE.filter(function(x){ return x.cliente==='PAGADA CON FLETE'; })[0];
      return p ? p.id : null;
    });
    const f0 = S.fila(id);
    chk('(partida) la venta «SÍ, pagado» de 3.000 en efectivo quedó con el flete de 300 cobrado el mismo día y con el mismo recibo',
      !!f0 && /\^Efectivo 300 @2026-09-14 #4321/.test(f0.metodoPago), f0 && f0.metodoPago);
    const C = await abrir(S, '2026-09-18T10:00:00-04:00');
    const rc = await C.evaluate(async (id) => {
      showContaModal(id);
      var b=Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return /Era un pago de la venta/.test(x.innerText); })[0];
      if(!b) return { sinBoton:true };
      b.click(); await esperar(1500); await quieto(); closeModal();
      var p=findById(id), m=mixtoDe(p); return { mp:p.metodoPago, mixto:m ? (m.metodo+' '+m.monto) : null };
    }, id);
    chk('(partida) Contabilidad tocó «↩️ Era un pago de la venta» y el flete pasó a los pagos', !!rc.mp && !/\^/.test(S.fila(id).metodoPago), rc);
    chk('A2a. la venta NO pasa a parecer un pago mixto «Efectivo + Efectivo»', !rc.mixto, rc);
    const V = await abrir(S, '2026-09-20T10:00:00-04:00');
    const rv = await V.evaluate(async (id) => {
      showView('mis'); await esperar(150); editPedido(id); await esperar(300);
      window._toasts=[]; window.__ctl.log=[]; UNLOCKED=false;
      var mixtoEnPantalla=!!MIXTO;
      document.getElementById('f-direccion').value='Calle nueva 123';
      submitPedido(); await esperar(1500); await quieto();
      return { mixtoEnPantalla:mixtoEnPantalla, saves:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length, toast:window._toasts.slice(-1)[0]||'' };
    }, id);
    const f2 = S.fila(id);
    chk('A2b. la vendedora corrige la dirección y se guarda sin pedirle nada de la plata', !rv.mixtoEnPantalla && rv.saves>=1 && !!f2 && f2.direccion==='Calle nueva 123', rv);
    chk('A2c. …y los pagos quedan en su día (14/09), sin mudarse al de hoy', !!f2 && f2.metodoPago===rc.mp && !/@2026-09-20/.test(f2.metodoPago), { antes:rc.mp, despues:f2 && f2.metodoPago });
  }

  /* ══ A2 · las cuentas, con la página sola ══ */
  {
    const P = await sola();
    const r = await P.evaluate(async () => {
      // (1) «SÍ, pagado» (A cuenta 0, §4cb) con el flete cobrado en el mismo formulario: Efectivo 3.000 + ^Efectivo 300, mismo día y recibo.
      STATE=[ _venta('s1', [ { anticipo:true, metodo:'Efectivo', monto:3000, fecha:'2026-09-14', nota:'100', comps:['A1'] },
                              { envio:true, metodo:'Efectivo', monto:300, fecha:'2026-09-14', nota:'100', comps:['A1'] } ], { pagado:true, saldo:0, acuenta:0 }) ];
      var o={}; o.s1Antes=_foto(findById('s1'));
      o.s1Boton=await _eraUnPago('s1'); o.s1=_foto(findById('s1'));
      var mp1=findById('s1').metodoPago;
      showView('mis'); await dormir(150); editPedido('s1'); await dormir(300);
      o.s1FormMixto=!!MIXTO;
      document.getElementById('f-direccion').value='Otra dirección'; window._saves=[]; window._toasts=[];
      submitPedido(); await dormir(1500);
      var g=window._saves[window._saves.length-1]||null;
      o.s1Guardo={ guardo:!!g, mpIgual:!!g && g.metodoPago===mp1, dir:g && g.direccion, toast:window._toasts.slice(-1)[0]||'' };
      // (2) Un mixto de verdad (Efectivo 1.000 + QR 500 = A cuenta 1.500) y un «flete» en efectivo del mismo día y recibo que era un pago.
      STATE=[ _venta('m1', [ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['A1'] },
                              { metodo:'QR', banco:'BISA', monto:500, fecha:'2026-09-14', nota:'100', comps:['Q1'] },
                              { envio:true, metodo:'Efectivo', monto:300, fecha:'2026-09-14', nota:'100', comps:['E1'] } ], { saldo:1500, acuenta:1500 }) ];
      o.m1Antes=_foto(findById('m1'));
      o.m1Boton=await _eraUnPago('m1'); o.m1=_foto(findById('m1'));
      showView('mis'); await dormir(150); editPedido('m1'); await dormir(300);
      var si=document.querySelector('#f-pagado [data-val="SI"]'); if(si) si.click(); await dormir(200);
      o.m1Sugerido=(document.getElementById('f-cobrado')||{}).value;
      var ef=document.querySelector('#f-metodo [data-val="Efectivo"]'); if(ef) ef.click(); await dormir(100);
      FORM_COMPS=compsArr(FORM_COMPS).concat(['RECIBO_NUEVO']);
      window._saves=[]; window._toasts=[];
      submitPedido(); await dormir(1500);
      var g2=window._saves[window._saves.length-1]||null;
      o.m1Guardo=g2 ? { cobrado:contaCobrado(g2), total:ventaTotal(g2), pagado:g2.pagado, saldo:g2.saldo } : { toast:window._toasts.slice(-1)[0]||'' };
      // (3) El mismo mixto con el «flete» por QR al MISMO banco que el 2° método: vale el que cierra el «A cuenta» (el de 500).
      STATE=[ _venta('m2', [ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['A1'] },
                              { metodo:'QR', banco:'BISA', monto:500, fecha:'2026-09-14', nota:'100', comps:['Q1'] },
                              { envio:true, metodo:'QR', banco:'BISA', monto:300, fecha:'2026-09-14', nota:'100', comps:['E2'] } ], { saldo:1500, acuenta:1500 }) ];
      o.m2Boton=await _eraUnPago('m2'); o.m2=_foto(findById('m2'));
      // (4) Un mixto de verdad sin flete sigue igual (Efectivo 1.000 + QR 500), y dos pagos del mismo método y recibo NO son un mixto.
      STATE=[ _venta('m3', [ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['A1'] },
                              { metodo:'QR', banco:'BISA', monto:500, fecha:'2026-09-14', nota:'100', comps:['Q1'] } ], { saldo:1500, acuenta:1500 }),
              _venta('m4', [ { anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-09-14', nota:'100', comps:['A1'] },
                              { metodo:'QR', banco:'Ganadero', monto:500, fecha:'2026-09-14', nota:'100', comps:['Q1'] } ], { saldo:1500, acuenta:1500 }),
              _venta('m5', [ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['A1'] },
                              { metodo:'Efectivo', monto:500, fecha:'2026-09-14', nota:'100', comps:['Q1'] } ], { saldo:1500, acuenta:1500 }) ];
      o.m3=_foto(findById('m3')); o.m4=_foto(findById('m4')); o.m5=_foto(findById('m5'));
      return o;
    });
    chk('(partida) venta «SÍ, pagado» con flete del mismo día: antes no es mixto y el botón está', !r.s1Antes.mixto && r.s1Boton, r.s1Antes);
    chk('A2d. después de «Era un pago» NO aparece un mixto (Efectivo + Efectivo)', !r.s1.mixto, r.s1);
    chk('A2e. el formulario abre sin segundo método y guardar la dirección no toca los pagos', !r.s1FormMixto && r.s1Guardo.guardo && r.s1Guardo.mpIgual && r.s1Guardo.dir==='Otra dirección', r.s1Guardo);
    chk('(partida) mixto de verdad: Efectivo 1.000 + QR 500 = A cuenta 1.500, total 3.000', r.m1Antes.mixto==='QR BISA 500' && r.m1Antes.total===3000 && r.m1Boton, r.m1Antes);
    chk('A2f. después de «Era un pago» el mixto se sigue reconociendo (QR 500) y el total no cambia', r.m1.mixto==='QR BISA 500' && r.m1.total===3000, r.m1);
    chk('A2g. «lo cobrado fuera de A cuenta» es el flete pasado a pago (300), no 800', Math.abs(r.m1.fuera-300)<0.01, r.m1);
    chk('A2h. «SÍ, pagado» propone el total de la venta (3.000)', parseMonto(String(r.m1Sugerido||''))===3000 || Number(String(r.m1Sugerido).replace(/\./g,'').replace(',','.'))===3000, r.m1Sugerido);
    chk('A2i. …y guardar lo propuesto deja lo cobrado en 3.000 (1.500 + 300 + los 1.200 que faltaban), sin inventar plata',
      r.m1Guardo && Math.abs((r.m1Guardo.cobrado||0)-3000)<0.01 && r.m1Guardo.total===3000, r.m1Guardo);
    chk('A2j. con el flete por QR al mismo banco, el 2° método es el que cierra el «A cuenta» (QR 500), no el de 300', r.m2Boton && r.m2.mixto==='QR BISA 500', r.m2);
    chk('lo de siempre: Efectivo + QR y QR de dos bancos distintos siguen siendo mixtos', r.m3.mixto==='QR BISA 500' && r.m4.mixto==='QR Ganadero 500', { m3:r.m3.mixto, m4:r.m4.mixto });
    chk('A2k. dos pagos en efectivo del mismo día y recibo no son un mixto (el formulario nunca lo escribe así)', !r.m5.mixto, { m5:r.m5.mixto });
  }

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });

/* parseMonto del lado de Node, solo para leer lo que propone el formulario («3.000» / «3000,00»). */
function parseMonto(t){ var s=String(t||'').replace(/[^\d.,]/g,''); if(!s) return 0; var u=Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if(u>=0 && s.length-u-1===2) return Number(s.slice(0,u).replace(/[.,]/g,'')+'.'+s.slice(u+1)); return Number(s.replace(/[.,]/g,'')); }
