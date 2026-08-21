/* 📴 La cola de pedidos sin internet.
   En Santa Cruz la señal se corta. La vendedora carga igual, el pedido queda guardado en
   SU computadora y se manda cuando vuelve la conexión. Todo lo que pase acá es una venta
   que puede desaparecer, así que se prueba en serio:
   - que un pedido cargado sin señal NO se pierda,
   - que la actualización automática (que ahora corre cada 2 minutos) NO lo pise,
   - y que se mande SOLO cuando vuelve la señal, sin que nadie toque nada.
   Ese último punto faltaba: antes se reintentaba solo al recargar la página, al guardar
   otro pedido con éxito, o si alguien veía el "sin enviar" del pie y tocaba "reintentar". */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:412,height:900} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._planilla=[]; window._hayRed=true;
    apiSave=function(rec){
      if(!window._hayRed) return Promise.reject(new Error('sin señal'));
      var g=JSON.parse(JSON.stringify(rec));
      var i=-1; for(var k=0;k<window._planilla.length;k++) if(window._planilla[k].id===g.id){i=k;break;}
      if(i>=0) window._planilla[i]=g; else window._planilla.push(g);
      return Promise.resolve({ok:true});
    };
    apiList=function(){
      if(!window._hayRed) return Promise.reject(new Error('sin señal'));
      return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._planilla))});
    };
    STATE=[];
    showView('form');
  });

  const cargar = (cliente) => page.evaluate(async (cliente) => {
    resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value=cliente;
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. X';
    document.getElementById('f-nota').value='1';
    var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='SOFT ICE';
    var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190';
    var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
    submitPedido();
    await new Promise(r=>setTimeout(r,5200));   // el tope de la mirada previa es de 4s
    return { enCola:getPending().length, enPlanilla:window._planilla.length,
             enPantalla:STATE.length, pie:document.getElementById('footer').textContent };
  }, cliente);

  // ---------- 1. con señal, se manda derecho ----------
  let r = await cargar('CON SEÑAL');
  chk('con señal el pedido se manda y no queda en la cola', r.enCola===0 && r.enPlanilla===1,
      'cola='+r.enCola+' planilla='+r.enPlanilla);

  // ---------- 2. SIN señal: se guarda igual y avisa ----------
  await page.evaluate(()=>{ window._hayRed=false; });
  r = await cargar('SIN SEÑAL');
  chk('SIN señal el pedido NO se pierde: queda en la cola', r.enCola===1, 'cola='+r.enCola);
  chk('  y la vendedora igual lo ve en pantalla', r.enPantalla===2, 'en pantalla='+r.enPantalla);
  chk('  el pie avisa que hay uno sin enviar', /1 sin enviar/.test(r.pie), r.pie);

  // ---------- 3. EL RIESGO: que la actualización automática lo pise ----------
  /* refrescarEstado() reemplaza STATE con lo que dice la planilla. Si no protegiera la
     cola, el pedido sin enviar desaparecería de la pantalla y la vendedora lo cargaría
     de nuevo (o peor: creería que se guardó). Ahora eso corre cada 2 minutos. */
  r = await page.evaluate(async ()=>{
    window._hayRed=true;                       // la planilla contesta, pero NO tiene el pedido
    window._planilla=window._planilla.filter(function(p){ return p.cliente!=='SIN SEÑAL'; });
    var laCola=getPending().map(function(p){ return p.cliente; });
    // se saltea el envío para probar SOLO que el refresco no lo borre
    var _f=window.flushPending; window.flushPending=function(){ return Promise.resolve(); };
    await refrescarEstado();
    window.flushPending=_f;
    return { laCola:laCola, enPantalla:STATE.map(function(p){ return p.cliente; }) };
  });
  chk('la actualización automática NO borra el pedido sin enviar',
      r.enPantalla.includes('SIN SEÑAL'), 'en pantalla: '+r.enPantalla.join(', '));

  // ---------- 4. al volver la señal se manda SOLO ----------
  r = await page.evaluate(async ()=>{
    var antes={ cola:getPending().length, planilla:window._planilla.length };
    await autoRefrescar('tic');                 // el tic de cada 2 minutos
    await new Promise(x=>setTimeout(x,200));
    return { antes:antes, cola:getPending().length, planilla:window._planilla.length,
             clientes:window._planilla.map(function(p){ return p.cliente; }),
             pie:document.getElementById('footer').textContent };
  });
  chk('al volver la señal, el tic lo manda SOLO — sin que nadie toque nada',
      r.cola===0 && r.clientes.includes('SIN SEÑAL'),
      'cola '+r.antes.cola+' → '+r.cola+' · planilla: '+r.clientes.join(', '));
  chk('  y el pie deja de avisar', !/sin enviar/.test(r.pie), r.pie);

  // ---------- 5. manda aunque la pantalla esté ocupada ----------
  /* Mandar no mueve nada en pantalla, así que no tiene por qué esperar a que la
     vendedora cierre lo que está haciendo: un pedido sin enviar es urgente. */
  r = await page.evaluate(async ()=>{
    /* Ojo: cambiar a la vista de Administración YA dispara un envío por su cuenta
       (loadFromServer llama a flushPending). Para probar el TIC y no eso, se cambia de
       vista PRIMERO y recién después se pone el pedido en la cola. */
    showView('admin'); renderAdmin();
    await new Promise(x=>setTimeout(x,250));
    window._hayRed=false;
    var rec={ id:'zz', nota:'9', oc:'08-999', fecha:tomorrowStr(), turno:'AM',
      vendedor:'Carola Chavez', cliente:'CON FICHA ABIERTA', celular:'7', nit:'1',
      zona:'Norte', direccion:'X', productos:[{desc:'A',cant:1}], saldo:100, ts:Date.now() };
    queuePending(rec); upsert(rec); renderAdmin();
    window._hayRed=true;
    await new Promise(x=>setTimeout(x,150));
    showPedidoModal('zz');                      // ficha abierta = pantalla ocupada
    await new Promise(x=>setTimeout(x,200));
    var motivo=autoOcupado();
    await autoRefrescar('tic');
    await new Promise(x=>setTimeout(x,250));
    var sigueAbierta=document.getElementById('modal').classList.contains('on');
    closeModal();
    return { motivo:motivo, cola:getPending().length, sigueAbierta:sigueAbierta,
             enPlanilla:window._planilla.some(function(p){ return p.id==='zz'; }) };
  });
  chk('con la pantalla ocupada igual manda lo pendiente', r.motivo==='ficha abierta' && r.cola===0 && r.enPlanilla,
      'motivo="'+r.motivo+'" · cola='+r.cola);
  chk('  pero NO le mueve la pantalla', r.sigueAbierta===true, '');

  // ---------- 6. si sigue sin señal, no se pierde nada ----------
  r = await page.evaluate(async ()=>{
    window._hayRed=false;
    var rec={ id:'yy', nota:'8', oc:'08-998', fecha:tomorrowStr(), turno:'AM',
      vendedor:'Carola Chavez', cliente:'SIGUE SIN SEÑAL', celular:'7', nit:'1',
      zona:'Norte', direccion:'X', productos:[{desc:'A',cant:1}], saldo:100, ts:Date.now() };
    queuePending(rec); upsert(rec);
    await autoRefrescar('tic'); await autoRefrescar('tic');
    await new Promise(x=>setTimeout(x,200));
    return { cola:getPending().length, enPantalla:STATE.some(function(p){ return p.id==='yy'; }) };
  });
  chk('si la señal no vuelve, el pedido sigue esperando (no se descarta)',
      r.cola===1 && r.enPantalla===true, 'cola='+r.cola);

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
