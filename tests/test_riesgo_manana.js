/* ⚠️ (22/11, mejora 459) LAS ENTREGAS DE MAÑANA EN RIESGO: desde las 15:00, los pedidos del próximo día con camión con el stock sin revisar
   o «no hay» sin pedir, sin ubicación o sin camión, en «Para hacer» de Administración, con la lista y los botones al arreglo de siempre.
   El saldo a cobrar va aparte, solo para saber. Si ningún pedido de ese día tiene camión todavía, «sin camión» se dice una vez arriba.
   Se corre:  node tests/test_riesgo_manana.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-19T16:10:00-04:00'));   // jueves: el próximo camión es el viernes 20/11
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const MAPS='https://www.google.com/maps?q=-17.75,-63.17';
  await page.evaluate(async(MAPS)=>{
    var ok=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var ps=[
      _ped('r1','2026-11-20','AM',ok(),{ maps:MAPS, vehiculo:'Carry', chofer:'Omar', pagado:true, saldo:0 }),
      _ped('r2','2026-11-20','AM',[_lin('CH1201|TITANIO ICE|160x190',1)],{ cliente:'CLIENTE STOCK', maps:MAPS, vehiculo:'Carry', pagado:true, saldo:0 }),
      _ped('r3','2026-11-20','PM',ok(),{ cliente:'CLIENTE PIN', maps:'', vehiculo:'Carry', pagado:true, saldo:0 }),
      _ped('r4','2026-11-20','PM',ok(),{ cliente:'CLIENTE CAMION', maps:MAPS, pagado:true, saldo:0 }),
      _ped('r5','2026-11-20','AM',ok(),{ cliente:'CLIENTE COBRA', maps:MAPS, vehiculo:'Carry', pagado:false, saldo:450 }),
      _ped('r6','2026-11-21','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'no' })],{ cliente:'CLIENTE SABADO', maps:'' }),
      _ped('r7','2026-11-20','AM',[_lin('CH1201|TITANIO ICE|160x190',1)],{ cliente:'CLIENTE ENTREGADO', entregado:true }),
      _ped('r8','2026-11-20','AM',ok(),{ cliente:'CLIENTE RETIRA', direccion:'RETIRA EN BANZER', maps:'', pagado:true, saldo:0 }),
      _ped('r9','2026-11-20','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'no' })],{ cliente:'CLIENTE NOHAY', maps:MAPS, vehiculo:'Carry', pagado:true, saldo:0 }),
      _ped('a1','2026-11-20','AM',[_lin('CH1201|TITANIO ICE|160x190',1)],{ oc:'ATC 11-010', cliente:'CLIENTE ATC', maps:MAPS, vehiculo:'Carry', pagado:true, saldo:0 })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
  }, MAPS);
  const apagado=await page.evaluate(()=>({ d:riesgoDatos(), h:admHacerDatos().filter(function(o){ return /^riesgo/.test(o.k); }).length }));
  chk('en Playwright, sin pedirlo, está apagado', apagado.d===null && apagado.h===0, apagado);

  const D=await page.evaluate(()=>{ window.RIESGO_PRUEBA=1; var D=riesgoDatos(); return { dia:D.dia, cuando:D.cuando, R:D.R.map(function(x){ return x.id; }), C:D.C.map(function(x){ return x.id; }),
    stk:D.nStk, ub:D.nUb, cam:D.nCam, nCob:D.nCob, bs:D.bs, camG:D.camG, r2:(D.R.filter(function(x){ return x.id==='r2'; })[0]||{}).rev, r9:(D.R.filter(function(x){ return x.id==='r9'; })[0]||{}).nohay }; });
  chk('1 · el próximo camión (viernes 20/11, «mañana»)', D.dia==='2026-11-20' && D.cuando==='de mañana', D);
  chk('1 · en riesgo: sin revisar (r2), «no hay» sin pedir (r9), sin ubicación (r3) y sin camión (r4); la ATC no mira stock; ni lo entregado, ni lo que retira el cliente, ni otro día',
      D.R.slice().sort().join(',')==='r2,r3,r4,r9' && D.r2===1 && D.r9===1 && D.stk===2 && D.ub===1 && D.cam===1 && !D.camG, D);
  chk('1 · el saldo a cobrar va aparte, solo para saber (r5, Bs 450)', D.C.join(',')==='r5' && D.nCob===1 && D.bs===450, D);

  const H=await page.evaluate(()=>{ var o=admHacerDatos().filter(function(o){ return o.k==='riesgo'; })[0]; return o ? { sev:o.sev, n:o.n, t:o.t, s:o.s, fn:o.fn } : null; });
  chk('2 · «Para hacer»: «⚠️ 4 entregas de mañana en riesgo», en rojo, con qué le falta a cada una', H && H.sev==='r' && H.n===4 && /4 entregas de mañana en riesgo/.test(H.t) &&
      /2 con el stock sin revisar/.test(H.s) && /1 sin ubicación/.test(H.s) && /1 sin camión/.test(H.s) && /cobrar Bs\s?450/.test(H.s) && H.fn==='riesgoAbrir()', H);

  const M=await page.evaluate(async()=>{
    riesgoAbrir(); var b=document.getElementById('modal-box'), T=function(e){ return e ? e.textContent.replace(/\s+/g,' ') : ''; };
    var f=function(id){ return b.querySelector('.rsg-f[data-id="'+id+'"]'); };
    var r={ on:document.getElementById('modal').classList.contains('on'), filas:[].map.call(b.querySelectorAll('.rsg-l > .rsg-f'), function(x){ return x.getAttribute('data-id'); }),
      r2:T(f('r2')), r3wa:(f('r3').querySelector('a.wa-btn')||{}).href||'', r4sel:!!f('r4').querySelector('select.rsg-cam'), r5:T(f('r5')), det:T(b.querySelector('.rsg-det summary')) };
    f('r2').querySelector('.rsg-b').click(); await new Promise(x=>setTimeout(x,60));
    r.abreFicha=!!document.querySelector('#modal-box .fl-b') && !!document.querySelector('#modal-box .rsg-volver');
    document.querySelector('#modal-box .rsg-volver').click(); await new Promise(x=>setTimeout(x,60));
    r.volvio=!!document.querySelector('#modal-box .rsg');
    var s=document.querySelector('#modal-box .rsg-f[data-id="r4"] select.rsg-cam'); s.value='Carry'; s.dispatchEvent(new Event('change'));
    await new Promise(x=>setTimeout(x,400));
    r.veh=findById('r4').vehiculo; r.sigue=!!document.querySelector('#modal-box .rsg-f[data-id="r4"] .rsg-cam');
    closeModal(); return r;
  });
  chk('3 · la lista: los 4 en riesgo y el que solo cobra plegado aparte', M.on && M.filas.slice(0,4).join(',')==='r2,r9,r3,r4' && /Solo cobrar al entregar · 1/.test(M.det) && /Cobrar Bs\s?450(,00)? al entregar/.test(M.r5), M);
  chk('3 · cada problema con su arreglo: «📦 Abrir el pedido» (con «← Volver»), «💬 Pedir ubicación» por WhatsApp y «🚚 Asignar camión…»',
      /1 sin revisar el stock/.test(M.r2) && /TITANIO ICE/.test(M.r2) && /wa\.me|whatsapp/.test(M.r3wa) && M.r4sel && M.abreFicha && M.volvio, M);
  chk('3 · asignar el camión desde la lista lo guarda (cvAsignar) y el pedido ya no dice «sin camión»', M.veh==='Carry' && !M.sigue, M);

  const B=await page.evaluate(()=>{ var A=asisLogistica().filter(function(a){ return /^l-riesgo\|/.test(a.k); })[0]; return A ? { t:A.t, sev:A.sev, n:(A.lista||[]).length, b:A.b } : null; });
  chk('4 · Bloki se lo dice a logística (l-riesgo, con la lista)', B && B.sev==='ro' && /3 entregas de mañana en riesgo/.test(B.t) && B.n===3 && B.b[1]==='riesgoAbrir()', B);

  const G=await page.evaluate(async()=>{
    STATE.forEach(function(p){ if(p.fecha==='2026-11-20'){ p.vehiculo=''; p.chofer=''; } });
    var D=riesgoDatos(); riesgoAbrir(); var t=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
    return { camG:D.camG, nG:D.nSinCamG, R:D.R.map(function(x){ return x.id; }).sort().join(','), cam:D.nCam, t:/Todavía no se asignó ningún camión/.test(t) };
  });
  chk('5 · sin ningún camión asignado todavía para ese día, «sin camión» no hace a cada uno «en riesgo»: se dice una vez arriba', G.camG && G.nG>=6 && G.R==='r2,r3,r9' && G.cam===0 && G.t, G);

  await page.clock.setFixedTime(new Date('2026-11-19T14:30:00-04:00'));
  const T14=await page.evaluate(()=>({ d:riesgoDatos(), n:admHacerDatos().filter(function(o){ return /^riesgo/.test(o.k); }).length }));
  chk('6 · antes de las 15:00 no sale', T14.d===null && T14.n===0, T14);

  await page.clock.setFixedTime(new Date('2026-11-21T15:20:00-04:00'));   // sábado: el próximo camión es el lunes 23/11
  const S=await page.evaluate(async()=>{
    window._SRV.pedidos.push(_ped('l1','2026-11-23','AM',[_lin('CH1201|TITANIO ICE|160x190',1)],{ cliente:'CLIENTE LUNES', maps:'https://www.google.com/maps?q=-17.75,-63.17', vehiculo:'Carry', pagado:true, saldo:0 }));
    await refrescarEstado();
    var o=admHacerDatos().filter(function(o){ return o.k==='riesgo'; })[0]; return { dia:(riesgoDatos()||{}).dia, t:o&&o.t };
  });
  chk('7 · el sábado mira el lunes y lo dice con su nombre', S.dia==='2026-11-23' && /entregas? del lunes 23\/11 en riesgo/.test(S.t||''), S);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
