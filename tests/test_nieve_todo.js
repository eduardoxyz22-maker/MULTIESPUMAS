/* ❄️ (27/11, dueño: «¡Que haya nieve en todo!») La nieve por encima de toda la pantalla en diciembre (tema de Navidad).
   Solo dibujo: no tapa ningún clic, no sale con otro tema, y en las pruebas solo con window.NIEVE_PRUEBA. */
const { chromium } = require('playwright'); const path = require('path');
let bien = 0, mal = 0; const ok = (l, c, e) => { c ? bien++ : mal++; console.log((c ? '✓ ' : '✗ ') + l + (c ? '' : ' · ' + JSON.stringify(e))); };
(async () => {
  const b = await chromium.launch(); const url = 'file://' + path.resolve(__dirname, '..', 'pedidos.html');
  const abrir = async (tema, flag) => { const ctx = await b.newContext({ viewport: { width: 1300, height: 860 } }); await ctx.route(/^https:\/\//, r => r.abort());
    const p = await ctx.newPage(); if (flag) await p.addInitScript(() => { window.NIEVE_PRUEBA = 1; }); await p.goto(url + '?tema=' + tema); await p.waitForTimeout(600); return { ctx, p }; };
  let { ctx, p } = await abrir('navidad', true);
  const i = await p.evaluate(() => { const d = document.getElementById('nv-todo'); if (!d) return null; const cs = getComputedStyle(d);
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return { pe: cs.pointerEvents, pos: cs.position, z: +cs.zIndex, capas: d.children.length, pasa: !!el && !el.closest('#nv-todo') }; });
  ok('1a con Navidad cae la nieve, fija y encima de todo', i && i.pos === 'fixed' && i.z > 4000 && i.capas === 3, i);
  ok('1b no tapa nada: los clics llegan a la página', i && i.pe === 'none' && i.pasa, i);
  await p.evaluate(() => nieveTodoPoner()); ok('1c llamarla dos veces no pone dos', await p.evaluate(() => document.querySelectorAll('.nv-todo').length) === 1);
  await ctx.close();
  ({ ctx, p } = await abrir('espuma', true)); ok('2a con otro tema no hay nieve', !(await p.evaluate(() => !!document.getElementById('nv-todo')))); await ctx.close();
  ({ ctx, p } = await abrir('navidad', false)); ok('2b en las pruebas sin la bandera, no sale', !(await p.evaluate(() => !!document.getElementById('nv-todo')))); await ctx.close();
  await b.close(); console.log('\n' + bien + ' bien · ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
