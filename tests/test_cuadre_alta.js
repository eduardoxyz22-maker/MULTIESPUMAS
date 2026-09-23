/* 🧮 EL CUADRE Y EL EXCEL DEL CONTADOR — los hallazgos de la 2ª auditoría (§4fm…§4fr)

   Seis cosas que movían plata o la escondían, ninguna con test antes:
     §4fm  el Excel de Contabilidad no cerraba ni consigo mismo (COBRADO sin anticipo,
           TOTAL VENTA con anticipo) ni con la tarjeta «Ya ingresó» de la pantalla.
     §4fn  un pago SIN FECHA sobre una venta de otro mes no se avisaba en el mes que se
           estaba cerrando: no está en ningún cuadre y nadie lo nombraba.
     §4fo  un arqueo anotado cuyos pagos después cambiaron de forma quedaba huérfano, no
           entraba en la diferencia, y el panel llegaba a decir «El cuadre cierra ✅».
     §4fp  la ventana verde «✅ Guardado» decía que el pago ya estaba guardado aunque el
           servidor lo hubiera rechazado.
     §4fq  «💵 Anotar el monto» se comía un saldo pendiente.
     §4fr  corregir el adelanto desde el FORMULARIO le borraba al renglón la fecha, el
           recibo y el `>Nombre` de quién tiene el efectivo (§4eq).

   Red cortada, servidor simulado. Se corre:  node tests/test_cuadre_alta.js            */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+extra):''); };
