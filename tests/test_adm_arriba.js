/* ✨ (24/10, §4me; dueño: «parece noticiero de alertas… un mix de la B con la C… más pulido, más bonito… usá bien los espacios»)
   Arriba de Administración: «📋 Para hacer» (lo urgente primero, tres a la vista y el resto plegado), «☀️ Hoy» (camiones completos,
   bultos, listos, cupos) y tres pestañas (📦 Pedidos · 🚚 Camiones y día · 🧰 Herramientas). Los carteles de siempre siguen en
   «📄 Avisos completos», con sus mismos ids. En cada día y turno de las fichas, «✅ N de M listos» y los cupos que quedan.
   Se corre:  node tests/test_adm_arriba.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
async function abrir(browser, w, tabs){
  const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));   // jueves; el próximo reparto es el viernes 23
  if(tabs) await page.addInitScript(()=>{ window.ADM_TABS_PRUEBA=1; window.ADM_FICHAS_PRUEBA=1; try{ localStorage.removeItem('me_adm_sec'); localStorage.setItem('pedidos_camiones_adm','0'); }catch(e){} });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var L=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var ps=[
      _ped('b1','2026-10-22','AM',L(),{ cliente:'HOY CON CAMION', vehiculo:'Carry', chofer:'Luis Pierre', verificado:true, maps:'https://www.google.com/maps?q=-17.75,-63.17', direccion:'Av. Uno 1', ts:_ts('2026-10-20','09:00:00') }),
      _ped('b2','2026-10-22','AM',L(),{ cliente:'HOY SIN CAMION', maps:'https://www.google.com/maps?q=-17.76,-63.18', direccion:'Av. Dos 2', ts:_ts('2026-10-20','09:10:00') }),
      _ped('b3','2026-10-23','AM',L(),{ cliente:'VIERNES SIN DATOS', ts:_ts('2026-10-20','09:20:00') }),
      _ped('b4','2026-10-23','PM',L(),{ cliente:'VIERNES TARDE', vehiculo:'Carry', chofer:'Luis Pierre', maps:'https://www.google.com/maps?q=-17.77,-63.19', direccion:'Av. Tres 3', ts:_ts('2026-10-20','09:30:00') }),
      _ped('b5','2026-10-20','AM',L(),{ cliente:'MARTES ENTREGADO', vehiculo:'Carry', chofer:'Luis Pierre', entregado:true, maps:'x', direccion:'y', ts:_ts('2026-10-19','09:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=20; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
  });
  await page.waitForTimeout(150);
  return { ctx, page, errs };
}
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  /* 1 · Sin pedirlo (Playwright): todo junto como antes */
  let A=await abrir(browser, 1440, false);
  let r=await A.page.evaluate(()=>({ top:document.getElementById('adm-top').hidden, tabs:document.getElementById('adm-secs').hidden,
    ocultas:[].filter.call(document.querySelectorAll('#admin-content .adm-sec'), function(s){ return s.hidden; }).length,
    avisos:getComputedStyle(document.getElementById('adm-avisos')).display, hacer:document.getElementById('adm-hacer').innerHTML.length }));
  chk('1 · en Playwright sin pedirlo se ve todo junto, como antes (las pruebas de siempre)', r.top && r.tabs && r.ocultas===0 && r.avisos!=='none' && r.hacer===0, r);
  await A.ctx.close();

  /* 2 · Con las pestañas */
  A=await abrir(browser, 1440, true); const page=A.page;
  r=await page.evaluate(()=>{
    var T=function(e){ return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    var vis=function(s){ return !document.querySelector('#admin-content .adm-sec[data-sec="'+s+'"]').hidden; };
    return { top:!document.getElementById('adm-top').hidden, ped:vis('ped'), cam:vis('cam'), her:vis('her'),
      avisos:getComputedStyle(document.getElementById('adm-avisos')).display,
      its:[].map.call(document.querySelectorAll('#adm-hacer .ah-it'), T), mas:T(document.querySelector('#adm-hacer .ah-mas')),
      badge:T(document.querySelector('#adm-hacer .ah-badge')), secs:T(document.getElementById('adm-secs')), hoy:T(document.getElementById('adm-hoy')) };
  });
  chk('2 · arriba «Para hacer» y «Hoy»; abajo solo la pestaña Pedidos; los avisos completos plegados', r.top && r.ped && !r.cam && !r.her && r.avisos==='none', r);
  chk('2 · «Para hacer»: lo rojo primero (sin camión para HOY) y como mucho tres a la vista', r.its.length<=3 && /Sin camión para HOY/.test(r.its[0]||'') && /HOY SIN/.test(r.its[0]||''), r.its);
  const todos=await page.evaluate(()=>admHacerDatos().map(function(o){ return o.k+':'+o.n; }));
  chk('2 · también sin camión para el viernes (el próximo reparto) y «les faltan datos» a los del viernes', todos.indexOf('sincam:1')>=0 && todos.some(function(x){ return /^rev:1$/.test(x); }), todos);
  chk('2 · el número de «Para hacer» = cuántos avisos hay', String(todos.length)===r.badge, { badge:r.badge, n:todos.length });
  chk('2 · las pestañas dicen qué hay adentro', /Pedidos/.test(r.secs) && /Camiones y día/.test(r.secs) && /Herramientas/.test(r.secs) && /sin camión/.test(r.secs), r.secs);
  chk('2 · «Hoy»: 1 de 2 pedidos listos y 1 sin camión', /1 de 2\s*pedidos listos/.test(r.hoy) && /1\s*pedido sin camión/.test(r.hoy), r.hoy);
  const cupo=await page.evaluate(()=>({ libres:limTurno('2026-10-22','AM')-cuposUsadosTurno('2026-10-22','AM'), txt:document.querySelector('#adm-hoy .ah-cupos').textContent }));
  chk('2 · «Hoy» dice los cupos que quedan (los de `cuposUsadosTurno`)', cupo.txt.indexOf(cupo.libres+' libres')>=0, cupo);

  /* 3 · «Ver N más» y «Avisos completos» */
  r=await page.evaluate(()=>{
    var n=admHacerDatos().length, mas=document.querySelector('#adm-hacer .ah-mas'); if(mas) mas.click();
    var vis=document.querySelectorAll('#adm-hacer .ah-it').length;
    [].filter.call(document.querySelectorAll('#adm-hacer .ah-link'), function(b){ return /Avisos/.test(b.textContent); })[0].click();
    return { n:n, vis:vis, avisos:getComputedStyle(document.getElementById('adm-avisos')).display, revisar:document.getElementById('adm-revisar').textContent };
  });
  chk('3 · «▾ Ver N más» muestra todos', r.vis===r.n, r);
  chk('3 · «📄 Avisos completos» abre los carteles de siempre (mismo id, mismo texto)', r.avisos!=='none' && /Revisar entregas de mañana/.test(r.revisar), r);
  await page.evaluate(()=>{ admAvisosAbrir(false); ADM_HACER_MAS=false; admHacerPintar(); });

  /* 4 · Las pestañas y los botones de «Para hacer» */
  r=await page.evaluate(async()=>{
    var b=[].filter.call(document.querySelectorAll('#adm-hacer .ah-go'), function(x){ return /Sugerir camión/.test(x.textContent); })[0]; b.click();
    await new Promise(function(z){ setTimeout(z,150); });
    var cam=!document.querySelector('.adm-sec[data-sec="cam"]').hidden, ped=!document.querySelector('.adm-sec[data-sec="ped"]').hidden;
    var sug=document.getElementById('nx-sug').textContent;
    var guardado=localStorage.getItem('me_adm_sec');
    admSecPoner('her'); var her=!document.querySelector('.adm-sec[data-sec="her"]').hidden && document.querySelector('.adm-sec[data-sec="cam"]').hidden;
    admSecPoner('ped');
    return { cam:cam, ped:ped, sug:/Sin camión/.test(sug), guardado:guardado, her:her };
  });
  chk('4 · «💡 Sugerir camión» lleva a «Camiones y día» con las sugerencias a la vista', r.cam && !r.ped && r.sug, r);
  chk('4 · la pestaña elegida se recuerda en el aparato y se cambia', r.guardado==='cam' && r.her, r);
  r=await page.evaluate(()=>{ admSecPoner('her'); var el=asisPrimero(['#nx-sug']); return { el:!!el, cam:!document.querySelector('.adm-sec[data-sec="cam"]').hidden }; });
  chk('4 · Bloki («Mostrame dónde») abre la pestaña donde vive lo que señala', r.el && r.cam, r);
  await page.evaluate(()=>admSecPoner('ped'));

  /* 5 · Los días de las fichas */
  r=await page.evaluate(()=>{ var T=function(e){ return e.textContent.replace(/\s+/g,' ').trim(); };
    return [].map.call(document.querySelectorAll('#adm-fichas .af-g'), T); });
  const g=function(re){ return r.filter(function(t){ return re.test(t); })[0]||''; };
  const libVie=await page.evaluate(()=>limTurno('2026-10-23','PM')-cuposUsadosTurno('2026-10-23','PM'));
  chk('5 · cada día y turno dice cuántos están listos', /✅ 1 de 2 listos/.test(g(/jueves/i)), r);
  chk('5 · …y cuántos cupos quedan en ese turno', new RegExp('quedan '+libVie+' cupos').test(g(/viernes.*Tarde/i)), { g:g(/viernes.*Tarde/i), libVie:libVie });
  chk('5 · un día que ya pasó dice cuántos se entregaron', /🚚 1 de 1 entregado/.test(g(/martes/i)), g(/martes/i));
  const barra=await page.evaluate(()=>document.querySelectorAll('#adm-fichas .af-pb').length);
  chk('5 · la barrita verde ya no está', barra===0, barra);

  /* 6 · La barra de filtros: el mes con ‹ › y «Fichas | Tabla» adentro */
  r=await page.evaluate(()=>{ var seg=document.querySelector('#adm-mode [data-val="mes"]'); seg.click(); var m=document.getElementById('adm-mes'); m.value='2026-10';
    admMesMover(1); var a=m.value; admMesMover(-2); var b=m.value; admMesMover(1);
    return { a:a, b:b, vista:!!document.querySelector('.adm-filtros #adm-vista button.on') }; });
  chk('6 · ‹ › cambian el mes de a uno', r.a==='2026-11' && r.b==='2026-09', r);
  chk('6 · «🃏 Fichas | ☰ Tabla» va en la misma barra', r.vista, r);

  /* 7 · Imprimir: sale la lista, no lo de arriba */
  await page.emulateMedia({ media:'print' });
  r=await page.evaluate(()=>({ top:getComputedStyle(document.getElementById('adm-top')).display, ped:getComputedStyle(document.querySelector('.adm-sec[data-sec="ped"]')).display,
    her:getComputedStyle(document.querySelector('.adm-sec[data-sec="her"]')).display }));
  chk('7 · al imprimir sale la lista (aunque esté en otra pestaña) y no las tarjetas de arriba', r.top==='none' && r.ped!=='none' && r.her==='none', r);
  await page.emulateMedia({ media:'screen' });
  chk('sin errores en la página (escritorio)', A.errs.length===0, A.errs);
  await A.ctx.close();

  /* 8 · En el celular: nada se sale de la pantalla */
  A=await abrir(browser, 390, true);
  r=await A.page.evaluate(()=>{ var w=document.documentElement.clientWidth, mal=[];
    ['adm-hacer','adm-hoy','adm-secs'].forEach(function(id){ var b=document.getElementById(id).getBoundingClientRect(); if(b.right>w+1 || b.width<200) mal.push(id+':'+Math.round(b.left)+'-'+Math.round(b.right)); });
    [].forEach.call(document.querySelectorAll('#adm-hacer .ah-go, #adm-hoy button, #adm-secs button'), function(b){ var r=b.getBoundingClientRect(); if(r.right>w+1) mal.push(b.textContent.trim().slice(0,20)); });
    return { w:w, mal:mal, scroll:document.documentElement.scrollWidth<=w+1 }; });
  chk('8 · en 390 px «Para hacer», «Hoy» y las pestañas entran sin salirse', r.mal.length===0 && r.scroll, r);
  chk('sin errores en la página (celular)', A.errs.length===0, A.errs);
  await A.ctx.close();

  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
