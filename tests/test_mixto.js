/* 💳 PAGO MIXTO — dos métodos en la misma venta (§4ej).

   El dueño: *"hay clientes que pagan de manera mixta"* (QR + tarjeta) y proponía cargar la
   venta dos veces con el mismo recibo. Eso duplica unidades, totales y cupos. En cambio, el
   formulario tiene «➕ Pagó con dos métodos»: el primer método se lleva el resto y el segundo
   lleva su método, su monto y su imagen; los dos con el N° de nota de la venta.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Que la venta quede UNA sola, con DOS pagos: anticipo (resto) + cobro (segundo método),
      mismo día, mismo recibo, cada uno con su imagen — y el total = lo cobrado.
   2. Que Contabilidad los vea por separado (método y banco de cada uno) y que la venta
      figure pagada, sin saldo y sin «cobro de más».
   3. Que no deje guardar sin método, sin monto, con monto ≥ total, QR sin banco, mismo
      método dos veces, o sin imagen del segundo pago.
   4. Que al EDITAR la venta el segundo método vuelva a aparecer con su monto, y que guardar
      sin tocar la plata conserve el historial tal cual.
   5. Que con el adelanto («A cuenta») también funcione: anticipo (resto) + cobro, saldo intacto.

   Red cortada, servidor simulado. Se corre:  node tests/test_mixto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);
  const R = await page.evaluate(async () => {
    var casos=[]; var chk=function(n, ok, det){ casos.push({n:n, ok:!!ok, det:det}); };
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false; STATE=[]; window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true, pedido:g}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiPost=function(){ return Promise.resolve({ok:true}); };
    window._toasts=[]; toast=function(m,k){ window._toasts.push(String(k)+': '+m); };
    confirm=function(){ return true; };            // «el historial se rehace, ¿guardar igual?» → sí (Playwright también lo acepta)
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F)||diaCerrado(F));
    var llenar=function(o){
      resetForm(); EDIT_ID=null; window._pl=[];
      document.getElementById('f-vendedor').value='Carola Chavez';
      document.getElementById('f-cliente').value='DON MIXTO'; document.getElementById('f-celular').value='70000000';
      document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av. Prueba 1';
      document.getElementById('f-fecha').value=F; segSet('f-turno','AM');
      document.getElementById('f-nota').value='1800';
      var pd=document.querySelector('#f-productos .prod-desc'); if(pd){ pd.value='COLCHON SOFT'; var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190'; var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1'; }
      segSet('f-pagado', o.pagado?'SI':'NO'); updateMetodoVisibility();
      if(o.pagado){ document.getElementById('f-cobrado').value=o.total; } else { document.getElementById('f-acuenta').value=o.acuenta; document.getElementById('f-saldo').value=o.saldo; updateMetodoVisibility(); }
      segSet('f-metodo', o.m1); updateBancoVisibility(); if(o.b1) segSet('f-banco', o.b1);
      FORM_COMPS=['IMG_1'];
      if(o.mixto){ toggleMixto(true); segSet('f-metodo2', o.m2||''); if(o.b2 && bancosDeVendedor('Carola Chavez').indexOf(o.b2)<0) BANCO_EXTRA2=o.b2; pintarMixto(); if(o.b2) segSet('f-banco2', o.b2); document.getElementById('f-monto2').value=(o.monto2==null?'':o.monto2); FORM_COMPS2=o.comps2||['IMG_2']; pintarMixto(); }
    };
    /* La venta recién guardada: la de DON MIXTO más nueva (la lista simulada puede traer otras). */
    var guardar=async function(){ window._toasts=[]; var antes=STATE.map(function(p){ return p.id; }); submitPedido(); await new Promise(r=>setTimeout(r,400)); var nuevas=STATE.filter(function(p){ return antes.indexOf(p.id)<0; }); return nuevas.length ? nuevas[nuevas.length-1] : null; };
    var otroBanco=(function(){ var bs=bancosDeVendedor('Carola Chavez'); return bs[1] || BANCOS_TODOS.filter(function(x){ return bs.indexOf(x)<0; })[0]; })();
    var ult=function(){ return window._toasts.slice(-1)[0]||''; };

    // 1. QR + tarjeta, pagado
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'Tarjeta', monto2:1990 });
    var p=await guardar();
    chk('⚠️ QR + tarjeta pagado: se guarda UNA venta', !!p && STATE.length===1, ult());
    var pagos=p?contaPagos(p):[];
    chk('…con DOS pagos', pagos.length===2, JSON.stringify(pagos.map(function(x){ return [x.metodo,x.banco,x.monto,x.nota,x.fecha]; })));
    chk('…el primero (QR BISA) se lleva el resto: 3000', !!pagos[0] && pagos[0].anticipo && pagos[0].metodo==='QR' && pagos[0].banco==='BISA' && pagos[0].monto===3000);
    chk('…el segundo (Tarjeta) su parte: 1990', !!pagos[1] && !pagos[1].anticipo && pagos[1].metodo==='Tarjeta' && pagos[1].monto===1990);
    chk('…los dos con el mismo recibo (1800) y el mismo día', !!pagos[1] && pagos[0].nota==='1800' && pagos[1].nota==='1800' && pagos[0].fecha===pagos[1].fecha && pagos[0].fecha===todayStr());
    chk('…cada uno con su imagen', !!pagos[1] && compsArr(pagos[0].comps)[0]==='IMG_1' && compsArr(pagos[1].comps)[0]==='IMG_2');
    chk('⚠️ total de la venta = lo cobrado, pagada, sin saldo y sin cobro de más', !!p && ventaTotal(p)===4990 && p.pagado===true && (Number(p.saldo)||0)===0 && excesoCobro(p)===0, p?(ventaTotal(p)+' / saldo '+p.saldo+' / exceso '+excesoCobro(p)):'');
    chk('…y el «monto cobrado» guardado es el total', !!p && Number(p.cobradoBs)===4990, p&&p.cobradoBs);

    // 2. lo que NO deja guardar
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'', monto2:1990 }); STATE=[]; await guardar();
    chk('sin segundo método no guarda', STATE.length===0 && /OTRA parte/.test(ult()), ult());
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'Tarjeta', monto2:'' }); STATE=[]; await guardar();
    chk('sin monto del segundo pago no guarda', STATE.length===0 && /mayor a 0/.test(ult()), ult());
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'Tarjeta', monto2:4990 }); STATE=[]; await guardar();
    chk('con el segundo pago igual al total no guarda (sería todo con el segundo)', STATE.length===0 && /menor a/.test(ult()), ult());
    llenar({ pagado:true, total:4990, m1:'Tarjeta', mixto:true, m2:'QR', monto2:1000 }); STATE=[]; await guardar();
    chk('QR sin banco en el segundo pago no guarda', STATE.length===0 && /banco/.test(ult()), ult());
    llenar({ pagado:true, total:4990, m1:'Efectivo', mixto:true, m2:'Efectivo', monto2:1000 }); STATE=[]; await guardar();
    chk('el mismo método dos veces no guarda', STATE.length===0 && /igual al primero/.test(ult()), ult());
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'QR', b2:otroBanco, monto2:1000 }); STATE=[]; var p2=await guardar();
    chk('…pero dos QR a bancos DISTINTOS sí', !!p2 && contaPagos(p2).length===2 && contaPagos(p2)[1].banco===otroBanco, ult()+' · '+otroBanco);
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'Tarjeta', monto2:1000, comps2:[] }); STATE=[]; await guardar();
    chk('sin la imagen del segundo pago no guarda', STATE.length===0 && /imagen del SEGUNDO/.test(ult()), ult());

    // 3. editar: vuelve a mostrar el segundo método y no pierde nada
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA', mixto:true, m2:'Tarjeta', monto2:1990 }); STATE=[]; var p3=await guardar();
    window._pl=[JSON.parse(JSON.stringify(p3))]; saveMirror();
    resetForm(); editarDesdeMis(p3.id); await new Promise(r=>setTimeout(r,250));
    chk('al editar aparece el segundo método con su monto', MIXTO===true && segVal('f-metodo2')==='Tarjeta' && Number(document.getElementById('f-monto2').value)===1990 && document.getElementById('wrap-mixto').style.display!=='none', segVal('f-metodo2')+' '+document.getElementById('f-monto2').value);
    chk('…y el monto cobrado muestra el total (no solo el anticipo)', Number(document.getElementById('f-cobrado').value)===4990, document.getElementById('f-cobrado').value);
    document.getElementById('f-direccion').value='Av. Nueva 9'; window._toasts=[]; submitPedido(); await new Promise(r=>setTimeout(r,400));
    var q=findById(p3.id);
    chk('guardar sin tocar la plata conserva los dos pagos tal cual', !!q && q.direccion==='Av. Nueva 9' && q.metodoPago===p3.metodoPago, q&&q.metodoPago);
    // guardar cierra el formulario: se vuelve a abrir la edición para cambiar el reparto
    window._pl=[JSON.parse(JSON.stringify(findById(p3.id)))]; resetForm(); editarDesdeMis(p3.id); await new Promise(r=>setTimeout(r,250));
    document.getElementById('f-monto2').value='990'; window._toasts=[]; submitPedido(); await new Promise(r=>setTimeout(r,400));
    q=findById(p3.id); var pq=contaPagos(q);
    chk('cambiar el monto del segundo pago rehace los dos: 4000 + 990', pq.length===2 && pq[0].monto===4000 && pq[1].monto===990 && ventaTotal(q)===4990, JSON.stringify(pq.map(function(x){ return x.monto; })));

    // 4. adelanto mixto
    llenar({ pagado:false, acuenta:2000, saldo:2990, m1:'Efectivo', mixto:true, m2:'QR', b2:'BISA', monto2:500 }); STATE=[]; var p4=await guardar();
    var pg4=p4?contaPagos(p4):[];
    chk('⚠️ adelanto mixto: anticipo Efectivo 1500 + QR BISA 500, saldo 2990, total 4990', !!p4 && pg4.length===2 && pg4[0].anticipo && pg4[0].monto===1500 && pg4[1].metodo==='QR' && pg4[1].monto===500 && Number(p4.saldo)===2990 && ventaTotal(p4)===4990 && p4.pagado===false, p4?(JSON.stringify(pg4.map(function(x){ return [x.metodo,x.monto]; }))+' saldo '+p4.saldo+' total '+ventaTotal(p4)):ult());

    // 5. el cuadre: cada parte en su método (lo que preguntó el dueño)
    var porMetodo={}; contaPagos(p).forEach(function(c){ var k=c.metodo+(c.banco?(' '+c.banco):''); porMetodo[k]=r2((porMetodo[k]||0)+c.monto); });
    chk('⚠️ en las cuentas cada parte va con su método: QR BISA 3000 y Tarjeta 1990', porMetodo['QR BISA']===3000 && porMetodo['Tarjeta']===1990, JSON.stringify(porMetodo));

    // 6. sin mixto, todo como siempre
    llenar({ pagado:true, total:4990, m1:'QR', b1:'BISA' }); STATE=[]; var p5=await guardar();
    chk('sin el segundo método, la venta se guarda como siempre (un pago)', !!p5 && contaPagos(p5).length===1 && contaPagos(p5)[0].monto===4990, ult());
    return casos;
  });
  console.log('\n── Pago mixto ──');
  R.forEach(c => chk(c.n, c.ok, c.det));
  chk('sin errores de JavaScript en la página', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
