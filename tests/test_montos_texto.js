/* 💵 LOS CAMPOS DE PLATA SE TIPEAN COMO SE ESCRIBE EN BOLIVIA (26/09).
   Con `type="number"`, Chromium tira la coma ANTES de que el panel vea el valor: «1.500,50»
   quedaba «1.50050» (Bs 1,50) y «1500,50» quedaba «150050» (Bs 150.050). El Cuadre ya lo había
   arreglado en el arqueo y los retiros (test_rev2_cuadre §1); acá, los otros doce: el formulario
   (A cuenta, Saldo, Monto cobrado, flete, 2° método, precio c/u) y Contabilidad (Registrar pago,
   Corregir este pago, el flete, Corregir precios y montos). Se prueba tipeando con el teclado de
   verdad, no poniendo `.value`.
   Se corre:  node tests/test_montos_texto.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const ARCH = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  // ── 1. En el código: ninguno de los doce es type="number", todos con teclado decimal ──
  const src = fs.readFileSync(ARCH, 'utf8');
  const ids = ['f-acuenta','f-saldo','f-cobrado','f-envio','f-monto2','cta-env-monto','cta-ed-monto','cta-pago-monto','cta-acuenta','cta-saldo'];
  const tagDe = (id) => { const m = src.match(new RegExp('<input[^>]*id="'+id+'"[^>]*>')); return m ? m[0] : ''; };
  const malos = ids.filter(id => { const t = tagDe(id); return !t || /type="number"/.test(t) || !/inputmode="decimal"/.test(t); });
  chk('los diez campos de plata con id son texto con teclado decimal (no type="number")', malos.length===0, malos.join(', '));
  const pr = src.match(/<input[^>]*class="cta-pr"[^>]*>/);
  chk('…y el precio c/u de «Corregir precios y montos» también', !!pr && !/type="number"/.test(pr[0]) && /inputmode="decimal"/.test(pr[0]), pr && pr[0].slice(0,120));
  chk("…y el precio c/u del formulario (se arma por código)", /pIn\.type='text'; pIn\.setAttribute\('inputmode','decimal'\)/.test(src) && !/pIn\.type='number'/.test(src));

  // ── 2. Tipeando de verdad ──
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz', locale:'es-BO' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());          // nada de red
  await page.clock.setFixedTime(new Date('2026-09-23T10:00:00-04:00'));
  await page.goto('file://' + ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const tipear = async (sel, txt) => { await page.click(sel, { clickCount:3 }); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.type(txt); };

  // formulario
  await page.evaluate(() => { var c=document.getElementById('conn-form'); if(c) c.style.display='none'; showView('form'); resetForm(); segSet('f-pagado','NO'); updateMetodoVisibility(); });
  await page.waitForTimeout(150);
  await tipear('#f-acuenta', '1.500,50');
  let r = await page.evaluate(() => ({ v:document.getElementById('f-acuenta').value, n:montoForm('f-acuenta') }));
  chk('formulario · «A cuenta» tipeado «1.500,50» queda así y vale 1.500,50', r.v==='1.500,50' && r.n===1500.5, JSON.stringify(r));
  await tipear('#f-saldo', '1500,50');
  r = await page.evaluate(() => ({ v:document.getElementById('f-saldo').value, n:montoForm('f-saldo') }));
  chk('formulario · «Saldo» tipeado «1500,50» vale 1.500,50 (no 150.050)', r.v==='1500,50' && r.n===1500.5, JSON.stringify(r));
  await page.evaluate(() => { segSet('f-pagado','SI'); updateMetodoVisibility(); });
  await tipear('#f-cobrado', '3.500');
  r = await page.evaluate(() => montoForm('f-cobrado'));
  chk('formulario · «Monto total cobrado» «3.500» vale 3.500', r===3500, r);
  const hayPrecio = await page.$('#f-productos .prod-precio');
  if (hayPrecio) {
    await tipear('#f-productos .prod-precio', '1.250,75');
    r = await page.evaluate(() => { var e=document.querySelector('#f-productos .prod-precio'); return { v:e.value, n:montoForm(e), t:e.type }; });
    chk('formulario · «Precio c/u» «1.250,75» vale 1.250,75', r.v==='1.250,75' && r.n===1250.75 && r.t==='text', JSON.stringify(r));
  } else chk('formulario · hay un renglón de producto para tipear el precio', false);

  // Contabilidad: Registrar pago
  await page.evaluate(() => {
    UNLOCKED=true; CONNECTED=false;
    STATE=[{ id:'V1', fecha:'2026-09-24', turno:'AM', oc:'09-101', nota:'501', vendedor:'Carola Chavez', cliente:'CLIENTE PRUEBA', celular:'7',
             zona:'Norte', direccion:'Av', maps:'', pagado:false, saldo:3000, acuenta:0, cobradoBs:0, metodoPago:'', observaciones:'',
             estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, ts:new Date('2026-09-22T10:00:00-04:00').getTime(),
             productos:[{desc:'COLCHON', cant:1, precio:3000}] }];
    showView('conta'); showContaModal('V1');
  });
  await page.waitForTimeout(200);
  const hayPago = await page.$('#cta-pago-monto');
  if (hayPago) {
    await tipear('#cta-pago-monto', '1.500,50');
    r = await page.evaluate(() => { var e=document.getElementById('cta-pago-monto'); return { v:e.value, n:parseMonto(e.value), t:e.type }; });
    chk('Contabilidad · «Registrar pago» «1.500,50» queda así y vale 1.500,50', r.v==='1.500,50' && r.n===1500.5 && r.t==='text', JSON.stringify(r));
  } else chk('Contabilidad · la ficha muestra «Registrar pago»', false);

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
