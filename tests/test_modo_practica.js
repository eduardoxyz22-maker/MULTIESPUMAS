/* 🧪 MODO PRÁCTICA PARA LOS NUEVOS (271, 14/11; el dueño abre una tienda en el mall con 4 vendedores nuevos).
   Lo que cuida:
   1. Con `?practica=1` la pestaña queda en práctica: `html.practica`, la franja «🧪 MODO PRÁCTICA — nada de esto se guarda de verdad · Salir».
   2. Cargar una venta con adelanto en QR (con la foto del comprobante), una venta de tienda, cobrar el saldo en Contabilidad, una ATC,
      reprogramar y borrar: todo anda como de verdad (la ventana dice «✅ Pedido de práctica guardado (no se guardó de verdad)» y qué
      hubiera pasado), lo de práctica lleva 🧪 en las listas y los 5 ejercicios se tildan solos.
   3. ⚠️ LO IMPORTANTE: en práctica NINGUNA petición de escritura sale del navegador (se registran TODAS con `ctx.on('request')`): solo
      lecturas (`list`…). La planilla del servidor (el .gs real, con un Google de mentira) no cambia, y la cola durable DE VERDAD del aparato
      (`ME_PENDING_V1`) no tiene nada de práctica. Un `fetch` de escritura hecho a mano también se frena (la segunda guarda, en el <head>).
   4. WhatsApp no se abre (ni `window.open` ni un enlace `wa.me`): sale el aviso con el mensaje que se hubiera mandado.
   5. Recargar la pestaña conserva la práctica; «Salir» borra todo, relee la planilla y la pestaña vuelve a ser la de siempre.
   6. Sin práctica todo sigue igual: un guardado normal SÍ sale y queda en la planilla.
   7. Prenderlo desde «¿Quién está usando el panel?» (pregunta antes) y desde el menú de Bloki.
   8. Capturas (1280 y 390 px) con la franja y un pedido de práctica, datos INVENTADOS: FOTOS=/tmp node tests/test_modo_practica.js
   9. Lo de VERDAD que esperaba en la cola se queda quieto en práctica, la franja lo dice FIJO y sale al salir.
   10. (revisión del 14/11) la hoja de compartir del celular (`navigator.share`) no comparte en práctica; prender la práctica manda antes la
      cola de verdad y, si no sale, no se prende; la franja sigue la cola que deja otra pestaña; una fila del sistema cede a la de verdad
      cuando la planilla trae un sello más nuevo; salir no pregunta el «¿salir?» del navegador y, si el navegador no navega, la pestaña
      vuelve a la práctica entera a los 2 s.
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 node tests/test_modo_practica.js  (desde la raíz) */
let pw; try { pw=require('playwright'); } catch(e) { pw=require('/opt/node22/lib/node_modules/playwright'); }
const { chromium }=pw;
const fs=require('fs'), vm=require('vm'), path=require('path'), url=require('url');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const GS=process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS=process.env.PEDIDOS || path.resolve('pedidos.html');
const FOTOS=process.env.FOTOS || '';
const RELOJ='2026-11-18T10:00:00-04:00';          // miércoles, 10 de la mañana en Bolivia
const F1='2026-11-19', F2='2026-11-20';
const TS=(d,h)=>Date.parse(d+'T'+(h||'10:00')+':00-04:00');
const LECTURAS={ list:1, histStockLeer:1, gpsRuta:1, gpsHist:1, waRespuestas:1, rechazos:1, getlog:1 };

/* ── El servidor: el .gs real con un Google de mentira (como test_guardado_durable) ── */
function hacerPlanilla(filas){
  const datos=filas.map(f=>f.slice());
  return {
    _datos:datos,
    getLastRow:()=>datos.length, getLastColumn:()=>(datos[0]||[]).length,
    getDataRange:()=>({ getValues:()=>datos.map(f=>f.slice()) }),
    setFrozenRows:()=>{}, appendRow:(r)=>{ datos.push(r.slice()); }, deleteRow:(n)=>{ datos.splice(n-1,1); },
    getRange:(fila,col,nFilas,nCols)=>({
      getValue:()=>(datos[fila-1]||[])[col-1],
      setValue:(v)=>{ if(!datos[fila-1]) datos[fila-1]=[]; datos[fila-1][col-1]=v; },
      getValues:()=>{ const out=[]; for(let i=0;i<(nFilas||1);i++){ const f=datos[fila-1+i]||[], r=[]; for(let j=0;j<(nCols||1);j++) r.push(f[col-1+j]); out.push(r); } return out; },
      setValues:(v)=>{ for(let i=0;i<v.length;i++) datos[fila-1+i]=v[i].slice(); },
      setFontWeight:()=>{}, setNumberFormat:()=>{}
    }),
    getMaxRows:()=>datos.length+100, insertRowsAfter:()=>{}
  };
}
function servidor(){
  const HDR=['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
    '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
    'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
  const sh=hacerPlanilla([HDR]), shR=hacerPlanilla([]), props={};
  const cache={ _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); }, putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; }, removeAll(){} };
  const ctx={
    console:{ log(){}, warn(){}, error(){} }, Date,
    SpreadsheetApp:{ getActiveSpreadsheet:()=>({ getSheetByName:(n)=>n==='Rechazos'?shR:sh, insertSheet:(n)=>n==='Rechazos'?shR:sh }) },
    PropertiesService:{ getScriptProperties:()=>({ getProperty:(k)=>props[k]!=null?props[k]:null, setProperty:(k,v)=>{ props[k]=v; },
      deleteProperty:(k)=>{ delete props[k]; }, setProperties:(o)=>{ Object.assign(props,o); }, getProperties:()=>Object.assign({},props) }) },
    UrlFetchApp:{ fetch:()=>({ getResponseCode:()=>404, getContentText:()=>'{}' }) },
    LockService:{ getScriptLock:()=>({ waitLock(){}, releaseLock(){}, tryLock(){ return true; } }) },
    CacheService:{ getScriptCache:()=>cache },
    ContentService:{ MimeType:{JSON:'json'}, createTextOutput:(t)=>({ _t:t, setMimeType(){ return this; } }) },
    DriveApp:{ getFoldersByName:()=>({ hasNext:()=>false }), createFolder:()=>({ getId:()=>'f' }), getFileById:()=>{ throw new Error('no'); } },
    Utilities:{ formatDate:(d)=>String(d), base64Decode:()=>[], newBlob:()=>({}) },
    Session:{ getScriptTimeZone:()=>'America/La_Paz', getTemporaryActiveUserKey:()=>'ABCDEFGH' },
    ScriptApp:{ newTrigger:()=>({ timeBased:()=>({ after:()=>({ create:()=>({}) }), everyMinutes:()=>({ create:()=>({}) }), everyDays:()=>({ atHour:()=>({ create:()=>({}) }) }) }) }),
                getProjectTriggers:()=>[], deleteTrigger:()=>{} }
  };
  ctx.globalThis=ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS,'utf8'), ctx);
  const post=(bodyTxt)=>ctx.doPost({ postData:{ contents:bodyTxt }, parameter:{} })._t;
  const fila=(id)=>{ const r=sh._datos.find(f=>f[0]===id); return r ? ctx.rowToRec_(r) : null; };
  const guardar=(rec)=>JSON.parse(post(JSON.stringify({ action:'save', pedido:rec })));
  return { sh, post, fila, guardar };
}
const pedido=(o)=>Object.assign({
  fecha:F1, oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
  direccion:'Calle 1', maps:'', pagado:false, saldo:3000, ts:TS('2026-11-10'), metodoPago:'', observaciones:'', estado:'',
  entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
  productos:[{desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:3000}], rev:0
}, o);

