/* 🗓️ (26/10) El botón «Semana» de Administración. El dueño, con captura de los filtros: *«acá debería haber un botón que muestre
   lo de la semana, lo que falta en la semana, y parpadee rojo si por ejemplo sabés que jueves hay entregas que aún dicen sin stock,
   así logística lo vería… siempre 5 días hábiles hacia adelante, desde el día en cuestión, no desde atrás»*.
   Reloj clavado en el JUEVES 29/10/2026 a las 09:00 de Bolivia: los 5 días son jue 29, vie 30, sáb 31, mar 03/11 y mié 04/11 (el
   domingo 01/11 no tiene camión y el lunes 02/11 es feriado, Todos Santos). Lo de ayer y lo del sexto día no entran.
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
      _ped('s01','2026-10-28','AM',[no()],Object.assign({ cliente:'AYER SIN STOCK' }, cam)),                         // ayer: no entra (no se mira para atrás)
      _ped('s02','2026-10-29','AM',[ok()],Object.assign({ cliente:'HOY LISTO', verificado:true }, cam)),
      _ped('s03','2026-10-30','AM',[no()],Object.assign({ cliente:'VIERNES FALTA' }, cam)),                          // 🔴 sin stock
      _ped('s04','2026-10-30','PM',[no({ enProd:true, prodF:'2026-10-28' })],Object.assign({ cliente:'VIERNES FABRICA' }, cam)),   // 🏭 ya pedido a fábrica
      _ped('s05','2026-10-31','AM',[_lin(_T,1)],{ cliente:'SABADO SIN REVISAR' }),                                  // ⬜ sin revisar + 🚛 sin camión
      _ped('s06','2026-11-02','AM',[no()],Object.assign({ cliente:'FERIADO' }, cam)),                                // en un feriado: no es día con camión
      _ped('s07','2026-11-03','AM',[_lin(_T,1,{ chk:'im' })],Object.assign({ cliente:'MARTES MORENO' }, cam)),        // 📥 ir a buscar
      _ped('s08','2026-11-04','AM',[ok(), _lin('|PROTECTOR DE COLCHON|160x190',1,{ chk:'no' })],Object.assign({ cliente:'MIERCOLES PROTECTOR' }, cam)),   // lo de tienda no cuenta
      _ped('s09','2026-11-05','AM',[no()],Object.assign({ cliente:'JUEVES QUE VIENE' }, cam)),                       // el 6° día: no entra
      _ped('s10','2026-10-30','AM',[_lin(_T,1)],Object.assign({ cliente:'VIERNES ATC', oc:'ATC 10-001' }, cam)),      // la ATC no lleva stock
      _ped('s11','2026-10-29','PM',[no()],Object.assign({ cliente:'HOY ENTREGADO', entregado:true }, cam)),          // ya entregado: no avisa
      _ped('s12','2026-10-31','AM',[no()],Object.assign({ cliente:'Mia Plaza', oc:'RPT 10-001' }, cam))              // 🔴 la RPT sale del stock
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
const chip=page=>page.evaluate(()=>{ var b=document.querySelector('#adm-chips .qchip[data-k="semana"]'); if(!b) return null;
  return { txt:b.textContent.replace(/\s+/g,' ').trim(), cls:b.className, title:b.getAttribute('title')||'', anim:getComputedStyle(b).animationName, n:(b.querySelector('.n')||{}).textContent }; });

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  /* 1 · Los días: 5 con camión, desde HOY hacia adelante */
  let A=await abrir(browser, 1440); let page=A.page;
  let r=await page.evaluate(()=>semanaDias());
  chk('1 · desde el jueves: jue 29, vie 30, sáb 31, mar 03 y mié 04 (sin el domingo ni el feriado del lunes 02/11)',
    JSON.stringify(r)===JSON.stringify(['2026-10-29','2026-10-30','2026-10-31','2026-11-03','2026-11-04']), r);
  const otros=await page.evaluate(async()=>{ var out={};
    var con=function(iso){ var f0=todayStr; todayStr=function(){ return iso; }; try{ return semanaDias(); } finally { todayStr=f0; } };
    out.sab=con('2026-10-31'); out.dom=con('2026-11-01'); out.fer=con('2026-11-02'); return out; });
  chk('1 · el sábado arranca ese sábado; el domingo y el feriado arrancan en el día siguiente con camión',
    otros.sab[0]==='2026-10-31' && otros.sab.length===5 && otros.dom[0]==='2026-11-03' && otros.fer[0]==='2026-11-03' && otros.dom.indexOf('2026-11-02')<0, otros);

  /* 2 · El botón: está, cuenta lo de los 5 días aunque el filtro diga «octubre», y parpadea en rojo */
  let c=await chip(page);
  if(CAP){ const bx=await page.evaluate(()=>{ var a=document.getElementById('adm-chips'); a.scrollIntoView(); var r=a.getBoundingClientRect(); return { x:Math.max(0,r.left-8), y:Math.max(0,r.top-6), width:r.width+16, height:r.height+12 }; });
    await page.screenshot({ path:path.join(CAP,'semana-boton.png'), clip:bx }); }
  chk('2 · el botón «🗓️ Semana» está al lado de Hoy y Mañana', !!c && /Semana/.test(c.txt), c);
  chk('2 · cuenta los 9 pedidos de los 5 días (también los de noviembre con el filtro en octubre; ni ayer, ni el feriado, ni el 6° día)', c && c.n==='9', c);
  chk('2 · parpadea en rojo y dice «🔴 2 sin stock»', c && /qchip-alerta/.test(c.cls) && c.anim==='qchip-alerta' && /🔴 2 sin stock/.test(c.txt), c);
  chk('2 · al pasar el mouse dice qué días y quiénes (viernes 30/10 y sábado 31/10)', c && /viernes 30\/10 \(1: VIERNES FALTA\)/.test(c.title) && /sábado 31\/10 \(1: Mia Plaza\)/.test(c.title), c && c.title);
  r=await page.evaluate(()=>!!document.getElementById('adm-semana').hidden);
  chk('2 · sin tocarlo, el resumen de la semana no se ve', r===true);

  /* 3 · Tocarlo: la lista con los 5 días, del más cercano al más lejos, y el resumen por día */
  await page.evaluate(()=>setQuick('semana')); await page.waitForTimeout(80);
  r=await ids(page);
  chk('3 · la lista: los 9 de los 5 días, de hoy hacia adelante (mañana antes que tarde)',
    JSON.stringify(r)===JSON.stringify(['s02','s11','s03','s10','s04','s05','s12','s07','s08']), r);
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
    return { vis:!document.getElementById('adm-semana').hidden, cab:T(document.querySelector('#adm-semana .sem-cab')), al:T(document.querySelector('#adm-semana .sem-alerta')), d:d }; });
  chk('3 · se ve el resumen: «Los próximos 5 días con camión», jueves 29/10 → miércoles 04/11', r.vis && /próximos 5 días con camión/.test(r.cab) && /jueves 29\/10 → miércoles 04\/11/.test(r.cab), r.cab);
  chk('3 · el cartel rojo: «2 pedidos dicen SIN STOCK», con el día y el cliente', /2 pedidos dicen SIN STOCK/.test(r.al) && /viernes 30\/10 \(1: VIERNES FALTA\)/.test(r.al), r.al);
  chk('3 · cinco fichas de día; la de hoy dice HOY y la de mañana MAÑANA', r.d.length===5 && /HOY/.test(r.d[0].t) && /MAÑANA/.test(r.d[1].t), r.d.map(x=>x.t.slice(0,30)));
  chk('3 · viernes: rojo, 3 pedidos, 1 sin stock y 1 en producción (la ATC no cuenta para el stock)', r.d[1].rojo && /3 pedidos/.test(r.d[1].t) && /1 sin stock/.test(r.d[1].t) && /1 en producción/.test(r.d[1].t) && !/sin revisar/.test(r.d[1].t), r.d[1]);
  chk('3 · sábado: rojo (la RPT), 1 sin revisar y 1 sin camión', r.d[2].rojo && /1 sin stock/.test(r.d[2].t) && /1 sin revisar/.test(r.d[2].t) && /1 sin camión/.test(r.d[2].t), r.d[2]);
  chk('3 · martes: 1 para ir a buscar, sin rojo', !r.d[3].rojo && /1 ir a buscar/.test(r.d[3].t), r.d[3]);
  chk('3 · miércoles: el protector «✗» no cuenta (es de tienda): «No le falta nada»', !r.d[4].rojo && /No le falta nada/.test(r.d[4].t), r.d[4]);
  chk('3 · hoy: lo entregado no avisa; «2 de 2 listos» y «1 entregado»', !r.d[0].rojo && /2 de 2 listos/.test(r.d[0].t) && /1 entregado/.test(r.d[0].t), r.d[0]);

  /* 4 · Lo que falta, por tipo y por día */
  r=await page.evaluate(()=>{ semanaVer('sin'); return true; }); r=await ids(page);
  chk('4 · «Ver solo esos» (sin stock): el del viernes y la RPT del sábado', JSON.stringify(r)===JSON.stringify(['s03','s12']), r);
  await page.evaluate(()=>semanaVer('falta')); r=await ids(page);
  chk('4 · «⚠️ Lo que falta»: sin stock, en producción, sin revisar/sin camión e ir a buscar (5)', JSON.stringify(r)===JSON.stringify(['s03','s04','s05','s12','s07']), r);
  await page.evaluate(()=>semanaDia('2026-10-30')); r=await ids(page);
  const bt=await page.evaluate(()=>[].map.call(document.querySelectorAll('#adm-semana .sem-v'), function(b){ return b.textContent.replace(/\s+/g,' ').trim()+(b.disabled?' (apagado)':'')+(b.classList.contains('on')?' (on)':''); }));
  chk('4 · tocar el viernes: solo lo que le falta al viernes', JSON.stringify(r)===JSON.stringify(['s03','s04']), r);
  chk('4 · los botones cuentan el día elegido y se puede volver a los 5 días', bt.some(x=>/^Todo 3/.test(x)) && bt.some(x=>/Lo que falta 2 \(on\)/.test(x)) && bt.some(x=>/Sin camión 0 \(apagado\)/.test(x)) && bt.some(x=>/Ver los 5 días/.test(x)), bt);
  await page.evaluate(()=>{ semanaVer('falta'); semanaDia('2026-10-30'); }); r=await ids(page);
  chk('4 · volver: «Todo» y los 5 días otra vez', r.length===9, r);

  /* 5 · «Para hacer» lo dice (la misma cuenta) */
  r=await page.evaluate(()=>admHacerDatos().filter(function(o){ return o.k==='semana'; })[0]||null);
  chk('5 · «📋 Para hacer» tiene el aviso rojo «Dicen SIN STOCK en los próximos 5 días» con «🗓️ Ver la semana»', r && r.sev==='r' && r.n===2 && /próximos 5 días/.test(r.t) && /Ver la semana/.test(r.b), r);
  await page.evaluate(()=>{ setQuick('cobrar'); }); await page.evaluate(()=>{ eval(admHacerDatos().filter(function(o){ return o.k==='semana'; })[0].fn); });
  r=await page.evaluate(()=>({ q:QUICK_FILTER, v:SEMANA_VER, vis:!document.getElementById('adm-semana').hidden }));
  const r2=await ids(page);
  chk('5 · su botón abre la semana con solo lo que dice sin stock', r.q==='semana' && r.v==='sin' && r.vis && JSON.stringify(r2)===JSON.stringify(['s03','s12']), { r, r2 });

  /* 6 · Otro botón esconde el resumen; tocar «Semana» de nuevo arranca de cero */
  await page.evaluate(()=>setQuick('hoy')); r=await page.evaluate(()=>!!document.getElementById('adm-semana').hidden);
  chk('6 · con otro filtro el resumen de la semana se esconde', r===true);
  await page.evaluate(()=>setQuick('semana')); r=await page.evaluate(()=>({ v:SEMANA_VER, d:SEMANA_DIA }));
  chk('6 · volver a tocar «Semana» arranca con todo (sin el día ni el tipo de antes)', r.v==='' && r.d==='', r);

  /* 7 · Se arregla el stock: deja de parpadear */
  await page.evaluate(()=>{ ['s03','s12'].forEach(function(id){ var p=findById(id); p.productos[0].chk='ok'; upsert(p); }); renderAdmin(); });
  c=await chip(page);
  r=await page.evaluate(()=>({ hacer:admHacerDatos().some(function(o){ return o.k==='semana'; }), al:!!document.querySelector('#adm-semana .sem-alerta'), rojo:document.querySelectorAll('#adm-semana .sem-dia-rojo').length }));
  chk('7 · sin nada «sin stock» en los 5 días: el botón no parpadea ni dice «sin stock»', c && !/qchip-alerta/.test(c.cls) && !/sin stock/.test(c.txt) && c.anim!=='qchip-alerta', c);
  chk('7 · ni cartel rojo, ni días en rojo, ni aviso en «Para hacer» (lo de ayer y el 6° día no cuentan)', !r.hacer && !r.al && r.rojo===0, r);
  chk('1-7 · sin errores en la página', A.errs.length===0, A.errs);
  await A.ctx.close();

  /* 8 · Fichas (como lo ve logística) y el celular */
  A=await abrir(browser, 1440, ()=>{ window.ADM_FICHAS_PRUEBA=1; }); page=A.page;
  await page.evaluate(()=>setQuick('semana')); await page.waitForTimeout(80);
  r=await page.evaluate(()=>[].map.call(document.querySelectorAll('#adm-fichas .af-gt'), function(x){ return x.textContent; }));
  chk('8 · en fichas, los grupos van de hoy hacia adelante (jueves, viernes, sábado, martes, miércoles)', r.length>=5 && /jueves 29\/10/.test(r[0]) && /miércoles 04\/11/.test(r[r.length-1]), r);
  if(CAP) await (await page.$('#admin-content')).screenshot({ path:path.join(CAP,'semana-fichas.png') });
  await A.ctx.close();
  A=await abrir(browser, 390); page=A.page;
  await page.evaluate(()=>setQuick('semana')); await page.waitForTimeout(80);
  r=await page.evaluate(()=>{ var s=document.getElementById('adm-semana'), b=s.getBoundingClientRect(); return { ancho:document.documentElement.scrollWidth, vp:innerWidth, der:Math.round(b.right) }; });
  chk('8 · en el celular (390 px) el resumen entra sin correr la página de costado', r.ancho<=r.vp && r.der<=r.vp, r);
  if(CAP){   // pantalla alta y la página corrida hasta los botones: así el encabezado y la barra de abajo no tapan nada
    await page.setViewportSize({ width:390, height:2600 });
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
