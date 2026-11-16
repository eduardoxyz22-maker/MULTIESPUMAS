/* 🎨 MEJORA 435 — BLACK FRIDAY SIN FRANJAS BLANCAS (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Con el tema oscuro, la barrita de la meta debajo del encabezado (342) y la banda de los filtros de Administración (pegada arriba al bajar)
   eran dos franjas blancas de punta a punta. Pasan a vidrio oscuro con borde dorado; la leyenda de colores va sobre su cajita oscura.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `META_OSC_PRUEBA` (Playwright): blancas, como siempre.
   2. Con la bandera y Black Friday: la meta oscura con su letra clara (y su «93 %» en dorado si está cerca), los filtros sobre la caja
      oscura con borde dorado y la leyenda en su cajita. Los números y textos de la meta, los mismos.
   3. Igual con Halloween y Todos Santos; con Espuma no cambia nada.
   4. Al bajar, los filtros siguen pegados debajo del encabezado (`top:var(--hdr-h)`).
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v435_sin_franjas.js */
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
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { window.ADM_FICHAS_PRUEBA=1; if(o.flag) window.META_OSC_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + (o.q||'?tema=black-friday'), { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(() => { STATE=FIX().concat([METAS({ '2026-11':{ heaven:30000, suena:25000, t:1 } })]); window.HDR_META_PRUEBA=1; UNLOCKED=true;
      try{ document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display=''; }catch(e){}
      updateStats(); try{ hdrMetaPintar(true); }catch(e){} showView('admin'); setQuick('todos'); renderAdmin(); });
    await page.waitForTimeout(300);
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => {
    var m=document.getElementById('hdr-meta'), c=document.getElementById('adm-chips'), l=document.querySelector('#adm-fichas .af-ley');
    var cs=function(e){ return e ? getComputedStyle(e) : null; };
    return { metaBg:cs(m).backgroundImage+' | '+cs(m).backgroundColor, metaColor:cs(m).color, metaTxt:m.innerText.replace(/\s+/g,' ').trim(),
      chipsBg:cs(c).backgroundColor, chipsBorde:cs(c).borderTopColor, chipsRadio:cs(c).borderTopLeftRadius, leyBg:l ? cs(l).backgroundColor : '', top:cs(c).top, pos:cs(c).position,
      hh:getComputedStyle(document.documentElement).getPropertyValue('--hdr-h').trim() };
  });
  const blanco = s => /rgb\(255, 255, 255\)/.test(s);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  const antes = await leer(page);
  chk('1a. sin `META_OSC_PRUEBA`: la meta y los filtros blancos, como siempre', blanco(antes.metaBg) && blanco(antes.chipsBg), antes);
  await page._ctx.close();

  console.log('\n── 2. Black Friday, con la bandera ──');
  page = await abrir({ flag:true });
  let r = await leer(page);
  chk('2a. la meta en vidrio oscuro con letra clara', /rgba\(18, 18, 20, 0\.96\)/.test(r.metaBg) && /rgb\(250, 250, 249\)/.test(r.metaColor), [r.metaBg, r.metaColor]);
  chk('2b. lo que dice la meta, lo mismo', r.metaTxt===antes.metaTxt && /vendido/.test(r.metaTxt), [r.metaTxt, antes.metaTxt]);
  chk('2c. los filtros sobre la caja oscura con borde dorado y esquinas redondeadas', /rgba\(14, 14, 16, 0\.88\)/.test(r.chipsBg) && /rgba\(250, 204, 21/.test(r.chipsBorde) && r.chipsRadio==='16px', r);
  chk('2d. la leyenda de colores en su cajita oscura', /rgba\(14, 14, 16, 0\.6\)/.test(r.leyBg), r.leyBg);
  chk('4a. los filtros siguen pegados debajo del encabezado', r.pos==='sticky' && r.top===r.hh, [r.pos, r.top, r.hh]);
  await page._ctx.close();

  console.log('\n── 3. Los otros temas ──');
  for (const [q, oscuro] of [['?tema=halloween', true], ['?tema=todos-santos', true], ['?tema=espuma', false]]) {
    page = await abrir({ flag:true, q });
    r = await leer(page);
    chk('3 · '+q+': '+(oscuro?'oscuros':'blancos como siempre'), oscuro ? (/rgba\(18, 18, 20, 0\.96\)/.test(r.metaBg) && /rgba\(14, 14, 16, 0\.88\)/.test(r.chipsBg)) : (blanco(r.metaBg) && blanco(r.chipsBg)), r);
    await page._ctx.close();
  }

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
