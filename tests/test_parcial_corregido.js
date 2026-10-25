/* 🏭 LO HECHO A PEDIDO QUE LLEGA EN DOS VECES Y EL EXCEL CORREGIDO (25/10, auditoría de Codex/Astra S1 y S2).

   LO QUE CUIDA:
   S1  Una línea 🏭 de 10. El Excel de hoy trae 3 (se anotan «llegaron 3 de 10») y a la tarde logística marca ✔ a mano porque
       llegaron las otras 7. Antes el panel daba las 10 por ADENTRO del Excel de la mañana (que tenía 3): reservaba 10 de un
       depósito con 3 y proponía FABRICAR 7 de nuevo; y el Excel de mañana (10) quedaba con «+7 sin explicar».
       Ahora: 3 en el conteo (las del Excel) + 7 que llegaron después (lo trae la fábrica para ese cliente) → fabricar 0; el Excel
       siguiente explica las 7 con la marca a mano, sin detección; y ahí las 10 quedan reservadas.
   S2  El MISMO corte (día y hora) subido de nuevo con otro número: lo que la versión anterior le anotó a la línea 🏭 se devuelve.
       a) 3 → 0: la línea vuelve a «pendiente, 0 de 10»; no se reserva nada ni se propone fabricar 3.
       b) 3 → 2: la vista previa ofrece 2 (falta 10, no 7) y queda «2 de 10» con UN solo corte anotado.
       c) 10 (sellada desde el Excel) → 7: se saca el sello, vuelve la marca de antes y queda «7 de 10».
   Y el formulario (heredarMarcas) no pierde lo nuevo (`prodCu`, `prodRt`).

   Datos sintéticos, red cortada, servidor simulado. Reloj clavado en el miércoles 07/10/2026 a las 15:00 de Bolivia.
   Se corre:  node tests/test_parcial_corregido.js
   Dientes:   PEDIDOS=/ruta/al/viejo.html node tests/test_parcial_corregido.js */
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
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); localStorage.setItem('me_cierre_quien','Marisol'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._guardadas=[];
  apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
  window._adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  window._ts=function(f,h){ return new Date(f+'T'+(h||'12:00:00')+'-04:00').getTime(); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'10-001',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:true,saldo:0,
    ts:_ts(_atras(5),'10:00:00'),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
  /* Una línea 🏭 (hecha a pedido en Moreno, pedida hace 3 días), todavía sin llegar. */
  window.FAB=function(n){ return [{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n,chk:'no',enProd:true,prodEn:'Moreno',prodF:_atras(3)}]; };
  window.LOG='PRODUCTOS TERMINADOS FAB.', window.IM='IM - PRODUCTOTERMINADO';
  window._R=function(fecha, hora, cants){
    var items=[]; var tot=0;
    Object.keys(cants).forEach(function(k){ var it=k===K?{cod:'CH1201',desc:'TITANIO ICE 2.5PLZ 160X190CM',medida:'160x190'}:{cod:'CH1129',desc:'COLCHON TITANIO LATEX 140X190',medida:'140x190'}; it.cant=cants[k]; it.cat=true; it.k=k; it.unidad='UND'; items.push(it); tot+=cants[k]; });
    return { fecha:fecha, sinFecha:false, almacen:LOG, items:items, total:tot, repetidos:0, malos:0, colCant:'G', solo0:true, cods:{CH1201:K, CH1129:K2}, esLog:true, conocido:true, hora:hora||'' };
  };
  /* Corte de ayer a las 9:00: 0 de K acá (todo lo de K de este pedido es lo que llega de fábrica), 4 de K2; nada en Moreno. */
  window._base=function(){
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STOCK.c={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(_atras(1),'09:05:00') }; STOCK.c.u[K]=0; STOCK.c.u[K2]=4;
    STOCK.g={}; STOCK.g[IM]={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, t:_ts(_atras(1),'09:05:00') }; STOCK.g[IM].u[K2]=1;
    STOCK.al={}; STOCK.al[LOG]='log'; STOCK.al[IM]='otro';
    STOCK.p=[]; STATE=[]; stockOlvidarIndice(); saveMirror();
  };
  window._subir=function(R, tildar){
    EXIST_IMP=R; EXIST_CTRL_TODAS=false; renderImportExist();
    var txt=((document.getElementById('modal-box')||{}).textContent||'').replace(/\\s+/g,' ');
    (tildar||[]).forEach(function(sel){ var el=document.querySelector(sel); if(el){ el.checked=true; } });
    return txt;
  };
  window._sug=function(){ return Array.from(document.querySelectorAll('.exist-fab')).map(function(c){ return [c.getAttribute('data-id'), Number(c.getAttribute('data-u'))]; }); };
  window._fila=function(k){ var o=stockData().lista.filter(function(o){ return o.k===k; })[0]||null; return o && { dep:o.deposito, comp:o.comp, aFab:o.aFab, fabricar:o.fabricar, pedir:o.pedir }; };
  window._x=function(id){ var x=findById(id).productos[0]; return { prodU:x.prodU==null?null:x.prodU, prodC:(x.prodC||[]).length, prodR:x.prodR||'', prodRm:x.prodRm||'', chk:x.chk||'', pend:enProduccionPendiente(x), enConteo:prodUnidEnConteo(x), enStock:prodUnidEnStock(x) }; };
  window._det=function(k){ var n=0; (STOCK.det||[]).forEach(function(d){ if(d && !d.an && d.k===k) n+=Math.round(Number(d.t)||0); }); return n; };
  window._otroDia=function(){ existNoEsDeHoy=function(){ return null; }; };
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
  const seccion = async (nombre, fn) => {
    const page = await nueva();
    try { await fn(page); }
    catch(e){ chk(nombre+' · la página se cayó antes de terminar: '+String(e && e.message || e).split('\n')[0], false); }
    await page.close();
  };

  // ═══ S1 ════════════════════════════════════════════════════════════════════════════════
  console.log('\n── S1 · 3 llegan en el Excel de la mañana y las otras 7 se marcan ✔ a mano a la tarde ──');
  await seccion('S1', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-020', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      var out={};
      _subir(_R(todayStr(),'09:00:00',{[K]:3,[K2]:4}), ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      out.parcial={ x:_x('fab'), fila:_fila(K) };
      /* 15:00: llegaron las otras 7 y logística marca ✔ (acá). */
      setProdChk('fab', 0, 'ok', '');
      out.mano={ x:_x('fab'), fila:_fila(K), prodRt:findById('fab').productos[0].prodRt||0 };
      /* Mañana, el Excel trae las 10. */
      _otroDia();
      var txt=_subir(_R(_adel(1),'09:00:00',{[K]:10,[K2]:4}));
      out.prev={ sug:_sug(), llego:/7: llegó lo hecho a pedido de OC 10-020 \(✔ anotado a mano el 07\/10\)/.test(txt) };
      await confirmarImportExist();
      out.despues={ x:_x('fab'), fila:_fila(K), det:_det(K) };
      return out;
    }, BASE);
    chk('S1 · el Excel de la mañana anota 3 de 10 (como siempre): 3 en el conteo, reservadas, 7 a fábrica, nada que fabricar',
        r.parcial.x.prodU===3 && r.parcial.x.enConteo===3 && r.parcial.fila.comp===3 && r.parcial.fila.aFab===7 && r.parcial.fila.fabricar===0, J(r.parcial));
    chk('S1 · ✔ a mano a la tarde: la línea queda sellada (llegó todo) y se anota la HORA de la marca',
        r.mano.x.prodR==='2026-10-07' && r.mano.x.pend===false && r.mano.prodRt===Date.parse('2026-10-07T15:00:00-04:00'), J([r.mano.x, r.mano.prodRt]));
    chk('S1 · pero en el conteo de la mañana siguen siendo 3 (las 7 llegaron después): reserva 3, 7 a fábrica, FABRICAR 0 (antes 7)',
        r.mano.x.enConteo===3 && r.mano.fila.comp===3 && r.mano.fila.aFab===7 && r.mano.fila.fabricar===0, J(r.mano.fila));
    chk('S1 · el Excel de mañana (10) explica las 7 con la marca a mano («llegó lo hecho a pedido de OC 10-020, ✔ anotado a mano») y no ofrece anotarlas otra vez',
        r.prev.sug.length===0 && r.prev.llego, J(r.prev));
    chk('S1 · …y no deja «+7 sin explicar»: ninguna detección; las 10 en el conteo y reservadas, nada a fábrica, fabricar 0',
        r.despues.det===0 && r.despues.x.enConteo===10 && r.despues.fila.comp===10 && r.despues.fila.aFab===0 && r.despues.fila.fabricar===0, J(r.despues));
  });

  // ═══ S2 a ══════════════════════════════════════════════════════════════════════════════
  console.log('\n── S2 · El mismo corte corregido ──');
  await seccion('S2a', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-020', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      var out={};
      _subir(_R(todayStr(),'09:00:00',{[K]:3,[K2]:4}), ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      out.antes={ x:_x('fab'), fila:_fila(K) };
      var n0=window._guardadas.filter(function(s){ return s.id==='fab'; }).length;
      var txt=_subir(_R(todayStr(),'09:00:00',{[K]:0,[K2]:4})); out.sug=_sug(); out.aviso=/↩️ Este archivo corrige uno anterior del mismo corte\. Esa versión había anotado 3 unidades como llegadas de lo hecho a pedido \(OC 10-020: 3/.test(txt);
      var t0=window._toastsTxt=[]; var _tt=toast; toast=function(m,k,ms){ t0.push(String(m)); return _tt(m,k,ms); };
      await confirmarImportExist(); out.toast=t0.some(function(m){ return /se devolvieron 3 unidades/.test(m); });
      out.despues={ x:_x('fab'), fila:_fila(K), det:_det(K), guardo:window._guardadas.filter(function(s){ return s.id==='fab'; }).length-n0,
        cu:findById('fab').productos[0].prodCu||null };
      return out;
    }, BASE);
    chk('S2a · antes: 3 de 10 anotadas por el corte de las 09:00', r.antes.x.prodU===3 && r.antes.x.prodC===1 && r.antes.fila.comp===3, J(r.antes));
    chk('S2a · el mismo corte corregido a 0: la línea vuelve a 0 de 10, sin cortes anotados, pendiente; el pedido se guarda',
        !r.despues.x.prodU && r.despues.x.prodC===0 && r.despues.x.pend===true && r.despues.x.enConteo===0 && !r.despues.cu && r.despues.guardo>=1, J(r.despues));
    chk('S2a · la vista previa avisa que devuelve las 3 de la versión anterior (OC 10-020) y el aviso final lo repite', r.aviso && r.toast, J([r.aviso, r.toast]));
    chk('S2a · no reserva nada de un depósito vacío ni propone fabricar 3 (antes sí): comp 0, 10 a fábrica, fabricar 0, sin detección',
        r.despues.fila.comp===0 && r.despues.fila.aFab===10 && r.despues.fila.fabricar===0 && r.despues.det===0 && r.sug.length===0, J([r.despues.fila, r.sug]));
  });

  // ═══ S2 b ══════════════════════════════════════════════════════════════════════════════
  await seccion('S2b', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-020', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      var out={};
      _subir(_R(todayStr(),'09:00:00',{[K]:3,[K2]:4}), ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      var txt=_subir(_R(todayStr(),'09:00:00',{[K]:2,[K2]:4})); out.sug=_sug(); out.falta=/anotar 2 llegadas, faltan 8/.test(txt);
      _subir(_R(todayStr(),'09:00:00',{[K]:2,[K2]:4}), ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      out.x=_x('fab'); out.fila=_fila(K); out.det=_det(K);
      return out;
    }, BASE);
    chk('S2b · 3 → 2: la vista previa ofrece 2, contando lo que se devuelve («faltan 8», no «faltan 5»)', J(r.sug)===J([['fab',2]]) && r.falta, J([r.sug, r.falta]));
    chk('S2b · tildado: 2 de 10 con UN solo corte anotado (el corregido), reservadas 2, 8 a fábrica, sin detección',
        r.x.prodU===2 && r.x.prodC===1 && r.x.enConteo===2 && r.fila.comp===2 && r.fila.aFab===8 && r.det===0, J([r.x, r.fila, r.det]));
  });

  // ═══ S2 c ══════════════════════════════════════════════════════════════════════════════
  await seccion('S2c', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base); _base();
      STATE.push(_P({id:'fab', oc:'10-020', fecha:_adel(3), productos:FAB(10)})); saveMirror();
      var out={};
      _subir(_R(todayStr(),'09:00:00',{[K]:10,[K2]:4}), ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      out.sellada=_x('fab');
      _subir(_R(todayStr(),'09:00:00',{[K]:7,[K2]:4})); out.sug=_sug();
      _subir(_R(todayStr(),'09:00:00',{[K]:7,[K2]:4}), ['.exist-fab[data-id="fab"]']); await confirmarImportExist();
      out.x=_x('fab'); out.fila=_fila(K);
      return out;
    }, BASE);
    chk('S2c · antes: 10 de 10, sellada desde el Excel', r.sellada.prodRm==='excel' && r.sellada.chk==='ok' && r.sellada.pend===false, J(r.sellada));
    chk('S2c · corregido a 7: ofrece 7 sobre la línea que vuelve a estar pendiente', J(r.sug)===J([['fab',7]]), J(r.sug));
    chk('S2c · tildado: sin sello, la marca de antes («✗ no hay»), 7 de 10 pendiente; reserva 7, 3 a fábrica',
        r.x.prodR==='' && r.x.prodRm==='' && r.x.chk==='no' && r.x.prodU===7 && r.x.prodC===1 && r.x.pend===true && r.fila.comp===7 && r.fila.aFab===3, J([r.x, r.fila]));
  });

  // ═══ El formulario ═════════════════════════════════════════════════════════════════════
  console.log('\n── Corregir el pedido desde el formulario no pierde lo nuevo ──');
  await seccion('form', async (page) => {
    const r = await page.evaluate(async (base) => {
      eval(base);
      var v={desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:10,chk:'ok',enProd:true,prodF:'2026-10-04',prodR:'2026-10-07',prodRt:123,prodU:3,prodC:['cA'],prodCu:[['cA',3,'','2026-10-07','09:00:00']]};
      var n=[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:10}];
      var h=heredarMarcas(n, [v])[0];
      return { rt:h.prodRt, cu:h.prodCu, mismo: h.prodCu!==v.prodCu };
    }, BASE);
    chk('heredarMarcas copia la hora de la marca a mano y lo que anotó cada corte (copia, no la misma lista)', r.rt===123 && J(r.cu)===J([['cA',3,'','2026-10-07','09:00:00']]) && r.mismo, J(r));
  });

  chk('sin errores en la página', !errores.length, J(errores.slice(0,5)));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
