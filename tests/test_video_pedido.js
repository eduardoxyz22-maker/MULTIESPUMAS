/* 🎬 LOS VIDEOS QUE ENSEÑA BLOKI (§4mv, 26/10; dueño: «que Bloki enseñe y lleve al enlace» y «también cargar un pago… y registrar una venta de tienda»).

   LO QUE CUIDA:
   1. El video y su portada están al lado de la página (`videos/`), y `VIDEO_PEDIDO` los nombra.
   2. La primera vez que una vendedora elige su nombre en el aparato, Bloki ofrece el VIDEO (una sola vez, `me_asis_video`); tocar el globo abre la
      ventana con el video. La vez siguiente ofrece el recorrido de siempre.
   3. «¿Cómo hago…?»: buscar «video» (o «cómo aprendo») da «¿Cómo cargo un pedido nuevo?», y esa respuesta tiene «▶️ Ver el video».
   4. La ventana: video con controles y `playsinline`, «📋 Copiar el enlace» (dirección completa) y «Cerrar» lo corta.
   5. Logística o Administración (sin nombre de vendedor) no reciben la oferta.
   6. «Cobrar el saldo» (en las dos respuestas de pagos) y «Venta de tienda» (respuesta nueva al final): cada «▶️ Ver el video» abre SU video.
   Reloj clavado (martes 27/10/2026, 10:00 de Bolivia). Datos sintéticos.
   Se corre:  node tests/test_video_pedido.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errores=[];
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.addInitScript(() => { window.ASIS_PRUEBA=1; window.QUIEN_PRUEBA=1; });
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    STATE=[]; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
    try{ ['me_asis_tour','me_asis_video','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
    window._copiado=''; copyText=function(t){ window._copiado=t; };
    var q=document.getElementById('quien'); if(q) q.hidden=true;
  });

  /* 1 */
  const r1 = await page.evaluate(() => ({ v:VIDEO_PEDIDO, p:VIDEO_PEDIDO_POSTER }));
  const arch = (u) => path.join(path.dirname(PEDIDOS), u.split('?')[0]);
  chk('1. el video y la portada están al lado de la página', /^videos\/.+\.mp4\?v=/.test(r1.v) && fs.existsSync(arch(r1.v)) && fs.statSync(arch(r1.v)).size>1e6 && fs.existsSync(arch(r1.p)), r1);
  const r1b = await page.evaluate(() => Object.keys(VIDEOS).map(function(k){ return { k:k, v:VIDEOS[k].src, p:VIDEOS[k].poster, t:VIDEOS[k].t }; }));
  chk('1b. los seis videos (pedido, pago, tienda; 29/10: atc, rpt, repro) y sus portadas existen', r1b.length===6 && r1b.every(x => fs.existsSync(arch(x.v)) && fs.statSync(arch(x.v)).size>1e6 && fs.existsSync(arch(x.p))), r1b);

  /* 2 */
  const r2 = await page.evaluate(async () => {
    var esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    quienElegir('Mirian Salazar'); await esp(2900);
    var gl=document.getElementById('asis-globo'), t1=gl.hidden ? '' : gl.innerText.replace(/\s+/g,' '), ls=localStorage.getItem('me_asis_video'), tour1=localStorage.getItem('me_asis_tour');
    gl.click(); await esp(200);
    var m=document.getElementById('modal'), abre=m.classList.contains('on') && !!m.querySelector('video.vid-ped');
    closeModal(); await esp(100);
    gl.hidden=true; quienElegir('Mirian Salazar'); await esp(2900);
    var t2=gl.hidden ? '' : gl.innerText.replace(/\s+/g,' ');
    gl.hidden=true; quienElegir('Mirian Salazar'); await esp(2900);
    var t3=gl.hidden ? '' : gl.innerText.replace(/\s+/g,' ');
    return { t1:t1, ls:ls, tour1:tour1, abre:abre, t2:t2, t3:t3 };
  });
  chk('2a. la primera vez, Bloki ofrece el video de cómo se carga un pedido', /cómo se carga un pedido/.test(r2.t1) && /3 minutos/.test(r2.t1) && !!r2.ls && !r2.tour1, r2);
  chk('2b. tocar el globo abre la ventana con el video', r2.abre, r2);
  chk('2c. la vez siguiente, el recorrido de siempre; y después ninguna de las dos', /Te muestro el panel/.test(r2.t2) && !/Te muestro el panel|cómo se carga/.test(r2.t3), r2);

  /* 3 + 4 */
  const r3 = await page.evaluate(async () => {
    var esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var q=function(t){ var i=asisBuscar(t)[0]; return i==null ? '' : ASIS_AYUDA[i].q; };
    var busca={ video:q('video'), aprendo:q('cómo aprendo a cargar un pedido'), mirar:q('quiero ver el video del pedido') };
    asisAbrir('ayuda'); ASIS.q='video'; ASIS_ABIERTA=asisBuscar('video')[0]; asisAyudaLista(); await esp(100);
    var b=[].filter.call(document.querySelectorAll('#asis-lista button'), function(x){ return /Ver el video/.test(x.textContent); })[0];
    var otras=ASIS_AYUDA.filter(function(a){ return a.vid==='pedido'; }).length, pasos=ASIS_AYUDA[asisBuscar('video')[0]].p.join(' ');
    if(b) b.click(); await esp(200);
    var m=document.getElementById('modal'), v=m.querySelector('video.vid-ped'), src=v && v.querySelector('source').getAttribute('src');
    var cerro=!document.getElementById('asis-panel') || document.getElementById('asis-panel').hidden;
    var cop=[].filter.call(m.querySelectorAll('button'), function(x){ return /Copiar el enlace/.test(x.textContent); })[0]; if(cop) cop.click();
    var abrir=[].filter.call(m.querySelectorAll('a'), function(x){ return /Abrir aparte/.test(x.textContent); })[0];
    var pausada=false; if(v){ v.pause=function(){ pausada=true; }; }
    var cerrar=[].filter.call(m.querySelectorAll('button'), function(x){ return /^Cerrar$/.test(x.textContent.trim()); })[0]; if(cerrar) cerrar.click();
    return { busca:busca, hayBoton:!!b, otras:otras, pasos:pasos, video:!!v, controles:!!(v && v.controls), inline:!!(v && v.hasAttribute('playsinline')), src:src,
      poster:v && v.getAttribute('poster'), cerroBloki:cerro, copiado:window._copiado, abrir:abrir && abrir.getAttribute('href'), abrirTarget:abrir && abrir.target, pausada:pausada, abierta:m.classList.contains('on') };
  });
  chk('3a. buscar «video», «cómo aprendo…» o «ver el video» lleva a «¿Cómo cargo un pedido nuevo?»', /pedido nuevo/.test(r3.busca.video) && /pedido nuevo/.test(r3.busca.aprendo) && /pedido nuevo/.test(r3.busca.mirar), r3.busca);
  chk('3b. esa respuesta tiene «▶️ Ver el video» (el del pedido está solo en esa) y nombra la foto del recibo', r3.hayBoton && r3.otras===1 && /foto del recibo/.test(r3.pasos), r3);
  chk('4a. la ventana: el video con controles y playsinline, desde videos/, con portada; Bloki se cierra', r3.video && r3.controles && r3.inline && /^videos\/como-cargar-un-pedido\.mp4/.test(r3.src||'') && /^videos\//.test(r3.poster||'') && r3.cerroBloki, r3);
  chk('4b. «📋 Copiar el enlace» copia la dirección completa del video y «Abrir aparte» va a otra pestaña', /^file:\/\/.+\/videos\/como-cargar-un-pedido\.mp4$/.test(r3.copiado) && /^videos\//.test(r3.abrir||'') && r3.abrirTarget==='_blank', r3);
  chk('4c. «Cerrar» cierra la ventana y corta el video', !r3.abierta && r3.pausada, r3);

  /* 5 */
  const r5 = await page.evaluate(async () => {
    var esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    try{ localStorage.removeItem('me_asis_video'); localStorage.removeItem('me_asis_tour'); }catch(e){}
    var gl=document.getElementById('asis-globo'); gl.hidden=true;
    quienElegir('', 'logistica'); await esp(2900);
    var t=gl.innerText.replace(/\s+/g,' ');
    return { t:t, ls:localStorage.getItem('me_asis_video') };
  });
  chk('5. logística no recibe la oferta del video', !/cómo se carga un pedido/.test(r5.t) && !r5.ls, r5);

  /* 6 */
  const r6 = await page.evaluate(async () => {
    var esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    quienRol(''); setVendedorMem('Mirian Salazar');
    var abrir=async function(q){ var i=asisBuscar(q)[0], a=ASIS_AYUDA[i]; asisAbrir('ayuda'); ASIS.q=q; ASIS_ABIERTA=i; asisAyudaLista(); await esp(80);
      var b=[].filter.call(document.querySelectorAll('#asis-lista button'), function(x){ return /Ver el video/.test(x.textContent); })[0], txt=b ? b.textContent : '';
      if(b) b.click(); await esp(150);
      var m=document.getElementById('modal'), v=m.querySelector('video.vid-ped'), out={ q:a.q, vid:a.vid, boton:txt, src:v && v.querySelector('source').getAttribute('src'), tit:(m.querySelector('.modal-h h3')||{}).textContent||'' };
      closeModal(); await esp(50); return out; };
    var pagoA=await abrir('cómo anoto un adelanto'), pagoC=await abrir('registro un pago en contabilidad'), saldo=await abrir('cobrar el saldo'), tienda=await abrir('venta de tienda');
    var ult=ASIS_AYUDA[ASIS_AYUDA.length-1];
    window._copiado=''; verVideo('tienda'); await esp(80);
    var cop=[].filter.call(document.querySelectorAll('#modal button'), function(x){ return /Copiar el enlace/.test(x.textContent); })[0]; if(cop) cop.click(); closeModal();
    return { pagoA:pagoA, pagoC:pagoC, saldo:saldo, tienda:tienda, ultimo:ult.q, ultF:[].concat(ult.f).some(function(s){ return !!document.querySelector(s); }), copiado:window._copiado };
  });
  chk('6a. «¿Cómo anoto el pago o un adelanto?» y «¿Cómo registro un pago en Contabilidad?» abren el video de cobrar el saldo',
      r6.pagoA.vid==='pago' && /cobrar-el-saldo/.test(r6.pagoA.src||'') && r6.pagoC.vid==='pago' && /cobrar-el-saldo/.test(r6.pagoC.src||'') && /saldo pendiente/.test(r6.pagoC.tit), r6);
  chk('6b. buscar «cobrar el saldo» lleva a una respuesta de pagos con su video', r6.saldo.vid==='pago', r6.saldo);
  chk('6c. «¿Cómo registro una venta de tienda?» va AL FINAL, señala algo que existe y abre su video', r6.ultimo==='¿Cómo registro una venta de tienda?' && r6.ultF &&
      r6.tienda.q===r6.ultimo && /venta-de-tienda/.test(r6.tienda.src||'') && /venta de tienda/.test(r6.tienda.tit) && /1 min/.test(r6.tienda.boton), r6.tienda);
  chk('6d. «Copiar el enlace» copia el del video que se está mirando', /videos\/como-registrar-venta-de-tienda\.mp4$/.test(r6.copiado), r6.copiado);

  /* 7. 🎬 (29/10, §4np; el dueño eligió la «21») ATC, RPT y cambiar el día: cada respuesta de Bloki abre SU video, y no se agregó ninguna respuesta. */
  const r7 = await page.evaluate(async () => {
    var esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var abrir=async function(q){ var i=asisBuscar(q)[0], a=ASIS_AYUDA[i]; asisAbrir('ayuda'); ASIS.q=q; ASIS_ABIERTA=i; asisAyudaLista(); await esp(80);
      var b=[].filter.call(document.querySelectorAll('#asis-lista button'), function(x){ return /Ver el video/.test(x.textContent); })[0], txt=b ? b.textContent : '';
      if(b) b.click(); await esp(120);
      var m=document.getElementById('modal'), v=m.querySelector('video.vid-ped'), out={ q:a.q, vid:a.vid, boton:txt, src:v && v.querySelector('source').getAttribute('src'), tit:(m.querySelector('.modal-h h3')||{}).textContent||'' };
      try{ closeModal(); }catch(e){} await esp(60); return out; };
    return { atc:await abrir('cómo cargo una atc'), rpt:await abrir('reposición para mi tienda'), repro:await abrir('cambiar el día de entrega'), n:ASIS_AYUDA.length };
  });
  chk('7a. «¿Cómo cargo una ATC?» abre el video de la ATC (2 min)', r7.atc.vid==='atc' && /como-cargar-una-atc\.mp4/.test(r7.atc.src||'') && /ATC/.test(r7.atc.tit) && /2 min/.test(r7.atc.boton), r7.atc);
  chk('7b. «¿Cómo pido reposición para mi tienda (RPT)?» abre el de la RPT', r7.rpt.vid==='rpt' && /como-pedir-una-reposicion\.mp4/.test(r7.rpt.src||'') && /RPT/.test(r7.rpt.tit), r7.rpt);
  chk('7c. «¿Cómo cambio el día de entrega?» abre el de cambiar el día', r7.repro.vid==='repro' && /como-cambiar-el-dia\.mp4/.test(r7.repro.src||'') && /cambiar el día/.test(r7.repro.tit), r7.repro);
  chk('7d. no se agregó ninguna respuesta (siguen 22)', r7.n===22, r7.n);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
