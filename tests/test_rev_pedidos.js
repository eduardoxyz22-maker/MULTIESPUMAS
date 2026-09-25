/* 🔎 REVISIÓN DE PEDIDOS (25/09): lo que se carga, se guarda, se encola y se borra.

   Panel de verdad contra el google-apps-script.gs de verdad (cargado en Node con una planilla
   de mentira, como test_concurrencia.js): el `fetch` del panel entra por `doPost`, así que el
   ida y vuelta pasa por `recToRow`/`rowToRec_`, el sello, los porteros y la OC del servidor.
   Cada página acepta REGLAS para sus próximos pedidos al servidor:
     · 'drop'   — no llega (sin red);
     · 'lose'   — el servidor lo procesa y la respuesta se pierde (el 404 del redirect, §4fa);
     · 'hold'   — queda en el aire hasta `__soltar(nombre)`, y ahí llega;
     · 'tarde'  — el servidor contesta YA (la foto de ese momento) y la respuesta llega al soltarla.

   ⚠️ El reloj de la página está CLAVADO (`page.clock.setFixedTime`) en el miércoles 16/09/2026 a
   las 10 de Bolivia: las fechas de entrega de los fixtures son fijas y no se pudren con el
   calendario. Con el reloj quieto, `saveReciente` (90 s) no vence solo: donde hace falta que
   pase el rato, la prueba corre la hora de `SAVE_ULTIMO` para atrás.

   Se corre:  node tests/test_rev_pedidos.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev_pedidos.js
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
    page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
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

  // ══ 1. LA COLA NO PISA LO QUE ENTRA MIENTRAS SE MANDA ═════════════════════════════════
  await esc('1. Un cambio que entra a la cola MIENTRAS la cola se está mandando', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'q1', cliente:'UNO', oc:'09-001' }));
    S.guardar(pedido({ id:'q2', cliente:'DOS', oc:'09-002', fecha:'2026-09-18' }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      // sin señal: el chofer marca entregado q1 → a la cola
      __regla({ act:'save', id:'q1', mode:'drop', n:2 });
      var p1=findById('q1'); p1.entregado=true; persistPedido(p1); await esperar(2500); await quieto();
      var antes=getPending().map(function(x){ return x.id; });
      // vuelve la señal: se manda la cola, y el servidor tarda con q1
      __regla({ act:'save', id:'q1', mode:'hold', name:'H1' });
      var fl=flushPending(); await esperar(300);
      // mientras tanto otro cambio (q2) tampoco llega → a la cola
      __regla({ act:'save', id:'q2', mode:'drop', n:2 });
      var p2=findById('q2'); p2.observaciones='CAMBIO DE Q2 MIENTRAS SE MANDABA LA COLA'; persistPedido(p2); await esperar(2500);
      var durante=getPending().map(function(x){ return x.id; });
      __soltar('H1'); await fl; await quieto();
      var despues=getPending().map(function(x){ return x.id; });
      await flushPending(); await quieto();
      return { antes:antes, durante:durante, despues:despues, final:getPending().map(function(x){ return x.id; }),
               aviso:window._toasts.filter(function(t){ return /DOS/.test(t); })[0]||'' };
    });
    chk('el cambio de q2 quedó en la cola mientras se mandaba q1 (el panel dijo «se manda solo»)', r.durante.indexOf('q2')>=0 && /cola/.test(r.aviso), r);
    chk('⚠️ al terminar de mandar q1, q2 SIGUE en la cola (antes la cola se reemplazaba y q2 se borraba sin mandarse)', r.despues.indexOf('q2')>=0 && r.despues.indexOf('q1')<0, r.despues);
    chk('…y con la próxima vuelta llega a la planilla', S.fila('q2').observaciones==='CAMBIO DE Q2 MIENTRAS SE MANDABA LA COLA' && r.final.length===0, { obs:S.fila('q2').observaciones, cola:r.final });
    chk('…y q1 también llegó (entregado)', S.fila('q1').entregado===true);
  });

  await esc('1b. Lo que falla o rebota en la vuelta sigue como siempre', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'f1', cliente:'FALLA', oc:'09-001' }));
    S.guardar(pedido({ id:'f2', cliente:'RECHAZO', oc:'09-002', fecha:'2026-09-18' }));
    const A = await abrir(S);
    // Otro dispositivo guarda f2 después: el de la cola choca (conflicto = «no» firme, sale de la cola).
    const r = await A.evaluate(async () => {
      __regla({ act:'save', mode:'drop', n:4 });
      var a=findById('f1'); a.observaciones='f1 sin señal'; persistPedido(a);
      var b=findById('f2'); b.observaciones='f2 sin señal'; persistPedido(b);
      await esperar(3500); await quieto();
      return getPending().map(function(x){ return x.id; }).sort();
    });
    const f2 = S.fila('f2'); f2.observaciones = 'OTRO DISPOSITIVO'; S.guardar(f2);
    const r2 = await A.evaluate(async () => {
      __regla({ act:'save', id:'f1', mode:'drop', n:2 });      // f1 vuelve a fallar
      await flushPending(); await quieto();
      return getPending().map(function(x){ return x.id; });
    });
    chk('las dos quedaron en la cola sin señal', JSON.stringify(r)===JSON.stringify(['f1','f2']), r);
    chk('la que vuelve a fallar se queda en la cola; la rechazada en firme sale', JSON.stringify(r2)===JSON.stringify(['f1']), r2);
    chk('…y la rechazada no pisó lo del otro dispositivo', S.fila('f2').observaciones==='OTRO DISPOSITIVO', S.fila('f2').observaciones);
  });

  // ══ 2. EL BORRADOR DE KOMMO COMPLETADO QUE QUEDÓ EN LA COLA ═════════════════════════════
  await esc('2. Completar un borrador sin señal, y después tocar «Descartar»', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'kommo-900', cliente:'VENTA DE KOMMO', estado:'Borrador Kommo', fecha:'', turno:'', zona:'', nota:'', nroDia:0 }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar'; renderMis(); await esperar(150);
      window.__srvBorrador=JSON.parse(JSON.stringify(borradorDe('kommo-900')));
      completarBorrador('kommo-900'); await esperar(250);
      document.getElementById('f-fecha').value='2026-09-21';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='3003';
      __regla({ act:'save', mode:'drop', n:20 });        // sin señal: no sale nada…
      __regla({ act:'list', mode:'drop', n:20 });        // …ni se puede releer la planilla
      submitPedido(); await esperar(7000); await quieto();
      try{ closeModal(); }catch(e){}
      var o={ cola:getPending().map(function(x){ return x.id+':'+(x.estado||'pedido'); }),
              bandeja:BORRADORES.map(function(b){ return b.id; }) };
      // pasa el rato (más de los 90 s de `saveReciente`), vuelve la lectura pero el guardado sigue sin salir
      for(var k in SAVE_ULTIMO) SAVE_ULTIMO[k].t -= 100000;
      window.__ctl.rules=window.__ctl.rules.filter(function(x){ return x.act!=='list'; });
      await refrescarEstado(); renderMis(); await esperar(150);
      o.bandeja2=BORRADORES.map(function(b){ return b.id; });
      o.enState=STATE.filter(function(p){ return p.id==='kommo-900'; }).map(function(p){ return (p.estado||'pedido')+' '+p.fecha+' '+p.nota; });
      o.tarjeta=/le falta la entrega/.test((document.getElementById('mis-borradores')||{}).textContent||'');
      // otra pestaña, con la bandeja de antes, todavía muestra la tarjeta: la vendedora toca «Descartar»
      var srv=JSON.parse(JSON.stringify(window.__srvBorrador));
      BORRADORES=BORRADORES.filter(function(b){ return b.id!=='kommo-900'; }).concat([srv]);
      window.__ctl.log=[]; window._toasts=[];
      descartarBorrador('kommo-900'); await esperar(3000); await quieto();
      o.colaTrasDescartar=getPending().map(function(x){ return x.id+':'+(x.estado||'pedido'); });
      o.borrados=window.__ctl.log.filter(function(x){ return x.act==='delete'; }).length;
      o.aviso=window._toasts.join(' | ');
      // vuelve la señal
      window.__ctl.rules=[];
      await flushPending(); await refrescarEstado(); await quieto();
      o.final=STATE.filter(function(p){ return p.id==='kommo-900'; }).map(function(p){ return (p.estado||'pedido')+' '+p.fecha+' '+p.nota; });
      o.bandejaFinal=BORRADORES.map(function(b){ return b.id; });
      return o;
    });
    const f = S.fila('kommo-900');
    chk('el borrador completado quedó en la cola, como pedido', JSON.stringify(r.cola)===JSON.stringify(['kommo-900:pedido']), r.cola);
    chk('⚠️ y sale de la bandeja en el momento, como cuando se guarda bien (antes seguía «le falta la entrega»)', r.bandeja.indexOf('kommo-900')<0, r.bandeja);
    chk('⚠️ pasado el rato, la planilla todavía trae el borrador y NO vuelve a la bandeja mientras la venta espera en la cola', r.bandeja2.indexOf('kommo-900')<0 && !r.tarjeta, { bandeja:r.bandeja2, tarjeta:r.tarjeta });
    chk('…y la venta completada se sigue viendo como pedido', JSON.stringify(r.enState)===JSON.stringify(['pedido 2026-09-21 3003']), r.enState);
    chk('⚠️ «Descartar» (desde una bandeja vieja) NO saca la venta de la cola ni la borra de la planilla', JSON.stringify(r.colaTrasDescartar)===JSON.stringify(['kommo-900:pedido']) && r.borrados===0, r);
    chk('…y dice por qué', /ya la completaste/.test(r.aviso), r.aviso);
    chk('⚠️ con señal, la venta llega a la planilla completa (fecha, nota, ya no es borrador)', f && f.fecha==='2026-09-21' && f.nota==='3003' && f.estado==='', f && { fecha:f.fecha, nota:f.nota, estado:f.estado });
    chk('⚠️ …y Kommo NO la tiene anotada como descartada', !S.props().KOMMO_DESCARTADOS, S.props().KOMMO_DESCARTADOS);
    chk('…y no quedó ni en la bandeja ni repetida', JSON.stringify(r.final)===JSON.stringify(['pedido 2026-09-21 3003']) && r.bandejaFinal.indexOf('kommo-900')<0, r);
  });

  // ══ 3. EL COMPROBANTE DEL ADELANTO GUARDADO COMO MÉTODO SUELTO ══════════════════════════
  /* Toda venta NUEVA con «A cuenta» se guarda así: `QR BISA %IMG1 %IMG2` (el método suelto, con
     la captura y el recibo). Y una «PAGADA sin monto»: `Efectivo %IMG`. */
  await esc('3. Abrir para editar una venta con adelanto (método suelto) y salir, o guardar sin tocar', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'a1', cliente:'ADELANTO CON DOS IMAGENES', oc:'09-001', metodoPago:'QR BISA %IMGA1 %IMGA2', acuenta:700, saldo:2300 }));
    S.guardar(pedido({ id:'a2', cliente:'PAGADA SIN MONTO', oc:'09-002', metodoPago:'Efectivo %IMGE1', pagado:true, saldo:0, acuenta:0, fecha:'2026-09-18' }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      var o={};
      showView('mis'); await esperar(150);
      window.__ctl.log=[];
      editPedido('a1'); await esperar(250);
      o.form=compsArr(FORM_COMPS);
      o.sinPegar=imagenesSinPegar();
      showView('mis'); await esperar(400);                       // se arrepiente: vuelve sin guardar
      editPedido('a2'); await esperar(250);
      o.sinPegar2=imagenesSinPegar();
      showView('mis'); await esperar(400);
      o.borradas=window.__ctl.log.filter(function(x){ return x.act==='borrarFoto'; }).map(function(x){ return x.id; });
      return o;
    });
    chk('el formulario abre con las DOS imágenes del adelanto (antes solo la primera)', JSON.stringify(r.form)===JSON.stringify(['IMGA1','IMGA2']), r.form);
    chk('⚠️ las imágenes que la venta YA tenía no cuentan como «subidas y sin pegar»', !r.sinPegar.length && !r.sinPegar2.length, r);
    chk('⚠️ salir del formulario sin guardar no pregunta ni manda a la papelera el comprobante del pago', !A.__dialogos.length && !r.borradas.length, { dialogos:A.__dialogos.map(d=>d.slice(0,50)), borradas:r.borradas });
    const r2 = await A.evaluate(async () => {
      window._toasts=[];
      editPedido('a1'); await esperar(250); submitPedido(); await esperar(500); await quieto(); try{ closeModal(); }catch(e){}
      return window._toasts.filter(function(t){ return /^err/.test(t); });
    });
    chk('⚠️ guardar sin tocar nada deja las DOS imágenes en la planilla (antes se perdía la segunda)', S.fila('a1').metodoPago==='QR BISA %IMGA1 %IMGA2', S.fila('a1').metodoPago);
    chk('…sin ningún aviso rojo', !r2.length, r2);
    // La guarda de fondo: aunque algún camino futuro liste una imagen que un pedido SÍ usa, no se borra.
    const r3 = await A.evaluate(async () => {
      showView('form'); await esperar(150); resetForm();
      FORM_COMPS=['IMGA1','IMGNUEVA'];
      window.__ctl.log=[];
      showView('mis'); await esperar(400);
      return window.__ctl.log.filter(function(x){ return x.act==='borrarFoto'; }).map(function(x){ return x.id; });
    });
    chk('⚠️ la imagen que usa OTRO pedido nunca va a la papelera (§4fy); la huérfana de verdad, sí', JSON.stringify(r3)===JSON.stringify(['IMGNUEVA']), r3);
  });

  // ══ 4. LA OC QUE EL SERVIDOR RENUMERÓ, CON LA RESPUESTA PERDIDA ══════════════════════════
  /* Lo que §4fd dejó como PLAUSIBLE: la bajada de último momento no llega (4 s de tope) y el panel
     numera con su copia vieja → 09-002, que otra vendedora ya usó. El servidor la pasa a 09-003 y
     esa respuesta es la que se pierde (el 404 del redirect, §4fa). El reintento choca con su propia
     fila y es un «ok tardío»… que traía la OC de la planilla y el panel no la miraba. */
  await esc('4. OC renumerada por el servidor y respuesta perdida', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'x1', cliente:'PRIMERO', oc:'09-001', ts:TS('2026-09-16','08:00') }));
    const A = await abrir(S);
    S.guardar(pedido({ id:'x2', cliente:'OTRA VENDEDORA', oc:'09-002', ts:TS('2026-09-16','09:00'), fecha:'2026-09-18' }));   // este dispositivo no la vio
    const r = await A.evaluate(async () => {
      __regla({ act:'list', mode:'drop' });           // la bajada de último momento no llega
      __regla({ act:'save', mode:'lose' });           // el servidor guarda (y renumera) y la respuesta se pierde
      showView('form'); await esperar(150); resetForm();
      document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
      document.getElementById('f-cliente').value='CLIENTE NUEVO';
      document.getElementById('f-celular').value='70000001';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='2002';
      document.getElementById('f-fecha').value='2026-09-21';
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      submitPedido(); await esperar(4500); await quieto();
      var p=STATE.filter(function(x){ return x.cliente==='CLIENTE NUEVO'; })[0];
      var modal=(document.getElementById('modal').textContent||'').replace(/\s+/g,' ');
      try{ closeModal(); }catch(e){}
      return { id:p&&p.id, oc:p&&p.oc, modal:modal, toasts:window._toasts.slice() };
    });
    const srv = S.fila(r.id);
    chk('el servidor la guardó con el número libre (09-003)', srv && srv.oc==='09-003', srv && srv.oc);
    chk('⚠️ el panel se queda con la OC de la planilla, no con la de otra vendedora', r.oc==='09-003', r.oc);
    chk('⚠️ el mensaje para el grupo sale con 09-003, no con 09-002', /OC 09-003/.test(r.modal) && !/OC 09-002/.test(r.modal), r.modal.slice(0,160));
    chk('…y se avisa que la OC cambió', r.toasts.some(function(t){ return /09-002/.test(t) && /09-003/.test(t); }), r.toasts);
    const r2 = await A.evaluate(async (id) => {
      window._toasts=[];
      showView('admin'); await esperar(150); editPedido(id); await esperar(250);
      document.getElementById('f-obs').value='llamar antes';
      submitPedido(); await esperar(600); await quieto(); try{ closeModal(); }catch(e){}
      return window._toasts.filter(function(t){ return /^err/.test(t); });
    }, r.id);
    chk('⚠️ la edición siguiente entra (antes rebotaba con «la OC 09-002 ya la tiene OTRA VENDEDORA»)', S.fila(r.id).observaciones==='llamar antes' && !r2.length, { obs:S.fila(r.id).observaciones, rojos:r2 });
    chk('…y la de la otra vendedora sigue con su 09-002', S.fila('x2').oc==='09-002');
  });

  // ══ 5. LA UBICACIÓN DE MAPS: LO QUE SE ESCRIBE ES LO QUE QUEDA ══════════════════════════
  await esc('5. «Ubicación de Google Maps» que el panel no entiende, y editar sin tocarla', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'m1', cliente:'MAPS VIEJO', oc:'09-001', maps:'maps.app.goo.gl/abcDEF123' }));
    S.guardar(pedido({ id:'m2', cliente:'COORDS CRUDAS REVISADO', oc:'09-002', fecha:'2026-09-18', maps:'-17.781234, -63.181234', verificado:true, estado:'En stock',
                       productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000, chk:'ok'}] }));
    const A = await abrir(S);
    const nuevo = (maps) => A.evaluate(async (maps) => {
      window._toasts=[]; window.__ctl.log=[];
      showView('form'); await esperar(150); resetForm();
      document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
      document.getElementById('f-cliente').value='CLIENTE MAPS '+maps.length;
      document.getElementById('f-celular').value='70000001';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='2002';
      document.getElementById('f-fecha').value='2026-09-21';
      document.getElementById('f-maps').value=maps;
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      submitPedido(); await esperar(700); await quieto();
      var p=STATE.filter(function(x){ return x.cliente==='CLIENTE MAPS '+maps.length; })[0];
      var o={ guardados:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length, maps:p?p.maps:null,
              marcado:document.getElementById('f-maps').classList.contains('err'), toasts:window._toasts.slice() };
      try{ closeModal(); }catch(e){}
      return o;
    }, maps);
    let r = await nuevo('maps.app.goo.gl/xyzABC');
    chk('⚠️ un enlace sin «https://» NO se guarda vacío en silencio: se frena y se marca el campo', r.guardados===0 && r.marcado && r.maps===null, r);
    chk('…y se dice qué sirve', r.toasts.some(function(t){ return /Maps/.test(t) && /coordenadas/.test(t); }), r.toasts);
    r = await nuevo('Mi casa https://maps.app.goo.gl/xyzABC');
    chk('⚠️ un texto con el enlace adentro tampoco se pierde callado', r.guardados===0 && r.marcado, r);
    r = await nuevo('-17.781234, -63.181234');
    chk('las coordenadas se siguen guardando como enlace', r.guardados===1 && r.maps==='https://www.google.com/maps?q=-17.781234,-63.181234', r);
    // editar sin tocar la ubicación
    const ed = (id) => A.evaluate(async (id) => {
      window._toasts=[];
      showView('admin'); await esperar(150); editPedido(id); await esperar(250);
      document.getElementById('f-obs').value='corregida la observación';
      submitPedido(); await esperar(600); await quieto(); try{ closeModal(); }catch(e){}
      return window._toasts.filter(function(t){ return /^err/.test(t); });
    }, id);
    await ed('m1');
    chk('⚠️ editar otra cosa NO le borra la ubicación vieja que el panel no entiende (antes quedaba vacía)', S.fila('m1').maps==='maps.app.goo.gl/abcDEF123' && S.fila('m1').observaciones==='corregida la observación', S.fila('m1').maps);
    await ed('m2');
    const m2 = S.fila('m2');
    chk('⚠️ ni reescribe las coordenadas crudas…', m2.maps==='-17.781234, -63.181234', m2.maps);
    chk('⚠️ …ni le salta a logística un falso «MODIFICADO: cambió la ubicación»', !(m2.productos[0]||{}).mod && m2.verificado===true, (m2.productos[0]||{}).mod);
  });

  // ══ 6. EDITAR SIN TOCAR NADA NO CAMBIA NADA ════════════════════════════════════════════
  /* Cada forma de pedido que anda por la planilla: se abre con ✏️, se guarda sin tocar nada y la
     fila tiene que quedar IGUAL, columna por columna (menos el sello). Pasa por `recToRow` y
     `rowToRec_` del .gs de verdad. Quedan afuera, a propósito, lo que ya tiene su prueba y cambia
     por diseño: la ATC (el formulario completa sus piezas en `false`), la RPT (el renglón sin tipo
     toma «Reposición») y la «PAGADA sin monto» (el formulario pide el monto antes de guardar). */
  await esc('6. Editar sin tocar nada, forma por forma', async () => {
    const S = servidor();
    const DIAS = ['2026-09-17','2026-09-18','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
    const CASOS = [
      pedido({ id:'e01', cliente:'ADELANTO SUELTO', metodoPago:'Efectivo', acuenta:500, saldo:2500 }),
      pedido({ id:'e02', cliente:'ADELANTO QR DOS IMAGENES', metodoPago:'QR BISA %IMGA1 %IMGA2', acuenta:700, saldo:2300 }),
      pedido({ id:'e03', cliente:'PAGADO CON HISTORIAL', metodoPago:'~QR BISA 3000 @2026-09-15 #1001 %IMGB1', pagado:true, saldo:0 }),
      pedido({ id:'e04', cliente:'MIXTO PAGADO', metodoPago:'~Efectivo 2000 @2026-09-15 #1001 + Tarjeta 1000 @2026-09-15 #1001 %IMGC1', pagado:true, saldo:0 }),
      pedido({ id:'e05', cliente:'ADELANTO Y COBRO', metodoPago:'~Efectivo 500 @2026-09-10 #1001 + QR BISA 2500 @2026-09-15 #1750 %IMGD1', pagado:true, saldo:0, acuenta:500 }),
      pedido({ id:'e06', cliente:'FLETE PACTADO', metodoPago:'Efectivo + ^50', acuenta:500, saldo:2500 }),
      pedido({ id:'e07', cliente:'FLETE COBRADO', metodoPago:'~Efectivo 500 @2026-09-10 #1001 + ^Efectivo 50 @2026-09-15 #1001', acuenta:500, saldo:2500 }),
      pedido({ id:'e08', cliente:'FLETE PARCIAL', metodoPago:'~Efectivo 500 @2026-09-10 #1001 + ^Efectivo 40 @2026-09-15 #1001 + ^60', acuenta:500, saldo:2500 }),
      pedido({ id:'e09', cliente:'REGISTRADO', metodoPago:'~Efectivo 500 @2026-09-10 #1001 · REGISTRADO', acuenta:500, saldo:2500 }),
      pedido({ id:'e10', cliente:'CHOFER RECIBIO', metodoPago:'~Efectivo 600 @2026-09-10 #1001 >Luis Pierre', acuenta:600, saldo:2400 }),
      pedido({ id:'e11', cliente:'SIN PAGO' }),
      pedido({ id:'e12', cliente:'MARCAS DE LOGISTICA', verificado:true, estado:'En producción',
               productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000, chk:'no', enProd:true, prodEn:'Moreno', prodF:'2026-09-12'},
                          {desc:'ALMOHADA', medida:'50x70', codigo:'CD1403', cant:2, precio:100, chk:'im', chkDe:'01-05-025  Almacen Distribucion Banzer'},
                          {desc:'SOMIER ORO', medida:'140x190', codigo:'CH1144', cant:1, precio:900, chk:'ok', enProd:true, prodEn:'Multiespumas', prodF:'2026-09-10', prodR:'2026-09-13'}] }),
      pedido({ id:'e13', cliente:'MEDIDAS RARAS', productos:[{desc:'COLCHON ESPECIAL', medida:'150x200', codigo:'', cant:1, precio:2000},{desc:'SOMIER', medida:'2 plz', codigo:'', cant:1},{desc:'PILLOW', medida:'160X190', codigo:'', cant:3}] }),
      pedido({ id:'e14', cliente:'MAPS LINK', maps:'https://maps.app.goo.gl/abcDEF123' }),
      pedido({ id:'e15', cliente:'MAPS APROX', maps:'https://www.google.com/maps?q=-17.78,-63.18&aprox=1' }),
      pedido({ id:'e16', cliente:'ENTREGADO CON FOTOS', entregado:true, verificado:true, chofer:'Luis Pierre', vehiculo:'Camión 1', fotos:['FOTO1','FOTO2'], fecha:'2026-09-15', estado:'En stock' }),
      pedido({ id:'e17', cliente:'VENTA DE TIENDA', fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Carmelo', entregado:true, verificado:true,
               metodoPago:'~Efectivo 3000 @2026-09-15 #1001', pagado:true, saldo:0, nroDia:0 }),
      pedido({ id:'e18', cliente:'ROHO CLIENTE', vendedor:'ROHO', oc:'R-4455', nota:'', celular:'', saldo:0 }),
      pedido({ id:'e19', cliente:'EDUARDO CLIENTE', vendedor:'Eduardo Añez', nota:'', celular:'', saldo:0 }),
      pedido({ id:'e20', cliente:'KLEAD', productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000, klead:'555'}] }),
      pedido({ id:'e21', cliente:'YA MODIFICADO', verificado:true, productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000, chk:'ok', mod:{f:'2026-09-15', h:'10:00', q:'Mirian Salazar', d:['➕ X']}}] }),
      pedido({ id:'e22', cliente:'FECHA PASADA', fecha:'2026-09-10' }),
      pedido({ id:'e23', cliente:'GARANTIA Y FACTURA', garantia:'JUAN', facturarA:'EMPRESA SRL', nit:'1234567', observaciones:'llamar antes' }),
      pedido({ id:'e24', cliente:'TURNO PM', turno:'PM' })
    ];
    CASOS.forEach((c,i) => { c.oc = c.oc || ('09-'+String(100+i)); if(c.fecha==='2026-09-17') c.fecha=DIAS[i%DIAS.length]; const r=S.guardar(c); if(!r.ok) throw new Error('sembrar '+c.id+' '+JSON.stringify(r)); });
    const A = await abrir(S);
    const malos = [];
    for (const c of CASOS) {
      const antes = S.filaCruda(c.id);
      A.__dialogos.length = 0;
      const t = await A.evaluate(async (id) => {
        window._toasts=[]; showView('admin'); await esperar(120); editPedido(id); await esperar(200);
        submitPedido(); await esperar(250); await quieto(); try{ closeModal(); }catch(e){}
        return window._toasts.filter(function(x){ return /^err/.test(x); });
      }, c.id);
      const despues = S.filaCruda(c.id) || [];
      const dif = [];
      for (let i=0;i<S.HDR.length-1;i++) if (String(antes[i])!==String(despues[i])) dif.push(S.HDR[i]+': «'+String(antes[i]).slice(0,140)+'» → «'+String(despues[i]).slice(0,140)+'»');
      if (dif.length || t.length || A.__dialogos.length) malos.push({ id:c.id, cliente:c.cliente, dif:dif, rojos:t, dialogos:A.__dialogos.map(d=>d.slice(0,60)) });
    }
    malos.forEach(m => console.log('   · '+m.id+' '+m.cliente+': '+JSON.stringify(m).slice(0,700)));
    chk('⚠️ las '+CASOS.length+' formas de pedido quedan IGUALES en la planilla, sin avisos ni preguntas', !malos.length, malos.map(m=>m.id+' '+m.cliente).join(', '));
    const e12 = S.fila('e12');
    chk('⚠️ en particular, los sellos de fábrica (cuándo se pidió y cuándo llegó) siguen ahí (§4co)',
        e12.productos[0].prodF==='2026-09-12' && e12.productos[2].prodF==='2026-09-10' && e12.productos[2].prodR==='2026-09-13',
        e12.productos.map(x=>({prodF:x.prodF, prodR:x.prodR})));
  });

  // ══ 7. LOS BUSCADORES DE CONTABILIDAD Y ATC, SIN TILDES ═════════════════════════════════
  await esc('7. «gomez» encuentra a «GÓMEZ» en Contabilidad y en ATC, como en Administración', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'g1', cliente:'JOSÉ GÓMEZ', oc:'09-001', ts:TS('2026-09-15') }));
    S.guardar(pedido({ id:'g2', cliente:'OTRO CLIENTE', oc:'09-002', ts:TS('2026-09-15'), fecha:'2026-09-18' }));
    S.guardar(pedido({ id:'g3', cliente:'MARÍA PÉREZ', oc:'ATC 09-001', nota:'', ts:TS('2026-09-15'), fecha:'2026-09-21',
                       productos:[{desc:'COLCHÓN TITANIO', medida:'140x190', codigo:'CH1129', cant:1, atc:{mot:'Ruido', det:'hace ruido'}}] }));
    const A = await abrir(S);
    const r = await A.evaluate(async () => {
      var o={};
      showView('admin'); await esperar(150);
      document.getElementById('adm-search').value='gomez';
      o.admin=admFilter().map(function(p){ return p.id; });
      showView('conta'); await esperar(200);
      var cs=document.getElementById('cta-search');
      ['gomez','GOMEZ','gómez'].forEach(function(q){ cs.value=q; o['conta_'+q]=contaLista().map(function(p){ return p.id; }); });
      cs.value='';
      showView('atc'); await esperar(200);
      var as=document.getElementById('atc-search');
      ['perez','colchon'].forEach(function(q){ as.value=q; o['atc_'+q]=atcLista().map(function(p){ return p.id; }); });
      as.value='';
      return o;
    });
    chk('Administración ya lo encontraba (sinTildes, §4ew)', JSON.stringify(r.admin)===JSON.stringify(['g1']), r.admin);
    chk('⚠️ Contabilidad → Ventas encuentra «JOSÉ GÓMEZ» con «gomez», «GOMEZ» y «gómez» (y el Excel filtrado, que sale de esta lista)',
        ['gomez','GOMEZ','gómez'].every(q => JSON.stringify(r['conta_'+q])===JSON.stringify(['g1'])), r);
    chk('⚠️ la matriz de ATC encuentra «MARÍA PÉREZ» con «perez» y el «COLCHÓN» con «colchon»',
        JSON.stringify(r.atc_perez)===JSON.stringify(['g3']) && JSON.stringify(r.atc_colchon)===JSON.stringify(['g3']), r);
  });

  chk('sin errores de JavaScript en la página', !errores.length, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
