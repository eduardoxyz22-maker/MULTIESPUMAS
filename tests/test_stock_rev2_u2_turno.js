/* 🚚 EL CAMIÓN DE LA MAÑANA: «ya trae la carga» POR TURNO (18/10, §4ls U2 · Cie-C1 · VE10 · Man-VM12 — decisión 2 del dueño).

   El Excel de las ~10:00 ya NO tiene lo que se cargó en el camión de la mañana (medido del 10 al 16/10: faltaban 26 de 27 u). La casilla
   única «ya incluye las entregas del día» era por día entero y se proponía marcada recién desde las 12:00: lo de la mañana se contaba
   dos veces —reservado y además ausente del Excel— hasta el cierre de las 16:30 (+18 u en «Pedir 7 días» el 16/10), y el control del
   Excel del día siguiente lo volvía a mostrar como «entrada sin explicar» (el lote, como producción; la vista previa, «sellar la llegada»
   de una 🏭 que no llegó). Ahora son DOS casillas, la mañana y la tarde: lo de un turno ya incluido no se reserva ni se resta otra vez,
   tenga ✅ o no; una línea sin turno es de la mañana.

   LO QUE ESTA PRUEBA CUIDA (los «UT» fallan contra la página de antes, `2df7276`; los «control» pasan en las dos):
   UT1  PTF: lo de la MAÑANA de hoy sin ✅ no se reserva (y lo sin turno tampoco); con ✅ no se resta otra vez; lo de la TARDE sí se
        reserva y, con ✅, se resta. El cierre no mueve lo libre. `inc:true` (lo guardado antes) = los dos turnos.
   UT2  Banzer, con su propio Excel: lo mismo (comp, confSale y lo que queda para cargar).
   UT3  La propuesta (`stockIncPropuesta`): sin dato del camión, la mañana desde las 09:30 y la tarde desde las 16:00; con el camión
        («🚚 Ya salió» / GPS), lo que diga el camión (hasta 15 min después del Excel); dos camiones que no coinciden: sin marcar.
   UT4  La vista previa del Excel tiene las DOS casillas (la de la mañana marcada a las 10:05) y lo elegido se guarda en el corte
        (`incT:'am'`, sin `inc`) y en su renglón del historial.
   UT5  El control del corte (y el lote): por turno. El Excel de la tarde del mismo día y el del día siguiente cuadran; antes, «+2 entrada
        sin explicar», detección, «¿llegó lo hecho a pedido? → sellar» y +2 de «producción» en el lote.
   UT6  «📋 Conté a mano» (Man-VM12): las mismas casillas; a las 12:00 se escribe 9 y queda 9 (antes 8); lo que no se tocó deja lo libre
        igual y no deja reservado lo que ya salió.
   UT7  La revisión automática no le reparte stock a lo que ya salió con el camión (lo cuenta aparte, «🚚 ya salieron hoy»).
   UT8  Se conserva al leer, guardar y juntar; `inc:'am'` (escrito por otro) se lee como la mañana; una llegada o una salida a mano (sin
        turno) solo se da por incluida con los dos turnos.
   UT9  🧓 La página de antes (la publicada, `27f0134`, sacada de git): con `incT` sigue andando como siempre, y si guarda el stock y lo borra,
        la página nueva lo repone del historial. Con `inc:'am'` la de antes lo leería como «los dos» (por eso el turno va en `incT`).

   Reloj CLAVADO: viernes 16/10/2026 12:00 de Bolivia (UT5b: sábado 17/10 10:20). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_rev2_u2_turno.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_2df7276.html node tests/test_stock_rev2_u2_turno.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
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
  window._guardado=null;
  apiSave=function(rec){ if(rec && rec.id==='__stock__') window._guardado=rec.observaciones; return Promise.resolve({ ok:true, pedido:rec }); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._ts=function(f, h){ return new Date(f+'T'+h+'-04:00').getTime(); };
  /* Los Excel de HOY a las 10:05 (PTF y Banzer) y de IM; `inc` = cómo quedó la casilla: 'am' / 'pm' (turno solo, `incT`), true (los dos)
     o nada. Una página de antes no conoce `incT` y lo ignora. */
  window._stock=function(fn, opt){
    opt=opt||{}; var hoy=opt.f||todayStr(), hora=opt.hora||'10:05:32', t=_ts(hoy, opt.subido||'10:10:00');
    var st={ v:2, pv:3, c:{ f:hoy, hora:hora, u:{}, solo0:true, alm:_LOG, cod:{}, t:t }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.g[_IM]={ f:hoy, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    var pon=function(x, v){ if(v===true) x.inc=true; else if(v) x.incT=v; };
    pon(st.c, opt.inc); pon(st.g[_BZ], opt.inc);
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
  window._ent=function(id){ var p=findById(id); p.entregado=true; (p.productos||[]).forEach(function(x){ x.eF=p.fecha; }); stockOlvidarIndice(); };
  window._T='CH1201|TITANIO ICE|160x190'; window._S='CH1212|SOMIER TITANIO ICE|140x190'; window._W='CH1208|SOMIER TITANIO ICE|160x190';
  window._K=_k('CH1201','TITANIO ICE','160x190'); window._K2=_k('CH1212','SOMIER TITANIO ICE','140x190'); window._K3=_k('CH1208','SOMIER TITANIO ICE','160x190');
}
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.message || e) }; } }, [fn.toString(), arg]);

