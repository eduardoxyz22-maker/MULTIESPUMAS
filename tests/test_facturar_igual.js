/* 🧾 299 · «FACTURAR A» IGUAL AL CLIENTE EN UN TOQUE (15/11, dueño: aprobado).

   En noviembre 62 de 96 ventas con NIT tenían en «Facturar a» el mismo nombre del cliente, escrito dos veces; y 3 NIT tenían 11 o 14
   números (¿dos pegados?). Al lado de «Facturar a», «= el cliente» copia el nombre y, mientras nadie lo cambie a mano, sigue al cliente
   si se lo corrige. Debajo del NIT, una línea ámbar si tiene letras, menos de 5 o más de 12 números. Nunca frena.

   Lo que se mira:
     1. Sin la bandera (`FFI_PRUEBA`) nada nuevo.
     2. «= el cliente» copia el nombre y queda «✓ = el cliente».
     3. Corregir el cliente: «Facturar a» lo sigue.
     4. Escribir otra cosa en «Facturar a» corta el seguimiento: corregir el cliente ya no lo cambia.
     5. Sin cliente, avisa y no copia nada. Un pedido nuevo (resetForm) arranca sin seguir.
     6. El NIT: 16 números → «¿se pegaron dos?»; 3 números → «solo 3»; letras → «¿es un CI con complemento?»; 7 números o vacío → nada.
     7. Se guarda igual con un NIT raro (no frena) y «Facturar a» queda guardado.

   Reloj clavado en el lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_facturar_igual.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(flag) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.FFI_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.install({ time: new Date('2026-11-16T10:00:00-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.clock.runFor(400);
    await page.evaluate(() => {
      document.getElementById('conn-form').style.display = 'none';
      CONNECTED = true; UNLOCKED = false; window._pl = []; window._saves = 0;
      apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
      apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
      STATE = []; saveMirror(); showView('form'); resetForm();
      window._st = function () { var b = document.getElementById('ffi-igual'), a = document.getElementById('ffi-nit');
        return { chip: b ? b.textContent : null, on: b ? b.classList.contains('on') : null, fac: document.getElementById('f-facturar').value, aviso: a ? (a.hidden ? '' : a.textContent) : null }; };
    });
    return { ctx, page };
  }

  let { ctx, page } = await abrir(false);
  let r = await page.evaluate(() => _st());
  chk('1 sin la bandera: ni el botón ni el aviso', r.chip === null && r.aviso === null, r);
  await ctx.close();

  ({ ctx, page } = await abrir(true));
  await page.click('#f-cliente'); await page.keyboard.type('CARLOS MENDOZA');
  await page.click('#ffi-igual');
  r = await page.evaluate(() => _st());
  chk('2 «= el cliente» copia el nombre y queda «✓ = el cliente»', r.fac === 'CARLOS MENDOZA' && r.on && r.chip === '✓ = el cliente', r);
  await page.click('#f-cliente'); await page.keyboard.press('End'); await page.keyboard.type(' ROJAS');
  r = await page.evaluate(() => _st());
  chk('3 corregir el cliente: «Facturar a» lo sigue', r.fac === 'CARLOS MENDOZA ROJAS' && r.on, r);
  await page.fill('#f-facturar', ''); await page.click('#f-facturar'); await page.keyboard.type('EMPRESA SRL');
  await page.click('#f-cliente'); await page.keyboard.press('End'); await page.keyboard.type(' JR');
  r = await page.evaluate(() => _st());
  chk('4 escribir otra cosa en «Facturar a» corta el seguimiento', r.fac === 'EMPRESA SRL' && !r.on && r.chip === '= el cliente', r);
  await page.evaluate(() => { resetForm(); });
  await page.click('#ffi-igual');
  r = await page.evaluate(() => Object.assign(_st(), { toast: document.getElementById('toast').textContent }));
  chk('5a sin cliente avisa y no copia', r.fac === '' && /Escribí primero el nombre del cliente/.test(r.toast), r);
  await page.click('#f-cliente'); await page.keyboard.type('ANA');
  r = await page.evaluate(() => _st());
  chk('5b un pedido nuevo arranca sin seguir', r.fac === '' && !r.on, r);

  const nit = async (t) => { await page.fill('#f-nit', ''); await page.click('#f-nit'); if (t) await page.keyboard.type(t); return page.evaluate(() => _st().aviso); };
  let a = await nit('4567891210234567');
  chk('6a 16 números: «¿se pegaron dos?»', /tiene 16 números: ¿se pegaron dos\?/.test(a), a);
  a = await nit('123');
  chk('6b 3 números: «solo 3 números»', /solo 3 números/.test(a), a);
  a = await nit('1234567 LP');
  chk('6c con letras: «¿es un CI con complemento?»', /tiene letras/.test(a) && /complemento/.test(a), a);
  a = await nit('1234567');
  chk('6d 7 números: nada', a === '', a);
  a = await nit('');
  chk('6e vacío: nada', a === '', a);
  await nit('123');
  await page.evaluate(() => { resetForm(); });
  r = await page.evaluate(() => _st());
  chk('6f un pedido nuevo deja el aviso limpio', r.aviso === '', r);

  // 7. se guarda igual
  r = await page.evaluate(async () => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value = '2026-11-18'; segSet('f-turno', 'AM');
    document.getElementById('f-vendedor').value = 'Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value = 'CLIENTE INVENTADO';
    document.getElementById('ffi-igual').click();
    document.getElementById('f-nit').value = '4567891210234567';
    document.getElementById('f-celular').value = '70000000'; document.getElementById('f-zona').value = 'Norte'; document.getElementById('f-direccion').value = 'CALLE FALSA 1';
    var n = document.getElementById('f-nota'); if (n) n.value = '1234';
    var box = document.getElementById('f-productos'); box.innerHTML = ''; addProdRow('TITANIO LATEX', '160x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '3000';
    refreshDelButtons(); segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3000'; try { updateMetodoVisibility(); } catch (e) {}
    var n0 = window._saves; submitPedido(); await new Promise(function (res) { setTimeout(res, 500); });
    var g = window._pl[window._pl.length - 1] || {};
    return { guardo: window._saves > n0, fac: g.facturarA, nit: g.nit, toast: document.getElementById('toast').textContent };
  });
  await page.clock.runFor(600);
  chk('7 se guarda igual con un NIT raro y «Facturar a» = el cliente', r.guardo && r.fac === 'CLIENTE INVENTADO' && r.nit === '4567891210234567', r);
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await ctx.close();
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
