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
    segSet('f-doc-tipo', o.tipo||'ATC'); setDocTipo();
    document.getElementById('f-nota').value=o.nota||'1';
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
                     detalle:'hundido en el medio, no descansa bien' });
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
  chk('las que no volvieron dicen «en fábrica»', /en fábrica/.test(m.txt), m.txt.slice(0,90));
  chk('el resumen cuenta por motivo', /Hundimiento/.test(m.motivos) && /Ruido/.test(m.motivos),
      m.motivos.slice(0,90));

  // ============ 6. logística anota la devolución ============
  const dev = await page.evaluate(async () => {
    var _q=STATE.filter(function(x){return x.cliente==='LORENA OYOLA';})[0];
    if(!_q || typeof abrirDevolucionAtc!=='function')
      return { abrio:'no existe abrirDevolucionAtc', rechazo:false, dev:'', hizo:'', estado:'', quien:'', enPlanilla:'' };
    var id=_q.id;
    abrirDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,150));
    var abrio=document.getElementById('modal').classList.contains('on');
    /* Una devolución ANTERIOR a la entrada descuadraría el promedio de días. */
    document.getElementById('dev-fecha').value='2020-01-01';
    guardarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,150));
    var rechazo = !atcDevuelta(findById(id));
    document.getElementById('dev-fecha').value=todayStr();
    document.getElementById('dev-hizo').value='se retapizó y se cambió la esponja';
    guardarDevolucionAtc(id);
    await new Promise(r=>setTimeout(r,300));
    var p=findById(id);
    return { abrio:abrio, rechazo:rechazo, dev:atcDevuelta(p), hizo:atcQueSeHizo(p),
             estado:atcEstado(p), quien:(atcDe(p)||{}).devQ||'',
             enPlanilla: atcDevuelta((window._pl.filter(function(x){return x.id===id;})[0])||{}) };
  });
  chk('se abre la ventana para anotar la devolución', dev.abrio===true, dev.abrio);
  chk('⚠️ rechaza una devolución anterior al día en que entró la ATC', dev.rechazo===true, dev.rechazo);
  chk('queda la fecha de devolución', !!dev.dev, dev.dev);
  chk('…y QUÉ SE HIZO, que es lo que nunca quedaba anotado',
      /retapizó/.test(dev.hizo), dev.hizo);
  chk('…pasa a estado devuelta', dev.estado==='devuelta', dev.estado);
  chk('…queda quién la anotó', !!dev.quien, dev.quien);
  chk('…y llega a la planilla (no se queda en esta compu)', dev.enPlanilla===dev.dev, dev.enPlanilla);

  m = await matriz();
  chk('en la matriz esa ATC ya figura devuelta', /✅/.test(m.txt), m.txt.slice(0,150));
  chk('las fichas cuentan 1 devuelta y 1 sin devolver',
      /Sin devolver/.test(m.fichas) && /Devueltas/.test(m.fichas), m.fichas.slice(0,120));

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
    if(typeof atcDevuelta!=='function') return { dir:p.direccion, dev:'', hizo:'', mot:'' };
    return { dir:p.direccion, dev:atcDevuelta(p), hizo:atcQueSeHizo(p), mot:atcMotivo(p),
             vista:true };
  });
  chk('la vendedora corrige la dirección', /999/.test(tras.dir), tras.dir);
  chk('⚠️ y NO se borra la devolución que anotó logística', !!tras.dev, tras.dev||'SE PERDIÓ');
  chk('⚠️ …ni el «qué se hizo»', /retapizó/.test(tras.hizo), tras.hizo||'SE PERDIÓ');
  chk('…ni el motivo', tras.mot==='Hundimiento', tras.mot||'SE PERDIÓ');

  // ============ 8. los filtros ============
  const filtros = await page.evaluate(async () => {
    showView('atc');
    if(typeof renderAtc!=='function') return { porMot:-1, porDev:-1, porFab:-1, porBusca:-1, total:-1 };
    var set=async function(id,v){ _el(id).value=v; renderAtc(); await new Promise(r=>setTimeout(r,120)); };
    var n=function(){ return document.querySelectorAll('#tbl-atc tbody tr').length; };
    await set('atc-motivo','Hundimiento'); var porMot=n();
    await set('atc-motivo','');
    await set('atc-estado','devuelta');    var porDev=n();
    await set('atc-estado','fabrica');     var porFab=n();
    await set('atc-estado','');
    await set('atc-search','LORENA');      var porBusca=n();
    await set('atc-search','');
    return { porMot:porMot, porDev:porDev, porFab:porFab, porBusca:porBusca, total:n() };
  });
  chk('filtra por motivo', filtros.porMot===1, filtros.porMot);
  chk('filtra las devueltas', filtros.porDev===1, filtros.porDev);
  chk('filtra las que siguen en fábrica', filtros.porFab===1, filtros.porFab);
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
    return { dev:atcDevuelta(p), estado:atcEstado(p), mot:atcMotivo(p) };
  });
  chk('se puede deshacer si se anotó por error', desh.dev==='', desh.dev||'(vacío)');
  chk('…vuelve a "en fábrica"', desh.estado==='fabrica', desh.estado);
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

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
