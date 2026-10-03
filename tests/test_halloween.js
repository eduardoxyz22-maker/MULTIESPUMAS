/* 🎃 EL TEMA DE HALLOWEEN (dueño, 03/10/2026: «la 1 y sí también al dashboard»).

   Solo apariencia, y solo en octubre con la fecha de Bolivia (UTC−4): se prende el 1/10 a las 00:00 y se apaga sola el 1/11
   a las 00:00, antes de Todos Santos. Lo que cuida esta prueba:
   1. El panel de pedidos: el encabezado de noche, la 🎃 al lado de MULTIESPUMAS y el número en naranja, solo en octubre.
   2. Los bordes del mes en hora de Bolivia (no en la hora del aparato ni en UTC).
   3. El dashboard de ventas (armado desde panel_template.html con los datos del index.html publicado): la caja de la marca
      de noche con la 🎃 y el ítem elegido del menú en morado, solo en octubre, en tema claro y oscuro.
   4. Sin errores de la página.

   Se corre:  node tests/test_halloween.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TEMPLATE = process.env.TEMPLATE || path.resolve('panel_template.html');

/* El dashboard se arma como lo arma generar.py: la plantilla con el bloque de datos del index.html publicado. */
function armarDashboard(){
  const idx = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const m = idx.match(/window\.PANEL_DATA\s*=\s*(\{[\s\S]*?\});/);
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const f = path.join(os.tmpdir(), 'test_halloween_dash.html');
  fs.writeFileSync(f, tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + m[1] + ';'));
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  /* El aparato está en otra zona a propósito (UTC): el corte tiene que ser el de Bolivia igual. */
  async function abrir(archivo, cuando, tema){
    const page = await browser.newPage({ viewport:{ width:1300, height:700 }, timezoneId:'UTC' });
    page.on('pageerror', e=>errores.push(e.message));
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(cuando));
    if (tema) await page.addInitScript(t => { try{ localStorage.setItem('heaven_theme', t); }catch(e){} }, tema);
    await page.goto('file://' + archivo, { waitUntil:'load' });
    await page.waitForTimeout(archivo===PEDIDOS ? 350 : 1500);
    return page;
  }
  const pedidos = async (cuando) => {
    const page = await abrir(PEDIDOS, cuando);
    const r = await page.evaluate(() => ({
      on: document.documentElement.classList.contains('tema-halloween'),
      calabaza: getComputedStyle(document.querySelector('.logo-h'), '::before').content,
      fondo: getComputedStyle(document.querySelector('.header')).backgroundImage,
      numero: getComputedStyle(document.querySelector('.hstat-v')).color,
      tela: getComputedStyle(document.querySelector('.header'), '::after').backgroundImage.slice(0, 30),
      pestana: getComputedStyle(document.querySelector('.nav button.active')).backgroundColor
    }));
    await page.close();
    return r;
  };

  // ═══ 1-2. Panel de pedidos ═══
  console.log('\n── 1-2. Panel de pedidos: solo en octubre, con la fecha de Bolivia ──');
  let r = await pedidos('2026-10-03T10:00:00-04:00');
  chk('3/10: el tema está prendido', r.on, r);
  chk('…la 🎃 al lado de MULTIESPUMAS', /🎃/.test(r.calabaza), r.calabaza);
  chk('…el encabezado de noche (morado #1a0b2e) y la telaraña', /26, 11, 46/.test(r.fondo) && /url\("data:image\/svg/.test(r.tela), r.fondo.slice(0,80));
  chk('…el número de cupos en naranja y la pestaña elegida en morado', r.numero==='rgb(251, 146, 60)' && r.pestana==='rgb(59, 13, 92)', [r.numero, r.pestana]);
  r = await pedidos('2026-09-30T23:59:00-04:00');
  chk('30/09 23:59 de Bolivia (ya 1/10 en UTC): apagado, el panel como siempre', !r.on && !/🎃/.test(r.calabaza) && !/26, 11, 46/.test(r.fondo) && r.numero==='rgb(255, 255, 255)', r);
  r = await pedidos('2026-10-01T00:01:00-04:00');
  chk('1/10 00:01 de Bolivia: prendido', r.on, r.on);
  r = await pedidos('2026-10-31T23:59:00-04:00');
  chk('31/10 23:59 de Bolivia (ya 1/11 en UTC): sigue prendido', r.on, r.on);
  r = await pedidos('2026-11-01T00:01:00-04:00');
  chk('1/11 00:01 de Bolivia: se apagó solo (Todos Santos)', !r.on && !/🎃/.test(r.calabaza), r.on);
  r = await pedidos('2027-10-15T12:00:00-04:00');
  chk('octubre del año que viene: vuelve solo', r.on, r.on);

  // ═══ 3. Dashboard de ventas ═══
  console.log('\n── 3. Dashboard de ventas: la caja de la marca y el menú, solo en octubre ──');
  const dash = armarDashboard();
  const tablero = async (cuando, tema) => {
    const page = await abrir(dash, cuando, tema);
    const out = await page.evaluate(() => {
      var b=document.querySelector('.rail .brand'), a=document.querySelector('.rail .ni.active');
      return { on:document.documentElement.classList.contains('tema-halloween'), oscuro:document.documentElement.getAttribute('data-theme')==='dark',
               calabaza:b?getComputedStyle(b,'::before').content:'', fondo:b?getComputedStyle(b).backgroundImage:'',
               menu:a?getComputedStyle(a).backgroundImage:'', datos:!!document.querySelector('.rail .ni') };
    });
    await page.close();
    return out;
  };
  r = await tablero('2026-10-03T10:00:00-04:00');
  chk('3/10, tema claro: la caja de la marca de noche con la 🎃', r.on && /🎃/.test(r.calabaza) && /26, 11, 46/.test(r.fondo), [r.on, r.calabaza, r.fondo.slice(0,60)]);
  chk('…y el ítem elegido del menú en morado', /91, 33, 182/.test(r.menu), r.menu.slice(0,80));
  r = await tablero('2026-10-03T10:00:00-04:00', 'dark');
  chk('3/10, tema oscuro: igual', r.oscuro && r.on && /🎃/.test(r.calabaza) && /26, 11, 46/.test(r.fondo), [r.oscuro, r.on]);
  r = await tablero('2026-11-01T00:01:00-04:00');
  chk('1/11: el dashboard como siempre (sin 🎃, sin el fondo de noche)', !r.on && !/🎃/.test(r.calabaza) && !/26, 11, 46/.test(r.fondo) && r.datos, [r.on, r.calabaza]);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
