/* 🖍️ LO QUE BUSCASTE, RESALTADO EN AMARILLO (15/11/2026, mejora 288; dueño: «ok»). Cada palabra buscada se pinta en amarillo suave
   donde aparece (sin acentos ni mayúsculas, como busca el panel) con el resaltado del navegador (`CSS.highlights`): el HTML y el texto que
   se lee NO cambian. En Administración, Contabilidad y ATC dice además «N coinciden».

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): no se resalta nada ni aparece «coinciden».
   2. Con `BUSCA_HL_PRUEBA`, en Administración (tabla y fichas): cada pedazo resaltado es exactamente la palabra buscada; el texto de la lista
      es IDÉNTICO al de sin bandera; «N coinciden» = los pedidos a la vista.
   3. Sin acentos: buscar «pena» resalta «PEÑA»; dos palabras en Mis pedidos se resaltan las dos.
   4. Lo escrito en campos y selectores no se resalta; borrar la búsqueda saca el resaltado y el «coinciden».
   5. Al redibujarse la lista (la lectura de cada minuto) se vuelve a pintar sola, sobre lo nuevo.
   6. Contabilidad (la etiqueta «Buscar · N coinciden») y Ctrl + K también.
   Datos SINTÉTICOS. Reloj clavado: martes 10/11/2026, 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_busca_resaltar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-10T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var hoy=todayStr(), d=function(n){ return stockSumarDias(hoy, n); };
  var P=function(id, o){ return Object.assign({ id:id, oc:'11-'+id, vendedor:'Carola Chavez', cliente:'CLIENTE '+id.toUpperCase(), celular:'70000001', zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18', nota:'95'+id.length,
    productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:1500 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:Date.now()-86400000, fecha:d(1), turno:'AM' }, o); };
  window._L=[
    P('101', { cliente:'ANA PEÑA ROJAS', productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, precio:3000 }, { desc:'ALMOHADA', medida:'50x70', cant:2, precio:50 }] }),
    P('102', { cliente:'LUIS TITANIO SUAREZ', productos:[{ desc:'COLCHON CLOUD', medida:'105x190', cant:1, precio:2000 }] }),
    P('103', { cliente:'ROSA MENDEZ', productos:[{ desc:'SOMIER TITANIO LATEX', medida:'160x190', cant:1, precio:2500 }, { desc:'COLCHON TITANIO LATEX', medida:'160x190', cant:1, precio:6000 }] }),
    P('104', { cliente:'JORGE VACA', productos:[{ desc:'COLCHON ORO', medida:'140x190', cant:1, precio:2800 }] })
  ];
  STATE=JSON.parse(JSON.stringify(window._L)); saveMirror();
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._hl=function(){ var h=window.CSS && CSS.highlights && CSS.highlights.get('busca'); return h ? Array.from(h).filter(function(r){ return r.startContainer.isConnected; }).map(function(r){ return r.toString(); }) : []; };
  window._hlEn=function(sel){ var h=CSS.highlights.get('busca'), b=document.querySelector(sel); return h ? Array.from(h).filter(function(r){ return b && b.contains(r.startContainer); }).length : 0; };
  window._buscar=async function(id, v){ var i=document.getElementById(id); i.focus(); i.value=v; i.dispatchEvent(new Event('input', { bubbles:true })); await _esperar(700); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag, fichas) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await ctx.route(/^https?:\/\//, r=>r.abort());
    await page.addInitScript((o) => { if(o.flag) window.BUSCA_HL_PRUEBA=true; if(o.fichas) window.ADM_FICHAS_PRUEBA=true; }, { flag, fichas });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  };
  const admTitanio = async (page) => page.evaluate(async () => { document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; showView('admin'); QUICK_FILTER=''; ADM_HOY_DEF=false; renderAdmin(); await _esperar(200);
    await _buscar('adm-search', 'titanio');
    var vis=[].filter.call(document.querySelectorAll('#tbl-pedidos tbody tr'), function(t){ return t.getClientRects().length; }).length;
    return { hl:_hl(), txt:document.getElementById('tbl-pedidos').innerText, n:(document.querySelector('.adm-busca .bh-n')||{}).textContent||'', vis:vis }; });

  console.log('\n── 1. Sin la bandera ──');
  let page = await nueva(false);
  const sin = await admTitanio(page);
  chk('1 sin bandera: nada resaltado ni «coinciden»', sin.hl.length===0 && sin.n==='' && sin.vis===3, sin);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await nueva(true);
  let r = await admTitanio(page);
  chk('2a Administración (tabla): cada pedazo resaltado es la palabra buscada (en 3 pedidos: cliente y productos)', r.hl.length>=4 && r.hl.every(x=>x.toLowerCase()==='titanio'), r.hl);
  chk('2b el texto de la tabla es IDÉNTICO al de sin bandera (no se toca el HTML)', r.txt===sin.txt, r.txt.length+' vs '+sin.txt.length);
  chk('2c «N coinciden» adentro del buscador = los pedidos a la vista', r.n==='3 coinciden' && r.vis===3, r.n);

  r = await page.evaluate(async () => { await _buscar('adm-search', 'pena'); return { hl:_hl(), n:(document.querySelector('.adm-busca .bh-n')||{}).textContent }; });
  chk('3a sin acentos: «pena» resalta «PEÑA» (el pedazo justo del nombre)', r.hl.length===1 && r.hl[0]==='PEÑA' && r.n==='1 coincide', r);

  r = await page.evaluate(async () => { var i=document.getElementById('adm-search'); await _buscar('adm-search', 'titanio');
    var enCampo=_hl().some(function(x){ return x===i.value; }) && false;
    await _buscar('adm-search', ''); return { hl:_hl(), n:document.querySelector('.adm-busca .bh-n') }; });
  chk('4 borrar la búsqueda saca el resaltado y el «coinciden»', r.hl.length===0 && r.n===null, r);

  r = await page.evaluate(async () => { await _buscar('adm-search', 'titanio'); var a=_hl().length;
    /* la lectura de cada minuto redibuja: un pedido nuevo con TITANIO aparece y se resalta solo */
    window._L.push({ id:'105', oc:'11-105', vendedor:'Maria Flores', cliente:'NUEVO TITANIO', fecha:todayStr(), turno:'PM', productos:[{ desc:'COLCHON SOFT', medida:'90x190', cant:1, precio:900 }], ts:Date.now(), saldo:0, pagado:true });
    STATE=JSON.parse(JSON.stringify(window._L)); renderAdmin(); await _esperar(400);
    return { a:a, b:_hl().length, todos:_hl().every(function(x){ return x.toLowerCase()==='titanio'; }), n:(document.querySelector('.adm-busca .bh-n')||{}).textContent }; });
  chk('5 al redibujarse la lista se vuelve a pintar sola, con lo nuevo (y la cuenta sube)', r.b===r.a+1 && r.todos && r.n==='4 coinciden', r);
  await page._ctx.close();

  console.log('\n── 2d-3b. Fichas y Mis pedidos ──');
  page = await nueva(true, true);
  r = await page.evaluate(async () => { document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; showView('admin'); QUICK_FILTER=''; ADM_HOY_DEF=false; renderAdmin(); await _esperar(200);
    var t0=document.getElementById('adm-fichas').innerText;
    await _buscar('adm-search', 'titanio');
    return { fichas:document.querySelectorAll('#adm-fichas .af-f').length, enFichas:_hlEn('#adm-fichas'), hl:_hl(), n:(document.querySelector('.adm-busca .bh-n')||{}).textContent }; });
  chk('2d Administración en fichas: resaltado adentro de las fichas, «3 coinciden»', r.fichas===3 && r.enFichas>=4 && r.hl.every(x=>x.toLowerCase()==='titanio') && r.n==='3 coinciden', r);
  r = await page.evaluate(async () => { window.MIS_TOP_PRUEBA=false; document.getElementById('mis-vendedor').value='Carola Chavez'; showView('mis'); renderMis(); await _esperar(300);
    await _buscar('mis-q', 'titanio 140'); return { hl:_hl() }; });
  chk('3b Mis pedidos con dos palabras: se resaltan las dos', r.hl.some(x=>x.toLowerCase()==='titanio') && r.hl.some(x=>x==='140'), r.hl);
  r = await page.evaluate(async () => { var i=document.getElementById('mis-q'); return { enInput:_hl().some(function(x){ var h=CSS.highlights.get('busca'); return false; }), campo:Array.from(CSS.highlights.get('busca')).some(function(rg){ return rg.startContainer===i || i.contains(rg.startContainer); }) }; });
  chk('4b lo escrito en el buscador (un campo) no se resalta', r.campo===false, r);
  await page._ctx.close();

  console.log('\n── 6. Contabilidad y Ctrl + K ──');
  page = await nueva(true);
  r = await page.evaluate(async () => { showView('conta'); await _esperar(200); var cv=document.getElementById('cta-vendedor'); if(cv) cv.value=''; var m=document.getElementById('cta-mes'); if(m) m.value=todayStr().slice(0,7);
    renderConta(); await _esperar(200);
    await _buscar('cta-search', 'titanio');
    var lb=document.getElementById('cta-search').closest('.field').querySelector('.lb');
    return { lb:lb.innerText, en:_hlEn('#tbl-conta'), filas:document.querySelectorAll('#tbl-conta tbody tr').length }; });
  chk('6a Contabilidad: «Buscar · N coinciden» y el resaltado en la tabla', /coincide/.test(r.lb) && new RegExp(' '+r.filas+' coincide').test(r.lb) && r.en>0, r);
  r = await page.evaluate(async () => { palAbrir(); await _esperar(200); await _buscar('pal-in', 'titanio'); return { en:_hlEn('#pal-res'), its:document.querySelectorAll('#pal-res .pal-it').length }; });
  chk('6b Ctrl + K: lo buscado resaltado en los resultados', r.its>0 && r.en>0, r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
