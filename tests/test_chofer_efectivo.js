/* 🚚💵 EL EFECTIVO QUE RECIBE EL CHOFER (§4eq).

   El dueño, 18/09: *"En la lista de personas que retiran efectivo faltan los choferes. A veces
   le pagan a ellos el cliente y las vendedoras hacen también una nota de ese efectivo, pero
   ¿cómo hacemos que reporten que fue el chofer que recibió?"*. Y el circuito: *"el chofer la
   recibe y entrega a Contabilidad, no la recibe ni la vendedora ni Eduardo"*.

   Hasta acá el panel contaba TODO cobro en efectivo como de la vendedora de la venta: la plata
   que el cliente le pagaba al chofer en la puerta le quedaba «en la mano» a ella, y no había
   forma de anotarle un retiro al chofer (no estaba en la lista).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Cada cobro en efectivo puede decir QUIÉN lo recibió (`>Nombre` pegado a la nota), y el
      formato viejo se sigue leyendo igual.
   2. El cobro que anota el chofer desde su ficha queda con fecha de hoy y a su nombre.
   3. El Cuadre agrupa el efectivo por quién lo TIENE: la vendedora o el chofer, cada uno con
      lo que se le retiró. Con el filtro por vendedora, lo del chofer se aparta y se dice.
   4. En el retiro, «Quién entrega» lista a los choferes y «Quién retira» pasa a Contabilidad.
   5. Contabilidad puede marcar «lo recibió el chofer» al registrar o corregir un pago.
   6. Giordano ya no está en los camiones, pero un pedido viejo con su nombre lo sigue mostrando.

   Se corre:  node tests/test_chofer_efectivo.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept('500'));            // el chofer contesta «500» al ¿cuánto cobraste?
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['pagoRecibio','limpiaRecibio','cuadreEfectivo','choferesConocidos','esChoferNombre','retEntregaCambio','ctaRecibioHtml','ctaSetRecibio','ctaEditRecibio','choferesParaSelect']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel sabe quién recibió el efectivo (§4eq)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  // ══ 1. El formato ═══════════════════════════════════════════════════════════
  console.log('\n── 1. Quién recibió, pegado a la nota ──');
  let r = await page.evaluate(() => {
    var a=parseCobros('Efectivo 500 @2026-09-18 #1004 >Luis Pierre %IMG')[0];
    var b=parseCobros('Efectivo 500 @2026-09-18 # >Luis Pierre')[0];
    var c=parseCobros('QR BISA 900 @2026-09-18 #3 %I1')[0];
    var d=parseCobros('Efectivo 1000 @2026-09-18 #10 + Efectivo 200 @2026-09-18 #11 >Miguel %Z + ^ Efectivo 50 @2026-09-18 #12 >Miguel');
    return { a:a, b:b, c:c, d:d,
      ida:textoCobros([{metodo:'Efectivo',monto:500,fecha:'2026-09-18',nota:'1004',recibio:'Luis Pierre',comps:['IMG']}]),
      sinNota:textoCobros([{metodo:'Efectivo',monto:500,fecha:'2026-09-18',nota:'',recibio:'Luis Pierre',comps:[]}]),
      vuelta:textoCobros(parseCobros('Efectivo 500 @2026-09-18 #1004 >Luis Pierre %IMG')),
      limpia:limpiaNota('12>3'), limpiaR:limpiaRecibio(' Luis > Pierre #') };
  });
  chk('⚠️ «#1004 >Luis Pierre» se lee como nota 1004 y recibió Luis Pierre, con su imagen', r.a.nota==='1004' && r.a.recibio==='Luis Pierre' && r.a.comps.join()==='IMG' && r.a.monto===500, JSON.stringify(r.a));
  chk('sin nota también: «# >Luis Pierre»', r.b.nota==='' && r.b.recibio==='Luis Pierre', JSON.stringify(r.b));
  chk('lo viejo (sin «>») sigue igual: recibió vacío = la vendedora', r.c.recibio==='' && r.c.nota==='3' && r.c.banco==='BISA', JSON.stringify(r.c));
  chk('varios cobros en la misma venta, cada uno con lo suyo (el recargo también)', r.d.length===3 && r.d[0].recibio==='' && r.d[1].recibio==='Miguel' && r.d[1].comps.join()==='Z' && r.d[2].envio===true && r.d[2].recibio==='Miguel', JSON.stringify(r.d.map(x=>[x.nota,x.recibio,x.envio])));
  chk('se escribe igual que se lee (ida y vuelta)', r.ida==='Efectivo 500 @2026-09-18 #1004 >Luis Pierre %IMG' && r.vuelta===r.ida && r.sinNota==='Efectivo 500 @2026-09-18 # >Luis Pierre', r.ida+' | '+r.sinNota);
  chk('el «>» no puede colarse en una nota ni en un nombre tipeado a mano', r.limpia==='12 3' && r.limpiaR==='Luis Pierre', r.limpia+' | '+r.limpiaR);

  // ══ 2. La planilla del test ═════════════════════════════════════════════════
  const F = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok'; if(CARGA_TIMER){clearTimeout(CARGA_TIMER);CARGA_TIMER=null;} if(CARGA_TIC){clearInterval(CARGA_TIC);CARGA_TIC=null;}
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiDelete=function(){ return Promise.resolve({ok:true}); };
    apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
    /* ⚠️ La foto de la planilla se toma cuando la promesa RESUELVE, no cuando se llama:
       `showView` pide la lista y en el mismo tirón el test anota un cobro; con la foto
       tomada antes, al resolver pisaba el cobro recién hecho. Y van también las filas de
       retiros (`__ret_…`): el cargador las separa de la lista, como en la planilla real. */
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true,pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var b={turno:'AM',celular:'7',nit:'1',zona:'Norte',direccion:'X',fecha:hoy};
    function P(o){ var q={}; for(var k in b)q[k]=b[k]; for(var k in o)q[k]=o[k]; return q; }
    STATE=[
      /* v1: Carola cobró en la tienda → la plata la tiene ella */
      P({id:'v1', nota:'10', oc:'09-010', vendedor:'Carola Chavez', cliente:'PAGO EN TIENDA', ts:ts,
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 1000 @'+hoy+' #10 %A', productos:[{desc:'A',cant:1,precio:1000}]}),
      /* v2: venta de Carola, sale con Luis Pierre y el cliente le paga a ÉL en la puerta */
      P({id:'v2', nota:'20', oc:'09-020', vendedor:'Carola Chavez', cliente:'PAGA AL CHOFER', ts:ts+1, chofer:'Luis Pierre', vehiculo:'Carry',
         acuenta:0, saldo:500, pagado:false, metodoPago:'', productos:[{desc:'B',cant:1,precio:500}]}),
      /* v3: venta de Maria, contabilidad ya anotó que lo recibió Miguel */
      P({id:'v3', nota:'30', oc:'09-030', vendedor:'Maria Flores', cliente:'YA ANOTADO MIGUEL', ts:ts+2, chofer:'Miguel', vehiculo:'Foton encarpado',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 300 @'+hoy+' #30 >Miguel %B', productos:[{desc:'C',cant:1,precio:300}]}),
      /* v4: QR: va al banco, no está en la mano de nadie */
      P({id:'v4', nota:'40', oc:'09-040', vendedor:'Maria Flores', cliente:'PAGO QR', ts:ts+3,
         acuenta:0, saldo:0, pagado:true, metodoPago:'QR BISA 700 @'+hoy+' #40 %C', productos:[{desc:'D',cant:1,precio:700}]}),
      /* v5: con saldo, sale con Cristhian: contabilidad va a registrar el pago */
      P({id:'v5', nota:'50', oc:'09-050', vendedor:'Carola Chavez', cliente:'LO REGISTRA CONTA', ts:ts+4, chofer:'Cristhian', vehiculo:'Foton encarpado',
         acuenta:0, saldo:400, pagado:false, metodoPago:'', productos:[{desc:'E',cant:1,precio:400}]}),
      /* v6: pedido viejo con un chofer que ya no está en los camiones */
      P({id:'v6', nota:'60', oc:'08-060', vendedor:'Maria Flores', cliente:'ENTREGA VIEJA', ts:ts-40*86400000, fecha:isoLocal(new Date(ts-40*86400000)), chofer:'Giordano', vehiculo:'Foton nuevo',
         entregado:true, acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 100 @2026-08-01 #60 >Giordano', productos:[{desc:'F',cant:1,precio:100}]})
    ];
    RETIROS=[];
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    return { hoy:hoy };
  });

  // ══ 3. El chofer cobra en la puerta ════════════════════════════════════════
  console.log('\n── 3. El chofer anota el cobro desde su ficha ──');
  r = await page.evaluate(() => {
    showView('chofer'); llenarSelectChoferes();
    document.getElementById('cho-nombre').value='Luis Pierre'; renderChofer();
    choCobrarMetodo('v2','Efectivo');                // el diálogo contesta 500
    var p=findById('v2'), c=cobrosDe(p)[0]||{};
    return { txt:p.metodoPago, fecha:c.fecha, recibio:c.recibio, monto:c.monto, saldo:p.saldo, pagado:p.pagado, hoy:todayStr() };
  });
  chk('⚠️ el cobro del chofer queda con la fecha de HOY (antes nacía sin fecha y no entraba en ningún cuadre)', r.fecha===r.hoy && r.monto===500 && r.saldo===0 && r.pagado===true, JSON.stringify(r));
  chk('…y a nombre del chofer, sin que él haga nada más', r.recibio==='Luis Pierre' && /Efectivo 500 @\d{4}-\d{2}-\d{2} # >Luis Pierre/.test(r.txt), r.txt);
  r = await page.evaluate(() => {
    document.getElementById('cho-nombre').value='Luis Pierre'; renderChofer();
    choCobrarMetodo('v5','QR');
    var p=findById('v5'), c=cobrosDe(p)[0]||{};
    var out={ recibio:c.recibio, txt:p.metodoPago };
    choQuitarCobro('v5',0);                          // se deshace: v5 lo registra contabilidad más abajo
    return out;
  });
  chk('un QR del chofer va al banco: no lleva «recibió»', r.recibio==='' && r.txt.indexOf('>')<0, r.txt);

  // ══ 4. El Cuadre, por quién tiene la plata ═════════════════════════════════
  console.log('\n── 4. El Cuadre agrupa por quién TIENE la plata ──');
  await page.evaluate(() => {
    /* Contabilidad le retira 200 a Luis Pierre, que los rinde a Contabilidad. */
    persistRetiro(filaDeRetiro({ id:RETIRO_PREF+'t1__', fecha:todayStr(), entrega:'Luis Pierre', retira:'Contabilidad', monto:200, notas:['20'], tipo:'Facturado', fotos:[], obs:'' }));
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    llenarSelectContaVendedor();
    segSet('cua-mode','todo'); setCuadreModo('todo');
    var sv=document.getElementById('cua-vendedor'); if(sv) sv.value='';
    renderCuadre();
  });
  await page.waitForTimeout(150);
  r = await page.evaluate(() => {
    var E=cuadreEfectivo();
    var f=function(n){ return E.filas.filter(function(o){ return o.nombre===n; })[0]||null; };
    return { carola:f('Carola Chavez'), luis:f('Luis Pierre'), miguel:f('Miguel'), maria:f('Maria Flores'), giordano:f('Giordano'),
             orden:E.filas.map(function(o){ return o.nombre+(o.chofer?'🚚':''); }), fuera:E.fuera,
             html:(document.getElementById('cua-retiros')||{}).innerHTML||'',
             metrics:(document.getElementById('cua-metrics')||{}).textContent.replace(/\s+/g,' ') };
  });
  chk('⚠️ Carola tiene los 1.000 de la tienda, NO los 500 que el cliente le pagó al chofer', r.carola && r.carola.cobrado===1000 && r.carola.chofer===false, JSON.stringify(r.carola));
  chk('⚠️ Luis Pierre (chofer) tiene 500, se le retiraron 200 → le quedan 300', r.luis && r.luis.chofer===true && r.luis.cobrado===500 && r.luis.ret===200 && r.luis.falta===300, JSON.stringify(r.luis));
  chk('Miguel (anotado por contabilidad) tiene 300; Giordano, aunque ya no esté, sus 100 viejos', r.miguel && r.miguel.chofer===true && r.miguel.cobrado===300 && r.giordano && r.giordano.chofer===true && r.giordano.cobrado===100, JSON.stringify([r.miguel, r.giordano]));
  chk('el QR de Maria no está en la mano de nadie', r.maria===null, JSON.stringify(r.maria));
  chk('primero las vendedoras, después los choferes', r.orden[0]==='Carola Chavez' && r.orden.slice(1).every(function(x){ return /🚚$/.test(x); }), r.orden.join(' · '));
  chk('la tabla dice «Quién tiene la plata», marca 🚚 chofer y explica que rinden a Contabilidad', /Quién tiene la plata/.test(r.html) && /🚚 chofer/.test(r.html) && /rinden a <b>Contabilidad<\/b>/.test(r.html) && r.fuera.length===0, '');
  chk('arriba, «Efectivo por retirar» descuenta el retiro: 1.000 + 500 + 300 + 100 − 200 = 1.700', await page.evaluate(() => { var t=document.getElementById('cua-metrics').textContent.replace(/\s+/g,' '); return t.indexOf('Efectivo por retirar')>=0 && t.indexOf(fmtBs(1700))>=0; }), r.metrics.slice(0,200));

  // con el filtro por vendedora
  r = await page.evaluate(() => {
    var sv=document.getElementById('cua-vendedor'); sv.value='Carola Chavez'; renderCuadre();
    var E=cuadreEfectivo();
    return { filas:E.filas.map(function(o){ return [o.nombre,o.cobrado,o.ret,o.falta,o.chofer]; }), fuera:E.fuera,
             html:(document.getElementById('cua-retiros')||{}).innerHTML||'',
             metrics:document.getElementById('cua-metrics').textContent.replace(/\s+/g,' '), b1000:fmtBs(1000), b1500:fmtBs(1500), b500:fmtBs(500) };
  });
  chk('⚠️ filtrando por Carola: solo ella, con lo que de verdad tiene (1.000), sin filas de choferes', r.filas.length===1 && r.filas[0][0]==='Carola Chavez' && r.filas[0][1]===1000 && r.filas[0][3]===1000, JSON.stringify(r.filas));
  chk('…y lo del chofer se aparta y se dice: Luis Pierre recibió 500 de sus ventas, se ve en Todos', r.fuera.length===1 && r.fuera[0].nombre==='Luis Pierre' && r.fuera[0].monto===500 && /lo recibió un chofer/.test(r.html) && /Luis Pierre/.test(r.html) && /Se ve en <b>Todos<\/b>/.test(r.html), JSON.stringify(r.fuera));
  /* Las fichas pegan etiqueta y valor sin espacio en el textContent: se compara sin espacios. */
  var sinEsp=function(s){ return String(s).replace(/\s+/g,''); };
  chk('…y «Efectivo por retirar» de Carola es 1.000, no 1.500, aunque «Efectivo (caja)» diga 1.500', sinEsp(r.metrics).indexOf('Efectivoporretirar'+sinEsp(r.b1000))>=0 && sinEsp(r.metrics).indexOf('Efectivo(caja)'+sinEsp(r.b1500))>=0 && /lo tiene el chofer/.test(r.metrics), r.metrics.slice(r.metrics.indexOf('Efectivo (caja)'), r.metrics.indexOf('Efectivo (caja)')+260));
  r = await page.evaluate(() => {
    var sv=document.getElementById('cua-vendedor'); sv.value=''; renderCuadre();
    var det=(document.getElementById('cua-detalle')||{}).textContent.replace(/\s+/g,' ');
    return { det:det, wa:cuadreTexto() };
  });
  chk('el detalle de los pagos marca «🚚 recibió Luis Pierre» en el renglón del cobro', /recibió Luis Pierre/.test(r.det) && /recibió Miguel/.test(r.det), '');
  chk('el texto para WhatsApp distingue al chofer', /Luis Pierre \(chofer\): cobró/.test(r.wa) && /Carola Chavez: cobró/.test(r.wa), r.wa.split('\n').filter(function(l){ return /cobró/.test(l); }).join(' | '));

  // ══ 5. El retiro ═══════════════════════════════════════════════════════════
  console.log('\n── 5. El retiro: los choferes entregan, Contabilidad retira ──');
  r = await page.evaluate(() => {
    abrirRetiros();
    var sel=document.getElementById('ret-entrega');
    var grupos=[].slice.call(sel.querySelectorAll('optgroup')).map(function(g){ return g.label+': '+[].slice.call(g.querySelectorAll('option')).map(function(o){ return o.value; }).join(','); });
    sel.value='Luis Pierre'; sel.dispatchEvent(new Event('change'));
    var r1=document.getElementById('ret-retira').value;
    sel.value='Carola Chavez'; sel.dispatchEvent(new Event('change'));
    var r2=document.getElementById('ret-retira').value;
    document.getElementById('ret-retira').value='Don Pepe';
    sel.value='Miguel'; sel.dispatchEvent(new Event('change'));
    var r3=document.getElementById('ret-retira').value;
    return { grupos:grupos, r1:r1, r2:r2, r3:r3 };
  });
  chk('⚠️ «Quién entrega» tiene un grupo de choferes: los de los camiones y los que recibieron plata (Giordano incluido), sin repetir vendedores', r.grupos.length===2 && /^Vendedores: /.test(r.grupos[0]) && /Choferes/.test(r.grupos[1]) && /Luis Pierre/.test(r.grupos[1]) && /Miguel/.test(r.grupos[1]) && /Giordano/.test(r.grupos[1]) && !/Giordano/.test(r.grupos[0]) && /Carola Chavez/.test(r.grupos[0]), r.grupos.join(' || ').slice(0,300));
  chk('al elegir un chofer, «Quién retira» pasa solo a Contabilidad; una vendedora vuelve a Eduardo', r.r1==='Contabilidad' && r.r2==='Eduardo Añez', r.r1+' · '+r.r2);
  chk('…pero lo escrito a mano se respeta', r.r3==='Don Pepe', r.r3);
  r = await page.evaluate(() => {
    var sel=document.getElementById('ret-entrega'); sel.value='Miguel'; sel.dispatchEvent(new Event('change'));
    document.getElementById('ret-retira').value='Contabilidad';
    document.getElementById('ret-monto').value='300';
    document.getElementById('ret-nota-nueva').value='30'; retAgregarNota();
    var ok=guardarRetiroForm();
    closeRetiros();
    var f=cuadreEfectivo().filas.filter(function(o){ return o.nombre==='Miguel'; })[0]||{};
    return { ok:ok, ret:f.ret, falta:f.falta, retira:retirosTodos().filter(function(x){ return x.entrega==='Miguel'; }).map(function(x){ return x.retira; }) };
  });
  chk('un retiro a Miguel se guarda (entrega Miguel · retira Contabilidad) y su mano queda en cero', r.ok===true && r.ret===300 && r.falta===0 && r.retira.join()==='Contabilidad', JSON.stringify(r));

  // ══ 6. Contabilidad registra y corrige ═════════════════════════════════════
  console.log('\n── 6. Contabilidad: «¿Quién recibió la plata?» ──');
  r = await page.evaluate(() => {
    segSet('cta-tab','ventas'); setContaTab('ventas'); renderConta();
    showContaModal('v5');
    var m=document.getElementById('modal-box')||document.body;
    var antes=m.textContent.replace(/\s+/g,' ');
    var btn=[].slice.call(m.querySelectorAll('#cta-recibio button')).filter(function(b){ return /El chofer/.test(b.textContent); })[0];
    if(btn) btn.click();
    var m2=document.getElementById('modal-box')||document.body;
    var sel=m2.querySelector('#cta-recibio-sel');
    return { pregunta:/¿Quién recibió la plata\?/.test(antes), vendedora:/Carola Chavez/.test(antes), recibio:CTA_PAGO.recibio,
             selVal:sel?sel.value:null, opciones:sel?[].slice.call(sel.options).map(function(o){ return o.value; }):[],
             aviso:/en la mano de/.test(m2.textContent) };
  });
  chk('⚠️ al registrar un pago en efectivo pregunta quién recibió la plata, con la vendedora por defecto', r.pregunta && r.vendedora, JSON.stringify(r).slice(0,200));
  chk('«El chofer» propone al de la entrega (Cristhian) y deja elegir otro; avisa que la plata queda en su mano', r.recibio==='Cristhian' && r.selVal==='Cristhian' && r.opciones.indexOf('Luis Pierre')>=0 && r.opciones.indexOf('Giordano')<0 && r.aviso, JSON.stringify([r.recibio, r.selVal, r.opciones]));
  r = await page.evaluate(() => {
    document.getElementById('cta-pago-monto').value='400';
    document.getElementById('cta-pago-fecha').value=todayStr();
    document.getElementById('cta-pago-nota').value='50';
    CTA_PAGO.comps=['R1'];                             // el recibo ya subido
    ctaRegistrarPago('v5');
    var p=findById('v5'), c=cobrosDe(p)[0]||{};
    closeModal();
    return { txt:p.metodoPago, recibio:c.recibio, nota:c.nota, saldo:p.saldo, limpio:CTA_PAGO.recibio,
             ficha:contaPagosHtml(p).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '), wa:pagoTexto(p, contaPagos(p)[0]) };
  });
  chk('⚠️ el pago queda a nombre del chofer, con su nota y su imagen, y la venta cobrada', r.recibio==='Cristhian' && r.nota==='50' && r.saldo===0 && /#50 >Cristhian %R1/.test(r.txt) && r.limpio==='', r.txt);
  chk('la ficha lo muestra («🚚 recibió Cristhian») y el mensaje de WhatsApp lo dice', /recibió Cristhian/.test(r.ficha) && /La plata la recibió el chofer: Cristhian/.test(r.wa), r.ficha.slice(0,160));
  r = await page.evaluate(() => {
    showContaModal('v5');
    ctaSetMetodo('v5','QR');
    var m=document.getElementById('modal-box')||document.body;
    var out={ recibio:CTA_PAGO.recibio, pregunta:!!m.querySelector('#cta-recibio') };
    closeModal();
    return out;
  });
  chk('con QR la pregunta desaparece y no queda nadie marcado', r.recibio==='' && r.pregunta===false, JSON.stringify(r));
  // corregir: Miguel → la vendedora
  r = await page.evaluate(() => {
    showContaModal('v3');
    ctaEditarPago('v3',0);
    var m=document.getElementById('modal-box')||document.body;
    var antes={ r:CTA_EDIT_R, pregunta:!!m.querySelector('#cta-recibio'), sel:(m.querySelector('#cta-recibio-sel')||{}).value };
    ctaEditRecibio('v3','');
    ctaGuardarPago('v3',0,true);
    var p=findById('v3'), c=cobrosDe(p)[0]||{};
    closeModal();
    return { antes:antes, recibio:c.recibio, txt:p.metodoPago, monto:c.monto, nota:c.nota };
  });
  chk('«✏️ Corregir» arranca con lo anotado (Miguel) y deja pasarlo a la vendedora', r.antes.r==='Miguel' && r.antes.pregunta===true && r.antes.sel==='Miguel' && r.recibio==='' && r.txt.indexOf('>')<0 && r.monto===300 && r.nota==='30', JSON.stringify(r));

  // ══ 7. Giordano ════════════════════════════════════════════════════════════
  console.log('\n── 7. Los camiones ──');
  r = await page.evaluate(() => ({
    todos:allChoferes(), sel:choferSelect(findById('v6')), sel2:choferSelect({id:'nuevo', vehiculo:'Foton nuevo', chofer:''}),
    conocidos:choferesConocidos(), esCh:[esChoferNombre('Giordano'), esChoferNombre('Carola Chavez'), esChoferNombre('luis pierre')]
  }));
  chk('⚠️ Giordano ya no está en los camiones (Foton nuevo queda con Luis Eyzaguirre)', r.todos.indexOf('Giordano')<0 && r.todos.indexOf('Luis Eyzaguirre')>=0 && r.todos.length===6, r.todos.join(', '));
  chk('…pero el pedido viejo que lo tiene lo sigue mostrando, y uno nuevo no lo ofrece', /<option selected>Giordano<\/option>/.test(r.sel) && !/Giordano/.test(r.sel2), '');
  chk('el panel lo sigue conociendo como chofer (por el pedido viejo), y a Carola no', r.conocidos.indexOf('Giordano')>=0 && r.esCh[0]===true && r.esCh[1]===false && r.esCh[2]===true, r.conocidos.join(', '));

  chk('sin errores de JavaScript en todo el recorrido', errores.length===0, errores.join(' | ').slice(0,200));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
