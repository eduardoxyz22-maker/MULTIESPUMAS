/* 🎯 ROTACIÓN vs PEDIDO ÚNICO — de qué se deduce cuánto reponer (§4da).

   El dueño, mirando el renglón del MORFEO en su panel (45 vendidos, 0 en el corte,
   «🚨 PEDIR YA · la fábrica tarda 3 días → pedí 23 ya»):

     *"El colchón morfeo ya se entregó y dice mandar a pedir. ¿Qué pasa si es un pedido
     único? Que ya se entregó… y lo marcás como mandar a pedir. Solo debés mandar a producir
     PRODUCTOS que tienen ROTACIÓN. Una única entrega o 2 en 1 mes no es tener rotación, eso
     es pedido único."*

   El panel dividía lo vendido por los 28 días de la ventana y de ahí sacaba un ritmo, sin
   preguntarse nunca en cuántas ENTREGAS se había vendido. Una venta mayorista de 45
   colchones, ya entregada y sin nada pendiente, daba «1,6 por día» y pedía 23 más.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Con menos de 3 entregas en el mes NO se estima ritmo: `porDia` vale 0 y el producto no
      entra en la lista de fábrica ni en el mensaje.
   2. Pero lo VENDIDO Y SIN ENTREGAR se sigue cubriendo: eso no es una estimación, está
      vendido, y si no hay stock hay que pedirlo igual aunque sea la primera vez que se vende.
   3. Con 3 entregas o más todo sigue como antes: el ritmo vale y avisa.
   4. Lo vendido se sigue MOSTRANDO (45 en 28 días), con las entregas al lado, para que
      quien mire vea el dato y no crea que el panel lo perdió.

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

  const faltan = await page.evaluate(() => ['stockData','stockAvisoDe','stockCuantoPedir','copiarStock']
    .filter(f => typeof window[f] !== 'function').concat(typeof window.STOCK_VENTAS_MIN==='number'?[]:['STOCK_VENTAS_MIN']));
  if(faltan.length){
    chk('el panel distingue rotación de pedido único (§4da)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* El escenario reproduce el caso real del dueño y sus vecinos:
       · MORFEO   — 45 unidades en UNA sola entrega, ya entregada, nada pendiente.
       · HERA     — 45 unidades en 2 entregas: sigue siendo pedido único (el dueño dijo «o 2»).
       · ARES     — 45 unidades en 15 entregas: eso SÍ es rotación.
       · ARTEMISA — 1 sola entrega, pero de 6 unidades TODAVÍA SIN ENTREGAR y sin stock:
                    no hay ritmo, pero la venta existe y hay que conseguirlas.
     Ninguno figura en el corte del almacén, así que todos están en cero (§4ct).
     ⚠️ LAS 15 ENTREGAS DE ARES SE REPARTEN DENTRO DE LA VENTANA ACTUAL, LEÍDA EN VIVO
     (§4dc) — no en los días 1 a 15 fijos. `STOCK_VENTANA` ya bajó una vez de 28 a 15 sin
     avisar a este test (day 15 quedó FUERA de una ventana de 15: el borde es
     `diasAtras(STOCK_VENTANA-1)`), y las 15 entregas de ARES pasaron de contar 15 a contar
     14 sin que nadie tocara este archivo. Si la ventana vuelve a cambiar, este reparto
     sigue cayendo adentro solo. */
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
    d.lista.forEach(function(x){ o[x.desc]={ vend:x.vendidos, n:x.nVentas, rota:x.rota, porDia:x.porDia,
      porDiaReal:Math.round(x.porDiaReal*100)/100, dias:x.dias, aviso:x.aviso, pedir:x.pedir, comp:x.comp, dep:x.deposito }; });
    var t=''; var g=window.copyText; window.copyText=function(s){ t=s; }; copiarStock(); window.copyText=g;
    return { o:o, msg:t, urgentes:d.lista.filter(function(x){ return x.aviso==='urgente'||x.aviso==='pedir'; }).map(function(x){ return x.desc; }) };
  });
  let r = await foto();

  // ══ 1. El caso del dueño: 45 en una entrega, ya entregadas ════════════════
  console.log('\n── 1. El MORFEO: 45 en UNA entrega, ya entregado ──');
  const M=r.o.MORFEO||{};
  chk('se siguen viendo las 45 unidades vendidas', M.vend===45, JSON.stringify(M.vend));
  chk('…y que salieron en 1 sola entrega', M.n===1, M.n);
  chk('⚠️ NO cuenta como rotación', M.rota===false, 'rota='+M.rota);
  /* §4dc: la cuenta cruda (45÷STOCK_VENTANA) ya no da 1,6 — con la ventana de 15 días da 3
     exacto (45÷15). El número cambia con la ventana; lo que NO puede cambiar es que
     `porDia` (la que se usa de verdad) se quede en 0 igual, aunque la cruda sea alta. */
  chk('⚠️ no se le inventa un ritmo: 0 por día (la cuenta cruda da 3, no 0)',
      M.porDia===0 && M.porDiaReal>0, M.porDia+' · crudo '+M.porDiaReal);
  chk('⚠️ y entonces NO «se corta hoy»: no hay nada que se corte', M.dias===null, JSON.stringify(M.dias));
  chk('⚠️ el aviso deja de ser 🚨 PEDIR YA y pasa a «pedido único»', M.aviso==='unico', M.aviso);
  chk('⚠️ no sugiere pedir 23 ni nada', M.pedir===0, M.pedir);
  chk('⚠️ …y no entra en el mensaje para la fábrica',
      r.urgentes.indexOf('MORFEO')<0 && !/MORFEO/.test(r.msg), r.urgentes.join(', ')||'ninguno');

  // ══ 2. Dos entregas tampoco es rotación ═══════════════════════════════════
  console.log('\n── 2. «Una única entrega o 2 en 1 mes no es tener rotación» ──');
  const H=r.o.HERA||{};
  chk('45 unidades en 2 entregas tampoco es rotación', H.n===2 && H.rota===false && H.porDia===0, 'n='+H.n+' rota='+H.rota);
  chk('…y tampoco se pide', H.aviso==='unico' && H.pedir===0 && !/HERA/.test(r.msg), H.aviso+' · pedir '+H.pedir);

  // ══ 3. Con rotación, todo sigue como antes ════════════════════════════════
  console.log('\n── 3. Lo que SÍ rota sigue avisando ──');
  const A=r.o.ARES||{};
  chk('45 unidades en 15 entregas SÍ es rotación', A.n===15 && A.rota===true && A.porDia>1.5, 'n='+A.n+' porDia='+A.porDia);
  chk('⚠️ se corta y avisa que hay que pedir', (A.aviso==='urgente'||A.aviso==='pedir') && A.pedir>0, A.aviso+' · pedir '+A.pedir);
  chk('…y entra en el mensaje para la fábrica', /ARES/.test(r.msg) && r.urgentes.indexOf('ARES')>=0, r.urgentes.join(', '));

  // ══ 4. Lo vendido sin entregar se cubre igual ═════════════════════════════
  /* El punto más delicado: sin rotación no se ESTIMA nada, pero lo que ya está vendido no es
     una estimación. Si alguien vendió 6 para pasado mañana y no hay, hay que conseguirlos. */
  console.log('\n── 4. Sin rotación, pero vendido y sin entregar ──');
  const X=r.o.ARTEMISA||{};
  /* ⚠️ `vendidos` se mide por FECHA DE SALIDA y esta entrega es de pasado mañana: todavía no
     entró a la ventana de 28 días, así que son 0 vendidas y 0 entregas. Da igual para lo que
     importa acá — sin rotación no se estima nada— y las 6 comprometidas mandan solas. */
  chk('una entrega futura: no hay rotación de la que deducir un ritmo', X.n===0 && X.rota===false && X.porDia===0, 'n='+X.n+' rota='+X.rota);
  chk('⚠️ pero los 6 vendidos sin entregar SÍ se cuentan', X.comp===6, X.comp);
  chk('⚠️ y como no hay stock, igual avisa que hay que conseguirlos',
      (X.aviso==='urgente'||X.aviso==='pedir') && X.pedir===6, X.aviso+' · pedir '+X.pedir);
  chk('…y el mensaje lo pide sin inventar un ritmo ni decir «0 en 0 entregas»',
      /ARTEMISA/.test(r.msg) && /es para un pedido puntual/.test(r.msg) && !/0 en 0 entregas/.test(r.msg) && !/ARTEMISA[^\n]*\n[^\n]*por d[íi]a/.test(r.msg),
      (r.msg.match(/[^\n]*ARTEMISA[^\n]*\n[^\n]*/)||[''])[0].replace(/\s+/g,' ').slice(0,130));

  // ══ 5. En la pantalla se ve el dato, no desaparece ════════════════════════
  console.log('\n── 5. Lo que se ve en la tabla ──');
  const rr = await page.evaluate(() => ({ v:STOCK_VENTANA, txt:(()=>{ abrirStock(); return ((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' '); })() }));
  r = rr.txt;
  chk('el MORFEO sigue en la tabla con sus 45 vendidas y 1 entrega',
      /MORFEO/.test(r) && r.indexOf('45 en '+rr.v+' días · 1 entrega')>=0, (r.match(/MORFEO[^·]*·[^0-9]*[^|]{0,90}/)||[''])[0].slice(0,110));
  chk('…con el cartel «📦 Pedido único» y la explicación', /📦 Pedido único/.test(r) && /pedido puntual, no una venta que se repita/.test(r));
  chk('…y ya NO dice «PEDIR YA» para él', !/MORFEO · 140x190[\s\S]{0,240}PEDIR YA/.test(r));
  chk('el ARES, que rota, sí muestra su ritmo por día', /ARES · 140x190 [\s\S]{0,80}15 entregas/.test(r) || /15 entregas/.test(r), (r.match(/[^ ]*15 entregas[^·]*/)||[''])[0]);

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
