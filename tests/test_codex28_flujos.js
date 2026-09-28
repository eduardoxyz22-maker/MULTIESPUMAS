/* 🔎 LA REVISIÓN DE CODEX DEL 28/09, EN EL USO DE VERDAD: dos equipos contra el mismo servidor.

   `tests/test_codex28.cjs` (de Codex) prueba `mergePending` y `saldoVeredicto` llamándolos directo. Esta prueba hace
   lo mismo que haría el equipo: cargar con el formulario, borrar desde otra computadora, releer, guardar, la cola de
   un celular sin señal. El panel de verdad contra el google-apps-script.gs de verdad (en Node, con una planilla de
   mentira), con el banco de pruebas de test_rev5_pedidos.js.

   ⚠️ LO QUE CUIDA (cada punto falla contra lo publicado: página `2040720` y servidor 2026-09-26-a):
   1. 🗑 A carga un pedido y B lo borra: la lectura siguiente de A ya no lo muestra y lo dice (antes lo conservaba 90 s).
   2. 🗑 A lo tenía abierto para editar: al guardar, la lectura de antes de guardar ve que no está y NO lo guarda (antes
      lo volvía a CREAR en la planilla con la copia de antes).
   3. 🗑 Servidor 2026-09-28-a: un guardado con sello de una fila que ya no está se rechaza (`borrado`) — también desde
      la cola de un celular sin señal, y un retiro borrado. Las filas fijas del sistema sí vuelven a nacer, y un pedido
      nuevo (sin sello) o el reenvío de un alta cuya respuesta se perdió siguen como siempre.
   4. 🆕 Una revisión MÁS NUEVA que guardó otro equipo se ve en la lectura siguiente (antes se tapaba 90 s), y una lectura
      atrasada sigue sin pisar lo recién guardado acá.

   ⚠️ Reloj CLAVADO en el miércoles 16/09/2026 a las 10 de Bolivia (como test_rev5_pedidos): con el reloj quieto, «antes»
   y «después» no pueden salir de la hora — el panel usa un contador (`RED_N`), y esta prueba lo cuida.

   Se corre:  node tests/test_codex28_flujos.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2040720.html GS=/ruta/al/gs_2040720.gs node tests/test_codex28_flujos.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';
const TS = (d, h) => Date.parse(d + 'T' + (h||'10:00') + ':00-04:00');

/* ── El servidor: el .gs real con un Google de mentira (igual que test_rev5_pedidos.js) ── */
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
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  const borrar = (id, rev) => JSON.parse(post(JSON.stringify({ action:'delete', id:id, rev:rev })));
  return { ctx, sh, shR, post, fila, guardar, borrar };
}
const pedido = (o) => Object.assign({
  fecha:'2026-09-17', oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-09-15'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

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
    window.__ctl.log.push({ act: act, id: id });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var real = function(){ return window.__gs(body).then(resp); };
    var rule = null;
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) { rule = r; r.n--; break; }
    }
    if (!rule) return real();
    if (rule.mode === 'drop') return Promise.reject(new TypeError('Failed to fetch'));
    if (rule.mode === 'tarde') { var pr = window.__gs(body); return new Promise(function(res){ window.__ctl.holds[rule.name] = function(){ res(pr.then(resp)); }; }); }
    return real();
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
    page.__dialogos = []; page.__respuestas = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => { page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if (si) d.accept(); else d.dismiss(); });
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
  /* B borra el pedido como administración (✕ Eliminar), después de releer. */
  const borrarDesde = (B, id) => B.evaluate(async (id) => {
    await refrescarEstado(); await esperar(100);
    realDelete(id); await esperar(1500); await quieto();
    return !findById(id);
  }, id);
  /* ⏱️ (28/09, 2ª revisión) En la vida real B borra un rato después del guardado de A; acá pasa en el mismo segundo. Un
     pedido confirmado hace menos de `LECTURA_VIEJA_MS` que la lectura no trae se CONSERVA: puede ser la copia vieja de
     20 s de `doGet` (ver `test_lectura_vieja.js`). Se corre para atrás el momento en que A lo confirmó, como si hubiera
     pasado un minuto. Una página sin esa regla (la de antes) no tiene nada que correr. */
  /* 🔁 (revisión de Codex a §18) …y pasada la ventana, la PRIMERA lectura que no lo trae es solo una sospecha: se relee, y
     la que se pide `BORRADO_CONFIRMA_MS` después lo confirma. Se hace esa primera lectura y se corre la sospecha para
     atrás; la lectura siguiente de la prueba es la que lo confirma. */
  const pasaElTiempo = (P, id) => P.evaluate(async (id) => {
    if(typeof LECTURA_VIEJA_MS==='undefined') return;
    var u=SAVE_ULTIMO[id]; if(u && u.okT!=null) u.okT-=LECTURA_VIEJA_MS+1000;
    if(typeof BORRADO_CONFIRMA_MS==='undefined') return;
    await refrescarEstado(); await esperar(100);
    u=SAVE_ULTIMO[id]; if(u && u.faltaT!=null) u.faltaT-=BORRADO_CONFIRMA_MS+1000;
    if(BORRADO_CONFIRMA_T){ clearTimeout(BORRADO_CONFIRMA_T); BORRADO_CONFIRMA_T=null; }
  }, id);

  // ══ 1. A CARGA UN PEDIDO, B LO BORRA, A RELEE ══════════════════════════════════════════════════════════
  await esc('1. A carga un pedido y B lo borra: la lectura siguiente de A ya no lo muestra', async () => {
    const S = servidor();
    const A = await abrir(S), B = await abrir(S);
    const id = await cargar(A, 'BORRADO EN B');
    chk('(partida) el pedido llegó a la planilla', !!(id && S.fila(id)), id);
    const bOk = await borrarDesde(B, id);
    chk('(partida) B lo borró de la planilla', bOk && !S.fila(id), bOk);
    await pasaElTiempo(A, id);
    const r = await A.evaluate(async (id) => {
      window._toasts=[]; await refrescarEstado(); await esperar(150);
      return { sigue:!!findById(id), avisos:window._toasts.filter(function(t){ return /ya no está en la planilla/.test(t); }) };
    }, id);
    chk('🗑 la lectura siguiente de A (pedida después de su guardado) ya no lo muestra (antes lo conservaba 90 s)', r.sigue===false, r);
    chk('…y lo dice: «🗑 El pedido de BORRADO EN B ya no está en la planilla: lo borraron desde otro equipo»',
        r.avisos.length===1 && /El pedido de BORRADO EN B ya no está en la planilla: lo borraron desde otro equipo/.test(r.avisos[0]), r.avisos);
  });

  // ══ 2. A LO TENÍA ABIERTO PARA EDITAR ══════════════════════════════════════════════════════════════════
  await esc('2. A lo tenía abierto para editar y B lo borró: al guardar NO se vuelve a crear', async () => {
    const S = servidor();
    const A = await abrir(S), B = await abrir(S);
    const id = await cargar(A, 'EDITANDO EN A');
    await A.evaluate(async (id) => { showView('mis'); await esperar(150); editPedido(id); await esperar(300); }, id);
    await borrarDesde(B, id);
    await pasaElTiempo(A, id);
    const r = await A.evaluate(async () => {
      window._toasts=[]; window.__ctl.log=[];
      UNLOCKED=false;                                                  // A es la vendedora (sin la clave de administración)…
      document.getElementById('f-direccion').value='Calle cambiada en A';
      document.getElementById('f-fecha').value='2026-09-22';          // …y mueve la entrega: el formulario relee la planilla antes de guardar
      submitPedido(); await esperar(1500); await quieto();
      return { saves:window.__ctl.log.filter(function(x){ return x.act==='save'; }).length,
               avisos:window._toasts.filter(function(t){ return /lo borraron desde otro equipo/.test(t); }) };
    });
    chk('🗑 la venta borrada en B NO vuelve a la planilla (antes se creaba de nuevo con la copia de A)', !S.fila(id), S.fila(id) && S.fila(id).direccion);
    chk('…A ni siquiera manda el guardado: la lectura de antes de guardar ve que no está', r.saves===0, r);
    chk('…y se lo dice: «🗑 Este pedido lo borraron desde otro equipo mientras lo tenías abierto: tu cambio NO se guardó»',
        r.avisos.some(function(t){ return /Este pedido lo borraron desde otro equipo mientras lo tenías abierto: tu cambio NO se guardó/.test(t); }), r.avisos);
  });

  // ══ 3. EL SERVIDOR 2026-09-28-a: UN GUARDADO CON SELLO DE UNA FILA QUE YA NO ESTÁ ═════════════════════════
  await esc('3. Servidor: un guardado con sello de una fila borrada se rechaza (`borrado`)', async () => {
    const S = servidor();
    const g = S.guardar(pedido({ id:'s1', cliente:'SERVIDOR 1' }));
    const f = S.fila('s1'), d = S.borrar('s1', f && f.rev);
    const re = S.guardar(Object.assign({}, f, { direccion:'copia vieja' }));
    chk('(partida) se guardó y se borró con su sello', g.ok && d.ok && !!f, [g.ok, d]);
    chk('🗑 volver a guardar esa fila CON su sello viejo → `borrado`, y la planilla no la vuelve a tener', re.ok===false && re.error==='borrado' && !S.fila('s1'), re);
    chk('…y queda anotado en «Rechazos»', S.shR._datos.some(function(fila){ return fila.some(function(c){ return String(c).indexOf('borrado')>=0; }); }), S.shR._datos.length);
    // Un retiro borrado tampoco vuelve (es plata).
    S.guardar({ id:'__ret_t1__', fecha:'', cliente:'💵 RETIRO', observaciones:'{}', vendedor:'Mirian Salazar', productos:[] });
    const fr = S.fila('__ret_t1__'); S.borrar('__ret_t1__', fr && fr.rev);
    const rr = S.guardar(Object.assign({}, fr, { observaciones:'{"m":500}' }));
    chk('🗑 un RETIRO borrado tampoco vuelve con su copia vieja', rr.ok===false && rr.error==='borrado' && !S.fila('__ret_t1__'), rr);
    // Controles: lo que tiene que seguir andando.
    const nuevo = S.guardar(pedido({ id:'s2', cliente:'NUEVO' }));
    chk('(control) un pedido NUEVO (sin sello) entra como siempre', nuevo.ok===true && nuevo.mode==='add' && !!S.fila('s2'), nuevo.mode);
    const reenvio = S.guardar(pedido({ id:'s2', cliente:'NUEVO' }));
    chk('(control) el reenvío de un alta cuya respuesta se perdió (sin sello, la fila ya está) sigue siendo `conflicto` = el «ok tardío» del panel, no `borrado`',
        reenvio.ok===false && reenvio.error==='conflicto', reenvio.error);
    S.guardar({ id:'__dias_cerrados__', fecha:'', cliente:'🔒 DÍAS CERRADOS', observaciones:'🔒 2026-09-20', productos:[] });
    const fd = S.fila('__dias_cerrados__');
    S.sh._datos.splice(S.sh._datos.findIndex(function(x){ return x[0]==='__dias_cerrados__'; }), 1);   // alguien la borró a mano de la hoja
    const vd = S.guardar(Object.assign({}, fd, { observaciones:'🔒 2026-09-20 | 2026-09-21' }));
    chk('(control) una fila FIJA del sistema (días cerrados) borrada de la hoja vuelve a nacer al guardarla', vd.ok===true && !!S.fila('__dias_cerrados__'), vd);
  });

  // ══ 4. …DESDE EL FORMULARIO SIN RELEER, Y DESDE LA COLA DE UN CELULAR SIN SEÑAL ═════════════════════════
  await esc('4. Con el servidor nuevo: la edición sin releer y la cola sin señal no lo recrean', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'q1', cliente:'CORREGIDO SIN RELEER', fecha:'2026-09-21' }));
    S.guardar(pedido({ id:'q2', cliente:'EN LA COLA DEL CHOFER', fecha:'2026-09-21', chofer:'Luis Pierre' }));
    const A = await abrir(S), B = await abrir(S);
    // A abre q1 para corregir la dirección (sin mover nada: el formulario no relee antes de guardar).
    await A.evaluate(async () => { showView('mis'); await esperar(150); editPedido('q1'); await esperar(300); });
    await borrarDesde(B, 'q1');
    const r1 = await A.evaluate(async () => {
      window._toasts=[]; window.__ctl.log=[];
      document.getElementById('f-direccion').value='Otra calle';
      submitPedido(); await esperar(1500); await quieto();
      return { sigue:!!findById('q1'), cola:getPending().filter(function(p){ return p.id==='q1'; }).length,
               rech:(rechazosLocales()[0]||{}).error, avisos:window._toasts.filter(function(t){ return /lo borraron desde otro equipo/.test(t); }).length };
    });
    chk('🗑 la corrección de una venta que B borró NO la vuelve a crear en la planilla', !S.fila('q1'), S.fila('q1') && S.fila('q1').direccion);
    chk('…A la saca de la pantalla, no la deja en la cola, la anota en sus rechazos y avisa', r1.sigue===false && r1.cola===0 && r1.rech==='borrado' && r1.avisos>0, r1);
    // El chofer marca ✅ sin señal; mientras tanto B borra el pedido; vuelve la señal y se manda la cola.
    const r2a = await A.evaluate(async () => {
      var p=JSON.parse(JSON.stringify(findById('q2'))); p.entregado=true; queuePending(p);
      return getPending().length;
    });
    await borrarDesde(B, 'q2');
    const r2 = await A.evaluate(async () => {
      await flushPending(); await esperar(800); await quieto();
      var rc=rechazosLocales().filter(function(x){ return x.id==='q2'; })[0]||{};
      return { cola:getPending().filter(function(p){ return p.id==='q2'; }).length, rech:rc.error, perdio:rc.perdio||null };
    });
    chk('(partida) el ✅ del chofer quedó en la cola', r2a>=1, r2a);
    chk('🗑 al volver la señal, la cola NO vuelve a crear el pedido que B borró', !S.fila('q2'), S.fila('q2') && S.fila('q2').entregado);
    chk('…sale de la cola (no se reintenta para siempre) y queda anotado lo que se perdió (el ✅) para el cartel del chofer',
        r2.cola===0 && r2.rech==='borrado' && !!(r2.perdio && r2.perdio.entregado), r2);
  });

  // ══ 5. UNA REVISIÓN MÁS NUEVA DE OTRO EQUIPO ══════════════════════════════════════════════════════════
  await esc('5. B guarda después que A: A lo ve en su lectura siguiente; una lectura atrasada no pisa lo de A', async () => {
    const S = servidor();
    S.guardar(pedido({ id:'r1', cliente:'DOS EQUIPOS', fecha:'2026-09-21' }));
    const A = await abrir(S), B = await abrir(S);
    const guardarDir = (P, dir) => P.evaluate(async (dir) => {
      await refrescarEstado(); await esperar(100);
      var p=JSON.parse(JSON.stringify(findById('r1'))); p.direccion=dir; upsert(p);
      var res=await apiSave(p); await quieto(); return !!(res && res.ok);
    }, dir);
    const okA = await guardarDir(A, 'Dirección de A');
    const okB = await guardarDir(B, 'Dirección de B');
    const r = await A.evaluate(async () => { await refrescarEstado(); await esperar(100); return (findById('r1')||{}).direccion; });
    chk('(partida) A guardó y después B guardó otra dirección', okA && okB && S.fila('r1').direccion==='Dirección de B', [okA, okB, S.fila('r1').direccion]);
    chk('🆕 la lectura siguiente de A muestra lo de B (antes, 90 s con lo de A tapando lo nuevo)', r==='Dirección de B', r);
    // Control, con OTRO pedido (el de arriba quedó viejo en el panel de antes): una lectura que sale ANTES de un guardado
    // de A y vuelve después no pisa lo de A.
    S.guardar(pedido({ id:'r2', cliente:'LECTURA ATRASADA', fecha:'2026-09-21', direccion:'La de la planilla' }));
    const c = await A.evaluate(async () => {
      await refrescarEstado(); await esperar(100);
      __regla({ act:'list', mode:'tarde', name:'L1' });
      var viejo=refrescarEstado(); await esperar(100);               // la planilla todavía dice «La de la planilla»
      var p=JSON.parse(JSON.stringify(findById('r2'))); p.direccion='Recién guardada en A'; upsert(p);
      await apiSave(p); await quieto();
      __soltar('L1'); await viejo; await esperar(150);
      return (findById('r2')||{}).direccion;
    });
    chk('(control) la lectura atrasada (de ANTES del guardado) no pisa lo que A acaba de guardar', c==='Recién guardada en A', c);
  });

  chk('ningún error de JavaScript en las páginas', errores.length===0, errores.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
