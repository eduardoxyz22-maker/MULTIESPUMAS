/* ⚡ LA COPIA ACHICADA DE pedidos.html (30/10, §4oa, propuesta 90): herramientas/achicar_panel.js y el workflow publicar-pages.yml.
   Lo que cuida:
   1. Con una página de juguete: el JavaScript achicado da LO MISMO (cuentas, textos con espacios, «</scr"+"ipt>» partido, expresiones
      regulares, variables entre bloques), el CSS conserva lo que necesita espacios (calc), y no toca lo que no es JavaScript del panel
      (un <script src>, un JSON, un «<script>» dentro de un comentario).
   2. Si esbuild falla o no está, escribe el ORIGINAL tal cual (nunca una copia rota).
   3. Con el pedidos.html de verdad: más chico (menos del 75 %), la misma cantidad de bloques, cada bloque compila, el mismo PANEL_V.
   4. Abierto en el navegador, el achicado se comporta igual que el original: sin errores, las mismas funciones del panel, el mismo
      texto en cada pestaña con los mismos pedidos y los mismos estilos calculados.
   5. El workflow: solo publica con Pages en «GitHub Actions», usa el script, escucha a los workflows que suben a main y no corta
      una publicación en curso.
   Necesita esbuild: ESBUILD_PATH=<carpeta del paquete esbuild o esbuild-wasm>, o `esbuild` instalado. Sin él, se salta (y lo dice).
   Se corre:  ESBUILD_PATH=… HTTPS_PROXY=http://127.0.0.1:9 node tests/test_achicar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), cp = require('child_process');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const RAIZ = process.env.RAIZ || path.resolve(__dirname, '..');
const SCRIPT = path.join(RAIZ, 'herramientas', 'achicar_panel.js');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const { achicar, cuantos } = require(SCRIPT);

let esb = null;
try { esb = require(process.env.ESBUILD_PATH || 'esbuild'); } catch (e) {}
if (!esb) { console.log('SALTADA: no hay esbuild (ESBUILD_PATH=<carpeta del paquete esbuild o esbuild-wasm>).\n\n0 bien · 0 mal'); process.exit(0); }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'achicar-'));
  // ---------- 1 ----------
  const juguete = `<!doctype html><html><head><title>x</title>
<!-- un comentario con <script>alert(1)</script> adentro -->
<style>
  /* comentario */
  .a { width : calc( 100% - 10px ) ; color : #ff0000 }
  .b::before { content : "  dos  espacios  " }
</style>
<script src="otro.js?v=1"></script>
<script type="application/json" id="datos">{ "a" :  1 }</script>
<script>
  // comentario de línea
  var A = 1 + 2 ;   /* otro */
  let L = [1, 2, 3].map(function (x) { return x * 2 }) ;
  function f ( s ) { return s.replace( /  +/g , ' ' ) }
  var T = \`dos   espacios \${ A }\`;
  var S = '</scr' + 'ipt>';
  var E = '🎃 «hola»';
  if (A === 3) { var B = 'tres' } else { var B = 'otro' }
</script>
<script>var C = A + L.length + (typeof f) + f('a    b') + T + S + E + B;</script>
</head><body></body></html>`;
  const r1 = await achicar(juguete, esb);
  const correr = html => { html = html.replace(/<!--[\s\S]*?-->/g, ''); const ctx = vm.createContext({}); const re = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gi; let m;
    while ((m = re.exec(html))) { if (/src=|application\/json/.test(m[1])) continue; vm.runInContext(m[2], ctx); } return vm.runInContext('C', ctx); };
  chk('1a el JavaScript achicado da lo mismo', correr(juguete) === correr(r1.html), [correr(juguete), correr(r1.html)]);
  chk('1b y es más corto', r1.html.length < juguete.length, [juguete.length, r1.html.length]);
  chk('1c el CSS conserva el calc con sus espacios y el texto entre comillas', /calc\(100% - 10px\)/.test(r1.html) && /"  dos  espacios  "/.test(r1.html) && !/comentario \*\//.test(r1.html), r1.html.match(/<style>[\s\S]*?<\/style>/)[0]);
  chk('1d no toca el <script src>, el JSON ni el comentario del HTML', r1.html.includes('<script src="otro.js?v=1"></script>') && r1.html.includes('{ "a" :  1 }') && r1.html.includes('<!-- un comentario con <script>alert(1)</script> adentro -->'));
  chk('1e la misma cantidad de bloques', JSON.stringify(cuantos(juguete)) === JSON.stringify(cuantos(r1.html)), [cuantos(juguete), cuantos(r1.html)]);

  // ---------- 2 ----------
  const falso = path.join(tmp, 'esbuild-falso.js');
  fs.writeFileSync(falso, "module.exports={ transform: async function(){ throw new Error('se rompió'); } };");
  const ent = path.join(tmp, 'ent.html'), sal = path.join(tmp, 'sal.html'), sal2 = path.join(tmp, 'sal2.html');
  fs.writeFileSync(ent, juguete);
  const o2 = cp.execFileSync('node', [SCRIPT, ent, sal], { env: Object.assign({}, process.env, { ESBUILD_PATH: falso }) }).toString();
  chk('2a si esbuild falla, sale el ORIGINAL tal cual y lo avisa', fs.readFileSync(sal, 'utf8') === juguete && /::warning::.*se rompió/.test(o2), o2.trim());
  const o3 = cp.execFileSync('node', [SCRIPT, ent, sal2], { env: Object.assign({}, process.env, { ESBUILD_PATH: path.join(tmp, 'no-existe') }) }).toString();
  chk('2b si esbuild no está, también el original', fs.readFileSync(sal2, 'utf8') === juguete && /::warning::/.test(o3) && o3.trim().split('\n').length === 1, o3.trim());
  const malo = path.join(tmp, 'esbuild-malo.js');   // devuelve algo que no compila: tiene que darse cuenta
  fs.writeFileSync(malo, "module.exports={ transform: async function(c,o){ return { code: o.loader==='js' ? 'var = ;' : c }; } };");
  const sal3 = path.join(tmp, 'sal3.html');
  cp.execFileSync('node', [SCRIPT, ent, sal3], { env: Object.assign({}, process.env, { ESBUILD_PATH: malo }) });
  chk('2c si lo achicado no compila, sale el original', fs.readFileSync(sal3, 'utf8') === juguete);

  // ---------- 3 ----------
  const orig = fs.readFileSync(PEDIDOS, 'utf8');
  const r3 = await achicar(orig, esb);
  const min = r3.html, minPath = path.join(path.dirname(PEDIDOS), '.pedidos-achicado-prueba.html');
  chk('3a pedidos.html achicado queda en menos del 75 %', min.length < orig.length * 0.75, [orig.length, min.length, (min.length / orig.length * 100).toFixed(0) + ' %']);
  chk('3b la misma cantidad de bloques de JavaScript y CSS', JSON.stringify(cuantos(orig)) === JSON.stringify(cuantos(min)), cuantos(min));
  const pv = s => (s.match(/PANEL_V=['"]([^'"]+)['"]/) || [])[1];
  chk('3c el mismo PANEL_V (el aviso de versión nueva lo usa)', pv(orig) && pv(orig) === pv(min), [pv(orig), pv(min)]);
  chk('3d sin «</script» adentro de ningún bloque', !/<script\b(?![^>]*src)[^>]*>(?:(?!<\/script>)[\s\S])*<\/scr(?!ipt>)/i.test(min));

  // ---------- 4 ----------
  fs.writeFileSync(minPath, min);   // al lado del original: los archivos que carga (productos-mes.js, escritorio.js…) se encuentran igual
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const L = { ok: true, version: '2026-10-29-b', ahora: Date.parse('2026-10-30T13:00:00-04:00'), pedidos: [] };
  const vend = ['Carola Chavez', 'Mirian Salazar', 'Maria Flores', 'Isabel Robledo'];
  for (let i = 0; i < 140; i++) {
    const d = String(1 + (i % 28)).padStart(2, '0');
    L.pedidos.push({ id: 'p' + i, fecha: '2026-10-' + d, oc: '10-' + String(100 + i), vendedor: vend[i % 4], cliente: 'CLIENTE ' + (500 + i), celular: '7000' + String(1000 + i),
      productos: [{ desc: 'COLCHON TITANIO 140x190', medida: '', codigo: '', cant: 1 + (i % 2), precio: 1500 + i }], turno: i % 3 ? 'AM' : 'PM', zona: 'Norte', direccion: 'CALLE ' + i,
      pagado: i % 4 === 0, saldo: i % 4 === 0 ? 0 : 300, acuenta: 500, metodoPago: 'Efectivo 500 @2026-10-' + d, ts: Date.parse('2026-10-' + d + 'T10:00:00-04:00'), entregado: i % 5 === 0, rev: 1 });
  }
  async function mirar(archivo) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('me_mis_vendedor', 'Carola Chavez'); } catch (e) {} });
    const page = await ctx.newPage(); const err = []; page.on('pageerror', e => err.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-30T13:00:00-04:00'));
    await page.goto('file://' + archivo, { waitUntil: 'load' });
    const r = await page.evaluate(async (L) => {
      CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
      window.__L = L; apiList = function () { return Promise.resolve(JSON.parse(JSON.stringify(window.__L))); };
      apiSave = function (x) { return Promise.resolve({ ok: true, pedido: x }); }; apiPost = function () { return Promise.resolve({ ok: true }); };
      await refrescarEstado();
      const fns = Object.keys(window).filter(k => { try { return typeof window[k] === 'function'; } catch (e) { return false; } }).sort();
      const vistas = {};
      for (const v of ['form', 'mis', 'conta', 'atc']) { showView(v); await new Promise(r => setTimeout(r, 60)); const el = document.getElementById('view-' + v); vistas[v] = (el ? el.innerText : '').replace(/\s+/g, ' ').trim(); }
      UNLOCKED = true; showView('admin'); try { renderAdmin(); } catch (e) {} await new Promise(r => setTimeout(r, 60));
      vistas.admin = document.getElementById('view-admin').innerText.replace(/\s+/g, ' ').trim();
      showView('form');
      /* Sin transiciones ni animaciones al medir: si no, una pestaña que se está apagando da un color a medio camino (distinto en cada corrida). */
      const st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st);
      await new Promise(r => setTimeout(r, 120));
      const props = ['display', 'position', 'color', 'background-color', 'background-image', 'font-size', 'font-weight', 'padding-top', 'padding-left', 'margin-top', 'border-top-width', 'border-top-color', 'border-radius', 'width', 'height', 'grid-template-columns', 'box-shadow'];
      const els = [...document.querySelectorAll('.header, .header *, .nav, .nav *, #view-form, #view-form *')].slice(0, 700);
      const estilos = els.map(e => { const s = getComputedStyle(e); return props.map(p => s.getPropertyValue(p)).join('|'); });
      return { fns, vistas, estilos, n: els.length, version: PANEL_V };
    }, L);
    await ctx.close();
    return Object.assign(r, { err });
  }
  const A = await mirar(PEDIDOS), B = await mirar(minPath);
  chk('4a el achicado abre sin errores (y el original también)', A.err.length === 0 && B.err.length === 0, { orig: A.err.slice(0, 2), min: B.err.slice(0, 2) });
  chk('4b las mismas funciones del panel (' + A.fns.length + ')', A.fns.join() === B.fns.join(), A.fns.filter(f => B.fns.indexOf(f) < 0).concat(B.fns.filter(f => A.fns.indexOf(f) < 0)).slice(0, 10));
  for (const v of Object.keys(A.vistas)) chk('4c el mismo texto en «' + v + '» con los mismos pedidos (' + A.vistas[v].length + ' letras)', A.vistas[v].length > 50 && A.vistas[v] === B.vistas[v], A.vistas[v] === B.vistas[v] ? null : [A.vistas[v].slice(0, 120), B.vistas[v].slice(0, 120)]);
  const difs = A.estilos.map((s, i) => s === B.estilos[i] ? null : i).filter(x => x !== null);
  chk('4d los mismos estilos calculados en el encabezado, las pestañas y Nuevo pedido (' + A.n + ' elementos)', A.n > 200 && A.n === B.n && difs.length === 0, difs.slice(0, 5).map(i => [A.estilos[i], B.estilos[i]]));
  chk('4e la misma versión en la página', A.version === B.version, [A.version, B.version]);
  await browser.close();
  try { fs.unlinkSync(minPath); } catch (e) {}

  // ---------- 5 ----------
  const wf = fs.readFileSync(path.join(RAIZ, '.github', 'workflows', 'publicar-pages.yml'), 'utf8');
  chk('5a solo publica si Pages está en «GitHub Actions» (con la rama, no hace nada)', /build_type/.test(wf) && /if: needs\.ver\.outputs\.modo == 'workflow'/.test(wf));
  chk('5b usa el script y lo achicado va al sitio, no al repo', /node herramientas\/achicar_panel\.js pedidos\.html "\$SITIO\/pedidos\.html"/.test(wf) && /upload-pages-artifact/.test(wf));
  const pushers = fs.readdirSync(path.join(RAIZ, '.github', 'workflows')).filter(f => /\.ya?ml$/.test(f) && f !== 'publicar-pages.yml').map(f => fs.readFileSync(path.join(RAIZ, '.github', 'workflows', f), 'utf8'))
    .filter(t => /git push/.test(t) && !/rama de trabajo \(nunca en main\)/.test(t)).map(t => (t.match(/^name:\s*(.+)$/m) || [])[1].trim());   // el diagnóstico sube a una rama de trabajo, nunca a main
  const faltan = pushers.filter(n => wf.indexOf("'" + n + "'") < 0);
  chk('5c escucha a todos los workflows que suben algo a main (' + pushers.length + ')', faltan.length === 0, faltan);
  chk('5d no corta una publicación en curso y no se pisa con la de la rama', /group: pages/.test(wf) && /cancel-in-progress: false/.test(wf));

  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
