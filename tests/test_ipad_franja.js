/* 📱 EL IPAD INSTALADO: LA FRANJA DE LA HORA (30/10, captura del dueño: «En iPad se ve raro arriba y transparente»).
   En el iPad con el panel instalado la franja de la hora y la batería quedaba transparente y se veía pasar la página por debajo,
   desenfocada: el encabezado se pegaba DEBAJO de esa franja. Ahora la página llega hasta arriba (`viewport-fit=cover`, letra blanca
   con `black-translucent`) y el encabezado la cubre con su color (`--sa-t` = `env(safe-area-inset-top)`).
   Playwright no tiene esa franja (el `env()` da 0): se simula poniendo `--sa-t` a mano y avisando con un `resize`, como al girar el iPad.
   Lo que cuida:
   1. La página pide llegar hasta arriba, con la letra de la hora en blanco, y el nombre de la app.
   2. Sin franja (la compu, el navegador): nada cambia: sin clase, sin relleno arriba del encabezado, sin franja en las ventanas.
   3. Con franja (iPad parado y acostado): `html.sa-top` con el color del tema; el encabezado empieza en 0 y lleva la franja de relleno,
      lo suyo queda debajo de la hora; bajando la página, lo que está debajo de la hora es SIEMPRE el encabezado (el arreglo); `--hdr-h`
      cuenta la franja (lo que se pega debajo del encabezado no queda tapado).
   4. Cada ventana a pantalla completa lleva la franja del tema y ningún botón suyo queda debajo de la hora; «Pedido a producción» la
      suma en su cabecera (sin doble); la lista es la misma de la ventana sin barra de Windows.
   5. Con el tema de Halloween la franja de las ventanas va con su color.
   6. Si la franja se va (girar, salir de la app), se saca todo.
   Se corre:  node tests/test_ipad_franja.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const RAIZ = path.resolve(__dirname, '..');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const SA = 24;

(async () => {
  // ---------- 1. lo que pide la página ----------
  const html = fs.readFileSync(PEDIDOS, 'utf8');
  const vp = (html.match(/<meta name="viewport" content="([^"]+)"/) || [])[1] || '';
  chk('1a la página llega hasta arriba de la pantalla (viewport-fit=cover)', /viewport-fit=cover/.test(vp) && /width=device-width/.test(vp), vp);
  chk('1b la hora y la batería en blanco sobre el encabezado (black-translucent)', /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">/.test(html));
  chk('1c instalable en el iPad con el nombre de la app', /<meta name="apple-mobile-web-app-capable" content="yes">/.test(html) && /<meta name="mobile-web-app-capable" content="yes">/.test(html) && /<meta name="apple-mobile-web-app-title" content="MultiEspumas">/.test(html));

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(op) {
    op = op || {};
    const ctx = await browser.newContext({ viewport: op.vp || { width: 820, height: 1180 }, timezoneId: 'America/La_Paz', hasTouch: !!op.touch });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.dismiss());
    await page.goto('file://' + PEDIDOS + (op.q || ''));
    await page.waitForTimeout(op.espera || 1200);
    return { ctx, page };
  }
  const ponerFranja = (page, px) => page.evaluate(px => { document.documentElement.style.setProperty('--sa-t', px + 'px'); window.dispatchEvent(new Event('resize')); }, px);

  // ---------- 2. sin franja ----------
  {
    const { ctx, page } = await abrir({ vp: { width: 1440, height: 900 } });
    const r = await page.evaluate(() => {
      const de = document.documentElement, so = document.getElementById('stock-overlay'); so.style.display = 'flex';
      const x = { sa: de.classList.contains('sa-top'), pt: getComputedStyle(document.querySelector('.header')).paddingTop, bt: getComputedStyle(so).borderTopWidth, bg: de.style.getPropertyValue('--wco-bg'),
        pl: getComputedStyle(document.body).paddingLeft };
      so.style.display = 'none'; return x;
    });
    chk('2 en la compu: sin clase, el encabezado sin relleno arriba, sin franja en las ventanas', !r.sa && r.pt === '0px' && r.bt === '0px' && !r.bg && r.pl === '0px', r);
    await ctx.close();
  }

  // ---------- 3, 4 y 6. con la franja del iPad ----------
  for (const v of [{ width: 820, height: 1180, n: 'parado' }, { width: 1180, height: 820, n: 'acostado' }]) {
    const { ctx, page } = await abrir({ vp: { width: v.width, height: v.height }, touch: true });
    await ponerFranja(page, SA);
    await page.waitForTimeout(150);
    const r = await page.evaluate(SA => {
      const de = document.documentElement, hd = document.querySelector('.header'), hi = hd.querySelector('.header-in');
      const b = hd.getBoundingClientRect(), bi = hi.getBoundingClientRect();
      const mtc = document.querySelector('meta[name="theme-color"]').getAttribute('content');
      return { sa: de.classList.contains('sa-top'), bg: de.style.getPropertyValue('--wco-bg'), mtc, top: b.top, pt: getComputedStyle(hd).paddingTop, inTop: bi.top,
        hdrH: parseFloat(de.style.getPropertyValue('--hdr-h')), alto: b.height };
    }, SA);
    if (v.n === 'parado') chk('3a con la franja: html.sa-top y el color del tema para las ventanas', r.sa && r.bg === r.mtc, r);
    chk('3b ' + v.n + ': el encabezado empieza arriba de todo y lleva la franja de relleno', r.top === 0 && r.pt === SA + 'px', r);
    chk('3c ' + v.n + ': el logo, el título y los anillos quedan debajo de la hora', r.inTop >= SA, r.inTop);
    chk('3d ' + v.n + ': lo que se pega debajo del encabezado cuenta la franja (--hdr-h = alto del encabezado)', Math.abs(r.hdrH - r.alto) <= 1, [r.hdrH, r.alto]);

    // el arreglo: bajando la página, debajo de la hora está SIEMPRE el encabezado (antes se veía pasar la tabla y las pestañas)
    const debajo = [];
    for (const y of [300, 900, 2000]) {
      await page.evaluate(y => window.scrollTo(0, y), y);
      await page.waitForTimeout(450);   // el encabezado se achica al bajar
      debajo.push(await page.evaluate(SA => {
        const hd = document.querySelector('.header'), W = innerWidth, malos = [];
        for (const x of [4, W * 0.25, W * 0.5, W * 0.75, W - 4]) for (const yy of [0, SA / 2, SA - 1]) {
          const el = document.elementFromPoint(x, yy); if (!el || !hd.contains(el)) malos.push(Math.round(x) + ',' + yy + ':' + (el ? (el.id || el.className || el.tagName) : '—'));
        }
        return { y: scrollY, top: hd.getBoundingClientRect().top, malos };
      }, SA));
    }
    chk('3e ' + v.n + ': bajando la página, debajo de la hora está siempre el encabezado (nada de la página se ve pasar)', debajo.every(d => d.top === 0 && d.malos.length === 0), debajo);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);

    // 4. las ventanas a pantalla completa
    const res = await page.evaluate(SA => {
      const W = innerWidth, malos = [], sinFranja = [];
      const cand = [...document.querySelectorAll('[style*="position:fixed"][style*="inset:0"], .modal-overlay')];
      cand.forEach(el => {
        const antes = el.style.display; el.style.display = 'flex';
        const bt = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
        if (el.id !== 'pap-overlay' && bt < SA) sinFranja.push(el.id || el.className);
        el.querySelectorAll('button,a,input,select,textarea,[onclick]').forEach(b => {
          const s = getComputedStyle(b); if (s.display === 'none' || s.visibility === 'hidden') return;
          const q = b.getBoundingClientRect();
          if (q.width > 0 && q.height > 0 && q.top < SA && q.bottom > 0) malos.push((el.id || el.className) + ' → ' + (b.id || b.textContent.trim().slice(0, 20)));
        });
        el.style.display = antes;
      });
      return { n: cand.length, malos, sinFranja };
    }, SA);
    chk('4a ' + v.n + ': las ' + res.n + ' ventanas a pantalla completa llevan la franja del tema', res.n >= 20 && res.sinFranja.length === 0, res.sinFranja);
    chk('4b ' + v.n + ': ningún botón de esas ventanas queda debajo de la hora', res.malos.length === 0, res.malos);

    if (v.n === 'parado') {
      const r4 = await page.evaluate(SA => {
        let wco = [], sa = [];
        const mirar = rs => { for (const ru of rs) { if (ru.cssRules && !ru.style) { mirar(ru.cssRules); continue; } const st = ru.selectorText || '';
          if (/html\.wco \.modal-overlay/.test(st)) wco = st.split(',').map(s => s.trim().replace(/^html\.wco /, ''));
          if (/html\.sa-top \.modal-overlay/.test(st)) sa = st.split(',').map(s => s.trim().replace(/^html\.sa-top /, '')); } };
        for (const ss of document.styleSheets) { try { mirar(ss.cssRules); } catch (e) {} }
        const armadas = ['pal-ov', 'dep-modal', 'anu-grito', 'anu', 'quien', 'pm-overlay'].map(c => { const d = document.createElement('div'); d.className = c; d.style.display = 'flex'; document.body.appendChild(d); const bt = getComputedStyle(d).borderTopWidth; d.remove(); return c + ':' + bt; });
        const pap = document.getElementById('pap-overlay'), cab = pap && pap.querySelector('.pap-cab');
        let papR = null;
        if (pap) { const a = pap.style.display; pap.style.display = 'flex'; papR = { bt: getComputedStyle(pap).borderTopWidth, pt: cab ? getComputedStyle(cab).paddingTop : '?' }; pap.style.display = a; }
        return { faltan: wco.filter(s => s !== '#pap-overlay' && sa.indexOf(s) < 0), sobran: sa.filter(s => wco.indexOf(s) < 0), nW: wco.length, nS: sa.length, armadas, papR };
      }, SA);
      chk('4c la lista es la misma de la ventana sin barra de Windows (' + r4.nS + ')', r4.nW > 10 && r4.faltan.length === 0 && r4.sobran.length === 0, r4);
      chk('4d las que arma la página (Ctrl+K, anuncio, quién usa, la ciudad…) llevan la franja', r4.armadas.every(x => x.endsWith(':' + SA + 'px')), r4.armadas);
      chk('4e «Pedido a producción» la suma en su cabecera, sin doble franja', !r4.papR || (r4.papR.bt === '0px' && /^3[34]px$|^28px$/.test(r4.papR.pt)), r4.papR);
      await page.screenshot({ path: path.join(process.env.IPAD_SALIDA || require('os').tmpdir(), 'ipad_franja_' + v.n + '.png'), clip: { x: 0, y: 0, width: v.width, height: 260 } });

      // 6. la franja se va
      await ponerFranja(page, 0); await page.waitForTimeout(150);
      const r6 = await page.evaluate(() => { const de = document.documentElement, so = document.getElementById('stock-overlay'); so.style.display = 'flex';
        const x = { sa: de.classList.contains('sa-top'), bg: de.style.getPropertyValue('--wco-bg'), bt: getComputedStyle(so).borderTopWidth, pt: getComputedStyle(document.querySelector('.header')).paddingTop };
        so.style.display = 'none'; return x; });
      chk('6 si la franja se va (girar, salir de la app) se saca todo', !r6.sa && !r6.bg && r6.bt === '0px' && r6.pt === '0px', r6);
    }
    await ctx.close();
  }

  // ---------- 5. el tema del mes ----------
  {
    const { ctx, page } = await abrir({ q: '?tema=halloween', espera: 600 });
    await ponerFranja(page, SA); await page.waitForTimeout(150);
    const r = await page.evaluate(() => { const so = document.getElementById('stock-overlay'); so.style.display = 'flex'; const c = getComputedStyle(so).borderTopColor; so.style.display = 'none'; return { c, bg: document.documentElement.style.getPropertyValue('--wco-bg') }; });
    chk('5 con Halloween la franja de las ventanas va con su color', r.bg === '#1a0b2e' && r.c === 'rgb(26, 11, 46)', r);
    await ctx.close();
  }

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
