/* 🎨 (16/11/2026, mejoras 408 y 409; el dueño las eligió) Stock y reposición:
   408 · el Plan de stock: «Hay» con los tres depósitos como pastillas con nombre y color (PTF · Banzer · Moreno, las de 0 en gris) y el
         reclamo de lo pedido que no llegó en UNA pastilla «⏳ N pedidas el dd/mm no llegaron · reclamá» (antes salía dos veces).
   409 · los Excel del día como casilleros: «✓ PTF 10:05» verde, «✗ Banzer 14/11» rojo; «Excel del día · falta 1» o «Los 3 Excel de hoy ✓».

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `PLAN_COLOR_PRUEBA` ni `EXCEL3_PRUEBA` (Playwright): «0 · 0 · 0», los dos avisos de siempre y la tarjeta «Subir los Excel del día».
   2. 408 con la bandera: las pastillas con los MISMOS números (o.deposito, o.enSale, o.enOtros); el reclamo una vez, con los textos enteros
      en el `title`; la casilla «Ya pedí» sigue.
   3. 409 con la bandera: un casillero por almacén con su día u hora; el título cuenta los que faltan; roja solo si falta alguno; la ficha
      «Stock y reposición» de Administración con los mismos casilleros.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:30. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v408_409_stock.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-16T10:30:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true; window.STK_TOP_PRUEBA=1;
    var ps=[ _ped('a1','2026-11-18','AM',[_lin(_T,1,{})],{ ts:_ts('2026-11-12','09:00:00') }) ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=3; s.g[_IM].u[_K]=2; s.g[_BZ].u[_K2]=1;
      s.p.push({ id:'y1', k:_K, u:5, f:'2026-10-27', ya:1, tipo:'fabrica', fab:'MORENO', t:_ts('2026-10-27','09:00:00') }); }));
  });
  const plan=()=>page.evaluate(()=>{ var d=stockData(), o=d.lista.filter(function(x){ return x.k===_K; })[0]; if(!o) return { err:'sin fila' };
    var box=document.createElement('div'); box.innerHTML='<table>'+stockPlanHtml(d, d.lista)+'</table>';
    var tr=box.querySelector('tr.pl-fila[data-k="'+CSS.escape(_K)+'"]'), hay=tr ? tr.querySelector('td.pl-hay') : null;
    var ya=document.createElement('div'); ya.innerHTML=planYaHtml(Object.assign({}, o, { fabricar:4, aviso:'urgente', descont:false }));
    return { o:{ dep:o.deposito, sale:o.enSale, otros:o.enOtros }, hay:hay ? hay.textContent.replace(/\s+/g,' ') : '', pld:hay ? [].map.call(hay.querySelectorAll('.pld span'), function(s){ return s.className+':'+s.textContent.replace(/\s+/g,' '); }) : [],
      venc:ya.querySelectorAll('.pl-ya-venc').length, recl:ya.querySelectorAll('.pl-ya-reclamar').length, rec:[].map.call(ya.querySelectorAll('.pld-rec'), function(s){ return { t:s.textContent.replace(/\s+/g,' '), tit:s.getAttribute('title') }; }),
      chk:[].map.call(ya.querySelectorAll('.pl-ya-chk'), function(s){ return s.textContent.trim(); }) }; });
  const tarjeta=()=>page.evaluate(()=>{ stkTopPintar(stockData()); var t=document.querySelector('#stk-top .s3-ex'); try{ admSecsPintar(); }catch(e){}
    var a=document.querySelector('#adm-secs .as-stk');
    return { tit:t ? t.querySelector('.s3-tx b').textContent : '', txt:t ? t.textContent.replace(/\s+/g,' ') : '', mal:t ? t.classList.contains('s3-mal') : null,
      chips:t ? [].map.call(t.querySelectorAll('.ex3 > span'), function(s){ return s.className+':'+s.textContent.replace(/\s+/g,' ').trim(); }) : [],
      adm:a ? [].map.call(a.querySelectorAll('.ex3 > span'), function(s){ return s.textContent.replace(/\s+/g,' ').trim(); }) : null }; });

  console.log('\n── 1. Sin las banderas ──');
  let r=await plan();
  chk('1a «Hay»: el total y «3 · 0 · 2» como siempre, sin pastillas', /3 · 0 · 2/.test(r.hay) && !r.pld.length, r);
  chk('1b los dos avisos de siempre (el párrafo «Ya pedí…» y «Hay 5 pedidas…»)', r.venc===1 && r.recl===1 && !r.rec.length, r);
  let t=await tarjeta();
  chk('1c la tarjeta de siempre: «Subir los Excel del día»', /Subir los Excel del día/.test(t.tit) && !t.chips.length, t);

  console.log('\n── 2. 408 con la bandera ──');
  await page.evaluate(()=>{ window.PLAN_COLOR_PRUEBA=1; });
  r=await plan();
  chk('2a tres pastillas con nombre: PTF 3 · Banzer 0 (gris) · Moreno 2 — los mismos números', r.pld.join('|')==='pld-ptf:PTF 3|pld-bz cero:Banzer 0|pld-mo:Moreno 2' && r.o.dep===3 && r.o.otros===2, r);
  chk('2b el reclamo UNA vez: «⏳ 5 pedidas el 27/10 no llegaron · reclamá» y sin los dos avisos de antes', r.rec.length===1 && /⏳ 5 pedidas el 27\/10 no llegaron · reclamá/.test(r.rec[0].t) && r.venc===0 && r.recl===0, r);
  chk('2c al pasar el mouse, los dos textos enteros', /Ya pedí 5 el 27\/10/.test(r.rec[0].tit) && /reclamá antes de pedir más/.test(r.rec[0].tit), r.rec[0].tit);
  chk('2d la casilla «Ya pedí 4» sigue', r.chk.some(c=>/Ya pedí 4/.test(c)), r.chk);

  console.log('\n── 3. 409 con la bandera ──');
  await page.evaluate(()=>{ window.EXCEL3_PRUEBA=1; STOCK.g[_BZ].f='2026-11-14'; });
  t=await tarjeta();
  chk('3a «Excel del día · falta 1», en rojo', t.tit==='Excel del día · falta 1' && t.mal===true, t);
  chk('3b un casillero por almacén: ✓ PTF 10:05 · ✗ Banzer 14/11 · ✓ el de IM', t.chips.length===3 && /ex3-ok:✓PTF 10:05/.test(t.chips[0]) && t.chips.some(c=>/ex3-no:✗Banzer 14\/11/.test(c)) && t.chips.filter(c=>/ex3-ok/.test(c)).length===2, t.chips);
  chk('3c la ficha «Stock y reposición» de Administración, con los mismos casilleros', t.adm && t.adm.length===3 && t.adm.some(c=>/Banzer 14\/11/.test(c)), t.adm);
  await page.evaluate(()=>{ STOCK.g[_BZ].f='2026-11-16'; });
  t=await tarjeta();
  chk('3d con los tres de hoy: «Los 3 Excel de hoy ✓», sin rojo', t.tit==='Los 3 Excel de hoy ✓' && t.mal===false, t);
  await page.evaluate(()=>{ STOCK.c.f='2026-11-14'; STOCK.g[_BZ].f='2026-11-14'; STOCK.g[_IM].f='2026-11-14'; });
  t=await tarjeta();
  chk('3e los tres del sábado: «falta n 3» y los tres en rojo con su día', t.tit==='Excel del día · faltan 3' && t.chips.every(c=>/ex3-no/.test(c) && /14\/11/.test(c)), t);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
