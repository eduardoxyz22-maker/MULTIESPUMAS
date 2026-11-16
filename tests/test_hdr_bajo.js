/* 🖥️ MEJORA 378 — EN LAS COMPUS DE 768 DE ALTO, EL ENCABEZADO MÁS BAJO (16/11/2026; dueño: «me gustan»).

   En una notebook de 1.366 × 768, antes de la primera tarjeta había 245 px de encabezado, meta y pestañas. Con 800 px de alto o menos: la
   ciudad y el camión a la mitad de alto, la línea de la meta (342) sube al lado del día en una versión chica y las pestañas se acercan.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `HDR_BAJO_PRUEBA` (Playwright): el encabezado de siempre (la franja de 68 px, la meta abajo).
   2. Con la bandera en 1366 × 768: `html.hdr-bajo`, la franja de la ciudad a 34 px (la mitad), el camión a la mitad, y `--hdr-h` = el alto
      nuevo del encabezado (todo lo pegajoso lo usa); el encabezado entero queda por lo menos 40 px más bajo.
   3. Con la contraseña: la meta grande se esconde y la chica, al lado del día, dice lo MISMO (vendido % y «si sigue así» %, de
      `HDR_META.D`); tocarla abre Proyección. Sin la contraseña, ninguna de las dos.
   4. En una pantalla alta (1366 × 900) no cambia nada; al achicar la ventana a 768 de alto se pone sola y `--hdr-h` se vuelve a medir.
   5. Al bajar, el encabezado se sigue achicando como siempre (sin la ciudad) y al volver arriba queda el alto bajo.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_hdr_bajo.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_hdr_meta.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async () => {'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (flag, h) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:h||768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    if(flag) await page.addInitScript(() => { window.HDR_BAJO_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate('('+PREPARAR+')()');
    page._ctx=ctx; return page;
  };
  const medir = (page) => page.evaluate(() => {
    var q=function(s){ var e=document.querySelector(s); if(!e) return null; var b=e.getBoundingClientRect(); return { top:Math.round(b.top), h:Math.round(b.height), vis:getComputedStyle(e).display!=='none' && b.height>0 }; };
    var cam=document.querySelector('.h-camion svg');
    return { bajo:document.documentElement.classList.contains('hdr-bajo'), hdr:q('.header'), ruta:q('.h-ruta'), meta:q('#hdr-meta'), mini:q('#hdr-meta-mini'), nav:q('.nav'),
      hh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')), cam:cam ? Math.round(cam.getBoundingClientRect().height) : 0,
      miniTxt:(document.getElementById('hdr-meta-mini')||{}).innerText||'', D:(typeof HDR_META!=='undefined' && HDR_META.D) ? { pv:HDR_META.D.pv, pp:HDR_META.D.pp } : null };
  });
  const conMeta = (page, clave) => page.evaluate((clave) => { STATE=FIX().concat([METAS({ '2026-11':{ heaven:30000, suena:25000, t:1 } })]); window.HDR_META_PRUEBA=1; UNLOCKED=!!clave; updateStats(); try{ hdrMedir(); }catch(e){} }, clave);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  await conMeta(page, true);
  let antes = await medir(page);
  chk('1a. sin la bandera: ni `hdr-bajo` ni cambios (la franja de 68 px, la meta abajo, la chica escondida)', !antes.bajo && antes.ruta.h===68 && antes.meta.vis && !antes.mini.vis, antes);
  await page._ctx.close();

  console.log('\n── 2-3. Con la bandera, 1366 × 768 ──');
  page = await abrir(true);
  await conMeta(page, true); await page.waitForTimeout(150);
  let r = await medir(page);
  chk('2a. `html.hdr-bajo` en una pantalla de 768 de alto', r.bajo, r);
  chk('2b. la franja de la ciudad a la mitad: 34 px (antes 68)', r.ruta.h===34, r.ruta);
  chk('2c. el camión a la mitad de alto (33 px; antes 65)', r.cam>0 && r.cam<=34, r.cam);
  chk('2d. `--hdr-h` = el alto nuevo del encabezado', Math.abs(r.hh-r.hdr.h)<=1, [r.hh, r.hdr]);
  chk('2e. el encabezado queda por lo menos 40 px más bajo que el de siempre (con la meta: '+antes.hdr.h+' → '+r.hdr.h+')', antes.hdr.h-r.hdr.h>=40, [antes.hdr.h, r.hdr.h]);
  chk('2f. las pestañas empiezan antes (más cerca del encabezado)', r.nav.top < antes.nav.top-40, [antes.nav.top, r.nav.top]);
  chk('3a. la meta grande se esconde y la chica se ve al lado del día', !r.meta.vis && r.mini.vis && r.mini.top < r.ruta.top, r);
  chk('3b. la chica dice lo mismo que la grande: vendido '+(r.D&&r.D.pv)+' % → si sigue así '+(r.D&&r.D.pp)+' %',
    !!r.D && r.miniTxt.indexOf(r.D.pv+' %')>=0 && r.miniTxt.indexOf(r.D.pp+' %')>=0 && /Noviembre/.test(r.miniTxt), r.miniTxt);
  r = await page.evaluate(() => { document.getElementById('hdr-meta-mini').click(); return { vista:(document.querySelector('.view.active')||{}).id, tab:segVal('cta-tab') }; });
  chk('3c. tocar la chica abre Contabilidad → Proyección (como la grande)', r.vista==='view-conta' && r.tab==='proy', r);
  r = await page.evaluate(() => { UNLOCKED=false; updateStats(); var m=document.getElementById('hdr-meta-mini'), g=document.getElementById('hdr-meta'); return { mini:m.hidden, grande:g.hidden }; });
  chk('3d. sin la contraseña no se ve ninguna de las dos', r.mini && r.grande, r);
  r = await page.evaluate(async () => { var esperar=async function(fn){ for(var i=0;i<40 && !fn();i++) await new Promise(x=>setTimeout(x, 100)); };
    var hh=function(){ return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')); }, ru=function(){ return document.querySelector('.h-ruta').getBoundingClientRect().height; };
    showView('form'); window.scrollTo(0, 600); await new Promise(x=>setTimeout(x, 700)); await esperar(function(){ return document.body.classList.contains('hdr-chico') && ru()<3; }); var a={ chico:document.body.classList.contains('hdr-chico'), ruta:document.querySelector('.h-ruta').getBoundingClientRect().height, hh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) };
    window.scrollTo(0, 0); await new Promise(x=>setTimeout(x, 700)); await esperar(function(){ return Math.round(ru())===34 && Math.abs(hh()-document.querySelector('.header').getBoundingClientRect().height)<=1; }); a.ruta2=document.querySelector('.h-ruta').getBoundingClientRect().height; a.hh2=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')); a.hd=document.querySelector('.header').getBoundingClientRect().height; return a; });
  chk('5a. al bajar se achica como siempre (sin la ciudad) y al volver arriba vuelve la franja baja (34 px) con `--hdr-h` al día', r.chico && r.ruta<3 && Math.round(r.ruta2)===34 && Math.abs(r.hh2-r.hd)<=1, r);
  await page._ctx.close();

  console.log('\n── 4. Pantalla alta y cambio de tamaño ──');
  page = await abrir(true, 900);
  await conMeta(page, true); await page.waitForTimeout(150);
  r = await medir(page);
  chk('4a. en 1366 × 900 no cambia nada (franja de 68 px, la meta grande)', !r.bajo && r.ruta.h===68 && r.meta.vis && !r.mini.vis, r);
  await page.setViewportSize({ width:1366, height:768 });
  try{ await page.waitForFunction(() => document.documentElement.classList.contains('hdr-bajo'), null, { timeout:4000 }); }catch(e){}
  await page.waitForTimeout(400);
  let r2 = await medir(page);
  chk('4b. al achicar la ventana a 768 de alto se pone sola y `--hdr-h` se vuelve a medir', r2.bajo && r2.ruta.h===34 && Math.abs(r2.hh-r2.hdr.h)<=1 && r2.hh<r.hh-30, [r.hh, r2.hh, r2.hdr]);
  await page.setViewportSize({ width:1366, height:900 });
  try{ await page.waitForFunction(() => !document.documentElement.classList.contains('hdr-bajo'), null, { timeout:4000 }); }catch(e){}
  await page.waitForTimeout(400);
  r2 = await medir(page);
  chk('4c. y al agrandarla vuelve a la de siempre', !r2.bajo && r2.ruta.h===68 && Math.abs(r2.hh-r2.hdr.h)<=1, r2);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
