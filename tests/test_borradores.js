/* 📥 LOS BORRADORES DE KOMMO — que lleguen, que no se mezclen, y que NO sean pedidos.

   Pedido del dueño: *"ok ejecuta y muestrame como quedaria"*, después de preguntar
   *"y como sabra cada vendedor cual es su borrador? se mezclaran y apareceran de todos"*.

   ⚠️ LO QUE ESTE TEST CUIDA POR ENCIMA DE TODO: que un borrador NO sea un pedido.
   Una venta que vino de Kommo y todavía no tiene fecha de entrega no puede ocupar lugar
   en el camión, ni aparecerle al chofer, ni entrar al cuadre, ni al mapa, ni a las
   estadísticas. Si se colara, el panel mostraría cupos llenos que no existen y un chofer
   saldría a repartir a una dirección vacía.

   La defensa no es un `if` en cada pantalla —esa cuenta se paga una vez y se olvida— sino
   sacarlos de STATE en `leerCierresDeLista`, el único embudo por el que pasa toda lista que
   llega. Por eso el test mide STATE, no lo que se ve: si STATE está limpio, todo lo demás
   lo está por construcción.

   Y lo segundo: que cada vendedora vea SOLO los suyos.

   Se corre:  node tests/test_borradores.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

const HOY = new Date();
const dd  = (n) => { const d=new Date(HOY); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const DIA = 86400000;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* La planilla simulada: 2 pedidos de verdad + 4 borradores de Kommo.
     Los borradores llegan por el MISMO camino que todo lo demás (apiList), que es
     justamente lo que hay que probar: que el filtro esté en el embudo y no en la vista. */
  const sembrar = () => page.evaluate(async ({dManana, ayer, viejo}) => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();

    const pedido = (o) => Object.assign({
      id:'p'+Math.random(), fecha:dManana, oc:'', vendedor:'Mirian Salazar', cliente:'CLIENTE',
      productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:1000}],
      celular:'70000000', turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:true,
      saldo:0, ts:Date.now(), metodoPago:'Efectivo', observaciones:'', estado:'',
      entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1', acuenta:0,
      facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[]
    }, o);

    /* Un borrador: mismo molde, SIN fecha, con la marca en `estado` y el id del lead. */
    const borrador = (o) => pedido(Object.assign({
      fecha:'', turno:'', zona:'', direccion:'', nota:'', nroDia:0,
      estado:'Borrador Kommo', pagado:false
    }, o));

    window._pl = [
      pedido({ id:'real-1', cliente:'PEDIDO REAL UNO', vendedor:'Mirian Salazar' }),
      pedido({ id:'real-2', cliente:'PEDIDO REAL DOS', vendedor:'Carola Chavez' }),

      borrador({ id:'kommo-44001', cliente:'LEAD DE MIRIAN', vendedor:'Mirian Salazar',
                 celular:'70863187', saldo:3400, ts:Date.now(),
                 productos:[{desc:'TITANIO ICE',medida:'140x190',codigo:'TI140',cant:1,precio:3400}] }),
      borrador({ id:'kommo-44002', cliente:'LEAD SIN PRODUCTOS', vendedor:'Mirian Salazar',
                 celular:'70111222', saldo:1800, ts:ayer, productos:[] }),
      // Kommo la manda con la sucursal pegada: «Maria Flores - Buenos Aires»
      borrador({ id:'kommo-44003', cliente:'LEAD DE MARIA', vendedor:'Maria Flores - Buenos Aires',
                 celular:'70333444', saldo:2200, ts:Date.now(),
                 productos:[{desc:'SOFT ICE',medida:'160x190',codigo:'SI160',cant:2,precio:1100}] }),
      // Sin dueña: el responsable en Kommo es la cuenta genérica. Y viejo: 5 días.
      borrador({ id:'kommo-44004', cliente:'LEAD HUERFANO', vendedor:'Colchones Heaven - Principal',
                 celular:'70555666', saldo:900, ts:viejo, productos:[] })
    ];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiDelete=function(id){ window._pl=window._pl.filter(function(x){return x.id!==id;}); return Promise.resolve({ok:true}); };

    STATE = mergePending(JSON.parse(JSON.stringify(window._pl)));
    saveMirror(); updateStats();
  }, {dManana: dd(1), ayer: Date.now()-DIA, viejo: Date.now()-5*DIA});

  await sembrar();

  // ══ 1. LA INVARIANTE: un borrador NO es un pedido ═══════════════════════════
  console.log('\n── 1. Un borrador no es un pedido ──');
  const r1 = await page.evaluate(() => ({
    state: STATE.length,
    ids: STATE.map(p=>p.id),
    borr: BORRADORES.length,
    borrIds: BORRADORES.map(p=>p.id),
    conFecha: STATE.filter(p=>!p.fecha).length,
    marcados: STATE.filter(p=>typeof esBorrador==='function' && esBorrador(p)).length
  }));
  chk('los 4 borradores NO entran a la lista de pedidos', r1.state===2, 'STATE='+r1.state+' '+JSON.stringify(r1.ids));
  chk('…y quedan aparte, en su propia bandeja', r1.borr===4, 'BORRADORES='+r1.borr);
  chk('…con el id del lead de Kommo', r1.borrIds.every(i=>String(i).indexOf('kommo-')===0), JSON.stringify(r1.borrIds));
  chk('⚠️ ni uno solo se coló como pedido', r1.marcados===0, r1.marcados+' colados');

  // ══ 2. No ocupan cupo, ni camión, ni cuadre, ni mapa ════════════════════════
  console.log('\n── 2. No ocupan lugar en ningún lado ──');
  const r2 = await page.evaluate((man) => {
    const cupo = (typeof cuposUsados==='function') ? cuposUsados(man) : (typeof cuposUsadosTurno==='function' ? cuposUsadosTurno(man,'AM')+cuposUsadosTurno(man,'PM') : -1);
    const st = (typeof stats==='function') ? null : null;
    return {
      cupoManana: cupo,
      // el mapa y el cuadre leen STATE: si STATE está limpio, ellos también
      enMapa: STATE.filter(p=>p.maps).length,
      totalStats: STATE.length,
      sinFecha: STATE.filter(p=>!p.fecha).length
    };
  }, dd(1));
  chk('no ocupan cupo del camión (2 pedidos reales, no 6)', r2.cupoManana===2, 'cupo='+r2.cupoManana);
  chk('no quedan pedidos sin fecha en la lista real', r2.sinFecha===0, r2.sinFecha);

  // ══ 3. Cada vendedora ve SOLO los suyos ════════════════════════════════════
  console.log('\n── 3. Cada vendedora ve solo los suyos ──');
  const verComo = (v) => page.evaluate((v) => {
    showView('mis');
    document.getElementById('mis-vendedor').value=v;
    MIS_TODOS=false; renderMis();
    const box=document.getElementById('mis-borradores');
    return { html: box ? box.innerHTML : 'NO EXISTE #mis-borradores',
             txt:  box ? box.textContent : '' };
  }, v);

  const mirian = await verComo('Mirian Salazar');
  chk('Mirian ve sus 2 borradores', /2 ventas vinieron de Kommo/.test(mirian.txt), mirian.txt.slice(0,90));
  chk('…ve el nombre de sus clientes', mirian.txt.includes('LEAD DE MIRIAN') && mirian.txt.includes('LEAD SIN PRODUCTOS'));
  chk('⚠️ NO ve el de Maria', !mirian.txt.includes('LEAD DE MARIA'));
  chk('⚠️ NO ve el huérfano', !mirian.txt.includes('LEAD HUERFANO'));

  const maria = await verComo('Maria Flores');
  chk('Maria ve el suyo aunque Kommo le pegue la sucursal al nombre',
      maria.txt.includes('LEAD DE MARIA'), maria.txt.slice(0,90));
  chk('…y ve solo 1', /1 venta vino de Kommo/.test(maria.txt), maria.txt.slice(0,70));
  chk('⚠️ NO ve los de Mirian', !maria.txt.includes('LEAD DE MIRIAN'));

  const carola = await verComo('Carola Chavez');
  chk('Carola no tiene borradores: no le aparece la bandeja', carola.html.trim()==='', carola.html.slice(0,60));

  // ══ 4. Lo que la tarjeta le dice a la vendedora ════════════════════════════
  console.log('\n── 4. Qué dice la tarjeta ──');
  const r4 = await page.evaluate(() => {
    showView('mis');
    document.getElementById('mis-vendedor').value='Mirian Salazar';
    MIS_TODOS=false; renderMis();
    return document.getElementById('mis-borradores').innerHTML;
  });
  chk('muestra el producto que vino de Kommo con su cantidad', /TITANIO ICE.*×\s*1/s.test(r4));
  chk('⚠️ avisa cuando Kommo NO trajo productos', /Sin productos en Kommo/.test(r4));
  chk('muestra el celular', r4.includes('70863187'));
  chk('muestra el monto de la venta', /3\.?400/.test(r4));
  chk('deja claro que todavía no ocupa camión', /no ocupan lugar en ningún camión/i.test(r4));
  chk('tiene el botón de completar', /Completar la entrega/.test(r4));
  chk('tiene el botón de descartar', /Descartar/.test(r4));

  // ══ 5. Los sin dueña van a Administración ══════════════════════════════════
  console.log('\n── 5. El que quedó sin vendedora ──');
  const r5 = await page.evaluate(() => {
    showView('admin'); renderAdmin();
    const b=document.getElementById('adm-borradores');
    return { txt: b ? b.textContent : 'NO EXISTE #adm-borradores', html: b?b.innerHTML:'' };
  });
  chk('el huérfano aparece en Administración', r5.txt.includes('LEAD HUERFANO'), r5.txt.slice(0,110));
  chk('…y explica por qué no le aparece a nadie', /no es ninguna de las vendedoras/.test(r5.txt));
  chk('⚠️ los que SÍ tienen dueña no se repiten acá',
      !r5.txt.includes('LEAD DE MIRIAN') && !r5.txt.includes('LEAD DE MARIA'));
  chk('marca en rojo el que lleva 5 días esperando', /esperando hace 5 días/.test(r5.txt), r5.txt.slice(0,140));

  // ══ 6. Completar: el formulario llega con lo de Kommo puesto ═══════════════
  console.log('\n── 6. Completar la entrega ──');
  const r6 = await page.evaluate(() => {
    completarBorrador('kommo-44001');
    const g=(id)=>{ const e=document.getElementById(id); return e?e.value:('NO EXISTE #'+id); };
    return { vista: document.getElementById('view-form').classList.contains('active'),
             cliente:g('f-cliente'), celular:g('f-celular'), vendedor:g('f-vendedor'),
             fecha:g('f-fecha'), saldo:g('f-saldo'), editId:EDIT_ID,
             prods:[].slice.call(document.querySelectorAll('#f-productos .prod-desc')).map(e=>e.value) };
  });
  chk('abre el formulario', r6.vista===true);
  chk('el cliente ya viene puesto', r6.cliente==='LEAD DE MIRIAN', r6.cliente);
  chk('el celular ya viene puesto', r6.celular==='70863187', r6.celular);
  chk('la vendedora ya viene puesta', r6.vendedor==='Mirian Salazar', r6.vendedor);
  chk('el producto ya viene puesto', r6.prods[0]==='TITANIO ICE', JSON.stringify(r6.prods));
  chk('el monto entra como saldo por cobrar', Number(r6.saldo)===3400, r6.saldo);
  chk('⚠️ la fecha de entrega queda VACÍA: es lo que hay que completar', r6.fecha==='', r6.fecha);
  chk('conserva el id del lead, para no duplicar', r6.editId==='kommo-44001', r6.editId);

  // ══ 7. Al guardarlo deja de ser borrador y pasa a ser pedido ══════════════
  console.log('\n── 7. Al guardar, ya es un pedido ──');
  await page.evaluate((man) => {
    document.getElementById('f-fecha').value=man;
    document.getElementById('f-nota').value='9001';
    document.getElementById('f-zona').value='Norte';
    segSet('f-turno','PM');
    submitPedido();
  }, dd(2));
  await page.waitForTimeout(700);

  const r7 = await page.evaluate(() => {
    const g = window._pl.filter(x=>x.id==='kommo-44001')[0]||{};
    return { enPlanilla: !!g.id, estado:g.estado, fecha:g.fecha, nroDia:g.nroDia, ts:g.ts,
             cuantos: window._pl.filter(x=>x.id==='kommo-44001').length,
             enBorradores: BORRADORES.filter(p=>p.id==='kommo-44001').length,
             enState: STATE.filter(p=>p.id==='kommo-44001').length };
  });
  chk('se guardó con el MISMO id (no se duplicó la venta)', r7.cuantos===1, 'copias='+r7.cuantos);
  chk('⚠️ dejó de estar marcado como borrador', !r7.estado || r7.estado.toLowerCase().indexOf('borrador')<0, 'estado="'+r7.estado+'"');
  chk('ahora tiene fecha de entrega', r7.fecha===dd(2), r7.fecha);
  chk('⚠️ recibió su número del día (no quedó en 0)', Number(r7.nroDia)>0, 'nroDia='+r7.nroDia);
  chk('⚠️ recibió su hora (no quedó en 0)', Number(r7.ts)>0, 'ts='+r7.ts);
  chk('salió de la bandeja de borradores', r7.enBorradores===0);

  const r7b = await page.evaluate(async () => {
    STATE = mergePending(JSON.parse(JSON.stringify(window._pl)));
    saveMirror(); updateStats();
    return { state: STATE.filter(p=>p.id==='kommo-44001').length, borr: BORRADORES.length };
  });
  chk('al volver a bajar la planilla, ya viene como pedido de verdad', r7b.state===1);
  chk('…y quedan 3 borradores', r7b.borr===3, 'borradores='+r7b.borr);

  // ══ 8. Descartar ══════════════════════════════════════════════════════════
  console.log('\n── 8. Descartar ──');
  const r8 = await page.evaluate(async () => {
    descartarBorrador('kommo-44002');
    await new Promise(r=>setTimeout(r,200));
    return { borr: BORRADORES.length, enPlanilla: window._pl.filter(x=>x.id==='kommo-44002').length };
  });
  chk('el borrador descartado desaparece', r8.borr===2, 'quedan '+r8.borr);
  chk('…y también de la planilla', r8.enPlanilla===0);

  // ══ 9. El espejo local: sobreviven a recargar sin internet ════════════════
  console.log('\n── 9. Sin internet ──');
  const r9 = await page.evaluate(() => {
    const guardado = localStorage.getItem('ME_BORRADORES_V1');
    BORRADORES=[]; loadBorrMirror();
    return { guardado: !!guardado, recuperados: BORRADORES.length };
  });
  chk('los borradores quedan guardados en el celular', r9.guardado===true);
  chk('…y vuelven al recargar sin internet', r9.recuperados===2, 'recuperados='+r9.recuperados);

  // ══ 9b. ⚠️ PRIMERO EL PANEL, DESPUÉS KOMMO ════════════════════════════════
  /* Pregunta del dueño: *"¿y si primero llenan el panel y luego el Kommo? ¿les aparecerá
     el borrador de algo que ya tenían creado?"*. Es el orden que van a usar la mitad de
     las veces. Sin esto, la misma venta quedaba cargada dos veces. */
  console.log('\n── 9b. Si la vendedora ya la había cargado a mano ──');
  const r9b = await page.evaluate(async ({man, viejo}) => {
    const ped = (o) => Object.assign({
      id:'p'+Math.random(), fecha:man, oc:'', vendedor:'Mirian Salazar', cliente:'C',
      productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:1000}],
      celular:'70000000', turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:true,
      saldo:0, ts:Date.now(), metodoPago:'Efectivo', observaciones:'', estado:'',
      entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1', acuenta:0,
      facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[]
    }, o);
    const bor = (o) => ped(Object.assign({ fecha:'', turno:'', zona:'', direccion:'',
      nota:'', nroDia:0, estado:'Borrador Kommo', pagado:false }, o));

    window._pl=[
      // Lo que la vendedora cargó A MANO, hace un rato. Kommo lo manda con +591.
      ped({ id:'aMano', cliente:'ELENA VARGAS', celular:'70863187', nota:'700', saldo:3400, ts:Date.now() }),
      // El mismo cliente, pero una compra de hace meses: NO tiene que confundirse.
      ped({ id:'viejo', cliente:'ELENA VARGAS', celular:'70863187', nota:'120', ts:viejo }),
      // Un cliente distinto, para que no matchee con nada.
      ped({ id:'otro',  cliente:'PEDRO SUAREZ', celular:'71111111', nota:'701' }),

      bor({ id:'kommo-55001', cliente:'ELENA VARGAS', vendedor:'Mirian Salazar',
            celular:'+591 70863187', saldo:3400, ts:Date.now() }),
      bor({ id:'kommo-55002', cliente:'CLIENTE NUEVO', vendedor:'Mirian Salazar',
            celular:'79999999', saldo:1200, ts:Date.now() })
    ];
    STATE = mergePending(JSON.parse(JSON.stringify(window._pl)));
    saveMirror(); updateStats();
    showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar';
    MIS_TODOS=false; renderMis();
    const g1=gemeloDe(BORRADORES.filter(b=>b.id==='kommo-55001')[0]);
    const g2=gemeloDe(BORRADORES.filter(b=>b.id==='kommo-55002')[0]);
    return { html: document.getElementById('mis-borradores').innerHTML,
             gemelo1: g1?g1.id:null, gemelo2: g2?g2.id:null };
  }, {man: dd(1), viejo: Date.now()-200*DIA});

  chk('⚠️ reconoce la venta que YA estaba cargada a mano', r9b.gemelo1==='aMano', r9b.gemelo1);
  chk('…aunque Kommo mande el celular con el +591', /Esto parece que ya lo cargaste/.test(r9b.html));
  chk('…y le muestra cuál es (su nota)', /Nota 700/.test(r9b.html), r9b.html.slice(0,60));
  chk('…con el botón para dejar una sola', /Sí, es la misma/.test(r9b.html));
  chk('…y la salida por si de verdad es otra venta', /No, es otra venta/.test(r9b.html));
  chk('⚠️ NO confunde una compra del mismo cliente de hace 200 días',
      r9b.gemelo1!=='viejo', r9b.gemelo1);
  chk('⚠️ una venta que NO estaba cargada sigue ofreciendo completarla',
      r9b.gemelo2===null && /Completar la entrega/.test(r9b.html), r9b.gemelo2);

  const r9c = await page.evaluate(async () => {
    borrEsLaMisma('kommo-55001','aMano');
    await new Promise(r=>setTimeout(r,250));
    const p=STATE.filter(x=>x.id==='aMano')[0];
    return { borradores: BORRADORES.length,
             quedaElBorrador: BORRADORES.filter(b=>b.id==='kommo-55001').length,
             pedidos: STATE.filter(x=>x.cliente==='ELENA VARGAS' && x.fecha).length,
             marca: kleadDe(p), notaIntacta: p.nota, saldoIntacto: p.saldo };
  });
  chk('al decir «es la misma», el borrador se va', r9c.quedaElBorrador===0);
  chk('⚠️ y queda UNA sola venta, la que ella cargó',
      r9c.pedidos===2, 'de ELENA hay '+r9c.pedidos+' (la de hoy y la de hace 200 días)');
  chk('el pedido que ya tenía no se tocó', r9c.notaIntacta==='700' && Number(r9c.saldoIntacto)===3400, r9c.notaIntacta);
  chk('⚠️ queda marcado con el lead, para que el robot no lo vuelva a traer',
      r9c.marca==='55001', r9c.marca);
  chk('el otro borrador sigue esperando', r9c.borradores===1, r9c.borradores);

  // ══ 10. Los onclick están escapados ═══════════════════════════════════════
  console.log('\n── 10. Higiene ──');
  const r10 = await page.evaluate(() => {
    /* Mirian, no Maria: la sección 9b reemplazó los datos y Maria ya no tiene borradores.
       Con la bandeja vacía este check pasaba en falso (0 onclick y nada que revisar). */
    showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar';
    MIS_TODOS=false; renderMis();
    const h=document.getElementById('mis-borradores').innerHTML;
    return { onclicks: (h.match(/onclick="/g)||[]).length,
             comillasSueltas: /onclick="[^"]*"[^">]*"/.test(h) };
  });
  chk('los botones tienen sus onclick', r10.onclicks>=2, r10.onclicks);
  chk('…sin comillas sueltas que rompan el HTML', r10.comillasSueltas===false);
  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
