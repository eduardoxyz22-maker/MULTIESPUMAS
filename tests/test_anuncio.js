/* 📢 EL ANUNCIO DE ADMINISTRACIÓN (13/10). El dueño: «crea un botón en administración "decir anuncio" para que Eduardo lo repita
   cada 3 min a los vendedores, por ejemplo a veces quiero avisar "no hay insumos para el ICE" hasta nuevo aviso».

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `b2c831d`, que no tiene nada de esto):
   1. El botón «📢 Decir anuncio» está en Administración y abre la ventana; sin la contraseña no la abre.
   2. Publicarlo guarda la fila del sistema `__anuncio__` (que NO es un pedido) con el texto; vacío o repetido no guarda.
   3. En el aparato de un VENDEDOR Eduardo lo dice apenas llega (globo + sonido) y otra vez cada 3 minutos, no antes; no tiene
      «Entendido» y lo escondido a mano no lo esconde; con 🔇 el globo sale igual.
   4. En Administración y logística sale una vez y queda primero en los avisos, sin repetirse.
   5. Quitarlo deja la fila con el texto vacío y Eduardo deja de decirlo.
   6. Si el servidor no lo guarda, la ventana lo dice y no cambia nada.
   Datos SINTÉTICOS. Reloj clavado en el miércoles 14/10/2026.
   Se corre:  node tests/test_anuncio.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; ULTIMO_REFRESCO=Date.now();
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._saves=[]; window._respuesta=null;
  apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); window._saves.push(r); if(window._respuesta) return Promise.resolve(window._respuesta); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  window._pops=0; asisPop=function(){ window._pops++; };   // el sonido: se cuenta en vez de sonar
  window.PED=function(){ return { id:'a1', oc:'10-501', nota:'901', vendedor:'Mirian Salazar', cliente:'CLIENTE UNO', fecha:todayStr(), turno:'AM',
    productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:3000,chk:'ok'}], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false,
    ts:Date.now()-86400000, fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'70000000', zona:'Norte' }; };
  window.FILA=function(t, ts){ return filaSistema(ANUNCIO_ID, '📢 ANUNCIO', JSON.stringify({ v:1, t:t, d:todayStr()+' 09:15', ts:ts||Date.now(), por:'Administración' })); };
  window.GLOBO=function(){ var g=document.getElementById('asis-globo'); return { ve:!!g && !g.hidden, anu:!!g && g.classList.contains('asis-anuncio'), txt:g ? g.textContent : '' }; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async () => {
    const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.addInitScript(() => { window.ASIS_PRUEBA=1; });
    await page.clock.install({ time:new Date('2026-10-14T10:00:00-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.clock.runFor(1700);
    await page.evaluate(PREPARAR);
    return page;
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  /* ---------------------------------------------------------------- 1 y 2 */
  console.log('\n── 1-2. Administración lo escribe ──');
  let page = await abrir();
  let r = await ev(page, () => {
    STATE=[PED()]; UNLOCKED=false;
    var b=document.getElementById('anu-btn');
    var grupo=b ? (b.closest('.at-g').querySelector('h5')||{}).textContent : '';
    anuncioAbrir(); var sinClave=document.getElementById('anu'); var abiertaSin=!!sinClave && !sinClave.hidden;
    UNLOCKED=true; b.click();
    var box=document.getElementById('anu');
    return { hay:!!b, txt:b && b.textContent.trim(), grupo:grupo, abiertaSin:abiertaSin, abierta:!!box && !box.hidden, ta:!!document.getElementById('anu-txt'),
      quitar:!!document.getElementById('anu-quitar') };
  });
  chk('el botón «📢 Decir anuncio» está en «Mensajes y partes» de Administración', r.hay && r.txt==='📢 Decir anuncio' && /Mensajes/.test(r.grupo), r);
  chk('sin la contraseña de Administración no abre la ventana', !r.abiertaSin, r);
  chk('con la contraseña abre la ventana para escribirlo (sin «Quitar»: todavía no hay)', r.abierta && r.ta && !r.quitar, r);

  r = await ev(page, async () => {
    var ta=document.getElementById('anu-txt'); ta.value='   '; anuncioGuardar(false); await new Promise(function(z){ setTimeout(z, 30); });
    var vacio={ saves:_saves.length, est:document.getElementById('anu-est').textContent };
    ta.value='  No hay insumos para el ICE   hasta nuevo aviso.  '; document.getElementById('anu-pub').click();
    await new Promise(function(z){ setTimeout(z, 50); });
    var s=_saves.filter(function(x){ return x.id===ANUNCIO_ID; })[0], o=s ? JSON.parse(s.observaciones) : {};
    var fila=STATE.filter(function(p){ return p.id===ANUNCIO_ID; })[0];
    var box=document.getElementById('anu');
    return { vacio:vacio, guardo:!!s, t:o.t, ts:o.ts, d:o.d, fecha:s && s.fecha, sis:!!fila && esFilaSistema(fila), cerrada:!box || box.hidden,
      leido:(anuncioLeer()||{}).t, btnOn:document.getElementById('anu-btn').classList.contains('anu-on'), btnD:document.getElementById('anu-btn').getAttribute('data-d') };
  });
  chk('vacío no guarda y dice qué falta', r.vacio.saves===0 && /Escrib/.test(r.vacio.est), r.vacio);
  chk('publicar guarda la fila `__anuncio__` con el texto limpio, la hora y SIN fecha de entrega', r.guardo && r.t==='No hay insumos para el ICE hasta nuevo aviso.' && r.ts>0 && /^2026-10-14 10:00$/.test(r.d) && r.fecha==='', r);
  chk('esa fila es del sistema (no es un pedido) y la ventana se cierra', r.sis && r.cerrada, r);
  chk('el botón queda marcado y dice el anuncio de ahora', r.btnOn && /ICE/.test(r.btnD), r);

  r = await ev(page, async () => {
    var A=asisAvisos(), a=A[0]||{};
    asisAbrir('avisos'); var el=document.querySelector('#asis-panel .asis-av'), html=el ? el.innerHTML : '';
    var cambiar=el && el.classList.contains('anu-av') && /Cambiar o quitar/.test(html), entendido=/Entendido/.test(html);
    asisCerrar();
    anuncioAbrir(); var ta=document.getElementById('anu-txt'), igual=ta.value;
    anuncioGuardar(false); await new Promise(function(z){ setTimeout(z, 30); });
    var est=document.getElementById('anu-est').textContent, n=_saves.length;
    return { k:a.k, anuncio:!!a.anuncio, cambiar:cambiar, entendido:entendido, igual:igual, est:est, n:n, quitar:!!document.getElementById('anu-quitar') };
  });
  chk('en Administración queda PRIMERO en los avisos de Eduardo, con «✏️ Cambiar o quitar» y sin «Entendido»', r.anuncio && r.cambiar && !r.entendido, r);
  chk('al reabrir, la ventana trae el anuncio puesto y el botón «🗑 Quitar anuncio»', /ICE/.test(r.igual) && r.quitar, r);
  chk('el mismo texto otra vez no vuelve a guardar', r.n===1 && /mismo/.test(r.est), r);
  await page.close();

  /* ---------------------------------------------------------------- 3 */
  console.log('\n── 3. El vendedor lo escucha cada 3 minutos ──');
  page = await abrir();
  r = await ev(page, () => {
    UNLOCKED=false; quienRol(''); setVendedorMem('Mirian Salazar');
    STATE=[PED(), FILA('No hay insumos para el ICE hasta nuevo aviso.', 111)];
    asisAvisos().forEach(function(a){ if(!a.anuncio) ASIS.anunciados[a.k]=1; });   // los otros avisos ya se dijeron: se cuenta solo el anuncio
    _pops=0; asisRefrescar();
    return { g:GLOBO(), pops:_pops };
  });
  chk('apenas llega, Eduardo lo dice con el globo del anuncio', r.g.ve && r.g.anu && /ICE/.test(r.g.txt) && /Anuncio de Administración/.test(r.g.txt), r.g);
  chk('y suena (dos «pop»)', r.pops>=1, r);
  await page.clock.runFor(1000);
  r = await ev(page, () => ({ pops:_pops }));
  chk('el segundo «pop» llega enseguida', r.pops===2, r);
  await page.clock.runFor(21000);
  r = await ev(page, () => ({ g:GLOBO() }));
  chk('el globo se va solo a los 20 segundos', !r.g.ve, r.g);
  await page.clock.runFor(120000);   // 2 min 22 s desde que llegó
  r = await ev(page, () => ({ g:GLOBO(), pops:_pops }));
  chk('antes de los 3 minutos no lo repite', !r.g.ve && r.pops===2, r);
  await page.clock.runFor(54000);    // 3 min 16 s: el reloj mira cada 15 s, así que lo dice entre los 3:00 y los 3:15
  r = await ev(page, () => ({ g:GLOBO(), pops:_pops }));
  chk('a los 3 minutos lo vuelve a decir, con sonido', r.g.ve && r.g.anu && /ICE/.test(r.g.txt) && r.pops>=3, r);
  r = await ev(page, () => {
    var A=asisAvisos(), a=A[0]||{};
    asisPosponer(a.k, 24*3600000);   // aunque alguien lo esconda a mano, sigue
    var B=asisAvisos();
    asisAbrir('avisos'); var el=document.querySelector('#asis-panel .asis-av.anu-av'), html=el ? el.innerHTML : ''; asisCerrar();
    return { k:a.k, primero:!!a.anuncio, sigue:B.some(function(x){ return x.anuncio; }), entendido:/Entendido/.test(html), luego:/En 1 hora|Mañana/.test(html),
      cambiar:/Cambiar o quitar/.test(html), x:a.x, hayEl:!!el };
  });
  chk('en los avisos va primero, sin «Entendido» ni «En 1 hora», y esconderlo a mano no lo esconde', r.hayEl && r.primero && r.sigue && !r.entendido && !r.luego, r);
  chk('el vendedor no ve «Cambiar o quitar» y lee que se repite cada 3 minutos', !r.cambiar && /cada 3 minutos/.test(r.x), r);
  r = await ev(page, () => { localStorage.setItem(ASIS_LS_MUDO, '1'); var g=document.getElementById('asis-globo'); g.hidden=true; ANUNCIO.ult-=ANUNCIO_CADA_MS; anuncioTic(); return { g:GLOBO() }; });
  chk('con 🔇 el globo sale igual', r.g.ve && r.g.anu, r.g);
  await page.close();

  /* ---------------------------------------------------------------- 4 */
  console.log('\n── 4. Logística y Administración: una vez ──');
  page = await abrir();
  r = await ev(page, () => {
    UNLOCKED=false; quienRol('logistica');
    STATE=[PED(), FILA('No hay insumos para el ICE.', 222)];
    asisAvisos().forEach(function(a){ if(!a.anuncio) ASIS.anunciados[a.k]=1; });
    _pops=0; asisRefrescar(); var g1=GLOBO(); var A=asisAvisos();
    return { g1:g1, primero:!!(A[0]||{}).anuncio, rep:anuncioRepite() };
  });
  chk('logística lo ve una vez al llegar y primero en los avisos', r.g1.ve && r.g1.anu && r.primero && !r.rep, r);
  await page.clock.runFor(4*60000);
  r = await ev(page, () => ({ g:GLOBO(), pops:_pops }));
  chk('y no se le repite a los 3 minutos', !r.g.ve && r.pops===2, r);
  r = await ev(page, () => { quienRol(''); UNLOCKED=true; return { rep:anuncioRepite() }; });
  chk('con la contraseña puesta tampoco se repite', !r.rep, r);
  await page.close();

  /* ---------------------------------------------------------------- 5 y 6 */
  console.log('\n── 5-6. Quitarlo, y si el servidor no lo guarda ──');
  page = await abrir();
  r = await ev(page, async () => {
    UNLOCKED=true; STATE=[PED(), FILA('No hay insumos para el ICE.', 333)]; STATE[1].rev=4;
    window._respuesta={ ok:false, error:'busy' };
    anuncioAbrir(); document.getElementById('anu-quitar').click(); await new Promise(function(z){ setTimeout(z, 50); });
    var box=document.getElementById('anu');
    var fallo={ abierta:!box.hidden, est:document.getElementById('anu-est').textContent, sigue:(anuncioLeer()||{}).t, rev:_saves[0] && _saves[0].rev, botonOk:!document.getElementById('anu-pub').disabled };
    window._respuesta=null;
    document.getElementById('anu-quitar').click(); await new Promise(function(z){ setTimeout(z, 50); });
    var s=_saves[_saves.length-1], o=JSON.parse(s.observaciones);
    return { fallo:fallo, t:o.t, id:s.id, leido:anuncioLeer(), btnOn:document.getElementById('anu-btn').classList.contains('anu-on'), aviso:asisAvisos().some(function(a){ return a.anuncio; }) };
  });
  chk('si el servidor no lo guarda, la ventana queda abierta, lo dice y el anuncio sigue igual', r.fallo.abierta && /No se guard/.test(r.fallo.est) && /ICE/.test(r.fallo.sigue) && r.fallo.botonOk, r.fallo);
  chk('el guardado lleva el sello de la fila que se leyó', r.fallo.rev===4, r.fallo);
  chk('«🗑 Quitar anuncio» guarda la fila con el texto vacío: no hay anuncio, ni aviso, ni botón marcado', r.id==='__anuncio__' && r.t==='' && r.leido===null && !r.aviso && !r.btnOn, r);
  r = await ev(page, () => { UNLOCKED=false; quienRol(''); var g=document.getElementById('asis-globo'); if(g) g.hidden=true; _pops=0; ANUNCIO.ult=0; anuncioTic(); asisRefrescar(); return { g:GLOBO(), pops:_pops }; });
  chk('quitado, Eduardo ya no lo dice', !(r.g.ve && r.g.anu) && r.pops===0, r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
