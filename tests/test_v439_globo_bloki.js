/* 🎨 MEJORA 439: EL GLOBO DE BLOKI CON PIQUITO Y CUÁNTO LE QUEDA (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Antes el globo aparecía al costado de Bloki sin nada que lo uniera a él y se iba solo a los 7 s, sin aviso, a veces a mitad de
   leerlo. Ahora (`asisGlobo` → `glPoner`) tiene:
   · un piquito que apunta a Bloki (`::after`);
   · una rayita turquesa abajo que se acorta en el mismo tiempo que dura (`::before`, `--gl-ms`);
   · el texto «Tocá para ver ›», o «Tocá para ver cuáles ›» si abre una lista;
   · una pausa: con el mouse encima, la rayita se frena y el globo espera; al sacar el mouse sigue con el tiempo que le quedaba.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `GLOBO_PRUEBA` (Playwright) todo queda como antes: sin `.gl-v` ni «Tocá para ver», y se va a los 7 s.
   2. Con la bandera aparecen la clase, el piquito, la rayita con su tiempo y «Tocá para ver» («… cuáles» con lista; nada si es `solo`).
   3. Dura lo mismo que antes (7 s): no se va antes y se va a tiempo.
   4. Con el mouse encima no se va y la rayita se frena; al sacar el mouse sigue con lo que le quedaba.
   5. Tocarlo sigue abriendo los avisos (el `onclick` de siempre).
   Datos INVENTADOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v439_globo_bloki.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { window.ASIS_PRUEBA=1; if(o.flag) window.GLOBO_PRUEBA=1; try{ localStorage.clear(); sessionStorage.clear(); }catch(e){} }, o);
    await page.clock.install({ time:new Date('2026-11-16T10:00:00-04:00') });
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.clock.runFor(2500);                       // Bloki se monta 1,2 s después de cargar
    await page.evaluate(() => { CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
      try{ quienCerrar(); }catch(e){} try{ asisCerrar(); asisGloboOcultar(); }catch(e){} });
    await page.mouse.move(5, 5);
    /* el reloj de mentira avanza solo con el tiempo de verdad: se lo frena para que los 7 s se midan justo */
    const ahora = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(ahora + 200);
    page._ctx=ctx; return page;
  };
  const decir = (page, a, solo) => page.evaluate((x) => { asisGlobo(x.a, true, x.solo); }, { a, solo:!!solo });
  const leer = (page) => page.evaluate(() => {
    var gl=document.getElementById('asis-globo'); if(!gl) return { no:1 };
    var an=getComputedStyle(gl,'::after'), bf=getComputedStyle(gl,'::before'), ver=gl.querySelector('.gl-ver'), p=document.getElementById('asis-panel');
    return { visto:!gl.hidden && gl.offsetParent!==null, gv:gl.classList.contains('gl-v'), quieto:gl.classList.contains('gl-quieto'), ms:gl.style.getPropertyValue('--gl-ms'),
      ver:ver?ver.textContent:'', pico:an.content!=='none' && an.content!=='normal', picoBorde:an.borderLeftWidth, raya:bf.animationName, rayaPausa:bf.animationPlayState,
      texto:gl.textContent, panel:!!(p && !p.hidden) };
  });

  console.log('\n── 1. Sin la bandera, como antes ──');
  let page = await abrir({});
  await decir(page, { t:'Prueba de aviso', x:'Un texto inventado', k:'x1' });
  let r = await leer(page);
  chk('1a. sin `GLOBO_PRUEBA`: el globo aparece sin `.gl-v`, sin piquito ni «Tocá para ver»', r.visto && !r.gv && !r.ver && !r.pico, r);
  await page.clock.runFor(6800); r = await leer(page);
  chk('1b. a los 6,8 s sigue', r.visto, r);
  await page.clock.runFor(400); r = await leer(page);
  chk('1c. a los 7 s se va (como siempre)', !r.visto, r);
  await page._ctx.close();

  console.log('\n── 2. Con la bandera: piquito, rayita y «Tocá para ver» ──');
  page = await abrir({ flag:true });
  await decir(page, { t:'Prueba de aviso', x:'Un texto inventado', k:'x2' });
  r = await leer(page);
  chk('2a. con `GLOBO_PRUEBA`: el globo lleva `.gl-v` y el tiempo en `--gl-ms` (7000ms)', r.visto && r.gv && r.ms==='7000ms', r);
  chk('2b. el piquito hacia Bloki (::after con borde de 12 px)', r.pico && r.picoBorde==='12px', [r.pico, r.picoBorde]);
  chk('2c. la rayita del tiempo corre (::before con la animación gl-tiempo, sin pausa)', r.raya==='gl-tiempo' && r.rayaPausa==='running', [r.raya, r.rayaPausa]);
  chk('2d. dice «Tocá para ver» y el texto de siempre sigue', r.ver==='Tocá para ver' && /Prueba de aviso/.test(r.texto) && /Un texto inventado/.test(r.texto), r.texto);
  await decir(page, { t:'Con lista', x:'Otro texto', k:'x3', lista:1 });
  r = await leer(page);
  chk('2e. con lista dice «Tocá para ver cuáles» (un solo «Tocá…»)', r.ver==='Tocá para ver cuáles' && (r.texto.match(/Tocá/g)||[]).length===1, r.texto);
  await decir(page, { t:'Solo', x:'Se cierra al tocar', k:'x4' }, true);
  r = await leer(page);
  chk('2f. el globo `solo` (se cierra al tocarlo) no promete «Tocá para ver»', r.gv && !r.ver, r);
  await decir(page, { t:'Anuncio', x:'Anuncio inventado', k:'x5', anuncio:1, ms:15000 });
  r = await leer(page);
  chk('2g. el anuncio usa su propio tiempo (`a.ms`)', r.ms==='15000ms', r.ms);
  await page.evaluate(() => asisGloboOcultar());

  console.log('\n── 3. Dura lo mismo que antes ──');
  await decir(page, { t:'Tiempo', x:'Siete segundos', k:'x6' });
  await page.clock.runFor(6800); r = await leer(page);
  chk('3a. a los 6,8 s sigue', r.visto, r);
  await page.clock.runFor(400); r = await leer(page);
  chk('3b. a los 7 s se va', !r.visto, r);

  console.log('\n── 4. Con el mouse encima espera ──');
  await decir(page, { t:'Pausa', x:'Con el mouse encima', k:'x7' });
  await page.clock.runFor(3000);
  await page.hover('#asis-globo');
  r = await leer(page);
  chk('4a. con el mouse encima: `.gl-quieto` y la rayita frenada', r.quieto && r.rayaPausa==='paused', [r.quieto, r.rayaPausa]);
  await page.clock.runFor(12000); r = await leer(page);
  chk('4b. pasaron 15 s y el globo sigue (espera mientras lo leés)', r.visto, r);
  await page.mouse.move(5, 5);
  r = await leer(page);
  chk('4c. al sacar el mouse la rayita sigue', !r.quieto && r.rayaPausa==='running', [r.quieto, r.rayaPausa]);
  await page.clock.runFor(3800); r = await leer(page);
  chk('4d. sigue con lo que le quedaba (~4 s): a los 3,8 s todavía está', r.visto, r);
  await page.clock.runFor(400); r = await leer(page);
  chk('4e. y a los ~4 s se va', !r.visto, r);

  console.log('\n── 5. Tocarlo abre los avisos ──');
  await decir(page, { t:'Abrir', x:'Tocar abre', k:'x8' });
  await page.click('#asis-globo');
  await page.clock.runFor(200);
  r = await leer(page);
  chk('5a. tocar el globo abre la ventana de Bloki y el globo se va', r.panel && !r.visto, r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
