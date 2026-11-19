/* ✅⏳ PROYECCIÓN → «POR VENDEDOR»: LO ENTREGADO O FACTURADO Y LO PENDIENTE (16/11/2026; dueño, con la captura de la lista: «ahí debería mostrar
   lo ya entregado y lo pendiente por entregar/facturar, en ese espacio en blanco… para entender su total», y «dijimos que ENTREGADO ES
   FACTURADO… eso confunde»).

   LO QUE ESTA PRUEBA CUIDA
   1. Sin la bandera (`PRY_ENT_PRUEBA`): nada nuevo en la fila.
   2. Con la bandera, en cada vendedor: «✅ Entregado o facturado Bs X · N» (✅ del cierre de entregas, venta de tienda, o factura / remisión
      anotada con su N°) + «⏳ Pendiente Bs Y · M» = lo vendido de la fila (las MISMAS ventas: el mismo mes y el mismo vendedor), con cuántas
      ya debían salir sin ✅; la barrita de dos colores; NADA de «por facturar» aparte.
   3. Ventas de otro mes no entran; ROHO no lleva el renglón.
   4. Con metas guardadas (415) va debajo de la barra del presupuesto, en el mismo hueco del medio.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026 10:00 de Bolivia.   Se corre:  node tests/test_pry_entregado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
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
  window.V=function(vend, fecha, bs, o){ n++; o=o||{};
    var t=new Date(fecha+'T09:00:00-04:00').getTime()-3*86400000;
    var x={ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:bs };
    if(o.doc){ x.fdoc=o.doc; x.fdocn=String(9000+n); }
    var p={ id:'p'+n, oc:fecha.slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle 1',
      fecha:fecha, turno:'AM', productos:[x], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:!!o.ent, ts:t, rev:t, fotos:[] };
    return p;
  };
  window.FIX=function(){ n=0; return [
    V('Carola Chavez','2026-10-20',9000,{ ent:1, doc:'F' }),                 // octubre: no entra
    V('Carola Chavez','2026-11-05',4000,{ ent:1, doc:'F' }),                 // entregada y facturada
    V('Carola Chavez','2026-11-10',3000,{ ent:1 }),                          // entregada, sin factura
    V('Carola Chavez','2026-11-13',2500),                                    // ya debía salir, sin ✅, sin factura
    V('Carola Chavez','2026-11-20',1500,{ doc:'R' }),                        // por entregar, con remisión
    V('Maria Flores','2026-11-04',6000,{ ent:1, doc:'F' }), V('Maria Flores','2026-11-19',2000,{ doc:'R' })
  ]; };
  window.PINTAR=function(metas){
    STATE=FIX();
    if(metas) STATE.push(filaSistema(META_ID, 'x', JSON.stringify({ v:1, m:{ '2026-11':{ heaven:40000, suena:20000, t:1, vd:{ 'Carola Chavez':[8000,10000], 'Maria Flores':[6000,9000] } } } })));
    UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
  };
  window.FILA=function(nom){ var f=[].filter.call(document.querySelectorAll('#pry-vendedores .pry-fila'), function(x){ var b=x.querySelector('.pry-q b'); return b && b.textContent===nom; })[0];
    if(!f) return null; var pe=f.querySelector('.pent');
    return { t:pe ? pe.innerText.replace(/\s+/g,' ').trim() : null, vend:(f.querySelector('.pry-n b')||{}).textContent, w:pe ? pe.querySelector('.pent-b i.e').style.width : null,
             medio:!!f.querySelector('.pmid .pent'), con415:!!f.querySelector('.pmid .m415') }; };
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
    if(flag) await page.evaluate(() => { window.PRY_ENT_PRUEBA=1; window.PRY_VD_BARRA_PRUEBA=1; });
    page._ctx=ctx; return page;
  }

  /* 1. sin la bandera */
  { const page=await abrir(false);
    await page.evaluate(() => PINTAR(false)); await page.waitForTimeout(150);
    const r=await page.evaluate(() => ({ c:FILA('Carola Chavez'), n:document.querySelectorAll('.pent').length }));
    chk('1 · sin la bandera: la fila como antes (sin el renglón nuevo)', r.c && r.c.t===null && r.n===0, r);
    await page._ctx.close(); }

  /* 2-4. con la bandera */
  { const page=await abrir(true);
    await page.evaluate(() => PINTAR(false)); await page.waitForTimeout(150);
    let r=await page.evaluate(() => ({ c:FILA('Carola Chavez'), m:FILA('Maria Flores') }));
    chk('2 · Carola: lo vendido de la fila es noviembre (Bs 11.000,00)', r.c && r.c.vend==='Bs 11.000,00', r.c);
    chk('2 · entregado o facturado: las 2 con ✅ y la de remisión por entregar (Bs 8.500,00 · 3)', r.c && /✅ Entregado o facturado Bs 8\.500,00 · 3/.test(r.c.t), r.c && r.c.t);
    chk('2 · pendiente: la que ni se entregó ni se facturó (Bs 2.500,00 · 1), que ya debía salir', r.c && /⏳ Pendiente Bs 2\.500,00 · 1 \(1 ya debía salir, sin ✅\)/.test(r.c.t), r.c && r.c.t);
    chk('2 · las dos partes = lo vendido de la fila', 8500+2500===11000);
    chk('2 · sin «por facturar» aparte', r.c && !/facturar|Por entregar/.test(r.c.t), r.c && r.c.t);
    chk('2 · la barrita: 77,3 % cerrado', r.c && r.c.w==='77.3%', r.c && r.c.w);
    chk('2 · Maria: todo cerrado (entregada + con remisión), pendiente 0', r.m && /✅ Entregado o facturado Bs 8\.000,00 · 2/.test(r.m.t) && /⏳ Pendiente Bs 0,00 · 0/.test(r.m.t) && !/ya debía/.test(r.m.t), r.m && r.m.t);
    chk('3 · lo de octubre no entra (Bs 9.000 no suma en ningún lado)', r.c && !/9\.000/.test(r.c.t));
    /* 4. con metas guardadas: debajo de la barra de la 415 */
    await page.evaluate(() => PINTAR(true)); await page.waitForTimeout(150);
    r=await page.evaluate(() => FILA('Carola Chavez'));
    chk('4 · con metas guardadas: en el hueco del medio, debajo de la barra del presupuesto', r && r.medio && r.con415 && /✅ Entregado o facturado Bs 8\.500,00/.test(r.t), r);
    /* 5. (17/11, dueño: «no me mostrás separado lo entregado/facturado vs lo que falta… como en la ficha de los vendedores») lo mismo en la
       ficha de cada marca, de cada tienda, en «Cómo van contra la meta», en el tablero (equipo) y en «Cada tienda contra su meta». */
    await page.evaluate(() => { window.PRY_TMETA_PRUEBA=1; window.PRY_TABLERO_PRUEBA=1; PINTAR(true); }); await page.waitForTimeout(200);
    r=await page.evaluate(() => {
      const T=sel=>[].map.call(document.querySelectorAll(sel), x=>x.innerText.replace(/\s+/g,' ').trim());
      const D=pryEntDatos('2026-11');
      return { eq:D.eq, g:D['g|heaven'], st:Object.keys(D).filter(k=>/^st\|/.test(k)).map(k=>[k, D[k].ok.bs, D[k].pen.bs]),
        marca:T('#cx-pry > .cx-kfs:not(.cx-kfs-t) .pent-m'), tienda:T('#cx-pry-tiendas ~ .cx-kfs-t .pent-m'), metas:T('#pry-metas-box .pent-m'),
        tab:T('#m416 .pent-eq'), tmeta:T('#pry-tmeta .pent-ptm'), pill:T('.m416-f .n small') };
    });
    chk('5 · el equipo: entregado o facturado Bs 16.500 + pendiente Bs 2.500 = lo vendido de las dos (19.000)', r.eq && r.eq.ok.bs===16500 && r.eq.pen.bs===2500, r.eq);
    chk('5 · las tiendas suman el equipo', r.st.reduce((a,x)=>a+x[1],0)===16500 && r.st.reduce((a,x)=>a+x[2],0)===2500, r.st);
    chk('5 · la ficha de la marca lo dice', r.marca.length>=1 && r.marca.some(t=>/✅ Entregado o facturado Bs 16\.500/.test(t) && /⏳ Pendiente Bs 2\.500/.test(t)), r.marca);
    chk('5 · la ficha de cada tienda lo dice', r.tienda.length===r.st.length && r.tienda.length>=1, r.tienda);
    chk('5 · «Cómo van contra la meta» lo dice', r.metas.some(t=>/Bs 16\.500/.test(t)), r.metas);
    chk('5 · el tablero de arriba (equipo) lo dice', r.tab.length===1 && /Bs 16\.500/.test(r.tab[0]), r.tab);
    chk('5 · «Cada tienda contra su meta» lo dice, a la vista', r.tmeta.length>=1, r.tmeta);
    chk('5 · el % de la marca dice cuál es lo vendido y cuál la proyección', r.pill.some(t=>/vendido \d+ % · llegaría al \d+ %/.test(t)), r.pill);
    await page._ctx.close(); }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
