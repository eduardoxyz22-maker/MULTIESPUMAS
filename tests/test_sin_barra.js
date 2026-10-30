/* 🪟 EL PANEL INSTALADO SIN BARRA, EL ÍCONO DE LAS HOJAS Y LOS ATAJOS (30/10, §4ny; el dueño: «B, 2 y atajos sí»).
   La ventana sin barra (Window Controls Overlay) no se puede abrir en Playwright: se simula `navigator.windowControlsOverlay` con los
   botones de Windows ocupando los últimos 200 px de los primeros 33 px de arriba. Lo que cuida:
   1. El manifest: nombre «MultiEspumas», sin barra pedida (`display_override`) con `standalone` de reserva, los íconos de las hojas
      (existen y miden lo que dicen; uno «maskable»), los 4 atajos dentro del panel y `focus-existing`. La página trae el ícono de la
      pestaña y el del iPhone, y ningún archivo nombra los íconos viejos.
   2. El color de la barra va con el tema del mes (Halloween, Todos Santos, Espuma).
   3. Sin la ventana sin barra (navegador, celular) no cambia nada: ni la clase, ni el borde de las ventanas, ni el relleno del encabezado.
   4. Sin barra: `html.wco` con las medidas; el encabezado se arrastra y sus botones no; Buscar, la campanita y los anillos quedan
      fuera de los botones de Windows en 1440, 1280, 1000, 800 y 500 px.
   5. Toda ventana a pantalla completa (las del HTML y las que arma la página) lleva la franja de arriba, y nada que se toque queda
      debajo de los botones de Windows. Una regla nueva de pantalla completa que no esté en la lista hace fallar §5c.
   6. Si se vuelve a la barra (la flechita), se saca todo.
   7. Los atajos: `#ir=mis` abre Mis pedidos y se borra de la dirección; `#ir=nada` no hace nada; con el panel abierto llega por
      `launchQueue` y cambia de pestaña sin recargar; el mismo atajo no se hace dos veces.
   8. Instalado, el título es «Pedidos» (Chrome pone «MultiEspumas -» adelante).
   ⚠️ `escritorio.js` no hace nada en Playwright salvo `ESC_PRUEBA`: §7 y §8 lo prenden.
   Se corre:  node tests/test_sin_barra.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const RAIZ = path.resolve(__dirname, '..');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const CTL = 200, BARRA = 33;

function WCO_INIT(o) {
  window.__wcoFns = [];
  window.__wcoVis = true;
  const ov = {
    get visible() { return window.__wcoVis; },
    getTitlebarAreaRect() { return new DOMRect(0, 0, window.innerWidth - o.ctl, o.barra); },
    addEventListener(t, f) { if (t === 'geometrychange') window.__wcoFns.push(f); },
    removeEventListener() {}
  };
  Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, get: () => ov });
}
function pngTam(f) { const d = fs.readFileSync(f); return [d.readUInt32BE(16), d.readUInt32BE(20)]; }

(async () => {
  // ---------- 1. manifest e íconos ----------
  const man = JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.webmanifest'), 'utf8'));
  chk('1a el nombre es «MultiEspumas» (la barra de tareas dice «MultiEspumas - Pedidos»)', man.name === 'MultiEspumas' && man.short_name === 'MultiEspumas', man.name);
  chk('1b pide la ventana sin barra y deja la normal de reserva', Array.isArray(man.display_override) && man.display_override[0] === 'window-controls-overlay' && man.display === 'standalone', man.display_override);
  const ics = man.icons || [];
  const bien = ics.every(i => { const f = path.join(RAIZ, i.src); if (!fs.existsSync(f)) return false; const [w, h] = pngTam(f); return i.sizes === w + 'x' + h; });
  chk('1c los íconos son los de las hojas, existen y miden lo que dicen', ics.length === 3 && ics.every(i => /hojas-/.test(i.src)) && bien, ics.map(i => i.src));
  chk('1d hay uno «maskable» (Android lo recorta en círculo)', ics.some(i => i.purpose === 'maskable'));
  const sc = man.shortcuts || [];
  chk('1e los 4 atajos: Nuevo pedido, Mis pedidos, Contabilidad, Administración', sc.map(s => s.name).join('|') === 'Nuevo pedido|Mis pedidos|Contabilidad|Administración', sc.map(s => s.name));
  chk('1f cada atajo va al panel (#ir=…) y su ícono existe', sc.every(s => /^pedidos\.html#ir=(form|mis|conta|admin)$/.test(s.url) && (s.icons || []).every(i => fs.existsSync(path.join(RAIZ, i.src)))), sc.map(s => s.url));
  chk('1g con el panel abierto, el atajo usa esa ventana (focus-existing)', man.launch_handler && [].concat(man.launch_handler.client_mode)[0] === 'focus-existing', man.launch_handler);
  const html = fs.readFileSync(PEDIDOS, 'utf8'), escr = fs.readFileSync(path.join(RAIZ, 'escritorio.js'), 'utf8');
  chk('1h la página trae el ícono de la pestaña y el del iPhone (de las hojas)', /rel="apple-touch-icon" href="iconos\/hojas-180\.png"/.test(html) && /rel="icon"[^>]*hojas/.test(html) && fs.existsSync(path.join(RAIZ, 'iconos/hojas-180.png')) && fs.existsSync(path.join(RAIZ, 'iconos/hojas.svg')));
  chk('1i ningún archivo nombra los íconos viejos', !/panel-(180|192|512)/.test(html + escr + JSON.stringify(man)));
  const [aw, ah] = pngTam(path.join(RAIZ, 'iconos/hojas-180.png'));
  chk('1j el del iPhone es cuadrado y de 180', aw === 180 && ah === 180);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(op) {
    op = op || {};
    const ctx = await browser.newContext({ viewport: op.vp || { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.dismiss());
    if (op.wco) await page.addInitScript(WCO_INIT, { ctl: CTL, barra: BARRA });
    if (op.instalado) await page.addInitScript(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode:\s*(standalone|window-controls-overlay)/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } : mm(q);
    });
    if (op.lq) await page.addInitScript(() => { Object.defineProperty(window, 'launchQueue', { configurable: true, value: { setConsumer(f) { window.__lqFn = f; } } }); });   // Chrome ya trae uno que no se deja pisar con «=»
    if (op.init) await page.addInitScript(op.init);
    await page.goto('file://' + PEDIDOS + (op.q || ''));
    await page.waitForTimeout(op.espera || 1200);
    return { ctx, page };
  }

  // ---------- 2. el color de la barra con el tema ----------
  for (const [t, c] of [['halloween', '#1a0b2e'], ['todos-santos', '#1e0a35'], ['espuma', '#0f4c5c']]) {
    const { ctx, page } = await abrir({ q: '?tema=' + t, espera: 500 });
    const v = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').getAttribute('content'));
    chk('2 la barra de la ventana con el tema ' + t + ' es ' + c, v === c, v);
    await ctx.close();
  }

  // ---------- 3. sin la ventana sin barra, nada cambia ----------
  {
    const { ctx, page } = await abrir({});
    const r = await page.evaluate(() => {
      const so = document.getElementById('stock-overlay'); so.style.display = 'flex';
      const x = { wco: document.documentElement.classList.contains('wco'), bt: getComputedStyle(so).borderTopWidth, pr: getComputedStyle(document.querySelector('.header-in')).paddingRight, h: document.documentElement.style.getPropertyValue('--wco-h') };
      so.style.display = 'none'; return x;
    });
    chk('3 en el navegador: sin clase, sin franja en las ventanas y el encabezado como siempre', !r.wco && r.bt === '0px' && r.pr === '22px' && !r.h, r);
    await ctx.close();
  }

  // ---------- 4 y 5. sin barra ----------
  const CUBIERTOS_EXTRA = ['#fx-escena', '.nx-confeti'];   // pantalla completa a propósito: la escena al guardar (se toca en cualquier lado) y el papel picado (no se toca)
  for (const w of [1440, 1280, 1000, 800, 500]) {
    const { ctx, page } = await abrir({ wco: true, vp: { width: w, height: 860 } });
    const r = await page.evaluate(({ CTL, BARRA }) => {
      const de = document.documentElement, W = innerWidth;
      const tapa = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.right > W - CTL && b.top < BARRA; };
      const hdr = document.querySelector('.header');
      const enHdr = [...hdr.querySelectorAll('button,a,input,select,[onclick],.hstat,.h-an')].filter(e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; });
      return {
        wco: de.classList.contains('wco'), h: de.style.getPropertyValue('--wco-h'), r: de.style.getPropertyValue('--wco-r'), bg: de.style.getPropertyValue('--wco-bg'),
        tapados: enHdr.filter(tapa).map(e => e.id || e.className),
        n: enHdr.length,
        dragH: getComputedStyle(hdr).getPropertyValue('-webkit-app-region') || getComputedStyle(hdr).getPropertyValue('app-region'),
        dragB: (() => { const b = document.getElementById('pal-btn'); return b ? (getComputedStyle(b).getPropertyValue('-webkit-app-region') || getComputedStyle(b).getPropertyValue('app-region')) : '?'; })()
      };
    }, { CTL, BARRA });
    if (w === 1440) {
      chk('4a sin barra: html.wco con el alto de la barra, lo que ocupan los botones y el color del tema', r.wco && r.h === BARRA + 'px' && r.r === CTL + 'px' && /^#/.test(r.bg), r);
      chk('4b el encabezado se arrastra para mover la ventana y sus botones no', r.dragH === 'drag' && r.dragB === 'no-drag', [r.dragH, r.dragB]);
    }
    chk('4c en ' + w + ' px nada del encabezado queda debajo de los botones de Windows (' + r.n + ' revisados)', r.n >= 2 && r.tapados.length === 0, r.tapados);

    if (w === 1440 || w === 800) {
      // 5a. las ventanas a pantalla completa del HTML, una por una
      const res = await page.evaluate(({ CTL, BARRA }) => {
        const W = innerWidth, malos = [], sinFranja = [];
        const cand = [...document.querySelectorAll('[style*="position:fixed"][style*="inset:0"], .modal-overlay')];
        cand.forEach(el => {
          const antes = el.style.display; el.style.display = 'flex';
          const bt = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
          if (bt < BARRA) sinFranja.push(el.id || el.className);
          el.querySelectorAll('button,a,input,select,textarea,[onclick]').forEach(b => {
            const s = getComputedStyle(b); if (s.display === 'none' || s.visibility === 'hidden') return;
            const q = b.getBoundingClientRect();
            if (q.width > 0 && q.height > 0 && q.right > W - CTL && q.top < BARRA) malos.push((el.id || el.className) + ' → ' + (b.id || b.textContent.trim().slice(0, 20)));
          });
          el.style.display = antes;
        });
        return { n: cand.length, malos, sinFranja };
      }, { CTL, BARRA });
      chk('5a en ' + w + ' px las ' + res.n + ' ventanas a pantalla completa llevan la franja de arriba', res.n >= 20 && res.sinFranja.length === 0, res.sinFranja);
      chk('5b en ' + w + ' px ningún botón de esas ventanas queda debajo de los botones de Windows', res.malos.length === 0, res.malos);
    }
    if (w === 1440) {
      // 5c. toda regla de pantalla completa del CSS está en la lista (si alguien agrega una ventana nueva y no la suma, esto falla)
      const r5 = await page.evaluate(EXTRA => {
        let lista = [];
        const reglas = [];
        const mirar = rs => { for (const ru of rs) { if (ru.cssRules && !ru.style) { mirar(ru.cssRules); continue; } if (!ru.style) continue;
          if (/html\.wco \.modal-overlay/.test(ru.selectorText || '')) lista = ru.selectorText.split(',').map(s => s.trim().replace(/^html\.wco /, ''));
          if (ru.style.position === 'fixed' && (ru.style.top === '0px') && (ru.style.bottom === '0px')) reglas.push(ru.selectorText); } };
        for (const ss of document.styleSheets) { try { mirar(ss.cssRules); } catch (e) {} }
        const faltan = reglas.filter(s => lista.indexOf(s) < 0 && EXTRA.indexOf(s) < 0);
        // las que arma la página al abrirse: se crea una de cada una y se mira la franja
        const armadas = ['modal-overlay', 'pal-ov', 'dep-modal', 'anu-grito', 'anu', 'quien', 'pm-overlay'].map(c => { const d = document.createElement('div'); d.className = c; d.style.display = 'flex'; document.body.appendChild(d); const bt = getComputedStyle(d).borderTopWidth; d.remove(); return c + ':' + bt; })
          .concat(['pap-overlay', 'obs-conf', 'salud-overlay', 'pt-ov'].map(id => { const ya = document.getElementById(id); const d = ya || document.createElement('div'); if (!ya) { d.id = id; d.style.cssText = 'position:fixed;top:0;bottom:0;left:0;right:0'; document.body.appendChild(d); } const bt = getComputedStyle(d).borderTopWidth; if (!ya) d.remove(); return id + ':' + bt; }));
        return { faltan, armadas, n: reglas.length };
      }, CUBIERTOS_EXTRA);
      chk('5c todas las reglas de pantalla completa del CSS (' + r5.n + ') están cubiertas', r5.faltan.length === 0, r5.faltan);
      chk('5d las ventanas que arma la página (Ctrl+K, anuncio, quién usa, la ciudad…) llevan la franja', r5.armadas.every(x => /:33px$/.test(x)), r5.armadas);
      // 6. volver a la barra
      const r6 = await page.evaluate(() => { window.__wcoVis = false; window.__wcoFns.forEach(f => f()); const de = document.documentElement; const so = document.getElementById('stock-overlay'); so.style.display = 'flex'; const x = { wco: de.classList.contains('wco'), h: de.style.getPropertyValue('--wco-h'), bt: getComputedStyle(so).borderTopWidth, pr: getComputedStyle(document.querySelector('.header-in')).paddingRight }; so.style.display = 'none'; return x; });
      chk('6 al volver a la barra (la flechita) se saca todo', !r6.wco && !r6.h && r6.bt === '0px' && r6.pr === '22px', r6);
    }
    if (w === 1440) await page.screenshot({ path: path.join(process.env.SIN_BARRA_SALIDA || require('os').tmpdir(), 'sin_barra_1440.png'), clip: { x: 0, y: 0, width: 1440, height: 240 } });
    await ctx.close();
  }

  // ---------- 7. los atajos ----------
  {
    const { ctx, page } = await abrir({ q: '#ir=mis', espera: 1500, init: () => { window.ESC_PRUEBA = 1; } });
    const r = await page.evaluate(() => ({ act: (document.querySelector('.view.active') || {}).id, hash: location.hash }));
    chk('7a «Mis pedidos» del clic derecho abre el panel en Mis pedidos', r.act === 'view-mis', r);
    chk('7b y se borra de la dirección', r.hash === '', r.hash);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir({ q: '#ir=nada', espera: 1200, init: () => { window.ESC_PRUEBA = 1; } });
    const r = await page.evaluate(() => (document.querySelector('.view.active') || {}).id);
    chk('7c un atajo que no existe no hace nada (queda Nuevo pedido)', r === 'view-form', r);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir({ lq: true, espera: 1200, init: () => { window.ESC_PRUEBA = 1; } });
    const r = await page.evaluate(() => {
      window.__cargas = (window.__cargas || 0);
      const f = window.__lqFn; if (!f) return { sin: true };
      document.getElementById('f-cliente').value = 'A MEDIO ESCRIBIR';
      f({ targetURL: location.href.split('#')[0] + '#ir=conta' });
      const a1 = (document.querySelector('.view.active') || {}).id;
      f({ targetURL: location.href.split('#')[0] + '#ir=conta' });
      const r2 = window.escIrVista('conta');
      f({ targetURL: location.href.split('#')[0] + '#ir=mis' });
      const a2 = (document.querySelector('.view.active') || {}).id;
      return { a1, r2, a2, cli: document.getElementById('f-cliente').value, t: performance.getEntriesByType('navigation').length };
    });
    chk('7d con el panel abierto, el atajo llega sin recargar y cambia de pestaña', !r.sin && r.a1 === 'view-conta' && r.a2 === 'view-mis', r);
    chk('7e el mismo atajo dos veces seguidas se hace una sola vez', r.r2 === false, r);
    chk('7f lo que estaba escrito en el pedido sigue ahí', r.cli === 'A MEDIO ESCRIBIR', r.cli);
    await ctx.close();
  }

  // ---------- 8. el título instalado ----------
  {
    const { ctx, page } = await abrir({ instalado: true, espera: 900, init: () => { window.ESC_PRUEBA = 1; } });
    chk('8a instalado, el título es «Pedidos»', await page.title() === 'Pedidos', await page.title());
    await ctx.close();
    const n = await abrir({ espera: 600 });
    chk('8b en el navegador sigue «Pedidos — MultiEspumas»', await n.page.title() === 'Pedidos — MultiEspumas', await n.page.title());
    await n.ctx.close();
  }

  chk('9 sin errores en la página', errores.length === 0, errores.join(' | '));
  await browser.close();
  console.log(`\nsin_barra :: ${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
