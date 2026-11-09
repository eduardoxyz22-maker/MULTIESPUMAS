/* 🧾⚔️ LA FACTURA O REMISIÓN CONTRA EL SERVIDOR DE VERDAD (revisión de Fable del 06/11).

   LO QUE CUIDA (la página de verdad contra el .gs de verdad, con un Google de mentira):
   1. La vendedora, SIN la contraseña, la anota desde SU «Para hacer» de Mis pedidos: el botón abre la lista, la venta abre la ficha de
      Contabilidad y guardar la deja en la planilla (fdoc/fdocn en los productos).
   2. Una carrera: la vendedora tiene el pedido abierto en el formulario y, mientras, Contabilidad le anota el N°. Su guardado va con el
      sello de cuando lo abrió → el servidor contesta `conflicto`, la planilla conserva el N° y el formulario se reabre con la versión
      nueva; guardar otra vez (solo las observaciones) tampoco lo pisa.
   Ventas inventadas. Reloj clavado en el viernes 06/11/2026, 10:00 de Bolivia.
   Se corre:  node tests/test_factura_conflicto.js   (dientes: PEDIDOS=/ruta/a/pedidos_viejo.html) */
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
function INIT(){
  try{ localStorage.setItem('me_mis_vendedor', 'Maria Flores'); localStorage.setItem('me_vendedor', 'Maria Flores'); }catch(e){}
  window.MIS_TOP_PRUEBA=true;
  window.fetch=function(url, o){
    var body=(o && o.body) || '{}';
    return window.__gs(body).then(function(t){
      return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } };
    });
  };
}
const doc = (r) => { const x=((r&&r.productos)||[])[0]||{}; return [x.fdoc||'', x.fdocn||'']; };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const venta = (id, n) => ({ id, nota:'5'+n, oc:'11-0'+n, cliente:'CLIENTE INVENTADO '+n, celular:'7000000'+n, nit:'', turno:'AM', zona:'Norte',
    direccion:'Calle inventada '+n, fecha:'2026-11-10', maps:'', observaciones:'', garantia:'', facturarA:'', estado:'', entregado:false, verificado:false,
    vehiculo:'', chofer:'', nroDia:Number(n), fotos:[], vendedor:'Maria Flores', ts:Date.parse('2026-11-05T11:00:00-04:00'), rev:0, acuenta:1000, saldo:2000, pagado:false,
    metodoPago:'~Efectivo 1000 @2026-11-05 #5'+n+' %IMG'+n, productos:[{ desc:'COLCHON TITANIO', medida:'140x190', cant:1, precio:3000 }] });

  const S = servidor(fs.readFileSync(GS, 'utf8'));
  S.guardar(venta('F1', '1')); S.guardar(venta('F2', '2'));
  const context = await browser.newContext({ viewport:{ width:1500, height:1000 }, timezoneId:'America/La_Paz' });
  await context.exposeFunction('__gs', (body) => S.post(body));
  await context.addInitScript(INIT);
  await context.route(/^https?:/, rr => rr.abort());
  const p = await context.newPage();
  p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', d => d.accept());
  await p.clock.setFixedTime(new Date('2026-11-06T10:00:00-04:00'));
  await p.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await p.waitForTimeout(400);
  await p.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    UNLOCKED=false; CARGA_GEN++; CARGA_ESTADO='ok';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
    await refrescarEstado();
  });

  /* ── 1. La vendedora, desde su «Para hacer» ── */
  await p.evaluate(() => { showView('mis'); try{ renderMis(); }catch(e){} });
  await p.waitForTimeout(500);
  let r = await p.evaluate(() => { var b=document.querySelector('[onclick*="misVerLista(\'sdoc\')"]'); return { boton:!!b, txt:b?(b.closest('div')||b).textContent:'' , unl:UNLOCKED }; });
  chk('1a. su «Para hacer» de Mis pedidos le pide la factura o remisión (sin contraseña)', r.boton && r.unl===false, r);
  await p.click('[onclick*="misVerLista(\'sdoc\')"]');
  await p.waitForTimeout(250);
  r = await p.evaluate(() => Array.from(document.querySelectorAll('.t2-f')).map(x => x.textContent));
  chk('1b. la lista trae sus dos ventas de noviembre', r.length===2 && r.some(t=>/INVENTADO 1/.test(t)) && r.some(t=>/INVENTADO 2/.test(t)), r);
  await p.evaluate(() => { var f=Array.from(document.querySelectorAll('.t2-f')).find(x=>/INVENTADO 1/.test(x.textContent)); f.click(); });
  await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ ficha:!!document.getElementById('cta-doc'), num:!!document.getElementById('cta-doc-num') }));
  chk('1c. tocar la venta abre la ficha de Contabilidad con «Factura o remisión»', r.ficha && r.num, r);
  await p.evaluate(() => { ctaDocTipo('F1', 'F'); var i=document.getElementById('cta-doc-num'); i.value='A-1001'; i.dispatchEvent(new Event('input', { bubbles:true })); ctaDocGuardar('F1'); });
  await p.waitForTimeout(700);
  chk('1d. guardar la deja en la planilla (Factura A-1001)', doc(S.fila('F1')).join()==='F,A-1001', doc(S.fila('F1')));
  r = await p.evaluate(() => ({ falta:docVentaFalta(findById('F1')), cola:getPending().length }));
  chk('1e. en la pantalla ya no falta y nada quedó en la cola', r.falta===false && r.cola===0, r);
  await p.evaluate(() => { try{ closeModal(); }catch(e){} });

  /* ── 2. La carrera con el formulario abierto ── */
  await p.evaluate(() => { showView('form'); editPedido('F2'); });
  await p.waitForTimeout(250);
  const f0 = S.fila('F2'), prods = JSON.parse(JSON.stringify(f0.productos)); prods.forEach(x => { x.fdoc='R'; x.fdocn='00777'; });
  const bRes = S.guardar(Object.assign({}, f0, { productos:prods }));
  chk('2a. Contabilidad (otra compu) le anota la remisión 00777 con el sello vigente', bRes.ok && doc(S.fila('F2')).join()==='R,00777', { ok:bRes.ok, doc:doc(S.fila('F2')) });
  const rev0 = Number(S.fila('F2').rev);
  await p.evaluate(() => { window._toasts=[]; document.getElementById('f-obs').value='tocar timbre'; submitPedido(); });
  await p.waitForTimeout(1200);
  const f2 = S.fila('F2');
  chk('2b. el guardado de la vendedora (sello de antes) NO pisa la remisión: el servidor lo rechazó', doc(f2).join()==='R,00777' && Number(f2.rev)===rev0 && !/tocar timbre/.test(f2.observaciones||''), { doc:doc(f2), rev:f2.rev, rev0, obs:f2.observaciones });
  r = await p.evaluate(() => ({ edit:EDIT_ID, doc:(function(q){ var x=((q&&q.productos)||[])[0]||{}; return [x.fdoc||'', x.fdocn||'']; })(findById('F2')), cola:getPending().length }));
  chk('2c. el formulario se reabre con la versión nueva (con la remisión) y nada queda en la cola', r.edit==='F2' && r.doc.join()==='R,00777' && r.cola===0, r);
  await p.evaluate(() => { window._toasts=[]; document.getElementById('f-obs').value='tocar timbre'; submitPedido(); });
  await p.waitForTimeout(1200);
  const f3 = S.fila('F2');
  chk('2d. guardar otra vez (sobre lo nuevo) guarda las observaciones y conserva la remisión', doc(f3).join()==='R,00777' && /tocar timbre/.test(f3.observaciones||''), { doc:doc(f3), obs:f3.observaciones });

  chk('sin errores de la página', !errores.length, errores.slice(0,3));
  console.log('\n' + PASS + ' bien / ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
