/* 📱 REVISIÓN DE «＋ NUEVO PEDIDO» Y «📋 MIS PEDIDOS» EN EL CELULAR (27/09).

   Las vendedoras cargan y corrigen desde el teléfono: acá todo corre en una pantalla de 390 × 844 (isMobile, hasTouch) y
   se TOCA como lo hace ella (page.tap / page.fill), no llamando funciones por atrás, salvo para armar el escenario.

   Mismo banco de pruebas que test_rev5_pedidos.js: el panel de verdad contra el google-apps-script.gs de verdad (cargado
   en Node con una planilla de mentira), así el ida y vuelta pasa por `recToRow`/`rowToRec_`, el sello y los porteros.
   Las preguntas (`confirm`) se contestan con `page.__respuestas` (true = Aceptar, false = Cancelar); sin respuesta
   anotada, Aceptar. Todas quedan en `page.__dialogos`.

   ⚠️ Reloj CLAVADO en el miércoles 16/09/2026 a las 10 de Bolivia: las fechas de los fixtures son fijas.

   Se corre:  node tests/test_rev7_celular.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev7_celular.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');
const V = 'Carola Chavez';

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
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  return { ctx, sh, post, fila, filas, guardar };
}
/* Un pedido sintético completo (los campos de la planilla). */
const pedido = (o) => Object.assign({
  fecha:'2026-09-17', oc:'', vendedor:V, cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-09-15'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

/* Lo que corre ANTES que el panel, en cada carga. */
function INIT(vend){
  try{ localStorage.setItem('me_mis_vendedor', vend); }catch(e){}       // la vendedora ya usó este celular antes
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
  /* Un CELULAR contra el servidor S, con el reloj clavado. */
  const abrir = async (S, opts) => {
    opts = opts || {};
    const context = await browser.newContext({ viewport:{ width:opts.w||390, height:opts.h||844 }, isMobile:true, hasTouch:true, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT, V);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(8000);                     // contra un panel viejo, lo que no está no se espera 30 s
    page.__dialogos = []; page.__respuestas = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => { page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if (si) d.accept(); else d.dismiss(); });
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(350);
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true;
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
  const vista = (A) => A.evaluate(() => (document.querySelector('.view.active')||{}).id);
  const modalTxt = (A) => A.evaluate(() => document.getElementById('modal').classList.contains('on') ? document.getElementById('modal-box').innerText : '');
  /* Desde Mis pedidos: abre la ficha del pedido `cli` tocando su tarjeta y toca «✏️ Editar el pedido». */
  const abrirEdicion = async (A, cli) => {
    await A.tap('#tab-mis'); await A.waitForTimeout(250);
    await A.tap('#mis-lista .cho-card:has-text("'+cli+'")'); await A.waitForTimeout(200);
    await A.tap('#modal-box >> text=✏️ Editar el pedido'); await A.waitForTimeout(250);
  };
  const guardar = async (A) => { await A.tap('#f-submit'); await A.waitForTimeout(900); await A.evaluate(() => quieto()); };

  // ══ 1. «＋ NUEVO PEDIDO» CON UNA EDICIÓN QUE QUEDÓ ABIERTA ══════════════════════════════════
  /* La vendedora abre ✏️ Editar de una venta, se arrepiente y vuelve con la pestaña «📋 Mis pedidos» (no con «Cancelar
     edición»). Más tarde llama un cliente, toca «＋ Nuevo pedido» y el formulario SIGUE siendo la edición de la otra venta:
     escribe el cliente nuevo encima, toca el botón (que dice «Guardar cambios») y la venta anterior desaparece de la
     planilla, reemplazada por la nueva, con su OC. */
  await esc('1. «＋ Nuevo pedido» con una edición que quedó abierta', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'a1', cliente:'CLIENTA ANTERIOR', oc:'09-001', nota:'1001', celular:'71111111', direccion:'Casa de la anterior', turno:'PM' }));
    const A = await abrir(S);
    await abrirEdicion(A, 'CLIENTA ANTERIOR');
    let r = await A.evaluate(() => ({ edit:EDIT_ID, cli:document.getElementById('f-cliente').value }));
    chk('punto de partida: el formulario es la edición de la venta anterior', r.edit==='a1' && r.cli==='CLIENTA ANTERIOR', r);
    await A.tap('#tab-mis'); await A.waitForTimeout(250);                    // se arrepiente, por la pestaña
    A.__dialogos.length=0;
    await A.tap('#tab-form'); await A.waitForTimeout(250);                   // más tarde: pedido nuevo
    r = await A.evaluate(() => ({ edit:EDIT_ID, cli:document.getElementById('f-cliente').value, boton:document.getElementById('f-submit').textContent,
                                  banner:document.getElementById('edit-banner').classList.contains('on') }));
    chk('⚠️ al tocar «＋ Nuevo pedido» se avisa que había una edición sin guardar, nombrando la venta',
        A.__dialogos.length===1 && /CLIENTA ANTERIOR/.test(A.__dialogos[0]) && /NUEVO/.test(A.__dialogos[0]), A.__dialogos.map(d=>d.slice(0,120)));
    chk('⚠️ …y aceptando, el formulario es un pedido NUEVO (vacío, «Guardar pedido», sin el cartel de edición)',
        r.edit===null && r.cli==='' && r.boton==='Guardar pedido' && !r.banner, r);
    // carga el pedido nuevo, tocando
    await A.fill('#f-nota', '2002');
    await A.fill('#f-cliente', 'CLIENTE NUEVO');
    await A.fill('#f-celular', '72222222');
    await A.fill('#f-productos .prod-desc', 'TITANIO LATEX');
    await A.selectOption('#f-productos .prod-medida', '140x190');
    await A.fill('#f-productos .prod-precio', '3000');
    await A.fill('#f-zona', 'Sur');
    await A.fill('#f-saldo', '3000');
    await guardar(A);
    const ant = S.fila('a1'), nuevo = S.filas().filter(f => f.cliente==='CLIENTE NUEVO')[0];
    chk('⚠️ la venta anterior sigue en la planilla tal cual (antes la pisaba el cliente nuevo, con su OC)',
        !!ant && ant.cliente==='CLIENTA ANTERIOR' && String(ant.nota)==='1001' && ant.direccion==='Casa de la anterior', ant && { cliente:ant.cliente, nota:ant.nota });
    chk('⚠️ …y el pedido nuevo entra como pedido NUEVO, con otra fila y otra OC', !!nuevo && nuevo.id!=='a1' && nuevo.oc && nuevo.oc!=='09-001',
        nuevo && { id:nuevo.id, oc:nuevo.oc });
    await A.tap('#modal-box >> text=Cerrar').catch(() => A.evaluate(() => closeModal()));   // la ventana de «Pedido guardado»
    // control: Cancelar vuelve a la edición
    await abrirEdicion(A, 'CLIENTA ANTERIOR');
    await A.tap('#tab-mis'); await A.waitForTimeout(250);
    A.__dialogos.length=0; A.__respuestas=[false];
    await A.tap('#tab-form'); await A.waitForTimeout(250);
    r = await A.evaluate(() => ({ edit:EDIT_ID, cli:document.getElementById('f-cliente').value }));
    chk('(control) con «Cancelar» se vuelve a la edición que se había dejado', A.__dialogos.length===1 && r.edit==='a1' && r.cli==='CLIENTA ANTERIOR', r);
    // control: estando ya en el formulario, la pestaña no pregunta nada
    A.__dialogos.length=0;
    await A.tap('#tab-form'); await A.waitForTimeout(150);
    r = await A.evaluate(() => EDIT_ID);
    chk('(control) tocando la pestaña DENTRO del formulario no se pregunta nada y la edición sigue', !A.__dialogos.length && r==='a1', { dialogos:A.__dialogos, edit:r });
    // control: un pedido nuevo a medio cargar no se pierde por ir y volver con las pestañas
    await A.evaluate(() => cancelEdit());
    await A.fill('#f-cliente', 'A MEDIO CARGAR');
    await A.tap('#tab-mis'); await A.waitForTimeout(200);
    A.__dialogos.length=0;
    await A.tap('#tab-form'); await A.waitForTimeout(200);
    r = await A.inputValue('#f-cliente');
    chk('(control) un pedido NUEVO a medio cargar sigue ahí al volver, sin preguntas', !A.__dialogos.length && r==='A MEDIO CARGAR', r);
  });

  // ══ 2. LOS AVISOS SE LEEN EN EL CELULAR ═════════════════════════════════════════════════════
  /* El aviso de abajo (`toast`) tenía `left:50%` sin ancho: nunca pasaba de MEDIA pantalla. En un celular de 390 px era
     una columna de 195 px; «Subiste la imagen pero no anotaste ningún pago…» (234 letras) quedaba de 18 renglones y 358 px
     de alto, encima del formulario y del botón Guardar (que no se podía tocar mientras tanto), y duraba 2,8 s. */
  await esc('2. Los avisos se leen en el celular', async () => {
    const S = servidor();
    const A = await abrir(S);
    const LARGO = 'Subiste la imagen pero no anotaste ningún pago. El comprobante va pegado a un pago: poné cuánto entró en «A cuenta» o marcá «SÍ, pagado». Si todavía no pagó, quitá la imagen y adjuntala después desde Contabilidad al registrar el pago.';
    const r = await A.evaluate(async (msg) => {
      var b=document.getElementById('f-submit'); b.scrollIntoView({block:'end'}); await esperar(50);
      var st=window.setTimeout, demora=null;
      window.setTimeout=function(f, ms){ if(demora==null) demora=ms; return st(f, ms); };
      try{ toast(msg,'err'); } finally { window.setTimeout=st; }
      await esperar(450);                                   // que termine de subir
      var el=document.getElementById('toast'), rc=el.getBoundingClientRect(), rb=b.getBoundingClientRect();
      var enMedio=document.elementFromPoint(rb.left+rb.width/2, rb.top+rb.height/2);
      return { ancho:Math.round(rc.width), alto:Math.round(rc.height), vw:innerWidth, demora:demora, enBoton:!!(enMedio && (enMedio===b || b.contains(enMedio))),
               tapa:enMedio ? (enMedio.id||enMedio.className) : '-', dentro: rc.left>=0 && rc.right<=innerWidth };
    }, LARGO);
    chk('⚠️ un aviso largo usa el ancho del celular (antes: media pantalla, 195 de 390 px)', r.ancho >= 0.8*r.vw && r.dentro, r);
    chk('⚠️ …y no queda una columna altísima (antes 358 px de alto)', r.alto <= 220, r);
    chk('⚠️ mientras se ve, el botón Guardar se puede tocar (antes el aviso lo tapaba)', r.enBoton, r);
    chk('⚠️ …y dura lo que lleva leerlo (antes 2,8 s para 234 letras)', r.demora >= 8000 && r.demora <= 12000, r.demora);
    const c = await A.evaluate(() => { var st=window.setTimeout, d=[]; window.setTimeout=function(f, ms){ d.push(ms); return st(f, ms); };
      try{ toast('Copiado ✓','ok'); toast('Otro aviso','ok',6000); } finally { window.setTimeout=st; } return d; });
    chk('(control) un aviso corto sigue durando 2,8 s y el que dice su tiempo, ese tiempo', c[0]===2800 && c[1]===6000, c);
  });

  // ══ 3. CORREGIR UNA VENTA DE TIENDA ═════════════════════════════════════════════════════════
  /* Editar una venta de tienda desde Mis pedidos terminaba en la pestaña de Contabilidad con «✅ Pedido guardado» y el
     mensaje de una venta NUEVA para pasar al grupo, como si se hubiera cargado otra. */
  await esc('3. Corregir una venta de tienda desde Mis pedidos', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'t1', cliente:'VENTA EN LA TIENDA', oc:'09-003', nota:'1003', fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Central',
      ts:TS('2026-09-16','09:30'), pagado:true, saldo:0, metodoPago:'~Efectivo 3000 @2026-09-16 #1003 %IMGT', entregado:true, verificado:true }));
    const A = await abrir(S);
    await abrirEdicion(A, 'VENTA EN LA TIENDA');
    let r = await A.evaluate(() => ({ tienda:VENTA_TIENDA, edit:EDIT_ID }));
    chk('punto de partida: se abre como venta de tienda', r.tienda===true && r.edit==='t1', r);
    await A.fill('#f-obs', 'se llevó también la almohada de regalo');
    await guardar(A);
    const m = await modalTxt(A), v = await vista(A);
    chk('⚠️ después de guardar vuelve a Mis pedidos (antes: la pestaña de Contabilidad)', v==='view-mis', v);
    chk('⚠️ …con «✓ Cambios guardados», no con «✅ Pedido guardado» y el mensaje de una venta nueva',
        /Cambios guardados/.test(m) && !/Pedido guardado/.test(m), m.slice(0,160));
    const f = S.fila('t1');
    chk('(control) la corrección se guardó y sigue siendo venta de tienda (sin fecha ni turno, entregada)',
        f.observaciones==='se llevó también la almohada de regalo' && f.fecha==='' && f.turno==='' && f.entregado===true, { obs:f.observaciones, fecha:f.fecha, turno:f.turno });
    // el «Cancelar» del cartel de tienda, corrigiendo, también vuelve a Mis pedidos
    await A.evaluate(() => { try{ closeModal(); }catch(e){} });
    await abrirEdicion(A, 'VENTA EN LA TIENDA');
    await A.tap('.tienda-banner >> text=Cancelar'); await A.waitForTimeout(250);
    const v1 = await vista(A), e1 = await A.evaluate(() => ({ edit:EDIT_ID, tienda:VENTA_TIENDA }));
    chk('⚠️ corrigiendo, el «Cancelar» del cartel de tienda vuelve a Mis pedidos (antes: a Contabilidad)', v1==='view-mis' && e1.edit===null && e1.tienda===false, { vista:v1, e:e1 });
    // control: una venta de tienda NUEVA sigue yendo a Contabilidad con el mensaje para el grupo
    await A.evaluate(() => abrirVentaTienda()); await A.waitForTimeout(150);
    await A.fill('#f-nota', '1004');
    await A.fill('#f-cliente', 'OTRA DE TIENDA');
    await A.fill('#f-celular', '73333333');
    await A.fill('#f-productos .prod-desc', 'TITANIO LATEX');
    await A.selectOption('#f-productos .prod-medida', '140x190');
    await A.tap('#f-pagado button[data-val="SI"]');
    await A.tap('#f-metodo button[data-val="Efectivo"]');
    await A.fill('#f-cobrado', '3000');
    await A.evaluate(() => { FORM_COMPS=['IMGT2']; });                        // la foto del recibo (no se sube a ningún lado)
    await guardar(A);
    const m2 = await modalTxt(A), v2 = await vista(A);
    chk('(control) una venta de tienda NUEVA sigue terminando en Contabilidad con el mensaje para el grupo', v2==='view-conta' && /Pedido guardado/.test(m2), { vista:v2, modal:m2.slice(0,60) });
  });

  // ══ 4. LOS NÚMEROS DE ARRIBA DE MIS PEDIDOS ═════════════════════════════════════════════════
  /* «Hoy · pedidos cargados» contaba las ENTREGAS de hoy (un pedido cargado hoy para mañana no sumaba): el cartel no decía lo
     que contaba. El dueño (26/09) eligió seguir contando por la ENTREGA y cambiar el nombre: «pedidos que se entregan hoy»,
     «se entregan este mes». Las ventas de tienda (sin fecha de entrega) no entran, como siempre. Y los chips van justo arriba
     de la lista (en el celular, la lista que cambian quedaba lejos, debajo de los cuatro números). */
  await esc('4. Los contadores de Mis pedidos', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'c1', cliente:'SE ENTREGA HOY', oc:'09-001', fecha:'2026-09-16', ts:TS('2026-09-14'), saldo:1000 }));
    S.guardar(pedido({ id:'c2', cliente:'CARGADO HOY PARA MAÑANA', oc:'09-002', fecha:'2026-09-17', ts:TS('2026-09-16','08:30'), saldo:2000,
      productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:2, precio:1500}] }));
    S.guardar(pedido({ id:'c3', cliente:'VENTA DE TIENDA DE HOY', oc:'09-003', fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Central',
      ts:TS('2026-09-16','09:30'), pagado:true, saldo:0, metodoPago:'~Efectivo 3000 @2026-09-16 #1003 %IMGT', entregado:true, verificado:true }));
    S.guardar(pedido({ id:'c4', cliente:'CARGADO EN AGOSTO', oc:'08-120', fecha:'2026-09-02', ts:TS('2026-08-30'), saldo:500, entregado:true }));
    S.guardar(pedido({ id:'c5', cliente:'CARGADO AHORA PARA OCTUBRE', oc:'09-005', fecha:'2026-10-01', ts:TS('2026-09-10'), saldo:700 }));
    S.guardar(pedido({ id:'c6', cliente:'DE OTRA VENDEDORA', oc:'09-006', vendedor:'Mirian Salazar', fecha:'2026-09-16', ts:TS('2026-09-16','09:00'), saldo:9000 }));
    const A = await abrir(S);
    await A.tap('#tab-mis'); await A.waitForTimeout(300);
    const r = await A.evaluate(() => {
      var box=document.getElementById('mis-metrics'), out={};
      Array.prototype.forEach.call(box.querySelectorAll('.mc'), function(mc){ out[mc.querySelector('.mc-lbl').textContent.trim()]={ v:mc.querySelector('.mc-val').textContent.trim(), sub:mc.querySelector('.mc-sub').textContent.trim() }; });
      var chips={}; Array.prototype.forEach.call(document.querySelectorAll('#mis-chips button'), function(b){ chips[b.textContent.replace(/\s*\d+\s*$/,'').trim()]=Number(b.querySelector('.n').textContent); });
      return { m:out, chips:chips };
    });
    const hoy=r.m['Hoy']||{}, mes=r.m['Este mes']||{}, pc=r.m['Por cobrar']||{};
    chk('«Hoy» cuenta lo que se ENTREGA hoy (1), y el cartel lo dice', hoy.v==='1' && /se entregan hoy/.test(hoy.sub||''), hoy);
    chk('⚠️ …el cartel ya no dice «pedidos cargados» (contaba entregas)', !/cargados/.test(hoy.sub||''), hoy.sub);
    chk('«Este mes» cuenta lo que se entrega en septiembre (3: sin la venta de tienda ni el de octubre), y lo dice', mes.v==='3' && /se entregan este mes/.test(mes.sub||''), mes);
    chk('…y sus unidades (1 + 2 + 1)', /^4 unidades/.test(mes.sub||''), mes.sub);
    chk('«Por cobrar» es el saldo de lo que se entrega este mes (1.000 + 2.000 + 500) y lo dice', /3\.500,00/.test(pc.v||'') && /se entrega este mes/.test(pc.sub||''), pc);
    chk('(control) «Total cargados» sigue siendo todo lo suyo, sin lo de otra vendedora', (r.m['Total cargados']||{}).v==='5', r.m['Total cargados']);
    chk('(control) los chips siguen filtrando por la ENTREGA: 📅 Hoy 1 · 🌅 Mañana 1', r.chips['📅 Hoy']===1 && r.chips['🌅 Mañana']===1, r.chips);
    // 📱 los chips, justo arriba de la lista (en el celular la lista que cambian quedaba lejos, debajo de los cuatro números)
    const pos = await A.evaluate(() => {
      var ch=document.getElementById('mis-chips'), li=document.getElementById('mis-lista');
      var a=ch.getBoundingClientRect(), b=li.getBoundingClientRect();
      return { sig:(ch.nextElementSibling||{}).id||'', gap:Math.round(b.top-a.bottom) };
    });
    chk('⚠️ los botones de filtro están JUSTO ARRIBA de la lista (antes: los cuatro números en el medio)', pos.sig==='mis-lista' && pos.gap>=0 && pos.gap<60, pos);
  });

  // ══ 5. EDITAR UN PEDIDO SIN TURNO ═══════════════════════════════════════════════════════════
  /* El formulario abría con «AM» marcado a un pedido que no tenía turno, y corregirle la dirección le guardaba turno AM:
     la ficha pasaba de «🕗 Sin turno» a «🌅 AM» y el atraso se medía a las 13 en vez de al final del día. */
  await esc('5. Editar un pedido sin turno', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'s1', cliente:'SIN TURNO', oc:'09-004', fecha:'2026-09-18', turno:'' }));
    S.guardar(pedido({ id:'s2', cliente:'OTRO SIN TURNO', oc:'09-005', fecha:'2026-09-18', turno:'' }));
    S.guardar(pedido({ id:'s3', cliente:'DE LA TARDE', oc:'09-006', fecha:'2026-09-18', turno:'PM' }));
    const A = await abrir(S);
    await abrirEdicion(A, 'OTRO SIN TURNO');
    let r = await A.evaluate(() => ({ turno:segVal('f-turno'), hint:(document.getElementById('f-turno-hint')||{}).textContent||'' }));
    chk('⚠️ el formulario abre SIN turno marcado, y lo dice', r.turno==='' && /no tiene turno/.test(r.hint), r);
    await A.fill('#f-direccion', 'Calle corregida 5');
    await guardar(A);
    let f = S.fila('s2');
    chk('⚠️ corregir la dirección no le inventa un turno (antes: AM)', f.direccion==='Calle corregida 5' && f.turno==='', { turno:f.turno, dir:f.direccion });
    await A.evaluate(() => { try{ closeModal(); }catch(e){} });
    // control: si ella elige uno, se guarda ese
    await abrirEdicion(A, 'SIN TURNO');
    await A.tap('#f-turno button[data-val="PM"]');
    r = await A.evaluate(() => (document.getElementById('f-turno-hint')||{}).textContent||'');
    await guardar(A);
    f = S.fila('s1');
    chk('(control) eligiendo PM se guarda PM, y el aviso de «no tiene turno» se va', f.turno==='PM' && r==='', { turno:f.turno, hint:r });
    await A.evaluate(() => { try{ closeModal(); }catch(e){} });
    // control: el de la tarde sigue en la tarde
    await abrirEdicion(A, 'DE LA TARDE');
    r = await A.evaluate(() => segVal('f-turno'));
    await A.fill('#f-obs', 'tocar timbre');
    await guardar(A);
    chk('(control) un pedido de la TARDE abre en PM y se guarda en PM', r==='PM' && S.fila('s3').turno==='PM', { visto:r, fila:S.fila('s3').turno });
  });

  // ══ 6. EL PAGO MIXTO DE UNA EDICIÓN ANTERIOR ════════════════════════════════════════════════
  /* Abierta una venta con pago mixto (QR + Tarjeta 300) y dejada por la pestaña, al abrir OTRA venta y tocar «➕ Pagó con
     dos métodos» aparecían «Tarjeta» y «300» de la primera, listos para guardarse en esta. */
  await esc('6. El pago mixto de una edición anterior', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'x1', cliente:'CON PAGO MIXTO', oc:'09-007', nota:'1007', ts:TS('2026-09-15'),
      metodoPago:'~QR BISA 700 @2026-09-15 #1007 %IMGQ7 + Tarjeta 300 @2026-09-15 #1007 %IMGT7', acuenta:1000, saldo:2000 }));
    S.guardar(pedido({ id:'x2', cliente:'SIN PAGO MIXTO', oc:'09-008', nota:'1008', ts:TS('2026-09-15'), metodoPago:'Efectivo %IMGE8', acuenta:500, saldo:2500 }));
    const A = await abrir(S);
    await abrirEdicion(A, 'CON PAGO MIXTO');
    let r = await A.evaluate(() => ({ mixto:MIXTO, m2:document.getElementById('f-monto2').value, met2:segVal('f-metodo2') }));
    chk('(control) la venta con pago mixto abre con su 2° método (Tarjeta 300)', r.mixto===true && r.m2==='300' && r.met2==='Tarjeta', r);
    await A.tap('#tab-mis'); await A.waitForTimeout(250);                     // la deja por la pestaña
    await A.tap('#mis-lista .cho-card:has-text("SIN PAGO MIXTO")'); await A.waitForTimeout(200);
    await A.tap('#modal-box >> text=✏️ Editar el pedido'); await A.waitForTimeout(250);
    await A.tap('#btn-mixto'); await A.waitForTimeout(150);
    r = await A.evaluate(() => ({ mixto:MIXTO, m2:document.getElementById('f-monto2').value, met2:segVal('f-metodo2'), b2:segVal('f-banco2'), comps2:compsArr(FORM_COMPS2).length }));
    chk('⚠️ al tocar «➕ Pagó con dos métodos» en OTRA venta el 2° método arranca vacío (antes: «Tarjeta» y «300» de la anterior)',
        r.mixto===true && r.m2==='' && r.met2==='' && r.b2==='' && r.comps2===0, r);
  });

  // ══ 7. NADA SE SALE DE LA PANTALLA ═════════════════════════════════════════════════════════
  await esc('7. (control) En un celular chico nada se sale de la pantalla', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'z1', cliente:'CLIENTA CON UN NOMBRE BASTANTE LARGO DE VERDAD', oc:'09-009', metodoPago:'Efectivo %IMGZ + ^150', acuenta:500, saldo:2500,
      productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000, chk:'ok', chkDe:'01-05-025  Almacen Distribucion Banzer'}] }));
    const A = await abrir(S, { w:360, h:740 });
    const fuera = () => A.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const fForm = await fuera();
    await A.tap('#tab-mis'); await A.waitForTimeout(300);
    const fMis = await fuera();
    await A.tap('#mis-lista .cho-card >> nth=0'); await A.waitForTimeout(200);
    const fFicha = await A.evaluate(() => { var b=document.getElementById('modal-box'); return b.scrollWidth > b.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1; });
    chk('(control) formulario, Mis pedidos y la ficha entran en 360 px sin correr de costado', !fForm && !fMis && !fFicha, { form:fForm, mis:fMis, ficha:fFicha });
  });

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
