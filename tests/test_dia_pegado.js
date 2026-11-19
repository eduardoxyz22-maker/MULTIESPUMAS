/* 📌 AL BAJAR, EL DÍA Y EL TURNO QUEDAN ARRIBA (15/11/2026, mejora 286; el dueño la quiere VER con datos reales antes de decidir).
   Administración en fichas: el título de cada grupo (día · turno · cuántos listos, con una barrita) se queda pegado debajo del encabezado
   mientras se ven sus fichas, y lo reemplaza el del grupo siguiente. Pasadas dos pantallas, «↑ Arriba» abajo a la derecha (en
   Administración en fichas y en Mis pedidos; «↑ Arriba · Hoy» si el grupo de hoy quedó arriba).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): los grupos como siempre (sin caja, sin barrita, sin botón).
   2. Con `AF_PEGADO_PRUEBA`: los títulos dicen EXACTAMENTE lo mismo que sin la bandera; cada grupo en su caja; la barrita con lo listo.
   3. Al bajar hasta las fichas del 2° grupo, arriba (debajo del encabezado) está SU título; más abajo, el del 3°. Nunca tapa el encabezado.
   4. «↑ Arriba» no aparece al principio; pasadas dos pantallas sí («· Hoy», el grupo de hoy quedó arriba) y lleva al grupo de hoy;
      ahí dice «↑ Arriba» a secas y lleva al principio de la página.
   5. En Mis pedidos aparece «↑ Arriba» (sin «Hoy») y lleva al principio; en Contabilidad no aparece.
   Datos SINTÉTICOS. Reloj clavado: jueves 22/10/2026, 09:10 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_dia_pegado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errs=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz', reducedMotion:'reduce' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
    if(flag) await page.addInitScript(() => { window.AF_PEGADO_PRUEBA=true; });
    await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(async()=>{
      window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
      var lin=function(k){ var L=[]; for(var i=0;i<k;i++) L.push(_lin('CH1201|TITANIO ICE|160x190',1,{ chk:i%2?'ok':'' })); return L; };
      var ps=[], n=0;
      var grupo=function(f, t, k, listos){ for(var i=0;i<k;i++){ n++; ps.push(_ped('a'+(100+n), f, t, lin(1+(n%3)), { cliente:'CLIENTE '+n, nroDia:i+1, verificado:i<listos, vendedor:'Carola Chavez',
        ts:_ts('2026-10-20', ('0'+(8+(n%10))).slice(-2)+':'+('0'+(n%60)).slice(-2)+':00') })); } };
      grupo('2026-10-22','AM',12,7); grupo('2026-10-22','PM',10,4); grupo('2026-10-23','AM',12,2); grupo('2026-10-23','PM',8,0); grupo('2026-10-24','AM',6,0);
      await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
      document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
      showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
      await new Promise(function(x){ setTimeout(x, 250); });
    });
    page._ctx=ctx; return page;
  };
  const grupos = (page) => page.evaluate(() => [].map.call(document.querySelectorAll('#adm-fichas .af-g'), function(g){ return g.textContent.replace(/\s+/g,' ').trim(); }));
  /* qué título hay justo debajo del encabezado y de la barra de filtros (que también va pegada), y dónde */
  const arriba = (page) => page.evaluate(() => {
    var hd=document.querySelector('.header').getBoundingClientRect(), ch=document.getElementById('adm-chips').getBoundingClientRect(), box=document.getElementById('adm-fichas').getBoundingClientRect();
    var techo=Math.max(hd.bottom, ch.bottom), y=techo+14, el=document.elementFromPoint(box.left+60, y), g=el && el.closest('.af-g');
    return { techo:Math.round(techo), hdBottom:Math.round(hd.bottom), chips:Math.round(ch.bottom), t:g ? g.textContent.replace(/\s+/g,' ').trim() : '', top:g ? Math.round(g.getBoundingClientRect().top) : null, scroll:Math.round(scrollY) };
  });
  const boton = (page) => page.evaluate(() => { var b=document.getElementById('arriba-btn'); return b ? { on:b.classList.contains('on'), t:b.textContent, op:getComputedStyle(b).opacity } : { on:false, t:'', op:'' }; });
  const bajarA = async (page, sel, i, dy) => { await page.evaluate(([sel, i, dy]) => { var el=document.querySelectorAll(sel)[i]; var r=el.getBoundingClientRect(); window.scrollTo(0, scrollY+r.top+dy); }, [sel, i, dy]); await page.waitForTimeout(150); };

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  const sinT = await grupos(page);
  let r = await page.evaluate(() => ({ cajas:document.querySelectorAll('#adm-fichas .af-gr').length, barras:document.querySelectorAll('#adm-fichas .af-gbar').length,
    pos:getComputedStyle(document.querySelector('#adm-fichas .af-g')).position }));
  await page.evaluate(() => window.scrollTo(0, 3000)); await page.waitForTimeout(150);
  r.boton = await boton(page);
  chk('1 sin bandera: los grupos como siempre, sin caja ni barrita ni botón', sinT.length===5 && r.cajas===0 && r.barras===0 && r.pos!=='sticky' && !r.boton.on, r);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  const conT = await grupos(page);
  chk('2a los títulos dicen exactamente lo mismo', JSON.stringify(conT)===JSON.stringify(sinT), conT);
  r = await page.evaluate(() => ({ cajas:[].map.call(document.querySelectorAll('#adm-fichas .af-gr'), function(c){ return c.querySelectorAll('.af-g').length+'/'+c.querySelectorAll('.af-f').length; }),
    hoy:[].map.call(document.querySelectorAll('#adm-fichas .af-gr'), function(c){ return c.getAttribute('data-hoy')||''; }),
    barras:[].map.call(document.querySelectorAll('#adm-fichas .af-gbar i'), function(i){ return i.style.width; }), pos:getComputedStyle(document.querySelector('#adm-fichas .af-g')).position }));
  chk('2b cada grupo en su caja (1 título + sus fichas); los dos de hoy marcados', JSON.stringify(r.cajas)==='["1/12","1/10","1/12","1/8","1/6"]' && r.hoy.join(',')==='1,1,,,' && r.pos==='sticky', r);
  chk('2c la barrita dice cuántos están listos (7 de 12, 4 de 10, 2 de 12, 0 de 8, 0 de 6)', r.barras.join(',')==='58%,40%,17%,0%,0%', r.barras);
  r = await boton(page);
  chk('4a al principio, «↑ Arriba» no aparece', !r.on, r);

  await bajarA(page, '#adm-fichas .af-gr', 1, 300);
  r = await arriba(page);
  chk('3a bajando por las fichas del 2° grupo, arriba está SU título (pegado debajo del encabezado y de la barra de filtros)', r.t===sinT[1] && r.chips>r.hdBottom && r.top>=r.techo && r.top<=r.techo+12, r);
  await bajarA(page, '#adm-fichas .af-gr', 2, 260);
  r = await arriba(page);
  chk('3b más abajo lo reemplaza el del 3° grupo', r.t===sinT[2] && r.top>=r.techo, r);

  await bajarA(page, '#adm-fichas .af-gr', 3, 200);
  r = await boton(page);
  chk('4b pasadas dos pantallas aparece «↑ Arriba · Hoy» (el grupo de hoy quedó arriba)', r.on && r.t==='↑ Arriba · Hoy', r);
  r = await page.evaluate(async () => { var b=document.getElementById('arriba-btn'), x=b.getBoundingClientRect(), bl=document.querySelector('.asis-yo'), br=bl&&bl.getClientRects().length?bl.getBoundingClientRect():null;
    var choca=!!(br && x.left<br.right && br.left<x.right && x.top<br.bottom && br.top<x.bottom);
    b.click(); await new Promise(function(z){ setTimeout(z, 300); });
    var g=document.querySelector('#adm-fichas .af-gr[data-hoy="1"]').getBoundingClientRect(), hd=document.getElementById('adm-chips').getBoundingClientRect();
    return { choca:choca, scroll:Math.round(scrollY), gTop:Math.round(g.top), hd:Math.round(hd.bottom) }; });
  chk('4c tocarlo lleva al grupo de hoy, debajo de la barra de filtros (y no se encima con Bloki)', !r.choca && r.gTop>=r.hd-2 && r.gTop<=r.hd+40, r);
  r = await boton(page);
  chk('4d en el grupo de hoy ya no dice «Hoy»: queda «↑ Arriba» (acá la lista arranca lejos del principio)', r.on && r.t==='↑ Arriba', r);
  r = await page.evaluate(async () => { document.getElementById('arriba-btn').click(); await new Promise(function(z){ setTimeout(z, 300); }); return { scroll:Math.round(scrollY), on:document.getElementById('arriba-btn').classList.contains('on') }; });
  chk('4e tocarlo otra vez lleva al principio de la página y el botón se va', r.scroll===0 && !r.on, r);

  r = await page.evaluate(async () => { var mv=document.getElementById('mis-vendedor'); showView('mis'); mv.value='Carola Chavez'; renderMis(); await new Promise(function(z){ setTimeout(z, 200); });
    window.scrollTo(0, 2*innerHeight+300); await new Promise(function(z){ setTimeout(z, 400); }); var b=document.getElementById('arriba-btn');
    var a={ alto:document.documentElement.scrollHeight, on:b.classList.contains('on'), t:b.textContent };
    b.click(); await new Promise(function(z){ setTimeout(z, 300); }); a.scroll=Math.round(scrollY); a.on2=b.classList.contains('on'); return a; });
  chk('5a en Mis pedidos: «↑ Arriba» (sin «Hoy») y lleva al principio', r.alto>3*768 && r.on && r.t==='↑ Arriba' && r.scroll===0 && !r.on2, r);
  r = await page.evaluate(async () => { window.scrollTo(0, 2*innerHeight+300); await new Promise(function(z){ setTimeout(z, 200); }); showView('conta'); await new Promise(function(z){ setTimeout(z, 200); });
    var b=document.getElementById('arriba-btn'); return { on:b.classList.contains('on') }; });
  chk('5b en Contabilidad no aparece', !r.on, r);
  await page._ctx.close();

  chk('sin errores de la página', errs.length===0, errs.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
