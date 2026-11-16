/* 🎨 MEJORA 440: CADA PESTAÑA TIÑE SU TARJETA (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   La pestaña elegida ya tenía su color (Mis pedidos azul, Contabilidad ámbar, ATC rosa, Administración violeta, Bot gris), pero la
   tarjeta grande de abajo era igual en todas: al bajar, nada te recordaba en qué pantalla estabas. Ahora la tarjeta toma el color de
   SU pestaña, con los mismos `--c1/--c2` de `#tab-*`:
   · una franja de 4 px arriba;
   · un brillo suave que baja, en el fondo de la tarjeta (las letras van encima, nada las tapa);
   · en la compu, un piquito que une la pestaña elegida con la tarjeta.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `TINTE_PRUEBA` (Playwright) todo queda como antes: sin franja, sin brillo y sin piquito.
   2. Con la bandera, en Espuma, cada vista lleva su color. Contabilidad es ámbar, Mis pedidos azul, ATC rosa, Bot gris y Administración violeta.
   3. El piquito sale debajo de la pestaña elegida y llega a la tarjeta; en «Nuevo pedido» no hay piquito (esa tarjeta no se tiñe).
   4. En el celular (390 px) la franja sigue y el piquito no (las pestañas van abajo).
   5. Con Black Friday y Todos Santos (y Navidad con su fondo de noche, 431) la tarjeta sigue siendo de vidrio oscuro: el mismo fondo y
      el borde dorado a los costados, la franja arriba y las letras del mismo color que sin la bandera.
   Datos INVENTADOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v440_tinte_pestana.js */
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
    const ctx = await browser.newContext({ viewport:{ width:o.w||1366, height:o.h||768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { if(o.flag) window.TINTE_PRUEBA=1; if(o.noche) window.NOCHE_DIC_PRUEBA=1; try{ localStorage.clear(); sessionStorage.clear(); }catch(e){} }, o);
    await page.clock.setFixedTime(new Date(o.fecha||'2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + (o.q||'?tema=espuma'), { waitUntil:'load' });
    await page.waitForTimeout(400);
    await page.evaluate(() => { CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){} loadFromServer=function(){};
      apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); }; for(var i=0;i<3;i++) try{ closeModal(); }catch(e){}
      var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none'; });   // el cartel «No se pudo leer la planilla» (la prueba no tiene red)
    page._ctx=ctx; return page;
  };
  const ver = async (page, v) => { await page.evaluate((v) => { showView(v); scrollTo(0,0); }, v); await page.waitForTimeout(450); };
  const leer = (page, v) => page.evaluate((v) => {
    var card=v==='admin' ? document.querySelector('#admin-content > .card') : document.querySelector('#view-'+v+' > .card');
    var tab=document.getElementById('tab-'+v), cs=getComputedStyle(card), pq=tab ? getComputedStyle(tab, '::before') : null;
    var tr=tab ? tab.getBoundingClientRect() : null, cr=card.getBoundingClientRect();
    return { marca:document.documentElement.classList.contains('v-tinte'), bt:cs.borderTopWidth, btc:cs.borderTopColor, blc:cs.borderLeftColor, bg:cs.backgroundColor,
      img:cs.backgroundImage, pico:!!pq && pq.content!=='none' && pq.content!=='normal', picoC:pq ? pq.borderTopColor : '', picoAbajo:tr ? Math.round(tr.bottom+15) : null,
      cardArriba:Math.round(cr.top), activa:!!(tab && tab.classList.contains('active')) };
  }, v);
  const colorLetra = (page, sel) => page.evaluate((sel) => { var e=document.querySelector(sel); return e ? getComputedStyle(e).color : ''; }, sel);

  console.log('\n── 1. Sin la bandera, como antes ──');
  let page = await abrir({});
  await ver(page, 'conta');
  let r = await leer(page, 'conta');
  chk('1a. sin `TINTE_PRUEBA`: Contabilidad sin franja (borde de 1 px), sin brillo y sin piquito', !r.marca && r.bt==='1px' && r.img==='none' && !r.pico, r);
  await page._ctx.close();

  console.log('\n── 2. Con la bandera: cada vista con su color ──');
  page = await abrir({ flag:true });
  await ver(page, 'conta');
  r = await leer(page, 'conta');
  chk('2a. Contabilidad: franja ámbar de 4 px', r.marca && r.bt==='4px' && r.btc==='rgb(217, 119, 6)', r);
  chk('2b. y el brillo ámbar que baja (en el fondo de la tarjeta)', /linear-gradient/.test(r.img) && /(251, 191, 36|0\.98\d* 0\.74\d* 0\.14\d*)/.test(r.img) && /0\.22/.test(r.img), r.img);
  chk('2c. el piquito debajo de la pestaña, en su color', r.activa && r.pico && r.picoC==='rgb(217, 119, 6)', r);
  chk('2d. el piquito llega a la tarjeta (±3 px)', Math.abs(r.picoAbajo-r.cardArriba)<=3, [r.picoAbajo, r.cardArriba]);
  const colores={ mis:'rgb(29, 78, 216)', atc:'rgb(190, 24, 93)', bot:'rgb(71, 85, 105)' };
  for(const v of Object.keys(colores)){
    if(v==='bot') await page.evaluate(() => { var b=document.getElementById('tab-bot'); if(b) b.hidden=false; });
    await ver(page, v);
    r = await leer(page, v);
    chk('2e. '+v+': franja '+colores[v]+' y su piquito', r.bt==='4px' && r.btc===colores[v] && (!r.activa || (r.pico && r.picoC===colores[v])), r);
  }
  r = await leer(page, 'admin');
  chk('2f. Administración: franja violeta (la tarjeta de adentro, `#admin-content > .card`)', r.bt==='4px' && r.btc==='rgb(109, 40, 217)', r);
  await ver(page, 'form');
  r = await page.evaluate(() => { var p=getComputedStyle(document.getElementById('tab-form'), '::before'); return { pico:p.content!=='none' && p.content!=='normal', act:document.getElementById('tab-form').classList.contains('active') }; });
  chk('2g. en «Nuevo pedido» no hay piquito (esa tarjeta no se tiñe)', r.act && !r.pico, r);
  await page._ctx.close();

  console.log('\n── 3. En el celular ──');
  page = await abrir({ flag:true, w:390, h:844 });
  await ver(page, 'atc');
  r = await leer(page, 'atc');
  chk('3a. 390 px: la franja rosa sigue y el piquito no (las pestañas van abajo)', r.bt==='4px' && r.btc==='rgb(190, 24, 93)' && !r.pico, r);
  await page._ctx.close();

  console.log('\n── 4. Con los temas oscuros, el vidrio sigue ──');
  const temas=[ { n:'Black Friday', q:'?tema=black-friday', bg:'rgba(10, 10, 12, 0.5)' },
                { n:'Todos Santos', q:'?tema=todos-santos', bg:null },
                { n:'Navidad (fondo de noche)', q:'?tema=navidad', noche:true, fecha:'2026-12-10T10:00:00-04:00', bg:null } ];
  for(const t of temas){
    const sin = await abrir({ q:t.q, noche:t.noche, fecha:t.fecha });
    await ver(sin, 'conta');
    const a = await leer(sin, 'conta'), la = await colorLetra(sin, '#view-conta > .card #cta-tab button');
    await sin._ctx.close();
    const con = await abrir({ flag:true, q:t.q, noche:t.noche, fecha:t.fecha });
    await ver(con, 'conta');
    const b = await leer(con, 'conta'), lb = await colorLetra(con, '#view-conta > .card #cta-tab button');
    await con._ctx.close();
    chk('4. '+t.n+': el mismo vidrio (fondo '+b.bg+') y el borde de los costados igual', a.bg===b.bg && a.blc===b.blc && (!t.bg || b.bg===t.bg), [a.bg, b.bg, a.blc, b.blc]);
    chk('4. '+t.n+': la franja ámbar arriba y el brillo', b.bt==='4px' && b.btc==='rgb(217, 119, 6)' && /linear-gradient/.test(b.img), b);
    chk('4. '+t.n+': las letras de la tarjeta del mismo color que sin la bandera', la && la===lb, [la, lb]);
  }

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
