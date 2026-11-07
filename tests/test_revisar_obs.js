/* 📝 LAS OBSERVACIONES QUE DICEN OTRA COSA (idea 119, 07/11; el dueño vio la muestra y la aprobó). Al guardar, el panel lee las
   «Observaciones» y, si contradicen lo cargado (el día, el turno, cuántos, cuánto cobrar), avisa en una ventana ámbar «⚠️ Antes de
   guardar, revisá» con «Corregir» (no guarda, lleva al campo) y «Guardar igual» (sigue con el guardado de siempre, UNA vez). Nunca frena.
   Cuida: el ejemplo del dueño (los tres textos de la muestra), cada tipo de contradicción, los casos que NO avisan (negaciones,
   «llamar el sábado», «de lunes a viernes», «a la mañana» ≠ «mañana», «1 1/2 plazas», «ya pagó»…), el sábado sin tarde, que no tapa un
   error de siempre, que no corre en ATC ni en una venta de tienda, que editando solo dice lo NUEVO, «Para guardar» y que sin
   `OBS_REV_PRUEBA` queda apagado en Playwright.
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_revisar_obs.js
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la de antes). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let preguntas = [];
  page.on('dialog', d => { preguntas.push(d.message().slice(0, 160)); return d.accept(); });
  await page.clock.install({ time: new Date('2026-11-05T10:00:00-04:00') });   // jueves 05/11: mañana = viernes 06/11
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  // ============ 0. apagado en Playwright sin la bandera ============
  const sinFlag = await ev(() => typeof obsRevActiva === 'function' ? obsRevActiva() : 'no existe');
  chk('0a · en Playwright sin OBS_REV_PRUEBA queda apagado (las pruebas de siempre guardan notas de ejemplo)', sinFlag === false, sinFlag);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._saves = 0; window._rechazar = 0;
    apiSave = function (rec) {
      window._saves++;
      if (window._rechazar > 0) { window._rechazar--; return Promise.resolve({ ok: false, error: 'prueba' }); }
      var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g });
    };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    STATE = []; saveMirror();
  });

  let N = 0;
  /* Llena una venta como una vendedora. `o.prods` = [[producto, cantidad, medida], …]. */
  const llenar = (o) => ev((o) => {
    closeModal();
    showView('form'); resetForm();
    if (o.tienda) { try { abrirVentaTienda(); } catch (e) { VENTA_TIENDA = true; try { pintarModoTienda(); } catch (x) {} } }
    document.getElementById('f-fecha').value = o.fecha || '2026-11-09'; segSet('f-turno', o.turno || 'AM');
    if (o.tipo) { segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez'; applyVendedorLite();
    if (o.tipo === 'RPT') { var s = document.getElementById('f-rpt-suc'); s.value = 'Mia Plaza'; try { sucursalElegida(); } catch (e) {} }
    document.getElementById('f-cliente').value = (o.cliente != null) ? o.cliente : ('CLIENTE INVENTADO ' + o.n);
    document.getElementById('f-celular').value = o.cel || ('7' + String(1000000 + o.n));
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA ' + o.n;
    var n = document.getElementById('f-nota'); if (n) n.value = String(5000 + o.n);
    if (o.tipo === 'ATC') {
      segSet('f-atc-tipo', 'gar'); document.getElementById('f-atc-motivo').value = 'Hundimiento';
      document.getElementById('f-atc-detalle').value = 'hundido en el medio, no retoma su forma';
      document.getElementById('f-atc-compra').value = '2025-03-10';
      var pz = document.getElementById('f-pz-col'); if (pz) pz.checked = true;
    }
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    (o.prods || [['COLCHON ORO ANATOMICO', 1, '140x190'], ['ALMOHADA', 1, '50x70']]).forEach(function (x) {
      addProdRow(x[0], x[2] || '', '', x[1] || 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '1000';
    });
    refreshDelButtons();
    if (!o.tienda && o.tipo !== 'ATC' && o.tipo !== 'RPT') {
      if (o.pagado) { segSet('f-pagado', 'SI'); document.getElementById('f-cobrado').value = '2990'; }
      else { segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = (o.saldo != null) ? String(o.saldo) : '2990'; }
    }
    try { updateMetodoVisibility(); } catch (e) {}
    document.getElementById('f-obs').value = o.obs || '';
  }, Object.assign({ n: ++N }, o));
  const ventana = () => ev(() => {
    var ov = document.getElementById('modal'), box = document.getElementById('modal-box'), on = ov.classList.contains('on') && !!box.querySelector('#obsrev-lista');
    return { on: on, titulo: on ? box.querySelector('.modal-h h3').textContent : '', items: on ? [].map.call(box.querySelectorAll('#obsrev-lista li'), function (li) { return li.textContent; }) : [],
      nota: on ? (box.querySelector('.obsrev-nota') || {}).textContent : '' };
  });
  const guardar = () => ev(async () => {
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, 500));
    var ov = document.getElementById('modal'), box = document.getElementById('modal-box'), on = ov.classList.contains('on') && !!box.querySelector('#obsrev-lista');
    return { guardo: window._saves - n0, modal: on, items: on ? [].map.call(box.querySelectorAll('#obsrev-lista li'), function (li) { return li.textContent; }) : [],
      toast: (document.getElementById('toast') || {}).textContent || '', ult: window._pl[window._pl.length - 1] || null };
  });

  // ============ 1. sin la bandera: guarda derecho aunque la nota contradiga ============
  await llenar({ obs: 'Entregar el SÁBADO en la tarde. Son 2 almohadas. Cobrar Bs 2.000 en efectivo.' });
  let r = await guardar();
  chk('1 · sin OBS_REV_PRUEBA no pregunta nada y guarda como siempre', r.guardo === 1 && !r.modal, r);
  await ev(() => { window.OBS_REV_PRUEBA = 1; closeModal(); });

  // ============ 2. el ejemplo del dueño (la muestra) ============
  const EJ = 'Entregar el SÁBADO en la tarde. Son 2 almohadas. Cobrar Bs 2.000 en efectivo.';
  await llenar({ obs: EJ });
  r = await guardar();
  chk('2a · con la nota del ejemplo NO guarda y abre la ventana', r.guardo === 0 && r.modal, r);
  const v = await ventana();
  chk('2b · el título es «⚠️ Antes de guardar, revisá»', v.titulo === '⚠️ Antes de guardar, revisá', v.titulo);
  chk('2c · el día y el turno, con el sábado sin tarde (texto de la muestra)',
    v.items[0] === 'Las observaciones dicen «sábado en la tarde», pero el pedido es para el lunes 09/11 a la mañana. Además, el sábado el camión sale solo a la mañana.', v.items[0]);
  chk('2d · «Dicen «2 almohadas» y cargaste 1.»', v.items[1] === 'Dicen «2 almohadas» y cargaste 1.', v.items[1]);
  chk('2e · «Dicen «cobrar Bs 2.000» y el saldo es Bs 2.990.»', v.items[2] === 'Dicen «cobrar Bs 2.000» y el saldo es Bs 2.990.', v.items[2]);
  chk('2f · son tres avisos y la ventana muestra la nota', v.items.length === 3 && /Cobrar Bs 2\.000/.test(v.nota), v);

  // ============ 3. «Corregir» no guarda y lleva a la fecha ============
  const corr = await ev(async () => {
    var n0 = window._saves; document.getElementById('obsrev-corregir').click();
    await new Promise(r => setTimeout(r, 300));
    return { guardo: window._saves - n0, abierta: document.getElementById('modal').classList.contains('on'), foco: (document.activeElement || {}).id || '', fecha: document.getElementById('f-fecha').value };
  });
  chk('3a · «Corregir» cierra la ventana y NO guarda', corr.guardo === 0 && !corr.abierta, corr);
  chk('3b · y deja el foco en la fecha de entrega (el primer campo que no coincide), con el formulario intacto', corr.foco === 'f-fecha' && corr.fecha === '2026-11-09', corr);

  // ============ 4. «Guardar igual» guarda UNA vez ============
  r = await guardar();
  chk('4a · tocar Guardar de nuevo sin corregir vuelve a preguntar', r.guardo === 0 && r.modal, r);
  const igual = await ev(async () => {
    var n0 = window._saves, b = document.getElementById('obsrev-igual'); b.click(); b.click();
    await new Promise(r => setTimeout(r, 700));
    var u = window._pl[window._pl.length - 1];
    return { guardo: window._saves - n0, obs: u && u.observaciones, fecha: u && u.fecha, turno: u && u.turno };
  });
  chk('4b · «Guardar igual» (aunque se toque dos veces) guarda exactamente una vez, lo que estaba cargado', igual.guardo === 1 && igual.obs === EJ && igual.fecha === '2026-11-09' && igual.turno === 'AM', igual);

  // ============ 5. una vez: si el servidor dice que no, el reintento no vuelve a preguntar ============
  await llenar({ obs: EJ });
  await ev(() => { window._rechazar = 1; });
  r = await guardar();
  const igual2 = await ev(async () => { var n0 = window._saves; document.getElementById('obsrev-igual').click(); await new Promise(r => setTimeout(r, 700)); return { guardo: window._saves - n0, cli: document.getElementById('f-cliente').value }; });
  chk('5a · «Guardar igual» manda el pedido (el servidor lo rechaza y el formulario queda)', r.modal && igual2.guardo === 1 && /CLIENTE INVENTADO/.test(igual2.cli), { r, igual2 });
  r = await guardar();
  chk('5b · el reintento con lo mismo NO vuelve a preguntar y se guarda', r.guardo === 1 && !r.modal, r);
  await llenar({ obs: EJ });
  r = await guardar();
  chk('5c · un pedido nuevo con lo mismo vuelve a preguntar (la memoria es de una vez)', r.guardo === 0 && r.modal, r);

  // ============ 6. lo que coincide no pregunta ============
  await llenar({ obs: 'Entregar el lunes por la mañana. Son 1 almohada. Cobrar Bs 2.990 en efectivo.' });
  r = await guardar();
  chk('6 · una nota que coincide con lo cargado guarda derecho', r.guardo === 1 && !r.modal, r);

  // ============ 7. la lectura, una por una (obsRevisar) ============
  const L = await ev(() => {
    var P = function (obs, extra) {
      var p = Object.assign({ fecha: '2026-11-09', turno: 'AM', saldo: 2990, pagado: false, oc: '10-500',
        productos: [{ desc: 'COLCHON ORO ANATOMICO', medida: '140x190', cant: 1 }, { desc: 'ALMOHADA', medida: '50x70', cant: 1 }], observaciones: obs }, extra || {});
      return obsRevisar(p, { rel: !(extra && extra._sinRel), tipo: (extra && extra._tipo) || 'OC' }).map(function (x) { return x.t; });
    };
    var A = function (n, d) { return { desc: d || 'ALMOHADA', medida: '50x70', cant: n }; };
    var COL = { desc: 'COLCHON ORO ANATOMICO', medida: '140x190', cant: 1 };
    return {
      // día y turno
      aLaManana: P('Entregar a la mañana'),
      aLaMananaPM: P('Entregar a la mañana', { turno: 'PM' }),
      manana: P('Entregar mañana'),
      mananaMan: P('Entregar mañana a la mañana', { fecha: '2026-11-06' }),
      pasado: P('Entregar pasado mañana'),
      hoy: P('Entregar hoy'),
      sinRel: P('Entregar mañana', { _sinRel: 1 }),
      h15: P('Entregar a las 15:00'),
      h15pm: P('Entregar a las 15:00', { turno: 'PM' }),
      de10a11: P('Entregar de 10 a 11', { turno: 'PM' }),
      pm: P('Entrega PM'),
      llamar15: P('Llamar a las 15:00'),
      sabTarde: P('En la tarde', { fecha: '2026-11-07' }),
      sabTarde2: P('Sábado en la tarde', { fecha: '2026-11-07' }),
      lunVie: P('Recibe de lunes a viernes'),
      llamarSab: P('Llamar el sábado para coordinar'),
      viaja: P('Cliente viaja el viernes, entregar el jueves', { fecha: '2026-11-12' }),
      viajaMal: P('Cliente viaja el viernes, entregar el jueves'),
      hasta: P('Entregar hasta el sábado'),
      noSab: P('No puede el sábado'),
      fecha10: P('Entregar el 10/11'),
      fecha10ok: P('Entregar el 10/11', { fecha: '2026-11-10' }),
      plazas: P('Colchón de 1 1/2 plazas'),
      sab0711: P('Entregar sábado 07/11'),
      domingo: P('Entregar el domingo'),
      lunesOk: P('Entregar el lunes'),
      // cantidades
      dos: P('Son dos almohadas'),
      tresSin: P('Lleva 3 almohadas', { productos: [COL] }),
      colch: P('Son 2 colchones'),
      colchOk: P('1 colchón y 1 almohada'),
      nasa: P('Van 2 almohadas nasa', { productos: [COL, A(1, 'ALMOHADA NASA'), A(1, 'ALMOHADA FIBRA SILICONADA')] }),
      nasaTot: P('Van 2 almohadas', { productos: [COL, A(1, 'ALMOHADA NASA'), A(1, 'ALMOHADA FIBRA SILICONADA')] }),
      nasaYFibra: P('Van 2 almohadas nasa y 1 de fibra', { productos: [COL, A(1, 'ALMOHADA NASA'), A(1, 'ALMOHADA FIBRA SILICONADA')] }),
      tienda: P('Las 2 almohadas ya se entregaron en tienda'),
      set: P('Son 2 almohadas', { productos: [COL, A(1, 'SET DE 2 ALMOHADAS')] }),
      cant2: P('Son 2 almohadas', { productos: [COL, A(2)] }),
      // plata
      cobraOk: P('Cobrar 2.990'),
      cobraMal: P('Cobrar Bs 2.000'),
      noCobrar: P('No cobrar, ya pagó'),
      yaPago: P('Ya pagó el saldo de 2.000'),
      resto: P('Cobrar 2.000 y el resto con QR'),
      flete: P('Cobrar 50 de envío'),
      conFlete: P('Cobrar 3.040', { _fl: 50 }),
      pagado: P('Cobrar 2.000', { pagado: true, saldo: 0 }),
      saldoTxt: P('Saldo: Bs 2.000'),
      paga: P('Paga 2.000 en efectivo'),
      rpt: P('Cobrar 2.000', { _tipo: 'RPT', oc: 'RPT 11-001' }),
      dosMetodos: P('Cobrar 2.000 en efectivo y 990 por QR'),
      liteSinSaldo: P('Cobrar 4740, llevar tarjetero', { vendedor: 'Eduardo Añez', saldo: 0 }),
      sinSaldo: P('Cobrar 4740, llevar tarjetero', { vendedor: 'Carola Chavez', saldo: 0 }),
      cuentaMal: P('A cuenta 1000, saldo 1990'),
      cuentaOk: P('A cuenta 1000, saldo 1990', { saldo: 1990 }),
      // notas de todos los días que no dicen nada distinto (con el pedido del lunes a la mañana, 1 colchón y 1 almohada, saldo 2.990)
      tranquilas: ['POR FAVOR LLAMAR UNA HORA ANTES', 'COLOCAR DOBLE BOLSA', '📍 CASA PORTON PLOMO · Recibe: MARIOLY BALCAZAR · WhatsApp: 70014456 · Importado del Excel de ROHO',
        'Casa de 2 pisos, portón negro', 'Barrio Los Pinos UV 25 MZA 12/3', 'Entregar en el 2do piso', '1 colchón de 2 plazas', 'Llamar a las 15:00 para coordinar',
        'Otros celulares: 71234567', 'OC- 32218 · LO RECIBE EL SR. JAIME 75551234', 'Entregar el lunes temprano', 'Cliente paga con QR al recibir',
        'Viene a recoger el sábado su colchón viejo', 'No llevar las almohadas, se entregaron en tienda', 'Hasta el sábado tiene que estar',
        'https://maps.app.goo.gl/AbC12/3x?sábado=1 tarde'].map(function (o) { return { o: o, r: P(o) }; }).filter(function (x) { return x.r.length; })
    };
  });
  const T = 'Las observaciones dicen ';
  chk('7a · «a la mañana» con el pedido a la mañana NO es «mañana» (el día): no avisa', Array.isArray(L.aLaManana) && L.aLaManana.length === 0, L.aLaManana);
  chk('7b · «a la mañana» con el pedido a la tarde: avisa el turno', L.aLaMananaPM && L.aLaMananaPM[0] === T + '«a la mañana», pero el pedido es para el lunes 09/11 a la tarde.', L.aLaMananaPM);
  chk('7c · «mañana» (el día) es el viernes 06/11 y el pedido es el lunes', L.manana && L.manana[0] === T + '«mañana» (viernes 06/11), pero el pedido es para el lunes 09/11 a la mañana.', L.manana);
  chk('7d · «mañana a la mañana» con el pedido para el viernes a la mañana: coincide', L.mananaMan && L.mananaMan.length === 0, L.mananaMan);
  chk('7e · «pasado mañana» = sábado 07/11', L.pasado && /«pasado mañana» \(sábado 07\/11\)/.test(L.pasado[0] || ''), L.pasado);
  chk('7f · «hoy» = jueves 05/11', L.hoy && /«hoy» \(jueves 05\/11\)/.test(L.hoy[0] || ''), L.hoy);
  chk('7g · «hoy/mañana» no se leen si la nota no es de ahora (editando sin tocarla)', L.sinRel && L.sinRel.length === 0, L.sinRel);
  chk('7h · «a las 15:00» es la tarde: avisa con el pedido a la mañana, no con el de la tarde',
    L.h15 && L.h15[0] === T + '«a las 15:00», pero el pedido es para el lunes 09/11 a la mañana.' && L.h15pm.length === 0, { a: L.h15, b: L.h15pm });
  chk('7i · «de 10 a 11» con el pedido a la tarde', L.de10a11 && /«de 10 a 11», pero el pedido es para el lunes 09\/11 a la tarde/.test(L.de10a11[0] || ''), L.de10a11);
  chk('7j · «PM» con el pedido a la mañana', L.pm && /«pm», pero/.test(L.pm[0] || ''), L.pm);
  chk('7k · «llamar a las 15:00» habla de la llamada, no de la entrega: no avisa', L.llamar15 && L.llamar15.length === 0, L.llamar15);
  chk('7l · el sábado a la tarde no existe: «en la tarde» con el pedido el sábado avisa y lo dice',
    L.sabTarde && L.sabTarde[0] === T + '«en la tarde», pero el pedido es para el sábado 07/11 a la mañana. Además, el sábado el camión sale solo a la mañana.', L.sabTarde);
  chk('7m · «sábado en la tarde» con el pedido el sábado a la mañana: también', L.sabTarde2 && /«sábado en la tarde», pero el pedido es para el sábado 07\/11 a la mañana\. Además/.test(L.sabTarde2[0] || ''), L.sabTarde2);
  chk('7n · «de lunes a viernes» (dos días) no avisa', L.lunVie && L.lunVie.length === 0, L.lunVie);
  chk('7o · «llamar el sábado para coordinar» no es el día de entrega', L.llamarSab && L.llamarSab.length === 0, L.llamarSab);
  chk('7p · «cliente viaja el viernes, entregar el jueves»: lee el jueves (no el viernes)',
    L.viaja && L.viaja.length === 0 && L.viajaMal && L.viajaMal[0] === T + '«jueves», pero el pedido es para el lunes 09/11 a la mañana.', { a: L.viaja, b: L.viajaMal });
  chk('7q · «hasta el sábado» y «no puede el sábado» no son un día', L.hasta && L.hasta.length === 0 && L.noSab && L.noSab.length === 0, { a: L.hasta, b: L.noSab });
  chk('7r · una fecha escrita (10/11) contra la de entrega', L.fecha10 && L.fecha10[0] === T + '«10/11», pero el pedido es para el lunes 09/11 a la mañana.' && L.fecha10ok.length === 0, { a: L.fecha10, b: L.fecha10ok });
  chk('7s · «1 1/2 plazas» no es una fecha', L.plazas && L.plazas.length === 0, L.plazas);
  chk('7t · «sábado 07/11» se cita junto', L.sab0711 && /«sábado 07\/11», pero/.test(L.sab0711[0] || ''), L.sab0711);
  chk('7u · «el domingo»: además, el camión no sale', L.domingo && /Además, los domingos el camión no sale\./.test(L.domingo[0] || ''), L.domingo);
  chk('7v · «el lunes» con el pedido el lunes: nada', L.lunesOk && L.lunesOk.length === 0, L.lunesOk);
  chk('7w · «son dos almohadas» (en letras) y cargaste 1', L.dos && L.dos[0] === 'Dicen «dos almohadas» y cargaste 1.', L.dos);
  chk('7x · «3 almohadas» sin ninguna cargada', L.tresSin && L.tresSin[0] === 'Dicen «3 almohadas» y no hay almohadas cargadas.', L.tresSin);
  chk('7y · «2 colchones» y cargaste 1; «1 colchón y 1 almohada» coincide', L.colch && L.colch[0] === 'Dicen «2 colchones» y cargaste 1.' && L.colchOk.length === 0, { a: L.colch, b: L.colchOk });
  chk('7z · «2 almohadas nasa» se compara solo con las NASA', L.nasa && L.nasa[0] === 'Dicen «2 almohadas nasa» y cargaste 1.', L.nasa);
  chk('7z2 · «2 almohadas» con una NASA y una de fibra: coincide', L.nasaTot && L.nasaTot.length === 0, L.nasaTot);
  chk('7z3 · «2 almohadas nasa y 1 de fibra» no se adivina', L.nasaYFibra && L.nasaYFibra.length === 0, L.nasaYFibra);
  chk('7z4 · «las 2 almohadas ya se entregaron en tienda» no cuenta', L.tienda && L.tienda.length === 0, L.tienda);
  chk('7z5 · un renglón «SET DE 2 ALMOHADAS» no se cuenta por renglones', L.set && L.set.length === 0, L.set);
  chk('7z6 · una almohada ×2 son 2', L.cant2 && L.cant2.length === 0, L.cant2);
  chk('7z7 · «cobrar 2.990» con saldo 2.990: nada; «cobrar Bs 2.000»: avisa', L.cobraOk && L.cobraOk.length === 0 && L.cobraMal[0] === 'Dicen «cobrar Bs 2.000» y el saldo es Bs 2.990.', { a: L.cobraOk, b: L.cobraMal });
  chk('7z8 · «no cobrar, ya pagó» y «ya pagó el saldo de 2.000» no avisan', L.noCobrar && L.noCobrar.length === 0 && L.yaPago && L.yaPago.length === 0, { a: L.noCobrar, b: L.yaPago });
  chk('7z9 · «cobrar 2.000 y el resto con QR» (una parte) no avisa', L.resto && L.resto.length === 0, L.resto);
  chk('7z10 · «cobrar 50 de envío» es el flete; «cobrar 3.040» = saldo + flete pendiente', L.flete && L.flete.length === 0 && L.conFlete && L.conFlete.length === 0, { a: L.flete, b: L.conFlete });
  chk('7z11 · «cobrar 2.000» con la venta «SÍ, pagado»', L.pagado && L.pagado[0] === 'Dicen «cobrar Bs 2.000» y la venta está marcada «SÍ, pagado».'.replace('cobrar Bs 2.000', 'cobrar 2.000'), L.pagado);
  chk('7z12 · «saldo: Bs 2.000» y «paga 2.000 en efectivo» también se leen', L.saldoTxt && L.saldoTxt[0] === 'Dicen «saldo: Bs 2.000» y el saldo es Bs 2.990.' && L.paga && /«paga 2\.000» y el saldo es Bs 2\.990/.test(L.paga[0] || ''), { a: L.saldoTxt, b: L.paga });
  chk('7z13 · en una reposición (RPT) no se mira la plata', L.rpt && L.rpt.length === 0, L.rpt);
  chk('7z13b · «cobrar 2.000 en efectivo y 990 por QR» (dos partes) no avisa', L.dosMetodos && L.dosMetodos.length === 0, L.dosMetodos);
  chk('7z13c · Eduardo no carga el saldo: «cobrar 4740» con saldo 0 no le avisa; a una vendedora sí',
    L.liteSinSaldo && L.liteSinSaldo.length === 0 && L.sinSaldo && L.sinSaldo[0] === 'Dicen «cobrar 4740» y no hay saldo por cobrar.', { a: L.liteSinSaldo, b: L.sinSaldo });
  chk('7z14 · «a cuenta 1000, saldo 1990» compara el SALDO (avisa con 2.990, no con 1.990)',
    L.cuentaMal && L.cuentaMal[0] === 'Dicen «saldo 1990» y el saldo es Bs 2.990.' && L.cuentaOk && L.cuentaOk.length === 0, { a: L.cuentaMal, b: L.cuentaOk });
  chk('7z15 · las notas de todos los días (llamar, recibe, dirección, piso, «1 colchón de 2 plazas», un enlace…) no avisan nada', Array.isArray(L.tranquilas) && L.tranquilas.length === 0, L.tranquilas);

  // ============ 8. el turno: «Corregir» lleva al botón; la cantidad, a la cantidad ============
  await llenar({ obs: 'Entregar en la tarde' });
  r = await guardar();
  const ct = await ev(async () => { document.getElementById('obsrev-corregir').click(); await new Promise(r => setTimeout(r, 200)); var a = document.activeElement; return a ? (a.closest && a.closest('#f-turno') ? a.dataset.val : (a.id || a.className)) : ''; });
  chk('8a · un aviso de turno: «Corregir» lleva al botón 🌆 PM', r.modal && ct === 'PM', { r, ct });
  await llenar({ obs: 'Son 3 almohadas' });
  r = await guardar();
  const cq = await ev(async () => { document.getElementById('obsrev-corregir').click(); await new Promise(r => setTimeout(r, 200)); var a = document.activeElement; return { cls: a && a.className, desc: a && a.closest('.prod-card') && a.closest('.prod-card').querySelector('.prod-desc').value }; });
  chk('8b · un aviso de cantidad: «Corregir» lleva a la cantidad del renglón de las almohadas', r.modal && /prod-cant/.test(cq.cls || '') && cq.desc === 'ALMOHADA', { r, cq });

  // ============ 9. no tapa un error de siempre ============
  await llenar({ obs: EJ, cliente: '' });
  r = await guardar();
  chk('9 · sin cliente: sale el error de siempre (Falta…) y NO la ventana', r.guardo === 0 && !r.modal && /Falta/.test(r.toast), r);

  // ============ 10. ATC y venta de tienda no se miran; RPT sí (sin la plata) ============
  await llenar({ obs: 'Entregar el sábado en la tarde. Son 2 almohadas.', tipo: 'ATC' });
  r = await guardar();
  chk('10a · en una ATC no pregunta y guarda', r.guardo === 1 && !r.modal, r);
  await ev(() => { closeModal(); segSet('f-doc-tipo', 'OC'); setDocTipo(); });
  await llenar({ obs: 'Entregar el sábado en la tarde. Son 2 almohadas.', tienda: true });
  r = await guardar();
  const tie = await ev(() => VENTA_TIENDA);
  chk('10b · en una venta de tienda (ya salió) no pregunta', r.guardo === 1 && !r.modal, { r, tie });
  await ev(() => { closeModal(); try { cerrarVentaTienda(); } catch (e) { VENTA_TIENDA = false; } });
  await llenar({ obs: 'Llevar el sábado. Cobrar 2.000.', tipo: 'RPT' });
  r = await guardar();
  chk('10c · en una RPT pregunta el día, no la plata', r.modal && r.items.length === 1 && /«sábado», pero el pedido es para el lunes 09\/11/.test(r.items[0]), r);
  await ev(() => { closeModal(); segSet('f-doc-tipo', 'OC'); setDocTipo(); });

  // ============ 11. editando: solo lo NUEVO ============
  await ev(() => {
    var mk = function (id, obs, cantAlm) {
      return { id: id, oc: '11-0' + id.slice(-2), fecha: '2026-11-09', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + id, celular: '7555' + id.slice(-4).replace(/\D/g, '0').padStart(4, '0'),
        zona: 'Sur', direccion: 'CALLE 2', nota: '9' + id.slice(-2), observaciones: obs,
        productos: [{ desc: 'COLCHON ORO ANATOMICO', medida: '140x190', cant: 1, precio: 2000 }, { desc: 'ALMOHADA', medida: '50x70', cant: cantAlm, precio: 990 }],
        pagado: false, saldo: 2990, acuenta: 0, metodoPago: '', ts: Date.now() - 86400000 * 3, rev: 1 };
    };
    [mk('viejo01', 'Son 2 almohadas', 1), mk('viejo02', 'Entregar mañana', 1)].forEach(function (p) { window._pl.push(JSON.parse(JSON.stringify(p))); STATE.push(p); });
    saveMirror();
  });
  const editar = (id) => ev(async (id) => { closeModal(); UNLOCKED = false; editPedido(id); await new Promise(r => setTimeout(r, 350)); }, id);
  await editar('viejo01');
  r = await guardar();
  chk('11a · un pedido que YA contradecía (la misma nota): editar otra cosa no vuelve a preguntar', r.guardo === 1 && !r.modal, r);
  await editar('viejo01');
  await ev(() => { var c = [].filter.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return c.querySelector('.prod-desc').value === 'ALMOHADA'; })[0]; c.querySelector('.prod-cant').value = '3'; });
  r = await guardar();
  chk('11b · …pero si se cambia la cantidad, lo nuevo sí («cargaste 3»)', r.guardo === 0 && r.modal && r.items[0] === 'Dicen «2 almohadas» y cargaste 3.', r);
  await editar('viejo02');
  r = await guardar();
  chk('11c · un «mañana» de una nota vieja no se lee contra hoy si no se tocó la nota', r.guardo === 1 && !r.modal, r);
  await editar('viejo02');
  await ev(() => { document.getElementById('f-obs').value = 'Entregar mañana sin falta'; });
  r = await guardar();
  chk('11d · si la nota se escribe ahora, «mañana» sí se lee', r.modal && /«mañana» \(viernes 06\/11\)/.test(r.items[0] || ''), r);
  await ev(() => closeModal());

  // ============ 12. «Para guardar» lo adelanta ============
  await llenar({ obs: EJ });
  const der = await ev(async () => { fxDerPintar(); var el = document.getElementById('fx-der'), o = el && el.querySelector('.fx-obsrev'); return { txt: o ? o.textContent : '', title: o ? o.getAttribute('title') : '' }; });
  chk('12a · «Para guardar» dice «⚠️ Las observaciones dicen otra cosa» con el detalle', der.txt === '⚠️ Las observaciones dicen otra cosa' && /cargaste 1/.test(der.title), der);
  await llenar({ obs: 'Entregar el lunes por la mañana.' });
  const der2 = await ev(() => { fxDerPintar(); return !!document.querySelector('#fx-der .fx-obsrev'); });
  chk('12b · con una nota que coincide, la línea no está', der2 === false, der2);

  // ============ 13. las preguntas de siempre siguen después de «Guardar igual» ============
  await ev(() => { window._pl.push({ id: 'dup1', oc: '11-090', fecha: '2026-11-10', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE REPETIDO', celular: '76543210',
    zona: 'Sur', direccion: 'CALLE 9', nota: '777', observaciones: '', productos: [{ desc: 'COLCHON ORO ANATOMICO', medida: '140x190', cant: 1, precio: 2990 }],
    pagado: false, saldo: 2990, ts: Date.now() - 3600000, rev: 1 }); STATE.push(JSON.parse(JSON.stringify(window._pl[window._pl.length - 1]))); saveMirror(); });
  await llenar({ obs: 'Son 2 almohadas', cliente: 'CLIENTE REPETIDO', cel: '76543210' });
  preguntas = [];
  r = await guardar();
  const dup = await ev(async () => { var n0 = window._saves; document.getElementById('obsrev-igual').click(); await new Promise(r => setTimeout(r, 700)); return window._saves - n0; });
  chk('13 · después de «Guardar igual» sigue la pregunta de siempre (¿pedido repetido?) y se guarda una vez', r.modal && dup === 1 && preguntas.some(function (q) { return /REPETIDO/.test(q); }), { r: r.modal, dup, preguntas });

  chk('sin errores en la página', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
