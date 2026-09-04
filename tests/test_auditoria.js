/* 🔍 LA AUDITORÍA: RECORRER TODO EL PANEL Y QUE NADA REVIENTE.
   Pedido del dueño: *"audita que no existan errores"*. Los otros tests prueban UNA función
   cada uno. Este hace lo contrario: abre TODAS las vistas, TODAS las ventanas y TODAS las
   fichas, con un pedido de cada forma que existe, y después de cada paso mira tres cosas:

     1. que no haya saltado ningún error de JavaScript (ni excepción ni console.error),
     2. que el DOM vivo no tenga ids REPETIDOS (getElementById devuelve el primero y el otro
        queda muerto — así se congeló el contador de ubicaciones, §4bx),
     3. que todo `onclick` del DOM vivo apunte a una función que exista.

   Y lo hace CUATRO veces: con la llave de Administración, sin la llave (como vendedora), con
   la planilla VACÍA (donde se esconden los `STATE[0].id`), y en pantalla de celular.

   ⚠️ Las dos regresiones que destapó la auditoría estática quedan fijadas acá con dientes:
   el día de la semana en el panel de cupos y en la Lista de carga (§4bx). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  /* Arma una página con la red de errores puesta. Los de RED (CDN de Leaflet, imágenes de
     Drive) no cuentan: acá no hay internet y eso no es un bug del panel. */
  async function nuevaPagina(viewport){
    const page = await browser.newPage({ viewport: viewport||{width:1500,height:1000} });
    const errs=[];
    page.on('pageerror', e=>errs.push('JS: '+e.message));
    page.on('console', m=>{ if(m.type()==='error'){ const t=m.text(); if(!/Failed to load resource|net::|ERR_|favicon|leaflet|unpkg|cdnjs/i.test(t)) errs.push('console: '+t.slice(0,160)); } });
    page.on('dialog', d=>d.accept());
    await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
    await page.waitForTimeout(300);
    return { page, errs };
  }

  /* Un pedido de CADA forma. Si alguna ficha revienta con alguna, se ve acá. */
  const sembrar = (page, opts) => page.evaluate(async (opts) => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=!!opts.unlocked;
    window._bajados=[];
    downloadBlob=function(b,n){ window._bajados.push(n); };
    window.print=function(){};
    copyText=function(){};
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    apiGeocode=function(links){ return Promise.resolve({ok:true,version:SCRIPT_VERSION_ESPERADA,geo:(links||[]).map(function(l){return {link:l,lat:null,lng:null};})}); };
    apiFoto=function(){ return Promise.resolve({ok:true,fotoId:'IMG_X'}); };
    /* Un Leaflet MÍNIMO de mentira: acá no hay internet y la librería nunca carga. Con esto
       el código que dibuja los pines SÍ se ejecuta y queda auditado — si usa algún método
       que el falso no tiene, revienta y se ve. Sin esto, todo el mapa quedaba sin probar. */
    if(!window.L){
      var mk=function(ll){ var m={ bindPopup:function(){return m;}, addTo:function(){return m;}, setStyle:function(){return m;},
        remove:function(){}, openPopup:function(){return m;}, closePopup:function(){return m;}, on:function(){return m;},
        setPopupContent:function(){return m;}, getLatLng:function(){return {lat:ll[0],lng:ll[1]};} }; return m; };
      window.L={ map:function(){ return { remove:function(){}, invalidateSize:function(){}, fitBounds:function(){}, setView:function(){},
                   removeLayer:function(){}, addLayer:function(){}, on:function(){}, closePopup:function(){}, hasLayer:function(){return false;} }; },
                 tileLayer:function(){ return { addTo:function(){return this;} }; },
                 circleMarker:mk, marker:mk, latLngBounds:function(){ return {}; },
                 featureGroup:function(){ return { addTo:function(){return this;}, getBounds:function(){return {};} }; }, divIcon:function(){ return {}; } };
    }
    if(opts.vacio){ STATE=[]; saveMirror(); MAPA_COORDS={}; return 0; }
    var hoy=todayStr(), man=tomorrowStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var ay=new Date(); ay.setDate(ay.getDate()-3); var ayer=isoLocal(ay);
    var mp=new Date(); mp.setMonth(mp.getMonth()-1); mp.setDate(10); var mesPas=isoLocal(mp);
    var sig=new Date(); sig.setMonth(sig.getMonth()+1); sig.setDate(3); var mesSig=isoLocal(sig);
    var b={celular:'70011122',nit:'1023456',zona:'Norte',direccion:'Av. Banzer 5to anillo',
           maps:'https://www.google.com/maps?q=-17.75,-63.15',ts:ts,garantia:'',facturarA:'',observaciones:'',
           estado:'',vehiculo:'',chofer:'',entregado:false,verificado:false,nroDia:1,cobradoBs:0};
    function P(o){ var q={}; for(var k in b)q[k]=b[k]; for(var k in o)q[k]=o[k]; return q; }
    STATE=[
      P({id:'p1', nota:'101', oc:'09-101', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'NORMAL CON SALDO',
         chofer:'Luis Pierre', vehiculo:'Carry', acuenta:500, saldo:1500, pagado:false,
         metodoPago:'~Efectivo 500 @'+hoy+' #101 %I1',
         productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1',cant:1,precio:2000,chk:'ok'}]}),
      P({id:'p2', nota:'102', oc:'09-102', fecha:man, turno:'PM', vendedor:'Maria Flores', cliente:'PAGADA CON FLETE',
         chofer:'Giordano', vehiculo:'Foton', acuenta:0, saldo:0, pagado:true, verificado:true,
         metodoPago:'QR BISA 3000 @'+hoy+' #102 %I2 + ^Efectivo 150 @'+hoy+' #102 %I3 · REGISTRADO',
         productos:[{desc:'SOFT ICE',medida:'140x190',codigo:'CH2',cant:2,precio:1500,chk:'no',
                     mod:{f:hoy,h:'10:00',q:'Maria Flores',d:['📍 cambió la ubicación']}}]}),
      /* Una ATC con TODO el seguimiento: motivo, detalle, compra, comodín, piezas, fábrica. */
      P({id:'p3', nota:'', oc:'ATC 09-001', fecha:ayer, turno:'AM', vendedor:'Isabel Robledo', cliente:'UNA ATC COMPLETA',
         acuenta:0, saldo:0, pagado:false, metodoPago:'', entregado:true,
         productos:[{desc:'SEMI ORTOPEDICO',medida:'140x190',codigo:'A1',cant:1,
           atc:{mot:'Hundimiento',det:'hundido en el medio',fcom:'2024-07-13',com:true,r_col:true,r_pat:true,
                rnota:'sómier sin una pata',dev:hoy,hizo:'se retapizó',devQ:'logística',devH:'09:00'}}]}),
      /* Una ATC vieja sin nada anotado (las 21 reales de agosto son así). */
      P({id:'p3b', nota:'', oc:'ATC 08-014', fecha:mesPas, turno:'PM', vendedor:'Carola Chavez', cliente:'ATC VIEJA SIN MOTIVO',
         acuenta:0, saldo:0, pagado:false, metodoPago:'', ts:new Date(mesPas+'T10:00:00').getTime(),
         productos:[{desc:'ESPECIAL ORTOPEDICO',medida:'180x190',cant:1}]}),
      P({id:'p4', nota:'104', oc:'RH-77', fecha:man, turno:'AM', vendedor:'ROHO', cliente:'CLIENTE ROHO',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 900 @'+hoy+' #104',
         productos:[{desc:'ESPUMA',medida:'50x70',cant:4}]}),
      P({id:'p5', nota:'105', oc:'09-105', fecha:'', turno:'', vendedor:'Carola Chavez', cliente:'VENTA DE TIENDA',
         zona:ZONA_TIENDA, direccion:DIR_TIENDA, maps:'', acuenta:0, saldo:0, pagado:true, entregado:true, verificado:true,
         metodoPago:'~QR Ganadero 1200 @'+hoy+' #105 %I4',
         productos:[{desc:'ALMOHADA',medida:'50x70',cant:2,precio:600}]}),
      P({id:'p6', nota:'106', oc:'09-106', fecha:man, turno:'AM', vendedor:'Eduardo Añez', cliente:'MAYORISTA SRL',
         acuenta:0, saldo:9000, pagado:false, metodoPago:'',
         productos:[{desc:'RESORTADO',medida:'160x190',codigo:'CH3',cant:9,precio:1000,enProd:true,prodEn:'MORENO'}]}),
      P({id:'p7', nota:'107', oc:'09-107', fecha:ayer, turno:'PM', vendedor:'Maria Flores', cliente:'ENTREGADA ATRASADA',
         chofer:'Luis Pierre', entregado:true, acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 1800 @'+hoy+' #107 %I5', fotos:['F1','F2'],
         productos:[{desc:'SEMIORTOPEDICO',medida:'105x190',cant:1,precio:1800,chk:'ok'}]}),
      P({id:'p8', nota:'108', oc:'09-108', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'SIN UBICACION',
         maps:'', acuenta:0, saldo:0, pagado:false, metodoPago:'',
         productos:[{desc:'MEDIDA RARA',medida:'123x456',cant:1}]}),
      P({id:'p9', nota:'109', oc:'09-109', fecha:man, turno:'PM', vendedor:'Isabel Robledo', cliente:'COBRO DE MAS',
         chofer:'Giordano', acuenta:0, saldo:-300, pagado:true,
         metodoPago:'Efectivo 2300 @'+hoy+' #109 %I6',
         productos:[{desc:'TITANIO ICE',medida:'180x190',cant:1,precio:2000,chk:'im'}]}),
      /* Dos con la misma OC, para el aviso de repetidas. */
      P({id:'p10', nota:'110', oc:'09-110', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'DUPLICADA A',
         acuenta:0, saldo:700, pagado:false, metodoPago:'', productos:[{desc:'X',cant:1,precio:700}]}),
      P({id:'p11', nota:'111', oc:'09-110', fecha:man, turno:'AM', vendedor:'Mirian Salazar', cliente:'DUPLICADA B',
         acuenta:0, saldo:700, pagado:false, metodoPago:'', productos:[{desc:'X',cant:1,precio:700}]}),
      /* Enlace corto (va al servidor) y una del MES QUE VIENE (para el aviso de fuera de mes). */
      P({id:'p12', nota:'112', oc:'09-112', fecha:man, turno:'AM', vendedor:'Jonathan Monje', cliente:'LINK CORTO',
         maps:'https://maps.app.goo.gl/ABC123', acuenta:0, saldo:0, pagado:false, metodoPago:'',
         productos:[{desc:'BAHIA',medida:'140x190',cant:1}]}),
      P({id:'p13', nota:'113', oc:'09-113', fecha:mesSig, turno:'PM', vendedor:'Mauricio Merida', cliente:'DEL MES QUE VIENE',
         acuenta:0, saldo:2500, pagado:false, metodoPago:'',
         productos:[{desc:'ORO ANATOMICO',medida:'200x200',cant:1,precio:2500}]}),
      /* Una de HOY: sin ella el Excel «Hoy», el cierre del día y el mapa «Hoy» no tienen nada. */
      P({id:'p14', nota:'114', oc:'09-114', fecha:hoy, turno:'AM', vendedor:'Fernando Peinado', cliente:'ENTREGA DE HOY',
         chofer:'Luis Pierre', vehiculo:'Carry', acuenta:0, saldo:1200, pagado:false, metodoPago:'',
         productos:[{desc:'PLATA',medida:'140x190',cant:1,precio:1200,chk:'ok'}]})
    ];
    saveMirror();
    if(UNLOCKED){ document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; }
    mostrarBotonesTodos();
    document.getElementById('mis-vendedor').value='Carola Chavez';
    return STATE.length;
  }, opts);

  /* Radiografía del DOM vivo: ids repetidos y onclick rotos. */
  const radiografia = (page) => page.evaluate(() => {
    var seen={}, dup=[];
    document.querySelectorAll('[id]').forEach(function(e){ var id=e.id; if(!id) return; if(seen[id]) dup.push(id); seen[id]=1; });
    var rotos=[];
    document.querySelectorAll('[onclick]').forEach(function(e){
      /* Solo las llamadas a función. `if(`, `return`, `window.open(`… no son funciones del panel. */
      var m=(e.getAttribute('onclick')||'').match(/^\s*(?:event\.stopPropagation\(\);)?\s*([A-Za-z_$][\w$]*)\s*\(/);
      var kw={if:1,return:1,var:1,event:1,this:1,typeof:1,new:1,window:1,document:1,location:1,history:1,navigator:1};
      if(m && !kw[m[1]] && typeof window[m[1]]!=='function') rotos.push(m[1]);
    });
    return { dup:Array.from(new Set(dup)), rotos:Array.from(new Set(rotos)) };
  });

  /* Un paso de la auditoría: ejecuta, espera, y revisa las tres cosas. */
  async function paso(ctx, nombre, fn){
    const antes=ctx.errs.length;
    let fallo=null;
    try { await fn(); } catch(e){ fallo=String(e.message||e).split('\n')[0].slice(0,140); }
    await ctx.page.waitForTimeout(120);
    const nuevos=ctx.errs.slice(antes);
    const rx=await radiografia(ctx.page);
    const ok=!fallo && nuevos.length===0 && rx.dup.length===0 && rx.rotos.length===0;
    chk(ctx.tag+' '+nombre, ok,
        ok ? '' : [fallo?('revienta: '+fallo):'', nuevos.length?('errores: '+nuevos.join(' | ').slice(0,180)):'',
                   rx.dup.length?('ids repetidos: '+rx.dup.join(',')):'', rx.rotos.length?('onclick rotos: '+rx.rotos.join(',')):''].filter(Boolean).join(' · '));
  }
  const cerrarTodo = (page) => page.evaluate(() => {
    closeModal();
    document.querySelectorAll('[id$="-overlay"]').forEach(function(o){ o.style.display='none'; });
  });

  /* ================================================================
     PASADA 1 — CON LA LLAVE, con un pedido de cada forma
     ================================================================ */
  let ctx = await nuevaPagina(); ctx.tag='[admin]';
  /* ⚠️ Dientes para el bug 3 (§4bx), y va ANTES de `sembrar` a propósito: acá `window.L`
     todavía no existe —como en el celular durante el segundo o dos que tarda en bajar la
     librería— y tocar «Solo sin chofer» en ese momento reventaba con `L is not defined`.
     Después `sembrar` inyecta el Leaflet falso y este caso ya no se puede probar. */
  const sinLeaflet = await ctx.page.evaluate(() => {
    try { CONNECTED=true; toggleSoloSin(); MAPA_SOLO_SIN=false; return 'ok'; }
    catch(e){ return 'revienta: '+e.message; }
  });
  chk('🐛 tocar «Solo sin chofer» antes de que cargue Leaflet NO revienta', sinLeaflet==='ok', sinLeaflet);
  const n = await sembrar(ctx.page, {unlocked:true});
  chk('la planilla de prueba tiene un pedido de cada forma', n===15, n);
  const ids = await ctx.page.evaluate(()=>STATE.map(function(p){return p.id;}));

  // ---- vistas ----
  await paso(ctx,'Nuevo pedido (formulario)', ()=>ctx.page.evaluate(()=>{ showView('form'); resetForm(); }));
  await paso(ctx,'formulario en modo ATC y vuelta', ()=>ctx.page.evaluate(()=>{ segSet('f-doc-tipo','ATC'); setDocTipo(); segSet('f-doc-tipo','OC'); setDocTipo(); }));
  await paso(ctx,'formulario en modo Venta de tienda', ()=>ctx.page.evaluate(()=>{ abrirVentaTienda(); resetForm(); }));
  await paso(ctx,'Mis pedidos', ()=>ctx.page.evaluate(async()=>{ showView('mis'); await new Promise(r=>setTimeout(r,150)); renderMis(); }));
  await paso(ctx,'Mis pedidos · cada filtro rápido', ()=>ctx.page.evaluate(()=>{ MIS_DEFS.forEach(function(d){ MIS_FILTER=d.k; renderMis(); }); MIS_FILTER='todos'; renderMis(); }));
  await paso(ctx,'Mis pedidos · avisos', ()=>ctx.page.evaluate(()=>{ abrirMisAvisos(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Chofer', ()=>ctx.page.evaluate(async()=>{ showView('chofer'); await new Promise(r=>setTimeout(r,150)); llenarSelectChoferes(); var s=document.getElementById('cho-nombre'); if(s){ s.value='Luis Pierre'; } renderChofer(); }));
  await paso(ctx,'Contabilidad · Ventas', ()=>ctx.page.evaluate(async()=>{ showView('conta'); await new Promise(r=>setTimeout(r,200)); segSet('cta-tab','ventas'); setContaTab('ventas'); }));
  await paso(ctx,'Contabilidad · Ventas por Entrega', ()=>ctx.page.evaluate(()=>{ segSet('cta-base','entrega'); setContaBase(); segSet('cta-base','ingreso'); setContaBase(); }));
  await paso(ctx,'Contabilidad · Mayoristas', ()=>ctx.page.evaluate(()=>{ segSet('cta-tab','mayor'); setContaTab('mayor'); }));
  await paso(ctx,'Contabilidad · Cuadre día/mes/todo', ()=>ctx.page.evaluate(async()=>{ segSet('cta-tab','cuadre'); setContaTab('cuadre'); await new Promise(r=>setTimeout(r,200));
    ['dia','mes','todo'].forEach(function(m){ segSet('cua-mode',m); setCuadreModo(m); }); }));
  await paso(ctx,'Contabilidad · Cuadre plegado y copiado', ()=>ctx.page.evaluate(()=>{ toggleResumenCua(); toggleResumenCua(); copiarCuadre(); }));
  await paso(ctx,'Contabilidad · Retiros', ()=>ctx.page.evaluate(()=>{ abrirRetiros(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'ATC · matriz', ()=>ctx.page.evaluate(async()=>{ showView('atc'); await new Promise(r=>setTimeout(r,200)); renderAtc(); }));
  await paso(ctx,'ATC · cada filtro de estado', ()=>ctx.page.evaluate(()=>{ var s=document.getElementById('atc-estado'); [].slice.call(s.options).forEach(function(o){ s.value=o.value; renderAtc(); }); s.value=''; renderAtc(); }));
  await paso(ctx,'ATC · por mes, por motivo y buscador', ()=>ctx.page.evaluate(()=>{ segSet('atc-mode','mes'); document.getElementById('atc-mes').value=monthStr(); renderAtc(); segSet('atc-mode','todo'); document.getElementById('atc-motivo').value='Hundimiento'; renderAtc(); document.getElementById('atc-motivo').value=''; document.getElementById('atc-search').value='LORENA'; renderAtc(); document.getElementById('atc-search').value=''; renderAtc(); }));
  await paso(ctx,'ATC · ficha completa y ficha vacía', ()=>ctx.page.evaluate(()=>{ verAtc('p3'); closeModal(); verAtc('p3b'); closeModal(); }));
  await paso(ctx,'ATC · anotar avance', ()=>ctx.page.evaluate(()=>{ abrirDevolucionAtc('p3'); closeModal(); abrirDevolucionAtc('p3b'); closeModal(); }));
  await paso(ctx,'ATC · copiar', ()=>ctx.page.evaluate(()=>{ copiarAtc(); }));
  await paso(ctx,'Administración', ()=>ctx.page.evaluate(async()=>{ showView('admin'); await new Promise(r=>setTimeout(r,200)); renderAdmin(); }));
  await paso(ctx,'Administración · día/mes/todo', ()=>ctx.page.evaluate(()=>{ ['dia','mes','todo'].forEach(function(m){ segSet('adm-mode',m); document.getElementById('wrap-dia').style.display=(m==='dia')?'block':'none'; document.getElementById('wrap-mes').style.display=(m==='mes')?'block':'none'; admTopeReset(); renderAdmin(); }); }));
  await paso(ctx,'Administración · cada chip', ()=>ctx.page.evaluate(()=>{ QUICK_DEFS.forEach(function(d){ setQuick(d.k); }); QUICK_FILTER=''; renderAdmin(); }));
  await paso(ctx,'Administración · ordenar por cada columna (ida y vuelta)', ()=>ctx.page.evaluate(()=>{ ['num','fecha','vendedor','cliente','zona','saldo','estado'].forEach(function(k){ setSort(k); setSort(k); }); SORT_KEY=''; renderAdmin(); }));
  await paso(ctx,'Administración · buscador', ()=>ctx.page.evaluate(()=>{ var s=document.getElementById('adm-search'); s.value='DUPLICADA'; renderAdmin(); s.value=''; renderAdmin(); }));
  await paso(ctx,'Administración · plegar resumen', ()=>ctx.page.evaluate(()=>{ toggleResumenAdm(); toggleResumenAdm(); }));
  await paso(ctx,'Administración · ver más / ver todos / ir al mes', ()=>ctx.page.evaluate(()=>{ admVerMas(); admVerTodos(); admTopeReset(); admIrAlMes(monthStr()); admVerTodoElHistorial(); }));
  await paso(ctx,'Administración · avisos plegables', ()=>ctx.page.evaluate(()=>{ toggleRevisar(); toggleRevisar(); toggleOcRep(); toggleOcRep(); }));

  /* ⚠️ Dientes para el bug de `diaSemana` (§4bx): el día de la semana TIENE que estar. */
  const cupos = await ctx.page.evaluate(()=>{ renderOcupacion(); return (document.getElementById('adm-ocupacion')||{textContent:''}).textContent.replace(/\s+/g,' '); });
  chk('🐛 el panel de cupos muestra el día de la semana (dom/lun/…/sáb)', /\b(dom|lun|mar|mié|jue|vie|sáb)\b/.test(cupos), cupos.slice(0,90));

  // ---- todas las fichas, con cada pedido ----
  for (const id of ids){
    await paso(ctx,'ficha del pedido '+id, ()=>ctx.page.evaluate((id)=>{ showPedidoModal(id); closeModal(); }, id));
    await paso(ctx,'ficha contable '+id, ()=>ctx.page.evaluate((id)=>{ showContaModal(id); closeModal(); }, id));
    await paso(ctx,'ficha vendedora '+id, ()=>ctx.page.evaluate((id)=>{ showMisModal(id); closeModal(); }, id));
    await paso(ctx,'ficha de carga '+id, ()=>ctx.page.evaluate((id)=>{ showCargaModal(id); closeModal(); }, id));
    await paso(ctx,'WhatsApp '+id, ()=>ctx.page.evaluate((id)=>{ showWhatsappModal(findById(id)); closeModal(); }, id));
    await paso(ctx,'corregir ubicación '+id, ()=>ctx.page.evaluate((id)=>{ editarUbicacion(id); closeModal(); }, id));
    await paso(ctx,'editar '+id+' y volver', ()=>ctx.page.evaluate(async(id)=>{ EDIT_DESDE='admin'; editPedido(id); await new Promise(r=>setTimeout(r,200)); volverDeEdicion('admin'); resetForm(); }, id));
  }
  await paso(ctx,'visor de fotos', ()=>ctx.page.evaluate(()=>{ abrirVisor('p7',0); closeModal(); }));
  await paso(ctx,'visto de modificación', ()=>ctx.page.evaluate(()=>{ verVistoModif('p2'); }));

  // ---- todas las ventanas ----
  await paso(ctx,'Lista de carga hoy/mañana/todos', ()=>ctx.page.evaluate(()=>{ abrirCarga(); setCargaDia('hoy'); setCargaDia('manana'); setCargaDia('todos'); }));
  /* ⚠️ Dientes para el otro lugar del bug de `diaSemana`: el encabezado de cada fecha. */
  const carga = await ctx.page.evaluate(()=>[].slice.call(document.querySelectorAll('.carga-fecha-h')).map(function(e){return e.textContent.replace(/\s+/g,' ');}).join(' || '));
  chk('🐛 la Lista de carga dice el día de la semana en cada fecha', /· (dom|lun|mar|mié|jue|vie|sáb)\b/.test(carga), carga.slice(0,120));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Entregado (chofer)', ()=>ctx.page.evaluate(()=>{ abrirEntregas(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Cierre del día y Mañana (WhatsApp)', ()=>ctx.page.evaluate(()=>{ abrirEnvio('hoy'); abrirEnvio('manana'); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Faltantes / producción', ()=>ctx.page.evaluate(()=>{ abrirFaltantes(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Parte del día', ()=>ctx.page.evaluate(()=>{ abrirParte(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Productos más entregados', ()=>ctx.page.evaluate(()=>{ abrirProds(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Reporte', ()=>ctx.page.evaluate(()=>{ abrirReporte(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Hoja de ruta', ()=>ctx.page.evaluate(()=>{ abrirRuta(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Revisar ubicaciones (+ resolver)', ()=>ctx.page.evaluate(async()=>{ abrirRevUbic(); resolverCortosRev(); await new Promise(r=>setTimeout(r,300)); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Cerrar día', ()=>ctx.page.evaluate(()=>{ abrirCierreDias(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Reprogramar', ()=>ctx.page.evaluate(()=>{ showReproModal(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Mapa (filtros y KML)', ()=>ctx.page.evaluate(()=>{ exportMapa(); setMapaDia('hoy'); setMapaDia('manana'); setMapaDia('mes'); setMapaDia('todos'); setMapaMarca('heaven'); setMapaMarca('suena'); setMapaMarca(''); setMapaColorPor('zona'); setMapaColorPor('marca'); setMapaColorPor('chofer'); toggleSoloSin(); toggleSoloSin(); downloadMapaKml(); closeMapa(); }));
  await paso(ctx,'Excel hoy/mañana/mes/todo y respaldo', ()=>ctx.page.evaluate(()=>{ ['hoy','manana','mes','todo'].forEach(function(s){ exportExcel(s); }); backupJson(); }));
  const bajados = await ctx.page.evaluate(()=>window._bajados.length);
  chk('los cuatro Excel y el respaldo se generaron', bajados>=5, bajados+' archivos');
  await ctx.page.close();

  /* ================================================================
     PASADA 2 — SIN LA LLAVE (como vendedora)
     ================================================================ */
  ctx = await nuevaPagina(); ctx.tag='[vendedora]';
  await sembrar(ctx.page, {unlocked:false});
  await paso(ctx,'formulario', ()=>ctx.page.evaluate(()=>{ showView('form'); resetForm(); }));
  await paso(ctx,'Mis pedidos + ficha + editar', ()=>ctx.page.evaluate(async()=>{ showView('mis'); await new Promise(r=>setTimeout(r,150)); renderMis(); showMisModal('p1'); closeModal(); editarDesdeMis('p1'); await new Promise(r=>setTimeout(r,150)); volverDeEdicion('mis'); }));
  await paso(ctx,'Chofer', ()=>ctx.page.evaluate(async()=>{ showView('chofer'); await new Promise(r=>setTimeout(r,150)); renderChofer(); }));
  await paso(ctx,'ATC (solo lectura)', ()=>ctx.page.evaluate(async()=>{ showView('atc'); await new Promise(r=>setTimeout(r,150)); renderAtc(); verAtc('p3'); closeModal(); }));
  const sinLlave = await ctx.page.evaluate(()=>[].slice.call(document.querySelectorAll('#tbl-atc tbody button')).map(function(b){return b.getAttribute('onclick')||'';}).join(' '));
  chk('[vendedora] sin la llave NO hay botón para anotar avances de ATC', !/abrirDevolucionAtc/.test(sinLlave), sinLlave.slice(0,80));
  await paso(ctx,'Contabilidad', ()=>ctx.page.evaluate(async()=>{ showView('conta'); await new Promise(r=>setTimeout(r,200)); }));
  await paso(ctx,'Administración (candado)', ()=>ctx.page.evaluate(async()=>{ showView('admin'); await new Promise(r=>setTimeout(r,150)); }));
  await ctx.page.close();

  /* ================================================================
     PASADA 3 — PLANILLA VACÍA (donde se esconden los STATE[0].id)
     ================================================================ */
  ctx = await nuevaPagina(); ctx.tag='[vacío]';
  await sembrar(ctx.page, {unlocked:true, vacio:true});
  for (const v of ['form','mis','chofer','conta','atc','admin']){
    await paso(ctx,'vista '+v, ()=>ctx.page.evaluate(async(v)=>{ showView(v); await new Promise(r=>setTimeout(r,150)); }, v));
  }
  await paso(ctx,'Contabilidad · las tres pestañas', ()=>ctx.page.evaluate(()=>{ ['ventas','mayor','cuadre'].forEach(function(t){ segSet('cta-tab',t); setContaTab(t); }); }));
  await paso(ctx,'todas las ventanas', ()=>ctx.page.evaluate(()=>{ showView('admin'); renderAdmin(); abrirCarga(); abrirEntregas(); abrirEnvio('hoy'); abrirFaltantes(); abrirParte(); abrirProds(); abrirReporte(); abrirRuta(); abrirRevUbic(); closeModal(); abrirCierreDias(); closeModal(); showReproModal(); closeModal(); abrirRetiros(); closeModal(); abrirMisAvisos(); closeModal(); exportMapa(); }));
  await cerrarTodo(ctx.page);
  await paso(ctx,'Excel y KML sin datos', ()=>ctx.page.evaluate(()=>{ exportExcel('todo'); downloadMapaKml(); copiarAtc(); copiarCuadre(); }));
  await ctx.page.close();

  /* ================================================================
     PASADA 4 — CELULAR (390 px)
     ================================================================ */
  ctx = await nuevaPagina({width:390,height:844}); ctx.tag='[celular]';
  await sembrar(ctx.page, {unlocked:true});
  for (const v of ['form','mis','chofer','conta','atc','admin']){
    await paso(ctx,'vista '+v, ()=>ctx.page.evaluate(async(v)=>{ showView(v); await new Promise(r=>setTimeout(r,150)); }, v));
  }
  await paso(ctx,'fichas en celular', ()=>ctx.page.evaluate(()=>{ showPedidoModal('p1'); closeModal(); verAtc('p3'); closeModal(); abrirDevolucionAtc('p3'); closeModal(); }));
  const scrollH = await ctx.page.evaluate(()=>({ ancho:document.documentElement.scrollWidth, viewport:window.innerWidth }));
  chk('[celular] la página no se desborda a lo ancho', scrollH.ancho<=scrollH.viewport+2, scrollH.ancho+' px de ancho en '+scrollH.viewport);
  await ctx.page.close();

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
