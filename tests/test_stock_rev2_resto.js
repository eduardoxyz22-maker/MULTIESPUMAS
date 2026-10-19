/* 📋 EL RESTO DE LOS ERRORES DE STOCK (18/10, §4ls — revisión 2, prioridad 1.11-1.16 y el mes).

   LO QUE ESTA PRUEBA CUIDA (los «RS» fallan contra la página de antes, `c973028`; los «control» pasan en las dos):
   RS1  VE12  El control del Excel no muestra protectores («PROTETOR COLCHAO») ni reparaciones como diferencias: van aparte, plegados,
              sin «Anotar como salida sin pedido» (llenaba la celda de 50.000 letras con salidas que no sirven).
   RS2  T1    Las tareas y los errores de tipeo no entran al stock: «POR CONFIRMAR», «POR FAVOR IR HACER MEDICION», «CORTES DE LAMINAS»,
              «PS QUE RECOGIERON…», «PROTECTO DE COLCHON…» (sin la R), «SABABA» (sábana). Un pedido pendiente de «POR CONFIRMAR» no pide
              «🚨 Pedí 1 ya».
   RS3  T5    Una venta de tienda destildada (alguien le sacó el ✅ en Administración) no entra a la revisión automática.
   RS4  Man-VM8  Un descontinuado vendido sin stock en ningún almacén dice «🛑 Se acaba», nunca «✅ Alcanza».
   RS5  VB-1  Los N° de pedido de las listas de la revisión (sin respaldo, en otro lugar, ✗ con stock libre, 💡 para entregar antes) abren
              el pedido.
   RS6  VI-1  Un nombre que ni la lista ni ningún Excel conocen dice «❓ NO RECONOZCO ESTE PRODUCTO» (con lo que puede ser del almacén),
              aunque alguien lo haya vendido antes; nunca «🏭 NO HAY». Un agotado real (código del sistema) sigue «🏭 NO HAY».
   RS7  VI-4  El buscador de Stock busca en TODO: «SOMIER NEGRO» encuentra lo que tiene 8 en los almacenes aunque no se vendió en 15 días.
   RS8  Mes-VM9  El mes aplica la regla de rotación del panel: lo que no rota (ni en 15 ni en 30 días) no estima por el año pasado ni por
              60/90 días (un pedido único no fabrica); se cubre solo lo ya vendido.
   RS9  Mes-VM2/U45  Un mes cerrado sin ventas cuenta como 0 desde el primer mes con ventas (el 60 d y el 90 d no se caen).
   RS10 Mes-VM4  Lo que falta antes del 1° va en «15 días», no en el mes que viene: el mes empieza con «queda» ≥ 0 y la suma no cambia.
   RS11 BP2   Banzer o PTF: las almohadas que van por RPT a una tienda cuentan para el lado (renglón por renglón, `stockEsDemanda`); el mapa
              y la cuenta de entregas siguen sin ellas.
   RS12 BP5   Banzer o PTF avisa si el Excel de Banzer (o de PTF, o de Moreno) no es del día, en el resumen, arriba del plan y en las dos
              copias; sin Excel de Banzer, el plan no manda traer ni llevar a Banzer («Falta el Excel de Banzer»).
   RS13 BP1   La tabla y «📋 Copiar para logística» salen de la MISMA cuenta que el plan de 15 días: con PTF corto, nunca «lo próximo que
              llegue a Banzer» ni «bien repartido».
   RS14 VV3   «📈 Su historia»: «+N entraron» solo entre dos Excel (con lo que salió entre los dos cortes); el punto de hoy sin Excel de
              hoy es un estimado hueco, sin triángulo.

   Reloj CLAVADO (cada parte dice a qué hora). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_rev2_resto.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_c973028.html node tests/test_stock_rev2_resto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J=(x)=>JSON.stringify(x);

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  apiGeocode=function(links){ return Promise.resolve({ ok:true, geo:links.map(function(u){ return { link:u, lat:null, lng:null }; }) }); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='01-05-025  Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._ts=function(f, h){ return new Date(f+'T'+(h||'09:00:00')+'-04:00').getTime(); };
  window._d=function(n){ return stockSumarDias(todayStr(), n); };
  window._stock=function(fn, opt){
    opt=opt||{}; var f=opt.f||todayStr(), hora=opt.hora||'10:05:32', t=_ts(f, '10:10:00');
    var st={ v:2, pv:3, c:{ f:f, hora:hora, u:{}, solo0:true, alm:_LOG, cod:{}, t:t }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:opt.fBz||f, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.g[_IM]={ f:f, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(opt.sinBanzer){ delete st.g[_BZ]; delete st.al[_BZ]; }
    if(fn) fn(st);
    return st;
  };
  var n=0;
  window._ped=function(o){ n++; var f=(o && o.fecha!=null) ? o.fecha : _d(-3);
    return Object.assign({ id:'r'+n, oc:'10-'+(100+n), fecha:f, turno:'AM', cliente:'CLIENTE '+n, vendedor:'Maria Flores', celular:'70000000', zona:'',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:(f && f<=todayStr()) ? _ts(f) : Date.now(), entregado:false, productos:[] }, o); };
  window._lin=function(cod, d, m, cant, extra){ return Object.assign({ codigo:cod, desc:d, medida:m, cant:cant }, extra||{}); };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; stockOlvidarIndice();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._q=function(lat,lng){ return 'https://www.google.com/maps?q='+lat+','+lng; };
  window.CERCA_P=[[-17.755,-63.135],[-17.760,-63.130],[-17.765,-63.140],[-17.752,-63.128]];
  window.CERCA_B=[[-17.705,-63.175],[-17.710,-63.170],[-17.700,-63.165],[-17.712,-63.178]];
}
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.message || e) }; } }, [fn.toString(), arg]);

async function abrir(browser, file, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page._err=[]; page.on('pageerror', e => page._err.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + file, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR.toString()+')()');
  return page;
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let r;
  // Viernes 16/10, 12:00 (el día de la planilla real).
  let page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');

  // ═══ RS1. VE12 ═══
  console.log('\n── RS1. El control del Excel no muestra protectores ni reparaciones (VE12) ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), ay=_d(-1), KT=_k('CH1201','TITANIO ICE','160x190');
    var KP='PROTETOR COLCHAO QUEEN|', KR='REPARACION HEAVEN|';
    await _cargar([], _stock(function(st){ st.c.u[KT]=8; st.c.u[KP]=30; st.c.u[KR]=1; }, { f:ay, hora:'10:00:00' }));
    var R={ fecha:hoy, hora:'10:05:00', sacado:hoy, sinFecha:false, almacen:_LOG, esLog:true, conocido:true, solo0:true, cods:{}, colCant:'G', repetidos:0, malos:0,
            items:[{ cod:'X1', desc:KT, medida:'', cant:5, cat:true, k:KT }], total:5 };
    var C=stockConciliar(R, 'log', { am:true, pm:false });
    var html=existControlHtml(R, 'log', { am:true, pm:false });
    var d=document.createElement('div'); d.innerHTML=html;
    var enFilas=(C.filas||[]).map(function(f){ return f.k; });
    var fuera=(C.fuera||[]).map(function(f){ return f.k; });
    var caja=d.querySelector('#exist-ctrl-fuera');
    return { enFilas:enFilas, fuera:fuera, titanio:enFilas.indexOf(KT)>=0, caja:!!caja, plegado:!!(caja && caja.tagName==='DETAILS' && !caja.open),
             casillas:caja ? caja.querySelectorAll('input').length : -1, txt:caja ? caja.textContent.replace(/\s+/g,' ') : '' };
  });
  chk('RS1 los protectores y las reparaciones NO son diferencias del control (no están en la tabla de diferencias)', r && r.enFilas && r.enFilas.indexOf('PROTETOR COLCHAO QUEEN|')<0 && r.enFilas.indexOf('REPARACION HEAVEN|')<0, r);
  chk('RS1 …van aparte, plegados («🧹 Otros productos del Excel»), sin ninguna casilla para anotar', r && r.caja && r.plegado && r.casillas===0 && r.fuera.length===2 && /no son stock del panel/.test(r.txt), r);
  chk('control: el TITANIO ICE sigue con su diferencia en el control', r && r.titanio===true, r);

  // ═══ RS2. T1 ═══
  console.log('\n── RS2. Tareas y errores de tipeo no entran al stock (T1) ──');
  r = await corre(page, async () => {
    var textos=['POR CONFIRMAR','POR FAVOR IR HACER MEDICION','CORTES DE LAMINAS','PS QUE RECOGIERON EL COLCHON','PROTECTO DE COLCHON GELATTO','PROTECTO COLCHON IMPERMEABLE GELATTO','SABABA 2.0PLZ'];
    var malos=textos.filter(function(t){ return !esProdDeTienda({ desc:t, medida:'140x190', codigo:'' }); });
    var buenos=['TITANIO ICE','CABECERA MDF','ORO ORTOPEDICO','COLCHON ESPECIAL SEMIORTOPEDICO'].filter(function(t){ return esProdDeTienda({ desc:t, medida:'140x190', codigo:'' }); });
    var prot=esProdDeTienda({ desc:'PROTECTOR DE COLCHON', medida:'140x190', codigo:'' });
    await _cargar([ _ped({ fecha:_d(4), productos:[_lin('','POR CONFIRMAR','',1)] }), _ped({ fecha:_d(4), productos:[_lin('','SABABA 2.0PLZ','160x200',1)] }) ], _stock());
    var d=stockData(), hay=d.lista.filter(function(o){ return /CONFIRMAR|SABABA/.test(o.k); }).map(function(o){ return [o.k, o.aviso, o.fabricar]; });
    return { malos:malos, buenos:buenos, prot:prot, hay:hay };
  });
  chk('RS2 las 7 tareas / errores de tipeo reales se reconocen como «no es stock»', r && r.malos && r.malos.length===0, r);
  chk('RS2 …y un pedido pendiente de «POR CONFIRMAR» o «SABABA» no aparece en el stock (no pide «🚨 Pedí 1 ya»)', r && r.hay && r.hay.length===0, r);
  chk('control: «PROTECTOR» sigue afuera y los colchones, la cabecera de MDF y el ORO siguen adentro', r && r.prot===true && r.buenos && r.buenos.length===0, r);

  // ═══ RS3. T5 ═══
  console.log('\n── RS3. Una venta de tienda destildada no entra a la revisión (T5) ──');
  r = await corre(page, async () => {
    var KT=_k('CH1201','TITANIO ICE','160x190');
    var vt=_ped({ fecha:'', direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', entregado:false, ts:Date.now()-86400000, productos:[_lin('CH1201','TITANIO ICE','160x190',1)] });
    var nor=_ped({ fecha:_d(3), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] });
    await _cargar([vt, nor], _stock(function(st){ st.c.u[KT]=0; }));
    var en=revStkPedidos(true).map(function(p){ return p.id; });
    var A=stockAsignar(), prop=[];
    try{ (A.porPedido ? Object.keys(A.porPedido) : (A.pedidos||[]).map(function(x){ return x.id||(x.p&&x.p.id); })).forEach(function(id){ prop.push(id); }); }catch(e){}
    return { vt:vt.id, nor:nor.id, en:en, esVT:esVentaTienda(vt), prop:prop };
  });
  chk('RS3 la venta de tienda sin ✅ no entra a `revStkPedidos` (como en el cierre)', r && r.esVT && r.en && r.en.indexOf(r.vt)<0, r);
  chk('control: el pedido normal sí entra a la revisión', r && r.en && r.en.indexOf(r.nor)>=0, r);

  // ═══ RS4. Man-VM8 ═══
  console.log('\n── RS4. Un descontinuado vendido sin stock no dice «✅ Alcanza» (Man-VM8) ──');
  r = await corre(page, async () => {
    var KJ=_k('CH1078','ESPECIAL JUNIOR','140x190'), KT=_k('CH1201','TITANIO ICE','160x190');
    await _cargar([ _ped({ fecha:_d(8), productos:[_lin('CH1078','ESPECIAL JUNIOR','140x190',1)] }) ], _stock(function(st){ st.c.u[KT]=3; }));
    var o=_fila(KJ);
    return o ? { descont:o.descont, aviso:o.aviso, accion:sfAccion(o), comp:o.comp, dias:o.dias, lead:o.lead } : null;
  });
  chk('RS4 ESPECIAL JUNIOR (ya no se fabrica), 1 vendido para dentro de 8 días y 0 en los tres almacenes → «agotado», no «✅ Alcanza»',
      r && r.descont && r.aviso==='agotado' && /Se acaba/.test(r.accion) && !/Alcanza/.test(r.accion), r);

  // ═══ RS5. VB-1 ═══
  console.log('\n── RS5. Los N° de pedido de la revisión abren el pedido (VB-1) ──');
  r = await corre(page, async () => {
    var p1=_ped({ fecha:_d(2), oc:'10-501', productos:[_lin('CH1201','TITANIO ICE','160x190',1)] });
    var p2=_ped({ fecha:_d(9), oc:'10-502', productos:[_lin('CH1201','TITANIO ICE','160x190',1)] });
    await _cargar([p1, p2], _stock());
    var fila={ id:p1.id, oc:p1.oc, fecha:p1.fecha, nom:'TITANIO ICE', u:1, faltan:1, dice:'✔ hay', en:[{ u:1, aca:true }] };
    var listas={
      sinRespaldo: typeof revSinRespaldoHtml==='function' ? revSinRespaldoHtml([fila]) : '',
      realoja: typeof revRealojaHtml==='function' ? revRealojaHtml([fila]) : '',
      noHay: typeof revNoHayConStockHtml==='function' ? revNoHayConStockHtml([fila]) : '',
      soltar: typeof revSoltarHtml==='function' ? revSoltarHtml([{ para:{ id:p1.id, oc:p1.oc, fecha:p1.fecha }, nom:'TITANIO ICE', falta:1, cubre:1, de:[{ id:p2.id, oc:p2.oc, fecha:p2.fecha, u:1 }] }]) : ''
    };
    var out={};
    for(var nm in listas){
      try{ closeModal(); }catch(e){}
      var d=document.createElement('div'); d.id='rs5-'+nm; d.innerHTML=listas[nm]; document.body.appendChild(d);
      var a=d.querySelector('a[data-id]'); if(!a){ out[nm]='sin enlace'; d.remove(); continue; }
      a.click(); await _esperar(60);
      var m=document.getElementById('modal'), abierto=!!(m && m.classList.contains('on'));
      out[nm]=abierto && /10-50[12]/.test((document.getElementById('modal-box')||m).textContent) ? 'abre' : 'no abre';
      d.remove();
    }
    try{ closeModal(); }catch(e){}
    return out;
  });
  chk('RS5 los cuatro enlaces de la revisión abren la ficha del pedido', r && r.sinRespaldo==='abre' && r.realoja==='abre' && r.noHay==='abre' && r.soltar==='abre', r);

  // ═══ RS6. VI-1 ═══
  console.log('\n── RS6. Un nombre que nadie conoce dice «❓ No reconozco», nunca «🏭 NO HAY» (VI-1) ──');
  r = await corre(page, async () => {
    var KN=_k('SR2012','SOMIER NEGRO','140x190');
    /* Un código del sistema (está en el histórico) que la lista no tiene y que hoy no está en ningún Excel: un agotado real. */
    var Hc=ventasHistPorCodigo(), agot=Object.keys(Hc).filter(function(c){ return !CODIGOS[c] && normMedida(Hc[c].m||''); })[0];
    var hA=Hc[agot], dA=nombreSinMedida(hA.n)||hA.n, mA=normMedida(hA.m);
    var vieja=_ped({ fecha:_d(-80), entregado:true, productos:[_lin('','SOMIER ROHO PEDIC','140x190',2)] });
    var viejaA=_ped({ fecha:_d(-80), entregado:true, productos:[_lin(agot, dA, mA, 1)] });
    await _cargar([vieja, viejaA], _stock(function(st){ st.c.u[KN]=1; st.g[_BZ].u[KN]=5; st.g[_IM].u[KN]=2; st.c.cod.SR2012=KN; }));
    var kc=stockClave({ desc:'SOMIER ROHO PEDIC', medida:'140x190', codigo:'' });
    var v=saldoVeredicto(kc, 1, '', _d(3), false, '');
    var v2=saldoVeredicto(stockClave({ desc:'SOMIER ROHO PEDIC', medida:'160x190', codigo:'' }), 1, '', _d(3), false, '');
    var kA=stockClave({ desc:dA, medida:mA, codigo:agot }), vA=saldoVeredicto(kA, 1, '', _d(3), false, agot);
    var caja=function(x){ var d=document.createElement('div'); d.innerHTML=saldoCajaHtml(x); return d.textContent.replace(/\s+/g,' '); };
    return { kc:kc, existe:!!stockData().lista.filter(function(o){ return o.k===kc; })[0], tipo:v.tipo, noRec:!!v.noRec, t:caja(v), t2:caja(v2), agot:agot, tipoA:vA.tipo, tA:caja(vA) };
  });
  chk('RS6 «SOMIER ROHO PEDIC» 140x190 (vendido en julio, ni la lista ni el Excel lo conocen) → «❓ NO RECONOZCO», nunca «🏭 NO HAY»',
      r && r.existe && r.noRec && /NO RECONOZCO ESTE PRODUCTO/.test(r.t) && !/NO HAY/.test(r.t), r);
  chk('RS6 …y propone lo que puede ser del almacén: el SR2012 = SOMIER NEGRO 140x190, con los 8 que hay en los tres', r && /¿Es «SOMIER NEGRO · 140X190»/.test(r.t) && /SR2012/.test(r.t) && /hay 8 en los almacenes/.test(r.t), r && r.t);
  chk('RS6 …lo mismo en 160x190, que nadie vendió (antes «No encuentro»): «❓ NO RECONOZCO» y el SR2013', r && /NO RECONOZCO ESTE PRODUCTO/.test(r.t2) && /SR2013/.test(r.t2), r && r.t2);
  chk('control: un agotado real (código del sistema, '+(r&&r.agot)+') sigue «🏭 NO HAY»', r && r.tipoA==='pedir' && /NO HAY/.test(r.tA), r && [r.tipoA, r.tA]);

  // ═══ RS7. VI-4 ═══
  console.log('\n── RS7. El buscador de Stock busca en todo (VI-4) ──');
  r = await corre(page, async () => {
    var KN=_k('SR2012','SOMIER NEGRO','140x190'), KT=_k('CH1201','TITANIO ICE','160x190');
    await _cargar([ _ped({ fecha:_d(-2), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ], _stock(function(st){ st.c.u[KN]=1; st.g[_BZ].u[KN]=5; st.c.u[KT]=4; }));
    abrirStock(); await _esperar(80);
    STOCK_FILTRO.q='somier negro'; renderStock(); await _esperar(60);
    var body=document.getElementById('stock-body'), t=body ? body.textContent.replace(/\s+/g,' ') : '';
    var filas=[].slice.call(document.querySelectorAll('#stock-body tr')).filter(function(tr){ return /SOMIER NEGRO/.test(tr.textContent); }).length;
    STOCK_FILTRO.q=''; renderStock(); await _esperar(40);
    var filas0=[].slice.call(document.querySelectorAll('#stock-body tr')).filter(function(tr){ return /SOMIER NEGRO/.test(tr.textContent); }).length;
    try{ cerrarStock(); }catch(e){}
    return { filas:filas, nada:/Ningún producto coincide|Nada con este filtro/.test(t), filas0:filas0 };
  });
  chk('RS7 «somier negro» encuentra el SOMIER NEGRO 140x190 (6 en los almacenes, sin venta en 15 días)', r && r.filas>0 && !r.nada, r);
  chk('control: sin buscar, lo que no se mueve sigue fuera del Plan y de la tabla (detrás de «Ver también»)', r && r.filas0===0, r);

  // ═══ RS8 / RS9. Mes-VM9, Mes-VM2 ═══
  console.log('\n── RS8. El mes con la regla de rotación (Mes-VM9) · RS9. Un mes sin ventas es un 0 (Mes-VM2/U45) ──');
  r = await corre(page, async () => {
    var MS=stockMesSiguiente(todayStr()), K='PRUEBA MES|140X190', out={};
    /* Sin rotación (ni en 15 ni en 30 días), con historia: 45 en agosto (un pedido único) y ventas en septiembre. */
    var PI={}; PI[K]={ '2026-08':45, '2026-09':3 };
    var R0=stockRangoMes({ k:K, rota:false, rotaMes:false, porDiaMes:0 }, MS, PI);
    out.sinRota=R0 ? R0.est.map(function(e){ return e.n; }) : null;
    /* Rota en 30 días (3 entregas), vendió en agosto pero NO en septiembre: septiembre es un 0, no «sin datos». */
    var PI2={}; PI2[K]={ '2026-08':10 };
    var R1=stockRangoMes({ k:K, rota:false, rotaMes:true, porDiaMes:0.2 }, MS, PI2);
    out.est=R1 ? R1.est.map(function(e){ return [e.n, Math.round(e.v*10)/10]; }) : null;
    /* El escenario entero: un MORFEO de una sola compra (45 hace 50 días) y sin rotación no fabrica para noviembre. */
    var KM=stockClave({ desc:'MORFEO', medida:'140x190', codigo:'' });
    await _cargar([ _ped({ fecha:_d(-50), entregado:true, productos:[_lin('','MORFEO','140x190',45)] }) ], _stock(function(st){ st.c.u[KM]=0; }));
    var d=stockData(), P=stockProducir(d), f=null;
    P.bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===KM) f=x; }); });
    out.morfeo=f ? { mes:f.mes, rango:!!f.rango } : 'no planifica';
    return out;
  });
  chk('RS8 lo que no rota no estima el mes (ni 60/90 días ni el año pasado): un pedido único no fabrica', r && r.sinRota===null, r);
  chk('control: el MORFEO de una sola compra de 45 no pide nada para noviembre', r && (r.morfeo==='no planifica' || (r.morfeo && r.morfeo.mes===0)), r);
  chk('RS9 lo que rota en 30 días: septiembre sin ventas cuenta 0 → entra el 60 d ((0 + 10) / 2)', r && r.est && r.est.some(function(e){ return e[0]==='60 d' && e[1]>0 && e[1]<6; }), r);

  // ═══ RS10. Mes-VM4 (SACADO por el corrector) ═══
  console.log('\n── RS10. Lo que falta antes del 1° vuelve al mes que viene (Mes-VM4 sacado, §4ls corrector) ──');
  await page.context().close();
  page = await abrir(browser, PEDIDOS, '2026-10-05T10:00:00-04:00');
  r = await corre(page, async () => {
    /* Rota solo en 30 días (3 entregas hace 18-24 días, 2 c/u), 1 en el depósito: al ritmo de 30 días no llega al 31/10. */
    var KS=stockClave({ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048' });
    var peds=[18,21,24].map(function(n){ return _ped({ fecha:_d(-n), entregado:true, productos:[_lin('COLT0048','COLCHON SOFT','140x190',2)] }); });
    await _cargar(peds, _stock(function(st){ st.c.u[KS]=1; }));
    var d=stockData(), P=stockProducir(d), f=null;
    P.bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===KS) f=x; }); });
    return f ? { sem:f.sem, quin:f.quin, antes:f.antes, mes:f.mes, queda:f.mesQueda, rotaMes:f.o.rotaMes, rota:f.o.rota } : null;
  });
  /* ✏️ (18/10, §4ls, corrector, a conciencia) Mes-VM4 se sacó: no estaba en la lista de arreglos (1.12), su verificador lo marcó como
     decisión del dueño (U11) y cambiaba «15 días» y «el mes» de lo que tiene objetivo (decisión 5). Vuelve §4iz E1-6: «queda» negativo
     se suma al mes que viene; «15 días» de lo que rota solo en 30 días sigue en cero (§4dr: ese ritmo es solo para el mes). */
  /* ✏️ (19/10, §4ls CU-1, a conciencia) `antes` ya no es «lo que pasó a 15 días» (Mes-VM4, sacado): es la parte de «el mes» que falta para
     terminar octubre, dicha aparte (mes = antes + 1ª + 2ª quincena). Sigue sumándose al mes y «15 días» no la lleva. */
  chk('RS10 sin Mes-VM4: lo que falta para terminar octubre se suma a noviembre («queda» negativo, dicho aparte) y «15 días» no lo lleva', r && r.rota===false && r.rotaMes===true && r.antes===-r.queda && r.quin===0 && r.queda<0 && r.mes>0, r);

  // ═══ RS11-RS13. Banzer o PTF ═══
  console.log('\n── RS11-RS13. Banzer o PTF (BP2, BP5, BP1) ──');
  await page.context().close();
  page = await abrir(browser, PEDIDOS, '2026-10-07T10:00:00-04:00');
  const armarAlm = async (opt) => corre(page, async (opt) => {
    var KA=_k('CD1403','ALMOHADA','50x70'), KT=_k('CH1201','TITANIO ICE','160x190');
    var cp=CERCA_P, cb=CERCA_B, peds=[];
    /* ALMOHADA 50x70: el equipo la entrega del lado de PTF (4 entregas, 8 u); por RPT van 10 a una tienda del lado de Banzer. */
    [2,4,6,8].forEach(function(n,i){ peds.push(_ped({ fecha:_d(-n), entregado:true, zona:'Este', maps:_q(cp[i][0],cp[i][1]), productos:[_lin('CD1403','ALMOHADA','50x70',2)] })); });
    peds.push(_ped({ fecha:_d(-3), oc:'RPT 10-001', cliente:'Mia Plaza', zona:'Norte', entregado:true, maps:_q(cb[0][0],cb[0][1]), productos:[_lin('CD1403','ALMOHADA','50x70',10)] }));
    /* TITANIO ICE: rota, casi todo del lado de Banzer; PTF con 0 y Banzer con 0. */
    [1,3,5,7,9].forEach(function(n,i){ peds.push(_ped({ fecha:_d(-n), entregado:true, zona:'Norte', maps:_q(cb[i%4][0],cb[i%4][1]), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] })); });
    peds.push(_ped({ fecha:_d(-2), entregado:true, zona:'Este', maps:_q(cp[0][0],cp[0][1]), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }));
    await _cargar(peds, _stock(function(st){ st.c.u[KA]=1; st.c.u[KT]=0; if(st.g[_BZ]){ st.g[_BZ].u[KA]=20; st.g[_BZ].u[KT]=0; } st.g[_IM].u[KT]=9; }, opt||{}));
    var A=almZonaData(), fa=A.filas.filter(function(f){ return f.k===KA; })[0]||{}, ft=A.filas.filter(function(f){ return f.k===KT; })[0]||{};
    abrirAlm(); await _esperar(150);
    var plan=document.getElementById('alm-plan-in'), res=document.getElementById('alm-resumen');
    var cp1='', cp2='', v=copyText; copyText=function(x){ cp1=x; }; try{ almCopiarPlan(); }finally{ copyText=v; }
    v=copyText; copyText=function(x){ cp2=x; }; try{ almCopiar(); }finally{ copyText=v; }
    var accT=(function(){ var tr=document.querySelector('#alm-tabla tr[data-alm-k="'+KT.replace(/"/g,'\\"')+'"]'); return tr ? tr.cells[tr.cells.length-1].textContent.replace(/\s+/g,' ') : ''; })();
    try{ cerrarAlm(); }catch(e){}
    var r15=ft.plan && ft.plan[15];
    return { aU:fa.u, aSB:fa.sB, Tn:A.T.n, puntos:A.puntos.length,
             t:{ objB:ft.objB, objP:ft.objP, acc:ft.acc, plan15:r15 ? { tB:r15.tB, tP:r15.tP, deM:(r15.deM||[]).map(function(m){ return m.a+' '+m.u; }), sinB:!!r15.sinB } : null, accTxt:accT },
             res:res ? res.textContent.replace(/\s+/g,' ') : '', plan:plan ? plan.textContent.replace(/\s+/g,' ') : '', cp1:cp1, cp2:cp2 };
  }, opt);
  r = await armarAlm();
  chk('RS11 las 10 almohadas de la RPT cuentan para el lado (18 u, casi la mitad del lado de Banzer)', r && r.aU===18 && r.aSB>0.5, r && [r.aU, r.aSB]);
  chk('control: la cuenta de entregas del resumen y el mapa siguen sin la RPT (10 entregas, 10 puntos)', r && r.Tn===10 && r.puntos===10, r && [r.Tn, r.puntos]);
  chk('RS13 la tabla «conviene tener» es la MISMA que el plan de 15 días (Banzer y PTF)', r && r.t.plan15 && r.t.objB===r.t.plan15.tB && r.t.objP===r.t.plan15.tP, r && r.t);
  chk('RS13 …con PTF y Banzer en 0 dice «📥 Traer … de Moreno» (PTF primero), nunca «lo próximo que llegue» ni «bien repartido»',
      r && /Traer \d+ de Moreno a PTF/.test(r.t.accTxt) && /Traer \d+ de Moreno a Banzer/.test(r.t.accTxt) && !/próximo que llegue|Bien repartido/.test(r.t.accTxt), r && r.t.accTxt);
  chk('RS13 …y «📋 Copiar para logística» trae lo mismo que «📋 Copiar el plan de 15 días» (sin «lo próximo que llegue»)',
      r && /TRAER DE MORENO/.test(r.cp2) && !/PRÓXIMO QUE LLEGUE/.test(r.cp2), r && r.cp2.slice(0,500));
  chk('control: con todos los Excel del día, ningún aviso de Excel viejo', r && !/no es de hoy/.test(r.res) && !/no es de hoy/.test(r.plan), r && r.res.slice(0,200));
  r = await armarAlm({ fBz:'2026-10-03' });
  chk('RS12 con el Excel de Banzer del 03/10: lo dice el resumen, arriba del plan y las dos copias', r && /El Excel de Banzer es del 03\/10/.test(r.res) && /El Excel de Banzer es del 03\/10/.test(r.plan) &&
      /El Excel de Banzer es del 03\/10/.test(r.cp1) && /El Excel de Banzer es del 03\/10/.test(r.cp2), r && [r.res.slice(0,300), r.cp1.slice(0,300)]);
  r = await armarAlm({ sinBanzer:true });
  chk('RS12 sin Excel de Banzer: el plan no manda traer de Moreno a Banzer ni llevar a Banzer, y dice «Falta el Excel de Banzer»',
      r && r.t.plan15 && r.t.plan15.sinB && !r.t.plan15.deM.some(function(x){ return /^Banzer/.test(x); }) && /Falta el Excel de Banzer/.test(r.plan) && /FALTA EL EXCEL DE BANZER/.test(r.cp1), r && [r.t, r.plan.slice(0,300)]);

  // ═══ RS14. VV3 ═══
  console.log('\n── RS14. «📈 Su historia»: entradas solo entre dos Excel (VV3) ──');
  r = await corre(page, async () => {
    var KT=_k('CH1201','TITANIO ICE','160x190'), hoy=todayStr(), d1=_d(-2), d2=_d(-1);
    /* Excel del 05/10 10:00: 10. Esa tarde salieron 2 (PM). Excel del 06/10 10:00: 8 → no entró nada. Hoy (07/10) sin Excel: 3 para hoy. */
    var peds=[ _ped({ fecha:d1, turno:'PM', entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }),
               _ped({ fecha:hoy, turno:'AM', productos:[_lin('CH1201','TITANIO ICE','160x190',3)] }) ];
    await _cargar(peds, _stock(function(st){ st.c.u[KT]=8; }, { f:d2, hora:'10:00:00' }));
    var o=_fila(KT);
    var dias=[ { fecha:d1, datos:{ PTF:{ f:d1, h:'10:00', u:(function(){ var u={}; u[KT]=10; return u; })() } } },
               { fecha:d2, datos:{ PTF:{ f:d2, h:'10:00', u:(function(){ var u={}; u[KT]=8; return u; })() } } } ];
    var svg=sfHistSvg(o, dias, _d(-29), hoy);
    /* ✏️ (19/10, §4ls VI-5, a conciencia) Estos renglones no guardan qué turnos traía su Excel (`it`): el «+N» sale marcado «≈». */
    var ent=(svg.match(/entraron ≈?[0-9]+/g)||[]);
    /* Una entrada de verdad: el 06/10 el Excel dice 15 → entraron 7 (15 − 10 + 2). */
    var dias2=JSON.parse(JSON.stringify(dias)); dias2[1].datos.PTF.u[KT]=15;
    var ent2=(sfHistSvg(o, dias2, _d(-29), hoy).match(/entraron ≈?[0-9]+/g)||[]).map(function(t){ return t.replace('≈',''); });
    return { ent:ent, est:/class="sf-est"/.test(svg) || /estimado hoy/.test(svg), ent2:ent2 };
  });
  chk('RS14 sin Excel de hoy, las 3 entregas de hoy NO dibujan «+3 entraron», y la salida de la tarde del 05/10 no es una entrada', r && r.ent && r.ent.length===0, r);
  chk('RS14 …el punto de hoy va como «estimado hoy» (hueco)', r && r.est===true, r);
  chk('RS14 …y una entrada de verdad cuenta lo que salió ENTRE los dos cortes (la tarde del 05/10): «entraron 7» (antes 5)', r && r.ent2 && r.ent2.length===1 && r.ent2[0]==='entraron 7', r);

  // ═══ RS15. Lo que encontraron los verificadores (§4ls, corrector) ═══
  console.log('\n── RS15. VV3 con «no incluye», Man-VM8 parcial, VI-1 al guardar ──');
  r = await corre(page, async () => {
    var KT=_k('CH1201','TITANIO ICE','160x190'), KZ=_k('CH1212','SOMIER TITANIO ICE','140x190'), hoy=todayStr(), d1=_d(-2), d2=_d(-1), out={};
    /* (VV3) El Excel del 06/10 a las 10:05 con «NO incluye las entregas» (`inc:false`, la respuesta de logística): las 3 de la mañana del 06/10
       todavía estaban en él (5 → 5): no «entraron 3». El SOMIER no está en ningún Excel (0 y 0) y salieron 12: tampoco «entraron». */
    var peds=[ _ped({ fecha:d2, turno:'AM', entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',3)] }),
               _ped({ fecha:d2, turno:'AM', entregado:true, productos:[_lin('CH1212','SOMIER TITANIO ICE','140x190',12)] }) ];
    await _cargar(peds, _stock(function(st){ st.c.u[KT]=5; st.h=[{ f:d2, hora:'10:05:32', alm:_LOG, rol:'log', n:1, u:5, ts:_ts(d2,'10:10:00'), inc:false },
                                                               { f:d1, hora:'10:05:32', alm:_LOG, rol:'log', n:1, u:5, ts:_ts(d1,'10:10:00'), inc:false }]; }, { f:d2, hora:'10:05:32' }));
    var u1={}, u2={}; u1[KT]=5; u2[KT]=5;
    var dias=[ { fecha:d1, datos:{ PTF:{ f:d1, h:'10:05:32', u:u1 } } }, { fecha:d2, datos:{ PTF:{ f:d2, h:'10:05:32', u:u2 } } } ];
    out.entT=(sfHistSvg(_fila(KT), dias, _d(-29), hoy).match(/entraron [0-9]+/g)||[]);
    out.entZ=(_fila(KZ) ? (sfHistSvg(_fila(KZ), dias, _d(-29), hoy).match(/entraron [0-9]+/g)||[]) : ['sin fila']);
    /* (Man-VM8) ESPECIAL JUNIOR (ya no se fabrica): 5 vendidos, 0 en PTF y Banzer, 2 en Moreno. */
    var KJ=_k('CH1075','ESPECIAL JUNIOR','105x190');
    await _cargar([ _ped({ fecha:_d(4), productos:[_lin('CH1075','ESPECIAL JUNIOR','105x190',5)] }) ], _stock(function(st){ st.c.u[KJ]=0; st.g[_BZ].u[KJ]=0; st.g[_IM].u[KJ]=2; }));
    var oj=_fila(KJ); out.jun={ aviso:oj.aviso, acc:sfAccion(oj) };
    /* (VI-1) Al guardar, un renglón que el panel no reconoce también se pregunta. */
    await _cargar([], _stock(function(st){ st.c.u[KT]=4; }));
    showView('form'); resetForm();
    var c=document.querySelector('#f-productos .prod-card'), fire=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
    var de=c.querySelector('.prod-desc'); de.value='COLCHON MARCIANO RARO'; fire(de);
    var me=c.querySelector('.prod-medida'); me.value='160x190'; fire(me,'change');
    var q=c.querySelector('.prod-cant'); q.value='1'; fire(q);
    var f=document.getElementById('f-fecha'); f.value=_d(3); fire(f,'change');
    var msg='', cf=window.confirm; window.confirm=function(m){ msg=String(m||''); return true; };
    try{ saldoConfirmarAlGuardar(null, false, false); }finally{ window.confirm=cf; }
    out.preg=msg;
    return out;
  });
  chk('RS15a (VV3) con «NO incluye las entregas» (`inc:false`) contestado: las 3 de la mañana no dibujan «+3 entraron» (antes se leía la hora)', r && r.entT && r.entT.length===0, r);
  chk('RS15b (VV3) un producto que no figura en ninguno de los dos Excel no «entró» aunque hayan salido 12 (el caso de las PATAS)', r && r.entZ && r.entZ.length===0, r);
  chk('RS15c (Man-VM8) un descontinuado con 2 en Moreno y 5 vendidos: «🚚 Traé 2 de Moreno» Y dice que 3 no llegan (ya no se fabrica)',
      r && r.jun && r.jun.aviso==='traer' && /Traé 2 de Moreno/.test(r.jun.acc) && /3 vendidos no llegan: ya no se fabrica/.test(r.jun.acc), r && r.jun);
  chk('RS15d (VI-1) al guardar, el renglón que el panel no reconoce SÍ se pregunta («❓ no reconozco este producto»)', r && /no reconozco este producto/.test(r.preg||''), r && r.preg);

  const errs=page._err.filter(function(e){ return !/Leaflet|L is not defined|ensureLeaflet|tile/i.test(e); });
  chk('sin errores de JS', errs.length===0, errs.join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
