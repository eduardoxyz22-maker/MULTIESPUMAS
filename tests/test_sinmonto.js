/* ⚠️ "DEBE Bs 0,00" — la venta a la que NADIE le anotó el monto salía disfrazada de
   venta saldada. Regla del usuario: "si hay saldo debe decir cuánto se debe"; y si no
   hay ningún monto, que lo diga en vez de mentir con un cero. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+extra):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1100} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var base={fecha:hoy,turno:'AM',celular:'70000000',nit:'1',zona:'Norte',direccion:'Av. X',
              vendedor:'Carola Chavez',chofer:'Juan',
              productos:[{desc:'SOFT ICE',medida:'120X190',cant:1,precio:1500}],ts:ts};
    function P(o){ var q={}; for(var k in base)q[k]=base[k]; for(var k in o)q[k]=o[k]; return q; }
    window._FIX=STATE=[
      /* 1. EL CASO: nadie anotó nada */
      P({id:'s1', nota:'900', oc:'08-400', cliente:'SIN NADA ANOTADO', acuenta:0, saldo:0, pagado:false, metodoPago:''}),
      /* 2. con saldo de verdad — tiene que seguir diciendo CUÁNTO */
      P({id:'s2', nota:'901', oc:'08-401', cliente:'DEBE DE VERDAD', acuenta:0, saldo:1500, pagado:false, metodoPago:''}),
      /* 3. a cuenta + saldo — el renglón "debe" sigue */
      P({id:'s3', nota:'902', oc:'08-402', cliente:'A CUENTA CON SALDO', acuenta:500, saldo:1000, pagado:false, metodoPago:'~Efectivo 500 @'+hoy+' #902 %I3'}),
      /* 4. a cuenta que ya cubre todo pero quedó sin marcar — NO debe decir "debe Bs 0,00" */
      P({id:'s4', nota:'903', oc:'08-403', cliente:'A CUENTA SIN SALDO', acuenta:1500, saldo:0, pagado:false, metodoPago:'~Efectivo 1500 @'+hoy+' #903 %I4'}),
      /* 5. pagada de verdad — no se toca */
      P({id:'s5', nota:'904', oc:'08-404', cliente:'PAGADA OK', acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 1500 @'+hoy+' #904 %I5'}),
      /* 6. venta con pagos en el ledger pero saldo 0 y sin marcar pagada */
      P({id:'s6', nota:'905', oc:'08-405', cliente:'CON LEDGER', acuenta:0, saldo:0, pagado:false, metodoPago:'Efectivo 1500 @'+hoy+' #905 %I6'})
    ];
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._FIX))}); };
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','todo'); setContaModo('todo');
  });
  await page.waitForTimeout(400);

  // ---------- 1. quién es "sin monto anotado" ----------
  let r = await page.evaluate(()=>({
    s1:sinMontoAnotado(findById('s1')), s2:sinMontoAnotado(findById('s2')),
    s3:sinMontoAnotado(findById('s3')), s4:sinMontoAnotado(findById('s4')),
    s5:sinMontoAnotado(findById('s5')), s6:sinMontoAnotado(findById('s6'))
  }));
  chk('la venta sin nada anotado se reconoce', r.s1===true, JSON.stringify(r));
  chk('  la que DEBE de verdad no', r.s2===false, '');
  chk('  la que dejó adelanto tampoco', r.s3===false && r.s4===false, '');
  chk('  la pagada tampoco', r.s5===false, '');
  chk('  ni la que tiene pagos en el ledger', r.s6===false, '');

  // ---------- 2. CONTABILIDAD ----------
  r = await page.evaluate(()=>{
    var o={};
    ['s1','s2','s3','s4','s5','s6'].forEach(function(id){
      var p=findById(id); o[id]={html:contaPagoHtml(p), txt:contaPagoTxt(p)};
    });
    o.tabla=(document.getElementById('tbl-conta')||{}).textContent||'';
    return o;
  });
  chk('CONTABILIDAD · ya no dice "DEBE Bs 0,00"', !/DEBE Bs 0,00/.test(r.s1.html), r.s1.html.replace(/<[^>]+>/g,' ').trim());
  chk('  dice que falta anotar el monto', /SIN MONTO ANOTADO/.test(r.s1.html) && /falta registrar el pago/.test(r.s1.html), '');
  chk('  y en el Excel también', /SIN MONTO ANOTADO/.test(r.s1.txt) && !/Bs 0,00/.test(r.s1.txt), r.s1.txt);
  chk('  si HAY saldo sigue diciendo cuánto se debe', /DEBE Bs 1\.500,00/.test(r.s2.html) && /DEBE Bs 1\.500,00/.test(r.s2.txt), r.s2.txt);
  chk('  con adelanto + saldo, el renglón "debe" sigue', /A CUENTA Bs 500,00/.test(r.s3.html) && /debe Bs 1\.000,00/.test(r.s3.html), r.s3.txt);
  chk('  con adelanto y saldo 0 ya no aparece "debe Bs 0,00"', !/debe Bs 0,00/.test(r.s3.html+r.s4.html) && /A CUENTA Bs 1\.500,00/.test(r.s4.html), r.s4.txt);
  chk('  la pagada sigue diciendo PAGADO', /PAGADO/.test(r.s5.html) && /PAGADO/.test(r.s5.txt), r.s5.txt);
  chk('  la tabla no muestra ningún "DEBE Bs 0,00"', !/DEBE Bs 0,00/.test(r.tabla), '');

  // ---------- 3. LAS FICHAS que muestran plata (Administración y Mis pedidos) ----------
  /* La ficha de la Lista de carga NO muestra plata (es del camión y los productos):
     las dos que la muestran son Administración y Mis pedidos. */
  r = await page.evaluate(async ()=>{
    showPedidoModal('s1'); await new Promise(x=>setTimeout(x,150));
    var admin=document.getElementById('modal-box').textContent;
    closeModal(); showMisModal('s1'); await new Promise(x=>setTimeout(x,150));
    var mis=document.getElementById('modal-box').textContent;
    closeModal(); showPedidoModal('s2'); await new Promise(x=>setTimeout(x,150));
    var admin2=document.getElementById('modal-box').textContent;
    closeModal(); showMisModal('s2'); await new Promise(x=>setTimeout(x,150));
    var mis2=document.getElementById('modal-box').textContent;
    closeModal();
    return {admin:admin, mis:mis, admin2:admin2, mis2:mis2};
  });
  chk('FICHA de Administración · avisa en vez de "DEBE · Bs 0,00"', /SIN MONTO ANOTADO/.test(r.admin) && !/DEBE · Bs 0,00/.test(r.admin), '');
  chk('FICHA de Mis pedidos · idem (es la que ve la vendedora)', /SIN MONTO ANOTADO/.test(r.mis) && !/DEBE · Bs 0,00/.test(r.mis), '');
  chk('  y una venta con saldo sigue diciendo cuánto', /DEBE · Bs 1\.500,00/.test(r.admin2) && /DEBE · Bs 1\.500,00/.test(r.mis2), '');

  // ---------- 4. EL CHOFER (acá es plata que se pierde) ----------
  r = await page.evaluate(()=>({ s1:cobroChoferHtml(findById('s1')), s2:cobroChoferHtml(findById('s2')),
                                 s5:cobroChoferHtml(findById('s5')) }));
  chk('CHOFER · ya no le dice "Sin saldo" en gris', !/Sin saldo/.test(r.s1), r.s1.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,80));
  chk('  le dice que pregunte ANTES de entregar', /Sin monto anotado/.test(r.s1) && /antes de entregar/.test(r.s1), '');
  chk('  con saldo sigue viendo el monto a cobrar', /1\.500,00/.test(r.s2), '');
  chk('  y la ya cobrada no le pide plata', /COBRADO ✓/.test(r.s5), r.s5.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,60));

  // ---------- 5. LA HOJA DE RUTA ----------
  r = await page.evaluate(()=>{
    STATE.forEach(function(p){ p.chofer='Juan'; p.fecha=todayStr(); });
    abrirRuta(); setRutaDia('hoy');
    var html=(document.getElementById('ruta-body')||{}).innerHTML||'';
    closeRuta();
    return { html:html };
  });
  chk('HOJA DE RUTA · no manda al chofer con "COBRAR Bs 0,00"', !/COBRAR Bs 0,00/.test(r.html), '');
  chk('  le avisa que pregunte', /SIN MONTO ANOTADO/.test(r.html), '');
  chk('  y las que sí tienen saldo mantienen su monto', /COBRAR Bs 1\.500,00/.test(r.html), '');

  // ---------- 6. EL CUADRE la lista ----------
  r = await page.evaluate(()=>{
    segSet('cta-tab','cuadre'); setContaTab('cuadre'); segSet('cua-mode','todo'); setCuadreModo('todo');
    var A=cuadreAlertas(cuadrePagos());
    return { txt:A.map(function(a){ return a.txt; }).join(' || '),
             det:JSON.stringify(A.map(function(a){ return (a.det||[]).map(function(d){ return d.txt; }); })),
             panel:(document.getElementById('cua-alertas')||{}).textContent||'' };
  });
  chk('CUADRE · avisa de las ventas sin ningún monto', /sin ningún monto anotado/.test(r.txt), '');
  chk('  y las lista por cliente para poder abrirlas', /SIN NADA ANOTADO/.test(r.det), '');
  chk('  el aviso se ve en el panel', /sin ningún monto anotado/.test(r.panel), '');
  chk('  no mete a las que sí tienen saldo', !/DEBE DE VERDAD/.test(r.det.split('sin ningún')[0]||''), '');

  // ---------- 7. EL EXCEL DEL CONTADOR ----------
  /* La columna PAGADO del Excel es SÍ/NO. Un "NO" con saldo 0 y cobrado 0 le dice al
     contador "no debe nada", que es al revés: a esa venta le falta el monto. Necesita
     su propio valor. (Ojo: el export NO pasa por contaPagoTxt — esa función está muerta.) */
  r = await page.evaluate(()=>{
    var col=function(id){ var p=findById(id); return p.pagado?'SÍ':(sinMontoAnotado(p)?'SIN MONTO':'NO'); };
    return { s1:col('s1'), s2:col('s2'), s5:col('s5'),
             enFuente:/sinMontoAnotado\(p\)\?'SIN MONTO'/.test(exportConta.toString()) };
  });
  chk('EXCEL · la venta sin monto no cae en el "NO" del contador', r.s1==='SIN MONTO', 'PAGADO='+r.s1);
  chk('  la que debe sigue siendo NO', r.s2==='NO', 'PAGADO='+r.s2);
  chk('  y la pagada sigue siendo SÍ', r.s5==='SÍ', 'PAGADO='+r.s5);
  chk('  y el export de verdad lo usa (no solo el cálculo del test)', r.enFuente===true, '');

  /* ══ 8. EL PAGO DE MENTIRA (§4fg) ════════════════════════════════════════════════
     Una venta «PAGADA sin monto» no tiene renglón en el historial: el campo guarda el
     método suelto («Efectivo %IMG»). `cobrosDe` fabrica un pago para poder mostrarlo, con
     el monto sacado de `p.cobradoBs` — un campo que NO tiene columna en la planilla, así
     que en cualquier dispositivo que releyó la lista vale 0. Escribirlo como renglón de
     verdad lo convertía en «Efectivo 0», `parseCobros` lo tiraba, y la venta quedaba SIN
     PAGO, SIN COMPROBANTES y marcada como NO PAGADA — por tocarle una imagen. */
  r = await page.evaluate(async () => {
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var base={fecha:hoy,turno:'AM',celular:'7',nit:'1',zona:'Norte',direccion:'X',
              vendedor:'Carola Chavez',chofer:'Juan',productos:[{desc:'A',cant:1,precio:1500}],ts:ts};
    var P=function(o){ var q={}; for(var k in base)q[k]=base[k]; for(var k2 in o)q[k2]=o[k2]; return q; };
    var pagada=function(id,met){ return P({id:id, nota:'96'+id, oc:'09-96'+id, cliente:'PAGADA SIN MONTO '+id,
                                           acuenta:0, saldo:0, pagado:true, metodoPago:met||'Efectivo %IMGV'}); };
    var out={}, fuera=[];
    apiBorrarFoto=function(f){ fuera.push(f); return Promise.resolve({ok:true}); };
    var foto=function(p){ return {pagado:!!p.pagado, saldo:r2(Number(p.saldo)||0), txt:p.metodoPago,
                                  comps:(cobrosDe(p)[0]||{}).comps||[], n:cobrosDe(p).length}; };

    // (a) adjuntar una 2ª imagen (el camino real: COMP_DESTINO + onCompElegido)
    STATE=[pagada('1')];
    window.fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AA'); };
    window.subirFoto=function(){ return Promise.resolve({ok:true, fotoId:'NUEVA', version:'x'}); };
    showContaModal('1');
    COMP_DESTINO={id:'1', idx:0};
    onCompElegido({ target:{ files:[{name:'x.jpg'}], dataset:{pedido:'1'} } });
    await new Promise(r=>setTimeout(r,150));
    out.adjuntar=foto(findById('1'));

    // (b) quitar UNA de las dos imágenes
    STATE=[pagada('2','Efectivo %I1 %I2')];
    ctaQuitarComp('2', 0, 1);
    out.quitarUna=foto(findById('2'));

    // (c) quitar la ÚNICA imagen: la venta tiene que seguir pagada y con su método
    STATE=[pagada('3','Efectivo %I1')];
    ctaQuitarComp('3', 0, 0);
    out.quitarTodas=foto(findById('3'));

    // (d) anotarle un recargo por entrega encima
    STATE=[pagada('4')];
    aplicarEnvios(findById('4'), [{metodo:'Efectivo', monto:80, fecha:hoy, nota:'964', comps:['FL1']}]);
    out.conFlete=foto(findById('4'));
    out.flete=envioCobrado(findById('4'));

    // (e) el chofer anota un cobro: el comprobante de la vendedora NO puede quedar huérfano
    STATE=[pagada('5')];
    CHO_TODOS=false;
    var arr=cobrosDe(findById('5')).slice();
    arr.push({metodo:'Efectivo', monto:300, fecha:hoy, recibio:'Luis Pierre'});
    aplicarCobros(findById('5'), arr);
    out.chofer=foto(findById('5'));

    // (f) «💵 Anotar el monto» SÍ lo vuelve un pago de verdad (no se rompió el camino bueno)
    STATE=[pagada('6')];
    window.prompt=function(){ return '1500'; };
    ctaAnotarMonto('6', 0);
    var p6=findById('6');
    out.anotar={ cobrado:totalCobrado(p6), pagado:!!p6.pagado, saldo:r2(Number(p6.saldo)||0),
                 conFecha:!!(cobrosDe(p6)[0]||{}).fecha, comps:(cobrosDe(p6)[0]||{}).comps||[] };
    out.borradas=fuera;
    return out;
  });
  chk('§4fg · adjuntar un comprobante NO desmarca la venta de pagada', r.adjuntar.pagado===true && r.adjuntar.n===1, JSON.stringify(r.adjuntar));
  chk('  …y la imagen nueva queda, sin inventar un renglón de Bs 0', r.adjuntar.txt==='Efectivo %IMGV %NUEVA', r.adjuntar.txt);
  chk('§4fg · quitar UNA imagen deja la otra y la venta sigue pagada', r.quitarUna.txt==='Efectivo %I1' && r.quitarUna.pagado===true, r.quitarUna.txt);
  chk('§4fg · quitar la ÚLTIMA imagen no borra el método ni despaga la venta', r.quitarTodas.txt==='Efectivo' && r.quitarTodas.pagado===true, r.quitarTodas.txt);
  chk('  …y solo se borran de Drive las que se quitaron', JSON.stringify(r.borradas)==='["I2","I1"]', JSON.stringify(r.borradas));
  chk('§4fg · anotarle el flete no se lleva el pago ni el comprobante', r.conFlete.pagado===true && /^Efectivo %IMGV \+ \^Efectivo 80/.test(r.conFlete.txt), r.conFlete.txt);
  chk('  …y el flete sí queda cobrado', r.flete===80, r.flete);
  chk('§4fg · el cobro del chofer se queda con el comprobante (nada huérfano en Drive)', JSON.stringify(r.chofer.comps)==='["IMGV"]', r.chofer.txt);
  chk('§4fg · «Anotar el monto» SIGUE volviéndolo un pago de verdad', r.anotar.cobrado===1500 && r.anotar.pagado===true && r.anotar.saldo===0, JSON.stringify(r.anotar));
  chk('  …con fecha (si no, no entra en ningún cuadre) y con su comprobante', r.anotar.conFecha===true && JSON.stringify(r.anotar.comps)==='["IMGV"]', JSON.stringify(r.anotar));

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
