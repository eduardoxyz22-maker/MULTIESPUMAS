/* 👁️ EL BOTÓN PARA OCULTAR EL RESUMEN DE ADMINISTRACIÓN.
   Pedido del dueño: arriba de la tabla hay una pila de estadísticas (las fichas, la línea
   de cobros, los consolidados por vendedor y por día, camión, rendición, cupos, zonas) que
   empuja la tabla —lo que se usa todo el día— muy abajo. Querían poder plegarla.

   Lo que se prueba: que pliegue TODO eso y NADA más (los avisos de arriba, los botones y
   la tabla se quedan), que la elección sobreviva a recargar la página, que sea de ESTA
   computadora y que plegado el botón siga mostrando el número grueso. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const ARCH = 'file://' + path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1400,height:1000} });
  const page = await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Deja Administración con pedidos de verdad, para que el resumen tenga qué mostrar. */
  const prep = () => page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    /* ⚠️ Poner UNLOCKED=true NO abre la pantalla: el candado esconde #admin-content con
       un display inline, y eso lo quita tryUnlock(). Sin esto TODO mide "oculto" y el
       test no distingue lo que plegó el botón de lo que ya estaba tapado. */
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r));
      window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F));
    STATE=[];
    for(var i=0;i<4;i++) STATE.push({ id:'R'+i, fecha:F, turno:'AM', oc:'08-90'+i, nota:''+i,
      vendedor:i%2?'Maria Flores':'Carola Chavez', cliente:'CLIENTE '+i, celular:'7', zona:'Norte',
      direccion:'Av. '+i, maps:'', pagado:i===0, saldo:i===0?0:500, acuenta:0, cobradoBs:0,
      metodoPago:i===0?'Efectivo':'', observaciones:'', garantia:'', facturarA:'', nit:'',
      estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:i+1,
      ts:Date.now(), productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1}] });
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    showView('admin'); renderAdmin();
    await new Promise(r=>setTimeout(r,200));
  });

  /* Qué se ve y qué no. `off` = está plegado (display:none en el contenedor o el propio). */
  const foto = () => page.evaluate(() => {
    var vis=function(id){ var e=document.getElementById(id); if(!e) return 'NO EXISTE';
      for(var n=e; n && n!==document.body; n=n.parentElement){
        if(n.style && n.style.display==='none') return false; }
      return true; };
    return { fichas:vis('adm-metrics'), cobros:vis('adm-metodos'),
             porVendedor:vis('tbl-vendedor'), porDia:vis('tbl-dia'),
             camion:vis('tbl-camion'), rendicion:vis('tbl-rendicion'),
             cupos:vis('adm-ocupacion'), zonas:vis('adm-zonas'),
             avisos:vis('adm-revisar'), tabla:vis('tbl-pedidos'), chips:vis('adm-chips'),
             boton:(document.getElementById('adm-resumen-btn')||{}).textContent||'' };
  });

  // ============ 1. de fábrica viene desplegado ============
  await prep();
  let f = await foto();
  chk('de entrada el resumen se ve, como siempre', f.fichas===true && f.porVendedor===true, JSON.stringify(f));
  chk('y el botón ofrece ocultarlo', /Ocultar resumen/.test(f.boton), f.boton.trim());

  // ============ 2. plegado: se va TODO el resumen ============
  await page.evaluate(()=>toggleResumenAdm());
  f = await foto();
  chk('se van las fichas', f.fichas===false, f.fichas);
  chk('se va la línea de cobros y stock', f.cobros===false, f.cobros);
  chk('se va el consolidado por vendedor', f.porVendedor===false, f.porVendedor);
  chk('se va el consolidado por día', f.porDia===false, f.porDia);
  chk('se van camión y rendición', f.camion===false && f.rendicion===false, f.camion+'/'+f.rendicion);
  chk('se van cupos y zonas', f.cupos===false && f.zonas===false, f.cupos+'/'+f.zonas);

  // ============ 3. …y NO se lleva puesto nada de lo que sí se usa ============
  chk('los avisos de arriba SIGUEN (entregas por revisar, OC repetidas)', f.avisos===true, f.avisos);
  chk('la tabla de pedidos SIGUE', f.tabla===true, f.tabla);
  chk('los filtros rápidos de la tabla SIGUEN', f.chips===true, f.chips);
  chk('los botones (Excel, Lista de carga, Cerrar día) SIGUEN',
      await page.evaluate(()=>{ var b=[].slice.call(document.querySelectorAll('#view-admin .btn-row button'));
        return b.some(x=>/Lista de carga/.test(x.textContent)) && b.some(x=>/Cerrar día/.test(x.textContent)); }));

  // ============ 4. plegado, el botón se lleva el número grueso ============
  chk('el botón ofrece volver a mostrarlo', /Ver resumen/.test(f.boton), f.boton.trim());
  chk('…y sigue diciendo cuántos pedidos hay', /4 pedidos/.test(f.boton), f.boton.trim());
  chk('…y cuánto falta cobrar', /3 por cobrar/.test(f.boton), f.boton.trim());

  // ============ 5. la elección aguanta recargar la página ============
  await page.reload({ waitUntil:'load' });
  await page.waitForTimeout(300);
  await prep();
  f = await foto();
  chk('tras recargar sigue plegado (no hay que ocultarlo cada vez)', f.fichas===false, f.fichas);
  chk('…y el botón lo refleja', /Ver resumen/.test(f.boton), f.boton.trim());

  // ============ 6. se vuelve a desplegar ============
  await page.evaluate(()=>toggleResumenAdm());
  f = await foto();
  chk('volver a mostrarlo trae todo de vuelta',
      f.fichas===true && f.porVendedor===true && f.porDia===true && f.camion===true && f.zonas===true,
      JSON.stringify(f));

  // ============ 7. es de ESTA computadora, no del equipo ============
  const otra = await browser.newContext({ viewport:{width:1400,height:1000} });   // otro navegador
  const p2 = await otra.newPage();
  p2.on('dialog',d=>d.accept());
  await p2.goto(ARCH, { waitUntil:'load' });
  await p2.waitForTimeout(300);
  const soloMio = await p2.evaluate(() => resumenAdmVisible());
  chk('en otra computadora el resumen sigue como siempre (no se le pisa la pantalla a nadie)',
      soloMio===true, soloMio);
  await otra.close();

  // ============ 8. sin nada que cobrar, el mini-resumen no inventa ============
  const limpio = await page.evaluate(async () => {
    STATE.forEach(function(p){ p.pagado=true; p.saldo=0; });
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    renderAdmin();
    if(resumenAdmVisible()) toggleResumenAdm();
    return (document.getElementById('adm-resumen-btn')||{}).textContent||'';
  });
  chk('con todo cobrado no dice "0 por cobrar" al pedo', !/por cobrar/.test(limpio), limpio.trim());
  chk('…pero sí cuántos pedidos hay', /4 pedidos/.test(limpio), limpio.trim());

  // ============ 9. el MISMO botón en el Cuadre de Contabilidad ============
  const cua = await page.evaluate(async () => {
    var mk=function(i,saldo){ return { id:'Q'+i, cliente:'CLI '+i, nota:''+(700+i),
      vendedor:'Isabel Robledo', fecha:'2026-08-0'+(i+1), ts:new Date('2026-08-0'+(i+1)+'T10:00:00').getTime(),
      saldo:saldo, acuenta:0, pagado:false, cobradoBs:0, metodoPago:'', entregado:i===0,
      verificado:false, oc:'', observaciones:'', garantia:'', facturarA:'', nit:'', estado:'',
      vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N', direccion:'Av', maps:'',
      nroDia:1, productos:[{desc:'X',cant:1}] }; };
    STATE=[mk(0,1500), mk(1,900), mk(2,0)];
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    await new Promise(r=>setTimeout(r,300));
    segSet('cua-mode','todo'); setCuadreModo('todo');
    await new Promise(r=>setTimeout(r,300));
    renderCuadre();
    await new Promise(r=>setTimeout(r,150));
    var vis=function(id){ var e=document.getElementById(id); if(!e) return 'NO EXISTE';
      for(var n=e; n && n!==document.body; n=n.parentElement){
        if(n.style && n.style.display==='none') return false; }
      return true; };
    var antes={ pendientes:vis('cua-pendientes'), alertas:vis('cua-alertas'),
                cierre:vis('cua-cierre'), detalle:vis('cua-detalle'),
                boton:(document.getElementById('cua-resumen-btn')||{}).textContent||'' };
    toggleResumenCua();
    var despues={ pendientes:vis('cua-pendientes'), alertas:vis('cua-alertas'),
                  cierre:vis('cua-cierre'), detalle:vis('cua-detalle'),
                  boton:(document.getElementById('cua-resumen-btn')||{}).textContent||'' };
    toggleResumenCua();
    var vuelta=vis('cua-alertas');
    return { antes:antes, despues:despues, vuelta:vuelta, soloMio:resumenCuaVisible() };
  });
  chk('el Cuadre arranca con el resumen a la vista',
      cua.antes.pendientes===true && cua.antes.alertas===true, JSON.stringify(cua.antes));
  chk('plegado se van los cierres, el por cobrar y los avisos',
      cua.despues.cierre===false && cua.despues.pendientes===false && cua.despues.alertas===false,
      JSON.stringify(cua.despues));
  chk('…y la PLANILLA DE PAGOS de abajo se queda, que es para lo que se pliega',
      cua.despues.detalle===true, cua.despues.detalle);
  chk('⚠️ plegado, el botón dice CUÁNTOS avisos quedan sin revisar',
      /por revisar/.test(cua.despues.boton), cua.despues.boton.trim());
  chk('…y cuánto falta cobrar', /por cobrar/.test(cua.despues.boton), cua.despues.boton.trim());
  chk('volver a mostrarlo trae todo de vuelta', cua.vuelta===true, cua.vuelta);
  chk('el del Cuadre es independiente del de Administración (dos interruptores distintos)',
      await page.evaluate(()=> LS_RESUMEN!==LS_RESUMEN_CUA));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
