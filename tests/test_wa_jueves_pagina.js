/* 🤖 LO NUEVO DEL BOT DEL JUEVES 05/11, EN LA PÁGINA (§4ok-E).
     105. Al terminar los Excel del día, la página deja en la fila del sistema `__reclamo_fab__` el reclamo que el bot manda a las 10:00
          (`reclamo_fabrica`): lo pedido a la fábrica con 2 días hábiles de atraso (`fdLista`, la cuenta de «Lo que nos debe la fábrica»)
          y lo que rota en 0 en PTF y Banzer con ventas esperando (`stockData`). Es una fila del sistema; no se guarda dos veces igual; en
          Playwright, solo con `RECLAMO_FAB_PRUEBA`.
     108. La ubicación que manda el cliente por WhatsApp: la ficha dice «📍 la mandó el cliente por WhatsApp» y, si el pedido ya tenía otro
          pin, la respuesta al bot trae «📍 Usar esta ubicación» (guarda con `guardarUbicacion`, el camino de siempre).
   Red cortada, servidor simulado, reloj clavado, datos INVENTADOS.
   Se corre:  node tests/test_wa_jueves_pagina.js   (con HTTPS_PROXY=http://127.0.0.1:9 como toda la batería)
   Dientes:   PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_wa_jueves_pagina.js            */
