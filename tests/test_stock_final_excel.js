/* 🔎 VERIFICACIÓN FINAL DE STOCK — «Excel, flujos a mano y compatibilidad» (19/10, §4ls, verificación final de `18fb452`).
   Los hallazgos confirmados del grupo, cada uno con su comprobación (y un control que ya andaba).

   FE1  EX-1   Lo anotado a mano DESPUÉS de un corte con los dos turnos (el Excel de las 16:10): la salida de las 17:00 baja el depósito
               (no queda «de antes del corte»), la llegada sube, y el Excel del día siguiente cuadra (0 diferencias, 0 detecciones),
               también con un «✅ Llegó» de un pedido a fábrica.
   FE2  EX-2   «📋 Conté a mano» guardado sin tocar, al día siguiente del Excel y con la mañana marcada: una línea de hoy sin ✅ de un
               producto con 0 en PTF no deja el depósito en −2 (ni la nota «se entregaron más de lo contado»); lo libre del que sí
               tenía no se mueve.
   FE3  CO-1   El conteo a mano deja su renglón en el historial (`rol:'mano'`): si la página publicada le borra `mano` y el turno al
               guardar, la nueva los repone (no se resta otra vez la mañana, sigue el cartel «a mano»). La poda no lo toma por el
               último Excel de PTF, y el historial lo dice «📋 Conteo a mano».
   (FE4  CO-2 no se cambió: con la planilla real, la casilla de antes marcada a las 13:26 tenía razón —la tarde ya no estaba en ese
               Excel—; leerla «solo la mañana» agregaba «+1 entrada sin explicar» al día siguiente. Ver el comentario de `stockIncTurnos`.)
   FE5  CO-3   Una salida a mano de Banzer que su Excel todavía no incluye no se poda a los 3 días.
   FE6  CO-6   La celda: una recogida cerrada no queda como muestra (salvo que su almacén la nombre) y un «Ya pedí» sin asignar se va
               PLAN_YA_VENCIDO_DIAS días después de su llegada esperada (el Plan lo muestra hasta entonces).
   FE7  EX-6   Las casillas de turno: en «Conté a mano» el texto habla del conteo (no de un Excel); en un almacén al que se va a buscar
               (Moreno) no se dibujan ni se guarda nada; si se cambia «¿Qué almacén es?», la caja se rearma.
   FE8  EX-7   Cierre de entregas, CO-4: lo hecho a pedido que no llegó dice «no toca el stock: se hace a pedido y todavía no llegó».
   FE9  CO-5   Mis pedidos, el viaje: un pedido que solo dice «POR CONFIRMAR» no muestra «📦 Mercadería» lista.
   FE10 EX-8   PTF y Banzer en el mismo archivo: la diferencia que uno tiene al revés que el otro se junta (traspaso, o salió de Banzer
               sin la marca ✔ Banzer): no se ofrece como salida sin pedido ni se anota como detección; lo del mismo signo, igual que antes.

   Reloj CLAVADO (cada parte dice a qué hora). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_final_excel.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_5d0dc82.html node tests/test_stock_final_excel.js   (19/10: 41 bien aquí; 28 rojas contra 5d0dc82) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
/* El mismo arranque que `test_stock_rev2_textos.js` (datos sintéticos «CLIENTE n», red cortada). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_textos.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.stack || e) }; } }, [fn.toString(), arg]);
const ERRS=[];
async function abrir(browser, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => ERRS.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(() => { try{ localStorage.setItem('me_cierre_quien','Prueba'); }catch(e){} });
  page._ctx=ctx;
  return page;
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let page, r;

  // ═══ FE1. EX-1 — viernes 16/10 17:00, Excel de PTF y Banzer de las 16:10 con los dos turnos ═══
  console.log('\n── FE1. Lo anotado a mano después de un corte de los dos turnos (EX-1) ──');
  page = await abrir(browser, '2026-10-16T17:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), K2=_k('CH1212','SOMIER TITANIO ICE','140x190'), KE=_k('CH1208','SOMIER TITANIO ICE','160x190'), KR=_k('CH1220','TITANIO ICE','140x190');
    var st=_stock(function(st){
      st.c.hora='16:10:00'; st.c.inc=true; st.c.incT='ampm'; st.g[_BZ].hora='16:10:00'; st.g[_BZ].inc=true; st.g[_BZ].incT='ampm';
      st.c.u[K]=5; st.c.u[KE]=4; st.c.u[KR]=1; st.c.u[K2]=0; st.g[_BZ].u[K2]=10; st.g[_BZ].u[K]=0;
      st.p=[{ id:'q1', k:KR, u:3, fab:'MORENO', f:_d(-3), r:'', tipo:'fabrica' }];
    });
    await _cargar([], st);
    var opc=function(sel, k){ var s=document.getElementById(sel); if(![].some.call(s.options, function(o){ return o.value===k; })) s.insertAdjacentHTML('beforeend','<option value="'+k+'">'+k+'</option>'); s.value=k; };
    var out={ antes:{ K:_fila(K).deposito, KE:_fila(KE).deposito, KR:_fila(KR).deposito, BZ:(STOCK.g[_BZ].u[K2]-stockSalidasManualesDe(K2,_BZ)) } };
    abrirStockSalida(); opc('stk-sal-k', K); document.getElementById('stk-sal-u').value='2'; document.getElementById('stk-sal-dep').value=''; guardarStockSalida();
    out.salPTF=STOCK.sm[STOCK.sm.length-1].pre; out.toastPTF=window._toasts[window._toasts.length-1]||'';
    abrirStockSalida(); opc('stk-sal-k', K2); document.getElementById('stk-sal-u').value='2'; document.getElementById('stk-sal-dep').value=_BZ; guardarStockSalida();
    out.salBZ=STOCK.sm[STOCK.sm.length-1].pre;
    abrirStockEntrada(); opc('stk-ent-k', KE); document.getElementById('stk-ent-u').value='3'; guardarStockEntrada();
    abrirStockEntrada(); var inp=document.getElementById('stk-rec-q1'); if(inp) inp.value='3'; recibirStockPedido('q1'); closeModal();
    stockOlvidarIndice();
    out.despues={ K:_fila(K).deposito, KE:_fila(KE).deposito, KR:_fila(KR).deposito, BZ:(STOCK.g[_BZ].u[K2]-stockSalidasManualesDe(K2,_BZ)) };
    window._K1={ K:K, K2:K2, KE:KE, KR:KR };
    return out;
  });
  chk('control: la llegada a mano de las 17:00 sube PTF (4 → 7) y el «✅ Llegó» también (1 → 4) (VE9, ya andaba)', r && r.despues && r.despues.KE===7 && r.despues.KR===4, r);
  chk('FE1 la salida sin pedido de las 17:00 NO es «de antes del corte»: baja PTF (5 → 3), sin el aviso «documentación»', r && r.salPTF===0 && r.despues.K===3 && !/antes del corte/.test(r.toastPTF), r);
  chk('FE1 …y la de Banzer también baja Banzer (10 → 8)', r && r.salBZ===0 && r.despues.BZ===8, r);
  await page.clock.setFixedTime(new Date('2026-10-17T10:20:00-04:00'));
  r = await corre(page, async () => {
    var X=window._K1, hoy=todayStr(), it=function(o){ return Object.keys(o).map(function(k){ return { k:k, cant:o[k], cat:true, cod:'', desc:k }; }); };
    var u1={}; u1[X.K]=3; u1[X.KE]=7; u1[X.KR]=4; u1[X.K2]=0;
    var u2={}; u2[X.K2]=8; u2[X.K]=0; u2[X.KE]=0; u2[X.KR]=0;
    var R={ almacen:_LOG, fecha:hoy, hora:'10:10:00', solo0:true, items:it(u1) }, Rb={ almacen:_BZ, fecha:hoy, hora:'10:10:00', solo0:true, items:it(u2) };
    var C=stockConciliar(R,'log',{ am:true, pm:false }), Cb=stockConciliar(Rb,'sale',{ am:true, pm:false });
    var dif=function(C){ return C.filas.filter(function(f){ return f.dif!==0; }).map(function(f){ return f.k+' '+f.dif+(f.det?' (det)':''); }); };
    return { ptf:dif(C), bz:dif(Cb), desdePTF:C.ventana && C.ventana.desde };
  });
  chk('FE1 el Excel del día siguiente (que ya no tiene las salidas y sí las llegadas) cuadra en PTF: 0 diferencias, 0 detecciones', r && r.ptf && r.ptf.length===0, r);
  chk('FE1 …y en Banzer: 0 diferencias', r && r.bz && r.bz.length===0, r);
  await page._ctx.close();

  // ═══ FE2 + FE3. EX-2 y CO-1 — sábado 17/10 10:40, Excel del 16/10 con la mañana ═══
  console.log('\n── FE2. «Conté a mano» sin tocar con líneas de hoy sin stock (EX-2) ──');
  page = await abrir(browser, '2026-10-17T10:40:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), K0=_k('CH1222','TITANIO ICE','200x200');
    var st=_stock(function(st){ st.c.incT='am'; st.g[_BZ].incT='am'; st.c.u[K]=10; st.c.u[K0]=0;
      st.h=[{ f:_d(-1), hora:'10:05:32', alm:_LOG, rol:'log', n:2, u:10, ts:_ts(_d(-1),'10:10:00'), inc:false, incT:'am', d:[[K,1,[]]] }]; }, { f:_d(-1) });
    var P=[ _ped({ id:'a0', oc:'10-301', fecha:todayStr(), turno:'AM', ts:_ts(_d(-1),'15:00:00'), productos:[_lin('CH1222','TITANIO ICE','200x200',2)] }),
            _ped({ id:'a1', oc:'10-302', fecha:todayStr(), turno:'AM', ts:_ts(_d(-1),'15:00:00'), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }) ];
    await _cargar(P, st);
    var f0=_fila(K0), f1=_fila(K);
    var out={ antes:{ dep0:f0.deposito, comp0:f0.comp, dep:f1.deposito, comp:f1.comp, libre:f1.deposito-f1.comp } };
    abrirStockConteo();
    out.mananaMarcada=!!(document.getElementById('conteo-inc')||{}).checked;
    out.textoConteo=_txt(document.getElementById('conteo-inc-caja'));
    guardarStockConteo(); stockOlvidarIndice();
    f0=_fila(K0); f1=_fila(K);
    out.despues={ dep0:f0.deposito, comp0:f0.comp, dep:f1.deposito, comp:f1.comp, libre:f1.deposito-f1.comp };
    abrirStockConteo(); out.negativos=document.querySelectorAll('.stk-conteo-neg').length; closeModal();
    window._K2={ K:K, K0:K0 };
    out.h0=STOCK.h[0] ? { rol:STOCK.h[0].rol, incT:STOCK.h[0].incT||'', mano:STOCK.h[0].mano, alm:STOCK.h[0].alm, hora:STOCK.h[0].hora===STOCK.c.hora } : null;
    return out;
  });
  chk('control: a las 10:40 sin dato del camión el conteo propone la mañana marcada', r && r.mananaMarcada===true, r);
  chk('FE2 guardado sin tocar: el producto con 0 en PTF y 2 de hoy sin ✅ queda en 0 (no −2)', r && r.despues && r.despues.dep0===0, r);
  chk('FE2 …y al volver a abrir el conteo no aparece «⚠️ el panel calcula −N: se entregaron más de lo contado»', r && r.negativos===0, r);
  chk('control: el que SÍ tenía (10, 2 de hoy sin ✅) queda 8 y lo libre no se mueve (8 → 8)', r && r.despues.dep===8 && r.despues.libre===r.antes.libre && r.antes.libre===8, r);
  chk('FE7 (EX-6) el texto de las casillas del conteo habla del conteo, no de un Excel («contás a las 10:40»)', r && /contás a las 10:40/.test(r.textoConteo) && !/Excel es de las/.test(r.textoConteo), r && r.textoConteo);

  console.log('\n── FE3. El conteo a mano y la página publicada (CO-1) ──');
  chk('FE3 el conteo deja su renglón en el historial: `rol:"mano"`, con el turno (am) y la hora del conteo', r && r.h0 && r.h0.rol==='mano' && r.h0.incT==='am' && r.h0.mano===1 && r.h0.hora===true, r && r.h0);
  r = await corre(page, async () => {
    var X=window._K2, out={};
    /* Lo que hace la página publicada (27f0134) al guardar el stock: rearma `c` solo con lo que conoce (sin `mano` ni `incT`) y deja el
       historial tal cual (su `leerStock`: f, u, hora, inc, alm, solo0, cod, t). */
    var o=JSON.parse(filaStock().observaciones), c=o.c;
    o.c={ f:c.f, u:c.u }; if(c.hora) o.c.hora=c.hora; if(c.inc) o.c.inc=true; if(c.alm) o.c.alm=c.alm; if(c.solo0) o.c.solo0=true; if(c.cod) o.c.cod=c.cod; if(c.t) o.c.t=c.t;
    STOCK=leerStock({ observaciones:JSON.stringify(o) }); STOCK_CARGADO=true; stockOlvidarIndice();
    var f1=_fila(X.K);
    out.leido={ mano:STOCK.c.mano||0, incT:STOCK.c.incT||'', aMano:stockConteoAMano(), dep:f1.deposito, comp:f1.comp, libre:f1.deposito-f1.comp };
    /* La poda: el último Excel de PTF (de ayer, con sus diferencias) no se pierde porque el conteo es más nuevo. */
    var S=leerStock({ observaciones:filaStock().observaciones }); stockPodar(S, todayStr());
    var ex=(S.h||[]).filter(function(x){ return x.rol==='log'; })[0];
    out.poda={ excel:!!ex, conD:!!(ex && ex.d && ex.d.length), mano:(S.h||[]).some(function(x){ return x.rol==='mano'; }) };
    var html=''; var _om=openModal; openModal=function(h){ html=h; }; try{ abrirStockHistorial(); } finally { openModal=_om; }
    var dv=document.createElement('div'); dv.innerHTML=html; out.hist=dv.textContent.replace(/\s+/g,' ');
    return out;
  });
  chk('FE3 leída después de que la página publicada lo guardó: vuelve `mano` y el turno (am), y sigue «a mano»', r && r.leido && r.leido.mano===1 && r.leido.incT==='am' && r.leido.aMano===true, r && r.leido);
  chk('FE3 …y la mañana no se vuelve a reservar ni a restar: lo libre sigue 8', r && r.leido && r.leido.libre===8, r && r.leido);
  chk('FE3 la poda no lo toma por el último Excel de PTF: el Excel de ayer sigue con sus diferencias, y el conteo también queda', r && r.poda && r.poda.excel && r.poda.conD && r.poda.mano, r && r.poda);
  chk('FE3 el historial lo dice «📋 Conteo a mano»', r && /📋 Conteo a mano/.test(r.hist||''), r && (r.hist||'').slice(0,300));
  await page._ctx.close();

  // ═══ FE5 + FE6. CO-3 y CO-6 — lunes 19/10 10:00 ═══
  console.log('\n── FE5. La salida a mano de Banzer no se poda antes de su Excel (CO-3) ──');
  page = await abrir(browser, '2026-10-19T10:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), K2=_k('CH1212','SOMIER TITANIO ICE','140x190');
    var st=_stock(function(st){ st.c.u[K]=6; st.g[_BZ].u[K2]=6;
      st.sm=[ { id:'mB', k:K2, u:2, f:'2026-10-15', ts:_ts('2026-10-15','11:00:00'), m:'Multicenter', alm:_BZ, pre:0 },
              { id:'mP', k:K, u:2, f:'2026-10-15', ts:_ts('2026-10-15','11:00:00'), m:'Multicenter', alm:'', pre:0 },
              { id:'mV', k:K2, u:1, f:'2026-10-13', ts:_ts('2026-10-13','11:00:00'), m:'x', alm:_BZ, pre:0 } ]; }, { f:'2026-10-14' });
    await _cargar([], st);
    return { ids:(STOCK.sm||[]).map(function(x){ return x.id; }).sort(), bz:stockSalidasManualesDe(K2,_BZ), ptf:stockSalidasManuales(K) };
  });
  chk('FE5 la salida de Banzer del 15/10 (su Excel es del 14/10) sigue restando el 19/10: Banzer −2', r && r.bz===2 && (r.ids||[]).indexOf('mB')>=0, r);
  chk('control: la de PTF en la misma situación también, y la de antes del Excel de Banzer (13/10) se poda', r && r.ptf===2 && (r.ids||[]).indexOf('mV')<0, r);

  console.log('\n── FE6. Lo que llenaba la celda (CO-6) ──');
  r = await corre(page, async () => {
    var KA='TITANIO ICE|105X190', KB='TITANIO ICE|140X190', KC='TITANIO ICE|160X190', KD='TITANIO ICE|200X200';
    var S={ c:{ f:todayStr(), u:{} }, e:[], a:{}, al:{}, h:[], det:[], sm:[], g:{} };
    S.g[_IM]={ f:todayStr(), u:{}, rs:{ x1:{ q:'rc2', u:2, k:KB } } };
    S.p=[ { id:'rc1', k:KA, u:2, f:_d(-11), r:_d(-10), tipo:'recogida', de:_IM },          // la más nueva de su producto, cerrada, nadie la nombra
          { id:'rc2', k:KB, u:2, f:_d(-11), r:_d(-10), tipo:'recogida', de:_IM },          // la nombra la foto de Moreno (`rs`)
          { id:'fq',  k:KC, u:4, f:_d(-20), r:_d(-12), tipo:'fabrica', fab:'MORENO' },     // un pedido a fábrica cerrado: mide el plazo
          { id:'y1',  k:KD, u:5, f:_d(-12), esp:_d(-8), r:'', ya:1, fab:'MORENO', t:_ts(_d(-12),'10:00:00') },   // venció hace 8 días
          { id:'y2',  k:KD, u:5, f:_d(-10), esp:_d(-7), r:'', ya:1, fab:'MORENO', t:_ts(_d(-10),'10:00:00') } ]; // venció hace 7 días
    stockPodar(S, todayStr());
    var ids=S.p.map(function(q){ return q.id; }).sort();
    STOCK.p=S.p; var venc=planYaVencidos({ k:KD }).map(function(q){ return q.id; });
    return { ids:ids, venc:venc };
  });
  chk('FE6 la recogida cerrada que nadie nombra ya no queda como muestra', r && r.ids && r.ids.indexOf('rc1')<0, r);
  chk('control: la recogida que Moreno todavía nombra y el pedido a fábrica cerrado se quedan', r && r.ids && r.ids.indexOf('rc2')>=0 && r.ids.indexOf('fq')>=0, r);
  /* 🏭 (30/10, propuesta 75, a conciencia) El dueño eligió «lo que no llega no desaparece»: un «Ya pedí» vencido sin llegar queda hasta que lo
     cierra un Excel, «✓ Llegó» o «✕ No se pidió» (la celda tiene su tope: 60 días y 40 abiertos, `fdPodarAbiertos`, test_fabrica_debe FD12). */
  chk('FE6 el «Ya pedí» que venció hace más de 7 días ya NO se va (propuesta 75): el Plan lo sigue mostrando para reclamar', r && r.ids && r.ids.indexOf('y1')>=0 && r.venc && r.venc.indexOf('y1')>=0, r);
  chk('control: el que venció hace 7 días se queda y el Plan lo sigue mostrando para reclamar', r && r.ids && r.ids.indexOf('y2')>=0 && r.venc && r.venc.indexOf('y2')>=0, r);
  await page._ctx.close();

  // ═══ FE7. EX-6 — viernes 16/10 12:30 ═══
  console.log('\n── FE7. Las casillas de los turnos donde no aplican (EX-6) ──');
  page = await abrir(browser, '2026-10-16T12:30:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), hoy=todayStr(), out={};
    var st=_stock(function(st){ st.c.u[K]=6; st.g[_BZ].u[K]=2; st.g[_IM].u[K]=3; st.c.incT='am'; st.g[_BZ].incT='am'; }, { f:_d(-1) });
    var P=[ _ped({ id:'v1', oc:'10-501', fecha:hoy, turno:'AM', vehiculo:'Carry', chofer:'Luis Pierre', ts:_ts(_d(-1),'15:00:00'), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ];
    await _cargar(P, st);
    stockCamionSalidas=function(){ return ['09:42']; };   // el GPS dijo que el Carry salió 09:42
    var pc=stockIncPropuesta('12:30:00', '', true), pe=stockIncPropuesta('12:30:00', '');
    out.conteo=pc.am.txt; out.excel=pe.am.txt;
    abrirStockConteo(); out.modal=_txt(document.getElementById('conteo-inc-caja')); closeModal();
    var it=function(n){ return [{ k:K, cant:n, cat:true, cod:'CH1201', desc:'TITANIO ICE' }]; };
    // IM (al que se va a buscar)
    EXIST_COLA=[]; EXIST_IMP={ almacen:_IM, fecha:hoy, hora:'10:05:00', solo0:true, items:it(3), total:3, repetidos:0, malos:0, cods:{}, esLog:false, conocido:true };
    renderImportExist();
    out.im={ casilla:!!document.getElementById('exist-inc'), nota:!!document.getElementById('exist-inc-no'), rol:(document.getElementById('exist-rol')||{}).value };
    var cb=document.getElementById('exist-inc'); if(cb) cb.checked=true;
    confirmarImportExist();
    out.im.guardado={ inc:STOCK.g[_IM].inc||false, incT:STOCK.g[_IM].incT||'', hT:(STOCK.h[0]||{}).incT||'' };
    // Banzer (sale camión): las casillas sí; «ir a buscar» las saca, y volver las trae
    EXIST_IMP={ almacen:_BZ, fecha:hoy, hora:'10:05:00', solo0:true, items:it(2), total:2, repetidos:0, malos:0, cods:{}, esLog:false, conocido:true };
    renderImportExist();
    out.bz={ casilla:!!document.getElementById('exist-inc') };
    var s=document.getElementById('exist-rol'); s.value='otro'; existRepintarControl(); out.bz.otro=!!document.getElementById('exist-inc');
    s.value='sale'; existRepintarControl(); out.bz.vuelve=!!document.getElementById('exist-inc');
    closeModal(); EXIST_IMP=null;
    return out;
  });
  chk('FE7 con el camión que ya salió, el conteo dice «ya había salido cuando contás (12:30)», no «después del Excel»', r && /ya había salido cuando contás \(12:30\)/.test(r.conteo||'') && !/Excel/.test(r.conteo||''), r && r.conteo);
  chk('control: en el Excel sigue «salió hasta 15 min después del Excel (12:30)»', r && /después del Excel \(12:30\)/.test(r.excel||''), r && r.excel);
  chk('FE7 …y la ventana del conteo lo muestra así', r && /cuando contás/.test(r.modal||'') && !/del Excel/.test(r.modal||''), r && r.modal);
  chk('FE7 el Excel de Moreno (ir a buscar) no dibuja las casillas de los turnos: dice que no aplica', r && r.im && r.im.casilla===false && r.im.nota===true && r.im.rol==='otro', r && r.im);
  chk('FE7 …y no guarda turno en su corte ni en su renglón del historial', r && r.im && r.im.guardado && !r.im.guardado.inc && !r.im.guardado.incT && !r.im.guardado.hT, r && r.im);
  chk('FE7 Banzer sí tiene las casillas; pasado a «ir a buscar» desaparecen y al volver aparecen', r && r.bz && r.bz.casilla===true && r.bz.otro===false && r.bz.vuelve===true, r && r.bz);
  await page._ctx.close();

  // ═══ FE8 + FE9. EX-7/CO-4 y CO-5 — viernes 16/10 16:40 ═══
  console.log('\n── FE8. Cierre de entregas: lo hecho a pedido que no llegó (EX-7, CO-4) ──');
  page = await abrir(browser, '2026-10-16T16:40:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), KB=_k('CH1222','TITANIO ICE','200x200'), hoy=todayStr(), ayer=_d(-1);
    var st=_stock(function(st){ st.c.u[K]=6; st.c.u[KB]=0; st.g[_BZ].u[K]=4; st.c.incT='am'; st.g[_BZ].incT='am'; });
    var fab=function(n){ return _lin('CH1222','TITANIO ICE','200x200',n,{ enProd:true, chk:'prod', prodF:_d(-3) }); };
    var P=[ _ped({ id:'f1', oc:'10-173', fecha:ayer, turno:'PM', ts:_ts(_d(-2)), productos:[fab(1)] }),
            _ped({ id:'f2', oc:'10-174', fecha:ayer, turno:'PM', ts:_ts(_d(-2)), productos:[fab(1), _lin('CH1201','TITANIO ICE','160x190',2,{ chk:'ok', chkDe:_BZ })] }),
            _ped({ id:'f3', oc:'10-175', fecha:ayer, turno:'PM', ts:_ts(_d(-2)), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ];
    await _cargar(P, st);
    var t=function(id, f){ return cierreEntEfectoTxt(findById(id), f); };
    return { soloFab:[t('f1', ayer), t('f1', hoy)], mezcla:t('f2', hoy), normal:t('f3', hoy) };
  });
  chk('FE8 un atrasado que solo tiene lo hecho a pedido sin llegar: «no toca el stock: se hace a pedido y todavía no llegó» en los dos botones',
    r && r.soloFab && r.soloFab.every(function(x){ return x==='no toca el stock: se hace a pedido y todavía no llegó'; }), r);
  chk('FE8 mezclado: dice lo que baja de Banzer y aclara que lo hecho a pedido no toca el stock', r && /^baja Banzer 2/.test(r.mezcla||'') && /lo hecho a pedido que todavía no llegó no toca el stock/.test(r.mezcla||''), r && r.mezcla);
  chk('control: un atrasado común sigue diciendo lo que baja de PTF', r && /^baja PTF 1/.test(r.normal||'') && !/hecho a pedido/.test(r.normal||''), r && r.normal);

  console.log('\n── FE9. Mis pedidos: el viaje de un pedido «POR CONFIRMAR» (CO-5) ──');
  r = await corre(page, async () => {
    var man=_d(1);
    var P=[ _ped({ id:'c1', fecha:man, productos:[{ desc:'POR CONFIRMAR', medida:'', cant:1 }] }),
            _ped({ id:'c2', fecha:man, productos:[{ desc:'POR FAVOR IR HACER MEDICION', medida:'', cant:1 }] }),
            _ped({ id:'c3', fecha:man, productos:[{ desc:'PROTECTOR IMPERMEABLE', medida:'140x190', cant:1 }] }),
            _ped({ id:'c4', fecha:_d(-1), entregado:true, productos:[{ desc:'POR CONFIRMAR', medida:'', cant:1 }] }) ];
    var o={}; P.forEach(function(p){ var V=pedidoViajeDatos(p); o[p.id]={ lbl:V.pasos[1].lbl, hecho:V.pasos[1].hecho, ico:V.pasos[1].ico }; });
    return o;
  });
  chk('FE9 «POR CONFIRMAR» sin entregar: «🔎 Producto por confirmar», no «📦 Mercadería» lista', r && r.c1 && r.c1.lbl==='Producto por confirmar' && r.c1.hecho===false && r.c1.ico==='🔎', r && r.c1);
  chk('FE9 …lo mismo «POR FAVOR IR HACER MEDICION»', r && r.c2 && r.c2.lbl==='Producto por confirmar' && r.c2.hecho===false, r && r.c2);
  chk('control: un pedido solo de tienda (protector) sigue «📦 Mercadería», y uno ya entregado también', r && r.c3 && r.c3.lbl==='Mercadería' && r.c3.hecho===true && r.c4 && r.c4.hecho===true, r);
  await page._ctx.close();

  // ═══ FE10. EX-8 — viernes 16/10 12:20, el archivo de los tres almacenes (PTF y Banzer) del mediodía (ya salió la mañana) ═══
  console.log('\n── FE10. PTF y Banzer en el mismo archivo: lo que uno tiene al revés que el otro (EX-8) ──');
  page = await abrir(browser, '2026-10-16T12:20:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), J=_k('CH1220','TITANIO ICE','140x190'), M=_k('CH1222','TITANIO ICE','200x200'), hoy=todayStr();
    var st=_stock(function(st){
      st.c.hora='10:05:00'; st.c.incT='am'; st.g[_BZ].hora='10:05:00'; st.g[_BZ].incT='am';
      st.c.u[K]=10; st.c.u[J]=5; st.c.u[M]=4; st.g[_BZ].u[K]=2; st.g[_BZ].u[J]=0; st.g[_BZ].u[M]=1;
      st.p=[{ id:'qK', k:K, u:5, fab:'MORENO', f:_d(-3), r:'', tipo:'fabrica' }, { id:'qM', k:M, u:5, fab:'MORENO', f:_d(-3), r:'', tipo:'fabrica' }];
    }, { f:_d(-1) });
    // la mañana de hoy: 2 de K sin la marca ✔ Banzer (el panel la resta de PTF), y salió de Banzer
    var P=[ _ped({ id:'k1', oc:'10-203', fecha:hoy, turno:'AM', ts:_ts(_d(-1),'15:00:00'), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }) ];
    await _cargar(P, st);
    var it=function(o){ return Object.keys(o).map(function(k){ return { k:k, cant:o[k], cat:true, cod:'', desc:k }; }); };
    var u1={}; u1[K]=10; u1[J]=2; u1[M]=6;      // PTF: K +2 (8 esperado), J −3, M +2
    var u2={}; u2[K]=0; u2[J]=3; u2[M]=2;       // Banzer: K −2, J +3, M +1
    var par={};
    var R1={ almacen:_LOG, fecha:hoy, hora:'12:05:00', solo0:true, items:it(u1), total:18, repetidos:0, malos:0, cods:{}, esLog:true, conocido:true, lote:{ i:1, n:2, alms:[_LOG,_BZ], par:par } };
    var R2={ almacen:_BZ, fecha:hoy, hora:'12:05:00', solo0:true, items:it(u2), total:5, repetidos:0, malos:0, cods:{}, esLog:false, conocido:true, lote:{ i:2, n:2, alms:[_LOG,_BZ], par:par } };
    var fila=function(C, k){ var f=C.filas.filter(function(x){ return x.k===k; })[0]||{}; return { dif:f.dif, sin:f.sinExplicar, par:(f.causas||[]).filter(function(c){ return c.t==='par'; }).map(function(c){ return c.u+': '+c.txt; }), sug:(f.sug||[]).length }; };
    var out={};
    // sin el otro almacén (un Excel solo): como antes
    var C0=stockConciliar(Object.assign({}, R1, { lote:null }), 'log', { am:true, pm:false });
    out.solo={ K:fila(C0,K), J:fila(C0,J) };
    EXIST_COLA=[R2]; EXIST_IMP=R1; renderImportExist();
    var C=EXIST_ULT_C; out.ptf={ K:fila(C,K), J:fila(C,J), M:fila(C,M) };
    out.salJ=!!document.querySelector('#modal-box input.exist-sal[data-k="'+J+'"]');
    out.textoPTF=_txt(document.getElementById('exist-control'));
    await confirmarImportExist();
    out.det=(STOCK.det||[]).filter(function(x){ return !x.an; }).map(function(x){ return x.k+':'+x.t; });
    var Cb=EXIST_ULT_C; out.bz={ alm:(EXIST_IMP||{}).almacen===_BZ, K:fila(Cb,K), J:fila(Cb,J), M:fila(Cb,M) };
    out.salBzK=!!document.querySelector('#modal-box input.exist-sal[data-k="'+K+'"]');
    closeModal(); EXIST_IMP=null; EXIST_COLA=[];
    window._K10={ K:K, J:J, M:M };
    return out;
  });
  const K10 = await page.evaluate(() => window._K10);
  chk('control: con un Excel solo (sin el otro almacén) nada cambia: K +2 se sugiere contra el pedido a fábrica, J −3 sin explicar', r && r.solo && r.solo.K.sug===1 && r.solo.K.par.length===0 && r.solo.J.sin===3, r && r.solo);
  chk('FE10 PTF +2 con Banzer −2: «🔁 ¿salió de Banzer sin la marca ✔ Banzer?» (con la OC 10-203), nada sin explicar ni sugerido',
    r && r.ptf && r.ptf.K.dif===2 && r.ptf.K.sin===0 && r.ptf.K.sug===0 && r.ptf.K.par.length===1 && /sin la marca ✔ Banzer/.test(r.ptf.K.par[0]) && /10-203/.test(r.ptf.K.par[0]), r && r.ptf);
  chk('FE10 PTF −3 con Banzer +3: «🔁 ¿traspaso de PTF a Banzer?», sin «Anotar como salida sin pedido»', r && r.ptf && r.ptf.J.sin===0 && /traspaso de PTF a Banzer/.test((r.ptf.J.par||[])[0]||'') && r.salJ===false, r && r.ptf && r.ptf.J);
  chk('FE10 al usar PTF: no se anota la detección del par (K) y sí la del mismo signo (M +2)', r && r.det && r.det.every(function(x){ return x.indexOf(K10.K+':')!==0; }) && r.det.indexOf(K10.M+':2')>=0, r && r.det);
  chk('control: lo del mismo signo (M: PTF +2, Banzer +1) no se junta y se sugiere contra el pedido a fábrica', r && r.ptf && r.ptf.M.par.length===0 && r.ptf.M.sug===1, r && r.ptf && r.ptf.M);
  chk('FE10 en Banzer (después de PTF): K −2 «¿salió de acá sin la marca?» y J +3 «¿traspaso de PTF a acá?», nada sin explicar ni para anotar',
    r && r.bz && r.bz.alm && r.bz.K.sin===0 && /salió de acá sin la marca/.test((r.bz.K.par||[])[0]||'') && r.bz.J.sin===0 && /traspaso de PTF a acá/.test((r.bz.J.par||[])[0]||'') && r.salBzK===false, r && r.bz);
  chk('control: M en Banzer (+1, el mismo signo que PTF) sigue sin explicar', r && r.bz && r.bz.M.sin===1 && r.bz.M.par.length===0, r && r.bz && r.bz.M);
  await page._ctx.close();

  await browser.close();
  chk('la página no tiró ningún error de JavaScript', ERRS.length===0, ERRS.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
