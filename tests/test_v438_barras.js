/* 🎨 MEJORA 438 — BARRAS, CASILLAS Y LO MARCADO CON LOS COLORES DEL PANEL (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   En Windows la barra para bajar era la gris de siempre (17 px) y con Black Friday una franja blanca a la derecha; las casillas tildadas
   salían en el azul de Chrome y lo marcado en azul. Ahora: barra fina y redondeada turquesa (en los temas oscuros, la de la página negra con
   dorado), casillas tildadas en turquesa (doradas en los oscuros) y lo marcado en turquesa suave (dorado).

   LO QUE ESTA PRUEBA CUIDA (Chromium SIN `--hide-scrollbars`, para que la barra exista):
   1. Sin la bandera `BARRAS_PRUEBA` (Playwright): todo como el navegador (barra de 15 px, casillas sin color propio).
   2. Con la bandera y Espuma: la barra de la página de 12 px, casillas turquesa, lo marcado turquesa suave.
   3. Con Black Friday: casillas doradas y lo marcado dorado; la barra de la página negra con dorado (la de adentro sigue turquesa).
   Datos INVENTADOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v438_barras.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], ignoreDefaultArgs:['--hide-scrollbars'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { if(o.flag) window.BARRAS_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + (o.q||'?tema=espuma'), { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(() => { CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){} loadFromServer=function(){};
      var d=document.createElement('div'); d.id='__prueba'; d.innerHTML='<input type="checkbox" id="__cb" checked><input type="radio" id="__rb" checked><span id="__tx">texto para marcar</span><div id="__caja" style="height:60px;overflow:auto"><div style="height:400px">x</div></div>';
      document.querySelector('.wrap').appendChild(d); });
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => {
    var cs=function(id, p){ return getComputedStyle(document.getElementById(id), p||null); };
    var caja=document.getElementById('__caja');
    return { barra:innerWidth-document.documentElement.clientWidth, caja:caja.offsetWidth-caja.clientWidth, cb:cs('__cb').accentColor, rb:cs('__rb').accentColor, sel:cs('__tx','::selection').backgroundColor,
      marca:document.documentElement.classList.contains('v-barras'), raiz:getComputedStyle(document.documentElement,'::-webkit-scrollbar-thumb').backgroundColor,
      dentro:getComputedStyle(caja,'::-webkit-scrollbar-thumb').backgroundColor };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  let r = await leer(page);
  chk('1a. sin `BARRAS_PRUEBA`: como el navegador (sin la marca, barra de 15 px, casillas sin color propio)', !r.marca && r.barra===15 && r.cb==='auto', r);
  await page._ctx.close();

  console.log('\n── 2. Espuma, con la bandera ──');
  page = await abrir({ flag:true });
  r = await leer(page);
  chk('2a. la barra de la página fina: 12 px (y la de adentro también)', r.marca && r.barra===12 && r.caja===12, r);
  chk('2b. la barra turquesa clara', /rgb\(159, 217, 213\)/.test(r.raiz) && /rgb\(159, 217, 213\)/.test(r.dentro), [r.raiz, r.dentro]);
  chk('2c. casillas y opciones tildadas en turquesa', r.cb==='rgb(0, 160, 154)' && r.rb==='rgb(0, 160, 154)', [r.cb, r.rb]);
  chk('2d. lo marcado en turquesa suave', /rgba\(0, 181, 173, 0\.3\)/.test(r.sel), r.sel);
  await page._ctx.close();

  console.log('\n── 3. Black Friday, con la bandera ──');
  page = await abrir({ flag:true, q:'?tema=black-friday' });
  r = await leer(page);
  chk('3a. casillas doradas y lo marcado dorado', r.cb==='rgb(212, 165, 10)' && /rgba\(250, 204, 21, 0\.42\)/.test(r.sel), [r.cb, r.sel]);
  chk('3b. la barra de la página negra con dorado; la de adentro sigue turquesa', /rgb\(138, 115, 21\)/.test(r.raiz) && /rgb\(159, 217, 213\)/.test(r.dentro), [r.raiz, r.dentro]);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
