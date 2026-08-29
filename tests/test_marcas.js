/* 🛏️💚 LAS DOS MARCAS, Y VOLVER DE UNA EDICIÓN.
   Dos pedidos del dueño en el mismo mensaje:

   1. 🐛 «¿por qué cuando los vendedores editan un pedido no les sale la confirmación y los
      lleva al panel de admin a poner la clave?» — `after()` terminaba SIEMPRE en
      `showView('admin')`, porque editar era cosa de administración. Desde que las
      vendedoras editan lo suyo (§4bc), guardar las escupía a la pantalla del candado.

   2. Dos fichas nuevas en el Cuadre: el total de SUEÑA (Mauricio, Juan Pablo, Fernando) y
      el de HEAVEN (Jonathan, María, Isabel, Carola, Mirian). */
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

  // ============================================================================
  // 1) 🐛 LA VENDEDORA EDITA Y NO TERMINA EN EL CANDADO
  // ============================================================================
  const prep = (conClave) => page.evaluate(async (conClave) => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=!!conClave;
    if(conClave){
      document.getElementById('admin-lock').style.display='none';
      document.getElementById('admin-content').style.display='block';
      mostrarBotonesTodos();
    }
    window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r));
      window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F));
    var p={ id:'PE', fecha:F, turno:'AM', oc:'08-500', nota:'44', vendedor:'Carola Chavez',
      cliente:'DOÑA ELSA', celular:'70000000', zona:'Norte', direccion:'Av. Vieja', maps:'',
      pagado:false, saldo:1000, acuenta:0, cobradoBs:0, metodoPago:'', observaciones:'',
      garantia:'', facturarA:'', nit:'', estado:'En stock', entregado:false, verificado:true,
      vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
      productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1, chk:'ok'}] };
    STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror();
    closeModal(); resetForm();
    showView('mis');
    var mv=document.getElementById('mis-vendedor'); if(mv) mv.value='Carola Chavez';
    renderMis();
    await new Promise(r=>setTimeout(r,150));
  }, conClave);

  /* Edita desde donde se le pida y devuelve dónde terminó. */
  const editarYGuardar = (comoAbrir, cambios) => page.evaluate(async (a) => {
    eval(a.comoAbrir);
    await new Promise(r=>setTimeout(r,250));
    eval('(function(){'+a.cambios+'})()');
    submitPedido();
    await new Promise(r=>setTimeout(r,700));
    var vistaActiva='';
    ['form','mis','admin','conta','chofer'].forEach(function(v){
      var e=document.getElementById('view-'+v);
      if(e && e.classList.contains('active')) vistaActiva=v;
    });
    var m=document.getElementById('modal');
    var lock=document.getElementById('admin-lock');
    return { vista:vistaActiva,
             candado: !!(lock && lock.style.display!=='none' && vistaActiva==='admin'),
             modal: (m && m.classList.contains('on')) ? m.textContent.replace(/\s+/g,' ').trim() : '',
             guardado: findById('PE').direccion };
  }, {comoAbrir, cambios});

  await prep(false);                              // vendedora SIN la clave
  let r = await editarYGuardar("editarDesdeMis('PE')",
                               "document.getElementById('f-direccion').value='Av. Nueva 100';");
  chk('🐛 la vendedora ya NO termina en la pantalla del candado', r.candado===false, r.candado);
  chk('…vuelve a «Mis pedidos», de donde salió', r.vista==='mis', r.vista);
  chk('…y el cambio SÍ se guardó', r.guardado==='Av. Nueva 100', r.guardado);
  chk('🐛 ahora SÍ le sale la confirmación', /Cambios guardados/.test(r.modal), r.modal.slice(0,80));
  chk('…diciéndole qué cambió', /cambió la dirección/i.test(r.modal), r.modal.slice(0,200));
  chk('…y avisándole que al almacén le llegó el aviso',
      /almacén le llegó el aviso/i.test(r.modal), r.modal.slice(0,260));
  chk('…con el botón para volver a pasar la venta actualizada',
      await page.evaluate(()=>/waDesdeEdicion/.test(document.getElementById('modal').innerHTML)));

  // sin cambios que le importen a logística, no inventa un aviso que no existe
  await prep(false);
  r = await editarYGuardar("editarDesdeMis('PE')",
                           "document.getElementById('f-garantia').value='Juan';");
  chk('si no cambió nada de la entrega, lo dice sin inventar',
      /no cambió nada/i.test(r.modal), r.modal.slice(0,200));
  chk('…y tampoco dice que le avisó al almacén',
      !/almacén le llegó/i.test(r.modal), r.modal.slice(0,200));

  // con la clave puesta, administración vuelve a SU pantalla
  await prep(true);
  r = await editarYGuardar("EDIT_DESDE='admin';editPedido('PE')",
                           "document.getElementById('f-direccion').value='Av. Admin 200';");
  chk('administración, en cambio, sí vuelve a su pantalla', r.vista==='admin', r.vista);
  chk('…sin candado, porque tiene la clave puesta', r.candado===false, r.candado);

  // ============================================================================
  // 2) 🛏️💚 LAS DOS MARCAS
  // ============================================================================
  const fichas = await page.evaluate(async () => {
    var L=function(a){ return textoCobros(a); };
    var mk=function(id,vend,monto){ return { id:id, cliente:'CLI '+id, nota:id, vendedor:vend,
      fecha:'2026-08-05', ts:new Date('2026-08-05T10:00:00').getTime(), saldo:0, acuenta:0,
      pagado:true, cobradoBs:0,
      metodoPago:L([{metodo:'Efectivo', monto:monto, fecha:'2026-08-05', nota:id, comps:['F'+id]}]),
      entregado:false, verificado:false, oc:'', observaciones:'', garantia:'', facturarA:'',
      nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N',
      direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',cant:1}] }; };
    STATE=[
      mk('1','Mauricio Merida',      1000),   // Sueña
      mk('2','Juan Pablo Paredes',    500),   // Sueña
      mk('3','Fernando Peinado',      500),   // Sueña
      mk('4','Jonathan Monje',       2000),   // Heaven
      mk('5','Maria Flores',         1000),   // Heaven
      mk('6','Isabel Robledo',        500),   // Heaven
      mk('7','Carola Chavez',         300),   // Heaven
      mk('8','Mirian Salazar',        200)    // Heaven
    ];
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    closeModal();
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    await new Promise(r=>setTimeout(r,300));
    segSet('cua-mode','todo'); setCuadreModo('todo');
    await new Promise(r=>setTimeout(r,350));
    var box=document.getElementById('cua-metrics');
    return { txt:box.textContent.replace(/\s+/g,' '),
             marcas:totalPorMarca(cuadrePagos()) };
  });
  chk('la ficha de SUEÑA existe', /Sueña/.test(fichas.txt), fichas.txt.slice(0,0));
  chk('…y suma a sus tres vendedores (1000+500+500)', fichas.marcas.suena.bs===2000,
      fichas.marcas.suena.bs);
  chk('…con sus 3 ventas', fichas.marcas.suena.nv===3, fichas.marcas.suena.nv);
  chk('la ficha de HEAVEN existe', /Heaven/.test(fichas.txt));
  chk('…y suma a sus cinco (2000+1000+500+300+200)', fichas.marcas.heaven.bs===4000,
      fichas.marcas.heaven.bs);
  chk('…con sus 5 ventas', fichas.marcas.heaven.nv===5, fichas.marcas.heaven.nv);
  chk('las dos juntas dan el total que entró',
      fichas.marcas.suena.bs+fichas.marcas.heaven.bs===6000,
      fichas.marcas.suena.bs+'+'+fichas.marcas.heaven.bs);
  chk('nadie queda «sin marca»', fichas.marcas.otros.bs===0, fichas.marcas.otros.bs);
  chk('las fichas muestran el porcentaje de cada una',
      /33% de lo que entró/.test(fichas.txt) && /67% de lo que entró/.test(fichas.txt),
      fichas.txt.replace(/.*Sueña/,'Sueña').slice(0,140));

  // un vendedor que no está en ninguna marca NO se reparte a la fuerza: se avisa
  const suelto = await page.evaluate(async () => {
    STATE.push({ id:'9', cliente:'CLI 9', nota:'9', vendedor:'Vendedor Nuevo',
      fecha:'2026-08-05', ts:new Date('2026-08-05T10:00:00').getTime(), saldo:0, acuenta:0,
      pagado:true, cobradoBs:0,
      metodoPago:textoCobros([{metodo:'Efectivo', monto:900, fecha:'2026-08-05', nota:'9', comps:['F9']}]),
      entregado:false, verificado:false, oc:'', observaciones:'', garantia:'', facturarA:'',
      nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N',
      direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',cant:1}] });
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    renderCuadre();
    await new Promise(r=>setTimeout(r,200));
    return { txt:document.getElementById('cua-metrics').textContent.replace(/\s+/g,' '),
             m:totalPorMarca(cuadrePagos()) };
  });
  chk('un vendedor fuera de las dos marcas NO se le suma a ninguna',
      suelto.m.suena.bs===2000 && suelto.m.heaven.bs===4000,
      suelto.m.suena.bs+'/'+suelto.m.heaven.bs);
  chk('…y se avisa aparte, para que nadie lo dé por repartido',
      /Sin marca/.test(suelto.txt) && suelto.m.otros.bs===900, suelto.m.otros.bs);

  chk('filtrar por una vendedora deja su marca y vacía la otra',
      await page.evaluate(async () => {
        var sv=document.getElementById('cua-vendedor');
        if(sv){ sv.value='Mauricio Merida'; }
        renderCuadre();
        await new Promise(r=>setTimeout(r,200));
        var m=totalPorMarca(cuadrePagos());
        sv.value=''; renderCuadre();
        return m.suena.bs===1000 && m.heaven.bs===0;
      }));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
