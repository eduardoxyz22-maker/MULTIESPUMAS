/* 🔎 LA REVISIÓN DE CODEX DEL 05/10 SOBRE EL CIERRE DIARIO Y EL CONTROL DEL CORTE (§4hn, segunda vuelta).
   Codex revisó las etapas 1 y 2 («corregir antes de publicar») y pidió diez casos de prueba, R1 a R10. Cada sección de
   abajo lleva su número y prueba el arreglo correspondiente:
     R1  hora del corte: Excel de las 09:00 y entrega de las 15:00 (la casilla manda, no la marca ✅)
     R2  atrasado destildado en el cierre: Codex pedía «0 salida»; el dueño decidió (05/10) «como antes»: fecha pasada sin ✅ =
         entregado, lo que no sale se reprograma. El cierre no le escribe nada a lo destildado, y la prueba mide ESA regla.
     R3  recepción parcial de una línea 🏭: 3 de 10 → recibido 3, pendiente 7; el mismo corte repetido no suma
     R4  fallos de guardado (stock sin pedido y pedido sin stock): nunca ✅ antes de tiempo; la cola converge sin duplicar
     R5  reserva y entrega de 2 unidades 🏭 (llegadas y contadas se reservan; al entregarse salen como cualquier colchón)
     R6  orden de cortes: 16:00 y después 09:00 del mismo día; repetido; corregido; sin hora de un lado
     R7  movimiento manual antes / en / después del límite horario de cada corte
     R8  cierre sin conexión: pendiente de sincronizar; al reconectar revalida borrado, reprogramado y entregado
     R9  datos antiguos: la copia de una página vieja y la cola no duplican ni reviven anulaciones ni detecciones
     R10 regresión del cierre de entregas (etapa 1)
   Datos sintéticos, red cortada, servidor simulado. Reloj clavado en el miércoles 07/10/2026 a las 15:00 de Bolivia.
   Se corre:  node tests/test_rev_corte_codex.js
   Dientes contra la versión anterior de la rama:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev_corte_codex.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const RELOJ = '2026-10-07T15:00:00-04:00';

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); localStorage.removeItem('me_cierre_pend'); localStorage.setItem('me_cierre_quien','Marisol'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  /* El «servidor»: anota lo que llega. _fallan[id] = esa fila no tiene red; _sinRed = la lectura no anda. */
  window._guardadas=[]; window._fallan={}; window._sinRed=false; window._planilla=null;
  apiSave=function(rec, opts){
    if(window._fallan[String(rec.id)]) return Promise.reject(new TypeError('Failed to fetch'));
    window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ if(window._sinRed) return Promise.reject(new TypeError('Failed to fetch')); return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._planilla||STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
  window._adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  window._ts=function(f,h){ return new Date(f+'T'+(h||'12:00:00')+'-04:00').getTime(); };
  window._wait=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'10-001',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:true,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
  window.H=function(n,extra){ return [Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n,chk:'ok'},extra||{})]; };
  /* Una línea 🏭 (hecha a pedido en Moreno, pedida hace 3 días), todavía sin llegar. */
  window.FAB=function(n,extra){ return H(n, Object.assign({ chk:'no', enProd:true, prodEn:'Moreno', prodF:_atras(3) }, extra||{})); };
  window.LOG='PRODUCTOS TERMINADOS FAB.', window.IM='IM - PRODUCTOTERMINADO';
  /* El Excel de acá, armado a mano con la forma que devuelve existLeer. */
  window._R=function(fecha, hora, cants, extra){
    var items=[]; var tot=0;
    Object.keys(cants).forEach(function(k){ var it=k===K?{cod:'CH1201',desc:'TITANIO ICE 2.5PLZ 160X190CM',medida:'160x190'}:{cod:'CH1129',desc:'COLCHON TITANIO LATEX 140X190',medida:'140x190'}; it.cant=cants[k]; it.cat=true; it.k=k; it.unidad='UND'; items.push(it); tot+=cants[k]; });
    return Object.assign({ fecha:fecha, sinFecha:false, almacen:LOG, items:items, total:tot, repetidos:0, malos:0, colCant:'G', solo0:true, cods:{CH1201:K, CH1129:K2}, esLog:true, conocido:true, hora:hora||'' }, extra||{});
  };
  /* Un stock con corte de ayer a las 9:00 (antes del camión): 10 de K y 4 de K2 acá, 20 de K en Moreno. */
  window._base=function(){
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STOCK.c={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(_atras(1),'09:05:00') }; STOCK.c.u[K]=10; STOCK.c.u[K2]=4;
    STOCK.g={}; STOCK.g[IM]={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, t:_ts(_atras(1),'09:05:00') }; STOCK.g[IM].u[K]=20;
    STOCK.al={}; STOCK.al[LOG]='log'; STOCK.al[IM]='otro';
    STOCK.p=[]; STATE=[]; stockOlvidarIndice(); saveMirror();
  };
  window._subir=function(R, tildar){
    EXIST_IMP=R; EXIST_CTRL_TODAS=false; renderImportExist();
    var txt=((document.getElementById('modal-box')||{}).textContent||'').replace(/\\s+/g,' ');
    (tildar||[]).forEach(function(sel){ var el=document.querySelector(sel); if(el){ el.checked=true; } });
    return txt;
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._modalTxt=function(){ return ((document.getElementById('modal-box')||{}).textContent||'').replace(/\\s+/g,' '); };
  window._ver=function(id){ var p=findById(id); if(!p) return null; var c=cierreEntDe(p); return { entregado:!!p.entregado, c:c, eX:(p.productos||[]).map(function(x){ return x.eX||''; }) }; };
  /* (06/10) La página ya no deja subir un Excel que no sea de HOY (§4hs). Los casos que suben «el de mañana» sin mover el
     reloj miden otra cosa (la llegada parcial, lo sellado a mano, el aviso de la página vieja): ahí se apaga solo esa regla. */
  window._otroDia=function(){ existNoEsDeHoy=function(){ return null; }; };
  window._n=function(id){ return window._guardadas.filter(function(s){ return String(s.id)===String(id); }).length; };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async () => {
    const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };
  /* Cada sección corre en su propia página; si la página no tiene una función (dientes contra una versión vieja), la sección
     cuenta como UNA roja y la prueba sigue con la siguiente en vez de caerse entera. */
  const seccion = async (nombre, fn) => {
    const page = await nueva();
    try { await fn(page); }
    catch(e){ chk(nombre+' · la página se cayó antes de terminar: '+String(e && e.message || e).split('\n')[0], false); }
    await page.close();
  };

  // ═══ R1 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R1 · Hora del corte: Excel de las 09:00 y entrega confirmada a las 15:00 ──');
  await seccion('R1', async (page) => {
    const r = await page.evaluate((base) => {
      eval(base); _base();
      /* Hoy a las 15:00 se entregó y se confirmó (cierre) un pedido de 2; el Excel es de las 09:00 de hoy. */
      STATE.push(_P({id:'hoy', fecha:todayStr(), entregado:true, productos:H(2,{ eF:todayStr(), eT:_ts(todayStr(),'15:00:00'), eQ:'Marisol' })}));
      var R9=_R(todayStr(),'09:00:00',{[K]:10,[K2]:4});
      var v9=stockVentanaCorte(STOCK.c, R9, false);
      var out={};
      out.salio9=stockSalioVentana(findById('hoy'), findById('hoy').productos[0], v9);
      out.salidas9=stockSalidasVentana(K, v9, '');
      var C9=stockConciliar(R9, 'log', false); out.c9={ cuadran:C9.resumen.cuadran, con:C9.resumen.con };
      /* La casilla manda, no la marca ✅: con «ya incluye» tildada en un Excel de las 09:00, el panel descuenta igual. */
      var C9c=stockConciliar(R9, 'log', true); var f9c=C9c.filas.filter(function(z){ return z.k===K; })[0]||{}; out.c9c={ dif:f9c.dif, salidas:f9c.salidas };
      /* El Excel de las 16:00 (ya incluye) con 8: cuadra. */
      var C16=stockConciliar(_R(todayStr(),'16:00:00',{[K]:8,[K2]:4}), 'log', true); out.c16={ cuadran:C16.resumen.cuadran, con:C16.resumen.con };
      /* En la pantalla de stock, con el corte de las 09:00 confirmado, la entrega de hoy sí baja el depósito (10 − 2). */
      _subir(R9); confirmarImportExist(); out.dep=_fila(K).deposito;
      return out;
    }, BASE);
    chk('R1 · la entrega confirmada a las 15:00 NO entra en la ventana que termina a las 09:00: 0 salidas, el Excel de 10 cuadra',
        r.salio9===false && r.salidas9===0 && r.c9.cuadran===2 && r.c9.con===0, J([r.salio9, r.salidas9, r.c9]));
    chk('R1 · el día del corte lo decide la casilla «ya incluye las entregas», no la marca ✅: tildada, descuenta los 2 (esperado 8 → +2)', r.c9c.dif===2 && r.c9c.salidas===2, J(r.c9c));
    chk('R1 · el Excel de las 16:00 con la casilla marcada (8) cuadra', r.c16.cuadran===2 && r.c16.con===0, J(r.c16));
    chk('R1 · en la pantalla de stock, con el corte de las 09:00 vigente, la entrega de hoy sí baja el depósito: 10 − 2 = 8', r.dep===8, r.dep);
  });

  // ═══ R2 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R2 · Atrasado destildado en el cierre → 0 salida ──');
  await seccion('R2', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STOCK.c.f='2026-10-03'; STOCK.c.t=_ts('2026-10-03','09:05:00');     // corte del sábado 03/10 a las 9: K 10
      STATE.push(_P({id:'a1', oc:'10-010', fecha:'2026-10-05', productos:H(3)}));     // lunes, sin marcar: salió (regla del dueño)
      STATE.push(_P({id:'h1', oc:'10-011', fecha:todayStr(), productos:H(1)}));       // hoy: sí salió
      saveMirror(); renderAdmin();
      var R=_R(todayStr(),'09:00:00',{[K]:7,[K2]:4});
      var v=stockVentanaCorte(STOCK.c, R, false);
      var out={};
      out.antes={ salio:stockSalioVentana(findById('a1'), findById('a1').productos[0], v), salidas:stockSalidasVentana(K, v, ''), comp:_fila(K).comp, dep:_fila(K).deposito };
      /* El cierre: h1 tildado (propuesta), el atrasado a1 viene destildado y queda así. */
      abrirCierreEntregas(); document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas();
      out.res={ hechos:res.hechos, ok:res.ok, cola:res.cola };
      out.a1=_ver('a1'); out.a1Saves=_n('a1');
      out.despues={ salio:stockSalioVentana(findById('a1'), findById('a1').productos[0], v), salidas:stockSalidasVentana(K, v, ''), comp:_fila(K).comp, dep:_fila(K).deposito, stockSalio:stockSalio(findById('a1'), findById('a1').productos[0]) };
      var C=stockConciliar(R, 'log', false); var fk=C.filas.filter(function(z){ return z.k===K; })[0]||null; out.c={ fila:!!fk, cuadran:C.resumen.cuadran };
      /* Sigue en la lista de atrasados, destildado. Reprogramado para mañana deja de ser salida y vuelve a comprometido. */
      closeModal(); abrirCierreEntregas();
      var sel=document.querySelector('.cie-ent-chk[data-id="a1"]'); out.sigueEnLista=!!sel && sel.checked===false; closeModal();
      findById('a1').fecha=_adel(1); out.reprog={ salio:stockSalio(findById('a1'), findById('a1').productos[0]), comp:_fila(K).comp, dep:_fila(K).deposito };
      return out;
    }, BASE);
    chk('R2 · antes del cierre, el atrasado sin marcar vale como salido (regla de siempre): 3 salidas en la ventana, depósito 7', r.antes.salio===true && r.antes.salidas===3 && r.antes.dep===7, J(r.antes));
    chk('R2 · el cierre confirma el de hoy y NO le escribe nada al atrasado destildado (dueño, 05/10): sin marca, sin guardado, sigue pendiente', r.res.hechos===1 && r.res.ok===1 && r.res.cola===0 && !r.a1.entregado && J(r.a1.eX)===J(['']) && r.a1Saves===0, J([r.res, r.a1, r.a1Saves]));
    chk('R2 · después del cierre el atrasado sigue valiendo como salido (fecha pasada sin ✅ = entregado): 3 salidas en la ventana, el Excel de 7 cuadra; en la pantalla de stock, depósito 7 − 1 (el de hoy) = 6 y nada comprometido',
        r.despues.salio===true && r.despues.salidas===3 && r.despues.stockSalio===true && r.despues.comp===0 && r.despues.dep===6 && r.c.fila===false && r.c.cuadran===2, J([r.despues, r.c]));
    chk('R2 · sigue en la lista de atrasados, destildado; reprogramado para mañana deja de ser salida y vuelve a comprometido (3), depósito 9', r.sigueEnLista===true && r.reprog.salio===false && r.reprog.comp===3 && r.reprog.dep===9, J([r.sigueEnLista, r.reprog]));
  });

  // ═══ R3 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R3 · Recepción parcial de una línea 🏭: 3 de 10 ──');
  await seccion('R3', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-020', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      var R=_R(todayStr(),'09:00:00',{[K]:13,[K2]:4});    // +3
      var out={};
      var txt=_subir(R);
      out.sug=Array.from(document.querySelectorAll('.exist-fab')).map(function(c){ return [c.getAttribute('data-id'), Number(c.getAttribute('data-u')), c.checked]; });
      out.dice=/anotar 3 llegadas, faltan 7/.test(txt);
      _subir(R, ['.exist-fab[data-id="fab"]']); var res=await confirmarImportExist();
      var x=findById('fab').productos[0];
      out.x={ prodU:x.prodU, prodR:x.prodR||'', prodC:(x.prodC||[]).length, chk:x.chk, enStock:prodUnidEnStock(x), pend:enProduccionPendiente(x), enConteo:prodUnidEnConteo(x) };
      out.lugar=prodLugarTxt(x);
      out.res={ ok:res.ok, cola:res.cola }; out.guardado=_n('fab');
      out.fila={ comp:_fila(K).comp, aFab:_fila(K).aFab, dep:_fila(K).deposito };
      /* El cuadrito del formulario lo dice. */
      var v=saldoVeredictoFab({ k:K, total:10, fab:x }, '', _adel(3)); out.cuadrito={ parcial:v.parcial, txt:saldoTitulo(v) };
      /* El MISMO corte otra vez: no ofrece nada, no suma, no sella. */
      _subir(R); out.sug2=document.querySelectorAll('.exist-fab').length; await confirmarImportExist();
      x=findById('fab').productos[0]; out.x2={ prodU:x.prodU, prodR:x.prodR||'', prodC:(x.prodC||[]).length };
      out.det=(STOCK.det||[]).length;
      /* Mañana llegan las otras 7: «sellar la llegada». */
      _otroDia();
      var R2=_R(_adel(1),'09:00:00',{[K]:20,[K2]:4});
      var txt2=_subir(R2); out.sug3=Array.from(document.querySelectorAll('.exist-fab')).map(function(c){ return [c.getAttribute('data-id'), Number(c.getAttribute('data-u'))]; }); out.dice3=/sellar la llegada/.test(txt2);
      _subir(R2, ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      x=findById('fab').productos[0]; out.x3={ prodU:x.prodU, prodR:x.prodR, prodRm:x.prodRm, chk:x.chk, pend:enProduccionPendiente(x) };
      out.fila3={ comp:_fila(K).comp, aFab:_fila(K).aFab, dep:_fila(K).deposito };
      return out;
    }, BASE);
    chk('R3 · +3 con una línea 🏭 de 10 pendiente: sugiere «anotar 3 llegadas, faltan 7», destildado', r.sug.length===1 && r.sug[0][1]===3 && r.sug[0][2]===false && r.dice, J([r.sug, r.dice]));
    chk('R3 · tildado: recibido 3, pendiente 7 — prodU 3, SIN sello de llegada, sigue 🏭 pendiente, el pedido se guardó una vez y las 3 están en el conteo',
        r.x.prodU===3 && r.x.prodR==='' && r.x.prodC===1 && r.x.enStock===3 && r.x.pend===true && r.x.enConteo===3 && r.guardado===1 && r.res.ok===2 && r.res.cola===0, J([r.x, r.guardado, r.res]));
    chk('R3 · la ficha dice «llegaron 3 de 10» y el cuadrito del formulario «llegaron 3 de 10, faltan 7»', /llegaron 3 de 10/.test(r.lugar) && r.cuadrito.parcial===3 && /llegaron 3 de 10, faltan 7/.test(r.cuadrito.txt), J([r.lugar, r.cuadrito]));
    chk('R3 · en la pantalla de stock las 3 llegadas quedan reservadas para ese pedido (comp 3) y 7 siguen «a fábrica»; depósito 13', r.fila.comp===3 && r.fila.aFab===7 && r.fila.dep===13, J(r.fila));
    chk('R3 · el mismo corte subido otra vez no ofrece nada ni suma: sigue 3 de 10, sin «ya llegó», sin detección', r.sug2===0 && r.x2.prodU===3 && r.x2.prodR==='' && r.x2.prodC===1 && r.det===0, J([r.sug2, r.x2, r.det]));
    chk('R3 · el Excel siguiente con +7 ofrece «sellar la llegada»; tildado: 10 de 10, sellada desde el Excel (prodRm excel), ✔ hay, reservadas 10',
        J(r.sug3)===J([['fab',7]]) && r.dice3 && r.x3.prodU===10 && r.x3.prodR==='2026-10-08' && r.x3.prodRm==='excel' && r.x3.chk==='ok' && r.x3.pend===false && r.fila3.comp===10 && r.fila3.aFab===0 && r.fila3.dep===20, J([r.sug3, r.dice3, r.x3, r.fila3]));
  });

  // ═══ R4 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R4 · Fallos de guardado: el stock no entra / el pedido no entra; la cola converge sin duplicar ──');
  await seccion('R4', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-020', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      var R=_R(todayStr(),'09:00:00',{[K]:13,[K2]:4});
      var out={ stockId:STOCK_ID };
      /* A: la fila del stock no llega, el pedido sí. */
      window._fallan[STOCK_ID]=true;
      _subir(R, ['.exist-fab[data-id="fab"]']); var resA=await confirmarImportExist(); await _wait(100);
      out.A={ res:{ ok:resA.ok, cola:resA.cola, rech:resA.rechazados.length }, toast:window._toasts.slice(-1)[0]||'', cola:getPending().map(function(q){ return q.id; }), pedidoOk:_n('fab'), stockOk:_n(STOCK_ID),
              exito:window._toasts.some(function(t){ return /^✅ Depósito actualizado/.test(t); }) };
      /* vuelve la red: la cola se manda sola */
      window._fallan={}; await flushPending(); await _wait(100);
      var ultStock=window._guardadas.filter(function(s){ return s.id===STOCK_ID; }).slice(-1)[0];
      var S=ultStock ? leerStock(ultStock) : null;
      out.A.despues={ cola:getPending().length, stockOk:_n(STOCK_ID), pedidoOk:_n('fab'), prodU:findById('fab').productos[0].prodU,
                      hist:!!(S && S.h && S.h[0] && S.h[0].d && S.h[0].d.length), cU:S && S.c.u[K] };
      /* B: el pedido no llega, el stock sí. */
      _base(); window._guardadas=[]; window._toasts=[];
      STATE.push(_P({id:'fab2', oc:'10-021', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      window._fallan['fab2']=true;
      _subir(R, ['.exist-fab[data-id="fab2"]']); var resB=await confirmarImportExist(); await _wait(100);
      out.B={ res:{ ok:resB.ok, cola:resB.cola, rech:resB.rechazados.length }, toast:window._toasts.slice(-1)[0]||'', cola:getPending().map(function(q){ return q.id; }), stockOk:_n(STOCK_ID), pedidoOk:_n('fab2'),
              exito:window._toasts.some(function(t){ return /^✅ Depósito actualizado/.test(t); }), memoria:findById('fab2').productos[0].prodU };
      window._fallan={}; await flushPending(); await _wait(100);
      var ped=window._guardadas.filter(function(s){ return s.id==='fab2'; });
      var xs=ped.length ? (typeof ped[0].productos==='string' ? JSON.parse(ped[0].productos) : ped[0].productos) : [];
      out.B.despues={ cola:getPending().length, pedidoOk:ped.length, prodU:xs[0] && xs[0].prodU, prodC:xs[0] && (xs[0].prodC||[]).length, memoria:findById('fab2').productos[0].prodU, stockOk:_n(STOCK_ID) };
      return out;
    }, BASE);
    chk('R4-A · el stock no entra: se espera a las DOS filas y se dice la verdad — 1 de 2 guardados, «pendiente de sincronizar», nunca ✅; el stock queda en la cola',
        r.A.res.ok===1 && r.A.res.cola===1 && r.A.res.rech===0 && /^⏳/.test(r.A.toast) && /Pendiente de sincronizar: 1 de 2/.test(r.A.toast) && !r.A.exito && J(r.A.cola)===J([r.stockId]) && r.A.pedidoOk===1 && r.A.stockOk===0,
        J([r.A.res, r.A.cola, r.A.pedidoOk, r.A.stockOk, r.A.toast.slice(0,160)]));
    chk('R4-A · al volver la red la cola converge: el stock entra UNA vez con el corte y sus diferencias, el pedido no se vuelve a mandar, la cola queda vacía',
        r.A.despues.cola===0 && r.A.despues.stockOk===1 && r.A.despues.pedidoOk===1 && r.A.despues.prodU===3 && r.A.despues.hist===true && r.A.despues.cU===13, J(r.A.despues));
    chk('R4-B · el pedido no entra: 1 de 2 guardados, «pendiente de sincronizar», nunca ✅; el pedido queda en la cola con sus 3 llegadas en memoria',
        r.B.res.ok===1 && r.B.res.cola===1 && /^⏳/.test(r.B.toast) && /Pendiente de sincronizar: 1 de 2/.test(r.B.toast) && !r.B.exito && J(r.B.cola)===J(['fab2']) && r.B.stockOk===1 && r.B.pedidoOk===0 && r.B.memoria===3,
        J([r.B.res, r.B.cola, r.B.stockOk, r.B.pedidoOk, r.B.memoria, r.B.toast.slice(0,160)]));
    chk('R4-B · al volver la red el pedido entra UNA vez, con prodU 3 y el corte anotado una sola vez (no se duplica la llegada); la cola queda vacía',
        r.B.despues.cola===0 && r.B.despues.pedidoOk===1 && r.B.despues.prodU===3 && r.B.despues.prodC===1 && r.B.despues.memoria===3 && r.B.despues.stockOk===1, J(r.B.despues));
  });

  // ═══ R5 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R5 · Reserva y entrega de 2 unidades 🏭 ──');
  await seccion('R5', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-022', fecha:_adel(1), productos:FAB(2)})); saveMirror();
      var out={};
      out.antes={ comp:_fila(K).comp, aFab:_fila(K).aFab, dep:_fila(K).deposito, compro:stockComprometido(K) };
      var R=_R(todayStr(),'09:00:00',{[K]:12,[K2]:4});     // +2: llegaron
      _subir(R, ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      var x=findById('fab').productos[0];
      out.sellada={ prodU:x.prodU, prodR:x.prodR, chk:x.chk, comp:_fila(K).comp, aFab:_fila(K).aFab, dep:_fila(K).deposito, compro:stockComprometido(K) };
      /* Mañana se entrega: salida común; el depósito baja a 10 y el Excel de pasado mañana con 10 cuadra. */
      findById('fab').entregado=true;
      out.entregada={ dep:_fila(K).deposito, comp:_fila(K).comp };
      var C=stockConciliar(_R(_adel(2),'09:00:00',{[K]:10,[K2]:4}), 'log', false);
      out.c={ cuadran:C.resumen.cuadran, con:C.resumen.con };
      /* Una 🏭 PENDIENTE (nunca sellada) que se entrega: no estaba en el conteo, y la baja se explica como «salió lo hecho a pedido». */
      _base(); STATE.push(_P({id:'fab2', oc:'10-023', fecha:_adel(1), entregado:true, productos:FAB(2)}));
      STOCK.c.f=todayStr(); STOCK.c.t=_ts(todayStr(),'09:05:00');
      var C2=stockConciliar(_R(_adel(2),'09:00:00',{[K]:8,[K2]:4}), 'log', false); var f2=C2.filas.filter(function(z){ return z.k===K; })[0]||{};
      out.pend={ dif:f2.dif, causas:(f2.causas||[]).map(function(c){ return [c.t,c.u]; }), sinExplicar:f2.sinExplicar };
      /* Y una sellada A MANO después del corte (llegó hoy, ✔ hay): todavía no está en el conteo; el Excel siguiente la explica como llegada anotada. */
      _base(); STATE.push(_P({id:'fab3', oc:'10-024', fecha:_adel(2), productos:FAB(2,{ chk:'ok', prodR:todayStr() })}));
      out.mano={ comp:_fila(K).comp, aFab:_fila(K).aFab, enConteo:prodUnidEnConteo(findById('fab3').productos[0]), dep:_fila(K).deposito };
      var C3=stockConciliar(_R(_adel(1),'09:00:00',{[K]:12,[K2]:4}), 'log', false); var f3=C3.filas.filter(function(z){ return z.k===K; })[0]||{};
      out.mano.c={ dif:f3.dif, causas:(f3.causas||[]).map(function(c){ return [c.t,c.u]; }), sinExplicar:f3.sinExplicar, fab:(f3.fab||[]).length, sug:(f3.sug||[]).length };
      _otroDia(); var txt=_subir(_R(_adel(1),'09:00:00',{[K]:12,[K2]:4})); out.mano.dice=/anotado a mano/.test(txt); await confirmarImportExist();
      out.mano.despues={ det:(STOCK.det||[]).length, comp:_fila(K).comp, aFab:_fila(K).aFab, enConteo:prodUnidEnConteo(findById('fab3').productos[0]) };
      return out;
    }, BASE);
    chk('R5 · antes de llegar: las 2 son «a fábrica», no reservan nada del depósito (10)', r.antes.comp===0 && r.antes.aFab===2 && r.antes.dep===10 && r.antes.compro===0, J(r.antes));
    chk('R5 · selladas desde el Excel (12): las 2 quedan RESERVADAS para ese pedido (comp 2, a fábrica 0), depósito 12', r.sellada.prodU===2 && r.sellada.prodR==='2026-10-07' && r.sellada.chk==='ok' && r.sellada.comp===2 && r.sellada.aFab===0 && r.sellada.dep===12 && r.sellada.compro===2, J(r.sellada));
    chk('R5 · entregadas: salida común — depósito 10, nada comprometido, y el Excel de pasado mañana con 10 cuadra (sin «salida sin explicar»)', r.entregada.dep===10 && r.entregada.comp===0 && r.c.cuadran===2 && r.c.con===0, J([r.entregada, r.c]));
    chk('R5 · una 🏭 pendiente (nunca sellada) que se entregó no estaba en el conteo: la baja (−2) se explica como «salió lo hecho a pedido», sin salida sin explicar', r.pend.dif===-2 && J(r.pend.causas)===J([['fabSalio',2]]) && r.pend.sinExplicar===0, J(r.pend));
    chk('R5 · sellada A MANO después del corte: todavía no está en el conteo (no reserva, depósito 10), y el Excel siguiente (+2) la explica como llegada anotada, sin detección ni sugerencia',
        r.mano.comp===0 && r.mano.aFab===2 && r.mano.enConteo===0 && r.mano.dep===10 && r.mano.c.dif===2 && J(r.mano.c.causas)===J([['fabLlego',2]]) && r.mano.c.sinExplicar===0 && r.mano.c.fab===0 && r.mano.c.sug===0 && r.mano.dice, J(r.mano));
    chk('R5 · …y confirmado ese Excel, las 2 pasan a estar en el conteo: reservadas (comp 2), sin detección', r.mano.despues.det===0 && r.mano.despues.comp===2 && r.mano.despues.aFab===0 && r.mano.despues.enConteo===2, J(r.mano.despues));
  });

  // ═══ R6 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R6 · Orden de cortes: 16:00 y después 09:00; repetido; corregido; sin hora de un lado ──');
  await seccion('R6', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      /* El corte vigente es HOY a las 16:00 (K 5, ya con las entregas). */
      STOCK.c={ f:todayStr(), hora:'16:00:00', inc:true, u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'16:10:00') }; STOCK.c.u[K]=5; STOCK.c.u[K2]=4;
      var out={};
      var R9=_R(todayStr(),'09:00:00',{[K]:7,[K2]:4});
      var C9=stockConciliar(R9,'log',false); out.viejo={ corteViejo:C9.corteViejo, ambiguo:!!C9.ambiguo };
      var txt=_subir(R9); out.viejoTxt=/más viejo que el que ya está cargado/.test(txt) && !/falta la hora/.test(txt) && !document.getElementById('exist-corte-viejo-ok') && !!(document.getElementById('exist-usar')||{}).disabled;
      await confirmarImportExist(); out.noReemplaza={ hora:STOCK.c.hora, u:STOCK.c.u[K], toast:window._toasts.slice(-1)[0]||'' };
      /* El mismo corte de las 16:00 otra vez (repetido): mismo corte, cuadra, el historial no crece. */
      var R16=_R(todayStr(),'16:00:00',{[K]:5,[K2]:4});
      var C16=stockConciliar(R16,'log',true); out.repetido={ mismo:!!C16.mismoCorte, cuadran:C16.resumen.cuadran, con:C16.resumen.con };
      _subir(R16); await confirmarImportExist(); out.h1=STOCK.h.filter(function(x){ return x.alm===LOG; }).length;
      /* Corregido (16:00, K 6): mismo corte, +1 contra lo que ese corte decía; el historial sigue en 1 y la huella cambia. */
      var R16b=_R(todayStr(),'16:00:00',{[K]:6,[K2]:4});
      var C16b=stockConciliar(R16b,'log',true); var fk=C16b.filas.filter(function(z){ return z.k===K; })[0]||{};
      out.corregido={ mismo:!!C16b.mismoCorte, dif:fk.dif };
      _subir(R16b); await confirmarImportExist(); out.h2={ n:STOCK.h.filter(function(x){ return x.alm===LOG; }).length, huCambio:STOCK.h[0].hu!==existHuella(R16), u:STOCK.c.u[K] };
      /* Mismo día, hora de un solo lado: no se sabe cuál es más nuevo → como un corte viejo, con el motivo. */
      var Rsin=_R(todayStr(),'',{[K]:6,[K2]:4});
      var Cs=stockConciliar(Rsin,'log',false); out.ambiguo={ corteViejo:Cs.corteViejo, ambiguo:!!Cs.ambiguo, txt:/falta la hora/.test(_subir(Rsin)) };
      return out;
    }, BASE);
    chk('R6 · un Excel de las 09:00 subido después del de las 16:00 del mismo día es MÁS VIEJO: avisa, apaga el botón y no reemplaza (06/10: ya no hay «usarlo igual»)', r.viejo.corteViejo===true && r.viejo.ambiguo===false && r.viejoTxt && r.noReemplaza.hora==='16:00:00' && r.noReemplaza.u===5 && /más viejo/.test(r.noReemplaza.toast), J([r.viejo, r.noReemplaza]));
    chk('R6 · el mismo corte repetido: «mismo corte», cuadra, y el historial no crece', r.repetido.mismo===true && r.repetido.cuadran===2 && r.repetido.con===0 && r.h1===1, J([r.repetido, r.h1]));
    chk('R6 · el mismo corte corregido (6 en vez de 5): se compara contra lo que ese corte decía (+1), reemplaza su renglón del historial y el conteo', r.corregido.mismo===true && r.corregido.dif===1 && r.h2.n===1 && r.h2.huCambio===true && r.h2.u===6, J([r.corregido, r.h2]));
    chk('R6 · mismo día y hora de un solo lado: no entra y dice por qué («falta la hora»)', r.ambiguo.corteViejo===true && r.ambiguo.ambiguo===true && r.ambiguo.txt===true, J(r.ambiguo));
  });

  // ═══ R7 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R7 · Movimiento manual antes / en / después del límite horario ──');
  await seccion('R7', async (page) => {
    const r = await page.evaluate((base) => {
      eval(base); _base();   // corte ayer 09:00 (K 10), sin «ya incluye»
      var ayer=_atras(1), hoy=todayStr();
      STOCK.e=[
        { id:'e1', f:ayer, k:K, u:1,  fab:'MORENO', ts:_ts(ayer,'08:00:00') },   // antes del corte de ayer: ya estaba adentro → no
        { id:'e2', f:ayer, k:K, u:2,  fab:'MORENO', ts:_ts(ayer,'10:00:00') },   // después → sí
        { id:'e3', f:hoy,  k:K, u:4,  fab:'MORENO', ts:_ts(hoy,'08:30:00') },    // antes del corte de hoy → sí
        { id:'e4', f:hoy,  k:K, u:8,  fab:'MORENO', ts:_ts(hoy,'09:00:00') },    // justo a la hora → sí (hasta esa hora inclusive)
        { id:'e5', f:hoy,  k:K, u:16, fab:'MORENO', ts:_ts(hoy,'09:30:00') }     // después del corte de hoy → no
      ];
      STOCK.sm=[ { id:'m1', k:K, u:1, f:hoy, ts:_ts(hoy,'08:00:00'), m:'x', alm:'', pre:0 }, { id:'m2', k:K, u:2, f:hoy, ts:_ts(hoy,'09:30:00'), m:'x', alm:'', pre:0 } ];
      var R=_R(hoy,'09:00:00',{[K]:23,[K2]:4});   // esperado: 10 + (2+4+8) − 1 = 23
      var out={};
      var v=stockVentanaCorte(STOCK.c, R, false);
      out.v={ prevHora:v.prevHora, hora:v.hora, incluyeHasta:v.incluyeHasta };
      out.mov=['e1','e2','e3','e4','e5'].map(function(id){ var e=STOCK.e.filter(function(x){ return x.id===id; })[0]; return stockMovEnVentana(e.f, e.ts, v); });
      out.entradas=stockEntradasVentana(K, v); out.sman=stockSalidasManualesVentana(K, v, '');
      var C=stockConciliar(R,'log',false); var fk=C.filas.filter(function(z){ return z.k===K; })[0]||null;
      out.cuadra={ fila:!!fk, cuadran:C.resumen.cuadran, esperado:fk?fk.esperado:null };
      /* Sin hora en el Excel nuevo: el día del corte entra solo con la casilla (nada se adivina por la hora). */
      var v2=stockVentanaCorte(STOCK.c, _R(hoy,'',{}), false), v3=stockVentanaCorte(STOCK.c, _R(hoy,'',{}), true);
      out.sinHora=[stockEntradasVentana(K, v2), stockEntradasVentana(K, v3)];
      /* Si el corte ANTERIOR ya incluía las entregas de su día, su día no entra entero (lo de ayer, ni antes ni después). */
      STOCK.c.inc=true; var v4=stockVentanaCorte(STOCK.c, R, false); out.prevInc={ desde:v4.desde===hoy, entradas:stockEntradasVentana(K, v4) };
      return out;
    }, BASE);
    chk('R7 · la ventana lleva las dos horas (09:00 → 09:00) y no incluye el día del corte sin la casilla', r.v.prevHora==='09:00:00' && r.v.hora==='09:00:00' && r.v.incluyeHasta===false, J(r.v));
    chk('R7 · movimientos: antes del corte anterior NO · después SÍ · antes del nuevo SÍ · a la hora exacta SÍ · después del nuevo NO', J(r.mov)===J([false,true,true,true,false]), J(r.mov));
    chk('R7 · entradas 2 + 4 + 8 = 14, salida manual de las 08:00 = 1 (la de las 09:30 queda para el corte siguiente): esperado 23, cuadra', r.entradas===14 && r.sman===1 && r.cuadra.fila===false && r.cuadra.cuadran===2, J([r.entradas, r.sman, r.cuadra]));
    chk('R7 · sin hora en el Excel: el día del corte entra entero solo con la casilla (2 sin ella, 30 con ella)', J(r.sinHora)===J([2,30]), J(r.sinHora));
    chk('R7 · si el corte anterior ya incluía las entregas de su día, la ventana arranca al día siguiente: solo las de hoy (12)', r.prevInc.desde===true && r.prevInc.entradas===12, J(r.prevInc));
  });

  // ═══ R8 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R8 · Cierre sin conexión: pendiente de sincronizar; al reconectar revalida borrado, reprogramado y entregado ──');
  await seccion('R8', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      ['h1','h2','h3','h4'].forEach(function(id,i){ STATE.push(_P({id:id, oc:'10-03'+i, fecha:todayStr(), nroDia:i+1, productos:H(1)})); });
      saveMirror(); renderAdmin();
      window._sinRed=true; window._fallan={ h1:1, h2:1, h3:1, h4:1 };
      abrirCierreEntregas(); document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas(); await _wait(100);
      var out={ res:{ pendiente:res.pendiente, hechos:res.hechos, leyo:res.leyo }, pend:cierreEntPendiente(), marcados:STATE.filter(function(p){ return p.entregado; }).length, cola:getPending().length, txt:_modalTxt() };
      closeModal(); renderAdmin(); out.cartel=(document.getElementById('adm-cierre-ent')||{}).innerText||'';
      /* Mientras no había señal, otro equipo: borró h1, reprogramó h2 al jueves y marcó h3. */
      var pl=JSON.parse(JSON.stringify(STATE)).filter(function(p){ return p.id!=='h1'; });
      pl.forEach(function(p){ if(p.id==='h2'){ p.fecha=_adel(1); p.rev=9; } if(p.id==='h3'){ p.entregado=true; p.rev=9; } });
      window._planilla=pl; window._sinRed=false; window._fallan={};
      var leyo=await refrescarEstadoYa(); await _wait(400);
      out.sync={ leyo:leyo, pend:cierreEntPendiente(), h1:_ver('h1'), h2:_ver('h2'), h3:_ver('h3'), h4:_ver('h4'), saves:window._guardadas.map(function(s){ return s.id; }).sort(),
                 ult:CIERRE_ENT_ULT && { hechos:CIERRE_ENT_ULT.hechos, saltados:CIERRE_ENT_ULT.saltados }, toast:window._toasts.filter(function(t){ return /sincronizado/.test(t); }).slice(-1)[0]||'' };
      closeModal(); renderAdmin(); out.sync.cartel=(document.getElementById('adm-cierre-ent')||{}).innerText||'';
      return out;
    }, BASE);
    chk('R8 · sin conexión no se confirma nada: pendiente de sincronizar (4), 0 marcados, 0 en la cola, la ventana y el cartel lo dicen',
        r.res.pendiente===true && r.res.hechos===0 && r.res.leyo===false && r.pend && r.pend.ids.length===4 && r.marcados===0 && r.cola===0 && /No había señal/.test(r.txt) && /pendiente de sincronizar/i.test(r.cartel), J([r.res, r.pend && r.pend.ids, r.marcados, r.cola, r.cartel.slice(0,80)]));
    chk('R8 · al reconectar se revalida: el borrado no vuelve, el reprogramado no se marca, el que marcó otro equipo queda como él lo dejó, y solo h4 se confirma desde acá (1 guardado)',
        r.sync.leyo===true && r.sync.pend===null && r.sync.h1===null && !r.sync.h2.entregado && r.sync.h3.entregado && !r.sync.h3.c && r.sync.h4.entregado && r.sync.h4.c && r.sync.h4.c.q==='Marisol' && J(r.sync.saves)===J(['h4']),
        J([r.sync.h1, r.sync.h2, r.sync.h3, r.sync.h4, r.sync.saves]));
    chk('R8 · el resumen dice 1 confirmada y 3 salteadas, y el cartel «pendiente» desaparece', r.sync.ult && r.sync.ult.hechos===1 && r.sync.ult.saltados.length===3 && /1 confirmada/.test(r.sync.toast) && /3 salteadas/.test(r.sync.toast) && !/pendiente de sincronizar/i.test(r.sync.cartel), J([r.sync.ult, r.sync.toast, r.sync.cartel.slice(0,80)]));
  });

  // ═══ R9 ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R9 · Datos antiguos: una página vieja y la cola, sin duplicar ni revivir anulaciones ──');
  await seccion('R9', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }, { id:'fp2', k:K2, u:6, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      var R=_R(todayStr(),'09:00:00',{[K]:20,[K2]:4});     // +10 de K
      _subir(R, ['.exist-sug[data-q="fp1"]']); await confirmarImportExist();
      var rid=existRecId(existDetId(existCorteId(R), K), 'fp1');
      /* Una detección de otro corte, anulada; y la recepción de fp1 anulada («no había llegado»). */
      STOCK.det.push({ id:'d:viejo|'+K2, k:K2, t:3, u:0, f:_atras(1), hora:'09:00:00', hu:'zz', alm:'', ts:Date.now()-86400000, an:{ t:Date.now(), m:'x' } });
      stockAnularRecepcion('fp1', rid, 'no había llegado');
      var actual=JSON.parse(JSON.stringify(STOCK));
      /* La copia de una PÁGINA VIEJA: leyó la planilla antes de las anulaciones (sin v/det/sm) y al subir su Excel «dio por llegado» fp2 con un id al azar. */
      var vieja=JSON.parse(JSON.stringify(actual)); delete vieja.v; delete vieja.v2t; delete vieja.det; delete vieja.sm; delete vieja.pv;
      vieja.p.forEach(function(q){ (q.recs||[]).forEach(function(r){ delete r.an; }); });
      vieja.p[1].recs=[{ id:'r'+Math.random().toString(36).slice(2), u:6, f:todayStr(), ts:Date.now()+1000, se:1 }];
      var out={ rid:rid };
      var cp=function(x){ return JSON.parse(JSON.stringify(x)); };
      var mira=function(S){ var q1=S.p.filter(function(q){ return q.id==='fp1'; })[0], q2=S.p.filter(function(q){ return q.id==='fp2'; })[0];
        return { recs1:(q1.recs||[]).length, an1:!!(q1.recs[0]&&q1.recs[0].an), abierto1:q1.r===''&&q1.u===10, recs2:(q2.recs||[]).length, nDet:(S.det||[]).length,
                 detViejo:(S.det||[]).filter(function(d){ return d.id.indexOf('d:viejo')===0; }).map(function(d){ return !!d.an; }), v:S.v, v2t:S.v2t===actual.v2t }; };
      /* (a) la fila que dejó en la cola la página vieja (sin base, modo «viejo») contra la planilla de ahora */
      out.a=mira(stockFusionar(null, cp(vieja), cp(actual), 'viejo'));
      /* (b) la página vieja guardó ENCIMA (su junta no conoce `an`): acá no se tocó nada y la planilla trae la copia vieja */
      out.b=mira(stockFusionar(cp(actual), cp(actual), cp(vieja)));
      /* (c) al revés: la copia vieja es la «mía» (una pestaña sin F5 con cola) y la planilla es la actual */
      out.c=mira(stockFusionar(cp(actual), cp(vieja), cp(actual)));
      /* (d) dos copias con la MISMA recepción derivada (una la leyó antes de la anulación): una sola, y anulada */
      var dup=cp(actual); dup.p[0].recs[0]={ id:rid, u:10, f:todayStr(), ts:Date.now(), se:1 };
      var Jd=stockFusionar(null, dup, cp(actual), 'viejo'); out.d={ recs:Jd.p[0].recs.length, an:!!Jd.p[0].recs[0].an, ru:Jd.p[0].ru, u:Jd.p[0].u };
      /* La vista previa del Excel siguiente avisa lo que la página vieja dio por llegado y deja anularlo ahí mismo. */
      STOCK=stockFusionar(cp(actual), cp(actual), cp(vieja)); STOCK_CARGADO=true; stockOlvidarIndice();
      _otroDia(); var R2=_R(_adel(1),'09:00:00',{[K]:20,[K2]:4});
      var txt=_subir(R2); out.aviso={ dice:/página vieja/.test(txt), n:document.querySelectorAll('.exist-rec-vieja').length, enCamino:_fila(K2).enCamino };
      document.querySelector('.exist-rec-vieja').click();
      var q2=STOCK.p.filter(function(q){ return q.id==='fp2'; })[0];
      out.anulada={ an:!!(q2.recs[0]&&q2.recs[0].an), u:q2.u, r:q2.r, aviso:document.querySelectorAll('.exist-rec-vieja').length, enCamino:_fila(K2).enCamino, guardado:_n(STOCK_ID)>=1 };
      return out;
    }, BASE);
    chk('R9-a · la fila de la cola de la página vieja (sin base): la recepción anulada de fp1 sigue anulada (el pedido sigue abierto), la detección anulada sigue anulada, nada se duplica, v y v2t se conservan',
        r.a.recs1===1 && r.a.an1===true && r.a.abierto1 && r.a.recs2===1 && r.a.nDet===2 && J(r.a.detViejo)===J([true]) && r.a.v===2 && r.a.v2t, J(r.a));
    chk('R9-b · la página vieja guardó encima y acá no se tocó nada: la planilla trae la recepción sin `an`, pero la junta la deja anulada (lápida monótona) y det/sm salen de la base',
        r.b.recs1===1 && r.b.an1===true && r.b.abierto1 && r.b.nDet===2 && J(r.b.detViejo)===J([true]) && r.b.v===2, J(r.b));
    chk('R9-c · la copia vieja como «mía» con base: igual', r.c.recs1===1 && r.c.an1===true && r.c.abierto1 && r.c.nDet===2 && J(r.c.detViejo)===J([true]), J(r.c));
    chk('R9-d · la misma recepción derivada en las dos copias es UNA, y anulada', r.d.recs===1 && r.d.an===true && r.d.ru===0 && r.d.u===10, J(r.d));
    chk('R9 · la vista previa del Excel siguiente avisa lo que la página vieja dio por llegado por la fecha (fp2: en camino 0) y «↩️ anular» lo reabre (en camino 6), guarda y saca el aviso',
        r.aviso.dice && r.aviso.n===1 && r.aviso.enCamino===0 && r.anulada.an===true && r.anulada.u===6 && r.anulada.r==='' && r.anulada.aviso===0 && r.anulada.enCamino===6 && r.anulada.guardado, J([r.aviso, r.anulada]));
  });

  // ═══ R10 ══════════════════════════════════════════════════════════════════════════════
  console.log('\n── R10 · Regresión del cierre de entregas (etapa 1) ──');
  await seccion('R10', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'h1', oc:'10-040', fecha:todayStr(), nroDia:1, productos:H(1)}));
      STATE.push(_P({id:'h2', oc:'10-041', fecha:todayStr(), nroDia:2, turno:'PM', productos:H(2)}));
      STATE.push(_P({id:'m1', oc:'10-042', fecha:_adel(1), productos:H(1)}));
      STATE.push(_P({id:'t1', oc:'10-043', fecha:'', direccion:DIR_TIENDA, zona:ZONA_TIENDA, productos:H(1)}));
      saveMirror(); renderAdmin();
      var out={};
      out.hoy=cierreEntHoy().map(function(p){ return p.id; });
      var antes=JSON.stringify(STATE);
      abrirCierreEntregas(); out.abrirNoEscribe = JSON.stringify(STATE)===antes && window._guardadas.length===0;
      var c=document.querySelector('.cie-ent-chk[data-id="h2"]'); c.checked=false; c.dispatchEvent(new Event('change'));
      document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas();
      out.res={ hechos:res.hechos, saltados:res.saltados, ok:res.ok, cola:res.cola, pendiente:res.pendiente };
      out.h1=_ver('h1'); out.h2=_ver('h2'); out.m1=_ver('m1');
      out.saves=window._guardadas.map(function(s){ return s.id; }).sort();
      out.txt=_modalTxt();
      closeModal(); showPedidoModal('h1'); out.ficha=/confirmado por Marisol/.test(_modalTxt());
      closeModal(); out.quedan=cierreEntHoy().map(function(p){ return p.id; });
      return out;
    }, BASE);
    chk('R10 · la lista de hoy (sin el de mañana ni la venta de tienda); abrir no escribe', J(r.hoy)===J(['h1','h2']) && r.abrirNoEscribe, J([r.hoy, r.abrirNoEscribe]));
    chk('R10 · confirmar: 1 confirmada con registro (día, quién, cuándo), el destildado queda como estaba (sin marca ni guardado), 1 guardado, 0 en cola, «guardado en la planilla: 1 de 1»',
        r.res.hechos===1 && r.res.saltados===0 && r.res.ok===1 && r.res.cola===0 && r.res.pendiente===false && r.h1.entregado && r.h1.c && r.h1.c.q==='Marisol' && r.h1.c.f==='2026-10-07' && r.h1.c.t>0 &&
        !r.h2.entregado && J(r.h2.eX)===J(['']) && !r.m1.entregado && J(r.saves)===J(['h1']) && /guardado en la planilla: 1 de 1/.test(r.txt), J([r.res, r.h1, r.h2, r.saves]));
    chk('R10 · la ficha dice «confirmado por Marisol», y al repetir queda solo el destildado', r.ficha && J(r.quedan)===J(['h2']), J([r.ficha, r.quedan]));
  });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
