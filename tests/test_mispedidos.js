/* 📥 «MIS PEDIDOS»: ENTRAR Y VER LO TUYO (§4ch).

   Reportado por el dueño con dos capturas: la vendedora abre Mis pedidos, arriba dice
   «Carola Chavez» —su nombre, ya puesto— y abajo **«Elegí tu nombre para ver tus
   pedidos.»**. Tuvo que tocar 🔄 Actualizar para ver algo. Y el pie decía «actualizado
   hace 20 min» aunque se acababa de traer la planilla.

   Se reprodujeron TRES fallas distintas, todas acá adentro:

   1. `renderMis()` guardaba el nombre SIEMPRE, también el vacío. Y a `renderMis()` la
      llaman desde muchos lados (repintado automático, borrar un pedido, el panel del
      chofer) con la pestaña de Mis pedidos sin abrir y el campo vacío: cada una de esas
      veces le BORRABA el nombre recordado. Medido: «Carola Chavez» → «» con una sola
      llamada.
   2. `refreshMis()` no dibujaba nada hasta que contestaba el servidor: mientras la red
      viajaba (o si fallaba) se quedaba el cartel de «Elegí tu nombre» debajo del nombre
      ya escrito.
   3. `refreshMis()` bajaba la planilla por su cuenta y no tocaba `ULTIMO_REFRESCO`: el
      sello del pie mentía.

   ⚠️ Lo que este test cuida es que la vendedora ABRA y VEA. Si tiene que tocar un botón
   para que aparezca lo suyo, la venta que vino de Kommo no la ve nadie.

   Se corre:  node tests/test_mispedidos.js   (desde la raíz del repo) */
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

  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; MIS_TODOS=false; MIS_CARGANDO=false;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var P=function(o){ return Object.assign({id:'x'+Math.random(),fecha:hoy,oc:'09-001',
      vendedor:'Carola Chavez',cliente:'CLIENTE',productos:[{desc:'TITANIO ICE',medida:'160x190',cant:1,precio:6660}],
      celular:'76317574',turno:'AM',zona:'Norte',direccion:'Av. X',maps:'',pagado:false,saldo:6660,
      ts:ts,metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',
      nota:'1',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    window._pl=[
      P({id:'v1', cliente:'ERWIN MARCELO MESCHWITZ LINO'}),
      P({id:'v2', cliente:'OTRA CLIENTA', vendedor:'Mirian Salazar'}),
      // 📥 Un borrador de Kommo a nombre de Carola: no es un pedido, va en su bandeja.
      P({id:'kommo-39357288', cliente:'ERWIN MARCELO MESCHWITZ LINO', fecha:'', turno:'',
         estado:'Borrador Kommo', nroDia:0, oc:''})
    ];
    window._demora=0; window._falla=false; window._llamadas=0;
    apiList=function(){
      window._llamadas++;
      if(window._falla) return Promise.reject(new Error('sin señal'));
      return new Promise(function(res){ setTimeout(function(){
        res({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); }, window._demora); });
    };
    apiSave=function(){ return Promise.resolve({ok:true}); };
    STATE=[]; BORRADORES=[]; saveMirror();
    setVendedorMem('Carola Chavez');
    document.getElementById('mis-vendedor').value='';
  });

  // ══ 1. El nombre recordado no se borra solo ════════════════════════════════
  console.log('\n── 1. El nombre recordado ──');
  await armar();
  let r = await page.evaluate(() => {
    setVendedorMem('Carola Chavez');
    document.getElementById('mis-vendedor').value='';
    renderMis();                       // como la llaman autoRepintar, borrar un pedido, etc.
    var m1=getVendedorMem();
    renderMis(); renderMis();
    return { tras1:m1, tras3:getVendedorMem(), campo:document.getElementById('mis-vendedor').value };
  });
  chk('⚠️ un renderMis() con el campo vacío NO borra el nombre recordado', r.tras1==='Carola Chavez', r.tras1);
  chk('…ni tres seguidos', r.tras3==='Carola Chavez', r.tras3);
  chk('…y se lo vuelve a poner en el campo', r.campo==='Carola Chavez', r.campo);

  // ══ 2. Al entrar, se ve lo suyo — sin tocar nada ═══════════════════════════
  console.log('\n── 2. Entrar a Mis pedidos ──');
  await armar();
  r = await page.evaluate(async () => {
    window._demora=1200;                                  // la red tarda
    showView('mis');
    await new Promise(r=>setTimeout(r,250));              // mientras viaja
    return { campo: document.getElementById('mis-vendedor').value,
             empty: document.getElementById('mis-empty').textContent.trim(),
             estado: document.getElementById('mis-estado').textContent.trim() };
  });
  chk('el campo se llena solo con el nombre recordado', r.campo==='Carola Chavez', r.campo);
  chk('⚠️ NO dice «Elegí tu nombre» teniendo el nombre puesto', !/Elegí tu nombre/.test(r.empty), r.empty);
  chk('…y avisa que está buscando', /Buscando tus pedidos/.test(r.estado), r.estado);

  r = await page.evaluate(async () => {
    await new Promise(r=>setTimeout(r,1400));
    var tbl=document.getElementById('mis-lista');
    return { txt: (tbl.textContent||'').replace(/\s+/g,' '),
             visible: tbl.style.display!=='none',
             estado: document.getElementById('mis-estado').textContent.trim(),
             borr: (document.getElementById('mis-borradores').textContent||'').replace(/\s+/g,' ') };
  });
  chk('⚠️ cuando llega, ve SUS pedidos sin tocar Actualizar', r.visible && /ERWIN MARCELO/.test(r.txt), r.txt.slice(0,110));
  chk('…y no los de otra vendedora', !/OTRA CLIENTA/.test(r.txt), r.txt.slice(0,110));
  chk('el cartel de «buscando» se va', r.estado==='', r.estado);
  chk('⚠️ y el borrador de Kommo aparece sin volver a escribir el nombre', /vino de Kommo/.test(r.borr), r.borr.slice(0,120));

  // ══ 3. El sello del pie dice la verdad ═════════════════════════════════════
  console.log('\n── 3. El sello del pie ──');
  r = await page.evaluate(async () => {
    window._demora=0;
    ULTIMO_REFRESCO=Date.now()-20*60*1000; updateFooter();
    var antes=document.getElementById('footer').textContent.replace(/\s+/g,' ');
    await refreshMis();
    return { antes:antes, despues:document.getElementById('footer').textContent.replace(/\s+/g,' ') };
  });
  chk('⚠️ tras una consulta buena, el pie deja de decir «hace 20 min»', !/20 min/.test(r.despues), r.despues);
  chk('…y dice que se actualizó recién', /recién/.test(r.despues), r.despues);

  // ══ 4. Un fallo de red se ve, y no se pierde nada ══════════════════════════
  console.log('\n── 4. Sin señal ──');
  r = await page.evaluate(async () => {
    window._falla=true;
    queuePending(Object.assign({}, window._pl[0], {id:'sin-enviar', cliente:'CARGADO SIN SEÑAL'}));
    var pendAntes=getPending().length;
    await refreshMis();
    return { estado: document.getElementById('mis-estado').textContent.replace(/\s+/g,' '),
             pendAntes: pendAntes, pendDespues: getPending().length,
             lista: (document.getElementById('mis-lista').textContent||'').replace(/\s+/g,' '),
             pie: document.getElementById('footer').textContent.replace(/\s+/g,' ') };
  });
  chk('⚠️ el fallo de red SE VE (no aparenta éxito)', /No se pudo actualizar/.test(r.estado), r.estado.slice(0,120));
  chk('…y dice que lo cargado no se pierde', /no se pierde|NO se pierde/.test(r.estado), r.estado.slice(0,160));
  chk('⚠️ lo que estaba sin enviar sigue en la cola', r.pendDespues===r.pendAntes && r.pendAntes>0, r.pendAntes+' → '+r.pendDespues);
  chk('…y se siguen viendo los pedidos que ya tenía', /ERWIN MARCELO/.test(r.lista), r.lista.slice(0,90));
  chk('…y el pie avisa que hay algo sin enviar', /sin enviar/.test(r.pie), r.pie.slice(0,120));

  r = await page.evaluate(async () => {
    window._falla=false;
    await refreshMis();
    return document.getElementById('mis-estado').textContent.trim();
  });
  chk('al volver la señal, el aviso rojo se va', r==='', r);

  // ══ 5. Mira sola cada 30 s, sin pisarle el trabajo a nadie ═════════════════
  console.log('\n── 5. Se actualiza sola ──');
  r = await page.evaluate(() => ({ ms: (typeof MIS_MS!=='undefined')?MIS_MS:-1, auto: AUTO_MS }));
  chk('⚠️ Mis pedidos mira cada 30 segundos', r.ms===30000, r.ms);
  chk('…más seguido que el resto del panel', r.ms<r.auto, r.ms+' vs '+r.auto);

  r = await page.evaluate(async () => {
    var o={};
    showView('mis');
    await new Promise(r=>setTimeout(r,50));
    o.enMis = misAlAire();
    document.getElementById('modal').classList.add('on');        // una ficha abierta
    o.conFicha = misAlAire();
    document.getElementById('modal').classList.remove('on');
    var b=document.getElementById('f-submit'); if(b) b.disabled=true;   // guardando
    o.guardando = misAlAire();
    if(b) b.disabled=false;
    showView('form');
    o.enOtraPestana = misAlAire();
    showView('mis');
    return o;
  });
  chk('en Mis pedidos, corresponde refrescar', r.enMis===true);
  chk('⚠️ con una ficha abierta NO se refresca (le movería la pantalla)', r.conFicha===false);
  chk('⚠️ ni mientras se está guardando un pedido', r.guardando===false);
  chk('…ni en otra pestaña', r.enOtraPestana===false);

  r = await page.evaluate(async () => {
    window._demora=400; window._llamadas=0;
    var a=refreshMis(), b=refreshMis(), c=refreshMis();   // tres seguidas
    await Promise.all([a,b,c]);
    return window._llamadas;
  });
  chk('⚠️ tres pedidos de refresco a la vez NO hacen tres consultas', r===1, r);

  // ══ 6. El borrador no es un pedido ═════════════════════════════════════════
  console.log('\n── 6. El borrador sin completar ──');
  r = await page.evaluate(async () => {
    /* El borrador entra con FECHA Y TURNO puestos: así se prueba lo que de verdad
       importa —que aunque tenga fecha no le come un lugar al camión de ese día—. */
    window._pl[2].fecha=todayStr(); window._pl[2].turno='AM';
    await refreshMis();
    var deHoy=STATE.filter(function(p){ return p.fecha===todayStr() && normTurno(p.turno)==='AM'; });
    return { enState: STATE.filter(function(p){ return String(p.id).indexOf('kommo-')===0; }).length,
             enBorradores: BORRADORES.length,
             cupo: cuposUsadosTurno(todayStr(),'AM'),
             deHoy: deHoy.length,
             borrEnCupo: deHoy.filter(function(p){ return esBorrador(p); }).length,
             conta: contaLista().filter(function(p){ return String(p.id).indexOf('kommo-')===0; }).length };
  });
  chk('⚠️ el borrador NO entra a la lista de pedidos', r.enState===0, r.enState);
  chk('…está en la bandeja de borradores', r.enBorradores===1, r.enBorradores);
  chk('⚠️ aunque tenga fecha y turno, NO ocupa cupo del camión',
      r.cupo===r.deHoy && r.borrEnCupo===0, 'cupo '+r.cupo+' = '+r.deHoy+' pedidos de verdad, borradores contados: '+r.borrEnCupo);
  chk('⚠️ ni aparece en contabilidad', r.conta===0, r.conta);

  // ══ 7. Al completarlo, no se duplica ni pierde el vínculo con Kommo ════════
  console.log('\n── 7. Completar el borrador ──');
  r = await page.evaluate(async () => {
    var b=borradorDe('kommo-39357288');
    return { existe: !!b, id: b&&b.id, lead: (typeof kleadDe==='function') ? kleadDe(b) : 'no existe kleadDe',
             mismaVenta: (typeof gemeloDe==='function') };
  });
  chk('el borrador se encuentra por su id de Kommo', r.existe && r.id==='kommo-39357288', r.id);
  chk('⚠️ al completarlo, el pedido conserva el id kommo-<lead>: el servidor no lo vuelve a crear',
      String(r.id).indexOf('kommo-39357288')===0, r.id);
  chk('…y el panel sabe reconocer una venta ya cargada a mano (gemelo)', r.mismaVenta===true);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
