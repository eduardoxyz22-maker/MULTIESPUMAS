/* 📋 FLUJOS A MANO, RECOGIDAS, CONTROL DEL EXCEL Y CIERRE (18/10, §4ls — revisión 2 de Stock, prioridad 1.5-1.9 y 0.9).

   LO QUE ESTA PRUEBA CUIDA (los «FL» fallan contra la página de antes, `234e277`; los «control» pasan en las dos):
   FL1  «📋 Conté a mano» guardado SIN TOCAR NADA no cambia ninguna fila (Man-VM2): conserva «lo que no figura está en 0» del Excel
        (`solo0`: antes 191 productos pasaban a «sin contar» y el plan del mes perdía 67 u), el PTF negativo (−3, no 0), el almacén y la
        hora del conteo; «conteo a mano» lo sigue diciendo (`mano:1`) y un Excel sacado antes del conteo no entra.
   FL2  «✅ Llegó» de una recogida que el Excel de PTF de después YA trae (Man-VM3a): pregunta en el renglón; «sí» la cierra con esa
        detección, sin sumar otra vez (PTF 4, no 6) ni restarle de nuevo a Moreno; «no» la suma (6).
   FL3  Las recogidas VENCEN como el «Ya pedí» (Man-VM3b): con un Excel de PTF de un día posterior al de ir a buscarla (o a los 2 días)
        dejan de contar como «en camino» y de apartar lo de Moreno, pero siguen en la lista para cerrarlas (no se cierran solas).
   FL4  Al llegar la recogida se ofrece pasar las líneas «📥 recoger» que la esperaban a «✔ hay acá» (V-REV-3).
   FL5  «📤 Salió sin pedido» pregunta de qué depósito salió (PTF o Banzer), baja ese, y tiene «↩️ anular» con lápida (Man-VM5).
   FL6  Control del Excel: lo anotado con «✅ Llegó» antes del corte entra en lo esperado (VE2: antes «+4 sin explicar» y «cerrar»).
   FL7  …las detecciones viejas no se ofrecen contra pedidos posteriores a su corte (VE8), y «Cerraste N pedidos» cuenta pedidos.
   FL8  …las llegadas se comparan con la HORA DEL CORTE, no con la de subida: volver a subir el mismo Excel no borra lo anotado
        después de esa hora (VE9).
   FL9  Cierre de entregas: el día de un atrasado lo elige la persona («el día que tenía» / «hoy»), cada botón dice qué hace en el stock,
        el día hábil anterior se propone a la vista, y sin elegir no se confirma (Cie-C5).
   FL10 Vista previa del Excel: tocar afuera (o Esc) no la cierra mientras queden almacenes del archivo (VE4); con el último del archivo
        tampoco: avisa, y «Cancelar» dice qué no se usó (19/10, §4ls verificación final, PA-7; antes con el último era «Cancelar» callado).
   FL11 Una ventana nueva se abre desde arriba; repintar la misma conserva el lugar (VB-3).
   FL12 «Usar y seguir» se apaga y dice «Guardando…»: un segundo toque no confirma el almacén siguiente sin verlo (VB-2/VB-5).

   Reloj CLAVADO (cada parte dice a qué hora). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_rev2_flujos.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_234e277.html node tests/test_stock_rev2_flujos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J=(x)=>JSON.stringify(x);

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
  window._guardados=[];
  apiSave=function(rec){ window._guardados.push(rec && rec.id); return Promise.resolve({ ok:true, pedido:rec }); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); try{ return _t(m,k,ms); }catch(e){} };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._ts=function(f, h){ return new Date(f+'T'+h+'-04:00').getTime(); };
  window._stock=function(fn, opt){
    opt=opt||{}; var f=opt.f||todayStr(), hora=opt.hora||'10:05:32', t=_ts(f, opt.subido||'10:10:00');
    var st={ v:2, pv:3, c:{ f:f, hora:hora, u:{}, solo0:true, alm:_LOG, cod:{}, t:t }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:f, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.g[_IM]={ f:f, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(opt.inc) st.c.incT=opt.inc;
    if(fn) fn(st);
    return st;
  };
  window._ped=function(id, fecha, turno, lineas, extra){
    return Object.assign({ id:id, oc:'OC 10-'+id.slice(-3), fecha:fecha, turno:turno, cliente:'CLIENTE '+id.toUpperCase(), vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:lineas }, extra||{});
  };
  window._lin=function(k3, cant, extra){ var a=k3.split('|'); return Object.assign({ codigo:a[0], desc:a[1], medida:a[2], cant:cant }, extra||{}); };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; stockOlvidarIndice();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._foto=function(){ var m={}; stockData().lista.forEach(function(o){ m[o.k]=[o.deposito, o.comp, o.enSale||0, o.fabricar||0, o.aviso||'', (o.porDia||0).toFixed(3)]; }); return m; };
  window._R=function(alm, f, h, cants, extra){
    var items=[], tot=0;
    Object.keys(cants).forEach(function(k){ var a=k.split('|'); items.push({ cod:'X'+items.length, desc:k, medida:a[1]||'', cant:cants[k], cat:true, k:k }); tot+=cants[k]; });
    return Object.assign({ fecha:f, hora:h, sacado:f, sinFecha:false, almacen:alm, items:items, total:tot, repetidos:0, malos:0, colCant:'G', solo0:true, cods:{},
                           esLog:alm===_LOG, conocido:true }, extra||{});
  };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._T='CH1201|TITANIO ICE|160x190'; window._S='CH1212|SOMIER TITANIO ICE|140x190'; window._W='CH1208|SOMIER TITANIO ICE|160x190';
  window._K=_k('CH1201','TITANIO ICE','160x190'); window._K2=_k('CH1212','SOMIER TITANIO ICE','140x190'); window._K3=_k('CH1208','SOMIER TITANIO ICE','160x190');
}
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.message || e) }; } }, [fn.toString(), arg]);

async function abrir(browser, file, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1200, height:900 }, timezoneId:'America/La_Paz' });
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
  const errores=[];
  let r;

  // ═══ FL1. Conté a mano sin tocar nada ═══ (viernes 16/10 12:00)
  console.log('\n── FL1. «📋 Conté a mano» guardado sin tocar nada (Man-VM2) ──');
  let page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var hoy=todayStr(), man=proximoDiaEntrega(), out={};
    /* Excel de PTF de las 10:05 (trae la mañana): TITANIO 8, SOMIER 140 en −3 (PTF negativo); el SOMIER 160 NO está en el Excel (vale 0 = «no
       hay, producir»), tiene 6 en Banzer, uno que salió hoy a la tarde y 4 vendidos para mañana. */
    var peds=[ _ped('a01', man, 'AM', [_lin(_T,2)]), _ped('a02', man, 'AM', [_lin(_W,4)]), _ped('a03', hoy, 'PM', [_lin(_W,1)], { entregado:true }),
               _ped('a04', man, 'AM', [_lin(_S,1)]) ];
    var K5=_k('CH1129','COLCHON TITANIO LATEX','140x190');   // solo en Banzer, sin ventas: no entra en la lista del conteo (el caso de los 191)
    await _cargar(peds, _stock(function(st){ st.c.u[_K]=8; st.c.u[_K2]=-3; st.g[_BZ].u[_K3]=6; st.g[_BZ].u[K5]=4; }, { inc:'am' }));
    STATE.forEach(function(p){ if(p.entregado) (p.productos||[]).forEach(function(x){ x.eF=hoy; }); }); stockOlvidarIndice();
    var antes=_foto();
    abrirStockConteo();
    var neg=[].slice.call(document.querySelectorAll('#modal-box input[id^="stk-"]')).filter(function(x){ return x.getAttribute('data-k')===_K2; })[0];
    out.negCampo=neg ? neg.value : null;
    guardarStockConteo(); stockOlvidarIndice();
    var desp=_foto(), dif=[];
    Object.keys(antes).concat(Object.keys(desp)).forEach(function(k){ if(J(antes[k])!==J(desp[k]) && dif.indexOf(k)<0) dif.push(k+': '+J(antes[k])+' → '+J(desp[k])); });
    out.dif=dif; out.n=Object.keys(antes).length;
    out.c={ solo0:!!STOCK.c.solo0, alm:STOCK.c.alm||'', hora:STOCK.c.hora||'', mano:STOCK.c.mano||0, negBase:(STOCK.c.u||{})[_K2] };
    out.k3={ dep:_fila(_K3).deposito, fab:_fila(_K3).fabricar }; out.k5={ dep:(_fila(K5)||{}).deposito, enLista:[].slice.call(document.querySelectorAll('#modal-box input[id^="stk-"]')).some(function(x){ return x.getAttribute('data-k')===K5; }) };
    out.aMano=stockConteoAMano(); out.viejo=stockCorteViejo();
    var S=leerStock({ observaciones:filaStock().observaciones }); out.leido={ mano:S.c.mano||0, solo0:!!S.c.solo0, alm:S.c.alm||'', hora:S.c.hora||'' };
    /* Un Excel sacado a las 10:30 (antes del conteo de las 12:00) no entra, con el texto del conteo a mano. */
    var C=stockConciliar(_R(_LOG, hoy, '10:30:00', { [_K]:8 }), 'log', { am:true, pm:false });
    out.excelViejo={ viejo:!!C.corteViejo, aMano:!!C.previoAMano, txt:existCorteViejoTxt(C) };
    function J(x){ return JSON.stringify(x); }
    return out;
  });
  chk('FL1a · guardar «Conté a mano» SIN TOCAR NADA no cambia ninguna fila (depósito, vendido, Banzer, 7 días, aviso, ritmo)', r.dif && r.dif.length===0 && r.n>0, J(r.dif||r));
  chk('FL1b · el corte conserva «lo que no figura está en 0», el almacén del Excel y la hora del conteo, y queda como conteo a mano', r.c && r.c.solo0 && r.c.alm==='PRODUCTOS TERMINADOS FAB.' && /^12:00/.test(r.c.hora) && r.c.mano===1 && r.aMano===true && r.viejo===false, J([r.c, r.aMano, r.viejo]));
  chk('FL1c · lo que el Excel no traía no pasa a «sin contar»: el SOMIER 160 (con una salida de hoy) sigue en −1 y el que solo está en Banzer, fuera de la lista del conteo, en 0 (antes «sin contar»)',
      r.k3 && r.k3.dep===-1 && r.k5 && r.k5.dep===0 && r.k5.enLista===false, J([r.k3, r.k5]));
  /* ✏️ (18/10, §4ls, corrector, a conciencia) El campo MUESTRA el −3 (con su nota): si mostraba 0, quien contó 0 no podía decirlo. */
  chk('FL1d · el PTF negativo se muestra −3 en el campo y queda −3 sin tocarlo (antes 0)', r.negCampo==='-3' && r.c && r.c.negBase===-3, J([r.negCampo, r.c && r.c.negBase]));
  chk('FL1e · se guarda y se lee igual (`filaStock` → `leerStock`)', r.leido && r.leido.mano===1 && r.leido.solo0 && r.leido.alm && r.leido.hora, J(r.leido));
  chk('control · FL1f · un Excel sacado ANTES del conteo no entra y lo dice con el texto del conteo a mano', r.excelViejo && r.excelViejo.viejo && r.excelViejo.aMano && /conteo a mano/.test(r.excelViejo.txt), J(r.excelViejo));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL2. «Llegó» de una recogida que el Excel de PTF ya trae ═══ (sábado 17/10 11:20)
  console.log('\n── FL2. «✅ Llegó» de una recogida después del Excel de PTF que ya la trae (Man-VM3a) ──');
  const recFL2 = async (modo) => {
    const pg = await abrir(browser, PEDIDOS, '2026-10-17T11:20:00-04:00');
    const x = await corre(pg, async (modo) => {
      var hoy=todayStr(), out={};
      /* El 16/10 a las 12:05 se programó traer 2 de Moreno para el 17/10. La camioneta las trajo temprano. El Excel de los 3 almacenes del
         17/10 10:00: PTF 2→4 (el control mostró +2 sin explicar y nadie lo tildó), Moreno 3→1. */
      var st=_stock(function(s){
        s.c.u[_K]=4; s.g[_IM].u[_K]=1;
        s.p=[{ id:'rc1', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-16', esp:'2026-10-17', r:'', t:_ts('2026-10-16','12:05:00') }];
        s.det=[{ id:'d:prueba', k:_K, t:2, u:2, f:'2026-10-17', hora:'10:00:00', hu:'hu17' }];
        s.h=[{ f:'2026-10-17', hora:'10:00:00', alm:_LOG, rol:'log', n:1, u:4, ts:_ts('2026-10-17','10:10:00') },
             { f:'2026-10-16', hora:'10:10:00', alm:_LOG, rol:'log', n:1, u:2, ts:_ts('2026-10-16','10:15:00') }];
      }, { f:'2026-10-17', hora:'10:00:00', subido:'10:10:00' });
      await _cargar([ _ped('p01', '2026-10-20', 'AM', [_lin(_T,1)]) ], st);
      out.antes={ dep:_fila(_K).deposito, im:STOCK.g[_IM].u[_K] };
      abrirStockEntrada();
      recibirStockPedido('rc1');
      var preg=document.getElementById('stk-rec-preg-rc1');
      out.pregunta=preg ? (preg.textContent||'').replace(/\s+/g,' ') : '';
      out.cerradaSinElegir=!!((STOCK.p||[]).filter(function(q){ return q.id==='rc1'; })[0]||{}).r;
      var b=document.querySelector(modo==='excel' ? '.stk-rec-excel' : '.stk-rec-sumar');
      if(b) b.click(); else recibirStockPedido('rc1', modo);
      stockOlvidarIndice();
      var q=(STOCK.p||[]).filter(function(z){ return z.id==='rc1'; })[0]||{};
      out.despues={ dep:_fila(_K).deposito, im:STOCK.g[_IM].u[_K], cerrada:!!q.r, det:(STOCK.det[0]||{}).u, entradas:(STOCK.e||[]).filter(function(e){ return e.k===_K; }).length,
                    camino:_fila(_K).enCamino };
      var S=leerStock({ observaciones:filaStock().observaciones }); stockOlvidarIndice();
      out.releido={ dep:(function(){ var s0=STOCK; STOCK=S; stockOlvidarIndice(); var d=_fila(_K).deposito; STOCK=s0; stockOlvidarIndice(); return d; })() };
      return out;
    }, modo);
    errores.push.apply(errores, pg._err); await pg.close();
    return x;
  };
  r = await recFL2('excel');
  chk('FL2a · con una detección del Excel de PTF posterior a la programación, «Llegó» PREGUNTA en el renglón y no anota nada todavía',
      /ya mostró 2 de más sin explicar/.test(r.pregunta||'') && r.cerradaSinElegir===false, J([r.pregunta, r.cerradaSinElegir, r.__error]));
  chk('FL2b · «Sí, ya están en ese Excel»: la recogida se cierra con esa detección y PTF queda en 4 (antes 6: dos colchones que no existen)',
      r.despues && r.despues.dep===4 && r.despues.cerrada && r.despues.det===0 && r.despues.entradas===0 && r.despues.camino===0, J([r.antes, r.despues]));
  chk('FL2c · …a Moreno no se le resta otra vez (su Excel del 17/10 ya no las tenía: queda 1) y se guarda igual', r.despues && r.despues.im===1 && r.releido && r.releido.dep===4, J([r.despues, r.releido]));
  r = await recFL2('sumar');
  chk('control · FL2d · «No, llegaron después»: se suman a PTF como siempre (6)', r.despues && r.despues.dep===6 && r.despues.cerrada, J(r.despues||r));

  // ═══ FL3. Las recogidas vencen ═══
  console.log('\n── FL3. Una recogida vence como el «Ya pedí» (Man-VM3b) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T11:20:00-04:00');
  r = await corre(page, async () => {
    var out={};
    var rc=function(){ return [{ id:'rc2', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-15', esp:'2026-10-16', r:'', t:_ts('2026-10-15','15:00:00') }]; };
    /* Sin tocar: el Excel de PTF del 17/10 (posterior al día de ir a buscarla) no la trae. */
    await _cargar([ _ped('p02', '2026-10-21', 'AM', [_lin(_T,6)]) ], _stock(function(s){ s.c.u[_K]=1; s.g[_IM].u[_K]=3; s.p=rc(); }, { f:'2026-10-17', hora:'10:00:00' }));
    var o=_fila(_K), d=stockData();
    out.v={ camino:o.enCamino, otros:o.enOtros, ab:d.abiertos.filter(function(q){ return q.id==='rc2'; }).map(function(q){ return !!q.vencida; }), abierta:!(STOCK.p[0].r), libre:stockLibreOrigen(_K,_IM) };
    abrirStock(); var body=document.getElementById('stock-body'); out.txt=body && /venció: ya no cuenta como en camino/.test(body.innerHTML);
    try{ document.getElementById('stock-overlay').classList.remove('on'); }catch(e){}
    /* Con el Excel de PTF del MISMO día de ir a buscarla, todavía cuenta. */
    await _cargar([ _ped('p02', '2026-10-21', 'AM', [_lin(_T,6)]) ], _stock(function(s){ s.c.u[_K]=1; s.g[_IM].u[_K]=3; s.p=rc(); }, { f:'2026-10-16', hora:'10:00:00' }));
    o=_fila(_K); out.noVence={ camino:o.enCamino, otros:o.enOtros };
    var q=STOCK.p[0];
    var V=(typeof stockRecogidaVencida==='function') ? stockRecogidaVencida : function(){ return 'no existe'; };
    out.fecha={ d17:V(q,'2026-10-17'), d18:V(q,'2026-10-18'), d19:V(q,'2026-10-19') };
    return out;
  });
  chk('FL3a · con el Excel de PTF de un día POSTERIOR al de ir a buscarla, la recogida no llegada ya no cuenta como «en camino» (antes 2)', r.v && r.v.camino===0, J(r.v||r));
  chk('FL3b · …y deja de apartar lo de Moreno: vuelve a estar libre (3, antes 1)', r.v && r.v.otros===3 && r.v.libre===3, J(r.v));
  chk('FL3c · …pero NO se cierra sola: sigue en la lista con «venció» para tocar 📥 Llegó o ✕', r.v && r.v.abierta && J(r.v.ab)===J([true]) && r.txt===true, J([r.v && r.v.ab, r.txt]));
  chk('control · FL3d · con el Excel del mismo día todavía cuenta (en camino 2, Moreno 1 libre)', r.noVence && r.noVence.camino===2 && r.noVence.otros===1, J(r.noVence));
  chk('FL3e · sin Excel nuevo, vence a los 2 días del de ir a buscarla (17 y 18 no; 19 sí)', r.fecha && r.fecha.d17===false && r.fecha.d18===false && r.fecha.d19===true, J(r.fecha));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL4. Pasar las 📥 a ✔ ═══
  console.log('\n── FL4. Al llegar la recogida, las líneas «📥» que la esperaban (V-REV-3) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T11:20:00-04:00');
  r = await corre(page, async () => {
    var out={};
    var peds=[ _ped('q01', '2026-10-18', 'AM', [_lin(_T,2,{ chk:'im' })]), _ped('q02', '2026-10-25', 'AM', [_lin(_T,5,{ chk:'im' })]),
               _ped('q03', '2026-10-18', 'AM', [_lin(_S,1,{ chk:'im' })]) ];
    await _cargar(peds, _stock(function(s){ s.c.u[_K]=0; s.g[_IM].u[_K]=9; s.g[_IM].u[_K2]=4;
      s.p=[{ id:'rc3', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-16', esp:'2026-10-17', r:'', t:_ts('2026-10-16','12:05:00') }]; }, { f:'2026-10-16', hora:'10:10:00' }));
    abrirStockEntrada(); recibirStockPedido('rc3');
    var box=document.getElementById('stk-rec-lineas');
    out.ofrece=box ? [].slice.call(box.querySelectorAll('input.stk-rec-linea')).map(function(c){ var l=STOCK_REC_LINEAS.L[Number(c.getAttribute('data-n'))]; return [l.id, c.checked]; }) : null;
    var ok=document.getElementById('stk-rec-lineas-ok'); if(ok) ok.click();
    await _esperar(250);
    var x1=findById('q01').productos[0], x2=findById('q02').productos[0], x3=findById('q03').productos[0];
    out.marcas=[x1.chk, x1.chkDe||'', x2.chk, x3.chk]; out.guardo=window._guardados.indexOf('q01')>=0;
    out.dep=_fila(_K).deposito;
    return out;
  });
  chk('FL4a · al registrar la llegada se ofrecen las líneas «📥 recoger» de ese producto y de ese almacén, tildadas hasta lo que llegó (q01 sí, q02 no: son 5)',
      J(r.ofrece)===J([['q01',true],['q02',false]]), J([r.ofrece, r.__error]));
  chk('FL4b · «Pasar» deja q01 en «✔ hay acá» (sin almacén) y la guarda; q02 y la de otro producto quedan como estaban', r.marcas && J(r.marcas)===J(['ok','','im','im']) && r.guardo, J(r.marcas));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL5. Salió sin pedido, de qué depósito, y anular ═══
  console.log('\n── FL5. «📤 Salió sin pedido» de Banzer y «↩️ anular» (Man-VM5) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var out={};
    await _cargar([ _ped('s01', proximoDiaEntrega(), 'AM', [_lin(_T,1)]) ], _stock(function(s){ s.c.u[_K]=1; s.g[_BZ].u[_K]=8; }, { inc:'am' }));
    var f0=_fila(_K); out.antes={ dep:f0.deposito, sale:f0.enSale };
    abrirStockSalida();
    var sel=document.getElementById('stk-sal-dep');
    out.opciones=sel ? [].slice.call(sel.options).map(function(o){ return o.value; }) : null;
    document.getElementById('stk-sal-k').value=_K; document.getElementById('stk-sal-u').value='3';
    if(sel) sel.value=_BZ;
    guardarStockSalida(); stockOlvidarIndice();
    var f1=_fila(_K); out.despues={ dep:f1.deposito, sale:f1.enSale, para:f1.paraSalir, alm:(STOCK.sm[0]||{}).alm };
    abrirStockSalida(); out.lista=!!document.querySelector('#stk-sal-lista .stk-sal-anular');
    var id=(STOCK.sm[0]||{}).id;
    out.anulo=(typeof anularStockSalida==='function') ? anularStockSalida(id) : 'no existe';
    stockOlvidarIndice(); var f2=_fila(_K);
    out.trasAnular={ sale:f2.enSale, dep:f2.deposito, n:STOCK.sm.length, an:!!(STOCK.sm[0]||{}).an };
    var m=JSON.parse(JSON.stringify(STOCK)), b=JSON.parse(JSON.stringify(STOCK)), s=JSON.parse(JSON.stringify(STOCK)); delete b.sm[0].an; delete s.sm[0].an; m.sm[0].an={ t:1, m:'anulada a mano' };
    out.junta=!!(stockFusionar(b, m, s).sm[0]||{}).an;
    return out;
  });
  chk('FL5a · el modal pregunta de qué depósito salió: PTF o Banzer', r.opciones && r.opciones.indexOf('')>=0 && r.opciones.indexOf('Almacen Distribucion Banzer')>=0, J(r.opciones||r));
  chk('FL5b · 3 que salieron de Banzer bajan Banzer (8 → 5) y PTF queda en 1 (antes PTF −2 y Banzer 8)', r.despues && r.despues.sale===5 && r.despues.dep===1 && r.despues.para===6 && r.despues.alm==='Almacen Distribucion Banzer', J([r.antes, r.despues]));
  chk('FL5c · la salida anotada se ve con «↩️ anular» y anularla la deja con lápida (no se borra) y Banzer vuelve a 8', r.lista && r.anulo===true && r.trasAnular && r.trasAnular.sale===8 && r.trasAnular.n===1 && r.trasAnular.an, J([r.lista, r.anulo, r.trasAnular]));
  chk('control · FL5d · la lápida sobrevive a la junta con dos copias que no la tienen', r.junta===true, J(r.junta));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL6-FL7. El control del Excel ═══
  console.log('\n── FL6/FL7. El control del Excel: llegadas anotadas y detecciones viejas (VE2, VE8) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T10:20:00-04:00');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    /* VE2: pedido a fábrica de 5; a las 09:00 de hoy «✅ Llegó» 4. Excel de hoy 10:10: 9 (5 + 4). */
    await _cargar([], _stock(function(s){ s.c.u[_K]=5;
      s.p=[{ id:'fp1', k:_K, u:5, fab:'MORENO', f:'2026-10-14', esp:'', r:'', recs:[{ id:'r1', u:4, f:hoy, ts:_ts(hoy,'09:00:00') }] }]; }, { f:'2026-10-16', hora:'10:10:00', subido:'10:15:00' }));
    out.dep=_fila(_K).deposito;
    var C=stockConciliar(_R(_LOG, hoy, '10:10:00', { [_K]:9 }), 'log', { am:false, pm:false }), f=C.filas.filter(function(x){ return x.k===_K; })[0], t=(C.todas||[]).filter(function(x){ return x.k===_K; })[0]||{};
    out.ve2={ dif:t.dif, sug:f?f.sug.length:0, ent:t.ent };
    /* VE8: dos detecciones viejas sin asignar (14/10 12:38 y 16/10 10:05) y una recogida programada el 16/10 a las 15:00. Excel de hoy +3. */
    await _cargar([], _stock(function(s){ s.c.u[_K]=12; s.g[_IM].u[_K]=5;
      s.det=[{ id:'d:v1', k:_K, t:1, u:1, f:'2026-10-14', hora:'12:38:00', hu:'a' }, { id:'d:v2', k:_K, t:2, u:2, f:'2026-10-16', hora:'10:05:00', hu:'b' }];
      s.p=[{ id:'rcF', k:_K, u:3, tipo:'recogida', de:_IM, fab:'', f:'2026-10-16', esp:'2026-10-17', r:'', t:_ts('2026-10-16','15:00:00') }]; }, { f:'2026-10-16', hora:'10:05:00' }));
    var R=_R(_LOG, hoy, '10:10:00', { [_K]:15 }), C2=stockConciliar(R, 'log', { am:false, pm:false }), f2=C2.filas.filter(function(x){ return x.k===_K; })[0];
    out.ve8={ sug:(f2?f2.sug:[]).map(function(s){ return [s.d===f2.det ? 'hoy' : s.d, s.q, s.u]; }), dif:f2?f2.dif:0 };
    /* «Cerraste N pedidos»: una detección vieja (14/10) y la de hoy, las dos contra el MISMO pedido (del 13/10): un pedido, no dos. */
    await _cargar([], _stock(function(s){ s.c.u[_K]=10;
      s.det=[{ id:'d:v3', k:_K, t:1, u:1, f:'2026-10-14', hora:'12:38:00', hu:'c' }];
      s.p=[{ id:'fpA', k:_K, u:3, fab:'MORENO', f:'2026-10-13', esp:'', r:'' }]; }, { f:'2026-10-16', hora:'10:05:00' }));
    EXIST_IMP=_R(_LOG, hoy, '10:10:00', { [_K]:12 }); EXIST_COLA=[]; renderImportExist();
    [].slice.call(document.querySelectorAll('input.exist-sug')).forEach(function(c){ c.checked=true; });
    out.tildes=document.querySelectorAll('input.exist-sug').length;
    window._toasts=[]; await confirmarImportExist();
    out.toast=(window._toasts.filter(function(t){ return /Cerraste/.test(t); })[0])||'';
    return out;
  });
  chk('control · FL6a · «✅ Llegó» 4 a las 09:00 sumó al depósito (5 → 9)', r.dep===9, J(r));
  chk('FL6b · el Excel de las 10:10 con 9 CUADRA: lo anotado como llegado entra en lo esperado (antes +4 «sin explicar» con «cerrar»)', r.ve2 && r.ve2.dif===0 && r.ve2.sug===0 && r.ve2.ent===4, J(r.ve2));
  chk('FL7a · las detecciones viejas (14/10 y 16/10 10:05) no se ofrecen contra la recogida programada DESPUÉS (16/10 15:00); la de hoy, sí, entera',
      r.ve8 && J(r.ve8.sug)===J([['hoy','rcF',3]]), J(r.ve8));
  chk('FL7b · dos tildes contra el MISMO pedido: «Cerraste 1 pedido» (antes «2 pedidos»)', r.tildes===2 && /Cerraste 1 pedido a fábrica/.test(r.toast||''), J([r.tildes, r.toast]));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL8. La hora del corte ═══
  console.log('\n── FL8. Las llegadas contra la HORA DEL CORTE: subir otra vez el mismo Excel (VE9) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T10:40:00-04:00');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    /* Excel de las 10:10 subido a las 10:20; a las 10:30 «✅ Llegó» 4 de TITANIO y «📥 Llegó de fábrica» 5 de SOMIER; a las 10:40 se vuelve a
       subir EL MISMO archivo de las 10:10, que no las tiene. */
    await _cargar([], _stock(function(s){ s.c.u[_K]=5; s.c.u[_K2]=1;
      s.p=[{ id:'fp9', k:_K, u:4, fab:'MORENO', f:'2026-10-14', esp:'', r:'', recs:[{ id:'r9', u:4, f:hoy, ts:_ts(hoy,'10:30:00') }] }];
      s.e=[{ id:'e9', f:hoy, k:_K2, u:5, fab:'', ts:_ts(hoy,'10:30:00') }];
      s.h=[{ f:hoy, hora:'10:10:00', alm:_LOG, rol:'log', n:2, u:6, ts:_ts(hoy,'10:20:00') }]; }, { f:hoy, hora:'10:10:00', subido:'10:20:00' }));
    out.antes=[_fila(_K).deposito, _fila(_K2).deposito];
    EXIST_IMP=_R(_LOG, hoy, '10:10:00', { [_K]:5, [_K2]:1 }); EXIST_COLA=[]; renderImportExist();
    await confirmarImportExist(); stockOlvidarIndice();
    out.despues=[_fila(_K).deposito, _fila(_K2).deposito];
    var c={ c:{ f:hoy, hora:'10:10:00', t:_ts(hoy,'10:40:00') } };
    out.vale={ d1030:stockEntradaVale(c, hoy, _ts(hoy,'10:30:00')), d1005:stockEntradaVale(c, hoy, _ts(hoy,'10:05:00')), ayer:stockEntradaVale(c, '2026-10-16', _ts('2026-10-16','18:00:00')) };
    return out;
  });
  chk('control · FL8a · antes de volver a subir: TITANIO 9 y SOMIER 6', J(r.antes)===J([9,6]), J(r));
  chk('FL8b · volver a subir el mismo Excel de las 10:10 a las 10:40 NO borra lo anotado a las 10:30: siguen 9 y 6 (antes 5 y 1)', J(r.despues)===J([9,6]), J(r.despues));
  chk('FL8c · una llegada de las 10:30 vale encima del corte de las 10:10 aunque se haya subido a las 10:40; una de las 10:05, no', r.vale && r.vale.d1030===true && r.vale.d1005===false && r.vale.ayer===false, J(r.vale));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL9. El día de un atrasado en el cierre ═══ (sábado 17/10 09:00)
  console.log('\n── FL9. Cierre: qué día se entregó un atrasado (Cie-C5) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T09:00:00-04:00');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    var bz={ chk:'ok', chkDe:_BZ };
    var peds=[ _ped('c01', '2026-10-16', 'PM', [_lin(_T,1,bz)]), _ped('c02', '2026-10-14', 'AM', [_lin(_S,1,bz)]) ];
    await _cargar(peds, _stock(function(s){ s.c.u[_K]=2; s.c.u[_K2]=2; s.g[_BZ].u[_K]=5; s.g[_BZ].u[_K2]=3; }, { f:hoy, hora:'08:50:00', subido:'08:55:00' }));
    abrirCierreEntregas();
    var chk1=document.querySelector('.cie-ent-chk[data-id="c01"]'); chk1.checked=true; chk1.dispatchEvent(new Event('change'));
    var chk2=document.querySelector('.cie-ent-chk[data-id="c02"]'); chk2.checked=true; chk2.dispatchEvent(new Event('change'));
    var d1=document.getElementById('cie-dia-c01'), d2=document.getElementById('cie-dia-c02');
    out.propuesto=CIERRE_ENT_DIA['c01']||''; out.sinProponer=CIERRE_ENT_DIA['c02']||'';
    out.botones1=d1 ? [].slice.call(d1.querySelectorAll('.cie-dia-btn')).map(function(b){ return [b.getAttribute('data-f'), b.classList.contains('on'), (b.textContent||'').replace(/\s+/g,' ')]; }) : null;
    out.falta2=d2 ? /Falta elegir el día/.test(d2.textContent||'') : false;
    document.getElementById('cie-ent-quien').value='Marisol';
    var r1=await confirmarCierreEntregas();
    out.bloqueado=(r1===null) && !findById('c01').entregado; out.toastFalta=/Falta elegir qué día/.test(window._toasts.slice(-1)[0]||'');
    var bh=document.querySelector('#cie-dia-c02 .cie-dia-btn[data-f="'+hoy+'"]'); if(bh) bh.click();
    var r2=await confirmarCierreEntregas();
    var p1=findById('c01'), p2=findById('c02');
    out.dias=[p1 && p1.entregado ? p1.productos[0].eF : '', p2 && p2.entregado ? p2.productos[0].eF : ''];
    stockOlvidarIndice(); out.banzer=[_fila(_K).enSale, _fila(_K2).enSale];
    return out;
  });
  chk('FL9a · un atrasado del día hábil anterior (viernes 16/10, cierre del sábado) propone SU día, a la vista; uno más viejo no propone nada',
      r.propuesto==='2026-10-16' && r.sinProponer==='', J([r.propuesto, r.sinProponer, r.__error]));
  chk('FL9b · dos botones, «el día que tenía» y «hoy», y cada uno dice qué hace en el stock (con su día: no baja; con hoy: baja Banzer 1)',
      r.botones1 && r.botones1.length===2 && r.botones1[0][0]==='2026-10-16' && r.botones1[0][1]===true && /no baja el stock/.test(r.botones1[0][2]) && /baja Banzer/.test(r.botones1[1][2]) && /1/.test(r.botones1[1][2]),
      J(r.botones1));
  chk('FL9c · sin elegir el día de un atrasado no se confirma nada y se dice cuál falta', r.falta2 && r.bloqueado && r.toastFalta, J([r.falta2, r.bloqueado, r.toastFalta]));
  chk('FL9d · confirmado: el del viernes queda entregado el 16/10 (antes «hoy» 17/10) y el otro el día elegido (hoy)', J(r.dias)===J(['2026-10-16','2026-10-17']), J(r.dias));
  chk('FL9e · Banzer no baja otra vez lo del viernes (el Excel de hoy ya no lo tenía: 5) y sí lo del otro, entregado hoy (3 → 2)', J(r.banzer)===J([5,2]), J(r.banzer));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL10-FL12. La vista previa del Excel y las ventanas ═══ (viernes 16/10 12:00)
  console.log('\n── FL10/FL11/FL12. La vista previa del Excel y las ventanas (VE4, VB-3, VB-2/VB-5) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    await _cargar([], _stock(function(s){ s.c.u[_K]=4; s.g[_BZ].u[_K]=2; s.g[_IM].u[_K]=6; }, { hora:'08:00:00', subido:'08:05:00' }));
    var tres=function(){ return [ _R(_LOG, hoy, '11:00:00', { [_K]:5 }, { lote:{ i:1, n:3 } }), _R(_BZ, hoy, '11:00:00', { [_K]:3 }, { lote:{ i:2, n:3 } }), _R(_IM, hoy, '11:00:00', { [_K]:7 }, { lote:{ i:3, n:3 } }) ]; };
    var L=tres(); EXIST_IMP=L[0]; EXIST_COLA=[L[1], L[2]]; renderImportExist();
    var ov=document.getElementById('modal');
    ov.dispatchEvent(new MouseEvent('click', { bubbles:true }));
    out.fuera={ abierta:ov.classList.contains('on'), imp:!!EXIST_IMP && EXIST_IMP.almacen, cola:(EXIST_COLA||[]).length, toast:/Faltan 2 almacenes/.test(window._toasts.slice(-1)[0]||'') };
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    out.esc={ abierta:ov.classList.contains('on'), imp:!!EXIST_IMP };
    confirmarImportExist(); confirmarImportExist();      // PTF y Banzer: queda Moreno, el último
    out.ultimo=EXIST_IMP && EXIST_IMP.almacen;
    ov.dispatchEvent(new MouseEvent('click', { bubbles:true }));
    /* ✏️ (19/10, §4ls verificación final, PA-7) Con el ÚLTIMO almacén de un archivo de varios, tocar afuera ya NO es «Cancelar»: avisa como
       en los otros (antes descartaba Moreno callado). «Cancelar» sí cierra y dice qué no se usó. */
    out.fueraUltimo={ abierta:ov.classList.contains('on'), imp:!!EXIST_IMP && EXIST_IMP.almacen, toast:/Falta decidir el Excel de/.test(window._toasts.slice(-1)[0]||'') };
    existCancelar();
    out.cancelaUltimo={ abierta:ov.classList.contains('on'), imp:EXIST_IMP, toast:/No se usó el Excel de/.test(window._toasts.slice(-1)[0]||'') };
    /* VB-3: una ventana nueva se abre arriba; la misma ventana repintada, no. */
    var largo=function(t){ return '<div class="modal-h"><h3>'+t+'</h3></div><div class="modal-b"><div style="height:3000px">largo</div></div>'; };
    openModal(largo('Ventana A')); ov.scrollTop=800; var a=ov.scrollTop;
    openModal(largo('Ventana B')); out.nueva=[a, ov.scrollTop];
    ov.scrollTop=500; openModal(largo('Ventana B')); out.misma=ov.scrollTop;
    closeModal();
    /* VB-2: dos toques seguidos en «Usar y seguir». */
    var L2=tres(); L2.forEach(function(x){ x.hora='11:30:00'; }); EXIST_IMP=L2[0]; EXIST_COLA=[L2[1], L2[2]]; renderImportExist();
    var bz0=STOCK.g[_BZ].hora; out.bz0=bz0;
    var b=document.getElementById('exist-usar'); b.click();
    out.toque1={ txt:(b.textContent||''), apagado:!!b.disabled };
    b.click();                                            // el segundo toque, sobre el mismo botón
    await _esperar(150);
    var tit=function(){ var h=document.querySelector('#modal-box .modal-h h3'); return h ? h.textContent : ''; };
    var b2=document.getElementById('exist-usar');
    out.trasToque={ tit:tit(), imp:EXIST_IMP && EXIST_IMP.almacen, bz:STOCK.g[_BZ].hora, b2:(b2&&b2.textContent)||'', b2apagado:!!(b2&&b2.disabled) };
    if(b2) b2.click();                                    // un toque mientras guarda el anterior: no hace nada
    await _esperar(80);
    out.trasToque2={ tit:tit(), bz:STOCK.g[_BZ].hora };
    await _esperar(1200);
    var b3=document.getElementById('exist-usar'); out.despues={ txt:(b3&&b3.textContent)||'', apagado:!!(b3&&b3.disabled) };
    existCancelar();
    return out;
  });
  chk('FL10a · tocar afuera de la vista previa con almacenes del archivo por ver NO la cierra y dice cuáles faltan (antes se cerraba sin cancelar)',
      r.fuera && r.fuera.abierta && r.fuera.imp==='PRODUCTOS TERMINADOS FAB.' && r.fuera.cola===2 && r.fuera.toast, J([r.fuera, r.__error]));
  chk('FL10b · Esc tampoco', r.esc && r.esc.abierta && r.esc.imp, J(r.esc));
  chk('FL10c · con el último almacén (Moreno), tocar afuera tampoco lo descarta: avisa «Falta decidir…» (19/10, PA-7); «Cancelar» cierra, no deja nada colgado y dice qué no se usó',
      r.ultimo==='IM - PRODUCTOTERMINADO' && r.fueraUltimo && r.fueraUltimo.abierta && r.fueraUltimo.imp==='IM - PRODUCTOTERMINADO' && r.fueraUltimo.toast &&
      r.cancelaUltimo && !r.cancelaUltimo.abierta && r.cancelaUltimo.imp===null && r.cancelaUltimo.toast, J([r.ultimo, r.fueraUltimo, r.cancelaUltimo]));
  chk('FL11a · una ventana NUEVA se abre desde arriba (antes heredaba los 800 px de la anterior)', r.nueva && r.nueva[0]>0 && r.nueva[1]===0, J(r.nueva));
  chk('control · FL11b · repintar la MISMA ventana conserva el lugar', r.misma===500, J(r.misma));
  chk('FL12a · «Usar y seguir» se apaga y dice «Guardando…» apenas se toca', r.toque1 && /Guardando/.test(r.toque1.txt) && r.toque1.apagado, J(r.toque1));
  chk('FL12b · el segundo toque no confirma Banzer sin verlo: la ventana queda en «2 de 3» con Banzer sin cambiar (antes «3 de 3»)',
      r.trasToque && /2 de 3/.test(r.trasToque.tit) && r.trasToque.imp==='Almacen Distribucion Banzer' && r.trasToque.bz===r.bz0 && r.bz0!=='11:30:00', J([r.bz0, r.trasToque]));
  chk('FL12c · el botón del almacén que sigue arranca apagado («Guardando PTF…») y un toque ahí no hace nada', r.trasToque && r.trasToque.b2apagado && /Guardando/.test(r.trasToque.b2) && r.trasToque2 && /2 de 3/.test(r.trasToque2.tit) && r.trasToque2.bz===r.bz0, J([r.trasToque, r.trasToque2]));
  chk('FL12d · terminado el guardado, el botón vuelve: «💾 Usar estas existencias y seguir con …»', r.despues && /Usar estas existencias y seguir con/.test(r.despues.txt) && !r.despues.apagado, J(r.despues));
  errores.push.apply(errores, page._err); await page.close();

  // ═══ FL13. Lo que encontraron los verificadores (§4ls, corrector) ═══
  console.log('\n── FL13. Líneas 📥 vencidas, conteo de un negativo, Moreno viejo, cierre a medianoche, ventanas, ATC, recogida atrasada ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T11:20:00-04:00');
  r = await corre(page, async () => {
    var out={};
    /* (V-REV-3) La llegada de una recogida: la línea 📥 del 16/10 (ya pasó) se ofrece DESTILDADA y avisa; la del 18/10, tildada. */
    var peds=[ _ped('q11', '2026-10-16', 'AM', [_lin(_T,2,{ chk:'im' })]), _ped('q12', '2026-10-18', 'AM', [_lin(_T,2,{ chk:'im' })]) ];
    await _cargar(peds, _stock(function(s){ s.c.u[_K]=0; s.g[_IM].u[_K]=9;
      s.p=[{ id:'rc4', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-16', esp:'2026-10-17', r:'', t:_ts('2026-10-16','12:05:00') }]; }, { f:'2026-10-17', hora:'10:10:00' }));
    abrirStockEntrada(); recibirStockPedido('rc4');
    out.lineas=(STOCK_REC_LINEAS && STOCK_REC_LINEAS.L || []).map(function(l){ return [l.id, !!l.on, l.riesgo||'']; });
    var box=document.getElementById('stk-rec-lineas'); out.aviso=box ? /Reprogramala primero/.test(box.textContent||'') : false;
    closeModal();
    /* (Man-VM2) Conté a mano: el −3 se puede corregir a 0. */
    await _cargar([ _ped('n01', proximoDiaEntrega(), 'AM', [_lin(_S,1)]) ], _stock(function(s){ s.c.u[_K2]=-3; }, { f:'2026-10-17', hora:'10:00:00' }));
    abrirStockConteo();
    var neg=[].slice.call(document.querySelectorAll('#modal-box input[id^="stk-"]')).filter(function(x){ return x.getAttribute('data-k')===_K2; })[0];
    out.negNota=!!document.querySelector('#modal-box .stk-conteo-neg');
    if(neg){ neg.value='0'; neg.dispatchEvent(new Event('input', { bubbles:true })); }
    guardarStockConteo(); out.negGuardado=(STOCK.c.u||{})[_K2];
    /* (Man-VM3b) Recogida vencida (Excel de PTF del 17/10) con el Excel de Moreno del 15/10, de ANTES de ir a buscarla: todavía muestra lo
       que la camioneta se llevó, así que lo sigue apartando (libre 1, no 3). Con el de Moreno del 17/10, libre 3. */
    var rc=function(){ return [{ id:'rc5', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-15', esp:'2026-10-16', r:'', t:_ts('2026-10-15','15:00:00') }]; };
    await _cargar([ _ped('p05', '2026-10-21', 'AM', [_lin(_T,6)]) ], _stock(function(s){ s.c.u[_K]=1; s.g[_IM].u[_K]=3; s.g[_IM].f='2026-10-15'; s.p=rc(); }, { f:'2026-10-17', hora:'10:00:00' }));
    out.libreViejo=stockLibreOrigen(_K,_IM);
    await _cargar([ _ped('p05', '2026-10-21', 'AM', [_lin(_T,6)]) ], _stock(function(s){ s.c.u[_K]=1; s.g[_IM].u[_K]=3; s.p=rc(); }, { f:'2026-10-17', hora:'10:00:00' }));
    out.libreNuevo=stockLibreOrigen(_K,_IM);
    /* (test_rev8 §10) La recogida ATRASADA de 1 día (sin Excel de PTF posterior): el cuadrito dice «🚚 VIENE DE … todavía no llegó». */
    await _cargar([], _stock(function(s){ s.c.u[_K]=0; s.g[_IM].u[_K]=3;
      s.p=[{ id:'rc6', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-15', esp:'2026-10-16', r:'', t:_ts('2026-10-15','15:00:00') }]; }, { f:'2026-10-16', hora:'10:00:00' }));
    var v1=saldoVeredicto(_K, 2, '', '2026-10-20', true); out.atr={ tipo:v1.tipo, t:saldoTitulo(v1) };
    /* …y VENCIDA con un Excel de PTF posterior que mostró una entrada sin explicar: no dice «todavía no llegó» a secas. */
    await _cargar([], _stock(function(s){ s.c.u[_K]=0; s.g[_IM].u[_K]=3;
      s.p=[{ id:'rc7', k:_K, u:2, tipo:'recogida', de:_IM, fab:'', f:'2026-10-15', esp:'2026-10-16', r:'', t:_ts('2026-10-15','15:00:00') }];
      s.det=[{ id:'d:x1', k:_K, u:2, t:2, f:'2026-10-17', hora:'10:00:00' }]; }, { f:'2026-10-17', hora:'10:00:00' }));
    var v2=saldoVeredicto(_K, 2, '', '2026-10-20', true); out.venc={ tipo:v2.tipo, t:saldoTitulo(v2) };
    /* (VB-3) La misma ventana con otro número en el título no vuelve arriba. */
    var ov=document.getElementById('modal'), largo=function(t){ return '<div class="modal-h"><h3>'+t+'</h3></div><div class="modal-b" style="height:3000px">x</div>'; };
    openModal(largo('⚠️ 5 pedidos sin camión · hoy')); ov.scrollTop=600; openModal(largo('⚠️ 4 pedidos sin camión · hoy')); out.scroll=ov.scrollTop; closeModal();
    /* (Cie-C5) Una ATC atrasada: el botón del día no dice «el Excel vigente ya no lo tiene». */
    var atc=_ped('a91', '2026-10-15', 'AM', [_lin(_T,1)], { oc:'ATC 10-091' });
    out.atc=cierreEntEfectoTxt(atc, '2026-10-15');
    return out;
  });
  chk('FL13a · (V-REV-3) la línea 📥 de un día que ya pasó se ofrece DESTILDADA y avisa «reprogramala primero»; la del 18/10, tildada',
      J(r.lineas)===J([['q11',false,'pasada'],['q12',true,'']]) && r.aviso===true, J([r.lineas, r.aviso, r.__error]));
  chk('FL13b · (Man-VM2) «Conté a mano» con un PTF en −3: lo muestra con su nota y escribir 0 lo deja en 0 (antes quedaba −3)', r.negNota===true && r.negGuardado===0, J([r.negNota, r.negGuardado]));
  chk('FL13c · (Man-VM3b) la recogida vencida sigue apartando lo de Moreno mientras su Excel sea de antes de ir a buscarla (libre 1); con el de después, 3',
      r.libreViejo===1 && r.libreNuevo===3, J([r.libreViejo, r.libreNuevo]));
  chk('FL13d · (rev8 §10) una recogida atrasada de 1 día (sin Excel de PTF posterior) sigue diciendo «🚚 VIENE DE … todavía no llegó»',
      r.atr && r.atr.tipo==='recogida' && /VIENE DE/.test(r.atr.t) && /todavía no llegó/.test(r.atr.t), J(r.atr));
  chk('FL13e · vencida y con una entrada sin explicar en el Excel de después: «mostró una entrada sin explicar (¿es ella?)», no «todavía no llegó»',
      r.venc && r.venc.tipo==='moreno' && /entrada sin explicar/.test(r.venc.t) && !/todavía no llegó/.test(r.venc.t), J(r.venc));
  chk('FL13f · (VB-3) repintar la misma ventana con otro número en el título conserva el lugar (600)', r.scroll===600, J(r.scroll));
  chk('FL13g · (Cie-C5) en una ATC el botón del día dice «no toca el stock», no «el Excel vigente ya no lo tiene»', r.atc==='no toca el stock', J(r.atc));
  errores.push.apply(errores, page._err); await page.close();

  /* (Cie-C5) El cierre abierto a las 23:58 y confirmado a las 00:02: lo tildado «de hoy» se entrega el día de la lista (16/10). */
  page = await abrir(browser, PEDIDOS, '2026-10-16T23:58:00-04:00');
  await corre(page, async () => {
    await _cargar([ _ped('m01', '2026-10-16', 'AM', [_lin(_T,1)]) ], _stock(function(s){ s.c.u[_K]=3; }, { f:'2026-10-16', hora:'10:00:00' }));
    abrirCierreEntregas();
    var c=document.querySelector('.cie-ent-chk[data-id="m01"]'); c.checked=true; c.dispatchEvent(new Event('change'));
    document.getElementById('cie-ent-quien').value='Marisol';
  });
  await page.clock.setFixedTime(new Date('2026-10-17T00:02:00-04:00'));
  r = await corre(page, async () => {
    var res=await confirmarCierreEntregas(); var p=findById('m01');
    return { ok:res!==null, ent:!!(p && p.entregado), eF:p && p.productos[0].eF || '', falta:/Falta elegir/.test(window._toasts.slice(-1)[0]||'') };
  });
  chk('FL13h · (Cie-C5) el cierre que cruza la medianoche no se traba: entrega el día de la lista (16/10), sin pedir el día', r.ok && r.ent && r.eF==='2026-10-16' && !r.falta, J(r));
  errores.push.apply(errores, page._err); await page.close();

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,400));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
