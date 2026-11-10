/* 🎨 LAS MEJORAS VISUALES ELEGIDAS POR EL DUEÑO (§4pj, 10/11/2026). De las muestras 158-173 dijo: «me gustan todas para publicar menos
   158, 160, 162, 164, 173 — la 162 dice depósito PTF, creo que eso confunde; a lo que tenemos actualmente solo añadiría lo del amanecer,
   día, atardecer, noche». O sea: 159 (Bloki no tapa), 161 (ordenar arriba de ATC y de Stock), 166 (la carrera del mes), 167 (calendario
   de calor), 168 (las ventanas nacen de lo que tocás), 171 (Bloki con gestos), 172 (bienvenida del panel instalado) y, de la 162, SOLO el
   cielo según la hora. Todo es dibujo: nada de esto guarda ni cambia una cuenta.

   ⚠️ LO QUE ESTA PRUEBA CUIDA
   1. El cielo: `hdrCieloPintar(h)` pone noche / amanecer / día / atardecer con la hora de Bolivia y el sol o la luna en la franja de la ciudad.
   2. Bloki: los cuatro gestos son el MISMO dibujo (SVG que se lee), se ponen un rato y vuelven; se duerme sin actividad y un toque lo despierta.
   3. Bloki no tapa: con algo para tocar o leer debajo, se achica (`.asis-chico`); sin nada, o con la ventana abierta, no.
   4. ATC: en la compu los filtros van en un renglón y las siete fichas en una fila; en el celular, como antes.
      Stock: la línea de arriba va en pastillas y sigue empezando con «corte del …»; verde si el Excel es de hoy, ámbar si no.
   5. Las ventanas nacen de lo tocado: solo con `NACE_PRUEBA` (o fuera de Playwright), y al cerrar el contorno aparece y se va solo.
   6. La bienvenida: solo instalado (acá `BIENV_PRUEBA`), una vez por apertura, y se va sola.
   7. La carrera: el último día da, vendedor por vendedor, lo «vendido» de Proyección (una sola verdad); el orden de cada día; ▶ avanza y para.
   8. El calendario: vendido por el día de CARGA, entregas por la fecha agendada (sin ventas de tienda), cobrado por la fecha del pago;
      feriado y domingo rayados; tocar un día dice su número.
   9. La ficha de logística ya no dice «RPT RPT …» ni «Mañana MAÑANA».
   Datos SINTÉTICOS. Reloj clavado: miércoles 11/11/2026 10:30 de Bolivia.   Se corre:  node tests/test_visual_4pj.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-11T10:30:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  var n=0;
  /* Una venta: `bs` su total, `fecha` la entrega agendada, `reg` cuándo se cargó (día de Bolivia, 10:00). */
  window.V=function(vend, fecha, bs, reg, o){
    o=o||{}; n++;
    var t=new Date(reg+(reg.length===10?'T10:00:00':'')+'-04:00').getTime();
    return Object.assign({ id:'p'+n, oc:'11-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle Ejemplo 1',
      fecha:fecha, turno:'AM', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:bs}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
      ts:t, rev:t, fotos:[] }, o);
  };
  window.FIX=function(){ n=0; return [
    /* Noviembre (por entrega). Mirian: 1.000 cargada el 28/10 (ya está el día 1) + 2.000 el 3 + 4.000 el 9 = 7.000.
       Maria: 5.000 el 4 + 500 el 10 = 5.500. Mauricio (Sueña): 3.000 el 3 + 3.500 el 11 = 6.500. */
    V('Mirian Salazar','2026-11-05',1000,'2026-10-28'), V('Mirian Salazar','2026-11-06',2000,'2026-11-03'), V('Mirian Salazar','2026-11-12',4000,'2026-11-09'),
    V('Maria Flores','2026-11-06',5000,'2026-11-04', { metodoPago:'Efectivo 1200 @2026-11-04 #900', saldo:3800 }), V('Maria Flores','2026-11-13',500,'2026-11-10'),
    V('Mauricio Merida','2026-11-05',3000,'2026-11-03'), V('Mauricio Merida','2026-11-13',3500,'2026-11-11', { metodoPago:'QR BISA 700 @2026-11-11 #77', saldo:2800 }),
    /* cargada en noviembre para diciembre: cuenta en el calendario (vendido, por la carga) y NO en la carrera de noviembre */
    V('Maria Flores','2026-12-02',900,'2026-11-10'),
    /* una ATC y una reposición del 10/11: son entregas agendadas, no ventas */
    V('Mirian Salazar','2026-11-10',0,'2026-11-07', { oc:'ATC 11-001', saldo:0 }),
    V('Isabel Robledo','2026-11-10',0,'2026-11-07', { oc:'RPT 11-006', cliente:'Central', saldo:0, productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:2,rtipo:'Reposición'}] }),
    /* un pedido para MAÑANA (12/11) con turno */
    V('Isabel Robledo','2026-11-12',1800,'2026-11-10', { turno:'PM' })
  ]; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, h, init, q){
    const ctx = await browser.newContext({ viewport:{ width:w||1280, height:h||800 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    if(init) await page.addInitScript(init);
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + (q||'?tema=espuma'), { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { STATE=FIX(); UNLOCKED=true; try{ updateStats(); }catch(e){} });
    page._ctx=ctx; return page;
  }
  const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  let page, r;

  console.log('\n── 1. El cielo según la hora ──');
  page = await abrir();
  r = await ev(page, () => {
    var o={}, H=document.querySelector('.header');
    [3, 6.4, 12, 17.8, 21].forEach(function(h){ var x=hdrCieloPintar(h); o[h]={ m:x && x.momento, dm:H.getAttribute('data-momento'), a:H.style.getPropertyValue('--cielo-a'), est:H.style.getPropertyValue('--cielo-est'), x:H.style.getPropertyValue('--astro-x') }; });
    var sol=hdrCieloPintar(12), astro=document.querySelector('.h-ruta .h-astro');
    return { o:o, hay:!!document.getElementById('h-cielo'), astro:!!astro, luna12:astro && astro.getAttribute('data-luna'), luna21:(hdrCieloPintar(21), astro && astro.getAttribute('data-luna')),
             ahora:(hdrCieloPintar(), window.hdrCielo && window.hdrCielo.momento) };
  });
  chk('hay cielo (`#h-cielo`) y el astro va en la franja de la ciudad', r.hay && r.astro, r);
  chk('3 h = noche · 6,4 h = amanecer · 12 h = día · 17,8 h = atardecer · 21 h = noche', r.o && r.o[3].m==='noche' && r.o[6.4].m==='amanecer' && r.o[12].m==='dia' && r.o[17.8].m==='atardecer' && r.o[21].m==='noche', r.o);
  chk('lo deja en el encabezado (`data-momento`) y con sus colores', r.o && r.o[12].dm==='dia' && r.o[21].dm==='noche' && r.o[21].a!==r.o[12].a && r.o[6.4].a!==r.o[17.8].a, r.o);
  chk('de noche hay estrellas y de día no; de día es el sol y de noche la luna', r.o && Number(r.o[21].est)>0 && Number(r.o[12].est)===0 && r.luna12!=='1' && r.luna21==='1', [r.o && r.o[21].est, r.o && r.o[12].est, r.luna12, r.luna21]);
  chk('sin argumento usa la hora de Bolivia de ahora (10:30 → día)', r.ahora==='dia', r.ahora);

  console.log('\n── 9. La ficha de logística: ni «RPT RPT» ni «Mañana MAÑANA» ──');
  r = await ev(page, () => {
    showView('admin');
    var rp=STATE.filter(function(p){ return /^RPT/.test(p.oc); })[0], ma=STATE.filter(function(p){ return p.fecha==='2026-11-12' && p.turno==='PM'; })[0];
    showPedidoModal(rp.id); var t1=document.getElementById('modal-box').innerText.replace(/\s+/g,' ').slice(0,400); closeModal();
    showPedidoModal(ma.id); var t2=document.getElementById('modal-box').innerText.replace(/\s+/g,' ').slice(0,400); closeModal();
    return { t1:t1, t2:t2 };
  });
  chk('una reposición dice «RPT 11-006» una sola vez', r.t1 && /RPT 11-006/.test(r.t1) && !/RPT RPT/.test(r.t1) && !/Pedido RPT/.test(r.t1), r.t1);
  chk('un pedido de mañana a la tarde dice MAÑANA una vez y «a la tarde»', r.t2 && /MAÑANA/.test(r.t2) && !/Mañana MAÑANA/i.test(r.t2) && /a la tarde/.test(r.t2), r.t2);
  await page._ctx.close();

  console.log('\n── 2. Bloki con gestos (171) ──');
  page = await abrir(1280, 800, () => { window.ASIS_PRUEBA=1; try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); localStorage.setItem('me_asis_video','1'); localStorage.setItem('me_asis_mudo','1'); }catch(e){} });
  await page.waitForTimeout(900);
  r = await ev(page, () => {
    var o={}; Object.keys(BLOKI_TRAJES).forEach(function(t){ Object.keys(BLOKI_GESTOS).forEach(function(g){
      var svg=blokiSvg(t, g), d=new DOMParser().parseFromString(svg, 'image/svg+xml');
      o[t+'|'+g]=!d.querySelector('parsererror') && d.documentElement.nodeName==='svg' && svg.length>blokiSvg(t).length && d.documentElement.getAttribute('data-traje')===t; }); });
    return { o:o, n:Object.keys(BLOKI_GESTOS).sort().join(), yo:!!document.getElementById('asis-yo'), dist:blokiSrc('bloki','festeja')!==blokiSrc('bloki') };
  });
  chk('cuatro gestos (duerme, festeja, mira, señala) y cada uno es el MISMO dibujo de cada traje, que se lee', r.n==='duerme,festeja,mira,senala' && r.o && Object.keys(r.o).length===20 && Object.keys(r.o).every(function(k){ return r.o[k]; }) && r.dist, r);
  r = await ev(page, async () => {
    var yo=document.getElementById('asis-yo'), img=yo.querySelector('img'), o={};
    blokiGesto('festeja', 500); o.f={ c:yo.classList.contains('asis-g-festeja'), g:img.getAttribute('data-gesto'), conf:yo.querySelectorAll('.asis-conf').length, traje:img.getAttribute('data-traje') };
    await new Promise(function(r){ setTimeout(r, 750); });
    o.vuelve={ c:yo.classList.contains('asis-g-festeja'), g:img.getAttribute('data-gesto')||'', conf:yo.querySelectorAll('.asis-conf').length, ges:ASIS.gesto||'' };
    blokiGesto('senala', 60000); o.s=yo.classList.contains('asis-g-senala') && img.getAttribute('data-gesto')==='senala';
    blokiGesto('mira', 60000); o.m=yo.classList.contains('asis-g-mira') && !yo.classList.contains('asis-g-senala');
    blokiGesto(''); o.nada=!/asis-g-/.test(yo.className);
    blokiGesto('inventado'); o.inv=!/asis-g-/.test(yo.className) && !(ASIS.gesto);
    return o;
  });
  chk('«festeja» pone la clase, el dibujo con el gesto y el papel picado, sin cambiar el traje', r.f && r.f.c && r.f.g==='festeja' && r.f.conf>=8 && !!r.f.traje, r.f);
  chk('y a su tiempo vuelve solo (sin clase, sin gesto, sin papelitos)', r.vuelve && !r.vuelve.c && !r.vuelve.g && r.vuelve.conf===0 && !r.vuelve.ges, r.vuelve);
  chk('«señala» y «mira» se ponen de a uno; un gesto que no existe no hace nada', r.s && r.m && r.nada && r.inv, r);
  r = await ev(page, async () => {
    var yo=document.getElementById('asis-yo'), o={};
    BLOKI_ULT=Date.now()-BLOKI_DUERME_MS-1000;
    await new Promise(function(r){ setTimeout(r, 1900); });
    o.duerme=yo.classList.contains('asis-g-duerme') && ASIS.gesto==='duerme'; o.zz=yo.querySelectorAll('.asis-zz').length;
    blokiActividad(); o.despierta=!yo.classList.contains('asis-g-duerme') && !ASIS.gesto;
    return o;
  });
  chk('sin que nadie toque nada un rato, se duerme (con sus «z»)', r.duerme && r.zz===3, r);
  chk('y cualquier toque lo despierta', r.despierta, r);

  console.log('\n── 3. Bloki no tapa (159) ──');
  r = await ev(page, async () => {
    var d=document.getElementById('asis'), yo=document.getElementById('asis-yo'), o={};
    showView('form'); window.scrollTo(0,0);
    /* nada debajo: una capa lisa que tapa la página */
    var liso=document.createElement('div'); liso.id='t-liso'; liso.style.cssText='position:fixed;inset:0;z-index:50;background:#fff'; document.body.appendChild(liso);
    o.sin=asisTapaMirar(); o.sinCls=d.classList.contains('asis-chico');
    /* un botón justo debajo de Bloki */
    var rr=yo.getBoundingClientRect(), b=document.createElement('button'); b.id='t-btn'; b.textContent='Guardar pedido';
    b.style.cssText='position:fixed;z-index:60;left:'+(rr.left-20)+'px;top:'+(rr.top+10)+'px;width:'+(rr.width+40)+'px;height:'+(rr.height-10)+'px'; document.body.appendChild(b);
    o.con=asisTapaMirar(); o.conCls=d.classList.contains('asis-chico');
    /* con un gesto corto vuelve a su tamaño; dormido sigue chico */
    blokiGesto('senala', 60000); o.gesto=d.classList.contains('asis-chico'); blokiGesto('duerme'); o.dormido=d.classList.contains('asis-chico'); blokiGesto('');
    /* con la ventana abierta no se achica */
    ASIS.abierto=true; o.abierto=asisTapaMirar(); ASIS.abierto=false;
    b.remove();
    /* letras: un renglón a lo ancho cuyo texto queda lejos NO cuenta; con el texto debajo, sí */
    var t=document.createElement('div'); t.id='t-txt'; t.textContent='pie'; t.style.cssText='position:fixed;z-index:60;left:0;right:0;top:'+(rr.top+20)+'px;height:30px;text-align:left;font-size:14px'; document.body.appendChild(t);
    o.lejos=asisTapaMirar(); t.style.textAlign='right'; t.style.paddingRight='30px'; t.textContent='un renglón que sí queda debajo de la figura de Bloki'; o.cerca=asisTapaMirar();
    t.remove(); liso.remove(); o.fin=(asisTapaMirar(), true);
    return o;
  });
  chk('sin nada debajo queda a su tamaño', r.sin===false && r.sinCls===false, r);
  chk('con un botón debajo se achica y se asoma (`.asis-chico`)', r.con===true && r.conCls===true, r);
  chk('señalando vuelve a su tamaño; dormido sigue chico; con su ventana abierta no se achica', r.gesto===false && r.dormido===true && r.abierto===false, r);
  chk('un renglón a lo ancho con las letras lejos no cuenta; con las letras debajo, sí', r.lejos===false && r.cerca===true, r);
  await page._ctx.close();

  console.log('\n── 4. Ordenar arriba de ATC y de Stock (161) ──');
  page = await abrir(1280, 800);
  r = await ev(page, async () => {
    showView('atc'); await new Promise(function(r){ setTimeout(r, 500); }); acomodarFichas();
    var f=document.querySelector('#view-atc .filters'), m=document.getElementById('atc-metrics'), ks=[].slice.call(f.children).filter(function(c){ return c.offsetParent; });
    var tops=ks.map(function(c){ return Math.round(c.getBoundingClientRect().bottom); });
    return { unRenglon:Math.max.apply(null, tops)-Math.min.apply(null, tops)<=2, n:ks.length, cols:m.style.gridTemplateColumns, fichas:m.children.length, sw:document.documentElement.scrollWidth<=document.documentElement.clientWidth,
             corta:ks.some(function(c){ return c.scrollWidth>c.clientWidth+1; }), min:m.getAttribute('data-min') };
  });
  chk('compu: los filtros de ATC en UN renglón, sin cortarse ni correr la página', r.unRenglon && r.n>=6 && r.sw && !r.corta, r);
  chk('compu: todas las fichas de ATC en una fila (hasta siete: `data-min` 150)', r.fichas>=4 && r.cols==='repeat('+r.fichas+', minmax(0px, 1fr))' && r.min==='150', r);
  r = await ev(page, async () => {
    STOCK.c={ f:todayStr(), hora:'08:40:06', t:Date.now(), u:{ 'SOFT|140x190':5 }, cod:{} };
    abrirStock(); await new Promise(function(r){ setTimeout(r, 400); });
    var inf=document.getElementById('stock-info'), cs=[].slice.call(inf.querySelectorAll('.si-c'));
    var o={ chips:cs.length, txt:inf.textContent, ok:cs[0] && cs[0].classList.contains('si-ok'), cls:inf.classList.contains('si-chips'), fab:cs.slice(-2).map(function(c){ return c.textContent; }) };
    STOCK.c.f=diasAtras(2); renderStock(); cs=[].slice.call(document.getElementById('stock-info').querySelectorAll('.si-c'));
    o.viejo=cs[0] && cs[0].classList.contains('si-am') && /hace 2 días/.test(cs[0].textContent);
    STOCK.c=null; try{ renderStock(); o.sin=document.getElementById('stock-info').textContent; }catch(e){ o.sin='ERR '+e.message; }
    return o;
  });
  chk('Stock: la línea de arriba en pastillas; sigue empezando con «corte del …» y dice productos y cada fábrica', r.cls && r.chips>=4 && /^corte del \d\d\/\d\d 08:40 \(hoy\)/.test(r.txt) && /producto/.test(r.txt) && /Moreno/.test(r.fab.join(' ')) && /Multiespumas/.test(r.fab.join(' ')) && /→/.test(r.fab[0]), r);
  chk('verde si el Excel es de hoy, ámbar si no', r.ok && r.viejo, r);
  await page._ctx.close();
  page = await abrir(390, 800);
  r = await ev(page, async () => {
    showView('atc'); await new Promise(function(r){ setTimeout(r, 400); }); acomodarFichas();
    var f=document.querySelector('#view-atc .filters'), m=document.getElementById('atc-metrics');
    STOCK.c={ f:todayStr(), hora:'08:40:06', t:Date.now(), u:{ 'SOFT|140x190':5 }, cod:{} }; abrirStock(); await new Promise(function(r){ setTimeout(r, 300); });
    var inf=document.getElementById('stock-info');
    return { alto:f.offsetHeight, cols:m.style.gridTemplateColumns, sw:document.documentElement.scrollWidth<=document.documentElement.clientWidth, chips:inf.querySelectorAll('.si-c').length, txt:inf.textContent.slice(0,60) };
  });
  chk('celular: los filtros de ATC siguen uno debajo del otro, las fichas de a dos y nada corre de costado', r.alto>200 && /repeat\(2,/.test(r.cols||'') && r.sw, r);
  chk('celular: la línea de Stock sigue siendo el texto de dos renglones, con los plazos primero', r.chips===0 && /^MORENO/.test(r.txt), r);
  await page._ctx.close();

  console.log('\n── 5. Las ventanas nacen de lo que tocás (168) ──');
  page = await abrir(1100, 800);
  r = await ev(page, async () => {
    showView('mis'); MIS_TODOS=false; document.getElementById('mis-vendedor').value='Mirian Salazar'; renderMis(); await new Promise(function(r){ setTimeout(r, 300); });
    var c=document.querySelector('#mis-lista .cho-card'); if(!c) return { sinFicha:1 };
    naceAnotar(c); c.click(); await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });
    var box=document.getElementById('modal-box');
    var o={ on:document.getElementById('modal').classList.contains('on'), de:!!NACE.de, an:(box.getAnimations ? box.getAnimations().filter(function(a){ return !a.animationName; }).length : -1) };
    closeModal(); o.eco=!!document.querySelector('.nace-eco'); return o;
  });
  chk('en Playwright, sin `NACE_PRUEBA`, la ventana abre como siempre (sin animación ni contorno)', r.on && !r.de && r.an===0 && !r.eco, r);
  await page._ctx.close();
  page = await abrir(1100, 800, () => { window.NACE_PRUEBA=1; });
  r = await ev(page, async () => {
    showView('mis'); MIS_TODOS=false; document.getElementById('mis-vendedor').value='Mirian Salazar'; renderMis(); await new Promise(function(r){ setTimeout(r, 300); });
    var c=document.querySelector('#mis-lista .cho-card'); if(!c) return { sinFicha:1 };
    c.scrollIntoView({ block:'center' });   // si lo tocado ya no se ve, no hay contorno que vuelva
    naceAnotar(c.querySelector('.cho-cli') || c); c.click(); await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });
    var box=document.getElementById('modal-box'), an=box.getAnimations().filter(function(a){ return !a.animationName; });
    var o={ on:document.getElementById('modal').classList.contains('on'), de:NACE.de===c, an:an.length, dur:an[0] && an[0].effect.getTiming().duration };
    await new Promise(function(r){ setTimeout(r, 500); });
    o.limpio=box.getAnimations().filter(function(a){ return !a.animationName; }).length===0 && box.style.animation==='' && box.style.transform==='';
    closeModal(); o.cerrada=!document.getElementById('modal').classList.contains('on'); o.eco=!!document.querySelector('.nace-eco');
    await new Promise(function(r){ setTimeout(r, 700); }); o.ecoSeVa=!document.querySelector('.nace-eco'); o.deFin=NACE.de===null;
    /* pasado un rato del toque, ya no nace de ahí */
    NACE.t=Date.now()-5000; showMisModal(STATE[0].id); await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); }); o.viejo=!NACE.de; closeModal();
    return o;
  });
  chk('con el toque, la ventana crece desde la ficha tocada (una animación corta, sin dejar estilos puestos)', r.on && r.de && r.an===1 && r.dur>200 && r.dur<600 && r.limpio, r);
  chk('al cerrar, la ventana se cierra en el acto y el contorno vuelve y se va solo', r.cerrada && r.eco && r.ecoSeVa && r.deFin, r);
  chk('si el toque fue hace rato, abre como siempre', r.viejo, r);
  await page._ctx.close();

  console.log('\n── 6. La bienvenida del panel instalado (172) ──');
  {
    const ctx = await browser.newContext({ viewport:{ width:1280, height:800 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e=>errores.push(e.message));
    await p.goto('file://' + PEDIDOS, { waitUntil:'load' }); await p.waitForTimeout(200);
    r = await ev(p, () => ({ h:document.getElementById('bienv').hidden, ss:sessionStorage.getItem('me_bienv') }));
    chk('en una pestaña común (y en Playwright) no sale', r.h===true && !r.ss, r);
    await p.addInitScript(() => { window.BIENV_PRUEBA=1; });
    await p.reload({ waitUntil:'commit' }); await p.waitForTimeout(500);
    r = await ev(p, () => { var d=document.getElementById('bienv'), cs=getComputedStyle(d); return { h:d.hidden, va:d.classList.contains('va'), z:+cs.zIndex, tapa:d.getBoundingClientRect().width>=innerWidth-1, hojas:d.querySelectorAll('svg path').length, txt:d.textContent }; });
    chk('instalado: al abrir tapa la pantalla con las tres hojas y «MultiEspumas · PEDIDOS»', r.h===false && r.va && r.z>=10000 && r.tapa && r.hojas===3 && /MultiEspumas/.test(r.txt) && /PEDIDOS/.test(r.txt), r);
    await p.waitForTimeout(2300);
    r = await ev(p, () => ({ h:document.getElementById('bienv').hidden }));
    chk('y se va sola a los dos segundos', r.h===true, r);
    await p.reload({ waitUntil:'load' }); await p.waitForTimeout(300);
    r = await ev(p, () => ({ h:document.getElementById('bienv').hidden }));
    chk('una vez por apertura: al recargar no vuelve a salir', r.h===true, r);
    await ctx.close();
  }

  console.log('\n── 7. La carrera del mes (166) ──');
  page = await abrir(1280, 900);
  r = await ev(page, async () => {
    showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var R=proyeccionMes('2026-11'), D=PRY_CAR.D; if(!D) return { noD:1 };
    var dif=[]; R.marcas.forEach(function(m){ m.filas.forEach(function(f){ var o=D.L.filter(function(x){ return x.v===f.vendedor; })[0]; if(!o || Math.abs(o.ac[D.hasta]-f.vendido)>0.005) dif.push([f.vendedor, f.vendido, o && o.ac[D.hasta]]); }); });
    var tot=0; D.L.forEach(function(o){ tot+=o.ac[D.hasta]; });
    var fila=function(){ return [].slice.call(document.querySelectorAll('#pcar-pista .pcar-f')).map(function(e){ return { t:parseInt(e.style.top,10), n:e.querySelector('.n').textContent, p:e.querySelector('.p').textContent, bs:e.querySelector('em').textContent }; }).sort(function(a,b){ return a.t-b.t; }); };
    var o={ n:D.L.length, hasta:D.hasta, dif:dif, tot:tot, eq:R.equipo.vendido, hoy:fila(), dia:document.getElementById('pcar-dia').textContent, lleva:document.getElementById('pcar-tot').textContent,
            rng:[document.getElementById('pcar-d').max, document.getElementById('pcar-d').value], caja:document.getElementById('pry-carrera-box').innerText.replace(/\s+/g,' ').slice(0,60) };
    pryCarreraPintar(1); o.d1=fila(); o.dia1=document.getElementById('pcar-dia').textContent;
    pryCarreraPintar(3); o.d3=fila();
    return o;
  });
  chk('está en Proyección, con el mes elegido', /LA CARRERA DEL MES — NOVIEMBRE (DE )?2026/i.test(r.caja||''), r.caja);
  chk('una sola verdad: el último día da, vendedor por vendedor, lo «vendido» de Proyección, y la suma es la del equipo', r.n===4 && r.hasta===11 && r.dif && r.dif.length===0 && Math.abs(r.tot-r.eq)<0.005, { n:r.n, hasta:r.hasta, dif:r.dif, tot:r.tot, eq:r.eq });
  chk('hoy (día 11): Mirian 7.000, Mauricio 6.500, Maria 5.500, Isabel 1.800, en ese orden', r.hoy && r.hoy.map(function(x){ return x.n.split(' ')[0]+' '+x.bs; }).join(' | ')==='Mirian Bs 7.000 | Mauricio Bs 6.500 | Maria Bs 5.500 | Isabel Bs 1.800' && r.hoy[0].p==='1°' && /Día 11 de noviembre/.test(r.dia) && /Bs 20\.800/.test(r.lleva), [r.hoy, r.dia, r.lleva]);
  chk('día 1: solo lo que ya estaba cargado antes del 1° (Mirian 1.000); los demás en 0', r.d1 && r.d1[0].n==='Mirian Salazar' && r.d1[0].bs==='Bs 1.000' && r.d1.slice(1).every(function(x){ return x.bs==='Bs 0'; }) && /Día 1 de/.test(r.dia1), r.d1);
  chk('día 3: Mirian y Mauricio empatan en 3.000 y Maria todavía no cargó', r.d3 && r.d3[0].bs==='Bs 3.000' && r.d3[1].bs==='Bs 3.000' && r.d3.filter(function(x){ return x.n==='Maria Flores'; })[0].bs==='Bs 0', r.d3);
  chk('la barra corre del día 1 a hoy (no hay días que todavía no pasaron)', r.rng && r.rng[0]==='11', r.rng);
  r = await ev(page, async () => {
    var o={}; pryCarreraPlay(); o.arranca=PRY_CAR.d===1 && !!PRY_CAR.t && /Parar/.test(document.getElementById('pcar-play').textContent);
    await new Promise(function(r){ setTimeout(r, 1500); }); o.avanza=PRY_CAR.d;
    renderProyeccion(); o.sigue=!!PRY_CAR.t && PRY_CAR.d>=o.avanza && /Parar/.test(document.getElementById('pcar-play').textContent);   // un repintado no la corta
    pryCarreraPlay(); o.para=!PRY_CAR.t && /Largar/.test(document.getElementById('pcar-play').textContent);
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); o.oct=PRY_CAR.D ? { hasta:PRY_CAR.D.hasta, n:PRY_CAR.D.L.length } : null; o.octCaja=document.getElementById('pry-carrera').innerHTML.length;
    document.getElementById('pry-mes').value='2026-12'; renderProyeccion(); o.dic=document.getElementById('pry-carrera').innerHTML;
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    return o;
  });
  chk('«▶ Largar» arranca del día 1 y avanza sola; repintar Proyección no la corta; el botón la para', r.arranca && r.avanza>=2 && r.avanza<=5 && r.sigue && r.para, r);
  chk('un mes sin ventas del equipo o que todavía no empezó no dibuja la carrera', r.oct===null && r.octCaja===0 && r.dic==='', { oct:r.oct, octCaja:r.octCaja, dic:(r.dic||'').slice(0,40) });

  console.log('\n── 8. El calendario de calor (167) ──');
  r = await ev(page, () => {
    var C=PRY_CALOR, G=document.getElementById('pcal'), cel=function(d){ var e=G.querySelector('[data-f="2026-11-'+(d<10?'0':'')+d+'"]'); return e ? { t:e.querySelector('span').textContent, bg:e.style.background, op:e.style.opacity, hoy:e.classList.contains('hoy') } : null; };
    var o={ v:C.v, e:C.e, c:C.c, celdas:G.querySelectorAll('.c:not(.v)').length, huecos:G.querySelectorAll('.c.v').length, cer:[].slice.call(G.querySelectorAll('.c.cer')).map(function(e){ return e.querySelector('b').textContent+(e.querySelector('span').textContent?(':'+e.querySelector('span').textContent):''); }).join(','),
            d3:cel(3), d11:cel(11), d12:cel(12), pie:document.getElementById('pcal-pie').textContent, act:document.querySelector('#pcal-q .active').textContent };
    pryCalorDia('2026-11-03'); o.det=document.getElementById('pcal-d').textContent; o.sel=!!G.querySelector('[data-f="2026-11-03"].sel');
    pryCalorQ('e'); o.eAct=document.querySelector('#pcal-q .active').textContent; o.e10=cel(10); o.e12=cel(12); pryCalorDia('2026-11-10'); o.eDet=document.getElementById('pcal-d').textContent; o.ePie=document.getElementById('pcal-pie').textContent;
    pryCalorQ('c'); o.c4=cel(4); o.c11=cel(11); pryCalorDia('2026-11-04'); o.cDet=document.getElementById('pcal-d').textContent; o.cPie=document.getElementById('pcal-pie').textContent;
    renderProyeccion(); o.queda=document.querySelector('#pcal-q .active').textContent; pryCalorQ('v');
    return o;
  });
  chk('vendido = por el día en que se CARGÓ: el 3 → 5.000, el 4 → 5.000, el 9 → 4.000, el 10 → 3.200 (con la de diciembre), el 11 → 3.500', r.v && r.v['2026-11-03']===5000 && r.v['2026-11-04']===5000 && r.v['2026-11-09']===4000 && r.v['2026-11-10']===3200 && r.v['2026-11-11']===3500 && !r.v['2026-10-28'], r.v);
  chk('entregas = por la fecha agendada, con la ATC y la reposición: el 5 → 2, el 6 → 2, el 10 → 2, el 12 → 2, el 13 → 2', r.e && r.e['2026-11-05']===2 && r.e['2026-11-06']===2 && r.e['2026-11-10']===2 && r.e['2026-11-12']===2 && r.e['2026-11-13']===2, r.e);
  chk('cobrado = por la fecha de cada pago: el 4 → 1.200 y el 11 → 700', r.c && r.c['2026-11-04']===1200 && r.c['2026-11-11']===700 && Object.keys(r.c).length===2, r.c);
  chk('30 días, el mes arranca en domingo (6 huecos) y el feriado y los domingos sin nada van rayados', r.celdas===30 && r.huecos===6 && /(^|,)2:feriado/.test(r.cer) && /(^|,)1(,|$)/.test(r.cer) && /(^|,)8(,|$)/.test(r.cer), [r.celdas, r.huecos, r.cer]);
  chk('cada cuadrito con su número y su color; hoy marcado; lo que todavía no pasó, apagado', r.d3 && r.d3.t==='5 mil' && !!r.d3.bg && r.d11.hoy && r.d11.t==='4 mil' && r.d12 && r.d12.op==='0.45' && r.act==='Vendido', [r.d3, r.d11, r.d12]);
  chk('tocar un día dice su número y lo deja marcado', /martes 3\/11/.test(r.det||'') && /Bs 5\.000/.test(r.det||'') && r.sel, r.det);
  chk('el pie avisa que «vendido» acá es por la carga y la ficha de arriba por la entrega', /Bs 20\.700/.test(r.pie||'') && /fecha de entrega/.test(r.pie||''), r.pie);
  chk('«Entregas»: cuenta pedidos; mañana ya se ve (no se apaga) y dice «hay agendadas»', r.eAct==='Entregas' && r.e10 && r.e10.t==='2' && r.e12 && r.e12.t==='2' && r.e12.op!=='0.45' && /martes 10\/11/.test(r.eDet) && /2 pedidos/.test(r.eDet) && /10 entregas agendadas/.test(r.ePie), [r.e10, r.e12, r.eDet, r.ePie]);
  chk('«Cobrado»: el 4 → Bs 1.200 y el total del mes', r.c4 && r.c4.t==='1 mil' && r.c11 && r.c11.t==='700' && /Bs 1\.200/.test(r.cDet) && /Bs 1\.900/.test(r.cPie), [r.c4, r.c11, r.cDet, r.cPie]);
  chk('lo elegido queda al repintar Proyección', r.queda==='Cobrado', r.queda);
  await page._ctx.close();
  page = await abrir(390, 800);
  r = await ev(page, async () => {
    showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); await new Promise(function(r){ setTimeout(r, 300); });
    var b=document.getElementById('pry-carrera-box'), fs=[].slice.call(b.querySelectorAll('.pcar-f em')), bw=b.getBoundingClientRect().right;
    return { sw:document.documentElement.scrollWidth<=document.documentElement.clientWidth, entra:fs.every(function(e){ return e.getBoundingClientRect().right<=bw+1; }), cal:document.getElementById('pcal').getBoundingClientRect().width<=390 };
  });
  chk('celular: la carrera y el calendario entran sin correr la página y los montos no se cortan', r.sw && r.entra && r.cal, r);
  await page._ctx.close();

  chk('sin errores de página', errores.length===0, errores.slice(0,5));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
