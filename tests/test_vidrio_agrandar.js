/* 🪟🔍 EL VIDRIO OSCURO Y EL AGRANDADO (31/10, §4oc; el dueño eligió «Vidrio oscuro y el agrandado»).
   C1: en octubre (Halloween) la tarjeta grande de Mis pedidos, Contabilidad, Administración, ATC, Bot y Chofer pasa a vidrio oscuro y lo que va
   directo sobre ella se lee. Z: en pantallas de 1.800 px o más el panel se agranda 1,25 (como el zoom de 125 % del navegador).
   Lo que cuida:
   1. Toda medida de la pantalla (`vh`/`vw`) va dividida por `--vz`: con `zoom` una ventana de 90vh quedaba más alta que la pantalla.
   2. Vidrio: en cada pestaña y sub-vista (con pedidos y vacías), ningún texto queda con poco contraste sobre el vidrio (a 1.920 y a 1.180).
      Nuevo pedido y el candado de Administración siguen blancos; los demás meses no hay vidrio.
   3. Agrandado: 1,25 desde 1.800 px, nada debajo; ventanas (ficha, Ctrl+K, En vivo, Bloki, Stock, Pedido a producción) dentro de la pantalla;
      el desplegable de productos debajo de su campo; el fantasma de las pestañas sobre su pestaña; la página no se corre de costado.
   4. Con las librerías de verdad (copias locales, si están): el mapa (Leaflet) pone el clic donde se tocó; el 3D dibuja con 1,25 puntos;
      el PDF del informe de ATC sale del tamaño A4 de siempre (la copia que fotografía va sin agrandar).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_vidrio_agrandar.js
   (§4 con LEAFLET_DIR=<paquete leaflet 1.9.4>, PATIO_THREE=<paquete three 0.128>, ATCI_LIBS_DIR=<node_modules con jspdf y html2canvas>) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const SCR = '/tmp/claude-0/-home-user-MULTIESPUMAS/dab3dfa4-9445-5474-b412-a4265b40568c/scratchpad';
const LEAFLET_DIR = process.env.LEAFLET_DIR || path.join(SCR, 'lf/package');
const THREE_DIR = process.env.PATIO_THREE || path.join(SCR, 'three/package');
const LIBS_DIR = process.env.ATCI_LIBS_DIR || path.join(SCR, 'libs');
const buscar = (dir, nombres) => { for (const n of nombres) { const f = path.join(dir, n); if (fs.existsSync(f)) return f; } return ''; };
const LIB = {
  leaflet: buscar(LEAFLET_DIR, ['dist/leaflet.js']), leafletCss: buscar(LEAFLET_DIR, ['dist/leaflet.css']),
  three: buscar(THREE_DIR, ['build/three.min.js']), orbit: buscar(THREE_DIR, ['examples/js/controls/OrbitControls.js']),
  jspdf: buscar(LIBS_DIR, ['jspdf/dist/jspdf.umd.min.js', 'jspdf-2.5.1/package/dist/jspdf.umd.min.js']),
  h2c: buscar(LIBS_DIR, ['html2canvas/dist/html2canvas.min.js', 'html2canvas-1.4.1/package/dist/html2canvas.min.js']),
};

/* Pedidos INVENTADOS de octubre: varias vendedoras, entregados y no, con saldo, ATC, RPT, venta de tienda y un borrador de Kommo. */
const T0 = Date.parse('2026-10-30T16:45:00-04:00');
function lista() {
  const V = ['Carola Chavez', 'Mirian Salazar', 'Maria Flores', 'Isabel Robledo', 'Mauricio Merida', 'Eduardo Añez'];
  const PR = [['CH1201', 'TITANIO ICE', '160x190', 3200], ['CH2531', 'SUEÑA LITE 105', '105x190', 1400], ['CD1403', 'ALMOHADA FIBRA SILICONADA', '50x70', 120], ['CH1195', 'ALM/NASA', '', 380]];
  const P = [];
  for (let i = 0; i < 90; i++) {
    const d = String(1 + (i % 30)).padStart(2, '0'), pr = PR[i % PR.length], precio = pr[3] * (1 + (i % 2)), debe = i % 5 === 0 ? 500 : 0;
    P.push({ id: 'p' + i, oc: '10-' + (100 + i), fecha: '2026-' + (i % 7 === 0 ? '11-0' + (2 + i % 5) : '10-' + d), turno: i % 2 ? 'PM' : 'AM',
      vendedor: V[i % V.length], cliente: 'CLIENTE INVENTADO ' + (500 + i), celular: '7' + String(1000000 + i * 37), zona: ['Norte', 'Sur', 'Centro', 'Equipetrol'][i % 4],
      direccion: 'CALLE FALSA ' + i, maps: i % 3 ? 'https://www.google.com/maps?q=-17.78' + (i % 9) + ',-63.18' + (i % 7) : '',
      productos: [{ codigo: pr[0], desc: pr[1], medida: pr[2], cant: 1 + (i % 2), precio: pr[3] }],
      pagado: !debe, saldo: debe, acuenta: precio - debe, metodoPago: 'Efectivo ' + (precio - debe) + ' @2026-10-' + d + ' #' + (1000 + i),
      ts: Date.parse('2026-10-' + d + 'T10:00:00-04:00') + i * 1000, entregado: i % 3 === 0 && +d < 30, vehiculo: i % 4 === 1 ? 'KSC' : '', rev: 1 });
  }
  P.push({ id: 'atc1', oc: 'ATC 10-001', fecha: '2026-11-03', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE ATC', celular: '71112222', zona: 'Sur',
    productos: [{ desc: 'TITANIO ICE', medida: '160x190', cant: 1, atc: { mot: 'Hundimiento', det: 'Se hunde en el centro', fcom: '2025-05-01', tipo: 'gar' } }], ts: T0 - 86400000 * 4, rev: 1 });
  P.push({ id: 'rpt1', oc: 'RPT 10-001', fecha: '2026-11-02', turno: 'AM', vendedor: 'Mirian Salazar', cliente: 'Mia Plaza', zona: 'Mia Plaza',
    productos: [{ desc: 'ALMOHADA FIBRA SILICONADA', medida: '50x70', cant: 4, rtipo: 'Reposición' }], ts: T0 - 86400000 * 2, rev: 1 });
  P.push({ id: 'tie1', oc: '10-900', fecha: '', vendedor: 'Isabel Robledo', cliente: 'CLIENTE DE TIENDA', direccion: 'SALIÓ DE TIENDA · Central', zona: 'TIENDA',
    productos: [{ desc: 'ALMOHADA FIBRA SILICONADA', medida: '50x70', cant: 2, precio: 120 }], pagado: true, saldo: 0, acuenta: 240, metodoPago: 'Efectivo 240 @2026-10-20 #900', ts: Date.parse('2026-10-20T11:00:00-04:00'), rev: 1 });
  P.push({ id: 'kommo-555', oc: '', fecha: '', estado: 'Borrador Kommo', vendedor: 'Carola Chavez', cliente: 'LEAD INVENTADO', celular: '70009999',
    productos: [{ desc: 'TITANIO ICE', medida: '160x190', cant: 1, precio: 3200 }], ts: T0 - 3600000, rev: 1 });
  return { ok: true, version: '2026-10-29-b', ahora: T0, pedidos: P };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(vp, fecha, libs) {
    const ctx = await browser.newContext({ viewport: vp, timezoneId: 'America/La_Paz', acceptDownloads: true });
    await ctx.route(/^https?:\/\//, r => {
      const u = r.request().url(), dar = (f, t) => r.fulfill({ status: 200, contentType: t, body: fs.readFileSync(f) });
      if (libs && LIB.leaflet && /leaflet@1\.9\.4\/dist\/leaflet\.js$/.test(u)) return dar(LIB.leaflet, 'application/javascript');
      if (libs && LIB.leafletCss && /leaflet@1\.9\.4\/dist\/leaflet\.css$/.test(u)) return dar(LIB.leafletCss, 'text/css');
      if (libs && LIB.three && /three(\.min)?\.js$/.test(u)) return dar(LIB.three, 'application/javascript');
      if (libs && LIB.orbit && /OrbitControls\.js$/.test(u)) return dar(LIB.orbit, 'application/javascript');
      if (libs && LIB.jspdf && /jspdf\.umd\.min\.js$/.test(u)) return dar(LIB.jspdf, 'application/javascript');
      if (libs && LIB.h2c && /html2canvas\.min\.js$/.test(u)) return dar(LIB.h2c, 'application/javascript');
      if (/\.(png|jpg|jpeg|webp)(\?|$)/.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') });   // las teselas del mapa
      return r.abort();
    });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('me_mis_vendedor', 'Carola Chavez'); } catch (e) {}
      ['ADM_FICHAS_PRUEBA', 'ADM_TABS_PRUEBA', 'MIS_TOP_PRUEBA', 'CX_TOP_PRUEBA', 'STK_TOP_PRUEBA', 'FH_PRUEBA', 'ICO_PRUEBA', 'TBL_PRUEBA', 'CLF_PRUEBA', 'FP_PRUEBA', 'VIVO_PRUEBA', 'NAV_PRUEBA', 'ASIS_PRUEBA'].forEach(k => { window[k] = true; }); });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(fecha || T0));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.evaluate(async (L) => {
      CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
      window.__L = L; apiList = () => Promise.resolve(JSON.parse(JSON.stringify(window.__L))); apiSave = () => Promise.resolve({ ok: true });
      await refrescarEstado();
      UNLOCKED = true; try { document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = ''; } catch (e) {}
    }, lista());
    return { ctx, page };
  }

  // ---------- 1. toda medida de la pantalla va dividida ----------
  {
    const s = fs.readFileSync(PEDIDOS, 'utf8'), rx = /(?<=[:\s(,])(-?\d+(?:\.\d+)?)(d?v[wh])(?=[\s;),'"}!])/g;
    const mal = [];
    s.split('\n').forEach((l, i) => { if (l.length > 3000) return; let m; while ((m = rx.exec(l))) { const antes = l.slice(Math.max(0, m.index - 5), m.index), despues = l.slice(m.index + m[0].length, m.index + m[0].length + 16);
      if (!(antes.endsWith('calc(') && despues.startsWith(' / var(--vz,1))'))) mal.push((i + 1) + ': ' + l.slice(Math.max(0, m.index - 30), m.index + 30)); } });
    chk('1a ningún vh/vw suelto en pedidos.html (todos `calc(N / var(--vz,1))`)', mal.length === 0, mal.slice(0, 8));
    chk('1b hay medidas divididas (el reemplazo está)', (s.match(/ \/ var\(--vz,1\)\)/g) || []).length >= 60);
  }

  // ---------- 2. el vidrio: contraste en cada pestaña ----------
  const auditar = (page) => page.evaluate(() => {
    const view = document.querySelector('.view.active');
    const cards = [...view.querySelectorAll(':scope > .card, :scope > #admin-content > .card')].filter(c => getComputedStyle(c).display !== 'none');
    const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const mezcla = (ar, ab) => ({ r: ar.r * ar.a + ab.r * (1 - ar.a), g: ar.g * ar.a + ab.g * (1 - ar.a), b: ar.b * ar.a + ab.b * (1 - ar.a), a: 1 });
    const NOCHE = { r: 34, g: 16, b: 58, a: 1 }, malos = {};
    let vidrio = 0;
    for (const card of cards) {
      const cb = parse(getComputedStyle(card).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
      if (cb.a < .99 && cb.r < 100) vidrio++;   // de vidrio OSCURO (la de siempre es blanca al 0,86)
      const base = cb.a >= .99 ? cb : mezcla(cb, NOCHE);
      const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) {
        if (!n.nodeValue.trim()) continue; const el = n.parentElement, rr = el.getBoundingClientRect(); if (!rr.width || !rr.height) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const capas = []; let a = el, img = false, opaco = false;
        while (a && a !== card) { const s = getComputedStyle(a), c = parse(s.backgroundColor); if (s.backgroundImage !== 'none') { img = true; break; } if (c && c.a > 0) { capas.push(c); if (c.a >= .99) { opaco = true; break; } } a = a.parentElement; }
        if (img || opaco) continue;
        let bg = base; for (let i = capas.length - 1; i >= 0; i--) bg = mezcla(capas[i], bg);
        const col = parse(cs.color); if (!col) continue;
        const cr = ratio(mezcla(col, bg), bg), fs = parseFloat(cs.fontSize), grande = fs >= 18.66 || (fs >= 14 && +cs.fontWeight >= 700);
        if (cr >= (grande ? 3 : 4.5)) continue;
        const k = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '') + ' «' + n.nodeValue.trim().slice(0, 30) + '» ' + cr.toFixed(1);
        malos[k] = 1;
      }
    }
    return { vidrio, malos: Object.keys(malos) };
  });
  const ESTADOS = [
    ['Mis pedidos (Carola)', () => { showView('mis'); }],
    ['Mis pedidos (todos)', () => { showView('mis'); const s = document.querySelector('#view-mis select'); const o = s && [...s.options].find(o => /todos/i.test(o.text)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }],
    ['Contabilidad · Ventas', () => { showView('conta'); setContaTab('ventas'); }],
    ['Contabilidad · Mayoristas', () => { showView('conta'); setContaTab('mayor'); }],
    ['Contabilidad · Cuadre', () => { showView('conta'); setContaTab('cuadre'); }],
    ['Contabilidad · Proyección', () => { showView('conta'); setContaTab('proy'); }],
    ['Administración · fichas', () => { showView('admin'); admVistaPoner('fichas'); admSecPoner('ped'); }],
    ['Administración · camiones', () => { showView('admin'); admSecPoner('cam'); }],
    ['Administración · herramientas', () => { showView('admin'); admSecPoner('her'); }],
    ['Administración · tabla', () => { showView('admin'); admSecPoner('ped'); admVistaPoner('tabla'); }],
    ['ATC', () => { showView('atc'); }],
    ['Bot', () => { showView('bot'); }],
    ['Chofer', () => { showView('chofer'); }],
  ];
  const NOV = Date.parse('2026-11-10T10:00:00-04:00');
  for (const [vp, fecha] of [[{ width: 1920, height: 1000 }, T0], [{ width: 1180, height: 820 }, T0]]) {
    let { ctx, page } = await abrir(vp, fecha);
    if (fecha === NOV) vp.width += ' (noviembre)';
    const malos = [], sinVidrio = [];
    for (const [nom, fn] of ESTADOS) {
      await page.evaluate(`(${fn.toString()})()`); await page.waitForTimeout(450);
      const r = await auditar(page); if (!r.vidrio) sinVidrio.push(nom); r.malos.forEach(m => malos.push(nom + ': ' + m));
    }
    chk('2a ' + vp.width + ' px: todas las pestañas con la tarjeta grande de vidrio', sinVidrio.length === 0, sinVidrio);
    chk('2b ' + vp.width + ' px: nada con poco contraste sobre el vidrio (con pedidos)', malos.length === 0, malos.slice(0, 10));
    // vacías
    await page.evaluate(async () => { window.__L = { ok: true, version: '2026-10-29-b', ahora: Date.now(), pedidos: [] }; await refrescarEstado(); });
    const malos2 = [];
    for (const [nom, fn] of ESTADOS) { await page.evaluate(`(${fn.toString()})()`); await page.waitForTimeout(300); (await auditar(page)).malos.forEach(m => malos2.push(nom + ': ' + m)); }
    chk('2c ' + vp.width + ' px: nada con poco contraste sobre el vidrio (sin pedidos)', malos2.length === 0, malos2.slice(0, 10));
    await ctx.close();
  }
  {
    let { ctx, page } = await abrir({ width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const bg = sel => getComputedStyle(document.querySelector(sel)).backgroundColor;
      showView('form'); const form = bg('#view-form > .card'); const lock = bg('#admin-lock');
      showView('mis'); const mis = bg('#view-mis > .card');
      return { form, lock, mis };
    });
    const blanca = c => /^rgba?\(255, 255, 255(, 0\.8\d+)?\)$/.test(c);   // la tarjeta de siempre: blanca (de vidrio claro, 0,86)
    chk('2d Nuevo pedido y el candado siguen blancos; Mis pedidos de vidrio', blanca(r.form) && blanca(r.lock) && /rgba\(22, 8, 38, 0\.45\)/.test(r.mis), r);
    await ctx.close();
    ({ ctx, page } = await abrir({ width: 1440, height: 900 }, Date.parse('2026-12-10T10:00:00-04:00')));
    const r2 = await page.evaluate(() => { showView('mis'); return { tema: document.documentElement.className, bg: getComputedStyle(document.querySelector('#view-mis > .card')).backgroundColor }; });
    chk('2e en diciembre no hay vidrio (tarjeta blanca)', /^rgba?\(255, 255, 255(, 0\.8\d+)?\)$/.test(r2.bg), r2);
    await ctx.close();
  }

  // ---------- 3. el agrandado ----------
  {
    const medir = async (w) => { const { ctx, page } = await abrir({ width: w, height: 1000 }); const z = await page.evaluate(() => ({ z: typeof zoomPag === 'function' ? zoomPag() : (document.body.currentCSSZoom || 1), vz: getComputedStyle(document.documentElement).getPropertyValue('--vz').trim() })); await ctx.close(); return z; };
    const a = await medir(1920), b = await medir(1799), c = await medir(1800);
    chk('3a 1.920 px: agrandado 1,25 (--vz 1.25)', a.z === 1.25 && a.vz === '1.25', a);
    chk('3b 1.799 px: sin agrandar; 1.800: agrandado', b.z === 1 && c.z === 1.25, { b, c });
  }
  {
    const { ctx, page } = await abrir({ width: 1920, height: 1000 });
    const dentro = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return { no: sel }; const r = el.getBoundingClientRect();
      return { sel, ok: r.width > 0 && r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vh: innerHeight }; }, sel);
    const fuera = [];
    // la ficha de un pedido largo
    await page.evaluate(() => { showView('admin'); const p = STATE.find(x => x.id === 'p1'); p.observaciones = 'ENTREGAR '.repeat(80); p.productos = Array.from({ length: 14 }, (_, i) => ({ desc: 'COLCHON INVENTADO ' + i, medida: '160x190', cant: 1, precio: 100 })); showPedidoModal('p1'); });
    await page.waitForTimeout(500);
    let r = await page.evaluate(() => { const b = document.getElementById('modal-box'), o = b.closest('.modal-overlay'), rb = b.getBoundingClientRect(), ro = o.getBoundingClientRect();
      o.scrollTop = 1e6; const abajo = b.getBoundingClientRect().bottom; o.scrollTop = 0;
      return { ancho: rb.left >= -1 && rb.right <= innerWidth + 1, overlay: [ro.top, ro.bottom, innerHeight], baja: rb.height <= innerHeight || abajo <= innerHeight + 1, abajo, alto: Math.round(rb.height) }; });
    chk('3c la ficha larga entra a lo ancho y, si es más alta que la pantalla, se baja hasta el final', r.ancho && r.overlay[0] >= -1 && r.overlay[1] <= r.overlay[2] + 1 && r.baja, r);
    await page.evaluate(() => { try { closeModal(); } catch (e) {} });
    // Ctrl+K
    await page.evaluate(() => { palAbrir(); }); await page.waitForTimeout(250);
    r = await dentro(page, '.pal'); chk('3d el buscador Ctrl+K entra', r.ok, r);
    await page.evaluate(() => { try { palCerrar(); } catch (e) { document.querySelectorAll('.pal-ov').forEach(x => x.remove()); } });
    // En vivo: debajo de su botón, del lado derecho
    const vv = await page.evaluate(() => { const b = document.getElementById('vivo-btn'); if (!b || b.hidden) return { no: 1 }; vivoAbrir(); const d = document.querySelector('.vivo-drop'); const rb = b.getBoundingClientRect(), rd = d.getBoundingClientRect();
      return { abajo: rd.top - rb.bottom, der: Math.round(innerWidth - rd.right), derB: Math.round(innerWidth - rb.right), dentro: rd.bottom <= innerHeight + 1 }; }).catch(e => ({ err: e.message }));
    chk('3e «En vivo» se abre justo debajo de su botón (8 px del panel = 10 de pantalla) y entra', vv.no || (Math.abs(vv.abajo - 10) <= 2 && Math.abs(vv.der - Math.max(10, vv.derB)) <= 2 && vv.dentro), vv);
    await page.evaluate(() => { try { vivoCerrar(); } catch (e) {} });
    // Bloki
    const bk = await page.evaluate(async () => { try { asisAbrir('ayuda'); } catch (e) { return { err: e.message }; } await new Promise(r => setTimeout(r, 300)); const p = document.getElementById('asis-panel'); if (!p || p.hidden) return { no: 1 }; const r = p.getBoundingClientRect(); return { ok: r.height > 50 && r.top >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, r: [Math.round(r.top), Math.round(r.bottom)], vh: innerHeight }; });
    chk('3f la ventana de Bloki entra en la pantalla', bk.ok, bk);
    await page.evaluate(() => { try { asisCerrar(); } catch (e) {} });
    // Stock y Pedido a producción: pantalla completa
    await page.evaluate(() => { try { abrirStock(); } catch (e) {} }); await page.waitForTimeout(500);
    r = await dentro(page, '#stock-overlay'); chk('3g Stock ocupa la pantalla justa', r.ok, r);
    await page.evaluate(() => { try { closeStock(); } catch (e) { document.getElementById('stock-overlay').style.display = 'none'; } });
    await page.evaluate(() => { try { abrirPap(); } catch (e) {} }); await page.waitForTimeout(400);
    r = await dentro(page, '#pap-overlay'); chk('3h Pedido a producción ocupa la pantalla justa', r.no || r.ok, r);
    await page.evaluate(() => { try { cerrarPap(); } catch (e) { const o = document.getElementById('pap-overlay'); if (o) o.style.display = 'none'; } });
    // la página no se corre de costado
    for (const v of ['form', 'mis', 'conta', 'admin', 'atc']) {
      await page.evaluate((v) => showView(v), v); await page.waitForTimeout(800);   // después de que la vista entra de costado (§4ni 5)
      const x = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (x > 1) fuera.push({ vista: v, sobra: x });
    }
    chk('3i ninguna pestaña se corre de costado ni la ficha se sale', fuera.length === 0, fuera);
    // el desplegable de productos
    await page.evaluate(() => { showView('form'); resetForm(); const inp = document.querySelector('#view-form .prod-desc'); inp.scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(800);
    await page.click('#view-form .prod-desc'); await page.keyboard.type('TITANIO'); await page.waitForTimeout(400);
    const db = await page.evaluate(() => { const inp = document.querySelector('#view-form .prod-desc'), el = document.getElementById('fx-busca'); if (!el || el.hidden) return { no: 1 };
      const ri = inp.getBoundingClientRect(), rd = el.getBoundingClientRect(); return { dx: Math.round(rd.left - ri.left), dy: Math.round(rd.top - ri.bottom), w: Math.round(rd.width), wi: Math.round(ri.width), vw: innerWidth }; });
    chk('3j el desplegable de productos sale pegado debajo de su campo (4 px del panel = 5 de pantalla)', !db.no && Math.abs(db.dx) <= 2 && Math.abs(db.dy - 5) <= 2 && db.w >= db.wi - 2, db);
    // el fantasma de las pestañas
    const nv = await page.evaluate(() => { const b = document.getElementById('tab-mis'), n = b.parentNode, r = navRect(b, false); return { x: Math.round(r.x), ox: b.offsetLeft - n.clientLeft, w: Math.round(r.w), ow: b.offsetWidth, y: Math.round(r.y), oy: b.offsetTop - n.clientTop }; });
    chk('3k el fantasma de las pestañas va sobre su pestaña (px del panel)', Math.abs(nv.x - nv.ox) <= 2 && Math.abs(nv.w - nv.ow) <= 2 && Math.abs(nv.y - nv.oy) <= 2, nv);
    // fichaAcomodar mide en px del panel
    const fa = await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;width:1000px;height:10px'; document.body.appendChild(d); const v = d.getBoundingClientRect().width / zoomPag(); d.remove(); return v; });
    chk('3l lo medido con getBoundingClientRect ÷ zoomPag() da px del panel', Math.abs(fa - 1000) < 1, fa);
    // el encabezado: lo que tapa al bajar
    const hd = await page.evaluate(() => { window.scrollTo(0, 2000); hdrScroll(); const r = document.querySelector('.header').getBoundingClientRect(); const a = hdrAltoEn(5000); window.scrollTo(0, 0); hdrScroll(); return { a: Math.round(a), h: Math.round(r.height), chico: document.body.classList.contains('hdr-chico') }; });
    chk('3m hdrAltoEn da lo que tapa el encabezado en px de pantalla', Math.abs(hd.a - hd.h) <= 3, hd);
    await ctx.close();
  }

  // ---------- 4. con las librerías de verdad ----------
  {
    const { ctx, page } = await abrir({ width: 1920, height: 1000 }, null, true);
    if (LIB.leaflet) {
      const mp = await page.evaluate(async () => {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:100px;top:100px;width:600px;height:400px;z-index:99999'; document.body.appendChild(box);
        const m = L.map(box, { zoomAnimation: false, fadeAnimation: false }).setView([-17.78, -63.18], 14); window.__m = m; window.__clic = null; m.on('click', e => { window.__clic = e.latlng; });
        const obj = L.latLng(-17.775, -63.17), pt = m.latLngToContainerPoint(obj), rb = box.getBoundingClientRect(), z = rb.width / box.offsetWidth;
        return { x: rb.left + pt.x * z, y: rb.top + pt.y * z, obj: [obj.lat, obj.lng], z };
      });
      await page.mouse.click(mp.x, mp.y); await page.waitForTimeout(200);
      const cl = await page.evaluate(() => window.__clic && [window.__clic.lat, window.__clic.lng]);
      chk('4a el mapa (Leaflet) pone el clic donde se tocó, agrandado', cl && Math.abs(cl[0] - mp.obj[0]) < 2e-4 && Math.abs(cl[1] - mp.obj[1]) < 2e-4, { cl, mp });
    } else console.log('… sin la copia de Leaflet: se saltea 4a');
    if (LIB.three) {
      const t3 = await page.evaluate(async () => {
        showView('admin'); admSecPoner('cam'); CV_3D = true; try { cargaVivaPintar(); } catch (e) {}
        for (let i = 0; i < 40 && !(window.DEP && DEP.w3 && DEP.w3.r); i++) await new Promise(r => setTimeout(r, 150));
        if (!(window.DEP && DEP.w3 && DEP.w3.r)) return { no: 1 };
        window.dispatchEvent(new Event('resize')); await new Promise(r => setTimeout(r, 300));
        const r = DEP.w3.r, c = r.domElement, b = DEP.w3.box; return { pr: r.getPixelRatio(), cw: c.width, bw: b.clientWidth };
      });
      chk('4b el 3D dibuja con 1,25 puntos (no queda borroso)', t3.no || (t3.pr === 1.25 && Math.abs(t3.cw - t3.bw * 1.25) <= 2), t3);
      if (t3.no) console.log('  (el 3D no arrancó en esta corrida: 4b sin medir)');
    } else console.log('… sin la copia de three.js: se saltea 4b');
    await ctx.close();
  }
  if (LIB.jspdf && LIB.h2c) {
    const { ctx, page } = await abrir({ width: 1920, height: 1000 }, null, true);
    await page.evaluate(() => { showView('atc'); abrirInformeAtc(); });
    await page.waitForTimeout(800);
    const capt = await page.evaluate(async () => {
      let ancho = null;
      try { await atciCargarLibs(); } catch (e) { return { err: 'libs ' + e.message }; }
      const h2c = window.html2canvas;
      window.html2canvas = function (el, op) { return h2c(el, op).then(cv => { ancho = ancho || [cv.width, cv.height]; return cv; }); };
      try { window.jspdf.jsPDF.API.save = function () { window.__guardado = 1; return this; }; } catch (e) {}
      atciPdf(); await new Promise(r => setTimeout(r, 200));
      for (let i = 0; i < 300 && ATCI_OCUPADO; i++) await new Promise(r => setTimeout(r, 100));
      window.html2canvas = h2c;
      return { ancho, guardado: !!window.__guardado, zoomVivo: zoomPag() };
    }).catch(e => ({ err: e.message }));
    chk('4c el PDF del informe de ATC fotografía la hoja A4 de siempre (1123×794 × 2), sin agrandar', capt.ancho && capt.ancho[0] === 2246 && capt.ancho[1] === 1588 && capt.zoomVivo === 1.25, capt);
    await ctx.close();
  } else console.log('… sin las copias de jsPDF y html2canvas: se saltea 4c');

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 5));
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
