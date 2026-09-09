/* 🎯 ROTACIÓN: 3 entregas distintas DEL EQUIPO, y los pedidos de Eduardo afuera (§4dj).

   La regla dio la vuelta entera tres veces entre el 07 y el 09/09; ESTA es la que quedó, y
   es la suma de las dos cosas que pidió el dueño:
     · 07/09, mirando el MORFEO: *"solo debés mandar a producir PRODUCTOS que tienen
       ROTACIÓN. Una única entrega o 2 en 1 mes no es tener rotación, eso es pedido único"*.
     · 09/09 (mañana): *"que las ventas de Eduardo no entran a pedir productos ni rotación ni
       nada"* → los pedidos del dueño van aparte.
     · 09/09 (tarde), con el MORFEO otra vez en «🚨 PEDIR YA» porque la primera condición se
       había quitado: *"el morfeo solo tiene una única entrega y está mandado a pedir, creí
       que ya teníamos bien definido cuándo pedir fabricar"*. → LAS DOS, JUNTAS.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Con menos de 3 ENTREGAS del equipo no se estima ritmo: `porDia` = 0, el producto no
      entra en la lista de fábrica ni en el mensaje, aunque sean 45 unidades en una venta.
   2. Los pedidos de EDUARDO no cuentan para nada de la reserva, aunque sean cinco entregas.
   3. Pero lo VENDIDO Y SIN ENTREGAR se cubre igual, en los tres niveles: eso no es una
      estimación, está vendido, y si no hay stock hay que conseguirlo.
   4. Con 3 entregas o más del equipo, todo sigue como siempre: el ritmo vale y avisa.
   5. Lo vendido se sigue MOSTRANDO (45 en 15 días · 1 entrega), y se dice de quién es.

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

  const faltan = await page.evaluate(() => ['stockData','stockAvisoDe','stockCuantoPedir','copiarStock','stockPedidoUnico','stockSoloEduardo']
    .filter(f => typeof window[f] !== 'function').concat(typeof window.STOCK_VENTAS_MIN==='number'?[]:['STOCK_VENTAS_MIN']));
  if(faltan.length){
    chk('el panel exige 3 entregas del equipo y deja a Eduardo afuera (§4dj)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* El escenario:
       · MORFEO   — Carola, 45 unidades en UNA sola entrega, ya entregada, nada pendiente.
       · HERA     — Carola, 45 unidades en 2 entregas (el dueño dijo «o 2»).
       · ARES     — Carola, 45 unidades en 15 entregas repartidas en toda la ventana.
       · ARTEMISA — 1 sola entrega, pero de 6 unidades TODAVÍA SIN ENTREGAR y sin stock.
       · HERMES   — Carola, 3 entregas de 1 unidad: pocas unidades, pero SÍ rota.
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
            P({id:'x1', fecha:adel(2), cliente:'Espera 6', productos:pr('ARTEMISA',6)}) ];
    for(var j=1;j<=3;j++) STATE.push(P({id:'he'+j, fecha:atras(j*2), entregado:true, productos:pr('HERMES',1)}));
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
    d.lista.forEach(function(x){ o[x.desc]={ vend:x.vendidos, n:x.nVentas, nEq:x.nVentasRotacion, rota:x.rota, rotacion:x.rotacion,
      porDia:x.porDia, porDiaReal:Math.round(x.porDiaReal*100)/100, vr:x.vendidosRotacion, vu:x.vendidosUnicos,
      dias:x.dias, aviso:x.aviso, pedir:x.pedir, comp:x.comp, dep:x.deposito, soloEd:stockSoloEduardo(x) }; });
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
  const V = await page.evaluate(() => STOCK_VENTANA);

  // ══ 1. El caso del dueño: 45 en UNA entrega ═══════════════════════════════
  console.log('\n── 1. El MORFEO: 45 en UNA entrega → pedido único, no se pide ──');
  const M=r.o.MORFEO||{};
  chk('se siguen viendo las 45 unidades vendidas', M.vend===45, JSON.stringify(M.vend));
  chk('…y que salieron en 1 sola entrega', M.n===1 && M.nEq===1, M.n);
  chk('⚠️ NO cuenta como rotación: 1 entrega es menos que las 3 que hacen falta', M.rota===false && M.rotacion==='baja', 'rota='+M.rota+' '+M.rotacion);
  /* La cuenta cruda (45÷15) da 3 exacto; lo que no puede pasar es que `porDia` —la que se
     usa de verdad— sea distinta de 0. */
  chk('⚠️ no se le inventa un ritmo: 0 por día (la cuenta cruda da 3, no 0)', M.porDia===0 && M.porDiaReal===3, M.porDia+' · crudo '+M.porDiaReal);
  chk('⚠️ y entonces NO «se corta hoy»: no hay nada que se corte', M.dias===null, JSON.stringify(M.dias));
  chk('⚠️ el aviso es «pedido único», no 🚨 PEDIR YA', M.aviso==='unico', M.aviso);
  chk('⚠️ no sugiere pedir 8 ni nada', M.pedir===0, M.pedir);
  chk('⚠️ …y no entra en el mensaje para la fábrica', r.urgentes.indexOf('MORFEO')<0 && !/MORFEO/.test(r.msg), r.urgentes.join(', ')||'ninguno');
  chk('…y como no es de Eduardo, el cartel no lleva su nombre', M.soloEd===false);

  // ══ 2. Dos entregas tampoco es rotación ═══════════════════════════════════
  console.log('\n── 2. «Una única entrega o 2 en 1 mes no es tener rotación» ──');
  const H=r.o.HERA||{};
  chk('45 unidades en 2 entregas tampoco es rotación', H.nEq===2 && H.rota===false && H.porDia===0, 'entregas='+H.nEq+' rota='+H.rota);
  chk('…y tampoco se pide', H.aviso==='unico' && H.pedir===0 && !/HERA/.test(r.msg), H.aviso+' · pedir '+H.pedir);

  // ══ 3. Con 3 entregas o más, todo sigue igual ═════════════════════════════
  console.log('\n── 3. Lo que SÍ rota sigue avisando ──');
  const A=r.o.ARES||{};
  chk('45 unidades en 15 entregas es rotación alta', A.nEq===15 && A.rota===true && A.rotacion==='alta' && A.porDia>1.5, 'entregas='+A.nEq+' porDia='+A.porDia);
  chk('⚠️ se corta y avisa que hay que pedir', (A.aviso==='urgente'||A.aviso==='pedir') && A.pedir>0, A.aviso+' · pedir '+A.pedir);
  chk('…y entra en el mensaje para la fábrica', /ARES/.test(r.msg) && r.urgentes.indexOf('ARES')>=0, r.urgentes.join(', '));
  const HM=r.o.HERMES||{};
  chk('⚠️ 3 unidades en 3 entregas SÍ rotan: son pocas, pero la venta se repite', HM.nEq===3 && HM.rota===true && HM.rotacion==='media' && HM.porDia>0, 'entregas='+HM.nEq+' '+HM.rotacion+' porDia='+HM.porDia);

  // ══ 4. Sin rotación, pero vendido y sin entregar ══════════════════════════
  console.log('\n── 4. Sin rotación, pero vendido y sin entregar ──');
  const X=r.o.ARTEMISA||{};
  /* ⚠️ `vendidos` se mide por FECHA DE SALIDA y esta entrega es de pasado mañana: todavía no
     entró a la ventana, así que son 0 vendidas. Da igual: las 6 comprometidas mandan solas. */
  chk('una entrega futura: no hay rotación de la que deducir un ritmo', X.nEq===0 && X.rota===false && X.porDia===0, 'entregas='+X.nEq+' rota='+X.rota);
  chk('⚠️ pero los 6 vendidos sin entregar SÍ se cuentan', X.comp===6, X.comp);
  chk('⚠️ y como no hay stock, igual avisa que hay que conseguirlos',
      (X.aviso==='urgente'||X.aviso==='pedir') && X.pedir===6, X.aviso+' · pedir '+X.pedir);
  chk('…y el mensaje lo pide sin inventar un ritmo ni decir «0 en 0 entregas»',
      /ARTEMISA/.test(r.msg) && /es para un pedido puntual/.test(r.msg) && !/0 en 0 entregas/.test(r.msg) && !/ARTEMISA[^\n]*\n[^\n]*por d[íi]a/.test(r.msg),
      (r.msg.match(/[^\n]*ARTEMISA[^\n]*\n[^\n]*/)||[''])[0].replace(/\s+/g,' ').slice(0,130));

  // ══ 5. En la pantalla se ve el dato, no desaparece ════════════════════════
  console.log('\n── 5. Lo que se ve en la tabla ──');
  let F = await filas();
  chk('el MORFEO sigue en la tabla con sus 45 vendidas y 1 entrega', (F.MORFEO||'').indexOf('45 en '+V+' días · 1 entrega')>=0, (F.MORFEO||'').slice(0,110));
  chk('…con el cartel «📦 Pedido único» y sin el «· Eduardo»', /📦 Pedido único/.test(F.MORFEO||'') && !/· Eduardo/.test(F.MORFEO||''), (F.MORFEO||'').slice(0,150));
  chk('…y la leyenda «Poca rotación: solo pedidos confirmados», sin «PEDIR YA»',
      /Poca rotación: solo pedidos confirmados/.test(F.MORFEO||'') && !/PEDIR YA/.test(F.MORFEO||''), (F.MORFEO||'').slice(0,170));
  chk('…y la explicación dice qué se hace, no repite el dato', /no se repone por las dudas/.test(F.MORFEO||''), (F.MORFEO||'').slice(-140));
  chk('el ARES, que rota, muestra sus 15 entregas y «Rotación alta»', /15 entregas/.test(F.ARES||'') && /Rotación alta/.test(F.ARES||''), (F.ARES||'').slice(0,120));

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
  chk('⚠️ HADES: Eduardo vendió 45 en 5 entregas — se ve, pero NO es rotación',
      HD.vend===45 && HD.n===5 && HD.vu===45 && HD.vr===0 && HD.nEq===0 && HD.rota===false && HD.porDia===0, 'vend='+HD.vend+' entregas suyas='+HD.n+' del equipo='+HD.nEq+' porDia='+HD.porDia);
  chk('⚠️ …aviso «pedido único», sin pedir ni entrar al mensaje', HD.aviso==='unico' && HD.pedir===0 && !/HADES/.test(r.msg), HD.aviso+' · pedir '+HD.pedir);
  chk('⚠️ POSEIDON: los 80 de Eduardo no cuentan, y los 8 de Carola son UNA entrega → tampoco rota',
      PS.vend===88 && PS.vu===80 && PS.vr===8 && PS.nEq===1 && PS.rota===false && PS.aviso==='unico' && PS.pedir===0, 'vend='+PS.vend+' equipo='+PS.vr+' en '+PS.nEq+' entrega · '+PS.aviso);
  chk('ATENEA: 3 entregas del equipo, de 1 unidad cada una, SÍ rotan', AT.nEq===3 && AT.rota===true && AT.porDia>0, 'entregas='+AT.nEq+' rota='+AT.rota+' porDia='+AT.porDia);
  F = await filas();
  chk('en la tabla, el HADES dice de quién es: «📦 Pedido único · Eduardo»', /📦 Pedido único · Eduardo/.test(F.HADES||'') && /Eduardo: pedido único/.test(F.HADES||''), (F.HADES||'').slice(0,160));
  chk('…y el POSEIDON separa las cuentas: «Equipo: 8 en 1 entrega · Eduardo: 80»',
      /Equipo: 8 en 1 entrega · Eduardo: 80 \(no cuentan para la reserva\)/.test(F.POSEIDON||''), (F.POSEIDON||'').slice(0,200));
  chk('…pero como parte fue del equipo, su cartel NO dice «· Eduardo»', /📦 Pedido único/.test(F.POSEIDON||'') && !/Pedido único · Eduardo/.test(F.POSEIDON||''), (F.POSEIDON||'').slice(0,150));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
