/* ✏️ LA VENDEDORA EDITA SU PROPIO PEDIDO — y logística se entera.
   El pedido: que las vendedoras puedan corregir lo suyo desde «Mis pedidos» (agregar o
   sacar un producto, cambiar la cantidad, la dirección, la ubicación) y que, si el
   almacén YA lo había revisado, les salte «ESTE PEDIDO FUE MODIFICADO».

   Y de paso, el bug gordo que salió buscando dónde meterlo: `getProductos()` arma la
   lista DE CERO con lo que hay en el formulario, así que CADA edición —hasta la de una
   coma en la dirección— dejaba a TODOS los productos sin ✔/✗/📥/🏭. El jefe de almacén
   revisaba el stock, la vendedora corregía el celular, y la revisión desaparecía sin que
   nadie se enterara. Eso es lo que prueban los puntos 1 y 2. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());          // los confirm() de aviso se aceptan
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Deja un pedido YA REVISADO por el almacén en la planilla, y devuelve su id.
     Se arma a mano (no por el formulario) porque lo que se prueba es la EDICIÓN. */
  const prep = () => page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    window._planilla=[];
    apiSave=function(rec){
      var g=JSON.parse(JSON.stringify(rec));
      window._planilla=window._planilla.filter(function(p){ return p.id!==g.id; }).concat([g]);
      return Promise.resolve({ok:true});
    };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._planilla))}); };
    var _d=new Date(), F;
    do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F));
    var p={ id:'PX', fecha:F, turno:'AM', oc:'08-500', nota:'99', vendedor:'Carola Chavez',
      cliente:'DOÑA MARTA', celular:'70000000', zona:'Norte', direccion:'Av. Uno 100',
      maps:'', pagado:false, saldo:1000, acuenta:0, cobradoBs:0, metodoPago:'',
      observaciones:'', garantia:'', facturarA:'', nit:'', estado:'En stock',
      entregado:false, verificado:true, vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
      productos:[ {desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1, chk:'ok'},
                  {desc:'ALMOHADA', medida:'', codigo:'A2', cant:2, chk:'ok'} ] };
    /* ⚠️ El pedido tiene que estar TAMBIÉN en la planilla simulada. `editPedido` termina
       en `showView('form')`, que se trae la planilla de nuevo; si el "servidor" estuviera
       vacío, STATE se vaciaría en el medio de la edición y el test mediría otra cosa. */
    STATE=[p]; window._planilla=[JSON.parse(JSON.stringify(p))]; saveMirror();
    return { id:p.id, fecha:F };
  });

  /* Abre el pedido en el formulario y lo guarda con los cambios que se le pidan.
     `cambios` corre DENTRO de la página, con el formulario ya cargado. */
  const editar = (id, cambios) => page.evaluate(async (a) => {
    editPedido(a.id);
    await new Promise(r=>setTimeout(r,150));
    eval('(function(){'+a.cambios+'})()');
    submitPedido();
    await new Promise(r=>setTimeout(r,600));
    var p=findById(a.id);
    return JSON.parse(JSON.stringify(p||{}));
  }, {id, cambios});

  // ================= 1. editar SIN tocar productos no borra la revisión =================
  await prep();
  const soloDir = await editar('PX', "document.getElementById('f-direccion').value='Av. Dos 200';");
  chk('cambiar solo la dirección NO le borra las marcas al almacén',
      (soloDir.productos||[]).every(x=>x.chk==='ok'),
      JSON.stringify((soloDir.productos||[]).map(x=>x.chk)));
  chk('…y el pedido sigue verificado', soloDir.verificado===true, soloDir.verificado);
  chk('la dirección sí cambió', soloDir.direccion==='Av. Dos 200', soloDir.direccion);

  // ================= 2. cambiar la CANTIDAD desmarca solo a ese producto =================
  await prep();
  const cant = await editar('PX', "document.querySelectorAll('#f-productos .prod-cant')[1].value='5';");
  chk('el producto que NO se tocó conserva su ✔', (cant.productos||[])[0] && cant.productos[0].chk==='ok',
      JSON.stringify((cant.productos||[]).map(x=>x.desc+':'+(x.chk||'—'))));
  chk('el producto al que le cambiaron la cantidad pierde el ✔ (hay que revisarlo de nuevo)',
      (cant.productos||[])[1] && !cant.productos[1].chk, JSON.stringify((cant.productos||[])[1]||{}));
  chk('el pedido deja de estar «listo para cargar»', cant.verificado===false, cant.verificado);

  // ================= 3. queda marcado como MODIFICADO, con qué cambió =================
  const m = await page.evaluate(() => { var x=modDe(findById('PX')); return x?JSON.parse(JSON.stringify(x)):null; });
  chk('el pedido queda marcado como modificado', !!m, m);
  chk('dice QUIÉN lo cambió', !!m && m.q==='Carola Chavez', m&&m.q);
  chk('dice CUÁNDO', !!m && /^\d{4}-\d{2}-\d{2}$/.test(m.f||''), m&&m.f);
  chk('dice QUÉ cambió, con el producto y los números',
      !!m && (m.d||[]).some(t=>/🔢/.test(t) && /ALMOHADA/.test(t) && /de 2 a 5/.test(t)),
      m&&JSON.stringify(m.d));
  chk('la marca queda en TODOS los productos (si borran el primero no se pierde el aviso)',
      await page.evaluate(()=> (findById('PX').productos||[]).every(x=>!!x.mod)));

  // ================= 4. el aviso se ve en las pantallas de logística =================
  const vistas = await page.evaluate(() => {
    var out={};
    showPedidoModal('PX');  out.admin = document.getElementById('modal').innerHTML;
    showCargaModal('PX');   out.carga = document.getElementById('modal').innerHTML;
    closeModal();
    var p=findById('PX');
    out.badge = avisoModifHtml(p, true);
    return out;
  });
  chk('la ficha de Administración muestra el cartel', /ESTE PEDIDO FUE MODIFICADO/.test(vistas.admin));
  chk('la ficha del jefe de almacén muestra el cartel', /ESTE PEDIDO FUE MODIFICADO/.test(vistas.carga));
  chk('el cartel dice qué cambió', /ALMOHADA/.test(vistas.admin), vistas.admin.slice(0,0));
  chk('el cartel trae el botón «Ya lo revisé»', /verVistoModif/.test(vistas.admin));
  chk('hay chapita compacta para la tabla', /MODIFICADO/.test(vistas.badge), vistas.badge);

  // ================= 5. «Ya lo revisé» saca el aviso =================
  const tras = await page.evaluate(async () => {
    verVistoModif('PX');
    await new Promise(r=>setTimeout(r,300));
    closeModal();
    return { mod: esModificado(findById('PX')), enPlanilla: (window._planilla.filter(p=>p.id==='PX')[0]||{}).productos };
  });
  chk('tocar «Ya lo revisé» quita el aviso', tras.mod===false, tras.mod);
  chk('…y eso viaja a la planilla (lo ven las demás computadoras)',
      Array.isArray(tras.enPlanilla) && tras.enPlanilla.every(x=>!x.mod),
      JSON.stringify(tras.enPlanilla));

  // ================= 6. agregar y sacar productos =================
  await prep();
  const mas = await editar('PX', "addProdRow('SOFT PLUS','200x200','A9',3);");
  const dMas = await page.evaluate(()=>{ var x=modDe(findById('PX')); return x?x.d:[]; });
  chk('agregar un producto se avisa con ➕', dMas.some(t=>/➕/.test(t)&&/SOFT PLUS/.test(t)), JSON.stringify(dMas));
  chk('el producto agregado entra sin marcas (nadie lo revisó todavía)',
      (mas.productos||[]).some(x=>x.desc==='SOFT PLUS' && !x.chk));

  await prep();
  await editar('PX', "var c=document.querySelectorAll('#f-productos .prod-card'); c[1].querySelector('.prod-desc').value='';");
  const dMenos = await page.evaluate(()=>{ var x=modDe(findById('PX')); return x?x.d:[]; });
  chk('sacar un producto se avisa con ➖', dMenos.some(t=>/➖/.test(t)&&/ALMOHADA/.test(t)), JSON.stringify(dMenos));

  // ================= 7. ubicación, zona, fecha y turno también se avisan =================
  await prep();
  await editar('PX', "document.getElementById('f-maps').value='-17.749444, -63.104556';"+
                     "document.getElementById('f-zona').value='Sur';");
  const dUbi = await page.evaluate(()=>{ var x=modDe(findById('PX')); return x?x.d:[]; });
  chk('poner la ubicación se avisa', dUbi.some(t=>/📍/.test(t)), JSON.stringify(dUbi));
  chk('cambiar de zona se avisa, y dice de cuál a cuál',
      dUbi.some(t=>/🗺️/.test(t)&&/Norte/.test(t)&&/Sur/.test(t)), JSON.stringify(dUbi));
  chk('cambiar la zona NO desmarca el stock (no cambia lo que se carga)',
      await page.evaluate(()=> findById('PX').verificado===true));

  // ================= 8. un pedido que NADIE revisó no molesta a nadie =================
  await page.evaluate(() => {
    var p=findById('PX');
    p.verificado=false; (p.productos||[]).forEach(function(x){ delete x.chk; delete x.mod; });
    STATE=[p]; window._planilla=[JSON.parse(JSON.stringify(p))]; saveMirror();
  });
  const sinRev = await editar('PX', "document.getElementById('f-direccion').value='Av. Tres 300';");
  chk('si el almacén todavía no lo había revisado, NO se marca nada',
      !esModificadoLocal(sinRev), JSON.stringify((sinRev.productos||[]).map(x=>!!x.mod)));
  function esModificadoLocal(p){ return (p.productos||[]).some(x=>x&&x.mod); }

  // ================= 9. el aviso sobrevive a una segunda edición =================
  await prep();
  await editar('PX', "document.querySelectorAll('#f-productos .prod-cant')[0].value='7';");
  await editar('PX', "document.getElementById('f-garantia').value='Juan';");   // nada que a logística le importe
  chk('editar otra vez algo que a logística no le importa NO borra el aviso anterior',
      await page.evaluate(()=> esModificado(findById('PX'))));

  // ================= 10. el botón de editar está en «Mis pedidos» =================
  const mis = await page.evaluate(() => {
    showMisModal('PX');
    var h=document.getElementById('modal').innerHTML;
    closeModal();
    return { modal:h, card: misCardHtml(findById('PX'), 1, false) };
  });
  chk('la ficha de «Mis pedidos» tiene el botón Editar', /editarDesdeMis/.test(mis.modal));
  chk('la tarjeta de «Mis pedidos» también', /editarDesdeMis/.test(mis.card));
  chk('la vendedora ve que su cambio le quedó marcado al almacén',
      /modificaste/i.test(mis.modal) || /MODIFICADO/.test(mis.modal), '');
  chk('editarDesdeMis abre el formulario de verdad',
      await page.evaluate(async () => {
        closeModal(); EDIT_ID=null;
        editarDesdeMis('PX');
        await new Promise(r=>setTimeout(r,200));
        return EDIT_ID==='PX' && document.getElementById('f-cliente').value==='DOÑA MARTA';
      }));

  // ================= 11. la marca viaja en el JSON de productos (sin columna nueva) =========
  chk('la marca va dentro de _productos_json: no hace falta ninguna columna nueva',
      await page.evaluate(() => {
        var p=findById('PX');
        var ida=JSON.stringify(p.productos||[]);
        var vuelta=JSON.parse(ida);
        return vuelta.some(function(x){ return x && x.mod && x.mod.q; });
      }));

  // ======= 12. el botón RÁPIDO de ubicación también avisa (era un agujero) =======
  await prep();
  const ubiRap = await page.evaluate(async () => {
    /* El prompt() del navegador no se puede tipear desde acá: se le pone la respuesta. */
    window.prompt=function(){ return '-17.749444, -63.104556'; };
    editarUbicacionMis('PX');
    await new Promise(r=>setTimeout(r,400));
    closeModal();
    var p=findById('PX'), m=modDe(p);
    return { maps:String(p.maps||''), mod:m?JSON.parse(JSON.stringify(m)):null };
  });
  chk('el botón rápido guarda la ubicación', /-17\.749444/.test(ubiRap.maps), ubiRap.maps);
  chk('…y AVISA a logística, igual que por el formulario', !!ubiRap.mod, JSON.stringify(ubiRap.mod));
  chk('…diciendo que le pusieron la ubicación',
      !!ubiRap.mod && (ubiRap.mod.d||[]).some(t=>/📍/.test(t)), ubiRap.mod&&JSON.stringify(ubiRap.mod.d));
  chk('…y a nombre de la vendedora', !!ubiRap.mod && ubiRap.mod.q==='Carola Chavez', ubiRap.mod&&ubiRap.mod.q);

  // ======= 13. si la corrige LOGÍSTICA, no se avisan a sí mismos =======
  await prep();
  const ubiLog = await page.evaluate(async () => {
    window.prompt=function(){ return '-17.700000, -63.100000'; };
    editarUbicacionAdmin('PX');
    await new Promise(r=>setTimeout(r,400));
    closeModal();
    var p=findById('PX');
    return { maps:String(p.maps||''), mod:esModificado(p) };
  });
  chk('logística corrige la ubicación y se guarda', /-17\.7/.test(ubiLog.maps), ubiLog.maps);
  chk('…sin mandarse un aviso a sí misma', ubiLog.mod===false, ubiLog.mod);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
