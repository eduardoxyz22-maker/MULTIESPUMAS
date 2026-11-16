/* 🎨 (16/11/2026, mejora 407; el dueño la eligió) Lo que ya está listo, en una ficha chica (Administración → fichas): N° del día, cliente,
   «✅ Listo» y una línea «📦 N bultos · 📍 zona · 🚛 camión». Tocarla abre la ficha grande. Lo que tiene algo pendiente queda entero.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `ADM_CHICAS_PRUEBA` (Playwright): todas las fichas enteras, sin el «🗜️» del título.
   2. Con la bandera: la ficha lista (verificada y en verde) es chica: sin productos ni botones, con la línea de bultos (sin lo de tienda),
      zona y camión; la que le falta algo (roja) y la ATC quedan enteras.
   3. Tocar la chica abre la ficha grande.
   4. «Ver enteras» (en el título del turno) las agranda y queda en la compu; «Achicar los listos» las vuelve a achicar.
   Datos SINTÉTICOS. Reloj clavado el jueves 22/10/2026 09:10. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v407_listos_chicos.js */
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
  await page.evaluate(async()=>{
    window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true; try{ localStorage.removeItem('me_adm_chicas'); }catch(e){}
    var T='CH1201|TITANIO ICE|160x190';
    var ps=[
      _ped('a1','2026-10-22','AM',[_lin(T,2,{ chk:'ok' }), _lin('|PROTECTOR DE COLCHON|160x190',1,{ chk:'ok' })],{ cliente:'CLIENTE LISTO', zona:'Norte', vehiculo:'Carry', chofer:'Omar', verificado:true, ts:_ts('2026-10-20','09:00:00') }),
      _ped('a2','2026-10-22','AM',[_lin(T,1,{ chk:'no' })],{ cliente:'CLIENTE FALTA', verificado:true, ts:_ts('2026-10-20','10:00:00') }),
      _ped('a3','2026-10-22','AM',[_lin(T,1,{ chk:'ok' })],{ cliente:'CLIENTE ATC', oc:'ATC 10-001', verificado:true, ts:_ts('2026-10-20','11:00:00') }),
      _ped('a4','2026-10-22','AM',[_lin(T,1,{ chk:'ok' })],{ cliente:'CLIENTE SIN VERIFICAR', ts:_ts('2026-10-20','12:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
  });
  const leer=()=>page.evaluate(()=>{
    var F=[].slice.call(document.querySelectorAll('#adm-fichas .af-f')), T=function(e){ return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; }, o={};
    F.forEach(function(f){ var n=T(f.querySelector('.af-who b')); o[n]={ chica:f.classList.contains('af-chica'), linea:T(f.querySelector('.ach-l')), ps:!!f.querySelector('.af-ps'), tb:!!f.querySelector('.af-tb'), e:T(f.querySelector('.af-e')) }; });
    o._g=[].map.call(document.querySelectorAll('#adm-fichas .ach-g'), T); return o; });

  console.log('\n── 1. Sin la bandera ──');
  let r=await leer();
  chk('1a todas enteras y sin «🗜️» en el título', !Object.keys(r).filter(k=>k!=='_g').some(k=>r[k].chica) && !r._g.length && r['CLIENTE LISTO'].ps, r);

  console.log('\n── 2. Con la bandera ──');
  await page.evaluate(()=>{ window.ADM_CHICAS_PRUEBA=1; renderAdmin(); });
  r=await leer();
  const L=r['CLIENTE LISTO'];
  chk('2a la lista es chica: «✅ Listo», sin productos ni botones', L.chica && /Listo/.test(L.e) && !L.ps && !L.tb, L);
  chk('2b su línea: «📦 2 bultos» (sin el protector de tienda) · «📍 Norte» · «Carry · Omar»', /📦 2 bultos/.test(L.linea) && /📍 Norte/.test(L.linea) && /Carry · Omar/.test(L.linea), L.linea);
  chk('2c la que le falta algo, la ATC y la sin verificar quedan enteras', !r['CLIENTE FALTA'].chica && r['CLIENTE FALTA'].ps && !r['CLIENTE ATC'].chica && !r['CLIENTE SIN VERIFICAR'].chica, r);
  chk('2d el título del turno dice «🗜️ los listos, en chico · Ver enteras»', r._g.length===1 && /los listos, en chico · Ver enteras/.test(r._g[0]), r._g);

  console.log('\n── 3. Tocarla abre la ficha grande ──');
  let t=await page.evaluate(async()=>{ var f=[].slice.call(document.querySelectorAll('#adm-fichas .af-chica'))[0]; f.click(); await new Promise(r=>setTimeout(r,80));
    var on=document.getElementById('modal').classList.contains('on'), txt=document.getElementById('modal-box').textContent; closeModal(); return { on:on, cli:/CLIENTE LISTO/.test(txt) }; });
  chk('3a se abre la ficha grande de ese pedido', t.on && t.cli, t);

  console.log('\n── 4. «Ver enteras» y «Achicar los listos» ──');
  t=await page.evaluate(async()=>{ document.querySelector('#adm-fichas .ach-g button').click(); await new Promise(r=>setTimeout(r,80));
    var a={ ls:localStorage.getItem('me_adm_chicas'), chicas:document.querySelectorAll('#adm-fichas .af-chica').length, g:document.querySelector('#adm-fichas .ach-g').textContent };
    document.querySelector('#adm-fichas .ach-g button').click(); await new Promise(r=>setTimeout(r,80));
    a.ls2=localStorage.getItem('me_adm_chicas'); a.chicas2=document.querySelectorAll('#adm-fichas .af-chica').length; return a; });
  chk('4a «Ver enteras»: todas enteras, queda en la compu y el título ofrece «Achicar los listos»', t.ls==='0' && t.chicas===0 && /Achicar los listos/.test(t.g), t);
  chk('4b «Achicar los listos»: vuelve la chica', t.ls2==='1' && t.chicas2===1, t);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
