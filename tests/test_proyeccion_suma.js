/* ➕ LO VENDIDO SIN ENTREGAR SE SUMA A LO QUE SE VA A VENDER (§4ii, 08/10).
   El dueño, mirando «🏭 Qué producir»: *«especial semi ortopédico dice 9 sin entregar, hay 6 y solo pide 3 para los próximos 7
   días… siendo que tiene 9 pendientes, a un ritmo de 1 por día… revisá la lógica para todos los productos, NO PUEDE PASAR ESTO»*.
   La cuenta tomaba el MAYOR entre «ya vendido» (9) y «ritmo × días» (0,93 × 8 = 7,5): con más vendido que ritmo, la reserva para
   la venta de la semana desaparecía y se pedía solo 9 − 4 (Banzer) = 5, de los que 2 se traen de Moreno → «7 días: 3».
   Ahora se SUMAN (la misma regla que el dueño dio para Banzer o PTF, §4hw).
   Se prueba con el caso de su captura armado con datos inventados (reloj clavado en el jueves 08/10/2026 a las 10:00 de Bolivia):
     · 7 días = 11 (antes 3), 15 días = 22 (antes 13), y «cubre hasta» se corre por la venta que viene;
     · lo que rota poco (sin ritmo) sigue pidiendo solo lo vendido, como antes;
     · para TODOS los productos de la tabla: lo que se pide alcanza para lo vendido MÁS el ritmo;
     · el «Cómo se calcula» dice «Se suman».
   Se corre:  node tests/test_proyeccion_suma.js        Dientes:  PEDIDOS=/ruta/a/pedidos_cdc1fab.html node tests/test_proyeccion_suma.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1500, height:1000 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const ev = async (fn,arg) => { try{ return await page.evaluate(fn,arg); }catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(()=>{
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; if(window.CARGA_TIMER) clearTimeout(CARGA_TIMER); if(window.CARGA_TIC) clearInterval(CARGA_TIC);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
    var hoy=todayStr(), dia=function(n){ var d=new Date(hoy+'T12:00:00'); d.setDate(d.getDate()+n); return isoLocal(d); };
    var LOG='PRODUCTOS TERMINADOS FAB.', IM='IM - PRODUCTOTERMINADO', BZ='01-05-025  Almacen Distribucion Banzer';
    var SEMI={ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107' };
    var POCO={ desc:'ORO BI RELAX', medida:'160x190', codigo:'CH1770' };
    var kS=stockClave(SEMI), kP=stockClave(POCO);
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.g[BZ]={ f:hoy, hora:'08:10:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[IM]='trae'; st.al[BZ]='sale';
    st.c.u[kS]=0; st.g[BZ].u[kS]=4; st.g[IM].u[kS]=2;        // la captura: 0 acá · 4 Banzer · 2 Moreno
    st.c.u[kP]=0;
    var n=0, P=function(o){ n++; return Object.assign({ id:'t'+n, oc:'10-'+(100+n), vendedor:'Maria Flores', cliente:'CLIENTE '+n, celular:'7000'+(1000+n),
      turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:true, saldo:0, ts:Date.now()-n*1000, metodoPago:'', observaciones:'', estado:'',
      entregado:false, vehiculo:'', chofer:'', garantia:'', nota:String(500+n), acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[] }, o); };
    var L=[];
    /* 14 unidades en 12 entregas del equipo en los últimos 15 días (ritmo 0,93/día, rotación «media») */
    [1,1,1,1,1,1,1,1,1,1,2,2].forEach(function(u,i){ L.push(P({ fecha:dia(-(i+1)), entregado:true, productos:[Object.assign({cant:u},SEMI)] })); });
    /* 9 vendidas y sin entregar, de mañana a la semana que viene */
    [1,2,3,4,5,6,7,8,9].forEach(function(d){ L.push(P({ fecha:dia(d), productos:[Object.assign({cant:1},SEMI)] })); });
    /* lo que rota poco: 1 entrega en 15 días y 2 vendidas sin entregar */
    L.push(P({ fecha:dia(-3), entregado:true, productos:[Object.assign({cant:1},POCO)] }));
    L.push(P({ fecha:dia(4), productos:[Object.assign({cant:2},POCO)] }));
    STATE=L; STOCK=st; if(typeof stockOlvidarIndice==='function') stockOlvidarIndice();
    window._kS=kS; window._kP=kP;
  });

  console.log('\n── 1. El ESPECIAL SEMIORTOPEDICO de la captura ──');
  let r = await ev(()=>{
    var d=stockData(), o=d.lista.filter(function(x){ return x.k===_kS; })[0]; if(!o) return null;
    var MS=stockMesSiguiente(todayStr()), pr=stockProducirDe(o, MS, ventasPanelIndex ? ventasPanelIndex() : null);
    return { comp:o.comp, porDia:+o.porDia.toFixed(3), rot:o.rotacion, lead:o.lead, margen:o.margen, cubrir:o.cubrir, hay:stockHaySalir(o), enOtros:o.enOtros,
      pedir:o.pedir, recoger:o.recoger, fabricar:o.fabricar, sem:pr.sem, quin:pr.quin, corte:o.corte, dias:o.dias, aviso:o.aviso };
  });
  chk('el escenario es el de la captura: 9 sin entregar, 0,93 por día (rotación media), 4 en Banzer y 2 en Moreno',
    r && r.comp===9 && r.porDia===0.933 && r.rot==='media' && r.hay===4 && r.enOtros===2, r);
  chk('7 días: 9 vendidas + 0,93 × 8 días (3 fábrica + 2 margen + 3 reserva) = 16,5 − 4 para cargar → pedir 13: traer 2 de Moreno y PRODUCIR 11 (antes 3)',
    r && r.pedir===13 && r.recoger===2 && r.fabricar===11 && r.sem===11, r);
  chk('15 días: 9 + 0,93 × 20 = 27,7 − 6 (Banzer + Moreno) → 22 (antes 13), nunca menos que la de 7 días',
    r && r.quin===22 && r.quin>=r.sem, r);
  chk('el aviso pide fabricar (no «alcanza»)', r && (r.aviso==='urgente'||r.aviso==='pedir'), r && r.aviso);

  console.log('\n── 2. Lo que rota poco sigue como antes ──');
  r = await ev(()=>{ var o=stockData().lista.filter(function(x){ return x.k===_kP; })[0]; return o ? { rot:o.rotacion, porDia:o.porDia, comp:o.comp, pedir:o.pedir, fabricar:o.fabricar } : null; });
  chk('1 entrega en 15 días: sin ritmo, pide solo las 2 vendidas', r && r.rot==='baja' && r.porDia===0 && r.comp===2 && r.pedir===2, r);

  console.log('\n── 3. Para TODOS los productos de la tabla ──');
  r = await ev(()=>{
    var mal=[];
    stockData().lista.forEach(function(o){
      var hay=stockHaySalir(o); if(hay==null || o.descont) return;
      var nec=(o.comp||0)+o.porDia*(o.lead+o.margen+(o.cubrir==null?STOCK_CUBRIR:o.cubrir));
      var cubre=hay+stockEnCaminoSeguro(o)+o.pedir;
      if(cubre+1e-9<nec) mal.push(o.desc+' '+o.medida+': cubre '+cubre+' y hacen falta '+nec.toFixed(2));
      if(o.fabricar+o.recoger!==o.pedir) mal.push(o.desc+': producir + traer ≠ pedir');
    });
    return mal;
  });
  chk('lo que hay + lo que viene + lo que se pide alcanza para lo vendido MÁS el ritmo, en cada producto', Array.isArray(r) && r.length===0, r);

  console.log('\n── 4. «Cubre hasta» cuenta la venta que viene ──');
  r = await ev(()=>{ var o=stockData().lista.filter(function(x){ return x.k===_kS; })[0];
    /* con 4 para cargar: mañana sale 1 vendida + 0,93 × 2 días = 2,9; pasado, 2 + 2,8 = 4,8 > 4 → se corta el 10/10 */
    return { corte:o.corte, dias:o.dias }; });
  chk('con 4 para cargar se corta el sábado 10/10 (vendido + ritmo), no cuando se terminan solo las vendidas', r && r.corte==='2026-10-10' && r.dias===2, r);

  console.log('\n── 5. El «Cómo se calcula» lo dice ──');
  r = await ev(()=>{ var o=stockData().lista.filter(function(x){ return x.k===_kS; })[0]; var t=document.createElement('div'); t.innerHTML=stockSaldoDetalleHtml(o); return t.innerText.replace(/\s+/g,' '); });
  chk('dice «Se suman» y la necesidad 16,47', typeof r==='string' && /Se suman/.test(r) && !/Se toma el mayor/.test(r) && /16[.,]47/.test(r), typeof r==='string' ? (r.match(/Cómo se calcula.{0,400}/)||[r.slice(0,300)])[0] : r);

  chk('ningún error de JavaScript', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
