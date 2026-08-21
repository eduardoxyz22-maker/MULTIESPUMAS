/* AUDITORÍA DE CONSISTENCIA — el mismo monto, mirado desde donde sea, tiene que dar igual.
   En una app de plata esto es lo que más importa: si Contabilidad dice una cosa y el Cuadre
   otra, no se sabe cuál creer y se factura o se cobra mal.
   Se arma un juego de ventas DIFÍCILES a propósito (anticipos sin ledger, plata cargada en
   otra computadora, fletes pactados y cobrados, pagos sin fecha, cobros de más, ATC, ROHO,
   mayorista) y se cruzan los cuatro totales por todos sus caminos. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const bs=n=>'Bs '+Number(n).toFixed(2);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:900} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const r = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var d=new Date(); d.setDate(d.getDate()-40); var viejo=isoLocal(d);   // otro mes
    var base={fecha:hoy,turno:'AM',celular:'7',nit:'1',zona:'Norte',direccion:'X',vendedor:'Carola Chavez',ts:ts};
    function P(o){ var q={}; for(var k in base)q[k]=base[k]; for(var k in o)q[k]=o[k]; return q; }
    STATE=[
      // 1. pagada limpia
      P({id:'1', nota:'1', oc:'08-1', cliente:'PAGADA LIMPIA', acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 1000 @'+hoy+' #1 %A', productos:[{desc:'A',cant:1,precio:1000}]}),
      // 2. anticipo + saldo (el anticipo YA está en el ledger)
      P({id:'2', nota:'2', oc:'08-2', cliente:'ANTICIPO EN LEDGER', acuenta:300, saldo:700, pagado:false,
         metodoPago:'~QR BISA 300 @'+hoy+' #2 %B', productos:[{desc:'B',cant:1,precio:1000}]}),
      // 3. anticipo SIN ledger (formato viejo: solo el método suelto)
      P({id:'3', nota:'3', oc:'08-3', cliente:'ANTICIPO SUELTO', acuenta:400, saldo:600, pagado:false,
         metodoPago:'Efectivo %C', productos:[{desc:'C',cant:1,precio:1000}]}),
      // 4. cobrada en OTRA computadora: pagada, sin monto en el ledger, cobradoBs no viajó
      P({id:'4', nota:'4', oc:'08-4', cliente:'DESDE OTRA PC', acuenta:0, saldo:0, pagado:true,
         metodoPago:'QR Ganadero %D', productos:[{desc:'D',cant:1,precio:1500}]}),
      // 5. flete PACTADO sin cobrar + venta con saldo
      P({id:'5', nota:'5', oc:'08-5', cliente:'FLETE PACTADO', acuenta:0, saldo:800, pagado:false,
         metodoPago:'^ 150', productos:[{desc:'E',cant:1,precio:800}]}),
      // 6. flete YA COBRADO + venta pagada
      P({id:'6', nota:'6', oc:'08-6', cliente:'FLETE COBRADO', acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 900 @'+hoy+' #6 %F + ^Efectivo 120 @'+hoy+' #6 %G',
         productos:[{desc:'F',cant:1,precio:900}]}),
      // 7. pago SIN FECHA (no entra en ningún día ni mes, pero sí en "Todo")
      P({id:'7', nota:'7', oc:'08-7', cliente:'PAGO SIN FECHA', acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 500 #7 %H', productos:[{desc:'G',cant:1,precio:500}]}),
      // 8. cobro de MÁS (cobraron 1200 sobre 1000)
      P({id:'8', nota:'8', oc:'08-8', cliente:'COBRO DE MAS', acuenta:0, saldo:-200, pagado:true,
         metodoPago:'Efectivo 1200 @'+hoy+' #8 %I', productos:[{desc:'H',cant:1,precio:1000}]}),
      // 9. venta VIEJA con el pago en otro mes
      P({id:'9', nota:'9', oc:'08-9', cliente:'PAGO OTRO MES', acuenta:0, saldo:0, pagado:true,
         fecha:viejo, ts:ts-40*86400000, metodoPago:'QR BISA 2000 @'+hoy+' #9 %J',
         productos:[{desc:'I',cant:1,precio:2000}]}),
      // 10. venta de TIENDA
      P({id:'10', nota:'10', oc:'08-10', cliente:'DE TIENDA', zona:ZONA_TIENDA, direccion:DIR_TIENDA,
         acuenta:0, saldo:0, pagado:true, metodoPago:'~Efectivo 700 @'+hoy+' #10 %K',
         productos:[{desc:'J',cant:1,precio:700}]}),
      // 11. SIN MONTO ANOTADO
      P({id:'11', nota:'11', oc:'08-11', cliente:'SIN MONTO', acuenta:0, saldo:0, pagado:false,
         metodoPago:'', productos:[{desc:'K',cant:1,precio:1000}]}),
      // --- los que NO tienen que entrar en Contabilidad ni en el Cuadre ---
      P({id:'a1', nota:'90', oc:'ATC-08-1', cliente:'UNA ATC', acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 9999 @'+hoy+' #90 %Z', productos:[{desc:'ATC',cant:1,precio:9999}]}),
      P({id:'r1', nota:'91', oc:'RH-1', vendedor:'ROHO', cliente:'UN ROHO', acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 8888 @'+hoy+' #91', productos:[{desc:'R',cant:1,precio:8888}]}),
      P({id:'m1', nota:'92', oc:'08-92', vendedor:'Eduardo Añez', cliente:'UN MAYORISTA', acuenta:0, saldo:5000,
         pagado:false, metodoPago:'', productos:[{desc:'M',cant:5,precio:1000}]})
    ];
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','todo'); setContaModo('todo');
    segSet('cua-mode','todo');

    var list=contaLista();
    var s=function(f){ var t=0; list.forEach(function(p){ t=r2(t+f(p)); }); return t; };

    // --- CONTABILIDAD ---
    var contaVendido = s(ventaTotal);
    var contaEntro   = s(contaCobrado);
    var contaFalta   = s(contaFaltaCobrar);
    var contaFleteCob= s(envioCobrado);
    var contaFletePen= s(envioPorCobrar);

    // --- CUADRE (mismo período: Todo) ---
    segSet('cta-tab','cuadre'); setContaTab('cuadre'); segSet('cua-mode','todo'); setCuadreModo('todo');
    var pagos=cuadrePagos();
    var cuadreEntro=0; pagos.forEach(function(c){ cuadreEntro=r2(cuadreEntro+c.monto); });
    var cuadreFleteCob=0; pagos.filter(function(c){return c.envio;}).forEach(function(c){ cuadreFleteCob=r2(cuadreFleteCob+c.monto); });
    var cuadreFalta=cuadreSuma(cuadrePendientes(true));
    var cuadreFletePen=cuadreFletesPendTotal();

    // --- quiénes entran ---
    var ids=list.map(function(p){ return p.id; });
    var idsPagos={}; pagos.forEach(function(c){ idsPagos[c.p.id]=1; });

    return {
      contaVendido:contaVendido, contaEntro:contaEntro, contaFalta:contaFalta,
      contaFleteCob:contaFleteCob, contaFletePen:contaFletePen,
      cuadreEntro:cuadreEntro, cuadreFleteCob:cuadreFleteCob,
      cuadreFalta:cuadreFalta, cuadreFletePen:cuadreFletePen,
      ids:ids, idsPagos:Object.keys(idsPagos),
      contaExceso:s(excesoCobro),
      detalle:list.map(function(p){ return { id:p.id, cli:p.cliente,
        total:ventaTotal(p), entro:contaCobrado(p), falta:contaFaltaCobrar(p),
        ledger:totalCobrado(p), ant:(anticipoDe(p)||{}).monto||0,
        fleteCob:envioCobrado(p), fletePen:envioPorCobrar(p), exceso:excesoCobro(p) }; })
    };
  });

  console.log('--- venta por venta (Contabilidad) ---');
  r.detalle.forEach(d=>console.log('  '+String(d.id).padStart(2)+' '+String(d.cli).padEnd(20)+
    ' total='+String(d.total).padStart(6)+' entró='+String(d.entro).padStart(6)+
    ' falta='+String(d.falta).padStart(6)+' (ledger='+d.ledger+' ant='+d.ant+
    ' flete '+d.fleteCob+'/'+d.fletePen+(d.exceso?(' ⚠️exceso='+d.exceso):'')+')'));

  console.log('\n--- los cuatro totales, por los dos caminos ---');
  console.log('  ENTRÓ     · Contabilidad '+bs(r.contaEntro)+' + flete '+bs(r.contaFleteCob)+
              '  vs  Cuadre '+bs(r.cuadreEntro));
  console.log('  FALTA     · Contabilidad '+bs(r.contaFalta)+'  vs  Cuadre '+bs(r.cuadreFalta));
  console.log('  FLETE pdte· Contabilidad '+bs(r.contaFletePen)+'  vs  Cuadre '+bs(r.cuadreFletePen));
  console.log('  VENDIDO   · '+bs(r.contaVendido)+'  =?  entró+falta-exceso = '+
              bs(r.contaEntro+r.contaFalta-r.contaExceso)+'  (exceso '+bs(r.contaExceso)+')');

  const eq=(a,b)=>Math.abs(a-b)<0.01;
  chk('LA PLATA QUE ENTRÓ da igual en Contabilidad y en el Cuadre',
      eq(r.contaEntro + r.contaFleteCob, r.cuadreEntro),
      bs(r.contaEntro+r.contaFleteCob)+' vs '+bs(r.cuadreEntro));
  chk('  el flete cobrado se cuenta una sola vez', eq(r.contaFleteCob, r.cuadreFleteCob),
      bs(r.contaFleteCob)+' vs '+bs(r.cuadreFleteCob));
  chk('LO QUE FALTA COBRAR da igual en las dos vistas', eq(r.contaFalta, r.cuadreFalta),
      bs(r.contaFalta)+' vs '+bs(r.cuadreFalta));
  chk('EL FLETE PENDIENTE da igual en las dos vistas', eq(r.contaFletePen, r.cuadreFletePen),
      bs(r.contaFletePen)+' vs '+bs(r.cuadreFletePen));
  /* La identidad correcta lleva el EXCESO restado: si cobraron de más, lo que entró
     supera lo vendido y esa diferencia no es una venta — es plata que hay que devolver
     o una carga mal hecha. Sin este término la cuenta no cierra nunca. */
  chk('VENDIDO = lo que entró + lo que falta − lo cobrado de más',
      eq(r.contaVendido, r.contaEntro + r.contaFalta - r.contaExceso),
      bs(r.contaVendido)+' vs '+bs(r.contaEntro+r.contaFalta-r.contaExceso));

  console.log('\n--- quiénes entran ---');
  console.log('  Contabilidad:', r.ids.join(', '));
  console.log('  Cuadre (con plata):', r.idsPagos.join(', '));
  chk('la ATC no entra en ninguna de las dos', !r.ids.includes('a1') && !r.idsPagos.includes('a1'));
  chk('ROHO tampoco', !r.ids.includes('r1') && !r.idsPagos.includes('r1'));
  chk('el mayorista tampoco (tiene su propia planilla)', !r.ids.includes('m1') && !r.idsPagos.includes('m1'));
  chk('la venta de tienda SÍ entra', r.ids.includes('10'));
  chk('la venta sin monto SÍ entra (para poder verla y arreglarla)', r.ids.includes('11'));

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
