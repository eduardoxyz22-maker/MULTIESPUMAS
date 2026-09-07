/* 🎯 REVISAR LOS PEDIDOS CONTRA EL STOCK — que el panel tilde solo (§4cq).

   El dueño, con el almacén ya cargado: *"como que el agente no revisa los pedidos creo, y
   selecciona o tickea lo que hay, y lo que falta por pedir. Y regulariza. Que se tiene que
   traer de IM."*

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. EL REPARTO ES POR FECHA DE ENTREGA (FIFO). Es lo único explicable cuando dos clientes
      quieren el mismo colchón. Si se repartiera por el orden de la planilla, el pedido del
      viernes se llevaría el stock del pedido de mañana.
   2. Que una línea que NO se puede cubrir entera NO reserve nada: reservar 1 de 3 deja el
      colchón trabado sin servirle a nadie.
   3. Que del depósito salga primero y de IM después — y que la lista de IM diga las
      unidades que hay que TRAER, no las del pedido entero (mandar a buscar de más es
      mandar a alguien a cargar algo que ya estaba acá).
   4. Que NO toque lo que no le corresponde: líneas 🏭 pedidas a fábrica para ese cliente,
      pedidos entregados, borradores de Kommo, y productos sin contar.
   5. Que no pise a una persona sin decirlo: si alguien marcó a mano y el stock dice otra
      cosa, se resalta y se puede dejar sin tocar.
   6. Que lo que falta PEDIR descuente lo que quedó suelto: pedir de más también cuesta.

   Se corre:  node tests/test_revstock.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1050} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['stockAsignar','abrirStockRevisar','aplicarStockRevisar','copiarTraerIM','revStkPedidos']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel revisa los pedidos contra el stock (§4cq)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* Escenario. En el depósito hay 4 ECO FLEX y 1 TITANIO; en IM hay 19 TITANIO y 0 ECO.
     Los pedidos se cargan A PROPÓSITO EN DESORDEN: el de la fecha más lejana primero.
     ⚠️ El pedido «Entregado» usa OTRO producto a propósito. Con el mismo, sus unidades se
     descuentan del depósito (bien: se entregaron) y el escenario se queda sin stock — me
     pasó al escribir este test y parecía un bug del reparto. */
  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._g=[];
    apiSave=function(r){ window._g.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ok:true,pedido:r}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var adel=function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    window._adel=adel; window._atras=atras;
    var P=function(o){ return Object.assign({id:'x'+Math.random(),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'N',direccion:'x',maps:'',pagado:true,saldo:0,ts:Date.now(),
      metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,
      facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    var eco=function(n,x){ return [Object.assign({desc:'NUEVO ECO FLEX',medida:'140x190',codigo:'CH1332',cant:n},x||{})]; };
    var tit=function(n,x){ return [Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n},x||{})]; };
    STATE=[
      P({id:'d5', cliente:'Viernes',  fecha:adel(5), productos:eco(1)}),
      P({id:'d1', cliente:'Mañana',   fecha:adel(1), productos:eco(3)}),
      P({id:'d3', cliente:'Miércoles',fecha:adel(3), productos:eco(2)}),
      P({id:'im', cliente:'Con IM',   fecha:adel(1), productos:tit(4)}),
      P({id:'fab',cliente:'A fábrica',fecha:adel(1), productos:eco(9,{chk:'no',enProd:true,prodEn:'Moreno',prodF:atras(1)})}),
      P({id:'ent',cliente:'Entregado',fecha:adel(1), entregado:true,
         productos:[{desc:'OTRO COLCHON QUE NO ESTA EN JUEGO',medida:'',codigo:'',cant:50}]}),
      P({id:'kommo-9',cliente:'Borrador',fecha:'', turno:'', estado:'Borrador Kommo', productos:eco(50)}),
      P({id:'sin',cliente:'Sin contar',fecha:adel(6), productos:[{desc:'PRODUCTO QUE NADIE CONTO',medida:'',codigo:'',cant:2}]})
    ];
    STOCK={ c:{f:todayStr(), u:{}}, e:[], p:[], a:{},
            g:{'IM - PRODUCTOTERMINADO':{f:todayStr(), u:{}}}, al:{'IM - PRODUCTOTERMINADO':'otro'} };
    STOCK.c.u[stockClave({codigo:'CH1332'})]=4;
    STOCK.c.u[stockClave({codigo:'CH1201'})]=1;
    STOCK.g['IM - PRODUCTOTERMINADO'].u[stockClave({codigo:'CH1201'})]=19;
    saveMirror(); updateStats();
    REVSTK_DIAS='todos'; REVSTK_SOLO_VACIOS=false;
  });
  await armar();
  const plan = () => page.evaluate(() => {
    var R=stockAsignar(); window.REVSTK=R;
    var por={};
    R.pedidos.forEach(function(g){ por[g.p.id]=g.lineas.map(function(l){
      return {ahora:l.ahora, antes:l.antes, dep:l.deDep, im:l.deIM, falta:l.falta, contra:!!l.contra, sinContar:!!l.sinContar}; }); });
    return { por:por, tot:R.tot, traerIM:R.traerIM.map(function(o){ return {nom:o.nom,u:o.u}; }),
             faltan:R.faltan.map(function(o){ return {nom:o.nom,u:o.u,suelto:o.suelto}; }),
             orden:R.pedidos.map(function(g){ return g.p.id; }) };
  });

  // ══ 1. El reparto va por FECHA DE ENTREGA ═════════════════════════════════
  console.log('\n── 1. El que entrega antes se lleva el stock ──');
  let r = await plan();
  chk('⚠️ los pedidos se recorren por fecha de entrega, no por el orden de la planilla',
      JSON.stringify(r.orden.slice(0,4))===JSON.stringify(['d1','im','d3','d5']), JSON.stringify(r.orden));
  chk('⚠️ el de MAÑANA (×3) se lleva 3 de los 4 → ✔ hay', r.por.d1[0].ahora==='ok' && r.por.d1[0].dep===3, JSON.stringify(r.por.d1[0]));
  chk('⚠️ el del MIÉRCOLES (×2) ya no entra en el 1 que queda → ✗ no hay',
      r.por.d3[0].ahora==='no' && r.por.d3[0].falta===1, JSON.stringify(r.por.d3[0]));
  chk('⚠️ …y NO reserva ese 1: el del VIERNES (×1) sí se lo puede llevar → ✔ hay',
      r.por.d5[0].ahora==='ok' && r.por.d5[0].dep===1, JSON.stringify(r.por.d5[0]));

  // ══ 2. Primero el depósito, después IM ════════════════════════════════════
  console.log('\n── 2. Del depósito primero, de IM después ──');
  chk('⚠️ un pedido de 4 con 1 en depósito y 19 en IM: 1 de acá + 3 de IM → 📥 recoger de IM',
      r.por.im[0].ahora==='im' && r.por.im[0].dep===1 && r.por.im[0].im===3, JSON.stringify(r.por.im[0]));
  chk('⚠️ la lista para ir a IM dice 3 (lo que hay que traer), no 4 (lo del pedido)',
      r.traerIM.length===1 && r.traerIM[0].u===3, JSON.stringify(r.traerIM));
  const listaIM = await page.evaluate(() => { var t=''; var o=window.copyText; window.copyText=function(x){t=x;}; copiarTraerIM(); window.copyText=o; return t; });
  /* §4cr: el mensaje pasó a llamarse «TRAER DE MORENO» — el equipo dice «Moreno», no «IM». */
  chk('…y el mensaje dice para qué pedido es', /TRAER DE MORENO/.test(listaIM) && /Con IM/.test(listaIM) && /× 3/.test(listaIM),
      (listaIM.match(/•[^\n]*/)||[''])[0]);

  // ══ 3. Lo que no le corresponde tocar ═════════════════════════════════════
  console.log('\n── 3. Lo que no se toca ──');
  chk('⚠️ la línea 🏭 pedida a fábrica para ese cliente no entra en el reparto',
      !r.por.fab && r.tot.aFab===1, 'aFab='+r.tot.aFab);
  chk('⚠️ un pedido ya entregado no entra', !r.por.ent);
  chk('⚠️ un borrador de Kommo tampoco', !r.por['kommo-9']);
  chk('⚠️ un producto que nadie contó queda SIN TILDE: no se inventa',
      r.por.sin[0].sinContar===true && r.por.sin[0].ahora==='' && r.tot.sinContar===1, JSON.stringify(r.por.sin[0]));

  // ══ 4. Lo que hay que pedir descuenta lo suelto ═══════════════════════════
  console.log('\n── 4. Cuánto hay que pedir de verdad ──');
  chk('⚠️ falta pedir 2 ECO FLEX: los del miércoles, que no entraron y no dejaron nada suelto',
      r.faltan.length===1 && r.faltan[0].u===2 && r.faltan[0].suelto===0, JSON.stringify(r.faltan));
  r = await page.evaluate(() => {
    /* Un solo pedido de 5 con 4 en depósito: no se puede cubrir, pero los 4 están. Hay que
       pedir 1, no 5. */
    STATE=STATE.filter(function(p){ return p.id==='d1'; });
    STATE[0].productos[0].cant=5;
    var R=stockAsignar();
    return { falta:R.faltan.map(function(o){ return {u:o.u, suelto:o.suelto}; }), marca:R.pedidos[0].lineas[0].ahora };
  });
  chk('⚠️ 5 pedidos con 4 en depósito: se pide 1, no 5', r.falta.length===1 && r.falta[0].u===1 && r.falta[0].suelto===4, JSON.stringify(r.falta));
  chk('…y la línea queda ✗ no hay (no se entrega media cama)', r.marca==='no', r.marca);

  // ══ 5. No pisa a una persona sin decirlo ══════════════════════════════════
  console.log('\n── 5. Lo marcado a mano ──');
  await armar();
  r = await page.evaluate(() => {
    findById('d3').productos[0].chk='ok';     // alguien marcó ✔ y el stock dice que no
    var R=stockAsignar(); window.REVSTK=R;
    var l=R.pedidos.filter(function(g){ return g.p.id==='d3'; })[0].lineas[0];
    REVSTK_SOLO_VACIOS=false; var todos=revStkCambios().length;
    REVSTK_SOLO_VACIOS=true;  var solo=revStkCambios();
    REVSTK_SOLO_VACIOS=false;
    return { contra:l.contra, antes:l.antes, ahora:l.ahora, nContra:R.tot.contra,
             todos:todos, solo:solo.length, tocaD3:solo.some(function(g){ return g.p.id==='d3'; }) };
  });
  chk('⚠️ se marca como contradicción: estaba ✔ a mano y el stock dice ✗',
      r.contra===true && r.antes==='ok' && r.ahora==='no' && r.nContra===1, JSON.stringify(r));
  chk('⚠️ con «tocar solo las que están sin marcar», esa línea NO se toca',
      r.solo===r.todos-1 && r.tocaD3===false, r.todos+' → '+r.solo);

  // ══ 6. Aplicar deja el pedido como si lo hubiera marcado una persona ══════
  console.log('\n── 6. Aplicar ──');
  await armar();
  r = await page.evaluate(() => {
    abrirStockRevisar();
    var txt=(document.getElementById('modal-box')||{}).textContent||'';
    /* §4cr: la ventana pasó a llamarse «🤖 Revisión automática», y el resultado se ve
       además fijo arriba de la tabla sin abrir nada. */
    return { abre:/Revisión automática/.test(txt), boton:/Aplicar: marcar/.test(txt),
             dice:/por fecha de entrega/.test(txt) };
  });
  chk('la pantalla se abre y explica la regla', r.abre && r.dice && r.boton);
  await page.evaluate(() => aplicarStockRevisar());
  await page.waitForTimeout(1200);
  r = await page.evaluate(() => {
    var g=function(id){ var p=findById(id); return p?{chk:(p.productos[0]||{}).chk, estado:p.estado, verif:p.verificado}:null; };
    return { d1:g('d1'), d3:g('d3'), d5:g('d5'), im:g('im'), fab:g('fab'), sin:g('sin'),
             guardados:window._g.map(function(x){ return x.id; }), modal:document.getElementById('modal').className };
  });
  chk('⚠️ el que tiene stock queda ✔ y el pedido pasa a «En stock» + verificado',
      r.d1.chk==='ok' && r.d1.estado==='En stock' && r.d1.verif===true, JSON.stringify(r.d1));
  chk('⚠️ el que no alcanza queda ✗ y el pedido pasa a «No hay» (se pinta rojo en la tabla)',
      r.d3.chk==='no' && r.d3.estado==='No hay', JSON.stringify(r.d3));
  chk('el que se trae de IM queda 📥 recoger de IM, sin dar el pedido por listo',
      r.im.chk==='im' && r.im.verif===false, JSON.stringify(r.im));
  chk('⚠️ la línea 🏭 a fábrica quedó intacta', r.fab.chk==='no' && r.fab.estado!=='En stock', JSON.stringify(r.fab));
  chk('⚠️ el producto sin contar quedó sin tilde', !r.sin.chk, JSON.stringify(r.sin));
  chk('se guardaron los pedidos que cambiaron, y solo esos',
      r.guardados.indexOf('d1')>=0 && r.guardados.indexOf('ent')<0 && r.guardados.indexOf('sin')<0, JSON.stringify(r.guardados));
  chk('y la ventana se cierra sola al terminar', r.modal.indexOf('on')<0, r.modal);
  r = await page.evaluate(() => { var R=stockAsignar(); return R.tot.cambian; });
  chk('⚠️ volver a revisar no propone nada: ya está todo tildado', r===0, r+' cambios');

  // ══ 7. Los filtros por día ════════════════════════════════════════════════
  console.log('\n── 7. Por día ──');
  await armar();
  r = await page.evaluate(() => {
    var n=function(v){ REVSTK_DIAS=v; return revStkPedidos().map(function(p){ return p.id; }); };
    var res={ manana:n('manana'), semana:n('semana'), todos:n('todos') };
    REVSTK_DIAS='todos'; return res;
  });
  chk('«Mañana» trae solo los de mañana', r.manana.indexOf('d1')>=0 && r.manana.indexOf('d3')<0, JSON.stringify(r.manana));
  chk('«Esta semana» trae hasta 7 días', r.semana.indexOf('d5')>=0 && r.semana.length>=r.manana.length, JSON.stringify(r.semana));
  chk('«Todos» trae todo lo pendiente', r.todos.length>=r.semana.length, JSON.stringify(r.todos));
  r = await page.evaluate(() => {
    /* Un pedido con la fecha ya pasada que quedó tildado ✗ no hay es una venta VIVA
       esperando stock (§4co): entra igual, y primero. */
    STATE.push(Object.assign({}, findById('d1'), {id:'viejo', cliente:'Viejo sin stock', fecha:window._atras(4),
      productos:[{desc:'NUEVO ECO FLEX',medida:'140x190',codigo:'CH1332',cant:1,chk:'no'}]}));
    saveMirror();
    var ids=revStkPedidos().map(function(p){ return p.id; });
    return { primero:ids[0], entra:ids.indexOf('viejo')>=0 };
  });
  chk('⚠️ un ✗ no hay de días pasados sigue esperando stock: entra, y primero',
      r.entra===true && r.primero==='viejo', r.primero);

  // ══ 8. Lo que NO se le pide a la fábrica (§4cx) ═══════════════════════════
  /* Dos cosas que el dueño encontró en la primera lista de «hay que fabricar» y que no
     tenían que estar ahí:
     · *"estás mezclando las ATC diciéndole que deben pedir a fábrica cuando eso son
        reparaciones o entregas. Las ATC no deberían entrar COMO PRODUCTOS A MANDAR A
        FABRICAR."*
     · *"los pedidos a fábrica son solo colchón, somier, almohadas o cabeceras:
        protectores, sábanas, manta, MDF, juego sábana no son para pedir a fábrica, eso se
        entregan en tienda. No tomar en cuenta."*
     ⚠️ Y la contracara, que es lo fácil de romper: una CABECERA de MDF **sí** se fabrica.
     Si la palabra MDF sola alcanzara para sacar la línea, se dejarían de pedir cabeceras. */
  console.log('\n── 8. Ni las ATC ni lo que se entrega en tienda ──');
  await armar();
  r = await page.evaluate(() => {
    var P=function(o){ return Object.assign({}, findById('d1'), o); };
    STATE.push(P({id:'atc9', cliente:'Reclamo', oc:'ATC 09-014', fecha:window._adel(1),
      productos:[{desc:'NUEVO ECO FLEX',medida:'140x190',codigo:'CH1332',cant:2}]}));
    STATE.push(P({id:'acc', cliente:'Con accesorios', oc:'188999', fecha:window._adel(1), productos:[
      {desc:'PROTECTOR DE COLCHON',medida:'140x190',codigo:'',cant:2},
      {desc:'JUEGO DE SABANAS 2 PLAZAS',medida:'',codigo:'',cant:1},
      {desc:'MANTA POLAR',medida:'',codigo:'',cant:1},
      {desc:'CABECERA MDF 2 PLAZAS',medida:'140x190',codigo:'',cant:1}]}));
    saveMirror();
    var R=stockAsignar(), por={};
    R.pedidos.forEach(function(g){ por[g.p.id]=g.lineas.map(function(l){ return l.nom; }); });
    return { tot:R.tot, por:por,
             faltan:R.faltan.map(function(o){ return {nom:o.nom, u:o.u}; }),
             enLista:stockData().lista.map(function(o){ return o.desc; }) };
  });
  const eco = r.faltan.filter(o => /ECO FLEX/i.test(o.nom))[0];
  chk('⚠️ una ATC no entra en el reparto: es un reclamo, no una venta',
      !r.por.atc9, JSON.stringify(r.por.atc9||null));
  chk('⚠️ …y sus 2 colchones NO se suman a lo que hay que fabricar: siguen siendo 2, no 4',
      !!eco && eco.u===2, JSON.stringify(r.faltan));
  chk('⚠️ pero se dice cuántas son, para que no parezca que el panel las perdió',
      r.tot.atc===1, 'atc='+r.tot.atc);
  chk('⚠️ protector, sábanas y manta salen del reparto: se entregan en tienda',
      r.tot.tienda===3 && (r.por.acc||[]).length===1, 'tienda='+r.tot.tienda+' '+JSON.stringify(r.por.acc||null));
  chk('⚠️ y NO figuran entre lo que hay que fabricar',
      !r.faltan.some(o => /PROTECTOR|SABANA|MANTA/i.test(o.nom)), JSON.stringify(r.faltan));
  chk('⚠️ tampoco entran a la tabla de stock: no se les mide rotación',
      !r.enLista.some(n => /PROTECTOR|SABANA|MANTA/i.test(n)),
      r.enLista.filter(n => /PROTECTOR|SABANA|MANTA/i.test(n)).join(', '));
  chk('⚠️ pero una CABECERA DE MDF sí se fabrica: la palabra MDF sola no la saca',
      (r.por.acc||[]).length===1 && /CABECERA/i.test(r.por.acc[0]), JSON.stringify(r.por.acc||null));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
