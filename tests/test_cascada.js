/* 🌊 LAS FICHAS ENTRAN EN CASCADA Y LA CINTA DE STOCK SIN CORTES (15/11/2026, mejora 293; dueño: «ok»). Al cambiar de filtro, las fichas
   de Administración y las tarjetas de Mis pedidos entran de a una (35 ms entre cada una, de la 20 en adelante juntas). La cinta «Hoy» de
   Stock se desvanece en los bordes y se frena con el mouse. Solo presentación.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): nada entra en cascada y la cinta queda como siempre.
   2. Con `CASCADA_PRUEBA`, Administración: la primera vez no; al cambiar de filtro (Hoy → Mañana → Todos) sí, de a una en el orden del N° del
      día (0, 1, 2…) y con tope en 20; al terminar se limpia (sin la clase ni la variable).
   3. El mismo filtro redibujado (la lectura de cada minuto) y escribir en el buscador: sin cascada.
   4. Mis pedidos: al tocar un chip sí; redibujado igual, no.
   5. Con «reducir movimiento» de Windows: nada se mueve.
   6. La cinta: con productos que corren, la máscara de los bordes; sin correr, no; con el mouse encima, se frena.
   Datos SINTÉTICOS. Reloj clavado: jueves 22/10/2026, 09:10 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_cascada.js */
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
  const abrir = async (flag, reducir) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz', reducedMotion:reducir?'reduce':'no-preference' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
    if(flag) await page.addInitScript(() => { window.CASCADA_PRUEBA=true; });
    await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(async()=>{
      window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
      var L=function(){ return [_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'ok' })]; };
      var ps=[];
      for(var i=1;i<=24;i++) ps.push(_ped('h'+i,'2026-10-22', i%2?'AM':'PM', L(), { cliente:'CLIENTE HOY '+i, ts:_ts('2026-10-20','09:'+('0'+i).slice(-2)+':00') }));
      for(var j=1;j<=3;j++) ps.push(_ped('m'+j,'2026-10-23','AM', L(), { cliente:'CLIENTE MANANA '+j, ts:_ts('2026-10-20','11:0'+j+':00') }));
      await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
      document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
      showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); ADM_HOY_DEF=false; QUICK_FILTER=''; renderAdmin();
    });
    page._ctx=ctx; return page;
  };
  const enCascada = (page, sel) => page.evaluate((sel) => { var L=[].slice.call(document.querySelectorAll(sel));
    return { n:L.length, cc:L.filter(function(x){ return x.classList.contains('cc-in'); }).length, i:L.slice(0,4).map(function(x){ return x.style.getPropertyValue('--cc-i'); }).concat(L.length>22 ? [L[22].style.getPropertyValue('--cc-i')] : []),
      anim:L[0] ? getComputedStyle(L[0]).animationName : '', delay1:L[1] ? getComputedStyle(L[1]).animationDelay : '' }; }, sel);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  await page.evaluate(() => { setQuick('hoy'); });
  let r = await enCascada(page, '#adm-fichas .af-f');
  const cc0 = await page.evaluate(() => document.documentElement.classList.contains('cc-on'));
  chk('1 sin bandera: al cambiar de filtro nada entra en cascada (y la cinta como siempre)', r.n>0 && r.cc===0 && !cc0, r);
  await page._ctx.close();

  console.log('\n── 2-4. Con la bandera ──');
  page = await abrir(true);
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('2a la primera vez (al abrir) no hay cascada', r.n>0 && r.cc===0, r);
  await page.evaluate(() => { setQuick('hoy'); });
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('2b al cambiar a «Hoy»: todas entran de a una, en el orden del día (0, 1, 2, 3…) y desde la 20 juntas', r.n===24 && r.cc===24 && r.i.slice(0,4).join(',')==='0,1,2,3' && r.i[4]==='20' && r.anim==='ccEntra' && r.delay1==='0.035s', r);
  await page.waitForTimeout(1600);
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('2c al terminar se limpia (sin la clase ni la variable)', r.cc===0 && r.i.every(x=>x===''), r);
  await page.evaluate(() => { renderAdmin(); });
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('3a el mismo filtro redibujado (la lectura de cada minuto): sin cascada', r.cc===0, r);
  await page.evaluate(() => { var i=document.getElementById('adm-search'); i.value='CLIENTE HOY 1'; i.dispatchEvent(new Event('input', { bubbles:true })); });
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('3b escribir en el buscador: sin cascada', r.cc===0 && r.n>0, r);
  await page.evaluate(() => { var i=document.getElementById('adm-search'); i.value=''; i.dispatchEvent(new Event('input', { bubbles:true })); setQuick('manana'); });
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('2d Hoy → Mañana: las 3 de mañana en cascada', r.n===3 && r.cc===3, r);

  r = await page.evaluate(async () => { showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value='Maria Flores'; renderMis(); await new Promise(function(x){ setTimeout(x, 100); });
    var a=document.querySelectorAll('#mis-lista .cho-card.cc-in').length;
    setMisFiltro('hoy'); var b=document.querySelectorAll('#mis-lista .cho-card.cc-in').length, n=document.querySelectorAll('#mis-lista .cho-card').length;
    await new Promise(function(x){ setTimeout(x, 1600); });
    renderMis(); var c=document.querySelectorAll('#mis-lista .cho-card.cc-in').length;
    return { a:a, b:b, n:n, c:c }; });
  chk('4 Mis pedidos: la primera vez no; al tocar un chip sí (todas); redibujado igual, no', r.a===0 && r.n>0 && r.b===r.n && r.c===0, r);

  console.log('\n── 6. La cinta de Stock ──');
  r = await page.evaluate(() => {
    var d=document.createElement('div'); d.id='cc-cinta';
    d.innerHTML='<div class="ci-caja" id="stk-cinta-p"><div class="ci-cinta"><div class="ci-carril" id="cc-c1" style="width:300px"><div class="ci-van corre" style="--dur:40s"><button>COLCHON TITANIO ICE 140</button><button>SOMIER ORO 140</button><button>COLCHON SOFT 160</button></div></div></div>'+
      '<div class="ci-cinta"><div class="ci-carril" id="cc-c2"><div class="ci-van"><button>UNO</button></div></div></div></div>';
    document.getElementById('view-mis').appendChild(d);
    var m=function(id){ var cs=getComputedStyle(document.getElementById(id)); return cs.maskImage||cs.webkitMaskImage||''; };
    return { corre:m('cc-c1'), quieta:m('cc-c2') }; });
  chk('6a la que corre se desvanece en los bordes; la que no corre, no', /linear-gradient/.test(r.corre) && !/linear-gradient/.test(r.quieta), r);
  await page.hover('#cc-c1'); await page.waitForTimeout(100);
  r = await page.evaluate(() => getComputedStyle(document.querySelector('#cc-c1 .ci-van')).animationPlayState);
  chk('6b con el mouse encima de la cinta, se frena', r==='paused', r);
  await page._ctx.close();

  console.log('\n── 5. Reducir movimiento ──');
  page = await abrir(true, true);
  await page.evaluate(() => { setQuick('hoy'); });
  r = await enCascada(page, '#adm-fichas .af-f');
  chk('5 con «reducir movimiento»: nada entra en cascada', r.n===24 && r.cc===0, r);
  await page._ctx.close();

  chk('sin errores de la página', errs.length===0, errs.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
