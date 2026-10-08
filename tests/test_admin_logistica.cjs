/* Resumen superior 3D: usa Chromium real, datos ficticios y bloquea toda red externa.
   Ejecutar desde la raíz: node tests/test_admin_logistica.cjs
   NODE_PATH y CHROME_PATH permiten usar el runtime disponible en cada equipo. */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.cwd();
const captures=process.env.LOGISTICA_CAPTURAS||path.join(require('os').tmpdir(),'multiespumas-logistica-capturas');
let PASS=0,FAIL=0;
function chk(name,ok,extra=''){ok?PASS++:FAIL++;console.log((ok?'OK ':'FALLO ')+name+(extra?' · '+extra:''));}
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(bytes);});
});
let browser;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const ctx=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'America/La_Paz'});
  await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await ctx.addInitScript(()=>{
    localStorage.setItem('pedidos_resumen_adm','0');
    window.__gpu=[];window.__raf=new Set();window.__observers=new Set();
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const c=get.call(this,type,...args);if(c&&type==='webgl2'&&!window.__gpu.includes(c))window.__gpu.push(c);return c;};
    const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame=fn=>{let id=raf(t=>{window.__raf.delete(id);fn(t)});window.__raf.add(id);return id;};
    window.cancelAnimationFrame=id=>{window.__raf.delete(id);cancel(id)};
    const RO=window.ResizeObserver;
    window.ResizeObserver=class extends RO{observe(...a){window.__observers.add(this);return super.observe(...a)}disconnect(){window.__observers.delete(this);return super.disconnect()}};
  });
  const page=await ctx.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(origin+'/pedidos.html');
  chk('conserva el botón original del resumen',await page.locator('#adm-resumen-btn').count()===1);
  const integrated=await page.locator('#adm-logistica').count()===1;
  chk('incluye la escena en el resumen superior',integrated);
  if(!integrated){await ctx.close();return;}
  await page.waitForFunction(()=>window.AdminLogistica);
  chk('no descarga Three.js antes de mostrar el resumen',!requests.some(u=>u.includes('three.module')));
  await page.evaluate(()=>{
    CONNECTED=false;UNLOCKED=true;VENTA_TIENDA=false;STOCK_CARGADO=true;CARGA_ESTADO='ok';
    document.getElementById('admin-lock').style.display='none';document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();loadFromServer=()=>Promise.resolve();
    window.__writes=0;apiSave=apiPost=guardarStock=persistPedido=()=>{window.__writes++;throw Error('La vista intentó escribir')};
    var f=todayStr();
    STATE=Array.from({length:5},(_,i)=>({id:'log-'+i,fecha:f,turno:'AM',oc:'TEST-'+(i+1),nota:'',vendedor:'Prueba',
      cliente:'Cliente de prueba '+(i+1),celular:'',zona:'Norte',direccion:'',maps:'',pagado:i===0,saldo:i===0?0:200,acuenta:0,
      cobradoBs:0,metodoPago:i===0?'Efectivo':'',observaciones:'',garantia:'',facturarA:'',nit:'',estado:'',entregado:i===0,
      verificado:false,vehiculo:i<2?'Carry':i===2?'Foton nuevo':i===3?'Foton encarpado':'',chofer:i<2?'Luis Pierre':i===2?'Luis Eyzaguirre':'',
      nroDia:i+1,ts:Date.now(),productos:[{desc:'SOFT ICE',medida:'140x190',codigo:'A1',cant:i+1}]}));
    STOCK={c:{f:f,hora:'08:00:00',u:{}},g:{'01-05-025 Almacen Distribucion Banzer':{f:f,u:{}},'IM - PRODUCTOTERMINADO':{f:f,u:{}}},
      al:{},p:[],e:[],a:{}};
    document.querySelectorAll('#adm-mode button').forEach(b=>b.classList.toggle('active',b.dataset.val==='todo'));
    showViewAhora('admin');renderAdmin();
    window.__before=JSON.stringify({STATE,STOCK});
  });
  chk('oculto no crea canvas ni contexto',await page.locator('#adm-logistica canvas').count()===0);
  await page.locator('#adm-resumen-btn').click();
  await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready',{},{timeout:20000});
  chk('monta una escena WebGL real',await page.locator('#adm-logistica canvas').count()===1);
  chk('solo muestra los tres vehículos asignados',await page.locator('[data-log-id^="truck:"]').count()===3);
  chk('conserva las tres entidades de depósitos',await page.locator('[data-log-id^="depot:"]').count()===3);
  chk('avisa del pedido sin vehículo',/1 pedido sin vehículo/.test(await page.locator('[data-log-empty]').innerText()));
  chk('los consolidados quedan disponibles sin ocupar la vista inicial',!(await page.locator('.adm-logistica-consolidado').getAttribute('open')));
  const pick=await page.evaluate(async()=>{
    const THREE=await import('./vendor/logistica-three/three.module.js');
    const host=document.querySelector('.adm-logistica-canvas'),r=host.getBoundingClientRect(),half=Math.max(18,26/(r.width/r.height));
    const camera=new THREE.OrthographicCamera(-half*r.width/r.height,half*r.width/r.height,half,-half,.1,220);
    camera.position.set(35,35,45);camera.lookAt(0,0,3);camera.updateMatrixWorld();
    const point=new THREE.Vector3(-13,1.8,-1).project(camera);
    return {x:r.x+(point.x*.5+.5)*r.width,y:r.y+(-point.y*.5+.5)*r.height};
  });
  await page.mouse.click(pick.x,pick.y);
  chk('clic sobre el camión 3D selecciona su entidad real',await page.locator('[data-log-id="truck:Carry"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-log-id="truck:Carry"]').click();
  chk('selección usa nombre y asignación reales',/Carry/.test(await page.locator('[data-log-detail]').innerText()) && (await page.locator('.adm-logistica-number').innerText())==='2' && /pedidos asignados · 3 unidades/.test(await page.locator('[data-log-detail]').innerText()));
  chk('no inventa capacidad ni ubicación',/Capacidad y ubicación en vivo no disponibles/.test(await page.locator('[data-log-detail]').innerText()));
  fs.mkdirSync(captures,{recursive:true});
  await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  await page.screenshot({path:path.join(captures,'admin-superior-desktop.png'),fullPage:false});
  await page.locator('#adm-logistica').screenshot({path:path.join(captures,'escena-desktop.png'),style:'.header{visibility:hidden!important}.toast{visibility:hidden!important}',animations:'disabled'});
  await page.locator('.adm-logistica-order').first().click();
  chk('abre la ficha existente del pedido seleccionado',await page.locator('#modal').evaluate(e=>e.classList.contains('on')));
  await page.evaluate(()=>closeModal());
  chk('cerrar ficha no escribe datos',await page.evaluate(()=>window.__writes===0));
  await page.locator('.adm-logistica-close').click();
  chk('cerrar detalle devuelve el foco al camión',await page.locator('[data-log-id="truck:Carry"]').evaluate(e=>e===document.activeElement));
  await page.locator('[data-log-id="depot:BANZER"]').click();
  chk('Banzer muestra el corte del almacén real',/Corte del/.test(await page.locator('[data-log-detail]').innerText()));
  await page.locator('.adm-logistica-primary').click();
  chk('abre Stock y reposición existente',await page.locator('#stock-overlay').isVisible());
  await page.evaluate(()=>closeStock());
  await page.keyboard.press('Escape');
  for(let i=0;i<5;i++){
    await page.locator('#adm-resumen-btn').click();
    chk('ocultar libera canvas y observador, vuelta '+(i+1),await page.evaluate(()=>!document.querySelector('#adm-logistica canvas')&&window.__observers.size===0));
    await page.locator('#adm-resumen-btn').click();
    await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  }
  await page.waitForTimeout(300);
  chk('el render queda inactivo cuando nada cambia',await page.evaluate(()=>window.__raf.size===0));
  chk('los contextos anteriores fueron liberados',await page.evaluate(()=>window.__gpu.slice(0,-1).every(c=>c.isContextLost())));
  await page.evaluate(()=>showViewAhora('form'));
  chk('salir de Administración desmonta la escena',await page.locator('#adm-logistica canvas').count()===0);
  await page.evaluate(()=>showViewAhora('admin'));
  await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  chk('volver monta una sola escena',await page.locator('#adm-logistica canvas').count()===1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-log-reset]').click();await page.waitForTimeout(100);
  chk('movimiento reducido no mantiene animaciones',await page.evaluate(()=>window.__raf.size===0));
  await page.evaluate(()=>{CARGA_ESTADO='cargando';CONNECTED=true;AdminLogistica.refresh()});
  chk('muestra el estado de carga de la planilla',/Actualizando/.test(await page.locator('[data-log-note]').innerText()));
  await page.evaluate(()=>{CARGA_ESTADO='error';AdminLogistica.refresh()});
  chk('error conserva datos y lo identifica',/Sin respuesta/.test(await page.locator('[data-log-note]').innerText())&&await page.locator('[data-log-id^="truck:"]').count()===3);
  await page.evaluate(()=>{CONNECTED=false;CARGA_ESTADO='ok';AdminLogistica.refresh()});
  chk('selección y navegación dejan stock y pedidos intactos',await page.evaluate(()=>__writes===0&&__before===JSON.stringify({STATE,STOCK})));
  await page.setViewportSize({width:390,height:844});
  await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  await page.locator('[data-log-id="truck:Foton nuevo"]').click();
  await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  await page.locator('#adm-logistica').screenshot({path:path.join(captures,'escena-mobile.png'),style:'.header{visibility:hidden!important}.toast{visibility:hidden!important}',animations:'disabled'});
  chk('móvil limita la resolución de WebGL incluso al cambiar de tamaño',await page.locator('#adm-logistica canvas').evaluate(e=>e.width<=Math.ceil(e.parentElement.clientWidth)));
  chk('el resumen no desborda en móvil',await page.locator('#adm-logistica').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await page.evaluate(()=>{document.querySelector('#adm-search').value='sin coincidencias';renderAdmin()});
  chk('filtro vacío retira los camiones',await page.locator('[data-log-id^="truck:"]').count()===0);
  chk('filtro vacío explica lo ocurrido',/No hay pedidos/.test(await page.locator('[data-log-empty]').innerText()));
  await page.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  await page.evaluate(()=>{const canvas=document.querySelector('#adm-logistica canvas');canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()});
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='fallback');
  chk('contexto perdido deja alternativa accesible',await page.locator('[data-log-id^="depot:"]').count()===3 && /no está disponible/.test(await page.locator('[data-log-status]').innerText()));
  await page.locator('.adm-logistica-retry').click();
  await page.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  chk('se recupera tras perder WebGL',await page.locator('#adm-logistica canvas').count()===1);
  await page.evaluate(()=>{STATE=[];STOCK={c:{f:'',u:{}},g:{},al:{},p:[],e:[],a:{}};document.querySelector('#adm-search').value='';renderAdmin()});
  await page.locator('[data-log-id="depot:PTF"]').click();
  chk('sin corte no convierte ausencia de datos en stock cero',/Sin corte/.test(await page.locator('[data-log-detail]').innerText()));
  const ids=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((x,i)=>ids.indexOf(x)!==i)});
  chk('no agrega IDs duplicados',ids.length===0,ids.join(','));
  chk('sin errores JavaScript',errors.length===0,errors.join('; '));
  await ctx.close();

  async function newPreview() {
    const c=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'America/La_Paz'});
    await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    await c.addInitScript(()=>localStorage.setItem('pedidos_resumen_adm','0'));
    const p=await c.newPage();
    await p.goto(origin+'/pedidos.html');
    await p.waitForFunction(()=>window.AdminLogistica);
    await p.evaluate(()=>{
      CONNECTED=false;UNLOCKED=true;
      document.getElementById('admin-lock').style.display='none';document.getElementById('admin-content').style.display='block';
      loadFromServer=()=>Promise.resolve();showViewAhora('admin');renderAdmin();
    });
    return {c,p};
  }
  const late=await newPreview();
  let unblock,requested;
  const blocked=new Promise(r=>unblock=r),seen=new Promise(r=>requested=r);
  await late.p.route('**/admin-logistica-scene.mjs',async route=>{requested();await blocked;await route.continue()});
  await late.p.locator('#adm-resumen-btn').click();await seen;
  chk('muestra carga diferida mientras espera el módulo',await late.p.locator('#adm-logistica').getAttribute('data-scene')==='loading');
  await late.p.locator('#adm-resumen-btn').click();unblock();
  await late.p.waitForTimeout(250);
  chk('ocultar durante la descarga impide un montaje tardío',await late.p.locator('#adm-logistica canvas').count()===0);
  await late.p.locator('#adm-resumen-btn').click();
  await late.p.locator('.adm-logistica-stage').scrollIntoViewIfNeeded();
  await late.p.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='ready');
  chk('puede abrir después de cancelar la carga inicial',await late.p.locator('#adm-logistica canvas').count()===1);
  await late.c.close();
  const broken=await newPreview();
  await broken.p.route('**/admin-logistica-scene.mjs',r=>r.abort());
  await broken.p.locator('#adm-resumen-btn').click();
  await broken.p.waitForFunction(()=>document.getElementById('adm-logistica').dataset.scene==='fallback');
  chk('error al descargar el módulo conserva los controles accesibles',await broken.p.locator('[data-log-id^="depot:"]').count()===3);
  await broken.p.locator('[data-log-id="depot:PTF"]').click();
  chk('el detalle funciona aunque falle la descarga 3D',/PTF/.test(await broken.p.locator('[data-log-detail]').innerText()));
  await broken.c.close();
})().catch(error=>{FAIL++;console.error(error)}).finally(async()=>{
  if(browser)await browser.close();server.close();
  console.log(PASS+' bien · '+FAIL+' mal');process.exitCode=FAIL?1:0;
});
