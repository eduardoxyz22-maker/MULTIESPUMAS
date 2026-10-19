/* 📋 STOCK Y REPOSICIÓN PARA LA REUNIÓN DEL 22/10 (§4lr, 16/10).

   El dueño (16/10, con la auditoría de Astra): *«revisá, analizá, verificá, simulá y corroborá stock y reposición: debe ser PRECISO,
   la reunión con logística es el jueves 22 y necesito los datos claros de qué se pide a producción para 7, 15 días y el otro mes»*.
   La revisión (10 revisores + recálculo ciego + simulación hacia atrás con la planilla real, y cada hallazgo verificado dos veces)
   encontró estas fallas de CUENTA, que no dependen de ninguna decisión del dueño. Cada «RN» falla contra lo publicado (`27f0134`):

   RN-U1  El plazo medido de la fábrica no depende del ORDEN de las filas: con un empate en el corte de las 6 últimas llegadas, el
          panel tomaba una sola según cómo venía la planilla (Moreno daba 7 o 5 con los mismos datos). Entran todas las del empate.
   RN-U5  Una sola fábrica por producto: la de su bloque de «Qué producir» (la marca del nombre primero). Un 🏭 anotado a mano en otra
          fábrica cambiaba el plazo y la copia para fábrica decía otra fábrica que el bloque.
   RN-U12 Un ✅ con fecha que todavía no llegó y sin el día real (`eF`) no salió (regla del dueño de §4lo): se reserva y no se resta
          de PTF. Marcar ✅ antes del día anota `eF` = hoy (ese sí salió).
   RN-U18 El Plan de stock lista todo producto al que «Qué producir» le pone número (el Plan sumaba 396 para el mes y Qué producir 417).
   RN-U9  Sin venta en 15 días pero con ritmo de 30: «📦 Sin rotación… el plan pide N», nunca «✅ Alcanza» con 0 en los almacenes.
   RN-U24 «DYNAMICPEDIC» pegado (ROHO) es el DYNAMIC PEDIC del catálogo.
   RN-U22 Dos detecciones del Excel no explican dos veces las mismas unidades de un pedido a fábrica (Astra D1).
   RN-U23 La proyección no le resta lo detectado a una llegada NUEVA cuando lo detectado era de un pedido viejo (Astra D2).
   RN-U20 El cuadrito del vendedor no promete «⏳ en producción» lo que el Excel ya contó (Astra D8).
   RN-U21 El cuadrito cuenta un «Ya pedí» desde el día en que ARRANCÓ (`arr`, después de las 16:30 es el día siguiente) (Astra D5).
   RN-U31 El Excel de Banzer o de Moreno que no es del día se avisa (antes solo se miraba el de PTF).
   RN-U30 Un archivo de varios almacenes que no se entiende NUNCA se lee entero como uno solo (sumaba los tres en IM), y la fila que
          abre un bloque se reconoce aunque traiga el código y el nombre juntos.
   RN-U3  Un «Ya pedí» vencido sin que ningún Excel lo muestre se DICE en la fila («reclamá o volvé a pedir»): no cambia la cuenta.
   RN-U17 Los títulos de 7 / 15 días / el mes dicen lo que cubre el número (15 incluye 7; el mes va además de 15).
   RN-U19 «Cómo se calcula la reposición» cierra con los números de la cuenta (lo vendido dentro del horizonte).
   AP1-13 (decisión del dueño, 17/10: «Sí, que se acuerde solo») «En producción» automático: el panel anota lo que pide el día del Excel,
          lo cuenta desde el día siguiente, lo cierra con la entrada neta del lote (no con un traspaso), avisa si no aparece y la celda no crece.
          🔌 (18/10, §4ls) El dueño lo APAGÓ hasta el jueves (`STOCK_AUTO_ACTIVO=false`): el bloque lo PRENDE al empezar y lo apaga al
          terminar. AP0 y AP14: apagado no anota ni cuenta (lo demás del apagado, en `test_stock_rev2_auto_off.js`).
   RN-U7  (decisión del dueño, 16/10: «La RPT cuenta como venta») Las ALMOHADAS que van a las tiendas por RPT arman el ritmo y su venta de
          tienda no se suma otra vez; un colchón por RPT sigue sin ser venta (§4dk).

   Reloj CLAVADO: viernes 16/10/2026, 12:00 de Bolivia.
   Se corre:  node tests/test_stock_reunion.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_27f0134.html node tests/test_stock_reunion.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
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
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  /* El stock base: los tres Excel de HOY a las 08:00 (antes de que salga el camión), sin nada más. */
  window._stock=function(fn){
    var hoy=todayStr(), t=new Date(hoy+'T08:00:00-04:00').getTime();
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:00:00', u:{}, solo0:true, alm:_LOG, cod:{}, t:t, inc:false }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{}, inc:false };
    st.g[_IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(fn) fn(st);
    return st;
  };
  window._ped=function(id, fecha, lineas, extra){
    return Object.assign({ id:id, oc:'OC 10-'+id.slice(-3), fecha:fecha, turno:'AM', cliente:'CLIENTE '+id.toUpperCase(), vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:lineas }, extra||{});
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._ts=function(f, h){ return new Date(f+'T'+h+'-04:00').getTime(); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1200, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  /* ── U1. El plazo medido no depende del orden de las filas ── */
  const u1 = await ev(async () => {
    await _cargar([], _stock());
    var K=_k('CH1144','SOMIER ORO','140x190');
    var m=function(id, f, r){ return { id:id, k:K, u:1, fab:'MORENO', f:f, r:r, tipo:'fabrica' }; };
    // las 5 últimas llegadas con días distintos y TRES empatadas en el corte (05/10): 9, 2 y 2 días
    var base=[ m('a','2026-10-04','2026-10-10'), m('b','2026-10-01','2026-10-09'), m('c','2026-10-06','2026-10-08'),
               m('d','2026-09-30','2026-10-07'), m('e','2026-10-03','2026-10-06') ];
    var emp=[ m('x9','2026-09-26','2026-10-05'), m('x2a','2026-10-03','2026-10-05'), m('x2b','2026-10-03','2026-10-05') ];
    STOCK.p=base.concat(emp);            var d1=stockTiemposFabrica().de('MORENO').dias;
    STOCK.p=base.concat(emp.slice().reverse()); var d2=stockTiemposFabrica().de('MORENO').dias;
    STOCK.p=[]; return { d1:d1, d2:d2, piso:stockLeadPiso() };
  });
  chk('RN-U1a. el plazo medido de Moreno da lo MISMO con las filas en otro orden', u1.d1!=null && u1.d1===u1.d2, u1);
  chk('RN-U1b. …y es la mediana de TODAS las del empate (2,2,3,6,7,8 y 9,2 → 5 días)', u1.d1===5 && u1.d2===5, u1);

  /* ── U5. Una sola fábrica por producto ── */
  const u5 = await ev(async () => {
    var K=_k('CH1144','SOMIER ORO','140x190');
    var p=_ped('p-u5', '2026-10-01', [{ codigo:'CH1144', desc:'SOMIER ORO', medida:'140x190', cant:1, precio:1000, enProd:true, chk:'prod', prodEn:'Multiespumas', prodF:'2026-09-28', prodR:'2026-10-01' }], { entregado:true });
    await _cargar([p], _stock(function(st){ st.c.u[K]=2; }));
    var o=_fila(K), b=stockBloqueDe(o);
    return { fab:o&&o.fab, fabLead:o&&o.fabLead, bloque:b.k, lead:o&&o.lead, leadMoreno:stockTiemposFabrica().de('MORENO').dias };
  });
  chk('RN-U5a. el SOMIER ORO (Heaven) con un 🏭 anotado en Multiespumas sigue en el bloque de Moreno', u5.bloque==='heaven', u5);
  chk('RN-U5b. …y su plazo es el de MORENO, la fábrica de su bloque (no el de la última 🏭)', u5.fabLead==='MORENO' && u5.lead===u5.leadMoreno, u5);

  /* ── U12. ✅ con fecha futura ── */
  const u12 = await ev(async () => {
    var K=_k('CS1014','COLCHON CONFORT PLUS','180x190');
    var fut=_ped('p-u12', '2026-10-21', [{ codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:1, precio:1000 }], { entregado:true });
    await _cargar([fut], _stock(function(st){ st.c.u[K]=1; }));
    var o=_fila(K);
    var r={ comp:o.comp, deposito:o.deposito };
    // con el día real anotado (entregado antes de tiempo, HOY) sí salió
    var fut2=JSON.parse(JSON.stringify(fut)); fut2.productos[0].eF=todayStr();
    await _cargar([fut2], _stock(function(st){ st.c.u[K]=1; }));
    var o2=_fila(K); r.comp2=o2.comp; r.dep2=o2.deposito;
    // marcar ✅ desde la tabla un pedido de mañana anota eF = hoy
    var nuevo=_ped('p-u12b', '2026-10-20', [{ codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:1, precio:1000 }]);
    await _cargar([nuevo], _stock(function(st){ st.c.u[K]=1; }));
    quickEntregado('p-u12b');
    var q=findById('p-u12b'); r.eF=q && q.productos[0].eF; r.ent=q && q.entregado;
    return r;
  });
  chk('RN-U12a. un ✅ para el 21/10 sin día real NO salió: queda reservado (vendido sin entregar 1)', u12.comp===1, u12);
  chk('RN-U12b. …y no se resta de PTF (sigue 1)', u12.deposito===1, u12);
  chk('RN-U12c. con el día real (`eF` = hoy) sí salió: no se reserva', u12.comp2===0, u12);
  chk('RN-U12d. marcar ✅ ANTES de su día anota `eF` = hoy (salió hoy)', u12.ent===true && u12.eF==='2026-10-16', u12);

  /* ── U18 + U9. El Plan lista lo que «Qué producir» pide, y no dice «Alcanza» ── */
  const u18 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    // tres entregas hace 18-25 días (fuera de los 15, dentro de los 30) y nada en ningún almacén
    var ps=[['p-a','2026-09-22'],['p-b','2026-09-25'],['p-c','2026-09-28']].map(function(x){
      return _ped(x[0], x[1], [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000 }], { entregado:true, ts:_ts(x[1],'09:00:00') });
    });
    await _cargar(ps, _stock(function(st){ st.c.u[K]=0; }));
    var d=stockData(), o=d.lista.filter(function(x){ return x.k===K; })[0];
    var B=null; stockProducir(d).bloques.forEach(function(b){ b.filas.forEach(function(f){ if(f.o.k===K) B=f; }); });   // como el Plan: la MISMA foto
    PLAN_F='todos'; PLAN_TODOS=true; try{ STOCK_FILTRO.q=''; }catch(e){}
    renderStock();
    var filas=[].map.call(document.querySelectorAll('#stk-plan tr.pl-fila'), function(t){ return t.getAttribute('data-k'); });
    return { vendidos:o.vendidos, porDiaMes:o.porDiaMes, aviso:o.aviso, mes:B&&B.mes, enPlan:filas.indexOf(K)>=0, accion:String(sfAccion(o)).replace(/<[^>]+>/g,'') };
  });
  chk('RN-U18a. (control) sin venta en 15 días, con ritmo de 30 y «Qué producir» le pide para el mes', u18.vendidos===0 && u18.porDiaMes>0 && u18.mes>0, u18);
  chk('RN-U18b. …y el Plan de stock lo LISTA (antes quedaba afuera y el Plan sumaba menos que Qué producir)', u18.enPlan===true, u18);
  chk('RN-U9. …y no dice «✅ Alcanza» con 0: «📦 Sin rotación… el plan pide»', u18.aviso==='unico' && /Sin rotación/.test(u18.accion), u18);

  /* ── U24. DYNAMICPEDIC pegado ── */
  const u24 = await ev(async () => {
    var K=_k('CH2297','DYNAMIC PEDIC','160x190');
    var k2=stockInfo({ codigo:'', desc:'COLCHON DYNAMICPEDIC 2.5P 160X190CM HEAVEN', medida:'160x190' }).k;
    return { K:K, k2:k2, marca:stockMarcaDeNombre(stockNombreClave?stockNombreClave(k2):k2) };
  });
  chk('RN-U24. «COLCHON DYNAMICPEDIC 2.5P 160X190CM HEAVEN» (ROHO, sin código) es el DYNAMIC PEDIC 160x190', u24.k2===u24.K, u24);

  /* ── U22 + U23. Las detecciones del Excel, por pedido ── */
  const u22 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var st=_stock(function(st){
      st.c.u[K]=5;
      // q1 pedido el 10/10 a las 08:00; q2 el 15/10 a las 16:05 (DESPUÉS de las dos detecciones)
      st.p=[ { id:'q1', k:K, u:5, fab:'MORENO', f:'2026-10-10', t:_ts('2026-10-10','08:00:00'), r:'', tipo:'fabrica' },
             { id:'q2', k:K, u:5, fab:'MORENO', f:'2026-10-15', t:_ts('2026-10-15','16:05:00'), r:'', tipo:'fabrica' } ];
      st.det=[ { id:'d:1', k:K, t:5, u:5, f:'2026-10-15', hora:'10:34:00' }, { id:'d:2', k:K, t:5, u:5, f:'2026-10-15', hora:'11:00:00' } ];
    });
    await _cargar([], st);
    return { det:stockDetectadoSinAsignar(K) };
  });
  chk('RN-U22. dos detecciones de 5 contra UN pedido de 5 anterior explican 5, no 10 (el pedido de las 16:05 no cuenta)', u22.det===5, u22);

  const u23 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var st=_stock(function(st){
      st.c.u[K]=5;                                                            // las 5 que trajo q1 ya están en el Excel
      st.p=[ { id:'q1', k:K, u:5, fab:'MORENO', f:'2026-10-05', t:_ts('2026-10-05','08:00:00'), r:'', tipo:'fabrica' },   // vencido
             { id:'q2', k:K, u:5, fab:'MORENO', f:'2026-10-15', t:_ts('2026-10-15','16:05:00'), r:'', tipo:'fabrica' } ];  // llega ~20/10
      st.det=[ { id:'d:1', k:K, t:5, u:5, f:'2026-10-15', hora:'10:00:00' } ];   // del Excel de ayer a la mañana (antes de q2)
    });
    var p=_ped('p-u23', '2026-10-23', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:8, precio:1000 }]);
    await _cargar([p], st);
    var o=_fila(K);
    return { det:o.detectado, corte:o.corte, llegan:(o.pedidos||[]).map(function(q){ return q.id+'@'+q.llega; }) };
  });
  chk('RN-U23. lo detectado era la llegada VIEJA: la nueva (5) sigue contando y 5 + 5 cubren las 8 del 23/10 (no «se corta»)', u23.det===5 && u23.corte==null, u23);

  /* ── U20 + U21. El cuadrito del vendedor ── */
  const u20 = await ev(async () => {
    var K=_k('CS1014','COLCHON CONFORT PLUS','180x190');
    var st=_stock(function(st){
      st.c.u[K]=3;                                                            // las 3 de q ya están contadas
      st.p=[ { id:'q', k:K, u:3, fab:'MULTI', f:'2026-10-14', t:_ts('2026-10-14','08:00:00'), r:'', tipo:'fabrica' } ];
      st.det=[ { id:'d:c', k:K, t:3, u:3, f:'2026-10-15', hora:'09:00:00' } ];
    });
    var p=_ped('p-u20', '2026-10-24', [{ codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:3, precio:1000 }]);
    await _cargar([p], st);
    /* (18/10, §4ls, decisión 3) Para el MISMO día que lo vendido (24/10): con la reserva por fecha, para antes del 24/10 las 3
       contadas están libres y el cuadrito dice «✅ hay» (lo cuida `test_stock_rev2_cuadrito_fecha`). Acá se mira U20. */
    var v=saldoVeredicto(K, 1, '', '2026-10-24', true);
    return { tipo:v.tipo, llega:v.llega||'', libres:v.libres };
  });
  chk('RN-U20. vendido todo lo contado: el cuadrito dice «🏭 NO HAY · mandar a producir», no «⏳ en producción» con lo que ya llegó', u20.tipo==='pedir', u20);

  const u21 = await ev(async () => {
    var K=_k('CH2143','SOMIER TROPICAL','160x190');
    var st=_stock(function(st){
      st.c.u[K]=0;
      // «✓ Ya pedí» tildado HOY a las 17:00 (después del corte): arranca mañana
      st.p=[ { id:'fy:t', k:K, u:5, fab:'MORENO', f:'2026-10-16', arr:'2026-10-17', esp:sigDiaHabil(saldoSaleDeFabrica('2026-10-17')), r:'', ya:1, t:_ts('2026-10-16','17:00:00') } ];
    });
    await _cargar([], st);
    var v=saldoVeredicto(K, 1, '', '', true);
    return { tipo:v.tipo, llega:v.llega||'', desdeArr:saldoSaleDeFabrica('2026-10-17'), desdeF:saldoSaleDeFabrica('2026-10-16') };
  });
  chk('RN-U21. el cuadrito cuenta el «Ya pedí» desde el día en que arrancó (`arr`), como el Plan', u21.tipo==='prod' && u21.llega===u21.desdeArr && u21.desdeArr!==u21.desdeF, u21);

  /* ── U31. El Excel de Banzer viejo se avisa ── */
  const u31 = await ev(async () => {
    var K=_k('CD1403','ALMOHADA','50x70');
    var st=_stock(function(st){ st.c.u[K]=2; st.g[_BZ].u[K]=9; st.g[_BZ].f='2026-10-13'; st.g[_IM].u[K]=1; });
    await _cargar([], st);
    PLAN_F='todos'; renderStock();
    var b=document.getElementById('stk-cortes-viejos');
    return { avisos:saldoAvisos(), cartel:b?b.innerText:'' };
  });
  chk('RN-U31a. el cuadrito avisa que el Excel de Banzer es del 13/10', (u31.avisos||[]).some(function(a){ return /Banzer/.test(a) && /13\/10/.test(a); }), u31);
  chk('RN-U31b. la pantalla de Stock también lo dice', /Banzer/.test(u31.cartel||'') && /13/.test(u31.cartel||''), u31);

  /* ── U30. El archivo de varios almacenes ── */
  const u30 = await ev(async () => {
    var hdr={ G:'Código Producto', W:'Nombre Producto', AZ:' CUI', BD:'Unidad' };
    var arriba=[ { C:'MULTIESPUMAS' }, { C:'MORENO', X:'EXISTENCIAS ALMACEN  AL ', AR:'16/10/2026' }, { F:'Almacén Inicial :', P:'01-05-103  IM - PRODUCTOTERMINADO', AK:'Almacén Final :', AX:'01-05-103  IM - PRODUCTOTERMINADO' }, hdr ];
    var bloque=function(abre, alm, n){ return [ abre, { B:'COLCHONES PROPIOS' }, { G:'CH1144', W:'SOMIER ORO 140X190', AY:String(n), BD:'PZA' },
                                               { H:'SUBTOTAL', M:'HEAVEN', AV:String(n) }, { Q:'TOTAL :', U:alm, AV:String(n) } ]; };
    var B=[['105003','PRODUCTOS TERMINADOS FAB.',3],['105025','Almacen Distribucion Banzer',4],['105103','IM - PRODUCTOTERMINADO',5]];
    // (a) la fila que abre cada bloque trae una celda de más que no se entiende (4 celdas): no se reconoce ningún bloque
    var malas=arriba.slice(); B.forEach(function(b){ malas=malas.concat(bloque({ Y:b[0], AE:b[1], AG:'x', AI:'y' }, b[1], b[2])); });
    malas.push({ AF:'TOTAL GENERAL :', AV:'12' });
    // (b) el código y el nombre en UNA celda («105025  Almacen Distribucion Banzer»)
    var juntas=arriba.slice(); B.forEach(function(b){ juntas=juntas.concat(bloque({ Y:b[0]+'  '+b[1] }, b[1], b[2])); });
    juntas.push({ AF:'TOTAL GENERAL :', AV:'12' });
    // (c) un bloque que cierra sin que se haya visto dónde empezó (Banzer)
    var media=arriba.slice(); B.forEach(function(b, i){ media=media.concat(bloque(i===1 ? { B:'COLCHONES PROPIOS' } : { Y:b[0], AE:b[1] }, b[1], b[2])); });
    media.push({ AF:'TOTAL GENERAL :', AV:'12' });
    var La=existLoteDe(malas, null), Lb=existSecciones(juntas), Lc=existLoteDe(media, null);
    return { a:La&&La.error?String(La.error):(La?'leyó '+(La.lista||[]).length:'null (entero como UNO)'), b:Lb.map(function(s){ return s.alm; }), c:Lc&&Lc.error?String(Lc.error):(Lc?'leyó '+(Lc.lista||[]).length:'null') };
  });
  chk('RN-U30a. tres almacenes sin poder ubicar sus bloques: error, NUNCA leerlo entero como uno (sumaba los tres en IM)', /no encuentro dónde empieza/.test(u30.a||''), u30);
  chk('RN-U30b. la fila con el código y el nombre en una celda abre su bloque (3 almacenes)', (u30.b||[]).length===3 && u30.b[1]==='Almacen Distribucion Banzer', u30);
  chk('RN-U30c. un almacén que cierra sin su comienzo no se deja afuera callado: error que lo nombra', /Banzer/.test(u30.c||'') && /no encuentro/.test(u30.c||''), u30);

  /* ── U3. «Ya pedí» vencido, a la vista ── */
  const u3 = await ev(async () => {
    var K=_k('CD1403','ALMOHADA','50x70');
    var st=_stock(function(st){
      st.c.u[K]=0;
      st.p=[ { id:'fy:v', k:K, u:23, fab:'MORENO', f:'2026-10-09', arr:'2026-10-09', esp:'2026-10-14', r:'', ya:1, t:_ts('2026-10-09','10:00:00') } ];
    });
    var p=_ped('p-u3', '2026-10-20', [{ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70', cant:4, precio:100 }]);
    await _cargar([p], st);
    var o=_fila(K), d=document.createElement('div'); d.innerHTML=planYaHtml(o);
    return { enCamino:o.enCamino, txt:d.innerText };
  });
  chk('RN-U3a. (control) el «Ya pedí» del 09/10 que tenía que llegar el 14/10 ya no cuenta como en camino', u3.enCamino===0, u3);
  chk('RN-U3b. …pero la fila lo DICE: «tenía que llegar el 14/10… reclamá a la fábrica o volvé a pedir»', /14\/10/.test(u3.txt||'') && /reclam/i.test(u3.txt||''), u3);

  /* ── U17 + U19. Los títulos y la explicación ── */
  const u17 = await ev(async () => {
    var K=_k('CD1403','ALMOHADA','50x70');
    var ps=[];
    for(var i=1;i<=12;i++){ var f=stockSumarDias('2026-10-16',-i); ps.push(_ped('p-r'+i, f, [{ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70', cant:2, precio:100 }], { entregado:true, ts:_ts(f,'09:00:00') })); }
    ps.push(_ped('p-lejos', '2026-12-05', [{ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70', cant:4, precio:100 }]));
    await _cargar(ps, _stock(function(st){ st.c.u[K]=2; }));
    var o=_fila(K);
    var copia=''; var cp=copyText; copyText=function(t){ copia=t; }; var tt=toast; toast=function(){};
    try{ copiarProducir(stockBloqueDe(o).k,'mes'); }finally{ copyText=cp; toast=tt; }
    var d=document.createElement('div'); d.innerHTML=stockSaldoDetalleHtml(o);
    var html=renderProducir(stockData());
    return { comp:o.comp, compH:stockCompHorizonte(o), copia:copia.split('\n')[0], expl:d.innerText, encab:/incluye lo de 7: no sumar/.test(html) && /además de 15 días/.test(html) };
  });
  chk('RN-U17a. la copia del mes dice que va ADEMÁS de lo de 15 días (no «todo el mes»)', /además de lo de 15 días/i.test(u17.copia||'') && !/todo el mes/i.test(u17.copia||''), u17);
  chk('RN-U17b. las columnas de «Qué producir» dicen que 15 días incluye 7 y que el mes va además', u17.encab===true, u17);
  chk('RN-U19. la explicación usa lo vendido DENTRO del horizonte (las 4 de diciembre aparte)', u17.comp===4 && u17.compH===0 && /0 unidades ya vendidas que se entregan hasta el/.test(u17.expl||'') && /4 más vendidas para después/.test(u17.expl||''), u17);

  /* ── U7. Almohadas: la RPT es la venta (dueño, 16/10) ── */
  const u7 = await ev(async () => {
    var KA=_k('CD1403','ALMOHADA','50x70'), KC=_k('CS1014','COLCHON CONFORT PLUS','180x190');
    var ps=[];
    // 4 reposiciones a tiendas en los últimos 15 días: 6 almohadas y 1 colchón cada una
    [-2,-5,-8,-11].forEach(function(d, i){ var f=stockSumarDias('2026-10-16', d);
      ps.push(_ped('p-rpt'+i, f, [{ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70', cant:6, precio:0 }, { codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:1, precio:0 }],
        { oc:'RPT 10-0'+(10+i), cliente:'Charcas', entregado:true, ts:_ts(f,'09:00:00') })); });
    // 3 ventas de tienda de almohadas (2 c/u): ya se contaron cuando se mandaron
    [-3,-6,-9].forEach(function(d, i){ var f=stockSumarDias('2026-10-16', d);
      ps.push(_ped('p-vt'+i, '', [{ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70', cant:2, precio:100 }], { oc:'OC 10-2'+i, direccion:DIR_TIENDA+' · Charcas', zona:ZONA_TIENDA, entregado:true, ts:_ts(f,'10:00:00') })); });
    await _cargar(ps, _stock(function(st){ st.c.u[KA]=10; st.c.u[KC]=5; }));
    var d=stockData(), a=d.lista.filter(function(o){ return o.k===KA; })[0], c=d.lista.filter(function(o){ return o.k===KC; })[0];
    var vt=ps.filter(function(p){ return /^p-vt/.test(p.id); }).map(function(p){ return esVentaTienda(findById(p.id)); });
    return { almRot:a.vendidosRotacion, almTienda:a.vendidosTiendaAlm, almRota:a.rotacion, colRot:c.vendidosRotacion, colRpt:c.vendidosRpt, vt:vt,
             idx:(ventasPanelIndex()[KA]||{})['2026-10']||0, idxC:(ventasPanelIndex()[KC]||{})['2026-10']||0 };
  });
  chk('RN-U7a. (control) las 3 ventas de tienda se leen como venta de tienda', (u7.vt||[]).every(Boolean), u7);
  chk('RN-U7b. las almohadas que van a las tiendas por RPT arman el ritmo (24 en 4 entregas)', u7.almRot===24 && u7.almRota!=='baja', u7);
  chk('RN-U7c. …y su venta de tienda NO se suma otra vez', u7.almTienda===6 && u7.almRot===24, u7);
  chk('RN-U7d. un COLCHÓN que va por RPT sigue sin ser venta (§4dk)', u7.colRot===0 && u7.colRpt===4, u7);
  chk('RN-U7e. el índice del mes cuenta igual: 24 almohadas en octubre, 0 colchones', u7.idx===24 && u7.idxC===0, u7);

  /* ── 🏭 «En producción» automático (dueño, 17/10: «Sí, que se acuerde solo») ── */
  /* 🔌 (18/10, §4ls) Viene APAGADO (decisión del dueño): apagado, terminar el Excel del día no anota nada. */
  const ap0 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var p=_ped('p-ap', '2026-10-23', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:5, precio:1000 }]);
    await _cargar([p], _stock(function(st){ st.c.u[K]=0; st.g[_IM].u[K]=0; }));
    var def=(typeof STOCK_AUTO_ACTIVO==='undefined') ? 'no existe' : STOCK_AUTO_ACTIVO;
    var anot=stockAutoAnotar(todayStr()), o=_fila(K);
    return { def:def, anot:anot.length, ap:JSON.stringify(STOCK.ap||{}), fab:o.fabricar, cam:o.enCamino };
  });
  chk('AP0. 🔌 apagado (como viene, decisión del dueño 18/10) el panel NO anota nada: «Pedir 7 días» 5, nada guardado', ap0.def===false && ap0.anot===0 && ap0.ap==='{}' && ap0.fab===5 && ap0.cam===0, ap0);
  const ap1 = await ev(async () => {
    STOCK_AUTO_ACTIVO=true;                      // 🔌 (18/10, §4ls) AP1-AP13 prueban el automático PRENDIDO
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    // 5 vendidos para la semana que viene y nada en ningún almacén: el panel pide fabricar
    var p=_ped('p-ap', '2026-10-23', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:5, precio:1000 }]);
    await _cargar([p], _stock(function(st){ st.c.u[K]=0; st.g[_IM].u[K]=0; }));
    var o0=_fila(K), antes=o0.fabricar;
    var anot=stockAutoAnotar(todayStr());
    var o1=_fila(K), e=stockAutoDe(K, todayStr());
    var div=document.createElement('div'); div.innerHTML=stockAutoHtml(o1);
    return { antes:antes, anot:anot.length, u:e&&e.u, fabHoy:o1.fabricar, camHoy:o1.enCamino, txt:div.innerText, ap:JSON.stringify(STOCK.ap).length };
  });
  chk('AP1. (control) sin nada en los almacenes el panel pide fabricar 5', ap1.antes===5, ap1);
  chk('AP2. al terminar el Excel del día el panel ANOTA lo que pide (5) — y ese día no cuenta: «Pedir 7 días» sigue diciendo 5', ap1.u===5 && ap1.fabHoy===5 && ap1.camHoy===0, ap1);
  chk('AP3. la fila lo dice: «📌 Hoy se piden 5 a la fábrica»', /Hoy se piden/.test(ap1.txt||''), ap1);

  await page.clock.setFixedTime(new Date('2026-10-17T12:00:00-04:00'));   // sábado: al día siguiente
  const ap2 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var o=_fila(K), div=document.createElement('div'); div.innerHTML=stockAutoHtml(o);
    // lo que guarda la celda vuelve igual y la poda no lo saca
    var S=leerStock({ observaciones:JSON.stringify(STOCK) });
    return { fab:o.fabricar, cam:o.enCamino, txt:div.innerText, leido:JSON.stringify(S.ap||{}) };
  });
  chk('AP4. al día siguiente cuenta como EN PRODUCCIÓN: «Pedir 7 días» ya no lo vuelve a pedir (0) y en camino 5', ap2.fab===0 && ap2.cam===5, ap2);
  chk('AP5. la fila dice «🏭 En producción: 5 (lo pidió el panel el 16/10)»', /En producción: 5/.test(ap2.txt||'') && /16\/10/.test(ap2.txt||''), ap2);
  chk('AP6. leer la celda guardada trae lo mismo', /"2026-10-16":\[5,0/.test(ap2.leido||''), ap2);

  const ap3 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    // el lote del día siguiente: Moreno (IM) muestra +3 y PTF nada → entran 3
    var L={ dia:todayStr(), roles:{ log:1, otro:1 }, dif:{}, ent:{}, n:2, hu:['a','b'] }; L.dif[K]=3;
    var prod=existLoteProduccion(L), c1=stockAutoConsumir(prod, todayStr(), 'lote-1'), c2=stockAutoConsumir(prod, todayStr(), 'lote-1');
    var o=_fila(K);
    return { prod:prod[K], c1:c1.length, c2:c2.length, cam:o.enCamino, fab:o.fabricar };
  });
  chk('AP7. la entrada del lote (3 en Moreno) cierra 3 de lo anotado: quedan 2 en producción', ap3.prod===3 && ap3.c1===1 && ap3.cam===2, ap3);
  chk('AP8. el MISMO lote dos veces no cierra dos veces', ap3.c2===0 && ap3.cam===2, ap3);

  const ap4 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    // un traspaso de Moreno a PTF en el mismo archivo (+4 PTF, −4 IM) NO es producción
    var L={ dia:todayStr(), roles:{ log:1, otro:1 }, dif:{}, ent:{}, n:2, hu:['c','d'] }; L.dif[K]=0;
    var Lt={ dia:todayStr(), roles:{ log:1, otro:1, sale:1 }, dif:{}, ent:{}, n:3, hu:['e'] }; Lt.dif[K]=4-4;
    // con la recogida anotada: PTF esperaba +4 (ent) y cuadra; IM −4 → neto 0
    var Lr={ dia:todayStr(), roles:{ log:1, otro:1 }, dif:{}, ent:{}, n:2, hu:['f'] }; Lr.dif[K]=-4; Lr.ent[K]=4;
    return { t:existLoteProduccion(Lt)[K]||0, r:existLoteProduccion(Lr)[K]||0 };
  });
  chk('AP9. un traspaso entre almacenes no cuenta como producción (con o sin la recogida anotada)', ap4.t===0 && ap4.r===0, ap4);

  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00-04:00'));   // lunes 26: pasó la llegada esperada + 2 días hábiles
  const ap5 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var o=_fila(K), div=document.createElement('div'); div.innerHTML=stockAutoHtml(o);
    return { cam:o.enCamino, txt:div.innerText, vence:stockAutoVence('2026-10-16') };
  });
  chk('AP10. lo que no apareció a tiempo deja de contar y avisa «¿se pidió?»', ap5.cam===0 && /se pidió\?/.test(ap5.txt||''), ap5);

  const ap6 = await ev(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    stockAutoNoSePidio(K, '2026-10-16');
    var o=_fila(K), div=document.createElement('div'); div.innerHTML=stockAutoHtml(o);
    // junta de dos equipos: el más nuevo manda en lo pedido; lo que llegó, el mayor
    var b={}, m={ X:{ '2026-10-16':[5,0,0,0,100] } }, s2={ X:{ '2026-10-16':[7,2,1,0,200] } };
    var F=fusAuto(b, m, s2).X['2026-10-16'];
    // la poda: lo anulado de un día que pasó se va; lo de hace más de 12 días también
    var S={ ap:{ A:{ '2026-10-10':[3,0,0,1,1] }, B:{ '2026-10-01':[3,0,0,0,1] }, C:{ '2026-10-25':[3,1,0,0,1] } } }; stockPodarAuto(S, '2026-10-26');
    /* 🔌 (18/10, §4ls) Termina el bloque: se APAGA otra vez. Algo anotado el 23/10 (vigente el 26) cuenta prendido y apagado no. */
    STOCK.ap[K]={ '2026-10-23':[4,0,0,0,Math.floor(Date.now()/1000)] };
    var camOn=_fila(K).enCamino;
    STOCK_AUTO_ACTIVO=false;
    var oOff=_fila(K), dOff=document.createElement('div'); dOff.innerHTML=stockAutoHtml(oOff);
    var anotOff=stockAutoAnotar(todayStr()).length;
    return { txt:div.innerText, F:F, poda:Object.keys(S.ap), camOn:camOn, camOff:oOff.enCamino, txtOff:dOff.innerText, anotOff:anotOff, sigue:!!(STOCK.ap[K]||{})['2026-10-23'] };
  });
  chk('AP11. «No se pidió» lo saca de la fila', typeof ap6.txt==='string' && !/se pidió\?/.test(ap6.txt), ap6);
  chk('AP12. la junta de dos equipos: la versión más nueva manda (7, a mano) y lo llegado es el mayor (2)', ap6.F && ap6.F[0]===7 && ap6.F[1]===2 && ap6.F[2]===1, ap6);
  chk('AP13. la poda deja solo lo vigente (la celda no crece)', JSON.stringify(ap6.poda)==='["C"]', ap6);
  chk('AP14. 🔌 apagado otra vez: lo anotado (4, vigente) deja de contar y de mostrarse, no se anota nada, y queda guardado para cuando se prenda',
      ap6.camOn===4 && ap6.camOff===0 && !/En producción/.test(ap6.txtOff||'') && ap6.anotOff===0 && ap6.sigue===true, ap6);
  /* 🔌 (18/10, §4ls, corrector) Apagarlo en una evaluación APARTE, pase lo que pase arriba: si algo de AP1-AP13 tiraba un error antes de la
     línea de `ap6`, el resto de la prueba corría con el automático prendido y una falla podía esconder a otra. */
  const apOff = await ev(() => { STOCK_AUTO_ACTIVO=false; return STOCK_AUTO_ACTIVO; });
  chk('AP15. 🔌 el automático queda APAGADO para el resto de la prueba (como viene)', apOff===false, apOff);
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00-04:00'));

  /* ── Arreglos chicos (17/10): lo que se ve tiene que decir lo mismo que la cuenta ── */
  const ch = await ev(async () => {
    var r={}, K=_k('CH1151','SOMIER TITANIO LATEX','200x200'), KS=_k('CS1014','COLCHON CONFORT PLUS','180x190');
    var fila=function(d, k){ return d.lista.filter(function(x){ return x.k===k; })[0]; };
    // U39a: lo vendido para DICIEMBRE (fuera del horizonte de «Pedir») no es «⛔ Ya falta»
    await _cargar([_ped('p-dic','2026-12-02',[{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000 }])], _stock(function(st){ st.c.u[K]=0; }));
    var d=stockData(), o=fila(d, K); stockProducir(d);
    r.u39a={ fab:o.fabricar, comp:o.comp, reloj:sfReloj(o).txt };
    // U39b + U40: tres entregas hace 18-25 días (ritmo de 30 días, ninguna en 15)
    var ps=[['p-a','2026-09-22'],['p-b','2026-09-25'],['p-c','2026-09-28']].map(function(x){
      return _ped(x[0], x[1], [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000 }], { entregado:true, ts:_ts(x[1],'09:00:00') }); });
    await _cargar(ps, _stock(function(st){ st.c.u[K]=0; }));
    d=stockData(); o=fila(d, K); stockProducir(d);
    r.u39b={ reloj:sfReloj(o).txt, pMes:o._pMes, pQuin:o._pQuin };
    await _cargar(ps, _stock(function(st){ st.c.u[K]=1; }));
    d=stockData(); o=fila(d, K); stockProducir(d);
    r.u40={ aviso:o.aviso, pMes:o._pMes, pQuin:o._pQuin, accion:String(sfAccion(o)).replace(/<[^>]+>/g,'') };
    // U42: PTF «negativo» con el Excel de hoy (un ✅ de hoy después del corte de las 08:00) y algo para pedir
    var hoy=todayStr();
    await _cargar([ _ped('p-neg', hoy, [{ codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:1, precio:1000 }], { entregado:true, ts:_ts(hoy,'07:00:00') }),
                    _ped('p-pend', '2026-10-20', [{ codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:2, precio:1000 }]) ],
                  _stock(function(st){ st.c.u[KS]=0; }));
    d=stockData(); o=fila(d, KS);
    var _cp=copyText, cap=''; copyText=function(t){ cap=t; }; try{ copiarStock(); } finally { copyText=_cp; }
    r.u42={ dep:o.deposito, txt:(typeof stockNegTxt==='function'?stockNegTxt(o):'volvé a contar'), copia:cap };
    // U43: dos fábricas (Heaven → Moreno, Sueña → Multiespumas), cada una con su lista, y los tres botones en el Plan
    await _cargar([ _ped('p-h', '2026-10-20', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:3, precio:1000 }]),
                    _ped('p-s', '2026-10-20', [{ codigo:'CS1014', desc:'COLCHON CONFORT PLUS', medida:'180x190', cant:2, precio:1000 }]) ],
                  _stock(function(st){ st.c.u[K]=0; st.c.u[KS]=0; }));
    cap=''; copyText=function(t){ cap=t; }; try{ if(typeof copiarProducirTodo==='function') copiarProducirTodo('quin'); } finally { copyText=_cp; }
    PLAN_F='todos'; PLAN_TODOS=true; try{ STOCK_FILTRO.q=''; }catch(e){}
    renderStock();
    var bots=[].map.call(document.querySelectorAll('#stk-plan .pl-copias button'), function(b){ return b.textContent; });
    r.u43={ n:(cap.match(/🏭 PRODUCIR PARA/g)||[]).length, cap:cap, bots:bots };
    // U50 + U51: catálogo y Bahía
    r.u50={ ch2441:(CODIGOS.CH2441||{}).m, ch2453:CODIGOS.CH2453||null };
    r.u51={ bahia:stockCariocaDescontinuado('BAHIA|105X190'), colchon:stockCariocaDescontinuado('COLCHON BAHIA|140X190'), otro:stockCariocaDescontinuado('BAHIA BLANCA|105X190') };
    // U37: la leyenda de «Vende por día»
    r.u37=/lo que el EQUIPO entregó/.test(document.getElementById('stock-body') ? document.getElementById('stock-body').innerHTML : '');
    return r;
  });
  chk('RN-U39a. lo vendido para diciembre no dice «⛔ Ya falta» con «Pedir» en 0', ch.u39a && ch.u39a.comp===1 && !/Ya falta/.test(ch.u39a.reloj||'') && /más adelante/.test(ch.u39a.reloj||''), ch.u39a);
  /* 📅 (18/10, §4ls Mes-VM4, a conciencia) Lo que falta para terminar octubre al ritmo de 30 días (2) ahora está en «15 días», no en
     noviembre: el reloj dice «lo pide el plan de 15 días». Lo que cuida la prueba no cambia: nunca «Alcanza más de 45 días». */
  chk('RN-U39b. con 0 en todos lados y el plan pidiendo (15 días o el mes), no dice «Alcanza más de 45 días»', ch.u39b && (ch.u39b.pMes>0 || ch.u39b.pQuin>0) && /Sin stock · lo pide el plan (de 15 días|del mes)/.test(ch.u39b.reloj||'') && !/Alcanza/.test(ch.u39b.reloj||''), ch.u39b);
  chk('RN-U40. «💤 Sobra» no dice «no pedir más» cuando el plan del mes pide (dice cuánto)', ch.u40 && ch.u40.aviso==='sobra' && ch.u40.pMes>0 && !/no pedir más/.test(ch.u40.accion) && /el plan pide/.test(ch.u40.accion), ch.u40);
  chk('RN-U42a. (control) PTF da −1 con un ✅ de hoy que el Excel de las 08:00 ya restaba', ch.u42 && ch.u42.dep===-1, ch.u42 && { dep:ch.u42.dep });
  chk('RN-U42b. con el Excel de HOY no manda a «volvé a contar»: dice que revise las entregas', ch.u42 && /revisá las entregas/.test(ch.u42.txt) && !/volvé a contar/.test(ch.u42.txt), ch.u42 && ch.u42.txt);
  chk('RN-U42c. la copia para fábrica nunca escribe «quedan -1»', ch.u42 && /CONFORT PLUS/.test(ch.u42.copia) && !/quedan -/.test(ch.u42.copia), ch.u42 && ch.u42.copia);
  chk('RN-U43a. «📋 15 días» copia las DOS fábricas, cada una con su lista', ch.u43 && ch.u43.n===2 && /MULTI/i.test(ch.u43.cap) && /MORENO/i.test(ch.u43.cap), ch.u43 && { n:ch.u43.n, cap:(ch.u43.cap||'').slice(0,300) });
  chk('RN-U43b. el Plan tiene los tres botones (7 días, 15 días, el mes)', ch.u43 && ch.u43.bots.length===3 && /7 días/.test(ch.u43.bots[0]) && /15 días/.test(ch.u43.bots[1]), ch.u43 && ch.u43.bots);
  chk('RN-U50. CH2441 es el 105x190 (como el Excel) y CH2453 (160 negro) está en la lista', ch.u50 && ch.u50.ch2441==='105x190' && ch.u50.ch2453 && ch.u50.ch2453.m==='160x190', ch.u50);
  chk('RN-U51. el colchón Bahía con la clave cruda «BAHIA» también es descontinuado (y «BAHIA BLANCA» no)', ch.u51 && ch.u51.bahia===true && ch.u51.colchon===true && ch.u51.otro===false, ch.u51);
  chk('RN-U37. la leyenda de «Vende por día» dice lo que cuenta (el EQUIPO, con las reglas)', ch.u37===true, ch.u37);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
