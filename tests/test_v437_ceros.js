/* 🎨 MEJORA 437 — LO QUE ESTÁ EN 0 SE VE APAGADO (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Un «0» competía con un «10». Ahora la ficha de arriba cuyo número es 0, la casilla de «Hoy» de Administración que es toda 0 y el filtro con 0
   quedan grises y sin su color; el filtro elegido nunca se apaga.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `CEROS_PRUEBA` (Playwright): nada apagado.
   2. Fichas: en ATC, «Por recoger 0» y «Entregadas 0» apagadas; «En fábrica 1» y «ATC en el período» no. «Bs 0,00» y «0 %» también cuentan
      como 0; «10», «Bs 0,50» no. Los números, los mismos.
   3. «Hoy» de Administración: «0 de 0» apagada; «0 de 2 pedidos listos» NO (ahí el 0 dice algo), ni las que tienen algo.
   4. Filtros: los que dicen 0 apagados; el elegido no, aunque diga 0; al elegir otro se vuelve a mirar.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v437_ceros.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  STATE=[{ id:'a1', oc:'ATC 11-011', vendedor:'Carola Chavez', cliente:'CLIENTE ATC', celular:'71001001', fecha:'2026-11-10', turno:'AM', zona:'SUR', direccion:'Calle 1',
           productos:[{ desc:'COLCHON INVENTADO', medida:'140x190', cant:1, atc:{ mot:'Hundimiento', det:'Se hunde en el centro', fcom:'2025-05-01', tipo:'gar' } }], ts:Date.parse('2026-11-08T10:00:00-04:00'), fotos:[] },
         { id:'p1', oc:'11-501', vendedor:'Carola Chavez', cliente:'CLIENTE HOY 1', celular:'70001001', fecha:'2026-11-16', turno:'AM', zona:'NORTE', direccion:'Calle 2',
           productos:[{ desc:'COLCHON INVENTADO', medida:'140x190', cant:1, precio:1000 }], saldo:0, acuenta:1000, pagado:true, metodoPago:'', entregado:false, ts:Date.parse('2026-11-14T10:00:00-04:00'), fotos:[] },
         { id:'p2', oc:'11-502', vendedor:'Maria Flores', cliente:'CLIENTE HOY 2', celular:'70001002', fecha:'2026-11-16', turno:'PM', zona:'SUR', direccion:'Calle 3',
           productos:[{ desc:'COLCHON INVENTADO', medida:'140x190', cant:1, precio:1000 }], saldo:0, acuenta:1000, pagado:true, metodoPago:'', entregado:false, ts:Date.parse('2026-11-14T11:00:00-04:00'), fotos:[] }];
  UNLOCKED=true; try{ document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display=''; }catch(e){}
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { window.ADM_TABS_PRUEBA=1; if(o.flag) window.CEROS_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  };
  const atc = (page) => page.evaluate(() => { showView('atc'); renderAtc(); return [].map.call(document.querySelectorAll('#atc-metrics .mc'), function(m){
    return { l:m.querySelector('.mc-lbl').textContent.trim(), v:m.querySelector('.mc-val').textContent.trim(), cero:!!m.querySelector('.mc-val.mc-v0'), op:getComputedStyle(m).opacity }; }); });
  const adm = (page) => page.evaluate(async () => { showView('admin'); setQuick('hoy'); renderAdmin(); try{ admHoyPintar(); }catch(e){} await new Promise(function(r){ setTimeout(r, 80); });
    return { st:[].map.call(document.querySelectorAll('#adm-hoy .ah-st'), function(x){ return { t:x.innerText.replace(/\s+/g,' ').trim(), cero:x.classList.contains('ah-st-cero') }; }),
      q:[].map.call(document.querySelectorAll('#adm-chips .qchip'), function(x){ return { t:x.innerText.replace(/\s+/g,' ').trim(), cero:x.classList.contains('q-cero'), on:x.classList.contains('active'), op:getComputedStyle(x).opacity }; }) }; });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  let a = await atc(page), d = await adm(page);
  chk('1a. sin `CEROS_PRUEBA`: nada apagado', a.every(x=>!x.cero && x.op==='1') && d.st.every(x=>!x.cero) && d.q.every(x=>!x.cero), { a, d });
  const antesA = a.map(x=>x.l+'='+x.v);
  await page._ctx.close();

  console.log('\n── 2-4. Con la bandera ──');
  page = await abrir({ flag:true });
  a = await atc(page);
  const por=k=>a.find(x=>x.l.indexOf(k)>=0)||{};
  chk('2a. «Por recoger 0» y «Entregadas 0» apagadas (gris)', por('Por recoger').cero && por('Entregadas').cero && +por('Entregadas').op<0.7, a);
  chk('2b. «En fábrica 1» y «ATC en el período 1» con su color', !por('En fábrica').cero && !por('ATC en el período').cero && por('En fábrica').op==='1', a);
  chk('2c. los números y los títulos, los mismos', JSON.stringify(a.map(x=>x.l+'='+x.v))===JSON.stringify(antesA), a.map(x=>x.l+'='+x.v));
  const u = await page.evaluate(() => ({ s:['0','Bs 0,00','Bs 0.00','0 %','<b>0</b>','10','Bs 0,50','1','—'].map(function(v){ return v+':'+ceroEs(v); }), t:['0','0<i> de 0</i>','0<i> de 2</i>','3<i> de 3</i>'].map(function(v){ return v+':'+ceroTodos(v); }) }));
  chk('2d. «0», «Bs 0,00», «0 %» son 0; «10», «Bs 0,50», «—» no', u.s.join(' ')==='0:true Bs 0,00:true Bs 0.00:true 0 %:true <b>0</b>:true 10:false Bs 0,50:false 1:false —:false', u.s);
  d = await adm(page);
  const st=k=>d.st.find(x=>x.t.indexOf(k)>=0)||{};
  chk('3a. «0 de 0 camiones salieron» apagada; «2 bultos por cargar» y «2 sin camión» no', st('camiones salieron').cero && /^📦 2 /.test(st('bulto').t) && !st('bulto').cero && !st('sin camión').cero, d.st);
  chk('3b. «0 de 2 pedidos listos» NO (ahí el 0 dice algo)', /0 de 2/.test(st('listos').t) && !st('listos').cero, st('listos'));
  const ceroQ=d.q.filter(x=>/ 0$/.test(x.t)), conQ=d.q.filter(x=>!/ 0$/.test(x.t));
  chk('4a. los filtros que dicen 0, apagados (y los que no, con su color)', ceroQ.filter(x=>!x.on).length>0 && ceroQ.filter(x=>!x.on).every(x=>x.cero && +x.op<0.7) && conQ.every(x=>!x.cero), d.q);
  const r = await page.evaluate(() => { var z=[].filter.call(document.querySelectorAll('#adm-chips .qchip'), function(x){ return /\b0$/.test((x.querySelector('.n')||{}).textContent||'') && !x.classList.contains('active'); })[0];
    var k=z && z.getAttribute('data-k'); if(k) setQuick(k); return new Promise(function(res){ setTimeout(function(){ var y=document.querySelector('#adm-chips .qchip[data-k="'+k+'"]'); res({ k:k, on:!!(y&&y.classList.contains('active')), cero:!!(y&&y.classList.contains('q-cero')), op:y?getComputedStyle(y).opacity:'' }); }, 100); }); });
  chk('4b. el filtro elegido no se apaga aunque diga 0', r.k && r.on && !r.cero && r.op==='1', r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
