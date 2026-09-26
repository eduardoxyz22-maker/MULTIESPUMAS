/* 🔎 TERCERA VUELTA SOBRE LA PLATA SIN PUBLICAR (26/09)

   Los arreglos del 26/09 (§4gb) pasaron los doce campos de plata a TEXTO (`inputmode="decimal"`) y
   los leen con `parseMonto`/`montoForm`. Acá se mira lo que eso destapó, tipeando con el teclado de
   verdad como la vendedora, la contadora y logística:

     1. Lo que se PEGA de WhatsApp: «Bs. 1.500.-», «1.500 Bs.», «Bs. 1500». El punto de «Bs.» y el
        «.-» del final se tomaban como parte del número: «Bs. 1.500.-» se guardaba Bs 0,10 y
        «1.500 Bs.» Bs 1,50, sin ningún aviso (con `type=number` ese texto dejaba el campo vacío y
        el panel frenaba). Pasa en el formulario, en Contabilidad, en el arqueo y en el retiro.
        Y lo que ya se leía bien («1.500», «1500,50», «1,500.50», el historial que escribe el panel)
        tiene que seguir igual.
     2. El flete PACTADO: la tarjeta del chofer y el WhatsApp del pedido lo dicen desde el 26/09, pero
        la hoja de ruta (pantalla, impresa y su WhatsApp) seguía con «✅ PAGADO» / «✅ Todo pagado».
     3. «A cuenta» vuelto a 0 con la foto del recibo ya subida: el guardado se frena («quitá la
        imagen») y la imagen quedaba escondida con el bloque del método, sin su ✕.

   Planilla: el google-apps-script.gs de verdad en Node (como test_rev2_form.js), o un servidor
   simulado en el Cuadre (como test_rev2_cuadre.js). Reloj CLAVADO el miércoles 16/09/2026.

   Se corre:  node tests/test_rev3_plata.js           (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev3_plata.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const J=x=>JSON.stringify(x);
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia
const ENTREGA = '2026-09-18';                         // viernes
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');

/* ── El servidor: el .gs real con un Google de mentira (igual que test_rev2_form.js) ── */
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
  const porCliente = (c) => { const r = sh._datos.find(f => f[4]===c); return r ? ctx.rowToRec_(r) : null; };
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  return { ctx, sh, post, fila, porCliente, guardar };
}
const pedido = (o) => Object.assign({
  fecha:ENTREGA, oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-09-15'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

/* Lo que corre ANTES que el panel: `fetch` va al .gs de Node; `esperar`/`quieto` para las esperas. */
function INIT(){
  window.__ctl = { log: [] };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    window.__ctl.log.push({ act: P.action || 'save', id: String((P.pedido && P.pedido.id) || P.id || P.fotoId || '') });
    return window.__gs(body).then(function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; });
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  const abrir = async (S, vp) => {
    const context = await browser.newContext({ viewport: vp || {width:1300,height:900}, timezoneId:'America/La_Paz', locale:'es-BO' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.__dialogos = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
    await page.clock.setFixedTime(new Date(RELOJ));
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

  /* Arranca un pedido nuevo con lo mínimo (vendedora, cliente, celular, zona, nota, fecha, producto). */
  const empezar = (A, cliente, extra) => A.evaluate(async (a) => {
    window._toasts=[]; window.__ctl.log=[];
    try{ closeModal(); }catch(e){}
    showView('form'); await esperar(150); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=a.cliente;
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-nota').value=String(a.extra.nota||'2001');
    document.getElementById('f-fecha').value=a.entrega;
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
  }, { cliente, extra: extra||{}, entrega: ENTREGA });
  /* Tipea como la gente: vacía el campo y escribe tecla por tecla (lo pegado de WhatsApp llega igual). */
  const tipear = async (A, sel, txt) => { await A.fill(sel, ''); await A.focus(sel); await A.keyboard.type(txt); };
  const elegir = (A, seg, val) => A.click('#'+seg+' button[data-val="'+val+'"]');
  const guardar = (A) => A.evaluate(async () => {
    window._toasts=[]; window.__ctl.log=[];
    submitPedido(); await esperar(700); await quieto();
    var o={ saves: window.__ctl.log.filter(function(x){ return x.act==='save'; }).length,
            rojos: window._toasts.filter(function(t){ return /^err/.test(t); }) };
    try{ closeModal(); }catch(e){}
    return o;
  });

  // ══ 1. LO QUE SE PEGA DE WHATSAPP ═══════════════════════════════════════════════════════
  await esc('1a. parseMonto (la del panel): «Bs. 1.500.-» es 1.500, y lo de siempre sigue igual', async () => {
    const S = servidor();
    const A = await abrir(S);
    const r = await A.evaluate(() => {
      var casos=[['Bs. 1.500.-',1500],['1.500 Bs.',1500],['Bs. 1500',1500],['Bs.1500',1500],['Bs. 50',50],['2.000.-',2000],
                 ['1.500,50 Bs.',1500.5],['Bs 2.000,00.-',2000],['1.500.50',1500.5],['1,500,50',1500.5]];
      var controles=[['1.500',1500],['1500,50',1500.5],['1,500.50',1500.5],['1.500,50',1500.5],['1500.5',1500.5],['0.05',0.05],
                     ['12.345.678',12345678],['1,500',1500],['Bs 1.500',1500],['1 500',1500],['',0],['Bs.',0]];
      var mal=function(l){ return l.filter(function(c){ return parseMonto(c[0])!==c[1]; }).map(function(c){ return c[0]+' → '+parseMonto(c[0]); }); };
      // Lo que escribe el propio panel (historial y arqueo) se lee igual que antes.
      var hist=parseCobros(textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1500.5, fecha:'2026-09-16', nota:'9', comps:['A'] },
                                         { metodo:'QR', banco:'BISA', monto:1250, fecha:'2026-09-16', nota:'9', comps:['B'] },
                                         { envio:true, metodo:'', monto:150.25, fecha:'', nota:'', comps:[] }])).map(function(c){ return c.monto; });
      var arq=parseArqueo(textoArqueo({ 'mes|2026-09|Efectivo':1500.5, 'dia|2026-09-16|QR BISA':12345.67 }));
      return { mal:mal(casos), malCtl:mal(controles), hist:hist, arq:arq };
    });
    chk('⚠️ lo pegado con «Bs.» adelante o «.-» atrás vale lo que dice (antes «Bs. 1.500.-» = 0,10; «1.500 Bs.» = 1,50; «Bs. 1500» = 0,15)', r.mal.length===0, r.mal);
    chk('los montos que ya se leían bien siguen igual («1.500», «1500,50», «1,500.50», «0.05»…)', r.malCtl.length===0, r.malCtl);
    chk('el historial que escribe el panel se relee igual (1500.5 · 1250 · flete 150.25)', J(r.hist)==='[1500.5,1250,150.25]', r.hist);
    chk('…y el arqueo guardado también', r.arq['mes|2026-09|Efectivo']===1500.5 && r.arq['dia|2026-09-16|QR BISA']===12345.67, r.arq);
  });

  await esc('1b. Formulario: pegado de WhatsApp en A cuenta, Saldo, Monto cobrado, precio y flete', async () => {
    const S = servidor();
    const A = await abrir(S);
    // Adelanto «Bs. 1.500.-» y saldo «1.500 Bs.»
    await empezar(A, 'PEGADO DE WHATSAPP');
    await tipear(A, '#f-acuenta', 'Bs. 1.500.-');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-saldo', '1.500 Bs.');
    await A.evaluate(() => { FORM_COMPS=['IMGWA1']; });
    let g = await guardar(A);
    let f = S.porCliente('PEGADO DE WHATSAPP');
    chk('⚠️ A cuenta «Bs. 1.500.-» y Saldo «1.500 Bs.» llegan a la planilla como 1.500 y 1.500 (antes 0,10 y 1,50)',
        f && f.acuenta===1500 && f.saldo===1500, f ? { acuenta:f.acuenta, saldo:f.saldo } : g);
    // «SÍ, pagado» con «Bs. 3000»
    await empezar(A, 'PAGADA PEGADA', { nota:'2002' });
    await elegir(A, 'f-pagado', 'SI');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-cobrado', 'Bs. 3000');
    await A.evaluate(() => { FORM_COMPS=['IMGWA2']; });
    g = await guardar(A);
    f = S.porCliente('PAGADA PEGADA');
    chk('⚠️ «SÍ, pagado» con «Bs. 3000» cobrados guarda un pago de 3.000 (antes 0,30)', f && /^~Efectivo 3000 @/.test(f.metodoPago), f ? f.metodoPago : g);
    // precio c/u «Bs. 1.250.-» × 2, «Usar como total», y flete «Bs. 150.-»
    await empezar(A, 'PRECIO Y FLETE PEGADOS', { nota:'2003' });
    await tipear(A, '#f-productos .prod-cant', '2');
    await tipear(A, '#f-productos .prod-precio', 'Bs. 1.250.-');
    await A.evaluate(() => usarTotalProds());
    await tipear(A, '#f-envio', 'Bs. 150.-');
    g = await guardar(A);
    f = S.porCliente('PRECIO Y FLETE PEGADOS');
    chk('⚠️ precio c/u «Bs. 1.250.-» es 1.250, y «Usar como total» deja el saldo en 2.500 (antes 0,10 y 0,20)',
        f && f.productos[0].precio===1250 && f.saldo===2500, f ? { prods:f.productos, saldo:f.saldo } : g);
    chk('⚠️ el flete «Bs. 150.-» queda pactado en 150 (antes ^0.15)', f && /\^150\b/.test(f.metodoPago), f ? f.metodoPago : g);
    // control: lo tipeado normal sigue igual
    await empezar(A, 'TIPEADO NORMAL', { nota:'2004' });
    await tipear(A, '#f-acuenta', '1.500');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-saldo', '1500,50');
    await A.evaluate(() => { FORM_COMPS=['IMGWA4']; });
    g = await guardar(A);
    f = S.porCliente('TIPEADO NORMAL');
    chk('control · «1.500» y «1500,50» siguen siendo 1.500 y 1.500,50', f && f.acuenta===1500 && f.saldo===1500.5, f ? { acuenta:f.acuenta, saldo:f.saldo } : g);
  });

  await esc('1c. Contabilidad: «Registrar pago» y «Corregir precios y montos» con lo pegado', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'rp', cliente:'REGISTRAR PEGADO', oc:'09-010', saldo:3000, ts:TS('2026-09-16') }));
    S.guardar(pedido({ id:'cm', cliente:'CORREGIR PEGADO', oc:'09-011', saldo:0, acuenta:0, ts:TS('2026-09-16') }));
    const A = await abrir(S);
    await A.evaluate(async () => { showView('conta'); await esperar(150); showContaModal('rp'); await esperar(80); });
    await tipear(A, '#cta-pago-monto', 'Bs. 1500');
    await A.evaluate(async () => { document.getElementById('cta-pago-nota').value='777'; CTA_PAGO.comps=['IMGP1']; ctaRegistrarPago('rp'); await esperar(300); await quieto(); try{ closeModal(); }catch(e){} });
    let f = S.fila('rp');
    chk('⚠️ «Registrar pago» con «Bs. 1500» anota Bs 1.500 y deja 1.500 por cobrar (antes Bs 0,15 y 2.999,85)',
        /^Efectivo 1500 @2026-09-16 #777/.test(f.metodoPago) && f.saldo===1500, { mp:f.metodoPago, saldo:f.saldo });
    // La venta sin monto: el total va en «Corregir precios y montos»
    await A.evaluate(async () => { showView('conta'); await esperar(120); showContaModal('cm'); await esperar(80); });
    await tipear(A, '#cta-saldo', '2.500.-');
    await A.evaluate(async () => { ctaGuardarMontos('cm'); await esperar(300); await quieto(); try{ closeModal(); }catch(e){} });
    f = S.fila('cm');
    chk('⚠️ «Corregir precios y montos» con el saldo «2.500.-» deja 2.500 por cobrar (antes 2,50)', f.saldo===2500, { saldo:f.saldo });
  });

  /* El Cuadre, con un servidor simulado (como test_rev2_cuadre.js): el arqueo y el retiro. */
  await esc('1d. Cuadre: el arqueo «Bs. 1.500,50.-» y el retiro «Bs. 5.000.-»', async () => {
    const ctx = await browser.newContext({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz', locale:'es-BO' });
    contextos.push(ctx);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(RELOJ));
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true;
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      var hoy=todayStr();
      window.SRV=[{ id:'q1', nota:'11', oc:'09-011', cliente:'CON QR', turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:hoy, maps:'',
                    observaciones:'', estado:'', entregado:false, chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:new Date(hoy+'T12:00:00').getTime(),
                    acuenta:0, saldo:0, pagado:true, productos:[],
                    metodoPago:textoCobros([{metodo:'QR',banco:'BISA',monto:1500.5,fecha:hoy,nota:'11',comps:['Q1']}]) }];
      apiPost=function(b){
        if(b.action==='save'){ var x=JSON.parse(JSON.stringify(b.pedido)); x.rev=(Number(x.rev)||0)+1;
          window.SRV=window.SRV.filter(function(y){ return y.id!==x.id; }).concat([x]); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(x))}); }
        if(b.action==='list') return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))});
        return Promise.resolve({ok:true});
      };
      apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))}); };
      setPending([]); STATE=[]; RETIROS=[];
      await refrescarEstado();
      showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
      await new Promise(function(r){ setTimeout(r,120); });
      document.getElementById('cua-vendedor').value='';
      segSet('cua-mode','mes'); document.getElementById('cua-mes').value=hoy.slice(0,7); setCuadreModo('mes');
      ARQUEO={}; renderCuadre();
    });
    const inp = page.locator('#cua-cierre input.cua-arqueo').first();
    await inp.click(); await page.keyboard.type('Bs. 1.500,50.-'); await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
    let r = await page.evaluate(() => ({ v:cuadreArqueo('QR BISA'), dif:cuadreCierre().difTotal }));
    chk('⚠️ el extracto «Bs. 1.500,50.-» se anota Bs 1.500,50 y el cuadre CIERRA (antes Bs 0,10 y «falta Bs 1.500,40»)', r.v===1500.5 && r.dif===0, r);
    await page.evaluate(() => { abrirRetiros(); document.getElementById('ret-entrega').value='Carola Chavez'; retEntregaCambio();
                                document.getElementById('ret-nota-nueva').value='11'; retAgregarNota(); });
    await page.locator('#ret-monto').click(); await page.keyboard.type('Bs. 5.000.-');
    await page.evaluate(() => guardarRetiroForm());
    await page.waitForTimeout(100);
    r = await page.evaluate(() => ({ montos:retirosTodos().map(function(x){ return x.monto; }), srv:window.SRV.filter(esFilaRetiro).map(function(x){ return x.acuenta; }) }));
    chk('⚠️ el retiro «Bs. 5.000.-» es de Bs 5.000 en la pantalla y en la planilla (antes Bs 0,50)', J(r.montos)==='[5000]' && J(r.srv)==='[5000]', r);
  });

  // ══ 2. EL FLETE PACTADO, DICHO IGUAL EN TODOS LADOS ═════════════════════════════════════
  /* El 26/09 la tarjeta del chofer (a45124b) y el WhatsApp del pedido (6f130ea) empezaron a decir el
     flete pactado que se cobra en la puerta (§4ai). La HOJA DE RUTA —la que logística imprime y manda
     por WhatsApp al chofer— seguía diciendo «✅ PAGADO» y «✅ Todo pagado»: con la hoja en la mano,
     el flete no se cobraba. */
  await esc('2. La hoja de ruta (pantalla, impresa y WhatsApp) dice el flete pactado como la tarjeta del chofer', async () => {
    const S = servidor();
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      var hoy=todayStr();
      var P=function(o){ var b={ turno:'AM', celular:'7', zona:'Norte', direccion:'Calle 1', fecha:hoy, maps:'', observaciones:'', estado:'', entregado:false,
        vehiculo:'CAMION 1', chofer:'Luis Pierre', nroDia:1, fotos:[], vendedor:'Mirian Salazar', ts:Date.now(), acuenta:0, saldo:0, pagado:false, metodoPago:'', productos:[{desc:'SOFT',cant:1}] };
        for(var k in o) b[k]=o[k]; return b; };
      STATE=[ P({ id:'fl', oc:'09-021', nota:'21', cliente:'PAGADA CON FLETE', pagado:true,
                  metodoPago:textoCobros([{anticipo:true, metodo:'Efectivo', monto:3000, fecha:'2026-09-14', nota:'21', comps:['I1']}, {envio:true, metodo:'', monto:150, fecha:'', nota:'', comps:[]}]) }),
              P({ id:'sf', oc:'09-022', nota:'22', cliente:'PAGADA SIN FLETE', pagado:true,
                  metodoPago:textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:2000, fecha:'2026-09-14', nota:'22', comps:['I2']}]) }),
              P({ id:'db', oc:'09-023', nota:'23', cliente:'DEBE SIN FLETE', chofer:'Pedro Vaca', vehiculo:'CAMION 2', saldo:1000 }),
              P({ id:'df', oc:'09-024', nota:'24', cliente:'DEBE CON FLETE', chofer:'Pedro Vaca', vehiculo:'CAMION 2', saldo:500, metodoPago:'^80' }) ];
      saveMirror();
      var out={};
      out.tarjeta=cobroChoferHtml(findById('fl')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
      out.wa=pedidoText(findById('fl'));
      var wa=''; window.open=function(u){ wa=decodeURIComponent(String(u)); return null; }; copyText=function(){};
      abrirRuta(); setRutaDia('hoy');
      var cards=[].map.call(document.querySelectorAll('#ruta-body .ruta-chofer'), function(c){ return c.textContent.replace(/\s+/g,' '); });
      out.ruta=cards.join(' || ');
      rutaWhatsapp(0); out.rutaWA=wa; closeRuta();
      return out;
    });
    chk('control · la tarjeta del chofer dice «Cobrar también el flete: Bs 150,00»', /Cobrar también el flete: Bs 150,00/.test(r.tarjeta), r.tarjeta.slice(0,200));
    chk('control · el WhatsApp del pedido dice «Recargo por entrega: Bs 150,00»', /Recargo por entrega: Bs 150,00/.test(r.wa), r.wa);
    const paradaFl = (r.ruta.match(/PAGADA CON FLETE.*?(?=2\) |$)/)||[''])[0];
    const paradaSf = (r.ruta.match(/PAGADA SIN FLETE.*?(?=2\) |\|\||$)/)||[''])[0];
    chk('⚠️ la hoja de ruta, en la parada, dice el flete que hay que cobrar (antes solo «✅ PAGADO»)', /flete: Bs 150,00/.test(paradaFl), paradaFl);
    chk('⚠️ …y arriba, en lo que hay que cobrar en el recorrido («A cobrar: Bs 150,00 de flete»; antes nada)', /Luis Pierre.*A cobrar: Bs 150,00 de flete/.test(r.ruta), r.ruta.slice(0,200));
    chk('⚠️ con venta Y flete por cobrar, las dos cosas por separado («Bs 1.500,00 + Bs 80,00 de flete»)', /Pedro Vaca.*A cobrar: Bs 1\.500,00 \+ Bs 80,00 de flete/.test(r.ruta), r.ruta.slice(r.ruta.indexOf('Pedro')).slice(0,120));
    chk('⚠️ el WhatsApp de la ruta no dice «✅ Todo pagado» con un flete por cobrar, y lo nombra en la parada',
        !/Todo pagado/.test(r.rutaWA) && /Bs 150,00 de flete/.test(r.rutaWA) && /PAGADA CON FLETE[\s\S]*flete: Bs 150,00/.test(r.rutaWA), r.rutaWA);
    chk('control · la parada sin flete no habla de flete', paradaSf && !/flete/.test(paradaSf), paradaSf);
  });

  // ══ 3. SE ARREPINTIÓ DEL ADELANTO CON LA FOTO YA SUBIDA ═════════════════════════════════
  /* 360d5b2 (26/09) destrabó «un método elegido y después sin pago»… sin imagen. Con la foto del recibo
     ya subida (se pide para cualquier pago) y el «A cuenta» vuelto a 0, el guardado se frena con
     «Subiste la imagen pero no anotaste ningún pago… quitá la imagen», pero la imagen y su ✕ se
     esconden con el bloque del método: no había cómo quitarla sin volver a poner un adelanto. */
  await esc('3. «A cuenta» vuelto a 0 con la foto ya subida: la imagen queda a mano para quitarla', async () => {
    const S = servidor();
    const A = await abrir(S);
    await empezar(A, 'SE ARREPINTIO CON FOTO', { nota:'2201' });
    await tipear(A, '#f-acuenta', '500');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-saldo', '2500');
    await A.evaluate(() => { FORM_COMPS=['IMGARR']; renderCompForm(true); });   // la foto del recibo, ya subida
    await tipear(A, '#f-acuenta', '0');
    await tipear(A, '#f-saldo', '3000');
    let g = await guardar(A);
    const vis = await A.evaluate(() => {
      var w=document.getElementById('wrap-comp');
      return { visible: !!(w && w.offsetParent!==null), quitar: !!(w && w.offsetParent!==null && w.querySelector('button[onclick*="quitarCompForm"]')) };
    });
    chk('control · sin pago, con la foto subida, NO se guarda (el comprobante va pegado a un pago)', !S.porCliente('SE ARREPINTIO CON FOTO') && g.saves===0 && g.rojos.some(t=>/Subiste la imagen/.test(t)), g);
    chk('⚠️ …y la imagen queda A LA VISTA con su ✕ para quitarla (antes quedaba escondida con el bloque del método)', vis.visible && vis.quitar, vis);
    // la quita y guarda: la venta queda toda por cobrar, sin método ni imagen
    await A.evaluate(() => { var b=document.querySelector('#wrap-comp button[onclick*="quitarCompForm"]'); if(b) b.click(); });
    g = await guardar(A);
    const f = S.porCliente('SE ARREPINTIO CON FOTO');
    chk('⚠️ quitada la imagen, la venta se guarda toda por cobrar', f && f.acuenta===0 && f.saldo===3000 && f.metodoPago==='', f ? { acuenta:f.acuenta, saldo:f.saldo, mp:f.metodoPago } : g);
    // control: con el adelanto de verdad y la foto, se guarda como siempre
    await empezar(A, 'ADELANTO CON FOTO', { nota:'2202' });
    await tipear(A, '#f-acuenta', '500');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-saldo', '2500');
    await A.evaluate(() => { FORM_COMPS=['IMGOK']; renderCompForm(true); });
    g = await guardar(A);
    const f2 = S.porCliente('ADELANTO CON FOTO');
    chk('control · con el adelanto y su foto se guarda como siempre (Efectivo %IMGOK, 500 + 2.500)', f2 && f2.acuenta===500 && f2.saldo===2500 && /Efectivo %IMGOK/.test(f2.metodoPago), f2 ? f2.metodoPago : g);
  });

  chk('sin errores JS', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
