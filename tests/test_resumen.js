/* 👁️ EL RESUMEN DE ADMINISTRACIÓN (se SACÓ en §4io, 09/10) Y EL BOTÓN DE OCULTAR EL RESUMEN DEL CUADRE.
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
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while((diaDomingo(F)||(typeof feriadoDe==='function'&&!!feriadoDe(F))));
    STATE=[];
    for(var i=0;i<4;i++) STATE.push({ id:'R'+i, fecha:F, turno:'AM', oc:'08-90'+i, nota:''+i,
      vendedor:i%2?'Maria Flores':'Carola Chavez', cliente:'CLIENTE '+i, celular:'7', zona:'Norte',
      direccion:'Av. '+i, maps:'', pagado:i===0, saldo:i===0?0:500, acuenta:0, cobradoBs:0,
      metodoPago:i===0?'Efectivo':'', observaciones:'', garantia:'', facturarA:'', nit:'',
      estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:i+1,
      ts:Date.now(), productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1}] });
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    /* «Todo»: los pedidos van para mañana, que el día 30 ya es el mes que viene, y con «Mes» la
       tabla quedaba vacía y el botón decía «0 pedidos» (la prueba se pudría a fin de mes, 25/09). */
    showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
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

  // ============ 1-8. (§4io, 09/10) El resumen de Administración SE SACÓ ============
  /* El dueño: *«al tenerlo ya en 3D y los focos de calor y etc, eso ya no es útil para logística, quítalo»*. Ya no se
     pliega: no está. Lo que sigue tiene que quedar igual (avisos, filtros, tabla, botones) y los camiones + el 📅 calendario. */
  await prep();
  let f = await foto();
  chk('⚠️ se fueron las fichas, la línea de cobros y los consolidados por vendedor y por día',
      f.fichas==='NO EXISTE' && f.cobros==='NO EXISTE' && f.porVendedor==='NO EXISTE' && f.porDia==='NO EXISTE', JSON.stringify(f));
  chk('⚠️ se fueron camión, rendición, cupos de 7 días y zonas',
      f.camion==='NO EXISTE' && f.rendicion==='NO EXISTE' && f.cupos==='NO EXISTE' && f.zonas==='NO EXISTE', JSON.stringify(f));
  chk('⚠️ …y el botón «Ocultar resumen» con él', f.boton==='' && await page.evaluate(()=>typeof window.toggleResumenAdm==='undefined' && !document.getElementById('adm-resumen')), f.boton);
  chk('los avisos de arriba SIGUEN (entregas por revisar, OC repetidas)', f.avisos===true, f.avisos);
  chk('la tabla de pedidos SIGUE', f.tabla===true, f.tabla);
  chk('los filtros rápidos de la tabla SIGUEN', f.chips===true, f.chips);
  chk('los botones (Excel, Lista de carga, Cerrar día) SIGUEN',
      await page.evaluate(()=>{ var b=[].slice.call(document.querySelectorAll('#view-admin .btn-row button'));
        return b.some(x=>/Lista de carga/.test(x.textContent)) && b.some(x=>/Cerrar día/.test(x.textContent)); }));
  chk('los camiones y el 📅 calendario quedan en Administración',
      await page.evaluate(()=>!!document.getElementById('carga-viva') && !!document.getElementById('adm-cal') && !!document.getElementById('adm-camiones-btn')));
  chk('renderAdmin no revienta sin el resumen (la tabla trae los 4 pedidos)',
      await page.evaluate(()=>{ renderAdmin(); return document.querySelectorAll('#tbl-pedidos tbody tr').length>=4; }));

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
  chk('el del Cuadre sigue con su interruptor propio (el de Administración se fue con el resumen, §4io)',
      await page.evaluate(()=> typeof LS_RESUMEN_CUA==='string' && typeof window.LS_RESUMEN==='undefined'));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
