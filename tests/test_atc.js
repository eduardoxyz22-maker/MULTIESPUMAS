/* 🎧 LA MATRIZ DE ATC — qué entró, por qué, y cuándo volvió.
   Pedido del dueño: *"se genera la ATC que es para recoger el producto pero no hay el
   seguimiento de POR QUÉ se creó esa ATC, cuál es el inconveniente y desperfecto. Y cuándo
   producción ya devolvió el producto. Y QUÉ SE REALIZÓ."* → *"lo que queremos es una matriz
   de datos donde se vea qué ATC entraron y por qué motivo… y cuándo se devolvieron"*.

   Antes esto vivía suelto en Trello: 85 tarjetas, **0 con fecha**, y 54 amontonadas en
   «ATC DEVUELTAS LOG» sin decir qué se hizo.

   ⚠️ LO QUE ESTE TEST CUIDA POR ENCIMA DE TODO: que la vendedora, al corregir cualquier
   cosa de la ATC, NO borre la devolución que anotó logística. Los productos que salen del
   formulario son objetos NUEVOS, y el seguimiento viaja adentro de ellos — sin el rescate
   de `mergeAtcDatos`/`prev`, editar una dirección borraría el trabajo de logística y nadie
   se enteraría hasta que alguien preguntara "¿y este colchón dónde está?". */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Tolera que la versión vieja no tenga los elementos nuevos: así el test REPRUEBA con
     checks en rojo en vez de reventar, y quien lo corra ve QUÉ falta. */
  await page.evaluate(() => {
    window._el=function(id){
      return document.getElementById(id) || { style:{}, value:'', textContent:'NO EXISTE #'+id,
        className:'', classList:{contains:function(){return false;},add:function(){},remove:function(){}},
        querySelectorAll:function(){return [];}, addEventListener:function(){} };
    };
  });

  const base = () => page.evaluate(async () => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    /* La planilla simulada tiene que devolver lo guardado: showView vuelve a bajarla. */
    window._pl=[];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    STATE=[]; window._pl=[]; saveMirror();
  });

  /* Carga una ATC por el formulario, como la haría una vendedora de verdad. */
  const cargar = (o) => page.evaluate(async (o) => {
    showView('form'); resetForm();
    /* ⚠️ La fecha, al primer día entregable: sin esto el formulario queda en «mañana» y
       los sábados eso es domingo → «No se agenda los DOMINGOS» y 45 checks en rojo
       (pasó el 05/09/2026). Es la regla del LEEME sobre `tomorrowStr()` a secas. */
    var _d=new Date(), _f; do { _d.setDate(_d.getDate()+1); _f=isoLocal(_d); } while(diaDomingo(_f));
    document.getElementById('f-fecha').value=_f; segSet('f-turno','AM');
    segSet('f-doc-tipo', o.tipo||'ATC'); setDocTipo();
    if((o.tipo||'ATC')!=='ATC') document.getElementById('f-nota').value=o.nota||'1';
    document.getElementById('f-vendedor').value=o.vendedor||'Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=o.cliente||'CLIENTE';
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. 1';
    if(o.oc!=null) document.getElementById('f-oc').value=o.oc;
    var pr=document.querySelector('#f-productos .prod-desc'); pr.value=o.prod||'SEMI ORTOPEDICO';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value='140x190';
    var cn=document.querySelector('#f-productos .prod-cant'); if(cn) cn.value='1';
    if(o.motivo!=null)  _el('f-atc-motivo').value=o.motivo;
    if(o.detalle!=null) _el('f-atc-detalle').value=o.detalle;
    if(o.compra!=null)  _el('f-atc-compra').value=o.compra;
    if(o.comodin)       segSet('f-atc-comodin','SI');
    if(o.piezas)        o.piezas.forEach(function(k){ var e=document.getElementById('f-pz-'+k); if(e) e.checked=true; });
    if(o.rnota!=null)   _el('f-atc-rnota').value=o.rnota;
    submitPedido();
    await new Promise(r=>setTimeout(r,350));
    return { n:STATE.length, ultimo: STATE.length?STATE[STATE.length-1].id:null };
  }, o);

  const matriz = () => page.evaluate(async () => {
    showView('atc');
    await new Promise(r=>setTimeout(r,250));
    var tr=[].slice.call(document.querySelectorAll('#tbl-atc tbody tr'));
    return { filas:tr.length,
             txt:tr.map(function(t){return t.textContent.replace(/\s+/g,' ');}).join(' || '),
             fichas:_el('atc-metrics').textContent.replace(/\s+/g,' '),
             motivos:_el('atc-por-motivo').textContent.replace(/\s+/g,' '),
             vacio:_el('atc-empty').style.display!=='none' };
  });

  // ============ 1. el motivo solo aparece —y solo se exige— en las ATC ============
  await base();
  const vis = await page.evaluate(() => {
    showView('form'); resetForm();
    if(!document.getElementById('wrap-atc-motivo')) return { oc:'NO EXISTE', atc:'NO EXISTE', vuelta:'NO EXISTE' };
    var oc = _el('wrap-atc-motivo').style.display!=='none';
    segSet('f-doc-tipo','ATC'); if(typeof setDocTipo==='function') setDocTipo();
    var atc = _el('wrap-atc-motivo').style.display!=='none';
    segSet('f-doc-tipo','OC'); if(typeof setDocTipo==='function') setDocTipo();
    var vuelta = _el('wrap-atc-motivo').style.display!=='none';
    return { oc:oc, atc:atc, vuelta:vuelta };
  });
  chk('en una venta normal el motivo NO molesta', vis.oc===false, vis.oc);
  chk('al elegir 🎧 ATC aparece el motivo', vis.atc===true, vis.atc);
  chk('…y al volver a OC se esconde', vis.vuelta===false, vis.vuelta);

  // ============ 2. sin motivo NO se guarda ============
  let r = await cargar({ cliente:'SIN MOTIVO', motivo:'' });
  chk('⚠️ una ATC sin motivo no se guarda (si no, no se sabría por qué se generó)',
      r.n===0, r.n+' guardadas');
  chk('…y el campo queda marcado en rojo',
      await page.evaluate(()=>_el('f-atc-motivo').classList.contains('err')));

  // ============ 3. con motivo sí, y el dato viaja en la planilla ============
  r = await cargar({ cliente:'LORENA OYOLA', motivo:'Hundimiento',
                     detalle:'hundido en el medio, no descansa bien',
                     compra:'2024-07-13', comodin:true, piezas:['col','pat'],
                     rnota:'sómier sin una pata' });
  chk('con motivo se guarda', r.n===1, r.n);
  const guardado = await page.evaluate(() => {
    if(typeof atcMotivo!=='function')
      return { oc:'sin seguimiento de ATC', esAtc:false, mot:'no existe atcMotivo', det:'', dentro:false, enPlanilla:'' };
    var p=STATE[0]||{};
    return { oc:p.oc, esAtc:esATC(p.oc), mot:atcMotivo(p), det:atcDetalle(p),
             /* ⚠️ tiene que estar DENTRO del JSON de productos: la planilla tiene 29
                columnas fijas y una nueva obligaría a republicar el Apps Script. */
             dentro: !!((p.productos||[])[0]||{}).atc,
             /* y tiene que haber sobrevivido el viaje a la planilla simulada */
             enPlanilla: atcMotivo(window._pl[0]||{}) };
  });
  chk('el N° sale como ATC', guardado.esAtc===true, guardado.oc);
  chk('el motivo queda guardado', guardado.mot==='Hundimiento', guardado.mot);
  chk('…y el detalle del desperfecto también',
      /hundido en el medio/.test(guardado.det), guardado.det);
  chk('⚠️ viaja DENTRO del JSON de productos (sin columna nueva, sin republicar el Apps Script)',
      guardado.dentro===true, guardado.dentro);
  chk('…y llega a la planilla', guardado.enPlanilla==='Hundimiento', guardado.enPlanilla);

  // ============ 3b. lo que se tomó del FORMATO EN PAPEL (§4bs) ============
  /* El dueño acotó el alcance: *"una ATC no necesita número de factura, si te fijas es
     básico"* y *"no nos interesan las condiciones ambientales"*. Del Excel quedan solo la
     fecha de compra (define la garantía), el comodín y qué piezas se le llevan — el resto
     (cliente, teléfono, dirección, vendedora, producto, medida) ya lo trae el pedido. */
  const papel = await page.evaluate(() => {
    if(typeof atcFechaCompra!=='function') return { fcom:'no existe atcFechaCompra' };
    var p=STATE[0]||{};
    return { fcom:atcFechaCompra(p), com:atcComodin(p), piezas:atcRecibido(p).join(' · '),
             rnota:atcRecibidoNota(p), anti:antiguedadTxt('2024-07-13','2026-09-02'),
             /* ⚠️ NO debe haber campo de factura ni de condiciones ambientales */
             hayFactura: !!document.getElementById('f-atc-factura'),
             hayHumedad: !!document.getElementById('f-atc-humedad') };
  });
  chk('queda la fecha de compra (es lo que dice si hay garantía)', papel.fcom==='2024-07-13', papel.fcom);
  chk('…y se traduce a algo legible', /2 años/.test(papel.anti), papel.anti);
  chk('queda si se le dejó comodín', papel.com===true, papel.com);
  chk('quedan las piezas que se le recogen', papel.piezas==='Colchón · Patas', papel.piezas);
  chk('…y la aclaración', /sin una pata/.test(papel.rnota), papel.rnota);
  chk('⚠️ NO se pide N° de factura (el dueño dijo que no hace falta)', papel.hayFactura===false, papel.hayFactura);
  chk('⚠️ NI condiciones ambientales', papel.hayHumedad===false, papel.hayHumedad);

  // ============ 3c. una ATC NO es una venta: sin nota y sin cobro (§4bt) ============
  /* El dueño, con captura: *"nr de nota de venta no procede al llenar una atc, cobro
     tampoco"*. Y el código le da la razón: `fueraDeConta` ya deja las ATC fuera de
     Contabilidad y del Cuadre, así que lo que se anotara ahí no saldría en ningún total. */
  const venta = await page.evaluate(() => {
    var vis=function(id){ var e=document.getElementById(id); if(!e) return 'NO EXISTE';
      return e.style.display!=='none'; };
    showView('form'); resetForm();
    var conOC={ nota:vis('wrap-nota'), cobro:vis('wrap-cobro-todo') };
    segSet('f-doc-tipo','ATC'); if(typeof setDocTipo==='function') setDocTipo();
    var conATC={ nota:vis('wrap-nota'), cobro:vis('wrap-cobro-todo') };
    segSet('f-doc-tipo','OC'); if(typeof setDocTipo==='function') setDocTipo();
    return { conOC:conOC, conATC:conATC, vuelve:{ nota:vis('wrap-nota'), cobro:vis('wrap-cobro-todo') } };
  });
  chk('en una venta normal siguen la nota y el cobro, como siempre',
      venta.conOC.nota===true && venta.conOC.cobro===true, JSON.stringify(venta.conOC));
  chk('⚠️ en una ATC se esconde el N° de nota de venta', venta.conATC.nota===false, venta.conATC.nota);
  chk('⚠️ …y TODA la sección de cobro', venta.conATC.cobro===false, venta.conATC.cobro);
  chk('…y al volver a OC reaparecen',
      venta.vuelve.nota===true && venta.vuelve.cobro===true, JSON.stringify(venta.vuelve));

  /* ⚠️ Esconder no alcanza: si alguien empieza una venta con plata y a mitad la pasa a
     ATC, esos montos se guardarían igual, invisibles. */
  const arrastre = await page.evaluate(async () => {
    showView('form'); resetForm();
    document.getElementById('f-nota').value='9999';
    segSet('f-pagado','SI'); updateMetodoVisibility();
    document.getElementById('f-acuenta').value='500';
    document.getElementById('f-saldo').value='1500';
    document.getElementById('f-envio').value='150';
    segSet('f-doc-tipo','ATC'); setDocTipo();
    await new Promise(r=>setTimeout(r,120));
    return { nota:document.getElementById('f-nota').value,
             acu:document.getElementById('f-acuenta').value,
             sal:document.getElementById('f-saldo').value,
             env:document.getElementById('f-envio').value,
             pag:segVal('f-pagado') };
  });
  chk('⚠️ pasar una venta a ATC limpia la plata que ya se había tecleado',
      arrastre.nota==='' && arrastre.pag==='NO' && arrastre.env==='' &&
      Number(arrastre.acu)===0 && Number(arrastre.sal)===0, JSON.stringify(arrastre));

  /* Y una ATC se guarda SIN nota, sin que el formulario la exija. */
  const sinNota = await page.evaluate(() => STATE.length);
  await cargar({ cliente:'SIN NOTA', motivo:'Ruido' });
  const guardadaSinNota = await page.evaluate(() => {
    var p=STATE.filter(function(x){return x.cliente==='SIN NOTA';})[0];
    return p ? { hay:true, nota:p.nota||'', saldo:Number(p.saldo)||0, pagado:!!p.pagado } : { hay:false };
  });
  chk('⚠️ una ATC se guarda SIN nota de venta (antes el formulario se trababa pidiéndola)',
      guardadaSinNota.hay===true && guardadaSinNota.nota==='', JSON.stringify(guardadaSinNota));
  chk('…y sin plata', guardadaSinNota.saldo===0 && guardadaSinNota.pagado===false,
      JSON.stringify(guardadaSinNota));
  /* Se saca del escenario: las secciones que siguen cuentan sobre dos ATC. */
  await page.evaluate(async () => {
    STATE=STATE.filter(function(x){ return x.cliente!=='SIN NOTA'; });
    window._pl=window._pl.filter(function(x){ return x.cliente!=='SIN NOTA'; });
    saveMirror(); await new Promise(r=>setTimeout(r,120));
  });

  // ============ 4. 🐛 el N° escrito A MANO también lleva el prefijo ============
  /* Sin esto, elegir 🎧 ATC y teclear el número dejaba `oc` sin "ATC ": `esATC()` daba
     false y la atención no aparecía en su propia pestaña. */
  r = await cargar({ cliente:'A MANO', motivo:'Ruido', oc:'77' });
  const aMano = await page.evaluate(() => {
    var p=STATE.filter(function(x){return x.cliente==='A MANO';})[0]||{};
    return { oc:p.oc, es:esATC(p.oc) };
  });
  chk('🐛 eligiendo ATC y escribiendo el N° a mano, igual queda como ATC',
      aMano.es===true, aMano.oc);

  // ============ 5. la matriz muestra las ATC y NADA más ============
  await cargar({ tipo:'OC', cliente:'UNA VENTA NORMAL', nota:'900' });
  let m = await matriz();
  chk('la matriz trae las 2 ATC', m.filas===2, m.filas);
  chk('⚠️ …y NO mete la venta normal', !/UNA VENTA NORMAL/.test(m.txt), m.txt.slice(0,80));
  chk('se ve el cliente y el motivo en la fila',
      /LORENA OYOLA/.test(m.txt) && /Hundimiento/.test(m.txt), m.txt.slice(0,120));
  chk('…y el detalle del desperfecto, que es el "por qué"',
      /hundido en el medio/.test(m.txt), m.txt.slice(0,140));
  /* Recién creadas, todavía nadie las fue a buscar: el estado correcto es «Por recoger».
     Antes decían «en fábrica» —el modelo tenía dos estados y no distinguía—. */
  chk('una ATC recién creada dice «Por recoger», no «en fábrica»',
      /Por recoger/.test(m.txt) && !/En fábrica/.test(m.txt), m.txt.slice(0,90));
  chk('el resumen cuenta por motivo', /Hundimiento/.test(m.motivos) && /Ruido/.test(m.motivos),
      m.motivos.slice(0,90));

  // ============ 6. logística anota la devolución ============
  const dev = await page.evaluate(async () => {
    var _q=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0];
    if(!_q || typeof abrirDevolucionAtc!=='function')
      return { abrio:'no existe abrirDevolucionAtc', rechazo:false, dev:'', hizo:'', estado:'', quien:'', enPlanilla:'' };
    var id=_q.id;
    /* El formulario agenda para MAÑANA por defecto. Para probar la devolución hay que
       simular que el viaje ya pasó: se corre el recojo cinco días atrás. */
    var _d=new Date(); _d.setDate(_d.getDate()-5);
    _q.fecha=isoLocal(_d); persistPedido(_q);
    await new Promise(r=>setTimeout(r,200));
    abrirDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,150));
    var abrio=document.getElementById('modal').classList.contains('on');
    /* Una devolución ANTERIOR a la entrada descuadraría el promedio de días. */
    /* ⚠️ El recojo YA NO se marca: es la fecha para la que se programó el viaje, que se
       puso al cargar la ATC. En el modal solo se informa. */
    var hayCasillaRecojo = !!document.getElementById('rec-si');
    /* No se le puede entregar al cliente algo que sigue en producción. */
    document.getElementById('ent-si').checked=true;
    document.getElementById('ent-fecha').disabled=false;
    document.getElementById('ent-fecha').value=todayStr();
    guardarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,150));
    var saltarPaso = !atcEntregada(findById(id));
    /* Volver de fábrica ANTES del día del recojo tampoco puede ser. */
    document.getElementById('dev-si').checked=true;
    document.getElementById('dev-fecha').disabled=false;
    document.getElementById('dev-fecha').value='2020-01-01';
    guardarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,150));
    var rechazo = !atcDevuelta(findById(id));
    /* Primero SOLO que volvió de fábrica: tiene que quedar «lista para entregar», que es
       el estado que antes no existía y por el que los colchones dormían en el depósito. */
    document.getElementById('ent-si').checked=false;
    document.getElementById('dev-fecha').value=todayStr();
    document.getElementById('dev-hizo').disabled=false;
    document.getElementById('dev-hizo').value='se retapizó y se cambió la esponja';
    guardarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,300));
    var estadoLista=atcEstado(findById(id));
    /* Y recién al entregársela al cliente, se cierra. */
    abrirDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,150));
    document.getElementById('ent-si').checked=true;
    document.getElementById('ent-fecha').disabled=false;
    document.getElementById('ent-fecha').value=todayStr();
    guardarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,300));
    var p=findById(id);
    return { abrio:abrio, rechazo:rechazo, saltarPaso:saltarPaso, hayCasillaRecojo:hayCasillaRecojo,
             estadoLista:estadoLista,
             rec:atcRecogida(p), recEsFecha:(atcRecogida(p)===p.fecha),
             dev:atcDevuelta(p), ent:atcEntregada(p), hizo:atcQueSeHizo(p),
             estado:atcEstado(p), quien:(atcDe(p)||{}).devQ||'',
             enPlanilla: atcDevuelta((window._pl.filter(function(x){return x.id===id;})[0])||{}) };
  });
  chk('se abre la ventana para anotar el avance', dev.abrio===true, dev.abrio);
  chk('⚠️ el recojo NO se marca a mano: no hay casilla para eso',
      dev.hayCasillaRecojo===false, dev.hayCasillaRecojo);
  chk('⚠️ el recojo ES la fecha programada del viaje', dev.recEsFecha===true, dev.rec);
  chk('⚠️ no deja saltear el circuito: no se le entrega al cliente algo que sigue en producción',
      dev.saltarPaso===true, dev.saltarPaso);
  chk('⚠️ rechaza que vuelva de fábrica antes del día del recojo', dev.rechazo===true, dev.rechazo);
  chk('queda la fecha de cuándo VOLVIÓ de fábrica', !!dev.dev, dev.dev);
  chk('…y QUÉ SE HIZO, que es lo que nunca quedaba anotado',
      /retapizó/.test(dev.hizo), dev.hizo);
  chk('⚠️ al volver de fábrica queda «lista para entregar», NO cerrada — el cliente todavía no lo tiene',
      dev.estadoLista==='lista', dev.estadoLista);
  chk('…y recién al entregársela al cliente se cierra', dev.estado==='cerrada', dev.estado);
  chk('…queda quién la anotó', !!dev.quien, dev.quien);
  chk('…y llega a la planilla (no se queda en esta compu)', dev.enPlanilla===dev.dev, dev.enPlanilla);

  m = await matriz();
  chk('en la matriz esa ATC ya figura entregada', /Entregada/.test(m.txt), m.txt.slice(0,170));
  chk('las fichas muestran el embudo entero',
      /Por recoger/.test(m.fichas) && /En fábrica/.test(m.fichas) &&
      /Listas para entregar/.test(m.fichas) && /Entregadas/.test(m.fichas), m.fichas.slice(0,200));

  // ============ 7. ⚠️ LO QUE MÁS IMPORTA ============
  const tras = await page.evaluate(async () => {
    var _q=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0];
    if(!_q) return { dir:'no se cargó la ATC', dev:'', hizo:'', mot:'' };
    var id=_q.id;
    EDIT_DESDE='atc'; editPedido(id);
    await new Promise(r=>setTimeout(r,350));
    document.getElementById('f-direccion').value='Av. Bush 999 corregida';
    submitPedido();
    await new Promise(r=>setTimeout(r,400));
    var p=findById(id);
    if(typeof atcDevuelta!=='function') return { dir:p.direccion, dev:'', hizo:'', mot:'', rec:'', ent:'' };
    return { dir:p.direccion, dev:atcDevuelta(p), hizo:atcQueSeHizo(p), mot:atcMotivo(p),
             rec:atcRecogida(p), ent:atcEntregada(p),
             vista:true };
  });
  chk('la vendedora corrige la dirección', /999/.test(tras.dir), tras.dir);
  chk('⚠️ y NO se borra la devolución que anotó logística', !!tras.dev, tras.dev||'SE PERDIÓ');
  chk('⚠️ …ni el «qué se hizo»', /retapizó/.test(tras.hizo), tras.hizo||'SE PERDIÓ');
  /* ⚠️ Estos dos se agregaron después y el rescate los dejó afuera: editar la ATC los
     borraba en silencio. Por eso ahora se copia el objeto entero, no campo por campo. */
  chk('⚠️ …ni la fecha del RECOJO', !!tras.rec, tras.rec||'SE PERDIÓ');
  chk('⚠️ …ni la de la entrega al cliente (la que cierra la ATC)', !!tras.ent, tras.ent||'SE PERDIÓ');
  chk('…ni el motivo', tras.mot==='Hundimiento', tras.mot||'SE PERDIÓ');
  const papel2 = await page.evaluate(() => {
    if(typeof atcFechaCompra!=='function') return {};
    var p=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0];
    return { fcom:atcFechaCompra(p), com:atcComodin(p), piezas:atcRecibido(p).join(' · ') };
  });
  chk('…ni la fecha de compra', papel2.fcom==='2024-07-13', papel2.fcom||'SE PERDIÓ');
  chk('…ni el comodín ni las piezas',
      papel2.com===true && papel2.piezas==='Colchón · Patas', papel2.com+' / '+papel2.piezas);

  // ============ 8. los filtros ============
  const filtros = await page.evaluate(async () => {
    showView('atc');
    if(typeof renderAtc!=='function') return { porMot:-1, porDev:-1, porFab:-1, porBusca:-1, total:-1 };
    var set=async function(id,v){ _el(id).value=v; renderAtc(); await new Promise(r=>setTimeout(r,120)); };
    var n=function(){ return document.querySelectorAll('#tbl-atc tbody tr').length; };
    await set('atc-motivo','Hundimiento'); var porMot=n();
    await set('atc-motivo','');
    await set('atc-estado','cerrada');     var porDev=n();
    await set('atc-estado','sinrecoger');  var porFab=n();
    await set('atc-estado','abiertas');    var porAbrir=n();
    await set('atc-estado','');
    await set('atc-search','LORENA');      var porBusca=n();
    await set('atc-search','');
    return { porMot:porMot, porDev:porDev, porFab:porFab, porAbrir:porAbrir, porBusca:porBusca, total:n() };
  });
  chk('filtra por motivo', filtros.porMot===1, filtros.porMot);
  chk('filtra las cerradas', filtros.porDev===1, filtros.porDev);
  chk('filtra las que todavía no se recogieron', filtros.porFab===1, filtros.porFab);
  chk('⚠️ «sin cerrar» junta todo lo que da trabajo', filtros.porAbrir===1, filtros.porAbrir);
  chk('el buscador encuentra por cliente', filtros.porBusca===1, filtros.porBusca);
  chk('…y al limpiar vuelven todas', filtros.total===2, filtros.total);

  // ============ 9. deshacer la devolución ============
  const desh = await page.evaluate(async () => {
    var _q=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0];
    if(!_q || typeof borrarDevolucionAtc!=='function') return { dev:'no existe borrarDevolucionAtc', estado:'', mot:'' };
    var id=_q.id;
    borrarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,250));
    var p=findById(id);
    return { dev:atcDevuelta(p), estado:atcEstado(p), mot:atcMotivo(p), rec:atcRecogida(p), ent:atcEntregada(p) };
  });
  chk('se puede deshacer si se anotó por error', desh.dev==='', desh.dev||'(vacío)');
  chk('…vuelve a antes de volver de fábrica', desh.estado!=='lista' && desh.estado!=='cerrada', desh.estado);
  chk('…y deshacerlo NO se lleva puesto el motivo', desh.mot==='Hundimiento', desh.mot);

  // ============ 10. sin la llave de Administración no se puede tocar ============
  const sinLlave = await page.evaluate(async () => {
    if(typeof renderAtc!=='function') return 'no existe renderAtc';
    UNLOCKED=false; renderAtc();
    await new Promise(r=>setTimeout(r,150));
    var botones=[].slice.call(document.querySelectorAll('#tbl-atc tbody button'))
                  .map(function(b){ return b.getAttribute('onclick')||''; }).join(' ');
    UNLOCKED=true; renderAtc();
    return botones||'(ningún botón)';
  });
  chk('⚠️ una vendedora VE la matriz pero no puede anotar devoluciones',
      !/abrirDevolucionAtc/.test(sinLlave), sinLlave.slice(0,80));

  // ============ 11. 🔍 LA FICHA: se abre y se LEE entera ============
  /* El dueño: *"al dar click no se abre la ficha para leer o ver cuál era el motivo"*.
     El 🔍 abría el formulario de edición, y en la tabla el detalle va cortado con «…»
     que solo se ve pasando el mouse — invisible en un celular. */
  const ficha = await page.evaluate(async () => {
    if(typeof verAtc!=='function') return { abrio:false, txt:'no existe verAtc' };
    var id=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0].id;
    /* Se le vuelve a poner avance para que la ficha tenga las cuatro fechas. */
    mergeAtcDatos(findById(id), { dev:todayStr(), ent:todayStr(),
                                  hizo:'se retapizó y se cambió la esponja' });
    verAtc(id);
    await new Promise(r=>setTimeout(r,200));
    var box=document.getElementById('modal-box');
    return { abrio:document.getElementById('modal').classList.contains('on'),
             txt:box.textContent.replace(/\s+/g,' ') };
  });
  chk('🔍 se abre la ficha de la ATC', ficha.abrio===true, ficha.txt.slice(0,60));
  chk('…y se lee el MOTIVO', /Hundimiento/.test(ficha.txt), ficha.txt.slice(0,110));
  chk('…y el detalle del desperfecto COMPLETO, sin cortar con «…»',
      /hundido en el medio, no descansa bien/.test(ficha.txt), ficha.txt.slice(0,200));
  chk('…y qué se hizo', /retapizó/.test(ficha.txt), 'ok');
  chk('…y la fecha de compra con su antigüedad',
      /13\/07\/2024/.test(ficha.txt) && /comprado hace 2 años/.test(ficha.txt), 'ok');
  chk('…y que se le dejó comodín', /comodín/.test(ficha.txt), 'ok');
  chk('…y qué piezas se le llevaron', /Colchón · Patas/.test(ficha.txt), ficha.txt.slice(0,60));
  chk('…y los CUATRO momentos del circuito',
      /ENTRÓ/i.test(ficha.txt) && /RECOJO/i.test(ficha.txt) &&
      /VOLVIÓ DE FÁBRICA/i.test(ficha.txt) && /AL CLIENTE/i.test(ficha.txt),
      ficha.txt.slice(-200));
  const clic = await page.evaluate(async () => {
    closeModal();
    await new Promise(r=>setTimeout(r,120));
    var tr=document.querySelector('#tbl-atc tbody tr');
    if(!tr) return 'no hay filas';
    tr.click();
    await new Promise(r=>setTimeout(r,200));
    var ok=document.getElementById('modal').classList.contains('on');
    closeModal();
    return ok;
  });
  chk('…y tocando la FILA entera también se abre (en el celular es lo que se toca)',
      clic===true, clic);

  // ============ 12. 🛏️ EL COMODÍN AVISA (§4bt) ============
  /* *"«con comodín» debería parpadear para alertar a logística"*. Si no se recupera al
     entregar, se pierde un colchón entero. Tiene que verse en los tres lugares donde
     logística mira: la fila, la ficha y la ventana de anotar avance. */
  const como = await page.evaluate(async () => {
    if(typeof renderAtc!=='function') return { fila:'no existe renderAtc' };
    var id=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0].id;
    showView('atc'); await new Promise(r=>setTimeout(r,250));
    var tr=[].slice.call(document.querySelectorAll('#tbl-atc tbody tr'))
             .filter(function(t){ return /LORENA/.test(t.textContent); })[0];
    var fila = tr ? !!tr.querySelector('.b-comodin') : 'no encontré la fila';
    verAtc(id); await new Promise(r=>setTimeout(r,180));
    var ficha = !!document.querySelector('#modal-box .b-comodin');
    closeModal(); await new Promise(r=>setTimeout(r,120));
    abrirDevolucionAtc(id); await new Promise(r=>setTimeout(r,180));
    var box=document.getElementById('modal-box');
    var avance = !!box.querySelector('.aviso-comodin');
    /* Y la ventana nueva: encabezado propio y los campos escondidos hasta tildar. */
    var conHeader = !!box.querySelector('.modal-h');
    var devBox = document.getElementById('dev-box');
    var ocultoAlPrincipio = devBox ? devBox.style.display==='none' : 'no existe dev-box';
    var sinNumeracion = !/2\)/.test(box.textContent) && !/3\)/.test(box.textContent);
    document.getElementById('dev-si').checked=true;
    document.getElementById('dev-si').onchange({target:document.getElementById('dev-si')});
    var seAbre = devBox ? devBox.style.display==='block' : false;
    /* ⚠️ El parpadeo se comprueba en el ELEMENTO, no buscando la clase en el CSS: que la
       regla exista no prueba que se aplique. `animationName` sale del navegador. */
    var av=box.querySelector('.aviso-comodin');
    var anim = av ? getComputedStyle(av).animationName : 'no hay aviso';
    var dur  = av ? getComputedStyle(av).animationDuration : '';
    closeModal();
    var hojas=[].slice.call(document.querySelectorAll('style')).map(function(e){return e.textContent;}).join(' ');
    return { fila:fila, ficha:ficha, avance:avance, conHeader:conHeader,
             ocultoAlPrincipio:ocultoAlPrincipio, seAbre:seAbre, sinNumeracion:sinNumeracion,
             anim:anim, dur:dur, respeta:/prefers-reduced-motion/.test(hojas) };
  });
  chk('🛏️ el comodín se ve en la FILA de la matriz', como.fila===true, como.fila);
  chk('…y en la ficha', como.ficha===true, como.ficha);
  chk('…y en la ventana de anotar avance, que es cuando hay que acordarse',
      como.avance===true, como.avance);
  chk('…y de verdad parpadea (animación aplicada, no solo la clase puesta)',
      como.anim==='comodinLatido' && parseFloat(como.dur)>0, como.anim+' · '+como.dur);
  chk('…respetando a quien pidió menos animaciones', como.respeta===true, como.respeta);
  chk('la ventana de avance usa el molde con encabezado, como el resto del panel',
      como.conHeader===true, como.conHeader);
  chk('⚠️ …y ya no dice «2)» ni «3)» (quedaron sueltos al sacar el paso 1)',
      como.sinNumeracion===true, como.sinNumeracion);
  chk('los campos aparecen recién al tildar la casilla, no apagados de entrada',
      como.ocultoAlPrincipio===true && como.seAbre===true,
      'oculto '+como.ocultoAlPrincipio+' · se abre '+como.seAbre);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
