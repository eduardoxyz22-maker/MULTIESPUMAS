/* 🎬 LA FÁBRICA DE EDUARDO, LAS 14 MEJORAS 144-157 (10/11/2026; dueño, con las muestras a la vista: «Me gusta, hazlo y publica»).

   Viven en `fabrica-mas.js`, que se baja la primera vez que se abre la fábrica 3D de Mis pedidos (Eduardo elegido).
   Lo que se mira:
     0. Sin three.js: `fabMasQuiere()` (apagado en Playwright salvo FAB_MAS_PRUEBA; `me_fab_mas`=0 lo apaga en ese aparato), el archivo
        existe y pasa `node --check`, y sin 3D no se baja ni rompe nada.
   Con three.js (PATIO_THREE=<carpeta del paquete three 0.128>, la misma de test_patio y test_fabrica_vida):
     1. Sin FAB_MAS_PRUEBA la fábrica sale como antes (ni `fabMas`, ni botones).
     2. Con las mejoras: se arma todo sin errores y con pocos dibujos de más.
   146. Las pilas de «Producto terminado» salen del stock de PTF (la cuenta del cuadrito): Heaven a la izquierda, Sueña a la derecha,
        lo que más hay más alto, y sin Excel quedan de adorno.
   147. La torre de luz dice lo que falta cargar.          155. La pantalla: el próximo camión con sus lugares y los clientes del mes.
   148. La luz sigue la hora de Bolivia; de noche, lámparas y sereno; al salir vuelve la luz de siempre; al cambiar el momento del día
        la escena se rearma sola.
   145. «🚚 Ya salió» (el tilde de verdad): el camión se va por el portón y el andén queda con «salió a las…»; al deshacerlo, vuelve.
        Si ya estaba afuera al abrir, el andén está vacío de entrada (sin función).
   144. Un tilde de la Lista de carga (el de verdad): un montacargas lo lleva al camión. Cambiar de período no es cargar.
   157. Al tildar lo último: el festejo.
   150/152/153/154/156. Los dos operarios con su colchón, las bocas, el gato, los botones (recorrer, seguir, sonido que se calla al
        esconder la fábrica y con el 🔇 de Bloki).
     3. Con «reducir movimiento»: todo en su lugar, sin recorrido; un camión que salió está afuera sin animación.
     4. En el celular: menos luces de noche.
   Datos inventados (el repo es público). Se corre:  PATIO_THREE=… node tests/test_fabrica_mas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), cp = require('child_process');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TH = process.env.PATIO_THREE || '';

const armar = (o) => {
  try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  CONNECTED = false; window.autoAbrirAvisos = function () {};
  window.apiPost = function () { return new Promise(function () {}); };   // nada sale a ningún lado: los tildes quedan en la memoria
  var hoy = todayStr(), man = proximoDiaEntrega(), P = function (x) { return Object.assign({ vendedor: 'Eduardo Añez', turno: 'AM', zona: 'NORTE', direccion: 'Av. Ejemplo', maps: '', pagado: false, saldo: 0,
    ts: Date.now() - 86400000 * 3, metodoPago: '', entregado: false, acuenta: 0 }, x); };
  var L = [];
  L.push(P({ id: 'e1', oc: '11-010', nota: '401', cliente: 'CLIENTE CHICO', fecha: hoy, entregado: true, saldo: 900, productos: [{ desc: 'TITANIO', medida: '160x200', cant: 1, precio: 900 }] }));
  if (!(o && o.libre)) {
  L.push(P({ id: 'p1', oc: '11-001', nota: '601', cliente: 'DISTRIBUIDORA EL SOL', saldo: 9300, fecha: man, vehiculo: 'Foton nuevo', productos: [{ desc: 'ESPECIAL SEMIORTOPEDICO', medida: '140x190', cant: 6, chk: 'ok', precio: 1000 }, { desc: 'TITANIO', medida: '160x200', cant: 3, chk: 'ok', precio: 1100 }] }));
  L.push(P({ id: 'p2', oc: '11-002', nota: '602', cliente: 'COMERCIAL NORTE', saldo: 4800, fecha: man, vehiculo: 'Carry', productos: [{ desc: 'SOMIER ORO', medida: '140x190', cant: 4, chk: 'ok', precio: 1200 }] }));
  L.push(P({ id: 'a1', oc: 'ATC 11-001', cliente: 'UNA ATC', saldo: 99999, fecha: man, entregado: true, productos: [{ desc: 'TITANIO', medida: '160x200', cant: 1 }] }));
  }
  STATE = L; CARGA_CHK = {};
  if (o && o.stock) { var K = function (d, m) { return stockInfo({ desc: d, medida: m, codigo: '' }).k; };
    STOCK = stockVacio(); STOCK.c = { f: hoy, hora: '08:30:00', u: {}, t: Date.now() - 3600000 };
    STOCK.c.u[K('TITANIO', '160x200')] = 14; STOCK.c.u[K('ESPECIAL SEMIORTOPEDICO', '140x190')] = 30; STOCK.c.u[K('ORTOPEDICO SUEÑA', '140x190')] = 5; STOCK.c.u[K('SOMIER ORO', '140x190')] = 3; STOCK.c.u[K('ALMOHADA', '50x70')] = 40;
    try { stockOlvidarIndice(); SALDO_GEN++; } catch (e) {} }
  showView('mis'); MIS_TODOS = false; MIS_FILTER = 'todos'; DEP.per = 'todo'; DEP.perTocado = true; DEP.firma = '';
  document.getElementById('mis-vendedor').value = 'Eduardo Añez'; renderMis();
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const nueva = async (opt, mas, pre) => {
    const page = await browser.newPage(Object.assign({ viewport: { width: 1366, height: 1000 }, timezoneId: 'America/La_Paz' }, opt || {}));
    const errores = []; page.on('pageerror', e => errores.push(e.message)); page.on('console', m => { if (m.type() === 'error' && /fabMas/.test(m.text())) errores.push(m.text()); }); page.on('dialog', d => d.accept());
    if (mas) await page.addInitScript(() => { window.FAB_MAS_PRUEBA = 1; });
    if (pre) await page.addInitScript(pre);
    if (TH) {
      await page.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(TH, 'build/three.min.js')), contentType: 'text/javascript' }));
      await page.route('**/OrbitControls.js', r => r.fulfill({ body: fs.readFileSync(path.join(TH, 'examples/js/controls/OrbitControls.js')), contentType: 'text/javascript' }));
    }
    await page.route(/^https?:/, r => { const u = r.request().url(); if (TH && /three\.min\.js|OrbitControls/.test(u)) return r.fallback(); return r.abort(); });
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil: 'load' }); await page.waitForTimeout(400);
    return { page, errores };
  };
  const hayVida = async (page) => { for (let i = 0; i < 100 && !(await page.evaluate(() => !!(window.VIDA && VIDA.q && VIDA.q.edu))); i++) await page.waitForTimeout(200); await page.waitForTimeout(300); };
  const espera = async (page, fn, seg) => { for (let i = 0; i < (seg || 20) * 4; i++) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };

  /* ---------- 0. sin three.js ---------- */
  {
    const { page, errores } = await nueva();
    const r = await page.evaluate(() => { var o = { def: fabMasQuiere(), v: FABMAS_V }; window.FAB_MAS_PRUEBA = 1; o.prueba = fabMasQuiere();
      localStorage.setItem('me_fab_mas', '0'); o.apagado = fabMasQuiere(); localStorage.removeItem('me_fab_mas'); window.FAB_MAS_PRUEBA = 0; return o; });
    chk('0. en Playwright las mejoras quedan apagadas; con FAB_MAS_PRUEBA se prenden; `me_fab_mas`=0 las apaga en ese aparato', r.def === false && r.prueba === true && r.apagado === false, r);
    chk('0. FABMAS_V tiene forma de fecha y el archivo existe', /^\d{8}[a-z]$/.test(r.v) && fs.existsSync(path.resolve('fabrica-mas.js')), r.v);
    let ok = true, sal = ''; try { cp.execFileSync('node', ['--check', path.resolve('fabrica-mas.js')], { stdio: 'pipe' }); } catch (e) { ok = false; sal = String(e.stderr || e.message); }
    chk('0. fabrica-mas.js pasa `node --check`', ok, sal);
    const src = fs.readFileSync(path.resolve('fabrica-mas.js'), 'utf8');
    chk('0. el archivo no escribe nada: ni guardar, ni tildes, ni «Ya salió»', !/apiSave|apiPost|guardarDurable|setCargaChk|camionSalioMarcar|persistPedido|setVehiculo|toggleEntregado/.test(src));
    if (!TH) { await page.evaluate(armar, {}); await page.waitForTimeout(1500);
      chk('0. sin 3D no se baja nada y no hay errores', await page.evaluate(() => !window.fabMas) && errores.length === 0, errores); }
    await page.close();
  }

  if (!TH) { console.log('(sin PATIO_THREE: se saltean las partes con 3D)'); }
  else {
    /* ---------- 1. sin FAB_MAS_PRUEBA: como antes ---------- */
    {
      const { page, errores } = await nueva();
      await page.evaluate(armar, {}); await hayVida(page);
      const r = await page.evaluate(() => ({ mas: !!window.fabMas, bot: !!document.getElementById('fab-mas-bot'), edu: !!VIDA.q.edu, sereno: !!VIDA.q.sereno }));
      chk('1. sin pedirlo, la fábrica sale como antes (sin `fabMas`, sin botones)', !r.mas && !r.bot && r.edu && !r.sereno && errores.length === 0, { r, errores });
      await page.close();
    }

    /* ---------- 2. con las mejoras ---------- */
    {
      const { page, errores } = await nueva(null, true);
      await page.evaluate(armar, {}); await hayVida(page);
      await espera(page, () => !!(window.fabMas && fabMas.S), 10);
      await page.evaluate(() => { fabMas.hora = 12; DEP.firma = ''; renderMis(); }); await page.waitForTimeout(600);
      const r = await page.evaluate(() => { var S = fabMas.S, W = DEP.w3, D = depVidaDatos();
        return { S: !!S, mom: S && S.mom, cadas: S && S.cada.length, puertas: S && S.puertas.length, esp: Math.max(2, Math.round(S.ancho / 7)), abierta: S && S.puertas[S.puertas.length - 1].abierta, otras: S && S.puertas.slice(0, -1).some(function (p) { return p.abierta; }),
          falta: D.falta, txt: W.box.innerText, bot: ['fab-paseo', 'fab-seguir', 'fab-sonido'].map(function (i) { return !!document.getElementById(i); }), dos: !!(VIDA.q.dosA && VIDA.q.dosB), tele: S && S.tele, prox: hdrProximoAbierto().d,
          lib: Math.max(0, limTurno(hdrProximoAbierto().d, 'AM') - cuposUsadosTurno(hdrProximoAbierto().d, 'AM')) }; });
      chk('2. con FAB_MAS_PRUEBA la escena se arma con las mejoras, sin errores', r.S && r.cadas >= 8 && errores.length === 0, { cadas: r.cadas, errores });
      chk('151. un portón por cada camión de ancho, y solo el último abierto de entrada', r.puertas === r.esp && r.abierta === true && r.otras === false, r);
      chk('147. la torre dice lo que falta cargar (lo mismo que la pizarra)', r.falta === 13 && /🟠 Faltan 13 por cargar/.test(r.txt), { falta: r.falta });
      chk('154/156. están «Recorrer», «Seguir a Eduardo» y «Sonido»', r.bot.every(Boolean), r.bot);
      chk('150. los dos operarios que llevan el colchón', r.dos);
      chk('155. la pantalla muestra el próximo camión con sus lugares…', r.tele && r.tele.d === r.prox && r.tele.am === r.lib, { tele: r.tele, prox: r.prox, lib: r.lib });
      chk('155. …y los clientes del mes de Eduardo, el que más compró primero, sin la ATC', r.tele && r.tele.top.length === 3 && r.tele.top[0][0] === 'DISTRIBUIDORA EL SOL' && r.tele.top[0][1] === 9300 && !r.tele.top.some(function (c) { return c[0] === 'UNA ATC'; }), r.tele && r.tele.top);

      /* 148 */
      const dia = await page.evaluate(() => { var L = {}; DEP.w3.esc.children.forEach(function (c) { if (c.isDirectionalLight) L.sol = c; if (c.isHemisphereLight) L.hemi = c; });
        return { si: L.sol.intensity, hi: L.hemi.intensity, pts: DEP.w3.esc.children.filter(function (c) { return c.isPointLight; }).length, mom: fabMas.S.mom }; });
      await page.evaluate(() => { fabMas.hora = 21; DEP.firma = ''; renderMis(); }); await page.waitForTimeout(700);
      const noche = await page.evaluate(() => { var L = {}; DEP.w3.esc.children.forEach(function (c) { if (c.isDirectionalLight) L.sol = c; if (c.isHemisphereLight) L.hemi = c; });
        return { si: L.sol.intensity, hi: L.hemi.intensity, pts: DEP.w3.esc.children.filter(function (c) { return c.isPointLight; }).length, mom: fabMas.S.mom, sereno: !!VIDA.q.sereno, chico: fabMas.S.chico }; });
      chk('148. de día no hay lámparas de verdad; de noche el sol baja, se prenden 7 luces y aparece el sereno', dia.mom === 'dia' && dia.pts === 0 && noche.mom === 'noche' && noche.si < dia.si / 3 && noche.pts === 7 && noche.sereno && !noche.chico, { dia, noche });
      /* el momento del día cambia solo: pasan 21 s de fábrica con la hora en «tarde» → se rearma */
      await page.evaluate(() => { fabMas.hora = 17.5; fabMas.paso(fabMas.S.t + 21, 21); });
      const cambio = await espera(page, () => fabMas.S && fabMas.S.mom === 'tarde', 8);
      const tarde = await page.evaluate(() => ({ pts: DEP.w3.esc.children.filter(function (c) { return c.isPointLight; }).length, sereno: !!(window.VIDA && VIDA.q.sereno) }));
      chk('148. al cambiar el momento del día la escena se rearma sola con su luz (y sin las lámparas de la noche)', cambio && tarde.pts === 0 && !tarde.sereno, tarde);
      await page.evaluate(() => { fabMas.hora = 12; DEP.firma = ''; renderMis(); }); await page.waitForTimeout(700);

      /* 152, 150, 153 */
      const v = await page.evaluate(() => { var t = fabMas.S.t + 1; fabMas.paso(t, .05); fabMas.paso(t + .05, .05); var a = VIDA.q.dosA.P.g.position, b = VIDA.q.dosB.P.g.position, cm = null;
        var E = VIDA.q.edu.P, I = VIDA.q.isa.P; var F = VIDA.fab, g0 = F.gato && F.gato.g.rotation.y; fabMas.demoGato(); fabMas.paso(t + .1, .05);
        return { boca: !!E.boca, cejas: !!E.cejas, bocaI: !!I.boca, yer: !!(VIDA.q.yer && VIDA.q.yer.P.boca && !VIDA.q.yer.P.cejas), d: Math.abs(Math.abs(a.x - b.x) - 1.9), gato: F.gato ? F.gato.g.rotation.y : null, sigue: !!VIDA.q.perro.sigue }; });
      chk('152. todos tienen boca (y cejas; Yerson, solo boca)', v.boca && v.cejas && v.bocaI && v.yer, v);
      chk('150. los dos operarios van a un colchón de distancia', v.d < .35, v.d);
      chk('153. el gato baja de la espuma y el perro lo sigue', v.gato === 2.4 && v.sigue, v);

      /* 154 */
      await page.click('#fab-seguir'); const s1 = await page.evaluate(() => fabMas.S.sigue === true);
      await page.click('#dep-esc .dep-todo'); const s2 = await page.evaluate(() => fabMas.S.sigue === false && fabMas.S.paseando === false);
      chk('154. «Seguir a Eduardo» se prende, y «↺ Ver todo» lo suelta', s1 && s2, { s1, s2 });

      /* 156 */
      await page.evaluate(() => { localStorage.setItem('me_asis_mudo', '1'); }); await page.click('#fab-sonido');
      const mudo = await page.evaluate(() => !fabMas.audio);
      await page.evaluate(() => { localStorage.removeItem('me_asis_mudo'); }); await page.click('#fab-sonido'); await page.waitForTimeout(900);
      const son = await page.evaluate(() => fabMas.audio ? fabMas.audio.c.state : 'sin');
      await page.evaluate(() => showView('form')); await page.waitForTimeout(1600);
      const esc = await page.evaluate(() => fabMas.audio ? fabMas.audio.c.state : 'sin');
      await page.evaluate(() => showView('mis')); await page.waitForTimeout(1600);
      const vuelve = await page.evaluate(() => fabMas.audio ? fabMas.audio.c.state : 'sin');
      chk('156. con el 🔇 de Bloki el sonido no arranca', mudo);
      chk('156. el sonido arranca al tocarlo, se calla al ir a otra pestaña y vuelve al volver', son === 'running' && esc === 'suspended' && vuelve === 'running', { son, esc, vuelve });
      await page.click('#fab-sonido'); chk('156. …y se apaga con el mismo botón', await page.evaluate(() => !fabMas.audio));

      /* 145: el tilde de verdad de «🚚 Ya salió» */
      await page.evaluate(() => { fabMas.paso(fabMas.S.t + 3, 3); });   // deja anotado «nadie afuera» recién
      await page.evaluate(() => { camionSalioMarcar('Foton nuevo', true); var t = fabMas.S.t + 6; fabMas.paso(t, 2.1); });
      const sale = await page.evaluate(() => { var c = fabMas.S.ctx.cams.filter(function (c) { return c.v === 'Foton nuevo'; })[0]; return { fuera: c.fuera, salio: camionSalio(todayStr(), 'Foton nuevo') }; });
      chk('145. al marcar «🚚 Ya salió» el camión arranca hacia el portón', sale.fuera === 1 && /^\d\d:\d\d$/.test(sale.salio), sale);
      const afuera = await espera(page, () => { var c = fabMas.S.ctx.cams.filter(function (c) { return c.v === 'Foton nuevo'; })[0]; return c.fuera === 2; }, 40);
      const and = await page.evaluate(() => { var c = fabMas.S.ctx.cams.filter(function (c) { return c.v === 'Foton nuevo'; })[0], o = fabMas.S.ctx.cams.filter(function (c) { return c.v === 'Carry'; })[0];
        return { vis: c.t.g.visible, x: Math.abs(c.t.g.position.x - c.casa.x) + Math.abs(c.t.g.position.z - c.casa.z), txt: DEP.w3.box.innerText, otro: o.t.g.visible && !o.fuera }; });
      chk('145. …sale, el andén queda vacío con «salió a las…» y el otro camión sigue en su lugar', afuera && and.vis === false && and.x < 1e-6 && /🛣️ Foton nuevo\s*salió a las \d\d:\d\d · en camino/.test(and.txt) && and.otro, { afuera, vis: and.vis, x: and.x, otro: and.otro });
      /* se rearma la escena con el camión ya afuera: sin función */
      await page.evaluate(() => { fabMas.antes.salT = 0; DEP.firma = ''; renderMis(); }); await page.waitForTimeout(700);
      const ya = await page.evaluate(() => { var c = fabMas.S.ctx.cams.filter(function (c) { return c.v === 'Foton nuevo'; })[0]; return { fuera: c.fuera, vis: c.t.g.visible, txt: /salió a las \d\d:\d\d/.test(DEP.w3.box.innerText) }; });
      chk('145. si ya estaba afuera al abrir la fábrica, el andén está vacío de entrada', ya.fuera === 2 && ya.vis === false && ya.txt, ya);
      await page.evaluate(() => { camionSalioMarcar('Foton nuevo', false); fabMas.paso(fabMas.S.t + 3, 2.1); });
      const vuelveC = await espera(page, () => { var c = fabMas.S.ctx.cams.filter(function (c) { return c.v === 'Foton nuevo'; })[0]; return c.fuera === 0 && c.t.g.visible && Math.abs(c.t.g.position.x - c.casa.x) < 1e-6; }, 40);
      const lab = await page.evaluate(() => /🚚 Foton nuevo/.test(DEP.w3.box.innerText) && !/salió a las/.test(DEP.w3.box.innerText));
      chk('145. al deshacer «salió» el camión vuelve a su andén con su cartel de siempre', vuelveC && lab, { vuelveC, lab });

      /* 144: un tilde de verdad de la Lista de carga */
      await page.evaluate(() => { var p = STATE.filter(function (x) { return x.id === 'p1'; })[0]; setCargaChk(cargaChkKey(p.fecha, 'Foton nuevo', cargaProdKey(p.productos[0]), '', 'AM'), true); renderMis(); });
      await page.waitForTimeout(700);
      const lleva = await page.evaluate(() => ({ n: fabMas.S.llevando || 0, mismo: fabMas.S.mismo, car: depVidaDatos().car }));
      chk('144. al tildar un producto en la Lista de carga, un montacargas lo lleva al camión', lleva.n === 1 && lleva.mismo && lleva.car === 6, lleva);
      const llego = await espera(page, () => !fabMas.S.llevando, 60);
      chk('144. …lo deja y se va', llego);
      /* cambiar de período no es cargar */
      await page.evaluate(() => { var p = STATE.filter(function (x) { return x.id === 'p2'; })[0]; CARGA_CHK[cargaChkKey(p.fecha, 'Carry', cargaProdKey(p.productos[0]), '', 'AM')] = 1; depPer('sem'); });
      await page.waitForTimeout(700);
      const otro = await page.evaluate(() => ({ n: fabMas.S.llevando || 0, mismo: fabMas.S.mismo }));
      chk('144. cambiar de período (otra vista) no hace función aunque haya más cargado', otro.n === 0 && otro.mismo === false, otro);

      /* 157: se tilda lo último */
      await page.evaluate(() => { depPer('todo'); }); await page.waitForTimeout(500);
      await page.evaluate(() => { var p = STATE.filter(function (x) { return x.id === 'p1'; })[0]; setCargaChk(cargaChkKey(p.fecha, 'Foton nuevo', cargaProdKey(p.productos[1]), '', 'AM'), true); renderMis(); });
      const fiesta = await espera(page, () => /¡TODO CARGADO!/.test(DEP.w3.box.innerText), 12);
      const fd = await page.evaluate(() => ({ falta: depVidaDatos().falta, modo: VIDA.q.edu.modo, torre: /🟢 Todo cargado/.test(DEP.w3.box.innerText) }));
      chk('157. al tildar lo último, Eduardo festeja y la torre queda en verde', fiesta && fd.falta === 0 && fd.torre, fd);

      /* dibujos por cuadro y la salida */
      const cal = await page.evaluate(() => DEP.w3.r.info.render.calls);
      chk('2. los dibujos por cuadro siguen acotados', cal > 0 && cal < 1250, cal);
      const fin = await page.evaluate(() => { fabMas.hora = 21; DEP.firma = ''; renderMis(); return new Promise(function (ok) { setTimeout(function () { var a = DEP.w3.esc.children.filter(function (c) { return c.isPointLight; }).length; fabMas.salir();
        var L = {}; DEP.w3.esc.children.forEach(function (c) { if (c.isDirectionalLight) L.sol = c; }); ok({ antes: a, pts: DEP.w3.esc.children.filter(function (c) { return c.isPointLight; }).length, si: L.sol.intensity, bot: !!document.getElementById('fab-mas-bot'), S: fabMas.S }); }, 700); }); });
      chk('148. al salir (`fabMas.salir`) vuelve la luz de siempre y se van las lámparas y los botones', fin.antes === 7 && fin.pts === 0 && Math.abs(fin.si - dia.si) < 1e-6 && !fin.bot && fin.S === null, fin);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      await page.close();
    }

    /* ---------- 146. el stock de verdad en «Producto terminado» (se ve con el piso libre) ---------- */
    {
      const { page, errores } = await nueva(null, true);
      await page.evaluate(armar, { stock: true, libre: true }); await hayVida(page); await espera(page, () => !!(window.fabMas && fabMas.S && VIDA.fab && VIDA.fab.stockPos), 10);
      const st = await page.evaluate(() => { var SR = fabMas.stockDatos(), F = VIDA.fab; return { n: SR && SR.length, SR: SR, pos: F.stockPos.length, pilas: F.stock, txt: DEP.w3.box.innerText }; });
      const nom = (i) => st.SR && st.SR[i] ? st.SR[i].n + ':' + st.SR[i].u + ':' + st.SR[i].h : '';
      chk('146. las pilas salen del stock de PTF (lo contado menos lo que ya salió): Heaven a la izquierda, lo que más rota primero, 2 unidades por colchón dibujado hasta 9', st.SR && st.n === st.pos && /^titanio 160:13:7$/.test(nom(0)) && /^especial 140:30:9$/.test(nom(1)), [nom(0), nom(1), st.n, st.pos]);
      const mit = st.n / 2;
      chk('146. …Sueña a la derecha, el somier en su columna, y la almohada no es una pila', st.SR && /^ortopedico 140:5:3$/.test(nom(mit)) && /^somier 140:3:2$/.test(nom(4)) && !st.SR.some(function (o) { return /almohada/i.test(o.n); }), st.SR && st.SR.map(function (o) { return o.n + ':' + o.u; }));
      chk('146. un lugar sin producto queda con el pallet vacío (alto 0) y sin cartel', st.SR && st.SR.filter(function (o) { return !o.u; }).every(function (o) { return o.h === 0; }) && /30 · especial 140/.test(st.txt) && /3 · somier 140/.test(st.txt), null);
      const sin = await page.evaluate(() => { STOCK = stockVacio(); try { stockOlvidarIndice(); SALDO_GEN++; } catch (e) {} fabMas._sdT = 0; var a = fabMas.stockDatos(); fabMas._sdT = 0; return a; });
      chk('146. sin Excel cargado no se inventa nada (quedan de adorno)', sin === null, sin);

      chk('…ningún error de JavaScript', errores.length === 0, errores);
      await page.close();
    }

    /* ---------- 3. reducir movimiento ---------- */
    {
      const { page, errores } = await nueva({ reducedMotion: 'reduce' }, true);
      await page.evaluate(armar, {}); await hayVida(page); await espera(page, () => !!(window.fabMas && fabMas.S), 10);
      await page.evaluate(() => { fabMas.hora = 12; CARGA_CHK = {}; setCargaChk(cargaChkKey(todayStr(), 'Carry', CARGA_SALIO) + '|09:15', true); DEP.firma = ''; renderMis(); }); await page.waitForTimeout(700);
      const r = await page.evaluate(() => { var S = fabMas.S, c = S.ctx.cams.filter(function (c) { return c.v === 'Carry'; })[0], cm = null, a = VIDA.q.dosA.P.g.position, b = VIDA.q.dosB.P.g.position;
        S.g.children.forEach(function (o) { if (o.isGroup && Math.abs(o.position.z - 8.32) < .001 && Math.abs(o.position.x - (a.x + b.x) / 2) < .001) cm = o; });
        return { paseo: !!document.getElementById('fab-paseo'), seguir: !!document.getElementById('fab-seguir'), son: !!document.getElementById('fab-sonido'), fuera: c.fuera, vis: c.t.g.visible, cm: !!cm, txt: /Carry\s*salió a las 09:15/.test(DEP.w3.box.innerText) }; });
      chk('3. con «reducir movimiento» no hay recorrido ni seguir; el sonido queda', !r.paseo && !r.seguir && r.son, r);
      chk('3. …el colchón está entre los dos operarios (no tirado en el medio)', r.cm, r);
      chk('3. …y el camión que salió está afuera, con su cartel', r.fuera === 2 && r.vis === false && r.txt, r);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      await page.close();
    }

    /* ---------- 4. el celular ---------- */
    {
      const { page, errores } = await nueva({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, true);
      await page.evaluate(armar, {}); await hayVida(page); await espera(page, () => !!(window.fabMas && fabMas.S), 10);
      await page.evaluate(() => { fabMas.hora = 21; DEP.firma = ''; renderMis(); }); await page.waitForTimeout(900);
      const r = await page.evaluate(() => { var b = document.getElementById('fab-mas-bot').getBoundingClientRect(), bx = DEP.w3.box.getBoundingClientRect();
        return { chico: fabMas.S.chico, pts: DEP.w3.esc.children.filter(function (c) { return c.isPointLight; }).length, sereno: !!VIDA.q.sereno, dentro: b.left >= bx.left - 1 && b.right <= bx.right + 1 && b.height < 90 }; });
      chk('4. en el celular, de noche hay 2 luces de verdad (no 7) y el sereno igual hace su ronda', r.chico === true && r.pts === 2 && r.sereno, r);
      chk('4. …y los botones entran en la escena', r.dentro, r);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      await page.close();
    }
  }
  await browser.close();
  console.log(PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
