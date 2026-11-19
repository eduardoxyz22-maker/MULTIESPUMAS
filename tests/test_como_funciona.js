/* ⓘ LAS EXPLICACIONES LARGAS, EN «ⓘ CÓMO FUNCIONA» (16/11/2026, mejora 377; el dueño la eligió).
   Los párrafos de explicación (Stock, Proyección, Cuadre, ATC) quedan adentro de un botoncito «ⓘ Cómo funciona» con el MISMO texto. La
   primera vez en cada compu se ve abierto; después, plegado; lo que la persona abre o cierra queda recordado.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `COMO_PRUEBA` (Playwright): `ayudaComo` devuelve el mismo html (las pruebas de siempre leen esos textos).
   2. Con la bandera, la primera vez: abierto, con el texto entero adentro; al volver a dibujar en la misma visita, sigue abierto.
   3. En la visita siguiente (otra apertura de la página): plegado.
   4. El `toggle` que dispara el navegador al dibujarlo abierto NO cambia lo guardado.
   5. Si la persona lo abre, queda abierto en las próximas visitas; si lo cierra, cerrado.
   6. Puesto de verdad: ATC («Cada 100 vendidos» y «A cuántos meses»), Stock («Lo que nos debe la fábrica»), Proyección («Por vendedor»):
      el texto de siempre, adentro del «ⓘ Cómo funciona».
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_como_funciona.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve(__dirname, '..', 'pedidos.html'));
const _src = fs.readFileSync(path.join(__dirname, 'test_atc_calidad.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async () => {'));
const _src2 = fs.readFileSync(path.join(__dirname, 'test_pry_tiendas.js'), 'utf8');
const PREPARAR_PRY = _src2.slice(_src2.indexOf('function PREPARAR(){'), _src2.indexOf('\n(async () => {')).replace('function PREPARAR(){', 'function PREPARAR_PRY(){');

(async () => {
  const browser = await chromium.launch();
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} });
  await ctx.route(/^https?:/, r => r.abort());
  let page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-13T11:00:00-04:00'));
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(600);

  console.log('\n── 1. Sin la bandera ──');
  let r = await page.evaluate(() => { var h='<p class="x">Una explicación larga.</p>'; return { igual:ayudaComo('t1', h)===h, fd:/^<p class="fd-ley">/.test(fdLeyHtml()) }; });
  chk('1 ayudaComo devuelve el mismo html y la de la fábrica sigue siendo el párrafo de siempre', r.igual && r.fd, r);

  console.log('\n── 2-5. Con la bandera ──');
  r = await page.evaluate(async () => {
    window.COMO_PRUEBA=1; try{ localStorage.removeItem(VIS_LS); }catch(e){} COMO_SES={};
    var h='<p class="x">Una explicación <b>larga</b> que se lee una vez.</p>';
    var a=ayudaComo('t2', h), box=document.createElement('div'); box.id='__como'; box.innerHTML=a; document.body.appendChild(box);
    await new Promise(function(x){ setTimeout(x, 80); });   // el toggle del navegador al dibujarlo abierto
    var d=box.querySelector('details.como');
    var otra=ayudaComo('t2', h);
    return { open:d.open, sum:d.querySelector('summary').textContent, adentro:d.querySelector('.como-x').innerHTML===h, pref:visPref('como_t2', 'nada'), otraAbierta:/ open /.test(otra) || / open>/.test(otra) || /data-ab="1" open/.test(otra) };
  });
  chk('2a la primera vez: abierto, «ⓘ Cómo funciona» y el texto entero adentro', r.open && r.sum==='ⓘ Cómo funciona' && r.adentro, r);
  chk('2b al volver a dibujar en la misma visita, sigue abierto', r.otraAbierta, r);
  chk('4 el toggle del navegador al dibujarlo no cambió lo guardado (queda «plegado para la próxima»)', r.pref===false, r);
  r = await page.evaluate(() => { COMO_SES={}; var a=ayudaComo('t2', '<p>x</p>'); return { abierta:/data-ab="1"/.test(a), cerrada:/data-ab="0"/.test(a) && !/ open/.test(a) }; });
  chk('3 en la visita siguiente: plegado', r.cerrada && !r.abierta, r);
  r = await page.evaluate(async () => {
    var box=document.getElementById('__como'); box.innerHTML=ayudaComo('t2', '<p>x</p>');
    var d=box.querySelector('details.como'); d.querySelector('summary').click(); await new Promise(function(x){ setTimeout(x, 60); });
    var p1=visPref('como_t2', 'nada'); COMO_SES={}; var a=ayudaComo('t2', '<p>x</p>');
    box.innerHTML=a; d=box.querySelector('details.como'); d.querySelector('summary').click(); await new Promise(function(x){ setTimeout(x, 60); });
    var p2=visPref('como_t2', 'nada'); COMO_SES={}; var b=ayudaComo('t2', '<p>x</p>'); box.remove();
    return { p1:p1, abreProx:/data-ab="1" open/.test(a), p2:p2, cierraProx:/data-ab="0"/.test(b) };
  });
  chk('5a abrirlo queda guardado: la próxima visita, abierto', r.p1===true && r.abreProx, r);
  chk('5b cerrarlo también: la próxima, plegado', r.p2===false && r.cierraProx, r);

  console.log('\n── 6. Puesto de verdad ──');
  await page.evaluate('('+PREPARAR+')()');
  r = await page.evaluate(() => {
    window.COMO_PRUEBA=1; showView('atc'); segSet('atc-mode','todo'); renderAtc();
    var t=document.querySelector('#atq-tasa details.como'), m=document.querySelector('#atq-edad details.como');
    var fd=document.createElement('div'); fd.innerHTML=fdLeyHtml(); var fdD=fd.querySelector('details.como');
    return { tasa:t && /Aproximado: algunas ATC son de colchones/.test(t.textContent), meses:m && /Meses desde la fecha de compra/.test(m.textContent),
      fd:!!fdD && /Cada «✓ Ya pedí» y cada pedido de cliente/.test(fdD.textContent) };
  });
  chk('6a ATC: «Cada 100 vendidos» y «A cuántos meses» con su explicación de siempre adentro', r.tasa && r.meses, r);
  chk('6b Stock: «Lo que nos debe la fábrica» con su explicación adentro', r.fd, r);
  await page.evaluate('('+PREPARAR_PRY+')()');
  r = await page.evaluate(() => {
    STATE=FIX(); showView('conta'); localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
    document.getElementById('admin-pass').value='clave-de-prueba'; tryUnlock(); try{ closeModal(); }catch(e){}
    segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var d=document.querySelector('#pry-vendedores details.como');
    return { ok:!!d && /A la derecha: lo vendido y, en violeta, la proyección al cierre/.test(d.textContent), sigue:!!document.querySelector('#pry-vendedores .pry-fila') };
  });
  chk('6c Proyección → Por vendedor: «A la derecha: lo vendido…» adentro, y la lista sigue igual', r.ok && r.sigue, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
