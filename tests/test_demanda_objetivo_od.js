/* 🧑‍💼📈 LA DEMANDA CON EDUARDO ADENTRO Y LOS MAYORISTAS AFUERA + EL OBJETIVO CON 5 DÍAS PARA LO QUE ROTA Y NO CAE (01/11, §4od).

   Lo que pidió el dueño el 01/11:
     1. Los pedidos de Eduardo CUENTAN como demanda. Afuera quedan los MAYORISTAS —Tienda Amiga, José Carlos Copacaba (toda variante
        «Copacaba», también la mal escrita «COAPCABA») y Luis Franco—, lo venda quien lo venda (`STOCK_CLIENTES_FUERA`, por el nombre del
        cliente sin tildes ni mayúsculas; además el vendedor «TIENDA AMIGA»). Un «JOSE CARLOS» suelto NO es Copacaba.
        Lo demás sigue igual: la venta de tienda cuenta, la RPT no (en almohadas sí), Eduardo → Multicenter cuenta, ROHO cuenta,
        `stockPuntual` (Multicenter de otro vendedor, consignación, ROHO a «TIENDA n») sigue afuera.
        Las entregas de Eduardo cuentan también para el candado de las 3 entregas (aceptado por el dueño).
     2. Un colchón o somier que rota y NO viene cayendo tiene objetivo = punto de pedido + 5 días de venta (`STOCK_OBJ_EXTRA_ROTA`);
        «cayendo» = los últimos 15 días hábiles COMPLETOS (`STOCK_OBJ_CAIDA_VENTANA`; 02/11: 15, no 10, y sin el día en curso) venden
        menos del 75 % (`STOCK_OBJ_CAIDA_UMBRAL`) del ritmo de los 26 completos: ese se queda con + 1 (`STOCK_OBJ_EXTRA`). Justo en el
        75 % no cae. Almohadas + 5 como antes; lo que no rota y lo discontinuado, sin objetivo como antes. Todo lo derivado (15 días,
        el mes, Pedido a producción, Qué va a dónde) sale del MISMO objetivo. El Plan muestra la clase («rota +5» / «cayendo +1») en
        la celda «Tener», y «¿cayó o faltó?» cuando la caída puede ser falta de stock (solo aviso).
     2b. (02/11, dueño) Los pedidos INTERNOS (`CONTA_INTERNOS`, la misma identidad que Contabilidad) quedan afuera de la demanda.
        Eduardo → «ROHO TIENDA 1» / «roho T1» SÍ cuenta: es la única señal de lo que venden las Tiendas Roho.
     3. El 24/09 es feriado en el calendario de días hábiles que mira atrás (`FERIADOS_PASADOS`); SOMIER BAHIA BEIGE y SOMIER BAHIA NEGRO
        (también «T.A») están discontinuados.

   LO QUE ESTA PRUEBA CUIDA:
   D1  `stockClienteFuera`: las variantes de escritura que entran y las que no.
   D2  `stockPedidoUnico`: Eduardo a un cliente común ya NO es pedido único; a un mayorista sí; la RPT, el puntual y Multicenter de otro
       vendedor siguen igual; el vendedor «TIENDA AMIGA» queda afuera. (02/11) Los internos quedan afuera; Eduardo → ROHO tienda adentro.
   D5  Internos: FABRICA/ALBA/MORENO… con cualquier cliente no arman ritmo (3 entregas de FABRICA no rotan), pero lo vendido sin
       entregar se cubre. La identidad es la de Contabilidad (`cliEsInterno`): «Multiespuma», «REPOSICION DE ALMACEN»…
   D6  Eduardo → «ROHO TIENDA 1» / «roho T1»: cuenta (3 entregas rotan); ROHO → «TIENDA 1» sigue afuera; FABRICA → «TIENDA 1 ROHO» afuera (interno).
   D3  El candado de las 3 entregas con Eduardo: 2 del equipo + 1 de Eduardo rotan; 2 del equipo + 1 a Tienda Amiga no; 3 de Eduardo a
       Multicenter el mismo día son UNA entrega (§4gy, sin cambios); 3 de Eduardo a un cliente común rotan.
   D4  Lo vendido a un mayorista y sin entregar se cubre igual (`comp`), aunque no arme ritmo.
   O1  +5 contra +1: dos productos, uno parejo (rota) y otro que cae: el que cae lleva 1·μ sobre el punto de pedido, el otro 5·μ.
   O2  Los bordes del umbral: μ15 = 0,75·μ26 exacto → rota (+5); una unidad menos en los 15 días → cayendo (+1).
   M1  (02/11, revisión) El día en curso NO entra en la prueba de «cayendo»: el mismo producto a la mañana (sin ventas de hoy) y a la
       tarde (con 4 vendidas hoy) tiene la misma clase y las mismas μ15/μ26 de la prueba; la μ del objetivo sí cambia (incluye hoy).
       Con la versión del 01/11 (hoy adentro) el de la mañana salía «cayendo» y el de la tarde «rota».
   O6  «¿cayó o faltó?»: sale al lado de «cayendo +1» si hoy quedan ≤ 1 para cargar o hubo «✗ no hay» / 🏭 a pedido en la ventana; no sale
       en un «cayendo» con stock y sin marcas, ni en un «rota»; y no cambia ningún número.
   O3  Lo que no cambia: almohadas +5 (clase «almohada», sin etiqueta), 2 entregas → sin objetivo, discontinuado → sin objetivo ni fabricar.
   O4  Una sola verdad: «Pedir 7 días» del Plan = `o.fabricar` = «Qué producir» 7 días; 15 y 30 días, el mes y «Todo <mes>» se mueven
       con el objetivo (bajar `STOCK_OBJ_EXTRA_ROTA` a 1 los baja a todos y «Se corta» no cambia); «Qué va a dónde» suma exacto; los
       totales por fábrica de «Pedido a producción» son la suma de sus filas.
   O5  El Plan muestra «rota +5» / «cayendo +1» en «Tener», la leyenda lo explica y «Cómo se calcula» dice los días y el porqué.
   F1  El 24/09 no es día hábil para la regla (`pryDiaHabil`, `stockObjVentana`) y sigue siendo un día de entrega (`diaHabil`).
   F2  SOMIER BAHIA BEIGE / NEGRO (y «T.A») están discontinuados; SOMIER BAHIA sigue; otro somier no.

   Reloj CLAVADO (viernes 30/10/2026 de Bolivia, día hábil: hoy queda afuera de la prueba; los 26 completos van del 30/09 al 29/10 y los 15
   del 12/10 al 29/10). Red cortada, datos sintéticos.
   Se corre:  node tests/test_demanda_objetivo_od.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_demanda_objetivo_od.js   (contra `2fabd24` caen D2, D3, O1, O2, O5, F1 y F2
              además de las que necesitan funciones nuevas; contra la versión del 01/11 de este parche caen M1, D5, D6 y O6). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const HOY='2026-10-30';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
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
  window._copiado=''; copyText=function(t){ window._copiado=String(t); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._stock=function(fn){
    var hoy=todayStr(), t=new Date(hoy+'T08:00:00-04:00').getTime();
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:00:00', u:{}, solo0:true, alm:_LOG, cod:{}, t:t, inc:false }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{}, inc:false };
    st.g[_IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(fn) fn(st);
    return st;
  };
  window._n=0;
  window._ped=function(fecha, lineas, extra){
    var id='p'+(++window._n);
    return Object.assign({ id:id, oc:'OC 10-'+(800+window._n), fecha:fecha, turno:'AM', cliente:'CLIENTE '+id.toUpperCase(), vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:lineas }, extra||{});
  };
  /* Ventas ya entregadas: [{f, u, extra}] → una entrega por renglón, con fecha = día de venta (sin `ts`, contaFecha = fecha). */
  window._ventas=function(cod, desc, med, lista, extra){
    return lista.map(function(v){ return _ped(v.f, [{ codigo:cod, desc:desc, medida:med, cant:v.u, precio:1000 }], Object.assign({ entregado:true }, extra||{}, v.extra||{})); });
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    stockOlvidarIndice();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._txt=function(h){ var d=document.createElement('div'); d.innerHTML=h||''; return (d.innerText||d.textContent||'').replace(/\s+/g,' ').trim(); };
  window._o=function(o){ return o ? { rot:o.rotacion, rota:o.rota, nR:o.nVentasRotacion, vR:o.vendidosRotacion, vU:o.vendidosUnicos, vF:o.vendidosFuera, objS:o.objS, objPP:o.objPP, obj:o.objetivo, pp:o.puntoPedido,
    mu:o.objMu, mu10:o.objMuCorta, sd:o.objSd, tip:o.objTipico, extra:o.objExtra, clase:o.objClase, cae:o.objCaida, porDia:o.porDia, pedir:o.pedir, fab:o.fabricar, rec:o.recoger, aviso:o.aviso, comp:o.comp, dias:o.dias, descont:!!o.descont } : null; };
  /* Los 26 días hábiles de la regla, del más nuevo al más viejo (el mismo calendario que la página). */
  window._habiles=function(n){ return stockObjVentana(todayStr()).dias.slice(0, n); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(HOY+'T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const E = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,500) }; } };

  const faltan = await E(() => ['stockClienteFuera','stockObjClaseHtml','stockObjClasePorque'].filter(function(f){ return typeof window[f]!=='function'; })
    .concat(['STOCK_CLIENTES_FUERA','STOCK_VENDEDORES_FUERA','STOCK_OBJ_EXTRA_ROTA','STOCK_OBJ_CAIDA_VENTANA','STOCK_OBJ_CAIDA_UMBRAL','STOCK_DESC_NOMBRES'].filter(function(c){ return typeof window[c]==='undefined'; })));
  chk('la página tiene la regla nueva (funciones y constantes de §4od)', Array.isArray(faltan) && !faltan.length, faltan);
  /* (02/11, revisión) Sin corte: contra una página vieja cada comprobación cae por su cuenta y se ve QUÉ cambia de verdad. */

  /* ── D1. Quién es mayorista ── */
  const d1 = await E(() => {
    var f=function(cliente, vendedor){ return stockClienteFuera({ cliente:cliente, vendedor:vendedor||'Eduardo Añez' }); };
    return {
      entran:[ f('TIENDA AMIGA'), f('Tienda Amiga E.R. S.A.'), f('tienda  amiga'), f('JOSE CARLOS COPACABA'), f('José Carlos Copacaba Potosí'),
               f('JOSE CARLOSCOPACABA POTOSI'), f('COAPCABA POTOSI'), f('COPACABA ORURO'), f('copacaba'), f('LUIS FRANCO'), f('Luis Franco Villamontes Tarija'),
               f('LUIS FRANCO-TARIJA'), f('FULANO DE TAL', 'TIENDA AMIGA'), f('FULANO DE TAL', 'tienda amiga') ],
      noEntran:[ f('JOSE CARLOS'), f('JOSE CARLOS HERRERA VERDUGUEZ'), f('José Carlos Gómez Cuéllar'), f('DON JOSE CARLOS'), f('MULTICENTER'), f('MULTIESPUMAS'),
                 f('TIENDA AMIGAS DEL BARRIO'), f('LUIS FRANCOIS'), f('CLIENTE COMUN'), f('', 'Eduardo Añez'), f('TIENDA 1', 'ROHO') ],
      lista:STOCK_CLIENTES_FUERA.length, vend:STOCK_VENDEDORES_FUERA };
  });
  chk('D1a. entran Tienda Amiga (también «E.R. S.A.»), toda variante Copacaba (COAPCABA, pegado al nombre, con ciudad) y Luis Franco, y el vendedor TIENDA AMIGA', d1.entran && d1.entran.every(Boolean), d1.entran);
  chk('D1b. NO entran un «JOSE CARLOS» suelto ni con otro apellido, Multicenter, Multiespumas, «Tienda amigas…», «Luis Francois», un cliente común ni ROHO a tienda', d1.noEntran && d1.noEntran.every(function(x){ return x===false; }), d1.noEntran);
  chk('D1c. la lista es una constante con 3 patrones (para que el dueño la amplíe) y el vendedor afuera es TIENDA AMIGA', d1.lista===3 && JSON.stringify(d1.vend)==='["TIENDA AMIGA"]', d1);

  /* ── D2. La regla del pedido ── */
  const d2 = await E(() => {
    var u=function(o){ return stockPedidoUnico(Object.assign({ oc:'OC 10-900', vendedor:'Eduardo Añez', cliente:'CLIENTE' }, o)); };
    return { eduComun:u({}), eduMayorista:u({ cliente:'TIENDA AMIGA' }), eduCopacaba:u({ cliente:'José Carlos Copacaba' }), eduLuis:u({ cliente:'LUIS FRANCO' }),
      eduMc:u({ cliente:'MULTICENTER' }), eduMcConsig:u({ cliente:'MULTICENTER CONSIGNACION' }), eduJoseCarlos:u({ cliente:'JOSE CARLOS MORALES' }),
      equipoMayorista:u({ vendedor:'Carola Chavez', cliente:'Tienda Amiga' }), fabricaCopacaba:u({ vendedor:'FABRICA', cliente:'COAPCABA POTOSI' }),
      vendTiendaAmiga:u({ vendedor:'TIENDA AMIGA', cliente:'PERSONA' }), rpt:u({ oc:'RPT 10-001', vendedor:'Maria Flores', cliente:'Charcas' }),
      mcOtro:u({ vendedor:'Carola Chavez', cliente:'MULTICENTER' }), consig:u({ vendedor:'Carola Chavez', cliente:'CONSIGNACION X' }), rohoTienda:u({ vendedor:'ROHO', cliente:'TIENDA 2' }),
      roho:u({ vendedor:'ROHO', cliente:'JUAN PEREZ' }), equipo:u({ vendedor:'Carola Chavez' }), interno:u({ vendedor:'FABRICA', cliente:'JUAN PEREZ' }),
      internos:['ALBA','FABRICA','Multiespuma','MULTIESPUMAS','MORENO','ALZER','REPOSICION DE ALMACEN','reposición de almacén'].map(function(v){ return u({ vendedor:v, cliente:'JUAN PEREZ' }); }),
      noInternos:['Maria Flores','ROHO','Eduardo Añez','MORENO SRL','ALBA ROJAS'].map(function(v){ return u({ vendedor:v, cliente:'JUAN PEREZ' }); }),
      eduRohoT1:u({ cliente:'ROHO TIENDA 1' }), eduRohoT1b:u({ cliente:'roho T1' }), rohoT1:u({ vendedor:'ROHO', cliente:'TIENDA 1' }), fabRohoT1:u({ vendedor:'FABRICA', cliente:'TIENDA  1 ROHO' }),
      mismaLista:(typeof cliEsInterno==='function' && typeof stockEsInterno==='function') && ['ALBA','FABRICA','MULTIESPUMA','MULTIESPUMAS','MORENO','ALZER','REPOSICION DE ALMACEN'].every(function(v){ return cliEsInterno(v) && stockEsInterno({ vendedor:v }); }) };
  });
  chk('D2a. Eduardo a un cliente común, a Multicenter o a un «José Carlos» suelto: demanda (no es pedido único)', d2.eduComun===false && d2.eduMc===false && d2.eduJoseCarlos===false, d2);
  chk('D2b. Eduardo a Tienda Amiga, Copacaba o Luis Franco: pedido único; también si lo vende el equipo o FABRICA, o si el vendedor es TIENDA AMIGA', d2.eduMayorista && d2.eduCopacaba && d2.eduLuis && d2.equipoMayorista && d2.fabricaCopacaba && d2.vendTiendaAmiga, d2);
  chk('D2c. lo que no cambió: la RPT, Multicenter de otro vendedor, la consignación (también de Eduardo a Multicenter) y ROHO a «TIENDA n» siguen afuera; ROHO a una persona y el equipo siguen adentro',
      d2.rpt && d2.mcOtro && d2.consig && d2.eduMcConsig && d2.rohoTienda && d2.roho===false && d2.equipo===false, d2);
  /* (02/11, dueño: «todos afuera») Hasta el 01/11 el interno contaba (`d2.interno===false`); ahora es pedido único. */
  chk('D2d. (02/11) un pedido INTERNO (FABRICA a una persona) es pedido único: los 7 de CONTA_INTERNOS, con la misma identidad que Contabilidad (`cliEsInterno`), también «Multiespuma» y «reposición de almacén»',
      d2.interno===true && d2.internos && d2.internos.every(Boolean) && d2.mismaLista===true, { interno:d2.interno, internos:d2.internos, mismaLista:d2.mismaLista });
  chk('D2e. …y no se pasa de lista: una vendedora, ROHO, Eduardo, «MORENO SRL» o «ALBA ROJAS» no son internos', d2.noInternos && d2.noInternos.every(function(x){ return x===false; }), d2.noInternos);
  chk('D2f. (02/11, dueño) Eduardo → «ROHO TIENDA 1» / «roho T1» CUENTA (es lo único que dice qué vende la tienda de ROHO); ROHO → «TIENDA 1» sigue afuera y FABRICA → «TIENDA 1 ROHO» sale por interno',
      d2.eduRohoT1===false && d2.eduRohoT1b===false && d2.rohoT1===true && d2.fabRohoT1===true, { eduRohoT1:d2.eduRohoT1, eduRohoT1b:d2.eduRohoT1b, rohoT1:d2.rohoT1, fabRohoT1:d2.fabRohoT1 });

  /* ── D3/D4. El candado de las 3 entregas con Eduardo, y lo vendido a un mayorista se cubre ── */
  const d3 = await E(async () => {
    var L=function(cod,d,m,c){ return [{ codigo:cod, desc:d, medida:m, cant:c, precio:1000 }]; };
    var KA=_k('CH1129','TITANIO LATEX','140x190'), KB=_k('CH1130','TITANIO LATEX','160x190'), KC=_k('CH1131','TITANIO LATEX','180x190'), KD=_k('CH1132','TITANIO LATEX','200x200');
    var ped=[]
      // A: 2 del equipo + 1 de Eduardo a un cliente común, en los últimos 15 días → 3 entregas
      .concat(_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-10-20',u:1},{f:'2026-10-23',u:1},{f:'2026-10-27',u:1,extra:{ vendedor:'Eduardo Añez', cliente:'FERRETERIA EL SOL' }}]))
      // B: 2 del equipo + 1 de Eduardo a Tienda Amiga → 2 entregas: no rota
      .concat(_ventas('CH1130','TITANIO LATEX','160x190', [{f:'2026-10-20',u:1},{f:'2026-10-23',u:1},{f:'2026-10-27',u:9,extra:{ vendedor:'Eduardo Añez', cliente:'TIENDA AMIGA E.R. S.A.' }}]))
      // C: 3 pedidos de Eduardo a Multicenter el MISMO día → una entrega (§4gy): no rota
      .concat(_ventas('CH1131','TITANIO LATEX','180x190', [{f:'2026-10-22',u:2},{f:'2026-10-22',u:2},{f:'2026-10-22',u:2}], { vendedor:'Eduardo Añez', cliente:'MULTICENTER' }))
      // D: 3 entregas de Eduardo a clientes comunes → rota
      .concat(_ventas('CH1132','TITANIO LATEX','200x200', [{f:'2026-10-19',u:2},{f:'2026-10-23',u:2},{f:'2026-10-28',u:2}], { vendedor:'EDUARDO ANEZ', cliente:'HOTEL LOS TAJIBOS' }));
    // y a Tienda Amiga, 4 del B vendidos y sin entregar para el 03/11
    ped.push(_ped('2026-11-03', L('CH1130','TITANIO LATEX','160x190',4), { vendedor:'Eduardo Añez', cliente:'TIENDA AMIGA' }));
    await _cargar(ped, _stock(function(st){ st.c.u[KA]=10; st.c.u[KB]=1; st.c.u[KC]=10; st.c.u[KD]=10; }));
    return { A:_o(_fila(KA)), B:_o(_fila(KB)), C:_o(_fila(KC)), D:_o(_fila(KD)) };
  });
  chk('D3a. 2 entregas del equipo + 1 de Eduardo a un cliente común = 3 entregas: ROTA y tiene objetivo', d3.A && d3.A.nR===3 && d3.A.rota===true && d3.A.objS!=null && d3.A.porDia>0, d3.A);
  chk('D3b. 2 del equipo + 1 a Tienda Amiga (9 u) = 2 entregas: no rota, las 9 son «mayorista» (vendidosFuera) y no arman ritmo', d3.B && d3.B.nR===2 && d3.B.rota===false && d3.B.vF===9 && d3.B.vU===9 && d3.B.porDia===0 && d3.B.objS==null, d3.B);
  chk('D3c. 3 pedidos de Eduardo a Multicenter el mismo día siguen siendo UNA entrega (§4gy): no rota', d3.C && d3.C.nR===1 && d3.C.rota===false && d3.C.vR===6, d3.C);
  chk('D3d. 3 entregas de Eduardo a clientes comunes rotan solas (antes del 01/11 eran «pedido único · Eduardo»)', d3.D && d3.D.nR===3 && d3.D.rota===true && d3.D.vU===0 && d3.D.objS!=null, d3.D);
  chk('D4. lo vendido a Tienda Amiga y sin entregar se cubre igual: 4 comprometidos, 1 a mano → pedir 3, aviso de pedido único', d3.B && d3.B.comp===4 && d3.B.pedir===3 && d3.B.fab===3, d3.B);

  /* ── D5/D6. Internos afuera, Eduardo → ROHO tienda adentro (02/11) ── */
  const d5 = await E(async () => {
    var L=function(cod,d,m,c){ return [{ codigo:cod, desc:d, medida:m, cant:c, precio:1000 }]; };
    var KI=_k('CH1129','TITANIO LATEX','140x190'), KM=_k('CH1130','TITANIO LATEX','160x190'), KR=_k('CH1131','TITANIO LATEX','180x190');
    var ped=[]
      // I: 3 entregas de FABRICA a clientes comunes + 1 del equipo → 1 entrega que cuenta: no rota; las 6 de FABRICA son «interno»
      .concat(_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-10-20',u:2},{f:'2026-10-23',u:2},{f:'2026-10-27',u:2}], { vendedor:'FABRICA', cliente:'HERBERTH MORENO' }))
      .concat(_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-10-28',u:1}]))
      // M: 2 del equipo + 1 de ALBA (interno) → 2 entregas: no rota (antes del 02/11 rotaba con 3)
      .concat(_ventas('CH1130','TITANIO LATEX','160x190', [{f:'2026-10-20',u:1},{f:'2026-10-23',u:1},{f:'2026-10-27',u:1,extra:{ vendedor:'ALBA', cliente:'SAMURAI' }}]))
      // R: 3 reposiciones de Eduardo a la tienda de ROHO → rotan
      .concat(_ventas('CH1131','TITANIO LATEX','180x190', [{f:'2026-10-20',u:2,extra:{ vendedor:'Eduardo Añez', cliente:'ROHO TIENDA 1' }},{f:'2026-10-23',u:2,extra:{ vendedor:'EDUARDO ANEZ', cliente:'roho T1' }},{f:'2026-10-27',u:2,extra:{ vendedor:'Eduardo Añez', cliente:'Roho Tienda 1' }}]));
    ped.push(_ped('2026-11-03', L('CH1129','TITANIO LATEX','140x190',3), { vendedor:'FABRICA', cliente:'SEVERIANO MELGAR' }));   // interno vendido sin entregar: se cubre
    await _cargar(ped, _stock(function(st){ st.c.u[KI]=1; st.c.u[KM]=10; st.c.u[KR]=10; }));
    return { I:Object.assign(_o(_fila(KI)), { vI:_fila(KI).vendidosInt }), M:_o(_fila(KM)), R:_o(_fila(KR)), quien:stockUnicoQuien(_fila(KI)), etq:stockUnicoEtq(_fila(KI)) };
  });
  chk('D5a. 3 entregas de FABRICA + 1 del equipo = 1 entrega que cuenta: no rota; las 6 de FABRICA son «pedido interno» (vendidosInt), sin ritmo', d5.I && d5.I.nR===1 && d5.I.rota===false && d5.I.vI===6 && d5.I.vU===6 && d5.I.porDia===0, d5.I);
  chk('D5b. …pero lo que FABRICA vendió y falta entregar se cubre: 3 comprometidos, 1 a mano → pedir 2', d5.I && d5.I.comp===3 && d5.I.pedir===2, d5.I);
  chk('D5c. …y el cartel lo dice: «pedido interno»', /pedido interno/.test(d5.etq||'') && /Fue un pedido interno/.test(d5.quien||''), { etq:d5.etq, quien:d5.quien });
  chk('D5d. 2 del equipo + 1 de ALBA (interno, aunque sea una venta B2B) = 2 entregas: no rota (el dueño eligió «todos afuera»)', d5.M && d5.M.nR===2 && d5.M.rota===false && d5.M.vU===1, d5.M);
  chk('D6. 3 reposiciones de Eduardo a «ROHO TIENDA 1» / «roho T1» rotan: son demanda (tienen objetivo)', d5.R && d5.R.nR===3 && d5.R.rota===true && d5.R.vU===0 && d5.R.objS!=null, d5.R);

  /* ── O1/O2. +5 contra +1, y los bordes (02/11: ventana 15, días hábiles COMPLETOS: H[0] = hoy queda afuera de la prueba) ── */
  const o1 = await E(async () => {
    var H=_habiles(27);                          // H[0] = hoy (viernes 30/10, a medias); H[1..26] = los 26 días hábiles completos; H[1..15] = los 15 de la prueba
    var serie=function(cod,d,m,porDia){ var l=[]; for(var i=0;i<27;i++){ var u=porDia(i); if(u>0) l.push({ f:H[i], u:u }); } return _ventas(cod,d,m,l); };
    var KR=_k('CH1129','TITANIO LATEX','140x190'), KC=_k('CH1130','TITANIO LATEX','160x190'), KE=_k('CH1131','TITANIO LATEX','180x190'), KF=_k('CH1132','TITANIO LATEX','200x200');
    var ped=[]
      .concat(serie('CH1129','TITANIO LATEX','140x190', function(i){ return i===0 ? 0 : 2; }))                     // R: 2 por día completo (μ26 = 2, μ15 = 2), nada hoy → rota
      .concat(serie('CH1130','TITANIO LATEX','160x190', function(i){ return i===0 ? 0 : (i<=15 ? 1 : 3); }))       // C: últimos 15 completos a 1, los 11 de antes a 3 (μ26 = 48/26, μ15 = 1) → cae
      // E: el borde exacto. Los 26 completos suman 104 (μ26 = 4); los últimos 15 suman 45 (μ15 = 3 = 0,75 × 4): NO cae. Hoy 1 (no cuenta en la prueba)
      .concat(serie('CH1131','TITANIO LATEX','180x190', function(i){ return i===0 ? 1 : (i<=15 ? 3 : (i===16 ? 9 : 5)); }))
      // F: una unidad menos en los 15 (44: μ15 = 2,933 < 3) y los 26 siguen en 104 (el día 16 lleva 10): cae
      .concat(serie('CH1132','TITANIO LATEX','200x200', function(i){ return i===0 ? 1 : (i<=15 ? (i===15 ? 2 : 3) : (i===16 ? 10 : 5)); }));
    await _cargar(ped, _stock(function(st){ st.c.u[KR]=40; st.c.u[KC]=40; st.c.u[KE]=60; st.c.u[KF]=60; }));
    var f=function(k){ var o=_fila(k); return Object.assign(_o(o), { muL:o.objMuLarga, nC:o.objNCorta, nL:o.objNLarga, sinHoy:o.objSinHoy }); };
    return { R:f(KR), C:f(KC), E:f(KE), F:f(KF), H:H.slice(0,3), K:{ R:KR, C:KC, E:KE, F:KF } };
  });
  const cerca=(a,b)=>Math.abs(a-b)<1e-9;
  chk('O1a. el que vende parejo (2 por día hábil completo): clase «rota», +5 días → objetivo = punto de pedido + 5·μ; la prueba mira 15 y 26 días completos sin hoy',
      o1.R && o1.R.clase==='rota' && o1.R.extra===5 && o1.R.cae===false && cerca(o1.R.mu10,2) && cerca(o1.R.muL,2) && o1.R.nC===15 && o1.R.nL===26 && o1.R.sinHoy===true && cerca(o1.R.objS, o1.R.objPP+5*o1.R.mu), o1.R);
  chk('O1b. el que viene cayendo (15 completos a 1, los 11 de antes a 3: μ15 = 1 < 0,75·1,85): clase «cayendo», +1 día → objetivo = punto de pedido + μ',
      o1.C && o1.C.clase==='cayendo' && o1.C.extra===1 && o1.C.cae===true && cerca(o1.C.muL, 48/26) && cerca(o1.C.mu10, 1) && cerca(o1.C.objS, Math.max(o1.C.objPP+o1.C.mu, o1.C.tip)), o1.C);
  chk('O1c. los dos rotan con el MISMO ritmo de 15 días para «Se corta» (el ritmo de la proyección no cambia con la clase)', o1.R && o1.C && o1.R.rota && o1.C.rota && o1.R.porDia>0 && o1.C.porDia>0, { R:o1.R&&o1.R.porDia, C:o1.C&&o1.C.porDia });
  chk('O2a. el borde exacto: μ15 = 3 = 0,75 × μ26 (4) NO cae → «rota», +5 (la unidad de hoy no entra en la prueba)', o1.E && cerca(o1.E.muL,4) && cerca(o1.E.mu10,3) && o1.E.clase==='rota' && o1.E.extra===5, o1.E);
  chk('O2b. una unidad menos en los 15 días (μ15 = 2,933 < 3) → «cayendo», +1', o1.F && cerca(o1.F.muL,4) && cerca(o1.F.mu10,44/15) && o1.F.clase==='cayendo' && o1.F.extra===1, o1.F);
  /* El desvío de las dos series no es el mismo (se movió una unidad de día), así que se compara lo que va SOBRE el punto de pedido: 5·μ contra 1·μ, con la μ del objetivo (que incluye hoy). */
  chk('O2c. …y sobre el punto de pedido el del borde lleva 5·μ y el que cae 1·μ', o1.E && o1.F && cerca(o1.E.objS-o1.E.objPP, 5*o1.E.mu) && cerca(o1.F.objS-o1.F.objPP, 1*o1.F.mu), { E:o1.E&&[o1.E.objS,o1.E.objPP,o1.E.mu], F:o1.F&&[o1.F.objS,o1.F.objPP,o1.F.mu] });

  /* ── M1. El día en curso no cambia la clase entre la mañana y la tarde (02/11, must-fix de la revisión) ── */
  const m1 = await E(async () => {
    var H=_habiles(27);
    var serie=function(cod,d,m,porDia){ var l=[]; for(var i=0;i<27;i++){ var u=porDia(i); if(u>0) l.push({ f:H[i], u:u }); } return _ventas(cod,d,m,l); };
    var K=_k('CH1129','TITANIO LATEX','140x190');
    // Justo en el umbral con los días completos (μ15 = 3, μ26 = 4 → rota). A la mañana no hay ventas de hoy; a la tarde se cargaron 4.
    var completos=function(i){ return i<=15 ? 3 : (i===16 ? 9 : 5); };
    var manana=serie('CH1129','TITANIO LATEX','140x190', function(i){ return i===0 ? 0 : completos(i); });
    var tarde=serie('CH1129','TITANIO LATEX','140x190', function(i){ return i===0 ? 4 : completos(i); });
    var f=function(){ var o=_fila(K); return { clase:o.objClase, mu10:o.objMuCorta, muL:o.objMuLarga, mu:o.objMu, extra:o.objExtra }; };
    await _cargar(manana, _stock(function(st){ st.c.u[K]=60; })); var a=f();
    await _cargar(tarde, _stock(function(st){ st.c.u[K]=60; })); var b=f();
    return { manana:a, tarde:b };
  });
  chk('M1a. a la mañana (0 vendidas hoy) y a la tarde (4 vendidas hoy) la clase es la MISMA («rota») y μ15/μ26 de la prueba no se mueven',
      m1.manana && m1.tarde && m1.manana.clase==='rota' && m1.tarde.clase==='rota' && cerca(m1.manana.mu10, m1.tarde.mu10) && cerca(m1.manana.muL, m1.tarde.muL) && cerca(m1.manana.mu10,3) && cerca(m1.manana.muL,4), m1);
  chk('M1b. …mientras que la μ del objetivo sí toma lo de hoy (sube 4/26), como la regla validada', m1.manana && m1.tarde && cerca(m1.tarde.mu-m1.manana.mu, 4/26), m1);

  /* ── M1c. Domingo (o feriado): lo vendido HOY cae en el último día hábil, que ya estaba completo; la prueba lo descuenta (02/11, revisión
     con Opus). Sin el arreglo, 4 vendidas el domingo pasaban un «cayendo» (μ15 = 44/15 < 0,75 × 4) a «rota» (48/15 > 0,75 × 108/26). ── */
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00-04:00'));
  const m1c = await E(async () => {
    var H=_habiles(27), hoy=todayStr();   // hoy = domingo 01/11; H[0] = sábado 31/10, completo
    var u=function(i){ return i<=13 ? 3 : (i===14 ? 2 : (i<=24 ? 5 : (i===25 ? 10 : 0))); };   // 15 días: 44 · 26 días: 104
    var base=[]; for(var i=0;i<27;i++){ if(u(i)>0) base.push({ f:H[i], u:u(i) }); }
    var K=_k('CH1129','TITANIO LATEX','140x190');
    var manana=_ventas('CH1129','TITANIO LATEX','140x190', base);
    var tarde=_ventas('CH1129','TITANIO LATEX','140x190', base.concat([{ f:hoy, u:4 }]));
    var f=function(){ var o=_fila(K); return { hoy:hoy, sab:H[0], clase:o.objClase, mu10:o.objMuCorta, muL:o.objMuLarga, mu:o.objMu, extra:o.objExtra, sinHoy:o.objSinHoy }; };
    await _cargar(manana, _stock(function(st){ st.c.u[K]=60; })); var a=f();
    await _cargar(tarde, _stock(function(st){ st.c.u[K]=60; })); var b=f();
    return { manana:a, tarde:b };
  });
  await page.clock.setFixedTime(new Date(HOY+'T12:00:00-04:00'));
  chk('M1c. un domingo, 4 vendidas hoy no cambian la clase («cayendo» a la mañana y a la tarde: μ15 = 44/15, μ26 = 4) y la μ del objetivo sí las toma',
      m1c.manana && m1c.tarde && m1c.manana.hoy==='2026-11-01' && m1c.manana.sab==='2026-10-31' && m1c.manana.clase==='cayendo' && m1c.tarde.clase==='cayendo' &&
      cerca(m1c.manana.mu10, 44/15) && cerca(m1c.tarde.mu10, 44/15) && cerca(m1c.tarde.muL, 4) && cerca(m1c.tarde.mu-m1c.manana.mu, 4/26) && m1c.tarde.sinHoy===true, m1c);

  /* ── O3. Lo que no cambia ── */
  const o3 = await E(async () => {
    var H=_habiles(27);
    var serie=function(cod,d,m,porDia,extra){ var l=[]; for(var i=0;i<27;i++){ var u=porDia(i); if(u>0) l.push({ f:H[i], u:u }); } return _ventas(cod,d,m,l,extra); };
    var KA=_k('CD1403','ALMOHADA','50x70'), KJ=_k('CH1075','ESPECIAL JUNIOR','90x190'), KL=_k('CH1129','TITANIO LATEX','140x190'), KN=_k('CH1130','TITANIO LATEX','160x190');
    var ped=[]
      .concat(serie('CD1403','ALMOHADA','50x70', function(i){ return i===0 ? 0 : (i<=15 ? 1 : 3); }, { oc:'RPT 10-0', cliente:'Charcas' }))   // almohada que cae: igual +5 (la RPT es su venta)
      .concat(serie('CH1075','ESPECIAL JUNIOR','90x190', function(i){ return 2; }))                                          // discontinuado que rota parejo
      .concat(_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-10-22',u:10},{f:'2026-10-27',u:10}]))                     // 2 entregas: no rota
      .concat(_ventas('CH1130','TITANIO LATEX','160x190', [{f:'2026-10-01',u:2},{f:'2026-10-05',u:2},{f:'2026-10-08',u:2}]));  // rota en 30 días, no en 15
    await _cargar(ped, _stock(function(st){ st.c.u[KA]=0; st.c.u[KJ]=0; st.c.u[KL]=5; st.c.u[KN]=5; }));
    var d=stockData(); PLAN_F='todos'; PLAN_TODOS=true; PLAN_ABIERTA='';
    var dv=document.createElement('div'); dv.innerHTML=stockPlanHtml(d, d.lista);
    var celda=function(k){ var tr=[].filter.call(dv.querySelectorAll('tr.pl-fila'), function(t){ return t.getAttribute('data-k')===k; })[0]; var c=tr&&tr.querySelector('td.pl-tener'); return c?c.innerText.replace(/\s+/g,' ').trim():null; };
    return { A:_o(_fila(KA)), J:_o(_fila(KJ)), L:_o(_fila(KL)), N:_o(_fila(KN)), celdaA:celda(KA), celdaL:celda(KL), tagA:stockObjClaseHtml(_fila(KA)) };
  });
  chk('O3a. almohadas: +5 días como antes aunque vengan cayendo (clase «almohada»), sin etiqueta en el Plan', o3.A && o3.A.extra===5 && o3.A.clase==='almohada' && o3.A.cae!==true && o3.tagA==='' && /^\d+\s*pedí al bajar a/.test(o3.celdaA||''), { A:o3.A, celda:o3.celdaA });
  chk('O3b. 2 entregas en 15 días: sin objetivo, «a pedido», solo lo vendido', o3.L && o3.L.rota===false && o3.L.objS==null && o3.L.clase==='' && o3.celdaL==='a pedido', { L:o3.L, celda:o3.celdaL });
  chk('O3c. lo discontinuado (ESPECIAL JUNIOR) rota pero no tiene objetivo ni se fabrica', o3.J && o3.J.descont && o3.J.objS==null && o3.J.fab===0, o3.J);
  chk('O3d. lo que rota solo en 30 días (no en 15): sin objetivo, como antes', o3.N && o3.N.rota===false && o3.N.objS==null, o3.N);

  /* ── O4. Una sola verdad: todo lo derivado se mueve con el objetivo ── */
  const o4 = await E(async () => {
    var H=_habiles(27);
    var serie=function(cod,d,m,porDia){ var l=[]; for(var i=0;i<27;i++){ var u=porDia(i); if(u>0) l.push({ f:H[i], u:u }); } return _ventas(cod,d,m,l); };
    var KR=_k('CH1129','TITANIO LATEX','140x190'), KS=_k('COLT0048','COLCHON SOFT','140x190');
    var ped=serie('CH1129','TITANIO LATEX','140x190', function(i){ return 2; }).concat(serie('COLT0048','COLCHON SOFT','140x190', function(i){ return i%2?1:2; }));
    ped.push(_ped('2026-11-04', [{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:3, precio:1000 }]));
    var st=_stock(function(s){ s.c.u[KR]=6; s.g[_BZ].u[KR]=2; s.c.u[KS]=3; });
    var medir=function(){
      var d=stockData(), R=stockProducirCalc(d), out={ fab:{}, fil:{}, tot:{}, plan:{}, dias:{}, obj:{} };
      R.bloques.forEach(function(B){ B.filas.forEach(function(f){ out.fil[f.o.k]={ sem:f.sem, quin:f.quin, d30:f.d30, mes:f.mes, tot:f.tot }; }); out.tot[B.k]=B.tot; });
      stockPlanDatos(d, d.lista).forEach(function(x){ out.plan[x.o.k]={ p7:x.p7, p15:x.p15, pm:x.pm }; });
      d.lista.forEach(function(o){ out.fab[o.k]=o.fabricar; out.dias[o.k]=o.dias; out.obj[o.k]=o.objS; });
      var P=papDatos(true), F={}; P.FABS.forEach(function(Fb){ var s={ sem:0, quin:0, d30:0, tot:0 }, sf={ sem:0, quin:0, d30:0, tot:0 }; Fb.bloques.forEach(function(Q){ Q.filas.forEach(function(g){ ['sem','quin','d30','tot'].forEach(function(h){ s[h]+=g[h]; var r=g.rep[h], t=r.P+r.B; Object.keys(r.T).forEach(function(n){ t+=r.T[n]; }); sf[h]+=t; if(t!==g[h]) out.malRep=(out.malRep||0)+1; }); }); }); F[Fb.nombre]={ filas:s, reparto:sf }; });
      out.pap=F;
      return out;
    };
    await _cargar(ped, st);
    var con5=medir();
    var guard=STOCK_OBJ_EXTRA_ROTA; STOCK_OBJ_EXTRA_ROTA=1; stockOlvidarIndice();
    var con1; try{ con1=medir(); } finally { STOCK_OBJ_EXTRA_ROTA=guard; stockOlvidarIndice(); }
    return { KR:KR, KS:KS, con5:con5, con1:con1 };
  });
  const c5=o4.con5||{}, c1=o4.con1||{}, KR=o4.KR, KS=o4.KS;
  chk('O4a. «Pedir 7 días» del Plan = o.fabricar = «Qué producir» 7 días, para los dos productos', c5.plan && c5.plan[KR] && c5.plan[KR].p7===c5.fab[KR] && c5.fil[KR].sem===c5.fab[KR] && c5.plan[KS].p7===c5.fab[KS] && c5.fil[KS].sem===c5.fab[KS], { plan:c5.plan, fab:c5.fab, fil:c5.fil });
  chk('O4b. 15 días del Plan = «Qué producir» 15 días; el mes del Plan = «Qué producir» el mes', c5.plan && c5.plan[KR].p15===c5.fil[KR].quin && c5.plan[KR].pm===c5.fil[KR].mes, { plan:c5.plan&&c5.plan[KR], fil:c5.fil&&c5.fil[KR] });
  chk('O4c. con STOCK_OBJ_EXTRA_ROTA en 1 el objetivo baja 4·μ = 8 y «7 días», «15 días», «30 días», el mes y «Todo <mes>» bajan con él',
      c1.obj && cerca(c5.obj[KR]-c1.obj[KR], 8) && c1.fab[KR]<c5.fab[KR] && c1.fil[KR].quin<c5.fil[KR].quin && c1.fil[KR].d30<c5.fil[KR].d30 && c1.fil[KR].tot<c5.fil[KR].tot && c1.fil[KR].quin+c1.fil[KR].mes===c1.fil[KR].tot,
      { con5:c5.fil&&c5.fil[KR], con1:c1.fil&&c1.fil[KR], obj5:c5.obj&&c5.obj[KR], obj1:c1.obj&&c1.obj[KR] });
  chk('O4d. «Se corta» (ritmo de 15 días) no se mueve con el objetivo', c1.dias && c1.dias[KR]===c5.dias[KR] && c1.dias[KS]===c5.dias[KS], { con5:c5.dias, con1:c1.dias });
  chk('O4e. «Qué va a dónde» reparte exacto (PTF + Banzer + tiendas = lo pedido) y el total por fábrica de «Pedido a producción» es la suma de sus filas',
      !c5.malRep && c5.pap && Object.keys(c5.pap).length>=1 && Object.keys(c5.pap).every(function(n){ var x=c5.pap[n]; return ['sem','quin','d30','tot'].every(function(h){ return x.filas[h]===x.reparto[h]; }); }) &&
      c5.tot && c5.tot.heaven && c5.tot.heaven.sem===c5.fil[KR].sem && c5.tot.suena && c5.tot.suena.sem===c5.fil[KS].sem, { pap:c5.pap, tot:c5.tot, malRep:c5.malRep });

  /* ── O5. Lo que se ve ── */
  const o5 = await E(async () => {
    var H=_habiles(27);   // (02/11) H[0] = hoy, afuera de la prueba de «cayendo»: la serie va en los 26 días completos
    var serie=function(cod,d,m,porDia){ var l=[]; for(var i=0;i<27;i++){ var u=porDia(i); if(u>0) l.push({ f:H[i], u:u }); } return _ventas(cod,d,m,l); };
    var KR=_k('CH1129','TITANIO LATEX','140x190'), KC=_k('CH1130','TITANIO LATEX','160x190');
    var ped=serie('CH1129','TITANIO LATEX','140x190', function(i){ return i===0 ? 0 : 2; }).concat(serie('CH1130','TITANIO LATEX','160x190', function(i){ return i===0 ? 0 : (i<=15 ? 1 : 3); }));
    await _cargar(ped, _stock(function(st){ st.c.u[KR]=5; st.c.u[KC]=5; }));
    var d=stockData(); PLAN_F='todos'; PLAN_TODOS=true; PLAN_ABIERTA='';
    var dv=document.createElement('div'); dv.innerHTML=stockPlanHtml(d, d.lista);
    var celda=function(k){ var tr=[].filter.call(dv.querySelectorAll('tr.pl-fila'), function(t){ return t.getAttribute('data-k')===k; })[0]; var c=tr&&tr.querySelector('td.pl-tener'); return { txt:c?c.innerText.replace(/\s+/g,' ').trim():null, tag:c&&c.querySelector('.pl-clase')?c.querySelector('.pl-clase').className:'' }; };
    var ley=dv.querySelector('.pl-ley'); var oR=_fila(KR), oC=_fila(KC);
    var est=null; var el=document.querySelector('.pl-clase');
    return { R:celda(KR), C:celda(KC), ley:ley?ley.innerText.replace(/\s+/g,' '):'' , comoR:_txt(stockObjCuentaHtml(oR)), comoC:_txt(stockObjCuentaHtml(oC)), regla:stockObjReglaTxt(),
      tituloR:_txt(stockObjClaseHtml(oR)), css:(function(){ var s=document.createElement('span'); s.className='pl-clase pl-cl-rota'; document.body.appendChild(s); var cs=getComputedStyle(s), r={ bg:cs.backgroundColor, fs:cs.fontSize }; s.remove(); return r; })() };
  });
  chk('O5a. en «Tener», el que rota dice «rota +5» y el que cae «cayendo +1», entre el objetivo y «pedí al bajar a»', o5.R && /^\d+ rota \+5\s*pedí al bajar a \d+/.test(o5.R.txt||'') && /pl-cl-rota/.test(o5.R.tag) && /^\d+ cayendo \+1\s*pedí al bajar a \d+/.test(o5.C.txt||'') && /pl-cl-cayendo/.test(o5.C.tag), { R:o5.R, C:o5.C });
  chk('O5b. la leyenda del Plan explica los 5 días, el «cayendo» con su 75 % y las almohadas', /5 días/.test(o5.ley) && /cayendo/.test(o5.ley) && /75 %/.test(o5.ley) && /almohadas, 5/.test(o5.ley), o5.ley.slice(0,400));
  chk('O5c. «Cómo se calcula» dice «+ 5 días de venta … rota y no cae» y «+ 1 día de venta … viene cayendo», con los dos ritmos de días completos', /\+ 5 días de venta \(los últimos 15 días hábiles completos venden 2,00 por día hábil contra 2,00 en 26: rota y no cae, así que 5 días\)/.test(o5.comoR) && /\+ 1 día de venta \(los últimos 15 días hábiles completos venden 1,00 por día hábil contra 1,85 en 26: viene cayendo, menos del 75 %, así que 1 día/.test(o5.comoC), { R:o5.comoR.slice(0,500), C:o5.comoC.slice(0,500) });
  chk('O5d. la regla en una frase (la copia para la fábrica) nombra los +5 / +1 / almohadas +5', /\+5 días de venta si rota y no viene cayendo; \+1 si viene cayendo; las almohadas, \+5/.test(o5.regla), o5.regla);
  chk('O5e. la etiqueta es chica y clara (tema claro, sin ámbar): fondo del panel y letra < 12 px', o5.css && o5.css.bg==='rgb(227, 243, 241)' && parseFloat(o5.css.fs)<12, o5.css);

  /* ── O6. «¿cayó o faltó?» (02/11): solo aviso ── */
  const o6 = await E(async () => {
    var H=_habiles(27);
    var serie=function(cod,d,m,porDia,extraLinea){ var l=[]; for(var i=0;i<27;i++){ var u=porDia(i); if(u>0) l.push({ f:H[i], u:u }); } return l.map(function(v){ return _ped(v.f, [Object.assign({ codigo:cod, desc:d, medida:m, cant:v.u, precio:1000 }, (extraLinea&&extraLinea(v))||{})], { entregado:true }); }); };
    var cae=function(i){ return i===0 ? 0 : (i<=15 ? 1 : 3); };
    var KA=_k('CH1129','TITANIO LATEX','140x190'), KB=_k('CH1130','TITANIO LATEX','160x190'), KC=_k('CH1131','TITANIO LATEX','180x190'), KD=_k('CH1132','TITANIO LATEX','200x200');
    var ped=[]
      .concat(serie('CH1129','TITANIO LATEX','140x190', cae))                                                        // A: cae, con 1 a mano → «¿cayó o faltó?»
      .concat(serie('CH1130','TITANIO LATEX','160x190', cae, function(v){ return (v.f===H[5]) ? { chk:'no' } : {}; }))   // B: cae, con stock, una línea «✗ no hay» en la ventana → pista
      .concat(serie('CH1131','TITANIO LATEX','180x190', cae))                                                        // C: cae, con stock y sin marcas → sin pista
      .concat(serie('CH1132','TITANIO LATEX','200x200', function(i){ return i===0 ? 0 : 2; }));                     // D: rota, con 1 a mano → sin pista (no cae)
    await _cargar(ped, _stock(function(st){ st.c.u[KA]=1; st.c.u[KB]=30; st.c.u[KC]=30; st.c.u[KD]=1; }));
    var d=stockData(); PLAN_F='todos'; PLAN_TODOS=true; PLAN_ABIERTA='';
    var dv=document.createElement('div'); dv.innerHTML=stockPlanHtml(d, d.lista);
    var celda=function(k){ var tr=[].filter.call(dv.querySelectorAll('tr.pl-fila'), function(t){ return t.getAttribute('data-k')===k; })[0]; var c=tr&&tr.querySelector('td.pl-tener'); return c?c.innerText.replace(/\s+/g,' ').trim():null; };
    var f=function(k){ var o=_fila(k); return { clase:o.objClase, falto:stockObjFalto(o), objS:o.objS, pedir:o.pedir, noHay:o.objNoHay||0, hay:stockHaySalir(o), celda:celda(k), como:_txt(stockObjCuentaHtml(o)) }; };
    return { A:f(KA), B:f(KB), C:f(KC), D:f(KD) };
  });
  chk('O6a. «cayendo» con 1 a mano → «¿cayó o faltó?» en la celda «Tener» y en «Cómo se calcula»', o6.A && o6.A.clase==='cayendo' && o6.A.falto===true && /cayendo \+1\s*¿cayó o faltó\?/.test(o6.A.celda||'') && /¿cayó o faltó\? Puede que no cayera la venta sino el stock: hoy queda 1 para cargar/.test(o6.A.como||''), o6.A);
  chk('O6b. «cayendo» con stock pero con un «✗ no hay» en la ventana → la pista, y dice el motivo', o6.B && o6.B.clase==='cayendo' && o6.B.falto===true && o6.B.noHay===1 && /¿cayó o faltó\?/.test(o6.B.celda||'') && /1 marcado «✗ no hay» en la ventana/.test(o6.B.como||''), o6.B);
  chk('O6c. «cayendo» con stock y sin marcas → sin pista; «rota» con 1 a mano → sin pista', o6.C && o6.D && o6.C.falto===false && !/cayó o faltó/.test(o6.C.celda||'') && o6.D.clase==='rota' && o6.D.falto===false && !/cayó o faltó/.test(o6.D.celda||''), { C:o6.C, D:o6.D });
  chk('O6d. la pista no cambia ningún número: A, B y C tienen el mismo objetivo (misma venta), y A pide lo mismo que su cuenta', o6.A && o6.B && o6.C && cerca(o6.A.objS, o6.B.objS) && cerca(o6.B.objS, o6.C.objS) && o6.A.pedir===Math.max(0, Math.ceil(o6.A.objS-1-1e-9)), { A:o6.A&&[o6.A.objS,o6.A.pedir], B:o6.B&&o6.B.objS, C:o6.C&&o6.C.objS });

  /* ── F1. El 24/09 ── */
  const f1 = await E(() => {
    var V=stockObjVentana('2026-10-16');
    return { fp:FERIADOS_PASADOS['2026-09-24']||'', pry:pryDiaHabil('2026-09-24'), entrega:diaHabil('2026-09-24'), enVentana:V.dias.indexOf('2026-09-24')>=0, pos24:V.pos['2026-09-24'], pos23:V.pos['2026-09-23'],
             sep:pryHabiles('2026-09-01','2026-09-30'), fer:FERIADOS['2026-09-24']||'' };
  });
  chk('F1a. el 24/09 está en FERIADOS_PASADOS: no es día hábil para la regla ni para la proyección, y la venta de ese día va al 23/09', f1.fp && f1.pry===false && !f1.enVentana && f1.pos24===f1.pos23, f1);
  chk('F1b. …y sigue siendo un día de entrega para el calendario de cupos (`diaHabil`, `FERIADOS` no cambia); septiembre quedó con 24 días hábiles', f1.entrega===true && f1.fer==='' && f1.sep===24, f1);

  /* ── F2. SOMIER BAHIA BEIGE / NEGRO ── */
  const f2 = await E(() => {
    var D=stockDescontinuadoK;
    return { si:[ D('SOMIER BAHIA BEIGE|140X190'), D('SOMIER BAHIA BEIGE|193X203'), D('SOMIER BAHIA NEGRO|105X190'), D('SOMIER BAHIA NEGRO T.A|158X198'), D('somier bahia negro t.a.|158x198'), D('SOMIER BAHIA|140X190'), D('BAHIA|105X190') ],
             no:[ D('SOMIER NEGRO|140X190'), D('SOMIER ORO|140X190'), D('TITANIO LATEX|140X190'), D('BAHIA BEIGE SOMIER|140X190') ], lista:Array.isArray(STOCK_DESC_NOMBRES) && STOCK_DESC_NOMBRES.length>=3 };
  });
  chk('F2a. SOMIER BAHIA BEIGE y SOMIER BAHIA NEGRO (todas las medidas, también «T.A») están discontinuados; SOMIER BAHIA y la clave cruda BAHIA siguen', f2.si && f2.si.every(Boolean), f2.si);
  chk('F2b. el SOMIER NEGRO (ROHO), el ORO y los demás no; la lista por nombre es una constante', f2.no && f2.no.every(function(x){ return x===false; }) && f2.lista, f2);
  const f2b = await E(async () => {
    var K='SOMIER BAHIA NEGRO T.A|158X198';
    var ped=_ventas('CD2054','SOMIER BAHIA NEGRO T.A','158X198', [{f:'2026-10-20',u:1},{f:'2026-10-23',u:1},{f:'2026-10-27',u:1}]);
    ped.push(_ped('2026-11-03', [{ codigo:'CD2054', desc:'SOMIER BAHIA NEGRO T.A', medida:'158X198', cant:2, precio:1000 }]));
    await _cargar(ped, _stock(function(st){ st.c.u[K]=0; st.g[_IM].u[K]=6; }));
    var o=_fila(K); return o ? Object.assign(_o(o), { k:o.k }) : null;
  });
  chk('F2c. con 3 entregas y 2 vendidos sin stock en PTF: no se fabrica, se traen de Moreno (lo que queda) y no tiene objetivo', f2b && f2b.descont && f2b.fab===0 && f2b.rec===2 && f2b.objS==null, f2b);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
