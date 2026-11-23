/* 🔐 La clave del equipo desde Mis pedidos (23/11/2026). La página con un servidor de mentira (ninguna llamada sale):
     1. Mis pedidos tiene «🔐 Clave del equipo» (las vendedoras no llegan al botón de Administración, que va con contraseña);
     2. con el servidor TODAVÍA sin clave, guardarla dice que quedó para cuando se prenda, el botón pasa a «✓» y desde ahí cada
        llamada la manda;
     3. con el servidor pidiendo clave y este aparato sin ella: el aviso «El servidor pide la clave del equipo» con su botón.
   Se corre:  node tests/test_clave_equipo_pagina.js   (desde la raíz del repo; HTTPS_PROXY como en correr.sh) */
const path = require('path');
const { chromium } = require('playwright');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + JSON.stringify(e).slice(0, 300)) : ''); };
(async () => {
  const b = await chromium.launch();
  async function abrir(auth, claveBuena) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const cuerpos = [];
    await ctx.route(/^https:\/\/script\.google(usercontent)?\.com\//, r => {
      let j = {}; try { j = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      cuerpos.push(j);
      const sinClave = auth === 'clave' && j.key !== claveBuena;
      const res = sinClave ? { ok: false, error: 'clave', auth: 'clave', version: '2026-11-21-a' }
                           : { ok: true, version: '2026-11-21-a', ahora: Date.now(), auth, pedidos: [] };
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(res) });
    });
    await ctx.route(/^https:\/\/(?!script\.google)/, r => r.abort());
    const p = await ctx.newPage();
    p.on('dialog', d => d.accept(d.type() === 'prompt' ? 'k7m2p9xq4t' : undefined));
    await p.goto('file://' + PEDIDOS);
    await p.waitForTimeout(2500);
    return { ctx, p, cuerpos };
  }
  {
    const { ctx, p, cuerpos } = await abrir('abierto');
    await p.evaluate(() => showView('mis'));
    await p.waitForTimeout(300);
    const t0 = await p.evaluate(() => { const b = document.getElementById('mis-clave-btn'); return b && b.offsetParent ? b.textContent : null; });
    chk('Mis pedidos muestra «🔐 Clave del equipo» (sin la contraseña)', t0 === '🔐 Clave del equipo', t0);
    const toasts = [];
    await p.exposeFunction('__t', m => toasts.push(m));
    await p.evaluate(() => { const o = window.toast; window.toast = function (m) { window.__t(String(m)); return o.apply(this, arguments); }; });
    await p.click('#mis-clave-btn');
    await p.waitForTimeout(600);
    const st = await p.evaluate(() => ({ ls: localStorage.getItem('ME_CLAVE_EQUIPO_V1'), txt: document.getElementById('mis-clave-btn').textContent }));
    chk('la guarda en el aparato y el botón pasa a «✓»', st.ls === 'k7m2p9xq4t' && /✓/.test(st.txt), st);
    chk('con el servidor todavía sin clave dice que quedó para cuando se prenda', toasts.some(t => /todavía no la pide/.test(t)), toasts);
    const n0 = cuerpos.length;
    await p.evaluate(() => apiList().catch(() => null));
    await p.waitForTimeout(500);
    const nuevos = cuerpos.slice(n0);
    chk('desde ahí cada llamada al servidor manda la clave', nuevos.length > 0 && nuevos.every(c => c.key === 'k7m2p9xq4t'), nuevos.map(c => c.action + ':' + !!c.key));
    await ctx.close();
  }
  {
    const { ctx, p } = await abrir('clave', 'la-de-verdad');
    await p.waitForTimeout(1000);
    const txt = await p.evaluate(() => (document.getElementById('conn-form') || {}).innerText || '');
    chk('con el servidor pidiendo clave y el aparato sin ella: el aviso con «Ingresar clave»', /pide la clave del equipo/.test(txt) && /Ingresar clave/.test(txt), txt.slice(0, 160));
    await ctx.close();
  }
  await b.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exitCode = FAIL ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
