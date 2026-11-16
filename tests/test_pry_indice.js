/* 🧭 PROYECCIÓN CON UN ÍNDICE ARRIBA Y SECCIONES PLEGABLES (16/11/2026, mejora 369; el dueño la eligió).
   Una barra pegada arriba con «📊 Resumen · 🎯 Metas · … · 🔬 Para mirar despacio» y «🧰 Herramientas ▾» (los MISMOS botones de la fila de
   arriba); cada caja en una sección con su renglón de título y su número clave; se pliegan y cada compu lo recuerda.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `PRY_INDICE_PRUEBA` (Playwright): todo como antes (ni barra, ni secciones; los botones en su fila).
   2. Con la bandera: la barra va después de la fila del mes, con los chips (y sin los de cajas vacías); «🧰 Herramientas» tiene los MISMOS
      botones de la fila de arriba (con su `onclick`), y en la fila quedan el mes y «Actualizar».
   3. Cada caja (las mismas, con sus ids y su contenido) adentro de su sección, en el mismo orden de antes.
   4. El renglón de cada sección dice el número clave que la caja ya calculó (vendido y proyección del equipo, lo de cada vendedor…).
   5. La prueba, lo que dijo cada día, cómo se viene vendiendo y cómo se cuenta arrancan plegadas (bajo «🔬 Para mirar despacio»); lo demás abierto.
   6. Plegar y abrir queda recordado en la compu (y al volver a dibujar sigue igual).
   7. Tocar un chip lleva a la sección (debajo del encabezado y de la barra), la abre si estaba plegada y la marca.
   8. La barra queda pegada arriba al bajar (debajo del encabezado) y marca la sección que se está viendo.
   9. «🧰 Herramientas ▾» abre y cierra (también tocando afuera y con Esc); un botón de adentro hace lo de siempre.
   10. Volver a dibujar (otro mes, actualizar) no arma nada dos veces.
   11. En el iPad parado (820 px): la barra entra en un renglón y la página no se corre de costado.
   Datos INVENTADOS (los de test_pry_tiendas). Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_pry_indice.js */
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
  const abrir = async (flag, w, h) => {
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:h||768 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:/, r=>r.abort());
    await ctx.addInitScript((flag) => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} if(flag) window.PRY_INDICE_PRUEBA=1; }, flag);
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
  const CAJAS=['pry-nota','pry-metrics','pry-mov','pry-metas','pry-com','pry-bf','cx-pry','pry-altura','pry-plata','pry-vendedores','pry-carrera','pry-calor','pry-pub','pry-prueba','pry-hist','pry-patron','pry-como'];

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  const antes = await page.evaluate((C) => {
    var pane=document.getElementById('cta-pane-proy'), ids=C.filter(function(id){ return document.getElementById(id); });
    var ord=[].map.call(pane.querySelectorAll(ids.map(function(i){ return '#'+i; }).join(',')), function(e){ return e.id; });
    return { bar:!!document.getElementById('pry-ix'), secs:pane.querySelectorAll('.pix-s').length, metas:!!document.querySelector('#cta-pane-proy > .filters #pry-metas-btn'),
      ord:ord, padre:ids.every(function(id){ return document.getElementById(id).parentElement===pane; }),
      vend:document.getElementById('pry-vendedores').innerText.replace(/\s+/g,' ').slice(0,120) };
  }, CAJAS);
  chk('1 sin la bandera: ni barra ni secciones, los botones en su fila y las cajas sueltas como siempre', !antes.bar && antes.secs===0 && antes.metas && antes.padre, antes);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  let r = await page.evaluate((C) => {
    var pane=document.getElementById('cta-pane-proy'), bar=document.getElementById('pry-ix'), fil=pane.querySelector(':scope > .filters');
    var chips=[].filter.call(bar.querySelectorAll('.pix-c'), function(c){ return !c.hidden; }).map(function(c){ return c.textContent.trim(); });
    var her=[].map.call(bar.querySelectorAll('.pix-her-m button'), function(b){ return b.id; });
    var ids=C.filter(function(id){ return document.getElementById(id); });
    var ord=[].map.call(pane.querySelectorAll(ids.map(function(i){ return '#'+i; }).join(',')), function(e){ return e.id; });
    var enSec=ids.every(function(id){ var s=document.getElementById(id).closest('.pix-s'); return !!s; });
    return { barDespuesDeFila:fil.nextElementSibling===bar, chips:chips, her:her, filaQueda:[].map.call(fil.querySelectorAll(':scope > .field'), function(f){ return f.textContent.replace(/\s+/g,' ').trim().slice(0,30); }),
      metasOnclick:(document.getElementById('pry-metas-btn')||{}).getAttribute ? document.getElementById('pry-metas-btn').getAttribute('onclick') : '', ord:ord, enSec:enSec,
      bfOculto:document.getElementById('pix-s-bf').hidden, comOculto:document.getElementById('pix-s-com').hidden };
  }, CAJAS);
  chk('2a la barra va después de la fila del mes', r.barDespuesDeFila, r);
  chk('2b chips: Resumen, Metas, Tiendas, A esta altura, Vendedores, Calendario, Para mirar despacio (Black Friday y Comisiones no: sus cajas están vacías)',
      r.chips.join('|')==='📊 Resumen|🎯 Metas|🏬 Tiendas|📈 A esta altura|👤 Vendedores|🟩 Calendario|🔬 Para mirar despacio' && r.bfOculto && r.comOculto, r.chips);
  chk('2c «🧰 Herramientas» tiene los MISMOS botones de la fila (Metas, Cierre comercial, Informe, Dónde se vende, Cotizaciones, El mall, El mall en vivo) con su onclick',
      ['pry-metas-btn','pry-cierre-btn','pry-informe-btn','pry-donde-btn','pry-cot-btn','pry-mall-btn','pry-envivo-btn'].every(function(id){ return r.her.indexOf(id)>=0; }) && r.metasOnclick==='metasAbrir()', r.her);
  chk('2d en la fila quedan el mes y «Actualizar»', r.filaQueda.length===2 && /^Mes/.test(r.filaQueda[0]) && /Actualizar/.test(r.filaQueda[1]), r.filaQueda);
  chk('3 las cajas de siempre, cada una adentro de su sección y en el MISMO orden que antes', r.enSec && JSON.stringify(r.ord)===JSON.stringify(antes.ord), { antes:antes.ord, ahora:r.ord });

  r = await page.evaluate(() => {
    var R=proyeccionMes('2026-11'), k=function(id){ var e=document.querySelector('#pix-s-'+id+' .pix-k'); return e ? e.textContent : null; };
    var vend=document.getElementById('pry-vendedores').innerText.replace(/\s+/g,' ').slice(0,120);
    return { res:k('resumen'), vend:k('vend'), alt:k('altura'), tienda:k('tiendas'), E:{ v:fmtBs0(R.equipo.vendido), p:fmtBs0(R.equipo.proy) }, vendTxt:vend };
  });
  chk('4a Resumen: «— vendido Bs … · 📈 Bs …» del equipo (los números de la ficha)', r.res==='— vendido '+r.E.v+' · 📈 '+r.E.p, r);
  chk('4b Por vendedor: cuántos y quién va adelante', /^— \d+ vendedores · adelante .+ \(Bs [\d.]+\)$/.test(r.vend), r.vend);
  chk('4c Cada marca y cada tienda: la proyección de cada marca y cuántas tiendas', /📈 Bs/.test(r.tienda) && /\d+ tiendas?$/.test(r.tienda), r.tienda);
  chk('4d la caja «Por vendedor» dice lo de siempre', r.vendTxt===antes.vend, { antes:antes.vend, ahora:r.vendTxt });

  r = await page.evaluate(() => {
    var e=function(k){ var s=document.getElementById('pix-s-'+k); return s ? { cerr:s.classList.contains('pix-cerr'), vis:document.getElementById(s.querySelector('.pix-b').firstElementChild.id).checkVisibility(), exp:s.querySelector('.pix-h').getAttribute('aria-expanded') } : null; };
    var g=document.getElementById('pix-s-despacio');
    return { prueba:e('prueba'), hist:e('hist'), patron:e('patron'), como:e('como'), vend:e('vend'), metas:e('metas'), grupo:g && !g.hidden && g.textContent,
      grupoAntes:g && !!(g.compareDocumentPosition(document.getElementById('pix-s-prueba')) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  chk('5a la prueba, lo que dijo cada día, cómo se viene vendiendo y cómo se cuenta: plegadas', ['prueba','hist','patron','como'].every(function(k){ return r[k] && r[k].cerr && !r[k].vis && r[k].exp==='false'; }), r);
  chk('5b …bajo «🔬 Para mirar despacio»; Metas y Por vendedor abiertas', /Para mirar despacio/.test(r.grupo) && r.grupoAntes && !r.vend.cerr && r.vend.vis && !r.metas.cerr, r);

  console.log('\n── 6. Se recuerda ──');
  r = await page.evaluate(async () => {
    document.querySelector('#pix-s-vend .pix-h').click(); document.querySelector('#pix-s-prueba .pix-h').click();
    await new Promise(function(x){ setTimeout(x, 50); });
    var p1=visPref('pry_vend', true), p2=visPref('pry_prueba', false);
    renderProyeccion();
    return { p1:p1, p2:p2, vend:document.getElementById('pix-s-vend').classList.contains('pix-cerr'), prueba:document.getElementById('pix-s-prueba').classList.contains('pix-cerr'),
      txtVend:document.querySelector('#pix-s-vend .pix-v') && getComputedStyle(document.querySelector('#pix-s-vend .pix-v'),'::after').content };
  });
  chk('6 plegar «Por vendedor» y abrir «La prueba» queda anotado y sigue así al volver a dibujar', r.p1===false && r.p2===true && r.vend===true && r.prueba===false && /Ver/.test(r.txtVend), r);

  console.log('\n── 7-8. Ir a una sección y la barra pegada ──');
  r = await page.evaluate(async () => {
    window.scrollTo(0,0);
    document.querySelector('#pry-ix .pix-c[data-k="vend"]').click();
    await new Promise(function(x){ setTimeout(x, 1500); });
    var s=document.getElementById('pix-s-vend'), bar=document.getElementById('pry-ix'), hd=document.querySelector('.header');
    var st=s.getBoundingClientRect(), br=bar.getBoundingClientRect();
    return { abierta:!s.classList.contains('pix-cerr'), pref:visPref('pry_vend', false), top:Math.round(st.top), barBottom:Math.round(br.bottom), barTop:Math.round(br.top), hdr:Math.round(hd.getBoundingClientRect().bottom),
      on:(document.querySelector('#pry-ix .pix-c.on')||{}).getAttribute ? document.querySelector('#pry-ix .pix-c.on').getAttribute('data-k') : '', sy:Math.round(scrollY) };
  });
  chk('7 tocar «Vendedores» la abre (estaba plegada), la lleva justo debajo de la barra y la marca', r.abierta && r.pref===true && r.top>=r.barBottom && r.top<=r.barBottom+30 && r.on==='vend' && r.sy>200, r);
  chk('8a la barra quedó pegada debajo del encabezado', r.barTop>=r.hdr-2 && r.barTop<=r.hdr+2, r);
  r = await page.evaluate(async () => {
    var s=document.getElementById('pix-s-altura'), dest=s.getBoundingClientRect().top+scrollY;
    var bb=document.getElementById('pry-ix').getBoundingClientRect().bottom; window.scrollTo(0, dest-bb+5); await new Promise(function(x){ setTimeout(x, 300); });
    return (document.querySelector('#pry-ix .pix-c.on')||{}).getAttribute ? document.querySelector('#pry-ix .pix-c.on').getAttribute('data-k') : '';
  });
  chk('8b al bajar a mano, marca la sección que se está viendo («A esta altura»)', r==='altura', r);

  console.log('\n── 9. 🧰 Herramientas ──');
  r = await page.evaluate(async () => {
    var b=document.querySelector('#pry-ix .pix-her-b'), m=document.getElementById('pix-her-m');
    b.click(); await new Promise(function(x){ setTimeout(x, 40); });
    var abre=!m.hidden && b.getAttribute('aria-expanded')==='true';
    document.querySelector('.header').dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })); await new Promise(function(x){ setTimeout(x, 40); });
    var afuera=m.hidden;
    b.click(); await new Promise(function(x){ setTimeout(x, 40); });
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })); await new Promise(function(x){ setTimeout(x, 40); });
    var esc=m.hidden;
    var llamado=0, orig=window.metasAbrir; window.metasAbrir=function(){ llamado++; };
    b.click(); await new Promise(function(x){ setTimeout(x, 40); });
    document.getElementById('pry-metas-btn').click(); await new Promise(function(x){ setTimeout(x, 60); });
    window.metasAbrir=orig;
    return { abre:abre, afuera:afuera, esc:esc, llamado:llamado, cerradoTras:m.hidden };
  });
  chk('9a abre, se cierra tocando afuera y con Esc', r.abre && r.afuera && r.esc, r);
  chk('9b «🎯 Metas» de adentro hace lo de siempre (metasAbrir) y el menú se cierra', r.llamado===1 && r.cerradoTras, r);

  console.log('\n── 10. Volver a dibujar ──');
  r = await page.evaluate(() => {
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    return { bars:document.querySelectorAll('#pry-ix').length, secs:document.querySelectorAll('#cta-pane-proy .pix-s').length, grupos:document.querySelectorAll('#pix-s-despacio').length,
      cajas:document.querySelectorAll('#pry-vendedores').length, her:document.querySelectorAll('#pry-metas-btn').length };
  });
  chk('10 otro mes y vuelta: una barra, una sección por caja, nada repetido', r.bars===1 && r.secs===15 && r.grupos===1 && r.cajas===1 && r.her===1, r);
  await page._ctx.close();

  console.log('\n── 11. El iPad parado ──');
  page = await abrir(true, 820, 1180);
  r = await page.evaluate(() => {
    var bar=document.getElementById('pry-ix'), br=bar.getBoundingClientRect(), her=bar.querySelector('.pix-her-b').getBoundingClientRect();
    var tops={}; [].forEach.call(bar.querySelectorAll('.pix-c'), function(c){ if(!c.hidden) tops[Math.round(c.getBoundingClientRect().top)]=1; });
    return { renglones:Object.keys(tops).length, alto:Math.round(br.height), herVisible:her.right<=br.right+1 && her.left>=br.left, corre:document.documentElement.scrollWidth>innerWidth };
  });
  chk('11 en 820 px: la barra en un renglón, «Herramientas» a la vista y la página no se corre de costado', r.renglones===1 && r.alto<60 && r.herVisible && !r.corre, r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
