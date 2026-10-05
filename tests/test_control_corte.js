/* 🧮 EL CONTROL DEL CORTE (§4hn, etapa 2 — 05/10/2026). El dueño: «logística no marca que llegó de fábrica, solo lo
   que se pidió, y cada día solo suben las existencias». Codex (PDF del 05/10): comparar esperado vs Excel por depósito,
   clasificar la diferencia (entrada/salida sin explicar, no «llegó»), sugerir sin cerrar por fecha, ids derivados del
   corte (dos equipos → un efecto), anulación persistente, reclamar lo vencido, primer corte y corte viejo.

   Reloj clavado en el miércoles 07/10/2026 a las 15:00 de Bolivia. Red cortada, servidor simulado, datos sintéticos.
   Se corre:  node tests/test_control_corte.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_control_corte.js */
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
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._guardadas=[];
  apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
  window._adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'10-001',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
  window.H=function(n,extra){ return [Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n,chk:'ok'},extra||{})]; };
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
    STOCK.c={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-86400000 }; STOCK.c.u[K]=10; STOCK.c.u[K2]=4;
    STOCK.g={}; STOCK.g[IM]={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000 }; STOCK.g[IM].u[K]=20;
    STOCK.al={}; STOCK.al[LOG]='log'; STOCK.al[IM]='otro';
    STOCK.p=[]; STATE=[]; stockOlvidarIndice();
  };
  window._subir=function(R, tildar){
    EXIST_IMP=R; EXIST_CTRL_TODAS=false; renderImportExist();
    var txt=((document.getElementById('modal-box')||{}).textContent||'').replace(/\\s+/g,' ');
    (tildar||[]).forEach(function(sel){ var el=document.querySelector(sel); if(el){ el.checked=true; } });
    return txt;
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._modalTxt=function(){ return ((document.getElementById('modal-box')||{}).textContent||'').replace(/\\s+/g,' '); };
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

  // ═══ 1. La cuenta: esperado, Excel, diferencia; la ventana con la hora y la casilla ═══
  console.log('\n── 1. Esperado = previo + llegadas anotadas − salidas; la ventana respeta la casilla ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base); _base();
      // ayer salieron 3 de K (entregado) y hoy están agendados 2 más (sin marcar todavía); K2 sin movimiento
      STATE.push(_P({id:'ayer', fecha:_atras(1), entregado:true, productos:H(3)}));
      STATE.push(_P({id:'hoy', fecha:todayStr(), entregado:false, productos:H(2)}));
      var out={};
      // Excel de hoy a las 9 (antes del camión): K 7 (10−3), K2 4 → todo cuadra
      var C=stockConciliar(_R(todayStr(),'09:00:00',{[K]:7,[K2]:4}), 'log', false);
      out.manana={ resumen:C.resumen, v:C.ventana, k:(C.filas.filter(function(f){ return f.k===K; })[0]||null) };
      // Excel de hoy a las 16 (ya incluye las entregas de hoy): K 5 (10−3−2) → cuadra; con la casilla SIN marcar daría +2
      var C2=stockConciliar(_R(todayStr(),'16:00:00',{[K]:5,[K2]:4}), 'log', true);
      var C3=stockConciliar(_R(todayStr(),'16:00:00',{[K]:5,[K2]:4}), 'log', false);
      out.tarde={ cuadra:C2.resumen, sinCasilla:(C3.filas.filter(function(f){ return f.k===K; })[0]||{}).dif, v:C2.ventana };
      // una llegada anotada a mano hoy (📥 Llegó de fábrica, 4) también entra al esperado
      STOCK.e=[{ id:'e1', f:todayStr(), k:K, u:4, fab:'MORENO', ts:Date.now() }];
      var C4=stockConciliar(_R(todayStr(),'16:00:00',{[K]:9,[K2]:4}), 'log', true);
      out.conEntrada=(C4.filas.filter(function(f){ return f.k===K; })[0]||{dif:'cuadra'});
      return out;
    }, BASE);
    chk('Excel de la mañana (antes del camión): esperado 10 − 3 de ayer = 7, cuadra; la ventana va de ayer a hoy sin incluir hoy',
        r.manana.resumen.cuadran===2 && r.manana.resumen.con===0 && r.manana.k===null && r.manana.v.incluyeHasta===false, J([r.manana.resumen, r.manana.v]));
    chk('Excel de la tarde con la casilla marcada: también descuenta los 2 de hoy (5), cuadra; sin la casilla creería que faltan 2',
        r.tarde.cuadra.cuadran===2 && r.tarde.sinCasilla===-2 && r.tarde.v.incluyeHasta===true, J(r.tarde));
    chk('una llegada anotada a mano (4) entra al esperado: 10 − 5 + 4 = 9, cuadra', r.conEntrada.dif==='cuadra' || r.conEntrada.dif===0, J(r.conEntrada.dif));
    await page.close();
  }

  // ═══ 2. Diferencia de más: sugerencia destildada, no cierre; tildar cierra con id derivado ═══
  console.log('\n── 2. +N es «entrada sin explicar»: se sugiere el pedido pendiente, destildado; tildarlo lo cierra ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base); _base();
      // un pedido a fábrica de 10 de K, hecho hace 6 días (vencido: tarda 3), y una recogida de 5 de Moreno de ayer
      STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(6), esp:'', r:'' },
               { id:'rc1', k:K, u:5, tipo:'recogida', de:IM, fab:'', f:_atras(1), esp:todayStr(), r:'' }];
      var out={};
      var antes=_fila(K); out.antes={ enCamino:antes.enCamino, aviso:antes.aviso, reclamar:(antes.reclamar||[]).map(function(q){ return q.id; }) };
      // el Excel de hoy a las 9 trae 20 de K: +10 sin explicar
      var R=_R(todayStr(),'09:00:00',{[K]:20,[K2]:4});
      var txt=_subir(R);
      out.txt=txt;
      out.sugs=Array.from(document.querySelectorAll('.exist-sug')).map(function(c){ return [c.getAttribute('data-q'), Number(c.getAttribute('data-u')), c.checked]; });
      out.casillaVieja=!!document.getElementById('exist-cerrar-ped');
      // sin tildar nada: confirmar no cierra nada
      confirmarImportExist();
      out.sinTildar={ abiertos:STOCK.p.filter(function(q){ return !q.r; }).length, d:(STOCK.h[0]||{}).d, hu:(STOCK.h[0]||{}).hu, v:STOCK.v };
      var f=_fila(K); out.despues={ deposito:f.deposito, enCamino:f.enCamino, aviso:f.aviso, reclamar:(f.reclamar||[]).map(function(q){ return q.id; }), badge:'' };
      renderStock(); out.despues.badge=((document.querySelector('#stock-body')||{}).textContent||'').indexOf('reclamar')>=0;
      // ahora se sube el MISMO Excel de nuevo y se tilda «es el pedido a fábrica»
      _subir(R, ['.exist-sug[data-q="fp1"]']);
      confirmarImportExist();
      var q=STOCK.p.filter(function(x){ return x.id==='fp1'; })[0];
      out.cerrado={ r:q.r, enConteo:!!q.enConteo, ru:q.ru, recs:(q.recs||[]).map(function(x){ return [x.id, x.u, x.se, !!x.ev]; }) };
      out.corte=existCorteId(R); out.k=K;
      var f2=_fila(K); out.final={ deposito:f2.deposito, enCamino:f2.enCamino };
      out.medido=stockTiemposFabrica().de('MORENO').medido;
      out.hist=(STOCK.h[0]||{}).d;
      return out;
    }, BASE);
    chk('antes: 15 en camino (10 + 5), ya pedido, y el de hace 6 días figura para reclamar',
        r.antes.enCamino===15 && r.antes.aviso==='pedido' && J(r.antes.reclamar)===J(['fp1']), J(r.antes));
    chk('la ventana muestra el control: «+10» como entrada sin explicar y SUGIERE el pedido (10) y la recogida (0: ya no queda resto), destildados',
        /Control del corte/.test(r.txt) && r.sugs.length===1 && r.sugs[0][0]==='fp1' && r.sugs[0][1]===10 && r.sugs[0][2]===false && r.casillaVieja===false, J(r.sugs));
    chk('⚠️ sin tildar nada, confirmar NO cierra ningún pedido: siguen 15 en camino; el corte queda en el historial con su huella y sus diferencias',
        r.sinTildar.abiertos===2 && r.despues.enCamino===15 && r.despues.deposito===20 && !!r.sinTildar.hu && r.sinTildar.v===2 &&
        Array.isArray(r.sinTildar.d) && r.sinTildar.d.length===1 && r.sinTildar.d[0][1]===10, J(r.sinTildar));
    chk('…y el vencido sigue para reclamar: el renglón dice «Ya pedido · ⚠️ reclamar»', J(r.despues.reclamar)===J(['fp1']) && r.despues.badge===true, J(r.despues));
    chk('la segunda subida del mismo Excel ofrece la detección anotada (10 sin asignar); tildar «es este pedido» lo cierra: recepción x:<detección>|fp1, se:1, con evidencia, enConteo',
        r.cerrado.r==='2026-10-07' && r.cerrado.enConteo===true && r.cerrado.ru===10 && r.cerrado.recs.length===1 && r.cerrado.recs[0][0]==='x:d:'+r.corte+'|'+r.k+'|fp1' && r.cerrado.recs[0][1]===10 && r.cerrado.recs[0][2]===1 && r.cerrado.recs[0][3]===true, J(r.cerrado));
    chk('…el depósito sigue siendo el del Excel (20) y en camino quedan solo los 5 de la recogida: nada se cuenta dos veces', r.final.deposito===20 && r.final.enCamino===5, J(r.final));
    chk('…y cerrarlo así NO mide el tiempo de fábrica (se sabe que estaba, no cuándo llegó)', r.medido===false, 'medido '+r.medido);
    chk('el historial del corte anota qué se cerró', Array.isArray(r.hist) && r.hist[0][2].length===1 && r.hist[0][2][0][0]==='cerro' && r.hist[0][2][0][1]==='fp1', J(r.hist));
    await page.close();
  }

  // ═══ 3. Dos equipos, el mismo Excel: un solo efecto; parcial 3 de 10 dos veces = 3/7 ═══
  console.log('\n── 3. El mismo Excel desde dos equipos: una sola recepción (3 de 10 → 3 recibidas, 7 pendientes) ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base); _base();
      STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      var R=_R(todayStr(),'09:00:00',{[K]:13,[K2]:4});   // +3 sin explicar
      // equipo A: tilda y confirma
      _subir(R, ['.exist-sug[data-q="fp1"]']); confirmarImportExist();
      var A=JSON.parse(JSON.stringify(STOCK));
      // equipo B: partía del stock de ayer (sin la recepción de A) y hace lo mismo con el mismo archivo
      _base(); STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      _subir(R, ['.exist-sug[data-q="fp1"]']); confirmarImportExist();
      var B=JSON.parse(JSON.stringify(STOCK));
      // la junta (lo que hace el servidor con conflicto): base = ayer, mío = B, servidor = A
      _base(); STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      var base0=JSON.parse(JSON.stringify(STOCK));
      var J2=stockFusionar(base0, B, A);
      var q=J2.p.filter(function(x){ return x.id==='fp1'; })[0];
      return { ids:[A.p[0].recs[0].id, B.p[0].recs[0].id], iguales:A.p[0].recs[0].id===B.p[0].recs[0].id,
               junta:{ recs:(q.recs||[]).length, ru:q.ru, u:q.u, r:q.r }, h:J2.h.length };
    }, BASE);
    chk('⚠️ los dos equipos generan la MISMA recepción (id derivado del corte y del pedido), no dos al azar', r.iguales===true, J(r.ids));
    chk('⚠️ al juntar queda UNA recepción: 3 recibidas, 7 pendientes, el pedido sigue abierto (nunca 6)', r.junta.recs===1 && r.junta.ru===3 && r.junta.u===7 && r.junta.r==='', J(r.junta));
    chk('…y el corte figura una sola vez en el historial', r.h===1, r.h);
    await page.close();
  }

  // ═══ 4. Deshacer con lápida: sobrevive a la junta y la recepción vuelve a «en camino» ═══
  console.log('\n── 4. «↩️ No había llegado»: lápida que gana al juntar y nunca se borra ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base); _base();
      STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      var R=_R(todayStr(),'09:00:00',{[K]:20,[K2]:4});
      _subir(R, ['.exist-sug[data-q="fp1"]']); confirmarImportExist();
      var conRec=JSON.parse(JSON.stringify(STOCK));         // lo que tiene el OTRO equipo (sin la anulación)
      var rid='x:d:'+existCorteId(R)+'|'+K+'|fp1';
      var ok=stockAnularRecepcion('fp1', rid, 'no había llegado');
      var q=STOCK.p[0];
      var out={ ok:ok, abierto:q.r==='' && q.u===10 && q.ru===0, recs:(q.recs||[]).length, an:!!(q.recs[0]&&q.recs[0].an), enCamino:_fila(K).enCamino };
      // la junta con el equipo que todavía la tiene viva: gana la lápida
      var base0=JSON.parse(JSON.stringify(conRec));
      var J2=stockFusionar(base0, JSON.parse(JSON.stringify(STOCK)), conRec);
      var q2=J2.p[0]; out.junta={ an:!!(q2.recs[0]&&q2.recs[0].an), r:q2.r, u:q2.u };
      // y al revés (el otro equipo es «mío» y la anulación viene del servidor)
      var J3=stockFusionar(base0, conRec, JSON.parse(JSON.stringify(STOCK)));
      out.juntaRev={ an:!!(J3.p[0].recs[0]&&J3.p[0].recs[0].an), r:J3.p[0].r };
      // dos veces no hace nada raro
      out.otraVez=stockAnularRecepcion('fp1', rid, 'x');
      // el historial lo dice
      abrirStockHistorial(); out.hist=_modalTxt();
      return out;
    }, BASE);
    chk('anular reabre el pedido (10 pendientes, 0 recibidas) sin borrar la recepción: queda con la lápida', r.ok===true && r.abierto && r.recs===1 && r.an===true && r.enCamino===10, J(r));
    chk('⚠️ la lápida gana al juntar en los dos sentidos: el otro equipo no la revive', r.junta.an===true && r.junta.r==='' && r.junta.u===10 && r.juntaRev.an===true && r.juntaRev.r==='', J([r.junta, r.juntaRev]));
    chk('anular dos veces no hace nada', r.otraVez===false);
    chk('el historial de cortes lo muestra como anulado', /anulado: no había llegado/.test(r.hist), r.hist.slice(0,200));
    await page.close();
  }

  // ═══ 5. Lo hecho a pedido (🏭): llega (+N) y se entrega (−N), explicado ═══
  console.log('\n── 5. Una línea 🏭: su llegada se sugiere sellar; su entrega explica la baja ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base); _base();
      // un pedido para mañana con 2 TITANIO ICE hechos a pedido (🏭 Moreno, pedido hace 3 días)
      STATE.push(_P({id:'fab', fecha:_adel(1), productos:H(2,{ chk:'no', enProd:true, prodEn:'Moreno', prodF:_atras(3) })}));
      var out={};
      // hoy llegan: el Excel trae 12 (10 + 2)
      var R=_R(todayStr(),'09:00:00',{[K]:12,[K2]:4});
      _subir(R); out.sug=Array.from(document.querySelectorAll('.exist-fab')).map(function(c){ return [c.getAttribute('data-id'), Number(c.getAttribute('data-u')), c.checked]; });
      out.sinPedido=Array.from(document.querySelectorAll('.exist-sug')).length;
      var txt=_modalTxt(); out.dice=/hecho a pedido/.test(txt);
      // se tilda y se confirma: la línea queda sellada (prodR) y el pedido se guardó
      _subir(R, ['.exist-fab[data-id="fab"]']); confirmarImportExist();
      var x=findById('fab').productos[0]; out.prodR=x.prodR; out.guardado=window._guardadas.filter(function(s){ return s.id==='fab'; }).length;
      // mañana se entrega y el Excel de pasado mañana trae 10 de nuevo: la baja se explica, sin «salida sin explicar»
      findById('fab').entregado=true;
      STOCK.c.f=todayStr(); STOCK.c.hora='09:00:00'; STOCK.c.u[K]=12;    // el corte vigente es el de hoy
      var C=stockConciliar(_R(_adel(2),'09:00:00',{[K]:10,[K2]:4}), 'log', false);
      var f=C.filas.filter(function(z){ return z.k===K; })[0]||{};
      /* (05/10, Codex H4) la línea sellada ya está en el conteo: su entrega es una salida común y el Excel siguiente CUADRA */
      out.baja={ fila:!!f.k, cuadran:C.resumen.cuadran, con:C.resumen.con };
      return out;
    }, BASE);
    chk('+2 sin explicar y el panel sugiere «¿llegó lo hecho a pedido de OC 10-001 (2)?», destildado, sin inventar un pedido a fábrica',
        r.sug.length===1 && r.sug[0][0]==='fab' && r.sug[0][1]===2 && r.sug[0][2]===false && r.sinPedido===0 && r.dice, J(r.sug));
    chk('tildarlo sella la llegada (prodR = hoy) y guarda el pedido', r.prodR==='2026-10-07' && r.guardado===1, J([r.prodR, r.guardado]));
    chk('cuando se entrega, la baja de 2 en el Excel siguiente es una salida común (la línea ya estaba contada en el depósito): cuadra, sin «salida sin explicar» ni doble explicación',
        r.baja.fila===false && r.baja.cuadran===2 && r.baja.con===0, J(r.baja));
    await page.close();
  }

  // ═══ 6. Diferencia de menos: anotar la salida sin pedido (Multicenter) ═══
  console.log('\n── 6. −N es «salida o ajuste sin explicar»: se anota como salida sin pedido y no se descuenta dos veces ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base); _base();
      var R=_R(todayStr(),'09:00:00',{[K]:6,[K2]:4});    // faltan 4 de K
      var txt=_subir(R, ['.exist-sal[data-k="'+K+'"]']);
      var out={ dice:/salida o ajuste sin explicar/.test(txt) && !/venta sin pedido/.test(txt) && !/pérdida/.test(txt) };
      confirmarImportExist();
      out.sm=(STOCK.sm||[]).map(function(s){ return [s.k===K, s.u, s.pre, s.m, s.id.indexOf('s:')===0]; });
      var f=_fila(K); out.deposito=f.deposito;
      out.hist=(STOCK.h[0]||{}).d;
      // subir el MISMO Excel de nuevo no la anota dos veces
      _subir(R, ['.exist-sal[data-k="'+K+'"]']); confirmarImportExist();
      out.smDespues=(STOCK.sm||[]).length;
      // y una salida anotada desde la pantalla de stock, de HOY (después del corte): baja el depósito
      abrirStockSalida(); document.getElementById('stk-sal-k').value=K; document.getElementById('stk-sal-u').value='2'; document.getElementById('stk-sal-m').value='Multicenter';
      guardarStockSalida();
      out.conManual={ deposito:_fila(K).deposito, sm:(STOCK.sm||[]).length, pre:(STOCK.sm||[]).slice(-1)[0].pre };
      return out;
    }, BASE);
    chk('la ventana lo llama «salida o ajuste sin explicar» (nunca venta sin pedido ni pérdida) y ofrece anotarla', r.dice===true);
    chk('anotada: queda en el stock con nombre derivado del corte, `pre:1` (ya está adentro del Excel) y el depósito es el del Excel (6)',
        r.sm.length===1 && r.sm[0][0] && r.sm[0][1]===4 && r.sm[0][2]===1 && r.sm[0][3]==='Multicenter' && r.sm[0][4] && r.deposito===6, J([r.sm, r.deposito]));
    chk('el historial del corte la registra', Array.isArray(r.hist) && r.hist[0][2][0][0]==='sal' && r.hist[0][2][0][2]===4, J(r.hist));
    chk('subir el mismo Excel de nuevo no la anota dos veces', r.smDespues===1, r.smDespues);
    chk('📤 una salida de HOY anotada desde la pantalla de stock baja el depósito (6 − 2 = 4) hasta el próximo Excel', r.conManual.deposito===4 && r.conManual.sm===2 && r.conManual.pre===0, J(r.conManual));
    await page.close();
  }

  // ═══ 7. Primer corte, corte viejo, Excel corregido del mismo corte, Banzer ═══
  console.log('\n── 7. Primer corte, un Excel más viejo que el vigente, el mismo corte corregido, y Banzer ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base);
      var out={};
      // primer corte: sin previo
      STOCK=stockVacio(); STOCK_CARGADO=true; STATE=[]; stockOlvidarIndice();
      var txt=_subir(_R(todayStr(),'09:00:00',{[K]:10})); out.primero=/sin conciliación previa/.test(txt);
      confirmarImportExist(); out.base=STOCK.c.u[K];
      // un Excel de hace 3 días, después del de hoy: no reemplaza salvo el tilde
      var viejo=_R(_atras(3),'09:00:00',{[K]:50});
      txt=_subir(viejo); out.viejoAvisa=/MÁS VIEJO/.test(txt);
      confirmarImportExist(); out.viejoFreno={ c:STOCK.c.f===todayStr() && STOCK.c.u[K]===10, toast:window._toasts.slice(-1)[0]||'' };
      _subir(viejo, ['#exist-corte-viejo-ok']); confirmarImportExist(); out.viejoForzado=STOCK.c.f===_atras(3) && STOCK.c.u[K]===50;
      // el mismo corte (hoy 09:00) subido corregido: lo que cerró la versión anterior se anula y se vuelve a sugerir
      _base(); STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      var R1=_R(todayStr(),'09:00:00',{[K]:20,[K2]:4}); _subir(R1, ['.exist-sug[data-q="fp1"]']); confirmarImportExist();
      out.cerradoV1=STOCK.p[0].r!=='';
      var R2=_R(todayStr(),'09:00:00',{[K]:15,[K2]:4});     // el archivo corregido: eran 15, no 20
      txt=_subir(R2);
      out.v2={ sug:Array.from(document.querySelectorAll('.exist-sug')).map(function(c){ return [c.getAttribute('data-q'), Number(c.getAttribute('data-u'))]; }) };
      confirmarImportExist();
      out.v2.anulada=!!(STOCK.p[0].recs[0]&&STOCK.p[0].recs[0].an) && /corte reemplazado/.test(STOCK.p[0].recs[0].an.m); out.v2.abierto=STOCK.p[0].r===''; out.v2.h=STOCK.h.filter(function(x){ return x.alm===LOG; }).length;
      // Banzer: informativo, sin sugerencias
      STOCK.g['Banzer']={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000 }; STOCK.g['Banzer'].u[K]=3; STOCK.al['Banzer']='sale';
      var RB=_R(todayStr(),'09:00:00',{[K]:8}); RB.almacen='Banzer'; RB.esLog=false;
      var CB=stockConciliar(RB, 'sale', false); var fb=CB.filas[0]||{};
      out.banzer={ dif:fb.dif, sug:(fb.sug||[]).length, sinExplicar:fb.sinExplicar };
      return out;
    }, BASE);
    chk('primer corte: «sin conciliación previa», y se toma como base', r.primero===true && r.base===10, J([r.primero, r.base]));
    chk('⚠️ un Excel más viejo que el vigente avisa y NO reemplaza el conteo sin el tilde', r.viejoAvisa===true && r.viejoFreno.c===true && /más viejo/.test(r.viejoFreno.toast), J(r.viejoFreno));
    chk('…con «usarlo igual» tildado sí reemplaza (sin conciliar)', r.viejoForzado===true);
    chk('⚠️ el mismo corte subido corregido anula lo que cerró la versión anterior (lápida «corte reemplazado») y lo vuelve a sugerir con el número nuevo (+5)',
        r.cerradoV1===true && r.v2.anulada===true && r.v2.abierto===true && J(r.v2.sug)===J([['fp1',5]]) && r.v2.h===1, J(r.v2));
    chk('Banzer: la diferencia (+5) es solo información, sin sugerencias de cierre', r.banzer.dif===5 && r.banzer.sug===0 && r.banzer.sinExplicar===5, J(r.banzer));
    await page.close();
  }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