(async () => {
  const browser=await chromium.launch({ executablePath:process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined), args:['--no-sandbox'] });
  const errores=[];
  const S=servidor();
  S.guardar(pedido({ id:'r1', cliente:'JUAN INVENTADO', oc:'11-201', nota:'5001', celular:'70011122' }));
  S.guardar(pedido({ id:'r2', cliente:'ANA INVENTADA', oc:'11-202', nota:'5002', celular:'70033344', fecha:F2 }));
  S.guardar(pedido({ id:'r3', cliente:'LUIS INVENTADO', oc:'11-205', nota:'5005', celular:'70066677', fecha:F2, turno:'PM' }));
  const filasAntes=S.sh._datos.length;

  /* Un aparato contra S. Registra TODAS las peticiones del navegador. */
  const abrir=async (o)=>{
    o=o||{};
    const ctx=await browser.newContext(Object.assign({ viewport:o.vp || { width:1280, height:900 }, timezoneId:'America/La_Paz' }, o.ctxOpts||{}));
    ctx.__log=[]; ctx.__popups=0; ctx.__ocupado=!!o.ocupado;
    ctx.on('request', (rq)=>{ let act=''; try{ const b=rq.postData(); if(b) act=(JSON.parse(b).action)||'save'; }catch(e){ act='?'; } ctx.__log.push({ url:rq.url(), m:rq.method(), act }); });
    await ctx.route(/^https?:/, async (r)=>{
      const rq=r.request();
      if(/script\.google\.com/.test(rq.url())){
        const cors={ 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' };
        if(rq.method()==='OPTIONS') return r.fulfill({ status:204, headers:cors });
        /* `ocupado`: el servidor contesta «busy» a todo lo que no es leer (la cola de verdad no puede salir) */
        if(ctx.__ocupado){ let a='save'; try{ a=JSON.parse(rq.postData()||'{}').action||'save'; }catch(e){} if(!LECTURAS[a]) return r.fulfill({ status:200, headers:Object.assign({ 'Content-Type':'application/json' }, cors), body:JSON.stringify({ ok:false, error:'busy' }) }); }
        let t; try{ t=S.post(rq.postData()||'{}'); }catch(e){ t=JSON.stringify({ ok:false, error:String(e) }); }
        return r.fulfill({ status:200, headers:Object.assign({ 'Content-Type':'application/json' }, cors), body:t });
      }
      return r.abort();
    });
    if(o.init) await ctx.addInitScript(o.init);
    const page=await ctx.newPage();
    page.on('pageerror', e=>errores.push(e.message));
    page.on('popup', ()=>{ ctx.__popups++; });
    page.__dialogos=[]; page.__tipos=[];
    /* `__cancelaSalida`: el aviso del navegador al irse (`beforeunload`) se CANCELA, como quien toca «Quedarse» */
    page.on('dialog', d=>{ page.__dialogos.push(d.message()); page.__tipos.push(d.type()); if(d.type()==='beforeunload' && page.__cancelaSalida) d.dismiss(); else d.accept(); });
    if(FOTOS) await page.emulateMedia({ reducedMotion:'reduce' });
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto(url.pathToFileURL(PEDIDOS).href+(o.practica ? '?practica=1' : ''), { waitUntil:'load' });
    await page.waitForTimeout(500);
    await conectar(page);
    page.__ctx=ctx;
    return page;
  };
  const conectar=(page)=>page.evaluate(async ()=>{
    UNLOCKED=true; CONNECTED=true;
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
    window.quieto=async function(){ for(var i=0;i<100;i++){ await esperar(50); if(!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length) break; } await esperar(120); };
    /* Una foto de verdad (un PNG chiquito armado acá), como la que elige la vendedora */
    window.unaFoto=async function(){ var c=document.createElement('canvas'); c.width=40; c.height=30; var g=c.getContext('2d'); g.fillStyle='#0a7'; g.fillRect(0,0,40,30);
      var b=await new Promise(function(r){ c.toBlob(r, 'image/png'); }); return new File([b], 'comprobante.png', { type:'image/png' }); };
    await refrescarEstado();
  });
  const escrituras=(ctx)=>ctx.__log.filter(x=>x.m!=='GET' && x.m!=='HEAD' && !LECTURAS[x.act]);
  const alGs=(ctx)=>ctx.__log.filter(x=>/script\.google\.com/.test(x.url));

  /* ════════════ 1. Prender con ?practica=1 ════════════ */
  console.log('\n── 1. Prender con ?practica=1 ──');
  const A=await abrir({ practica:true });
  let r=await A.evaluate(()=>{ var f=document.getElementById('pr-franja'), cs=getComputedStyle(f), h=document.querySelector('.header').getBoundingClientRect();
    return { on:window.PRACTICA===true, cls:document.documentElement.classList.contains('practica'), vis:cs.display!=='none' && f.getBoundingClientRect().height>20,
             txt:f.innerText.replace(/\s+/g,' '), adentro:f.getBoundingClientRect().top>=h.top-1 && f.getBoundingClientRect().bottom<=h.bottom+1,
             velo:getComputedStyle(document.querySelector('.pr-velo')).display, sesion:sessionStorage.getItem('me_practica'), titulo:document.title,
             r1:!!findById('r1'), cola0:window.PRACTICA_CAPA.real(LS_PEND) }; });
  chk('1a. la pestaña está en práctica (`PRACTICA`, `html.practica`) y queda anotado en la pestaña', r.on && r.cls && r.sesion==='1', r);
  chk('1b. la franja de arriba se ve, dice «MODO PRÁCTICA — nada de esto se guarda de verdad» y tiene «Salir», adentro del encabezado', r.vis && /MODO PRÁCTICA — nada de esto se guarda de verdad/.test(r.txt) && /Salir/.test(r.txt) && r.adentro, r);
  chk('1c. el encabezado cambia (velo a rayas) y el título de la pestaña dice «Práctica»', r.velo==='block' && /Práctica/.test(r.titulo), r);
  chk('1d. la lectura trae la planilla de VERDAD (los clientes de verdad se ven)', r.r1, r);
  await A.waitForTimeout(1400);
  r=await A.evaluate(()=>{ var t=document.getElementById('pr-tip'); return { tip:t && !t.hidden ? t.textContent : '' }; });
  chk('1e. Bloki saluda en la franja: «¡Estás practicando!»', /Estás practicando/.test(r.tip), r);
  {
    const A2=await abrir({ practica:true, init:()=>{ window.ASIS_PRUEBA=1; } });
    await A2.waitForTimeout(1500);
    r=await A2.evaluate(async ()=>{ var g=document.getElementById('asis-globo');
      practicaDecir('fecha'); await esperar(60); var t=g && !g.hidden ? g.textContent : '';
      asisAbrir('ayuda'); await esperar(40); var pa=(document.querySelector('#asis-panel .pr-asis')||{}).textContent||''; asisCerrar();
      return { globo:t, menu:pa, montado:ASIS.montado }; });
    chk('1f. con Bloki a la vista lo explica en su globo, y su menú dice «Estás en modo práctica»', r.montado && /día de entrega/.test(r.globo) && /Estás en modo práctica/.test(r.menu), r);
    await A2.__ctx.close();
  }

  /* ════════════ 2. Una venta con adelanto en QR, desde el formulario ════════════ */
  console.log('\n── 2. Venta con adelanto en QR ──');
  r=await A.evaluate(async (F)=>{
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
    tabNuevoPedido(); await esperar(150); resetForm();
    var tip1=(document.getElementById('pr-tip')||{}).textContent||'';
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='PEDRO DE PRÁCTICA'; document.getElementById('f-celular').value='70055566';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Calle Inventada 123';
    document.getElementById('f-fecha').value=F; document.getElementById('f-fecha').dispatchEvent(new Event('change', { bubbles:true }));
    var tipF=(document.getElementById('pr-tip')||{}).textContent||'';
    segSet('f-turno','AM'); document.getElementById('f-nota').value='9001';
    var pd=document.querySelector('#f-productos .prod-desc'); pd.value='TITANIO LATEX'; pd.dispatchEvent(new Event('input', { bubbles:true }));
    var tipP=(document.getElementById('pr-tip')||{}).textContent||'';
    document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
    segSet('f-pagado','NO'); updateMetodoVisibility();
    document.getElementById('f-acuenta').value='500'; document.getElementById('f-saldo').value='2500'; updateMetodoVisibility();
    segSet('f-metodo','QR'); updateBancoVisibility(); segSet('f-banco','BISA');
    /* la foto del comprobante, por el camino de la vendedora */
    COMP_DESTINO=1; await onCompFormElegido({ target:{ files:[await unaFoto()], value:'' } }); await esperar(200);
    var comps=FORM_COMPS.slice(), img=(document.querySelector('#f-comp-box img')||{}).src||'';
    submitPedido(); await esperar(900); await quieto();
    var p=STATE.filter(function(x){ return x.cliente==='PEDRO DE PRÁCTICA'; })[0];
    var m=document.getElementById('modal-box'), h=m ? (m.querySelector('.modal-h h3')||{}).textContent : '', res=m && m.querySelector('.pr-res') ? m.querySelector('.pr-res').innerText : '';
    window._idQr=p ? p.id : null;
    return { tip1:tip1, tipF:tipF, tipP:tipP, comps:comps, img:img.slice(0,5), id:p && p.id, oc:p && p.oc, rev:p && p.rev, mp:p && p.metodoPago, h:h, res:res,
             enPr:!!(p && practicaDatos().filas[p.id]), ej:practicaDatos().ej, ejN:(document.getElementById('pr-ej-n')||{}).textContent, toasts:window._toasts.slice(-3) };
  }, F1);
  chk('2a. Bloki explica el formulario, el día y el producto, en la franja', /pedido nuevo/i.test(r.tip1) && /día de entrega/i.test(r.tipF) && /producto/i.test(r.tipP), r);
  chk('2b. la foto del comprobante no se sube: queda en el aparato (id de práctica, se ve como «blob:»)', r.comps.length===1 && /^pr-/.test(r.comps[0]) && /^blob/.test(r.img), r);
  chk('2c. el pedido queda guardado (con su sello y su N° de OC) en la capa de práctica', !!r.id && Number(r.rev)>0 && /^11-/.test(r.oc||'') && r.enPr && /QR/.test(r.mp||''), r);
  chk('2d. la ventana dice «✅ Pedido de práctica guardado (no se guardó de verdad)» y qué hubiera pasado (bot, logística)', /Pedido de práctica guardado \(no se guardó de verdad\)/.test(r.h) && /No se guardó en la planilla/.test(r.res) && /logística/i.test(r.res) && /cliente/i.test(r.res), r);
  chk('2e. ejercicio «venta con adelanto en QR» tildado (1/5)', !!r.ej.venta_qr && r.ejN==='1/5', r);
  if(FOTOS){ await A.screenshot({ path:FOTOS+'/mall_practica_guardado_1280.png' }); }
  r=await A.evaluate(()=>{ closeModal(); return 1; });

  /* WhatsApp desde la ventana de guardado: no se abre */
  r=await A.evaluate(async ()=>{
    var w=window.open('https://wa.me/59170055566?text='+encodeURIComponent('Hola Pedro, tu pedido sale mañana'), '_blank');
    await esperar(50); var av=document.getElementById('pr-aviso'), t1=av && !av.hidden ? av.innerText : '';
    practicaAvisoCerrar();
    var a=document.createElement('a'); a.href='https://wa.me/59170055566?text=hola'; a.target='_blank'; a.textContent='wa'; document.body.appendChild(a); a.click(); a.remove();
    await esperar(50); var t2=av && !av.hidden ? av.innerText : ''; practicaAvisoCerrar();
    var b=document.createElement('a'); b.href='mailto:cliente@ejemplo.com?subject=Hola&body=Prueba'; document.body.appendChild(b); b.click(); b.remove();
    await esperar(50); var t3=av && !av.hidden ? av.innerText : ''; practicaAvisoCerrar();
    return { w:w===null, t1:t1, t2:t2, t3:t3 };
  });
  await A.waitForTimeout(300);
  chk('4a. `window.open` de WhatsApp no abre nada: sale el aviso con el mensaje y el número tapado', r.w && /no se abre WhatsApp/.test(r.t1) && /tu pedido sale mañana/.test(r.t1) && /•/.test(r.t1) && !/70055566/.test(r.t1), r);
  chk('4b. un enlace wa.me tampoco: el mismo aviso', /no se abre WhatsApp/.test(r.t2), r);
  chk('4c. un mailto tampoco: «no se abre el correo»', /no se abre el correo/.test(r.t3) && /cliente@ejemplo\.com/.test(r.t3), r);
  r=await A.evaluate(async ()=>{
    var a=document.createElement('a'); a.href='https://wa.me/59170055566?text=hola'; a.target='_blank'; a.textContent='wa'; document.body.appendChild(a);
    await esperar(40); var h=a.getAttribute('href'), d=a.getAttribute('data-pr-href'), tg=a.getAttribute('target');
    a.dispatchEvent(new MouseEvent('auxclick', { bubbles:true, cancelable:true, button:1 })); await esperar(30);
    var av=document.getElementById('pr-aviso'), t=av && !av.hidden ? av.innerText : ''; practicaAvisoCerrar(); a.remove();
    /* los botones de WhatsApp del panel (Mis pedidos) también quedan tapados */
    var w=misWaCliente('70011122'), b=document.createElement('div'); b.innerHTML='<a class="x" href="'+w+'" target="_blank">💬</a><a class="y" href="https://www.google.com/maps?q=1,2">mapa</a>'; document.body.appendChild(b);
    await esperar(40); var wa=b.querySelector('.x').getAttribute('href'), mapa=b.querySelector('.y').getAttribute('href'); b.remove();
    return { h:h, d:d, tg:tg, t:t, wa:wa, mapa:mapa };
  });
  chk('4d. en práctica el ENLACE de WhatsApp se reemplaza (href «#», el de verdad aparte, sin pestaña nueva) y el clic del medio muestra el aviso', r.h==='#' && /wa\.me/.test(r.d||'') && !r.tg && /no se abre WhatsApp/.test(r.t), r);
  chk('4e. los botones de WhatsApp al cliente del panel también; un enlace de mapa no se toca', r.wa==='#' && /google\.com\/maps/.test(r.mapa), r);
  chk('4f. ninguna ventana nueva se abrió', A.__ctx.__popups===0, A.__ctx.__popups);

  /* ════════════ Venta de tienda ════════════ */
  console.log('\n── 2. Venta de tienda ──');
  r=await A.evaluate(async ()=>{
    abrirVentaTienda(); await esperar(200);
    var tip=(document.getElementById('pr-tip')||{}).textContent||'';
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='LUCÍA DE PRÁCTICA'; document.getElementById('f-celular').value='70077788';
    document.getElementById('f-nota').value='9002';
    var pd=document.querySelector('#f-productos .prod-desc'); pd.value='ALMOHADA'; document.querySelector('#f-productos .prod-medida').value='50x70'; document.querySelector('#f-productos .prod-cant').value='1';
    segSet('f-pagado','SI'); updateMetodoVisibility(); document.getElementById('f-cobrado').value='250';
    segSet('f-metodo','Efectivo'); updateBancoVisibility();
    COMP_DESTINO=1; await onCompFormElegido({ target:{ files:[await unaFoto()], value:'' } }); await esperar(200);
    submitPedido(); await esperar(900); await quieto();
    var p=STATE.filter(function(x){ return x.cliente==='LUCÍA DE PRÁCTICA'; })[0];
    var h=(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'';
    window._idTienda=p ? p.id : null; try{ closeModal(); }catch(e){}
    return { tip:tip, id:p && p.id, tienda:p && esVentaTienda(p), h:h, ej:practicaDatos().ej };
  });
  chk('2f. Bloki explica la venta de tienda', /Venta de tienda/i.test(r.tip), r);
  chk('2g. la venta de tienda queda guardada de práctica y tilda su ejercicio', !!r.id && r.tienda && /de práctica/.test(r.h) && !!r.ej.tienda, r);

  /* ════════════ Cobrar el saldo en Contabilidad ════════════ */
  console.log('\n── 2. Cobrar el saldo ──');
  r=await A.evaluate(async ()=>{
    showView('conta'); await esperar(200);
    var tip=(document.getElementById('pr-tip')||{}).textContent||'';
    var antes=totalCobrado(findById('r1'));
    var foto=await apiFoto('r1', 'JUAN INVENTADO', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    showContaModal('r1'); CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=[foto.fotoId]; showContaModal('r1');
    document.getElementById('cta-pago-monto').value='1000';
    document.getElementById('cta-pago-fecha').value=todayStr();
    document.getElementById('cta-pago-nota').value='7001';
    ctaRegistrarPago('r1'); await esperar(500); await quieto();
    var p=findById('r1'); try{ closeModal(); }catch(e){}
    return { tip:tip, foto:foto, antes:antes, despues:totalCobrado(p), saldo:p.saldo, enPr:!!practicaDatos().filas.r1, ej:practicaDatos().ej };
  });
  chk('2h. Bloki explica Contabilidad', /Contabilidad/.test(r.tip), r);
  chk('2i. el pago de 1000 queda anotado (de práctica) y tilda «cobrá el saldo»', r.foto && r.foto.ok && /^pr-/.test(r.foto.fotoId) && r.despues-r.antes===1000 && r.enPr && !!r.ej.cobro, r);

  /* ════════════ ATC ════════════ */
  console.log('\n── 2. ATC ──');
  r=await A.evaluate(async (F)=>{
    tabNuevoPedido(); await esperar(150); resetForm();
    document.getElementById('f-fecha').value=F; segSet('f-turno','AM');
    document.querySelector('#f-doc-tipo button[data-val="ATC"]').click(); await esperar(50);
    var tip=(document.getElementById('pr-tip')||{}).textContent||'';
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='ROSA DE PRÁCTICA'; document.getElementById('f-celular').value='70099900';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av. Inventada 9';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX'; document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
    segSet('f-atc-tipo','gar');
    document.getElementById('f-atc-motivo').value='Hundimiento';
    document.getElementById('f-atc-detalle').value='hundido en el medio, no retoma su forma';
    document.getElementById('f-atc-compra').value='2025-06-10';
    var pz=document.querySelector('#f-atc-piezas input'); if(pz) pz.checked=true;
    submitPedido(); await esperar(900); await quieto();
    var p=STATE.filter(function(x){ return x.cliente==='ROSA DE PRÁCTICA'; })[0];
    var h=(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'';
    var res=(document.querySelector('#modal-box .pr-res')||{}).innerText||'';
    try{ closeModal(); }catch(e){}
    return { tip:tip, id:p && p.id, oc:p && p.oc, h:h, res:res, ej:practicaDatos().ej };
  }, F1);
  chk('2j. Bloki explica la ATC al tocar «🎧 ATC»', /ATC/.test(r.tip) && /obligatorio/.test(r.tip), r);
  chk('2k. la ATC queda guardada de práctica, «✅ ATC de práctica guardada» y tilda su ejercicio', /^ATC/.test(r.oc||'') && /ATC de práctica guardada/.test(r.h) && /correo/.test(r.res) && !!r.ej.atc, r);

  /* ════════════ Reprogramar y borrar ════════════ */
  console.log('\n── 2. Reprogramar y borrar ──');
  r=await A.evaluate(async (F2)=>{
    await reproAplicar(findById('r1'), F2, 'PM'); await esperar(300); await quieto();
    var p=findById('r1'), tip=(document.getElementById('pr-tip')||{}).textContent||'';
    var ej=practicaDatos().ej;
    deletePedido('r2'); await esperar(400); await quieto();
    deletePedido(window._idTienda); await esperar(400); await quieto();
    await refrescarEstado(); await esperar(100);
    return { fecha:p.fecha, turno:p.turno, tip:tip, ej:ej, r2:!!findById('r2'), tienda:!!findById(window._idTienda), bor:practicaDatos().borrados,
             ejN:(document.getElementById('pr-ej-n')||{}).textContent, tipB:(document.getElementById('pr-tip')||{}).textContent||'' };
  }, F2);
  chk('2l. reprogramar mueve el pedido (de práctica) y Bloki dice qué hubiera pasado', r.fecha===F2 && r.turno==='PM' && /Reprogramado \(de práctica\)/.test(r.tip) && !!r.ej.repro, r);
  chk('2m. borrar un pedido de verdad lo saca SOLO de la vista de práctica (también después de releer la planilla)', !r.r2 && r.bor.r2===1 && /Borrado de práctica/.test(r.tipB), r);
  chk('2n. borrar uno de práctica también', !r.tienda, r);
  chk('2o. los 5 ejercicios quedaron hechos (5/5)', r.ejN==='5/5', r.ejN);

  /* ════════════ 🧪 en las listas ════════════ */
  r=await A.evaluate(async ()=>{
    showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar'; try{ misVendedorSel(); }catch(e){} refreshMis(); await esperar(250);
    var cards=[].slice.call(document.querySelectorAll('#view-mis .cho-cli')).map(function(c){ return c.textContent.replace(/\s+/g,' ').trim(); });
    showView('atc'); await esperar(250);
    var atc=[].slice.call(document.querySelectorAll('#view-atc td b')).map(function(b){ return b.textContent.trim(); }).filter(function(t){ return /ROSA/.test(t); });
    return { cards:cards, atc:atc };
  });
  chk('2p. en Mis pedidos lo de práctica (y lo de verdad que se tocó en práctica) lleva 🧪, y lo de verdad sin tocar no', r.cards.some(c=>/🧪\s*PEDRO DE PRÁCTICA/.test(c)) && r.cards.some(c=>/🧪\s*JUAN INVENTADO/.test(c)) && r.cards.some(c=>c==='LUIS INVENTADO'), r);
  chk('2q. en ATC también', r.atc.some(t=>/^🧪/.test(t)), r);
  if(FOTOS){ await A.evaluate(()=>{ showView('mis'); var c=[].filter.call(document.querySelectorAll('#view-mis .cho-card'), function(x){ return /PEDRO DE PRÁCTICA/.test(x.textContent); })[0]; if(c) c.scrollIntoView({ block:'center' }); }); await A.waitForTimeout(400); await A.screenshot({ path:FOTOS+'/mall_practica_mis_1280.png' }); }

  /* ════════════ 3. Lo importante: nada salió ════════════ */
  console.log('\n── 3. Ninguna escritura salió del navegador ──');
  r=await A.evaluate(async ()=>{
    var directo=null; try{ await fetch(SHEETS_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body:JSON.stringify({ action:'save', pedido:{ id:'x-directo', cliente:'NO' } }) }); directo='salió'; }catch(e){ directo=String(e.message||e); }
    var sinAccion=null; try{ await fetch(SHEETS_URL, { method:'POST', body:JSON.stringify({ pedido:{ id:'x2' } }) }); sinAccion='salió'; }catch(e){ sinAccion=String(e.message||e); }
    var otros=await Promise.all([apiPost({ action:'kommoCierre', id:'r1' }), apiPost({ action:'leerNota', img:'x' }), apiPost({ action:'geocode', links:['https://maps.app.goo.gl/x'] }), apiPost({ action:'mallToque', x:1 }), apiPost({ action:'apartarCupo', f:'x' })]);
    return { directo:directo, sinAccion:sinAccion, otros:otros, frenados:window.PRACTICA_CAPA.frenados(), colaReal:window.PRACTICA_CAPA.real(LS_PEND), colaPr:getPending().length,
             borrarReal:window.PRACTICA_CAPA.real('me_borrar_pend'), mirror:(window.PRACTICA_CAPA.real(LS_KEY)||'').indexOf('PEDRO DE PRÁCTICA')>=0 };
  });
  const esc1=escrituras(A.__ctx), gs1=alGs(A.__ctx);
  chk('3a. ⚠️ en práctica NINGUNA petición de escritura salió del navegador (solo lecturas)', esc1.length===0 && gs1.length>0 && gs1.every(x=>LECTURAS[x.act]), { escrituras:esc1, acciones:[...new Set(gs1.map(x=>x.act))] });
  chk('3b. la planilla del servidor no cambió (ni filas nuevas ni el pago, el día o el borrado)', S.sh._datos.length===filasAntes && S.fila('r1').fecha===F1 && Number(S.fila('r1').saldo)===3000 && !!S.fila('r2'), { filas:S.sh._datos.length, r1:S.fila('r1') && S.fila('r1').fecha });
  chk('3c. un `fetch` de escritura hecho a mano (también sin `action`) lo frena la guarda del <head>', /practica/.test(r.directo) && /practica/.test(r.sinAccion) && r.frenados.length===2, r);
  chk('3d. Kommo, Claude, ubicar y cualquier acción nueva (mallToque, apartarCupo) se contestan de mentira sin salir', r.otros[0].ok===false && r.otros[0].error==='practica' && r.otros[1].error==='practica' && r.otros[2].ok && r.otros[2].geo[0].lat==null && r.otros[3].practica===1 && r.otros[4].practica===1 && escrituras(A.__ctx).length===0, r.otros);
  chk('3e. la cola durable DE VERDAD del aparato no tiene nada (ni los borrados pendientes), y la copia de verdad no tiene lo de práctica', !r.colaReal && !r.borrarReal && !r.mirror && r.colaPr===0, r);
  const realLS=await A.evaluate(()=>({ pend:window.PRACTICA_CAPA.real('ME_PENDING_V1'), vend:window.PRACTICA_CAPA.real('me_mis_vendedor') }));
  chk('3f. lo que la práctica escribe en el aparato va a su capa: el localStorage de verdad no se tocó', !realLS.pend && realLS.vend==null, realLS);

  /* ════════════ 5. Recargar conserva la práctica; «Salir» borra todo ════════════ */
  console.log('\n── 5. Recargar y salir ──');
  await A.reload({ waitUntil:'load' }); await A.waitForTimeout(500); await conectar(A);
  r=await A.evaluate(()=>({ on:window.PRACTICA, pedro:STATE.some(function(p){ return p.cliente==='PEDRO DE PRÁCTICA'; }), r2:!!findById('r2'), ejN:(document.getElementById('pr-ej-n')||{}).textContent }));
  chk('5a. recargar la pestaña: sigue en práctica, con lo cargado y lo borrado', r.on===true && r.pedro && !r.r2 && r.ejN==='5/5', r);
  if(FOTOS){ await A.evaluate(()=>{ practicaEjercicios(); }); await A.waitForTimeout(250); await A.screenshot({ path:FOTOS+'/mall_practica_ejercicios_1280.png' }); await A.evaluate(()=>closeModal()); }
  const antesSalir=escrituras(A.__ctx).length;
  await Promise.all([ A.waitForNavigation({ waitUntil:'load' }), A.evaluate(()=>{ practicaSalir(); }) ]);
  await A.waitForTimeout(500); await conectar(A);
  r=await A.evaluate(()=>({ on:window.PRACTICA, cls:document.documentElement.classList.contains('practica'), franja:getComputedStyle(document.getElementById('pr-franja')).display,
    pedro:STATE.some(function(p){ return p.cliente==='PEDRO DE PRÁCTICA'; }), r2:!!findById('r2'), r1:(findById('r1')||{}).fecha, saldo:(findById('r1')||{}).saldo,
    ses:['me_practica','me_practica_datos','me_practica_ls','me_practica_ss','me_practica_fotos'].map(function(k){ return sessionStorage.getItem(k); }),
    cola:getPending().length, url:location.search, titulo:document.title }));
  chk('5b. «Salir» pregunta antes', A.__dialogos.some(d=>/Salir del modo práctica/.test(d)), A.__dialogos.slice(-2));
  chk('5c. después de salir: la pestaña es la de siempre (sin franja, sin «Práctica» en el título)', r.on===false && !r.cls && r.franja==='none' && !/Práctica/.test(r.titulo) && !/practica/.test(r.url), r);
  chk('5d. lo de práctica desapareció y la planilla de verdad volvió (r2 está, r1 con su día y su saldo)', !r.pedro && r.r2 && r.r1===F1 && Number(r.saldo)===3000, r);
  chk('5e. no quedó nada de práctica en la pestaña ni en la cola', r.ses.every(v=>v==null) && r.cola===0, r);
  chk('5f. salir no mandó nada', escrituras(A.__ctx).length===antesSalir && antesSalir===0, escrituras(A.__ctx));
  await A.__ctx.close();

  /* ════════════ 6. Sin práctica todo sigue igual: un guardado SÍ sale ════════════ */
  console.log('\n── 6. Sin práctica ──');
  const B=await abrir({});
  r=await B.evaluate(async (F)=>{
    var on=window.PRACTICA, cls=document.documentElement.classList.contains('practica'), fr=getComputedStyle(document.getElementById('pr-franja')).display;
    tabNuevoPedido(); await esperar(150); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='CARLOS DE VERDAD'; document.getElementById('f-celular').value='70012121';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Calle 5';
    document.getElementById('f-fecha').value=F; segSet('f-turno','PM'); document.getElementById('f-nota').value='9100';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX'; document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
    document.getElementById('f-saldo').value='3000';
    submitPedido(); await esperar(900); await quieto();
    var h=(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'', pr=!!document.querySelector('#modal-box .pr-res');
    var w=null; try{ w=window.open('about:blank', '_blank'); }catch(e){} if(w) try{ w.close(); }catch(e){}
    return { on:on, cls:cls, fr:fr, h:h, pr:pr, chip:document.querySelectorAll('.pr-chip').length, open:typeof window.open };
  }, F1);
  const esc2=escrituras(B.__ctx);
  chk('6a. sin práctica no hay franja, ni capa, ni marcas', r.on===false && !r.cls && r.fr==='none' && r.chip===0, r);
  chk('6b. un guardado normal SÍ sale («save») y queda en la planilla', esc2.some(x=>x.act==='save') && S.sh._datos.some(f=>f[4]==='CARLOS DE VERDAD'), esc2.map(x=>x.act));
  chk('6c. la ventana dice «✅ Pedido guardado», sin lo de práctica', /✅ Pedido guardado/.test(r.h) && !/práctica/.test(r.h) && !r.pr, r);

  /* ════════════ 7. Prenderlo desde «¿Quién está usando…?» y desde Bloki ════════════ */
  console.log('\n── 7. Prender desde la ventana de quién y desde Bloki ──');
  r=await B.evaluate(()=>{ window.QUIEN_PRUEBA=1; quienAbrir(false); var b=document.querySelector('#quien .quien-pr button'); return { txt:b ? b.textContent : '', n:document.querySelectorAll('#quien .quien-b').length }; });
  chk('7a. «¿Quién está usando el panel?» ofrece «🧪 Soy nuevo/a: quiero practicar sin guardar nada»', /Soy nuevo\/a: quiero practicar/.test(r.txt) && r.n>=9, r);
  r=await B.evaluate(()=>{ quienCerrar(); ASIS.abierto=true; ASIS.tab='ayuda'; var p=document.getElementById('asis-panel'); if(!p){ p=document.createElement('div'); p.id='asis-panel'; document.body.appendChild(p); } asisPanelPintar(); var b=document.querySelector('#asis-panel .pr-asis button'); var t=b ? b.textContent : ''; asisCerrar(); return t; });
  chk('7b. el menú de Bloki («💬 Preguntame») ofrece el modo práctica', /Modo práctica/.test(r), r);
  B.__dialogos.length=0;
  await Promise.all([ B.waitForNavigation({ waitUntil:'load' }), B.evaluate(()=>{ quienAbrir(false); document.querySelector('#quien .quien-pr button').click(); }) ]);
  await B.waitForTimeout(400);
  r=await B.evaluate(()=>({ on:window.PRACTICA, cls:document.documentElement.classList.contains('practica') }));
  chk('7c. tocarlo pregunta antes y la pestaña se vuelve a abrir en práctica', B.__dialogos.some(d=>/Prender el MODO PRÁCTICA/.test(d)) && r.on===true && r.cls, { dialogos:B.__dialogos, r });
  await B.__ctx.close();

  /* ════════════ 8. 390 px ════════════ */
  console.log('\n── 8. En el celular ──');
  const C=await abrir({ practica:true, vp:{ width:390, height:844 } });
  r=await C.evaluate(async (F)=>{
    tabNuevoPedido(); await esperar(150); resetForm();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='MARTA DE PRÁCTICA'; document.getElementById('f-celular').value='70045454';
    document.getElementById('f-zona').value='Sur'; document.getElementById('f-direccion').value='Calle Inventada 7';
    document.getElementById('f-fecha').value=F; segSet('f-turno','AM'); document.getElementById('f-nota').value='9300';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX'; document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
    document.getElementById('f-saldo').value='3000';
    submitPedido(); await esperar(900); await quieto();
    var f=document.getElementById('pr-franja').getBoundingClientRect();
    return { ancho:document.documentElement.scrollWidth, vw:innerWidth, fr:f.right<=innerWidth+1 && f.left>=-1, h:(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'' };
  }, F1);
  chk('8a. en 390 px la franja entra y no hay scroll de costado', r.ancho<=r.vw && r.fr, r);
  chk('8b. y el pedido de práctica se guarda igual', /Pedido de práctica guardado/.test(r.h), r);
  if(FOTOS){ await C.screenshot({ path:FOTOS+'/mall_practica_guardado_390.png' }); await C.evaluate(()=>{ closeModal(); window.scrollTo(0,0); }); await C.waitForTimeout(200); await C.screenshot({ path:FOTOS+'/mall_practica_franja_390.png' }); }
  chk('8c. en el celular tampoco salió ninguna escritura', escrituras(C.__ctx).length===0, escrituras(C.__ctx));
  await C.__ctx.close();

  /* ════════════ 9. Lo de VERDAD que esperaba en la cola se queda quieto y sale al salir ════════════ */
  console.log('\n── 9. La cola de verdad ──');
  const enCola=pedido({ id:'q1', cliente:'COLA DE VERDAD', oc:'11-210', nota:'5010', celular:'70088899', ts:TS('2026-11-18','09:00') });
  const D=await abrir({ practica:true, init:`try{ if(!sessionStorage.getItem('__sembrado')){ sessionStorage.setItem('__sembrado','1'); localStorage.setItem('ME_PENDING_V1', JSON.stringify([${JSON.stringify(enCola)}])); } }catch(e){}` });
  await D.waitForTimeout(1500);
  r=await D.evaluate(async ()=>{ await flushPending(); await esperar(200);
    return { real:JSON.parse(window.PRACTICA_CAPA.real(LS_PEND)||'[]').map(function(x){ return x.id; }), pr:getPending().length, tip:(document.getElementById('pr-tip')||{}).textContent||'' }; });
  chk('9a. en práctica, lo de verdad que esperaba en la cola NO se manda (ni de mentira) y sigue en la cola de verdad', escrituras(D.__ctx).length===0 && r.real.join()==='q1' && r.pr===0 && !S.fila('q1'), r);
  chk('9b. y Bloki avisa que hay 1 guardado de VERDAD esperando', /1 guardado de VERDAD esperando/.test(r.tip), r);
  r=await D.evaluate(()=>{ var c=document.getElementById('pr-cola'); return { vis:!!c && !c.hidden && getComputedStyle(c).display!=='none', txt:c ? c.textContent : '' }; });
  chk('9b2. con `?practica=1` y la cola de verdad con algo, la franja lo dice FIJO («Hay 1 guardado de VERDAD esperando… Tocá «Salir»»)', r.vis && /Hay 1 guardado de VERDAD esperando/.test(r.txt) && /Salir/.test(r.txt), r);
  await Promise.all([ D.waitForNavigation({ waitUntil:'load' }), D.evaluate(()=>{ practicaSalir(); }) ]);
  await D.waitForTimeout(400); await conectar(D); await D.evaluate(async ()=>{ await flushPending(); await esperar(300); });
  chk('9c. al salir de la práctica, el guardado de verdad sale solo y llega a la planilla', escrituras(D.__ctx).some(x=>x.act==='save') && !!S.fila('q1') && S.fila('q1').cliente==='COLA DE VERDAD', escrituras(D.__ctx));
  await D.__ctx.close();

  /* ════════════ 10. Lo que encontró la revisión del 14/11 ════════════ */
  console.log('\n── 10. Revisión del 14/11 ──');
  const conToasts=(page)=>page.evaluate(()=>{ window._toasts=[]; if(!window._toastOrig) window._toastOrig=toast; toast=function(m){ window._toasts.push(String(m)); return window._toastOrig.apply(null, arguments); }; });
  /* 10a-10d · la hoja de COMPARTIR del celular (`navigator.share`) */
  {
    const shareInit=()=>{ window.__share=[]; try{
      Object.defineProperty(Navigator.prototype, 'canShare', { value:()=>true, configurable:true });
      Object.defineProperty(Navigator.prototype, 'share', { value:(d)=>{ window.__share.push({ text:d && d.text, files:((d && d.files)||[]).length }); return Promise.resolve(); }, configurable:true });
    }catch(e){} };
    const M=await abrir({ practica:true, vp:{ width:390, height:844 }, ctxOpts:{ hasTouch:true, isMobile:true }, init:shareInit });
    r=await M.evaluate(async ()=>{
      var o={ coarse:cotEsCelular() };
      var b=await new Promise(function(res){ var c=document.createElement('canvas'); c.width=10; c.height=10; c.toBlob(res, 'image/png'); });
      COT.ultima={ id:'c1', num:'C-1', cliente:'CLIENTE INVENTADO', celular:'70011122', productos:[{ desc:'TITANIO', medida:'140x190', cant:1, precio:3000 }], total:3000, vence:'2026-11-20', entregaDesde:'2026-11-19', vendedor:'Mirian Salazar' };
      COT.blob={ id:'c1', num:'C-1', b:b };
      cotMandarWa(); await esperar(300);
      var av=document.getElementById('pr-aviso'); o.aviso=av && !av.hidden ? av.innerText : ''; practicaAvisoCerrar();
      o.puede=navigator.canShare({ files:[new File([b], 'x.png', { type:'image/png' })] });
      try{ await navigator.share({ text:'Hola de verdad, tu certificado' }); o.err='compartió'; }catch(e){ o.err=e && e.name; }
      o.aviso2=av && !av.hidden ? av.innerText : ''; practicaAvisoCerrar();
      o.share=window.__share.slice();
      return o;
    });
    chk('10a. en práctica, «Mandar por WhatsApp» de una cotización en el celular NO abre la hoja de compartir: sale el aviso con el mensaje', r.coarse && r.share.length===0 && /no se abre WhatsApp/.test(r.aviso) && /Cotización C-1/.test(r.aviso), r);
    chk('10b. `navigator.canShare` dice que no y `navigator.share` muestra el aviso con el texto y contesta «cancelado» (`AbortError`)', r.puede===false && r.err==='AbortError' && /Hola de verdad, tu certificado/.test(r.aviso2), r);
    chk('10c. el celular en práctica no compartió nada ni abrió otra ventana', r.share.length===0 && M.__ctx.__popups===0, { share:r.share, popups:M.__ctx.__popups });
    await M.__ctx.close();
    const M2=await abrir({ vp:{ width:390, height:844 }, ctxOpts:{ hasTouch:true, isMobile:true }, init:shareInit });
    r=await M2.evaluate(async ()=>{ await navigator.share({ text:'de verdad' }); return { share:window.__share.slice(), puede:navigator.canShare({}) }; });
    chk('10d. sin práctica la hoja de compartir sigue como siempre', r.share.length===1 && r.share[0].text==='de verdad' && r.puede===true, r);
    await M2.__ctx.close();
  }

  /* 10e-10h · prender la práctica con guardados de VERDAD en la cola */
  try{
    const q2=pedido({ id:'q2', cliente:'COLA ANTES DE PRACTICAR', oc:'11-211', nota:'5011', celular:'70012345', ts:TS('2026-11-18','09:10') });
    /* el servidor está ocupado desde que abre la página: la cola no puede salir */
    const E=await abrir({ ocupado:true, init:`try{ if(!localStorage.getItem('__s2')){ localStorage.setItem('__s2','1'); localStorage.setItem('ME_PENDING_V1', JSON.stringify([${JSON.stringify(q2)}])); } }catch(e){}` });
    await conToasts(E); E.__dialogos.length=0;
    r=await E.evaluate(async ()=>{ var p=practicaEntrar(); if(p && p.then) await p; await esperar(300);
      return { on:window.PRACTICA, ses:sessionStorage.getItem('me_practica'), cola:getPending().map(function(x){ return x.id; }), t:window._toasts.join(' | ') }; });
    chk('10e. con un guardado de verdad que no puede salir, la práctica NO se prende y se dice («Hay 1 guardado de VERDAD esperando… esperá a que salgan»)',
        E.__dialogos.some(d=>/Prender el MODO PRÁCTICA/.test(d)) && r.on===false && r.ses==null && r.cola.join()==='q2' && /Hay 1 guardado de VERDAD esperando/.test(r.t) && /esperá a que salgan/.test(r.t) && !S.fila('q2'), r);
    /* vuelve el servidor: prender manda primero la cola y después se prende */
    E.__ctx.__ocupado=false; E.__ctx.__log.length=0;
    await Promise.all([ E.waitForNavigation({ waitUntil:'load', timeout:10000 }), E.evaluate(()=>{ practicaEntrar(); }) ]);
    await E.waitForTimeout(500); await conectar(E);
    r=await E.evaluate(()=>{ var c=document.getElementById('pr-cola'); return { on:window.PRACTICA, real:JSON.parse(window.PRACTICA_CAPA.real(LS_PEND)||'[]').length, aviso:!!c && !c.hidden }; });
    const saveAntes=E.__ctx.__log.findIndex(x=>x.act==='save');
    chk('10f. al prenderla, primero sale lo que esperaba en la cola (llega a la planilla) y recién ahí la pestaña queda en práctica, sin aviso de cola',
        saveAntes>=0 && !!S.fila('q2') && S.fila('q2').cliente==='COLA ANTES DE PRACTICAR' && r.on===true && r.real===0 && !r.aviso, { r, saveAntes, fila:!!S.fila('q2') });
    /* otra pestaña de este aparato (sin práctica) deja algo en la cola de verdad: la franja lo dice al momento, y cuando sale se va */
    E.__ctx.__ocupado=true;
    const E2=await E.__ctx.newPage();
    await E2.goto(url.pathToFileURL(PEDIDOS).href, { waitUntil:'load' }); await E2.waitForTimeout(300);
    const q3=pedido({ id:'q3', cliente:'COLA DE OTRA PESTAÑA', oc:'11-212', nota:'5012', celular:'70054321' });
    /* (lo que escribe otra pestaña llega con retraso: se espera hasta 4 s a que se vea) */
    const colaVis=(quiere)=>E.evaluate(async (q)=>{ for(var i=0;i<40;i++){ var c=document.getElementById('pr-cola'); if((!!c && !c.hidden)===q) break; await esperar(100); }
      var c2=document.getElementById('pr-cola'); return { vis:!!c2 && !c2.hidden, txt:c2 ? c2.textContent : '' }; }, quiere);
    await E2.evaluate((q)=>{ localStorage.setItem('ME_PENDING_V1', JSON.stringify([q])); }, q3);
    r=await colaVis(true);
    await E2.evaluate(()=>{ localStorage.removeItem('ME_PENDING_V1'); });
    const r2=(await colaVis(false)).vis;
    chk('10g. la franja sigue la cola de verdad que deja otra pestaña: aparece «Hay 1 guardado de VERDAD esperando» y se va cuando sale', r.vis && /Hay 1 guardado de VERDAD esperando/.test(r.txt) && r2===false, { r, despues:r2 });
    E.__ctx.__ocupado=false;
    await E2.close();

    await E.__ctx.close();
  }catch(e){ chk('10e-10g. la prueba no pudo seguir', false, String(e && e.message || e).slice(0,200)); }

  /* 10h-10j · una fila del SISTEMA que el resto del equipo sigue guardando no queda congelada en la práctica */
  try{
    const F=await abrir({ practica:true });
    F.__ctx.__log.length=0;
    S.guardar(pedido({ id:'__pr_sis__', fecha:'', oc:'', cliente:'FILA DEL SISTEMA (prueba)', observaciones:'real v1', nota:'', celular:'', productos:[], saldo:0 }));
    r=await F.evaluate(async ()=>{
      var fila=function(j, id){ return ((j && j.pedidos)||[]).filter(function(x){ return x && x.id===id; })[0] || null; };
      var j1=await apiList(), v1=fila(j1, '__pr_sis__'), r3=fila(j1, 'r3');
      await apiPost({ action:'save', pedido:Object.assign({}, v1, { observaciones:'de práctica' }) });
      await apiPost({ action:'save', pedido:Object.assign({}, r3, { observaciones:'r3 de práctica' }) });
      var j2=await apiList();
      return { v1:v1 && v1.observaciones, sis2:(fila(j2, '__pr_sis__')||{}).observaciones, r3b:(fila(j2, 'r3')||{}).observaciones };
    });
    const sisRev=S.fila('__pr_sis__').rev;
    S.guardar(Object.assign({}, S.fila('__pr_sis__'), { observaciones:'real v2' }));
    S.guardar(Object.assign({}, S.fila('r3'), { observaciones:'r3 de verdad, cambiado' }));
    const r4=await F.evaluate(async ()=>{
      var fila=function(j, id){ return ((j && j.pedidos)||[]).filter(function(x){ return x && x.id===id; })[0] || null; };
      var j3=await apiList();
      return { sis3:(fila(j3, '__pr_sis__')||{}).observaciones, enPr:!!practicaDatos().filas['__pr_sis__'], r3c:(fila(j3, 'r3')||{}).observaciones, r3Pr:!!practicaDatos().filas.r3 };
    });
    chk('10h. en práctica una fila del sistema guardada de práctica se ve de práctica mientras la de verdad no cambia…', r.v1==='real v1' && r.sis2==='de práctica' && r.r3b==='r3 de práctica', r);
    chk('10i. …y cuando el resto del equipo la guarda (sello más nuevo) manda la de verdad; un PEDIDO tocado en práctica sigue siendo el de práctica',
        r4.sis3==='real v2' && !r4.enPr && r4.r3c==='r3 de práctica' && r4.r3Pr && Number(S.fila('__pr_sis__').rev)>Number(sisRev), r4);
    chk('10j. y la pestaña en práctica no mandó ninguna escritura', escrituras(F.__ctx).length===0, escrituras(F.__ctx));
    await F.__ctx.close();
  }catch(e){ chk('10h-10j. la prueba no pudo seguir', false, String(e && e.message || e).slice(0,200)); }

  /* 10k-10n · «Salir» con una imagen sin pegar, y si el navegador no navega */
  try{
    const G=await abrir({ practica:true });
    r=await G.evaluate(async ()=>{ var f=await apiFoto('x', 'X', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==');
      FORM_COMPS=[f.fotoId]; return { id:f.fotoId, sinPegar:imagenesSinPegar().length }; });
    G.__tipos.length=0;
    await Promise.all([ G.waitForNavigation({ waitUntil:'load', timeout:10000 }), G.evaluate(()=>{ practicaSalir(); }) ]);
    await G.waitForTimeout(400);
    const g=await G.evaluate(()=>({ on:window.PRACTICA, ses:sessionStorage.getItem('me_practica') }));
    chk('10k. salir de la práctica con una imagen de práctica sin pegar no pregunta el «¿salir?» del navegador (se borra todo igual) y sale', r.sinPegar===1 && !G.__tipos.includes('beforeunload') && g.on===false && g.ses==null, { r, tipos:G.__tipos, g });
    await G.__ctx.close();

    /* Una pestaña en práctica (prendida desde la pestaña, sin `?practica=1`) a la que el navegador no la deja irse */
    const H=await abrir({});
    await Promise.all([ H.waitForNavigation({ waitUntil:'load' }), H.evaluate(()=>{ sessionStorage.setItem('me_practica', '1'); location.reload(); }) ]);
    await H.waitForTimeout(400); await conectar(H); await conToasts(H);
    r=await H.evaluate(async ()=>{ await apiPost({ action:'save', pedido:{ id:'x-antes', cliente:'ANTES DE SALIR', fecha:'', productos:[] } });
      window.__frena=function(e){ e.preventDefault(); e.returnValue=''; }; addEventListener('beforeunload', window.__frena); return window.PRACTICA; });
    H.__cancelaSalida=true; H.__tipos.length=0;
    await H.evaluate(()=>{ practicaSalir(); });
    await H.waitForTimeout(2600);
    r=await H.evaluate(async ()=>{
      var o={ on:window.PRACTICA, sal:!!window.PRACTICA_SALIENDO, ses:sessionStorage.getItem('me_practica'), datos:/ANTES DE SALIR/.test(sessionStorage.getItem('me_practica_datos')||''), t:window._toasts.join(' | ') };
      var g=await apiPost({ action:'save', pedido:{ id:'x-tras', cliente:'TRAS CANCELAR', fecha:'', productos:[] } }); o.guarda=!!(g && g.ok && g.practica);
      localStorage.setItem('me_prueba_capa', '1'); await esperar(450);
      o.capa=/me_prueba_capa/.test(sessionStorage.getItem('me_practica_ls')||''); o.real=window.PRACTICA_CAPA.real('me_prueba_capa');
      removeEventListener('beforeunload', window.__frena);
      return o;
    });
    chk('10l. si el navegador no navega (se canceló su «¿salir?»), a los 2 s la pestaña vuelve a la práctica ENTERA: la marca, lo cargado y el aviso',
        H.__tipos.includes('beforeunload') && r.on===true && r.sal===false && r.ses==='1' && r.datos && /Seguís en el modo práctica/.test(r.t), r);
    chk('10m. …y sigue andando de práctica: guarda de mentira y la capa del aparato vuelve a guardarse (el localStorage de verdad no se toca)', r.guarda && r.capa && r.real==null, r);
    /* si igual se iba (una navegación lenta, más de 2 s) dentro del minuto, se va SIN práctica */
    H.__cancelaSalida=false;
    await Promise.all([ H.waitForNavigation({ waitUntil:'load' }), H.evaluate(()=>{ location.reload(); }) ]);
    await H.waitForTimeout(400);
    const h=await H.evaluate(()=>({ on:window.PRACTICA, ses:['me_practica','me_practica_datos','me_practica_ls'].map(function(k){ return sessionStorage.getItem(k); }) }));
    chk('10n. y si la página igual se va dentro del minuto de haber pedido salir (navegación lenta), se va sin práctica y sin nada de práctica', h.on===false && h.ses.every(v=>v==null), h);
    chk('10o. en todo esto no salió ninguna escritura', escrituras(H.__ctx).length===0, escrituras(H.__ctx));
    await H.__ctx.close();
  }catch(e){ chk('10k-10o. la prueba no pudo seguir', false, String(e && e.message || e).slice(0,200)); }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); console.log('\n'+PASS+' bien · '+(FAIL+1)+' mal'); process.exit(1); });
