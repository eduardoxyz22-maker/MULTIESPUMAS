/* 📏 EL ENCABEZADO EN UN SOLO RENGLÓN (17/11/2026; captura del dueño desde el iPad: «En el iPad se ve así arriba»).

   En el iPad acostado instalado (1180 × ~790: entra en «el encabezado bajo» de la 378), con la meta del mes al lado del día, «Buscar», «💬 Chat»
   y la campanita, el renglón no alcanzaba y los anillos de los cupos bajaban a un segundo renglón, a la izquierda: el encabezado quedaba MÁS
   alto (193 px) en vez de más bajo. `hdrCompactar` (desde `hdrMedir`) achica de a un paso hasta que todo entra en uno.

   LO QUE ESTA PRUEBA CUIDA:
   1. El caso del dueño (1180 × 790, Black Friday, con la contraseña, chat y meta chica): los anillos en el MISMO renglón que el nombre, el día
      a la vista, `--hdr-h` = el alto, y el encabezado más bajo que sin achicar (con los anillos abajo).
   2. El orden: primero sin «Ctrl K», después «Buscar» y «Chat» en círculo, después la meta sin barrita, después la cuenta de Black Friday
      (la 434) y recién al final el día.
   3. Lo que entra después (el botón del chat) también se acomoda solo (sin cambiar el tamaño de la ventana).
   4. Al agrandar la ventana vuelve todo («Ctrl K», «Buscar» con su nombre); en una pantalla ancha no se achica nada.
   5. En el celular (≤ 560 px) no se mete: tiene su propio arreglo.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 19:59 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_hdr_un_renglon.js */
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
  STATE=[filaSistema(META_ID, 'x', JSON.stringify({ v:1, m:{ '2026-11':{ heaven:300000, suena:250000, t:1 } } }))];
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, h, o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { window.HDR_BAJO_PRUEBA=1; window.HDR_META_PRUEBA=1; window.CUENTA_PRUEBA=1; if(o.chat!==false) window.CHAT_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T19:59:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    await page.evaluate((chat) => { UNLOCKED=true; updateStats(); var c=document.getElementById('cht-btn'); if(c && chat) c.hidden=false; }, o.chat!==false);
    await page.waitForTimeout(400);
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => {
    var hi=document.querySelector('.header-in'), lg=hi.querySelector('.logo'), lb=lg.getBoundingClientRect();
    var vis=function(e){ return !!e && !e.hidden && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().width>0; };
    var abajo=[].filter.call(hi.children, function(c){ return c!==lg && vis(c) && getComputedStyle(c).position!=='absolute' && c.getBoundingClientRect().top>=lb.bottom-2; })
      .map(function(c){ return c.id||c.className.split(' ')[0]; });
    var an=document.getElementById('h-anillos').getBoundingClientRect(), pb=document.getElementById('pal-btn'), ch=document.getElementById('cht-btn'), cu=document.getElementById('hdr-cuenta');
    return { abajo:abajo, anTop:Math.round(an.top), anX:Math.round(an.left), logoBottom:Math.round(lb.bottom), hd:Math.round(document.querySelector('.header').getBoundingClientRect().height),
      hh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')), comp:HDR_COMP, bajo:document.documentElement.classList.contains('hdr-bajo'),
      dia:vis(document.querySelector('.htitle')), kbd:vis(document.querySelector('.pal-kbd')), palW:Math.round(pb.getBoundingClientRect().width),
      chat:vis(ch), chatT:vis(document.querySelector('.cht-btn-t')), mini:vis(document.getElementById('hdr-meta-mini')), barrita:vis(document.querySelector('.hmm-bar')),
      cuenta:vis(cu), cuentaCls:cu ? cu.className : '' };
  });

  console.log('\n── 1. El iPad del dueño: 1180 × 790 ──');
  let page = await abrir(1180, 790);
  let r = await leer(page);
  chk('1a. es el encabezado bajo (378), con la meta chica, el chat y la cuenta de Black Friday', r.bajo && r.mini && r.chat && r.cuenta, r);
  chk('1b. nada baja a un segundo renglón: los anillos al lado, a la derecha', !r.abajo.length && r.anTop < r.logoBottom && r.anX > 900, r);
  chk('1c. el día sigue a la vista (lo último que se esconde)', r.dia, r);
  chk('1d. `--hdr-h` = el alto del encabezado', Math.abs(r.hh-r.hd)<=1, r);
  const sinAchicar = await page.evaluate(() => { hdrCompPoner(0); var hd=Math.round(document.querySelector('.header').getBoundingClientRect().height), an=document.getElementById('h-anillos').getBoundingClientRect(), lg=document.querySelector('.header-in .logo').getBoundingClientRect(); hdrCompactar(true); return { hd:hd, anTop:Math.round(an.top), logoBottom:Math.round(lg.bottom) }; });
  chk('1e. sin achicar los anillos bajaban (lo de la captura) y el encabezado era más alto: '+sinAchicar.hd+' → '+r.hd+' px', sinAchicar.anTop>=sinAchicar.logoBottom && r.hd < sinAchicar.hd-30, [sinAchicar, r.hd]);

  console.log('\n── 2. El orden ──');
  const pasos = await page.evaluate(() => { var o=[]; for(var n=0;n<=7;n++){ hdrCompPoner(n); var v=function(s){ var e=document.querySelector(s); return !!e && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().width>0; };
    o.push({ n:n, kbd:v('.pal-kbd'), buscar:v('.pal-btn-t'), chat:v('.cht-btn-t'), barrita:v('.hmm-bar'), fecha:v('#hdr-cuenta .hc-f'), titulo:v('#hdr-cuenta .hc-t small'), cuenta:v('#hdr-cuenta'), dia:v('.htitle') }); }
    hdrCompactar(true); return o; });
  const P = pasos;
  chk('2a. paso 1: solo se va «Ctrl K»', !P[1].kbd && P[1].buscar && P[1].chat && P[1].barrita && P[1].fecha, P[1]);
  chk('2b. paso 2: «Buscar» y «Chat» en círculo (sin el nombre)', !P[2].buscar && !P[2].chat && P[2].barrita, P[2]);
  chk('2c. paso 3: la meta sin la barrita', !P[3].barrita && P[3].fecha && P[3].cuenta, P[3]);
  chk('2d. pasos 4-6: la cuenta sin la fecha → sin el título → no se ve, con el día todavía', !P[4].fecha && P[4].titulo && !P[5].titulo && P[5].cuenta && !P[6].cuenta && P[6].dia, [P[4], P[5], P[6]]);
  chk('2e. paso 7: recién ahí se va el día', !P[7].dia, P[7]);
  await page._ctx.close();

  console.log('\n── 3. El chat llega después ──');
  page = await abrir(1180, 790, { chat:false });
  const antesChat = await leer(page);
  await page.evaluate(() => { CHAT_PRUEBA=1; var b=document.createElement('button'); b.id='cht-btn'; b.className='cht-btn'; b.innerHTML='<span>💬</span><span class="cht-btn-t">Chat</span>';
    b.style.cssText='display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:12px;font-weight:700;flex:none';
    var pb=document.getElementById('pal-btn'); pb.parentNode.insertBefore(b, pb.nextSibling); });
  await page.waitForTimeout(400);
  r = await leer(page);
  chk('3a. el botón del chat entra después y el renglón se acomoda solo (sin cambiar la ventana)', !r.abajo.length && r.anTop < r.logoBottom && r.comp >= antesChat.comp && Math.abs(r.hh-r.hd)<=1, [antesChat.comp, r]);
  await page._ctx.close();

  console.log('\n── 4. Pantalla ancha y agrandar la ventana ──');
  page = await abrir(1440, 900);
  r = await leer(page);
  chk('4a. 1440 × 900: no se achica nada («Ctrl K» y «Buscar» con su nombre)', r.comp===0 && r.kbd && r.palW>100 && !r.abajo.length, r);
  await page.setViewportSize({ width:1024, height:700 }); await page.waitForTimeout(500);
  r = await leer(page);
  chk('4b. al achicar la ventana a 1024 × 700 se achica y sigue en un renglón', r.comp>=2 && !r.abajo.length && Math.abs(r.hh-r.hd)<=1, r);
  await page.setViewportSize({ width:1440, height:900 }); await page.waitForTimeout(500);
  r = await leer(page);
  chk('4c. al volver a 1440 × 900 vuelve todo', r.comp===0 && r.kbd && r.palW>100, r);
  await page._ctx.close();

  console.log('\n── 5. Celular ──');
  page = await abrir(390, 844);
  r = await leer(page);
  chk('5a. en el celular no se mete (HDR_COMP 0)', r.comp===0, r);
  await page._ctx.close();

  chk('6. sin errores de JavaScript', !errores.length, errores[0]);
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
