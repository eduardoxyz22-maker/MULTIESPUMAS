/* 📦 EL LIBRO DE RESERVAS DEL SERVIDOR: EL QUE GUARDA SEGUNDO SE ENTERA (02/10, §4hj, servidor 2026-10-02-a).

   El dueño (02/10): *«Dos vendedores que guardan la última unidad en los mismos segundos la venden dos veces: la revisión del
   saldo tendría que estar también en el servidor»*. El cuadrito del formulario (§4gj, `test_saldo_almacen` §10) pregunta con
   la planilla recién leída, pero si A y B leen «Libres 1» y guardan en los mismos 1-3 segundos, entran los dos sin aviso.
   Ahora cada guardado desde el formulario lleva `reserva` (de cuándo es la lectura, qué clave, cuántas, cuántas libres y qué
   pedidos ya se tuvieron en cuenta), el servidor lo anota adentro de su candado y, si otro pedido que esa lectura no conocía
   apartó lo mismo, contesta `saldo`: el panel se lo dice a quien guardó, CON EL PEDIDO YA GUARDADO (nunca se frena una venta).

   ⚠️ LO QUE ESTA PRUEBA CUIDA (dos celulares contra el .gs de verdad, con un Google de mentira):
   1. A y B leen «Libres 1». A guarda; B guarda SIN que su lectura traiga a A (la de antes de guardar le vuelve la misma copia:
      lo que pasa con la caché de 20 s de doGet, §4fx/§4gn). A B le sale la ventana «otro vendedor vendió 1 de TITANIO ICE
      160x190 … faltan 1», su pedido SÍ quedó en la planilla, y «Entendido» le devuelve el mensaje para el grupo. A A no le sale
      nada. El guardado de B llevó `reserva` con la hora de su lectura y sin el id de A.
   2. Otra vuelta: A vende de nuevo (a A el formulario le pregunta antes, como siempre) y B guarda otra vez con la copia vieja:
      «vendió 2 … faltan 3». «✏️ Abrir el pedido» relee la planilla y abre la edición: el cuadrito ya cuenta a todos («Faltan 3»).
   3. Con el .gs de ANTES (2026-09-30-a, `git show 4a950cc`): la página manda `reserva` igual, el servidor la ignora, no sale
      ninguna ventana y todo sigue como siempre (ni error, ni cola).
   Datos SINTÉTICOS (el repo es público). Reloj clavado en el miércoles 23/09/2026, 15:00 de Bolivia.

   Se corre:  node tests/test_saldo_servidor.js   (desde la raíz del repo)
   Dientes:   GS=/ruta/al/gs_2026-09-30-a.gs node tests/test_saldo_servidor.js   (las de 1 y 2 se ponen rojas; 3 sigue verde)
              PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_saldo_servidor.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path'), { execSync } = require('child_process');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const GS_VIEJO_REF = '4a950cc';                      // el último .gs de antes de las reservas (2026-09-30-a)
const RELOJ = '2026-09-23T15:00:00-04:00';          // miércoles, 15:00 de Bolivia
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,420)):''); };

/* ── El servidor de verdad (el .gs con un Google de mentira), como en test_saldo_almacen §10 ── */
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
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  const reservas = () => { try { return JSON.parse(props.RESERVAS || 'null'); } catch (e) { return null; } };
  const reservaDe = (id) => ((reservas() || {}).por || {})[id] || null;     // null con el .gs viejo (no anota nada)
  return { ctx, sh, props, post, filas, guardar, reservas, reservaDe, version: ctx.SCRIPT_VERSION };
}
/* Cada página habla con el servidor de arriba. `__ctl.congelar`: mientras esté puesto, toda LECTURA devuelve la ÚLTIMA copia que
   llegó (la planilla de antes) — lo que le pasa a un panel cuando Google le contesta la caché de 20 s de doGet (§4fx). */
