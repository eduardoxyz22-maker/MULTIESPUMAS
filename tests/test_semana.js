/* 🗓️ (26-27/10) El botón «Semana» de Administración: el STOCK de los productos de los próximos 5 días hábiles.
   El dueño (26/10): *«un botón que muestre lo de la semana, lo que falta en la semana, y parpadee rojo si por ejemplo sabés que jueves hay
   entregas que aún dicen sin stock… siempre 5 días hábiles hacia adelante, desde el día en cuestión, no desde atrás»*. Y (27/10): *«¿por
   qué decís camión? Lo que nos interesa es ver a futuro si se pidió o llegó el producto… hacer recuerdo a logística: tenés este pedido el
   jueves y aún no marcás el stock… producción tarda hasta 4 días a veces»*.
   Reloj clavado en el JUEVES 29/10/2026 a las 09:00 de Bolivia: los 5 días son jue 29, vie 30, sáb 31, mar 03/11 y mié 04/11 (el
   domingo 01/11 no es hábil y el lunes 02/11 es feriado, Todos Santos). Lo de ayer y lo del sexto día no entran.
   Se corre:  node tests/test_semana.js   (SEM_CAP=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAP = process.env.SEM_CAP || '';
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

async function abrir(browser, w, extra){
  const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-29T09:00:00-04:00'));   // jueves
  if(extra) await page.addInitScript(extra);
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var ok=function(ex){ return _lin(_T,1,Object.assign({ chk:'ok' }, ex||{})); };
    var no=function(ex){ return _lin(_T,1,Object.assign({ chk:'no' }, ex||{})); };
    var cam={ vehiculo:'Carry', chofer:'Luis Pierre' };
    var ps=[
      _ped('s01','2026-10-28','AM',[_lin(_T,1)],{ cliente:'AYER SIN REVISAR' }),                                         // ayer: no entra (no se mira para atrás)
      _ped('s02','2026-10-29','AM',[ok()],Object.assign({ cliente:'HOY CON STOCK', verificado:true }, cam)),              // ✔
      _ped('s15','2026-10-29','AM',[ok(), _lin(_S,1)],{ cliente:'HOY DOS PRODUCTOS' }),                                  // ✔ + ⬜ (sin camión: no importa)
      _ped('s03','2026-10-30','AM',[no()],Object.assign({ cliente:'VIERNES NO HAY' }, cam)),                             // 🔴 no hay y no se pidió
      _ped('s04','2026-10-30','PM',[no({ enProd:true, prodF:'2026-10-28' })],Object.assign({ cliente:'VIERNES FABRICA TARDE' }, cam)),   // ⚠️ pedido el 28: llega ~03/11
      _ped('s05','2026-10-31','AM',[_lin(_T,1)],{ cliente:'SABADO SIN REVISAR' }),                                      // ⬜
      _ped('s12','2026-10-31','AM',[no()],Object.assign({ cliente:'Mia Plaza', oc:'RPT 10-001' }, cam)),                  // 🔴 la RPT sale del stock
      _ped('s06','2026-11-02','AM',[_lin(_T,1)],{ cliente:'FERIADO' }),                                                 // en un feriado: no es día hábil
      _ped('s07','2026-11-03','AM',[_lin(_T,1,{ chk:'im' })],Object.assign({ cliente:'MARTES MORENO' }, cam)),            // ✔ (hay en Moreno)
      _ped('s13','2026-11-03','PM',[no({ enProd:true, prodF:'2026-10-26' })],Object.assign({ cliente:'MARTES FABRICA' }, cam)),   // 🏭 pedido el 26: llega ~30/10, a tiempo
      _ped('s08','2026-11-04','AM',[ok(), _lin('|PROTECTOR DE COLCHON|160x190',1)],Object.assign({ cliente:'MIERCOLES PROTECTOR' }, cam)),   // el protector no cuenta
      _ped('s14','2026-11-04','AM',[ok({ enProd:true, prodF:'2026-10-23', prodR:'2026-10-28' })],Object.assign({ cliente:'MIERCOLES LLEGO' }, cam)),   // ✔ llegó de fábrica
      _ped('s09','2026-11-05','AM',[_lin(_T,1)],{ cliente:'JUEVES QUE VIENE' }),                                         // el 6° día: no entra
      _ped('s10','2026-10-30','AM',[_lin(_T,1)],Object.assign({ cliente:'VIERNES ATC', oc:'ATC 10-001' }, cam)),          // la ATC no lleva stock
      _ped('s11','2026-10-29','PM',[_lin(_T,1)],Object.assign({ cliente:'HOY ENTREGADO', entregado:true }, cam))          // ya entregado: no cuenta
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=20; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin');
    segSet('adm-mode','mes'); document.getElementById('wrap-mes').style.display=''; document.getElementById('adm-mes').value='2026-10';
    QUICK_FILTER=''; renderAdmin();
  });
  await page.waitForTimeout(150);
  return { ctx, page, errs };
}
const ids=page=>page.evaluate(()=>[].map.call(document.querySelectorAll('#tbl-pedidos tr[onclick]'), function(tr){ return (tr.getAttribute('onclick').match(/'([^']+)'/)||[])[1]; }));
const lista=page=>page.evaluate(()=>[].map.call(document.querySelectorAll('#adm-semana .sem-li-r'), function(b){ return (b.getAttribute('onclick').match(/'([^']+)'/)||[])[1]+':'+b.className.replace(/.*sem-r-/,''); }));
const chip=page=>page.evaluate(()=>{ var b=document.querySelector('#adm-chips .qchip[data-k="semana"]'); if(!b) return null;
  return { txt:b.textContent.replace(/\s+/g,' ').trim(), cls:b.className, title:b.getAttribute('title')||'', anim:getComputedStyle(b).animationName, n:(b.querySelector('.n')||{}).textContent }; });
const enOrden=a=>a.every((x,i)=>!i || x>=a[i-1]);

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  /* 1 · Los días: 5 hábiles, desde HOY hacia adelante */
  let A=await abrir(browser, 1440); let page=A.page;
  let r=await page.evaluate(()=>semanaDias());
  chk('1 · desde el jueves: jue 29, vie 30, sáb 31, mar 03 y mié 04 (sin el domingo ni el feriado del lunes 02/11)',
    JSON.stringify(r)===JSON.stringify(['2026-10-29','2026-10-30','2026-10-31','2026-11-03','2026-11-04']), r);
  const otros=await page.evaluate(()=>{ var out={};
    var con=function(iso){ var f0=todayStr; todayStr=function(){ return iso; }; try{ return semanaDias(); } finally { todayStr=f0; } };
    out.sab=con('2026-10-31'); out.dom=con('2026-11-01'); out.fer=con('2026-11-02'); return out; });
  chk('1 · el sábado arranca ese sábado; el domingo y el feriado arrancan en el día hábil siguiente',
    otros.sab[0]==='2026-10-31' && otros.sab.length===5 && otros.dom[0]==='2026-11-03' && otros.fer[0]==='2026-11-03' && otros.dom.indexOf('2026-11-02')<0, otros);

  /* 2 · Cada producto con su estado de stock */
  r=await page.evaluate(()=>{ var o={}; ['s02','s15','s03','s04','s05','s12','s07','s13','s08','s14'].forEach(function(id){ var p=findById(id);
    o[id]=(p.productos||[]).map(function(x){ return semanaLinea(p, x)||'·'; }).join('+'); }); return o; });
  chk('2 · ✔ con stock, ⬜ sin revisar, 🔴 no hay sin pedir, ⚠️ pedido que puede no llegar, 🏭 pedido que llega a tiempo, ✔ llegó, Moreno = con stock, el protector no cuenta',
    JSON.stringify(r)===JSON.stringify({ s02:'listo', s15:'listo+rev', s03:'nohay', s04:'tarde', s05:'rev', s12:'nohay', s07:'listo', s13:'prod', s08:'listo+·', s14:'listo' }), r);
  r=await page.evaluate(()=>({ tarde:semanaLlega(findById('s04').productos[0]), aTiempo:semanaLlega(findById('s13').productos[0]) }));
  chk('2 · lo pedido a producción llega en hasta 4 días hábiles: el del 28/10 llega ~03/11 (después del viernes 30) y el del 26/10 ~30/10 (antes del martes 03)',
    r.tarde==='2026-11-03' && r.aTiempo==='2026-10-30', r);

  /* 3 · El botón: cuenta, parpadea y dice cuántos productos hay por revisar */
  let c=await chip(page);
  if(CAP){ const bx=await page.evaluate(()=>{ var a=document.getElementById('adm-chips'); a.scrollIntoView(); var q=a.getBoundingClientRect(); return { x:Math.max(0,q.left-8), y:Math.max(0,q.top-6), width:q.width+16, height:q.height+12 }; });
    await page.screenshot({ path:path.join(CAP,'semana-boton.png'), clip:bx }); }
  chk('3 · el botón «🗓️ Semana» está con los demás', !!c && /Semana/.test(c.txt), c);
  chk('3 · cuenta los 10 pedidos con productos de los 5 días (sin ayer, el feriado, el 6° día, la ATC ni lo entregado; también noviembre con el filtro en octubre)', c && c.n==='10', c);
  chk('3 · parpadea en rojo y dice «🔴 4 por revisar» (2 sin revisar + 2 que no hay y no se pidieron)', c && /qchip-alerta/.test(c.cls) && c.anim==='qchip-alerta' && /🔴 4 por revisar/.test(c.txt), c);
  chk('3 · al pasar el mouse dice qué productos y de quién', c && /2 productos sin revisar el stock y 2 que no hay y no se pidieron a producción/.test(c.title) && /viernes 30\/10: 1× TITANIO ICE 160×190 \(VIERNES NO\)/.test(c.title), c && c.title);
  r=await page.evaluate(()=>!!document.getElementById('adm-semana').hidden);
  chk('3 · sin tocarlo, el resumen no se ve', r===true);

  /* 4 · Tocarlo: arranca en «Lo que falta», con el resumen por día y la lista de productos */
  await page.evaluate(()=>setQuick('semana')); await page.waitForTimeout(80);
  r=await page.evaluate(()=>SEMANA_VER);
  chk('4 · al tocarlo se ve primero lo que falta', r==='falta', r);
  if(CAP){
    await (await page.$('#admin-content')).screenshot({ path:path.join(CAP,'semana-pc.png') });
    const bx=await page.evaluate(()=>{ var a=document.getElementById('adm-chips'), b=document.getElementById('adm-semana'); a.scrollIntoView(); var r1=a.getBoundingClientRect(), r2=b.getBoundingClientRect();
      return { x:Math.max(0,r1.left-8), y:Math.max(0,r1.top-8), width:Math.max(r1.right,r2.right)-r1.left+16, height:r2.bottom-r1.top+16 }; });
    await page.setViewportSize({ width:1440, height:Math.ceil(bx.y+bx.height+20) });
    await page.screenshot({ path:path.join(CAP,'semana-panel.png'), clip:bx });
    await page.setViewportSize({ width:1440, height:900 });
  }
  r=await page.evaluate(()=>{ var T=function(e){ return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    var d=[].map.call(document.querySelectorAll('#adm-semana .sem-dia'), function(b){ return { t:T(b), rojo:b.classList.contains('sem-dia-rojo') }; });
    return { todo:T(document.getElementById('adm-semana')), cab:T(document.querySelector('#adm-semana .sem-cab')), al:T(document.querySelector('#adm-semana .sem-alerta')),
      ta:T(document.querySelector('#adm-semana .sem-tarde')), auto:!!document.querySelector('#adm-semana .sem-alerta button[onclick*="abrirStockRevisar"]'), d:d }; });
  chk('4 · el título: «El stock de los próximos 5 días hábiles», jueves 29/10 → miércoles 04/11', /El stock de los próximos 5 días hábiles/.test(r.cab) && /jueves 29\/10 → miércoles 04\/11/.test(r.cab), r.cab);
  chk('4 · no habla de camiones, carga ni cupos', !/cami[oó]n|cupo|cargar|carga/i.test(r.todo), r.todo.match(/.{0,30}(cami[oó]n|cupo|carga).{0,30}/i));
  chk('4 · el cartel rojo dice qué falta revisar, por día, y que producción tarda hasta 4 días', /2 productos sin revisar el stock y 2 que no hay/.test(r.al) && /jueves 29\/10: 1× SOMIER TITANIO ICE 140×190 \(HOY DOS\)/.test(r.al) && /hasta 4 días hábiles/.test(r.al), r.al);
  chk('4 · el cartel rojo tiene «🤖 Revisión automática» (propone las marcas con el Excel del día)', r.auto);
  chk('4 · el aviso ámbar: 1 pedido a producción puede no llegar a tiempo', /1 pedido a producción puede no llegar a tiempo/.test(r.ta), r.ta);
  chk('4 · cinco fichas de día; hoy dice HOY y mañana MAÑANA', r.d.length===5 && /HOY/.test(r.d[0].t) && /MAÑANA/.test(r.d[1].t), r.d.map(x=>x.t.slice(0,30)));
  chk('4 · jueves: rojo, 3 productos en 2 pedidos, 1 sin revisar, «2 de 3 con stock»', r.d[0].rojo && /3 productos · 2 pedidos/.test(r.d[0].t) && /1 sin revisar/.test(r.d[0].t) && /2 de 3 con stock/.test(r.d[0].t), r.d[0]);
  chk('4 · viernes: rojo, 1 no hay sin pedir y 1 que puede no llegar (la ATC no cuenta)', r.d[1].rojo && /2 productos · 2 pedidos/.test(r.d[1].t) && /1 no hay, sin pedir/.test(r.d[1].t) && /1 puede no llegar/.test(r.d[1].t), r.d[1]);
  chk('4 · sábado: rojo, 1 sin revisar y 1 no hay (la RPT)', r.d[2].rojo && /1 sin revisar/.test(r.d[2].t) && /1 no hay, sin pedir/.test(r.d[2].t), r.d[2]);
  chk('4 · martes: sin rojo, 1 pedido a producción que llega a tiempo', !r.d[3].rojo && /1 pedido a producción/.test(r.d[3].t) && /1 de 2 con stock/.test(r.d[3].t), r.d[3]);
  chk('4 · miércoles: todo con stock (lo que llegó de fábrica cuenta; el protector no)', !r.d[4].rojo && /2 productos/.test(r.d[4].t) && /Todo con stock/.test(r.d[4].t), r.d[4]);
  r=await lista(page);
  chk('4 · la lista de productos que faltan, de hoy hacia adelante', JSON.stringify(r)===JSON.stringify(['s15:rev','s03:nohay','s04:tarde','s05:rev','s12:nohay','s13:prod']), r);
  const ps=await ids(page);
  chk('4 · abajo, los pedidos con algo que falta, del más cercano al más lejos', JSON.stringify(ps.slice().sort())===JSON.stringify(['s03','s04','s05','s12','s13','s15']) && enOrden(ps.map(id=>({s15:1,s03:2,s04:2,s05:3,s12:3,s13:4})[id])), ps);
  r=await page.evaluate(()=>{ var b=document.querySelector('#adm-semana .sem-li-r.sem-r-tarde'); return b ? b.textContent.replace(/\s+/g,' ').trim() : ''; });
  chk('4 · el producto que puede no llegar dice cuándo se pidió y cuándo llega', /pedido el 28\/10 · llega ~03\/11/.test(r), r);
  await page.evaluate(()=>{ var b=document.querySelector('#adm-semana .sem-li-r.sem-r-rev'); b.click(); });
  r=await page.evaluate(()=>({ on:document.getElementById('modal').classList.contains('on'), txt:(document.getElementById('modal').textContent||'').indexOf('HOY DOS PRODUCTOS')>=0 }));
  chk('4 · tocar un producto abre su pedido (ahí se marca el stock)', r.on && r.txt, r);
  await page.evaluate(()=>closeModal());

  /* 5 · Filtros: por estado y por día */
  await page.evaluate(()=>semanaVer('alerta')); r=await lista(page);
  chk('5 · «Ver solo esos»: lo sin revisar y lo que no hay', JSON.stringify(r)===JSON.stringify(['s15:rev','s03:nohay','s05:rev','s12:nohay']), r);
  await page.evaluate(()=>{ SEMANA_VER=''; semanaVer('listo'); }); r=await lista(page);
  chk('5 · «✔ Con stock»: lo que hay, lo de Moreno y lo que llegó', JSON.stringify(r)===JSON.stringify(['s02:listo','s15:listo','s07:listo','s08:listo','s14:listo']), r);
  await page.evaluate(()=>{ SEMANA_VER='falta'; semanaDia('2026-10-30'); }); r=await lista(page);
  const bt=await page.evaluate(()=>[].map.call(document.querySelectorAll('#adm-semana .sem-v'), function(b){ return b.textContent.replace(/\s+/g,' ').trim()+(b.disabled?' (apagado)':'')+(b.classList.contains('on')?' (on)':''); }));
  chk('5 · tocar el viernes: solo lo del viernes', JSON.stringify(r)===JSON.stringify(['s03:nohay','s04:tarde']), r);
  chk('5 · los botones cuentan los productos del día elegido y se vuelve a los 5 días', bt.some(x=>/^Todos 2/.test(x)) && bt.some(x=>/Lo que falta 2 \(on\)/.test(x)) && bt.some(x=>/Sin revisar 0 \(apagado\)/.test(x)) && bt.some(x=>/Ver los 5 días/.test(x)), bt);
  await page.evaluate(()=>{ semanaDia('2026-10-30'); semanaVer('falta'); }); r=await lista(page);
  chk('5 · volver: «Todos» los productos de los 5 días', r.length===11, r);

  /* 6 · «Para hacer» */
  r=await page.evaluate(()=>admHacerDatos().filter(function(o){ return /^semana/.test(o.k); }));
  chk('6 · «📋 Para hacer»: rojo «Falta revisar el stock de los próximos 5 días hábiles» (4) y ámbar «puede no llegar» (1)',
    r.length===2 && r[0].k==='semana' && r[0].sev==='r' && r[0].n===4 && /Falta revisar el stock/.test(r[0].t) && r[1].k==='semana-t' && r[1].sev==='a' && r[1].n===1, r);
  await page.evaluate(()=>{ setQuick('cobrar'); eval(admHacerDatos().filter(function(o){ return o.k==='semana'; })[0].fn); });
  r=await page.evaluate(()=>({ q:QUICK_FILTER, v:SEMANA_VER })); const l2=await lista(page);
  chk('6 · su botón abre la semana con solo lo que hay que revisar', r.q==='semana' && r.v==='alerta' && l2.length===4, { r, l2 });

  /* 7 · Otro filtro esconde el resumen; logística revisa y deja de parpadear */
  await page.evaluate(()=>setQuick('hoy')); r=await page.evaluate(()=>!!document.getElementById('adm-semana').hidden);
  chk('7 · con otro filtro el resumen se esconde', r===true);
  await page.evaluate(()=>{
    findById('s15').productos[1].chk='ok'; findById('s05').productos[0].chk='ok';
    ['s03','s12'].forEach(function(id){ var x=findById(id).productos[0]; x.enProd=true; x.prodF='2026-10-29'; });
    renderAdmin(); });
  c=await chip(page);
  r=await page.evaluate(()=>({ k:admHacerDatos().filter(function(o){ return /^semana/.test(o.k); }).map(function(o){ return o.k+':'+o.n; }), tot:semanaDatos().tot }));
  chk('7 · revisado todo y pedido a producción lo que no hay: el botón deja de parpadear', c && !/qchip-alerta/.test(c.cls) && c.anim!=='qchip-alerta' && !/por revisar/.test(c.txt), c);
  chk('7 · «Para hacer» ya no tiene el rojo; queda el ámbar de lo que puede no llegar (pedido hoy para mañana)', JSON.stringify(r.k)===JSON.stringify(['semana-t:3']), r);
  await page.evaluate(()=>setQuick('semana')); r=await page.evaluate(()=>({ v:SEMANA_VER, al:!!document.querySelector('#adm-semana .sem-alerta'), rojo:document.querySelectorAll('#adm-semana .sem-dia-rojo').length }));
  chk('7 · al volver a tocarlo: sin cartel rojo ni días en rojo', !r.al && r.rojo===0 && r.v==='falta', r);
  chk('1-7 · sin errores en la página', A.errs.length===0, A.errs);
  await A.ctx.close();

  /* 8 · Fichas y celular */
  A=await abrir(browser, 1440, ()=>{ window.ADM_FICHAS_PRUEBA=1; }); page=A.page;
  await page.evaluate(()=>setQuick('semana')); await page.waitForTimeout(80);
  r=await page.evaluate(()=>[].map.call(document.querySelectorAll('#adm-fichas .af-gt'), function(x){ return x.textContent; }));
  chk('8 · en fichas, los grupos van de hoy hacia adelante', r.length>=4 && /jueves 29\/10/.test(r[0]) && /martes 03\/11/.test(r[r.length-1]), r);
  await A.ctx.close();
  A=await abrir(browser, 390); page=A.page;
  await page.evaluate(()=>setQuick('semana')); await page.waitForTimeout(80);
  r=await page.evaluate(()=>{ var s=document.getElementById('adm-semana'), b=s.getBoundingClientRect(); return { ancho:document.documentElement.scrollWidth, vp:innerWidth, der:Math.round(b.right) }; });
  chk('8 · en el celular (390 px) entra sin correr la página de costado', r.ancho<=r.vp && r.der<=r.vp, r);
  if(CAP){   // pantalla alta y la página corrida hasta los botones: así el encabezado y la barra de abajo no tapan nada
    await page.setViewportSize({ width:390, height:3200 });
    const bx=await page.evaluate(()=>{ var a=document.getElementById('adm-chips'), b=document.getElementById('adm-semana');
      var hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'))||120;
      window.scrollTo(0, a.getBoundingClientRect().top+scrollY-hh-4); var r1=a.getBoundingClientRect(), r2=b.getBoundingClientRect();
      return { x:0, y:Math.max(0,r1.top-4), width:390, height:r2.bottom-r1.top+12 }; });
    await page.waitForTimeout(120);
    await page.screenshot({ path:path.join(CAP,'semana-cel.png'), clip:bx });
  }
  chk('8 · sin errores en la página', A.errs.length===0, A.errs);
  await A.ctx.close();

  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