const { chromium } = require('playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, extra) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, extra != null ? ('· ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch();
  const errores = [];
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1000 }, timezoneId: 'America/La_Paz', locale: 'es-BO' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-05T14:00:00Z'));   // jueves 05/11, 10:00 de Bolivia
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = true;
    CARGA_GEN++; CARGA_ESTADO = 'ok';
    if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; }
    if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if (typeof MIS_TIMER !== 'undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    try { localStorage.clear(); } catch (e) {}
    window.SRV = []; window.GUARDADOS = [];
    apiPost = function (b) {
      if (b.action === 'save') {
        var c = JSON.parse(JSON.stringify(b.pedido)); c.rev = (Number(c.rev) || 0) + 1; window.GUARDADOS.push(JSON.parse(JSON.stringify(c)));
        window.SRV = window.SRV.filter(function (x) { return x.id !== c.id; }).concat([c]);
        return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(c)) });
      }
      if (b.action === 'list') return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window.SRV)) });
      return Promise.resolve({ ok: true });
    };
    apiList = function () { return new Promise(function (res) { setTimeout(function () { res({ ok: true, pedidos: JSON.parse(JSON.stringify(window.SRV)) }); }, 0); }); };
    window.P = function (o) {
      var b = { turno: 'AM', celular: '70111222', nit: '', zona: 'Norte', direccion: 'Calle 1', fecha: '2026-11-06', maps: '', observaciones: '', estado: '', entregado: false,
                chofer: '', vehiculo: '', nroDia: 1, fotos: [], vendedor: 'Carola Chavez', ts: Date.parse('2026-11-01T12:00:00-04:00'), acuenta: 0, saldo: 0, pagado: true,
                metodoPago: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1 }] };
      var q = {}; for (var k in b) q[k] = b[k]; for (var k2 in o) q[k2] = o[k2]; return q;
    };
    window.esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  });

  /* ══ 105 ══ */
  console.log('\n── 105. El reclamo del día en la fila __reclamo_fab__ ──');
  const existe = await page.evaluate(() => typeof reclamoFabDatos === 'function');
  chk('existe reclamoFabDatos (§4ok-105)', existe);
  if (existe) {
    let r = await page.evaluate(async () => {
      STATE = [P({ id: 'P1', oc: '10-301', fecha: '2026-10-28', cliente: 'CLIENTE UNO' }), P({ id: 'P2', oc: '11-020', fecha: '2026-11-02', cliente: 'CLIENTE DOS' })];
      STOCK.p = [
        { id: 'q1', k: 'TITANIO ICE|200X200', u: 7, total: 8, f: '2026-09-30', ya: 1, esp: '2026-10-03', fab: 'MORENO', tipo: 'fabrica' },   // 33 días tarde
        { id: 'q2', k: 'SOFT|140X190', u: 4, f: '2026-11-02', ya: 1, esp: '2026-11-04', fab: 'MORENO', tipo: 'fabrica' },                      // 1 día hábil: todavía no
        { id: 'q3', k: 'SUENA LITE|105X190', u: 2, f: '2026-10-20', ya: 1, esp: '2026-10-23', fab: 'MULTI', tipo: 'fabrica' }                  // de Multiespumas
      ];
      stockOlvidarIndice();
      var sd = stockData;
      stockData = function () { return { lista: [
        { k: 'NUEVO ECO FLEX|140X190', comp: 3, compIds: [{ id: 'P2', c: 2, f: '2026-11-02' }, { id: 'P1', c: 1, f: '2026-10-28' }], rotacion: 'media', paraSalir: 0 },
        { k: 'POCA ROTACION|140X190', comp: 2, compIds: [], rotacion: 'baja', paraSalir: 0 },
        { k: 'HAY EN PTF|140X190', comp: 2, compIds: [], rotacion: 'alta', paraSalir: 3 },
        { k: 'DESCONTINUADO|140X190', comp: 1, compIds: [], rotacion: 'alta', paraSalir: 0, descont: true },
        { k: 'SIN CONTAR|140X190', comp: 1, compIds: [], rotacion: 'alta', paraSalir: null }
      ] }; };
      var d; try { d = reclamoFabDatos(); } finally { stockData = sd; }
      return d;
    });
    chk('el día de hoy y la hora', r.f === '2026-11-05' && /^\d{2}:\d{2}$/.test(r.h), r);
    chk('lo atrasado 2 días hábiles o más, lo más atrasado primero (el de 1 día no; Multiespumas con su nombre)',
        r.atr.length === 2 && /^TITANIO ICE · 200X200: faltan 7 de 8, tenía que llegar el 03\/10 \(33 días\)$/.test(r.atr[0]) && /^Multiespumas · SUENA LITE · 105X190: faltan 2, tenía que llegar el 23\/10/.test(r.atr[1]), r.atr);
    chk('lo que rota en 0 con ventas esperando, con la más vieja (sin lo que no rota, lo que hay, lo discontinuado ni lo sin contar)',
        r.cero.length === 1 && r.cero[0] === 'NUEVO ECO FLEX · 140X190: 3 vendidos esperando; el más viejo, OC 10-301 para el 28/10', r.cero);
    r = await page.evaluate(async () => {
      var sinFlag = reclamoFabGuardar();
      window.RECLAMO_FAB_PRUEBA = true; window.GUARDADOS = [];
      var p1 = reclamoFabGuardar(); await p1; await esperar(50);
      var n1 = window.GUARDADOS.length, g = window.GUARDADOS[0] || {};
      var p2 = reclamoFabGuardar(); await esperar(50);
      var n2 = window.GUARDADOS.length;
      STOCK.p.push({ id: 'q4', k: 'SOFT|100X190', u: 3, f: '2026-10-20', ya: 1, esp: '2026-10-22', fab: 'MORENO', tipo: 'fabrica' }); stockOlvidarIndice();
      existLoteTerminar(); await esperar(80);
      var n3 = window.GUARDADOS.length, g3 = window.GUARDADOS[n3 - 1] || {};
      var o3 = {}; try { o3 = JSON.parse(g3.observaciones); } catch (e) {}
      return { sinFlag: sinFlag, n1: n1, id: g.id, fecha: g.fecha, cli: g.cliente, sis: esFilaSistema(g), obs: g.observaciones, n2: n2, p2: p2, n3: n3, atr3: o3.atr };
    });
    chk('en Playwright sin RECLAMO_FAB_PRUEBA no guarda nada', r.sinFlag === null, r.sinFlag);
    chk('con la bandera: guarda la fila del sistema __reclamo_fab__ (sin fecha: no ocupa cupo ni es un pedido)', r.n1 === 1 && r.id === '__reclamo_fab__' && r.fecha === '' && r.sis === true && /RECLAMO A LA FÁBRICA/.test(r.cli), r);
    chk('…con el reclamo en «Observaciones» (JSON)', /"f":"2026-11-05"/.test(r.obs) && /TITANIO ICE/.test(r.obs), r.obs);
    chk('lo mismo otra vez: no lo vuelve a guardar', r.n2 === 1 && r.p2 === null, r);
    chk('al terminar el archivo de Excel (existLoteTerminar) se guarda el reclamo nuevo', r.n3 === 2 && (r.atr3 || []).some(t => /SOFT · 100X190/.test(t)), r);
  }

  /* ══ 108 ══ */
  console.log('\n── 108. La ubicación que mandó el cliente: la ficha lo dice; «📍 Usar esta ubicación» si ya tenía otra ──');
  const hay108 = await page.evaluate(() => typeof waRespUbicHtml === 'function' && typeof esUbicWa === 'function');
  chk('existen waRespUbicHtml y esUbicWa (§4ok-108)', hay108);
  if (hay108) {
    let r = await page.evaluate(async () => {
      var WA = 'https://www.google.com/maps?q=-17.770000,-63.190000&wa=1', OTRO = 'https://www.google.com/maps?q=-17.760000,-63.180000';
      var a = P({ id: 'W1', oc: '11-101', cliente: 'CLIENTE CON PIN DEL BOT', maps: WA }), b = P({ id: 'W2', oc: '11-104', cliente: 'CLIENTE CON OTRO PIN', maps: OTRO });
      STATE = [a, b]; window.SRV = JSON.parse(JSON.stringify(STATE));
      showPedidoModal('W1'); await esperar(80);
      var fichaAdm = (document.getElementById('modal') || {}).innerText || ''; closeModal();
      showPedidoModal('W2'); await esperar(80);
      var fichaOtro = (document.getElementById('modal') || {}).innerText || ''; closeModal();
      showMisModal('W1'); await esperar(80);
      var fichaMis = (document.getElementById('modal') || {}).innerText || ''; closeModal();
      WA_RESP = [
        { w: 'wamid.L3', ms: Date.now(), t: '05/11 10:00', id: 'W2', oc: '11-104', nom: 'Juan', num: '59170000103', txt: '[ubicación] Mi casa (-17.77, -63.18)', at: '',
          ubi: { r: 'distinta', id: 'W2', link: 'https://www.google.com/maps?q=-17.770000,-63.180000&wa=1', m: 1112 } },
        { w: 'wamid.L1', ms: Date.now(), t: '05/11 10:00', id: 'W1', oc: '11-101', nom: 'Ana', num: '59170000101', txt: '[ubicación] (-17.77, -63.19)', at: '',
          ubi: { r: 'guardada', id: 'W1', link: WA } }
      ];
      var html = waRespHtml(WA_RESP, '', '', []);
      var d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d);
      var txt = d.innerText, btns = [].map.call(d.querySelectorAll('button'), function (x) { return x.innerText; });
      window.GUARDADOS = [];
      waRespUsarUbic('wamid.L3'); await esperar(120);
      var g = window.GUARDADOS.filter(function (x) { return x.id === 'W2'; }).pop() || {};
      d.remove();
      return { fichaAdm: fichaAdm, fichaOtro: fichaOtro, fichaMis: fichaMis, txt: txt, btns: btns, maps: (findById('W2') || {}).maps, guardado: g.maps };
    });
    chk('la ficha de Administración dice «📍 la mandó el cliente por WhatsApp» (y la de un pin común, no)', /la mandó el cliente por WhatsApp/.test(r.fichaAdm) && !/la mandó el cliente/.test(r.fichaOtro), r.fichaAdm.slice(0, 300));
    chk('…y la de Mis pedidos también', /la mandó el cliente por WhatsApp/.test(r.fichaMis));
    chk('la respuesta al bot: «Mandó OTRA ubicación (a 1,1 km de la que tenía)» con «📍 Usar esta ubicación»; la guardada, «ya quedó en el pedido»',
        /Mandó OTRA ubicación \(a 1,1 km de la que tenía\)/.test(r.txt) && /ya quedó en el pedido/.test(r.txt) && r.btns.filter(t => /Usar esta ubicación/.test(t)).length === 1, [r.txt.slice(0, 400), r.btns]);
    chk('«Usar esta ubicación» la guarda en el pedido (guardarUbicacion: va a la planilla)', /q=-17\.770000,-63\.180000&wa=1/.test(r.maps || '') && /q=-17\.770000,-63\.180000&wa=1/.test(r.guardado || ''), r);
  }

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exitCode = FAIL ? 1 : 0;
})();
