/* Ejecutar desde la raíz. NODE_PATH/CHROME_PATH permiten usar el runtime de Windows.
   Datos sintéticos: no publicar ventas reales en este repositorio. */
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
let pw;try{pw=require('playwright');}catch(e){pw=require('/opt/node22/lib/node_modules/playwright');}
let PASS=0,FAIL=0;const chk=(t,c)=>{c?PASS++:FAIL++;console.log((c?'✓ ':'✗ ')+t);};
(async()=>{
 const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000},timezoneId:'America/La_Paz'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('pedidos.html')).href);
  if(!(await page.evaluate(()=>typeof abrirProductosMes==='function'))){chk('existe Productos del mes',false);process.exitCode=1;return;}
  await page.evaluate(()=>{
    localStorage.clear();CONNECTED=true;UNLOCKED=false;
    window.pmElegir=(id,val)=>{document.querySelectorAll('#'+id+' [data-val]').forEach(e=>e.classList.toggle('active',e.dataset.val===val));};
    pmElegir('cta-tab','ventas');pmElegir('cta-mode','mes');pmElegir('cta-base','ingreso');
    var mes=todayStr().slice(0,7),dia=mes+'-10',proximo=new Date(mes+'-15T12:00:00');proximo.setMonth(proximo.getMonth()+1);var otro=isoLocal(proximo);
    window._mesPM=mes;
    var ts=new Date(dia+'T12:00:00').getTime();
    var prod=(c,m,q,p)=>({codigo:c,desc:'Colchón ejemplo',medida:m,cant:q,precio:p});
    var venta=(id,v,prods,total,extra)=>Object.assign({id:id,vendedor:v,cliente:'Cliente '+id,nota:id,oc:'09-'+id,fecha:dia,ts:ts,productos:prods,pagado:false,saldo:total,acuenta:0,metodoPago:'',entregado:false},extra||{});
    window._datosPM=[
      venta('101','Fernando Peinado',[prod('A','140x190',2,100),prod('B','160x190',1,200)],350),
      venta('102','Fernando Peinado',[prod('A','140x190',1,100),prod('A','140x190',1,100),prod('A','180x190',1,300)],500),
      venta('103','Juan Pablo',[prod('A','140x190',3,100)],300,{pagado:true,saldo:0,metodoPago:'Efectivo 300'}),
      venta('104','Juan Pablo',[prod('C','140x190',1,undefined)],120,{nota:'102'}),
      venta('105','Fernando Peinado',[prod('Z','100x190',1,80)],80,{fecha:otro}),
      venta('106','ROHO',[prod('A','140x190',999,100)],99900),
      venta('107','Eduardo Añez',[prod('A','140x190',999,100)],99900),
      venta('108','Juan Pablo',[prod('A','140x190',999,100)],99900,{oc:'ATC 09-108'}),
      venta('kommo-109','Juan Pablo',[prod('A','140x190',999,100)],99900,{fecha:'',estado:BORRADOR_EST})
    ];
    // Una copia repetida por id no duplica. Una nota repetida con otro id sí se conserva.
    _datosPM.push(JSON.parse(JSON.stringify(_datosPM[0])));
    STATE=_datosPM.slice(0,1);llenarSelectContaVendedor();
    document.getElementById('cta-vendedor').innerHTML='<option value="">Todos</option><option>Fernando Peinado</option><option>Juan Pablo</option>';
    document.getElementById('cta-vendedor').value='Fernando Peinado';document.getElementById('cta-mes').value=mes;document.getElementById('cta-search').value='NO COINCIDE';
    apiList=()=>Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(_datosPM))});
    downloadBlob=(bytes,name)=>{window._xlsxPM=Array.from(bytes);window._xlsxNamePM=name;};
  });
  await page.evaluate(()=>abrirProductosMes());let r=await page.evaluate(()=>PM_REPORTE);
  chk('Fernando: mes completo aunque STATE tenga un solo pedido y la búsqueda no coincida',r.pedidos===3&&r.detalle.length===6);
  chk('consolida cantidades reales sin duplicar el total por producto',r.unidades===7&&r.total===930&&r.conocido===980);
  const a=r.consolidado.find(g=>g.codigo==='A'&&g.variante==='140x190');
  chk('una línea repetida en el mismo pedido suma unidades pero cuenta un solo pedido',a.unidades===4&&a.nPedidos===2&&a.importe===400);
  const limites=await page.evaluate(()=>{
    var cfg={mes:_mesPM,vendedor:'Fernando Peinado',base:'ingreso'},p=JSON.parse(JSON.stringify(_datosPM[0]));
    p.productos=[{desc:'Sin código',medida:'140x190',cant:1,precio:0},{desc:'Otro modelo',medida:'140x190',cant:'',precio:100}];
    var r=pmCalcular([p],cfg,[p]);return {grupos:r.productos,sin:r.sinPrecio,cantidad:r.sinCantidad,importe:r.consolidado[0].importe,avisos:r.avisos};
  });
  chk('sin código agrupa por nombre exacto y medida, sin unir modelos distintos',limites.grupos===2);
  chk('precio cero y cantidad vacía quedan sin dato según el esquema actual',limites.sin===2&&limites.cantidad===1&&limites.importe===null);
  chk('advierte cambios locales pendientes incluidos',limites.avisos.some(a=>a.includes('pendientes de sincronización')));
  chk('el mismo código con otra medida queda separado',r.consolidado.filter(g=>g.codigo==='A').length===2);
  chk('descuento general separado: 350 de venta menos 400 en líneas = -50',r.ajustes[0].diferencia===-50);
  chk('funciona con permiso de Contabilidad sin abrir Administración',await page.evaluate(()=>!UNLOCKED&&!!PM_REPORTE));
  await page.evaluate(()=>{pmCerrar();document.getElementById('cta-vendedor').value='Juan Pablo';return abrirProductosMes();});r=await page.evaluate(()=>PM_REPORTE);
  chk('Juan Pablo: pagado y con saldo entran por igual',r.pedidos===2&&r.total===420);
  chk('precio ausente se muestra Sin dato, nunca cero',r.sinPrecio===1&&r.consolidado.find(g=>g.codigo==='C').importe===null&&r.detalle.find(g=>g.codigo==='C').precio===null);
  chk('la diferencia incompleta no se llama descuento',r.ajustes[0].motivo.includes('sin desglose'));
  await page.evaluate(()=>{pmCerrar();document.getElementById('cta-vendedor').value='';return abrirProductosMes();});r=await page.evaluate(()=>PM_REPORTE);
  chk('Todos respeta el alcance de Ventas: sin ROHO, mayoristas, ATC ni borradores',r.pedidos===5&&r.unidades===11);
  chk('conserva y advierte las notas repetidas entre vendedores',r.avisos.some(t=>t.includes('2 ventas pueden estar duplicadas')));
  await page.evaluate(()=>{pmCerrar();pmElegir('cta-base','entrega');return abrirProductosMes();});r=await page.evaluate(()=>PM_REPORTE);
  chk('Entrega excluye lo cargado este mes con entrega en el siguiente',r.pedidos===4&&r.unidades===10);
  await page.getByRole('button',{name:'Detalle de ventas',exact:true}).click();
  chk('la pestaña Detalle contiene cliente, vendedor y precios',await page.locator('#pm-body').innerText().then(t=>t.includes('Cliente 101')&&t.includes('Fernando Peinado')&&t.includes('Sin dato')));
  await page.evaluate(()=>exportProductosMes());
  const zip=await page.evaluate(async()=>{
    var f=await xlsxDescomprimir(new Uint8Array(_xlsxPM).buffer);
    return {libro:f['xl/workbook.xml'],con:f['xl/worksheets/sheet1.xml'],det:f['xl/worksheets/sheet2.xml'],hojas:pmHojas(PM_REPORTE)};
  });
  chk('el Excel real tiene exactamente Consolidado y Detalle',(zip.libro.match(/<sheet /g)||[]).length===2&&zip.libro.includes('name="Consolidado"')&&zip.libro.includes('name="Detalle"'));
  chk('exporta período, criterio y advertencias en ambas hojas',zip.con.includes('Fecha de entrega')&&zip.det.includes('Fecha de entrega')&&zip.con.includes('duplicadas')&&zip.det.includes('duplicadas'));
  chk('la exportación conserva Sin dato y precios numéricos',zip.det.includes('Sin dato')&&zip.det.includes('<v>100</v>'));
  chk('consolidado y detalle contienen los mismos importes conocidos',r.conocido===r.detalle.reduce((n,l)=>n+(l.importe||0),0)&&r.conocido===r.consolidado.reduce((n,g)=>n+g.conocido,0));
  // Cambiar filtros detrás no debe cambiar el corte ya abierto ni su Excel.
  await page.evaluate(()=>document.getElementById('cta-vendedor').value='Fernando Peinado');
  chk('el Excel usa el mismo corte abierto, no los filtros cambiados después',await page.evaluate(()=>PM_REPORTE.cfg.vendedor===''&&pmHojas(PM_REPORTE)[0].matrix[3][1]==='Todos los vendedores'));
  if(process.env.PM_SCREENSHOT)await page.screenshot({path:process.env.PM_SCREENSHOT});
  await page.evaluate(()=>pmCerrar());
  chk('cerrar conserva búsqueda, vendedor y mes',await page.evaluate(()=>document.getElementById('cta-search').value==='NO COINCIDE'&&document.getElementById('cta-vendedor').value==='Fernando Peinado'&&document.getElementById('cta-mes').value===_mesPM));
  for(const mode of ['dia','todo']){await page.evaluate(m=>{pmElegir('cta-mode',m);return abrirProductosMes();},mode);chk(mode+': pide seleccionar mes sin abrir reporte',!(await page.locator('#pm-overlay').count()));}
  await page.evaluate(()=>{pmElegir('cta-mode','mes');apiList=()=>Promise.resolve({ok:true,pedidos:[]});return abrirProductosMes();});
  chk('estado vacío explícito',await page.locator('#pm-body').innerText().then(t=>t.includes('No hay productos vendidos')));
  await page.evaluate(()=>{pmCerrar();apiList=()=>Promise.reject(Error('Red caída'));return abrirProductosMes();});
  chk('fallo de carga visible y permite reintentar',await page.getByRole('button',{name:'Reintentar'}).count()===1);
  await page.evaluate(()=>{pmCerrar();apiList=()=>new Promise(resolve=>window._resolverPM=resolve);abrirProductosMes();});
  chk('muestra estado de carga',await page.locator('#pm-body').innerText().then(t=>t.includes('Cargando')));
  await page.evaluate(()=>{pmCerrar();_resolverPM({ok:true,pedidos:_datosPM});});
  chk('cerrar mientras carga no reabre la ventana',!(await page.locator('#pm-overlay').count()));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{apiList=()=>Promise.resolve({ok:true,pedidos:_datosPM});return abrirProductosMes();});
  chk('sin errores JS en escritorio y celular',!errors.length);if(errors.length)console.log(errors);
 }finally{await browser.close();console.log(`${PASS} bien · ${FAIL} mal`);}
 process.exit(FAIL?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
