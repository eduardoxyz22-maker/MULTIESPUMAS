/* 🖼️ VARIAS IMÁGENES A LA VEZ (12/10). El dueño, con captura del «Comprobante del pago»: *«no deja subir más de 1 foto a la vez»*.
   ⚠️ LO QUE CUIDA (rojo contra lo publicado, `e2f1021`, que solo aceptaba una):
   1. Formulario: elegir 3 imágenes juntas las sube las 3 al pago, de a una.
   2. Contabilidad (el pago que se está por registrar): 2 juntas → las 2.
   3. Elegir 6 sube solo hasta el tope (4) y lo dice.
   Imágenes de 1 píxel hechas en la prueba; la subida a Drive es de mentira.  Se corre:  node tests/test_comp_varias.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const IMGS = [0,1,2,3,4,5].map(i => { const f = path.join(DIR, 'c'+i+'.png'); fs.writeFileSync(f, PNG); return f; });

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(p){ return Promise.resolve({ ok:true, pedido:p }); };
    window._sub=0; window._vuelo=0; window._max=0;
    fotoCronometro=function(){ return Promise.resolve('data:image/png;base64,xx'); };
    subirFoto=function(){ window._vuelo++; window._max=Math.max(window._max, window._vuelo);
      return new Promise(function(r){ setTimeout(function(){ window._vuelo--; window._sub++; r({ ok:true, fotoId:'F'+window._sub }); }, 120); }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
  });
  const esperaQuieta = async () => { for (let i=0;i<40;i++){ await page.waitForTimeout(150); if (await page.evaluate(() => COMP_SUBIENDO===0 && window._vuelo===0)) break; } await page.waitForTimeout(200); };

  console.log('\n── 1. Formulario ──');
  await page.evaluate(() => { tabNuevoPedido(); FORM_COMPS=[]; COMP_DESTINO=1; });
  chk('el selector acepta varias', await page.evaluate(() => document.getElementById('fcomp-input').multiple === true));
  await page.setInputFiles('#fcomp-input', IMGS.slice(0,3));
  await esperaQuieta();
  let r = await page.evaluate(() => ({ comps:FORM_COMPS, max:window._max }));
  chk('3 imágenes juntas → las 3 en el pago, subidas de a una', r.comps.length===3 && r.max===1, r);

  console.log('\n── 2. Contabilidad: el pago que se está por registrar ──');
  r = await page.evaluate(() => { STATE=[{ id:'p1', oc:'10-001', cliente:'ANA', vendedor:'Mirian Salazar', fecha:'2026-10-15', productos:[{desc:'TITANIO',medida:'140x190',cant:1,precio:3000}], saldo:3000, acuenta:0, pagado:false, metodoPago:'', ts:Date.now(), fotos:[] }];
    CTA_PAGO={ comps:[] }; ctaAdjuntar('p1'); return document.getElementById('comp-input').multiple; });
  await page.setInputFiles('#comp-input', IMGS.slice(0,2));
  await esperaQuieta();
  r = await page.evaluate(() => ({ comps:CTA_PAGO.comps }));
  chk('2 imágenes juntas → las 2 en el pago', r.comps && r.comps.length===2, r);

  console.log('\n── 3. Más que el tope ──');
  await page.evaluate(() => { FORM_COMPS=[]; COMP_DESTINO=1; window._toasts=[]; });
  await page.setInputFiles('#fcomp-input', IMGS);
  await esperaQuieta();
  r = await page.evaluate(() => ({ n:FORM_COMPS.length, max:COMP_MAX, toasts:window._toasts }));
  chk('6 elegidas → se suben hasta el tope y se dice', r.n===r.max && r.toasts.some(t => /se suben las primeras/.test(t)), r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
