/* 🛏️ PROYECCIÓN → «LO VENDIDO POR LÍNEA» (17/11/2026; dueño: «¿Dónde vemos qué productos vendieron por línea? Y una tabla de ejemplo 40 ice
   30 etc. En proyección al final?»).

   LO QUE ESTA PRUEBA CUIDA
   1. Sin la bandera (`PRY_LINEAS_PRUEBA`): la caja queda vacía.
   2. Con la bandera: por marca y línea, colchones y somieres con su cantidad (un combo = 1 + 1); TITANIO junta ICE y LATEX (la regla de
      `atciProdDe`), CLOUD es línea de Heaven; almohadas y sábanas no cuentan; ventas de otro mes no entran.
   3. La suma de las líneas = las unidades de «Por vendedor» (mismo mes, mismas ventas del equipo).
   4. Mayoristas aparte (Eduardo); «Todo» los junta.
   5. Contra el mes anterior (octubre entero: noviembre ya cerró en la prueba = no; acá el mes en curso a esta altura).
   6. Tocar una línea muestra sus productos con las medidas.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026 10:00 de Bolivia.   Se corre:  node tests/test_pry_lineas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  var n=0;
  window.V=function(vend, fecha, prods, ts){ n++;
    var t=ts || (new Date(fecha+'T09:00:00-04:00').getTime()-3*86400000);
    var ps=prods.map(function(a){ return { desc:a[0], medida:a[1], cant:a[2], precio:a[3] }; });
    var bs=ps.reduce(function(s,x){ return s+x.cant*x.precio; }, 0);
    return { id:'p'+n, oc:fecha.slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle 1',
      fecha:fecha, turno:'AM', productos:ps, saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:t, rev:t, fotos:[] };
  };
  window.FIX=function(){ n=0; return [
    V('Carola Chavez','2026-11-05',[['COLCHON TITANIO ICE','160x190',2,5000],['ALMOHADA FIBRA','50x70',2,100]]),
    V('Carola Chavez','2026-11-06',[['COLCHON TITANIO LATEX','200x200',1,8000],['SOMIER TITANIO LATEX','200x200',1,2000]]),
    V('Isabel Robledo','2026-11-09',[['COLCHON CLOUD','105x190',3,900],['SABANAS','140x190',1,300]]),
    V('Isabel Robledo','2026-11-10',[['COLCHON ORO','140x190',1,3500]]),
    V('Maria Flores','2026-11-11',[['COLCHON SOFT','140x190',4,1000]]),
    V('Maria Flores','2026-10-20',[['COLCHON SOFT','140x190',9,1000]], new Date('2026-10-01T09:00:00-04:00').getTime()),   // octubre, temprano
    V('Carola Chavez','2026-10-15',[['COLCHON TITANIO ICE','160x190',1,5000]], new Date('2026-10-02T09:00:00-04:00').getTime()),
    V('Eduardo Añez','2026-11-12',[['COLCHON ORO','140x190',5,3000]])
  ]; };
  window.PINTAR=function(){ STATE=FIX(); UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(flag){
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    if(flag) await page.evaluate(() => { window.PRY_LINEAS_PRUEBA=1; });
    page._ctx=ctx; return page;
  }

  { const page=await abrir(false);
    await page.evaluate(() => PINTAR()); await page.waitForTimeout(150);
    const r=await page.evaluate(() => (document.getElementById('pry-lineas')||{}).innerHTML);
    chk('1 · sin la bandera: la caja vacía', r==='', r);
    await page._ctx.close(); }

  { const page=await abrir(true);
    await page.evaluate(() => PINTAR()); await page.waitForTimeout(150);
    const r=await page.evaluate(() => {
      var D=pryLineasDatos('2026-11','tienda'), L=function(m,l){ var x=D.B[m] && D.B[m].L[l]; return x ? [x.c, x.s, x.u, x.bs] : null; };
      var R=proyeccionMes('2026-11'), uPry=R.marcas.reduce(function(a,m){ return a+m.tot.u; }, 0)+(R.sinMarca ? R.sinMarca.tot.u : 0);
      return { tit:L('heaven','TITANIO'), cloud:L('heaven','CLOUD'), oro:L('heaven','ORO'), soft:L('suena','SOFT'), tot:D.tot, uPry:uPry,
               may:pryLineasDatos('2026-11','mayor').tot, todo:pryLineasDatos('2026-11','todo').tot,
               txt:document.getElementById('pry-lineas').innerText.replace(/\s+/g,' ') };
    });
    chk('2 · TITANIO junta ICE y LATEX: 3 colchones + 1 somier = 4 u., Bs 20.000', JSON.stringify(r.tit)==='[3,1,4,20000]', r.tit);
    chk('2 · CLOUD es línea de Heaven: 3 u. (las sábanas no cuentan)', JSON.stringify(r.cloud)==='[3,0,3,2700]', r.cloud);
    chk('2 · ORO del equipo: 1 (lo de Eduardo va aparte)', r.oro && r.oro[2]===1, r.oro);
    chk('2 · SOFT de noviembre: 4 (las 9 de octubre no)', r.soft && r.soft[2]===4, r.soft);
    chk('2 · almohadas fuera: total 12 unidades (11 colchones + 1 somier)', r.tot.u===12 && r.tot.c===11 && r.tot.s===1, r.tot);
    chk('3 · la suma de las líneas = las unidades de «Por vendedor»', r.tot.u===r.uPry, [r.tot.u, r.uPry]);
    chk('4 · mayoristas: los 5 ORO de Eduardo; Todo = 17', r.may.u===5 && r.todo.u===17, [r.may, r.todo]);
    chk('2 · la tabla dice la línea y el total', /TITANIO/.test(r.txt) && /12 unidades/.test(r.txt) && /Heaven/.test(r.txt) && /Sueña/.test(r.txt), r.txt.slice(0,400));
    const c=await page.evaluate(() => { var D=pryLineasDatos('2026-10','tienda'); return D.tot.u; });
    chk('5 · octubre tiene 10 unidades del equipo (contra lo que se compara)', c===10, c);
    const v=await page.evaluate(() => [].map.call(document.querySelectorAll('#pry-lineas .plin-l'), function(d){ return d.querySelector('.plin-n').textContent+'|'+d.querySelectorAll('summary span')[5].textContent; }));
    chk('5 · «vs octubre» con lo de octubre a esta altura', v.indexOf('SOFT|9 −56%')>=0 && v.indexOf('TITANIO|1 +300%')>=0, v);
    await page.evaluate(() => { [].forEach.call(document.querySelectorAll('#pry-lineas .plin-l'), function(d){ if(d.querySelector('.plin-n').textContent==='TITANIO') d.open=true; }); });
    const p=await page.evaluate(() => [].map.call(document.querySelectorAll('#pry-lineas .plin-l[open] .plin-pr'), function(x){ return x.innerText.replace(/\s+/g,' ').trim(); }));
    chk('6 · tocar TITANIO muestra sus productos con medida', p.length===3 && p.some(function(t){ return /TITANIO ICE 160x190 ×2 2/.test(t); }), p);
    await page.evaluate(() => pryLineasQ('mayor')); await page.waitForTimeout(80);
    const m=await page.evaluate(() => document.getElementById('pry-lineas').innerText.replace(/\s+/g,' '));
    chk('4 · el botón Mayoristas cambia la tabla', /5 unidades/.test(m) && /ORO/.test(m), m.slice(0,300));
    await page._ctx.close(); }

  chk('sin errores de página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(FAIL?1:0);
})();
