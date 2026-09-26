/* 🎧 SEGUNDA REVISIÓN DE LA PESTAÑA ATC (26/09/2026) — lo que se encontró y se arregló.

   1. ✅ Cerrar la ATC desde «📦 Anotar avance» («Se le devolvió al CLIENTE») con la devolución
      programada dejaba el pedido SIN entregar: «✅ Entregada» en la pestaña ATC, y para el chofer
      y Administración «⏳ Pendiente» con el chip «🎧 ATC» (el de un RECOJO). Y al revés: «↺ Borrar
      todo» (o destildar el paso) sobre una devolución que el chofer ya había tildado la reabría
      —«🏭 Recoger de fábrica»— pero la ficha del chofer seguía «✓ Entregado»: nadie la llevaba.
   2. 🛏️ El COMODÍN («¿Se le deja comodín? Sí») solo se veía en la pestaña ATC. El que va al
      domicilio —la ficha del chofer, la lista de carga, la hoja de ruta y su WhatsApp— no se
      enteraba ni de llevarlo en el recojo ni de traerlo de vuelta en la devolución; y el mensaje
      al grupo de una ATC nueva no decía el motivo y la anunciaba como «💰 PAGADO».
   3. 🔁 «Programar devolución» se habilita el MISMO día del recojo (la fecha ya «llegó»), aunque
      el chofer todavía no haya ido. Programarla a la mañana mudaba la ATC al día de la devolución:
      el viaje de HOY a buscarlo desaparecía de la ficha del chofer y de la carga, y el día de la
      devolución iba a llevar un producto que seguía en lo del cliente. Ahora pregunta antes.

   Reloj clavado en el miércoles 23/09/2026 10:00 de Bolivia: las fechas no se pudren.
   Red cortada, servidor simulado, datos sintéticos. Se corre:  node tests/test_rev2_atc.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev2_atc.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MIERCOLES = '2026-09-23T10:00:00-04:00';

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({rec:JSON.parse(JSON.stringify(rec)), opts:opts||null}); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  /* Una ATC ya recogida (el lunes 21) y con la devolución programada con el botón de siempre. */
  window._atcConDev=function(id, fecha, turno, extra){
    STATE=STATE.filter(function(p){ return p.id!==id; });
    STATE.push(_P({id:id, oc:'ATC 09-0'+id.length, fecha:'2026-09-21', entregado:true, cliente:'CLIENTE '+id,
      productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:Object.assign({mot:'Hundimiento'}, extra||{})}]}));
    saveMirror();
    abrirProgramarDevAtc(id);
    document.getElementById('pdev-fecha').value=fecha; segSet('pdev-turno', turno);
    guardarProgramarDevAtc(id);
    return findById(id);
  };
  window._atcVer=function(id){ var p=findById(id), a=atcDe(p)||{};
    return { entregado:!!p.entregado, fecha:p.fecha, pdev:a.pdev||'', ent:a.ent||'', rf:a.rf||'',
             enDev:atcEnDevolucion(p), chip:atcChip(p).replace(/<[^>]+>/g,''), estado:atcEstado(p),
             pendChofer:choTest('pend')(p), alertaHoy:atcRecogerFabPend(p, todayStr()) }; };
  /* «📦 Anotar avance»: se abre, se tildan/destildan los pasos y se guarda, como logística. */
  window._avance=function(id, pasos){
    abrirDevolucionAtc(id);
    ['dev','rf','ent'].forEach(function(k){ if(pasos[k]===undefined) return;
      var c=document.getElementById(k+'-si'); c.checked=!!pasos[k];
      if(pasos[k] && typeof pasos[k]==='string') document.getElementById(k+'-fecha').value=pasos[k]; });
    guardarDevolucionAtc(id);
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>{ if(d.type()==='prompt') d.accept('300'); else d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ 1. Cerrar o reabrir desde «📦 Anotar avance» mueve el ✅ del viaje de devolución ═══
  console.log('\n── 1. ✅ «Se le devolvió al CLIENTE» desde 📦 Anotar avance = la devolución queda entregada para todos ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={};
      // (a) la devolución es HOY y logística la cierra desde la pestaña ATC (el chofer no tildó nada)
      _atcConDev('a1','2026-09-23','AM');
      out.antes=_atcVer('a1');
      window._saves=[];
      _avance('a1', {ent:'2026-09-23'});
      out.cerrada=_atcVer('a1');
      var s=window._saves[window._saves.length-1]; out.mandado={entregado:!!(s&&s.rec.entregado), ent:((s&&atcDe(s.rec))||{}).ent||''};
      // …y el chofer, en su ficha de hoy
      showView('chofer'); llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('hoy');
      await new Promise(function(r){ setTimeout(r,150); });
      var card=[].filter.call(document.querySelectorAll('#cho-lista .cho-card'), function(c){ return /CLIENTE a1/.test(c.textContent); })[0];
      out.tarjeta=card?card.textContent.replace(/\\s+/g,' '):'(no está)';
      // (b) y si se equivocaron de ATC y la destildan en el mismo panel, vuelve a estar pendiente
      _avance('a1', {ent:false, rf:false});
      out.reabierta=_atcVer('a1');
      // (c) el chofer SÍ la tildó ✅ y logística la reabre con «↺ Borrar todo» (el ✅ fue sin querer)
      _atcConDev('b1','2026-09-23','AM');
      choEntregado('b1');
      out.tildada=_atcVer('b1');
      abrirDevolucionAtc('b1'); borrarDevolucionAtc('b1');
      out.borrada=_atcVer('b1');
      out.borradaAtc=atcDe(findById('b1'));
      // …y si el chofer la vuelve a tildar, se cierra y anota el «recogido de fábrica» como siempre
      choEntregado('b1');
      out.retildada=_atcVer('b1');
      // (d) control: una ATC SIN devolución programada — su ✅ es el RECOJO y cerrarla no lo toca
      STATE.push(_P({id:'c1', oc:'ATC 09-055', fecha:'2026-09-21', entregado:true, cliente:'VIEJA',
        productos:[{desc:'SOFT', cant:1, atc:{mot:'Ruido'}}]}));
      _avance('c1', {ent:'2026-09-23'});
      out.vieja=_atcVer('c1');
      _avance('c1', {ent:false, rf:false});
      out.viejaReabierta=_atcVer('c1');
      // (e) control: anotar solo «Listo en fábrica» sobre una devolución programada no la entrega
      _atcConDev('d1','2026-09-28','PM');
      _avance('d1', {dev:'2026-09-22'});
      out.soloListo=_atcVer('d1');
      return out;
    }, BASE);
    chk('punto de partida: la devolución de hoy vive en su día, pendiente para el chofer',
        r.antes.enDev && r.antes.entregado===false && r.antes.pendChofer===true, J(r.antes));
    chk('⚠️ cerrarla desde «📦 Anotar avance» la deja ENTREGADA (antes: cerrada en ATC y «⏳ Pendiente» para el chofer)',
        r.cerrada.estado==='cerrada' && r.cerrada.entregado===true && r.cerrada.pendChofer===false, J(r.cerrada));
    chk('…y a la planilla va entregada, con el día de la entrega al cliente',
        r.mandado.entregado===true && r.mandado.ent==='2026-09-23', J(r.mandado));
    chk('⚠️ …y en la ficha del chofer figura «✓ Entregado», no «⏳ Pendiente»',
        /✓ Entregado/.test(r.tarjeta) && !/Pendiente/.test(r.tarjeta), r.tarjeta.slice(0,160));
    chk('⚠️ destildarla en el mismo panel la vuelve a dejar pendiente para el chofer',
        r.reabierta.estado!=='cerrada' && r.reabierta.entregado===false && r.reabierta.pendChofer===true, J(r.reabierta));
    chk('punto de partida (c): el ✅ del chofer la cerró', r.tildada.estado==='cerrada' && r.tildada.entregado===true, J(r.tildada));
    chk('⚠️ «↺ Borrar todo» la reabre ENTERA: vuelve el aviso de fábrica y el chofer la ve pendiente (antes seguía «✓ Entregado»)',
        r.borrada.estado==='recogerfab' && r.borrada.alertaHoy===true && r.borrada.entregado===false && r.borrada.pendChofer===true, J(r.borrada));
    chk('…y no queda ninguna marca del ✅ viejo (`rfAuto`)', !(r.borradaAtc||{}).rfAuto, J(r.borradaAtc));
    chk('…y el ✅ siguiente la cierra como siempre', r.retildada.estado==='cerrada' && r.retildada.entregado===true && r.retildada.rf==='2026-09-23', J(r.retildada));
    chk('control: sin devolución programada el ✅ del pedido es el RECOJO y cerrar/reabrir la ATC no lo toca',
        r.vieja.estado==='cerrada' && r.vieja.entregado===true && r.viejaReabierta.estado==='fabrica' && r.viejaReabierta.entregado===true,
        J([r.vieja, r.viejaReabierta]));
    chk('control: anotar «Listo en fábrica» no entrega la devolución del lunes',
        r.soloListo.estado==='programada' && r.soloListo.entregado===false, J(r.soloListo));
    await page.close();
  }

  // ═══ 2. El comodín llega a quien va al domicilio ════════════════════════════════════
  console.log('\n── 2. 🛏️ El comodín en la ficha del chofer, la carga, la hoja de ruta y el mensaje al grupo ──');
  {
    const page = await nueva(null, 380);
    const r = await page.evaluate(async (base) => {
      eval(base);
      var hoy=todayStr(); STATE=[];
      // un RECOJO de hoy con comodín, una DEVOLUCIÓN de hoy con comodín, y dos de control
      STATE.push(_P({id:'rc', oc:'ATC 09-011', fecha:hoy, cliente:'CLIENTE rc',
        productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:{mot:'Hundimiento', det:'hundido al medio', com:true, r_col:true, r_pat:true}}]}));
      _atcConDev('dv', hoy, 'PM', {com:true});
      STATE.push(_P({id:'sc', oc:'ATC 09-013', fecha:hoy, cliente:'CLIENTE sc',
        productos:[{desc:'SOFT', cant:1, atc:{mot:'Ruido'}}]}));
      _atcConDev('ce', hoy, 'AM', {com:true}); choEntregado('ce');   // ya se la devolvieron: no hay nada que traer
      saveMirror();
      var txt=function(el){ return el?el.textContent.replace(/\\s+/g,' '):''; };
      var out={};
      // la ficha del chofer
      showView('chofer'); llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('hoy');
      await new Promise(function(r){ setTimeout(r,150); });
      out.cho={};
      [].forEach.call(document.querySelectorAll('#cho-lista .cho-card'), function(c){ var t=txt(c);
        var k=/CLIENTE rc/.test(t)?'rc':/CLIENTE dv/.test(t)?'dv':/CLIENTE sc/.test(t)?'sc':/CLIENTE ce/.test(t)?'ce':'otro';
        out.cho[k]={t:t, parpadea:!!c.querySelector('.b-comodin')}; });
      out.ancho={doc:document.documentElement.scrollWidth, vista:window.innerWidth};
      // la lista de carga
      abrirCarga(); setCargaDia('hoy');
      out.carga={};
      [].forEach.call(document.querySelectorAll('#carga-body .carga-stop'), function(c){ var t=txt(c);
        out.carga[/CLIENTE rc/.test(t)?'rc':/CLIENTE dv/.test(t)?'dv':/CLIENTE sc/.test(t)?'sc':/CLIENTE ce/.test(t)?'ce':'otro']=t; });
      closeCarga();
      // la hoja de ruta, en pantalla y por WhatsApp
      var wa=''; window.open=function(u){ wa=decodeURIComponent(String(u)); return null; }; copyText=function(){};
      abrirRuta(); setRutaDia('hoy'); out.ruta=txt(document.getElementById('ruta-body'));
      rutaWhatsapp(0); closeRuta(); out.rutaWA=wa;
      // el mensaje al grupo de la ATC nueva
      out.grupo=pedidoText(findById('rc')); out.grupoSin=pedidoText(findById('sc'));
      out.venta=pedidoText(_P({id:'v', oc:'09-050', cliente:'VENTA', saldo:500, productos:[{desc:'SOFT',cant:1}]}));
      return out;
    }, BASE);
    const trozo=(t,re)=>((t||'').match(re)||[''])[0];
    chk('⚠️ la ficha del chofer del RECOJO le dice que lleve el comodín, y parpadea',
        /COMOD[IÍ]N/i.test(r.cho.rc&&r.cho.rc.t) && /llevar/i.test(r.cho.rc&&r.cho.rc.t) && r.cho.rc.parpadea===true, trozo(r.cho.rc&&r.cho.rc.t,/.{0,40}COMOD.{0,30}/i)||(r.cho.rc&&r.cho.rc.t||'').slice(0,120));
    chk('⚠️ la de la DEVOLUCIÓN, que lo traiga de vuelta',
        /traer/i.test(r.cho.dv&&r.cho.dv.t) && /COMOD[IÍ]N/i.test(r.cho.dv&&r.cho.dv.t) && r.cho.dv.parpadea===true, trozo(r.cho.dv&&r.cho.dv.t,/.{0,40}COMOD.{0,30}/i)||(r.cho.dv&&r.cho.dv.t||'').slice(0,120));
    chk('en el celular (380 px) la ficha con el aviso no se sale de la pantalla', r.ancho.doc<=r.ancho.vista, J(r.ancho));
    chk('control: sin comodín, o ya devuelta, la ficha no dice nada del comodín',
        !/comod/i.test(r.cho.sc&&r.cho.sc.t) && !/comod/i.test(r.cho.ce&&r.cho.ce.t) && r.cho.sc && r.cho.ce, J([!!r.cho.sc, !!r.cho.ce]));
    chk('⚠️ en la lista de carga (la parada) también',
        /COMOD[IÍ]N/i.test(r.carga.rc) && /COMOD[IÍ]N/i.test(r.carga.dv) && !/comod/i.test(r.carga.sc||'x') && !/comod/i.test(r.carga.ce||'x'), J(r.carga).slice(0,300));
    chk('⚠️ en la hoja de ruta y en su WhatsApp',
        (r.ruta.match(/COMOD[IÍ]N/gi)||[]).length===2 && (r.rutaWA.match(/COMOD[IÍ]N/gi)||[]).length===2, trozo(r.rutaWA,/.{0,60}COMOD.{0,40}/i)||r.rutaWA.slice(0,200));
    chk('⚠️ el mensaje al grupo de la ATC dice el motivo, qué se le recoge y el comodín',
        /Hundimiento/.test(r.grupo) && /hundido al medio/.test(r.grupo) && /Colchón/.test(r.grupo) && /Patas/.test(r.grupo) && /COMOD[IÍ]N/i.test(r.grupo), r.grupo);
    chk('⚠️ …y no la anuncia como «💰 PAGADO»: una ATC no se cobra',
        !/PAGADO/.test(r.grupo) && /No se cobra/i.test(r.grupo) && !/PAGADO/.test(r.grupoSin) && !/comod/i.test(r.grupoSin), r.grupo.split('\n').filter(function(l){ return /💰|cobra/i.test(l); }).join(' | '));
    chk('control: el mensaje de una venta sigue igual («💰 POR COBRAR», sin línea de ATC)',
        /POR COBRAR/.test(r.venta) && !/ATC|comod/i.test(r.venta), r.venta.split('\n').slice(0,2).join(' | '));
    await page.close();
  }

  // ═══ 3. Programar la devolución el mismo día del recojo, antes de que el chofer vaya ═══
  console.log('\n── 3. 🔁 El recojo es HOY y el chofer no lo tildó: programar la devolución pregunta antes ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={}, hoy=todayStr();
      window._confirms=[]; window._resp=false;
      confirm=function(m){ window._confirms.push(String(m)); return window._resp; };
      var recojo=function(id, fecha, entregado){ STATE=STATE.filter(function(p){ return p.id!==id; });
        STATE.push(_P({id:id, oc:'ATC 09-2'+id.length, fecha:fecha, turno:'PM', entregado:!!entregado, cliente:'CLIENTE '+id,
          productos:[{desc:'SOFT', cant:1, atc:{mot:'Resortes'}}]})); saveMirror(); };
      var programar=function(id){ window._confirms=[]; window._saves=[];
        abrirProgramarDevAtc(id); document.getElementById('pdev-fecha').value='2026-09-28'; segSet('pdev-turno','AM');
        guardarProgramarDevAtc(id);
        var p=findById(id), a=atcDe(p)||{};
        return { fecha:p.fecha, pdev:a.pdev||'', confirms:window._confirms.slice(), mandado:window._saves.length,
                 hoyChofer:STATE.filter(function(q){ return q.fecha===hoy && q.chofer==='Luis Pierre'; }).map(function(q){ return q.id; }) }; };
      // (a) el recojo es HOY a la tarde y todavía no fue nadie: el botón está habilitado…
      recojo('h1', hoy, false);
      verAtc('h1'); out.boton=[].some.call(document.querySelectorAll('#modal-box button'), function(b){ return /Programar devolución/.test(b.textContent) && !b.disabled; }); closeModal();
      // …y si dicen que NO lo recogieron todavía, no se programa nada y el recojo sigue en el día
      out.no=programar('h1');
      // …si confirman que ya lo recogieron, se programa como siempre
      window._resp=true; out.si=programar('h1'); window._resp=false;
      // (b) control: el recojo fue AYER — se programa sin preguntar nada
      recojo('y1', '2026-09-22', false); out.ayer=programar('y1');
      // (c) control: el recojo es hoy pero el chofer ya lo tildó ✅ — tampoco pregunta
      recojo('t1', hoy, true); out.tildado=programar('t1');
      return out;
    }, BASE);
    chk('punto de partida: el mismo día del recojo el botón «🔁 Programar devolución» ya está habilitado', r.boton===true, r.boton);
    chk('⚠️ programar la devolución el día del recojo sin ✅ PREGUNTA si ya lo recogieron (antes lo mudaba sin decir nada)',
        r.no.confirms.length===1 && /recog/i.test(r.no.confirms[0]) && /HOY/.test(r.no.confirms[0]), J(r.no.confirms));
    chk('⚠️ …y si dicen que no, el recojo de hoy sigue en la lista del chofer y no se manda nada',
        r.no.fecha==='2026-09-23' && r.no.pdev==='' && r.no.mandado===0 && r.no.hoyChofer.indexOf('h1')>=0, J(r.no));
    chk('…si confirman que ya lo recogieron, se programa como siempre', r.si.pdev==='2026-09-28' && r.si.fecha==='2026-09-28' && r.si.mandado===1, J(r.si));
    chk('control: con el recojo de AYER se programa sin preguntar', r.ayer.confirms.length===0 && r.ayer.pdev==='2026-09-28', J(r.ayer));
    chk('control: con el recojo de hoy ya tildado ✅ por el chofer, tampoco', r.tildado.confirms.length===0 && r.tildado.pdev==='2026-09-28', J(r.tildado));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
