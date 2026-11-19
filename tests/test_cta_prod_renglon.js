/* 🧾 MEJORA 374 — CONTABILIDAD: UN RENGLÓN POR PRODUCTO EN LA TABLA (16/11/2026; dueño: «me gusta»).

   En la tabla de Ventas cada producto era una frase larga («TITANIO ICE · 180×200 · cód CH1231 × 1 · Bs 7.290,00 c/u = Bs 7.290,00») que se
   partía en 3 a 5 renglones. Ahora, SOLO en la celda de la tabla: el dibujito, «1×» en turquesa, el nombre y la medida, el código chiquito y
   gris, y lo que suma a la derecha; «c/u» solo con 2 o más.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `CTA_PROD_PRUEBA` (Playwright): la celda de siempre (el texto de `contaProdTxt`, con <br>).
   2. Con la bandera: un renglón por producto (.cpl), con el dibujito, la cantidad, el nombre, la medida, el código y lo que suma; «c/u»
      solo en el de 2; el texto entero de siempre queda en el `title` de cada renglón.
   3. Lo que va al Excel y a «📋 Copiar» NO cambia: `contaProdTxt` da lo mismo con y sin la bandera.
   4. La fila queda más baja que con la frase larga (con los mismos datos y el mismo ancho).
   5. Tocar la fila sigue abriendo la ficha de la venta.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_cta_prod_renglon.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_mis_comision.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async()=>{'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    if(flag) await page.addInitScript(() => { window.CTA_PROD_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(350);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(async () => {
      var ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); };
      window._L.push({ id:'x1', oc:'11-090', nota:'N777', cliente:'CLIENTE CON DOS PRODUCTOS', celular:'71000099', fecha:'2026-11-20', turno:'AM', zona:'Norte', direccion:'CALLE 1',
        maps:'https://maps.google.com/?q=-17.78,-63.18', vendedor:'Isabel Robledo', saldo:5500, acuenta:0, pagado:false, metodoPago:'', ts:ts('2026-11-11'), rev:1,
        productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:1, precio:5450 }, { desc:'ALMOHADA', medida:'50x70', codigo:'CD1403', cant:2, precio:25 }] });
      await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
      showView('conta'); try{ segSet('cta-tab','ventas'); setContaTab('ventas'); }catch(e){}
      var s=document.getElementById('cta-search'); if(s) s.value='';
      renderConta(); await new Promise(x=>setTimeout(x, 250));
    });
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => {
    var tr=[].filter.call(document.querySelectorAll('#tbl-conta tbody tr'), function(t){ return /CLIENTE CON DOS PRODUCTOS/.test(t.textContent); })[0];
    if(!tr) return null;
    var th=[].slice.call(document.querySelectorAll('#tbl-conta thead th')).map(function(x){ return x.textContent.trim(); }), ix=th.findIndex(function(t){ return /^Productos/.test(t); });
    var td=tr.cells[ix];
    return { html:td.innerHTML, txt:td.innerText.replace(/\s+/g,' ').trim(), alto:Math.round(tr.getBoundingClientRect().height),
      cpl:[].map.call(td.querySelectorAll('.cpl'), function(r){ return { q:(r.querySelector('.cpl-q')||{}).textContent, n:(r.querySelector('.cpl-n')||{}).textContent, m:(r.querySelector('.cpl-m')||{}).textContent,
        cu:!!r.querySelector('.cpl-cu'), ico:!!r.querySelector('svg.pico'), title:r.getAttribute('title') }; }),
      txtFn:contaProdTxt(findById('x1').productos) };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  const sin = await leer(page);
  chk('1a. la celda de siempre: el texto de `contaProdTxt` (con <br>), sin renglones', !!sin && sin.cpl.length===0 && sin.html===sin.txtFn.map(function(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }).join('<br>'), sin);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  const con = await leer(page);
  chk('2a. un renglón por producto (2)', !!con && con.cpl.length===2, con && con.cpl);
  const a=(con&&con.cpl[0])||{}, b=(con&&con.cpl[1])||{};
  chk('2b. el colchón: dibujito, «1×», nombre + medida + código y lo que suma (Bs 5.450) a la derecha; sin «c/u»',
    a.ico && a.q==='1×' && /COLCHON TITANIO ICE/.test(a.n) && /140x190/.test(a.n) && /CH1220/.test(a.n) && /5\.450/.test(a.m) && !a.cu, a);
  chk('2c. la almohada: «2×» y «c/u Bs 25», suma Bs 50', b.q==='2×' && b.cu && /c\/u Bs 25/.test(b.n) && /Bs 50$/.test((b.m||'').trim()), b);
  chk('2d. el texto entero de siempre queda en el `title` de cada renglón', !!con && a.title===con.txtFn[0] && b.title===con.txtFn[1], [a.title, b.title]);
  chk('3a. `contaProdTxt` (Excel y «📋 Copiar») da lo mismo con y sin la bandera', !!con && JSON.stringify(con.txtFn)===JSON.stringify(sin.txtFn), con && con.txtFn);
  chk('4a. la fila queda más baja que con la frase larga ('+(sin&&sin.alto)+' → '+(con&&con.alto)+' px)', !!con && con.alto<=sin.alto, [sin.alto, con.alto]);
  let r = await page.evaluate(async () => { var tr=[].filter.call(document.querySelectorAll('#tbl-conta tbody tr'), function(t){ return /CLIENTE CON DOS PRODUCTOS/.test(t.textContent); })[0];
    tr.querySelector('.cpl').click(); await new Promise(x=>setTimeout(x, 300)); var m=document.getElementById('modal'); return { abierta:m.classList.contains('on'), tit:(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'' }; });
  chk('5a. tocar la fila (sobre un producto) sigue abriendo la ficha de la venta', r.abierta && /CLIENTE CON DOS PRODUCTOS/.test(r.tit), r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
