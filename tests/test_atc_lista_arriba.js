/* 🎧 ATC: LA LISTA ARRIBA, LOS NÚMEROS DE CALIDAD PLEGADOS (16/11/2026, mejora 375; el dueño la eligió).
   Después de las fichas y de «El viaje de las ATC» va la lista; «Garantía o contra costo», «Por qué se generaron», «Cada 100 vendidos»,
   «A cuántos meses falla» y «Volvieron a reclamar» quedan en un renglón plegado «📉 Calidad y motivos — Heaven 6,7 cada 100 · … · la mitad
   falla antes de los N meses», que abre lo mismo de siempre. Cada compu recuerda si lo dejó abierto.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `ATC_LISTA_PRUEBA` (Playwright): el orden de siempre (motivos y calidad ANTES de la tabla), sin renglón plegado.
   2. Con la bandera: viaje → tarjetas → tabla → «no hay» → el renglón plegado con motivos y calidad adentro; plegado de entrada.
   3. El renglón dice los números que ya calcula la pestaña (`atcqTasa`, `atcqEdades`): cada marca «cada 100» y «la mitad falla antes de…».
   4. Abrirlo muestra lo de siempre; un motivo sigue filtrando al tocarlo; queda recordado (al volver a dibujar sigue abierto); cerrarlo, igual.
   5. Volver a dibujar no lo arma dos veces y la tabla sigue arriba.
   6. La tabla empieza más arriba que antes.
   Datos SINTÉTICOS (los de test_atc_calidad), reloj clavado en el viernes 13/11/2026 a las 11:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_atc_lista_arriba.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve(__dirname, '..', 'pedidos.html'));
const _src = fs.readFileSync(path.join(__dirname, 'test_atc_calidad.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async () => {'));

(async () => {
  const browser = await chromium.launch();
  const errores=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    await ctx.addInitScript(() => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} });
    if(flag) await ctx.addInitScript(() => { window.ATC_LISTA_PRUEBA=1; window.TW_MAS_PRUEBA=1; });   // con «→ N columnas más» (283), que va pegada a la tabla
    await ctx.route(/^https?:/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-11-13T11:00:00-04:00'));
    await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(700);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(() => { showView('atc'); segSet('atc-mode','todo'); renderAtc(); window.scrollTo(0,0); }); await page.waitForTimeout(300);
    page._ctx=ctx; return page;
  };
  const orden = (page) => page.evaluate(() => {
    var card=document.querySelector('#view-atc > .card');
    var ids=[].map.call(card.children, function(c){ return c.id || c.className; }).filter(function(x){ return /atv-|atc-/.test(x) && x!=='atc-ia'; });   /* `atc-ia` = la 359 (Claude lee las ATC): otra caja, va al final */
    var tw=document.getElementById('atv-tw');
    return { ids:ids, twTop:Math.round(tw.getBoundingClientRect().top+scrollY), calq:!!document.getElementById('atc-calq') };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  const antes = await orden(page);
  chk('1 el orden de siempre: motivos y calidad antes de la tabla, sin renglón plegado',
      antes.ids.join(',')==='atc-metrics,atv-viaje,atc-por-motivo,atc-calidad,atv-cards,atv-tw,atc-empty' && !antes.calq, antes);
  await page._ctx.close();

  console.log('\n── 2-6. Con la bandera ──');
  page = await abrir(true);
  let r = await orden(page);
  chk('2a viaje → tarjetas → tabla → «no hay» → el renglón plegado', r.ids.join(',')==='atc-metrics,atv-viaje,atv-cards,atv-tw,atc-empty,atc-calq', r.ids);
  r = await page.evaluate(() => {
    var d=document.getElementById('atc-calq');
    return { open:d.open, adentro:!!d.querySelector('#atc-por-motivo .atv-mot') && !!d.querySelector('#atc-calidad #atq-tasa') && !!d.querySelector('#atc-calidad #atq-edad'),
      sum:d.querySelector('summary').textContent.replace(/\s+/g,' ').trim(), U:ATCQ_ULT ? { m:ATCQ_ULT.T.marcas.map(function(m){ return m.lbl+':'+m.tasa; }), med:ATCQ_ULT.E.med } : null,
      visible:d.querySelector('#atc-calidad').checkVisibility() };
  });
  chk('2b plegado de entrada, con motivos y calidad adentro (no se ven)', r.open===false && r.adentro && r.visible===false, r);
  const tasaH = (r.U && r.U.m.filter(x=>/^Heaven:/.test(x))[0]||'').split(':')[1];
  chk('3a el renglón dice «📉 Calidad y motivos» con cada marca «cada 100»', /📉 Calidad y motivos/.test(r.sum) && new RegExp('Heaven '+String(tasaH).replace('.',',')+' cada 100').test(r.sum), [r.sum, r.U]);
  chk('3b …y «la mitad falla antes de los N meses» (la mediana de la pestaña)', r.U && r.U.med!=null && new RegExp('la mitad falla antes de los '+String(r.U.med).replace('.',',')+' meses').test(r.sum), [r.sum, r.U]);
  chk('3c dice «Ver ▾» plegado', /Ver ▾/.test(await page.evaluate(() => getComputedStyle(document.querySelector('#atc-calq .atc-calq-v'),'::after').content)), '');
  r = await page.evaluate(async () => {
    var d=document.getElementById('atc-calq'); d.querySelector('summary').click();
    await new Promise(function(x){ setTimeout(x, 80); });
    var vis=document.getElementById('atq-tasa').getBoundingClientRect().height, pref=visPref('atcCal', false);
    var b=[].filter.call(document.querySelectorAll('#atc-por-motivo .atv-mb'), function(x){ return x.getAttribute('data-m')==='Ruido'; })[0];
    b.click(); await new Promise(function(x){ setTimeout(x, 120); });
    var mot=document.getElementById('atc-motivo').value, n=document.querySelectorAll('#tbl-atc tbody tr').length;
    var d2=document.getElementById('atc-calq'), cuantos=document.querySelectorAll('#atc-calq').length;
    return { vis:vis, pref:pref, mot:mot, n:n, sigueAbierto:d2.open, mismo:d2===d, cuantos:cuantos, sel:!!document.querySelector('#atc-por-motivo .atv-mb.on') };
  });
  chk('4a abierto se ve lo de siempre y queda anotado en la compu', r.vis>50 && r.pref===true, r);
  chk('4b un motivo sigue filtrando al tocarlo (Ruido: 2 ATC en la tabla)', r.mot==='Ruido' && r.n===2 && r.sel, r);
  chk('4c al volver a dibujar sigue abierto, y es el MISMO renglón (no se arma dos veces)', r.sigueAbierto && r.mismo && r.cuantos===1, r);
  r = await page.evaluate(async () => {
    document.getElementById('atc-motivo').value=''; renderAtc();
    document.querySelector('#atc-calq summary').click(); await new Promise(function(x){ setTimeout(x, 80); });
    var pref=visPref('atcCal', true);
    renderAtc(); var ids=[].map.call(document.querySelector('#view-atc > .card').children, function(c){ return c.id; }).filter(function(x){ return x && x!=='atc-ia'; });
    return { pref:pref, abierto:document.getElementById('atc-calq').open, ids:ids };
  });
  chk('4d cerrarlo también queda anotado', r.pref===false && r.abierto===false, r);
  chk('5 volver a dibujar no cambia el orden', r.ids.join(',')==='atc-metrics,atv-viaje,atv-cards,atv-tw,atc-empty,atc-calq', r.ids);
  r = await page.evaluate(() => { var L=document.querySelectorAll('#view-atc .tw-mas-h'), tw=document.getElementById('atv-tw');
    return { n:L.length, pegada:L.length===1 && tw.previousElementSibling===L[0], fueraDelPlegado:L.length===1 && !document.getElementById('atc-calq').contains(L[0]) }; });
  chk('5b «→ N columnas más» sigue pegada a la tabla (una sola, no quedó una vieja abajo)', r.pegada && r.fueraDelPlegado, r);
  const despues = await orden(page);
  chk('6 la tabla empieza más arriba que antes', despues.twTop < antes.twTop - 150, { antes:antes.twTop, despues:despues.twTop });
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
