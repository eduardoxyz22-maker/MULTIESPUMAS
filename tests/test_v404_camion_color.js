/* 🎨 (16/11/2026, mejora 404; el dueño la eligió) Cada camión con su color, en todo el panel: la «patente» con la franja del color en las
   fichas de Administración (y la esquinita), «¿Salió un camión?», el Cierre de entregas, la Lista de carga, «Lo del día, por lugar», la Hoja
   de ruta y los círculos de «Camiones con lo sugerido».

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `CAM_COLOR_PRUEBA` (Playwright): todo como siempre (el camión en texto, sin patente ni esquinita).
   2. Con la bandera, la ficha: la patente con el color de SU camión (Carry azul, Foton encarpado naranja), la esquinita del mismo color y la
      leyenda «Camiones:» con los que hay; «Sin camión» sigue en rojo, sin patente.
   3. El mismo color en «¿Salió un camión?», la Lista de carga, «Lo del día, por lugar», la Hoja de ruta, el Cierre y `nxSugColor`.
   4. Un camión que no está en la lista sale gris (no rompe).
   Datos SINTÉTICOS. Reloj clavado el jueves 22/10/2026 09:10. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v404_camion_color.js */
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
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    window.ADM_FICHAS_PRUEBA=1; window.SALIO_PRUEBA=1; UNLOCKED=true;
    var L=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var ps=[
      _ped('a1','2026-10-22','AM',L(),{ cliente:'CLIENTE UNO', vehiculo:'Carry', chofer:'Omar', verificado:true, ts:_ts('2026-10-20','09:00:00') }),
      _ped('a2','2026-10-22','AM',L(),{ cliente:'CLIENTE DOS', vehiculo:'Foton encarpado', chofer:'Cristhian', ts:_ts('2026-10-20','10:00:00') }),
      _ped('a3','2026-10-22','AM',L(),{ cliente:'CLIENTE TRES', ts:_ts('2026-10-20','11:00:00') }),
      _ped('a4','2026-10-22','PM',L(),{ cliente:'CLIENTE CUATRO', vehiculo:'Camion viejo', chofer:'Pepe', ts:_ts('2026-10-20','12:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
  });
  const ficha=()=>page.evaluate(()=>{
    var F=[].slice.call(document.querySelectorAll('#adm-fichas .af-f')), T=function(e){ return e.textContent.replace(/\s+/g,' '); };
    var de=function(n){ return F.filter(function(f){ return T(f).indexOf(n)>=0; })[0]; };
    var o={}; ['UNO','DOS','TRES','CUATRO'].forEach(function(n){ var f=de('CLIENTE '+n); if(!f) return; var pl=f.querySelector('.cam-pl');
      o[n]={ pl:pl ? T(pl) : '', vc:pl ? pl.style.getPropertyValue('--vc') : '', esq:f.classList.contains('af-vc'), esqC:f.style.getPropertyValue('--vc'),
        rojo:!!f.querySelector('.af-inf .rojo'), cam:T(f.querySelector('.af-inf')) }; });
    o.ley=document.querySelector('#adm-fichas .cam-ley') ? T(document.querySelector('#adm-fichas .cam-ley')) : '';
    return o;
  });

  console.log('\n── 1. Sin la bandera ──');
  let r=await ficha();
  chk('1a el camión en texto, sin patente ni esquinita, y sin leyenda', !r.UNO.pl && !r.UNO.esq && /🚛 Carry · Omar/.test(r.UNO.cam) && !r.ley, r.UNO);
  let s=await page.evaluate(()=>{ salioBarPintar(); var el=document.getElementById('adm-salio'); return { vc:el.querySelectorAll('.sal-vc').length, n:el.querySelectorAll('.sal-cam').length }; });
  chk('1b «¿Salió un camión?» sin los colores', s.n>0 && s.vc===0, s);
  s=await page.evaluate(()=>({ c:cargaBloquesHtml(STATE.filter(function(p){ return p.fecha==='2026-10-22'; }), '2026-10-22'), sug:nxSugColor('Carry') }));
  chk('1c la Lista de carga como siempre y nxSugColor con su color de siempre', !/cam-pl/.test(s.c) && /🚛 Carry/.test(s.c) && s.sug==='#0ea5e9', s.sug);

  console.log('\n── 2. Con la bandera: la ficha ──');
  await page.evaluate(()=>{ window.CAM_COLOR_PRUEBA=1; renderAdmin(); });
  r=await ficha();
  chk('2a la patente del Carry: «🚛 Carry Omar», azul, y la esquinita del mismo azul', /🚛 ?Carry ?Omar/.test(r.UNO.pl) && r.UNO.vc==='#2f80ed' && r.UNO.esq && r.UNO.esqC==='#2f80ed', r.UNO);
  chk('2b el Foton encarpado, naranja', /Foton encarpado/.test(r.DOS.pl) && r.DOS.vc==='#f59e0b' && r.DOS.esqC==='#f59e0b', r.DOS);
  chk('2c «Sin camión» sigue en rojo, sin patente ni esquinita', r.TRES.rojo && !r.TRES.pl && !r.TRES.esq, r.TRES);
  chk('2d un camión que no está en la lista: patente gris', /Camion viejo/.test(r.CUATRO.pl) && r.CUATRO.vc==='#94a3b8', r.CUATRO);
  chk('2e la leyenda «Camiones:» con los que hay (Carry y Foton encarpado)', /Camiones:/.test(r.ley) && /Carry/.test(r.ley) && /Foton encarpado/.test(r.ley) && !/Foton insumo/.test(r.ley) && !/viejo/.test(r.ley), r.ley);

  console.log('\n── 3. El mismo color en las otras pantallas ──');
  s=await page.evaluate(()=>{ SALIO.tb='AM'; salioBarPintar(); var el=document.getElementById('adm-salio');
    var b=el.querySelector('.sal-cam[data-v="Carry"]'), e=el.querySelector('.sal-cam[data-v="Foton encarpado"]');
    return { c:b && b.classList.contains('sal-vc') && b.style.getPropertyValue('--cc'), e:e && e.style.getPropertyValue('--cc') }; });
  chk('3a «¿Salió un camión?»: el borde del Carry azul y el del Foton encarpado naranja', s.c==='#2f80ed' && s.e==='#f59e0b', s);
  s=await page.evaluate(()=>{ var d=document.createElement('div'); d.innerHTML=cargaBloquesHtml(STATE.filter(function(p){ return p.fecha==='2026-10-22'; }), '2026-10-22');
    var c=d.querySelector('.carga-cam[data-veh="Carry"]'); return { pl:c && c.querySelector('.cam-pl') ? c.querySelector('.cam-pl').textContent : '', borde:c ? c.style.borderLeft : '', sin:!!d.querySelector('.carga-cam[data-veh="Sin vehículo"] .cam-pl') }; });
  chk('3b la Lista de carga: la patente del camión con su chofer y el borde azul; «Sin vehículo» sin patente', /Carry/.test(s.pl) && /Omar/.test(s.pl) && /6px solid/.test(s.borde) && !s.sin, s);
  s=await page.evaluate(()=>{ ADM_LUG_DIA='hoy'; var d=document.createElement('div'); d.innerHTML=admLugaresHtml();
    return [].map.call(d.querySelectorAll('.cam-dot'), function(i){ return i.style.getPropertyValue('--vc'); }); });
  chk('3c «Lo del día, por lugar»: un puntito del color del camión en cada renglón con camión', s.indexOf('#2f80ed')>=0 && s.indexOf('#f59e0b')>=0, s);
  s=await page.evaluate(()=>{ RUTA_DIA='hoy'; try{ renderRuta(); }catch(e){ return { err:String(e) }; } var cs=[].slice.call(document.querySelectorAll('#ruta-body .ruta-chofer'));
    var om=cs.filter(function(c){ return /Omar/.test(c.textContent); })[0]; return { borde:om ? om.style.borderLeft : '', pl:om && om.querySelector('.cam-pl') ? om.querySelector('.cam-pl').textContent : '' }; });
  chk('3d la Hoja de ruta: el chofer Omar con el color y la patente del Carry', /6px solid/.test(s.borde) && /Carry/.test(s.pl), s);
  s=await page.evaluate(()=>({ html:cieRenglonCamHtml(findById('a1')), sug:nxSugColor('Carry'), sug2:nxSugColor('Foton nuevo') }));
  chk('3e el Cierre de entregas: el camión del pedido como patente (sigue con su clase cie-veh)', /cam-pl/.test(s.html) && /cie-veh/.test(s.html) && /#2f80ed/.test(s.html), s.html);
  chk('3f «Camiones con lo sugerido» (nxSugColor): el mismo azul del Carry y el violeta del Foton nuevo', s.sug==='#2f80ed' && s.sug2==='#8b5cf6', s);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
