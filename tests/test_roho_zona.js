/* 🗺️ (mejora 384, 16/11) LOS PEDIDOS DE ROHO SIN ZONA: EL BARRIO ESCRITO O EL SECTOR DEL PIN.
   Cuida: al importar el Excel de ROHO, una dirección que no dice la zona pero nombra un barrio que los pedidos del equipo tienen casi siempre
   en la misma zona toma esa zona, con «≈ por el barrio escrito» en la vista previa y en las observaciones; la zona que dice la dirección
   («ZONA SUR») manda; un barrio con zonas mezcladas no adivina; después de ubicarlos en el mapa por la dirección, los que siguen sin zona toman
   la del pin (hacia dónde queda de la plaza) y el resultado del importador lo dice; uno que ya tenía zona no se toca; sin la bandera
   (`ROHO_ZONA_PRUEBA`) todo queda como antes. Nada inventa pines: el pin es el de la dirección escrita (aproximado).
   Reloj clavado el lunes 16/11/2026 10:00 de Bolivia. Red cortada, datos inventados.
   Se corre:  node tests/test_roho_zona.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-16T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error: String(e.message || e).slice(0, 300) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    CONNECTED = true; UNLOCKED = true; window.ROHO_ZONA_PRUEBA = true;
    window._saves = [];
    apiSave = function (rec) { window._saves.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(rec)) }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    var E = function (id, dir, zona) { return { id: id, oc: '11-' + id, fecha: '2026-11-10', vendedor: 'Isabel Robledo', cliente: 'CLI ' + id, direccion: dir, zona: zona, maps: '', productos: [{ desc: 'X', cant: 1 }], ts: 1, rev: 1 }; };
    STATE = [E('e1', 'Calle 8, Barrio Las Palmas', 'Norte'), E('e2', 'B/ Las Palmas casa 4', 'Norte'), E('e3', 'Barrio Las Palmas, Av. Banzer', 'Norte'),
      E('e4', 'Barrio Mezcla calle 1', 'Norte'), E('e5', 'Barrio Mezcla calle 2', 'Sur'), E('e6', 'Barrio Mezcla calle 3', 'Este')];
    var d = new Date(); d.setDate(d.getDate() + 3);
    var serial = Math.round((d - new Date(Date.UTC(1899, 11, 30))) / 86400000);
    window._filas = function () {
      var hdr = { A: 'FECHA PROGRAMADA', B: '# NOTA DE VENTA', C: 'DESCRIPCION', D: 'CANTIDAD', E: 'NOMBRE CLIENTE', F: 'DIRECCION', G: 'STATUS' };
      var f = function (n, dir) { return { A: String(serial), B: n, C: 'COLCHON ECO FLEX 2 PLAZAS 140X190CM', D: '1', E: 'CLIENTE ' + n, F: dir, G: 'PAGADA' }; };
      return [hdr, f('R1', 'Av. Banzer 6to anillo, Barrio Las Palmas, calle 3'), f('R2', 'Calle 5 casa 22, ZONA SUR'), f('R3', 'Barrio Mezcla calle 9'), f('R4', 'Calle 5 casa 22, a media cuadra del surtidor')];
    };
  });

  console.log('\n── 1. el barrio escrito ──');
  let r = await ev(() => { var res = rohoArmarPedidos(_filas()); var z = {}; (res.nuevos || []).forEach(function (p) { z[p.oc] = { z: p.zona, por: p.zonaPor, obs: p.obs }; });
    ROHO_IMP = res; ROHO_TURNO = 'AM'; ROHO_VIEJOS = false; renderImportRoho();
    return { z: z, pant: ((document.getElementById('modal-box') || {}).textContent || '').replace(/\s+/g, ' ') }; });
  chk('1a · «Barrio Las Palmas» (3 pedidos del equipo en Norte) → Norte, por el barrio escrito', r.z.R1 && r.z.R1.z === 'Norte' && r.z.R1.por === 'barrio' && /zona ≈ Norte por el barrio escrito \(Las Palmas\)/.test(r.z.R1.obs), r.z.R1);
  chk('1b · la zona que dice la dirección («ZONA SUR») manda', r.z.R2 && r.z.R2.z === 'Sur' && !r.z.R2.por, r.z.R2);
  chk('1c · un barrio con zonas mezcladas no adivina', r.z.R3 && r.z.R3.z === '', r.z.R3);
  chk('1d · la vista previa lo dice («≈ por el barrio escrito» y cuántos)', /≈ por el barrio escrito \(Las Palmas\)/.test(r.pant) && /1 con la zona puesta por el barrio escrito/.test(r.pant) && /Si se ubican en el mapa, les pongo la zona del pin/.test(r.pant), r.pant.slice(0, 600));
  await ev(() => { closeModal(); });

  console.log('\n── 2. después de ubicarlos: la zona del pin ──');
  r = await ev(async () => {
    window._geo = [];
    apiGeocode = function (links) { window._geo.push(links.slice()); return Promise.resolve({ ok: true, geo: links.map(function (l) {
      return /media cuadra/.test(l) ? { link: l, lat: -17.86, lng: -63.182 } : { link: l, lat: -17.70, lng: -63.182 }; }) }); };
    var hoy = todayStr();
    var cre = [
      { id: 'n1', oc: 'R4', vendedor: 'ROHO', cliente: 'CLIENTE R4', fecha: hoy, direccion: 'Calle 5 casa 22, a media cuadra del surtidor', zona: '', maps: '', observaciones: 'Recibe: X · Importado del Excel de ROHO', productos: [{ desc: 'X', cant: 1 }], ts: 2, rev: 1 },
      { id: 'n2', oc: 'R2', vendedor: 'ROHO', cliente: 'CLIENTE R2', fecha: hoy, direccion: 'Calle 5 casa 22, ZONA SUR', zona: 'Sur', maps: '', observaciones: 'Importado del Excel de ROHO', productos: [{ desc: 'X', cant: 1 }], ts: 2, rev: 1 }
    ];
    cre.forEach(function (p) { STATE.push(p); });
    var box = document.createElement('div'); box.id = 'roho-geo'; document.body.appendChild(box);
    ubicarImportadosRoho(cre);
    await new Promise(res => setTimeout(res, 400));
    var a = findById('n1'), b = findById('n2'), s1 = window._saves.filter(function (x) { return x.id === 'n1'; }).pop();
    return { z1: a.zona, z2: b.zona, m1: a.maps, obs1: a.observaciones, s1: s1 && s1.zona, geo: (document.getElementById('roho-geo') || {}).textContent || '' };
  });
  await espera();
  chk('2a · el que seguía sin zona toma la del pin (queda al sur de la plaza) y se guarda así', r.z1 === 'Sur' && r.s1 === 'Sur' && /aprox=1/.test(r.m1), r);
  chk('2b · …las observaciones lo dicen («zona ≈ Sur por el pin aproximado»)', /zona ≈ Sur por el pin aproximado · Importado del Excel de ROHO/.test(r.obs1), r.obs1);
  chk('2c · el que ya tenía zona no se toca', r.z2 === 'Sur', r.z2);
  chk('2d · el resultado del importador dice cuántos tomaron la zona del pin', /1 sin zona quedaron con la zona del pin \(≈\): R4 → Sur/.test(r.geo), r.geo);

  console.log('\n── 3. sin la bandera ──');
  r = await ev(() => { window.ROHO_ZONA_PRUEBA = false; var res = rohoArmarPedidos(_filas()); var z = {}; (res.nuevos || []).forEach(function (p) { z[p.oc] = p.zona; }); return z; });
  chk('3 · sin `ROHO_ZONA_PRUEBA` (las pruebas de siempre) el barrio no pone zona', r.R1 === '' && r.R3 === '', r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
