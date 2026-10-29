/* 🖥️🔔 EL PANEL COMO PROGRAMA (25) Y LOS AVISOS DE WINDOWS (26) — §4ns, 29/10 (dueño: «ok todas menos la 24»).
   Lo que cuida esta prueba (con un `Notification` de mentira que anota cada aviso, y `sw.js` en una caja de Node):
   · sin `ESC_PRUEBA` (Playwright) no aparece nada ni cambia el buscador;
   · el cartel de arriba ofrece «📲 Instalar» (con el evento del navegador) y «🔔 Prender los avisos»; «✕» lo saca por 21 días;
   · prender pide permiso UNA vez y manda el aviso de prueba; lo que ya estaba (al abrir, al prender, al cambiar de vendedora) NO avisa;
   · llega lo nuevo: respuesta al bot de SU pedido (no de otra vendedora), aviso de Contabilidad, venta de Kommo, el Excel de hoy (solo
     logística, desde las 10:00) y un anuncio; cada cosa una sola vez; más de 3 juntas = un aviso que las cuenta; con el panel en foco, un
     aviso de los de siempre en vez de Windows; los tipos apagados no avisan;
   · tocar el aviso abre lo que nombra; con el panel escondido se lee la planilla cada 3 min (y no antes);
   · `sw.js`: no toca la planilla ni los .js, va siempre a internet a buscar la página y sin internet da el cartel; tocar el aviso trae la
     ventana del panel.
   Reloj clavado: jueves 29/10/2026 11:00 de Bolivia.   Se corre:  node tests/test_escritorio.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), vm = require('vm');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-29T11:00:00-04:00';

function NOTIF(){
  window.__notifs=[]; window.__foco=false; window.__pidio=0;
  var N=function(t, o){ window.__notifs.push({ t:t, b:(o||{}).body, tag:(o||{}).tag, d:(o||{}).data }); this.close=function(){}; var self=this; window.__ultimaN=self; };
  N.permission='default';
  N.requestPermission=function(){ window.__pidio++; N.permission='granted'; return Promise.resolve('granted'); };
  window.Notification=N;
  document.hasFocus=function(){ return !!window.__foco; };
}
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; ULTIMO_REFRESCO=Date.now();
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var V=function(id, vend, cli){ return { id:id, oc:'10-'+id, vendedor:vend, cliente:cli, celular:'70000001', fecha:'2026-10-30', turno:'AM', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:0, pagado:true, ts:Date.now()-864e5, rev:1, fotos:[] }; };
  STATE=[ V('a1','Maria Flores','ANA ROJAS'), V('a2','Carola Chavez','JORGE PAZ'), V('a3','Maria Flores','LUIS VACA') ];
  WA_RESP=[]; BORRADORES=[];
  setVendedorMem('Maria Flores'); var mv=document.getElementById('mis-vendedor'); if(mv) mv.value='Maria Flores';
  try{ localStorage.removeItem('me_esc_vistos'); localStorage.removeItem('me_esc_no'); localStorage.removeItem('me_esc_tipos'); }catch(e){}
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(con){
    const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.addInitScript(NOTIF);
    if(con) await page.addInitScript(()=>{ window.ESC_PRUEBA=1; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return page;
  }

  // ---------- 1. Sin ESC_PRUEBA: nada ----------
  let page = await abrir(false);
  let r = await page.evaluate(() => ({ banner:document.getElementById('esc-banner'), pal:palAcciones().map(function(a){ return a.t; }), esc:typeof ESC, sw:document.querySelector('link[rel=manifest]') && document.querySelector('link[rel=manifest]').getAttribute('href') }));
  chk('1a sin ESC_PRUEBA no hay cartel', !r.banner, r);
  chk('1b y el buscador no cambia', r.pal.indexOf('Instalar el panel')<0 && r.pal.indexOf('Avisos de Windows')<0, r.pal);
  chk('1c el archivo se cargó igual y la página trae el manifest', r.esc==='object' && r.sw==='manifest.webmanifest', r);
  r = await page.evaluate(() => { var a=escRevisar(); return { a:a.length, n:__notifs.length }; });
  chk('1d sin ESC_PRUEBA no avisa nada', r.a===0 && r.n===0, r);
  await page.context().close();

  // ---------- 2. El cartel, instalar y prender ----------
  page = await abrir(true);
  r = await page.evaluate(() => { escBannerPintar(); var b=document.getElementById('esc-banner'); return { ver:b && !b.hidden, txt:b && b.innerText.replace(/\s+/g,' ') }; });
  chk('2a el cartel ofrece prender los avisos', r.ver && /Prender los avisos/.test(r.txt) && !/Instalar/.test(r.txt), r);
  r = await page.evaluate(async () => {
    var pedido=0, ev=new Event('beforeinstallprompt'); ev.prompt=function(){ pedido++; }; ev.userChoice=Promise.resolve({ outcome:'accepted' });
    window.dispatchEvent(ev); var t=document.getElementById('esc-banner').innerText.replace(/\s+/g,' ');
    escInstalar(); await new Promise(function(r){ setTimeout(r, 30); });
    window.dispatchEvent(new Event('appinstalled'));
    return { t:t, pedido:pedido, pal:palAcciones().map(function(a){ return a.t; }) }; });
  chk('2b con el evento del navegador aparece «📲 Instalar» y lo usa', /Instalar/.test(r.t) && r.pedido===1, r);
  chk('2c en el buscador: «Instalar el panel» y «Avisos de Windows»', r.pal.indexOf('Instalar el panel')>=0 && r.pal.indexOf('Avisos de Windows')>=0, r.pal);
  r = await page.evaluate(() => { escBannerNo(); var b=document.getElementById('esc-banner'); var h=b.hidden; localStorage.removeItem('me_esc_no'); escBannerPintar(); return { h:h, otra:!document.getElementById('esc-banner').hidden }; });
  chk('2d «✕» lo saca (y vuelve pasado el plazo)', r.h===true && r.otra===true, r);
  // ya hay cosas antes de prender: no avisan
  await page.evaluate(() => { WA_RESP=[{ w:'wamid.viejo', id:'a1', nom:'Ana', txt:'hola', t:'' }]; });
  r = await page.evaluate(async () => { await escPrender(); return { pidio:__pidio, n:__notifs.map(function(x){ return x.t; }) }; });
  chk('2e prender pide permiso una vez y manda el aviso de prueba', r.pidio===1 && r.n.length===1 && /Así te van a llegar/.test(r.n[0]), r);
  r = await page.evaluate(() => { ESC.t0=Date.now()-3600e3; __notifs=[]; var a=escRevisar(); return { a:a.length, n:__notifs.length }; });
  chk('2f lo que ya estaba al prender no avisa', r.a===0 && r.n===0, r);

  // ---------- 3. Lo nuevo avisa, una sola vez ----------
  r = await page.evaluate(() => { WA_RESP.push({ w:'wamid.nuevo', id:'a1', nom:'Ana Rojas', txt:'¿A qué hora llega mañana?', t:'', urg:false });
    WA_RESP.push({ w:'wamid.otra', id:'a2', nom:'Jorge', txt:'hola', t:'' });   // pedido de Carola: no es de María
    var a=escRevisar(); var b=escRevisar(); return { a:a.map(function(x){ return x.k; }), b:b.length, n:__notifs.map(function(x){ return x.t+' | '+x.b; }), tag:__notifs[0] && __notifs[0].tag }; });
  chk('3a la respuesta al bot de su pedido avisa', r.a.length===1 && r.a[0]==='bot|wamid.nuevo', r);
  chk('3b la de otra vendedora no', r.n.length===1 && !/Jorge/.test(r.n.join()), r.n);
  chk('3c con el nombre del cliente y lo que escribió', /Ana Rojas le contestó al bot/.test(r.n[0]) && /A qué hora llega/.test(r.n[0]) && /OC 10-a1/.test(r.n[0]), r.n[0]);
  chk('3d la segunda vuelta no la repite (y lleva su etiqueta)', r.b===0 && r.tag==='bot|wamid.nuevo', r);
  r = await page.evaluate(() => { __notifs=[];
    STATE.push({ id:CTA_AV_ID, cliente:'avisos', observaciones:JSON.stringify({ a:[{ id:'av1', k:'k1', pid:'a3', vend:'Maria Flores', cli:'LUIS VACA', txt:'La foto dice Bs 500 y anotaste Bs 5.000', t:Date.now() }] }), productos:[] });
    BORRADORES=[{ id:'kommo-77', cliente:'PEDRO ÁÑEZ', vendedor:'Maria Flores', estado:BORRADOR_EST, ts:Date.now(), productos:[] }];
    var a=escRevisar(); return { k:a.map(function(x){ return x.tipo; }).sort(), n:__notifs.map(function(x){ return x.t; }) }; });
  chk('3e el aviso de Contabilidad y la venta de Kommo avisan', JSON.stringify(r.k)===JSON.stringify(['conta','kommo']), r);
  // con el panel en foco: el aviso de siempre
  r = await page.evaluate(() => { __notifs=[]; __foco=true; var t0=document.querySelectorAll('.toast').length;
    WA_RESP.push({ w:'wamid.foco', id:'a3', nom:'Luis', txt:'gracias', t:'' }); var a=escRevisar(); __foco=false;
    var ts=document.getElementById('toast'); return { a:a.length, n:__notifs.length, toast:ts ? ts.textContent : '' }; });
  chk('3f mirando el panel: no va a Windows, sale el aviso de siempre', r.a===1 && r.n===0 && /Luis le contestó/.test(r.toast), r);
  // tipo apagado
  r = await page.evaluate(() => { __notifs=[]; escTipo('bot', false); WA_RESP.push({ w:'wamid.apagado', id:'a1', nom:'Ana', txt:'otra', t:'' }); var a=escRevisar(); escTipo('bot', true); return { a:a.length, n:__notifs.length }; });
  chk('3g un tipo apagado no avisa', r.a===0 && r.n===0, r);
  // más de 3 juntas
  r = await page.evaluate(() => { __notifs=[]; ['x1','x2','x3','x4','x5'].forEach(function(w){ WA_RESP.push({ w:w, id:'a1', nom:'Ana', txt:'mensaje '+w, t:'' }); });
    var a=escRevisar(); return { a:a.length, n:__notifs.map(function(x){ return x.t; }) }; });
  chk('3h cinco juntas: un solo aviso que las cuenta (y lo que llegó con el tipo apagado no se suma al prenderlo)', r.a===5 && r.n.length===1 && /5 cosas nuevas/.test(r.n[0]), r);
  // cambiar de vendedora: lo suyo ya estaba, no avisa
  r = await page.evaluate(() => { __notifs=[]; setVendedorMem('Carola Chavez'); document.getElementById('mis-vendedor').value='Carola Chavez';
    var a=escRevisar(); var b=escRevisar(); setVendedorMem('Maria Flores'); document.getElementById('mis-vendedor').value='Maria Flores'; escRevisar(); return { a:a.length, b:b.length, n:__notifs.length }; });
  chk('3i elegir otra vendedora no trae una lluvia de avisos viejos', r.a===0 && r.b===0 && r.n===0, r);
  // logística: el Excel de hoy y un anuncio
  r = await page.evaluate(() => { __notifs=[]; UNLOCKED=true; STOCK.c={ f:'2026-10-29', hora:'08:00' }; escRevisar();   // pasar a logística: lo que hay se da por visto
    STOCK.c={ f:'2026-10-28', hora:'09:00' };
    STATE.push({ id:ANUNCIO_ID, cliente:'anuncio', observaciones:JSON.stringify({ v:1, t:'No hay insumos para el ICE hasta nuevo aviso', d:'2026-10-29 10:50', ts:Date.now(), por:'Eduardo' }), productos:[] });
    var a=escRevisar(); UNLOCKED=false; return { k:a.map(function(x){ return x.tipo; }).sort(), n:__notifs.map(function(x){ return x.t+' | '+x.b; }) }; });
  chk('3j logística: «Falta el Excel de hoy» y el anuncio nuevo', JSON.stringify(r.k)===JSON.stringify(['anuncio','excel']) && /28\/10/.test(r.n.join()) && /ICE/.test(r.n.join()), r);
  r = await page.evaluate(() => { var hay=escPendientes().filter(function(x){ return x.tipo==='excel'; }).length; return hay; });
  chk('3k una vendedora no recibe lo del Excel', r===0, r);

  // ---------- 4. Tocar el aviso y leer escondido ----------
  r = await page.evaluate(() => { showView('form'); escIr({ tipo:'kommo' }); var m=document.getElementById('view-mis').classList.contains('active');
    showView('form'); escIr({ tipo:'bot', id:'a1' }); var m2=document.getElementById('view-mis').classList.contains('active'), modal=document.getElementById('modal').classList.contains('on'); closeModal(); return { m:m, m2:m2, modal:modal }; });
  chk('4a tocar el aviso abre lo que nombra (Mis pedidos / el pedido)', r.m && r.m2 && r.modal, r);
  r = await page.evaluate(async () => {
    var leidas=0; refrescarEstado=function(){ leidas++; return Promise.resolve(true); }; waRespTraer=function(){};
    Object.defineProperty(document, 'hidden', { configurable:true, get:function(){ return true; } });
    CONNECTED=true; ULTIMO_REFRESCO=Date.now()-60000; ESC.ultLectura=0; escTic(); var a=leidas;
    ULTIMO_REFRESCO=Date.now()-200000; escTic(); await new Promise(function(r){ setTimeout(r, 20); }); var b=leidas;
    escTic(); var c=leidas; CONNECTED=false;
    return { a:a, b:b, c:c }; });
  chk('4b escondido: no lee si la última lectura es de hace menos de 3 min', r.a===0, r);
  chk('4c pasados los 3 min lee una vez, y no otra enseguida', r.b===1 && r.c===1, r);
  r = await page.evaluate(() => { escAjustesAbrir(); var b=document.getElementById('modal-box'); return { t:b.innerText.replace(/\s+/g,' '), n:b.querySelectorAll('.esc-tipos input').length }; });
  chk('4d la ventana «El panel en esta compu» con los cinco tipos', r.n===5 && /Prendidos/.test(r.t) && /Como programa/.test(r.t), r);
  await page.context().close();

  // ---------- 5. sw.js ----------
  const SW = fs.readFileSync(path.resolve(__dirname, '..', 'sw.js'), 'utf8');
  const H={}, cajas={}, red={ ok:true, n:0 };
  const self={ addEventListener:function(t, f){ H[t]=f; }, skipWaiting:function(){ return Promise.resolve(); },
    clients:{ claim:function(){ return Promise.resolve(); }, _L:[], matchAll:function(){ return Promise.resolve(self.clients._L); }, openWindow:function(u){ self.clients._abrio=u; return Promise.resolve(); } } };
  const caches={ open:function(k){ cajas[k]=cajas[k]||{}; return Promise.resolve({ put:function(q, r){ cajas[k][q]=r; return Promise.resolve(); }, match:function(q){ return Promise.resolve(cajas[k][q]); } }); },
    keys:function(){ return Promise.resolve(Object.keys(cajas)); }, delete:function(k){ delete cajas[k]; return Promise.resolve(true); } };
  class Resp{ constructor(b, o){ this.b=b; this.o=o; } text(){ return Promise.resolve(this.b); } static error(){ return new Resp('error'); } }
  const ctx={ self, caches, Response:Resp, fetch:function(){ red.n++; return red.ok ? Promise.resolve(new Resp('pagina nueva')) : Promise.reject(new Error('sin red')); }, Promise, console };
  vm.createContext(ctx); vm.runInContext(SW, ctx);
  const espera=()=>{ let p=null; return { waitUntil:function(x){ p=x; }, respondWith:function(x){ p=x; }, get p(){ return p; } }; };
  cajas['me-sin-internet-viejo']={};
  let e=espera(); H.install(e); await e.p; e=espera(); H.activate(e); await e.p;
  chk('5a instalar guarda solo el cartel «sin internet» y borra el de una versión vieja', Object.keys(cajas).length===1 && !!cajas[Object.keys(cajas)[0]]['sin-internet'], Object.keys(cajas));
  let usado=false; e={ request:{ mode:'cors', url:'https://script.google.com/exec' }, respondWith:function(){ usado=true; } }; H.fetch(e);
  chk('5b la planilla, las fotos y los .js ni pasan por el service worker', usado===false);
  e=espera(); e.request={ mode:'navigate', url:'https://x/pedidos.html' }; H.fetch(e); let rr=await e.p; let tx=await rr.text();
  chk('5c la página va SIEMPRE a internet (la última publicada)', tx==='pagina nueva' && red.n===1, tx);
  red.ok=false; e=espera(); e.request={ mode:'navigate', url:'https://x/pedidos.html' }; H.fetch(e); rr=await e.p; tx=await rr.text();
  chk('5d sin internet: el cartel', /Sin internet/.test(tx), tx.slice(0,80));
  let msg=null, foco=0; self.clients._L=[{ url:'https://x/index.html', postMessage:function(){}, focus:function(){} }, { url:'https://x/pedidos.html', postMessage:function(m){ msg=m; }, focus:function(){ foco++; } }];
  e=espera(); e.notification={ close:function(){}, data:{ tipo:'bot', id:'a1' } }; H.notificationclick(e); await e.p;
  chk('5e tocar el aviso trae la ventana del panel y le dice qué abrir', foco===1 && msg && msg.tipo==='aviso' && msg.d.id==='a1', msg);
  self.clients._L=[]; e=espera(); e.notification={ close:function(){}, data:{} }; H.notificationclick(e); await e.p;
  chk('5f con el panel cerrado, lo abre', self.clients._abrio==='pedidos.html', self.clients._abrio);
  const man=JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  chk('5g el manifest: ventana propia, empieza en pedidos.html y trae los íconos', man.display==='standalone' && man.start_url==='pedidos.html' && man.icons.length===3 &&
    man.icons.every(function(i){ return fs.existsSync(path.resolve(__dirname, '..', i.src)); }), man);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
