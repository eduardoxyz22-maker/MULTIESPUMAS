/* 🎨 MEJORA 434 — LA CUENTA REGRESIVA DEL TEMA EN EL ENCABEZADO (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Al lado de «Buscar», una etiqueta dorada con forma de entrada en Black Friday («faltan N días · vie 27/11», el día «¡Black Friday!», después
   «últimos N días») y roja en Navidad («faltan N días · jue 24/12»). Con la contraseña, tocarla abre «🛍️ Black Friday en números».

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `CUENTA_PRUEBA` (Playwright): no hay nada nuevo en el encabezado.
   2. Black Friday: los días salen de `bfCampana` (la cuenta del tema): 16/11 «faltan 11 días · vie 27/11»; 26/11 «falta 1 día»; 27/11 «HOY ES
      ¡BLACK FRIDAY! · hasta el lun 30/11» (late); 29/11 «últimos 2 días»; 1/12 (pasada la campaña) no se ve.
   3. Navidad: 14/12 «faltan 10 días · jue 24/12»; el 24 «¡Feliz Navidad!»; el 27 no se ve. Con Espuma, nada.
   4. Va justo antes de «Buscar» y el encabezado sigue en un renglón (`--hdr-h` = su alto), también a 1.180 px con la meta chica de la 378
      (se achica: sin la fecha o sin el título); a 1.000 px, si ni así entra, no se muestra (el encabezado no crece por ella).
   5. Tocarla: con la contraseña abre Contabilidad → Proyección; sin ella no hace nada (ni es un botón).
   6. En el celular no se ve; con «reducir movimiento» queda quieta.
   Datos INVENTADOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v434_cuenta_tema.js */
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
  STATE=[];
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:o.w||1366, height:o.h||900 }, timezoneId:'America/La_Paz', reducedMotion:o.quieto ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { if(o.flag) window.CUENTA_PRUEBA=1; if(o.bajo){ window.HDR_BAJO_PRUEBA=1; window.HDR_META_PRUEBA=1; } }, o);
    await page.clock.setFixedTime(new Date((o.fecha||'2026-11-16')+'T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + (o.q||''), { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    if(o.clave) await page.evaluate(() => { UNLOCKED=true; updateStats(); });
    await page.waitForTimeout(150);
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => {
    var e=document.getElementById('hdr-cuenta'), pb=document.getElementById('pal-btn'), h=document.querySelector('.header'), hi=document.querySelector('.header-in');
    var ve=!!(e && e.offsetWidth>0 && getComputedStyle(e).display!=='none');
    var tops=[].filter.call(hi.children, function(c){ return c.offsetWidth>0; }).map(function(c){ return Math.round(c.offsetTop+c.offsetHeight/2); });
    return { hay:!!e, ve:ve, txt:e ? e.innerText.replace(/\s+/g,' ').trim() : '', cls:e ? e.className : '', role:e ? e.getAttribute('role') : null,
      junto:ve ? Math.round(pb.getBoundingClientRect().left-e.getBoundingClientRect().right) : null, antes:!!(e && e.nextElementSibling===pb),
      unRenglon:Math.max.apply(null, tops)-Math.min.apply(null, tops)<=30, hh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')), hd:Math.round(h.getBoundingClientRect().height),
      anim:e ? getComputedStyle(e).animationName+'|'+getComputedStyle(e,'::after').animationName : '' };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  let r = await leer(page);
  chk('1a. sin `CUENTA_PRUEBA`: nada nuevo en el encabezado', !r.hay, r);
  await page._ctx.close();

  console.log('\n── 2. Black Friday ──');
  const BF=[['2026-11-16', /^🛍️ BLACK FRIDAY faltan 11 días vie 27\/11$/, ''], ['2026-11-26', /^🛍️ BLACK FRIDAY faltan 1 día vie 27\/11$/, ''], ['2026-11-27', /^🛍️ HOY ES ¡BLACK FRIDAY! hasta el lun 30\/11$/, 'hoy'],
    ['2026-11-29', /^🛍️ BLACK FRIDAY últimos 2 días hasta el lun 30\/11$/, '']];
  for (const [f, rx, cl] of BF) {
    page = await abrir({ flag:true, fecha:f });
    r = await leer(page);
    chk('2 · '+f+': «'+r.txt+'»', r.ve && rx.test(r.txt) && (!cl || r.cls.indexOf(cl)>=0) && /tema-black-friday/.test(await page.evaluate(() => document.documentElement.className)), r);
    if(f==='2026-11-16'){
      chk('4a. justo antes de «Buscar», pegada', r.antes && r.junto>=0 && r.junto<=24, r);
      chk('4b. el encabezado sigue en un renglón y `--hdr-h` = su alto', r.unRenglon && Math.abs(r.hh-r.hd)<=1, r);
      chk('5a. sin la contraseña no es un botón', !r.role && !/toca/.test(r.cls), r);
      r = await page.evaluate(async () => { document.getElementById('hdr-cuenta').click(); await new Promise(x=>setTimeout(x, 500)); return (document.querySelector('.view.active')||{}).id; });
      chk('5b. sin la contraseña, tocarla no hace nada', r==='view-form', r);
      r = await page.evaluate(async () => { UNLOCKED=true; updateStats(); var e=document.getElementById('hdr-cuenta'); var o={ role:e.getAttribute('role'), cls:e.className }; e.click(); await new Promise(x=>setTimeout(x, 700));
        o.vista=(document.querySelector('.view.active')||{}).id; o.tab=segVal('cta-tab'); return o; });
      chk('5c. con la contraseña es un botón y abre Contabilidad → Proyección', r.role==='button' && /toca/.test(r.cls) && r.vista==='view-conta' && r.tab==='proy', r);
    }
    if(f==='2026-11-27') chk('2 · el día late despacito', /hc-late/.test(r.anim), r.anim);
    await page._ctx.close();
  }
  page = await abrir({ flag:true, fecha:'2026-12-01', q:'?tema=black-friday' });
  r = await leer(page);
  chk('2 · pasada la campaña (1/12) no se ve', r.hay && !r.ve && !r.txt, r);
  await page._ctx.close();

  console.log('\n── 3. Navidad y Espuma ──');
  for (const [f, rx] of [['2026-12-14', /^🎄 NAVIDAD faltan 10 días jue 24\/12$/], ['2026-12-24', /^🎄 NAVIDAD ¡Feliz Navidad! jue 24\/12$/], ['2026-12-27', null]]) {
    page = await abrir({ flag:true, fecha:f });
    r = await leer(page);
    chk('3 · '+f+': '+(rx ? '«'+r.txt+'»' : 'no se ve'), rx ? (r.ve && rx.test(r.txt) && /\bnav\b/.test(r.cls)) : !r.ve, r);
    await page._ctx.close();
  }
  page = await abrir({ flag:true, q:'?tema=espuma' });
  r = await leer(page);
  chk('3 · con Espuma no hay cuenta', !r.ve, r);
  await page._ctx.close();

  console.log('\n── 4. Angosto con la meta chica (378) ──');
  page = await abrir({ flag:true, w:1180, h:768, bajo:true, clave:true });
  r = await leer(page);
  chk('4c. a 1.180 px (iPad acostado) con la meta chica: se achica y el encabezado sigue en un renglón', r.ve && /hc-(chica|mini)/.test(r.cls) && r.unRenglon && Math.abs(r.hh-r.hd)<=1, r);
  await page._ctx.close();
  page = await abrir({ w:1000, h:768, bajo:true, clave:true });
  const sinElla = await leer(page);
  await page._ctx.close();
  page = await abrir({ flag:true, w:1000, h:768, bajo:true, clave:true });
  r = await leer(page);
  chk('4d. a 1.000 px, si ni chiquita entra, no se ve: el encabezado queda del mismo alto que sin ella', !r.ve && /hc-no/.test(r.cls) && r.hd===sinElla.hd, [r.cls, r.hd, sinElla.hd]);
  await page._ctx.close();

  console.log('\n── 6. Celular y «reducir movimiento» ──');
  page = await abrir({ flag:true, w:390, h:844 });
  r = await leer(page);
  chk('6a. en el celular no se ve', !r.ve, r);
  await page._ctx.close();
  page = await abrir({ flag:true, fecha:'2026-11-27', quieto:true });
  r = await leer(page);
  chk('6b. con «reducir movimiento» queda quieta (ni late ni brilla)', r.ve && r.anim==='none|none', r.anim);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
