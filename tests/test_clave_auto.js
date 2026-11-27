/* 🔐 La ventana de la clave sale SOLA (27/11/2026, dueño: «quiero que salga la alerta si no pusieron la clave y les salga para colocar»).
   1. Servidor TODAVÍA sin clave y aparato sin clave: sale sola la ventana para ponerla (una vez por día).
   2. Al volver a abrir el mismo día, no sale de nuevo; con la clave puesta, nunca.
   3. Servidor que YA pide la clave y aparato sin ella: sale sola; con la clave buena, conecta.
   4. «🛡️ Clave para forzar» en Mis pedidos la guarda en el aparato.
   Servidor de mentira (ninguna llamada sale). Se corre:  node tests/test_clave_auto.js */
const path = require('path');
const { chromium } = require('playwright');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + JSON.stringify(e).slice(0, 300)) : ''); };
(async () => {
  const b = await chromium.launch();
  async function contexto(auth, claveBuena) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => { window.CLAVE_AUTO_PRUEBA = 1; });
    await ctx.route(/^https:\/\/script\.google(usercontent)?\.com\//, r => {
      let j = {}; try { j = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      const sinClave = auth === 'clave' && j.key !== claveBuena;
      const res = sinClave ? { ok: false, error: 'clave', auth: 'clave', version: '2026-11-21-a' }
                           : { ok: true, version: '2026-11-21-a', ahora: Date.now(), auth, pedidos: [] };
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(res) });
    });
    await ctx.route(/^https:\/\/(?!script\.google)/, r => r.abort());
    return ctx;
  }
  async function abrir(ctx, respuesta) {
    const p = await ctx.newPage(), prompts = [];
    p.on('dialog', d => { prompts.push(d.type() + ': ' + d.message()); d.type() === 'prompt' ? d.accept(respuesta || '') : d.accept(); });
    await p.goto('file://' + PEDIDOS);
    await p.waitForTimeout(3000);
    return { p, prompts };
  }
  {
    const ctx = await contexto('abierto');
    let { p, prompts } = await abrir(ctx, 'k7m2p9xq4t');
    chk('1. sin clave y el servidor sin pedirla todavía: la ventana sale sola', prompts.some(x => /^prompt: Clave del equipo/.test(x)), prompts);
    const ls = await p.evaluate(() => localStorage.getItem('ME_CLAVE_EQUIPO_V1'));
    chk('1b. y lo que se pone queda guardado en el aparato', ls === 'k7m2p9xq4t', ls);
    await p.evaluate(() => localStorage.removeItem('ME_CLAVE_EQUIPO_V1'));
    await p.close();
    ({ p, prompts } = await abrir(ctx, ''));
    chk('2. el mismo día no vuelve a salir (aunque siga sin clave)', !prompts.some(x => /Clave del equipo/.test(x)), prompts);
    await p.evaluate(() => { localStorage.removeItem('me_clave_aviso'); localStorage.setItem('ME_CLAVE_EQUIPO_V1', 'k7m2p9xq4t'); });
    await p.close();
    ({ p, prompts } = await abrir(ctx, ''));
    chk('2b. con la clave puesta no sale nunca', !prompts.some(x => /Clave del equipo/.test(x)), prompts);
    await p.evaluate(() => showView('mis'));
    await p.waitForTimeout(200);
    const t0 = await p.evaluate(() => { const x = document.getElementById('mis-clave-adm-btn'); return x && x.offsetParent ? x.textContent : null; });
    chk('4. Mis pedidos tiene «🛡️ Clave para forzar»', t0 === '🛡️ Clave para forzar', t0);
    p.removeAllListeners('dialog'); p.on('dialog', d => d.type() === 'prompt' ? d.accept('adm9q3w7z2') : d.accept());
    await p.click('#mis-clave-adm-btn'); await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({ ls: localStorage.getItem('ME_CLAVE_ADMIN_V1'), txt: document.getElementById('mis-clave-adm-btn').textContent }));
    chk('4b. la guarda en el aparato y el botón pasa a «✓»', st.ls === 'adm9q3w7z2' && /✓/.test(st.txt), st);
    await ctx.close();
  }
  {
    const ctx = await contexto('clave', 'la-de-verdad');
    const { p, prompts } = await abrir(ctx, 'la-de-verdad');
    await p.waitForTimeout(1500);
    chk('3. el servidor ya pide la clave y el aparato no la tiene: la ventana sale sola', prompts.some(x => /^prompt: Clave del equipo/.test(x)), prompts);
    const st = await p.evaluate(() => ({ rech: CLAVE_RECHAZADA, ls: localStorage.getItem('ME_CLAVE_EQUIPO_V1') }));
    chk('3b. con la clave buena queda conectado', st.ls === 'la-de-verdad' && st.rech === false, st);
    await ctx.close();
  }
  await b.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exitCode = FAIL ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
