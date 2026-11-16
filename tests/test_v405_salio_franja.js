/* 🎨 (16/11/2026, mejora 405; el dueño la eligió) «¿Salió un camión?» en una franja: los camiones en botones de una línea con su color, el
   número sin ✅ en un círculo, el chofer abajo; la explicación en un «i» y el aviso «⚠️ N sin camión» como pastilla. Tocar hace lo de siempre.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `SAL_FRANJA_PRUEBA` (Playwright, con `SALIO_PRUEBA`): la caja de siempre («🚚 Salió el Carry», la explicación, el aviso abajo).
   2. Con la bandera: la franja (`sal-fr`), un botón por camión con su color (`--cc`), el círculo con los pedidos sin ✅ (los mismos de antes),
      el chofer, «Todo el turno» y la pastilla «⚠️ 1 sin camión»; la explicación escondida hasta tocar el «i».
   3. Tocar un camión abre «🚚 Salió el Carry» (lo de siempre); la pastilla abre «Todo el turno»; un camión salido dice «🛣️ salió HH:MM».
   Datos SINTÉTICOS. Reloj clavado el jueves 22/10/2026 09:10. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v405_salio_franja.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    window.SALIO_PRUEBA=1; UNLOCKED=true;
    var L=function(){ return [_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'ok' })]; };
    var ps=[
      _ped('a1','2026-10-22','AM',L(),{ cliente:'CLIENTE UNO', vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-10-20','09:00:00') }),
      _ped('a2','2026-10-22','AM',L(),{ cliente:'CLIENTE DOS', vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-10-20','09:30:00') }),
      _ped('a3','2026-10-22','AM',L(),{ cliente:'CLIENTE TRES', vehiculo:'Foton encarpado', chofer:'Cristhian', ts:_ts('2026-10-20','10:00:00') }),
      _ped('a4','2026-10-22','AM',L(),{ cliente:'CLIENTE CUATRO', zona:'', ts:_ts('2026-10-20','11:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); SALIO.tb='AM';
  });
  const leer=()=>page.evaluate(()=>{ salioBarPintar(); var el=document.getElementById('adm-salio'), T=function(e){ return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    return { fr:el.classList.contains('sal-fr'), txt:T(el), cams:[].map.call(el.querySelectorAll('.sal-cam[data-v]'), function(b){ return { v:b.getAttribute('data-v'), cc:b.style.getPropertyValue('--cc'), n:T(b.querySelector('.sal-n')), t:T(b) }; }),
      sin:T(el.querySelector('.sal-sinp')), exp:el.querySelector('.sal-exp') ? getComputedStyle(el.querySelector('.sal-exp')).display : '', i:!!el.querySelector('.sal-i'), alto:Math.round(el.getBoundingClientRect().height) }; });

  console.log('\n── 1. Sin la bandera ──');
  let r=await leer();
  chk('1a la caja de siempre: «🚚 Salió el Carry», la explicación a la vista y el aviso abajo', !r.fr && /Salió el Carry/.test(r.txt) && /Tocá el camión que salió/.test(r.txt) && /sin camión \(ni el GPS/.test(r.txt) && !r.i, r.txt.slice(0,200));
  const altoAntes=r.alto;

  console.log('\n── 2. Con la bandera: la franja ──');
  await page.evaluate(()=>{ window.SAL_FRANJA_PRUEBA=1; window.CAM_COLOR_PRUEBA=1; });
  r=await leer();
  const c=r.cams.filter(x=>x.v==='Carry')[0], f=r.cams.filter(x=>x.v==='Foton encarpado')[0], n=r.cams.filter(x=>x.v==='Foton nuevo')[0];
  chk('2a un botón por camión, con su color (Carry azul, Foton encarpado naranja)', r.fr && r.cams.length===4 && c.cc==='#2f80ed' && f.cc==='#f59e0b', r.cams.map(x=>[x.v,x.cc]));
  chk('2b el círculo dice los pedidos sin ✅ (Carry 2, Foton encarpado 1, Foton nuevo 0) y el chofer abajo', c.n==='2' && f.n==='1' && n.n==='0' && /Omar · 2 sin ✅/.test(c.t) && /nada sin ✅/.test(n.t), [c.t, f.t, n.t]);
  chk('2c «✅ Todo el turno» sigue', /Todo el turno/.test(r.txt), r.txt.slice(-80));
  chk('2d el aviso como pastilla: «⚠️ 1 sin camión · tildalos en el que los lleva»', /⚠️ 1 sin camión · tildalos en el que los lleva/.test(r.sin), r.sin);
  chk('2e la explicación escondida y el «i» para verla', r.i && r.exp==='none', r);
  chk('2f más baja que la caja de antes', r.alto<altoAntes, { antes:altoAntes, ahora:r.alto });
  let t=await page.evaluate(()=>{ document.querySelector('#adm-salio .sal-i').click(); var d=getComputedStyle(document.querySelector('#adm-salio .sal-exp')).display; document.querySelector('#adm-salio .sal-i').click(); return d; });
  chk('2g tocar el «i» muestra la explicación', t==='block', t);

  console.log('\n── 3. Tocar hace lo de siempre ──');
  t=await page.evaluate(async()=>{ document.querySelector('#adm-salio .sal-cam[data-v="Carry"]').click(); await new Promise(r=>setTimeout(r,80));
    var a=document.querySelector('#modal-box h3') ? document.querySelector('#modal-box h3').textContent : ''; closeModal();
    document.querySelector('#adm-salio .sal-sinp').click(); await new Promise(r=>setTimeout(r,80));
    var b=document.querySelector('#modal-box h3') ? document.querySelector('#modal-box h3').textContent : ''; closeModal(); return { a:a, b:b }; });
  chk('3a el Carry abre «🚚 Salió el Carry»', /Salió el Carry/.test(t.a), t);
  chk('3b la pastilla abre «Todo el turno» («Lo que salió a la mañana»)', /Lo que salió a la mañana/.test(t.b), t);
  r=await page.evaluate(()=>{ camionSalioMarcar('Carry', true, { sinPreguntar:true, sinAdelanto:true, sinAviso:true }); salioBarPintar(); var b=document.querySelector('#adm-salio .sal-cam[data-v="Carry"] .sal-ok'); return b ? b.textContent : ''; });
  chk('3c el Carry salido dice «🛣️ salió 09:10» en verde', /🛣️ salió 09:10/.test(r), r);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
