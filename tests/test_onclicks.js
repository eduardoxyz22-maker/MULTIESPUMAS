/* 🔌 Botones que no hacen nada.
   Un botón que llama a una función inexistente NO da error visible: la vendedora lo toca,
   no pasa nada, y piensa que el panel se colgó. Ya pasó dos veces (el "Adjuntar imagen" de
   Contabilidad, y el "Guardar precios" que las comillas dobles cortaban por la mitad).
   Este test lee el archivo y cruza TODO lo que se invoca desde un onclick/oninput/onchange
   —incluidas las cadenas que el JS arma a mano— contra lo que existe de verdad. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

const src = fs.readFileSync(path.resolve('pedidos.html'), 'utf8');

// ---------- 1. lo que se invoca desde un atributo de evento ----------
const llamadas = new Set();
const rxAttr = /\bon(?:click|input|change|submit|error|load|keyup|keydown|focus|blur)\s*=\s*(["'])([\s\S]*?)\1/g;
for (const m of src.matchAll(rxAttr)) {
  for (const f of m[2].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) {
    const i = m[2].indexOf(f[1] + '(');
    if (i > 0 && m[2][i-1] === '.') continue;              // es un método, no una función suelta
    llamadas.add(f[1]);
  }
}
// las que el JS arma concatenando:  onclick="foo(  /  onclick=\'foo(
for (const m of src.matchAll(/on(?:click|input|change|error)=\\?["'\\]*([A-Za-z_$][\w$]*)\s*\(/g)) llamadas.add(m[1]);

const PALABRAS = new Set(['if','for','while','switch','return','typeof','function','catch','new','do','else']);
const NAVEGADOR = new Set(['event','this','window','document','console','alert','confirm','prompt','JSON','Math',
  'Number','String','Array','Object','Boolean','Date','parseInt','parseFloat','isFinite','isNaN','setTimeout',
  'clearTimeout','setInterval','encodeURIComponent','decodeURIComponent','RegExp','Promise','fetch']);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:900} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  // Se pregunta AL NAVEGADOR si cada nombre existe: es la única prueba que vale.
  const faltan = await page.evaluate((nombres) => {
    return nombres.filter(function(n){ return typeof window[n] !== 'function'; });
  }, [...llamadas].filter(n => !PALABRAS.has(n) && !NAVEGADOR.has(n)));

  console.log('funciones invocadas desde un botón:', llamadas.size);
  chk('NINGÚN botón llama a una función que no existe', faltan.length===0,
      faltan.length ? ('✗ '+faltan.join(', ')) : 'todas existen');

  // ---------- 2. los onclick que arma el JS con comillas dobles ----------
  /* JSON.stringify mete comillas DOBLES, que cortan el atributo onclick="..." por la mitad
     y dejan el botón mudo. Tiene que pasar por esc() o por un replace a &quot;. */
  const sospechosos = [];
  src.split('\n').forEach((l, i) => {
    if (!/on(?:click|change|input)=/.test(l)) return;
    if (!/JSON\.stringify/.test(l)) return;
    if (/esc\(/.test(l) || /&quot;/.test(l)) return;        // ya está protegido
    sospechosos.push((i+1) + ': ' + l.trim().slice(0, 110));
  });
  chk('los onclick armados con JSON.stringify están escapados', sospechosos.length===0,
      sospechosos.length ? sospechosos.join(' || ') : 'todos');

  // ---------- 3. los segmentos (Día/Mes/Todo y compañía) responden ----------
  /* Un <div class="seg"> sin su initSeg() se ve igual pero no hace nada al tocarlo. */
  const segs = [...new Set([...src.matchAll(/class="seg[^"]*"\s+id="([a-z0-9-]+)"/g)].map(m=>m[1]))];
  const segsSinInit = segs.filter(id => !new RegExp("initSeg\\('"+id+"'").test(src));
  chk('cada grupo de botones Día/Mes/Todo está enganchado', segsSinInit.length===0,
      segsSinInit.length ? ('sin initSeg: '+segsSinInit.join(', ')) : segs.length+' grupos');

  // ---------- 4. los id que los botones buscan existen en la página ----------
  const idsHTML = new Set([...src.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map(m=>m[1]));
  // También cuentan los que el propio código crea al vuelo (ej. el CSS del mapa):
  //   var css=document.createElement('link'); css.id='leaflet-css';
  for (const m of src.matchAll(/\.id\s*=\s*'([A-Za-z0-9_-]+)'/g)) idsHTML.add(m[1]);
  const idsBuscados = new Set();
  for (const m of src.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)) idsBuscados.add(m[1]);
  const realmenteFaltan = [...idsBuscados].filter(id => !idsHTML.has(id));
  console.log('ids buscados por el código:', idsBuscados.size, '· en el HTML:', idsHTML.size);
  chk('los id fijos que busca el código existen en la página', realmenteFaltan.length===0,
      realmenteFaltan.length ? realmenteFaltan.slice(0,10).join(', ') : 'todos');

  chk('la página carga sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
