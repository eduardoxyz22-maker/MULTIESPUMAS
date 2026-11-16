/* 🎨 MEJORA 429 — AL BAJAR, LAS PESTAÑAS TE ACOMPAÑAN ARRIBA (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Cuando el encabezado se achica al bajar (`body.hdr-chico`), las MISMAS pestañas aparecen en él (`#hdr-tabs`): la del lugar donde estás con su
   color y ⬆ (tocarla te lleva arriba), las demás hacen el mismo `click` de su pestaña. Se esconden el día y los cupos de texto; los anillos quedan.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `HDR_TABS_PRUEBA` (Playwright): nada nuevo (ni `#hdr-tabs`, ni se esconde el día al bajar).
   2. Con la bandera, arriba de todo: las pestañas del encabezado no se ven; al bajar sí, las mismas que `.nav` (sin las escondidas), la elegida
      marcada, el día escondido y los anillos a la vista; `--hdr-h` sigue siendo el alto del encabezado.
   3. Tocar otra pestaña = la misma vista que su botón de siempre, desde arriba; tocar la elegida vuelve arriba.
   4. El número de la pestaña (`nxBadge`) y la del Bot que aparece se copian solos.
   5. En una compu angosta (1.000 px) entran (sin el nombre las que no son la elegida); en el celular (390 px) no aparecen.
   6. Con la 378 (`HDR_BAJO_PRUEBA`, 768 de alto) convive: la meta chica también se esconde al bajar.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v429_pestanas_arriba.js */
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
  var L=[];
  for(var i=0;i<60;i++) L.push({ id:'p'+i, oc:'11-'+(100+i), nota:String(700+i), vendedor:(i%2?'Maria Flores':'Carola Chavez'), cliente:'CLIENTE INVENTADO '+i, celular:'70000'+(100+i),
    fecha:'2026-11-'+(17+(i%5)), turno:(i%2?'PM':'AM'), zona:'NORTE', direccion:'Calle '+i, productos:[{desc:'COLCHON INVENTADO',medida:'140x190',cant:1,precio:1000}],
    saldo:1000, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:Date.parse('2026-11-1'+(i%6)+'T10:00:00-04:00'), fotos:[] });
  STATE=L;
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:o.w||1366, height:o.h||900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { if(o.flag) window.HDR_TABS_PRUEBA=1; if(o.bajo) window.HDR_BAJO_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { document.getElementById('mis-vendedor').value='Carola Chavez'; showView('mis'); try{ renderMis(); }catch(e){} });
    await page.waitForTimeout(300);
    page._ctx=ctx; return page;
  };
  const bajar = async (page, y) => { await page.evaluate((y) => { window.scrollTo(0, y); window.dispatchEvent(new Event('scroll')); }, y); await page.waitForTimeout(700); };
  const medir = (page) => page.evaluate(() => {
    var vis=function(e){ if(!e) return false; var b=e.getBoundingClientRect(), cs=getComputedStyle(e); return cs.display!=='none' && cs.visibility!=='hidden' && b.width>0 && b.height>0; };
    var m=document.getElementById('hdr-tabs'), h=document.querySelector('.header');
    return { hay:!!m, ve:vis(m), chico:document.body.classList.contains('hdr-chico'), dia:vis(document.querySelector('.htitle')), anillos:vis(document.getElementById('h-anillos')),
      tabs:m ? [].map.call(m.querySelectorAll('.ht-b'), function(b){ return (b.querySelector('.ht-lb')||b).textContent.trim(); }) : [],
      nav:[].filter.call(document.querySelectorAll('.nav > button[id]'), function(b){ return !b.hidden; }).map(function(b){ return (b.querySelector('.t-lb')||b).textContent.trim(); }),
      on:m ? [].map.call(m.querySelectorAll('.ht-b.on'), function(b){ return b.getAttribute('data-tab'); }) : [],
      cls:m ? m.className : '', ancho:m ? [m.scrollWidth, m.clientWidth] : null,
      hh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')), hd:Math.round(h.getBoundingClientRect().height), y:Math.round(window.scrollY),
      vista:(document.querySelector('.view.active')||{}).id, mini:vis(document.getElementById('hdr-meta-mini')) };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  await bajar(page, 1200);
  let r = await medir(page);
  chk('1a. sin `HDR_TABS_PRUEBA`: no hay pestañas en el encabezado y el día sigue a la vista al bajar', !r.hay && r.chico && r.dia, r);
  await page._ctx.close();

  console.log('\n── 2-4. Con la bandera ──');
  page = await abrir({ flag:true });
  r = await medir(page);
  chk('2a. arriba de todo no se ven (el encabezado de siempre, con el día)', r.hay && !r.ve && r.dia, r);
  await bajar(page, 1200);
  r = await medir(page);
  chk('2b. al bajar aparecen las MISMAS pestañas que `.nav`', r.ve && r.chico && JSON.stringify(r.tabs)===JSON.stringify(r.nav), [r.tabs, r.nav]);
  chk('2c. la del lugar donde estás, marcada (Mis pedidos)', JSON.stringify(r.on)==='["tab-mis"]', r.on);
  chk('2d. el día y los cupos de texto se esconden; los anillos quedan', !r.dia && r.anillos, r);
  chk('2e. `--hdr-h` sigue siendo el alto del encabezado', Math.abs(r.hh-r.hd)<=1, [r.hh, r.hd]);
  r = await page.evaluate(async () => { document.querySelector('#hdr-tabs .ht-b[data-tab="tab-conta"]').click(); await new Promise(x=>setTimeout(x, 400));
    return { vista:(document.querySelector('.view.active')||{}).id, nav:(document.querySelector('.nav button.active')||{}).id, y:Math.round(window.scrollY) }; });
  chk('3a. tocar «Contabilidad» abre Contabilidad (el mismo botón de siempre), desde arriba', r.vista==='view-conta' && r.nav==='tab-conta' && r.y===0, r);
  await page.evaluate(() => { showView('mis'); });
  await bajar(page, 1500);
  r = await page.evaluate(async () => { document.querySelector('#hdr-tabs .ht-b.on').click(); for(var i=0;i<30 && window.scrollY>0;i++) await new Promise(x=>setTimeout(x, 100));
    return { vista:(document.querySelector('.view.active')||{}).id, y:Math.round(window.scrollY) }; });
  chk('3b. tocar la elegida (con ⬆) vuelve arriba, sin cambiar de pestaña', r.vista==='view-mis' && r.y===0, r);
  await bajar(page, 1500);
  r = await page.evaluate(async () => { nxBadge('tab-conta', 3, 'nx-tb-oro', 'Pagos sin terminar'); UNLOCKED=true; botTabPintar(); await new Promise(x=>setTimeout(x, 300));
    var b=document.querySelector('#hdr-tabs .ht-b[data-tab="tab-conta"] .ht-n');
    return { n:b ? b.textContent : '', oro:!!(b && b.classList.contains('nx-tb-oro')), bot:!!document.querySelector('#hdr-tabs .ht-b[data-tab="tab-bot"]') }; });
  chk('4a. el número de la pestaña se copia solo (3, con su color)', r.n==='3' && r.oro, r);
  chk('4b. la pestaña del Bot, cuando aparece, también', r.bot, r);
  await bajar(page, 0); await page.waitForTimeout(400);
  r = await medir(page);
  chk('2f. al volver arriba se van y vuelve el día', !r.ve && r.dia && !r.chico, r);
  await page._ctx.close();

  console.log('\n── 5. Compu angosta y celular ──');
  page = await abrir({ flag:true, w:1000 });
  await page.evaluate(() => { UNLOCKED=true; botTabPintar(); });
  await bajar(page, 1200);
  r = await medir(page);
  chk('5a. en 1.000 px entran (sin el nombre de las que no son la elegida)', r.ve && r.ancho[0]<=r.ancho[1]+1 && /ht-c[12]/.test(r.cls) && r.tabs.length>=5, r);
  chk('5b. y el encabezado no pasa a dos renglones (`--hdr-h` = su alto)', Math.abs(r.hh-r.hd)<=1 && r.hd<110, [r.hh, r.hd]);
  await page._ctx.close();
  page = await abrir({ flag:true, w:390, h:844 });
  await bajar(page, 1200);
  r = await medir(page);
  chk('5c. en el celular no aparecen (las pestañas ya van abajo)', !r.ve, r);
  await page._ctx.close();

  console.log('\n── 6. Con la 378 (768 de alto) ──');
  page = await abrir({ flag:true, bajo:true, h:768 });
  await page.evaluate(() => { UNLOCKED=true; window.HDR_META_PRUEBA=1; try{ hdrMetaPintar(true); }catch(e){} });
  await page.waitForTimeout(200);
  r = await medir(page);
  chk('6·. arriba, con la contraseña, la meta chica se ve (la 378 sigue igual)', r.mini && r.dia && !r.ve, r);
  await bajar(page, 1200);
  r = await medir(page);
  chk('6a. con el encabezado bajo: las pestañas a la vista, sin la meta chica ni el día', r.ve && !r.mini && !r.dia, r);
  chk('6b. `--hdr-h` = el alto del encabezado', Math.abs(r.hh-r.hd)<=1, [r.hh, r.hd]);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
