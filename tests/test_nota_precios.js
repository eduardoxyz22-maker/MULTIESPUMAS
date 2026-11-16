/* 🧾 MEJORA 353 · LA NOTA DE VENTA CONTRA LOS PRECIOS QUE CARGASTE — LA PÁGINA.
   El servidor (la lectura de comprobantes con los renglones de la nota, pregunta 5) lo prueba tests/test_nota_precios_servidor.js; acá,
   con `apiPost` de mentira y la subida de fotos de mentira (como tests/test_comprobante_al_subir.js):
   1. La lectura al subir pide `renglones:1`.
   2. Con la nota de venta leída (y sus renglones seguros), si un precio no coincide con lo cargado: «🧾 La nota de venta dice Bs 3.830 por …
      y cargaste 4.830» con «Poner Bs 3.830 como en la nota» (pone el precio de ESE renglón) y, con todo emparejado, el total; «Está bien así»
      lo saca para esa foto.
   3. Si no está seguro, no dice nada: sin renglones (Claude dudó), un renglón que no se puede emparejar o dos parecidos (no elige).
   4. Con el servidor de antes no dice nada. En «Registrar pago» de Contabilidad dice lo mismo, sin «Poner…» (se corrige en «Corregir precios»).
   Reloj CLAVADO (lunes 16/11/2026, 10:00 de Bolivia). Datos inventados.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_nota_precios.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 }, timezoneId: 'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __error: String((e && e.message) || e).slice(0, 300) }; } };

  const r0 = await ev(async () => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = true; try { localStorage.removeItem(LS_PEND); } catch (e) {}
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    SERVER_VER = '2026-11-16-a'; window.IAC_SUBIR_PRUEBA = 1;
    try { IAS_JUNTA_MS = 20; IAS_ESPERA_MS = 30; } catch (e) {}
    var ts = new Date('2026-11-10T11:00:00-04:00').getTime();
    STATE = [{ id: 'c1', oc: '11-060', nota: '5060', cliente: 'CLIENTE SALDO INVENTADO', celular: '70000060', fecha: '2026-11-18', turno: 'AM', zona: 'Norte', vendedor: 'Carola Chavez',
      productos: [{ desc: 'COLCHON TITANIO ICE', medida: '160x190', cant: 1, precio: 3400 }], saldo: 2400, acuenta: 1000, pagado: false, ts: ts,
      metodoPago: textoCobros([{ anticipo: true, metodo: 'Efectivo', monto: 1000, fecha: '2026-11-10', nota: '5060', comps: ['rc1'] }]) }];
    var norm = function (o) { return Object.assign({ cp: true, le: true, m: 0, mo: 'BOB', f: '', h: '', bo: '', bd: '', de: '', or: '', ref: '', ti: 'qr', no: '', t: 1, md: 'x', pv: 5 }, o); };
    var nota = function (nl, extra) { return Object.assign({ cp: false, nv: 1, nt: 3980, nq: 3980, f: '2026-11-16', no: 'nota de venta', nl: nl }, extra || {}); };
    var S = window.__S = { llamadas: [], guardado: {}, lee: {
      q1: { m: 3980, bd: 'BISA', f: '2026-11-16', ref: 'Q1000001' },
      n1: nota([{ d: 'ESPECIAL ORTOPEDICO', m: '140x190', c: 1, p: 3830 }, { d: 'ALMOHADA', m: '50x70', c: 2, p: 75 }]),
      n2: nota([{ d: 'ESPECIAL ORTOPEDICO', m: '140x190', c: 1, p: 3830 }, { d: 'ALMOHADA', m: '50x70', c: 2, p: 75 }]),
      n3: nota(undefined),                                                                   // Claude dudó: sin renglones
      n4: nota([{ d: 'COLCHON PILLOW', m: '140x190', c: 1, p: 3000 }]),                        // dos «PILLOW» cargados: no elige
      n5: nota([{ d: 'TITANIO ICE', m: '160x190', c: 1, p: 3100 }]),                           // Contabilidad
      n6: nota([{ d: 'ESPECIAL ORTOPEDICO', m: '140x190', c: 1, p: 3830 }, { d: 'ALMOHADA', m: '50x70', c: 2, p: 75 }]),
      q6: { m: 3980, bd: 'BISA', f: '2026-11-16', ref: 'Q6000006' }, q2: { m: 3980, bd: 'BISA', f: '2026-11-16', ref: 'Q2000002' }, q3: { m: 3980, bd: 'BISA', f: '2026-11-16', ref: 'Q3000003' },
      q4: { m: 3980, bd: 'BISA', f: '2026-11-16', ref: 'Q4000004' }, c9: { m: 2400, bd: 'BISA', f: '2026-11-16', ref: 'C9000009' }
    } };
    apiPost = function (b) {
      b = JSON.parse(JSON.stringify(b)); S.llamadas.push(b);
      if (b.action !== 'iaComprobantes') return Promise.resolve({ ok: true });
      var res = {}, faltan = [];
      (b.fotos || []).forEach(function (f) { if (S.guardado[f]) res[f] = S.guardado[f]; else faltan.push(f); });
      var r = { ok: true, version: '2026-11-16-a', res: res, faltan: faltan, pendientes: [], leidas: 0, usd: 0, dia: { d: '2026-11-16', n: 0, usd: 0 }, estado: '' };
      if (b.leer) return Promise.resolve(r);
      faltan.forEach(function (f) { var o = norm(S.lee[f] || { err: 'no_existe' }); if (o.nl === undefined) delete o.nl; S.guardado[f] = o; res[f] = o; r.leidas++; });
      return Promise.resolve(r);
    };
    apiSave = function (r) { return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(r)) }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    fotoCronometro = function () { return Promise.resolve('data:image/png;base64,xx'); };
    subirFoto = function () { return Promise.resolve({ ok: true, fotoId: (window._ids || []).shift() || 'x' }); };
    window._esp = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    window._subirVarias = async function (ids, donde) {
      for (var i = 0; i < ids.length; i++) { window._ids = [ids[i]];
        if (donde === 'cta') { COMP_DESTINO = null; await onCompElegido({ target: { files: [{}], dataset: { pedido: 'c1' } } }); }
        else { COMP_DESTINO = 1; await onCompFormElegido({ target: { files: [{}] } }); } }
      await _esp(300);
    };
    window._llenar = function (prods) {
      if (typeof cancelEdit === 'function' && EDIT_ID) cancelEdit();
      VENTA_TIENDA = false; showView('form'); resetForm(); EDIT_ID = null;
      document.getElementById('f-vendedor').value = 'Carola Chavez'; try { applyVendedorLite(); } catch (e) {}
      document.getElementById('f-cliente').value = 'CLIENTE INVENTADO'; document.getElementById('f-celular').value = '70000099';
      document.getElementById('f-zona').value = 'Norte'; document.getElementById('f-direccion').value = 'Calle Inventada 1';
      document.getElementById('f-fecha').value = '2026-11-18'; segSet('f-turno', 'AM'); document.getElementById('f-nota').value = '2417';
      var box = document.getElementById('f-productos'); box.innerHTML = '';
      prods.forEach(function (x) { addProdRow(x[0], x[1], '', x[2], ''); box.lastElementChild.querySelector('.prod-precio').value = String(x[3]); });
      refreshDelButtons();
      segSet('f-pagado', 'NO'); updateMetodoVisibility();
      document.getElementById('f-acuenta').value = '3980'; document.getElementById('f-saldo').value = '1000'; updateMetodoVisibility();
      segSet('f-metodo', 'QR'); updateBancoVisibility(); segSet('f-banco', 'BISA');
      FORM_COMPS = []; renderCompForm(true);
    };
    window._t = function (id) { var e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
    window._btns = function (id) { return [].map.call(document.querySelectorAll('#' + id + ' button'), function (b) { return b.textContent; }); };
    return true;
  });
  chk('0. arma el panel de prueba', r0 === true, r0);
  const PRODS = [['ESPECIAL ORTOPEDICO D/C', '140x190', 1, 4830], ['ALMOHADA', '50x70', 2, 75]];

  console.log('\n── 1. La nota dice otro precio ──');
  const r1 = await ev(async (P) => { __S.llamadas = []; _llenar(P); await _subirVarias(['q1', 'n1']);
    var L = __S.llamadas.filter(function (b) { return b.action === 'iaComprobantes' && !b.leer; });
    return { aviso: _t('ias-f1'), btns: _btns('ias-f1'), renglones: L.map(function (b) { return b.renglones; }) }; }, PRODS);
  chk('a. la lectura al subir pide los renglones (`renglones:1`)', r1.renglones.length >= 1 && r1.renglones.every(function (x) { return x === 1; }), r1.renglones);
  chk('b. «🧾 La nota de venta dice Bs 3.830 por ESPECIAL ORTOPEDICO D/C 140x190 y cargaste 4.830.»', /🧾 La nota de venta dice Bs 3\.830 por ESPECIAL ORTOPEDICO D\/C 140x190 y cargaste 4\.830\./.test(r1.aviso), r1.aviso);
  chk('c. la almohada coincide: no se nombra', !/ALMOHADA/.test(r1.aviso), r1.aviso);
  chk('d. con todo emparejado, el total: «Total de la nota: Bs 3.980 · cargado: Bs 4.980.»', /Total de la nota: Bs 3\.980 · cargado: Bs 4\.980\./.test(r1.aviso), r1.aviso);
  chk('e. los botones «Poner Bs 3.830 como en la nota» y «Está bien así»', r1.btns.indexOf('Poner Bs 3.830 como en la nota') >= 0 && r1.btns.indexOf('Está bien así') >= 0, r1.btns);
  chk('f. y lo de siempre del comprobante sigue (la foto del QR coincide)', /La foto coincide con lo anotado/.test(r1.aviso), r1.aviso);
  const r1b = await ev(async () => { var b = [].filter.call(document.querySelectorAll('#ias-f1 button'), function (x) { return /Poner Bs 3\.830/.test(x.textContent); })[0]; b.click(); await _esp(150);
    return { precio: document.querySelectorAll('#f-productos .prod-precio')[0].value, otro: document.querySelectorAll('#f-productos .prod-precio')[1].value, aviso: _t('ias-f1') }; });
  chk('g. «Poner…» pone 3.830 en ESE renglón (la almohada no se toca) y el aviso se va', r1b.precio === '3830' && r1b.otro === '75' && !/nota de venta dice/.test(r1b.aviso), r1b);
  const r1c = await ev(async () => { var e = document.querySelectorAll('#f-productos .prod-precio')[0]; e.value = '4000'; e.dispatchEvent(new Event('input', { bubbles: true })); await _esp(100); return _t('ias-f1'); });
  chk('h. si se escribe otro precio a mano, el aviso vuelve (sigue a los precios)', /dice Bs 3\.830 por ESPECIAL ORTOPEDICO D\/C 140x190 y cargaste 4\.000/.test(r1c), r1c);

  console.log('\n── 2. «Está bien así» ──');
  const r2 = await ev(async (P) => { _llenar(P); await _subirVarias(['q2', 'n2']); var a = _t('ias-f1');
    var b = [].filter.call(document.querySelectorAll('#ias-f1 button'), function (x) { return /Está bien así/.test(x.textContent); })[0]; b.click(); await _esp(80);
    return { antes: a, despues: _t('ias-f1'), precio: document.querySelectorAll('#f-productos .prod-precio')[0].value }; }, PRODS);
  chk('a. lo saca para esa foto sin tocar el precio', /nota de venta dice/.test(r2.antes) && !/nota de venta dice/.test(r2.despues) && r2.precio === '4830', r2);

  console.log('\n── 3. Si no está seguro, no dice nada ──');
  const r3 = await ev(async (P) => { _llenar(P); await _subirVarias(['q3', 'n3']); return _t('ias-f1'); }, PRODS);
  chk('a. sin renglones (Claude dudó): nada de la nota', !/nota de venta dice/.test(r3), r3);
  const r4 = await ev(async () => { _llenar([['COLCHON PILLOW TOP', '140x190', 1, 3500], ['PILLOW FLEX', '140x190', 1, 3500]]); await _subirVarias(['q4', 'n4']); return _t('ias-f1'); });
  chk('b. dos cargados parecidos para un renglón: no elige, no dice nada', !/nota de venta dice/.test(r4), r4);
  const r5 = await ev(async () => { var C = nvpComparar([{ d: 'SOMIER ORO', m: '140x190', c: 1, p: 1800 }], [{ desc: 'ORO ANATOMICO', medida: '140x190', cant: 1, precio: 3000 }]);
    var D = nvpComparar([{ d: 'ESPECIAL', m: '160x190', c: 1, p: 100 }], [{ desc: 'ESPECIAL ORTOPEDICO', medida: '140x190', cant: 1, precio: 3000 }]); return { C: C, D: D }; });
  chk('c. un somier no se empareja con un colchón, ni otra medida con otra', r5.C === null && r5.D === null, r5);
  const r6 = await ev(async (P) => { SERVER_VER = '2026-11-15-a'; _llenar(P); await _subirVarias(['q6', 'n6']); var a = _t('ias-f1'); SERVER_VER = '2026-11-16-a'; return a; }, PRODS);
  chk('d. con el servidor de antes: nada', !/nota de venta dice/.test(r6), r6);

  console.log('\n── 4. Contabilidad: «Registrar pago» ──');
  const r7 = await ev(async () => { closeModal(); showView('conta'); await _esp(100);
    showContaModal('c1'); CTA_PAGO.metodo = 'QR'; CTA_PAGO.banco = 'BISA'; showContaModal('c1');
    await _subirVarias(['c9', 'n5'], 'cta'); await _esp(200);
    var out = { aviso: _t('ias-cta'), btns: _btns('ias-cta') }; closeModal(); return out; });
  chk('a. dice que la nota dice otro precio, sin «Poner…» y con dónde se corrige', /La nota de venta dice Bs 3\.100 por COLCHON TITANIO ICE 160x190 y cargaste 3\.400\./.test(r7.aviso) &&
    !r7.btns.some(function (t) { return /^Poner/.test(t); }) && /Corregir precios y montos/.test(r7.aviso) && r7.btns.indexOf('Está bien así') >= 0, r7);

  chk('z. sin errores de la página', errores.length === 0, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
