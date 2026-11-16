/* 🖥️ MEJORA 371 — MIS PEDIDOS: «TU DÍA» AL COSTADO Y LOS PEDIDOS ARRIBA (16/11/2026; dueño: «me gusta»).

   Con una vendedora elegida, «Para hacer» se estiraba hasta el alto de «Tu día» y la lista de pedidos empezaba dos pantallas abajo; al bajar,
   «Tu día» se iba. En la compu (1.300 px o más): dos columnas; a la izquierda «Para hacer» con su alto justo, los filtros y las tarjetas; a la
   derecha «Tu día», pegado al costado mientras se baja. Solo CSS: no se mueve ningún nodo.

   LO QUE ESTA PRUEBA CUIDA (los datos de `test_mis_comision.js`):
   1. Sin la bandera `MIS_ANCHA_PRUEBA` (con `MIS_TOP_PRUEBA`, como hoy): las dos cajas arriba, del mismo alto, y la lista abajo.
   2. Con la bandera en 1366: «Tu día» a la derecha (370 px) y «Para hacer» a la izquierda con su alto justo (más bajo que «Tu día»);
      la lista de pedidos a la izquierda, debajo de «Para hacer», y empieza más arriba que antes.
   3. Al bajar, «Tu día» se queda pegado arriba (debajo del encabezado), a la vista, con su propio scroll si no entra.
   4. Al repintar (renderMis) queda igual; los mismos nodos de siempre (#mis-top, .ah-card, .td, #mis-lista).
   5. «👑 Ver todos» queda como estaba (sin las dos columnas).
   6. Más angosto que 1.300 px, como siempre; sin scroll a lo ancho.
   Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_mis_ancha.js */
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
  const abrir = async (flag, w, h) => {
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:h||768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    if(flag) await page.addInitScript(() => { window.MIS_ANCHA_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate('('+PREPARAR+')()');
    /* unos pedidos más de Isabel, para que la lista se vea y la página baje */
    await page.evaluate(() => { var ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); };
      for(var i=0;i<10;i++) window._L.push({ id:'z'+i, oc:'11-2'+(10+i), nota:'Z'+i, cliente:'CLIENTE EXTRA '+i, celular:'7100010'+i, fecha:'2026-11-'+(16+(i%5)), turno:'AM', zona:'Norte', direccion:'CALLE '+i,
        maps:'https://maps.google.com/?q=-17.78,-63.18', vendedor:'Isabel Robledo', productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:3000 }], saldo:3000, acuenta:0, pagado:false, metodoPago:'', ts:ts('2026-11-1'+(i%3)), rev:1 }); });
    page._ctx=ctx; return page;
  };
  const medir = (page, todos) => page.evaluate(async (todos) => {
    await _ver('Isabel Robledo', todos);
    var card=document.getElementById('mis-vendedor').closest('.card'), ah=document.querySelector('#mis-top > .ah-card'), td=document.querySelector('#mis-top > .td'), l=document.querySelector('#mis-lista .cho-card');
    var b=function(e){ if(!e) return null; var r=e.getBoundingClientRect(); return { l:Math.round(r.left), r:Math.round(r.right), t:Math.round(r.top+scrollY), h:Math.round(r.height), w:Math.round(r.width) }; };
    var cards=[].slice.call(document.querySelectorAll('#mis-lista .cho-card')).slice(0,2).map(b);
    return { ancha:card.classList.contains('mis-ancha'), grid:getComputedStyle(card).display, ah:b(ah), td:b(td), lista:b(l), dos:cards, sw:document.documentElement.scrollWidth, iw:innerWidth,
      pos:td ? getComputedStyle(td).position : '' };
  }, todos);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  const sin = await medir(page);
  chk('1a. sin la bandera: las dos cajas arriba, del mismo alto, y la lista abajo de las dos', !sin.ancha && sin.ah && sin.td && Math.abs(sin.ah.h-sin.td.h)<=2 && sin.lista.t>Math.max(sin.ah.t+sin.ah.h, sin.td.t+sin.td.h), sin);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera, 1366 ──');
  page = await abrir(true);
  let r = await medir(page);
  chk('2a. dos columnas: «Tu día» a la derecha (370 px) y «Para hacer» a la izquierda', r.ancha && r.grid==='grid' && r.td.w===370 && r.td.l>r.ah.r && r.ah.t===r.td.t, r);
  chk('2b. «Para hacer» con su alto justo (más bajo que «Tu día»: '+r.ah.h+' contra '+r.td.h+')', r.ah.h<r.td.h-20 && r.ah.h<sin.ah.h-20, [r.ah.h, r.td.h, sin.ah.h]);
  chk('2c. la lista de pedidos a la izquierda, debajo de «Para hacer», y empieza más arriba que antes ('+sin.lista.t+' → '+r.lista.t+')',
    r.lista.r<=r.td.l && r.lista.t>r.ah.t+r.ah.h && r.lista.t<sin.lista.t-100, [sin.lista, r.lista]);
  chk('2d. las tarjetas siguen de a dos en 1366', r.dos.length===2 && r.dos[0].t===r.dos[1].t && r.dos[1].l>r.dos[0].r, r.dos);
  r = await page.evaluate(async () => { window.scrollTo(0, 1400); await new Promise(x=>setTimeout(x, 700));
    var td=document.querySelector('#mis-top > .td'), b=td.getBoundingClientRect(), hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'));
    return { top:Math.round(b.top), bot:Math.round(b.bottom), hh:hh, ih:innerHeight, y:Math.round(scrollY), sh:td.scrollHeight, ch:td.clientHeight, ov:getComputedStyle(td).overflowY }; });
  chk('3a. al bajar, «Tu día» queda pegado arriba (debajo del encabezado) y a la vista', r.y>=1000 && Math.abs(r.top-(r.hh+10))<=2 && r.bot<=r.ih+1, r);
  chk('3b. con su propio scroll si no entra en la pantalla', r.ov==='auto' && r.ch<=r.ih, r);
  r = await page.evaluate(async () => { window.scrollTo(0,0); renderMis(); renderMis(); await new Promise(x=>setTimeout(x, 300));
    var td=document.querySelector('#mis-top > .td'), ah=document.querySelector('#mis-top > .ah-card'), card=document.getElementById('mis-vendedor').closest('.card');
    return { ancha:card.classList.contains('mis-ancha'), padre:td && td.parentNode.id, padreAh:ah && ah.parentNode.id, der:td && td.getBoundingClientRect().left>ah.getBoundingClientRect().right, lista:document.getElementById('mis-lista').parentNode===card }; });
  chk('4a. al repintar queda igual, y con los mismos nodos de siempre (#mis-top con .ah-card y .td; #mis-lista en la tarjeta)', r.ancha && r.padre==='mis-top' && r.padreAh==='mis-top' && r.der && r.lista, r);
  r = await medir(page, true);
  chk('5a. «👑 Ver todos» queda como estaba (sin las dos columnas)', !r.ancha && r.grid!=='grid', r);
  await page._ctx.close();

  console.log('\n── 6. Angosto ──');
  page = await abrir(true, 1200, 800);
  r = await medir(page);
  chk('6a. en 1.200 px, como siempre (sin las dos columnas) y sin scroll a lo ancho', r.grid!=='grid' && r.sw<=r.iw, r);
  await page._ctx.close();
  page = await abrir(true, 1920, 1080);
  r = await medir(page);
  chk('6b. en 1.920 px (agrandado), dos columnas y sin scroll a lo ancho', r.grid==='grid' && r.td && r.td.l>r.ah.r && r.sw<=r.iw, r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