async function abrir(browser, file, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1200, height:1000 }, timezoneId:'America/La_Paz' });
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
  let page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');

  // ═══ UT1. PTF ═══
  console.log('\n── UT1. PTF: el Excel de las 10:05 ya trae la mañana ──');
  let r = await corre(page, async () => {
    var hoy=todayStr(), man=proximoDiaEntrega(), out={};
    var peds=function(){ return [ _ped('a01', hoy, 'AM', [_lin(_T,2)]), _ped('p01', hoy, 'PM', [_lin(_T,1)]),
                                  _ped('m01', man, 'AM', [_lin(_T,3)]), _ped('s01', hoy, '', [_lin(_T,1)]) ]; };
    var foto=function(){ var o=_fila(_K); return { comp:o.comp, dep:o.deposito, libre:o.deposito-o.comp, ids:o.compIds.map(function(c){ return c.id; }).sort() }; };
    await _cargar(peds(), _stock(function(st){ st.c.u[_K]=10; }, { inc:'am' }));
    out.sin=foto();
    _ent('a01'); _ent('s01'); out.am=foto();
    _ent('p01'); out.pm=foto();
    await _cargar(peds(), _stock(function(st){ st.c.u[_K]=10; }, { inc:'ampm' })); out.todo=foto();
    /* (§4ls, corrector) `inc:true` SIN `incT` = la casilla única de la página de antes: lo de hoy sin ✅ sigue reservado y con ✅ no se resta. */
    await _cargar(peds(), _stock(function(st){ st.c.u[_K]=10; }, { inc:true })); out.leg=foto(); _ent('a01'); out.legEnt=foto();
    await _cargar(peds(), _stock(function(st){ st.c.u[_K]=10; }, {})); out.nada=foto(); _ent('a01'); _ent('s01'); _ent('p01'); out.nadaEnt=foto();
    return out;
  });
  chk('UT1a · lo de la MAÑANA de hoy sin ✅ no se reserva: comp 4 = tarde 1 + mañana 3 (antes 7)', r.sin && r.sin.comp===4 && r.sin.ids.indexOf('a01')<0, J(r.sin||r));
  chk('UT1b · una línea SIN turno es de la mañana: tampoco se reserva', r.sin && r.sin.ids.indexOf('s01')<0 && r.sin.ids.indexOf('p01')>=0, J(r.sin));
  chk('UT1c · con ✅ lo de la mañana NO se resta otra vez: PTF sigue en 10 (antes 7) y comp 4', r.am && r.am.dep===10 && r.am.comp===4, J(r.am));
  chk('UT1d · el cierre no mueve lo libre: 6 antes y después del ✅ (antes 3, con la mañana contada dos veces)', r.sin && r.am && r.sin.libre===6 && r.am.libre===6, J([r.sin, r.am]));
  chk('UT1e · lo de la TARDE (turno no incluido) sigue reservado y, con ✅, se resta: PTF 9, comp 3, libre 6', r.pm && r.pm.dep===9 && r.pm.comp===3 && r.pm.libre===6, J(r.pm));
  chk('UT1f · los dos turnos con la regla nueva (`inc:true` + `incT:"ampm"`): nada de hoy se reserva ni se resta (PTF 10, comp 3)', r.todo && r.todo.dep===10 && r.todo.comp===3, J(r.todo));
  /* ✏️ (18/10, §4ls, corrector, a conciencia) Antes UT1f esperaba esto mismo de `inc:true` a secas. Pero `inc:true` sin `incT` es lo que deja
     la página SIN F5 con la casilla única marcada desde las 12:00 (el 14/10 a las 12:38 y el 15/10 a las 13:26): leído como «los dos
     turnos», lo de la tarde que todavía estaba en el depósito dejaba de reservarse. */
  chk('UT1g · 🧓 `inc:true` sin `incT` (la casilla de la página de antes): lo de hoy sin ✅ SIGUE reservado (comp 7) y con ✅ no se resta otra vez (PTF 10)',
      r.leg && r.leg.comp===7 && r.leg.dep===10 && r.legEnt && r.legEnt.dep===10 && r.legEnt.comp===5, J([r.leg, r.legEnt]));
  chk('control · sin ningún turno marcado, como siempre: se reserva todo (7) y con ✅ se resta (PTF 6)', r.nada && r.nada.comp===7 && r.nadaEnt.dep===6, J([r.nada, r.nadaEnt]));

  // ═══ UT2. Banzer ═══
  console.log('\n── UT2. Banzer, con su propio Excel ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={};
    var bz={ chk:'ok', chkDe:_BZ };
    var peds=[ _ped('b01', hoy, 'AM', [_lin(_S,2,bz)]), _ped('b02', hoy, 'PM', [_lin(_S,1,bz)]) ];
    await _cargar(peds, _stock(function(st){ st.c.u[_K2]=0; st.g[_BZ].u[_K2]=5; }, { inc:'am' }));
    var foto=function(){ var o=_fila(_K2); return { comp:o.comp, enSale:o.enSale, conf:(o.confSale||{})[_BZ]||0, sale:o.paraSalir }; };
    out.sin=foto(); _ent('b01'); out.am=foto(); _ent('b02'); out.pm=foto();
    return out;
  });
  chk('UT2a · Banzer: lo de la mañana ✔ Banzer sin ✅ no se reserva ni cuenta como «marcado» (comp 1, confSale 1; antes 3 y 3)', r.sin && r.sin.comp===1 && r.sin.conf===1 && r.sin.enSale===5, J(r.sin||r));
  chk('UT2b · con ✅ no baja otra vez el Excel de Banzer: quedan 5 para cargar (antes 3)', r.am && r.am.enSale===5 && r.am.comp===1, J(r.am));
  chk('UT2c · lo de la tarde, con ✅, sí baja Banzer: 4', r.pm && r.pm.enSale===4 && r.pm.comp===0, J(r.pm));

  // ═══ UT3. La propuesta ═══
  console.log('\n── UT3. Qué propone: el camión manda; sin camión, la hora ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={}, P=function(h,d){ var q=stockIncPropuesta(h, d==null?'':d); return [q.am.v, q.pm.v, !!q.am.camion, !!q.pm.camion]; };
    await _cargar([], _stock(null, {}));
    out.h1005=P('10:05:32'); out.h0910=P('09:10:00'); out.h1620=P('16:20:00'); out.sinHora=stockIncPropuesta('', '').sinHora===true;
    var peds=[ _ped('c01', hoy, 'AM', [_lin(_T,1)], { vehiculo:'Carry' }), _ped('c02', hoy, 'PM', [_lin(_T,1)], { vehiculo:'Foton encarpado' }) ];
    await _cargar(peds, _stock(function(st){ st.c.u[_K]=5; }, {}));
    CARGA_CHK[cargaChkKey(hoy,'Carry',CARGA_SALIO)+'|10:16']=1;
    CARGA_CHK[cargaChkKey(hoy,'Foton encarpado',CARGA_SALIO)+'|16:35']=1;
    out.cam1005=P('10:05:32'); out.cam0950=P('09:50:00'); out.cam1610=P('16:10:00'); out.cam1625=P('16:25:00');
    out.txt=stockIncPropuesta('10:05:32','').am.txt;
    STATE.push(_ped('c03', hoy, 'AM', [_lin(_T,1)], { vehiculo:'Foton nuevo' }));
    CARGA_CHK[cargaChkKey(hoy,'Foton nuevo',CARGA_SALIO)+'|11:30']=1;
    out.mixto=P('10:05:32'); out.mixtoTxt=stockIncPropuesta('10:05:32','').am.txt;
    return out;
  });
  chk('UT3a · sin dato del camión: a las 10:05 la mañana sí y la tarde no; a las 09:10 ninguna; a las 16:20 las dos; sin hora, nada',
      r.h1005 && J(r.h1005)===J([true,false,false,false]) && J(r.h0910)===J([false,false,false,false]) && J(r.h1620)===J([true,true,false,false]) && r.sinHora===true, J(r));
  chk('UT3b · con «🚚 Ya salió» manda el camión: Carry 10:16 con el Excel de las 10:05 → ya cargado; con el de las 09:50 → todavía no (aunque sea después de las 09:30)',
      r.cam1005 && r.cam1005[0]===true && r.cam1005[2]===true && r.cam0950[0]===false && r.cam0950[2]===true && /Carry 10:16/.test(r.txt||''), J([r.cam1005, r.cam0950, r.txt]));
  chk('UT3c · la tarde también: el Foton salió 16:35 → el Excel de las 16:10 NO la trae (la hora sola diría que sí); el de las 16:25, sí',
      r.cam1610 && r.cam1610[1]===false && r.cam1610[3]===true && r.cam1625[1]===true, J([r.cam1610, r.cam1625]));
  chk('UT3d · un camión ya había salido y otro todavía no: queda sin marcar y lo dice', r.mixto && r.mixto[0]===false && /todavía no/.test(r.mixtoTxt||''), J([r.mixto, r.mixtoTxt]));

  // ═══ UT4. La vista previa del Excel ═══
  console.log('\n── UT4. Las dos casillas en la vista previa, y lo que se guarda ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={};
    await _cargar([ _ped('d01', hoy, 'AM', [_lin(_T,2)], { entregado:true }) ], _stock(function(st){ st.c.u[_K]=12; }, { hora:'08:00:00', subido:'08:05:00' }));
    EXIST_IMP={ fecha:hoy, hora:'10:05:32', sacado:hoy, sinFecha:false, almacen:_LOG, items:[{ cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:10, cat:true, k:_K }], total:10,
                repetidos:0, malos:0, colCant:'AY', solo0:true, cods:{ CH1201:_K }, esLog:true, conocido:true };
    renderImportExist();
    var am=document.getElementById('exist-inc'), pm=document.getElementById('exist-inc-pm');
    out.am=!!(am && am.checked); out.pm=pm ? !!pm.checked : 'no existe';
    out.txt=((document.getElementById('modal-box')||{}).textContent||'').replace(/\s+/g,' ');
    await confirmarImportExist(); stockOlvidarIndice();
    out.c={ inc:STOCK.c.inc, incT:STOCK.c.incT }; out.h={ inc:STOCK.h[0] && STOCK.h[0].inc, incT:STOCK.h[0] && STOCK.h[0].incT };
    out.dep=_fila(_K).deposito;
    return out;
  });
  chk('UT4a · dos casillas: la de la MAÑANA marcada y la de la TARDE sin marcar para el Excel de las 10:05 (antes una sola, sin marcar)', r.am===true && r.pm===false, J([r.am, r.pm]));
  chk('UT4b · la ventana dice qué hace cada una ("mañana", "tarde", no se reserva ni se descuenta otra vez)', /carga de la mañana/.test(r.txt||'') && /carga de la tarde/.test(r.txt||'') && /no se reserva ni se descuenta otra vez/.test(r.txt||''), (r.txt||'').slice(0,300));
  chk('UT4c · se guarda en el corte como `incT:"am"` (sin `inc`) y en su renglón del historial', r.c && r.c.incT==='am' && !r.c.inc && r.h.incT==='am' && r.h.inc===false, J([r.c, r.h]));
  chk('UT4d · el ✅ de la mañana ya no baja el Excel de las 10:05: PTF 10 (antes 8)', r.dep===10, J(r.dep));

  // ═══ UT5. El control del corte y el lote ═══
  console.log('\n── UT5. El control del corte (y el lote), por turno ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={};
    var peds=[ _ped('e01', hoy, 'AM', [_lin(_T,2)]), _ped('e02', hoy, 'PM', [_lin(_T,1)]),
               _ped('e03', '2026-10-20', 'AM', [_lin(_T,1,{ enProd:true, chk:'no', prodF:'2026-10-14', prodD:'MORENO' })]) ];
    await _cargar(peds, _stock(function(st){ st.c.u[_K]=10; }, { inc:'am' }));
    _ent('e01'); _ent('e02');
    var R={ fecha:hoy, hora:'16:30:00', sacado:hoy, almacen:_LOG, items:[{ cod:'CH1201', desc:'TITANIO ICE', medida:'160x190', cant:9, cat:true, k:_K }], total:9, solo0:true, cods:{}, esLog:true };
    var C=stockConciliar(R, 'log', { am:true, pm:true });
    var f=C.filas.filter(function(x){ return x.k===_K; })[0]||null;
    out.dif=f?f.dif:0; out.fab=f?f.fab.length:0; out.det=f?(f.tipo==='mas'):false; out.cuadran=C.resumen.cuadran;
    var t=(C.todas||[]).filter(function(x){ return x.k===_K; })[0]||{};
    out.lote=existLoteProduccion({ roles:{ log:1, otro:1 }, dif:{ [_K]:Number(t.dif)||0 }, ent:{ [_K]:Number(t.ent)||0 }, n:2 })[_K]||0;
    out.txt=String(typeof stockVentanaTxt==='function' ? stockVentanaTxt(C.ventana) : '');
    return out;
  });
  chk('UT5a · el Excel de la TARDE del mismo día (16:30, los dos turnos) cuadra: lo de la mañana ya no estaba en el de las 10:05 (antes «+2 entrada sin explicar»)', r.dif===0 && r.det===false, J(r));
  chk('UT5b · …sin sugerir «¿llegó lo hecho a pedido? → sellar la llegada» de una 🏭 que no llegó', r.fab===0, J(r.fab));
  chk('UT5c · …y el lote no lo toma como producción (antes +2)', r.lote===0, J(r.lote));
  chk('UT5d · la caja del control dice qué entra del día del corte anterior', /solo lo de la tarde/.test(r.txt||''), r.txt);
  await page.close();

  // Día siguiente: sábado 17/10 a las 10:20
  page = await abrir(browser, PEDIDOS, '2026-10-17T10:20:00-04:00');
  r = await corre(page, async () => {
    var ayer='2026-10-16', hoy=todayStr(), out={};
    var base=function(){ return [ _ped('f01', ayer, 'AM', [_lin(_T,2)], { entregado:true }), _ped('f02', ayer, 'PM', [_lin(_T,1)], { entregado:true }) ]; };
    var st=function(){ return _stock(function(s){ s.c.u[_K]=10; }, { f:ayer, inc:'am' }); };
    await _cargar(base(), st());
    STATE.forEach(function(p){ (p.productos||[]).forEach(function(x){ if(p.fecha===ayer) x.eF=ayer; }); });
    var prop=(typeof stockIncPropuesta==='function') ? stockIncPropuesta('10:10:00','') : null, inc=prop ? { am:prop.am.v, pm:prop.pm.v } : false;
    var R=function(n){ return { fecha:hoy, hora:'10:10:00', sacado:hoy, almacen:_LOG, items:[{ cod:'CH1201', desc:'TITANIO ICE', medida:'160x190', cant:n, cat:true, k:_K }], total:n, solo0:true, cods:{}, esLog:true }; };
    var C=stockConciliar(R(9), 'log', inc), f=C.filas.filter(function(x){ return x.k===_K; })[0];
    out.v1={ dif:f?f.dif:0, inc:inc };
    var p3=_ped('f03', hoy, 'AM', [_lin(_T,3)]); STATE.push(p3); stockOlvidarIndice();
    var C2=stockConciliar(R(6), 'log', inc), f2=C2.filas.filter(function(x){ return x.k===_K; })[0];
    out.v2={ dif:f2?f2.dif:0 };
    return out;
  });
  chk('UT5e · el Excel del día siguiente (17/10 10:10) = el del 16/10 − lo de la tarde: cuadra (antes +2, VE10)', r.v1 && r.v1.dif===0, J(r));
  chk('UT5f · …y con una entrega de la mañana del 17/10 ya cargada (la casilla de la mañana propuesta a las 10:10), también cuadra', r.v2 && r.v2.dif===0, J(r.v2));
  await page.close();

  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  // ═══ UT6. Conté a mano ═══
  console.log('\n── UT6. «📋 Conté a mano» después del camión (Man-VM12) ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={};
    var peds=[ _ped('g01', hoy, 'AM', [_lin(_T,1)], { entregado:true }), _ped('g02', hoy, 'AM', [_lin(_W,2)]) ];
    await _cargar(peds, _stock(function(st){ st.c.u[_K]=8; st.c.u[_K3]=5; }, { hora:'08:00:00', subido:'08:05:00' }));
    STATE.forEach(function(p){ if(p.entregado) (p.productos||[]).forEach(function(x){ x.eF=hoy; }); }); stockOlvidarIndice();
    var a=_fila(_K3); out.antes={ dep:a.deposito, comp:a.comp, libre:a.deposito-a.comp, k:_fila(_K).deposito };
    abrirStockConteo();
    var am=document.getElementById('conteo-inc'), pm=document.getElementById('conteo-inc-pm');
    out.casillas=[am?am.checked:'no existe', pm?pm.checked:'no existe'];
    var el=[].slice.call(document.querySelectorAll('#modal-box input[id^="stk-"]')).filter(function(x){ return x.getAttribute('data-k')===_K; })[0];
    if(el) el.value='9';   // el panel propone 7 (8 del Excel − 1 entregado hoy); contado después del camión hay 9
    guardarStockConteo(); stockOlvidarIndice();
    var b=_fila(_K3); out.despues={ k:_fila(_K).deposito, dep:b.deposito, comp:b.comp, libre:b.deposito-b.comp, incT:STOCK.c.incT||'', inc:!!STOCK.c.inc };
    return out;
  });
  chk('UT6a · el modal tiene las dos casillas, la de la mañana marcada a las 12:00', r.casillas && r.casillas[0]===true && r.casillas[1]===false, J(r.casillas||r));
  chk('UT6b · se cuenta 9 después del camión y queda 9: la entrega de la mañana no se descuenta otra vez (antes 8)', r.despues && r.despues.k===9, J(r.despues||r));
  chk('UT6c · lo que no se tocó deja lo libre igual (3) y no deja reservado lo que ya salió (comp 0; antes 2)', r.despues && r.antes && r.despues.libre===r.antes.libre && r.despues.comp===0, J([r.antes, r.despues]));
  chk('UT6d · el conteo guarda qué turnos ya salieron (`incT:"am"`)', r.despues && r.despues.incT==='am' && !r.despues.inc, J(r.despues));

  // ═══ UT7. La revisión automática ═══
  console.log('\n── UT7. La revisión no le reparte stock a lo que ya salió ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), man=proximoDiaEntrega(), out={};
    await _cargar([ _ped('h01', hoy, 'AM', [_lin(_T,2)]), _ped('h02', man, 'AM', [_lin(_T,2)]) ], _stock(function(st){ st.c.u[_K]=2; }, { inc:'am' }));
    REVSTK_DIAS='todos';
    var A=stockAsignar(), L=function(id){ var e=A.pedidos.filter(function(q){ return q.p.id===id; })[0]; return e ? e.lineas[0].ahora : '(sin propuesta)'; };
    out.h01=L('h01'); out.h02=L('h02'); out.yaSalio=A.tot.yaSalio||0;
    return out;
  });
  chk('UT7a · lo de mañana se lleva las 2 que hay (✔), porque lo de esta mañana ya salió y el Excel ya no lo tiene (antes ✗ no hay)', r.h02==='ok', J(r));
  chk('UT7b · lo de esta mañana no recibe propuesta y se cuenta como «ya salieron hoy»', r.h01==='(sin propuesta)' && r.yaSalio===1, J(r));

  // ═══ UT8. Leer, guardar, juntar ═══
  console.log('\n── UT8. Se conserva al leer, guardar y juntar ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={};
    await _cargar([], _stock(function(st){ st.c.u[_K]=3; st.h=[{ f:hoy, hora:'10:05:32', alm:_LOG, rol:'log', n:1, u:3, ts:_ts(hoy,'10:10:00'), inc:false, incT:'am' }]; }, { inc:'am' }));
    out.leido=STOCK.c.incT||''; out.bz=STOCK.g[_BZ].incT||'';
    var S=leerStock({ observaciones:filaStock().observaciones }); out.guardado=[S.c.incT||'', S.g[_BZ].incT||''];
    var b=JSON.parse(JSON.stringify(STOCK)), m=JSON.parse(JSON.stringify(STOCK)), s=JSON.parse(JSON.stringify(STOCK));
    s.e=[{ id:'e1', f:hoy, k:_K, u:1, ts:_ts(hoy,'11:00:00') }];
    var F=stockFusionar(b, m, s); out.junta=F.c.incT||'';
    var S2=leerStock({ observaciones:JSON.stringify({ c:{ f:hoy, hora:'10:05:32', u:{}, inc:'am' } }) }); out.texto=[S2.c.incT||'', S2.c.inc===undefined];
    out.entradaAm=stockEntradaVale({ c:{ f:hoy, incT:'am' } }, hoy, 0); out.entradaTodo=stockEntradaVale({ c:{ f:hoy, inc:true } }, hoy, 0);
    out.smAm=stockMovDespuesDelCorte({ c:{ f:hoy, incT:'am' } }, hoy, 0); out.smTodo=stockMovDespuesDelCorte({ c:{ f:hoy, inc:true } }, hoy, 0);
    return out;
  });
  chk('UT8a · se lee (PTF y Banzer), se guarda (`filaStock` → `leerStock`) y se junta (`stockFusionar`) con el turno', r.leido==='am' && r.bz==='am' && J(r.guardado)===J(['am','am']) && r.junta==='am', J(r));
  chk('UT8b · `inc:"am"` (escrito por otro) se lee como la mañana, no como los dos', r.texto && r.texto[0]==='am' && r.texto[1]===true, J(r.texto));
  chk('control · UT8c · una llegada y una salida a mano (no tienen turno) solo se dan por incluidas con los dos turnos', r.entradaAm===true && r.entradaTodo===false && r.smAm===true && r.smTodo===false, J(r));
  // ═══ UT10. Lo que encontraron los verificadores (§4ls, corrector) ═══
  console.log('\n── UT10. Cargado después del Excel, la casilla de antes, camión sin dato, inc:1 ──');
  r = await corre(page, async () => {
    var hoy=todayStr(), out={};
    /* U1: Excel de PTF de las 10:19 con la mañana incluida; una RPT de la MAÑANA de 5 cargada a las 12:18 (no existía cuando se sacó el
       Excel) y una de 2 cargada a las 09:00 (sí estaba: ya salió con el camión). 8 en PTF. */
    var peds=[ _ped('t01', hoy, 'AM', [_lin(_T,5)], { ts:_ts(hoy,'12:18:00') }), _ped('t02', hoy, 'AM', [_lin(_T,2)], { ts:_ts(hoy,'09:00:00') }) ];
    await _cargar(peds, _stock(function(st){ st.c.u[_K]=8; st.c.hora='10:19:33'; }, { inc:'am' }));
    var o=_fila(_K); out.sin={ comp:o.comp, dep:o.deposito, ids:o.compIds.map(function(c){ return c.id; }) };
    _ent('t01'); _ent('t02'); o=_fila(_K); out.ent={ comp:o.comp, dep:o.deposito };
    /* …y el control del Excel de la tarde: lo cargado después del de las 10:19 salió en la ventana; lo de las 09:00 ya no estaba. */
    var v=stockVentanaCorte({ f:hoy, hora:'10:19:33', incT:'am' }, { fecha:hoy, hora:'16:40:00' }, { am:true, pm:true });
    out.vent={ t01:stockSalioVentana(findById('t01'), findById('t01').productos[0], v), t02:stockSalioVentana(findById('t02'), findById('t02').productos[0], v) };
    /* U2: con las DOS casillas, la página nueva guarda `inc:true` + `incT:"ampm"` (corte y renglón del historial); si una página vieja le
       saca el `incT`, el historial lo devuelve. */
    await _cargar([], _stock(function(st){ st.c.u[_K]=3; st.c.hora='08:00:00'; }, {}));
    EXIST_IMP={ fecha:hoy, hora:'16:40:00', sacado:hoy, sinFecha:false, almacen:_LOG, items:[{ cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:3, cat:true, k:_K }], total:3,
                repetidos:0, malos:0, colCant:'AY', solo0:true, cods:{ CH1201:_K }, esLog:true, conocido:true };
    renderImportExist();
    var am=document.getElementById('exist-inc'), pm=document.getElementById('exist-inc-pm'); if(am) am.checked=true; if(pm) pm.checked=true;
    await confirmarImportExist(); stockOlvidarIndice();
    out.dos={ inc:STOCK.c.inc, incT:STOCK.c.incT||'', hInc:STOCK.h[0] && STOCK.h[0].inc, hT:STOCK.h[0] && STOCK.h[0].incT };
    var d=JSON.parse(JSON.stringify(STOCK)); delete d.c.incT; stockIncDelHistorial(d); out.repuesto=d.c.incT||'';
    /* U3: Carry salió 08:50; el Foton nuevo (también de la mañana) no tiene dato. Excel de las 09:00 → la mañana SIN marcar. */
    await _cargar([ _ped('v01', hoy, 'AM', [_lin(_T,1)], { vehiculo:'Carry' }), _ped('v02', hoy, 'AM', [_lin(_T,1)], { vehiculo:'Foton nuevo' }) ], _stock(function(st){ st.c.u[_K]=5; }, {}));
    CARGA_CHK[cargaChkKey(hoy,'Carry',CARGA_SALIO)+'|08:50']=1;
    var q=stockIncPropuesta('09:00:00',''); out.sinDato={ v:q.am.v, txt:q.am.txt };
    /* …y los dos de la mañana con «Ya salió» a las 13:10 (el viaje de la mañana, tarde): el Excel de las 10:05 NO trae la mañana. */
    delete CARGA_CHK[cargaChkKey(hoy,'Carry',CARGA_SALIO)+'|08:50'];
    CARGA_CHK[cargaChkKey(hoy,'Carry',CARGA_SALIO)+'|13:10']=1; CARGA_CHK[cargaChkKey(hoy,'Foton nuevo',CARGA_SALIO)+'|13:10']=1;
    var q2=stockIncPropuesta('10:05:32',''); out.tarde={ am:q2.am.v, pm:q2.pm.v, txt:q2.am.txt };
    /* U4: un `inc` verdadero que no sea `true` (un 1) vale como los dos turnos. */
    out.uno=stockIncTurnos({ inc:1 });
    return out;
  });
  chk('UT10a · lo de la MAÑANA cargado DESPUÉS de la hora del Excel (12:18 con el de las 10:19) se reserva (comp 5, libre 3); lo cargado antes, no',
      r.sin && r.sin.comp===5 && r.sin.ids.indexOf('t01')>=0 && r.sin.ids.indexOf('t02')<0 && r.sin.dep===8, J(r.sin||r));
  chk('UT10b · …y con ✅ SÍ baja ese Excel (PTF 3: el 5 no estaba adentro); lo de las 09:00 no se resta otra vez', r.ent && r.ent.dep===3 && r.ent.comp===0, J(r.ent));
  chk('UT10c · …y en el control del Excel de la tarde cuenta como salida de la ventana (sin «salida sin explicar»); lo de las 09:00, no',
      r.vent && r.vent.t01===true && r.vent.t02===false, J(r.vent));
  chk('UT10d · las DOS casillas se guardan `inc:true` + `incT:"ampm"` (corte e historial) y, si una página vieja saca el `incT`, el historial lo repone',
      r.dos && r.dos.inc===true && r.dos.incT==='ampm' && r.dos.hInc===true && r.dos.hT==='ampm' && r.repuesto==='ampm', J([r.dos, r.repuesto]));
  chk('UT10e · un camión de la mañana SIN dato de salida decide por la hora: Carry salió 08:50, el Foton sin dato y el Excel de las 09:00 → la mañana sin marcar (antes, marcada)',
      r.sinDato && r.sinDato.v===false && /sin dato/.test(r.sinDato.txt||''), J(r.sinDato));
  chk('UT10f · la única salida de un camión de la mañana, a las 13:10, es el viaje de la mañana: el Excel de las 10:05 NO trae la mañana (antes, por la hora, sí)',
      r.tarde && r.tarde.am===false && r.tarde.pm===false, J(r.tarde));
  chk('UT10g · `inc:1` vale como los dos turnos', r.uno && r.uno.am===true && r.uno.pm===true, J(r.uno));
  errores.push.apply(errores, page._err);
  await page.close();

  // ═══ UT9. La página de antes (la publicada) ═══
  console.log('\n── UT9. 🧓 La página de antes, sin F5 ──');
  let viejo=null;
  try{
    const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'u2turno-'));
    const git = (ref) => cp.execSync('git show '+ref, { maxBuffer:64*1024*1024, cwd:path.resolve(__dirname, '..') });
    fs.writeFileSync(path.join(TMP,'pedidos.html'), git('27f0134:pedidos.html'));
    fs.writeFileSync(path.join(TMP,'productos-mes.js'), git('27f0134:productos-mes.js'));
    viejo=path.join(TMP,'pedidos.html');
  }catch(e){ console.log('  (no se pudo sacar 27f0134 de git: '+e.message+')'); }
  if(viejo){
    page = await abrir(browser, viejo, '2026-10-16T12:00:00-04:00');
    r = await corre(page, async () => {
      var hoy=todayStr(), out={};
      var st=_stock(function(s){ s.c.u[_K]=10; s.h=[{ f:hoy, hora:'10:05:32', alm:_LOG, rol:'log', n:1, u:10, ts:_ts(hoy,'10:10:00'), inc:false, incT:'am' }]; }, { inc:'am' });
      await _cargar([ _ped('v01', hoy, 'AM', [_lin(_T,2)], { entregado:true }) ], st);
      STATE.forEach(function(p){ (p.productos||[]).forEach(function(x){ x.eF=hoy; }); }); stockOlvidarIndice();
      out.dep=_fila(_K).deposito;                       // la de antes: descuenta otra vez lo de la mañana, como siempre
      out.guardo=filaStock().observaciones;             // lo que guardaría
      var S=leerStock({ observaciones:JSON.stringify({ c:{ f:hoy, hora:'10:05:32', u:{}, inc:'am' } }) }); out.incTexto=S.c.inc;
      return out;
    });
    errores.push.apply(errores, page._err.map(function(e){ return '[vieja] '+e; }));
    chk('control · UT9a · la página de antes lee `incT` sin romperse y sigue como siempre (descuenta otra vez la mañana: PTF 8)', r.dep===8 && !page._err.length, J([r.dep, r.__error, page._err.slice(0,2)]));
    const guardo = r.guardo;
    chk('control · UT9b · (así está) la página de antes guarda el stock SIN `incT` en el corte, pero conserva el historial', guardo && !JSON.parse(guardo).c.incT && (JSON.parse(guardo).h||[])[0] && JSON.parse(guardo).h[0].incT==='am', guardo && guardo.slice(0,200));
    chk('control · UT9c · (por eso el turno no va en `inc`) la página de antes leería `inc:"am"` como «los dos»', r.incTexto===true, J(r.incTexto));
    await page.close();
    page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
    r = await corre(page, async (guardo) => {
      var hoy=todayStr();
      window._SRV.pedidos=[ _ped('v01', hoy, 'AM', [_lin(_T,2)], { entregado:true }) ];
      window._SRV.stock=JSON.parse(guardo); STOCK_CARGADO=false;
      await refrescarEstado(); stockOlvidarIndice();
      STATE.forEach(function(p){ (p.productos||[]).forEach(function(x){ x.eF=hoy; }); }); stockOlvidarIndice();
      return { incT:STOCK.c.incT||'', dep:_fila(_K).deposito };
    }, guardo);
    chk('UT9d · la página nueva lee lo que guardó la de antes y repone el turno del historial (`incT:"am"`, PTF 10)', r.incT==='am' && r.dep===10, J(r));
    errores.push.apply(errores, page._err);
    await page.close();
  }

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,400));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
