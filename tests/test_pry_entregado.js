/* 🚚🧾 PROYECCIÓN → «POR VENDEDOR»: LO ENTREGADO, LO QUE FALTA ENTREGAR Y LO QUE FALTA FACTURAR (16/11/2026; dueño, con la captura de la
   lista: «ahí debería mostrar lo ya entregado y lo pendiente por entregar/facturar, en ese espacio en blanco… para entender su total»).

   LO QUE ESTA PRUEBA CUIDA
   1. Sin la bandera (`PRY_ENT_PRUEBA`): nada nuevo en la fila.
   2. Con la bandera, en cada vendedor: «✅ Entregado Bs X · N» (✅ del cierre de entregas o venta de tienda) + «🚚 Por entregar Bs Y · M»
      = lo vendido de la fila (las MISMAS ventas: el mismo mes y el mismo vendedor), con cuántas ya debían salir sin ✅; «🧾 Por facturar
      Bs Z · K» (sin factura ni remisión) o «Todo facturado o con remisión»; la barrita de dos colores con el % entregado.
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
    chk('2 · entregado: las 2 con ✅ (Bs 7.000,00 · 2)', r.c && /✅ Entregado Bs 7\.000,00 · 2/.test(r.c.t), r.c && r.c.t);
    chk('2 · por entregar: 2 (Bs 4.000,00), y 1 ya debía salir sin ✅', r.c && /🚚 Por entregar Bs 4\.000,00 · 2 \(1 ya debía salir, sin ✅\)/.test(r.c.t), r.c && r.c.t);
    chk('2 · entregado + por entregar = lo vendido de la fila', 7000+4000===11000);
    chk('2 · por facturar: las 2 sin factura ni remisión (Bs 5.500,00 · 2)', r.c && /🧾 Por facturar Bs 5\.500,00 · 2/.test(r.c.t), r.c && r.c.t);
    chk('2 · la barrita: 63,6 % entregado', r.c && r.c.w==='63.6%', r.c && r.c.w);
    chk('2 · Maria: todo facturado o con remisión', r.m && /Todo facturado o con remisión/.test(r.m.t) && /✅ Entregado Bs 6\.000,00 · 1/.test(r.m.t) && /🚚 Por entregar Bs 2\.000,00 · 1/.test(r.m.t) && !/ya debía/.test(r.m.t), r.m && r.m.t);
    chk('3 · lo de octubre no entra (Bs 9.000 no suma en ningún lado)', r.c && !/9\.000/.test(r.c.t));
    /* 4. con metas guardadas: debajo de la barra de la 415 */
    await page.evaluate(() => PINTAR(true)); await page.waitForTimeout(150);
    r=await page.evaluate(() => FILA('Carola Chavez'));
    chk('4 · con metas guardadas: en el hueco del medio, debajo de la barra del presupuesto', r && r.medio && r.con415 && /✅ Entregado Bs 7\.000,00/.test(r.t), r);
    await page._ctx.close(); }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
