/* 🪜 MEJORA 376 — «TU COMISIÓN» COMO UNA ESCALERA, NO COMO UN PÁRRAFO (16/11/2026; dueño: «me gusta»).

   En «☀️ Tu día», la caja «💰 Tu comisión» (mejora 190) eran 4 frases. Ahora: una barra con los escalones de SU escala, un punto «Vos» y un
   círculo «si sigue así», dos fichitas (lo que falta para el escalón que sigue y lo que falta por día para su meta) y una línea chica de que
   incluye la venta de tienda. Los MISMOS números de siempre.

   LO QUE ESTA PRUEBA CUIDA (los datos de `test_mis_comision.js`: metas y escala de noviembre, el cierre de octubre):
   1. Sin la bandera `COM_ESCALERA_PRUEBA`: la caja de siempre (el párrafo; ninguna barra).
   2. Con la bandera, Isabel (mínima 125.000, presupuesto 160.000; escala 2 % desde la mínima, 2,75 % desde el presupuesto, 3 % desde el
      120 % del presupuesto): los escalones «sin %» / «2 %» / «2,75 %» / «3 %» con «desde 125 mil / 160 mil / 192 mil»; está en el «2 %».
   3. El total arriba es el de siempre (Bs 2.800 = su fila del cierre comercial); el punto «Vos» en Bs 130.000, en su lugar del escalón.
   4. «si sigue así»: lo de «💰 Comisiones» de Proyección (`ccmSigueDatos`), con el círculo en la barra.
   5. Las fichitas: «Te faltan Bs 30.000 para el 2,75 %: la comisión pasa a Bs 4.600» y «Para tu presupuesto (Bs 160.000): Bs … por día · N
      días hábiles con hoy» (los mismos de `misComisionDatos`).
   6. 🏆 El bono Titanio como hoy (Bs 200), en su lugar («data-k=bono»), y la línea de la venta de tienda (Bs 10.000).
   7. Eduardo y ROHO no la ven; en el celular (390 px) no ensancha la página; no guarda nada.
   Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_com_escalera.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_mis_comision.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async()=>{'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (flag, w) => {
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    if(flag) await page.addInitScript(() => { window.COM_ESCALERA_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate('('+PREPARAR+')()');
    page._ctx=ctx; return page;
  };
  const leer = (page, v) => page.evaluate(async (v) => {
    await _ver(v); var e=document.getElementById('mis-com');
    if(!e) return { el:false };
    var o=_com(v), S=null; try{ S=ccmSigueDatos('2026-11'); }catch(x){}
    var sf=S ? S.filas.filter(function(f){ return normNombre(f.v)===normNombre(v); })[0] : null;
    var pct=function(x){ return x ? parseFloat(x.style.left) : null; };
    return { el:true, txt:e.innerText.replace(/\s+/g,' ').trim(), barra:!!e.querySelector('.cesc-bar'), to:e.getAttribute('data-to'), cab:(e.querySelector('.td-com-cab b')||{}).textContent||'',
      ls:[].map.call(e.querySelectorAll('.cesc-l'), function(l){ return { b:(l.querySelector('b')||{}).textContent, s:(l.querySelector('span')||{}).textContent||'', on:l.classList.contains('cesc-l-on') }; }),
      yo:pct(e.querySelector('.cesc-yo')), gh:pct(e.querySelector('.cesc-gh')), sig:(e.querySelector('[data-k="sig"]')||{}).textContent||'', meta:(e.querySelector('[data-k="meta"]')||{}).textContent||'',
      bono:(e.querySelector('[data-k="bono"]')||{}).textContent||'', bonoVis:!!(e.querySelector('[data-k="bono"]') && !e.querySelector('[data-k="bono"]').hidden),
      ley:(e.querySelector('.cesc-ley')||{}).textContent||'', pie:(e.querySelector('.td-com-pie')||{}).textContent||'', o:o, sigue:sf ? { bs:sf.bs, to:sf.to } : null,
      saves:window.SAVES.length };
  }, v);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  let sin = await leer(page, 'Isabel Robledo');
  chk('1a. sin la bandera: la caja de siempre (el párrafo, sin barra)', sin.el && !sin.barra && /Te faltan Bs 30\.000 para tu presupuesto \(Bs 160\.000\) y pasar al 2,75 %/.test(sin.txt), sin.txt);
  await page._ctx.close();

  console.log('\n── 2-6. Con la bandera ──');
  page = await abrir(true);
  let r = await leer(page, 'Isabel Robledo');
  chk('2a. la barra con los escalones de su escala: sin % · 2 % · 2,75 % · 3 %', r.barra && r.ls.map(function(l){ return l.b; }).join('|')==='sin %|2 %|2,75 %|3 %', r.ls);
  chk('2b. desde cuánto cada uno: «hasta 125 mil» / «desde 125 mil» / «desde 160 mil» / «desde 192 mil»', r.ls.map(function(l){ return l.s; }).join('|')==='hasta 125 mil|desde 125 mil|desde 160 mil|desde 192 mil', r.ls);
  chk('2c. está en el escalón del 2 % (marcado)', r.ls.filter(function(l){ return l.on; }).map(function(l){ return l.b; }).join()==='2 %', r.ls);
  chk('3a. el total arriba es el de siempre: Bs 2.800 (su fila del cierre comercial)', r.o && r.to==='2800' && r.o.to===2800 && /Bs\s?2\.800/.test(r.cab), [r.to, r.cab]);
  /* 130.000 está en el 2º escalón (125.000 a 160.000), cada escalón ocupa 1/4: (1 + 5.000/35.000) × 25 % */
  chk('3b. el punto «Vos» en Bs 130.000, en su lugar del escalón ('+(r.yo)+' %)', Math.abs(r.yo-(1+5000/35000)*25)<0.2 && /Vos: Bs\s?130\.000/.test(r.ley), [r.yo, r.ley]);
  chk('4a. «si sigue así»: lo mismo que «💰 Comisiones» de Proyección, con el círculo en la barra',
    !!r.sigue && r.gh!=null && r.ley.indexOf('si sigue así: Bs\u00a0'+String(Math.round(r.sigue.bs)).replace(/\B(?=(\d{3})+(?!\d))/g,'.'))>=0, [r.sigue, r.ley, r.gh]);
  chk('5a. «Te faltan Bs 30.000 para el 2,75 %: la comisión pasa a Bs 4.600»', /Te faltan Bs\s?30\.000 para el 2,75\s%: la comisión pasa a Bs\s?4\.600/.test(r.sig), r.sig);
  chk('5b. «Para tu presupuesto (Bs 160.000): Bs '+(r.o&&r.o.porDia)+' por día · '+(r.o&&r.o.dias)+' días hábiles con hoy» (los de `misComisionDatos`)',
    !!r.o && r.meta.indexOf('Para tu presupuesto (Bs 160.000)')>=0 && r.meta.indexOf(('Bs '+r.o.porDia.toLocaleString('es-BO'))+' por día')>=0 && r.meta.indexOf(r.o.dias+' días hábiles con hoy')>=0, [r.meta, r.o && r.o.porDia, r.o && r.o.dias]);
  chk('6a. 🏆 el bono Titanio como hoy (Bs 200), en su lugar', r.bonoVis && /Bono Titanio: Bs\s?200/.test(r.bono), r.bono);
  chk('6b. la línea de la venta de tienda: «Incluye Bs 10.000 de venta de tienda…» y lo ya pagado en octubre', /Incluye Bs\s?10\.000 de venta de tienda/.test(r.pie) && /1 venta ya pagada antes \(Bs\s?5\.000\)/.test(r.pie), r.pie);
  r = await leer(page, 'Mirian Salazar');
  chk('2d. Mirian (200.000, arriba del 120 % de su presupuesto): en el último escalón, «Ya estás en el escalón más alto»', r.barra && r.ls.length && r.ls[r.ls.length-1].on && /escalón más alto/.test(r.sig), [r.ls, r.sig]);
  r = await page.evaluate(async () => { var o={}; for(const v of ['Eduardo Añez','ROHO']){ await _ver(v); o[v]=!!document.getElementById('mis-com'); } o.saves=window.SAVES.length; return o; });
  chk('7a. Eduardo y ROHO no la ven; no se guardó nada', !r['Eduardo Añez'] && !r.ROHO && r.saves===0, r);
  await page._ctx.close();

  page = await abrir(true, 390);
  r = await page.evaluate(async () => { await _ver('Isabel Robledo'); var e=document.getElementById('mis-com'); return { el:!!e, sw:document.documentElement.scrollWidth, iw:innerWidth, der:e ? Math.round(e.getBoundingClientRect().right) : null }; });
  chk('7b. en el celular (390 px) no ensancha la página', r.el && r.sw<=r.iw && r.der<=r.iw, r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
