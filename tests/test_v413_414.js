/* 🎨 (16/11/2026, mejoras 413 y 414; el dueño las eligió)
   413 · cuántos, primero y grande; la medida una sola vez: «COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX 140×190 × 1» pasa a [1] «COLCHON ECO
         FLEX 2 PLAZAS FLEX» [140×190] (ámbar si es más de 1), en «Lo del día, por lugar», las fichas de Administración y la Lista de carga.
   414 · la Hoja de ruta: un producto por renglón (☐, la cantidad, el nombre, la medida, el código y de dónde se carga), el WhatsApp igual.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. `prodNombreCorto` saca SOLO la medida igual a la del renglón («140X190CM», «140 X 190», «DE 140X190»); otra medida, la deja; el nombre
      guardado no cambia.
   2. Sin `CANT_PRIMERO_PRUEBA` ni `RUTA_LISTA_PRUEBA` (Playwright): todo como siempre.
   3. 413 con la bandera: el cuadrito con la cantidad (ámbar si > 1), el nombre corto y la medida en su etiqueta; «📥 de Moreno».
   4. 414 con la bandera: un renglón por producto, con su lugar (🏭 PTF / 🏪 Banzer / 📥 Moreno; lo sin marcar, sin pastilla); el texto del
      WhatsApp de la ruta no cambia.
   Datos SINTÉTICOS. Reloj clavado el jueves 22/10/2026 09:10. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v413_414.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');

  console.log('\n── 1. prodNombreCorto ──');
  let r=await page.evaluate(()=>[
    prodNombreCorto({ desc:'COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX', medida:'140x190' }),
    prodNombreCorto({ desc:'TITANIO ICE 180 X200', medida:'180X200' }),
    prodNombreCorto({ desc:'COLCHON ORTOPEDICO DE 140X190 DE 22 CM DE ALTURA', medida:'140x190' }),
    prodNombreCorto({ desc:'COLCHON BAHIA 105X190', medida:'140x190' }),
    prodNombreCorto({ desc:'ALMOHADA', medida:'50x70' }),
    prodNombreCorto({ desc:'COLCHON SOFT', medida:'' }) ]);
  chk('1a saca la medida igual a la del renglón (con «CM», con espacios, con «DE»)', r[0]==='COLCHON ECO FLEX 2 PLAZAS FLEX' && r[1]==='TITANIO ICE' && r[2]==='COLCHON ORTOPEDICO DE 22 CM DE ALTURA', r);
  chk('1b otra medida, o sin medida en el nombre, lo deja como está', r[3]==='COLCHON BAHIA 105X190' && r[4]==='ALMOHADA' && r[5]==='COLCHON SOFT', r);

  await page.evaluate(async()=>{
    window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
    var ps=[
      _ped('a1','2026-10-22','AM',[_lin('|COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX|140x190',1,{ chk:'ok' }), _lin('CD1403|ALMOHADA|50x70',2,{ chk:'ok', chkDe:_BZ })],{ cliente:'CLIENTE UNO', vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-10-20','09:00:00') }),
      _ped('a2','2026-10-22','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'im' }), _lin('|SOMIER SIN MARCAR|140x190',1,{})],{ cliente:'CLIENTE DOS', vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-10-20','10:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; s.g[_BZ].u[_k('CD1403','ALMOHADA','50x70')]=4; s.g[_IM].u[_K]=3; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin(); ADM_LUG_DIA='hoy';
  });
  const lug=()=>page.evaluate(()=>{ var d=document.createElement('div'); d.innerHTML=admLugaresHtml();
    return [].map.call(d.querySelectorAll('li'), function(li){ return { cls:li.className, q:(li.querySelector('.cq')||{}).className||'', txt:li.textContent.replace(/\s+/g,' ').trim(), m:(li.querySelector('.cq-m')||{}).textContent||'' }; }); });
  const ficha=()=>page.evaluate(()=>{ var f=[].slice.call(document.querySelectorAll('#adm-fichas .af-f')).filter(function(x){ return /CLIENTE UNO/.test(x.textContent); })[0];
    return [].map.call(f.querySelectorAll('.af-pl'), function(pl){ return { c:pl.querySelector('.af-c').className+':'+pl.querySelector('.af-c').textContent, nm:pl.querySelector('.af-nm').textContent.replace(/\s+/g,' ').trim() }; }); });
  const carga=()=>page.evaluate(()=>{ var d=document.createElement('div'); d.innerHTML=cargaBloquesHtml(STATE.filter(function(p){ return p.fecha==='2026-10-22'; }), '2026-10-22');
    return { cq:[].map.call(d.querySelectorAll('.cq'), function(b){ return b.className+':'+b.textContent; }), txt:[].map.call(d.querySelectorAll('[data-carga-lugar]'), function(x){ return x.textContent; }).join(' ').replace(/\s+/g,' ') }; });   // lo que se carga (las paradas de abajo siguen con su texto)

  console.log('\n── 2. Sin las banderas ──');
  r=await lug();
  chk('2a «Lo del día, por lugar» como siempre: «… 140X190CM FLEX 140x190 × 1»', r.some(x=>/140X190CM FLEX 140x190 × 1/.test(x.txt)) && !r.some(x=>/lg2/.test(x.cls)), r.map(x=>x.txt));
  let f=await ficha();
  chk('2b la ficha con el nombre de siempre', f[0].nm.indexOf('140X190CM')>=0 && !/mas/.test(f[1].c), f);
  let c=await carga();
  chk('2c la Lista de carga con «1×» / «2×» como siempre', /1× .*140X190CM FLEX 140x190/.test(c.txt) && !c.cq.length, c.txt.slice(0,300));

  console.log('\n── 3. 413 con la bandera ──');
  await page.evaluate(()=>{ window.CANT_PRIMERO_PRUEBA=1; renderAdmin(); });
  r=await lug();
  const eco=r.filter(x=>/ECO FLEX/.test(x.txt))[0], alm=r.filter(x=>/ALMOHADA/.test(x.txt))[0], tit=r.filter(x=>/TITANIO/.test(x.txt))[0];
  chk('3a el cuadrito con la cantidad, el nombre sin la medida repetida y la medida en su etiqueta', eco && /lg2/.test(eco.cls) && /^1COLCHON ECO FLEX 2 PLAZAS FLEX 140×190/.test(eco.txt) && eco.m==='140×190' && !/140X190CM/.test(eco.txt), eco);
  chk('3b más de 1: el cuadrito en ámbar', alm && /cq mas/.test(alm.q) && /^2ALMOHADA/.test(alm.txt), alm);
  chk('3c lo de Moreno con «📥 de Moreno»', tit && /📥 de Moreno/.test(tit.txt), tit);
  f=await ficha();
  chk('3d la ficha: el nombre corto y la cantidad 2 en ámbar', f[0].nm==='COLCHON ECO FLEX 2 PLAZAS FLEX 140×190' && /af-c mas:2/.test(f[1].c), f);
  c=await carga();
  chk('3e la Lista de carga: los cuadritos (1, 2 en ámbar) y la medida una vez', c.cq.indexOf('cq:1')>=0 && c.cq.indexOf('cq mas:2')>=0 && !/140X190CM/.test(c.txt) && /COLCHON ECO FLEX 2 PLAZAS FLEX 140×190/.test(c.txt), c.cq);
  const guard=await page.evaluate(()=>findById('a1').productos[0].desc);
  chk('3f el nombre guardado NO cambia', guard==='COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX', guard);

  console.log('\n── 4. 414 la Hoja de ruta ──');
  const ruta=()=>page.evaluate(()=>{ RUTA_DIA='hoy'; renderRuta(); var st=document.querySelectorAll('#ruta-body .rt-stop'); var o=[];
    [].forEach.call(st, function(s){ o.push({ ul:!!s.querySelector('ul.rtl'), li:[].map.call(s.querySelectorAll('ul.rtl li'), function(li){ return { q:(li.querySelector('.cq')||{}).textContent, n:(li.querySelector('.rtl-n')||{}).textContent, lg:li.querySelector('.rtl-lg') ? li.querySelector('.rtl-lg').className+':'+li.querySelector('.rtl-lg').textContent : '' }; }),
      tira:/🛏️/.test(s.textContent), ck:s.querySelectorAll('.rtl-ck').length }); });
    window.__wa=''; var cp=copyText, wo=window.open; copyText=function(t){ window.__wa=t; }; window.open=function(){ return null; }; try{ rutaWhatsapp(0); } finally { copyText=cp; window.open=wo; }
    return { st:o, wa:window.__wa }; });
  r=await ruta();
  chk('4a sin la bandera: la tira de siempre con «|»', r.st.length===2 && r.st.every(s=>s.tira && !s.ul), r.st);
  const waAntes=r.wa;
  await page.evaluate(()=>{ window.RUTA_LISTA_PRUEBA=1; });
  r=await ruta();
  const u=r.st.filter(s=>s.li.some(l=>/ECO FLEX/.test(l.n)))[0], d=r.st.filter(s=>s.li.some(l=>/TITANIO/.test(l.n)))[0];
  chk('4b un renglón por producto, con el cuadrito para tildar y sin la tira', u && u.ul && !u.tira && u.li.length===2 && u.ck===2, u);
  chk('4c la cantidad, el nombre corto con la medida y el código', u.li[0].q==='1' && /^COLCHON ECO FLEX 2 PLAZAS FLEX140×190$/.test(u.li[0].n) && u.li[1].q==='2' && /CD1403/.test(u.li[1].n), u.li);
  chk('4d de dónde se carga: 🏭 PTF, 🏪 Banzer, 📥 Moreno; lo sin marcar, sin pastilla', /ptf:🏭 PTF/.test(u.li[0].lg) && /bz:🏪 Banzer/.test(u.li[1].lg) && /mo:📥 Moreno/.test(d.li[0].lg) && d.li[1].lg==='', [u.li, d.li]);
  chk('4e el WhatsApp de la ruta no cambia', r.wa===waAntes && /\|/.test(r.wa), r.wa.slice(0,200));

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
