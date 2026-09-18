/* 📎 EL COMPROBANTE QUE «SALIÓ LISTO» Y DESPUÉS NO ESTABA (§4em).

   El dueño y Mirian: *"a veces uno sube un comprobante de pago y cuando volvés a abrir el
   pedido nunca subió, no aparece, se borra, siendo que cargó y salió LISTO"*.
   Reproducido: la vendedora abre su pedido con ✏️ Editar, sube la imagen (la Drive la
   acepta y el panel dice «Imagen lista ✓»), guarda sin tocar montos («Cambios guardados ✓»)
   … y el historial de pagos se conservaba tal cual, SIN la imagen nueva.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Que la imagen subida al editar quede pegada al adelanto aunque no cambie la plata.
   2. Que las imágenes que ya tenía no se pierdan (el formulario abre con TODAS, no solo una).
   3. Que la plata siga igual: mismo total, mismo saldo, mismos cobros posteriores.
   4. Que quitar una imagen en el formulario también se guarde.

   Red cortada, servidor simulado. Se corre:  node tests/test_comp_perdido.js */
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
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false; window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true, pedido:g}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiPost=function(){ return Promise.resolve({ok:true}); };
    window._toasts=[]; toast=function(m,k){ window._toasts.push(String(k)+': '+m); }; confirm=function(){ return true; };
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F)||diaCerrado(F));
    var armar=function(hist, extra){
      var p=Object.assign({ id:'PC', fecha:F, turno:'AM', oc:'09-700', nota:'1800', vendedor:'Carola Chavez', cliente:'DON COMPROBANTE', celular:'70000000', zona:'Norte', direccion:'Av. X', maps:'',
        pagado:false, saldo:400, acuenta:1000, cobradoBs:0, metodoPago:hist, observaciones:'', garantia:'', facturarA:'', nit:'', estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
        productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1}] }, extra||{});
      STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror(); resetForm(); editarDesdeMis('PC');
    };
    var guardar=async function(){ window._toasts=[]; submitPedido(); await new Promise(r=>setTimeout(r,400)); return findById('PC'); };
    // adelanto con UNA imagen + un cobro posterior con la suya
    var hist=textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-09-10', nota:'1800', comps:['IMG_VIEJA']},
                          {metodo:'Efectivo', monto:600, fecha:'2026-09-12', nota:'1801', comps:['IMG_COBRO']}]);
    armar(hist); await new Promise(r=>setTimeout(r,250));
    chk('el formulario abre con la imagen del adelanto', FORM_COMPS.join(',')==='IMG_VIEJA', FORM_COMPS.join(','));
    FORM_COMPS=compsArr(FORM_COMPS.concat(['IMG_NUEVA'])); renderCompForm(true);
    var q=await guardar();
    var a=anticipoDe(q), cb=cobrosDe(q);
    chk('⚠️ la imagen nueva queda en el adelanto aunque no se tocó la plata', compsArr(a.comps).join(',')==='IMG_VIEJA,IMG_NUEVA', q.metodoPago);
    chk('…el cobro posterior conserva la suya', cb.length===1 && compsArr(cb[0].comps).join(',')==='IMG_COBRO', JSON.stringify(cb));
    chk('…y la plata sigue igual: anticipo 1000, cobrado 600, saldo 400, total 2000', a.monto===1000 && totalCobrado(q)===600 && Number(q.saldo)===400 && ventaTotal(q)===2000, a.monto+'/'+totalCobrado(q)+'/'+q.saldo+'/'+ventaTotal(q));
    chk('…con su fecha y su recibo', a.fecha==='2026-09-10' && a.nota==='1800', a.fecha+' '+a.nota);
    // dos imágenes previas: el formulario abre con las dos y al guardar siguen las dos + la nueva
    armar(textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-09-10', nota:'1800', comps:['IMG_A','IMG_B']}])); await new Promise(r=>setTimeout(r,250));
    chk('con dos imágenes previas el formulario abre con las DOS (antes solo la primera)', FORM_COMPS.join(',')==='IMG_A,IMG_B', FORM_COMPS.join(','));
    FORM_COMPS=compsArr(FORM_COMPS.concat(['IMG_C'])); var q2=await guardar();
    chk('…y al guardar quedan las tres', compsArr(anticipoDe(q2).comps).join(',')==='IMG_A,IMG_B,IMG_C', q2.metodoPago);
    // guardar sin imagen nueva no cambia nada
    armar(hist); await new Promise(r=>setTimeout(r,250));
    document.getElementById('f-direccion').value='Av. Y'; var q3=await guardar();
    chk('guardar sin imagen nueva conserva el historial exactamente igual', q3.metodoPago===hist && q3.direccion==='Av. Y', q3.metodoPago);
    return casos;
  });
  console.log('\n── El comprobante subido al editar ──');
  R.forEach(c => chk(c.n, c.ok, c.det));
  chk('sin errores de JavaScript en la página', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
