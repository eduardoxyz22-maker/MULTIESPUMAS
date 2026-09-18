/* 🔢 LOS HUECOS DEL TALONARIO CUENTAN LOS RECIBOS DE LOS PAGOS (§4eh).

   «Revisar antes de cerrar» avisa los N° de nota salteados por vendedora: si están la 1753
   y la 1756 pero no la 1754 ni la 1755, esos recibos existen en papel y no en el sistema.
   Pero el talonario también se usa para los recibos de los PAGOS posteriores (el saldo que
   el cliente paga después lleva su propio N°, guardado como «#1758» dentro del pago), y el
   control miraba solo la nota de la venta: un recibo de saldo bien cargado seguía saliendo
   como faltante. El dueño (18/09): *"la nota 1758 ya se corrigió y añadió pero sigue
   saliendo como sugerencia"*.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Que la nota de un pago tape el hueco igual que la nota de una venta.
   2. Que una venta SIN nota pero con recibo en el pago también cuente.
   3. Que las reglas viejas sigan: solo números pelados, huecos de hasta HUECO_MAX, nada
      en las puntas, y por vendedora (la nota de un pago de Carola no tapa un hueco de Isabel).

   Se corre:  node tests/test_talonario.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  const R = await page.evaluate(() => {
    var casos=[]; var chk=function(n, ok, det){ casos.push({n:n, ok:!!ok, det:det}); };
    var mk=function(nota, pago, vend){ return { id:'t'+Math.random().toString(36).slice(2), vendedor:vend||'Isabel Robledo', cliente:'X', nota:nota, metodoPago:pago||'', ts:Date.now(), productos:[] }; };
    var faltan=function(list, v){ var h=huecosTalonario(list).filter(function(x){ return x.vendedor===(v||'Isabel Robledo'); })[0]; return h?h.faltan.join(','):''; };
    chk('sin el pago: entre 1753 y 1756 faltan 1754 y 1755', faltan([mk('1753'), mk('1756')])==='1754,1755', faltan([mk('1753'), mk('1756')]));
    chk('⚠️ el recibo del pago (#1755) tapa su hueco: queda solo 1754', faltan([mk('1753', 'QR BISA 3000 @2026-09-14 #1755'), mk('1756')])==='1754', faltan([mk('1753', 'QR BISA 3000 @2026-09-14 #1755'), mk('1756')]));
    chk('el caso del dueño: 1753 con saldo #1758, 1757 y 1760 cargadas → la 1758 ya no figura; faltan 1754-1756 y 1759', faltan([mk('1753', 'Efectivo 3000 @2026-09-14 #1758'), mk('1757'), mk('1760')])==='1754,1755,1756,1759', faltan([mk('1753', 'Efectivo 3000 @2026-09-14 #1758'), mk('1757'), mk('1760')]));
    chk('una venta SIN nota pero con recibo en el pago también cuenta', faltan([mk('', 'QR BISA 500 @2026-09-14 #1754'), mk('1753'), mk('1756')])==='1755', faltan([mk('', 'QR BISA 500 @2026-09-14 #1754'), mk('1753'), mk('1756')]));
    chk('el anticipo (~) con su recibo también', faltan([mk('1753', '~Efectivo 100 #1755'), mk('1756')])==='1754');
    chk('un recibo de OTRA vendedora no tapa el hueco de Isabel', faltan([mk('1753'), mk('1756'), mk('900', 'QR BISA 10 #1754', 'Carola Chavez')])==='1754,1755');
    chk('un recibo que no es número pelado («001-08») no entra', faltan([mk('1753', 'QR BISA 10 #001-08'), mk('1756')])==='1754,1755');
    chk('un salto mayor que HUECO_MAX sigue siendo otro talonario, no un hueco', faltan([mk('1700'), mk('1753')])==='');
    chk('nada en las puntas: la última nota no genera faltantes hacia adelante', faltan([mk('1753', 'QR 10 #1760')])==='');
    return casos;
  });
  console.log('\n── Huecos del talonario con recibos de pagos ──');
  R.forEach(c => chk(c.n, c.ok, c.det));
  chk('sin errores de JavaScript en la página', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
