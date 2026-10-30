/* 🌙 EL FONDO DE LA NOCHE EN OCTUBRE Y NOVIEMBRE (30/10, §4ob; dueño: «creo que podemos usar fondo halloweenesco… se ve muy blanco el panel»
   y «no me hagas algo que no se integre con lo de arriba»).
   Debajo del encabezado sigue su atardecer y baja a la noche (Halloween: murciélagos, calabacitas, telaraña; Todos Santos: cempasúchil,
   pétalos, velitas, guirnalda). Las pestañas de la compu van de noche; las tarjetas no cambian.
   Lo que cuida:
   1. Octubre y noviembre: la capa del fondo existe, es FIJA, va detrás de todo (z −1) y no se puede tocar; el `body` queda transparente.
   2. Debajo del encabezado va su REFLEJO, que se mueve con él (su degradé cambia de color cada 14 s), y abajo es noche.
   3. El pie, lo único directo sobre el fondo, se lee (contraste ≥ 4,5) y nada más queda suelto sobre el fondo en las pestañas principales.
   4. Las pestañas de la compu: oscuras, la elegida con su color; en el celular, las de abajo como siempre.
   5. Las ventanas grandes (Stock, Pedido a producción) siguen con su fondo claro.
   6. Lo de arriba se sigue tocando: la capa no se lleva los clics.
   7. Los demás meses no cambian: sin capa, fondo de siempre, pestañas blancas.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_fondo_noche.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(fecha, vp) {
    const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    await page.clock.setFixedTime(new Date(fecha));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.evaluate(() => { CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {} showView('form'); });
    await page.waitForTimeout(150);
    return { ctx, page };
  }
  const capa = page => page.evaluate(() => {
    const b = getComputedStyle(document.body, '::before'), body = getComputedStyle(document.body);
    return { tema: [].filter.call(document.documentElement.classList, c => /^tema-/.test(c)).join(' '), content: b.content, pos: b.position, z: b.zIndex, pe: b.pointerEvents,
      img: b.backgroundImage, bodyBg: body.backgroundColor, bodyImg: body.backgroundImage, ancho: parseFloat(b.width), alto: parseFloat(b.height) };
  });

  for (const [mes, fecha, tema, marca] of [['octubre', '2026-10-30T10:00:00-04:00', 'tema-halloween', /%3Cpath id='m'/], ['noviembre', '2026-11-03T10:00:00-04:00', 'tema-todos-santos', /%3Cg id='f'/]]) {
    const { ctx, page } = await abrir(fecha);
    // ---------- 1 ----------
    const c = await capa(page);
    chk('1 ' + mes + ': tema del mes (' + tema + ')', c.tema === tema, c.tema);
    chk('1 ' + mes + ': la capa del fondo es fija, detrás de todo y no se toca', c.content !== 'none' && c.pos === 'fixed' && c.z === '-1' && c.pe === 'none' && c.ancho >= 1400 && c.alto >= 880, c);
    chk('1 ' + mes + ': lleva lo del mes (dibujos) y la noche (degradés)', /data:image\/svg\+xml/.test(c.img) && marca.test(c.img) && (c.img.match(/gradient/g) || []).length >= 2, c.img.slice(0, 120));
    chk('1 ' + mes + ': el body queda transparente (si no, taparía la capa)', c.bodyBg === 'rgba(0, 0, 0, 0)' && c.bodyImg === 'none', [c.bodyBg, c.bodyImg]);
    // ---------- 2 ----------
    /* (30/10, captura del dueño: el encabezado violeta y abajo naranja) El degradé del encabezado SE MUEVE: debajo va su reflejo
       (`body::after`), el mismo degradé con la misma animación, dado vuelta, del alto del encabezado, y al mismo tiempo que él. */
    await page.waitForTimeout(400);
    const r2 = await page.evaluate(() => {
      const h = document.querySelector('.header'), hs = getComputedStyle(h), a = getComputedStyle(document.body, '::after');
      const anis = document.getAnimations().filter(x => x.animationName === 'grad-move');
      const deH = anis.find(x => x.effect && x.effect.target === h && !x.effect.pseudoElement), deR = anis.find(x => x.effect && x.effect.pseudoElement === '::after');
      const b = getComputedStyle(document.body, '::before').backgroundImage, lin = b.match(/linear-gradient\([^()]*(\([^()]*\)[^()]*)*\)/g) || [];
      return { content: a.content, pos: a.position, z: a.zIndex, pe: a.pointerEvents, tr: a.transform, img: a.backgroundImage === hs.backgroundImage, tam: a.backgroundSize + ' / ' + hs.backgroundSize,
        ani: a.animationName + ' ' + a.animationDuration + ' / ' + hs.animationName + ' ' + hs.animationDuration,
        top: Math.round(parseFloat(a.top)), alto: Math.round(parseFloat(a.height)), hAlto: Math.round(h.getBoundingClientRect().height),
        juntos: deH && deR ? Math.abs(Number(deH.currentTime) - Number(deR.currentTime)) : -1, noche: lin.slice(-1)[0] || '' };
    });
    chk('2 ' + mes + ': debajo del encabezado va su reflejo: el mismo degradé y tamaño, dado vuelta, fijo, detrás y sin clics',
      r2.content !== 'none' && r2.pos === 'fixed' && r2.z === '-1' && r2.pe === 'none' && /matrix\(1, 0, 0, -1, 0, 0\)/.test(r2.tr) && r2.img && /300% 300% \/ 300% 300%/.test(r2.tam), r2);
    chk('2 ' + mes + ': pegado abajo del encabezado y de su alto', r2.hAlto > 40 && Math.abs(r2.top - r2.hAlto) <= 1 && Math.abs(r2.alto - r2.hAlto) <= 1, [r2.top, r2.alto, r2.hAlto]);
    chk('2 ' + mes + ': se mueve con el encabezado (la misma animación, al mismo tiempo)', /^grad-move 14s \/ grad-move 14s$/.test(r2.ani) && r2.juntos >= 0 && r2.juntos < 100, [r2.ani, r2.juntos]);
    chk('2 ' + mes + ': y abajo es noche (un degradé de colores llenos)', /linear-gradient\(rgb\(\d+, \d+, \d+\) 0%/.test(r2.noche), r2.noche.slice(0, 120));
    // ---------- 3 ----------
    const r3 = await page.evaluate(() => {
      const pie = document.getElementById('footer'), cs = getComputedStyle(pie);
      const sueltos = new Set();
      for (const v of ['form', 'mis', 'conta', 'atc']) {
        try { showView(v); } catch (e) {}
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) {
          if (!n.nodeValue.trim()) continue; const el = n.parentElement; if (!el) continue;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
          const c0 = getComputedStyle(el); if (c0.visibility === 'hidden' || +c0.opacity === 0) continue;
          let a = el, tapado = false;
          while (a && a !== document.body) { const s = getComputedStyle(a); if ((s.backgroundColor !== 'rgba(0, 0, 0, 0)') || s.backgroundImage !== 'none') { tapado = true; break; } a = a.parentElement; }
          if (!tapado && !pie.contains(el)) sueltos.add(v + ' · ' + el.tagName + (el.id ? '#' + el.id : '') + ' «' + n.nodeValue.trim().slice(0, 40) + '»');
        }
      }
      showView('form');
      return { color: cs.color, sueltos: [...sueltos] };
    });
    const fondoPie = mes === 'octubre' ? 'rgb(28, 10, 46)' : 'rgb(29, 10, 51)';
    chk('3 ' + mes + ': el pie se lee sobre la noche (contraste ≥ 4,5)', contraste(r3.color, fondoPie) >= 4.5, [r3.color, contraste(r3.color, fondoPie).toFixed(1)]);
    chk('3 ' + mes + ': nada más queda suelto sobre el fondo (Nuevo pedido, Mis pedidos, Contabilidad, ATC)', r3.sueltos.length === 0, r3.sueltos);
    // ---------- 4 ----------
    const r4 = await page.evaluate(() => {
      const t = id => { const b = document.getElementById(id), s = getComputedStyle(b), ic = b.querySelector('.ico-b svg'); return { bg: s.backgroundColor, img: s.backgroundImage, letra: s.color, borde: s.borderTopColor, trazo: ic ? getComputedStyle(ic).stroke : '' }; };
      return { elegida: t('tab-form'), otra: t('tab-conta') };
    });
    chk('4 ' + mes + ': la elegida sigue con el color de su sección', /gradient/.test(r4.elegida.img), r4.elegida);
    chk('4 ' + mes + ': las otras, oscuras con letra clara y borde del mes', /rgba\(\d+, \d+, \d+, 0\.5\)/.test(r4.otra.bg) && lum(r4.otra.bg.replace('rgba', 'rgb')) < 0.02 && lum(r4.otra.letra) > 0.7 && !/rgb\(2[0-9]{2}, 2[0-9]{2}, 2[0-9]{2}\)/.test(r4.otra.borde), r4.otra);
    chk('4 ' + mes + ': su dibujo del color del mes (no el gris de siempre)', r4.otra.trazo && r4.otra.trazo !== 'rgb(123, 139, 138)', r4.otra.trazo);
    // ---------- 5 ----------
    const r5 = await page.evaluate(() => {
      const st = document.getElementById('stock-overlay'), pap = document.getElementById('pap-overlay');
      return { stock: getComputedStyle(st).backgroundColor, pap: pap ? getComputedStyle(pap).backgroundImage.slice(0, 60) : 'sin', papColor: pap ? getComputedStyle(pap).backgroundColor : '' };
    });
    chk('5 ' + mes + ': Stock y Pedido a producción siguen claros', r5.stock === 'rgb(244, 246, 247)' && (r5.pap === 'sin' || (/gradient/.test(r5.pap) && lum(r5.papColor) > 0.8)), r5);
    // ---------- 6 ----------
    const r6 = await page.evaluate(() => {
      const b = document.getElementById('tab-mis').getBoundingClientRect();
      const enTab = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const enFondo = document.elementFromPoint(6, innerHeight - 6);
      return { tab: enTab && (enTab.closest('#tab-mis') ? 'tab-mis' : enTab.tagName), fondo: enFondo && enFondo.tagName };
    });
    chk('6 ' + mes + ': la capa no se lleva los clics (la pestaña se toca; en el fondo, la página)', r6.tab === 'tab-mis' && /^(BODY|HTML|DIV|FOOTER)$/.test(r6.fondo || ''), r6);
    await ctx.close();
    // ---------- 4 (celular) ----------
    const cel = await abrir(fecha, { width: 390, height: 844 });
    const rc = await cel.page.evaluate(() => { const s = getComputedStyle(document.getElementById('tab-conta')); return { bg: s.backgroundColor, img: s.backgroundImage }; });
    chk('4 ' + mes + ' en el celular: las pestañas de abajo como siempre (no las oscuras de la compu)', !/rgba\(\d+, \d+, \d+, 0\.5\)/.test(rc.bg), rc);
    await cel.ctx.close();
  }

  // ---------- 7 ----------
  const { ctx, page } = await abrir('2026-09-10T10:00:00-04:00');
  const c7 = await capa(page);
  const t7 = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('tab-conta')); return { bg: s.backgroundColor, footer: getComputedStyle(document.getElementById('footer')).color }; });
  chk('7 otro mes (septiembre): sin capa y con el fondo de siempre', c7.content === 'none' && /gradient/.test(c7.bodyImg), [c7.tema, c7.content, c7.bodyImg.slice(0, 40)]);
  chk('7 otro mes: pestañas blancas y pie gris, como siempre', t7.bg === 'rgb(255, 255, 255)' && t7.footer === 'rgb(107, 107, 107)', t7);
  await ctx.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
