/* 🤝 DOS DISPOSITIVOS A LA VEZ, DE PUNTA A PUNTA (§4fz, informe del 23/09)

   Dos navegadores (A y B) con el panel de verdad, hablándole al google-apps-script.gs de
   verdad (cargado en Node con una planilla de mentira, como test_servidor.js). Nada de
   dobles de `apiSave`: el `fetch` del panel entra por `doPost`, así que se prueban juntos el
   sello del servidor y lo que hace el panel con la respuesta.

     1. STOCK — A anota una entrada de 5; B, con su copia de antes, anota un pedido a fábrica
        de 8. Antes: los dos ✓ y la entrada de A desaparecía. Ahora el servidor rechaza a B,
        B junta las dos versiones y vuelve a guardar: quedan las DOS.
     2. STOCK — dos recogidas del MISMO corte de Moreno recibidas en dos dispositivos: se
        restan las dos (10 − 3 − 2 = 5), no gana la última.
     3. ARQUEO — A cuenta la caja, B anota el extracto del QR: quedan los dos.
     4. BORRAR — A tiene abierta una venta que debía Bs 1.000; B registra el pago; A confirma
        «Eliminar» con su vista vieja. No se borra, y A ve la versión nueva y qué cambió.
        (4b: lo mismo cuando A no puede releer la planilla: frena el servidor.)
     5. DESCARTAR — un borrador de Kommo que B ya completó no se borra desde la bandeja
        vieja de A (el pedido tiene el MISMO id que el borrador, §4es).

   Se corre:  node tests/test_concurrencia.js
   Dientes:   GS=/ruta/al/viejo.gs …   o   PEDIDOS=/ruta/al/viejo/pedidos.html …           */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e))):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* ── El servidor: el .gs real con un Google de mentira (lo mínimo de test_servidor.js) ── */
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
    'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); }, putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n==='Rechazos' ? shR : sh, insertSheet: (n) => n==='Rechazos' ? shR : sh }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty:(k)=>props[k]!=null?props[k]:null, setProperty:(k,v)=>{ props[k]=v; },
      deleteProperty:(k)=>{ delete props[k]; }, setProperties:(o)=>{ Object.assign(props,o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
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
  return { ctx, sh, shR, post, fila };
}

(async () => {
  const S = servidor();
  const hoy = (()=>{ const d=new Date(); const m=d.getMonth()+1, dd=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dd<10?'0':'')+dd; })();
  const guardarDesdeNode = (rec) => JSON.parse(S.post(JSON.stringify({ action:'save', pedido:rec })));

  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (nombre) => {
    const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(nombre+': '+e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.exposeFunction('__gs', (body) => S.post(body));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      SHEETS_URL='https://script.google.com/macros/s/PRUEBA/exec';
      try{ localStorage.clear(); }catch(e){}
      /* El `fetch` del panel entra por el doPost del .gs de verdad. */
      window.fetch=function(url, o){
        return window.__gs((o&&o.body)||'{}').then(function(t){
          return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } };
        });
      };
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
      window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
      /* Que terminen los guardados en vuelo (y las juntas que disparen). */
      window.quieto=async function(){ for(var i=0;i<60;i++){ await esperar(50); if(!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length) break; } await esperar(50); };
    });
    return page;
  };
  const leer = async (page) => page.evaluate(async () => { await refrescarEstado(); return true; });
  const stockSrv = () => { const f=S.fila('__stock__'); try{ return JSON.parse(f.observaciones); }catch(e){ return null; } };

  // Lo que ya había en la planilla antes de que abran los dos.
  guardarDesdeNode({ id:'__stock__', fecha:'', cliente:'📦 STOCK', rev:0, observaciones: JSON.stringify({
    c:{ f:hoy, u:{ 'K1|140x190':10 } }, e:[], p:[], a:{}, g:{ 'IM - PRODUCTOTERMINADO':{ f:hoy, hora:'08:00:00', u:{ 'K3|140x190':10 } } },
    al:{ 'IM - PRODUCTOTERMINADO':'otro' }, h:[] }) });
  guardarDesdeNode({ id:'__arqueo_cuadre__', fecha:'', cliente:'🧮 ARQUEO', rev:0, observaciones:'' });
  guardarDesdeNode({ id:'V1', fecha:hoy, cliente:'CLIENTE DEBE', vendedor:'Carola Chavez', turno:'AM', saldo:1000, pagado:false, acuenta:0,
                     productos:[{desc:'COLCHON',cant:1,precio:1000}], metodoPago:'', nota:'900', oc:'09-900', rev:0 });
  guardarDesdeNode({ id:'V2', fecha:hoy, cliente:'OTRA VENTA', vendedor:'Carola Chavez', turno:'AM', saldo:500, pagado:false, acuenta:0,
                     productos:[{desc:'COLCHON',cant:1,precio:500}], metodoPago:'', nota:'901', oc:'09-901', rev:0 });
  guardarDesdeNode({ id:'kommo-777', fecha:'', cliente:'VENTA DE KOMMO', vendedor:'Carola Chavez', estado:'Borrador Kommo', saldo:1200, pagado:false,
                     productos:[{desc:'COLCHON',cant:1,precio:1200}], metodoPago:'', rev:0 });

  const A = await abrir('A'), B = await abrir('B');
  await leer(A); await leer(B);

  // ══ 1. STOCK: una entrada de A y un pedido a fábrica de B, con la misma copia ══════════
  console.log('\n── 1. Stock: dos anotaciones distintas a la vez ──');
  await A.evaluate(async () => { STOCK.e=(STOCK.e||[]).concat([{ f:todayStr(), k:'K1|140x190', u:5, fab:'' }]); guardarStock(); await quieto(); });
  await B.evaluate(async () => { STOCK.p=(STOCK.p||[]).concat([{ id:'q1', k:'K2|140x190', u:8, fab:'MORENO', f:todayStr(), esp:'', r:'' }]); guardarStock(); await quieto(); });
  let s = stockSrv();
  chk('⚠️ §4fz · la entrada de 5 de A SIGUE en la planilla después del guardado de B', !!s && (s.e||[]).some(x => x.u===5 && /^K1\|140x190$/i.test(x.k)), JSON.stringify(s&&s.e));
  chk('…y el pedido a fábrica de 8 de B también', !!s && (s.p||[]).some(x => x.id==='q1' && x.u===8), JSON.stringify(s&&s.p));
  let r = await B.evaluate(() => ({ e:(STOCK.e||[]).length, p:(STOCK.p||[]).length, toasts:window._toasts.filter(function(t){ return /^err/.test(t); }) }));
  chk('…B quedó con las dos en pantalla, sin ningún aviso rojo', r.e===1 && r.p===1 && !r.toasts.length, r);
  await A.evaluate(() => refrescarEstado());
  r = await A.evaluate(() => ({ e:(STOCK.e||[]).length, p:(STOCK.p||[]).length }));
  chk('…y A, al refrescar, ve las dos', r.e===1 && r.p===1, r);
  chk('…ninguno de los dos dejó un «rechazo» anotado en el servidor', !S.shR._datos.some(f => f[3]==='__stock__'), S.shR._datos.length+' filas en Rechazos');

  // ══ 2. STOCK: dos recogidas del MISMO corte de Moreno, recibidas en dos dispositivos ══
  console.log('\n── 2. Stock: dos recogidas del mismo corte ──');
  await leer(A); await leer(B);
  /* La clave como la arma el panel (el catálogo la pasa a mayúsculas: «K3|140X190»). */
  const K3 = await A.evaluate(() => Object.keys(STOCK.g['IM - PRODUCTOTERMINADO'].u)[0]);
  await A.evaluate(async (k) => { STOCK.g['IM - PRODUCTOTERMINADO'].u[k]=7; guardarStock(); await quieto(); }, K3);   // llegaron 3
  await B.evaluate(async (k) => { STOCK.g['IM - PRODUCTOTERMINADO'].u[k]=8; guardarStock(); await quieto(); }, K3);   // llegaron 2
  s = stockSrv();
  const k3 = s && s.g && s.g['IM - PRODUCTOTERMINADO'] && s.g['IM - PRODUCTOTERMINADO'].u[K3];
  chk('⚠️ §4fz · Moreno queda en 10 − 3 − 2 = 5 (antes ganaba la última: 8)', k3===5, k3);
  chk('…y lo del punto 1 sigue ahí', !!s && (s.e||[]).length===1 && (s.p||[]).length===1, JSON.stringify({e:(s.e||[]).length, p:(s.p||[]).length}));

  // ══ 3. ARQUEO: la caja de A y el extracto de B ═════════════════════════════════════
  console.log('\n── 3. Arqueo ──');
  await leer(A); await leer(B);
  await A.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|Efectivo']=900; guardarArqueo(); await quieto(); });
  await B.evaluate(async () => { ARQUEO['mes|'+todayStr().slice(0,7)+'|QR BISA']=2000; guardarArqueo(); await quieto(); });
  const arq = String(S.fila('__arqueo_cuadre__').observaciones);
  chk('⚠️ §4fz · el arqueo guarda la caja de A Y el extracto de B', /Efectivo=900/.test(arq) && /QR BISA=2000/.test(arq), arq);

  // ══ 4. BORRAR: A confirma «Eliminar» sobre una venta que B acaba de cobrar ══════════
  console.log('\n── 4. Borrar una venta que otro acaba de cambiar ──');
  await leer(A); await leer(B);
  await B.evaluate(async () => { var p=findById('V1'); p.saldo=0; p.pagado=true; p.metodoPago='QR BISA 1000 @'+todayStr()+' #900 %QB1'; persistPedido(p); await quieto(); });
  r = await A.evaluate(async () => { window._toasts=[]; var res=await realDelete('V1'); var p=findById('V1');
    return { res:res&&{ok:res.ok, conflicto:!!res.conflicto}, enA:!!p, pagado:p&&p.pagado, saldo:p&&p.saldo, toasts:window._toasts.slice() }; });
  chk('⚠️ §4fz · la venta que B cobró NO se borra desde la vista vieja de A', !!S.fila('V1') && S.fila('V1').pagado===true, S.fila('V1')?'sigue, pagada':'¡la borró!');
  chk('…A la ve de nuevo, con los datos nuevos (pagada, saldo 0)', r.enA && r.pagado===true && Number(r.saldo)===0, r);
  chk('…y el aviso dice que NO se borró y qué cambió', r.toasts.some(t => /NO se borró/.test(t) && /PAGADA/.test(t)), r.toasts.slice(-1)[0]);
  // 4b. El freno del servidor solo: A no puede releer la planilla antes de borrar.
  await leer(A); await leer(B);
  await B.evaluate(async () => { var p=findById('V2'); p.saldo=0; p.pagado=true; p.metodoPago='Efectivo 500 @'+todayStr()+' #901'; persistPedido(p); await quieto(); });
  r = await A.evaluate(async () => { var _l=apiList; apiList=function(){ return Promise.reject(new Error('Failed to fetch')); };
    var res; try{ res=await realDelete('V2'); } finally { apiList=_l; } var p=findById('V2'); return { enA:!!p, pagado:p&&p.pagado }; });
  chk('⚠️ §4fz · sin poder releer, el sello del borrado frena igual (servidor nuevo)', !!S.fila('V2'), S.fila('V2')?'sigue':'¡la borró!');
  chk('…y A vuelve a verla, pagada', r.enA && r.pagado===true, r);
  // 4c. Lo normal: nadie la cambió → se borra.
  await leer(A);
  r = await A.evaluate(async () => { var res=await realDelete('V2'); return { ok:res&&res.ok, enA:!!findById('V2') }; });
  chk('§4fz · (control) una venta que nadie cambió se borra, en el panel y en la planilla', r.ok===true && !r.enA && !S.fila('V2'), r);

  // ══ 5. DESCARTAR un borrador de Kommo que B ya completó ════════════════════════════
  console.log('\n── 5. Descartar un borrador que otra ya completó ──');
  await leer(A); await leer(B);
  await B.evaluate(async () => { var b=BORRADORES.filter(function(x){ return x.id==='kommo-777'; })[0];
    var p=JSON.parse(JSON.stringify(b)); p.estado=''; p.fecha=todayStr(); p.turno='AM'; p.zona='Norte'; p.nota='950';
    BORRADORES=BORRADORES.filter(function(x){ return x.id!=='kommo-777'; }); STATE.unshift(p); persistPedido(p); await quieto(); });
  chk('(partida) en la planilla ya es un pedido, no un borrador', !!S.fila('kommo-777') && !/Borrador/.test(S.fila('kommo-777').estado||''), S.fila('kommo-777')&&S.fila('kommo-777').estado);
  r = await A.evaluate(async () => { window._toasts=[]; descartarBorrador('kommo-777'); await esperar(400); return window._toasts.slice(); });
  chk('⚠️ §4fz · «Descartar» desde la bandeja vieja de A NO borra el pedido que completó B', !!S.fila('kommo-777'), S.fila('kommo-777')?'sigue':'¡lo borró!');
  chk('…y lo dice', r.some(t => /NO se descartó/.test(t)), r.slice(-1)[0]);

  chk('sin errores JS en los dos navegadores', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
