/* 🧮 Cuadre y conciliación — la pantalla con la que se cierra la caja.
   Lo que la distingue de Contabilidad → Ventas es UNA cosa, y es la que más se malentiende:
   **corta por la fecha del PAGO, no por la de la venta.** Para arquear la caja o cruzar el
   extracto del banco importa cuándo ENTRÓ la plata, no cuándo se vendió. Una venta del 31/07
   cuyo saldo se cobró el 03/08 pone su plata en el cuadre del 03/08.
   Si esto se rompe, el arqueo deja de cerrar y nadie sabe por qué. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const bs=n=>'Bs '+Number(n).toFixed(2);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1100} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const F = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var hoy=todayStr();
    var d1=new Date(); d1.setDate(d1.getDate()-1); var ayer=isoLocal(d1);
    var d2=new Date(); d2.setDate(d2.getDate()-45); var mesPasado=isoLocal(d2);
    var ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var b={turno:'AM',celular:'7',nit:'1',zona:'Norte',direccion:'X',fecha:hoy};
    function P(o){ var q={}; for(var k in b)q[k]=b[k]; for(var k in o)q[k]=o[k]; return q; }
    STATE=[
      /* 1. EL CASO QUE DEFINE LA PANTALLA: vendida el mes pasado, cobrada HOY.
            Su plata tiene que aparecer en el cuadre de HOY, no en el del mes pasado. */
      P({id:'v1', nota:'1', oc:'07-001', vendedor:'Carola Chavez', cliente:'VENDIDA ANTES COBRADA HOY',
         ts:new Date(mesPasado+'T12:00:00').getTime(), acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 1000 @'+hoy+' #1 %A', productos:[{desc:'A',cant:1,precio:1000}]}),
      /* 2. vendida HOY y cobrada AYER (un adelanto que entró antes) */
      P({id:'v2', nota:'2', oc:'08-002', vendedor:'Carola Chavez', cliente:'COBRADA AYER', ts:ts,
         acuenta:400, saldo:600, pagado:false,
         metodoPago:'~QR BISA 400 @'+ayer+' #2 %B', productos:[{desc:'B',cant:1,precio:1000}]}),
      /* 3. dos formas de pago distintas en la misma venta */
      P({id:'v3', nota:'3', oc:'08-003', vendedor:'Maria Flores', cliente:'MITAD Y MITAD', ts:ts+1,
         acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 500 @'+hoy+' #3 %C + QR Ganadero 500 @'+hoy+' #3 %D',
         productos:[{desc:'C',cant:1,precio:1000}]}),
      /* 4. pago SIN FECHA: no puede caer en ningún día ni mes, pero en "Todo" tiene que verse */
      P({id:'v4', nota:'4', oc:'08-004', vendedor:'Maria Flores', cliente:'PAGO SIN FECHA', ts:ts+2,
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 700 #4 %E',
         productos:[{desc:'D',cant:1,precio:700}]}),
      /* 5. con saldo: va a "por cobrar", NO a los pagos */
      P({id:'v5', nota:'5', oc:'08-005', vendedor:'Carola Chavez', cliente:'DEBE TODAVIA', ts:ts+3,
         acuenta:0, saldo:1200, pagado:false, metodoPago:'', productos:[{desc:'E',cant:1,precio:1200}]}),
      /* 6. flete PACTADO sin cobrar: no es plata que entró */
      P({id:'v6', nota:'6', oc:'08-006', vendedor:'Maria Flores', cliente:'FLETE SIN COBRAR', ts:ts+4,
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 800 @'+hoy+' #6 %F + ^ 200',
         productos:[{desc:'F',cant:1,precio:800}]}),
      /* 7. pago sin N° de nota: no se puede cruzar con el talonario */
      P({id:'v7', nota:'7', oc:'08-007', vendedor:'Carola Chavez', cliente:'SIN RECIBO', ts:ts+5,
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 300 @'+hoy+' %G',
         productos:[{desc:'G',cant:1,precio:300}]}),
      /* --- los que NO entran al cuadre --- */
      P({id:'a1', nota:'90', oc:'ATC-08-090', vendedor:'Carola Chavez', cliente:'UNA ATC', ts:ts+6,
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 5000 @'+hoy+' #90',
         productos:[{desc:'ATC',cant:1}]}),
      P({id:'m1', nota:'91', oc:'08-091', vendedor:'Eduardo Añez', cliente:'UN MAYORISTA', ts:ts+7,
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 9000 @'+hoy+' #91',
         productos:[{desc:'M',cant:9}]})
    ];
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    llenarSelectContaVendedor();
    return { hoy:hoy, ayer:ayer, mesPasado:mesPasado };
  });
  await page.waitForTimeout(300);

  const cuadrar = (modo, val, vend) => page.evaluate((a)=>{
    var [modo,val,vend]=a;
    var sv=document.getElementById('cua-vendedor'); if(sv) sv.value=vend||'';
    if(modo==='dia'){ document.getElementById('cua-dia').value=val; }
    if(modo==='mes'){ document.getElementById('cua-mes').value=val; }
    segSet('cua-mode',modo); setCuadreModo(modo);
    var pagos=cuadrePagos(), t=0; pagos.forEach(function(c){ t=r2(t+c.monto); });
    return {
      n:pagos.length, total:t,
      clientes:pagos.map(function(c){ return c.p.cliente; }),
      formas:cuadrePorForma(pagos).map(function(f){ return f.forma+'='+f.monto; }),
      porCobrar:cuadreSuma(cuadrePendientes()),
      fletePend:cuadreFletesPendTotal(),
      avisos:cuadreAlertas(pagos).map(function(x){ return x.ico+' '+x.txt.replace(/<[^>]+>/g,''); })
    };
  }, [modo,val,vend]);

  /* ---------- 0. CÓMO ARRANCA (§4bp) ----------
     Pedido del dueño: *"cuadre y conciliacion al abrir por defecto deberia salir en mes no
     en dia"*. Contabilidad cuadra el mes, no el día suelto.
     ⚠️ Se mide ANTES de que el test fuerce ningún modo — de ahí que vaya primero: apenas
     se llame a `cuadrar(...)` el modo queda pisado y ya no se sabría con qué abrió.
     A diferencia del filtro de Administración (§4bo), acá pasar de Día a Mes AMPLÍA la
     vista —el mes contiene al día—, así que no puede esconder plata que antes se veía. */
  const arranque = await page.evaluate(() => ({
    modo: segVal('cua-mode'),
    veMes: document.getElementById('cua-wrap-mes').style.display!=='none',
    veDia: document.getElementById('cua-wrap-dia').style.display!=='none',
    mes:   document.getElementById('cua-mes').value,
    pagos: cuadrePagos().length
  }));
  chk('el Cuadre abre en «Mes», no en «Día»', arranque.modo==='mes', arranque.modo);
  chk('…y se ve el campo del Mes, no el del Día',
      arranque.veMes===true && arranque.veDia===false, 'mes '+arranque.veMes+' · día '+arranque.veDia);
  chk('…con el mes en curso ya puesto', arranque.mes===F.hoy.slice(0,7), arranque.mes);
  const soloHoy = await page.evaluate(() => {
    segSet('cua-mode','dia'); document.getElementById('cua-dia').value=todayStr(); setCuadreModo('dia');
    return cuadrePagos().length;
  });
  chk('⚠️ y abrir en «Mes» muestra MÁS plata que «Día», no menos (el mes contiene al día)',
      arranque.pagos>soloHoy, 'mes '+arranque.pagos+' pagos · día '+soloHoy);

  // ---------- 1. LO QUE DEFINE LA PANTALLA: corta por la fecha del PAGO ----------
  let r = await cuadrar('dia', F.hoy, '');
  chk('la venta del mes pasado COBRADA HOY entra en el cuadre de hoy',
      r.clientes.includes('VENDIDA ANTES COBRADA HOY'), r.clientes.join(', '));
  chk('  y la vendida hoy pero COBRADA AYER no entra',
      !r.clientes.includes('COBRADA AYER'), r.clientes.join(', '));

  r = await cuadrar('dia', F.ayer, '');
  chk('esa misma plata aparece en el cuadre de AYER', r.clientes.includes('COBRADA AYER') && r.total===400,
      bs(r.total)+' · '+r.clientes.join(', '));

  // ---------- 2. el pago sin fecha: invisible por día, visible en "Todo" ----------
  r = await cuadrar('dia', F.hoy, '');
  const sinFechaEnDia = r.clientes.includes('PAGO SIN FECHA');
  r = await cuadrar('todo', '', '');
  chk('el pago SIN FECHA no cae en ningún día…', sinFechaEnDia===false, '');
  chk('  …pero en «Todo» sí aparece (si no, era invisible para siempre)',
      r.clientes.includes('PAGO SIN FECHA'), '');

  // ---------- 3. las formas de pago se separan por banco ----------
  r = await cuadrar('dia', F.hoy, '');
  chk('cada forma de pago se cuenta aparte, con su banco',
      r.formas.some(f=>/^Efectivo=/.test(f)) && r.formas.some(f=>/^QR Ganadero=/.test(f)),
      r.formas.join(' · '));

  // ---------- 4. lo que NO es plata que entró ----------
  chk('la venta con saldo NO figura como plata cobrada', !r.clientes.includes('DEBE TODAVIA'), '');
  // 1.200 de "DEBE TODAVIA" + 600 que le quedan a "COBRADA AYER" (pagó 400 de 1.000)
  chk('  pero sí en «por cobrar», junto con el saldo de la que pagó a cuenta',
      r.porCobrar===1800, bs(r.porCobrar));
  chk('el flete PACTADO sin cobrar no cuenta como ingreso', !r.formas.join(' ').includes('200'), r.formas.join(' · '));
  chk('  y sí aparece como flete pendiente', r.fletePend===200, bs(r.fletePend));

  // ---------- 5. quiénes quedan afuera ----------
  chk('la ATC no entra al cuadre', !r.clientes.includes('UNA ATC'), r.clientes.join(', '));
  chk('el mayorista tampoco (el cuadre es la caja del equipo)', !r.clientes.includes('UN MAYORISTA'), '');

  // ---------- 6. el filtro por vendedora recorta TODO ----------
  const soloCarola = await cuadrar('todo', '', 'Carola Chavez');
  const soloMaria  = await cuadrar('todo', '', 'Maria Flores');
  chk('filtrando por Carola solo se ven sus cobros',
      soloCarola.clientes.every(c=>/COBRADA|VENDIDA ANTES|SIN RECIBO/.test(c)) && soloCarola.clientes.length>0,
      soloCarola.clientes.join(', '));
  // los dos saldos son de Carola; Maria no tiene ninguno
  chk('  y su «por cobrar» también se recorta', soloCarola.porCobrar===1800 && soloMaria.porCobrar===0,
      'Carola '+bs(soloCarola.porCobrar)+' · Maria '+bs(soloMaria.porCobrar));
  chk('  y el flete pendiente es el de ella', soloMaria.fletePend===200 && soloCarola.fletePend===0,
      'Maria '+bs(soloMaria.fletePend)+' · Carola '+bs(soloCarola.fletePend));

  // ---------- 7. los avisos de «Revisar antes de cerrar» ----------
  r = await cuadrar('todo', '', '');
  const avisos = r.avisos.join(' || ');
  chk('avisa de los pagos sin N° de nota de venta', /sin N° de nota/.test(avisos), '');
  chk('avisa de los pagos sin fecha', /sin fecha/.test(avisos), '');
  chk('avisa de los fletes sin cobrar', /recargo por entrega sin cobrar/.test(avisos), '');
  chk('avisa de las ventas sin cargar al sistema', /sin cargar al sistema/.test(avisos), '');
  console.log('   avisos:', r.avisos.map(a=>a.slice(0,58)).join('\n            '));

  // ---------- 8. el total del período cierra con el detalle ----------
  r = await page.evaluate(()=>{
    segSet('cua-mode','todo'); setCuadreModo('todo');
    var sv=document.getElementById('cua-vendedor'); if(sv) sv.value='';
    renderCuadre();
    var pagos=cuadrePagos(), suma=0; pagos.forEach(function(c){ suma=r2(suma+c.monto); });
    var porForma=cuadrePorForma(pagos), sf=0; porForma.forEach(function(f){ sf=r2(sf+f.monto); });
    return { suma:suma, porForma:sf, enPantalla:(document.getElementById('cua-metrics')||{}).textContent||'' };
  });
  chk('la suma por forma de pago da igual que el total', Math.abs(r.suma-r.porForma)<0.01,
      bs(r.suma)+' vs '+bs(r.porForma));
  chk('  y ese total se ve en pantalla', r.enPantalla.replace(/\s/g,'').includes(fmtSinEspacios(r.suma)),
      r.enPantalla.replace(/\s+/g,' ').slice(0,90));

  // ---------- 9. el texto para WhatsApp dice de qué período habla ----------
  r = await page.evaluate(()=>{
    segSet('cua-mode','dia'); document.getElementById('cua-dia').value=todayStr(); setCuadreModo('dia');
    var t=cuadreTexto();
    segSet('cua-mode','todo'); setCuadreModo('todo');
    return { dia:t, todo:cuadreTexto() };
  });
  chk('el texto para copiar dice el día del que habla', /\d{2}\/\d{2}\/\d{4}/.test(r.dia), r.dia.split('\n')[0]);
  chk('  y en «Todo» lo dice también', /todo el historial/i.test(r.todo), r.todo.split('\n')[0]);

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();

function fmtSinEspacios(n){
  return 'Bs'+n.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});
}
