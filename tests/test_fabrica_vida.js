/* 🧔☕ LA FÁBRICA DE EDUARDO CON VIDA (31/10).

   El dueño, con la captura de su fábrica vacía: «Mi fábrica se ve pobreeeee, falta un Eduardo por ahí y una Isabel diciéndole
   "¿le llevo un café?" y no sé, muchas más cosas».

   Lo que se mira:
     1. Sin three.js (la red cortada): la fábrica sigue como siempre, sin errores, y los números de la pizarra salen de los pedidos
        de Eduardo (hoy, mañana, por cargar, atrasados, entregados) y de lo que falta cargar.
     2. Lo que dice Eduardo usa esos números (falta cargar, hoy, mañana, entregados).
   Con three.js (copia local: PATIO_THREE=<carpeta del paquete three 0.128>, la misma que usa test_patio):
     3. Arma a Eduardo, Isabel, el perro, un chofer por camión (el de sus pedidos o, si no, el primero de VEHICULOS; lista del 06/11), la pizarra, el reloj y los banderines del tema.
     4. Una burbuja dice quién habla y se va sola.
     5. El café: Isabel pregunta, va a la cafetera, se lo lleva y Eduardo queda con la taza.
     6. Con el piso vacío hay un montacargas estacionado; con montacargas cargando, no.
     7. Los camiones de Administración (cv3d) NO llevan nada de esto.
     8. Con «reducir movimiento» nadie habla.
   🏭 La fábrica llena (31/10, dueño: «Se sigue viendo pobre y vacía»):
     9. La línea de colchones: la cinta avanza, el colchón sale envuelto después del embolsado, tres operarios; con el piso libre, la
        acolchadora, el inspector y la limpieza. Cuando el pallet del final se llena, Ernesto lo lleva a «Producto terminado» y vuelve.
        Eduardo va a ver la costura y la operaria le contesta. Con montacargas cargando, el centro queda libre (sin acolchadora).
    10. Tercera vuelta («Se sigue viendo pobre y vacía» + «a uno de costura ponle de nombre Yerson y un cachete inflado»; después:
        «no es por enfermedad, es porque acullica hoja de coca… diálogos de "qué buena coca, es despalada"» y «ojos no le vi»):
        Yerson con el bolo de coca en el cachete, ojos grandes que se ven y su coca en la mesa; habla de coquear/bolear; el producto terminado en el centro con un segundo montacargas dando vueltas;
        el edificio (ventanales, paredes, estanterías llenas) junto en pocas piezas: menos dibujos por cuadro que antes de todo esto.
    11. (10/11, dueño: «mejora mis animaciones 3D») Los movimientos con peso: girar de a poco, arrancar y frenar, el paso por lo
        avanzado, las posturas que se mezclan, el perro que se sienta, el colchón que cae. Con «reducir movimiento», todo de una.
   Datos inventados (el repo es público). Se corre:  node tests/test_fabrica_vida.js   (las partes 3-8 solo con PATIO_THREE) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 300)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TH = process.env.PATIO_THREE || '';

const armar = (PEND) => {
  try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  CONNECTED = false; window.autoAbrirAvisos = function () {};
  var hoy = todayStr(), man = proximoDiaEntrega(), P = function (o) { return Object.assign({ vendedor: 'Eduardo Añez', turno: 'AM', zona: 'NORTE', direccion: 'Av. Ejemplo', maps: '', pagado: false, saldo: 0,
    ts: Date.now() - 86400000 * 3, metodoPago: '', entregado: false, acuenta: 0 }, o); };
  var L = [];
  for (var i = 0; i < 5; i++) L.push(P({ id: 'e' + i, oc: '10-1' + (10 + i), nota: '40' + i, cliente: 'CLIENTE ' + i, fecha: '2026-10-2' + i, entregado: true, productos: [{ desc: 'ESPECIAL SEMIORTOPEDICO', medida: '140x190', cant: 2 }] }));
  L.push(P({ id: 'h1', oc: '10-301', nota: '501', cliente: 'TIENDA DE HOY', fecha: hoy, entregado: true, productos: [{ desc: 'TITANIO', medida: '160x200', cant: 1 }] }));
  if (PEND) {
    L.push(P({ id: 'p1', oc: '11-001', nota: '601', cliente: 'DISTRIBUIDORA EL SOL', fecha: man, vehiculo: 'Foton nuevo', productos: [{ desc: 'ESPECIAL SEMIORTOPEDICO', medida: '140x190', cant: 6, chk: 'ok' }, { desc: 'TITANIO', medida: '160x200', cant: 3, chk: 'im' }] }));
    L.push(P({ id: 'p2', oc: '11-002', nota: '602', cliente: 'COMERCIAL NORTE', fecha: man, productos: [{ desc: 'SOMIER ORO', medida: '140x190', cant: 4, chk: 'no' }] }));
  }
  L.push(P({ id: 'x', oc: '10-900', nota: '9', cliente: 'DE OTRA VENDEDORA', vendedor: 'Maria Flores', fecha: hoy, productos: [{ desc: 'DREAM', medida: '140x190', cant: 7 }] }));
  STATE = L; showView('mis'); MIS_TODOS = false; MIS_FILTER = 'todos'; DEP.per = 'sem'; DEP.perTocado = false; DEP.firma = '';
  document.getElementById('mis-vendedor').value = 'Eduardo Añez'; renderMis();
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const nueva = async (opt) => {
    const page = await browser.newPage(Object.assign({ viewport: { width: 1366, height: 1000 }, timezoneId: 'America/La_Paz' }, opt || {}));
    const errores = []; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    if (TH) {
      await page.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(TH, 'build/three.min.js')), contentType: 'text/javascript' }));
      await page.route('**/OrbitControls.js', r => r.fulfill({ body: fs.readFileSync(path.join(TH, 'examples/js/controls/OrbitControls.js')), contentType: 'text/javascript' }));
    }
    await page.route(/^https?:/, r => { const u = r.request().url(); if (TH && /three\.min\.js|OrbitControls/.test(u)) return r.fallback(); return r.abort(); });
    await page.goto('file://' + PEDIDOS + '?tema=todos-santos', { waitUntil: 'load' }); await page.waitForTimeout(400);
    return { page, errores };
  };

  /* ---- 1 y 2: sin 3D ---- */
  {
    const { page, errores } = await nueva();
    await page.route('**/three.min.js', r => r.abort());
    await page.evaluate(armar, true);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => { var D = depVidaDatos(); return { D: D, frases: depVidaFrases(), mine: (DEP.mine || []).length, vida: typeof VIDA === 'undefined' ? 'x' : VIDA, man: proximoDiaEntrega() }; });
    chk('1. la pizarra cuenta SOLO los pedidos de Eduardo (no los de otra vendedora)', r.mine === 8, r.mine);
    chk('…hoy pendientes 0 (el de hoy ya se entregó), mañana 2, entregados 6, por cargar 13', r.D.hoy === 0 && r.D.man === 2 && r.D.ent === 6 && r.D.falta === 13, r.D);
    chk('…el cliente con más por cargar', r.D.cli === 'DISTRIBUIDORA EL SOL' && r.D.nf === 6, r.D.cli + ' ' + r.D.nf);
    chk('2. Eduardo dice lo que falta cargar con el número', r.frases.some(f => /Faltan 13 por cargar/.test(f)), r.frases);
    chk('…y lo de mañana y lo entregado', r.frases.some(f => /Mañana van 2 pedidos/.test(f)) && r.frases.some(f => /6 entregados/.test(f)), r.frases);
    chk('…sin 3D no se arma nada de la vida', r.vida === null, r.vida);
    chk('…ningún error de JavaScript', errores.length === 0, errores);
    await page.close();
  }

  if (!TH) {
    console.log('(sin PATIO_THREE: las partes 3-8 necesitan three.js local)');
  } else {
    /* ---- 3 a 6: con 3D, el piso vacío ---- */
    {
      const { page, errores } = await nueva();
      await page.evaluate(armar, false);
      let ok = false; for (let i = 0; i < 80 && !ok; i++) { ok = await page.evaluate(() => !!(window.VIDA && VIDA.q && VIDA.q.edu)); if (!ok) await page.waitForTimeout(250); }
      chk('3. con three.js arma la vida', ok);
      let r = await page.evaluate(() => ({ q: Object.keys(VIDA.q), chof: VIDA.chof.map(k => VIDA.q[k].n), flags: VIDA.flags.length, piz: !!VIDA.piz, reloj: !!VIDA.reloj, mcE: !!VIDA.mcE,
        colores: VIDA.flags.slice(0, 6).map(m => '#' + m.material.color.clone().convertLinearToSRGB().getHexString()), velas: VIDA.velas.length, toca: DEP.w3.toca.length }));
      chk('…Eduardo, Isabel, el perro y un chofer por camión (el primero de cada uno)', r.q.indexOf('edu') >= 0 && r.q.indexOf('isa') >= 0 && r.q.indexOf('perro') >= 0 && r.chof.join(',') === 'Omar:,Fernando:,Cristhian:,Miguel:', r);
      chk('…la pizarra, el reloj y los banderines', r.piz && r.reloj && r.flags > 40, r.flags);
      chk('…los banderines con los colores de Todos Santos, y las velitas', r.colores.join(',') === '#ec4899,#f97316,#facc15,#14b8a6,#8b5cf6,#ef4444' && r.velas >= 4, r.colores.join(',') + ' velas ' + r.velas);
      chk('6. con el piso vacío, un montacargas estacionado', r.mcE === true);
      r = await page.evaluate(() => { VIDA.q.edu.espera = 999; depDecir('edu', 'Hola, equipo', .6); var e = document.querySelector('.dep-etq-habla'); return e ? e.innerText : ''; });
      chk('4. la burbuja dice quién habla', /^Eduardo:\s*Hola, equipo/.test(r), r);
      let sigue = true; for (let i = 0; i < 30 && sigue; i++) { await page.waitForTimeout(200); sigue = await page.evaluate(() => [].some.call(document.querySelectorAll('.dep-etq-habla'), e => /Hola, equipo/.test(e.innerText))); }
      chk('…y se va sola', !sigue);
      await page.evaluate(() => { var E = VIDA.q.edu; E.path = null; E.P.g.position.set(VIDA.home.x, 0, VIDA.home.z); E.st = 'casa'; E.espera = 999; VIDA.q.isa.vel = 12; depVidaCafe(); });
      let dijo = '', t0 = Date.now(), visto = {};
      while (Date.now() - t0 < 45000 && !visto.listo) {
        dijo = await page.evaluate(() => [].map.call(document.querySelectorAll('.dep-etq-habla'), e => e.innerText).join(' | '));
        if (/cafecito/.test(dijo)) visto.pide = 1; if (/Aquí tiene/.test(dijo)) visto.da = 1;
        if (await page.evaluate(() => !!VIDA.q.edu.P.taza && VIDA.q.isa.st === 'escritorio')) visto.listo = 1;
        await page.waitForTimeout(200);
      }
      chk('5. el café: Isabel pregunta «¿Le llevo un cafecito?»', !!visto.pide);
      chk('…se lo lleva («Aquí tiene»)', !!visto.da);
      chk('…Eduardo queda con la taza e Isabel vuelve a su escritorio', !!visto.listo);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      /* 9: la línea de colchones */
      r = await page.evaluate(() => { var F = VIDA.fab; return { hay: !!F, col: F.col.length, ops: ['op1','op2','op3'].map(k => VIDA.q[k] && VIDA.q[k].n).join(','), centro: ['op4','cal','lim'].filter(k => VIDA.q[k]).length,
        x0: F.col.map(c => c.position.x), of0: F.cinta.offset.x, env: F.col.every(c => c.userData.w.visible === (c.position.x > F.xemb)), ern: VIDA.q.ern && VIDA.q.ern.n, acol: !!F.acol }; });
      chk('9. la línea de colchones con sus tres operarios', r.hay && r.col >= 3 && r.ops === 'Corte:,Costura:,Embalaje:', r);
      chk('…solo los que pasaron el embolsado salen envueltos', r.env, r);
      chk('…con el piso libre: la acolchadora, la operaria, el inspector y la limpieza; y Ernesto con su montacargas', r.centro === 3 && r.acol && r.ern === 'Ernesto:', r);
      await page.waitForTimeout(1500);
      const r2 = await page.evaluate(() => ({ x: VIDA.fab.col.map(c => c.position.x), of: VIDA.fab.cinta.offset.x }));
      chk('…la cinta avanza (los colchones se mueven)', r2.x.some((x, i) => Math.abs(x - r.x0[i]) > .05) && r2.of !== r.of0, { antes: r.x0, despues: r2.x });
      for (let i = 0; i < 200 && !(await page.evaluate(() => VIDA.q.ern.st === 'casa' && !VIDA.q.ern.pal)); i++) await page.waitForTimeout(150);   // si ya estaba en un viaje, que termine
      await page.evaluate(() => { var F = VIDA.fab; VIDA.q.ern.vel = 9; while (F.fin.userData.n < 4) depFabApilar(F, F.fin); window.__slots0 = F.slots.map(s => s.length).join(','); window.__fin0 = F.fin; });
      let lev = false, vuelve = false; t0 = Date.now();
      while (Date.now() - t0 < 60000 && !vuelve) { const e = await page.evaluate(() => ({ pal: !!VIDA.q.ern.pal, st: VIDA.q.ern.st })); if (e.pal) lev = true; if (lev && e.st === 'casa') vuelve = true; await page.waitForTimeout(150); }
      r = await page.evaluate(() => { var F = VIDA.fab, Q = VIDA.q.ern; return { slots0: window.__slots0, slots: F.slots.map(s => s.length).join(','), nuevo: F.fin !== window.__fin0, geo: F.fin.children[0].geometry === F.geo.pal, rot: Q.P.g.rotation.y,
        st: Q.st, n: F.fin.userData.n, pos: Q.P.g.position.x.toFixed(2) + ',' + Q.P.g.position.z.toFixed(2), tw: DEP.tw.length, carro: Q.mc.carro.position.y }; });
      chk('…el pallet lleno: Ernesto lo levanta, lo deja en «Producto terminado» y vuelve', lev && vuelve && r.slots !== r.slots0 && r.nuevo, r);
      chk('…los pallets usan geometrías compartidas (no se acumulan en la memoria) y Ernesto vuelve mirando a la línea', r.geo && Math.abs(Math.sin(r.rot) + 1) < .02, r);
      await page.evaluate(() => { var E = VIDA.q.edu; VIDA.q.edu.vel = 8; E.path = null; E.P.g.position.set(VIDA.home.x, 0, VIDA.home.z); E.st = 'casa'; E.espera = 999; VIDA.fab.charla = 999; ['op2','edu'].forEach(depCallar); depFabVisita(false); });
      visto = {}; t0 = Date.now();
      while (Date.now() - t0 < 30000 && !visto.op) { dijo = await page.evaluate(() => [].map.call(document.querySelectorAll('.dep-etq-habla'), e => e.innerText).join(' | ')); if (/Costura:/.test(dijo)) visto.op = 1; await page.waitForTimeout(200); }
      r = await page.evaluate(() => ({ z: VIDA.q.edu.P.g.position.z, st: VIDA.q.edu.st }));
      chk('…Eduardo va a ver la costura y la operaria le contesta', visto.op && r.st === 'linea' && r.z > 9, { visto: visto, r: r });
      let elige = false; t0 = Date.now();
      while (Date.now() - t0 < 40000 && !elige) { elige = await page.evaluate(() => { var E = VIDA.q.edu; if (E.st === 'casa' && E.path === null) { E.espera = 0; return true; } return false; }); await page.waitForTimeout(200); }
      let otra = false; t0 = Date.now(); while (elige && Date.now() - t0 < 8000 && !otra) { otra = await page.evaluate(() => VIDA.q.edu.espera > 1); await page.waitForTimeout(150); }
      chk('…y al volver puede elegir otra cosa (antes, al terminar el primer camino Eduardo y Ernesto se quedaban quietos para siempre)', elige && otra, { elige: elige, otra: otra });
      /* 10: Yerson, el producto terminado, el segundo montacargas y el edificio */
      r = await page.evaluate(() => { var Y = VIDA.q.yer, n = 0, fund = 0; DEP.w3.grupo.traverse(function (o) { if (o.isMesh) { n++; if (o.userData.fundido) fund++; } });
        var blancos = Y ? Y.P.cabeza.children.filter(function (c) { return c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius >= .06 && c.material.color.getHexString() === 'ffffff'; }).length : 0;
        return { yer: Y && Y.n, cachete: !!(Y && Y.P.cachete && Y.P.cachete.parent === Y.P.cabeza), ojos: blancos, panuelo: !!(Y && Y.P.cabeza.children.some(function (c) { return c.geometry && c.geometry.type === 'TorusGeometry'; })),
          dice: FAB_DICE.yer.join(' | '), modo: Y && Y.modo,
          stock: VIDA.fab.stock, mc2: !!VIDA.q.mc2, x0: VIDA.q.mc2 && VIDA.q.mc2.P.g.position.x + ',' + VIDA.q.mc2.P.g.position.z, mallas: n, fund: fund, calls: DEP.w3.r.info.render.calls }; });
      const eduCara = await page.evaluate(() => ({ panza: VIDA.q.edu.P.g.children.some(function (c) { return c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius >= .29; }),
        bigote: VIDA.q.edu.P.cabeza.children.some(function (c) { return c.material && c.material.color && c.material.color.getHexString() === new THREE.Color('#3b2a1e').convertSRGBToLinear().getHexString(); }) }));
      chk('10. Eduardo sin panza ni bigote (dueño: «Eduardo no tiene panza ni bigote»)', !eduCara.panza && !eduCara.bigote, eduCara);
      chk('10. Yerson en costura, con el bolo de coca en el cachete, los ojos grandes y sin pañuelo (no es enfermedad)', r.yer === 'Yerson:' && r.cachete && r.ojos === 2 && !r.panuelo, r);
      chk('…cose con la cabeza levantada y habla de la coca (despalada, bolo, bico)', r.modo === 'bolea' && /despalada/.test(r.dice) && /bolo/i.test(r.dice) && /biquito|bico/.test(r.dice) && !/paperas/i.test(r.dice), { modo: r.modo, dice: r.dice });
      chk('…el producto terminado en el centro (12 pilas) y un segundo montacargas', r.stock === 12 && r.mc2, r);
      chk('…lo fijo va junto: menos de 900 dibujos por cuadro (antes de todo esto eran ~930)', r.fund > 30 && r.calls < 900, r);
      await page.waitForTimeout(1200);
      const x1 = await page.evaluate(() => VIDA.q.mc2.P.g.position.x + ',' + VIDA.q.mc2.P.g.position.z);
      chk('…el segundo montacargas da la vuelta', x1 !== r.x0, { antes: r.x0, despues: x1 });
      await page.evaluate(() => { var E = VIDA.q.edu; E.path = null; E.P.g.position.set(VIDA.home.x, 0, VIDA.home.z); E.st = 'casa'; E.espera = 999; ['yer','edu'].forEach(depCallar); depFabVisita(true); });
      visto = {}; t0 = Date.now();
      while (Date.now() - t0 < 30000 && !visto.y) { dijo = await page.evaluate(() => [].map.call(document.querySelectorAll('.dep-etq-habla'), e => e.innerText).join(' | ')); if (/Yerson:/.test(dijo)) visto.y = 1; if (/Eduardo:.*(Yerson|boleando|bolo|coca)/.test(dijo)) visto.e = 1; if (/paperas|barbijo|farmacia/i.test(dijo)) visto.malo = 1; await page.waitForTimeout(200); }
      chk('…Eduardo le habla a Yerson de la coca y Yerson le contesta (nada de paperas)', visto.y && visto.e && !visto.malo, visto);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      /* 11 (10/11, dueño: «mejora mis animaciones 3D»): los movimientos con peso. Se mueve el reloj a mano (60 cuadros por segundo),
         con el bucle de la página sin tocar a la gente, para medir lo mismo en cualquier máquina. */
      r = await page.evaluate(() => { var W = DEP.w3, cada = W.cada; W.cada = null; window.__cada = cada;
        var E = VIDA.q.edu, D = VIDA.q.perro, T = VIDA.t, paso = function (n) { for (var i = 0; i < n; i++) { T += 1 / 60; depVidaPaso(T); } }, h = VIDA.home, o = {};
        VIDA.gen++;   /* lo que quedó agendado de antes (el café, una charla) ya no corre: no le cambia la postura en medio de la medición */
        ['edu','isa'].forEach(depCallar); if (E.P.taza) { E.P.md.remove(E.P.taza); E.P.taza = null; } VIDA.sorbos = 0; E.path = null; E.fin = null; E.st = 'demo'; E.espera = 999; VIDA.cafeProx = 9999; VIDA.fab.charla = 999; E.modo = 'quieto'; E.vel = 1.5; E.v = 0;
        E.P.g.position.set(h.x, 0, h.z); E.P.g.rotation.y = 0; E.yawT = null; paso(30);
        /* a) girar parado va de a poco */
        depVidaGira(E, 1.5); o.g0 = E.P.g.rotation.y; paso(3); o.g1 = E.P.g.rotation.y; paso(150); o.g2 = E.P.g.rotation.y; o.gy = E.yawT;
        /* b) arranca de a poco, llega a su velocidad, frena antes de llegar y queda JUSTO en el punto */
        var x0 = E.P.g.position.x, f0 = E.P.fase || 0, lleg = 0, vFin = null, n = 0; depVidaIr(E, [{ x: x0 + 3, z: h.z }], function () { lleg = 1; }, 0);
        paso(2); o.v1 = E.v; o.lean1 = E.P.g.rotation.x; paso(60); o.v2 = E.v; o.lean2 = E.P.g.rotation.x;
        /* b2) las rodillas: en un paso entero, cada una se dobla cuando su pierna viene hacia adelante y va casi derecha cuando apoya */
        var kMax = 0, kMin = 9, eMax = 0, tw = 0; for (var q = 0; q < 50; q++) { paso(1); n++; kMax = Math.max(kMax, E.P.ri.rotation.x); kMin = Math.min(kMin, E.P.ri.rotation.x); eMax = Math.max(eMax, -E.P.mi.rotation.x); tw = Math.max(tw, Math.abs(E.P.tr.rotation.y)); }
        o.kMax = kMax; o.kMin = kMin; o.eMax = eMax; o.tw = tw;
        while (!lleg && n < 900) { paso(1); n++; if (vFin == null && x0 + 3 - E.P.g.position.x < .12) vFin = E.v; }
        o.lleg = lleg; o.vFin = vFin; o.x = E.P.g.position.x - x0; o.fase = (E.P.fase || 0) - f0; o.yLleg = E.yawT; paso(150); o.rotFin = E.P.g.rotation.y; o.leanFin = E.P.g.rotation.x;
        /* c) cambiar de postura no salta: el brazo va de a poco */
        var b0 = E.P.bi.rotation.x; E.modo = 'senala'; paso(1); o.b1 = Math.abs(E.P.bi.rotation.x - b0); paso(90); o.b2 = Math.abs(E.P.bi.rotation.x - b0);
        /* c2) tomar café: el codo se dobla y la taza queda derecha (apenas inclinada hacia la boca), no boca abajo */
        E.P.taza = depTaza(); E.P.md.add(E.P.taza); E.modo = 'toma'; paso(120); o.codoToma = -E.P.md.rotation.x; o.tazaMundo = E.P.bd.rotation.x + E.P.md.rotation.x + E.P.taza.rotation.x; E.P.md.remove(E.P.taza); E.P.taza = null; E.modo = 'quieto'; paso(60);
        /* d) el perro: con Eduardo quieto un rato se sienta; cuando Eduardo se va, se para y lo sigue */
        paso(60 * 5); o.sienta = D.sienta; o.perroX = D.P.g.rotation.x; depVidaIr(E, [{ x: x0, z: h.z }], null, -.25); paso(70); o.para = D.sienta; paso(400);
        /* e) las formas de moverse nuevas */
        o.rebote = [depRebote(0), depRebote(.75) > 1, depRebote(1)]; o.cae = [depCae(0), depCae(.5), depCae(1)];
        /* f) el colchón cae sobre el pallet */
        var F = VIDA.fab; if (F.fin.userData.n >= 6) F.fin.userData.n = 5; var nn = F.fin.userData.n; depFabApilar(F, F.fin); var m = F.fin.children[F.fin.children.length - 1]; window.__col = m; window.__colY = .12 + nn * .33; o.colY0 = m.position.y - window.__colY;
        o.entro = W.entro === true; o.ojos = (E.P.ojos || []).length; return o; });
      chk('11. girar parado va de a poco (no de golpe) y termina justo en el ángulo', r.g0 === 0 && r.g1 > 0 && r.g1 < .8 && Math.abs(r.g2 - 1.5) < .001 && r.gy === null, r);
      chk('…al caminar arranca de a poco, llega a su velocidad, frena antes de llegar y queda justo en el punto', r.v1 > 0 && r.v1 < .4 && Math.abs(r.v2 - 1.5) < .01 && r.vFin < 1.4 && r.lleg === 1 && Math.abs(r.x - 3) < 1e-9, r);
      chk('…el paso de las piernas sale de lo que avanzó (no patina) y camina apenas inclinado; parado queda derecho', Math.abs(r.fase - 3 * 4.1) < .01 && r.lean2 > .03 && Math.abs(r.leanFin) < .005, r);
      chk('…al llegar gira de a poco hacia donde tiene que mirar', r.yLleg === 0 && Math.abs(Math.sin(r.rotFin)) < .01, r);
      chk('…cambiar de postura no salta: el brazo va de a poco', r.b2 > 1.5 && r.b1 > 0 && r.b1 < r.b2 * .35, r);
      chk('…camina doblando las rodillas (la que avanza se dobla, la que apoya va casi derecha), con los codos flexionados y el tronco girando apenas', r.kMax > .8 && r.kMin < .2 && r.eMax > .5 && r.tw > .05 && r.tw < .2, { kMax: r.kMax, kMin: r.kMin, eMax: r.eMax, tw: r.tw });
      chk('…al tomar café dobla el codo y la taza va derecha, apenas inclinada hacia la boca', r.codoToma > 1.5 && Math.abs(r.tazaMundo + .55) < .02, { codo: r.codoToma, taza: r.tazaMundo });
      chk('…el perro se sienta cuando Eduardo se queda quieto y se para cuando se va', r.sienta > .95 && r.perroX < -.3 && r.para < .2, r);
      chk('…«rebote» se pasa un pelo y vuelve, «cae» acelera; las dos empiezan en 0 y terminan en 1', Math.abs(r.rebote[0]) < 1e-9 && r.rebote[1] === true && r.rebote[2] === 1 && r.cae.join(',') === '0,0.25,1', r);
      chk('…Eduardo tiene ojos que parpadean y la cámara ya hizo su entrada', r.ojos === 2 && r.entro, r);
      for (let i = 0; i < 100 && !(await page.evaluate(() => Math.abs(window.__col.position.y - window.__colY) < 1e-6 && Math.abs(window.__col.scale.y - 1) < 1e-6)); i++) await page.waitForTimeout(200);   // el bucle de la página lo baja (con la máquina cargada tarda)
      const col = await page.evaluate(() => { var m = window.__col, o = { y: Math.abs(m.position.y - window.__colY), sy: m.scale.y }; DEP.w3.cada = window.__cada; var E = VIDA.q.edu; E.st = 'casa'; E.espera = 4; return o; });
      chk('…el colchón que sale de la línea cae sobre el pallet (arranca más arriba y termina en su lugar, sin quedar aplastado)', r.colY0 > .4 && col.y < 1e-6 && Math.abs(col.sy - 1) < 1e-6, { desde: r.colY0, col: col });
      /* 7: los camiones de Administración (cv3d) usan el MISMO lienzo: al mudarlo o al armar su escena, la vida se va */
      r = await page.evaluate(() => { var src = String(cv3dConstruir) + String(depMudar); var tieneGuarda = /VIDA=null/.test(String(cv3dConstruir)) && /VIDA=null/.test(String(depMudar));
        var caja = document.createElement('div'); caja.style.cssText = 'width:300px;height:200px'; document.body.appendChild(caja); depMudar(caja); DEP.w3.modo = 'adm';
        try { depDecir('edu', 'no tendría que salir', 5); } catch (e) {}
        return { guarda: tieneGuarda, vida: VIDA === null ? null : 'armada', burb: document.querySelectorAll('.dep-etq-habla').length }; });
      chk('7. los camiones de Administración no llevan la vida (mudar el lienzo o armar su escena la saca)', r.guarda && r.vida === null, r);
      chk('…y desde ahí nadie habla', r.burb === 0, r.burb);
      await page.close();
    }
    /* ---- 6 bis: con montacargas cargando, sin el estacionado ---- */
    {
      const { page, errores } = await nueva();
      await page.evaluate(armar, true);
      let ok = false; for (let i = 0; i < 80 && !ok; i++) { ok = await page.evaluate(() => !!(window.VIDA && VIDA.q && VIDA.q.edu)); if (!ok) await page.waitForTimeout(250); }
      const r = await page.evaluate(() => ({ mcE: !!VIDA.mcE, zonas: VIDA.zonas.map(z => z.c + ':' + z.falta), linea: !!VIDA.fab, centro: ['op4','cal','lim','mc2'].filter(k => VIDA.q[k]).length + (VIDA.fab.stock ? 1 : 0), yer: !!VIDA.q.yer }));
      chk('6. con montacargas cargando no hay estacionado, y Eduardo conoce cada cliente con lo que falta', r.mcE === false && r.zonas.join(',') === 'DISTRIBUIDORA EL SOL:9,COMERCIAL NORTE:4', r);
      chk('9. …la línea de colchones sigue (con Yerson), y el centro queda libre para los montacargas (sin acolchadora, limpieza, producto terminado ni segundo montacargas)', r.linea && r.yer && r.centro === 0, r);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      await page.close();
    }
    /* ---- 8: reducir movimiento ---- */
    {
      const { page, errores } = await nueva({ reducedMotion: 'reduce' });
      await page.evaluate(armar, false);
      let ok = false; for (let i = 0; i < 80 && !ok; i++) { ok = await page.evaluate(() => !!(window.VIDA && VIDA.q && VIDA.q.edu)); if (!ok) await page.waitForTimeout(250); }
      const x0 = await page.evaluate(() => VIDA.fab.col.map(c => c.position.x.toFixed(3)).join(','));
      await page.waitForTimeout(4000);
      const quieta = await page.evaluate((x0) => VIDA.fab.col.map(c => c.position.x.toFixed(3)).join(',') === x0 && VIDA.q.ern.st === 'casa', x0);
      chk('8. …y la línea de colchones queda quieta', quieta);
      const r = await page.evaluate(() => { depDecir('edu', 'hola', 5); return { burb: document.querySelectorAll('.dep-etq-habla').length, pos: VIDA.q.edu.P.g.position.x.toFixed(2) + ',' + VIDA.q.edu.P.g.position.z.toFixed(2), home: VIDA.home.x + ',' + VIDA.home.z }; });
      const rq = await page.evaluate(() => { var E = VIDA.q.edu; depVidaGira(E, 1.2); var F = VIDA.fab, n = F.fin.userData.n; if (n >= 6) n = F.fin.userData.n = 5; depFabApilar(F, F.fin); var m = F.fin.children[F.fin.children.length - 1];
        return { rot: E.P.g.rotation.y, yawT: E.yawT, colY: Math.abs(m.position.y - (.12 + n * .33)), sy: m.scale.y, cam: DEP.w3.entro === true }; });
      chk('8. …los giros y la carga van de una, sin animación, y la cámara no hace su entrada', rq.rot === 1.2 && rq.yawT == null && rq.colY < 1e-9 && rq.sy === 1 && !rq.cam, rq);
      chk('8. con «reducir movimiento» nadie habla y Eduardo se queda en su lugar', r.burb === 0 && r.pos === (+r.home.split(',')[0]).toFixed(2) + ',' + (+r.home.split(',')[1]).toFixed(2), r);
      chk('…ningún error de JavaScript', errores.length === 0, errores);
      await page.close();
    }
  }
  await browser.close();
  console.log(PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
