/* 📥 §4ok-91 LA VENTA DEL PANEL CIERRA SU LEAD EN KOMMO — la página (kcTrasGuardar, kcDudasMostrar).

   LO QUE CUIDA:
   1. Con la venta YA guardada, la página pide `kommoCierre` con el total de la venta (`ventaTotal`, redondeado): solo para una venta
      (OC; no ATC, RPT, venta de tienda, Eduardo, ROHO, internos ni borradores de Kommo).
   2. Editada sin cambiar el total → no se pide (Kommo no se toca). Con otro total → sí.
   3. Con un servidor anterior a 2026-11-05-a no se llama; la primera respuesta «apagado» deja de preguntar en esta pestaña; en
      Playwright, solo con KC_PRUEBA.
   4. «cerrado» → la copia de la página queda con la marca `klead` y lo dice.
   5. «dudas» → arriba de la ventana abierta («✅ Pedido guardado»), sin taparla: los leads de ella para tocar cuál es y «🏬 Vino a la
      tienda: crear el lead». Tocar uno manda `lead`; crear manda `crear:1`; «Ahora no» la saca.
   6. submitPedido lo llama desde `after` (con el pedido de antes de editar).
   Reloj CLAVADO (jueves 05/11/2026, 10:00 de Bolivia). Datos inventados.
   Se corre:  node tests/test_kommo_cierre_pagina.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __error:String((e && e.message) || e).slice(0, 300) }; } };

  const r0 = await ev(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; try { localStorage.removeItem(LS_PEND); } catch (e) {}
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    SERVER_VER = '2026-11-05-a';
    var ts = Date.parse('2026-11-05T09:30:00-04:00');
    var P = function (id, o) { return Object.assign({ id:id, oc:'11-0' + id.replace(/\D/g, ''), nota:'', cliente:'CLIENTA ' + id.toUpperCase(), celular:'70011122', fecha:'2026-11-07', turno:'AM',
      zona:'Norte', direccion:'Calle Falsa 1', maps:'', vendedor:'Carola Chavez', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:3500 }], saldo:3500, acuenta:0,
      pagado:false, metodoPago:'', ts:ts, rev:1, estado:'' }, o); };
    STATE = [P('v1'), P('v2', { oc:'ATC 11-001' }), P('v3', { oc:'RPT 11-001' }), P('v4', { direccion:'SALIÓ DE TIENDA · Central', zona:'Tienda' }),
             P('v5', { vendedor:'Eduardo Añez' }), P('v6', { vendedor:'ROHO' }), P('v7', { vendedor:'ALBA' }), P('kommo-9001', { estado:'' }), P('v9', { estado:BORRADOR_EST }), P('v10')];
    window._llam = []; window._resp = { ok:true, hecho:'nada' };
    apiPost = function (b) { window._llam.push(JSON.parse(JSON.stringify(b))); var r = typeof window._resp === 'function' ? window._resp(b) : window._resp; return Promise.resolve(r); };
    return { n:STATE.length, kc:typeof kcTrasGuardar };
  });
  chk('0. la página carga y tiene kcTrasGuardar', r0 && r0.kc === 'function', r0);

  console.log('\n── 1. Qué es una venta que cierra un lead ──');
  const r1 = await ev(() => STATE.map(function (p) { return p.id + ':' + (kcEsVenta(p) ? 1 : 0); }).join(' '));
  chk('⚠️ a. sí la OC; no ATC, RPT, venta de tienda, Eduardo, ROHO, ALBA (interno), la que vino de Kommo ni un borrador',
    r1 === 'v1:1 v2:0 v3:0 v4:0 v5:0 v6:0 v7:0 kommo-9001:0 v9:0 v10:1', r1);

  console.log('\n── 2. Cuándo se pide ──');
  const r2 = await ev(async () => {
    var out = {};
    window._llam = []; window.KC_PRUEBA = false;
    kcTrasGuardar(findById('v1'), null); await new Promise(function (r) { setTimeout(r, 20); });
    out.sinBandera = window._llam.length;
    window.KC_PRUEBA = true;
    kcTrasGuardar(findById('v1'), null); await new Promise(function (r) { setTimeout(r, 20); });
    out.nueva = window._llam.slice();
    window._llam = [];
    var antes = JSON.parse(JSON.stringify(findById('v1')));
    kcTrasGuardar(findById('v1'), antes); await new Promise(function (r) { setTimeout(r, 20); });
    out.mismoTotal = window._llam.length;
    antes.productos[0].precio = 3000; antes.saldo = 3000;   // ventaTotal sale de lo que se cobra (saldo + adelanto), no de los precios
    kcTrasGuardar(findById('v1'), antes); await new Promise(function (r) { setTimeout(r, 20); });
    out.otroTotal = window._llam.length;
    window._llam = [];
    kcTrasGuardar(findById('v2'), null); kcTrasGuardar(findById('v5'), null); kcTrasGuardar(findById('kommo-9001'), null); await new Promise(function (r) { setTimeout(r, 20); });
    out.noVentas = window._llam.length;
    SERVER_VER = '2026-11-02-a';
    kcTrasGuardar(findById('v1'), null); await new Promise(function (r) { setTimeout(r, 20); });
    out.servidorViejo = window._llam.length;
    SERVER_VER = '2026-11-05-a';
    window._resp = { ok:true, apagado:true };
    kcTrasGuardar(findById('v1'), null); await new Promise(function (r) { setTimeout(r, 20); });
    kcTrasGuardar(findById('v10'), null); await new Promise(function (r) { setTimeout(r, 20); });
    out.apagado = window._llam.length; out.kcApagado = KC.apagado;
    KC.apagado = false;
    return out;
  });
  chk('a. en Playwright sin KC_PRUEBA no se llama', r2.sinBandera === 0, r2);
  chk('⚠️ b. una venta nueva: `kommoCierre` con su id y el total de la venta (ventaTotal, redondeado)', r2.nueva.length === 1 && r2.nueva[0].action === 'kommoCierre' && r2.nueva[0].id === 'v1' && r2.nueva[0].total === 3500 && !r2.nueva[0].lead && !r2.nueva[0].crear, r2.nueva);
  chk('⚠️ c. editada SIN cambiar el total: no se pide (Kommo no se toca); con otro total: sí', r2.mismoTotal === 0 && r2.otroTotal === 1, r2);
  chk('d. ATC, Eduardo y la venta que vino de Kommo: no se pide', r2.noVentas === 0, r2);
  chk('e. con un servidor anterior a 2026-11-05-a: no se llama', r2.servidorViejo === 0, r2);
  chk('⚠️ f. el servidor dice «apagado»: deja de preguntar en esta pestaña', r2.apagado === 1 && r2.kcApagado === true, r2);

  console.log('\n── 3. Cerrado: la marca del lead en la copia ──');
  const r3 = await ev(async () => {
    window._llam = []; window._resp = { ok:true, hecho:'cerrado', lead:'4001', klead:true };
    kcTrasGuardar(findById('v1'), null); await new Promise(function (r) { setTimeout(r, 30); });
    var t = document.getElementById('toast');
    return { klead:kleadDe(findById('v1')), toast:t ? t.textContent : '' };
  });
  chk('⚠️ a. la copia de la página queda con klead = el lead, y avisa «quedó en Compradores»', r3.klead === '4001' && /Compradores/.test(r3.toast), r3);

  console.log('\n── 4. Dudas: la vendedora toca cuál es ──');
  const r4 = await ev(async () => {
    window._llam = [];
    openModal('<div class="modal-h"><h3>✅ Pedido guardado</h3></div><div class="modal-b"><textarea id="wa-text">mensaje</textarea></div>');
    window._resp = { ok:true, hecho:'dudas', dudas:true, motivo:'dos', puedeCrear:false, leads:[
      { id:'4001', n:'Consulta colchón', et:'Cotizacion enviada', p:3000, u:1793900000, cli:'CLIENTA V10', tel:'70011122' },
      { id:'4002', n:'Consulta somier', et:'Nueva consulta', p:0, u:1793800000, cli:'CLIENTA V10', tel:'70011122' } ] };
    kcTrasGuardar(findById('v10'), null); await new Promise(function (r) { setTimeout(r, 30); });
    var caja = document.getElementById(kcCajaId('v10')), out = {};
    out.caja = !!caja; out.sigueWa = !!document.getElementById('wa-text'); out.titulo = (document.querySelector('#modal-box h3') || {}).textContent;
    out.botones = caja ? [].map.call(caja.querySelectorAll('.kc-lead'), function (b) { return b.textContent; }) : [];
    out.texto = caja ? caja.textContent : '';
    out.crear = caja ? !!caja.querySelector('[onclick^="kcCrear"]') : null;
    window._resp = { ok:true, hecho:'cerrado', lead:'4002', klead:true };
    caja.querySelectorAll('.kc-lead')[1].click(); await new Promise(function (r) { setTimeout(r, 30); });
    out.pedido = window._llam.slice(-1)[0];
    var caja2 = document.getElementById(kcCajaId('v10'));
    out.listo = caja2 ? caja2.textContent : '';
    out.klead = kleadDe(findById('v10'));
    return out;
  });
  chk('⚠️ a. la caja sale ARRIBA de la ventana «✅ Pedido guardado», sin taparla', r4.caja && r4.sigueWa && /Pedido guardado/.test(r4.titulo), r4);
  chk('b. con los dos leads (nombre, contacto, teléfono, etapa) y sin «crear» (hay leads con ese celular)', r4.botones.length === 2 && /Consulta colchón/.test(r4.botones[0]) && /CLIENTA V10/.test(r4.botones[0]) &&
    /70011122/.test(r4.botones[0]) && /Cotizacion enviada/.test(r4.botones[0]) && r4.crear === false && /2 leads tuyos abiertos/.test(r4.texto), r4.botones);
  chk('⚠️ c. tocar uno manda ese lead (y el total) y la caja dice que quedó', r4.pedido && r4.pedido.action === 'kommoCierre' && r4.pedido.lead === '4002' && r4.pedido.total === 3500 &&
    /quedó en «Compradores»/.test(r4.listo) && r4.klead === '4002', r4);
  const r5 = await ev(async () => {
    window._llam = [];
    STATE.push(Object.assign(JSON.parse(JSON.stringify(findById('v1'))), { id:'v11', oc:'11-011', celular:'71112233', productos:[{ desc:'COLCHON', cant:1, precio:2000 }] }));
    window._resp = { ok:true, hecho:'dudas', dudas:true, motivo:'ninguno', puedeCrear:true, leads:[{ id:'4009', n:'Lead de otra clienta', et:'Nueva consulta', p:0, u:0, cli:'', tel:'' }] };
    closeModal();
    kcTrasGuardar(findById('v11'), null); await new Promise(function (r) { setTimeout(r, 30); });
    var caja = document.getElementById(kcCajaId('v11')), out = { abierta:document.getElementById('modal').classList.contains('on'), caja:!!caja, texto:caja ? caja.textContent : '' };
    window._resp = { ok:true, hecho:'creado', lead:'70001', klead:true };
    caja.querySelector('[onclick^="kcCrear"]').click(); await new Promise(function (r) { setTimeout(r, 30); });
    out.pedido = window._llam.slice(-1)[0]; out.klead = kleadDe(findById('v11'));
    window._resp = { ok:true, hecho:'dudas', dudas:true, motivo:'ninguno', puedeCrear:true, leads:[] };
    kcTrasGuardar(findById('v11'), { productos:[{ desc:'COLCHON', cant:1, precio:1 }], acuenta:0 }); await new Promise(function (r) { setTimeout(r, 30); });
    var c3 = document.getElementById(kcCajaId('v11'));
    out.sinLeads = c3 ? c3.textContent : '';
    c3.querySelector('.btn-ghost').click();
    out.sacada = !document.getElementById(kcCajaId('v11'));
    return out;
  });
  chk('d. sin ventana abierta, la caja sale en una ventana propia; ninguno con ese celular → «Vino a la tienda: crear»', r5.abierta && r5.caja && /No encontré un lead tuyo abierto con el celular/.test(r5.texto) && /Vino a la tienda/.test(r5.texto), r5);
  chk('⚠️ e. «Vino a la tienda» manda `crear:1` y la copia queda con el lead nuevo', r5.pedido && r5.pedido.crear === 1 && r5.pedido.id === 'v11' && r5.klead === '70001', r5);
  chk('f. sin leads abiertos lo dice, y «Ahora no» saca la caja', /No tenés leads abiertos/.test(r5.sinLeads) && r5.sacada, r5);

  console.log('\n── 5. Lo llama submitPedido ──');
  const r6 = await ev(() => { var s = submitPedido.toString(); return { after:/function after\(wasEdit\)[\s\S]*kcTrasGuardar\(rec, prev\)/.test(s), prev:/var prev = isEdit \? findById\(EDIT_ID\) : null/.test(s) }; });
  chk('⚠️ a. `after` (la venta YA guardada) llama a kcTrasGuardar con el pedido de antes de editar', r6.after && r6.prev, r6);
  chk('b. sin errores de la página', errores.length === 0, errores.join(' | '));

  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
