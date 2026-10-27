/* 🎄 EL TEMA DE NAVIDAD (§4nc, 27/10; dueño: «arranca»). Como el de Halloween: solo apariencia, y solo en diciembre con la fecha de
   Bolivia (UTC−4): se prende el 1/12 a las 00:00 y se apaga solo el 1/1 a las 00:00.
   Lo que cuida esta prueba:
   1. El panel de pedidos: el encabezado de pino, la guirnalda de luces (dos tiras que titilan alternadas), el 🎄 al lado de MULTIESPUMAS,
      la estrella, el trineo, la nieve en la ruta y la pestaña elegida en verde; solo en diciembre.
   2. Los bordes del mes en hora de Bolivia; octubre sigue con Halloween y noviembre sin nada.
   3. Bloki con gorro de Papá Noel en diciembre (y sin gorro el resto del año); el de logística y el de vendedor siguen con su gorra.
   4. El dashboard de ventas: la caja de la marca de pino con el 🎄 y el ítem elegido en verde.
   5. La guirnalda no tapa el nombre del panel; sin errores.
   Se corre:  node tests/test_navidad.js   (NAV_CAP=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra)).slice(0,400)):''); };
const RAIZ = path.resolve(__dirname, '..');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const TEMPLATE = process.env.TEMPLATE || path.join(RAIZ, 'panel_template.html');
const CAP = process.env.NAV_CAP || '';

function armarDashboard(){
  const idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const m = idx.match(/window\.PANEL_DATA\s*=\s*(\{[\s\S]*?\});/);
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const f = path.join(os.tmpdir(), 'test_navidad_dash.html');
  fs.writeFileSync(f, tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + m[1] + ';'));
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(archivo, cuando, w){
    const page = await browser.newPage({ viewport:{ width:w||1300, height:760 }, timezoneId:'UTC' });   // el aparato en UTC a propósito
    page.on('pageerror', e=>errores.push(e.message));
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + archivo, { waitUntil:'load' });
    await page.waitForTimeout(archivo===PEDIDOS ? 350 : 1500);
    return page;
  }
  const pedidos = async (cuando, cap) => {
    const page = await abrir(PEDIDOS, cuando);
    const r = await page.evaluate(() => {
      var h=document.querySelector('.header'), b=getComputedStyle(h,'::before'), a=getComputedStyle(h,'::after');
      return { nav: document.documentElement.classList.contains('tema-navidad'), hw: document.documentElement.classList.contains('tema-halloween'),
        arbol: getComputedStyle(document.querySelector('.logo-h'), '::before').content,
        fondo: getComputedStyle(h).backgroundImage,
        luzA: b.backgroundImage.slice(0,26), luzB: a.backgroundImage.slice(0,26), anA: b.animationName, anB: a.animationName, delB: a.animationDelay,
        estrella: getComputedStyle(document.querySelector('.h-luna')).display, trineo: document.querySelector('.h-murc') ? getComputedStyle(document.querySelector('.h-murc i')).animationName : '',
        nieve: getComputedStyle(document.querySelector('.h-ruta'), '::after').animationName,
        pestana: getComputedStyle(document.querySelector('.nav button.active')).backgroundColor };
    });
    if(cap){   // la foto con el trineo y el camión a mitad de camino (las animaciones quietas en ese punto)
      await page.addStyleTag({ content:'.h-camion{animation-delay:-6s!important;animation-play-state:paused!important} html.tema-navidad .h-murc i:nth-child(1){animation-delay:-9s!important;animation-play-state:paused!important} html.tema-navidad .header::before,html.tema-navidad .header::after,html.tema-navidad .h-ruta::after,.hc-cuerpo,.hc-rayos,.hc-humo circle,.hc-faro{animation-play-state:paused!important}' });
      await page.waitForTimeout(200);
      await page.screenshot({ path:cap, clip:{ x:0, y:0, width:1300, height:200 } });
    }
    await page.close();
    return r;
  };

  console.log('\n── 1-2. Panel de pedidos: solo en diciembre, con la fecha de Bolivia ──');
  if(CAP) fs.mkdirSync(CAP,{recursive:true});
  let r = await pedidos('2026-12-10T10:00:00-04:00', CAP ? path.join(CAP,'navidad-encabezado.png') : '');
  chk('1 · el 10/12 está prendido', r.nav && !r.hw, r);
  chk('1 · el 🎄 al lado de MULTIESPUMAS', /🎄/.test(r.arbol), r.arbol);
  chk('1 · el encabezado de pino (verde oscuro)', /rgb\(11, 59, 44\)|rgb\(20, 83, 45\)/.test(r.fondo), r.fondo.slice(0,120));
  chk('1 · la guirnalda: dos tiras de luces que titilan alternadas', /^url\("data:image\/svg/.test(r.luzA) && /^url\("data:image\/svg/.test(r.luzB) && r.anA==='nv-luz' && r.anB==='nv-luz' && r.delB==='-0.8s', r);
  chk('1 · la estrella, el trineo y la nieve en la ruta', r.estrella==='block' && r.trineo==='nv-trineo' && r.nieve==='nv-nieve', r);
  chk('1 · la pestaña elegida en verde', r.pestana==='rgb(20, 83, 45)', r.pestana);
  r = await pedidos('2026-12-01T00:00:30-04:00');
  chk('2 · se prende el 1/12 a las 00:00 de Bolivia', r.nav, r.nav);
  r = await pedidos('2026-12-01T03:59:00Z');   // 30/11 23:59 en Bolivia
  chk('2 · el 30/11 a las 23:59 de Bolivia (03:59 UTC del 1/12) todavía no', !r.nav && !r.hw, r);
  r = await pedidos('2027-01-01T03:59:00Z');   // 31/12 23:59 en Bolivia
  chk('2 · el 31/12 a las 23:59 de Bolivia sigue', r.nav, r.nav);
  r = await pedidos('2027-01-01T04:00:30Z');   // 1/1 00:00 en Bolivia
  chk('2 · el 1/1 a las 00:00 de Bolivia se apaga solo', !r.nav, r.nav);
  r = await pedidos('2026-10-20T10:00:00-04:00');
  chk('2 · en octubre sigue Halloween, sin Navidad', r.hw && !r.nav && !/🎄/.test(r.arbol), r);
  r = await pedidos('2026-11-15T10:00:00-04:00');
  chk('2 · en noviembre, ninguno de los dos', !r.hw && !r.nav && r.estrella==='none', r);

  console.log('\n── 3. Bloki con gorro de Papá Noel ──');
  let page = await abrir(PEDIDOS, '2026-12-10T10:00:00-04:00');
  let b = await page.evaluate(() => { BLOKI_SRC={}; return { bloki:blokiSvg('bloki'), conta:blokiSvg('conta'), anuncio:blokiSvg('anuncio'), log:blokiSvg('logistica'), ven:blokiSvg('vendedor') }; });
  chk('3 · en diciembre Bloki lleva gorro (y no la chispa); también el de contabilidad y el del anuncio', /bk-gorro/.test(b.bloki) && !/class="bk-chispa"/.test(b.bloki) && /bk-gorro/.test(b.conta) && /bk-gorro/.test(b.anuncio), '');
  chk('3 · el de logística (casco) y el de vendedor (gorra) siguen con lo suyo', !/bk-gorro/.test(b.log) && !/bk-gorro/.test(b.ven), '');
  if(CAP){   // las cinco figuras de diciembre, en una página aparte
    const srcs=await page.evaluate(() => { BLOKI_SRC={}; return ['bloki','conta','anuncio','vendedor','logistica'].map(blokiSrc); });
    const f=path.join(os.tmpdir(), 'test_navidad_bloki.html');
    fs.writeFileSync(f, '<!doctype html><body style="margin:0;background:#f4f6f7;display:flex;gap:24px;padding:20px">'+srcs.map(x=>'<img style="width:150px;height:134px" src="'+x+'">').join('')+'</body>');
    const q=await browser.newPage({ viewport:{ width:900, height:200 } }); await q.goto('file://'+f); await q.waitForTimeout(400);
    await q.screenshot({ path:path.join(CAP,'navidad-bloki.png') }); await q.close();
  }
  await page.close();
  page = await abrir(PEDIDOS, '2026-11-15T10:00:00-04:00');
  b = await page.evaluate(() => { BLOKI_SRC={}; return blokiSvg('bloki'); });
  chk('3 · en noviembre, sin gorro y con su chispa', !/bk-gorro/.test(b) && /class="bk-chispa"/.test(b), '');
  await page.close();

  console.log('\n── 4. El dashboard de ventas ──');
  const dash = armarDashboard();
  page = await abrir(dash, '2026-12-10T10:00:00-04:00');
  let d = await page.evaluate(() => {
    var br=document.querySelector('.rail .brand'), ac=document.querySelector('.rail .ni.active');
    return { on:document.documentElement.classList.contains('tema-navidad'), fondo:br ? getComputedStyle(br).backgroundImage.slice(0,80) : '',
      arbol:br ? getComputedStyle(br,'::before').content : '', luz:br ? getComputedStyle(br,'::after').backgroundImage.slice(0,26) : '',
      activo:ac ? getComputedStyle(ac).backgroundImage.slice(0,80) : '' };
  });
  chk('4 · prendido en el dashboard: caja de pino con 🎄 y guirnalda; el ítem elegido en verde', d.on && /11, 59, 44/.test(d.fondo) && /🎄/.test(d.arbol) && /^url\("data:image\/svg/.test(d.luz) && /21, 128, 61/.test(d.activo), d);
  if(CAP) await page.screenshot({ path:path.join(CAP,'navidad-dashboard.png'), clip:{ x:0, y:0, width:1300, height:420 }, animations:'disabled' });
  await page.close();
  page = await abrir(dash, '2026-11-15T10:00:00-04:00');
  d = await page.evaluate(() => document.documentElement.classList.contains('tema-navidad'));
  chk('4 · en noviembre el dashboard sin Navidad', !d, d);
  await page.close();

  console.log('\n── 5. La guirnalda no tapa el nombre; el celular ──');
  page = await abrir(PEDIDOS, '2026-12-10T10:00:00-04:00');
  let g = await page.evaluate(() => { var h=document.querySelector('.header').getBoundingClientRect(), l=document.querySelector('.logo-h').getBoundingClientRect(), b=getComputedStyle(document.querySelector('.header'),'::before');
    return { top:l.top-h.top, alto:parseFloat(b.height) }; });
  chk('5 · las luces (24 px) quedan arriba del nombre MULTIESPUMAS', g.top>=g.alto-2, g);
  await page.close();
  page = await abrir(PEDIDOS, '2026-12-10T10:00:00-04:00', 390);
  g = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, alto:getComputedStyle(document.querySelector('.header'),'::before').height }));
  chk('5 · en el celular la guirnalda más chica y la página no se ensancha', g.alto==='18px' && g.sw<=g.cw+1, g);
  if(CAP) await page.screenshot({ path:path.join(CAP,'navidad-cel.png'), clip:{ x:0, y:0, width:390, height:160 }, animations:'disabled' });
  await page.close();

  chk('sin errores de la página', !errores.length, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
