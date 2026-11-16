/* 🗂️ CON LA FICHA AL COSTADO, LOS FILTROS EN UN RENGLÓN (16/11/2026, mejora 370; el dueño eligió la muestra con el menú).
   Con la ficha abierta al costado, los filtros de Administración (Todos, Hoy, Mañana, Semana…) se partían en varios renglones pegados
   arriba que tapaban la lista. Ahora van en UN renglón: el elegido primero con «▾», los que avisan en rojo al lado con el número corto,
   y el resto de costado. Tocar el elegido abre «Filtrar la lista» con los MISMOS botones.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `CHIPS_COSTADO_PRUEBA`: con la ficha al costado, los filtros como siempre (varios renglones).
   2. Con la bandera, ficha al costado: un solo renglón (< 60 px); el elegido primero a la izquierda, después el que avisa en rojo
      («🔴 N», sin el texto largo, que sigue en el botón para leerlo); los botones son los mismos (mismo texto, mismos números).
   3. Tocar el elegido abre el menú «Filtrar la lista» con todos los botones, sus números y el aviso entero; el elegido marcado.
   4. Elegir otro del menú filtra (`setQuick`) y lo cierra; elegir el mismo solo lo cierra (no apaga el filtro).
   5. Esc lo cierra y vuelve al filtro; tocar afuera lo cierra; tocar el elegido otra vez lo cierra.
   6. Con el teclado: Enter en el elegido abre, las flechas recorren, Enter elige.
   7. La barra se vuelve a medir (los títulos de cada día se pegan debajo): `--af-chips` = el alto de la barra, con la ficha y sin ella.
   8. Al cerrar la ficha, los filtros como siempre (varios renglones posibles, sin «▾»).
   Datos SINTÉTICOS. Reloj clavado: jueves 22/10/2026, 09:10 de Bolivia. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_chips_costado.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

(async()=>{
  const browser = await chromium.launch();
  const errs=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:860 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
    await page.addInitScript((flag) => { window.FICHA_COSTADO_PRUEBA=1; window.AF_PEGADO_PRUEBA=1; if(flag) window.CHIPS_COSTADO_PRUEBA=1;
      try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} }, flag);
    await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(async()=>{
      window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
      var P='CH1201|TITANIO ICE|160x190', ps=[];
      for(var i=0;i<6;i++) ps.push(_ped('a'+(i+1),'2026-10-22', i<3?'AM':'PM',[_lin(P,1,{ chk:'ok' })],{ cliente:'CLIENTE '+(i+1), nroDia:i+1, ts:_ts('2026-10-20','09:0'+i+':00') }));
      /* sin revisar, en la semana: «Semana» avisa en rojo */
      ps.push(_ped('s1','2026-10-23','AM',[_lin(P,1)],{ cliente:'CLIENTE S1', ts:_ts('2026-10-20','10:00:00') }));
      ps.push(_ped('s2','2026-10-24','AM',[_lin(P,2)],{ cliente:'CLIENTE S2', ts:_ts('2026-10-20','10:10:00') }));
      await _cargar(ps, _stock(function(s){ s.c.u[_k('CH1201','TITANIO ICE','160x190')]=10; }));
      document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
      showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click();
      QUICK_FILTER='hoy'; ADM_HOY_DEF=false; renderAdmin();
      await new Promise(function(x){ setTimeout(x, 200); });
      showPedidoModal('a2');
      await new Promise(function(x){ setTimeout(x, 400); });
    });
    page._ctx=ctx; return page;
  };
  const barra = (page) => page.evaluate(() => {
    var c=document.getElementById('adm-chips'), B=[].slice.call(c.querySelectorAll('.qchip'));
    var vis=B.map(function(b){ var r=b.getBoundingClientRect(); return { k:b.getAttribute('data-k'), l:Math.round(r.left), t:Math.round(r.top), act:b.classList.contains('active'), al:b.classList.contains('qchip-alerta'),
      txt:b.textContent.replace(/\s+/g,' ').trim(), qaVis:b.querySelector('.qa') ? b.querySelector('.qa').innerText.trim() : '' }; });
    var tops={}; vis.forEach(function(v){ tops[v.t]=1; });
    var orden=vis.slice().sort(function(a,b){ return a.l-b.l; }).map(function(v){ return v.k; });
    return { alto:c.offsetHeight, renglones:Object.keys(tops).length, costado:document.body.classList.contains('ficha-costado'), cos:c.classList.contains('qc-cos'), vis:vis, orden:orden,
      after:getComputedStyle(c.querySelector('.qchip.active'),'::after').content,
      var:(document.getElementById('adm-fichas').style.getPropertyValue('--af-chips')||'') };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  let s = await barra(page);
  chk('1 ficha al costado y los filtros como siempre: varios renglones, sin «▾»', s.costado && !s.cos && s.renglones>=3 && !/▾/.test(s.after), { alto:s.alto, renglones:s.renglones });
  const textosSin = s.vis.map(v=>v.txt);
  await page._ctx.close();

  console.log('\n── 2-8. Con la bandera ──');
  page = await abrir(true);
  s = await barra(page);
  chk('2a ficha al costado: los filtros en UN renglón de menos de 60 px', s.costado && s.cos && s.renglones===1 && s.alto<60, { alto:s.alto, renglones:s.renglones });
  chk('2b el elegido («📅 Hoy») primero, con «▾»; el que avisa en rojo («Semana») justo después', s.orden[0]==='hoy' && s.orden[1]==='semana' && /▾/.test(s.after), s.orden);
  const sem = s.vis.filter(v=>v.k==='semana')[0]||{};
  chk('2c el aviso en el renglón va corto («🔴 2»); el texto entero sigue en el botón', /^🔴 \d+$/.test(sem.qaVis) && /🔴 \d+ por revisar/.test(sem.txt), sem);
  chk('2d los botones son los mismos (mismos textos y números que sin la bandera)', JSON.stringify(s.vis.map(v=>v.txt))===JSON.stringify(textosSin), s.vis.map(v=>v.txt));
  chk('7a la barra se volvió a medir: --af-chips = su alto con la ficha al costado', s.var===s.alto+'px', { var:s.var, alto:s.alto });

  let r = await page.evaluate(async () => {
    document.querySelector('#adm-chips .qchip.active').click(); await new Promise(function(x){ setTimeout(x, 80); });
    var m=document.getElementById('qc-menu'); if(!m) return { m:false };
    var B=[].slice.call(m.querySelectorAll('button[data-k]')), C=[].slice.call(document.querySelectorAll('#adm-chips .qchip'));
    var mr=m.getBoundingClientRect(), cr=document.getElementById('adm-chips').getBoundingClientRect();
    return { m:true, h4:m.querySelector('h4').textContent, n:B.length, nc:C.length,
      ks:B.map(function(b){ return b.getAttribute('data-k'); }).join(), kc:C.map(function(b){ return b.getAttribute('data-k'); }).join(),
      nums:B.map(function(b){ return b.querySelector('.n').textContent; }).join(), numsC:C.map(function(b){ return b.querySelector('.n').textContent; }).join(),
      on:(m.querySelector('button.on')||{}).getAttribute ? m.querySelector('button.on').getAttribute('data-k') : '', foco:document.activeElement && document.activeElement.getAttribute('data-k'),
      semTxt:(m.querySelector('button[data-k="semana"] small')||{}).textContent||'', debajo:mr.top>=cr.bottom-1 && mr.left>=cr.left-1, exp:document.querySelector('#adm-chips .qchip.active').getAttribute('aria-expanded') };
  });
  chk('3a tocar el elegido abre «Filtrar la lista» debajo de la barra', r.m && /Filtrar la lista/i.test(r.h4) && r.debajo && r.exp==='true', r);
  chk('3b con TODOS los botones, en el mismo orden y con los mismos números', r.n===r.nc && r.ks===r.kc && r.nums===r.numsC, r);
  chk('3c el elegido marcado y con el foco; «Semana» con su aviso entero', r.on==='hoy' && r.foco==='hoy' && /🔴 \d+ por revisar/.test(r.semTxt), r);

  r = await page.evaluate(async () => {
    document.querySelector('#qc-menu button[data-k="hoy"]').click(); await new Promise(function(x){ setTimeout(x, 80); });
    var cerrado=!document.getElementById('qc-menu'), q1=QUICK_FILTER;
    document.querySelector('#adm-chips .qchip.active').click(); await new Promise(function(x){ setTimeout(x, 60); });
    document.querySelector('#qc-menu button[data-k="manana"]').click(); await new Promise(function(x){ setTimeout(x, 150); });
    return { cerrado:cerrado, q1:q1, q2:QUICK_FILTER, cerrado2:!document.getElementById('qc-menu'), act:(document.querySelector('#adm-chips .qchip.active')||{}).getAttribute('data-k'),
      prim:[].slice.call(document.querySelectorAll('#adm-chips .qchip')).sort(function(a,b){ return a.getBoundingClientRect().left-b.getBoundingClientRect().left; })[0].getAttribute('data-k') };
  });
  chk('4a elegir el mismo («Hoy») solo cierra: el filtro sigue', r.cerrado && r.q1==='hoy', r);
  chk('4b elegir «Mañana» filtra, cierra, y queda primero en el renglón', r.q2==='manana' && r.cerrado2 && r.act==='manana' && r.prim==='manana', r);

  r = await page.evaluate(async () => {
    var a=document.querySelector('#adm-chips .qchip.active'); a.click(); await new Promise(function(x){ setTimeout(x, 60); });
    var ab=!!document.getElementById('qc-menu');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })); await new Promise(function(x){ setTimeout(x, 60); });
    var esc=!document.getElementById('qc-menu'), foco=document.activeElement===document.querySelector('#adm-chips .qchip.active'), fichaSigue=document.body.classList.contains('ficha-costado');
    document.querySelector('#adm-chips .qchip.active').click(); await new Promise(function(x){ setTimeout(x, 60); });
    var r2=document.getElementById('adm-fichas').getBoundingClientRect();
    var mr=document.getElementById('qc-menu').getBoundingClientRect(); var t=document.elementFromPoint(Math.round(mr.left+20), Math.min(innerHeight-5, Math.round(mr.bottom+30))) || document.body;
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })); await new Promise(function(x){ setTimeout(x, 60); });
    var afuera=!document.getElementById('qc-menu');
    document.querySelector('#adm-chips .qchip.active').click(); await new Promise(function(x){ setTimeout(x, 60); });
    document.querySelector('#adm-chips .qchip.active').click(); await new Promise(function(x){ setTimeout(x, 60); });
    return { ab:ab, esc:esc, foco:foco, fichaSigue:fichaSigue, afuera:afuera, otraVez:!document.getElementById('qc-menu'), q:QUICK_FILTER };
  });
  chk('5a Esc cierra el menú, el foco vuelve al filtro y la ficha sigue abierta', r.ab && r.esc && r.foco && r.fichaSigue, r);
  chk('5b tocar afuera lo cierra', r.afuera, r);
  chk('5c tocar el elegido otra vez lo cierra (sin apagar el filtro)', r.otraVez && r.q==='manana', r);

  await page.focus('#adm-chips .qchip.active');
  await page.keyboard.press('Enter'); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ m:!!document.getElementById('qc-menu'), f:document.activeElement && document.activeElement.getAttribute('data-k') }));
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(40);
  const f1 = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k'));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const r6 = await page.evaluate(() => ({ q:QUICK_FILTER, m:!!document.getElementById('qc-menu') }));
  chk('6 con el teclado: Enter abre con el foco en el elegido, la flecha mueve, Enter elige', r.m && r.f==='manana' && f1==='hoy' && r6.q==='hoy' && !r6.m, { r, f1, r6 });

  r = await page.evaluate(async () => {
    closeModal(); await new Promise(function(x){ setTimeout(x, 250); });
    var c=document.getElementById('adm-chips'), tops={}; [].forEach.call(c.querySelectorAll('.qchip'), function(b){ tops[Math.round(b.getBoundingClientRect().top)]=1; });
    return { costado:document.body.classList.contains('ficha-costado'), alto:c.offsetHeight, renglones:Object.keys(tops).length,
      after:getComputedStyle(c.querySelector('.qchip.active'),'::after').content, var:document.getElementById('adm-fichas').style.getPropertyValue('--af-chips'), menu:!!document.getElementById('qc-menu') };
  });
  chk('8 al cerrar la ficha, los filtros como siempre (sin «▾»), sin menú', !r.costado && !/▾/.test(r.after) && !r.menu, r);
  chk('7b …y la barra se volvió a medir: --af-chips = su alto sin la ficha', r.var===r.alto+'px', r);
  await page._ctx.close();

  chk('sin errores de la página', errs.length===0, errs.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
