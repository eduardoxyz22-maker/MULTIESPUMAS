/* 📱 EL CELULAR DE UNA VENTA A DOMICILIO QUEDA EN 8 NÚMEROS (§4ok-95, 05/11/2026; mejoras 95 y 107 del plan del jueves).
   Desde el 01/10, 15 de 226 clientes a domicilio quedaron sin un celular al que el bot pueda escribirle (dos números con guion,
   «#ERROR!», 4/7/9/11 números).
   ⚠️ LO QUE ESTE TEST CUIDA:
   1. `celPartes` saca el celular de lo que se escribe: +591, espacios, guiones, dos números (el primero que sirve), un celular con
      un guion en el medio, el borde a la izquierda («775123456» NO es «75123456»), un número de otro país queda como «otro».
   2. Al guardar una venta a domicilio el celular queda en 8 números y los otros van a Observaciones como «Otro cel: …» (sin repetir).
   3. Sin un celular de WhatsApp no se guarda; con «📵 El cliente no tiene WhatsApp» sí, tal cual, y la marca viaja (`sinwa`) y vuelve
      al editar. «Para guardar» y los pasos piden lo mismo que Guardar.
   4. Un pedido VIEJO con un celular que no sirve: la vendedora lo corrige o tilda; con la clave de Administración se guarda tras preguntar.
   5. No aplica a Eduardo, ROHO, internos, ATC, RPT ni a la venta de tienda; en Playwright apagado salvo `CEL_PRUEBA`.
   Datos INVENTADOS. Reloj clavado el martes 03/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_celular_form.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let DIALOGO = 'aceptar', preguntas = [];
  page.on('dialog', d => { preguntas.push(d.message().slice(0, 200)); return DIALOGO === 'aceptar' ? d.accept() : d.dismiss(); });
  await page.clock.install({ time: new Date('2026-11-03T10:00:00-04:00') });   // martes
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  await ev(() => {
    window.__sinFlag = (typeof celObligatorio === 'function') ? celObligatorio('Carola Chavez') : 'no existe';
    window.CEL_PRUEBA = 1;
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    STATE = []; saveMirror();
  });
  const sinFlag = await ev(() => window.__sinFlag);
  chk('0 · en Playwright sin CEL_PRUEBA queda apagado (las pruebas de siempre guardan celulares de ejemplo)', sinFlag === false, sinFlag);

  // ============ 1. celPartes ============
  const P = await ev(() => {
    var c = function (t) { var o = celPartes(t); return o.cel + '|' + o.otros.join(','); };
    return {
      dos: c('77012345-76543210'), dosEsp: c('77012345 - 69012345'), raya: c('74912345 – 71012345'), dobleG: c('77812345 -- 76312345'),
      y: c('70012345 y 69012345'), barra: c('70012345 / 76543210'), pipe: c('78412345|'), letra: c('75012345C'),
      mas591: c('+591 70012345'), pegado591: c('59170012345'), esp591: c('591 71012345'), sep591: c('+591-70012345'),
      espacios: c('700 123 45'), unEsp: c('7 6381234'), guionMedio: c('700-12345'), uni: c('‪+59170012345‬'),
      error: c('#ERROR!'), siete: c('7001234'), nueve: c('775123456'), cuatro: c('1234'), cero: c('0'),
      afuera: c('73312345-+34612345678'), malPrimero: c('7001234-76543210'), repetido: c('70012345 - 70012345')
    };
  });
  chk('1a · dos números con guion: el primero es el celular y el otro queda aparte',
    P.dos === '77012345|76543210' && P.dosEsp === '77012345|69012345' && P.raya === '74912345|71012345' && P.dobleG === '77812345|76312345', P);
  chk('1b · también con « y », «/», «|» y una letra pegada', P.y === '70012345|69012345' && P.barra === '70012345|76543210' && P.pipe === '78412345|' && P.letra === '75012345|', P);
  chk('1c · sin +591 ni espacios', P.mas591 === '70012345|' && P.pegado591 === '70012345|' && P.esp591 === '71012345|' && P.sep591 === '70012345|' &&
    P.espacios === '70012345|' && P.unEsp === '76381234|' && P.uni === '70012345|', P);
  chk('1d · un celular escrito con un guion en el medio es UNO', P.guionMedio === '70012345|', P.guionMedio);
  chk('1e · lo que no es un celular de WhatsApp no da celular (#ERROR!, 7, 4 o 1 números)', P.error === '|' && P.siete === '|7001234' && P.cuatro === '|' && P.cero === '|', P);
  chk('1f · borde a la izquierda: «775123456» no es «75123456»', P.nueve === '|775123456', P.nueve);
  chk('1g · un número de otro país queda como otro, tal como se escribió', P.afuera === '73312345|+34612345678', P.afuera);
  chk('1h · el que sirve gana aunque vaya segundo, y el mismo dos veces es uno', P.malPrimero === '76543210|7001234' && P.repetido === '70012345|', P);

  /* Llena una venta como una vendedora. */
  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    if (o.tienda) { abrirVentaTienda(); }
    document.getElementById('f-fecha').value = '2026-11-04'; segSet('f-turno', 'AM');
    if (o.tipo) { segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez'; applyVendedorLite();
    if (o.tipo === 'RPT') { var s = document.getElementById('f-rpt-suc'); s.value = 'Mia Plaza'; try { sucursalElegida(); } catch (e) {} }
    document.getElementById('f-cliente').value = 'CLIENTE INVENTADO';
    var fc = document.getElementById('f-celular'); fc.value = o.cel; fc.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA 1';
    document.getElementById('f-obs').value = o.obs || '';
    var n = document.getElementById('f-nota'); if (n) n.value = '1234';
    if (o.tipo === 'ATC') {
      segSet('f-atc-tipo', 'gar'); document.getElementById('f-atc-motivo').value = 'Hundimiento';
      document.getElementById('f-atc-detalle').value = 'hundido en el medio, no retoma su forma';
      document.getElementById('f-atc-compra').value = '2025-03-10';
      var pz = document.getElementById('f-pz-col'); if (pz) pz.checked = true;
    }
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('TITANIO LATEX', '160x190', '', 1, 3200); refreshDelButtons();
    if (!o.tienda && o.tipo !== 'ATC' && o.tipo !== 'RPT') { segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3200'; }
    try { updateMetodoVisibility(); } catch (e) {}
    if (o.sinwa) { var sw = document.getElementById('f-sinwa'); sw.checked = true; celFormPintar(); }
  }, o);
  const estado = () => ev(() => {
    try { fxDerPintar(); } catch (e) {}
    var der = (document.getElementById('fx-der') || {}).textContent || '';
    var w = document.getElementById('f-sinwa-wrap'), av = document.getElementById('f-cel-aviso');
    return { paso: fxPasosEstado()[0], celDer: /✓ Celular/.test(der) ? 'ok' : (/○ Celular/.test(der) ? 'no' : '—'),
      casilla: !!(w && !w.hidden), tilde: !!document.getElementById('f-sinwa').checked, aviso: av && !av.hidden ? av.textContent : '' };
  });
  const guardar = () => ev(async () => {
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, 400));
    return { guardo: window._saves > n0, rojo: document.getElementById('f-celular').classList.contains('err'),
      toast: (document.getElementById('toast') || {}).textContent || '', ult: window._pl[window._pl.length - 1] || null };
  });

  // ============ 2. dos números → el celular en 8 y el otro a Observaciones ============
  await llenar({ cel: '77012345-76543210', obs: 'Llamar antes' });
  let e = await estado();
  chk('2a · antes de guardar dice cómo se va a guardar', /Se guarda como 77012345/.test(e.aviso) && /Otro cel: 76543210/.test(e.aviso) && !e.casilla, e);
  chk('2b · «Para guardar» y el paso quedan listos', e.paso === true && e.celDer === 'ok', e);
  let r = await guardar();
  chk('2c · se guarda con el celular en 8 números', r.guardo && r.ult && r.ult.celular === '77012345', r.ult && r.ult.celular);
  chk('2d · el otro número va a Observaciones, después de lo que ya decía', r.ult && r.ult.observaciones === 'Llamar antes · Otro cel: 76543210', r.ult && r.ult.observaciones);
  chk('2e · sin la marca «no tiene WhatsApp»', r.ult && !r.ult.productos.some(x => x.sinwa), r.ult && r.ult.productos);

  await llenar({ cel: '+591 700 12345' });
  r = await guardar();
  chk('2f · «+591 700 12345» queda «70012345» y Observaciones no cambia', r.guardo && r.ult.celular === '70012345' && r.ult.observaciones === '', r.ult && [r.ult.celular, r.ult.observaciones]);

  await llenar({ cel: '70012345 / 76543210', obs: 'Otro cel: 76543210' });
  r = await guardar();
  chk('2g · el otro número que ya estaba escrito en Observaciones no se repite', r.guardo && r.ult.observaciones === 'Otro cel: 76543210', r.ult && r.ult.observaciones);

  // ============ 3. sin un celular de WhatsApp ============
  await llenar({ cel: '7001234' });
  e = await estado();
  chk('3a · avisa que no es de WhatsApp y muestra la casilla', e.casilla && /no es un celular de WhatsApp/.test(e.aviso), e);
  chk('3b · «Para guardar» y el paso NO están listos (lo mismo que Guardar)', e.paso === false && e.celDer === 'no', e);
  r = await guardar();
  chk('3c · no se guarda, el celular en rojo y el aviso dice qué hacer', !r.guardo && r.rojo && /WhatsApp/.test(r.toast) && /8 números/.test(r.toast), { guardo: r.guardo, rojo: r.rojo, toast: r.toast });

  await llenar({ cel: '#ERROR!' });
  r = await guardar();
  chk('3d · «#ERROR!» tampoco se guarda', !r.guardo && r.rojo, r.toast);

  await llenar({ cel: '7001234', sinwa: true });
  e = await estado();
  chk('3e · con «📵 El cliente no tiene WhatsApp» el paso y «Para guardar» quedan listos', e.paso === true && e.celDer === 'ok' && e.tilde && /tal cual/.test(e.aviso), e);
  r = await guardar();
  chk('3f · se guarda con el número tal cual y la marca `sinwa` en los productos', r.guardo && r.ult.celular === '7001234' && r.ult.productos.every(x => x.sinwa === 1), r.ult && [r.ult.celular, r.ult.productos]);
  const idSinWa = r.ult && r.ult.id;

  // ============ 4. la marca vuelve al editar ============
  await ev((id) => { STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror(); UNLOCKED = false; editPedido(id); }, idSinWa);
  await page.waitForTimeout(250);
  e = await estado();
  chk('4a · al editar, la casilla ya viene tildada', e.casilla && e.tilde, e);
  r = await guardar();
  chk('4b · y se guarda otra vez sin pedir nada', r.guardo && r.ult.productos.every(x => x.sinwa === 1), r.toast);

  await ev((id) => { STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror(); editPedido(id); }, idSinWa);
  await page.waitForTimeout(250);
  await ev(() => { var fc = document.getElementById('f-celular'); fc.value = '69012345'; fc.dispatchEvent(new Event('input', { bubbles: true })); });
  e = await estado();
  r = await guardar();
  chk('4c · con un celular que sirve la casilla se va y la marca no se guarda', !e.casilla && !e.tilde && r.guardo && r.ult.celular === '69012345' && !r.ult.productos.some(x => x.sinwa), { e, cel: r.ult && r.ult.celular });

  // ============ 5. un pedido viejo que ya venía con un celular que no sirve ============
  await ev(() => {
    var p = { id: 'viejo1', oc: '10-201', fecha: '2026-11-04', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE VIEJO', celular: '3456789',
      zona: 'Sur', direccion: 'CALLE 2', nota: '999', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1, precio: 3000 }], pagado: false, saldo: 3000,
      observaciones: '', ts: Date.now() - 86400000 * 5, rev: 1 };
    window._pl.push(JSON.parse(JSON.stringify(p))); STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
  });
  const editar = (clave) => ev(async (clave) => { UNLOCKED = !!clave; editPedido('viejo1'); await new Promise(r => setTimeout(r, 300)); }, clave);
  await editar(false);
  r = await guardar();
  chk('5a · la vendedora que edita su pedido viejo tiene que corregir el celular (o tildar la casilla)', !r.guardo && r.rojo, r.toast);

  await editar(true); preguntas = []; DIALOGO = 'cancelar';
  r = await guardar();
  chk('5b · con la clave, «Cancelar» deja el celular en rojo para corregirlo', !r.guardo && r.rojo && preguntas.some(q => /no es un celular de WhatsApp/.test(q)), { preguntas });

  await editar(true); preguntas = []; DIALOGO = 'aceptar';
  r = await guardar();
  chk('5c · con la clave de Administración se guarda igual, después de preguntar', r.guardo && r.ult.celular === '3456789' && preguntas.some(q => /ya estaba guardado/.test(q)), { guardo: r.guardo, preguntas });

  await editar(false);
  await ev(() => { var fc = document.getElementById('f-celular'); fc.value = '3456789-71234567'; fc.dispatchEvent(new Event('input', { bubbles: true })); });
  r = await guardar();
  chk('5d · la vendedora le agrega el celular: queda ese y el fijo va a Observaciones', r.guardo && r.ult.celular === '71234567' && r.ult.observaciones === 'Otro cel: 3456789', r.ult && [r.ult.celular, r.ult.observaciones]);

  // ============ 6. donde no aplica ============
  const no = await ev(() => {
    var o = {};
    o.eduardo = celObligatorio('Eduardo Añez'); o.roho = celObligatorio('ROHO'); o.alba = celObligatorio('ALBA');
    segSet('f-doc-tipo', 'ATC'); setDocTipo(); o.atc = celObligatorio('Carola Chavez');
    segSet('f-doc-tipo', 'RPT'); setDocTipo(); o.rpt = celObligatorio('Carola Chavez');
    segSet('f-doc-tipo', 'OC'); setDocTipo(); o.oc = celObligatorio('Carola Chavez');
    abrirVentaTienda(); o.tienda = celObligatorio('Carola Chavez'); cancelarVentaTienda(); showView('form');
    return o;
  });
  chk('6a · no aplica a Eduardo, ROHO, internos, ATC, RPT ni la venta de tienda', no.eduardo === false && no.roho === false && no.alba === false &&
    no.atc === false && no.rpt === false && no.tienda === false && no.oc === true, no);
  await llenar({ cel: '7001234-76543210', vend: 'Eduardo Añez' });
  r = await guardar();
  chk('6b · Eduardo guarda el celular como lo escribió', r.guardo && r.ult.celular === '7001234-76543210', r.ult && r.ult.celular);
  await llenar({ cel: '7001234', tipo: 'ATC' });
  r = await guardar();
  chk('6c · una ATC con un celular de 7 números se guarda como siempre', r.guardo && r.ult.celular === '7001234', r.toast);
  await llenar({ cel: '7001234', tienda: true });
  r = await guardar();
  chk('6d · una venta de tienda tampoco lo pide', r.guardo && r.ult.celular === '7001234', r.toast);

  chk('sin errores de la página', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
