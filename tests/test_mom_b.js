/* 📊 MoM B EN PROYECCIÓN (§4nj, 27/10; dueño: «falta el mom en unidades y monto… cómo sé cuánto vendió el mes pasado vs lo de ahora… en
   ventas, unidades y Bs», y de las muestras eligió la B: «tocar y se abre»).
   Lo que cuida esta prueba: cada vendedor con MoM se toca (y con Enter) y abre debajo su tablita con el mes de comparación A ESTA ALTURA,
   este mes, la diferencia y el % en ventas, unidades y Bs (las cuentas de `pryMomDe`, las del % de la fila), el mes de comparación entero
   abajo y la línea de unidades; se cierra tocando otra vez; queda abierta al repintar; tocar adentro no la cierra; la fila se sigue leyendo
   igual; sin mes de comparación no hay nada que tocar; en el celular entra sin correr la página.
   Reloj clavado: viernes 23/10/2026 15:00 de Bolivia (los pedidos de la prueba de la 11).   Se corre:  node tests/test_mom_b.js */
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
  window.FERIADOS_PASADOS={};
  var n=0;
  /* Una venta: `bs` su total (como saldo), `fecha` la entrega agendada, `reg` cuándo se cargó (día y hora de Bolivia). */
  window.V=function(vend, fecha, bs, reg, o){
    o=o||{}; n++;
    return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:'AM',
      productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
      ts:new Date(reg+(reg.length===10?'T10:00:00':'')+'-04:00').getTime(), rev:new Date(reg+(reg.length===10?'T10:00:00':'')+'-04:00').getTime(), fotos:[] }, o);
  };
  window.FIX=function(){ n=0; return [
    // Mirian: septiembre 1.000 (día 5) + 2.000 (día 20) + 3.000 (día 28) = 6.000; al día 23 iba 3.000. Octubre 1.500 (día 3) + 2.400 (hoy) = 3.900 → +30 %.
    V('Mirian Salazar','2026-09-08',1000,'2026-09-05'), V('Mirian Salazar','2026-09-24',2000,'2026-09-20'), V('Mirian Salazar','2026-09-30',3000,'2026-09-28'),
    V('Mirian Salazar','2026-10-06',1500,'2026-10-03'), V('Mirian Salazar','2026-10-27',2400,'2026-10-23T09:12:00'),
    // Maria: septiembre 4.000 (día 2), octubre 2.000 (día 8) → −50 %.
    V('Maria Flores','2026-09-04',4000,'2026-09-02'), V('Maria Flores','2026-10-12',2000,'2026-10-08'),
    // Hoy: Maria cargó otra a las 11:40 (para noviembre: no cambia octubre)
    V('Maria Flores','2026-11-03',5000,'2026-10-23T11:40:00'),
    // Una entrega marcada en el cierre de hoy a las 14:20, y un pago de hoy de una venta de otro día
    V('Carola Chavez','2026-10-23',3000,'2026-10-20', { entregado:true, productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1,eF:'2026-10-23',eT:new Date('2026-10-23T14:20:00-04:00').getTime(),eQ:'Ernesto Logística'}] }),
    V('Carola Chavez','2026-10-25',2000,'2026-10-19', { metodoPago:'Efectivo 800 @2026-10-23 #1200', acuenta:0, saldo:1200, rev:new Date('2026-10-23T13:05:00-04:00').getTime() })
  ]; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w){
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { STATE=FIX(); UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); });
    page._ctx=ctx; return page;
  }
  const fila = nom => 'document.querySelector'; // (solo para leer)
  let page = await abrir();
  let r = await page.evaluate(() => {
    var F=[].slice.call(document.querySelectorAll('#pry-vendedores .pry-fila'));
    var mir=F.find(function(x){ return /Mirian/.test(x.innerText); });
    return { tocables:F.filter(function(x){ return x.classList.contains('pry-toca'); }).length, total:F.length,
             rol:mir && mir.getAttribute('role'), tab:mir && mir.getAttribute('tabindex'), exp:mir && mir.getAttribute('aria-expanded'),
             txt:mir ? mir.innerText.replace(/\s+/g,' ') : '', intro:document.getElementById('pry-vendedores').innerText.replace(/\s+/g,' ') };
  });
  chk('cada vendedor con su MoM se puede tocar (role=button, con teclado) y arranca cerrado', r.tocables>=3 && r.rol==='button' && r.tab==='0' && r.exp==='false', r);
  chk('arriba lo dice: «Tocá un vendedor para verlo contra septiembre en ventas, unidades y Bs.»', /Tocá un vendedor para verlo contra septiembre en ventas, unidades y Bs\./.test(r.intro), r.intro.slice(0,300));
  chk('la fila se sigue leyendo igual (nombre, detalle, vendido, proyección, el MoM) y al final «ventas · unidades ▸»', /^Mirian Salazar \d+ venta.*Bs 3\.900,00 📈 Bs [\d.]+ ▲ 30% vs sep.*ventas · unidades ▸$/.test(r.txt), r.txt);
  await page.click('#pry-vendedores .pry-fila[data-vk*="mirian"] .pry-q');
  r = await page.evaluate(() => {
    var f=document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"]'), d=f && f.querySelector('.pry-mom-det');
    var th=d ? [].map.call(d.querySelectorAll('thead th'), function(x){ var lg=x.querySelector('.pmd-lg'); return lg ? lg.textContent : x.textContent; }) : [];
    var tr=d ? [].map.call(d.querySelectorAll('tbody tr'), function(x){ return [].map.call(x.children, function(c){ return c.textContent; }); }) : [];
    return { abre:!!d, exp:f.getAttribute('aria-expanded'), th:th, tr:tr, ent:d ? (d.querySelector('.pmd-ent')||{}).textContent : '', svg:!!(d && d.querySelector('.pmd-l polyline')),
             ab:(f.querySelector('.pry-mom-ab')||{}).textContent };
  });
  chk('tocar a Mirian abre su tablita debajo', r.abre && r.exp==='true' && r.ab==='▾ cerrar', r);
  chk('…columnas: septiembre a esta altura (al 23, 15:00), octubre al 23, diferencia y %', JSON.stringify(r.th)===JSON.stringify(['','septiembre al 23, 15:00','octubre al 23','Diferencia','%']), r.th);
  chk('…ventas 2 → 2 (= 0%), unidades 2 → 2, Bs 3.000 → 3.900 (+900, ▲ 30%): los Bs son los del % de la fila', JSON.stringify(r.tr)===JSON.stringify([['Ventas','2','2','0','= 0%'],['Unidades','2','2','0','= 0%'],['Bs','Bs 3.000','Bs 3.900','+900','▲ 30%']]), r.tr);
  chk('…abajo, septiembre entero (3 ventas · 3 unidades · Bs 6.000: con la del 28/09), y la línea de unidades', r.ent==='Septiembre entero: 3 ventas · 3 unidades · Bs 6.000' && r.svg, r);
  r = await page.evaluate(() => { var f=document.querySelector('#pry-vendedores .pry-fila[data-vk*="maria"]'); f.click(); var d=f.querySelector('.pry-mom-det');
    return d ? [].map.call(d.querySelectorAll('tbody tr'), function(x){ return [].map.call(x.children, function(c){ return c.textContent; }); }) : null; });
  chk('Maria: 1 venta y 1 unidad contra 1 y 1 (= 0%), Bs 4.000 → 2.000 (−2.000, ▼ 50%)', r && JSON.stringify(r)===JSON.stringify([['Ventas','1','1','0','= 0%'],['Unidades','1','1','0','= 0%'],['Bs','Bs 4.000','Bs 2.000','−2.000','▼ 50%']]), r);
  r = await page.evaluate(() => { var d=document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"] .pry-mom-det'); d.querySelector('td').click();
    var sigue=!!document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"] .pry-mom-det');
    renderProyeccion(); var tras=!!document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"] .pry-mom-det'), m2=!!document.querySelector('#pry-vendedores .pry-fila[data-vk*="maria"] .pry-mom-det');
    return { sigue:sigue, tras:tras, m2:m2 }; });
  chk('tocar adentro de la tablita no la cierra, y al repintar Proyección las abiertas siguen abiertas', r.sigue && r.tras && r.m2, r);
  r = await page.evaluate(() => { var f=document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"]'); f.click(); return { det:!!f.querySelector('.pry-mom-det'), exp:f.getAttribute('aria-expanded'), ab:(f.querySelector('.pry-mom-ab')||{}).textContent }; });
  chk('tocar la fila otra vez la cierra', !r.det && r.exp==='false' && r.ab==='ventas · unidades ▸', r);
  await page.focus('#pry-vendedores .pry-fila[data-vk*="carola"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  r = await page.evaluate(() => { var f=document.querySelector('#pry-vendedores .pry-fila[data-vk*="carola"]'); return { det:!!(f && f.querySelector('.pry-mom-det')), exp:f && f.getAttribute('aria-expanded') }; });
  chk('con el teclado: Enter sobre un vendedor también la abre', r.det && r.exp==='true', r);
  r = await page.evaluate(() => { document.getElementById('pry-mes').value='2026-09'; renderProyeccion();
    return { toca:document.querySelectorAll('#pry-vendedores .pry-fila.pry-toca').length, intro:/Tocá un vendedor/.test(document.getElementById('pry-vendedores').innerText) }; });
  chk('septiembre (sin agosto en el panel para comparar): no hay nada que tocar ni la frase', r.toca===0 && !r.intro, r);
  await page._ctx.close();

  page = await abrir(390);
  await page.evaluate(() => { var f=document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"]'); f.click(); f.scrollIntoView(); });
  await page.waitForTimeout(150);
  r = await page.evaluate(() => { var d=document.querySelector('#pry-vendedores .pry-fila[data-vk*="mirian"] .pry-mom-det'), b=d.getBoundingClientRect(), tw=d.querySelector('.pmd-tw');
    var fila=d.closest('.pry-fila').getBoundingClientRect(), cortos=[].map.call(d.querySelectorAll('thead .pmd-co'), function(x){ return getComputedStyle(x).display!=='none' ? x.textContent : ''; });
    return { pagina:document.documentElement.scrollWidth<=innerWidth+1, dentro:b.left>=fila.left-1 && b.right<=fila.right+1, tabla:tw.scrollWidth<=tw.clientWidth+1, dif:getComputedStyle(d.querySelector('th.pmd-dif')).display, cortos:cortos }; });
  chk('en el celular (390 px) la tablita entra en su fila sin correr nada (sin «Diferencia», y «sep. al 23» / «oct. al 23»)', r.pagina && r.dentro && r.tabla && r.dif==='none' && r.cortos.join()==='sep. al 23,oct. al 23', r);
  await page._ctx.close();

  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