function INIT_DOS(vend){
  try{ localStorage.setItem('me_mis_vendedor', vend); }catch(e){}
  window.__ctl={ lecturas:0, congelar:false, congelada:null, saves:[] };
  window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window.fetch=function(url, o){
    var body=(o && o.body) || '{}', P={}; try{ P=JSON.parse(body); }catch(e){}
    var esLista=(P.action==='list');
    if(esLista) window.__ctl.lecturas++;
    if(P.action==='save') window.__ctl.saves.push(P);
    var p=(esLista && window.__ctl.congelar && window.__ctl.congelada) ? Promise.resolve(window.__ctl.congelada) : window.__gs(body);
    return p.then(function(t){
      if(esLista && !window.__ctl.congelar) window.__ctl.congelada=t;
      return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } };
    });
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const K_TIT = 'TITANIO ICE|160X190', hoy = '2026-09-23';
  const stockDe = (n) => ({ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:0, observaciones: JSON.stringify({
    c:{ f:hoy, hora:'09:00:00', u:{ [K_TIT]:n }, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', t:Date.parse('2026-09-23T09:00:00-04:00') },
    e:[], p:[], a:{}, g:{}, al:{ 'PRODUCTOS TERMINADOS FAB.':'log' }, h:[] }) });
  const abrirDos = async (S, vend) => {
    const context = await browser.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, timezoneId:'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT_DOS, vend);
    await context.route(/^https?:/, rr => rr.abort());
    const p = await context.newPage();
    p.setDefaultTimeout(8000);
    p.__dialogos=[]; p.__respuestas=[];
    p.on('pageerror', e => errores.push(vend+': '+e.message));
    p.on('dialog', d => { p.__dialogos.push(d.message()); const si = p.__respuestas.length ? p.__respuestas.shift() : true; if(si) d.accept(); else d.dismiss(); });
    await p.clock.setFixedTime(new Date(RELOJ));
    await p.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await p.waitForTimeout(400);
    await p.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      await refrescarEstado(); ULTIMO_ERROR='';
      window._caja0=function(){ var b=document.querySelector('#f-productos .prod-card .prod-saldo'); return b ? { hidden:b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim() } : null; };
      window._modal=function(){ var m=document.getElementById('modal'), b=document.getElementById('modal-box'); return { on:m.classList.contains('on'), txt:(b.innerText||'').replace(/\s+/g,' ').trim(),
        botones:[].slice.call(b.querySelectorAll('button')).map(function(x){ return x.textContent.trim(); }), waText:!!b.querySelector('#wa-text') }; };
      window._esperarGuardado=async function(){ for(var i=0;i<80;i++){ await esperar(50); if(!Object.keys(SAVE_EN_VUELO||{}).length && !Object.keys(SAVE_EN_ESPERA||{}).length && !document.getElementById('f-submit').disabled) break; } await esperar(200); };
    });
    return { context, p };
  };
  const nuevoForm = async (P) => { await P.evaluate(() => { if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); }); };
  const llenar = async (P, cli, cant) => {
    await P.fill('#f-nota', String(3000+Math.floor(Math.random()*900)));
    await P.fill('#f-cliente', cli);
    await P.fill('#f-celular', '71234567');
    await P.fill('#f-productos .prod-codigo', 'CH1201');
    await P.fill('#f-productos .prod-cant', String(cant));
    await P.fill('#f-zona', 'Norte');
    await P.fill('#f-saldo', '3000');
    await P.waitForTimeout(500);
  };
  const guardar = async (P) => { await P.tap('#f-submit'); await P.waitForTimeout(400); await P.evaluate(() => _esperarGuardado()); };
  /* Tocar un botón de la ventana, si está (contra el .gs viejo la ventana no sale: la prueba sigue y lo cuenta). */
  const tocarModal = async (P, txt) => { try { await P.tap('#modal-box button:has-text("'+txt+'")', { timeout:2000 }); await P.waitForTimeout(300); return true; } catch(e){ return false; } };
  const vender = async (P, cli, cant) => { await nuevoForm(P); await llenar(P, cli, cant); await guardar(P); };

  // ═══ 1. A y B leen «Libres 1»; A guarda; B guarda sin enterarse ══════════════════════════════
  console.log('\n── 1. A y B leen «Libres 1», A guarda, B guarda con la copia de antes: a B se le dice, con el pedido guardado ──');
  const S = servidor(fs.readFileSync(GS, 'utf8'));
  const r0 = S.guardar(stockDe(1));
  chk('⚠️ (partida) el servidor tiene el corte de las 09:00 con UN TITANIO ICE 160x190, y es la versión con reservas', !!(r0 && r0.ok) && S.version==='2026-10-02-a', [r0 && r0.ok, S.version]);
  const { context:cA, p:A } = await abrirDos(S, 'Mirian Salazar');
  const { context:cB, p:B } = await abrirDos(S, 'Carola Chavez');
  await nuevoForm(B);
  await llenar(B, 'CLIENTE DE B', 1);
  let cb = await B.evaluate(() => ({ caja:_caja0(), visto:SALDO_VISTO, lecturas:window.__ctl.lecturas }));
  chk('(partida) B completa el producto: «En almacén 1 · Pendientes de entrega 0 · Libres 1», verde, y sabe de cuándo es su lectura (SALDO_VISTO, reloj de Google)',
      cb.caja && /En almacén 1 · Pendientes de entrega 0 · Libres 1/.test(cb.caja.txt) && /ps-verde/.test(cb.caja.cls) && cb.visto>0, cb);
  const vistoB = cb.visto;
  // De acá en más, a B toda lectura le vuelve la copia de ANTES (la caché de 20 s de doGet, un Google lento)
  await B.evaluate(() => { window.__ctl.congelar=true; });
  await vender(A, 'CLIENTE A1', 1);
  const idA1 = (S.filas().find(f => f.cliente==='CLIENTE A1')||{}).id;
  const resA = S.reservas();
  chk('⚠️ A guarda la última unidad: entra, SIN pregunta (para A había 1 libre), y su reserva queda anotada en el servidor (1 de la clave, con hora)',
      !!idA1 && A.__dialogos.length===0 && !!S.reservaDe(idA1) && S.reservaDe(idA1)[0].k===K_TIT && S.reservaDe(idA1)[0].u===1, [idA1, A.__dialogos, resA]);
  const mA = await A.evaluate(() => _modal());
  chk('…y a A no le sale ningún aviso de «otro vendedor»: ve el mensaje para el grupo de siempre («✅ Pedido guardado»)', mA.on && /Pedido guardado/.test(mA.txt) && !/otro vendedor/i.test(mA.txt) && mA.waText, mA.txt.slice(0,120));
  const saveA = await A.evaluate(() => window.__ctl.saves.slice(-1)[0]);
  chk('…el guardado de A llevó `reserva`: la hora de su lectura, la clave, 1 unidad, libres 1 y ningún pedido conocido de esa clave',
      saveA && saveA.reserva && saveA.reserva.visto>0 && saveA.reserva.lineas.length===1 && saveA.reserva.lineas[0].k===K_TIT && saveA.reserva.lineas[0].u===1 &&
      saveA.reserva.lineas[0].libres===1 && Array.isArray(saveA.reserva.lineas[0].conocidos) && saveA.reserva.lineas[0].conocidos.length===0, saveA && saveA.reserva);
  // B guarda: la lectura de antes de guardar le vuelve la copia sin A
  B.__dialogos.length=0;
  await guardar(B);
  const saveB = await B.evaluate(() => window.__ctl.saves.slice(-1)[0]);
  const mB = await B.evaluate(() => _modal());
  const deB = S.filas().filter(f => f.cliente==='CLIENTE DE B');
  chk('⚠️ B guarda sin que su lectura traiga a A: NO le preguntó nada antes (para su copia había 1 libre)…', B.__dialogos.length===0, B.__dialogos);
  chk('⚠️ …su guardado llevó `reserva` con la hora de ESA lectura (la de antes de A), libres 1 y sin el id de A en `conocidos`',
      saveB && saveB.reserva && saveB.reserva.visto===vistoB && saveB.reserva.lineas[0].libres===1 && saveB.reserva.lineas[0].conocidos.indexOf(idA1)<0, saveB && saveB.reserva);
  chk('⚠️ …y le sale la ventana: «Mientras guardabas, otro vendedor vendió lo mismo» · «otro vendedor vendió 1 de TITANIO ICE 160x190: ya no hay saldo libre (faltan 1)»',
      mB.on && /Mientras guardabas, otro vendedor vendió lo mismo/.test(mB.txt) && /otro vendedor vendió 1 de TITANIO ICE 160x190: ya no hay saldo libre \(faltan 1\)/.test(mB.txt), mB.txt.slice(0,300));
  chk('⚠️ …que dice que el pedido quedó guardado igual, qué hacer (avisar al cliente o reprogramar) y tiene «✏️ Abrir el pedido» y «Entendido»',
      /Tu pedido quedó guardado igual/.test(mB.txt) && /Avisale al cliente que puede demorar \(hay que mandar a producir\) o reprogramá la entrega/.test(mB.txt) &&
      mB.botones.indexOf('✏️ Abrir el pedido')>=0 && mB.botones.indexOf('Entendido')>=0, mB.botones);
  chk('⚠️ …y el pedido de B SÍ está en la planilla (el servidor nunca frena una venta), con su reserva anotada también',
      deB.length===1 && !!S.reservaDe(deB[0].id) && S.reservaDe(deB[0].id)[0].u===1, [deB.length, S.reservas()]);
  const fB = await B.evaluate(() => ({ cli:document.getElementById('f-cliente').value, edit:EDIT_ID, cola:getPending().length }));
  chk('…el formulario quedó como siempre después de guardar (vacío para el próximo, sin edición abierta) y no quedó nada en la cola', fB.cli==='' && !fB.edit && fB.cola===0, fB);
  const tocoEnt = await tocarModal(B, 'Entendido');
  const mB2 = await B.evaluate(() => _modal());
  chk('⚠️ «Entendido» devuelve la ventana de siempre, con el mensaje para pasar la venta al grupo («✅ Pedido guardado», con el texto de WhatsApp)',
      tocoEnt && mB2.on && /Pedido guardado/.test(mB2.txt) && mB2.waText && !/otro vendedor/i.test(mB2.txt), [tocoEnt, mB2.txt.slice(0,120)]);

  // ═══ 2. Otra vuelta: «vendió 2 … faltan 3» y «✏️ Abrir el pedido» ═══════════════════════════
  console.log('\n── 2. Otra vuelta: A vende de nuevo, B guarda con la copia vieja y abre el pedido desde el aviso ──');
  A.__dialogos.length=0;
  await vender(A, 'CLIENTE A2', 1);
  const idA2 = (S.filas().find(f => f.cliente==='CLIENTE A2')||{}).id;
  chk('A vende otro: a A el formulario le pregunta ANTES (su lectura es fresca: «no hay saldo libre (faltan 2)»), Aceptar lo guarda', !!idA2 && A.__dialogos.length===1 && /no hay saldo libre \(faltan 2\)/.test(A.__dialogos[0]), A.__dialogos.map(d => d.slice(0,160)));
  const mA2 = await A.evaluate(() => _modal());
  chk('…y a A tampoco le sale el aviso de «otro vendedor» (su lectura ya conocía a todos)', mA2.on && !/otro vendedor/i.test(mA2.txt), mA2.txt.slice(0,120));
  B.__dialogos.length=0;
  await vender(B, 'CLIENTE DE B 2', 1);                  // B sigue con la copia vieja: su propio B1 sí lo tiene (lo guardó acá)
  const mB3 = await B.evaluate(() => _modal());
  const idB2 = (S.filas().find(f => f.cliente==='CLIENTE DE B 2')||{}).id;
  chk('⚠️ B guarda otro con la copia vieja: le preguntó antes por lo SUYO (faltan 1: ya tenía 1 pendiente), y el servidor agrega lo de A: «otro vendedor vendió 2 … (faltan 3)»',
      !!idB2 && B.__dialogos.length===1 && /faltan 1/.test(B.__dialogos[0]) && mB3.on && /otro vendedor vendió 2 de TITANIO ICE 160x190: ya no hay saldo libre \(faltan 3\)/.test(mB3.txt), [B.__dialogos.map(d => d.slice(0,120)), mB3.txt.slice(0,200)]);
  // «✏️ Abrir el pedido» relee la planilla (ya sin la copia congelada: Google volvió a contestar bien) y abre la edición
  await B.evaluate(() => { window.__ctl.congelar=false; });
  const lecAntes = await B.evaluate(() => window.__ctl.lecturas);
  const tocoAbrir = await tocarModal(B, 'Abrir el pedido');
  await B.waitForTimeout(1200);
  const ab = await B.evaluate(() => ({ enForm:document.getElementById('view-form').classList.contains('active'), edit:EDIT_ID, modal:_modal().on, caja:_caja0(), lecturas:window.__ctl.lecturas,
                                      cli:document.getElementById('f-cliente').value, n:STATE.filter(function(p){ return /^CLIENTE/.test(p.cliente||''); }).length }));
  chk('⚠️ «✏️ Abrir el pedido»: relee la planilla (una lectura más) y abre la EDICIÓN de ese pedido, sin ventana encima',
      tocoAbrir && ab.enForm && ab.edit===idB2 && !ab.modal && ab.lecturas>lecAntes && ab.cli==='CLIENTE DE B 2' && ab.n===4, ab);
  chk('⚠️ …y el cuadrito ya cuenta a todos: rojo, «Faltan 3 (3 pendientes + 1 de este pedido − 1 en almacén)», con el día desde el que llega',
      ab.caja && /ps-rojo/.test(ab.caja.cls) && /Faltan 3 \(3 pendientes \+ 1 de este pedido − 1 en almacén\)/.test(ab.caja.txt) && /mandar a producir/i.test(ab.caja.txt), ab.caja);
  // Lo guardado por cada uno, visto desde el servidor
  const Rf = S.reservas();
  chk('⚠️ el libro del servidor tiene las cuatro reservas (A1, B1, A2, B2), de 1 cada una', !!Rf && !!Rf.por && Object.keys(Rf.por).length===4 && Object.keys(Rf.por).every(id => Rf.por[id].length===1 && Rf.por[id][0].u===1), Rf);
  await cA.close(); await cB.close();

  // ═══ 3. Con el .gs de ANTES: nada cambia ════════════════════════════════════════════════════
  console.log('\n── 3. Con el servidor de antes (2026-09-30-a) la página manda `reserva` igual, el servidor la ignora y no pasa nada ──');
  let gsViejo = '';
  try { gsViejo = execSync('git show ' + GS_VIEJO_REF + ':google-apps-script.gs', { maxBuffer: 16*1024*1024 }).toString(); } catch (e) {}
  if (!gsViejo) chk('hace falta el .gs de antes (git show ' + GS_VIEJO_REF + ')', false);
  else {
    const S2 = servidor(gsViejo);
    S2.guardar(stockDe(1));
    chk('(partida) el servidor de antes es el 2026-09-30-a', S2.version==='2026-09-30-a', S2.version);
    const { context:cA2, p:A2 } = await abrirDos(S2, 'Mirian Salazar');
    const { context:cB2, p:B2 } = await abrirDos(S2, 'Carola Chavez');
    await nuevoForm(B2); await llenar(B2, 'CLIENTE DE B', 1);
    const cb2 = await B2.evaluate(() => ({ caja:_caja0(), visto:SALDO_VISTO }));
    chk('(partida) B ve «Libres 1» también con el servidor de antes (que ya decía de cuándo es cada lectura)', cb2.caja && /Libres 1/.test(cb2.caja.txt) && cb2.visto>0, cb2);
    await B2.evaluate(() => { window.__ctl.congelar=true; });
    await vender(A2, 'CLIENTE A1', 1);
    B2.__dialogos.length=0;
    await guardar(B2);
    const mV = await B2.evaluate(() => _modal());
    const sV = await B2.evaluate(() => window.__ctl.saves.slice(-1)[0]);
    const fV = await B2.evaluate(() => ({ cola:getPending().length, cli:document.getElementById('f-cliente').value, edit:EDIT_ID }));
    chk('la página manda `reserva` igual (no sabe qué servidor hay enfrente)', sV && sV.reserva && sV.reserva.lineas.length===1 && sV.reserva.lineas[0].k===K_TIT, sV && sV.reserva);
    chk('…el servidor de antes la ignora: el pedido de B entra, sin `saldo`, y no anota ninguna reserva', S2.filas().filter(f => f.cliente==='CLIENTE DE B').length===1 && !S2.reservas() && S2.props.RESERVAS==null, [S2.filas().length, S2.props.RESERVAS]);
    chk('…y a B le sale lo de siempre («✅ Pedido guardado» con el mensaje para el grupo), sin ningún aviso de «otro vendedor», sin cola y con el formulario vacío para el próximo',
        mV.on && /Pedido guardado/.test(mV.txt) && mV.waText && !/otro vendedor/i.test(mV.txt) && fV.cola===0 && fV.cli==='' && !fV.edit && B2.__dialogos.length===0, [mV.txt.slice(0,120), fV, B2.__dialogos]);
    await cA2.close(); await cB2.close();
  }

  // ═══ 4. Sin errores ═════════════════════════════════════════════════════════════════════════
  chk('ningún error de JavaScript en las páginas', errores.length===0, errores.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.log('✗ (la prueba no terminó)', String(e && e.stack || e).slice(0,600)); console.log('\n'+PASS+' bien · '+(FAIL+1)+' mal'); process.exit(1); });