const J=x=>JSON.stringify(x);
const r2=n=>Math.round((Number(n)||0)*100)/100;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  const DLG={ confirm:true, prompt:'' };
  page.on('dialog', async d => { if(d.type()==='prompt') await d.accept(String(DLG.prompt)); else if(DLG.confirm===false) await d.dismiss(); else await d.accept(); });
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    window.__XLSX=null;
    buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
    downloadBlob=function(){};
    window._saveOk=true;
    apiSave=function(r){ return Promise.resolve(window._saveOk?{ok:true, pedido:JSON.parse(JSON.stringify(r))}:{ok:false, error:'busy'}); };
    apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); };
    apiPost=function(){ return Promise.resolve({ok:true}); };
    var al=document.getElementById('admin-lock'); if(al) al.style.display='none';
    var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
    window.hoy=todayStr(); window.MES=window.hoy.slice(0,7);
    var d1=new Date(); d1.setDate(d1.getDate()-1); window.ayer=isoLocal(d1);
    window.ts0=new Date(new Date().setHours(12,0,0,0)).getTime();
    window.P=function(o){
      var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', maps:'', observaciones:'',
              estado:'', entregado:false, chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez',
              fecha:window.hoy, acuenta:0, saldo:0, pagado:false, metodoPago:'', productos:[] };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
  });

  // ══ §4fm · el Excel de Contabilidad tiene que cerrar y coincidir con la pantalla ══
  let r = await page.evaluate(async () => {
    STATE=[
      P({ id:'c1', nota:'1', oc:'09-001', cliente:'CON ADELANTO', ts:ts0, acuenta:400, saldo:0, pagado:true,
          metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:400,fecha:hoy,nota:'1',comps:['A']},
                                  {metodo:'QR',banco:'BISA',monto:600,fecha:hoy,nota:'1',comps:['B']}]),
          productos:[{desc:'COLCHON',cant:1,precio:1000}] }),
      P({ id:'c2', nota:'2', oc:'09-002', cliente:'SIN ADELANTO', ts:ts0+1, acuenta:0, saldo:0, pagado:true,
          metodoPago:textoCobros([{metodo:'Efectivo',monto:800,fecha:hoy,nota:'2',comps:['C']}]),
          productos:[{desc:'COLCHON',cant:1,precio:800}] }),
      P({ id:'c3', nota:'3', oc:'09-003', cliente:'DEBE TODO', ts:ts0+2, acuenta:0, saldo:1200, pagado:false,
          metodoPago:'', productos:[{desc:'COLCHON',cant:1,precio:1200}] })
    ];
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','mes'); document.getElementById('cta-mes').value=MES; setContaModo('mes');
    await new Promise(r=>setTimeout(r,200));
    var pantalla=0; STATE.forEach(function(p){ pantalla=r2(pantalla+contaCobrado(p)); });
    exportConta();
    var m=window.__XLSX[0].matrix, h=m[0].map(function(c){ return c.v; });
    var iC=h.indexOf('TOTAL COBRADO (Bs)'), iS=h.indexOf('SALDO (Bs)'), iT=h.indexOf('TOTAL VENTA (Bs)');
    var num=function(v){ return (v&&typeof v==='object')?(Number(v.v)||0):(Number(v)||0); };
    var sc=0, ss=0, st=0;
    for(var i=1;i<m.length;i++){ sc=r2(sc+num(m[i][iC])); ss=r2(ss+num(m[i][iS])); st=r2(st+num(m[i][iT])); }
    return { sc:sc, ss:ss, st:st, pantalla:pantalla,
             fuente:/contaCobrado\(p\),t:'n'/.test(exportConta.toString()) };
  });
  chk('§4fm · el Excel cierra: Σ(COBRADO) + Σ(SALDO) = Σ(TOTAL VENTA)', r2(r.sc+r.ss)===r.st, r.sc+' + '+r.ss+' = '+r2(r.sc+r.ss)+' vs '+r.st);
  chk('  …y dice lo mismo que la tarjeta «Ya ingresó» de la pantalla', r.sc===r.pantalla && r.sc===1800, 'Excel '+r.sc+' vs pantalla '+r.pantalla);
  chk('  …y el export de verdad usa contaCobrado (no solo la cuenta del test)', r.fuente===true, '');

  // ══ §4fn · un pago SIN FECHA de otra venta no es de ningún mes: se avisa siempre ══
  r = await page.evaluate(async () => {
    var d=new Date(); d.setMonth(d.getMonth()-1); var mesAntes=isoLocal(d);
    STATE=[
      P({ id:'n1', nota:'31', oc:'08-031', cliente:'DEL MES PASADO', fecha:mesAntes, ts:new Date(mesAntes+'T12:00:00').getTime(),
          acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 1500 #31 %A', productos:[{desc:'C',cant:1,precio:1500}] }),
      P({ id:'n2', nota:'33', oc:'09-033', cliente:'DE ESTE MES', ts:ts0+3, acuenta:0, saldo:0, pagado:true,
          metodoPago:'QR BISA 2000 @'+hoy+' #33 %C', productos:[{desc:'C',cant:1,precio:2000}] })
    ];
    segSet('cta-tab','cuadre'); setContaTab('cuadre');
    var mirar=function(m){
      segSet('cua-mode','mes'); document.getElementById('cua-mes').value=m;
      document.getElementById('cua-vendedor').value=''; setCuadreModo('mes');
      var pagos=cuadrePagos(), A=cuadreAlertas(pagos);
      var sf=A.filter(function(a){ return a.k==='sinfecha'; })[0];
      return { hay:!!sf, n:sf?(sf.det||[]).length:0, txt:sf?sf.txt.replace(/<[^>]+>/g,''):'',
               det:sf?(sf.det||[]).map(function(d){ return d.txt; }):[] };
    };
    return { esteMes:mirar(MES), mesPasado:mirar(mesAntes.slice(0,7)) };
  });
  chk('§4fn · cerrando ESTE mes se avisa el pago sin fecha de una venta del mes pasado', r.esteMes.hay===true && r.esteMes.n===1, J(r.esteMes));
  chk('  …y se dice que es de otro mes, con la fecha de la venta', /de otro mes/.test(r.esteMes.txt) && /venta del/.test(r.esteMes.det[0]||''), r.esteMes.txt+' · '+(r.esteMes.det[0]||''));
  chk('  …y en el mes de la venta se sigue avisando UNA sola vez', r.mesPasado.hay===true && r.mesPasado.n===1, J(r.mesPasado));

  // ══ §4fo · un arqueo sin ningún pago detrás no se pierde ni deja decir «cierra» ══
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'a1', nota:'40', oc:'09-040', cliente:'SOLO QR', ts:ts0+4, acuenta:0, saldo:0, pagado:true,
                metodoPago:'QR BISA 2000 @'+hoy+' #40 %C', productos:[{desc:'C',cant:1,precio:2000}] }) ];
    segSet('cta-tab','cuadre'); setContaTab('cuadre');
    segSet('cua-mode','mes'); document.getElementById('cua-mes').value=MES;
    document.getElementById('cua-vendedor').value=''; setCuadreModo('mes');
    ARQUEO={};
    setCuadreArqueo('QR BISA','2000');                 // el extracto cuadra
    renderCuadre();
    var ok=document.getElementById('cua-metrics').textContent.replace(/\s+/g,' ');
    setCuadreArqueo('Efectivo','900');                 // …y alguien contó 900 en caja, sin un solo pago en efectivo
    renderCuadre();
    var con=document.getElementById('cua-metrics').textContent.replace(/\s+/g,' ');
    return { ok:ok, con:con };
  });
  chk('§4fo · con el extracto cuadrado el panel sí dice que el cuadre cierra', /El cuadre cierra/.test(r.ok), r.ok.slice(0,70));
  chk('§4fo · un arqueo de Bs 900 sin ningún pago en efectivo NO deja decir «cierra»', !/El cuadre cierra/.test(r.con), r.con.slice(0,70));
  chk('  …se cuenta como diferencia entera y se nombra', /900/.test(r.con) && /sin ningún pago detrás/.test(r.con), (r.con.match(/(Falta plata|Sobra plata)[^·]*·[^·]*/)||[''])[0].slice(0,140));

  // ══ §4fp · la ventana verde no puede decir «guardado» si el servidor lo rechazó ══
  r = await page.evaluate(async () => {
    var out={};
    STATE=[ P({ id:'w1', nota:'1000', oc:'09-100', cliente:'PAGO RECHAZADO', ts:ts0+5, acuenta:0, saldo:1000, pagado:false,
                metodoPago:'', productos:[{desc:'C',cant:1,precio:1000}] }) ];
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    await new Promise(r=>setTimeout(r,120));
    var registrar=function(){
      showContaModal('w1');
      CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['P1'];
      document.getElementById('cta-pago-monto').value='1000';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='1000';
      ctaRegistrarPago('w1');
    };
    window._saveOk=false; registrar();
    await new Promise(r=>setTimeout(r,200));
    out.mal=document.getElementById('modal-box').textContent.replace(/\s+/g,' ');
    closeModal();
    // y con el servidor sano, la ventana verde de siempre
    STATE=[ P({ id:'w1', nota:'1000', oc:'09-100', cliente:'PAGO OK', ts:ts0+5, acuenta:0, saldo:1000, pagado:false,
                metodoPago:'', productos:[{desc:'C',cant:1,precio:1000}] }) ];
    window._saveOk=true; setContaTab('ventas'); registrar();
    await new Promise(r=>setTimeout(r,200));
    out.bien=document.getElementById('modal-box').textContent.replace(/\s+/g,' ');
    closeModal();
    return out;
  });
  chk('§4fp · con el guardado rechazado la ventana NO dice «ya quedó guardado»', !/ya quedó guardado/.test(r.mal) && !/No tenés que hacer nada más/.test(r.mal), r.mal.slice(0,110));
  chk('  …dice que quedó en el dispositivo y que NO se vuelva a registrar', /NO llegó a la planilla/.test(r.mal) && /No lo vuelvas a registrar/.test(r.mal), r.mal.slice(0,190));
  chk('  …y con el servidor sano sigue saliendo la ventana verde de siempre', /ya quedó guardado/.test(r.bien), r.bien.slice(0,90));

  // ══ §4fq · «Anotar el monto» no se come un saldo pendiente ══
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'m1', nota:'50', oc:'09-050', cliente:'PAGADA CON SALDO', ts:ts0+6, acuenta:0, saldo:500, pagado:true,
                metodoPago:'Efectivo %IMG', productos:[{desc:'C',cant:1,precio:1700}] }) ];
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    await new Promise(r=>setTimeout(r,120));
    showContaModal('m1');
    window.prompt=function(){ return '1200'; };
    ctaAnotarMonto('m1', 0);
    var p=findById('m1'); closeModal();
    return { saldo:r2(Number(p.saldo)||0), cobrado:totalCobrado(p), pagado:!!p.pagado };
  });
  chk('§4fq · anotar Bs 1.200 en una venta con Bs 500 pendientes NO borra la deuda', r.saldo===500 && r.cobrado===1200, J(r));

  // ══ §4fr · corregir el adelanto desde el FORMULARIO conserva fecha, recibo y chofer ══
  r = await page.evaluate(async () => {
    var out={};
    STATE=[ P({ id:'f1', nota:'972', oc:'09-972', cliente:'EFECTIVO DEL CHOFER', ts:ts0+7, acuenta:500, saldo:1000, pagado:false,
                metodoPago:'~Efectivo 500 @'+ayer+' #972 >Luis Pierre %A1',
                productos:[{desc:'C',cant:1,precio:1500}] }) ];
    showView('form'); editPedido('f1');
    /* ⚠️ `editPedido` termina de llenar el formulario un tic después (el refresco que dispara
       `showView`, §4ew): sin esta espera, el 600 se pisa con el 500 del pedido y el test mide
       «guardar sin tocar la plata», que es otro camino. */
    await new Promise(r=>setTimeout(r,150));
    document.getElementById('f-acuenta').value='600';
    document.getElementById('f-saldo').value='900';
    submitPedido();
    await new Promise(r=>setTimeout(r,250));
    var p=findById('f1'), a=anticipoDe(p);
    out.corr={ txt:p.metodoPago, monto:a&&a.monto, fecha:a&&a.fecha, nota:a&&limpiaNota(a.nota), recibio:a&&limpiaRecibio(a.recibio) };
    out.mano=cuadreEfectivo?1:1;
    // ⚠️ y una venta NUEVA con «A cuenta» sigue guardándose como método suelto, como siempre
    resetForm(); EDIT_ID=null;
    var d=new Date(); do { d.setDate(d.getDate()+1); } while(diaDomingo(isoLocal(d))||diaCerrado(isoLocal(d)));
    document.getElementById('f-fecha').value=isoLocal(d);
    document.getElementById('f-vendedor').value='Carola Chavez';
    document.getElementById('f-cliente').value='NUEVA CON ADELANTO';
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. X';
    document.getElementById('f-nota').value='973';
    var pr=document.querySelector('#f-productos .prod-desc'); if(pr) pr.value='COLCHON';
    var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
    document.getElementById('f-acuenta').value='300';
    document.getElementById('f-saldo').value='700';
    segSet('f-metodo','Efectivo'); FORM_COMPS=['N1'];
    submitPedido();
    await new Promise(r=>setTimeout(r,250));
    var n=STATE.filter(function(x){ return x.cliente==='NUEVA CON ADELANTO'; })[0];
    out.nueva=n?n.metodoPago:'(no se guardó)';
    return out;
  });
  chk('§4fr · corregir el adelanto NO pierde quién tiene el efectivo', r.corr.recibio==='Luis Pierre', J(r.corr));
  chk('  …ni le cambia la fecha al pago de ayer', r.corr.fecha===(await page.evaluate(()=>ayer)), J({fecha:r.corr.fecha}));
  chk('  …ni le borra el N° de recibo propio', r.corr.nota==='972' && r.corr.monto===600, J(r.corr));
  chk('  …y una venta NUEVA con «A cuenta» sigue guardándose como método suelto', r.nueva==='Efectivo %N1', r.nueva);

  chk('sin errores JS', errores.length===0, errores.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
