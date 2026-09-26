/* 🔎 REVISIÓN POR PESTAÑA (26/09): «＋ Nuevo pedido», como la usa la vendedora.

   Panel de verdad contra el google-apps-script.gs de verdad (en Node, con una planilla de mentira,
   como test_rev_pedidos.js): lo que se tipea en el formulario viaja por `doPost`, `recToRow` y
   `rowToRec_`, y se mira lo que quedó en la PLANILLA, no en la pantalla.

     1. Los montos se leen como los escribe la gente en Bolivia: «1.500» es 1.500, no 1,50
        (A cuenta, Saldo, Monto total cobrado, segundo método, flete y precio c/u).
     2. Un monto con signo menos frena el guardado (antes se guardaba negativo, o borraba el flete).
     3. La cantidad tiene que ser un número entero de 1 para arriba: 0 no se vuelve 1, 2,5 no se
        vuelve 2 y −2 no se guarda.
     4. Editar un pedido con montos con decimales no los multiplica por mil.

   ⚠️ Los montos se TIPEAN con el teclado (`page.keyboard.type`), como la vendedora: un campo
   numérico deja «1.500» tal cual y `parseFloat` lo leía 1,5.
   ⚠️ El reloj de la página está CLAVADO en el miércoles 16/09/2026 a las 10 de Bolivia: las
   entregas van al viernes 18/09 y no se pudren con el calendario.

   Se corre:  node tests/test_rev2_form.js           (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev2_form.js
   Con el servidor publicado hoy:  GS=/ruta/al/gs-20a node tests/test_rev2_form.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia
const ENTREGA = '2026-09-18';                         // viernes
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');

/* ── El servidor: el .gs real con un Google de mentira (igual que test_rev_pedidos.js) ── */
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
  return { ctx, sh, post, fila, porCliente, guardar, HDR };
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
    window.__ctl.log.push({ act: P.action || 'save', id: String((P.pedido && P.pedido.id) || P.id || '') });
    return window.__gs(body).then(function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; });
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
    showView('form'); await esperar(150); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=a.cliente;
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-nota').value=String(a.extra.nota||'2001');
    document.getElementById('f-fecha').value=a.entrega;
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
  }, { cliente, extra: extra||{}, entrega: ENTREGA });
  /* Tipea en un campo como la vendedora: lo vacía y escribe tecla por tecla. Con `focus` y no con
     `click`: en un campo angosto (la cantidad) el clic cae en la flechita ▲ y le suma 1. */
  const tipear = async (A, sel, txt) => { await A.fill(sel, ''); await A.focus(sel); await A.keyboard.type(txt); };
  const elegir = (A, seg, val) => A.click('#'+seg+' button[data-val="'+val+'"]');
  /* Guarda y devuelve cuántos «save» salieron, los avisos rojos y qué campos quedaron marcados. */
  const guardar = (A) => A.evaluate(async () => {
    window._toasts=[]; window.__ctl.log=[];
    submitPedido(); await esperar(700); await quieto();
    var o={ saves: window.__ctl.log.filter(function(x){ return x.act==='save'; }).length,
            rojos: window._toasts.filter(function(t){ return /^err/.test(t); }),
            marcados: Array.prototype.map.call(document.querySelectorAll('#view-form .err'), function(e){ return e.id || e.className; }),
            modal: ((document.getElementById('modal')||{}).textContent||'').replace(/\s+/g,' ').slice(0,120) };
    try{ closeModal(); }catch(e){}
    return o;
  });

  // ══ 1. «1.500» ES MIL QUINIENTOS ════════════════════════════════════════════════════════
  await esc('1. Montos tipeados con punto de miles, como se escriben en Bolivia', async () => {
    const S = servidor();
    const A = await abrir(S);

    // 1a · Venta con adelanto: A cuenta «1.500», Saldo «2.000»
    await empezar(A, 'ADELANTO CON PUNTO');
    await tipear(A, '#f-acuenta', '1.500');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-saldo', '2.000');
    const crudo = await A.evaluate(() => document.getElementById('f-acuenta').value);
    chk('(el navegador deja «1.500» tal cual en el campo numérico)', crudo==='1.500', crudo);
    await A.evaluate(() => { FORM_COMPS=['IMGREC1']; });
    let g = await guardar(A);
    let f = S.porCliente('ADELANTO CON PUNTO');
    chk('⚠️ A cuenta «1.500» y Saldo «2.000» llegan a la planilla como 1.500 y 2.000 (antes 1,5 y 2)', f && f.acuenta===1500 && f.saldo===2000, f ? { acuenta:f.acuenta, saldo:f.saldo, g } : g);

    // 1b · «SÍ, pagado» con Monto total cobrado «3.500»
    await empezar(A, 'PAGADA CON PUNTO', { nota:'2002' });
    await elegir(A, 'f-pagado', 'SI');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-cobrado', '3.500');
    await A.evaluate(() => { FORM_COMPS=['IMGREC2']; });
    g = await guardar(A);
    f = S.porCliente('PAGADA CON PUNTO');
    chk('⚠️ «SÍ, pagado» con «3.500» cobrados guarda el pago de 3.500 (antes 3,50)', f && /^~Efectivo 3500 @/.test(f.metodoPago), f ? f.metodoPago : g);

    // 1c · Pago mixto: A cuenta «2.000», el segundo método «1.500»
    await empezar(A, 'MIXTO CON PUNTO', { nota:'2003' });
    await tipear(A, '#f-acuenta', '2.000');
    await elegir(A, 'f-metodo', 'Efectivo');
    await tipear(A, '#f-saldo', '1.000');
    await A.evaluate(() => { FORM_COMPS=['IMGREC3']; toggleMixto(true); });
    await elegir(A, 'f-metodo2', 'Tarjeta');
    await tipear(A, '#f-monto2', '1.500');
    await A.evaluate(() => { FORM_COMPS2=['IMGVOU3']; });
    g = await guardar(A);
    f = S.porCliente('MIXTO CON PUNTO');
    chk('⚠️ pago mixto: «2.000» en total con «1.500» por tarjeta = Efectivo 500 + Tarjeta 1.500 (antes Efectivo 0,5 + Tarjeta 1,5)',
        f && /^~Efectivo 500 @\S+ #2003 %IMGREC3 \+ Tarjeta 1500 @/.test(f.metodoPago) && f.acuenta===2000, f ? { mp:f.metodoPago, acuenta:f.acuenta } : g);

    // 1d · Flete «1.200» pactado, y precio c/u «1.250» × 2 con «Usar como total»
    await empezar(A, 'FLETE Y PRECIO CON PUNTO', { nota:'2004' });
    await tipear(A, '#f-productos .prod-cant', '2');
    await tipear(A, '#f-productos .prod-precio', '1.250');
    const suma = await A.evaluate(() => (document.getElementById('f-prods-total')||{}).textContent||'');
    chk('⚠️ «Los ítems suman» dice 2.500 (2 × 1.250), no 2,50', /2\.500,00/.test(suma), suma);
    await A.evaluate(() => usarTotalProds());
    const saldoUsado = await A.evaluate(() => document.getElementById('f-saldo').value);
    await tipear(A, '#f-envio', '1.200');
    g = await guardar(A);
    f = S.porCliente('FLETE Y PRECIO CON PUNTO');
    chk('⚠️ el precio c/u «1.250» llega como 1.250', f && f.productos[0].precio===1250 && f.productos[0].cant===2, f ? f.productos : g);
    chk('⚠️ «Usar como total» deja el saldo en 2.500', f && f.saldo===2500 && Number(saldoUsado)===2500, f ? { saldo:f.saldo, campo:saldoUsado } : g);
    chk('⚠️ el flete «1.200» queda pactado en 1.200 (antes ^1.2)', f && /\^1200\b/.test(f.metodoPago), f ? f.metodoPago : g);
  });

  // ══ 2. LO QUE NO ES UN MONTO FRENA, NO SE GUARDA ════════════════════════════════════════
  await esc('2. Montos negativos', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'fp', cliente:'FLETE PACTADO', oc:'09-001', metodoPago:'^150', saldo:3000 }));
    const A = await abrir(S);
    const intento = async (cliente, arma, img) => {
      await empezar(A, cliente);
      await arma();
      if (img) await A.evaluate(() => { FORM_COMPS=['IMGNEG']; });
      const g = await guardar(A);
      return { g, f: S.porCliente(cliente) };
    };
    let r = await intento('ACUENTA NEGATIVA', async () => {
      await tipear(A, '#f-acuenta', '-500');
      await tipear(A, '#f-saldo', '3000');
    });
    chk('⚠️ A cuenta «-500» NO se guarda (antes quedaba acuenta −500 en la planilla)', !r.f && r.g.saves===0, r.f ? { acuenta:r.f.acuenta } : r.g);
    chk('…se marca el campo y se dice por qué', r.g.marcados.indexOf('f-acuenta')>=0 && r.g.rojos.some(t=>/negativ/i.test(t)), r.g);
    r = await intento('SALDO NEGATIVO', async () => { await tipear(A, '#f-saldo', '-100'); });
    chk('⚠️ Saldo «-100» NO se guarda (antes quedaba saldo −100)', !r.f && r.g.saves===0 && r.g.marcados.indexOf('f-saldo')>=0, r.f ? { saldo:r.f.saldo } : r.g);
    r = await intento('COBRADO NEGATIVO', async () => {
      await elegir(A, 'f-pagado', 'SI'); await elegir(A, 'f-metodo', 'Efectivo');
      await tipear(A, '#f-cobrado', '-3.000');
    }, true);
    chk('⚠️ «Monto total cobrado» «-3.000» NO se guarda como un pago de 3.000', !r.f && r.g.saves===0 && r.g.marcados.indexOf('f-cobrado')>=0, r.f ? r.f.metodoPago : r.g);
    // Editando: el flete pactado de 150 con «-50» tipeado se borraba entero
    const g = await A.evaluate(async () => {
      window._toasts=[]; window.__ctl.log=[];
      showView('admin'); await esperar(120); editPedido('fp'); await esperar(200);
      return document.getElementById('f-envio').value;
    });
    await tipear(A, '#f-envio', '-50');
    const g2 = await guardar(A);
    chk('⚠️ Flete «-50» NO se guarda: editando, el flete pactado de 150 se borraba entero', g==='150' && g2.saves===0 && g2.marcados.indexOf('f-envio')>=0 && /\^150\b/.test(S.fila('fp').metodoPago), { antes:g, g2, mp:S.fila('fp').metodoPago });
  });

  // ══ 3. LA CANTIDAD ES UN ENTERO DE 1 PARA ARRIBA ════════════════════════════════════════
  await esc('3. Cantidad 0, 2,5, −2 y vacía', async () => {
    const S = servidor();
    const A = await abrir(S);
    const conCant = async (cliente, cant) => {
      await empezar(A, cliente);
      await tipear(A, '#f-productos .prod-cant', cant);
      const g = await guardar(A);
      return { g, f: S.porCliente(cliente) };
    };
    let r = await conCant('CANT CERO', '0');
    chk('⚠️ cantidad 0 NO se guarda como 1', !r.f && r.g.saves===0, r.f ? r.f.productos : r.g);
    chk('…se marca la cantidad y se dice por qué', r.g.marcados.some(m=>/prod-cant/.test(m)) && r.g.rojos.some(t=>/cantidad/i.test(t)), r.g);
    r = await conCant('CANT MEDIA', '2.5');
    chk('⚠️ cantidad 2.5 NO se guarda como 2', !r.f && r.g.saves===0, r.f ? r.f.productos : r.g);
    r = await conCant('CANT NEGATIVA', '-2');
    chk('⚠️ cantidad −2 NO se guarda', !r.f && r.g.saves===0, r.f ? r.f.productos : r.g);
    r = await conCant('CANT VACIA', '');
    chk('⚠️ cantidad vacía NO se inventa un 1', !r.f && r.g.saves===0, r.f ? r.f.productos : r.g);
    r = await conCant('CANT TRES', '3');
    chk('cantidad 3 se guarda 3, sin avisos', r.f && r.f.productos[0].cant===3 && !r.g.rojos.length, r.f ? r.f.productos : r.g);
    // un renglón vacío de más (sin producto) no frena por su cantidad
    await empezar(A, 'RENGLON VACIO');
    await A.evaluate(() => { addProdRow(); var q=document.querySelectorAll('#f-productos .prod-cant'); q[1].value=''; });
    const g = await guardar(A);
    const f = S.porCliente('RENGLON VACIO');
    chk('un renglón sin producto (vacío) no frena por su cantidad', f && f.productos.length===1 && !g.rojos.length, f ? f.productos : g);
  });

  // ══ 4. EDITAR NO MULTIPLICA POR MIL ═════════════════════════════════════════════════════
  await esc('4. Editar un pedido con montos con decimales, sin tocarlos', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'d1', cliente:'DECIMALES', oc:'09-001', metodoPago:'Efectivo', acuenta:1250.5, saldo:1749.5 }));
    S.guardar(pedido({ id:'d2', cliente:'TRES DECIMALES', oc:'09-002', metodoPago:'Efectivo', acuenta:1500.125, saldo:1500 }));
    S.guardar(pedido({ id:'d3', cliente:'FLETE CON CENTAVOS', oc:'09-003', metodoPago:'Efectivo + ^50.5', acuenta:500, saldo:2500 }));
    const A = await abrir(S);
    for (const id of ['d1','d2','d3']) {
      A.__dialogos.length = 0;
      const t = await A.evaluate(async (id) => {
        window._toasts=[]; showView('admin'); await esperar(120); editPedido(id); await esperar(200);
        document.getElementById('f-obs').value='solo la observación';
        submitPedido(); await esperar(300); await quieto(); try{ closeModal(); }catch(e){}
        return window._toasts.filter(function(x){ return /^err/.test(x); });
      }, id);
      const f = S.fila(id);
      if (id==='d1') chk('d1 · 1.250,5 / 1.749,5 quedan igual', f.acuenta===1250.5 && f.saldo===1749.5 && f.observaciones==='solo la observación' && !t.length, { acuenta:f.acuenta, saldo:f.saldo, t });
      if (id==='d2') chk('⚠️ d2 · un A cuenta viejo con tres decimales (1500.125) NO pasa a 1.500.125', f.acuenta>1500 && f.acuenta<1501 && f.observaciones==='solo la observación', { acuenta:f.acuenta, t, dialogos:A.__dialogos });
      if (id==='d3') chk('d3 · el flete de 50,5 queda en 50,5', /\^50\.5\b/.test(f.metodoPago) && f.observaciones==='solo la observación' && !t.length, { mp:f.metodoPago, t });
    }
  });

  chk('sin errores JS', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
