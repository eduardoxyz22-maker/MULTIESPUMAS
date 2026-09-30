/* ⏱️ UNA LECTURA QUE ES LA COPIA VIEJA DE 20 s DE `doGet` NO BORRA NADA DE LA PANTALLA (28/09, 2ª revisión antes de publicar).

   Lo encontró la revisión de los arreglos de Codex (§4gl) antes de publicarlos. El panel da por borrado un pedido que
   confirmó y que una lectura pedida DESPUÉS ya no trae (`localManda` → `borradoFuera`). Pero:
   · Google a veces convierte el POST del panel en un GET (§4fx) y contesta `doGet`;
   · `doGet` sale de una caché de 20 s (§4du), y un `doGet` que empezó a leer la hoja ANTES de un guardado y terminó
     DESPUÉS deja ahí la planilla de antes (`getCacheOlvidar_` ya había corrido);
   · con los servidores 26-a y 28-a esa copia tiene la MISMA forma que una lectura buena: no hay cómo distinguirla.
   Resultado, con la página de `7f4a74e`: el pedido recién cargado salía de la pantalla con «lo borraron desde otro
   equipo», y si la vendedora lo corregía enseguida, «tu cambio NO se guardó… hacelo como pedido nuevo» — un duplicado.
   Con la página publicada (`2040720`) no pasaba: conservaba 90 s todo lo guardado acá.

   El arreglo: lo confirmado acá hace menos de `LECTURA_VIEJA_MS` (45 s) que la lectura no trae se conserva; pasado ese
   tiempo, un borrado de verdad se detecta como en §4gl. Lo que cuida esta prueba:
   1. el pedido nuevo sigue en pantalla, sin aviso, aunque la lectura siguiente sea la copia vieja;
   2. su corrección enseguida (con la relectura de antes de guardar) se guarda;
   3. un retiro de plata recién guardado tampoco desaparece;
   4. un borrado DE VERDAD: dentro de la ventana no se da por borrado (a propósito: no se distingue de la copia vieja);
      pasada la ventana, la primera lectura que no lo trae es solo una SOSPECHA (se relee sola) y la que se pide
      `BORRADO_CONFIRMA_MS` después lo saca y lo dice (revisión de Codex a §18);
   5. el caso de Codex: un `doGet` LENTO deja su copia vieja en la caché tarde, y la lectura de 46 s después la trae. Con
      la ventana sola lo daba por borrado; con la sospecha, la lectura que confirma ya es fresca y el pedido se queda;
   6. la ventana y la confirmación cubren la caché del servidor (`GET_CACHE_SEG`) más lo que tarda en leer la hoja.

   El panel de verdad contra el google-apps-script.gs de verdad (en Node, con una planilla de mentira), como
   test_codex28_flujos.js. Reloj CLAVADO en el miércoles 16/09/2026 a las 10 de Bolivia.

   Se corre:  node tests/test_lectura_vieja.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_7f4a74e.html node tests/test_lectura_vieja.js   (1, 2 y 3 fallan)
              PEDIDOS=/ruta/a/pedidos_2040720.html node tests/test_lectura_vieja.js   (4 y 5 fallan: no detectaba borrados)
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';

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
  /* El POST del panel que Google convirtió en GET (§4fx): contesta `doGet`, con su caché de 20 s (§4du). */
  const get = () => ctx.doGet({ parameter:{ _:'1' }, queryString:'_=1', pathInfo:'' })._t;
  /* Lo que leyó un `doGet` que empezó ANTES de un guardado (la carrera): la planilla de ese momento. */
  const foto = () => ctx.jsonTexto_({ ok:true, version:ctx.SCRIPT_VERSION, pedidos:ctx.readAll() });
  const fila = (id) => { const r = sh._datos.find(f => f[0]===id); return r ? ctx.rowToRec_(r) : null; };
  const borrar = (id, rev) => JSON.parse(post(JSON.stringify({ action:'delete', id:id, rev:rev })));
  return { ctx, sh, post, get, foto, fila, borrar };
}

