/* 🧱 LAS FICHAS DE ADMINISTRACIÓN SIN HUECOS (15/11/2026, mejora 292; dueño: «aprobado»). Cada ficha toma su alto y la siguiente va
   debajo de la más corta: no queda blanco de relleno entre los productos y los botones. El orden sigue siendo por N° del día, de izquierda
   a derecha. Solo presentación: el mismo HTML de cada ficha.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): la grilla de siempre (ninguna columna armada).
   2. Con `AF_MASONRY_PRUEBA`: las mismas columnas que la grilla; las fichas de la primera fila arriba de todo en su orden (1, 2, 3, 4 de
      izquierda a derecha); cada una de las siguientes en la columna más baja en ese momento; entre ficha y ficha solo el espacio de siempre
      (12 px); nada encimado; están todas; el grupo ocupa menos alto que la grilla.
   3. Una ficha sigue abriendo su pedido al tocarla.
   4. Un grupo de una sola fila no se toca.
   5. Al cambiar el ancho de la ventana se rearma con las columnas que entran (y el orden vuelve a empezar por el N° del día).
   6. (16/11) También al cambiar el ancho de la LISTA sin cambiar la ventana: la ficha al costado (antes, 4 columnas de 102 px).
   Datos SINTÉTICOS. Reloj clavado: jueves 22/10/2026, 09:10 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_fichas_sin_huecos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errs=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
    if(flag) await page.addInitScript(() => { window.AF_MASONRY_PRUEBA=true; });
    await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(async()=>{
      window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
      var P=['CH1201|TITANIO ICE|160x190','CH1201|TITANIO ICE|160x190','CH1201|TITANIO ICE|160x190','CH1201|TITANIO ICE|160x190'];
      var lin=function(k){ var L=[]; for(var i=0;i<k;i++) L.push(_lin(P[i],1,{ chk:'ok' })); return L; };
      var largos=[4,1,1,3,1,2,1,1,4,1,2,1];   // productos de cada ficha: alturas bien distintas
      var ps=largos.map(function(k, i){ return _ped('a'+(i+1),'2026-10-22','AM',lin(k),{ cliente:'CLIENTE '+(i+1), nroDia:i+1, ts:_ts('2026-10-20', ('0'+(8+Math.floor(i/6))).slice(-2)+':'+('0'+(i*5%60)).slice(-2)+':00') }); });
      ps.push(_ped('b1','2026-10-24','AM',lin(1),{ cliente:'CLIENTE SABADO', ts:_ts('2026-10-20','12:00:00') }));
      ps.push(_ped('b2','2026-10-24','AM',lin(3),{ cliente:'CLIENTE SABADO DOS', ts:_ts('2026-10-20','12:10:00') }));
      await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
      document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
      showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
      await new Promise(function(x){ setTimeout(x, 200); });
    });
    page._ctx=ctx; return page;
  };
  /* cómo quedó: columnas, orden, huecos, encimadas */
  const medir = (page) => page.evaluate(() => {
    var g=document.querySelectorAll('#adm-fichas .af-cg')[0], g2=document.querySelectorAll('#adm-fichas .af-cg')[1];
    var cols=[].slice.call(g.querySelectorAll('.af-col'));
    var nom=function(f){ return (f.textContent.match(/CLIENTE (\d+)/)||[])[1]; };
    var porCol=cols.map(function(c){ return [].map.call(c.children, nom); });
    var hueco=0, enc=0, F=[].slice.call(g.querySelectorAll('.af-f')), R=F.map(function(f){ return f.getBoundingClientRect(); });
    cols.forEach(function(c){ var rr=[].map.call(c.children, function(x){ return x.getBoundingClientRect(); }); for(var i=1;i<rr.length;i++){ var d=rr[i].top-rr[i-1].bottom; if(Math.abs(d-12)>1) hueco++; } });
    for(var i=0;i<R.length;i++) for(var j=i+1;j<R.length;j++){ var a=R[i], b=R[j]; if(a.left<b.right-1 && b.left<a.right-1 && a.top<b.bottom-1 && b.top<a.bottom-1) enc++; }
    /* lo que debería ser: cada ficha (en su orden) a la columna más baja */
    var H=[], idx=F.map(function(f){ return f._afI; });
    var esperado=null;
    if(cols.length){ var alto=cols.map(function(){ return 0; }), ex=cols.map(function(){ return []; });
      F.slice().sort(function(a,b){ return a._afI-b._afI; }).forEach(function(f){ var k=0; for(var c=1;c<alto.length;c++) if(alto[c]<alto[k]-1) k=c; ex[k].push(nom(f)); alto[k]+=f.offsetHeight+12; });
      esperado=ex; }
    var track=String(getComputedStyle(g).gridTemplateColumns);
    return { mz:g.classList.contains('af-mz'), cols:cols.length, porCol:porCol, esperado:esperado, hueco:hueco, enc:enc, n:F.length, alto:Math.round(g.getBoundingClientRect().height),
      g2:!!g2 && g2.classList.contains('af-mz'), g2n:g2 ? g2.querySelectorAll('.af-f').length : 0 };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  const sin = await medir(page);
  const altoGrilla = sin.alto;
  chk('1 sin bandera: la grilla de siempre (ninguna columna armada)', !sin.mz && sin.cols===0 && sin.n===12, sin);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  let r = await medir(page);
  chk('2a 4 columnas (las mismas que la grilla a 1366), las 12 fichas', r.mz && r.cols===4 && r.n===12, r);
  chk('2b la primera fila arriba de todo y en su orden: 1, 2, 3, 4 de izquierda a derecha', r.porCol.map(c=>c[0]).join(',')==='1,2,3,4', r.porCol);
  chk('2c cada una de las siguientes en la columna más baja en ese momento', JSON.stringify(r.porCol)===JSON.stringify(r.esperado), { hay:r.porCol, va:r.esperado });
  chk('2d entre ficha y ficha solo el espacio de siempre; nada encimado', r.hueco===0 && r.enc===0, r);
  chk('2e el grupo ocupa menos alto que la grilla de siempre', r.alto<altoGrilla, [r.alto, altoGrilla]);
  chk('4 un grupo de una sola fila (el sábado, 2 fichas) no se toca', r.g2===false && r.g2n===2, r);
  const abre = await page.evaluate(() => { var f=[].filter.call(document.querySelectorAll('#adm-fichas .af-f'), function(x){ return (x.textContent.match(/CLIENTE (\d+)/)||[])[1]==='5'; })[0]; if(!f) return 'sin ficha';
    var orig=showPedidoModal, id=null; showPedidoModal=function(x){ id=x; }; f.click(); showPedidoModal=orig; return id; });
  chk('3 una ficha sigue abriendo su pedido al tocarla', abre==='a5', abre);

  await page.setViewportSize({ width:900, height:900 }); await page.waitForTimeout(500);
  r = await medir(page);
  chk('5a más angosta (900): se rearma en 2 columnas, con el orden del N° del día', r.mz && r.cols===2 && r.porCol.map(c=>c[0]).join(',')==='1,2' && JSON.stringify(r.porCol)===JSON.stringify(r.esperado) && r.n===12 && r.hueco===0 && r.enc===0, r.porCol);
  await page.setViewportSize({ width:1366, height:900 }); await page.waitForTimeout(500);
  r = await medir(page);
  chk('5b de vuelta a 1366: 4 columnas otra vez, 1-2-3-4 arriba', r.cols===4 && r.porCol.map(c=>c[0]).join(',')==='1,2,3,4' && r.n===12, r.porCol);

  /* 6 (16/11) la ficha al costado achica la LISTA sin cambiar la ventana: las columnas se rehacen igual (antes quedaban 4 de 102 px) */
  const angosta = () => page.evaluate(() => { var F=[].slice.call(document.querySelectorAll('#adm-fichas .af-cg')[0].querySelectorAll('.af-f'));
    return { min:Math.round(Math.min.apply(null, F.map(function(f){ return f.getBoundingClientRect().width; }))), lista:document.getElementById('adm-fichas').clientWidth, costado:document.body.classList.contains('ficha-costado') }; });
  await page.evaluate(() => { window.FICHA_COSTADO_PRUEBA=1; showPedidoModal('a5'); }); await page.waitForTimeout(700);
  r = await medir(page); let w = await angosta();
  chk('6a con la ficha al costado la lista se achica y las fichas no quedan angostas (una columna, ninguna de menos de 280 px)', w.costado && w.lista<700 && w.min>=280 && r.cols<=1 && r.n===12, [w, r.cols]);
  await page.evaluate(() => { closeModal(); }); await page.waitForTimeout(700);
  r = await medir(page); w = await angosta();
  chk('6b al cerrarla vuelven las 4 columnas, 1-2-3-4 arriba', !w.costado && r.cols===4 && r.porCol.map(c=>c[0]).join(',')==='1,2,3,4' && r.n===12, [w, r.porCol]);
  await page._ctx.close();

  chk('sin errores de la página', errs.length===0, errs.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
