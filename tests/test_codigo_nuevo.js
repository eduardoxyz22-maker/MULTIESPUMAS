/* 🏷️ UN CÓDIGO QUE LA LISTA APRENDIÓ DESPUÉS NO PARTE AL PRODUCTO EN DOS (§4ia, 08/10).

   El dueño, con el aviso del control del corte en pantalla («COLCHON SUENA LITE 105X190: −20 sin explicar» y «+20 sin
   explicar») y después de buscar «LITE» en Stock: *«Si, salen dos, está partido. Arréglalo»*.

   Qué pasaba: el Excel de antes del 05/10 guardó el «CH2531 COLCHON SUEÑA LITE 105X190» con su nombre crudo
   (`SUENA LITE|105X190`), porque el CH2531 todavía no estaba en `CODIGOS`, y el mapa de códigos de esa foto quedó apuntando
   ahí. El 05/10 el código entró a la lista: al leer, las unidades pasaban al nombre de la lista, pero el MAPA no, y como el
   código gana sobre cualquier nombre, el Excel nuevo y los pedidos seguían yendo a la clave cruda. Dos filas: 20 en una, los
   pedidos en la otra con 0.

   ⚠️ LO QUE CUIDA (cada «CN» falla contra lo publicado, `2a7c7bd`):
   1. Una sola fila del producto, con lo de PTF y lo de Moreno, y el pedido con el código reservado AHÍ.
   2. El mapa de códigos de cada foto apunta a la clave de la lista: un Excel nuevo con el código no vuelve a partirlo.
   3. El control del corte ya no dice «−20 / +20 sin explicar»: las dos diferencias se funden y, si dan 0, se van.
   4. La detección de esa «entrada» que en neto no hubo queda anulada con lápida (no se ofrece ni resta «en camino»), y
      una salida sin pedido anotada por esa «baja» también. Si en neto sí hubo algo, queda solo eso.
   Y lo de siempre: un código que la lista NO conoce sigue siendo otro producto (§4cy), y leer dos veces da lo mismo.

   Reloj CLAVADO (jueves 08/10/2026, 10:00 de Bolivia).
   Se corre:  node tests/test_codigo_nuevo.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2a7c7bd.html node tests/test_codigo_nuevo.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  var LOG='PRODUCTOS TERMINADOS FAB.', IM='IM - PRODUCTOTERMINADO';
  window._LOG=LOG; window._IM=IM;
  window._CRUDA='SUENA LITE|105X190';                    // como lo guardó el Excel de antes del 05/10 (stockClaveCruda)
  window._CAT='COLCHON SUENA LITE|105X190';              // la clave de la lista (CH2531)
  /* El stock como quedó en la planilla el 08/10: el Excel de Moreno del 04/10 (todavía sin el código en la lista) y el de PTF de
     hoy, que por el mapa viejo cayó en la clave cruda; el corte anterior de PTF lo había dejado en la clave de la lista. */
  window._stock=function(o){
    o=o||{};
    var hoy=todayStr(), K=window._CRUDA, C=window._CAT;
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.c.u[K]=o.ptf!=null ? o.ptf : 20; st.c.cod.CH2531=K;
    st.c.u['SOMIER PARRILLA NEGRO|140X190']=4; st.c.cod.CH1297='SOMIER PARRILLA NEGRO|140X190';   // un código que la lista NO conoce
    st.c.u['SOMIER NEGRO|140X190']=3; st.c.cod.SR2012='SOMIER NEGRO|140X190';
    st.g[IM]={ f:stockSumarDias(hoy,-4), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-4*86400000, rs:{} };
    st.g[IM].u[K]=3; st.g[IM].cod.CH2531=K;
    st.al[LOG]='log'; st.al[IM]='otro';
    var dif=o.ptf!=null ? o.ptf : 20;
    st.h=[{ f:hoy, hora:'08:30:00', alm:LOG, rol:'log', n:3, u:dif+7, ts:Date.now()-3600000, hu:'HU-HOY', d:[[K, dif, []], [C, -20, []]] }];
    st.det=[{ id:'d:HOY-lite', k:K, t:dif, u:dif, f:hoy, hora:'08:30:00', hu:'HU-HOY' }];
    if(o.salida) st.sm=[{ id:'s:HOY-lite', k:C, u:20, f:hoy, ts:Date.now()-3600000, m:'', pre:1, c:[hoy, '08:30:00', 'HU-HOY'] }];
    return st;
  };
  window._pedido=function(){
    return { id:'p-lite', oc:'OC 10-001', fecha:stockSumarDias(todayStr(),1), turno:'AM', cliente:'CLIENTE LITE', vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:[{ codigo:'CH2531', desc:'COLCHON SUEÑA LITE', medida:'105x190', cant:2, precio:1000 }] };
  };
  window._cargar=async function(o){
    window._SRV.pedidos=[window._pedido()];
    window._SRV.stock=window._stock(o); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._mirar=function(){
    var lista=stockData().lista, lite=lista.filter(function(x){ return /SUENA LITE/.test(x.k) && /105X190/.test(x.k); });
    var h=(STOCK.h||[])[0]||{}, d=(h.d||[]).filter(function(e){ return /SUENA LITE/.test(e[0]); });
    var div=document.createElement('table'); div.innerHTML=stockHistDifHtml(h);
    return {
      filas:lite.map(function(x){ return { k:x.k, dep:x.deposito, otros:x.enOtros, comp:x.comp }; }),
      clave:stockClave({ codigo:'CH2531', desc:'COLCHON SUEÑA LITE', medida:'105x190' }),
      claveExcel:stockClave({ codigo:'CH2531', desc:'COLCHON SUENA LITE 105X190', medida:'105x190' }),
      codPTF:STOCK.c.cod.CH2531, codIM:STOCK.g[window._IM].cod.CH2531,
      dif:d, txt:div.innerText.replace(/\s+/g,' ').trim(),
      det:(STOCK.det||[]).map(function(x){ return { k:x.k, t:x.t, u:x.u, an:!!x.an }; }),
      /* (§4iz) `stockDetectadoSinAsignar` ahora cuenta solo lo que puede ser un pedido pendiente (acá no hay): se mide la detección cruda. */
      sinAsignar:(STOCK.det||[]).filter(function(x){ return x && x.k===window._CAT && !x.alm && !x.an; }).reduce(function(a,x){ return a+(Number(x.u)||0); },0),
      sm:(STOCK.sm||[]).map(function(x){ return { k:x.k, u:x.u, an:!!x.an }; }),
      parrilla:stockClave({ codigo:'CH1297', desc:'SOMIER PARRILLA NEGRO', medida:'140x190' }),
      negro:stockClave({ codigo:'SR2012', desc:'SOMIER NEGRO', medida:'140x190' })
    };
  };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* ── 1. Una sola fila ── */
  const a = await ev(async () => { await _cargar(); return _mirar(); });
  chk('CN1. el SUEÑA LITE 105x190 es UNA sola fila en Stock', a.filas && a.filas.length===1, a.filas);
  chk('CN2. …con la clave de la lista, los 20 de PTF y los 3 de Moreno', a.filas && a.filas.length===1 && a.filas[0].k===window_CAT() && a.filas[0].dep===20 && a.filas[0].otros===3, a.filas);
  chk('CN3. el pedido con el código CH2531 se reserva en ESA fila (2 pendientes)', a.filas && a.filas.length===1 && a.filas[0].comp===2, a.filas);
  chk('CN4. un pedido con el código va a la clave de la lista', a.clave==='COLCHON SUENA LITE|105X190', a.clave);

  /* ── 2. El mapa de códigos ── */
  chk('CN5. el mapa de códigos de PTF y el de Moreno apuntan a la clave de la lista', a.codPTF==='COLCHON SUENA LITE|105X190' && a.codIM==='COLCHON SUENA LITE|105X190', { ptf:a.codPTF, im:a.codIM });
  chk('CN6. un renglón del Excel nuevo con el CH2531 (como lo arma `existLeer`) cae en la misma clave', a.claveExcel==='COLCHON SUENA LITE|105X190', a.claveExcel);

  /* ── 3. El control del corte ── */
  chk('CN7. el historial del corte ya no tiene «−20 / +20» del SUEÑA LITE (se fundieron y dan 0)', a.dif && a.dif.length===0, a.dif);
  chk('CN8. el cartel del control no dice «sin explicar» para el SUEÑA LITE', !/SUENA LITE/.test(a.txt||''), a.txt);

  /* ── 4. Lo que el control anotó por esa diferencia ── */
  chk('CN9. la detección de esa «entrada» queda anulada (lápida) y no queda nada sin asignar', a.det && a.det.length===1 && a.det[0].an && a.sinAsignar===0, { det:a.det, sinAsignar:a.sinAsignar });
  const s = await ev(async () => { await _cargar({ salida:true }); return _mirar(); });
  chk('CN10. una salida sin pedido anotada por la «baja» de 20 queda anulada', s.sm && s.sm.length===1 && s.sm[0].an, s.sm);
  chk('(con la salida anulada, siguen los 20 de PTF)', s.filas && s.filas.length===1 && s.filas[0].dep===20, s.filas);
  const p = await ev(async () => { await _cargar({ ptf:22 }); return _mirar(); });
  chk('CN11. si en neto SÍ entraron 2 (22 contra 20), queda «+2» y la detección baja a 2', p.dif && p.dif.length===1 && p.dif[0][1]===2 && p.det && p.det.length===1 && !p.det[0].an && p.det[0].t===2 && p.sinAsignar===2, { dif:p.dif, det:p.det, sinAsignar:p.sinAsignar });

  /* ── Lo de siempre ── */
  chk('un código que la lista NO conoce (CH1297) sigue siendo otro producto, con su nombre crudo (§4cy)', a.parrilla==='SOMIER PARRILLA NEGRO|140X190' && a.negro!==a.parrilla, { parrilla:a.parrilla, negro:a.negro });
  const idem = await ev(async () => {
    await _cargar();
    var t1=filaStock().observaciones;
    var S2=leerStock({ observaciones:t1 }); var t2=JSON.stringify(stockMigrar(S2));
    var S3=leerStock({ observaciones:t2 });
    return { igual:JSON.stringify(S3.c)===JSON.stringify(S2.c) && JSON.stringify(S3.g)===JSON.stringify(S2.g) && JSON.stringify(S3.h)===JSON.stringify(S2.h) && JSON.stringify(S3.det)===JSON.stringify(S2.det) };
  });
  chk('leer lo guardado otra vez da lo mismo (idempotente)', idem.igual, idem);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
function window_CAT(){ return 'COLCHON SUENA LITE|105X190'; }
