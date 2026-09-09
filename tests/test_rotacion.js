/* 🎯 ROTACIÓN: la del EQUIPO, y los pedidos de Eduardo afuera (§4da → §4de → §4dg).

   La regla dio la vuelta entera en tres días, y este test cuida LA QUE QUEDÓ:
     · 07/09 (§4da), el dueño mirando el MORFEO: *"una única entrega o 2 en 1 mes no es tener
       rotación, eso es pedido único"* → hacían falta 3 entregas distintas.
     · 08/09 (91ddcd8, la otra herramienta): rotación = UNIDADES del equipo; los pedidos de
       Eduardo van aparte y no arman ritmo ni reserva. La condición de 3 entregas se fue.
     · 09/09, el dueño con la pantalla en la mano: *"que las ventas de Eduardo no entran a
       pedir productos ni rotación ni nada. Deja como lo dejó ChatGPT nomás"*. → Esa.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Los pedidos de EDUARDO no cuentan para nada de la reserva: ni ritmo, ni «cuánto pedir»,
      ni el mensaje a fábrica — aunque sean cinco entregas. Lo suyo vendido y sin entregar sí
      se cubre (eso no es una estimación, está vendido).
   2. Una venta grande del EQUIPO, aunque sea una sola entrega, SÍ es rotación: el panel
      estima ritmo y pide. (Es lo contrario de §4da. Decisión del dueño, 09/09. No volver.)
   3. Con ≤2 unidades del equipo no se estima ritmo (`lenta`); lo vendido y sin entregar se
      cubre igual, aunque sea la primera vez que se vende.
   4. Lo vendido se sigue MOSTRANDO («45 en 15 días · 1 entrega», y cuánto fue de Eduardo).

   Se corre:  node tests/test_rotacion.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['stockData','stockAvisoDe','stockCuantoPedir','copiarStock','stockPedidoUnico']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel distingue la rotación del equipo de los pedidos de Eduardo (§4dg)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* El escenario:
       · MORFEO   — Carola, 45 unidades en UNA sola entrega, ya entregada, nada pendiente.
       · HERA     — Carola, 45 unidades en 2 entregas.
       · ARES     — Carola, 45 unidades en 15 entregas repartidas en toda la ventana.
       · ARTEMISA — 1 sola entrega, pero de 6 unidades TODAVÍA SIN ENTREGAR y sin stock:
                    no hay ritmo, pero la venta existe y hay que conseguirlas.
       · HERMES   — Carola, 2 unidades en una entrega: poca rotación, nada que reponer.
     Ninguno figura en el corte del almacén, así que todos están en cero (§4ct).
     ⚠️ LAS 15 ENTREGAS DE ARES SE REPARTEN DENTRO DE LA VENTANA ACTUAL, LEÍDA EN VIVO
     (§4dc): `STOCK_VENTANA` ya bajó una vez de 28 a 15 sin avisar a este test. */
  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    apiSave=function(r){ return Promise.resolve({ok:true,pedido:r}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    var adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    var P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',
      vendedor:'Carola Chavez',cliente:'C',celular:'70000000',turno:'AM',zona:'N',direccion:'x',maps:'',pagado:true,
      saldo:0,ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',
      nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    var pr=function(d,n){ return [{desc:d,medida:'140x190',codigo:'',cant:n}]; };
    STATE=[ P({id:'m1', fecha:atras(6), entregado:true, cliente:'Mayorista', productos:pr('MORFEO',45)}),
            P({id:'h1', fecha:atras(9), entregado:true, productos:pr('HERA',20)}),
            P({id:'h2', fecha:atras(4), entregado:true, productos:pr('HERA',25)}),
            P({id:'x1', fecha:adel(2), cliente:'Espera 6', productos:pr('ARTEMISA',6)}),
            P({id:'he1', fecha:atras(3), entregado:true, productos:pr('HERMES',2)}) ];
    for(var i=0;i<15;i++){
      var off=Math.round(i*(STOCK_VENTANA-1)/14);      // 0..14 → siempre 0..(ventana−1)
      STATE.push(P({id:'a'+i, fecha:atras(off), entregado:true, productos:pr('ARES',3)}));
    }
    STOCK={ c:{f:todayStr(), u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', cod:{}}, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    saveMirror(); updateStats();
  });
  await armar();
  const foto = () => page.evaluate(() => {
    var d=stockData(), o={};
    d.lista.forEach(function(x){ o[x.desc]={ vend:x.vendidos, n:x.nVentas, rota:x.rota, rotacion:x.rotacion, porDia:x.porDia,
      porDiaReal:Math.round(x.porDiaReal*100)/100, vr:x.vendidosRotacion, vu:x.vendidosUnicos,
      dias:x.dias, aviso:x.aviso, pedir:x.pedir, comp:x.comp, dep:x.deposito }; });
    var t=''; var g=window.copyText; window.copyText=function(s){ t=s; }; copiarStock(); window.copyText=g;
    return { o:o, msg:t, urgentes:d.lista.filter(function(x){ return x.aviso==='urgente'||x.aviso==='pedir'; }).map(function(x){ return x.desc; }) };
  });
  const filas = () => page.evaluate(() => {
    abrirStock();
    var out={};
    Array.prototype.forEach.call(document.querySelectorAll('tr[data-stock-k]'), function(t){ out[(t.getAttribute('data-stock-k')||'').split('|')[0]]=t.textContent.replace(/\s+/g,' '); });
    return out;
  });
  let r = await foto();

  // ══ 1. Una venta grande del equipo, en UNA entrega: SÍ es rotación (09/09) ═══════════
  console.log('\n── 1. El MORFEO: 45 en UNA entrega del equipo → rota (decisión del dueño, 09/09) ──');
  const M=r.o.MORFEO||{};
  chk('se siguen viendo las 45 unidades vendidas', M.vend===45, JSON.stringify(M.vend));
  chk('…y que salieron en 1 sola entrega', M.n===1, M.n);
  chk('⚠️ las 45 son del equipo, ninguna de Eduardo', M.vr===45 && M.vu===0, 'equipo='+M.vr+' eduardo='+M.vu);
  chk('⚠️ cuenta como rotación (media: una sola entrega no es «sostenida»)', M.rota===true && M.rotacion==='media', 'rota='+M.rota+' '+M.rotacion);
  chk('⚠️ el ritmo es 45 ÷ ventana = 3 por día', M.porDia===3 && M.porDiaReal===3, M.porDia+' · crudo '+M.porDiaReal);
  chk('⚠️ con 0 en depósito se corta hoy y pide: fábrica 3 + margen 2 + reserva 3 = 8 días × 3 = 24',
      (M.aviso==='urgente'||M.aviso==='pedir') && M.pedir===24, M.aviso+' · pedir '+M.pedir);
  chk('…y entra en el mensaje para la fábrica', /MORFEO/.test(r.msg) && r.urgentes.indexOf('MORFEO')>=0, r.urgentes.join(', ')||'ninguno');

  // ══ 2. Dos entregas del equipo, repartidas: rotación alta ═════════════════
  console.log('\n── 2. La HERA: 45 en 2 entregas, en dos tramos distintos ──');
  const H=r.o.HERA||{};
  chk('45 unidades en 2 entregas: rota, y como están en 2 de los 3 tramos es «alta»', H.n===2 && H.rota===true && H.rotacion==='alta', 'n='+H.n+' '+H.rotacion);
  chk('…y pide', (H.aviso==='urgente'||H.aviso==='pedir') && H.pedir>0 && /HERA/.test(r.msg), H.aviso+' · pedir '+H.pedir);

  // ══ 3. Con rotación repartida, todo sigue como antes ══════════════════════
  console.log('\n── 3. Lo que rota de a poco y seguido ──');
  const A=r.o.ARES||{};
  chk('45 unidades en 15 entregas es rotación alta', A.n===15 && A.rota===true && A.rotacion==='alta' && A.porDia>1.5, 'n='+A.n+' porDia='+A.porDia);
  chk('⚠️ se corta y avisa que hay que pedir', (A.aviso==='urgente'||A.aviso==='pedir') && A.pedir>0, A.aviso+' · pedir '+A.pedir);
  chk('…y entra en el mensaje para la fábrica', /ARES/.test(r.msg) && r.urgentes.indexOf('ARES')>=0, r.urgentes.join(', '));

  // ══ 4. Sin rotación, pero vendido y sin entregar: se cubre igual ══════════
  console.log('\n── 4. Sin rotación, pero vendido y sin entregar ──');
  const X=r.o.ARTEMISA||{};
  /* ⚠️ `vendidos` se mide por FECHA DE SALIDA y esta entrega es de pasado mañana: todavía no
     entró a la ventana, así que son 0 vendidas. Da igual: las 6 comprometidas mandan solas. */
  chk('una entrega futura: no hay rotación de la que deducir un ritmo', X.n===0 && X.rota===false && X.porDia===0, 'n='+X.n+' rota='+X.rota);
  chk('⚠️ pero los 6 vendidos sin entregar SÍ se cuentan', X.comp===6, X.comp);
  chk('⚠️ y como no hay stock, igual avisa que hay que conseguirlos',
      (X.aviso==='urgente'||X.aviso==='pedir') && X.pedir===6, X.aviso+' · pedir '+X.pedir);
  chk('…y el mensaje lo pide sin inventar un ritmo ni decir «0 en 0 entregas»',
      /ARTEMISA/.test(r.msg) && /poca rotación: solo demanda confirmada/.test(r.msg) && !/0 en 0 entregas/.test(r.msg) && !/ARTEMISA[^\n]*\n[^\n]*por d[íi]a/.test(r.msg),
      (r.msg.match(/[^\n]*ARTEMISA[^\n]*\n[^\n]*/)||[''])[0].replace(/\s+/g,' ').slice(0,130));
  const HM=r.o.HERMES||{};
  chk('HERMES: 2 unidades del equipo en 15 días → poca rotación («lenta»), ritmo 0, no pide',
      HM.vend===2 && HM.rota===false && HM.porDia===0 && HM.aviso==='lenta' && HM.pedir===0 && !/HERMES/.test(r.msg), HM.aviso+' · pedir '+HM.pedir);

  // ══ 5. En la pantalla se ve el dato, no desaparece ════════════════════════
  console.log('\n── 5. Lo que se ve en la tabla ──');
  let F = await filas();
  const V = await page.evaluate(() => STOCK_VENTANA);
  chk('el MORFEO sigue en la tabla con sus 45 vendidas y 1 entrega', (F.MORFEO||'').indexOf('45 en '+V+' días · 1 entrega')>=0, (F.MORFEO||'').slice(0,110));
  chk('…con «Rotación media: reserva de 3 días» y el 🚨 PEDIR YA', /Rotación media: reserva de 3 días/.test(F.MORFEO||'') && /PEDIR YA/.test(F.MORFEO||''), (F.MORFEO||'').slice(0,160));
  chk('el ARES, que rota, muestra sus 15 entregas y «Rotación alta»', /15 entregas/.test(F.ARES||'') && /Rotación alta/.test(F.ARES||''), (F.ARES||'').slice(0,120));
  chk('el HERMES dice «Poca rotación: solo pedidos confirmados» y explica sin pedir nada',
      /Poca rotación: solo pedidos confirmados/.test(F.HERMES||'') && /no se añade reserva por previsión/.test(F.HERMES||'') && !/PEDIR YA/.test(F.HERMES||''), (F.HERMES||'').slice(0,160));

  // ══ 6. Los pedidos de Eduardo no cuentan «ni para rotación ni nada» ═══════
  /* HADES: Eduardo, 45 en 5 entregas · POSEIDON: Eduardo 80 + Carola 8 en UNA · ATENEA: Carola 1+1+1 */
  console.log('\n── 6. Eduardo: sus pedidos son puntuales, aunque sean cinco ──');
  await page.evaluate(() => {
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    var P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',
      vendedor:'Carola Chavez',cliente:'C',celular:'70000000',turno:'AM',zona:'N',direccion:'x',maps:'',pagado:true,
      saldo:0,ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:true,vehiculo:'',chofer:'',garantia:'',
      nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    var pr=function(d,n){ return [{desc:d,medida:'140x190',codigo:'',cant:n}]; };
    for(var i=1;i<=5;i++) STATE.push(P({id:'hd'+i, fecha:atras(i), vendedor:'Eduardo Añez', productos:pr('HADES',9)}));
    STATE.push(P({id:'ps1', fecha:atras(2), vendedor:'Eduardo Añez', productos:pr('POSEIDON',80)}));
    STATE.push(P({id:'ps2', fecha:atras(3), productos:pr('POSEIDON',8)}));
    for(var j=1;j<=3;j++) STATE.push(P({id:'at'+j, fecha:atras(j*2), productos:pr('ATENEA',1)}));
    saveMirror();
  });
  r = await foto();
  const HD=r.o.HADES||{}, PS=r.o.POSEIDON||{}, AT=r.o.ATENEA||{};
  chk('⚠️ HADES: Eduardo vendió 45 en 5 entregas — se ve, pero NO es rotación', HD.vend===45 && HD.n===5 && HD.vu===45 && HD.vr===0 && HD.rota===false && HD.porDia===0, 'vend='+HD.vend+' n='+HD.n+' rota='+HD.rota+' porDia='+HD.porDia);
  chk('⚠️ …aviso «pedido único», sin pedir ni entrar al mensaje', HD.aviso==='unico' && HD.pedir===0 && !/HADES/.test(r.msg), HD.aviso+' · pedir '+HD.pedir);
  chk('⚠️ POSEIDON: los 80 de Eduardo no cuentan; los 8 de Carola sí, y con eso rota (media)',
      PS.vend===88 && PS.vu===80 && PS.vr===8 && PS.rota===true && PS.rotacion==='media' && Math.abs(PS.porDia-8/V)<0.01, 'vend='+PS.vend+' equipo='+PS.vr+' eduardo='+PS.vu+' '+PS.rotacion+' porDia='+PS.porDia);
  chk('…y lo que pide sale de los 8 del equipo, no de los 80 de Eduardo', PS.pedir>0 && PS.pedir<=Math.ceil(8/V*(3+2+3)), 'pedir '+PS.pedir);
  chk('ATENEA: 3 unidades del equipo en 3 entregas también rota', AT.n===3 && AT.rota===true && AT.porDia>0, 'n='+AT.n+' rota='+AT.rota+' porDia='+AT.porDia);
  F = await filas();
  chk('en la tabla, el HADES dice de quién es: «📦 Pedido único · Eduardo»', /📦 Pedido único · Eduardo/.test(F.HADES||'') && /Eduardo: pedido único/.test(F.HADES||''), (F.HADES||'').slice(0,160));
  chk('…y el POSEIDON separa las cuentas: «Rotación: 8 · Eduardo: 80 excluidas de reserva»', /Rotación: 8 · Eduardo: 80 excluidas de reserva/.test(F.POSEIDON||''), (F.POSEIDON||'').slice(0,160));
  chk('…mientras que el MORFEO de Carola NO lleva el cartel de Eduardo', !/Pedido único/.test(F.MORFEO||''), (F.MORFEO||'').slice(0,120));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
