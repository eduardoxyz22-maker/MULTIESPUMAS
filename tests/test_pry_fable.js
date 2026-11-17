/* 📈 LA PROYECCIÓN COMPLETA DE FABLE (17/11/2026; dueño: «me gusta lo que propuso fable, hacelo»).
   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `PFC_PRUEBA` (Playwright): todo como antes (sin título nuevo, sin titular ni tabla; las tiendas siguen dentro de #cx-pry).
   2. Con la bandera: arriba «Proyección · <mes>» con los días hábiles y «▶ Presentar»; las secciones en el orden de Fable
      (Resumen · Cada marca · Vendedores · … · Para mirar despacio) y cada caja de antes adentro de alguna sección.
   3. El titular: una tarjeta por el equipo y cada marca con ventas, con los MISMOS números de `pryAltura`.
   4. La tabla de vendedores: una fila por vendedor del equipo, lo vendido y la proyección de `proyeccionMes`; ordenar por conversión ordena.
   5. Las fichitas de cada vendedor: el ticket = vendido ÷ ventas.
   6. Las tiendas pasan a #pry-tiendas.
   7. Leads y conversión con los números de Kommo (`PRY_KPI`): conversión = ventas del panel ÷ leads.
   8. ▶ Presentar: una sección por pantalla, › avanza, Esc sale y la pestaña vuelve a su lugar.
   Datos INVENTADOS (los de test_pry_tiendas). Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_pry_fable.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_pry_tiendas.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async () => {'));

(async () => {
  const browser = await chromium.launch();
  const errores=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:800 }, timezoneId:'America/La_Paz', reducedMotion:'reduce' });
    await ctx.route(/^https?:/, r=>r.abort());
    await ctx.addInitScript((flag) => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} if(flag) window.PFC_PRUEBA=1; }, flag);
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(() => {
      STATE=FIX();
      showView('conta'); localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
      document.getElementById('admin-pass').value='clave-de-prueba'; tryUnlock();
      try{ closeModal(); }catch(e){}
      segSet('cta-tab','proy'); setContaTab('proy');
      document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); window.scrollTo(0,0);
    });
    await page.waitForTimeout(250);
    page._ctx=ctx; return page;
  };

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  let r = await page.evaluate(() => ({ cab:!!document.getElementById('pfc-cab'), tit:document.getElementById('pry-titular').innerHTML.trim(), vt:document.getElementById('pry-vtabla').innerHTML.trim(),
    tCx:document.querySelectorAll('#cx-pry .cx-kf-t').length, tNuevo:document.getElementById('pry-tiendas').innerHTML.trim(), vk:document.querySelectorAll('.pfc-vk').length }));
  chk('1 sin la bandera: ni título nuevo, ni titular, ni tabla, ni fichitas; las tiendas siguen en #cx-pry', !r.cab && !r.tit && !r.vt && !r.vk && r.tCx>0 && !r.tNuevo, r);
  await page._ctx.close();

  console.log('\n── 2-7. Con la bandera ──');
  page = await abrir(true);
  r = await page.evaluate(() => {
    var pane=document.getElementById('cta-pane-proy'), cab=document.getElementById('pfc-cab');
    var secs=[].map.call(pane.querySelectorAll(':scope > .pix-s'), function(s){ return s.getAttribute('data-k'); });
    var orden=PFC_SECS.map(function(s){ return s.k; }).filter(function(k){ return secs.indexOf(k)>=0; });
    var cajas=['pry-titular','pry-nota','pry-metrics','pry-leads','pry-mov','pry-metas','cx-pry','pry-altura','pry-vtabla','pry-vendedores','pry-com','pry-bf','pry-tiendas','pry-plata','pry-carrera','pry-calor','pry-pub','pry-lineas','pry-prueba','pry-hist','pry-patron','pry-como'];
    var sueltas=cajas.filter(function(id){ var e=document.getElementById(id); return e && !e.closest('.pix-s'); });
    return { cab:cab ? cab.textContent.replace(/\s+/g,' ') : '', secs:secs, orden:orden, sueltas:sueltas, primero:pane.firstElementChild===cab };
  });
  chk('2a arriba «Proyección · noviembre de 2026», los días hábiles y «▶ Presentar»', /Proyección · noviembre de 2026/.test(r.cab) && /van \d+ días hábiles/.test(r.cab) && /▶ Presentar/.test(r.cab) && r.primero, r.cab);
  chk('2b las secciones en el orden de Fable', r.secs.join('|')===r.orden.join('|') && r.secs[0]==='resumen' && r.secs[1]==='marcas' && r.secs[2]==='vend', r.secs);
  chk('2c ninguna caja de antes quedó afuera de una sección', !r.sueltas.length, r.sueltas);

  r = await page.evaluate(() => {
    var R=proyeccionMes('2026-11'), A=pryAltura(R);
    var cards=[].map.call(document.querySelectorAll('#pry-titular .pfc-tc'), function(c){ return c.querySelector('.pfc-tx').textContent; });
    var esperado=[fmtBs0(A.act.equipo.bs)+' contra '+fmtBs0(A.ant.equipo.bs)].concat(R.marcas.filter(function(m){ return A.act[m.g.k].n || A.ant[m.g.k].n; }).map(function(m){ return fmtBs0(A.act[m.g.k].bs)+' contra '+fmtBs0(A.ant[m.g.k].bs); }));
    return { cards:cards, esperado:esperado, frase:(document.querySelector('#pry-titular .pfc-frase')||{}).textContent||'' };
  });
  chk('3 el titular: tarjeta del equipo y de cada marca con los números de «A esta altura»', r.cards.length===r.esperado.length && r.cards.every(function(c,i){ return c.indexOf(r.esperado[i])===0; }) && r.frase.length>10, r);

  r = await page.evaluate(() => {
    var R=proyeccionMes('2026-11'), n=0, top=null; R.marcas.forEach(function(m){ m.filas.forEach(function(x){ n++; if(!top || x.vendido>top.vendido) top=x; }); }); n+=R.sinMarca.filas.length;
    var filas=document.querySelectorAll('#pry-vtabla tbody tr:not(.pfc-tot)'), f1=filas[0];
    return { n:n, filas:filas.length, primero:f1 ? f1.querySelector('.nm').textContent.trim() : '', top:top && top.vendedor,
      vend:f1 ? f1.children[2].textContent : '', topBs:top ? fmtBs0(top.vendido) : '', proy:f1 ? f1.children[3].textContent : '', topP:top ? fmtBs0(top.proy) : '' };
  });
  chk('4a una fila por vendedor del equipo; la primera (por plata) es la que más vendió, con su vendido y su proyección', r.filas===r.n && r.primero===r.top && r.vend===r.topBs && r.proy===r.topP, r);

  /* 7 · leads de Kommo de mentira para cada vendedor: 100, 200, 300… */
  r = await page.evaluate(() => {
    var R=proyeccionMes('2026-11'), team={}, i=0, esp={};
    R.marcas.forEach(function(m){ m.filas.forEach(function(x){ i++; team[pryKpiClave(x.vendedor)]={ name:x.vendedor, leads:i*100, cierres:1 }; esp[x.vendedor]=(x.n/(i*100)*100); }); });
    PRY_KPI['2026-11']={ lee:false, t:Date.now(), team:team }; PRY_KPI['2026-10']={ lee:false, t:Date.now(), team:{} };
    pfcKpi('2026-11');
    var lc=document.querySelectorAll('#pry-leads .pfc-lc').length, L=0; Object.keys(team).forEach(function(k){ L+=team[k].leads; });
    var eq=document.querySelector('#pry-leads .pfc-lc .pfc-cv b'), conv=R.equipo.n/L*100;
    pfcOrden('conv');
    var cvs=[].map.call(document.querySelectorAll('#pry-vtabla tbody tr:not(.pfc-tot)'), function(tr){ var b=tr.lastElementChild.querySelector('b'); return b ? parseFloat(b.textContent.replace(',','.')) : -1; });
    var ordenado=cvs.every(function(v,j){ return !j || cvs[j-1]>=v; });
    pfcOrden('plata');
    return { lc:lc, eq:eq ? eq.textContent : '', conv:pfcPc1(conv), ordenado:ordenado, cvs:cvs };
  });
  chk('7a leads y conversión: el equipo y cada marca; conversión del equipo = ventas del panel ÷ leads', r.lc>=2 && r.eq===r.conv, r);
  chk('4b ordenar «Por conversión» ordena la tabla de mayor a menor', r.ordenado, r.cvs);

  r = await page.evaluate(() => {
    var R=proyeccionMes('2026-11'), x=R.marcas.filter(function(m){ return m.filas.length; })[0].filas[0];
    var vk='tienda|'+normNombre(x.vendedor), el=document.querySelector('.pfc-vk[data-vk="'+vk+'"]');
    var tk=el ? el.querySelector('.pfc-tiles > div b').textContent : '';
    return { tk:tk, esp:fmtBs0(x.vendido/x.n), n:document.querySelectorAll('.pfc-vk .pfc-tiles').length,
      tN:document.querySelectorAll('#pry-tiendas .cx-kf-t').length, tCx:document.querySelectorAll('#cx-pry .cx-kf-t').length };
  });
  chk('5 las fichitas de cada vendedor: el ticket = vendido ÷ ventas', r.n>0 && r.tk===r.esp, r);
  chk('6 las tiendas van en su sección (#pry-tiendas) y no debajo de las marcas', r.tN>0 && r.tCx===0, r);

  console.log('\n── 8. ▶ Presentar ──');
  r = await page.evaluate(() => {
    var pane=document.getElementById('cta-pane-proy'), padre=pane.parentNode;
    pfcPresAbrir();
    var vis=function(){ return [].filter.call(pane.querySelectorAll(':scope > .pix-s'), function(s){ return s.getClientRects().length; }).map(function(s){ return s.getAttribute('data-k'); }); };
    var a=vis(), n1=document.querySelector('#pfc-presbar .pfc-pn').textContent, fijo=getComputedStyle(pane).position, enBody=pane.parentNode===document.body;
    document.querySelectorAll('#pfc-presbar .pfc-pv')[1].click();
    var b=vis(), n2=document.querySelector('#pfc-presbar .pfc-pn').textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    return { a:a, b:b, n1:n1, n2:n2, fijo:fijo, enBody:enBody, sale:!document.body.classList.contains('pfc-pres'), vuelve:pane.parentNode===padre, todas:vis().length };
  });
  chk('8a abrir: la pestaña a pantalla entera y una sola sección a la vista (la primera)', r.fijo==='fixed' && r.enBody && r.a.length===1 && r.a[0]==='resumen' && /^1 \/ \d+$/.test(r.n1), r);
  chk('8b › pasa a la siguiente', r.b.length===1 && r.b[0]==='marcas' && /^2 \//.test(r.n2), r);
  chk('8c Esc sale y la pestaña vuelve a su lugar con todas sus secciones', r.sale && r.vuelve && r.todas>3, r);

  chk('9 sin errores en la página', !errores.length, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
