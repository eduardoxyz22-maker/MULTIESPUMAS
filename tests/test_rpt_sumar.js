/* 🏪 304 · LA RPT SE SUMA A LA QUE YA VA A ESA TIENDA (15/11; el dueño aprobó la 304: «ok»; con el cuidado del encargo: «nunca juntar sola,
   siempre que la vendedora lo acepte»).
   Cuida: qué RPT se ofrecen (`rptSumarCands`: la misma sucursal, de hoy a 3 días hábiles, sin entregar, sin «🚚 Ya salió» y sin NADA
   tildado en la carga); que sin la bandera no cambia nada; que al guardar una RPT NUEVA sale la pregunta y NO se guarda nada hasta tocar;
   «Mandar aparte» = el guardado de siempre; «➕ Sumar» agrega los renglones (sin marcas de logística, con su tipo) a la RPT de destino, que
   conserva sus marcas, queda «MODIFICADO» y sin «listo», y no se crea otra fila; ✕ no guarda nada; editar o cargar una OC no pregunta.
   Reloj clavado (miércoles 11/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_rpt_sumar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-11T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  const hay = await ev(() => typeof rptSumarPreguntar === 'function' && typeof rptSumarCands === 'function');
  chk('0 · la página tiene la 304 (`rptSumarPreguntar`, `rptSumarCands`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    var R = function (id, o) { return Object.assign({ id: id, oc: 'RPT ' + id, vendedor: 'Fernando Peinado', cliente: 'Charcas', zona: 'Centro', maps: SUCURSALES[5].m, turno: 'AM', direccion: '',
      productos: [{ desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048', cant: 5, rtipo: 'Reposición', chk: 'ok' }], ts: Date.parse('2026-11-09T11:00:00-04:00'), rev: 3 }, o); };
    window._pl = [
      R('11-016', { fecha: '2026-11-12', verificado: true }),                                                  // ✔ la que se ofrece
      R('11-020', { fecha: '2026-11-13', vehiculo: 'CAMION 1', productos: [{ desc: 'ALMOHADA', medida: '50x70', codigo: 'CD1403', cant: 4, rtipo: 'Reposición' }] }),   // ya tiene algo tildado
      R('11-021', { fecha: '2026-11-18' }),                                                                     // más de 3 días hábiles
      R('11-022', { fecha: '2026-11-12', cliente: 'Mutualista', zona: 'Mutualista' }),                          // otra tienda
      R('11-023', { fecha: '2026-11-12', entregado: true }),                                                    // ya entregada
      R('11-024', { fecha: '2026-11-12', vehiculo: 'CAMION 2' })                                                // el camión ya salió
    ];
    window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec)); g.rev = (Number(g.rev) || 0) + 1;
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    window._marcarCarga = function () {
      var p = findById('11-020'), x = p.productos[0], kk = cargaProdKey(x), sm = cargaSaleDe(x);
      CARGA_CHK[cargaChkKey(p.fecha, 'CAMION 1', kk, '', 'AM')] = 1;
      Object.keys(sm).forEach(function (n) { CARGA_CHK[cargaChkKey(p.fecha, 'CAMION 1', kk, n, 'AM')] = 1; });
      CARGA_CHK[cargaChkKey('2026-11-12', 'CAMION 2', CARGA_SALIO) + '|09:00'] = 1;
    };
    window._cargar = function (suc, prods, fecha) {
      showView('form'); resetForm();
      document.getElementById('f-fecha').value = fecha || '2026-11-13'; segSet('f-turno', 'AM');
      segSet('f-doc-tipo', 'RPT'); setDocTipo();
      document.getElementById('f-vendedor').value = 'Fernando Peinado'; applyVendedorLite();
      document.getElementById('f-rpt-suc').value = suc; sucursalElegida();
      prods.forEach(function (x, i) {
        if (i) addProdRow();
        var cs = document.querySelectorAll('#f-productos .prod-card'), c = cs[cs.length - 1];
        c.querySelector('.prod-desc').value = x.d; var md = c.querySelector('.prod-medida'); if (md) md.value = x.m;
        c.querySelector('.prod-codigo').value = x.c; c.querySelector('.prod-cant').value = String(x.n);
        var rt = c.querySelector('.prod-rtipo'); if (rt && x.t) rt.value = x.t;
      });
    };
  });
  await ev(async () => { await refrescarEstado(); _marcarCarga(); });

  // ============ 1. qué RPT se ofrecen ============
  const C = await ev(() => ({ charcas: rptSumarCands('Charcas', null).map(function (p) { return p.id; }), mutua: rptSumarCands('Mutualista', null).map(function (p) { return p.id; }),
    cargada: depCargado(findById('11-020'), findById('11-020').productos[0]).u, salio: !!camionSalio('2026-11-12', 'CAMION 2') }));
  chk('1a · a Charcas se ofrece SOLO la 11-016 (no la tildada en la carga, ni la de dentro de 5 días hábiles, ni la entregada, ni la del camión que salió)', JSON.stringify(C.charcas) === '["11-016"]', C);
  chk('1b · los descartes son por lo que dice el panel (`depCargado`, `camionSalio`)', C.cargada > 0 && C.salio, C);
  chk('1c · cada tienda la suya', JSON.stringify(C.mutua) === '["11-022"]', C.mutua);

  const PRODS = [{ d: 'ALMOHADA', m: '50x70', c: 'CD1403', n: 6, t: 'Reposición' }, { d: 'COLCHON SOFT', m: '105x190', c: 'COLT0062', n: 2, t: 'Adicional' }];
  const esperar = (ms) => page.waitForTimeout(ms);

  // ============ 2. sin la bandera, nada cambia ============
  let antes = await ev(() => ({ n: _pl.length, s: _saves }));
  await ev((P) => { window.RPT_SUMAR_PRUEBA = 0; _cargar('Charcas', P); submitPedido(); }, PRODS);
  await esperar(700);
  let r = await ev(() => ({ n: _pl.length, modal: !!document.getElementById('vd-rs'), t: findById('11-016').productos.length }));
  chk('2 · sin `RPT_SUMAR_PRUEBA` (Playwright) se guarda aparte como siempre, sin preguntar', r.n === antes.n + 1 && !r.modal && r.t === 1, r);

  // ============ 3. con la bandera: pregunta y no guarda hasta tocar ============
  await ev(() => { window.RPT_SUMAR_PRUEBA = 1; closeModal(); });
  antes = await ev(() => ({ n: _pl.length, s: _saves }));
  await ev((P) => { _cargar('Charcas', P); submitPedido(); }, PRODS);
  await esperar(700);
  r = await ev(() => { var m = document.getElementById('vd-rs'), h = document.querySelector('#modal .modal-h'); return { abierto: !!m && m.offsetParent !== null, txt: (h ? h.innerText + ' ' : '') + (m ? m.innerText.replace(/\s+/g, ' ') : ''), n: _pl.length, s: _saves,
    botones: m ? [].map.call(m.querySelectorAll('button'), function (b) { return b.textContent.trim(); }) : [] }; });
  chk('3a · al guardar una RPT nueva a Charcas sale «🚚 Ya va una RPT a Charcas»', r.abierto && /Ya va una RPT a Charcas/.test(r.txt), r.txt);
  chk('3b · dice cuál, el día y el turno, y que todavía no se cargó', /RPT 11-016/.test(r.txt) && /jueves 12\/11 · mañana/.test(r.txt) && /todavía no se cargó/.test(r.txt), r.txt);
  chk('3c · muestra lo que ya lleva y lo tuyo, y «1 viaje y 1 lugar del camión»', /COLCHON SOFT 140x190 × 5/.test(r.txt) && /ALMOHADA 50x70 × 6/.test(r.txt) && /1 viaje y 1 lugar del camión/.test(r.txt), r.txt);
  chk('3d · avisa que la tuya era para otro día', /La tuya la pusiste para el viernes 13\/11: sumada va el jueves 12\/11/.test(r.txt), r.txt);
  chk('3e · NO se guardó nada todavía', r.n === antes.n && r.s === antes.s, r);
  chk('3f · los botones «➕ Sumar a la RPT 11-016» y «Mandar aparte»', r.botones.some(function (b) { return /Sumar a la RPT 11-016/.test(b); }) && r.botones.indexOf('Mandar aparte') >= 0, r.botones);

  // ============ 4. ✕ no guarda nada ============
  await ev(() => { document.querySelector('#modal .modal-x').click(); });
  await esperar(200);
  r = await ev(() => ({ n: _pl.length, s: _saves, form: document.querySelectorAll('#f-productos .prod-desc').length, suc: document.getElementById('f-rpt-suc').value }));
  chk('4 · cerrar con ✕ no guarda nada y deja el formulario como estaba', r.n === antes.n && r.s === antes.s && r.form === 2 && r.suc === 'Charcas', r);

  // ============ 5. «Mandar aparte» ============
  await ev(() => { submitPedido(); });
  await esperar(700);
  await ev(() => { document.getElementById('vd-rs-aparte').click(); });
  await esperar(700);
  r = await ev(() => ({ n: _pl.length, t: findById('11-016').productos.length, nueva: _pl.filter(function (p) { return esRPT(p.oc) && p.cliente === 'Charcas' && p.fecha === '2026-11-13' && p.productos.length === 2; }).length }));
  chk('5 · «Mandar aparte» la guarda como siempre (una RPT nueva) y la 11-016 no cambia', r.n === antes.n + 1 && r.t === 1 && r.nueva >= 1, r);

  // ============ 6. «➕ Sumar» ============
  antes = await ev(() => ({ n: _pl.length }));
  await ev((P) => { _cargar('Charcas', P); document.getElementById('f-obs').value = 'LLEVAR CON CUIDADO'; submitPedido(); }, PRODS);
  await esperar(700);
  await ev(() => { document.getElementById('vd-rs-sumar').click(); });
  await esperar(700);
  r = await ev(() => {
    var t = _pl.filter(function (p) { return p.id === '11-016'; })[0] || {}, pr = t.productos || [], m = modDe(t) || {};
    return { n: _pl.length, cant: pr.length, desc: pr.map(function (x) { return x.desc + ' ' + x.medida + ' ×' + x.cant + ' ' + (x.rtipo || ''); }),
      viejaChk: pr[0] && pr[0].chk, nuevasSinMarca: pr.slice(1).every(function (x) { return !x.chk && !x.chkDe && !x.prodF; }),
      mod: m.d, verif: !!t.verificado, obs: t.observaciones || '', rev: t.rev,
      form: { suc: document.getElementById('f-rpt-suc').value, prods: [].filter.call(document.querySelectorAll('#f-productos .prod-desc'), function (d) { return d.value.trim(); }).length } };
  });
  chk('6a · «➕ Sumar» agrega los 2 renglones a la 11-016 (con su tipo) y NO crea otra fila', r.n === antes.n && r.cant === 3 &&
      r.desc[1] === 'ALMOHADA 50x70 ×6 Reposición' && r.desc[2] === 'COLCHON SOFT 105x190 ×2 Adicional', r);
  chk('6b · la RPT de destino conserva su marca de stock; lo sumado entra sin marcar', r.viejaChk === 'ok' && r.nuevasSinMarca, r);
  chk('6c · logística la ve «MODIFICADO: se sumaron 2 productos» y deja de estar «listo»', Array.isArray(r.mod) && /se sumaron 2 productos de otra RPT/.test(r.mod[0]) && r.verif === false, r);
  chk('6d · las observaciones de la nueva se suman a las de la RPT', /LLEVAR CON CUIDADO/.test(r.obs), r.obs);
  chk('6e · el formulario queda limpio', r.form.suc === '' && r.form.prods === 0, r.form);

  // ============ 7. editar o cargar una OC no pregunta ============
  await ev(() => { closeModal(); editPedido('11-022'); });
  await esperar(150);
  await ev(() => { submitPedido(); });
  await esperar(700);
  r = await ev(() => ({ modal: !!document.getElementById('vd-rs') }));
  chk('7a · editar una RPT no pregunta', r.modal === false, r);
  const sinSuc = await ev(() => rptSumarPreguntar({ id: 'x', cliente: 'Cliente cualquiera', productos: [{ desc: 'A', cant: 1 }] }, false, function () {}));
  const oc = await ev(() => { segSet('f-doc-tipo', 'OC'); setDocTipo(); return rptSumarPreguntar({ id: 'x', cliente: 'Charcas', productos: [{ desc: 'A', cant: 1 }] }, false, function () {}); });
  chk('7b · sin sucursal o en una OC, no pregunta', sinSuc === false && oc === false, { sinSuc, oc });

  chk('8 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
