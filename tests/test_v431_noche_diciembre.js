/* 🎨 MEJORA 431 — DICIEMBRE CON SU FONDO DE NAVIDAD (Y AÑO NUEVO) (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Del 1 al 30/12 (Navidad) y del 31/12 al 2/1 (Año Nuevo) el panel tiene, como Halloween, Todos Santos y Black Friday, fondo de noche (pino con
   nieve / azul con fuegos), las tarjetas grandes en vidrio con borde dorado y las pestañas oscuras. El encabezado de cada tema no cambia.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `NOCHE_DIC_PRUEBA` (Playwright): diciembre como siempre (tarjeta blanca, sin fondo de noche).
   2. Con la bandera, 10/12: `html.v-noche-dic`, el fondo de noche (con su dibujo), la nieve que cae (y quieta con «reducir movimiento»), la
      tarjeta de vidrio con el borde dorado, las pestañas oscuras y el encabezado de pino de siempre; Nuevo pedido sigue blanco.
   3. Año Nuevo (31/12): la noche azul y el encabezado azul de siempre.
   4. Los otros meses no cambian: noviembre sigue con su vidrio de Todos Santos y Espuma sigue blanco.
   5. Nada se lee mal sobre el vidrio: en cada pestaña y sub-vista, ningún texto con poco contraste (la misma medida que
      `test_vidrio_agrandar.js` §2), con Navidad y con Año Nuevo.
   Datos INVENTADOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v431_noche_diciembre.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0, process.env.TODO ? 1e6 : 600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

/* Pedidos INVENTADOS de diciembre: varias vendedoras, entregados y no, con saldo, ATC, RPT, venta de tienda y un borrador de Kommo. */
const T0 = Date.parse('2026-12-10T10:00:00-04:00');
function lista() {
  const V = ['Carola Chavez', 'Mirian Salazar', 'Maria Flores', 'Isabel Robledo', 'Mauricio Merida', 'Eduardo Añez'];
  const PR = [['CH1201', 'TITANIO ICE', '160x190', 3200], ['CH2531', 'SUEÑA LITE 105', '105x190', 1400], ['CD1403', 'ALMOHADA FIBRA SILICONADA', '50x70', 120], ['CH1195', 'ALM/NASA', '', 380]];
  const P = [];
  for (let i = 0; i < 90; i++) {
    const d = String(1 + (i % 28)).padStart(2, '0'), pr = PR[i % PR.length], precio = pr[3] * (1 + (i % 2)), debe = i % 5 === 0 ? 500 : 0;
    P.push({ id: 'p' + i, oc: '12-' + (100 + i), fecha: '2026-12-' + d, turno: i % 2 ? 'PM' : 'AM',
      vendedor: V[i % V.length], cliente: 'CLIENTE INVENTADO ' + (500 + i), celular: '7' + String(1000000 + i * 37), zona: ['Norte', 'Sur', 'Centro', 'Equipetrol'][i % 4],
      direccion: 'CALLE FALSA ' + i, maps: i % 3 ? 'https://www.google.com/maps?q=-17.78' + (i % 9) + ',-63.18' + (i % 7) : '',
      productos: [{ codigo: pr[0], desc: pr[1], medida: pr[2], cant: 1 + (i % 2), precio: pr[3] }],
      pagado: !debe, saldo: debe, acuenta: precio - debe, metodoPago: 'Efectivo ' + (precio - debe) + ' @2026-12-' + d + ' #' + (1000 + i),
      ts: Date.parse('2026-12-' + d + 'T10:00:00-04:00') - 86400000 * 3 + i * 1000, entregado: i % 3 === 0 && +d < 10, vehiculo: i % 4 === 1 ? 'KSC' : '', rev: 1 });
  }
  P.push({ id: 'atc1', oc: 'ATC 12-001', fecha: '2026-12-12', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE ATC', celular: '71112222', zona: 'Sur',
    productos: [{ desc: 'TITANIO ICE', medida: '160x190', cant: 1, atc: { mot: 'Hundimiento', det: 'Se hunde en el centro', fcom: '2025-05-01', tipo: 'gar' } }], ts: T0 - 86400000 * 4, rev: 1 });
  P.push({ id: 'rpt1', oc: 'RPT 12-001', fecha: '2026-12-11', turno: 'AM', vendedor: 'Mirian Salazar', cliente: 'Mia Plaza', zona: 'Mia Plaza',
    productos: [{ desc: 'ALMOHADA FIBRA SILICONADA', medida: '50x70', cant: 4, rtipo: 'Reposición' }], ts: T0 - 86400000 * 2, rev: 1 });
  P.push({ id: 'tie1', oc: '12-900', fecha: '', vendedor: 'Isabel Robledo', cliente: 'CLIENTE DE TIENDA', direccion: 'SALIÓ DE TIENDA · Central', zona: 'TIENDA',
    productos: [{ desc: 'ALMOHADA FIBRA SILICONADA', medida: '50x70', cant: 2, precio: 120 }], pagado: true, saldo: 0, acuenta: 240, metodoPago: 'Efectivo 240 @2026-12-05 #900', ts: Date.parse('2026-12-05T11:00:00-04:00'), rev: 1 });
  P.push({ id: 'kommo-555', oc: '', fecha: '', estado: 'Borrador Kommo', vendedor: 'Carola Chavez', cliente: 'LEAD INVENTADO', celular: '70009999',
    productos: [{ desc: 'TITANIO ICE', medida: '160x190', cant: 1, precio: 3200 }], ts: T0 - 3600000, rev: 1 });
  return { ok: true, version: '2026-10-29-b', ahora: T0, pedidos: P };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(o) {
    const ctx = await browser.newContext({ viewport: { width: o.w || 1366, height: o.h || 900 }, timezoneId: 'America/La_Paz', reducedMotion: o.quieto ? 'reduce' : 'no-preference' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.addInitScript((o) => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('me_mis_vendedor', 'Carola Chavez'); } catch (e) {}
      if (o.flag) window.NOCHE_DIC_PRUEBA = 1;
      if (o.todo) ['ADM_FICHAS_PRUEBA', 'ADM_TABS_PRUEBA', 'MIS_TOP_PRUEBA', 'CX_TOP_PRUEBA', 'STK_TOP_PRUEBA', 'FH_PRUEBA', 'ICO_PRUEBA', 'TBL_PRUEBA', 'CLF_PRUEBA', 'FP_PRUEBA', 'VIVO_PRUEBA', 'NAV_PRUEBA', 'ASIS_PRUEBA'].forEach(k => { window[k] = true; }); }, o);
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(o.fecha || T0));
    await page.goto('file://' + PEDIDOS + (o.q || ''), { waitUntil: 'load' });
    await page.evaluate(async (L) => {
      CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
      window.__L = L; apiList = () => Promise.resolve(JSON.parse(JSON.stringify(window.__L))); apiSave = () => Promise.resolve({ ok: true });
      await refrescarEstado();
      UNLOCKED = true; try { document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = ''; } catch (e) {}
    }, lista());
    return { ctx, page };
  }
  const mirar = (page) => page.evaluate(() => {
    showView('mis');
    const h = document.documentElement, b = getComputedStyle(document.body, '::before'), a = getComputedStyle(h, '::after');
    const btn = document.getElementById('tab-atc');
    showView('form'); const form = getComputedStyle(document.querySelector('#view-form > .card')).backgroundColor; showView('mis');
    return { marca: h.classList.contains('v-noche-dic'), tema: [].filter.call(h.classList, c => /^tema-/.test(c)).join(' '),
      fondo: b.content, dibujo: /^url\("data:image\/svg/.test(b.backgroundImage), fondoHtml: getComputedStyle(h).backgroundColor,
      nieve: a.content !== 'none' ? a.animationName : '', mis: getComputedStyle(document.querySelector('#view-mis > .card')).backgroundColor,
      borde: getComputedStyle(document.querySelector('#view-mis > .card')).borderTopColor, form,
      encab: getComputedStyle(document.querySelector('.header')).backgroundImage.slice(0, 160), pest: btn ? getComputedStyle(btn).backgroundColor : '' };
  });

  console.log('\n── 1. Sin la bandera ──');
  let { ctx, page } = await abrir({});
  let r = await mirar(page);
  chk('1a. sin `NOCHE_DIC_PRUEBA`: diciembre como siempre (sin la marca, tarjeta blanca, sin fondo de noche)', !r.marca && /tema-navidad/.test(r.tema) && /^rgba?\(255, 255, 255(, 0\.8\d+)?\)$/.test(r.mis) && r.fondo === 'none', r);
  await ctx.close();

  console.log('\n── 2. Navidad, con la bandera ──');
  ({ ctx, page } = await abrir({ flag: true }));
  r = await mirar(page);
  chk('2a. `html.v-noche-dic` con el tema de Navidad', r.marca && /tema-navidad/.test(r.tema), r);
  chk('2b. el fondo de noche: pino oscuro con su dibujo (copitos, arbolitos, regalos)', r.fondo !== 'none' && r.dibujo && /rgb\(6, 20, 15\)/.test(r.fondoHtml), r);
  chk('2c. la nieve que cae', r.nieve === 'nv-cae-fondo', r.nieve);
  chk('2d. la tarjeta grande de vidrio con el borde dorado', /rgba\(6, 24, 18, 0\.5\)/.test(r.mis) && /rgba\(253, 230, 138/.test(r.borde), [r.mis, r.borde]);
  chk('2e. las pestañas oscuras', /rgba\(6, 24, 18, 0\.6\)/.test(r.pest), r.pest);
  chk('2f. el encabezado de pino de siempre (no se tocó)', /rgb\(11, 59, 44\)/.test(r.encab), r.encab);
  chk('2g. Nuevo pedido sigue blanco', /^rgba?\(255, 255, 255(, 0\.8\d+)?\)$/.test(r.form), r.form);
  await ctx.close();
  ({ ctx, page } = await abrir({ flag: true, quieto: true }));
  r = await page.evaluate(() => getComputedStyle(document.documentElement, '::after').animationName);
  chk('2h. con «reducir movimiento» la nieve queda quieta', r === 'none', r);
  await ctx.close();

  console.log('\n── 3-4. Año Nuevo y los otros meses ──');
  ({ ctx, page } = await abrir({ flag: true, fecha: Date.parse('2026-12-31T10:00:00-04:00') }));
  r = await mirar(page);
  chk('3a. el 31/12: Año Nuevo con la noche azul y su vidrio', /tema-anio-nuevo/.test(r.tema) && r.dibujo && /rgb\(7, 11, 31\)/.test(r.fondoHtml) && /rgba\(8, 12, 34, 0\.5\)/.test(r.mis), r);
  chk('3b. el encabezado azul de siempre, sin nieve', /rgb\(11, 29, 58\)/.test(r.encab) && !r.nieve, r);
  await ctx.close();
  ({ ctx, page } = await abrir({ flag: true, fecha: Date.parse('2026-11-05T10:00:00-04:00') }));
  r = await mirar(page);
  chk('4a. noviembre sigue con el vidrio de Todos Santos', /tema-todos-santos/.test(r.tema) && /rgba\(24, 8, 40, 0\.45\)/.test(r.mis), r);
  await ctx.close();
  ({ ctx, page } = await abrir({ flag: true, q: '?tema=espuma' }));
  r = await mirar(page);
  chk('4b. Espuma sigue blanca', /tema-espuma/.test(r.tema) && /^rgba?\(255, 255, 255(, 0\.8\d+)?\)$/.test(r.mis) && r.fondo === 'none', r);
  await ctx.close();

  console.log('\n── 5. Nada se lee mal sobre el vidrio ──');
  /* La misma medida que `test_vidrio_agrandar.js` §2: cada texto directo sobre la tarjeta grande contra lo que tiene detrás. */
  const auditar = (page) => page.evaluate(() => {
    const view = document.querySelector('.view.active');
    const cards = [...view.querySelectorAll(':scope > .card, :scope > #admin-content > .card')].filter(c => getComputedStyle(c).display !== 'none');
    const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const mezcla = (ar, ab) => ({ r: ar.r * ar.a + ab.r * (1 - ar.a), g: ar.g * ar.a + ab.g * (1 - ar.a), b: ar.b * ar.a + ab.b * (1 - ar.a), a: 1 });
    const NOCHE = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 10, g: 30, b: 24, a: 1 }, malos = {};
    let vidrio = 0;
    for (const card of cards) {
      const cb = parse(getComputedStyle(card).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
      if (cb.a < .99 && cb.r < 100) vidrio++;
      const base = cb.a >= .99 ? cb : mezcla(cb, NOCHE);
      const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) {
        if (!n.nodeValue.trim() || n.nodeValue.trim() === '—') continue;
        const el = n.parentElement, rr = el.getBoundingClientRect(); if (!rr.width || !rr.height) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const capas = []; let a = el, img = false, fondos = null;
        while (a && a !== card) {
          const s = getComputedStyle(a), c = parse(s.backgroundColor);
          if (s.backgroundImage !== 'none') {
            const st = /url\(/.test(s.backgroundImage) ? [] : (s.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse);
            if (st.length && st.every(x => x && x.a >= .9)) { fondos = st; break; }
            img = true; break;
          }
          if (c && c.a > 0) { if (c.a >= .99) { fondos = [c]; break; } capas.push(c); }
          a = a.parentElement;
        }
        if (img) continue;
        const col = parse(cs.color); if (!col) continue;
        let cr = 99;
        for (const f0 of (fondos || [base])) {
          let bg = f0; for (let i = capas.length - 1; i >= 0; i--) bg = mezcla(capas[i], bg);
          const lc = mezcla(col, bg);
          if (fondos && (lum(lc) < .45 || lum(bg) < .6)) continue;
          cr = Math.min(cr, ratio(lc, bg));
        }
        const fs = parseFloat(cs.fontSize), grande = fs >= 18.66 || (fs >= 14 && +cs.fontWeight >= 700);
        if (cr >= (grande ? 3 : 4.5)) continue;
        const nom = x => x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/)[0] : '');
        malos[nom(el) + ' «' + n.nodeValue.trim().slice(0, 30) + '» ' + cr.toFixed(1)] = 1;
      }
    }
    return { vidrio, malos: Object.keys(malos) };
  });
  const ESTADOS = [
    ['Mis pedidos (Carola)', () => { showView('mis'); }],
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
  ];
  for (const [nomT, fecha] of [['Navidad', T0], ['Año Nuevo', Date.parse('2026-12-31T10:00:00-04:00')]]) {
    ({ ctx, page } = await abrir({ flag: true, todo: true, fecha, w: 1920, h: 1000 }));
    const malos = [], sinVidrio = [];
    for (const [nom, fn] of ESTADOS) {
      await page.evaluate(`(${fn.toString()})()`); await page.waitForTimeout(400);
      const x = await auditar(page); if (!x.vidrio) sinVidrio.push(nom); x.malos.forEach(m => malos.push(nom + ': ' + m));
    }
    chk('5a ' + nomT + ': todas las pestañas con la tarjeta grande de vidrio', sinVidrio.length === 0, sinVidrio);
    chk('5b ' + nomT + ': nada con poco contraste sobre el vidrio', malos.length === 0, process.env.TODO ? malos : malos.slice(0, 10));
    await ctx.close();
  }

  chk('sin errores en la página', errores.length === 0, errores.slice(0, 4));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