/* (30/09, §4he) `sinHora`: las respuestas pierden `ahora`/`huella`/`n` en el camino, como las de un servidor de antes del
   2026-09-30-a. Así esta prueba sigue cuidando lo que el panel hace SIN la hora de Google (la ventana y la sospecha), que es lo
   que corre mientras el servidor nuevo no esté implementado, o si se vuelve atrás. Con la hora, lo nuevo (ver el 4). */
function INIT(sinHora){
  window.__sinHora = !!sinHora;
  window.__ctl = { rules: [], log: [] };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.esperar = function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.quieto = async function(max){ max=max||200; for(var i=0;i<max;i++){ await esperar(50); if(typeof SAVE_EN_VUELO==='undefined' || (!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length)) break; } await esperar(80); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}', P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save';
    window.__ctl.log.push({ act: act, id: String((P.pedido && P.pedido.id) || P.id || '') });
    var resp = function(t){
      if(window.__sinHora){ try{ var j0=JSON.parse(t); delete j0.ahora; delete j0.huella; delete j0.n; t=JSON.stringify(j0); }catch(e){} }
      return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){ var r = window.__ctl.rules[i]; if (r.n > 0 && r.act === act) { rule = r; r.n--; break; } }
    if (rule && rule.mode === 'get') return window.__gsGet().then(resp);          // Google contestó con doGet
    return window.__gs(body).then(resp);
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  let SIN_HORA = false;                                   // (30/09) la vuelta de las pruebas: con o sin la hora de Google
  const abrir = async (S) => {
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (b) => S.post(b));
    await context.exposeFunction('__gsGet', () => S.get());
    await context.addInitScript(INIT, SIN_HORA);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
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
  /* Carga un pedido NUEVO con el formulario, como la vendedora. Devuelve su id. */
  const cargar = (P, nombre) => P.evaluate(async (nombre) => {
    showView('form'); await esperar(150); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=nombre;
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-nota').value=String(2000+Math.floor(Math.random()*900));
    document.getElementById('f-fecha').value='2026-09-21';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
    document.getElementById('f-saldo').value='3000';
    submitPedido(); await esperar(1500); await quieto(); try{ closeModal(); }catch(e){}
    var p=STATE.filter(function(x){ return x.cliente===nombre; })[0];
    return p ? p.id : null;
  }, nombre);
  /* Lo que la vendedora ve y lo que se le avisa después de una lectura. `get`: esa lectura la contesta `doGet`. */
  const releer = (P, id, get) => P.evaluate(async (a) => {
    window._toasts=[];
    if(a.get) __regla({ act:'list', mode:'get' });
    await refrescarEstado(); await esperar(150);
    return { enPantalla:!!findById(a.id), avisos:window._toasts.filter(function(t){ return /ya no está en la planilla|borraron desde otro equipo/.test(t); }) };
  }, { id:id, get:!!get });

  /* (30/09, §4he) Dos vueltas: con el servidor nuevo (dice la hora de cada lectura y de cada guardado) y como con un servidor
     de antes (sin la hora: la ventana y la sospecha, que siguen hasta que se implemente el nuevo, o si se vuelve atrás). */
  for (const modo of [false, true]) {
  SIN_HORA = modo;
  const TAG = modo ? ' [sin la hora de Google, como un servidor de antes]' : ' [servidor 2026-09-30-a, con la hora]';
  // ══ 1. PEDIDO NUEVO + LA LECTURA SIGUIENTE ES LA COPIA VIEJA ══════════════════════════════════════════════
  await esc('1. Pedido nuevo, y la lectura siguiente es la copia de 20 s de antes del guardado'+TAG, async () => {
    const S = servidor(); const A = await abrir(S);
    const vieja = S.foto();                              // un doGet (de afuera) leyó la hoja ANTES del guardado…
    const id = await cargar(A, 'RECIEN CARGADO');
    S.ctx.getCacheGuardar_(vieja);                       // …y escribió la caché DESPUÉS de `getCacheOlvidar_` (la carrera)
    chk('(partida) el pedido está en la planilla', !!(id && S.fila(id)), id);
    chk('(partida) la copia de la caché es de antes: no lo trae', !JSON.parse(S.get()).pedidos.some(p => p.id===id));
    const r = await releer(A, id, true);
    chk('⏱️ el pedido que SÍ está en la planilla sigue en la pantalla', r.enPantalla===true, r);
    chk('…y no se avisa «lo borraron desde otro equipo»', r.avisos.length===0, r.avisos);
  });

  // ══ 2. LA CORRIGE ENSEGUIDA (MUEVE LA FECHA → RELEE ANTES DE GUARDAR) ════════════════════════════════════
  await esc('2. Lo corrige enseguida y la relectura de antes de guardar es la copia vieja'+TAG, async () => {
    const S = servidor(); const A = await abrir(S);
    const vieja = S.foto();
    const id = await cargar(A, 'EDITADO ENSEGUIDA');
    S.ctx.getCacheGuardar_(vieja);
    await A.evaluate(async (id) => { showView('mis'); await esperar(150); editPedido(id); await esperar(300); }, id);
    const r = await A.evaluate(async () => {
      window._toasts=[]; window.__ctl.log=[]; UNLOCKED=false;   // la vendedora (sin la clave) mueve la entrega: relee
      __regla({ act:'list', mode:'get' });
      document.getElementById('f-direccion').value='Calle corregida';
      document.getElementById('f-fecha').value='2026-09-22';
      submitPedido(); await esperar(1500); await quieto();
      return { saves:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length,
               avisos:window._toasts.filter(function(t){ return /borraron desde otro equipo/.test(t); }) };
    });
    const f = S.fila(id);
    chk('⏱️ la corrección de un pedido que existe se GUARDA', !!f && f.direccion==='Calle corregida' && f.fecha==='2026-09-22', { dir: f && f.direccion, fecha: f && f.fecha, saves:r.saves });
    chk('…sin «tu cambio NO se guardó… hacelo como pedido nuevo» (eso invitaba a cargarlo dos veces)', r.avisos.length===0, r.avisos);
    chk('…y en la planilla sigue siendo UN pedido', S.sh._datos.filter(x => x[4]==='EDITADO ENSEGUIDA').length===1, S.sh._datos.length);
  });

  // ══ 3. UN RETIRO DE PLATA RECIÉN GUARDADO ════════════════════════════════════════════════════════════════
  await esc('3. Un retiro recién guardado y la lectura siguiente es la copia vieja'+TAG, async () => {
    const S = servidor(); const A = await abrir(S);
    const vieja = S.foto();
    const r0 = await A.evaluate(async () => {
      var f=filaDeRetiro({ id:'__ret_lv1__', fecha:todayStr(), entrega:'Carola Chavez', retira:'Contabilidad', monto:500, notas:['11'], tipo:'Facturado', fotos:[], obs:'' });
      var res=await persistRetiro(f); await quieto();
      return { ok:!!(res && res.ok), esta:RETIROS.some(function(r){ return r.id==='__ret_lv1__'; }) };
    });
    S.ctx.getCacheGuardar_(vieja);
    chk('(partida) el retiro llegó a la planilla', r0.ok && !!S.fila('__ret_lv1__'), r0);
    const r = await A.evaluate(async () => {
      __regla({ act:'list', mode:'get' });
      await refrescarEstado(); await esperar(150);
      return RETIROS.some(function(r){ return r.id==='__ret_lv1__'; });
    });
    chk('⏱️ el retiro sigue en la lista de retiros (antes desaparecía, sin aviso)', r===true, r);
  });

  // ══ 4. UN BORRADO DE VERDAD ═══════════════════════════════════════════════════════════════════════════════
  await esc('4. Un borrado de verdad'+(SIN_HORA ? ': dentro de la ventana no se sabe; pasada, una lectura sospecha y la otra confirma' : ': la hora de Google dice si la lectura ya lo tenía')+TAG, async () => {
    const S = servidor(); const A = await abrir(S);
    const id = await cargar(A, 'BORRADO DE VERDAD');
    const f0 = S.fila(id);
    const d = S.borrar(id, f0 && f0.rev);                // otro equipo lo borra (con su sello)
    chk('(partida) otro equipo lo borró de la planilla', !!(d && d.ok) && !S.fila(id), d);
    if (!SIN_HORA) {
      /* (30/09, §4he) Con el servidor 2026-09-30-a: la lectura dice de cuándo es y el guardado cuándo quedó escrito (hora
         de Google). Se corre esa hora del guardado para no depender de cuánto tarda la prueba. */
      const horaGuardado = (ms) => A.evaluate((a) => { var u=SAVE_ULTIMO[a.id]; if(u) u.okAhora=a.ms; return !!u; }, { id:id, ms:ms });
      await horaGuardado(Date.now() + 10000);            // la lectura es ANTERIOR al guardado (una copia vieja, o relojes corridos)
      const dentro = await releer(A, id, false);
      chk('⏱️ una lectura ANTERIOR al guardado (según la hora de Google) lo conserva, sin aviso', dentro.enPantalla===true && dentro.avisos.length===0, dentro);
      await horaGuardado(Date.now() - 10000);            // la lectura es POSTERIOR al guardado: si no lo trae, lo borraron
      const fuera = await releer(A, id, false);
      const re = await A.evaluate(() => (typeof BORRADO_CONFIRMA_T!=='undefined') && !!BORRADO_CONFIRMA_T);
      chk('🗑 la primera lectura POSTERIOR lo saca de la pantalla y lo dice, sin sospecha ni segunda lectura', fuera.enPantalla===false && fuera.avisos.length===1 && re===false, { fuera, re });
      return;
    }
    const dentro = await releer(A, id, false);           // una lectura BUENA (POST), enseguida
    chk('⏱️ dentro de la ventana se conserva y no se avisa (no se distingue de la copia vieja: es a propósito)',
        dentro.enPantalla===true && dentro.avisos.length===0, dentro);
    const vent = await A.evaluate((id) => {              // pasa el tiempo: como si la confirmación fuera de hace un minuto
      if(typeof LECTURA_VIEJA_MS==='undefined') return null;
      var u=SAVE_ULTIMO[id]; if(u && u.okT!=null) u.okT-=LECTURA_VIEJA_MS+1000;
      return LECTURA_VIEJA_MS;
    }, id);
    const sosp = await releer(A, id, false);
    const re = await A.evaluate(() => (typeof BORRADO_CONFIRMA_T!=='undefined') && !!BORRADO_CONFIRMA_T);
    chk('🔁 pasada la ventana, la PRIMERA lectura que no lo trae es solo una sospecha: sigue en pantalla, sin aviso…',
        vent!=null && sosp.enPantalla===true && sosp.avisos.length===0, sosp);
    chk('…y se agenda sola otra lectura para confirmarlo', re===true, re);
    await A.evaluate((id) => {                           // pasan los 25 s de la confirmación
      if(typeof BORRADO_CONFIRMA_MS==='undefined') return;   // una página sin la confirmación (las de antes)
      var u=SAVE_ULTIMO[id]; if(u && u.faltaT!=null) u.faltaT-=BORRADO_CONFIRMA_MS+1000;
      if(BORRADO_CONFIRMA_T){ clearTimeout(BORRADO_CONFIRMA_T); BORRADO_CONFIRMA_T=null; }
    }, id);
    const fuera = await releer(A, id, false);
    chk('🗑 la lectura que confirma lo saca de la pantalla…', fuera.enPantalla===false, fuera);
    chk('…y lo dice: «ya no está en la planilla: lo borraron desde otro equipo»', fuera.avisos.length===1, fuera.avisos);
  });

  // ══ 5. LA COPIA VIEJA DE UN `doGet` LENTO (el caso de Codex) ════════════════════════════════════════════
  await esc('5. Un doGet LENTO deja la copia vieja tarde: la lectura de 46 s después no alcanza para borrar'+TAG, async () => {
    const S = servidor(); const A = await abrir(S);
    const vieja = S.foto();                              // un doGet empezó a leer ANTES del guardado…
    const id = await cargar(A, 'DOGET LENTO');
    await A.evaluate((id) => { var u=SAVE_ULTIMO[id]; if(u && u.okT!=null) u.okT-=46000; }, id);   // …pasaron 46 s
    S.ctx.getCacheGuardar_(vieja);                       // …y recién ahora terminó y dejó su copia vieja en la caché
    const r1 = await releer(A, id, true);                // la lectura del panel, convertida en GET: la copia vieja
    chk('(partida) la planilla lo tiene y la caché no', !!S.fila(id) && !JSON.parse(S.get()).pedidos.some(p => p.id===id));
    chk('🔁 la lectura con la copia vieja, 46 s después: sigue en pantalla y sin «lo borraron» (Codex: antes lo borraba)',
        r1.enPantalla===true && r1.avisos.length===0, r1);
    S.ctx.getCacheOlvidar_();                            // la copia vence (20 s)…
    await A.evaluate((id) => { if(typeof BORRADO_CONFIRMA_MS==='undefined') return;
      var u=SAVE_ULTIMO[id]; if(u && u.faltaT!=null) u.faltaT-=BORRADO_CONFIRMA_MS+1000;
      if(BORRADO_CONFIRMA_T){ clearTimeout(BORRADO_CONFIRMA_T); BORRADO_CONFIRMA_T=null; } }, id);
    const r2 = await releer(A, id, true);                // …y la lectura que confirma (también por GET) ya es fresca
    const sos = await A.evaluate((id) => { var u=(typeof SAVE_ULTIMO!=='undefined') ? SAVE_ULTIMO[id] : null; return u ? (u.faltaT==null) : null; }, id);
    chk('…la lectura que confirma lo trae: sigue en pantalla, sin aviso, y la sospecha se borra', r2.enPantalla===true && r2.avisos.length===0 && sos===true, { r2, sos });
  });

  }

  // ══ 6. LA VENTANA ALCANZA ═════════════════════════════════════════════════════════════════════════════════
  await esc('6. La ventana cubre la caché del servidor y lo que tarda en leer la hoja', async () => {
    const S = servidor(); const A = await abrir(S);
    const v = await A.evaluate(() => (typeof LECTURA_VIEJA_MS==='undefined') ? null : LECTURA_VIEJA_MS);
    const seg = Number(S.ctx.GET_CACHE_SEG);
    /* `doGet` tarda 3-5 s en leer la hoja entera (§4du). Si alguien sube `GET_CACHE_SEG`, esto avisa que la ventana del
       panel también tiene que subir. */
    chk('LECTURA_VIEJA_MS ≥ GET_CACHE_SEG + 10 s', v!=null && seg>0 && v >= (seg+10)*1000, { LECTURA_VIEJA_MS:v, GET_CACHE_SEG:seg });
    const c = await A.evaluate(() => (typeof BORRADO_CONFIRMA_MS==='undefined') ? null : BORRADO_CONFIRMA_MS);
    chk('BORRADO_CONFIRMA_MS ≥ GET_CACHE_SEG + 5 s (la segunda lectura no puede ser la misma copia)', c!=null && c >= (seg+5)*1000, { BORRADO_CONFIRMA_MS:c, GET_CACHE_SEG:seg });
  });

  chk('ningún error de JavaScript en las páginas', errores.length===0, errores.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
