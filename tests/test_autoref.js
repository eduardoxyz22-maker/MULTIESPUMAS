/* 🔄 La pantalla se actualiza sola.
   El reporte: *"las que dejan su panel todo el día y no actualizan"*. Nadie toca 🔄, así que
   la pantalla se queda con la planilla de la mañana. Eso ya costó las 25 OC repetidas de
   agosto, y además la vendedora no ve los pagos de las otras ni el chofer sus reasignaciones.
   Lo delicado no es refrescar: es NO PISAR a alguien que está en el medio de algo. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._planilla=[]; window._consultas=0;
    apiSave=function(rec){ window._planilla.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true}); };
    apiList=function(){ window._consultas++; return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._planilla))}); };
    apiGeocode=function(){ return Promise.resolve({ok:true,geo:[]}); };
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    window._nuevo=function(n){
      window._planilla.push({ id:'n'+n, nota:String(n), oc:'08-'+('00'+n).slice(-3), fecha:hoy, turno:'AM',
        vendedor:'Carola Chavez', cliente:'CLIENTE '+n, celular:'7', nit:'1', zona:'Norte', direccion:'X',
        chofer:'Luis', productos:[{desc:'SOFT ICE',medida:'140x190',cant:1,precio:1000}],
        acuenta:0, saldo:1000, pagado:false, metodoPago:'', ts:ts+n });
    };
    _nuevo(1); STATE=JSON.parse(JSON.stringify(window._planilla));
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    document.getElementById('mis-vendedor').value='Carola Chavez';
    document.getElementById('cho-nombre').value='Luis';
  });

  const ver = () => page.evaluate(()=>({ enPantalla:STATE.length, enPlanilla:window._planilla.length,
                                         consultas:window._consultas, ocupado:autoOcupado() }));

  // ---------- 1. la pantalla quieta se pone al día ----------
  let r = await page.evaluate(async ()=>{
    showView('mis'); await new Promise(x=>setTimeout(x,200));
    _nuevo(2); _nuevo(3);                       // otras dos vendedoras cargaron
    var antes=STATE.length;
    await autoRefrescar('test');
    return { antes:antes, despues:STATE.length,
             enLista:(document.getElementById('mis-lista')||{}).textContent||'' };
  });
  chk('con la pantalla quieta, se pone al día sola', r.antes===1 && r.despues===3, r.antes+' → '+r.despues);
  chk('  y lo nuevo aparece en la lista', /CLIENTE 3/.test(r.enLista), '');

  // ---------- 2. NO pisa a alguien con una ficha abierta ----------
  r = await page.evaluate(async ()=>{
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','todo'); setContaModo('todo');
    await new Promise(x=>setTimeout(x,200));
    showContaModal('n1');
    await new Promise(x=>setTimeout(x,200));
    var motivo=autoOcupado();
    _nuevo(4);
    var antes=STATE.length;
    await autoRefrescar('test');
    var sigueAbierta=document.getElementById('modal').classList.contains('on');
    var titulo=((document.querySelector('#modal-box h3')||{}).textContent||'').trim();
    closeModal();
    return { motivo:motivo, antes:antes, despues:STATE.length, sigueAbierta:sigueAbierta, titulo:titulo };
  });
  chk('con una FICHA abierta se saltea el tic', r.motivo==='ficha abierta' && r.antes===r.despues,
      'motivo="'+r.motivo+'" · '+r.antes+' → '+r.despues);
  chk('  y la ficha queda abierta, sin moverse', r.sigueAbierta===true && /CLIENTE 1/.test(r.titulo), r.titulo);

  // ---------- 3. tampoco con una pantalla completa abierta ----------
  r = await page.evaluate(async ()=>{
    abrirCarga(); await new Promise(x=>setTimeout(x,200));
    var motivo=autoOcupado(); var antes=STATE.length;
    await autoRefrescar('test');
    var d=STATE.length; closeCarga();
    return { motivo:motivo, antes:antes, despues:d };
  });
  chk('con la LISTA DE CARGA abierta se saltea', r.motivo==='carga' && r.antes===r.despues,
      'motivo="'+r.motivo+'"');

  // ---------- 4. ni mientras sube una imagen ----------
  r = await page.evaluate(async ()=>{
    COMP_SUBIENDO=1;
    var motivo=autoOcupado(); var antes=STATE.length;
    await autoRefrescar('test');
    var d=STATE.length; COMP_SUBIENDO=0;
    return { motivo:motivo, antes:antes, despues:d };
  });
  chk('mientras SUBE UNA IMAGEN se saltea', r.motivo==='subiendo una imagen' && r.antes===r.despues,
      'motivo="'+r.motivo+'"');

  // ---------- 5. ni mientras se está guardando un pedido ----------
  r = await page.evaluate(async ()=>{
    setSubmitting(true);
    var motivo=autoOcupado(); var antes=STATE.length;
    await autoRefrescar('test');
    var d=STATE.length; setSubmitting(false);
    return { motivo:motivo, antes:antes, despues:d };
  });
  chk('mientras GUARDA un pedido se saltea', r.motivo==='guardando el pedido' && r.antes===r.despues,
      'motivo="'+r.motivo+'"');

  // ---------- 6. el formulario SÍ se refresca, sin tocar lo escrito ----------
  r = await page.evaluate(async ()=>{
    showView('form'); await new Promise(x=>setTimeout(x,250));
    resetForm();
    document.getElementById('f-cliente').value='LO QUE ESTOY ESCRIBIENDO';
    document.getElementById('f-celular').value='70099887';
    var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='TITANIO ICE';
    _nuevo(5);
    var antes=STATE.length;
    await autoRefrescar('test');
    return { antes:antes, despues:STATE.length,
             cliente:document.getElementById('f-cliente').value,
             celular:document.getElementById('f-celular').value,
             prod:(document.querySelector('#f-productos .prod-desc')||{}).value||'' };
  });
  chk('en el FORMULARIO sí se actualiza (cupos, día cerrado, N° de OC)', r.despues>r.antes,
      r.antes+' → '+r.despues);
  chk('  y NO le borra nada de lo que estaba escribiendo',
      r.cliente==='LO QUE ESTOY ESCRIBIENDO' && r.celular==='70099887' && r.prod==='TITANIO ICE',
      '"'+r.cliente+'" · '+r.celular+' · '+r.prod);

  // ---------- 7. pestaña de fondo: no consulta nada ----------
  r = await page.evaluate(async ()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:function(){return true;}});
    var antes=window._consultas;
    await autoRefrescar('test'); await autoRefrescar('test');
    var conOculta=window._consultas;
    Object.defineProperty(document,'hidden',{configurable:true,get:function(){return false;}});
    await autoRefrescar('test');
    return { antes:antes, conOculta:conOculta, alVolver:window._consultas };
  });
  chk('con la pestaña de fondo NO se consulta la planilla (no se gasta cuota)',
      r.conOculta===r.antes, r.antes+' → '+r.conOculta+' consultas');
  chk('  y al volver a la pestaña sí consulta', r.alVolver>r.conOculta,
      r.conOculta+' → '+r.alVolver+' consultas');

  // ---------- 8. el pie dice hace cuánto se actualizó ----------
  r = await page.evaluate(async ()=>{
    await autoRefrescar('test'); updateFooter();
    var recien=document.getElementById('footer').textContent;
    ULTIMO_REFRESCO=Date.now()-14*60000;        // como si hiciera 14 minutos
    updateFooter();
    var viejo=document.getElementById('footer').textContent;
    var html=document.getElementById('footer').innerHTML;
    return { recien:recien, viejo:viejo, avisa:/var\(--amber\)/.test(html) };
  });
  chk('el pie dice que está al día', /actualizado recién/.test(r.recien), r.recien);
  chk('  y avisa en ámbar si quedó viejo', /actualizado hace 14 min/.test(r.viejo) && r.avisa===true, r.viejo);

  // ---------- 9. el reloj queda andando ----------
  r = await page.evaluate(()=>{
    autoArrancar();
    return { hayReloj: AUTO_TIMER!=null, cada: AUTO_MS/1000+'s' };
  });
  chk('queda un reloj andando para repetirlo solo', r.hayReloj===true, 'cada '+r.cada);

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
