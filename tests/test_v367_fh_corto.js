/* 🎨 NUEVO PEDIDO: LOS CAMPOS A LA VISTA AL ABRIR (16/11/2026, mejora 367; el dueño la eligió en «Mejoras 344-389»).
   En una compu de 1.366 × 768 el cartel de arriba medía 254 px y repetía lo de la agenda y «Tu pedido»: no se veía ningún campo al abrir.

   ⚠️ LO QUE ESTE TEST CUIDA (lo lee `#fh`, como test_arriba_pedido):
   1. Sin `FH_CORTO_PRUEBA` (Playwright, con FH_PRUEBA): el cartel grande de siempre.
   2. Con la bandera y 1.366 px: UNA línea (~42 px) «🚚 Mar 17/11 · 🌅 N libres · 🌆 N libres · 👀 Ver · Cotizar · ?», con los MISMOS
      números de `cuposUsadosTurno`, entera (sin nada cortado); lo grande, escondido; la fecha de entrega se ve al abrir.
   3. OC · ATC · RPT · Cotización en una fila.
   4. «👀 Ver» abre los pedidos del turno (`verCuposTurno`).
   5. Con el turno lleno, el aviso de una línea sigue debajo.
   6. En una pantalla angosta (sin agenda, 1.000 px) el cartel grande queda como siempre.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v367_fh_corto.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
    var P=function(i, f, t){ return { id:'c'+i, oc:'11-'+(100+i), fecha:f, turno:t, vendedor:'Maria Flores', cliente:'C'+i, celular:'70000000', zona:'Norte', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1 }], ts:Date.now(), entregado:false, fotos:[] }; };
    var L=[]; for(var i=0;i<4;i++) L.push(P(i,'2026-11-17','AM')); for(var j=0;j<3;j++) L.push(P(10+j,'2026-11-17','PM')); for(var k=0;k<12;k++) L.push(P(20+k,'2026-11-19','AM'));
    STATE=JSON.parse(JSON.stringify(L)); apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    window.FH_PRUEBA=1; window.FP_PRUEBA=1;
    showView('form'); resetForm(); scrollTo(0,0);
    window.__mirar=function(){ var fh=document.getElementById('fh'), r=fh.getBoundingClientRect(), l=fh.querySelector('.p367'), vis=function(e){ return !!(e && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().height>0); };
      var fe=document.getElementById('f-fecha').getBoundingClientRect(), tipos=[].map.call(document.querySelectorAll('#f-doc-tipo > button'), function(b){ return Math.round(b.getBoundingClientRect().top); });
      return { alto:Math.round(r.height), linea:vis(l) ? l.innerText.replace(/\s+/g,' ').trim() : '', grande:vis(fh.querySelector('.fh-turnos')), top:vis(fh.querySelector('.fh-top')),
        fechaVisible:fe.top>0 && fe.bottom<innerHeight, tipos:tipos, guia:!!(l && l.querySelector('a[href="tutorial.html"]')), entra:!!(l && l.scrollWidth<=l.clientWidth+1), alerta:[].map.call(fh.querySelectorAll('.fh-alerta'), function(a){ return vis(a) ? a.textContent : ''; }).filter(Boolean) }; };
  });
  await page.waitForTimeout(300);

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(() => { renderCupoForm(); scrollTo(0,0); return __mirar(); });
  chk('1 el cartel grande de siempre (más de 150 px, con los dos turnos)', r.alto>150 && r.grande && r.top && !r.linea, r);

  console.log('\n── 2-3. Con la bandera, 1.366 px ──');
  r = await ev(() => { window.FH_CORTO_PRUEBA=1; renderCupoForm(); scrollTo(0,0); var o=__mirar(); o.u=[cuposUsadosTurno('2026-11-17','AM'), cuposUsadosTurno('2026-11-17','PM')]; return o; });
  chk('2a una línea de ~42 px', r.alto>=38 && r.alto<=50 && !r.grande && !r.top, [r.alto, r.grande, r.top]);
  chk('2b «🚚 Mar 17/11 · 🌅 8 libres · 🌆 10 libres · 👀 Ver · Cotizar · ?» (la guía en su «?»: en 1.366 px no entra la palabra)', /^🚚 Mar 17\/11 🌅 8 libres 🌆 10 libres 👀 Ver/.test(r.linea) && r.guia && r.u.join(',')==='4,3', [r.linea, r.guia, r.u]);
  chk('2b2 la línea entra entera, sin nada cortado', r.entra, r.entra);
  chk('2c la fecha de entrega se ve al abrir', r.fechaVisible, r.fechaVisible);
  chk('3 OC · ATC · RPT · Cotización en una fila', r.tipos.length>=3 && new Set(r.tipos).size===1, r.tipos);

  console.log('\n── 4. «👀 Ver» ──');
  r = await ev(() => { document.querySelector('#fh .p367 .v').click(); var m=document.getElementById('modal'), o={ ab:m.classList.contains('on'), t:(m.querySelector('h3')||{}).textContent||'' }; closeModal(); return o; });
  chk('4 abre los pedidos del turno', r.ab && /Turno AM/.test(r.t), r);

  console.log('\n── 5. Turno lleno ──');
  r = await ev(() => { var e=document.getElementById('f-fecha'); e.value='2026-11-19'; e.dispatchEvent(new Event('change',{bubbles:true})); renderCupoForm(); return __mirar(); });
  chk('5 «🌅 lleno» en la línea y el aviso de una línea debajo', /🌅 lleno/.test(r.linea) && r.alerta.some(a=>/llena/.test(a)), r);

  console.log('\n── 6. Pantalla angosta ──');
  await page.setViewportSize({ width:1000, height:768 });
  r = await ev(() => { var e=document.getElementById('f-fecha'); e.value='2026-11-17'; e.dispatchEvent(new Event('change',{bubbles:true})); renderCupoForm(); return __mirar(); });
  chk('6 sin agenda al costado: el cartel grande de siempre', r.grande && r.top && !r.linea, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
