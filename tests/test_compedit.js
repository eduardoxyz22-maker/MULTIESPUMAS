/* 📎 ADJUNTAR LA IMAGEN QUE FALTA DESDE «CORREGIR ESTE PAGO».
   Pedido del dueño: al tocar ✏️ Corregir en Contabilidad debería poder subirse la imagen,
   por si se la olvidaron en ese pago ya registrado.

   Y buscándole el lugar salió el agujero de fondo: el ADELANTO (`anticipo`) NO está en la
   lista de cobros —`ctaIdxCobro` le devuelve -1— así que era el ÚNICO pago sin botón para
   adjuntar. Y es el más común: es el que carga la vendedora junto con el pedido. Si se
   olvidaba la captura, esa venta se quedaba sin respaldo para siempre. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Una venta con TRES renglones de plata: el adelanto (sin imagen, que es el caso del
     olvido), un cobro posterior y el recargo por entrega. */
  const prep = () => page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._pl=[]; window._subidas=0; window._borradas=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r));
      window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    /* El subidor de imágenes, de mentira: devuelve un id distinto cada vez. */
    apiFoto=function(){ window._subidas++; return Promise.resolve({ok:true, fotoId:'NUEVA'+window._subidas}); };
    apiBorrarFoto=function(fid){ window._borradas.push(fid); return Promise.resolve({ok:true}); };
    achicarFoto=function(){ return Promise.resolve('data:image/jpeg;base64,xxx'); };
    var hist=textoCobros([
      {anticipo:true,  metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-08-03', nota:'276', comps:[]},
      {anticipo:false, metodo:'Efectivo',         monto:600,  fecha:'2026-08-10', nota:'301', comps:['VIEJA1']},
      {envio:true,     metodo:'Efectivo',         monto:50,   fecha:'2026-08-10', nota:'301', comps:[]}
    ]);
    var p={ id:'PC', fecha:'2026-08-03', turno:'AM', oc:'08-700', nota:'276',
      vendedor:'Carola Chavez', cliente:'DON PEPE', celular:'70000000', zona:'Norte',
      direccion:'Av. Uno', maps:'', pagado:false, saldo:400, acuenta:1000, cobradoBs:600,
      metodoPago:hist, observaciones:'', garantia:'', facturarA:'', nit:'', estado:'',
      entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
      productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1, precio:2000}] };
    STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror();
    showContaModal('PC');
    await new Promise(r=>setTimeout(r,150));
    /* Qué renglón es cuál dentro de contaPagos() */
    var todos=contaPagos(p);
    return { i:todos.map(function(c,k){ return (esEnvio(c)?'envio':(c.anticipo?'anticipo':'cobro'))+':'+k; }) };
  });

  /* Abre el editor de un renglón y devuelve su HTML. */
  const abrirEditor = (i) => page.evaluate(async (i) => {
    ctaEditarPago('PC', i);
    await new Promise(r=>setTimeout(r,150));
    return document.getElementById('modal').innerHTML;
  }, i);

  /* Toca el botón de adjuntar de ese renglón y "elige" un archivo. */
  const adjuntar = (i) => page.evaluate(async (i) => {
    ctaAdjuntarEdit('PC', i);
    await new Promise(r=>setTimeout(r,50));
    /* El click() al input de archivo no abre nada en el test: se llama al handler
       directo con un archivo de mentira, que es lo que haría el navegador. */
    onCompElegido({ target:{ files:[{name:'captura.jpg'}], dataset:{pedido:'PC'} } });
    await new Promise(r=>setTimeout(r,400));
    var p=findById('PC');
    return { comps:contaPagos(p).map(function(c){ return compsArr(c.comps!=null?c.comps:c.comp); }),
             saldo:p.saldo, acuenta:p.acuenta, cobrado:totalCobrado(p), venta:ventaTotal(p),
             metodo:String(p.metodoPago) };
  }, i);

  const orden = await prep();
  chk('la venta tiene adelanto, cobro y recargo, en ese orden',
      orden.i.join(' ')==='anticipo:0 cobro:1 envio:2', orden.i.join(' '));

  // ============ 1. EL ADELANTO — el caso del olvido ============
  let html = await abrirEditor(0);
  chk('el editor del ADELANTO ofrece adjuntar la imagen', /ctaAdjuntarEdit\('PC',0\)/.test(html));
  chk('…y avisa que ese pago no tiene ninguna', /no tiene ninguna imagen/.test(html));
  chk('el pie ya no miente con «el comprobante no se toca»', !/comprobante no se toca/.test(html));

  let r = await adjuntar(0);
  chk('la imagen queda pegada al ADELANTO', r.comps[0].length===1 && /NUEVA/.test(r.comps[0][0]),
      JSON.stringify(r.comps));
  chk('…sin robársela a los otros pagos',
      r.comps[1].join()==='VIEJA1' && r.comps[2].length===0, JSON.stringify(r.comps));

  // ============ 2. la plata no se mueve ni un centavo ============
  chk('el adelanto sigue siendo el mismo', r.acuenta===1000, r.acuenta);
  chk('lo cobrado sigue igual', r.cobrado===600, r.cobrado);
  chk('el saldo sigue igual', r.saldo===400, r.saldo);
  chk('el total de la venta no se movió', r.venta===2000, r.venta);
  chk('el historial conserva las fechas y los recibos',
      /@2026-08-03/.test(r.metodo) && /#276/.test(r.metodo) && /@2026-08-10/.test(r.metodo) && /#301/.test(r.metodo),
      r.metodo.slice(0,120));
  chk('…y el banco del QR', /QR BISA/.test(r.metodo), r.metodo.slice(0,60));
  chk('…y el recargo por entrega sigue aparte', /\^/.test(r.metodo), r.metodo.slice(-60));

  // ============ 3. el editor queda abierto y muestra la imagen nueva ============
  html = await page.evaluate(()=>document.getElementById('modal').innerHTML);
  chk('el editor sigue abierto después de subirla', /Corregir este pago/.test(html));
  chk('…y ya se ve la imagen, con su ✕ para quitarla', /ctaQuitarCompEdit\('PC',0,0\)/.test(html));

  // ============ 4. quitarla del ADELANTO ============
  const quit = await page.evaluate(async () => {
    ctaQuitarCompEdit('PC',0,0);
    await new Promise(r=>setTimeout(r,300));
    var p=findById('PC');
    return { comps:compsArr(anticipoDe(p).comps), borradas:window._borradas.slice(),
             acuenta:p.acuenta, saldo:p.saldo };
  });
  chk('se puede quitar la imagen del adelanto', quit.comps.length===0, JSON.stringify(quit.comps));
  chk('…y se borra también del Drive', quit.borradas.length===1 && /NUEVA/.test(quit.borradas[0]),
      JSON.stringify(quit.borradas));
  chk('…sin tocar la plata', quit.acuenta===1000 && quit.saldo===400, quit.acuenta+'/'+quit.saldo);

  // ============ 5. el COBRO normal ============
  await prep();
  html = await abrirEditor(1);
  chk('el editor del COBRO también ofrece adjuntar', /ctaAdjuntarEdit\('PC',1\)/.test(html));
  chk('…y ya muestra la que tenía', /ctaQuitarCompEdit\('PC',1,0\)/.test(html));
  r = await adjuntar(1);
  chk('la segunda imagen se suma al cobro, sin pisar la primera',
      r.comps[1].length===2 && r.comps[1][0]==='VIEJA1', JSON.stringify(r.comps[1]));
  chk('…y no se le cuela al adelanto ni al recargo',
      r.comps[0].length===0 && r.comps[2].length===0, JSON.stringify(r.comps));
  chk('la plata del cobro tampoco se movió', r.cobrado===600 && r.saldo===400, r.cobrado+'/'+r.saldo);

  // ============ 6. el RECARGO POR ENTREGA ============
  await prep();
  html = await abrirEditor(2);
  chk('el editor del RECARGO también ofrece adjuntar', /ctaAdjuntarEdit\('PC',2\)/.test(html));
  r = await adjuntar(2);
  chk('la imagen queda en el recargo y en ningún otro',
      r.comps[2].length===1 && r.comps[0].length===0 && r.comps[1].join()==='VIEJA1',
      JSON.stringify(r.comps));
  chk('el recargo no le baja el saldo a la venta', r.saldo===400, r.saldo);

  // ============ 7. lo tipeado no se pierde al subir la imagen ============
  await prep();
  const tipeado = await page.evaluate(async () => {
    ctaEditarPago('PC', 0);
    await new Promise(r=>setTimeout(r,150));
    document.getElementById('cta-ed-monto').value='1234';
    document.getElementById('cta-ed-nota').value='999';
    document.getElementById('cta-ed-fecha').value='2026-08-05';
    ctaAdjuntarEdit('PC', 0);
    onCompElegido({ target:{ files:[{name:'x.jpg'}], dataset:{pedido:'PC'} } });
    await new Promise(r=>setTimeout(r,400));
    return { monto:(document.getElementById('cta-ed-monto')||{}).value,
             nota:(document.getElementById('cta-ed-nota')||{}).value,
             fecha:(document.getElementById('cta-ed-fecha')||{}).value,
             guardado:(Number(findById('PC').acuenta)||0) };
  });
  chk('el monto que se estaba tipeando NO se pierde al adjuntar', tipeado.monto==='1234', tipeado.monto);
  chk('…ni el n° de recibo', tipeado.nota==='999', tipeado.nota);
  chk('…ni la fecha', tipeado.fecha==='2026-08-05', tipeado.fecha);
  chk('…y todavía no se guardó nada (falta tocar Guardar)', tipeado.guardado===1000, tipeado.guardado);

  // ============ 8. y al cerrar el editor, lo tipeado se descarta ============
  const cerrado = await page.evaluate(async () => {
    ctaEditarPago('PC', -1);
    await new Promise(r=>setTimeout(r,100));
    ctaEditarPago('PC', 0);
    await new Promise(r=>setTimeout(r,150));
    return (document.getElementById('cta-ed-monto')||{}).value;
  });
  chk('al reabrirlo vuelve a mostrar el monto de verdad, no el descartado',
      cerrado==='1000', cerrado);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
