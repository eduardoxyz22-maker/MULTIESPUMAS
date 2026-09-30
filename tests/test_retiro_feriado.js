/* 💵🚫 RETIROS CON SELLO Y FERIADOS EN EL PORTERO (30/09, bitácora §4he): la parte del PANEL. La del servidor está en
   tests/test_servidor.js §15-§19.

   El panel real contra el google-apps-script.gs REAL corriendo en Node con una planilla de mentira, y dos equipos (A y B).
   Reloj de la página clavado en el martes 29/09/2026 a las 10:00. Solo datos inventados.

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 30/09, `4ded824`, o contra el servidor 2026-09-28-a):
   1. Dos equipos corrigen el MISMO retiro: A lo abrió ✏️ en 400, B lo pasó a 450, y A guarda 500:
      a. (diente) la planilla sigue en 450: la corrección de B no se pisa (antes ganaba el último, sin aviso);
      b. (diente) A ve el retiro de B (450) y el aviso «lo corrigió otra persona… tu cambio NO se guardó»;
      c. el retiro no se mete en la lista de PEDIDOS (se dibujaba como una venta) ni queda en la cola;
      d. y un retiro que nadie tocó se corrige dos veces seguidas sin trabas.
   2. Un pedido para un FERIADO que la página no conocía (la lista del servidor es la que manda):
      a. (diente) el servidor no lo guarda y el formulario dice «es FERIADO (Todos Santos): el camión no sale», con la fecha marcada;
      b. no queda en la pantalla ni en la cola (no se reintenta solo cada 2 minutos);
      c. Administración lo puede MOVER igual a un feriado (con la clave, `forzar`), como a un día cerrado.

   Se corre:  node tests/test_retiro_feriado.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_4ded824.html node tests/test_retiro_feriado.js
              GS=/ruta/al/gs_2026-09-28-a.gs node tests/test_retiro_feriado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const RELOJ = '2026-09-29T10:00:00-04:00';
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
      setValues: (v) => { for(let i=0;i<v.length;i++){ const r=datos[fila-1+i]||(datos[fila-1+i]=[]); for(let j=0;j<v[i].length;j++) r[col-1+j]=v[i][j]; } },
      setFontWeight: () => {}
    })
  };
}
const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function servidor(){
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); },
    putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; } };
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
  return { ctx, sh, shR, post, fila, guardar };
}
function INIT(){
  window.__ctl = { rules: [], log: [] };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    window.__ctl.log.push({ act: P.action || 'save', id: String((P.pedido && P.pedido.id) || P.id || ''), rev: P.pedido ? P.pedido.rev : P.rev, forzar: !!P.forzar });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    /* Reglas: `drop` = sin señal (no llega); `procesa_y_pierde` = el servidor lo guarda pero la respuesta se pierde (§4fa). */
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r=window.__ctl.rules[i];
      if (r.n>0 && r.act===(P.action||'save')){ r.n--;
        if (r.mode==='drop') return Promise.reject(new TypeError('Failed to fetch'));
        if (r.mode==='procesa_y_pierde') return window.__gs(body).then(function(){ throw new TypeError('Failed to fetch'); });
      }
    }
    return window.__gs(body).then(resp);
  };
}
async function preparar(page){
  await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    UNLOCKED=true; CONNECTED=true;
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
  });
}
async function equipo(browser, S){
  const context = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  await context.exposeFunction('__gs', (body) => S.post(body));
  await context.addInitScript(INIT);
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.__errores = []; page.__dialogos = [];
  page.on('pageerror', e => page.__errores.push(e.message));
  page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date(RELOJ));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await preparar(page);
  await page.evaluate(async () => { await refrescarEstado(); });
  return page;
}
const retiro = (id, monto) => ({ id, fecha:'', turno:'', vendedor:'Carola Chavez', productos:[], cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR',
  celular:'', zona:'FACTURADO', direccion:'Retiro del 29/09/2026', maps:'', pagado:false, saldo:0, ts:new Date('2026-09-29T12:00:00-04:00').getTime(),
  metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'Contabilidad', garantia:'', nota:'77', acuenta:monto, facturarA:'', nit:'',
  nroDia:0, verificado:false, fotos:[] });

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  // ═══ 1. Dos equipos corrigen el mismo retiro ═══════════════════════════════════════════════════════════════════
  console.log('\n── 1. Dos equipos corrigen el mismo retiro: el segundo no pisa al primero ──');
  const S = servidor();
  S.guardar(retiro('__ret_dos__', 400));
  const A = await equipo(browser, S), B = await equipo(browser, S);
  await A.evaluate(async () => { abrirRetiros(); await esperar(100); editarRetiro('__ret_dos__'); await esperar(100); });
  await B.evaluate(async () => {
    abrirRetiros(); await esperar(100); editarRetiro('__ret_dos__'); await esperar(100);
    document.getElementById('ret-monto').value='450'; guardarRetiroForm(); await esperar(1200); await quieto();
  });
  const enB = S.fila('__ret_dos__');
  const r1 = await A.evaluate(async () => {
    await refrescarEstado(); await esperar(100);            // una lectura con la ventana abierta: la lista ya trae lo de B
    window._toasts=[]; window.__ctl.log=[];
    document.getElementById('ret-monto').value='500'; guardarRetiroForm(); await esperar(1500); await quieto();
    var ret=RETIROS.filter(function(r){ return r.id==='__ret_dos__'; })[0]||{};
    return { pantalla:ret.acuenta, aviso:window._toasts.filter(function(t){ return /lo corrigió otra persona/.test(t); })[0]||'',
             otroAviso:window._toasts.filter(function(t){ return /NO aceptó el retiro/.test(t); }).length,
             enPedidos:STATE.some(function(p){ return String(p.id).indexOf('__ret_')===0; }),
             cola:getPending().filter(function(p){ return String(p.id).indexOf('__ret_')===0; }).length,
             mando:window.__ctl.log.filter(function(x){ return x.act==='save' && x.id==='__ret_dos__'; }).map(function(x){ return x.rev; }) };
  });
  const fin1 = S.fila('__ret_dos__');
  chk('1. (partida) B corrigió el retiro a 450', !!enB && Number(enB.acuenta)===450, enB && enB.acuenta);
  chk('1a. (diente) A guarda 500 con el sello con el que lo abrió: la planilla SIGUE en 450 (antes ganaba el último, sin aviso)',
      !!fin1 && Number(fin1.acuenta)===450, { planilla:fin1 && fin1.acuenta, mando:r1 && r1.mando });
  chk('1b. (diente) A ve el de B (450) y el aviso «lo corrigió otra persona… tu cambio NO se guardó», sin otro aviso que lo tape',
      r1 && Number(r1.pantalla)===450 && /tu cambio NO se guardó/.test(r1.aviso) && r1.otroAviso===0, r1);
  chk('1c. el retiro no se mete en la lista de pedidos, ni queda en la cola para reintentarse', r1 && r1.enPedidos===false && r1.cola===0, r1);
  const r1d = await A.evaluate(async () => {
    window._toasts=[];
    editarRetiro('__ret_dos__'); await esperar(100); document.getElementById('ret-monto').value='520'; guardarRetiroForm(); await esperar(1200); await quieto();
    editarRetiro('__ret_dos__'); await esperar(100); document.getElementById('ret-monto').value='530'; guardarRetiroForm(); await esperar(1200); await quieto();
    return { errs:window._toasts.filter(function(t){ return /^err/.test(t); }) };
  });
  const fin1d = S.fila('__ret_dos__');
  chk('1d. un retiro que nadie más tocó se corrige dos veces seguidas sin trabas (queda 530)', !!fin1d && Number(fin1d.acuenta)===530 && r1d && !r1d.errs.length, { planilla:fin1d && fin1d.acuenta, r1d });
  chk('1. sin errores de JavaScript', !A.__errores.length && !B.__errores.length, A.__errores.concat(B.__errores).slice(0,3));

  // ═══ 2. Un feriado que la página no conocía ═════════════════════════════════════════════════════════════════════
  console.log('\n── 2. Un pedido para un feriado: el servidor dice que no y el formulario lo explica ──');
  const S2 = servidor();
  const C = await equipo(browser, S2);
  const r2 = await C.evaluate(async () => {
    /* La lista de la página, sin el 02/11 (como una página a la que le faltara ese feriado): el que frena es el servidor. */
    if(typeof FERIADOS!=='undefined') delete FERIADOS['2026-11-02'];
    UNLOCKED=false;
    showView('form'); await esperar(150); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='CLIENTE DEL FERIADO';
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Calle 1';
    document.getElementById('f-nota').value='9911';
    document.getElementById('f-fecha').value='2026-11-02';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
    var no=document.querySelector('#f-pagado [data-val="NO"]'); if(no) no.click(); await esperar(50);
    var sal=document.getElementById('f-saldo'); if(sal) sal.value='1000';
    window._toasts=[]; window.__ctl.log=[];
    submitPedido(); await esperar(1800); await quieto(); try{ closeModal(); }catch(e){}
    return { mando:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length,
             aviso:window._toasts.filter(function(t){ return /FERIADO/.test(t); }).slice(-1)[0]||'',
             enPantalla:STATE.some(function(p){ return p.cliente==='CLIENTE DEL FERIADO'; }),
             cola:getPending().length, fechaMarcada:document.getElementById('f-fecha').classList.contains('err'),
             rechazo:(rechazosLocales()[0]||{}).error||'', rechazoTxt:rechazoTxt((rechazosLocales()[0]||{}).error||'') };
  });
  const enHoja = S2.sh._datos.some(f => f[4]==='CLIENTE DEL FERIADO');
  chk('2a. (diente) el servidor NO lo guarda: el 02/11 es feriado', r2 && r2.mando>=1 && !enHoja, { mando:r2 && r2.mando, enHoja });
  chk('2a. (diente) …y el formulario lo dice con el nombre del feriado, y marca la fecha',
      r2 && /02\/11\/2026 es FERIADO \(Todos Santos\): el camión no sale/.test(r2.aviso) && r2.fechaMarcada, r2 && { aviso:r2.aviso, marcada:r2.fechaMarcada });
  chk('2b. no queda en la pantalla ni en la cola (no se reintenta solo), y en «Mis pedidos» figura como «era para un feriado»',
      r2 && !r2.enPantalla && r2.cola===0 && r2.rechazo==='feriado' && /feriado/.test(r2.rechazoTxt), r2);
  // c. Administración lo mueve igual (con forzar), como a un día cerrado.
  S2.guardar({ id:'pmov', fecha:'2026-10-30', turno:'AM', vendedor:'Carola Chavez', cliente:'A MOVER', productos:[{desc:'COLCHON',medida:'',codigo:'',cant:1}],
               celular:'', zona:'Norte', direccion:'x', maps:'', pagado:false, saldo:100, ts:Date.now(), metodoPago:'', observaciones:'', estado:'',
               entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:0, verificado:false, fotos:[] });
  const r2c = await C.evaluate(async () => {
    await refrescarEstado(); UNLOCKED=true;
    var p=JSON.parse(JSON.stringify(findById('pmov'))); p.fecha='2026-11-02';
    window.__ctl.log=[]; var res=await persistPedido(p, {forzar:true}); await quieto();
    return { ok:!!(res && res.ok), forzo:window.__ctl.log.filter(function(x){ return x.act==='save' && x.forzar; }).length };
  });
  const mov = S2.fila('pmov');
  chk('2c. Administración lo MUEVE a un feriado con `forzar` (como a un día cerrado): entra, con su N° del día', r2c && r2c.ok && r2c.forzo===1 && mov && mov.fecha==='2026-11-02' && Number(mov.nroDia)>=1, { r2c, fecha:mov && mov.fecha, nro:mov && mov.nroDia });
  chk('2. sin errores de JavaScript', !C.__errores.length, C.__errores.slice(0,3));

  // ═══ 3. Corregir un retiro propio cuya alta se quedó sin respuesta ═══════════════════════════════════════════════
  console.log('\n── 3. Un retiro nuevo cuya respuesta se perdió, corregido enseguida: la corrección entra (no «lo corrigió otra persona») ──');
  const S3 = servidor();
  const E = await equipo(browser, S3);
  const r3 = await E.evaluate(async () => {
    abrirRetiros(); await esperar(100);
    var R=RET_FORM; R.entrega='Carola Chavez'; R.retira='Contabilidad'; R.monto='400'; R.notas=['771']; R.fecha=todayStr();
    renderRetiros(); await esperar(50); document.getElementById('ret-entrega').value='Carola Chavez';
    // El alta llega a la planilla pero la respuesta se pierde, y el reintento (1,5 s después) no tiene señal: queda en la cola.
    __ctl.rules.push({ act:'save', mode:'procesa_y_pierde', n:1 }, { act:'save', mode:'drop', n:1 });
    guardarRetiroForm(); await esperar(2600); await quieto();
    var id=(getPending().filter(function(q){ return String(q.id).indexOf('__ret_')===0; })[0]||{}).id||'';
    var enCola=!!id;
    editarRetiro(id); await esperar(100);
    document.getElementById('ret-monto').value='450';
    window._toasts=[]; __ctl.log=[];
    guardarRetiroForm(); await esperar(1500); await quieto();
    var ret=RETIROS.filter(function(x){ return x.id===id; })[0]||{};
    return { id:id, enCola:enCola, pantalla:ret.acuenta, avisoOtro:window._toasts.filter(function(t){ return /lo corrigió otra persona/.test(t); }).length,
             ok:window._toasts.filter(function(t){ return /Retiro actualizado en la planilla/.test(t); }).length,
             cola:getPending().filter(function(q){ return String(q.id).indexOf('__ret_')===0; }).length };
  });
  const f3 = r3 && S3.fila(r3.id);
  chk('3. (partida) el alta de 400 llegó a la planilla y además quedó en la cola (su respuesta se perdió)', r3 && r3.enCola && !!f3, r3 && { enCola:r3.enCola });
  chk('3. la corrección a 450 ENTRA (es la propia alta, no otra persona) y la cola queda vacía',
      !!f3 && Number(f3.acuenta)===450 && r3.cola===0 && Number(r3.pantalla)===450, { planilla:f3 && f3.acuenta, pantalla:r3 && r3.pantalla, cola:r3 && r3.cola });
  chk('3. …sin el aviso «lo corrigió otra persona», con el ✓ de siempre', r3 && r3.avisoOtro===0 && r3.ok===1, r3);
  chk('3. …y en la planilla hay UN retiro, no dos', S3.sh._datos.filter(f => String(f[0]).indexOf('__ret_')===0).length===1);
  chk('3. sin errores de JavaScript', !E.__errores.length, E.__errores.slice(0,3));

  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + PASS + ' bien · ' + (FAIL+1) + ' mal'); process.exit(1); });
