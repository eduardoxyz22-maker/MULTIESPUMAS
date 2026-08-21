/* 🚚 La pantalla del chofer — donde se cobra la plata en la puerta del cliente.
   Es la más delicada del panel: si acá algo falla, la mercadería sale y la plata no vuelve.
   ⚠️ Este test estuvo MUERTO semanas: llamaba a `choPedirMetodo`, una función borrada, se
   caía antes de la primera comprobación y —como no imprimía ninguna falla— el corredor lo
   daba por bueno. La pantalla donde se cobra estaba sin red y nadie se enteró. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const bs=n=>'Bs '+Number(n).toFixed(2);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:412,height:900} });   // un celular
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CHO_COBRO_ABIERTO={};
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    apiFoto=function(){ return Promise.resolve({ok:true,fotoId:'IMG_ENT'}); };
    var hoy=todayStr(), man=tomorrowStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var b={turno:'AM',nit:'1',zona:'Norte',ts:ts};
    function P(o){ var q={}; for(var k in b)q[k]=b[k]; for(var k in o)q[k]=o[k]; return q; }
    STATE=[
      /* de LUIS, para hoy */
      P({id:'a', nota:'1', oc:'08-001', fecha:hoy, chofer:'Luis Pierre', vehiculo:'Carry',
         vendedor:'Carola Chavez', cliente:'ANA GUTIERREZ', celular:'70011122',
         direccion:'Av. Banzer 5to anillo', maps:'https://maps.app.goo.gl/AAA',
         acuenta:0, saldo:1500, pagado:false, metodoPago:'',
         productos:[{desc:'TITANIO ICE',medida:'160x190',cant:1,precio:1500,chk:'ok'}]}),
      P({id:'b', nota:'2', oc:'08-002', fecha:hoy, chofer:'Luis Pierre', vehiculo:'Carry',
         vendedor:'Carola Chavez', cliente:'BETO PEREZ', celular:'70033344',
         direccion:'Calle 3 Norte', maps:'',                       // sin ubicación: tiene que avisar
         acuenta:0, saldo:300, pagado:false, metodoPago:'',
         productos:[{desc:'ALMOHADA',medida:'50x70',cant:2,precio:150,chk:'no'}]}),   // sin stock: avisa
      /* de Luis, para MAÑANA */
      P({id:'c', nota:'3', oc:'08-003', fecha:man, chofer:'Luis Pierre', vehiculo:'Carry',
         vendedor:'Maria Flores', cliente:'CARLA MENDEZ', celular:'70055566',
         direccion:'Equipetrol', maps:'https://maps.app.goo.gl/BBB',
         acuenta:0, saldo:0, pagado:true, metodoPago:'QR BISA 900 @'+hoy+' #3 %I1',
         productos:[{desc:'SOFT ICE',medida:'140x190',cant:1,precio:900,chk:'ok'}]}),
      /* de OTRO chofer: no la tiene que ver */
      P({id:'d', nota:'4', oc:'08-004', fecha:hoy, chofer:'Giordano', vehiculo:'Foton',
         vendedor:'Maria Flores', cliente:'CARO RUIZ', celular:'70077788',
         direccion:'Plan 3000', maps:'https://maps.app.goo.gl/CCC',
         acuenta:0, saldo:800, pagado:false, metodoPago:'',
         productos:[{desc:'X',cant:1,precio:800}]})
    ];
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('chofer');
    llenarSelectChoferes();
    document.getElementById('cho-nombre').value='Luis Pierre';
    setChoFiltro('hoy');
  });
  await page.waitForTimeout(300);

  const lista = () => page.evaluate(()=>({
    html:(document.getElementById('cho-lista')||{}).innerHTML||'',
    txt:(document.getElementById('cho-lista')||{}).textContent||'',
    tarjetas:document.querySelectorAll('#cho-lista .cho-card').length,
    metricas:(document.getElementById('cho-metrics')||{}).textContent.replace(/\s+/g,' ').trim()||'',
    chips:[].map.call(document.querySelectorAll('#cho-chips .qchip'),function(b){return b.textContent.replace(/\s+/g,' ').trim();})
  }));

  // ---------- 1. ve lo suyo y nada más ----------
  let r = await lista();
  chk('ve sus entregas de hoy', /ANA GUTIERREZ/.test(r.txt) && /BETO PEREZ/.test(r.txt), r.tarjetas+' tarjetas');
  chk('  y NO ve las de otro chofer', !/CARO RUIZ/.test(r.txt), '');
  console.log('   chips:', r.chips.join('  |  '));
  console.log('   métricas:', r.metricas);
  chk('le dice cuánta plata tiene que traer', /1\.800,00/.test(r.metricas), r.metricas.slice(0,70));

  // ---------- 2. los avisos que le evitan un viaje al pedo ----------
  chk('avisa cuando falta la ubicación', /sin ubicación/i.test(r.html), '');
  chk('avisa el producto que NO HAY', /NO HAY/i.test(r.html), '');
  chk('tiene botón para llamar al cliente', /href="tel:70011122"/.test(r.html), '');
  chk('tiene el enlace de Maps', /maps\.app\.goo\.gl\/AAA/.test(r.html), '');

  // ---------- 3. marcar entregado, y poder deshacerlo ----------
  r = await page.evaluate(async ()=>{
    choEntregado('a'); await new Promise(x=>setTimeout(x,150));
    var tras={ entregado:findById('a').entregado,
               clase:(document.querySelector('#cho-lista .cho-card')||{}).className||'' };
    choEntregado('a'); await new Promise(x=>setTimeout(x,150));
    var desh=findById('a').entregado;
    choEntregado('a'); await new Promise(x=>setTimeout(x,150));
    return { tras:tras, desh:desh, final:findById('a').entregado };
  });
  chk('marca la entrega como hecha', r.tras.entregado===true && /hecho/.test(r.tras.clase), r.tras.clase);
  chk('  y si se equivocó, la puede deshacer', r.desh===false, '');

  // ---------- 4. COBRAR — los tres botones están en la tarjeta ----------
  r = await page.evaluate(()=>{
    var h=(document.getElementById('cho-lista')||{}).innerHTML||'';
    return { efectivo:/choCobrarMetodo\([^)]*'Efectivo'\)/.test(h),
             qr:/choCobrarMetodo\([^)]*'QR'\)/.test(h),
             tarjeta:/choCobrarMetodo\([^)]*'Tarjeta'\)/.test(h) };
  });
  chk('los tres botones de cobro están EN LA TARJETA', r.efectivo && r.qr && r.tarjeta,
      'Efectivo '+r.efectivo+' · QR '+r.qr+' · Tarjeta '+r.tarjeta);

  r = await page.evaluate(async ()=>{
    var _p=window.prompt; window.prompt=function(){ return '1500'; };
    choCobrarMetodo('a','QR');
    window.prompt=_p;
    await new Promise(x=>setTimeout(x,200));
    var p=findById('a');
    return { pagado:p.pagado, saldo:p.saldo, cobrado:totalCobrado(p),
             metodo:cobroMetodoTxt(cobrosDe(p)[0]||{}),
             metricas:(document.getElementById('cho-metrics')||{}).textContent.replace(/\s+/g,' ').trim() };
  });
  chk('cobra, guarda el método y salda la entrega',
      r.pagado===true && r.saldo===0 && r.cobrado===1500 && /QR/.test(r.metodo),
      r.metodo+' '+bs(r.cobrado)+' · saldo '+r.saldo);
  chk('  y las métricas se mueven al toque', /1\.500,00/.test(r.metricas) && /300,00/.test(r.metricas),
      r.metricas.slice(0,80));

  // ---------- 5. si cobra de MÁS, se lo dice ----------
  r = await page.evaluate(async ()=>{
    var _p=window.prompt; window.prompt=function(){ return '500'; };   // debe 300
    choCobrarMetodo('b','Efectivo');
    window.prompt=_p;
    await new Promise(x=>setTimeout(x,200));
    var p=findById('b');
    return { exceso:excesoCobro(p), badge:/de más/.test((document.getElementById('cho-lista')||{}).innerHTML||'') };
  });
  chk('si cobra de más lo marca, no lo esconde', r.exceso===200 && r.badge===true, 'exceso '+bs(r.exceso));

  // ---------- 6. puede sacar un cobro mal puesto ----------
  r = await page.evaluate(async ()=>{
    choQuitarCobro('b',0); await new Promise(x=>setTimeout(x,200));
    var p=findById('b');
    return { cobrado:totalCobrado(p), saldo:p.saldo, pagado:p.pagado };
  });
  chk('puede quitar un cobro mal cargado y el saldo vuelve', r.cobrado===0 && r.saldo===300 && !r.pagado,
      'cobrado '+bs(r.cobrado)+' · saldo '+bs(r.saldo));

  // ---------- 7. lo que cobró llega a Administración y a la rendición ----------
  r = await page.evaluate(async ()=>{
    showView('admin'); renderAdmin(); await new Promise(x=>setTimeout(x,200));
    showPedidoModal('a'); await new Promise(x=>setTimeout(x,150));
    var ficha=document.getElementById('modal-box').innerHTML;
    closeModal();
    return { ficha:/PAGADO/.test(ficha) && /QR/.test(ficha),
             rendicion:(document.getElementById('tbl-rendicion')||{}).textContent||'' };
  });
  chk('el admin ve la venta como PAGADO · QR', r.ficha===true, '');
  chk('  y entra en la rendición del chofer', /1\.500/.test(r.rendicion) && /Luis Pierre/.test(r.rendicion),
      r.rendicion.replace(/\s+/g,' ').slice(0,80));

  // ---------- 8. los filtros de la pantalla ----------
  r = await page.evaluate(async ()=>{
    showView('chofer'); await new Promise(x=>setTimeout(x,150));
    var n=function(){ return document.querySelectorAll('#cho-lista .cho-card').length; };
    var out={};
    setChoFiltro('manana'); out.manana=n();
    setChoFiltro('pend');   out.pend=n();
    setChoFiltro('todos');  out.todos=n();
    setChoFiltro('hoy');    out.hoy=n();
    return out;
  });
  chk('los filtros Hoy / Mañana / Todos separan bien',
      r.hoy===2 && r.manana===1 && r.todos===3,
      'hoy='+r.hoy+' mañana='+r.manana+' pendientes='+r.pend+' todos='+r.todos);

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
