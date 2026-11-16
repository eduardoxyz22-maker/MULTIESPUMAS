/* 💾 MEJORA 372 — «GUARDAR PEDIDO» SIEMPRE A MANO, EN «TU PEDIDO» (16/11/2026; dueño: «quisiera verlo, espero no se vea feo»).

   «Guardar pedido» estaba solo al final del formulario (a 2.571 px de arriba en una compu de 1.366). Ahora, debajo de «Para guardar» de la
   columna de la derecha (pantalla de 1.120 px o más), un botón grande: gris «Faltan 2: Zona, Celular» mientras falte algo (cada «○ …» lleva a
   su campo) y turquesa «💾 Guardar pedido» cuando está todo: es EL MISMO botón de abajo (`f-submit.click()`).

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `GUARDAR_LADO_PRUEBA` (Playwright): «Tu pedido» como siempre (ningún botón, los «○ …» son etiquetas).
   2. Con la bandera, un pedido a medio llenar: gris, «Faltan N: …» con EXACTAMENTE lo que «Para guardar» marca en ámbar; tocarlo NO guarda
      (no toca `f-submit`) y lleva al primero que falta.
   3. Tocar un «○ Zona» lleva al campo Zona (queda con el foco).
   4. Con todo listo: turquesa «💾 Guardar pedido»; tocarlo es tocar el de abajo una vez (un solo `click` en `f-submit`) y el pedido se
      guarda por el camino de siempre (`apiSave`), igual que con el de abajo.
   5. Editando: «💾 Guardar cambios».
   6. Más angosto que 1.120 px, «Tu pedido» no se ve y nada cambia.
   Datos INVENTADOS. Reloj: martes 03/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_guardar_lado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (flag, w) => {
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    if(flag) await page.addInitScript(() => { window.GUARDAR_LADO_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.getElementById('conn-form').style.display='none';
      CONNECTED=true; UNLOCKED=false; CARGA_GEN++; CARGA_ESTADO='ok';
      try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      window._pl=[]; window._saves=0; window._clicks=0;
      apiSave=function(rec){ window._saves++; var g=JSON.parse(JSON.stringify(rec)); window._pl=window._pl.filter(function(x){ return x.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
      apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._pl)) }); };
      STATE=[]; saveMirror();
      document.getElementById('f-submit').addEventListener('click', function(){ window._clicks++; }, true);
      /* Eduardo (sin celular, nota ni cobro obligatorios): con vendedor, cliente, un producto, fecha y zona está todo */
      window._llenar=function(o){ o=o||{};
        showView('form'); resetForm();
        document.getElementById('f-fecha').value='2026-11-04'; segSet('f-turno','AM');
        document.getElementById('f-vendedor').value='Eduardo Añez'; applyVendedorLite();
        document.getElementById('f-cliente').value='CLIENTE INVENTADO';
        document.getElementById('f-zona').value=o.sinZona ? '' : 'Norte';
        document.getElementById('f-direccion').value='CALLE FALSA 1';
        var box=document.getElementById('f-productos'); box.innerHTML=''; addProdRow('TITANIO LATEX','160x190','',1,''); refreshDelButtons();
        fxDerPintar(); };
      window._der=function(){ fxDerPintar(); var d=document.getElementById('fx-der'), b=d && d.querySelector('.glado');
        return { vis:!!(d && d.offsetParent), btn:b ? b.textContent.replace(/\s+/g,' ').trim() : null, ok:!!(b && b.classList.contains('glado-ok')),
          no:[].map.call(d ? d.querySelectorAll('.fx-chk .no') : [], function(x){ return x.textContent.replace(/^○\s*/,'').trim(); }),
          chipsBtn:d ? d.querySelectorAll('.fx-chk button').length : 0 }; };
    });
    page._ctx=ctx; return page;
  };

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  let r = await page.evaluate(() => { _llenar({ sinZona:true }); return _der(); });
  chk('1a. sin la bandera: «Tu pedido» como siempre (sin botón, los «○ …» son etiquetas)', r.vis && r.btn===null && r.chipsBtn===0 && r.no.indexOf('Zona')>=0, r);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  r = await page.evaluate(() => { _llenar({ sinZona:true }); return _der(); });
  chk('2a. falta la zona: botón gris «Falta 1: Zona»', r.vis && !r.ok && r.btn==='Falta 1: Zona' && r.no.join(',')==='Zona', r);
  r = await page.evaluate(() => { resetForm(); document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite(); return _der(); });
  chk('2b. un pedido recién empezado: «Faltan N: …» con EXACTAMENTE lo que «Para guardar» marca en ámbar ('+r.no.length+')',
    !r.ok && r.no.length>=3 && r.btn==='Faltan '+r.no.length+': '+r.no.join(', '), r);
  r = await page.evaluate(async () => { window.scrollTo(0,0); var n=window._clicks, s=window._saves; document.querySelector('#fx-der .glado').click(); await new Promise(x=>setTimeout(x, 700));
    var a=document.activeElement; return { clicks:window._clicks-n, saves:window._saves-s, foco:a ? a.id : '', y:Math.round(window.scrollY) }; });
  chk('2c. tocar el gris NO guarda (no toca el de abajo) y lleva al primero que falta, con el foco', r.clicks===0 && r.saves===0 && r.foco==='f-cliente', r);
  r = await page.evaluate(async () => { _llenar({ sinZona:true }); window.scrollTo(0,0); await new Promise(x=>setTimeout(x, 100));
    var c=[].filter.call(document.querySelectorAll('#fx-der .fx-chk button'), function(b){ return /Zona/.test(b.textContent); })[0]; if(c) c.click();
    var vista=function(){ var q=document.getElementById("f-zona").getBoundingClientRect(); return document.activeElement && document.activeElement.id==='f-zona' && q.top>=0 && q.bottom<=innerHeight; };
    await new Promise(x=>setTimeout(x, 1600)); for(var i=0;i<30 && !vista();i++) await new Promise(x=>setTimeout(x, 100)); var a=document.activeElement, z=document.getElementById("f-zona").getBoundingClientRect();
    return { hay:!!c, foco:a ? a.id : "", enPantalla:z.top>=0 && z.bottom<=innerHeight, top:Math.round(z.top), y:Math.round(scrollY), marca:!!document.querySelector(".glado-ojo") }; });
  chk('3a. tocar «○ Zona» lleva al campo Zona: a la vista y con el foco', r.hay && r.foco==='f-zona' && r.enPantalla, r);
  r = await page.evaluate(async () => { _llenar(); return _der(); });
  chk('4a. con todo listo: turquesa «💾 Guardar pedido»', r.ok && r.btn==='💾 Guardar pedido' && r.no.length===0, r);
  r = await page.evaluate(async () => { var n=window._clicks, s=window._saves; document.querySelector('#fx-der .glado-ok').click(); await new Promise(x=>setTimeout(x, 1500));
    var g=window._pl[window._pl.length-1]||{}; return { clicks:window._clicks-n, saves:window._saves-s, cli:g.cliente, vend:g.vendedor, zona:g.zona, fecha:g.fecha }; });
  chk('4b. tocarlo es tocar el de abajo UNA vez, y el pedido se guarda por el camino de siempre', r.clicks===1 && r.saves>=1 && r.cli==='CLIENTE INVENTADO' && r.zona==='Norte' && r.fecha==='2026-11-04', r);
  /* lo mismo con el botón de abajo: mismo resultado */
  r = await page.evaluate(async () => { var a=window._pl[window._pl.length-1]; window._pl=[]; STATE=[]; saveMirror(); _llenar(); var s=window._saves; document.getElementById('f-submit').click(); await new Promise(x=>setTimeout(x, 1500));
    var b=window._pl[window._pl.length-1]||{}; var k=function(p){ return p ? [p.cliente, p.vendedor, p.zona, p.fecha, p.turno, JSON.stringify((p.productos||[]).map(function(x){ return [x.desc, x.medida, x.cant]; }))].join('|') : ''; };
    return { igual:k(a)===k(b), a:k(a), b:k(b), saves:window._saves-s }; });
  chk('4c. con el botón de abajo, el MISMO pedido guardado', r.igual && r.saves>=1, r);
  r = await page.evaluate(async () => { var p=window._pl[window._pl.length-1]; STATE=window._pl.slice(); editPedido(p.id); await new Promise(x=>setTimeout(x, 400)); return _der(); });
  chk('5a. editando: «💾 Guardar cambios»', r.ok && r.btn==='💾 Guardar cambios', r);
  await page._ctx.close();

  console.log('\n── 6. Angosto ──');
  page = await abrir(true, 1000);
  r = await page.evaluate(() => { _llenar(); var d=document.getElementById('fx-der'); return { vis:!!(d && d.offsetParent), btn:!!(d && d.querySelector('.glado')) }; });
  chk('6a. en 1.000 px «Tu pedido» no se ve (ni el botón)', !r.vis && !r.btn, r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
