/* 🔓 302 · LA CONTRASEÑA DE ADMINISTRACIÓN VALE EL DÍA (15/11, dueño: aprobado; «guardala solo en ese aparato y hasta el fin del día de
   Bolivia, con un «🔒 Cerrar la sesión de administración» visible para quien quiera borrarla»).

   Lo que se mira:
     1. Sin la bandera (`ADM_DIA_PRUEBA`) nada nuevo: ni la casilla, y al recargar la pide.
     2. En una compu sin marcar (nunca usó la contraseña, ni eligió Logística/Administración) no se ofrece.
     3. En la de logística: la casilla «Recordar en esta compu hasta la noche». Sin tildarla, al recargar la pide.
     4. Tildada: arriba «🔓 Administración abierta en esta compu hasta las 23:59» con «🔒 Cerrar la sesión de administración»; lo
        guardado es SOLO el día y una huella (ni la contraseña ni su huella de siempre).
     5. Recargar el mismo día: abre sola (Administración a la vista, la Proyección con la contraseña) y con la barra.
     6. Al día siguiente la pide otra vez y borra lo recordado.
     7. Cambiar la contraseña en esa compu la vuelve inválida.
     8. «🔒 Cerrar la sesión» cierra en el acto y al recargar la pide.
     9. Con la página abierta de un día para el otro, a la medianoche de Bolivia se cierra.

   Se corre:  node tests/test_adm_dia.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CLAVE = 'clave-de-prueba';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function contexto(flag, rol, marcada) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.addInitScript(([flag, rol, marcada]) => {
      if (flag) window.ADM_DIA_PRUEBA = 1;
      try { if (!sessionStorage.getItem('_iniciado')) { sessionStorage.setItem('_iniciado', '1'); if (rol) localStorage.setItem('me_quien_rol', rol); if (marcada) localStorage.setItem('me_adm_dev', '1'); } } catch (e) {}
    }, [flag, rol, marcada]);
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.type() === 'prompt' ? d.accept('nueva-clave-1') : d.accept());
    return { ctx, page };
  }
  const ir = async (page, fecha) => { await page.clock.setFixedTime(new Date(fecha)); await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.waitForTimeout(500); };
  const recargar = async (page, fecha) => { if (fecha) await page.clock.setFixedTime(new Date(fecha)); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(500); };
  const estado = (page) => page.evaluate(() => {
    var lk = document.getElementById('admin-lock'), ct = document.getElementById('admin-content'), b = document.getElementById('admdia-bar'), c = document.getElementById('admdia-chk'), py = document.getElementById('cta-tab-proy');
    var m = null; try { m = JSON.parse(localStorage.getItem('me_adm_dia') || 'null'); } catch (e) {}
    return { un: UNLOCKED, lock: lk.style.display !== 'none', content: ct.style.display !== 'none', bar: b ? b.innerText.replace(/\s+/g, ' ').trim() : '', chk: !!c, mem: m, proy: py ? py.style.display !== 'none' : null };
  });
  const entrar = (page, tildar) => page.evaluate(([clave, tildar]) => {
    localStorage.setItem(LS_ADMIN, sha256(clave));
    var c = document.getElementById('admdia-chk'); if (c) c.checked = !!tildar;
    document.getElementById('admin-pass').value = clave; tryUnlock();
  }, [CLAVE, tildar]);

  // ═══ 1. sin la bandera ═══
  let { ctx, page } = await contexto(false, 'logistica', true);
  await ir(page, '2026-11-16T09:00:00-04:00');
  let r = await estado(page);
  chk('1a sin la bandera: no hay casilla', !r.chk, r);
  await entrar(page, true); await recargar(page);
  r = await estado(page);
  chk('1b …y al recargar la pide (como siempre)', !r.un && r.lock && !r.mem, r);
  await ctx.close();

  // ═══ 2. compu sin marcar ═══
  ({ ctx, page } = await contexto(true, '', false));
  await ir(page, '2026-11-16T09:00:00-04:00');
  r = await estado(page);
  chk('2 en una compu sin marcar no se ofrece', !r.chk, r);
  await ctx.close();

  // ═══ 3-8. la compu de logística ═══
  ({ ctx, page } = await contexto(true, 'logistica', false));
  await ir(page, '2026-11-16T09:00:00-04:00');
  r = await estado(page);
  chk('3a en la de logística: la casilla «Recordar en esta compu hasta la noche»', r.chk && /Recordar en esta compu hasta la noche/.test(await page.evaluate(() => document.getElementById('admdia-wrap').innerText)), r);
  await entrar(page, false); await recargar(page);
  r = await estado(page);
  chk('3b sin tildarla, al recargar la pide', !r.un && r.lock && !r.mem, r);
  await entrar(page, true);
  r = await estado(page);
  const hashClave = await page.evaluate((c) => sha256(c), CLAVE);
  chk('4a tildada: «🔓 Administración abierta en esta compu hasta las 23:59 · 🔒 Cerrar la sesión de administración»', r.un && /Administración abierta en esta compu hasta las 23:59/.test(r.bar) && /Cerrar la sesión de administración/.test(r.bar), r.bar);
  chk('4b lo guardado: el día de Bolivia y una huella (no la contraseña ni su huella)', r.mem && r.mem.d === '2026-11-16' && r.mem.h && r.mem.h !== hashClave && JSON.stringify(r.mem).indexOf(CLAVE) < 0, r.mem);
  await recargar(page, '2026-11-16T18:30:00-04:00');
  r = await estado(page);
  chk('5a recargar el mismo día: abre sola (Administración a la vista)', r.un && !r.lock && r.content, r);
  chk('5b …con la barra y lo que va con la contraseña (Proyección)', /hasta las 23:59/.test(r.bar) && r.proy === true, r);
  await recargar(page, '2026-11-17T08:00:00-04:00');
  r = await estado(page);
  chk('6 al día siguiente la pide otra vez y borra lo recordado', !r.un && r.lock && !r.mem && r.bar === '', r);
  // 7. cambiar la contraseña
  await entrar(page, true);
  await page.evaluate(() => changePass());
  r = await estado(page);
  chk('7a cambiar la contraseña en esta compu borra lo recordado (la sesión de ahora sigue)', r.un && !r.mem && r.bar === '', r);
  await recargar(page);
  r = await estado(page);
  chk('7b …y al recargar la pide', !r.un && r.lock, r);
  // 8. cerrar
  await page.evaluate((c) => { localStorage.setItem(LS_ADMIN, sha256(c)); var k = document.getElementById('admdia-chk'); k.checked = true; document.getElementById('admin-pass').value = c; tryUnlock(); }, CLAVE);
  r = await estado(page);
  chk('8a entra de nuevo con la casilla', r.un && !!r.mem, r);
  await page.evaluate(() => showView('admin')); await page.waitForTimeout(60);
  await page.click('#admdia-bar button'); await page.waitForTimeout(60);
  r = await estado(page);
  chk('8b «🔒 Cerrar la sesión» cierra en el acto (pide la contraseña, sin la Proyección)', !r.un && r.lock && !r.content && !r.mem && r.proy === false, r);
  await recargar(page);
  r = await estado(page);
  chk('8c …y al recargar la pide', !r.un && r.lock, r);
  await ctx.close();

  // ═══ 9. abierta de un día para el otro ═══
  ({ ctx, page } = await contexto(true, 'logistica', false));
  await page.clock.install({ time: new Date('2026-11-16T23:58:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.clock.runFor(500);
  await entrar(page, true);
  r = await estado(page);
  chk('9a a las 23:58, abierta y recordada', r.un && !!r.mem, r);
  await page.clock.runFor(3 * 60000);
  r = await estado(page);
  chk('9b pasada la medianoche de Bolivia, se cierra sola', !r.un && r.lock && !r.mem, r);
  await ctx.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
