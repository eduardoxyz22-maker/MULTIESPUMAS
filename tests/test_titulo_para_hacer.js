/* 🔴 EL NÚMERO DE «PARA HACER» EN LA PESTAÑA DEL NAVEGADOR Y EN EL ÍCONO (15/11/2026, mejora 287; dueño: «ok»).
   Con el panel detrás de Kommo o de WhatsApp Web nadie se enteraba de lo pendiente: la pestaña decía siempre «Pedidos». Ahora
   «(5) Pedidos · Carola», el ícono de las hojas con el circulito rojo y, instalado, el número en el ícono de la barra de Windows.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): el título y los íconos no cambian.
   2. Con `TITULO_PRUEBA`, en Mis pedidos: el título es «(N) Pedidos · <nombre> — MultiEspumas» con N = el MISMO número del globito de
      «📋 Para hacer» que se ve; el ícono pasa a uno dibujado con ese número.
   3. En Administración manda el «Para hacer» de Administración, con «Logística»; en Contabilidad, el de Contabilidad.
   4. En una vista sin «Para hacer» (el formulario) queda el último dibujado; pasados 30 min, nada.
   5. Con 0 pendientes: el título y los íconos vuelven a los de siempre (mismo href).
   6. Si otro cambió el título (instalado queda en «Pedidos»), esa es la base: «(N) Pedidos · <nombre>».
   7. Instalado: `navigator.setAppBadge(N)`; con 0, `clearAppBadge()`. En el navegador común, no se llama.
   Datos SINTÉTICOS. Reloj clavado: martes 27/10/2026, 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_titulo_para_hacer.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-27T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1; window.ADM_TABS_PRUEBA=1; window.CX_TOP_PRUEBA=1;
  var hoy=todayStr(), d=function(n){ return stockSumarDias(hoy, n); };
  var P=function(id, o){ return Object.assign({ id:id, oc:'10-'+id, vendedor:'Carola Chavez', cliente:'CLIENTE '+id, celular:'7'+String(id.charCodeAt(1))+'0011', zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18', nota:'9'+id.length,
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:Date.now()-86400000, fecha:d(3) }, o); };
  window._L=[
    P('a2', { fecha:d(-1), entregado:false }),                         // atrasado
    P('a3', { fecha:d(3), maps:'' }),                                  // sin ubicación
    P('a4', { fecha:d(1), pagado:false, saldo:500, acuenta:2500 })     // saldo este mes
  ];
  window._L0=[ P('b1', { fecha:d(-3), entregado:true }) ];             // nada pendiente
  window._lista=window._L;
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._lista)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis');
    var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await _esperar(250); };
  window._badge=function(sel){ var b=document.querySelector(sel+' .ah-badge'); return b ? Number(b.textContent) : 0; };
  window._icos=function(){ return [].map.call(document.querySelectorAll('link[rel~="icon"]'), function(l){ return l.getAttribute('href'); }); };
  window._apps=[]; navigator.setAppBadge=function(n){ window._apps.push(['set', n]); return Promise.resolve(); }; navigator.clearAppBadge=function(){ window._apps.push(['clear']); return Promise.resolve(); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.TITULO_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  };
  let r;

  console.log('\n── 1. Sin la bandera ──');
  let page = await nueva(false);
  r = await page.evaluate(async () => { var t0=document.title, i0=_icos().join('|'); await _ver('Carola Chavez'); nxBadges();
    return { t0:t0, t:document.title, i:_icos().join('|')===i0, n:_badge('#mis-top'), apps:window._apps.length }; });
  chk('1 sin bandera: el título y los íconos de siempre (aunque haya «Para hacer»)', r.t===r.t0 && r.t==='Pedidos — MultiEspumas' && r.i && r.n>0 && r.apps===0, r);
  await page._ctx.close();

  console.log('\n── 2-7. Con la bandera ──');
  page = await nueva(true);
  r = await page.evaluate(async () => { var i0=_icos(); await _ver('Carola Chavez'); nxBadges();
    var ic=_icos(); return { n:_badge('#mis-top'), t:document.title, ic:ic, i0:i0, svg:decodeURIComponent((ic[0]||'').replace(/^data:image\/svg\+xml,/,'')), apps:window._apps.slice() }; });
  chk('2a Mis pedidos: «(N) Pedidos · Carola — MultiEspumas» con N = el globito de «Para hacer» que se ve', r.n>0 && r.t==='('+r.n+') Pedidos · Carola — MultiEspumas', [r.n, r.t]);
  chk('2b los íconos pasan al dibujado con ese número (las hojas y el circulito rojo)', r.ic.length===2 && r.ic.every(x=>/^data:image\/svg\+xml,/.test(x)) && />\s*3\s*<\/text>|>3<\/text>/.test(r.svg)===(r.n===3) && r.svg.indexOf('>'+r.n+'</text>')>0 && /#CE2939/.test(r.svg) && /#F7E7A0/.test(r.svg), r.svg.slice(-260));
  chk('7a en el navegador común (no instalado) no se toca el ícono de la barra de Windows', r.apps.length===0, r.apps);

  r = await page.evaluate(async () => { quienRol('logistica'); showView('admin'); renderAdmin(); await _esperar(300); nxBadges();
    return { n:_badge('#adm-hacer'), t:document.title }; });
  chk('3a Administración: manda su «Para hacer», con «Logística»', r.n>0 && r.t==='('+r.n+') Pedidos · Logística — MultiEspumas', r);
  r = await page.evaluate(async () => { showView('conta'); renderConta(); await _esperar(300); nxBadges();
    return { n:_badge('#cx-top'), t:document.title }; });
  chk('3b Contabilidad: el de Contabilidad', (r.n>0 ? r.t==='('+r.n+') Pedidos · Contabilidad — MultiEspumas' : r.t==='Pedidos — MultiEspumas'), r);

  r = await page.evaluate(async () => { showView('mis'); renderMis(); await _esperar(200); var n=_badge('#mis-top'); showView('form'); await _esperar(200); nxBadges(); return { n:n, t:document.title }; });
  chk('4a en el formulario (sin «Para hacer») queda el último dibujado', r.t==='('+r.n+') Pedidos · Carola — MultiEspumas', r);
  await page.clock.setFixedTime(new Date(Date.parse(HOY)+31*60*1000));
  r = await page.evaluate(() => { nxBadges(); return { t:document.title, i:_icos() }; });
  chk('4b pasados 30 min sin volver a dibujarse, nada (el título y los íconos de siempre)', r.t==='Pedidos — MultiEspumas' && r.i[0]==='iconos/hojas.svg' && r.i[1]==='iconos/hojas-32.png', r);

  r = await page.evaluate(async () => { window._lista=window._L0; await _ver('Carola Chavez'); nxBadges();
    var tipos=[].map.call(document.querySelectorAll('link[rel~="icon"]'), function(l){ return l.getAttribute('type'); });
    return { n:_badge('#mis-top'), t:document.title, i:_icos(), tipos:tipos }; });
  chk('5 con 0 pendientes: el título y los íconos vuelven a los de siempre (href y tipo)', r.n===0 && r.t==='Pedidos — MultiEspumas' && r.i[0]==='iconos/hojas.svg' && r.i[1]==='iconos/hojas-32.png' && r.tipos[1]==='image/png', r);

  r = await page.evaluate(async () => {
    var mm=window.matchMedia; window.matchMedia=function(q){ return /display-mode: standalone/.test(q) ? { matches:true, addListener:function(){}, addEventListener:function(){} } : mm.call(window, q); };
    document.title='Pedidos';   // lo que hace escritorio.js con el panel instalado
    window._lista=window._L; window._apps=[]; await _ver('Carola Chavez'); nxBadges();
    var o={ n:_badge('#mis-top'), t:document.title, apps:window._apps.slice() };
    window._lista=window._L0; await _ver('Carola Chavez'); nxBadges();
    o.t0=document.title; o.apps0=window._apps.slice(-1)[0];
    return o; });
  chk('6 si otro cambió el título (instalado: «Pedidos»), esa es la base: «(N) Pedidos · Carola»', r.t==='('+r.n+') Pedidos · Carola' && r.t0==='Pedidos', r);
  chk('7b instalado: setAppBadge(N) en la barra de Windows; con 0, clearAppBadge()', r.apps.some(a=>a[0]==='set' && a[1]===r.n) && r.apps0 && r.apps0[0]==='clear', r);

  await page._ctx.close();
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
