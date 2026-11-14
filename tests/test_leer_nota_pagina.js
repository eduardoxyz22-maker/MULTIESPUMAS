/* 🧾 MEJORA 216 · LEER LA NOTA DE VENTA — LA PÁGINA («🧾 Leer la nota» en el formulario de un pedido nuevo).
   El dueño: «se saca una foto a la nota de venta escrita a mano y Claude llena el pedido: N° de nota, cliente, productos, precios y lo
   que pagó a cuenta». El servidor (`leerNota`, .gs 2026-11-14-a) lo prueba tests/test_leer_nota.js; acá, con `apiPost` de mentira:
   1. El botón aparece SOLO en un 📄 OC nuevo con el servidor nuevo (y en Playwright solo con `NOTA_PRUEBA`): no en ATC, RPT, venta de
      tienda, editando ni con el servidor de antes.
   2. La foto elegida (el input de archivo) se achica y va UNA vez como `{action:'leerNota', img:<base64 sin «data:»>, mt:'image/jpeg'}`.
   3. Llena SOLO lo vacío (nota, celular, NIT, dirección, a cuenta), suma las observaciones a lo escrito y no toca lo que ya estaba
      (el cliente escrito queda y se dice «No cambié…»).
   4. Los productos, con su código de la lista: por el código de la nota si es de ese producto y medida; si no, por el nombre y la medida
      (la identidad del stock, con el «✓ Lo reconocí» de siempre); un código de otra medida se avisa y se usa el del nombre.
   5. Con productos ya cargados no los pisa: los muestra con «Usar estos productos», que recién ahí los reemplaza.
   6. El saldo: con el total que se completa solo, la suma − a cuenta; sin él, el de la nota. «Para guardar»/los pasos se enteran.
   7. NUNCA guarda (ni `apiSave` ni otra acción que `leerNota`), y lo leído llega a un formulario que cambió mientras leía → se tira.
   8. Los «no»: tope del día, no se lee, sin conexión: el mensaje en castellano, sin tocar nada.
   Datos INVENTADOS. Reloj clavado (sábado 14/11/2026, 10:00 de Bolivia).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_leer_nota_pagina.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
/* Lo que «leyó» Claude (inventado), como lo devuelve el servidor (`notaNormal_`). */
const NOTA = {
  nota: '4512', fecha: '2026-11-13', entrega: '2026-11-18', cliente: 'ROSA PRUEBA INVENTADA', celular: '70011223 - 76655443', nit: '1234567', facturarA: '',
  direccion: 'Calle Falsa 123, Barrio Ejemplo', total: 4100, acuenta: 1000, saldo: 3100, metodo: 'qr', observaciones: 'Llamar antes de llegar',
  dudas: ['el segundo celular no se lee bien'], legible: true,
  productos: [ { desc: 'TITANIO ICE', medida: '140x190', cant: 1, precio: 3400, codigo: '' },
               { desc: 'ALMOHADA', medida: '50x70', cant: 1, precio: 700, codigo: 'CD1403' } ]
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-14T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  await ev((NOTA) => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    STATE = []; saveMirror();
    window.__S = { llamadas: [], guardados: 0, modo: 'ok', espera: null, nota: NOTA };
    apiSave = function (rec) { __S.guardados++; return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(rec)) }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: [] }); };
    apiPost = function (b) {
      b = JSON.parse(JSON.stringify(b)); __S.llamadas.push(b);
      if (b.action !== 'leerNota') return Promise.resolve({ ok: true });
      var r = __S.modo === 'ok' ? { ok: true, nota: JSON.parse(JSON.stringify(__S.nota)), usadas: 3, tope: 80, version: '2026-11-14-a' }
            : __S.modo === 'red' ? null
            : { ok: false, error: __S.modo, tope: 80, detalle: __S.modo === 'no_se_lee' ? 'la foto no parece una nota de venta' : '', version: '2026-11-14-a' };
      if (r === null) return Promise.reject(new Error('Failed to fetch'));
      if (__S.espera) return new Promise(function (ok) { __S.soltar = function () { ok(r); }; });
      return Promise.resolve(r);
    };
    showView('form'); resetForm();
  }, NOTA);

  const ve = () => ev(() => { var w = document.getElementById('nota-leer'); return !!w && !w.hidden && getComputedStyle(w).display !== 'none'; });

  console.log('\n── 1. Cuándo aparece el botón ──');
  let r = await ev(() => { SERVER_VER = '2026-11-14-a'; renderCupoForm(); var w = document.getElementById('nota-leer'); return !w.hidden; });
  chk('a. en Playwright sin NOTA_PRUEBA no aparece (aunque el servidor la tenga)', r === false, r);
  await ev(() => { window.NOTA_PRUEBA = 1; SERVER_VER = '2026-11-13-b'; resetForm(); });
  chk('b. con el servidor de antes (2026-11-13-b) no aparece', !(await ve()));
  await ev(() => { SERVER_VER = '2026-11-14-a'; renderCupoForm(); });
  chk('c. con el servidor 2026-11-14-a, en un 📄 OC nuevo, aparece arriba de «Datos del pedido»', await ve());
  r = await ev(() => { var w = document.getElementById('nota-leer'), s = [].slice.call(document.querySelectorAll('#view-form .sec')).filter(function (x) { return /Datos del pedido/.test(x.textContent); })[0];
    var f = document.getElementById('nota-leer-file');
    return { despues: !!(s && (s.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING)), antesNota: !!(w.compareDocumentPosition(document.getElementById('f-nota')) & Node.DOCUMENT_POSITION_FOLLOWING),
             accept: f.getAttribute('accept'), txt: document.getElementById('nota-leer-btn').textContent }; });
  chk('d. el botón dice «🧾 Leer la nota» y el archivo acepta fotos (image/*)', r.despues && r.antesNota && r.accept === 'image/*' && r.txt === '🧾 Leer la nota', r);
  await ev(() => { segSet('f-doc-tipo', 'ATC'); pintarDocTipo(true); });
  chk('e. en una 🎧 ATC no aparece', !(await ve()));
  await ev(() => { segSet('f-doc-tipo', 'RPT'); pintarDocTipo(true); });
  chk('f. en una 🏪 RPT no aparece', !(await ve()));
  await ev(() => { segSet('f-doc-tipo', 'OC'); pintarDocTipo(true); });
  chk('g. de vuelta a 📄 OC, aparece', await ve());
  await ev(() => { abrirVentaTienda(); });
  chk('h. en una venta de tienda no aparece', !(await ve()));
  await ev(() => { VENTA_TIENDA = false; resetForm(); STATE = [{ id: 'e1', oc: '11-200', nota: '999', cliente: 'OTRO CLIENTE INVENTADO', celular: '70000001', fecha: '2026-11-18', turno: 'AM', zona: 'Norte',
    vendedor: 'Carola Chavez', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 990 }], saldo: 990, acuenta: 0, ts: Date.now() - 3600000 }]; editPedido('e1'); });
  chk('i. editando un pedido que ya existe no aparece', !(await ve()));
  await ev(() => { cancelEdit(); STATE = []; resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; });
  chk('j. y en uno nuevo otra vez sí', await ve());
  r = await ev(() => { window.FP_PRUEBA = 1; try { fpPintar(); } catch (e) {} var w = document.getElementById('nota-leer'), p1 = document.getElementById('fp-1');
    var out = { armado: FP_ARMADO, enPaso1: !!(p1 && p1.contains(w)), ve: !w.hidden && w.offsetHeight > 0 }; return out; });
  chk('k. con el formulario en 4 pasos, el botón queda adentro del paso 1 «Cliente y venta» y se ve', r.armado && r.enPaso1 && r.ve, r);

  console.log('\n── 2. Leer: la foto va al servidor y llena solo lo vacío ──');
  await ev(() => {
    document.getElementById('f-cliente').value = 'CLIENTE YA ESCRITO';
    document.getElementById('f-obs').value = 'Portón verde';
  });
  const antes = await ev(() => ({ pasos: fxPasosEstado()[1] }));
  await page.setInputFiles('#nota-leer-file', { name: 'nota.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(() => window.__S.llamadas.some(function (b) { return b.action === 'leerNota'; }) && !NOTA_LEER.vuelo, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
  r = await ev(() => {
    var L = __S.llamadas.filter(function (b) { return b.action === 'leerNota'; })[0] || {};
    return { n: __S.llamadas.filter(function (b) { return b.action === 'leerNota'; }).length, mt: L.mt, img: String(L.img || '').slice(0, 30), data: /^data:/.test(String(L.img || '')), b64: /^[A-Za-z0-9+/]+=*$/.test(String(L.img || '')) };
  });
  chk('a. UNA consulta `leerNota` con la foto achicada en base64 (sin «data:…») y mt image/jpeg', r.n === 1 && r.mt === 'image/jpeg' && !r.data && r.b64, r);
  r = await ev(() => { var v = function (id) { return document.getElementById(id).value; };
    return { nota: v('f-nota'), cliente: v('f-cliente'), cel: v('f-celular'), nit: v('f-nit'), fac: v('f-facturar'), dir: v('f-direccion'), acu: v('f-acuenta'), obs: v('f-obs') }; });
  chk('b. N° de nota, celular, NIT, dirección y a cuenta, llenados', r.nota === '4512' && r.cel === '70011223 - 76655443' && r.nit === '1234567' && r.dir === 'Calle Falsa 123, Barrio Ejemplo' && r.acu === '1000', r);
  chk('c. el cliente que ya estaba escrito queda; «Facturar a» vacío en la nota queda vacío', r.cliente === 'CLIENTE YA ESCRITO' && r.fac === '', r);
  chk('d. las observaciones se SUMAN a lo escrito', r.obs === 'Portón verde\nLlamar antes de llegar', r.obs);
  r = await ev(() => [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) {
    var q = function (s) { var e = c.querySelector(s); return e ? e.value : ''; };
    return { d: q('.prod-desc'), m: q('.prod-medida'), c: q('.prod-codigo'), q: q('.prod-cant'), p: q('.prod-precio'), reco: (c.querySelector('.prod-reco') || {}).textContent || '' }; }));
  chk('e. dos renglones de productos (el vacío se reemplazó)', r.length === 2, r);
  chk('f. TITANIO ICE 140x190 → CH1220 por el nombre y la medida, con «✓ Lo reconocí» y el nombre como en la lista', r[0] && r[0].c === 'CH1220' && r[0].d === 'COLCHON TITANIO ICE' && r[0].m === '140x190' && r[0].p === '3400' && /Lo reconocí/.test(r[0].reco), r[0]);
  chk('g. la almohada por el código de la nota (CD1403, 50x70) con su precio', r[1] && r[1].c === 'CD1403' && r[1].m === '50x70' && r[1].p === '700' && r[1].q === '1', r[1]);
  r = await ev(() => ({ saldo: document.getElementById('f-saldo').value, met: document.getElementById('wrap-metodo').style.display, pasos: fxPasosEstado()[1],
    tot: (document.getElementById('f-prods-total') || {}).textContent || '' }));
  chk('h. sin el total automático (Playwright), el saldo es el de la nota: 3.100; aparece «¿Con qué pagó el adelanto?»', r.saldo === '3100' && r.met === 'block', r);
  chk('i. «Productos» pasa a listo en los pasos y la caja dice cuánto suman', antes.pasos === false && r.pasos === true && /4\.100/.test(r.tot), { antes: antes.pasos, r });
  r = await ev(() => { var c = document.getElementById('nota-leer-caja'); return { ve: !c.hidden, txt: c.innerText }; });
  chk('j. «Revisá lo que leí»: no se guardó nada, lo llenado, los productos con su código', r.ve && /Revisá lo que leí de la nota 4512/.test(r.txt) && /No se guardó nada/.test(r.txt) && /N° de nota:\s*4512/.test(r.txt) &&
    /CH1220/.test(r.txt) && /CD1403/.test(r.txt) && /Saldo por cobrar/.test(r.txt), r.txt.slice(0, 600));
  chk('k. dice lo que NO cambió (el cliente) y las dudas de Claude', /No cambié lo que ya estaba escrito/.test(r.txt) && /Cliente:\s*la nota dice ROSA PRUEBA INVENTADA/.test(r.txt) && /el segundo celular no se lee bien/.test(r.txt), r.txt);
  chk('l. la plata de la nota con el método («QR»: elegilo en Cobro) y la entrega con «Usar ese día»', /total Bs 4\.100/.test(r.txt) && /a cuenta Bs 1\.000 con 📱 QR/.test(r.txt) && /Usar ese día/.test(r.txt), r.txt);
  r = await ev(() => { var b = [].slice.call(document.querySelectorAll('#nota-leer-caja button')).filter(function (x) { return /Usar ese día/.test(x.textContent); })[0]; b.click(); return document.getElementById('f-fecha').value; });
  chk('m. «Usar ese día» pone la fecha de entrega de la nota', r === '2026-11-18', r);
  r = await ev(() => ({ guardados: __S.guardados, otras: __S.llamadas.filter(function (b) { return b.action !== 'leerNota'; }).map(function (b) { return b.action; }), state: STATE.length, cola: getPending().length, edit: EDIT_ID }));
  chk('n. NO se guardó nada: ni apiSave, ni otra acción, ni la cola, ni STATE', r.guardados === 0 && r.otras.length === 0 && r.state === 0 && r.cola === 0 && !r.edit, r);
  r = await ev(() => document.getElementById('nota-leer-btn').textContent + '|' + document.getElementById('nota-leer-btn').disabled);
  chk('o. el botón vuelve a «🧾 Leer la nota»', r === '🧾 Leer la nota|false', r);

  console.log('\n── 3. Con productos ya cargados no los pisa ──');
  await ev(() => {
    resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez';
    var box = document.getElementById('f-productos'); box.innerHTML = ''; addProdRow('COLCHON SOFT', '105x190', 'COLT0062', 2, 800);
    document.getElementById('f-saldo').value = '1600';
    __S.llamadas = [];
  });
  await ev(() => notaLeerCon(new File([new Uint8Array([137, 80, 78, 71])], 'n.png', { type: 'image/png' })).catch(function () {}));
  r = await ev(() => ({ txt: document.getElementById('nota-leer-caja').innerText, n: __S.llamadas.length }));
  chk('a. una foto que no se puede abrir (un PNG roto): «Eso no parece una foto» y no le pregunta al servidor', /no parece una foto/.test(r.txt) && r.n === 0, r);
  const leerBuena = () => page.setInputFiles('#nota-leer-file', { name: 'nota.png', mimeType: 'image/png', buffer: PNG })
    .then(() => page.waitForFunction(() => !NOTA_LEER.vuelo && !!NOTA_LEER.ultimo, null, { timeout: 8000 }).catch(() => {}));
  await leerBuena();
  r = await ev(() => ({ prods: [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return c.querySelector('.prod-codigo').value + ' x' + c.querySelector('.prod-cant').value; }),
    saldo: document.getElementById('f-saldo').value, txt: document.getElementById('nota-leer-caja').innerText, leer: __S.llamadas.filter(function (b) { return b.action === 'leerNota'; }).length }));
  chk('b. los productos que había quedan (COLT0062 ×2) y el saldo escrito también', r.leer === 1 && r.prods.join(',') === 'COLT0062 x2' && r.saldo === '1600', r);
  chk('c. la caja muestra lo leído con «Usar estos productos» y dice que no los cambió', /el pedido ya tenía productos, así que no los cambié/.test(r.txt) && /Usar estos productos/.test(r.txt) && /Saldo:\s*la nota dice Bs 3\.100/.test(r.txt), r.txt);
  r = await ev(() => { var b = [].slice.call(document.querySelectorAll('#nota-leer-caja button')).filter(function (x) { return /Usar estos productos/.test(x.textContent); })[0]; b.click();
    return { prods: [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return c.querySelector('.prod-codigo').value; }), txt: document.getElementById('nota-leer-caja').innerText, g: __S.guardados }; });
  chk('d. «Usar estos productos» los reemplaza (CH1220 y CD1403), sin guardar', r.prods.join(',') === 'CH1220,CD1403' && /Productos que puse/.test(r.txt) && !/Usar estos productos/.test(r.txt) && r.g === 0, r);

  console.log('\n── 4. El saldo con el total que se completa solo ──');
  await ev(() => { window.TOT_AUTO_PRUEBA = 1; resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; __S.nota = JSON.parse(JSON.stringify(__S.nota)); __S.nota.saldo = 9999; });
  await leerBuena();
  r = await ev(() => ({ saldo: document.getElementById('f-saldo').value, txt: document.getElementById('nota-leer-caja').innerText, caja: document.getElementById('f-prods-total').textContent }));
  chk('a. con los precios puestos, el saldo = la suma − a cuenta (4.100 − 1.000 = 3.100), no lo que dice la nota', r.saldo === '3100' && /el saldo se completa solo/.test(r.caja), r);
  chk('b. y avisa que en la nota a cuenta + saldo no da el total', /a cuenta Bs 1\.000 \+ saldo Bs 9\.999 no da el total Bs 4\.100/.test(r.txt), r.txt);
  await ev(() => { window.TOT_AUTO_PRUEBA = 0; __S.nota.saldo = 3100; __S.nota.total = 5000; resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; });
  await leerBuena();
  r = await ev(() => document.getElementById('nota-leer-caja').innerText);
  chk('c. los productos suman distinto del total de la nota → «revisá los precios»', /Los productos suman Bs 4\.100 y la nota dice total Bs 5\.000/.test(r), r);
  await ev(() => { __S.nota.total = 4100; });

  console.log('\n── 5. El código de la nota que no es de ese producto ──');
  await ev(() => { resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; __S.nota = JSON.parse(JSON.stringify(__S.nota));
    __S.nota.productos = [{ desc: 'TITANIO ICE', medida: '160x190', cant: 1, precio: 3900, codigo: 'CH1220' }, { desc: 'COSA RARA', medida: '', cant: 2, precio: 0, codigo: '' }]; });
  await leerBuena();
  r = await ev(() => ({ prods: [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return [c.querySelector('.prod-desc').value, c.querySelector('.prod-codigo').value, c.querySelector('.prod-cant').value, c.querySelector('.prod-precio').value]; }),
    txt: document.getElementById('nota-leer-caja').innerText }));
  chk('a. CH1220 (es el 140x190) en un 160x190 → se usa el del nombre y la medida: CH1201', r.prods[0] && r.prods[0][1] === 'CH1201' && /CH1220 es de COLCHON TITANIO ICE 140x190/.test(r.txt), r);
  chk('b. lo que no está en la lista queda escrito, sin código y sin precio, y se avisa', r.prods[1] && r.prods[1][0] === 'COSA RARA' && r.prods[1][1] === '' && r.prods[1][2] === '2' && r.prods[1][3] === '' &&
    /sin código: elegilo de la lista/.test(r.txt) && /Falta el precio de «COSA RARA»/.test(r.txt), r);

  console.log('\n── 6. Lo leído llega tarde, a un formulario que cambió ──');
  await ev(() => { resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; __S.espera = true; __S.llamadas = []; });
  await page.setInputFiles('#nota-leer-file', { name: 'nota.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(() => typeof window.__S.soltar === 'function', null, { timeout: 8000 }).catch(() => {});
  r = await ev(() => ({ btn: document.getElementById('nota-leer-btn').textContent, dis: document.getElementById('nota-leer-btn').disabled, txt: document.getElementById('nota-leer-caja').innerText }));
  chk('a. mientras lee: «⏳ Leyendo la nota…» (deshabilitado) y la rueda', r.btn === '⏳ Leyendo la nota…' && r.dis && /Leyendo la nota…/.test(r.txt), r);
  await ev(() => { resetForm(); __S.espera = false; __S.soltar(); });
  await page.waitForTimeout(150);
  r = await ev(() => ({ nota: document.getElementById('f-nota').value, dir: document.getElementById('f-direccion').value, prods: [].filter.call(document.querySelectorAll('#f-productos .prod-desc'), function (d) { return d.value; }).length,
    caja: document.getElementById('nota-leer-caja').hidden, btn: document.getElementById('nota-leer-btn').textContent }));
  chk('b. se empezó otro pedido mientras leía: lo leído se tira (nada llenado) y el botón vuelve', r.nota === '' && r.dir === '' && r.prods === 0 && r.caja && r.btn === '🧾 Leer la nota', r);
  await ev(() => { __S.espera = true; document.getElementById('f-vendedor').value = 'Carola Chavez'; delete __S.soltar; });
  await page.setInputFiles('#nota-leer-file', { name: 'nota.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(() => typeof window.__S.soltar === 'function', null, { timeout: 8000 }).catch(() => {});
  await ev(() => { segSet('f-doc-tipo', 'ATC'); pintarDocTipo(true); __S.espera = false; __S.soltar(); });
  await page.waitForTimeout(150);
  r = await ev(() => ({ nota: document.getElementById('f-nota').value, cel: document.getElementById('f-celular').value }));
  chk('c. lo pasaron a 🎧 ATC mientras leía: tampoco se llena', r.nota === '' && r.cel === '', r);
  await ev(() => { segSet('f-doc-tipo', 'OC'); resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; });

  console.log('\n── 7. Los «no» ──');
  const falla = async (modo) => {
    await ev((m) => { resetForm(); document.getElementById('f-vendedor').value = 'Carola Chavez'; __S.modo = m; }, modo);
    await page.setInputFiles('#nota-leer-file', { name: 'nota.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => !NOTA_LEER.vuelo && !!NOTA_LEER.ultimo, null, { timeout: 8000 }).catch(() => {});
    return ev(() => ({ txt: document.getElementById('nota-leer-caja').innerText, nota: document.getElementById('f-nota').value, mal: document.getElementById('nota-leer-caja').classList.contains('nl-mal') }));
  };
  r = await falla('tope');
  chk('a. el tope del día: «Ya se leyeron las 80 notas de hoy… cargala a mano», sin llenar nada', r.mal && /Ya se leyeron las 80 notas de hoy/.test(r.txt) && r.nota === '', r);
  r = await falla('no_se_lee');
  chk('b. no se lee: el porqué y «sacá otra», con «Probar con otra foto»', /No pude leer la nota en esa foto \(la foto no parece una nota de venta\)/.test(r.txt) && /Probar con otra foto/.test(r.txt) && r.nota === '', r);
  r = await falla('ia_apagada');
  chk('c. la IA apagada: «cargá la venta a mano»', /apagada en el servidor/.test(r.txt), r);
  r = await falla('red');
  chk('d. sin conexión: lo dice, sin llenar nada', /No pude leer la nota ahora \(sin conexión/.test(r.txt) && r.nota === '', r);
  r = await ev(() => ({ g: __S.guardados, otras: __S.llamadas.filter(function (b) { return b.action !== 'leerNota'; }).length }));
  chk('e. en toda la prueba no se guardó nada', r.g === 0 && r.otras === 0, r);

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
