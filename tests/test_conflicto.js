/* 🤝🔐 EL PANEL FRENTE A LOS «NO» NUEVOS DEL SERVIDOR (§4ce).

   El servidor ahora exige la clave del equipo, rechaza guardar sobre una fila que otro
   cambió (conflicto), rechaza mover a un día cerrado o turno lleno, y corrige o rechaza
   las OC repetidas. Nada de eso sirve si el panel, al recibir el «no», hace lo de antes:
   encolarlo y reintentar para siempre — o peor, mostrar «Guardado ✓».

   Lo que se cuida acá:
   - la clave viaja en cada llamada y, si falta, lo guardado queda en la cola (NO se pierde)
     y hay un botón para ingresarla;
   - un conflicto reemplaza lo que se ve por la fila actual, avisa, y NO se reencola;
   - el sello de revisión que manda el servidor se guarda (si no, el próximo guardado de la
     misma compu chocaría consigo mismo);
   - el sello que se manda al editar es el de cuando se ABRIÓ el formulario, aunque la
     pantalla se haya refrescado en el medio;
   - una OC corregida por el servidor se refleja en el pedido;
   - reprogramar confirmando avisos manda «forzar».

   Se corre:  node tests/test_conflicto.js   (desde la raíz del repo) */
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

  /* El servidor de mentira: `window._resp(body)` decide qué contesta; todo lo que el panel
     manda queda en `window._bodies`. */
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_CLAVE); }catch(e){}
    CLAVE_EQUIPO=''; CLAVE_RECHAZADA=false; SERVER_AUTH=''; NO_ENCOLAR={};
    window._bodies=[]; window._toasts=[];
    if(!window._toastOrig) window._toastOrig=window.toast;
    window.toast=function(m,k){ window._toasts.push(String(m)); return window._toastOrig.apply(null,arguments); };
    window._resp=function(b){ return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:b.pedido}; };
    window.fetch=function(url,o){
      var body=JSON.parse(o.body); window._bodies.push(body);
      var r=window._resp(body);
      return Promise.resolve({ json:function(){ return Promise.resolve(r); } });
    };
    var d=new Date(); d.setDate(d.getDate()+1); while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+1);
    window._F=isoLocal(d);
    var P=function(o){ return Object.assign({id:'x'+Math.random(),fecha:window._F,oc:'',vendedor:'Mirian Salazar',
      cliente:'C',productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:1000}],
      celular:'70000000',turno:'AM',zona:'Norte',direccion:'calle 1',maps:'',pagado:false,saldo:100,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,
      vehiculo:'',chofer:'',garantia:'',nota:'1',acuenta:0,facturarA:'',nit:'',nroDia:1,
      verificado:false,fotos:[],rev:1000},o); };
    window._pl=[ P({id:'juan', cliente:'JUAN PEREZ', saldo:100, rev:1000}) ];
    STATE=JSON.parse(JSON.stringify(window._pl)); saveMirror(); updateStats();
    initConnUI();
  });

  // ══ 1. 🔐 La clave ═════════════════════════════════════════════════════════
  console.log('\n── 1. La clave del equipo ──');
  let r = await page.evaluate(async () => {
    window._bodies=[]; window._toasts=[];
    window._resp=function(b){ return {ok:false, error:'clave', version:SCRIPT_VERSION_ESPERADA, auth:'clave'}; };
    var p=findById('juan'); p.chofer='PEDRO';
    persistPedido(p);
    await new Promise(r=>setTimeout(r,150));
    return { mando: window._bodies[0], pend: getPending().map(x=>x.id), rech: CLAVE_RECHAZADA,
             cartel: document.getElementById('conn-form-txt').innerHTML, toasts: window._toasts.join(' | ') };
  });
  chk('sin clave guardada, la llamada va sin «key»', r.mando && r.mando.key===undefined, JSON.stringify(r.mando).slice(0,60));
  chk('⚠️ el servidor pidió clave → el cambio queda EN LA COLA (no se pierde)', r.pend.indexOf('juan')>=0, JSON.stringify(r.pend));
  chk('el panel sabe que le falta la clave', r.rech===true);
  chk('⚠️ el cartel de conexión lo dice y tiene el botón para ingresarla', /clave del equipo/i.test(r.cartel) && /pedirClaveEquipo/.test(r.cartel), r.cartel.replace(/<[^>]*>/g,'').slice(0,80));
  chk('…y avisó', /clave del equipo/i.test(r.toasts), r.toasts.slice(0,100));

  r = await page.evaluate(async () => {
    window._bodies=[]; window._toasts=[];
    window._resp=function(b){
      if(b.key!=='la-clave-buena') return {ok:false, error:'clave', auth:'clave'};
      if(b.action==='list') return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedidos:JSON.parse(JSON.stringify(window._pl))};
      return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:Object.assign({}, b.pedido, {rev:2000})};
    };
    window.prompt=function(){ return 'la-clave-buena'; };
    pedirClaveEquipo();
    await new Promise(r=>setTimeout(r,300));
    var guardada=''; try{ guardada=localStorage.getItem(LS_CLAVE); }catch(e){}
    return { bodies: window._bodies.map(b=>b.action+':'+(b.key||'-')), pend: getPending().length, rech: CLAVE_RECHAZADA,
             guardada: guardada, cartel: document.getElementById('conn-form-txt').innerHTML, toasts: window._toasts.join(' | ') };
  });
  chk('al ingresar la clave, queda guardada en el dispositivo', r.guardada==='la-clave-buena', r.guardada);
  chk('⚠️ …y lo que estaba en la cola se manda solo, CON la clave', r.bodies.some(b=>b==='save:la-clave-buena'), JSON.stringify(r.bodies));
  chk('la cola quedó vacía', r.pend===0, r.pend);
  chk('el cartel vuelve a verde', /Conectado al equipo/.test(r.cartel) && r.rech===false, r.cartel.replace(/<[^>]*>/g,'').slice(0,60));
  chk('…y dice que quedó conectado', /Conectado con la clave/.test(r.toasts), r.toasts.slice(-80));

  r = await page.evaluate(async () => {
    window._resp=function(b){ return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'abierto', pedidos:[]}; };
    await apiList();
    return document.getElementById('conn-admin-txt').innerHTML;
  });
  chk('⚠️ si el servidor dice que está ABIERTO (sin PANEL_KEY), administración lo ve en rojo', /SIN clave/.test(r) && /PANEL_KEY/.test(r), r.replace(/<[^>]*>/g,'').slice(0,100));

  // ══ 2. 🏷️ El sello del servidor se guarda ═══════════════════════════════════
  console.log('\n── 2. El sello de revisión ──');
  r = await page.evaluate(async () => {
    window._resp=function(b){ return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:Object.assign({}, b.pedido, {rev:3000, nroDia:7})}; };
    var p=findById('juan'); p.chofer='LUIS';
    persistPedido(p);
    await new Promise(r=>setTimeout(r,150));
    var e=findById('juan');
    return { rev:e.rev, nro:e.nroDia, espejo: (JSON.parse(localStorage.getItem(LS_KEY)).find(x=>x.id==='juan')||{}).rev };
  });
  chk('⚠️ el sello nuevo que devolvió el servidor queda en el pedido', r.rev===3000, r.rev);
  chk('…y el N° del día también', r.nro===7, r.nro);
  chk('…y en el espejo local', r.espejo===3000, r.espejo);

  // ══ 3. 🤝 Conflicto ════════════════════════════════════════════════════════
  console.log('\n── 3. Otra persona guardó antes ──');
  r = await page.evaluate(async () => {
    window._toasts=[]; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var actual=Object.assign({}, window._pl[0], {saldo:0, pagado:true, chofer:'', rev:4000});
    window._resp=function(b){ return {ok:false, error:'conflicto', version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:actual}; };
    var p=findById('juan'); p.chofer='MARIO';
    persistPedido(p);
    await new Promise(r=>setTimeout(r,200));
    var e=findById('juan');
    return { saldo:e.saldo, pagado:e.pagado, chofer:e.chofer, rev:e.rev, pend:getPending().length,
             toasts: window._toasts.join(' | ') };
  });
  chk('⚠️ lo que se ve pasa a ser la fila ACTUAL del servidor (el pago que hizo la otra persona)', r.saldo===0 && r.pagado===true, JSON.stringify({saldo:r.saldo,pagado:r.pagado}));
  chk('⚠️ el cambio propio (chofer MARIO) NO quedó como si hubiera entrado', r.chofer==='', r.chofer);
  chk('⚠️ y NO se reencoló (reintentarlo sería pisar el pago)', r.pend===0, r.pend);
  chk('el sello es el de la fila actual', r.rev===4000, r.rev);
  chk('avisa que lo modificó otra persona y que vuelva a hacer el cambio', /otra persona/.test(r.toasts) && /volv/.test(r.toasts), r.toasts.slice(0,140));

  r = await page.evaluate(async () => {
    // La cola: un pedido encolado que al reintentar recibe un «no» firme, sale de la cola.
    window._resp=function(b){
      if(b.action!=='save') return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedidos:JSON.parse(JSON.stringify(window._pl))};
      return {ok:false, error:'cupos_llenos', fecha:b.pedido.fecha, turno:'AM', version:SCRIPT_VERSION_ESPERADA, auth:'clave'};
    };
    NO_ENCOLAR={};
    setPending([Object.assign({}, window._pl[0], {id:'encolado'})]);
    await flushPending();
    return getPending().length;
  });
  chk('⚠️ un «no» firme al reintentar la cola la vacía (antes quedaba de zombi)', r===0, r);

  // ══ 4. ✏️ El sello que se manda al editar es el de la APERTURA ═════════════
  console.log('\n── 4. Editar con la pantalla refrescada en el medio ──');
  r = await page.evaluate(async () => {
    window._bodies=[]; window._toasts=[];
    STATE=JSON.parse(JSON.stringify(window._pl)); STATE[0].rev=1000; saveMirror();
    apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); };
    window._resp=function(b){ return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:Object.assign({}, b.pedido, {rev:5000})}; };
    editPedido('juan');
    var revAbierto=EDIT_REV;
    // Mientras el formulario está abierto, la pantalla se refresca y trae un sello nuevo.
    findById('juan').rev=1500;
    document.getElementById('f-obs').value='corrigiendo una observación';
    submitPedido();
    await new Promise(r=>setTimeout(r,400));
    var save=window._bodies.filter(b=>b.action==='save')[0];
    return { revAbierto:revAbierto, mandado: save && save.pedido && save.pedido.rev, forzar: save && save.forzar };
  });
  chk('al abrir la edición se guarda el sello de ese momento', r.revAbierto===1000, r.revAbierto);
  chk('⚠️ al guardar se manda ESE sello, no el que trajo el refresco', r.mandado===1000, r.mandado);
  chk('una edición sin mover fecha ni turno no manda «forzar»', !r.forzar, r.forzar);

  r = await page.evaluate(async () => {
    // Y si el servidor contesta conflicto en el FORMULARIO, se vuelve a abrir con lo nuevo.
    window._bodies=[]; window._toasts=[];
    STATE=JSON.parse(JSON.stringify(window._pl)); STATE[0].rev=1000; STATE[0].observaciones=''; saveMirror();
    var actual=Object.assign({}, window._pl[0], {saldo:0, pagado:true, rev:6000, observaciones:'la puso otra persona'});
    window._resp=function(b){ return {ok:false, error:'conflicto', version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:actual}; };
    editPedido('juan');
    document.getElementById('f-obs').value='mi cambio';
    submitPedido();
    await new Promise(r=>setTimeout(r,500));
    return { editando: EDIT_ID, obsForm: document.getElementById('f-obs').value, rev: EDIT_REV, saldo: findById('juan').saldo };
  });
  chk('⚠️ el formulario se vuelve a abrir sobre el MISMO pedido', r.editando==='juan', r.editando);
  chk('…con los datos de la otra persona, no con los míos', r.obsForm==='la puso otra persona', r.obsForm);
  chk('…y con el sello nuevo, para que el próximo guardado entre', r.rev===6000, r.rev);

  // ══ 5. 🔢 La OC que corrigió el servidor ═══════════════════════════════════
  console.log('\n── 5. OC corregida por el servidor ──');
  r = await page.evaluate(async () => {
    window._toasts=[];
    window._resp=function(b){ return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave',
      pedido:Object.assign({}, b.pedido, {oc:'09-046', ocCambiada:{de:'09-045', a:'09-046', con:'PEPITO'}, rev:7000})}; };
    var p=findById('juan'); p.oc='09-045';
    persistPedido(p);
    await new Promise(r=>setTimeout(r,150));
    return { oc: findById('juan').oc, toasts: window._toasts.join(' | ') };
  });
  chk('⚠️ la OC del pedido pasa a ser la que asignó el servidor', r.oc==='09-046', r.oc);
  chk('…y avisa cuál era, de quién y cuál quedó', /09-045/.test(r.toasts) && /PEPITO/.test(r.toasts) && /09-046/.test(r.toasts), r.toasts.slice(0,140));

  // ══ 6. 📅 Reprogramar confirmando avisos manda «forzar» ════════════════════
  console.log('\n── 6. Reprogramar ──');
  r = await page.evaluate(async () => {
    window._bodies=[];
    window._resp=function(b){ return {ok:true, version:SCRIPT_VERSION_ESPERADA, auth:'clave', pedido:b.pedido}; };
    var p=findById('juan');
    var d=new Date(); d.setDate(d.getDate()+1); while(d.getDay()!==0) d.setDate(d.getDate()+1);   // el próximo domingo: avisa
    REPRO={ id:'juan', kind:'admin', fecha:isoLocal(d), turno:'AM' };
    reproConfirmar();                                   // el confirm() se acepta solo
    await new Promise(r=>setTimeout(r,150));
    var s=window._bodies.filter(b=>b.action==='save')[0];
    return { forzar: s && s.forzar, fecha: s && s.pedido.fecha, esperada: isoLocal(d) };
  });
  chk('reprogramar a domingo, confirmando el aviso, manda «forzar» al servidor', r.forzar===true, JSON.stringify(r));
  chk('…con la fecha nueva', r.fecha===r.esperada);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
