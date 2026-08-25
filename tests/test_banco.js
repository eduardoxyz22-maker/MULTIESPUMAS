/* 🏦 EL BANCO DEL QR AL EDITAR UN PEDIDO VIEJO.
   Cada vendedora ve solo SUS bancos (Carola: BISA / Económico). Está bien para cargar un
   pedido nuevo. Pero al EDITAR uno viejo el banco registrado puede no estar en su lista:
   el pedido pasó de otra vendedora, o las cuentas cambiaron con el tiempo.

   Lo que pasaba: el botón de ese banco no existía, el segmento quedaba vacío y al guardar
   saltaba «Elegí a qué banco entró el QR». La vendedora quedaba TRABADA — no podía
   corregir ni la dirección — y la única salida era marcar otro banco, o sea MENTIR sobre
   dónde entró la plata. Salió al ponerles el botón Editar en «Mis pedidos» (§4bc). */
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

  /* Deja en la planilla un pedido de Carola cobrado por QR al banco que se le pida,
     con DOS pagos anotados, y lo abre con el botón de «Mis pedidos». */
  const abrir = (banco) => page.evaluate(async (banco) => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r));
      window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    window._toasts=[]; if(!window._toastOrig) window._toastOrig=window.toast;
    window.toast=function(m,k){ window._toasts.push(k+': '+m); return window._toastOrig.apply(null,arguments); };
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F));
    var hist=textoCobros([
      {anticipo:true,  metodo:'QR', banco:banco, monto:500, fecha:'2026-08-20', nota:'11', comps:['ID1']},
      {anticipo:false, metodo:'Efectivo',        monto:300, fecha:'2026-08-22', nota:'12', comps:[]}
    ]);
    var p={ id:'PY', fecha:F, turno:'AM', oc:'08-600', nota:'11', vendedor:'Carola Chavez',
      cliente:'DON PEPE', celular:'70000000', zona:'Norte', direccion:'Av. Vieja', maps:'',
      pagado:false, saldo:200, acuenta:500, cobradoBs:0, metodoPago:hist, observaciones:'',
      garantia:'', facturarA:'', nit:'', estado:'', entregado:false, verificado:false,
      vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
      productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1}] };
    STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror();
    resetForm();
    editarDesdeMis('PY');
    await new Promise(r=>setTimeout(r,250));
    return { banco:segVal('f-banco'),
             botones:[].slice.call(document.querySelectorAll('#f-banco button')).map(function(b){return b.getAttribute('data-val');}),
             etiquetas:(document.getElementById('f-banco')||{}).textContent||'' };
  }, banco);

  /* Cambia la dirección y guarda, como haría la vendedora. */
  const guardar = () => page.evaluate(async () => {
    document.getElementById('f-direccion').value='Av. Nueva 500';
    submitPedido();
    await new Promise(r=>setTimeout(r,600));
    var q=findById('PY');
    return { dir:q.direccion, metodo:String(q.metodoPago),
             pagos:parseCobros(q.metodoPago).length, entro:totalCobrado(q),
             toasts:window._toasts.slice() };
  });

  // ========== 1. el caso normal: el banco ES de la vendedora ==========
  const bisa = await abrir('BISA');
  chk('con su propio banco, queda marcado al abrir', bisa.banco==='BISA', bisa.banco);
  const g1 = await guardar();
  chk('…y guarda sin trabarse', g1.dir==='Av. Nueva 500', g1.dir);

  // ========== 2. el caso del bug: el banco NO está en su lista ==========
  const gan = await abrir('Ganadero');
  chk('el banco del pedido aparece aunque no sea de esta vendedora',
      gan.botones.indexOf('Ganadero')>=0, JSON.stringify(gan.botones));
  chk('…y queda MARCADO, no en blanco', gan.banco==='Ganadero', gan.banco);
  chk('se avisa que es el que ya estaba registrado', /ya registrado/.test(gan.etiquetas), gan.etiquetas.trim());
  chk('los suyos siguen estando', gan.botones.indexOf('BISA')>=0 && gan.botones.indexOf('Económico')>=0,
      JSON.stringify(gan.botones));

  const g2 = await guardar();
  chk('la vendedora PUEDE corregir la dirección de un pedido cobrado a otro banco',
      g2.dir==='Av. Nueva 500', g2.dir);
  chk('no salta el «Elegí a qué banco entró el QR»',
      !g2.toasts.some(t=>/qué banco/i.test(t)), JSON.stringify(g2.toasts));
  chk('el banco registrado NO se cambia: la plata sigue diciendo que entró a Ganadero',
      /QR Ganadero/.test(g2.metodo), g2.metodo.slice(0,80));
  chk('los dos pagos anotados siguen ahí', g2.pagos===2, g2.pagos);
  chk('y la plata que entró es la misma', g2.entro===300, g2.entro);

  // ========== 3. la venta PAGADA del todo por QR ==========
  const pag = await page.evaluate(async () => {
    var p=findById('PY');
    p.pagado=true; p.saldo=0; p.acuenta=0;
    p.metodoPago=textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:800,
                               fecha:'2026-08-20', nota:'11', comps:['ID1']}]);
    p.direccion='Av. Vieja';
    STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror();
    resetForm();
    editarDesdeMis('PY');
    await new Promise(r=>setTimeout(r,250));
    var b=segVal('f-banco');
    document.getElementById('f-direccion').value='Av. Nueva 700';
    window._toasts=[];
    submitPedido();
    await new Promise(r=>setTimeout(r,600));
    var q=findById('PY');
    return { banco:b, dir:q.direccion, metodo:String(q.metodoPago), toasts:window._toasts.slice() };
  });
  chk('una venta PAGADA por QR también abre con su banco marcado', pag.banco==='BISA', pag.banco);
  chk('…y se puede corregir la dirección', pag.dir==='Av. Nueva 700',
      pag.dir+' · '+JSON.stringify(pag.toasts));
  chk('…sin tocarle el pago a contabilidad', /QR BISA 800/.test(pag.metodo), pag.metodo.slice(0,70));

  // ========== 4. el banco prestado no se le cuela al pedido SIGUIENTE ==========
  const nuevo = await page.evaluate(() => {
    resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-acuenta').value='100';
    updateMetodoVisibility(); segSet('f-metodo','QR'); updateBancoVisibility();
    return [].slice.call(document.querySelectorAll('#f-banco button')).map(b=>b.getAttribute('data-val'));
  });
  chk('en un pedido NUEVO, Carola vuelve a ver solo los suyos',
      nuevo.indexOf('Ganadero')<0 && nuevo.indexOf('BISA')>=0, JSON.stringify(nuevo));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
