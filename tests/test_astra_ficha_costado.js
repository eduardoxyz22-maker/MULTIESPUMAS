/* 🗂️ LA FICHA AL COSTADO NO QUEDA PEGADA (§4nl, 27/10, auditoría de Astra A12).
   La ficha de Administración al costado (§4ni, la 3: `fichaCostadoAplicar`, `body.ficha-costado`) quedaba puesta:
   · al cambiar de pestaña con la ficha abierta (la página de Mis pedidos quedaba en 576 px con la ficha encima), y
   · al achicar la ventana por debajo de 1200 px (seguía al costado aunque `fichaCostadoVa` ya decía que no).
   Lo que cuida esta prueba:
   1. Desde Administración, tocar otra pestaña cierra la ficha del costado y la página vuelve a su ancho; volver a Administración
      (sin cambiar de pestaña) no la cierra.
   2. Con la ficha abierta, achicar a menos de 1200 px la pasa al medio (ventana de siempre, sin la clase ni la marca en la lista);
      agrandar otra vez la vuelve al costado con el pedido marcado; abierta en el medio a 820 px, agrandar la pone al costado.
   3. Fuera de Administración, otra ventana o sin `FICHA_COSTADO_PRUEBA`, cambiar el tamaño no pone nada al costado.
   Datos inventados. Reloj clavado: viernes 23/10/2026 15:00 de Bolivia.   Se corre:  node tests/test_astra_ficha_costado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-23T15:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  var n=0;
  window.V=function(cli){ n++; return { id:'p'+n, oc:'10-'+(100+n), nota:String(500+n), vendedor:'Maria Flores', cliente:cli, fecha:'2026-10-23', turno:'AM',
    productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:1000, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:1761000000000, rev:1761000000000, fotos:[] }; };
  STATE=[V('CLIENTE UNO'), V('CLIENTE DOS'), V('CLIENTE TRES')];
  UNLOCKED=true; var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none'; var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
}
/* cómo quedó todo: la clase, la ventana, la marca de la lista y el margen que la ficha le saca a la página */
function ESTADO(){
  var ov=document.getElementById('modal'), box=document.getElementById('modal-box'), R=ov.getBoundingClientRect(), w=document.querySelector('.wrap');
  return { costado:document.body.classList.contains('ficha-costado'), abierta:ov.classList.contains('on'), ficha:box.classList.contains('fl-ficha'),
    izq:Math.round(R.left), ancho:Math.round(R.width), w:innerWidth, margen:getComputedStyle(w).marginRight,
    sel:[].map.call(document.querySelectorAll('.af-sel'), function(x){ return x.getAttribute('data-pid'); }).join(),
    vista:(document.querySelector('.view.active')||{}).id||'', cli:/CLIENTE DOS/.test(box.innerText) };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, init){
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    await ctx.addInitScript(init || (()=>{ window.FICHA_COSTADO_PRUEBA=1; window.ADM_FICHAS_PRUEBA=1; }));
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { showView('admin'); renderAdmin(); });
    await page.waitForTimeout(200);
    page._ctx=ctx; return page;
  }
  const tocarFicha = p => p.evaluate(() => { var f=document.querySelector('.af-f[data-pid="p2"]'); if(f) f.click(); else showPedidoModal('p2'); });
  const tam = async (p, w) => { await p.setViewportSize({ width:w, height:900 }); await p.waitForTimeout(250); };

  // ═══ 1 · Cambiar de pestaña ═══
  console.log('\n── 1. Cambiar de pestaña con la ficha al costado ──');
  let page = await abrir(1440);
  await tocarFicha(page); await page.waitForTimeout(150);
  let r = await page.evaluate(ESTADO);
  chk('a 1440 px, desde Administración, la ficha se abre al costado (como siempre)', r.costado && r.abierta && r.ficha && r.cli && r.izq>r.w*0.3 && r.sel==='p2', r);
  await page.click('#tab-mis'); await page.waitForTimeout(200);
  r = await page.evaluate(ESTADO);
  chk('tocar «Mis pedidos» cierra la ficha del costado (antes quedaba encima de Mis pedidos)', !r.costado && !r.abierta && r.vista==='view-mis', r);
  chk('…y la página vuelve a su ancho: sin el margen de la ficha y sin la marca en la lista', r.margen==='0px' && r.sel==='', r);
  await page.evaluate(() => { showView('admin'); renderAdmin(); }); await page.waitForTimeout(150);
  await tocarFicha(page); await page.waitForTimeout(150);
  await page.evaluate(() => showView('conta')); await page.waitForTimeout(200);
  r = await page.evaluate(ESTADO);
  chk('lo mismo yendo a Contabilidad por código (showView)', !r.costado && !r.abierta && r.vista==='view-conta', r);
  await page.evaluate(() => { showView('admin'); renderAdmin(); }); await page.waitForTimeout(150);
  await tocarFicha(page); await page.waitForTimeout(150);
  await page.evaluate(() => showView('admin')); await page.waitForTimeout(150);
  r = await page.evaluate(ESTADO);
  chk('volver a mostrar Administración (sin cambiar de pestaña) NO la cierra', r.costado && r.abierta && r.sel==='p2', r);
  await page.evaluate(() => closeModal());

  // ═══ 2 · Cambiar el tamaño ═══
  console.log('\n── 2. Cruzar los 1200 px con la ficha abierta ──');
  await tocarFicha(page); await page.waitForTimeout(150);
  await tam(page, 820);
  r = await page.evaluate(ESTADO);
  chk('achicar a 820 px pasa la ficha al medio (antes seguía al costado con 492 px)', !r.costado && r.abierta && r.ficha && r.cli, r);
  chk('…como la ventana de siempre: ocupa todo el ancho, sin margen en la página ni marca en la lista', r.izq===0 && r.ancho===r.w && r.margen==='0px' && r.sel==='', r);
  await tam(page, 1199);
  r = await page.evaluate(ESTADO);
  chk('a 1199 px sigue en el medio', !r.costado && r.abierta, r);
  await tam(page, 1440);
  r = await page.evaluate(ESTADO);
  chk('agrandar otra vez a 1440 px la vuelve al costado, con el pedido marcado', r.costado && r.abierta && r.ficha && r.izq>r.w*0.3 && r.sel==='p2', r);
  await page.evaluate(() => closeModal());
  await page._ctx.close();

  page = await abrir(820);
  await tocarFicha(page); await page.waitForTimeout(150);
  r = await page.evaluate(ESTADO);
  chk('abierta a 820 px (iPad parado), en el medio como siempre', !r.costado && r.abierta && r.ficha, r);
  await tam(page, 1440);
  r = await page.evaluate(ESTADO);
  chk('…al agrandar a 1440 px se vuelve a decidir: al costado, con el pedido marcado', r.costado && r.abierta && r.sel==='p2', r);
  await page.evaluate(() => closeModal());
  r = await page.evaluate(ESTADO);
  chk('cerrar devuelve todo como estaba', !r.costado && !r.abierta && r.sel==='' && r.margen==='0px', r);
  await page._ctx.close();

  // ═══ 3 · Lo que no cambia ═══
  console.log('\n── 3. Lo que no se pone al costado ──');
  page = await abrir(820);
  await page.evaluate(() => { showView('mis'); showPedidoModal('p2'); }); await page.waitForTimeout(150);
  await tam(page, 1440);
  r = await page.evaluate(ESTADO);
  chk('una ficha abierta fuera de Administración no pasa al costado al agrandar', !r.costado && r.abierta, r);
  await page.evaluate(() => { closeModal(); showView('admin'); renderAdmin(); openModal('<div class="modal-h"><h3>Otra ventana</h3></div><div class="modal-b">hola</div>'); });
  await tam(page, 820); await tam(page, 1440);
  r = await page.evaluate(ESTADO);
  chk('otra ventana (no la ficha) tampoco', !r.costado && r.abierta && !r.ficha, r);
  await page.evaluate(() => closeModal());
  await page._ctx.close();
  page = await abrir(820, ()=>{ window.ADM_FICHAS_PRUEBA=1; });
  await tocarFicha(page); await page.waitForTimeout(150);
  await tam(page, 1440);
  r = await page.evaluate(ESTADO);
  chk('en las pruebas sin FICHA_COSTADO_PRUEBA, en el medio aunque se agrande', !r.costado && r.abierta, r);
  await page._ctx.close();

  chk('sin errores de JavaScript', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
