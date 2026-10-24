/* ✨ (24/10, dueño: «dependiendo del pedido queda un poco vacío… ¿cómo podemos optimizar, mejorar, estructurar y AUTOMATIZAR esto?»)
   La ficha de Administración: cada producto dice cuánto hay para ese pedido y de dónde (la MISMA cuenta de la 🤖 Revisión automática),
   «💡 Marcar …» por producto y «✨ Marcar … como dice el stock» para todo lo sin marcar; un pedido corto pone «Dónde» y «Camión» lado a
   lado; «Antes de cargar» sin nada para tildar es una línea; la nota que ya está toda arriba no se repite.
   Se corre:  node tests/test_ficha_auto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-23T15:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var ESP='CH1101|ESPECIAL SEMIORTOPEDICO|160x190', ORO='CH1300|COLCHON ORO ANATOMICO|160x190', SOM='CH1145|SOMIER ORO|160x190', ALM='CD1403|ALMOHADA|50x70';
    var v=_ped('v1','2026-10-24','AM',[_lin(ESP,1,{}), _lin('|PROTECTOR DE COLCHON|160x190',1,{})],{ cliente:'CLIENTE CORTO', maps:'https://www.google.com/maps?q=-17.80,-63.20', vehiculo:'Carry', chofer:'Luis Pierre', ts:_ts('2026-10-22','17:34:00') });
    var t=_ped('t1','2026-10-31','AM',[_lin(ORO,1,{}), _lin(SOM,1,{}), _lin(ALM,2,{ chk:'ok' })],{ cliente:'CLIENTE TRES', maps:'https://www.google.com/maps?q=-17.77,-63.14', ts:_ts('2026-09-26','17:45:00'), observaciones:'POR FAVOR LLAMAR ANTES' });
    var s=_ped('s1','2026-10-24','AM',[_lin(ESP,1,{ chk:'ok', chkDe:_BZ })],{ cliente:'CLIENTE ROHO', vendedor:'ROHO', maps:'https://www.google.com/maps?q=-17.79,-63.18', ts:_ts('2026-10-20','10:56:00'),
      observaciones:'Recibe: SANDRA SUAREZ · Importado del Excel de ROHO' });
    var n=_ped('n1','2026-10-25','AM',[_lin(SOM,1,{ chk:'ok' })],{ cliente:'CLIENTE NOTA', ts:_ts('2026-10-20','10:00:00'), maps:'https://www.google.com/maps?q=-17.78,-63.17', vehiculo:'Carry', chofer:'Luis Pierre', observaciones:'LO RECIBE EL SR. JUAN. PORTON VERDE AL LADO DE LA FARMACIA' });
    await _cargar([v,t,s,n], _stock(function(st){
      st.g[_BZ].u[_k('CH1101','ESPECIAL SEMIORTOPEDICO','160x190')]=3;
      st.g[_BZ].u[_k('CH1300','COLCHON ORO ANATOMICO','160x190')]=2;
      st.c.u[_k('CH1145','SOMIER ORO','160x190')]=3;
      st.g[_IM].u[_k('CD1403','ALMOHADA','50x70')]=6;
    }));
  });
  const ver=(id)=>page.evaluate(async(id)=>{
    closeModal(); showPedidoModal(id); await new Promise(r=>setTimeout(r,80));
    var box=document.getElementById('modal-box'), q=function(s){ return box.querySelector(s); };
    return { hay:[].map.call(box.querySelectorAll('.fl-hay'), function(e){ return e.textContent.replace(/\s+/g,' ').trim(); }),
      auto:q('.fl-auto') ? q('.fl-auto').textContent.trim() : '', tres:!!q('.fl-g.fl-tres'), obs:!!q('.fl-obs'), min:q('.fl-obs-min') ? q('.fl-obs-min').textContent.replace(/\s+/g,' ') : '',
      estIzq:!!q('.fl-izq .fl-est-abajo'), otras:box.querySelectorAll('.fl-hay-b.fl-hay-o').length };
  }, id);

  let r=await ver('v1');
  chk('1 · el producto dice cuánto hay para el pedido y de dónde, y propone «💡 Marcar ✔ Banzer»', r.hay.length===1 && /Stock para este pedido: .*Banzer 1/.test(r.hay[0]) && /Marcar ✔ .*Banzer/.test(r.hay[0]), r.hay);
  chk('1 · lo de tienda no tiene sugerencia (no es stock)', r.hay.length===1, r.hay.length);
  chk('2 · «✨ Marcar el producto como dice el stock» arriba de los productos', /Marcar el producto como dice el stock/.test(r.auto), r.auto);
  chk('3 · pedido corto: «Dónde» y «Camión» lado a lado (sin el hueco debajo de los productos)', r.tres, r);
  chk('3 · sin nota: no hay recuadro «Antes de cargar»', !r.obs, r.obs);

  r=await ver('t1');
  chk('4 · lo marcado a mano se respeta: «✨ Marcar los 2…» (solo lo sin marcar) y la almohada ✔ no propone nada', /Marcar los 2 como dice el stock/.test(r.auto) && r.hay.length===2 && !r.hay.some(h=>/IM/.test(h)), { auto:r.auto, hay:r.hay });
  const tras=await page.evaluate(async()=>{
    window._SAV=[]; var ap=apiSave; apiSave=function(rec){ window._SAV.push(rec.id); return ap(rec); };
    document.querySelector('#modal-box .fl-auto').click(); await new Promise(r=>setTimeout(r,80));
    var p=findById('t1');
    return { m:p.productos.map(function(x){ return [x.chk, x.chkDe||'']; }), sav:window._SAV, auto:!!document.querySelector('#modal-box .fl-auto'), abierta:document.getElementById('modal').classList.contains('on') };
  });
  chk('5 · «✨» marca el colchón «✔ Banzer» y el somier «✔ PTF» (el reparto de la revisión) y deja la almohada como estaba', tras.m[0][0]==='ok' && /Banzer/i.test(tras.m[0][1]) && tras.m[1][0]==='ok' && !tras.m[1][1] && tras.m[2][0]==='ok' && !tras.m[2][1], tras.m);
  chk('5 · lo guarda en la planilla y la ficha sigue abierta, sin el botón', tras.sav.indexOf('t1')>=0 && !tras.auto && tras.abierta, tras);
  const uno=await page.evaluate(async()=>{
    var p=findById('t1'); p.productos[2].chk=''; delete p.productos[2].chkDe; FICHA_REV=null; closeModal(); showPedidoModal('t1');
    var b=[].slice.call(document.querySelectorAll('#modal-box .fl-hay-b')).filter(function(x){ return /IM/.test(x.textContent); })[0]; if(!b) return null;
    var txt=b.parentNode.textContent; b.click(); await new Promise(r=>setTimeout(r,80)); var x=findById('t1').productos[2]; return { m:[x.chk, x.chkDe||''], txt:txt };
  });
  chk('6 · sin marcar, la almohada dice «IM 2» y «💡 Marcar 📥 recoger de IM» la marca', uno && uno.m[0]==='im' && /IM 2/.test(uno.txt), uno);

  r=await ver('s1');
  chk('7 · la nota de ROHO que ya está toda arriba («Recibe: …») no se repite', !r.obs && !r.min, r);
  chk('7 · un producto ya marcado no propone nada (se respeta lo de logística)', r.hay.length===0 && !r.auto, r.hay);

  r=await ver('n1');
  chk('8 · nota sin nada para tildar: UNA línea «📝 Nota del vendedor …» y no el recuadro grande', /Nota del vendedor/.test(r.min) && /PORTON VERDE/.test(r.min), r.min);

  const sinStock=await page.evaluate(async()=>{ var g=STOCK_CARGADO; STOCK_CARGADO=false; FICHA_REV=null; closeModal(); showPedidoModal('v1'); var n=document.querySelectorAll('#modal-box .fl-hay').length; STOCK_CARGADO=g; return n; });
  chk('9 · sin el stock cargado no propone nada', sinStock===0, sinStock);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
