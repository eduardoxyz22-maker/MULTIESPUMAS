/* 🛡️ EL GUARDADO DE PUNTA A PUNTA — lo que se vio vs lo que quedó (§4eo).

   Sale de la auditoría de todos los caminos de guardado (18/09) y del reclamo del dueño:
   *"un vendedor pierde tiempo revisando 2-3 veces si subió y volviéndolo a subir"*.

   ⚠️ LO QUE ESTE TEST CUIDA:
   A1. Una edición que el servidor rechaza (busy, día cerrado…) NO saca el pedido de la
       pantalla ni deja el formulario listo para pisar la fila entera con fotos/chofer vacíos.
   A2. Sin respuesta del servidor NO hay modal verde «✓ Pedido guardado» ni «pasá la venta»:
       hay un modal «⏳ Quedó en cola en este dispositivo».
   A3. Un `list` que vuelve tarde no deshace en pantalla lo que se acaba de marcar, y el
       guardado que esperaba turno manda lo último que tocó la persona.
   M1. Al editar sin tocar la plata: la imagen nueva entra aunque no haya adelanto (va al
       primer cobro) y quitar una imagen también se guarda.
   M5. Un guardado del chofer que el servidor no contesta sale en rojo, no en verde solo.
   M6. Un «conflicto» con la misma fila (respuesta perdida + reenvío) no pide rehacer nada.

   Red cortada, servidor simulado. Se corre:  node tests/test_guardado.js */
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
    var apiSaveOrig=apiSave, apiSaveAhoraOrig=apiSaveAhora;   // la cola real de guardados, para A3
    var apiSaveBien=function(r){ var g=JSON.parse(JSON.stringify(r)); g.rev=Date.now(); window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true, pedido:g}); };
    apiSave=apiSaveBien;
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiPost=function(){ return Promise.resolve({ok:true}); };
    window._toasts=[]; toast=function(m,k){ window._toasts.push(String(k)+': '+m); }; confirm=function(){ return true; };
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F)||diaCerrado(F));
    var base=function(extra){ return Object.assign({ id:'PG', fecha:F, turno:'AM', oc:'09-800', nota:'1900', vendedor:'Carola Chavez', cliente:'DON GUARDADO', celular:'70000000', zona:'Norte', direccion:'Av. X', maps:'',
      pagado:false, saldo:400, acuenta:1000, cobradoBs:0, metodoPago:'', observaciones:'', garantia:'', facturarA:'', nit:'', estado:'En stock', entregado:false, verificado:true, vehiculo:'Camión 1', chofer:'Pepe', nroDia:1, ts:Date.now(), rev:1000, fotos:['FOTO_ENTREGA'],
      productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1, chk:'ok'}] }, extra||{}); };
    var armar=function(extra){ var p=base(extra); STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror(); setPending([]); resetForm(); editarDesdeMis('PG'); };
    var guardar=async function(){ window._toasts=[]; submitPedido(); await new Promise(r=>setTimeout(r,400)); return findById('PG'); };
    var modalTxt=function(){ return document.getElementById('modal').classList.contains('on') ? document.getElementById('modal-box').innerText.replace(/\s+/g,' ') : ''; };

    // A1 — edición rechazada por busy: el pedido sigue con todo, y el segundo Guardar no lo pisa
    armar({ metodoPago:textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-09-10', nota:'1900', comps:['IMG1']}]) }); await new Promise(r=>setTimeout(r,250));
    apiSave=function(r){ return Promise.resolve({ok:false, error:'busy'}); };
    document.getElementById('f-direccion').value='Av. Nueva'; var q=await guardar();
    chk('A1 ⚠️ rechazo busy al editar: el pedido sigue en pantalla con sus fotos, chofer y marcas', !!q && q.fotos.join(',')==='FOTO_ENTREGA' && q.chofer==='Pepe' && q.verificado===true && q.productos[0].chk==='ok', q?JSON.stringify([q.fotos,q.chofer,q.verificado]):'desapareció');
    chk('…y el formulario sigue abierto en edición para reintentar', EDIT_ID==='PG', EDIT_ID);
    apiSave=apiSaveBien; var q2=await guardar();
    chk('…el segundo Guardar entra con TODO (fotos, chofer, marcas, dirección nueva)', !!q2 && q2.fotos.join(',')==='FOTO_ENTREGA' && q2.chofer==='Pepe' && q2.productos[0].chk==='ok' && q2.direccion==='Av. Nueva' && /IMG1/.test(q2.metodoPago), q2?JSON.stringify([q2.fotos,q2.chofer,q2.direccion]):'');
    // A1b — si el pedido ya no está en el dispositivo, no se guarda a ciegas
    armar({ acuenta:0, saldo:1400, metodoPago:'' }); await new Promise(r=>setTimeout(r,250)); STATE=[]; var q3=await guardar();
    chk('A1 sin la copia original NO guarda (avisa que se recargue)', !q3 && window._toasts.some(function(t){ return /ya no está en este dispositivo/.test(t); }), window._toasts.join(' | ').slice(0,120));

    // A2 — sin respuesta: nada de verde, modal de cola
    resetForm(); STATE=[]; window._pl=[]; setPending([]);
    apiSave=function(){ return Promise.reject(new Error('Failed to fetch')); };
    document.getElementById('f-vendedor').value='Carola Chavez'; document.getElementById('f-cliente').value='SIN RED'; document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av. 1'; document.getElementById('f-fecha').value=F; segSet('f-turno','AM'); document.getElementById('f-nota').value='1901';
    var pd=document.querySelector('#f-productos .prod-desc'); pd.value='COLCHON SOFT'; document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
    window._toasts=[]; submitPedido(); await new Promise(r=>setTimeout(r,500));
    var mt=modalTxt();
    chk('A2 ⚠️ sin respuesta del servidor NO sale el modal verde ni «pasá la venta»: sale «Quedó en cola»', /Quedó en cola/.test(mt) && !/Pedido guardado/.test(mt) && !/WhatsApp/.test(mt), mt.slice(0,120));
    chk('…y el pedido está en la cola de este dispositivo', getPending().length===1 && getPending()[0].cliente==='SIN RED', getPending().length);
    closeModal(); apiSave=apiSaveBien;

    // A3 — el list tardío no deshace lo recién marcado
    setPending([]); var p3=base({ entregado:false }); STATE=[p3]; window._pl=[JSON.parse(JSON.stringify(p3))];
    apiSave=apiSaveOrig; var lento, enviado=null, nSaves=0;
    apiSaveAhora=function(r){ nSaves++; if(nSaves===1) return new Promise(function(res){ lento=function(){ res({ok:true, pedido:JSON.parse(JSON.stringify(r))}); }; }); enviado=JSON.parse(JSON.stringify(r)); return Promise.resolve({ok:true, pedido:enviado}); };
    var viejo=JSON.parse(JSON.stringify(window._pl));          // la consulta salió ANTES del toque
    p3.entregado=true; persistPedido(p3);                       // el chofer marca Entregado (guardado en vuelo)
    STATE=mergePending(viejo);                                  // la consulta vieja vuelve
    chk('A3 ⚠️ el list viejo NO deshace en pantalla la marca en vuelo', findById('PG').entregado===true, findById('PG').entregado);
    p3.chofer='Luis'; var seg=persistPedido(p3);                // segundo toque mientras el primero viaja
    var pl2=JSON.parse(JSON.stringify(viejo)); STATE=mergePending(pl2);
    lento(); await new Promise(r=>setTimeout(r,400));
    chk('…y el guardado que esperaba turno manda lo último que tocó la persona (entregado + chofer Luis), no la copia vieja', !!enviado && enviado.entregado===true && enviado.chofer==='Luis' && nSaves===2, JSON.stringify(enviado&&[enviado.entregado,enviado.chofer])+' saves '+nSaves);
    apiSaveAhora=apiSaveAhoraOrig; apiSave=apiSaveBien;

    // M1 — sin adelanto: la imagen nueva va al primer cobro; quitar también se guarda
    armar({ pagado:true, saldo:0, acuenta:0, cobradoBs:1400, metodoPago:textoCobros([{metodo:'Efectivo', monto:1400, fecha:'2026-09-12', nota:'1900', comps:['IMG_C1']}]) }); await new Promise(r=>setTimeout(r,250));
    FORM_COMPS=compsArr(FORM_COMPS.concat(['IMG_C2'])); var q4=await guardar();
    chk('M1 ⚠️ sin adelanto, la imagen nueva queda en el primer cobro', !!q4 && compsArr(cobrosDe(q4)[0].comps).join(',')==='IMG_C1,IMG_C2', q4&&q4.metodoPago);
    armar({ metodoPago:textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-09-10', nota:'1900', comps:['IMG_A','IMG_B']}]) }); await new Promise(r=>setTimeout(r,250));
    quitarCompForm(0); var q5=await guardar();
    chk('M1 quitar una imagen en el formulario también se guarda', !!q5 && compsArr(anticipoDe(q5).comps).join(',')==='IMG_B', q5&&q5.metodoPago);

    // M5 — un guardado del chofer sin respuesta sale en rojo
    setPending([]); var p6=base(); STATE=[p6]; apiSave=function(){ return Promise.reject(new Error('Failed to fetch')); };
    window._toasts=[]; p6.entregado=true; await persistPedido(p6);
    chk('M5 ⚠️ el guardado del chofer sin respuesta avisa en rojo y queda en cola', window._toasts.some(function(t){ return /^err: /.test(t) && /NO está en la planilla/.test(t) && /DON GUARDADO/.test(t); }) && getPending().length===1, window._toasts.join(' | ').slice(0,140));
    apiSave=apiSaveBien; setPending([]);

    // M6 — conflicto con la misma fila = ok tardío
    var p7=base({ rev:5 }); STATE=[p7]; window._toasts=[]; localStorage.removeItem('ME_RECHAZOS_V1');
    var mismo=JSON.parse(JSON.stringify(p7)); mismo.rev=9; mismo.nroDia=3;
    apiSave=function(r){ rechazoFirme(r, {ok:false, error:'conflicto', pedido:mismo}); return Promise.resolve({ok:false, error:'conflicto', pedido:mismo}); };
    await persistPedido(p7);
    chk('M6 ⚠️ un «conflicto» con la MISMA fila no pide rehacer nada ni queda como rechazo', !window._toasts.some(function(t){ return /modificó otra persona/.test(t); }) && rechazosLocales().length===0 && findById('PG').rev===9, window._toasts.join(' | ').slice(0,120)+' rev '+findById('PG').rev);
    var distinto=JSON.parse(JSON.stringify(p7)); distinto.rev=11; distinto.chofer='OTRO';
    apiSave=function(r){ rechazoFirme(r, {ok:false, error:'conflicto', pedido:distinto}); return Promise.resolve({ok:false, error:'conflicto', pedido:distinto}); };
    window._toasts=[]; await persistPedido(p7);
    chk('…pero un conflicto de verdad (la fila cambió) sigue avisando', window._toasts.some(function(t){ return /modificó otra persona/.test(t); }) && findById('PG').chofer==='OTRO', window._toasts.join(' | ').slice(0,100));
    apiSave=apiSaveBien; setPending([]);
    return casos;
  });
  console.log('\n── El guardado de punta a punta ──');
  R.forEach(c => chk(c.n, c.ok, c.det));
  chk('sin errores de JavaScript en la página', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
