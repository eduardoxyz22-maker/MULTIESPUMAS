/* 🔎 REVISIÓN DE PEDIDOS, QUINTA VUELTA (26/09, noche): lo que le pasa al equipo en el uso diario.

   Mismo banco de pruebas que test_rev_pedidos.js: el panel de verdad contra el google-apps-script.gs de
   verdad (cargado en Node con una planilla de mentira), así el ida y vuelta pasa por `recToRow`/`rowToRec_`,
   el sello y los porteros del servidor. Reglas para los pedidos al servidor: 'drop' (sin red), 'lose' (la
   respuesta se pierde), 'hold' y 'tarde'.

   Las preguntas (`confirm`) se contestan con `page.__respuestas` (true = Aceptar, false = Cancelar); sin
   respuesta anotada, Aceptar. Todas quedan en `page.__dialogos`.

   ⚠️ Reloj CLAVADO en el miércoles 16/09/2026 a las 10 de Bolivia: las fechas de los fixtures son fijas.

   Se corre:  node tests/test_rev5_pedidos.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev5_pedidos.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');

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
  const filaCruda = (id) => { const r = sh._datos.find(f => f[0]===id); return r ? r.slice() : null; };
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  const props_ = () => props;
  return { ctx, sh, shR, post, fila, filaCruda, guardar, props: props_, HDR };
}
/* Un pedido sintético completo (los campos de la planilla). */
const pedido = (o) => Object.assign({
  fecha:'2026-09-17', oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-09-15'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

/* Lo que corre ANTES que el panel, en cada carga. */
function INIT(){
  window.__ctl = { rules: [], log: [], holds: {} };
  window.__soltar = function(name){ var f = window.__ctl.holds[name]; if(f){ delete window.__ctl.holds[name]; f(); return true; } return false; };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    var id = String((P.pedido && P.pedido.id) || P.id || P.fotoId || '');
    window.__ctl.log.push({ act: act, id: id, oc: P.pedido ? P.pedido.oc : undefined });
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
    if (rule.mode === 'hold') return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(real()); }; });
    if (rule.mode === 'tarde') { var pr = window.__gs(body); return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(pr.then(resp)); }; }); }
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  /* Un dispositivo contra el servidor S, con el reloj clavado en `reloj`. */
  const abrir = async (S, opts) => {
    opts = opts || {};
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.__dialogos = [];
    page.on('pageerror', e => errores.push(e.message));
    page.__respuestas = [];
    page.on('dialog', d => { page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if (si) d.accept(); else d.dismiss(); });
    await page.clock.setFixedTime(new Date(opts.reloj || RELOJ));
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
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };

  /* Abre la venta con ✏️ (desde Mis pedidos), le hace `cambio` y guarda. Devuelve lo que se vio. */
  const editar = (A, id, cambio) => A.evaluate(async (a) => {
    window._toasts=[]; window.__ctl.log=[];
    showView('mis'); await esperar(150);
    editPedido(a.id); await esperar(250);
    var o={ cobradoVisto:(document.getElementById('f-cobrado')||{}).value, metodoVisto:segVal('f-metodo'), bancoVisto:segVal('f-banco'), pagadoVisto:segVal('f-pagado') };
    (new Function(a.cambio))();
    submitPedido(); await esperar(700); await quieto();
    o.enForm=document.getElementById('view-form').classList.contains('active');
    o.guardados=window.__ctl.log.filter(function(x){ return x.act==='save'; }).length;
    o.rojos=window._toasts.filter(function(t){ return /^err/.test(t); });
    o.verdes=window._toasts.filter(function(t){ return /^ok/.test(t); });
    try{ closeModal(); }catch(e){}
    return o;
  }, { id:id, cambio:String(cambio||'').replace(/^[^{]*{|}$/g,'') });

  // ══ 1. UNA VENTA YA COBRADA, CORREGIDA DESDE EL FORMULARIO ═══════════════════════════════
  /* La venta que se pagó entera en la entrega (el chofer) o en Contabilidad no tiene adelanto: el formulario
     abría «SÍ, pagado» con el «Monto total cobrado» VACÍO y no dejaba guardar ni la dirección. Y a la venta
     pagada con su historial, cambiarle el monto cobrado o el método desde el formulario decía «Cambios
     guardados ✓» y la planilla seguía con lo de antes, sin avisar. Con una venta cobrada de más (saldo
     negativo) corregir la dirección preguntaba «¿borrar el historial?» y, si se aceptaba, el cobro por QR
     desaparecía de Contabilidad. */
  await esc('1. Una venta ya cobrada, corregida desde el formulario', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'c1', cliente:'PAGO EN LA PUERTA', oc:'09-001', fecha:'2026-09-15', entregado:true, verificado:true,
      metodoPago:'Efectivo 3000 @2026-09-15 # >Luis Pierre', pagado:true, saldo:0, acuenta:0, chofer:'Luis Pierre' }));
    S.guardar(pedido({ id:'c2', cliente:'PAGADA EN CONTABILIDAD', oc:'09-002', fecha:'2026-09-18',
      metodoPago:'QR BISA 3000 @2026-09-15 #1750 %IMGQ2', pagado:true, saldo:0, acuenta:0 }));
    S.guardar(pedido({ id:'c3', cliente:'PAGADA AL CARGARLA', oc:'09-003', fecha:'2026-09-18',
      metodoPago:'~Efectivo 3000 @2026-09-15 #1003 %IMGE3', pagado:true, saldo:0, acuenta:0 }));
    S.guardar(pedido({ id:'c4', cliente:'OTRA PAGADA AL CARGARLA', oc:'09-004', fecha:'2026-09-21',
      metodoPago:'~Efectivo 3000 @2026-09-15 #1004 %IMGE4', pagado:true, saldo:0, acuenta:0 }));
    S.guardar(pedido({ id:'c5', cliente:'ADELANTO REGISTRADO', oc:'09-005', fecha:'2026-09-21',
      metodoPago:'~Efectivo 500 @2026-09-10 #1005 %IMGE5', pagado:false, saldo:2500, acuenta:500 }));
    S.guardar(pedido({ id:'c6', cliente:'COBRADA DE MAS', oc:'09-006', fecha:'2026-09-22',
      metodoPago:'~Efectivo 500 @2026-09-10 #1006 + QR BISA 2700 @2026-09-15 #1750 %IMGQ6', pagado:true, saldo:-200, acuenta:500 }));
    S.guardar(pedido({ id:'c7', cliente:'ADELANTO SUELTO', oc:'09-007', fecha:'2026-09-22',
      metodoPago:'Efectivo %IMGE7', pagado:false, saldo:2500, acuenta:500 }));
    const A = await abrir(S);
    const antes = (id) => S.fila(id).metodoPago;

    // a · pagada en la puerta: se corrige la dirección
    let r = await editar(A, 'c1', function(){ document.getElementById('f-direccion').value='Calle corregida 1'; });
    chk('⚠️ la venta que cobró el chofer abre con lo que ya entró (Bs 3.000), no con el monto vacío', r.cobradoVisto==='3000' && r.pagadoVisto==='SI', r);
    chk('⚠️ …y se le puede corregir la dirección (antes: «Poné el MONTO TOTAL COBRADO» y no guardaba)', S.fila('c1').direccion==='Calle corregida 1' && !r.rojos.length, { dir:S.fila('c1').direccion, rojos:r.rojos });
    chk('…y el cobro del chofer queda igual, con quién tiene la plata', S.fila('c1').metodoPago==='Efectivo 3000 @2026-09-15 # >Luis Pierre', S.fila('c1').metodoPago);

    // b · pagada en Contabilidad (QR con recibo y captura): se corrige la fecha
    r = await editar(A, 'c2', function(){ document.getElementById('f-fecha').value='2026-09-21'; });
    chk('⚠️ la venta pagada en Contabilidad también abre con lo cobrado y guarda la fecha nueva', r.cobradoVisto==='3000' && S.fila('c2').fecha==='2026-09-21' && !r.rojos.length, { visto:r.cobradoVisto, fecha:S.fila('c2').fecha, rojos:r.rojos });
    chk('…sin tocarle el pago', S.fila('c2').metodoPago==='QR BISA 3000 @2026-09-15 #1750 %IMGQ2', S.fila('c2').metodoPago);

    // c · pagada al cargarla: le cambian el monto cobrado, y aceptan guardar el resto
    A.__dialogos.length=0;
    r = await editar(A, 'c3', function(){ document.getElementById('f-cobrado').value='3500'; document.getElementById('f-obs').value='llamar antes'; });
    chk('⚠️ cambiar el «Monto total cobrado» de una venta ya pagada NO se pierde callado: se pregunta y se dice dónde se corrige',
        A.__dialogos.length===1 && /ya están registrados/.test(A.__dialogos[0]) && /Corregir este pago/.test(A.__dialogos[0]), A.__dialogos.map(d=>d.slice(0,120)));
    chk('…aceptando, se guarda lo demás y el pago queda como estaba (no se reescribe con otra fecha ni otro recibo)',
        S.fila('c3').observaciones==='llamar antes' && antes('c3')==='~Efectivo 3000 @2026-09-15 #1003 %IMGE3', { obs:S.fila('c3').observaciones, pago:antes('c3') });

    // d · le cambian el método (Efectivo → QR) y CANCELAN
    A.__dialogos.length=0; A.__respuestas=[false];
    r = await editar(A, 'c4', function(){ segSet('f-metodo','QR'); updateBancoVisibility(); segSet('f-banco','BISA'); document.getElementById('f-obs').value='no debería guardarse'; });
    chk('⚠️ cambiar el MÉTODO de una venta ya pagada también pregunta', A.__dialogos.length===1 && /ya están registrados/.test(A.__dialogos[0]), A.__dialogos.map(d=>d.slice(0,80)));
    chk('…y con «Cancelar» no se guarda nada y el formulario queda abierto para corregirlo', r.guardados===0 && r.enForm && S.fila('c4').observaciones==='' && antes('c4')==='~Efectivo 3000 @2026-09-15 #1004 %IMGE4', { guardados:r.guardados, enForm:r.enForm, obs:S.fila('c4').observaciones });

    // e · el adelanto ya registrado: cambiarle el método con los mismos montos
    A.__dialogos.length=0; A.__respuestas=[];
    r = await editar(A, 'c5', function(){ segSet('f-metodo','QR'); updateBancoVisibility(); segSet('f-banco','BISA'); });
    chk('⚠️ cambiar el método del ADELANTO ya registrado pregunta (antes: «Cambios guardados ✓» y seguía en Efectivo)', A.__dialogos.length===1 && /ya están registrados/.test(A.__dialogos[0]), A.__dialogos.map(d=>d.slice(0,80)));
    chk('…y el adelanto conserva su día y su recibo', antes('c5')==='~Efectivo 500 @2026-09-10 #1005 %IMGE5', antes('c5'));

    // f · cobrada de más (saldo negativo): se corrige la dirección
    A.__dialogos.length=0;
    r = await editar(A, 'c6', function(){ document.getElementById('f-direccion').value='Calle corregida 6'; });
    chk('⚠️ a la venta cobrada DE MÁS se le corrige la dirección sin preguntar «¿borrar el historial?»', !A.__dialogos.length && S.fila('c6').direccion==='Calle corregida 6', A.__dialogos.map(d=>d.slice(0,80)));
    chk('⚠️ …y el cobro por QR sigue en la planilla (antes, aceptando, se borraban Bs 2.700 y el adelanto pasaba a HOY)',
        antes('c6')==='~Efectivo 500 @2026-09-10 #1006 + QR BISA 2700 @2026-09-15 #1750 %IMGQ6' && Number(S.fila('c6').saldo)===-200, { pago:antes('c6'), saldo:S.fila('c6').saldo });

    // g · control: sin tocar la plata no se pregunta nada
    A.__dialogos.length=0;
    r = await editar(A, 'c3', function(){ document.getElementById('f-obs').value='otra observación'; });
    chk('(control) sin tocar el pago no se pregunta nada y se guarda', !A.__dialogos.length && S.fila('c3').observaciones==='otra observación' && !r.rojos.length, { dialogos:A.__dialogos, rojos:r.rojos });

    // h · control: un adelanto SUELTO (sin historial) se sigue corrigiendo desde el formulario, como siempre
    A.__dialogos.length=0;
    r = await editar(A, 'c7', function(){ segSet('f-metodo','QR'); updateBancoVisibility(); segSet('f-banco','BISA'); });
    chk('(control) el método de un adelanto SUELTO se corrige directo, sin preguntar', !A.__dialogos.length && antes('c7')==='QR BISA %IMGE7', { pago:antes('c7'), dialogos:A.__dialogos });
  });

  // ══ 2. CAMBIAR EL TIPO DE DOCUMENTO AL EDITAR ═══════════════════════════════════════════
  /* Una ATC cargada por error que al editarla se pasa a 📄 OC seguía siendo ATC: el número quedaba con su
     «ATC » adelante, y la nota y el saldo que se le pusieron a la venta no aparecían en Contabilidad. */
  await esc('2. Una ATC que al editarla se pasa a 📄 OC', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'v1', cliente:'VENTA UNO', oc:'09-001', ts:TS('2026-09-10') }));
    S.guardar(pedido({ id:'v2', cliente:'VENTA DOS', oc:'09-002', ts:TS('2026-09-11'), fecha:'2026-09-18' }));
    S.guardar(pedido({ id:'t1', cliente:'ERA ATC', oc:'ATC 09-001', nota:'', saldo:0, fecha:'2026-09-18', ts:TS('2026-09-12'),
      productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, atc:{mot:'Ruido', det:'hace ruido'}}] }));
    S.guardar(pedido({ id:'t2', cliente:'ERA VENTA', oc:'09-003', ts:TS('2026-09-13'), fecha:'2026-09-21' }));
    const A = await abrir(S);
    let r = await A.evaluate(async () => {
      window._toasts=[]; showView('admin'); await esperar(150);
      editPedido('t1'); await esperar(250);
      segSet('f-doc-tipo','OC'); setDocTipo();
      document.getElementById('f-nota').value='5555';
      document.getElementById('f-saldo').value='3000';
      submitPedido(); await esperar(700); await quieto(); try{ closeModal(); }catch(e){}
      var p=findById('t1');
      return { oc:p.oc, conta:!fueraDeConta(p), rojos:window._toasts.filter(function(t){ return /^err/.test(t); }) };
    });
    const t1 = S.fila('t1');
    chk('⚠️ la ATC pasada a OC se guarda como OC (antes quedaba «ATC 09-001» con nota y saldo de venta)', t1.oc==='09-004' && !/^ATC/.test(t1.oc), t1.oc);
    chk('…con el próximo número libre de las OC de su mes, no el de la ATC (que ya lo tiene otra venta)', t1.oc==='09-004' && S.fila('v1').oc==='09-001', t1.oc);
    chk('…con su nota y su saldo, y ya cuenta en Contabilidad', t1.nota==='5555' && Number(t1.saldo)===3000 && r.conta && !r.rojos.length, { nota:t1.nota, saldo:t1.saldo, conta:r.conta, rojos:r.rojos });
    chk('…y ya no arrastra los datos de la ATC', !(t1.productos[0]||{}).atc, t1.productos[0]);
    r = await A.evaluate(async () => {
      window._toasts=[]; showView('admin'); await esperar(150);
      editPedido('t2'); await esperar(250);
      segSet('f-doc-tipo','ATC'); setDocTipo();
      document.getElementById('f-atc-motivo').value='Ruido';
      submitPedido(); await esperar(700); await quieto(); try{ closeModal(); }catch(e){}
      return window._toasts.filter(function(t){ return /^err/.test(t); });
    });
    chk('(control) una venta pasada a 🎧 ATC sigue quedando ATC, como antes', /^ATC /.test(S.fila('t2').oc) && !r.length, { oc:S.fila('t2').oc, rojos:r });
  });


  // ══ 3. EL NOMBRE RECORDADO DE LA COMPUTADORA ═════════════════════════════════════════════
  /* `submitPedido` recordaba SIEMPRE al vendedor del pedido como «quién soy en esta compu». Logística le
     corregía la dirección a una venta de Carola desde Administración, y en esa computadora el próximo pedido
     nuevo ya salía con «Carola Chavez» puesto (y Mis pedidos, recargado, abría con los de ella). */
  await esc('3. Corregir el pedido de otra vendedora no cambia quién es esta computadora', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'n1', cliente:'DE CAROLA', oc:'09-001', vendedor:'Carola Chavez', ts:TS('2026-09-10') }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      var o={};
      setVendedorMem('Mirian Salazar');
      showView('admin'); await esperar(150);
      EDIT_DESDE='admin'; editPedido('n1'); await esperar(250);
      document.getElementById('f-direccion').value='corregida por logística';
      submitPedido(); await esperar(700); await quieto(); try{ closeModal(); }catch(e){}
      o.recordado=getVendedorMem();
      showView('form'); await esperar(150); resetForm();
      o.formNuevo=document.getElementById('f-vendedor').value;
      // control: al CARGAR un pedido nuevo se sigue recordando quién lo cargó
      document.getElementById('f-vendedor').value='Maria Flores'; applyVendedorLite();
      document.getElementById('f-cliente').value='NUEVO DE MARIA';
      document.getElementById('f-celular').value='70000002';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='3003';
      document.getElementById('f-fecha').value='2026-09-21';
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      submitPedido(); await esperar(700); await quieto(); try{ closeModal(); }catch(e){}
      o.trasNuevo=getVendedorMem();
      return o;
    });
    chk('la corrección se guardó', S.fila('n1').direccion==='corregida por logística' && S.fila('n1').vendedor==='Carola Chavez', S.fila('n1').direccion);
    chk('⚠️ corregir la venta de Carola NO cambia el nombre recordado de esta computadora (antes pasaba a «Carola Chavez»)', r.recordado==='Mirian Salazar', r.recordado);
    chk('⚠️ …y el próximo pedido nuevo sale con el nombre de quien usa la computadora, no con el de Carola', r.formNuevo==='Mirian Salazar', r.formNuevo);
    chk('(control) cargar un pedido nuevo sigue recordando quién lo cargó', r.trasNuevo==='Maria Flores', r.trasNuevo);
  });


  // ══ 4. UNA LECTURA QUE VUELVE TARDE NO SE LLEVA EL PEDIDO RECIÉN CARGADO ══════════════════
  /* La vuelta automática (o la bajada de 4 s de `submitPedido`) sale antes de guardar y vuelve después, con
     la planilla de antes: el pedido nuevo desaparecía de la pantalla y de los cupos hasta la lectura
     siguiente — y la vendedora que no lo veía lo volvía a cargar. */
  await esc('4. Una lectura que vuelve tarde, justo después de guardar un pedido nuevo', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'l1', cliente:'YA ESTABA', oc:'09-001', ts:TS('2026-09-10'), fecha:'2026-09-21' }));
    const A = await abrir(S);
    const cargar = async (nombre) => A.evaluate(async (nombre) => {
      showView('form'); await esperar(150); resetForm();
      document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
      document.getElementById('f-cliente').value=nombre;
      document.getElementById('f-celular').value='70000001';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='2002';
      document.getElementById('f-fecha').value='2026-09-21';
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      document.getElementById('f-saldo').value='3000';
      submitPedido(); await esperar(1500); await quieto(); try{ closeModal(); }catch(e){}
      var p=STATE.filter(function(x){ return x.cliente===nombre; })[0];
      return p ? p.id : null;
    }, nombre);
    const r = await A.evaluate(async () => {
      __regla({ act:'list', mode:'tarde', name:'L1' });
      window.__viejo=refrescarEstado();          // sale ANTES de guardar
      await esperar(100); return true;
    });
    const id = await cargar('RECIEN CARGADO');
    const r2 = await A.evaluate(async (id) => {
      var o={ antes:!!findById(id), cupoAntes:cuposUsadosTurno('2026-09-21','AM') };
      __soltar('L1'); await window.__viejo; await esperar(200);
      o.despues=!!findById(id); o.cupoDespues=cuposUsadosTurno('2026-09-21','AM');
      return o;
    }, id);
    chk('el pedido nuevo llegó a la planilla', !!(id && S.fila(id)), id);
    chk('⚠️ la lectura que salió ANTES de guardar no lo borra de la pantalla (antes desaparecía hasta la próxima)', r2.antes && r2.despues, r2);
    chk('⚠️ …ni de los cupos del día', r2.cupoAntes===2 && r2.cupoDespues===2, r2);
  });

  // ══ 5. …NI TRAE DE VUELTA LO QUE SE ACABA DE ELIMINAR ════════════════════════════════════
  /* Al revés: la lectura salió con la venta todavía adentro y volvió después de «Pedido eliminado ✓». La
     venta reaparecía en pantalla, y editarla la volvía a CREAR en la planilla (el servidor no la encuentra
     y la toma por nueva). Lo mismo el borrador de Kommo descartado: volvía a la bandeja. */
  await esc('5. Una lectura vieja no trae de vuelta lo que se acaba de eliminar', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'z1', cliente:'A ELIMINAR', oc:'09-001', ts:TS('2026-09-10') }));
    S.guardar(pedido({ id:'z2', cliente:'NO SE PUEDE ELIMINAR', oc:'09-002', ts:TS('2026-09-10'), fecha:'2026-09-18' }));
    S.guardar(pedido({ id:'kommo-777', cliente:'BORRADOR A DESCARTAR', estado:'Borrador Kommo', fecha:'', turno:'', zona:'', nota:'', nroDia:0 }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      var o={};
      __regla({ act:'list', mode:'tarde', name:'L1' });
      var viejo=refrescarEstado(); await esperar(100);      // sale con z1 todavía adentro
      realDelete('z1'); await esperar(1500); await quieto();
      __soltar('L1'); await viejo; await esperar(200);
      o.z1=!!findById('z1');
      // editar lo que quedó en pantalla (✏️ desde la ficha abierta) es lo que la volvía a crear
      if(findById('z1')){ EDIT_DESDE='admin'; editPedido('z1'); await esperar(250); document.getElementById('f-obs').value='editada después de borrar'; submitPedido(); await esperar(700); await quieto(); try{ closeModal(); }catch(e){} }
      // el borrador descartado
      showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar'; renderMis(); await esperar(150);
      __regla({ act:'list', mode:'tarde', name:'L2' });
      var viejo2=refrescarEstado(); await esperar(100);
      descartarBorrador('kommo-777'); await esperar(1500); await quieto();
      __soltar('L2'); await viejo2; await esperar(200);
      o.borr=BORRADORES.map(function(b){ return b.id; });
      // control: si el servidor NO borra (sin señal), vuelve a la pantalla como siempre
      __regla({ act:'list', mode:'drop', n:3 }); __regla({ act:'delete', mode:'drop', n:3 });
      realDelete('z2'); await esperar(4500); await quieto();
      window.__ctl.rules=[];
      o.z2=!!findById('z2');
      await refrescarEstado(); await esperar(100);
      o.z2b=!!findById('z2');
      return o;
    });
    chk('⚠️ la venta eliminada no reaparece con la lectura que salió antes (antes volvía a la pantalla)', r.z1===false, r);
    chk('⚠️ …y no se vuelve a crear en la planilla', !S.fila('z1'), S.fila('z1') && S.fila('z1').observaciones);
    chk('⚠️ el borrador de Kommo descartado no vuelve a la bandeja con la lectura vieja', r.borr.indexOf('kommo-777')<0 && !S.fila('kommo-777'), r.borr);
    chk('(control) si Google no confirma el borrado (sin señal), la venta vuelve sola con la lectura siguiente, como decía el aviso', r.z2b===true && !!S.fila('z2'), r);
  });


  // ══ 6. RPT: CORREGIR LA SUCURSAL DE DESTINO ══════════════════════════════════════════════
  /* Elegir una sucursal completa la zona y el pin (§4dn) sin pisar lo escrito. Pero lo que había puesto OTRA
     sucursal también contaba como «escrito»: elegir Mia Plaza y corregir a Mutualista (o editar una RPT de
     Charcas para mandarla a Buenos Aires) dejaba la zona y el pin de la primera — el camión iba a la tienda
     equivocada. */
  await esc('6. RPT: corregir la sucursal de destino', async () => {
    const S = servidor();
    const PIN = { charcas:'https://www.google.com/maps?q=-17.78004506388288,-63.17633322858442',
                  ba:'https://www.google.com/maps?q=-17.780648363028185,-63.18369352382509',
                  mia:'https://www.google.com/maps?q=-17.770160793680894,-63.17008791821695',
                  mutu:'https://www.google.com/maps?q=-17.765770114394787,-63.16208746136678' };
    S.guardar(pedido({ id:'r1', cliente:'Charcas', oc:'RPT 09-001', nota:'', saldo:0, fecha:'2026-09-18', zona:'Centro', direccion:'', celular:'',
      maps:PIN.charcas, productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, rtipo:'Reposición'}] }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      var o={}, suc=document.getElementById('f-rpt-suc');
      var elegir=function(n){ suc.value=n; suc.dispatchEvent(new Event('input')); return { z:document.getElementById('f-zona').value, m:document.getElementById('f-maps').value, d:document.getElementById('f-direccion').value }; };
      showView('form'); await esperar(150); resetForm();
      segSet('f-doc-tipo','RPT'); setDocTipo();
      o.mia=elegir('Mia Plaza');
      o.mutu=elegir('Mutualista');
      o.roho=elegir('Tiendas Roho');
      // lo escrito a mano se respeta
      resetForm(); segSet('f-doc-tipo','RPT'); setDocTipo();
      document.getElementById('f-zona').value='Equipetrol'; document.getElementById('f-maps').value='https://www.google.com/maps?q=-17.1,-63.1';
      document.getElementById('f-direccion').value='Galería X, local 5';
      o.aMano=elegir('Carmelo');
      // editar la RPT de Charcas y mandarla a Buenos Aires
      editPedido('r1'); await esperar(250);
      o.edit=elegir('Buenos Aires');
      submitPedido(); await esperar(700); await quieto(); try{ closeModal(); }catch(e){}
      return o;
    });
    chk('elegir Mia Plaza completa su zona y su pin', r.mia.z==='Mia Plaza' && r.mia.m===PIN.mia, r.mia);
    chk('⚠️ corregir a Mutualista cambia la zona y el pin (antes quedaban los de Mia Plaza)', r.mutu.z==='Mutualista' && r.mutu.m===PIN.mutu, r.mutu);
    chk('⚠️ …y pasar a Tiendas Roho (sin pin, a propósito) saca el pin de la otra tienda', r.roho.z==='Norte' && r.roho.m==='', r.roho);
    chk('(control) lo escrito a mano (zona, pin y dirección) no se pisa', r.aMano.z==='Equipetrol' && r.aMano.m==='https://www.google.com/maps?q=-17.1,-63.1' && r.aMano.d==='Galería X, local 5', r.aMano);
    const f=S.fila('r1');
    chk('⚠️ la RPT de Charcas corregida a Buenos Aires se guarda con el pin de Buenos Aires (antes, el de Charcas)', f.cliente==='Buenos Aires' && f.maps===PIN.ba && f.zona==='Centro', { cliente:f.cliente, maps:f.maps, zona:f.zona });
  });

  chk('sin errores de JavaScript en la página', !errores.length, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
