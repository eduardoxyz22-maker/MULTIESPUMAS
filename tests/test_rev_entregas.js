/* 🚚 REVISIÓN DE ENTREGAS Y LOGÍSTICA (25/09/2026) — lo que se encontró y se arregló.

   1. 🔁 La ATC con la DEVOLUCIÓN programada vive en el día del viaje de vuelta (`p.fecha` =
      `pdev`). Solo «🔁 Cambiar devolución» movía las dos cosas juntas: con 📅 Reprogramar, con el
      turno de la ficha de carga o con ✏️ Editar, `pdev` quedaba en el día viejo. El chofer veía
      «🎧 ATC» (un RECOJO) en vez de «🔁 devolución», el aviso «🏭 Recoger de fábrica» contaba
      desde el día viejo y su ✅ del día nuevo ya no cerraba la ATC.
   2. ✅ Tildar y destildar la devolución (un toque sin querer) dejaba puesto el «recogido de
      fábrica» que el ✅ había anotado solo: se apagaba el aviso de ir a buscarla a la fábrica.
   3. 🔁 Programar la devolución el sábado a la tarde, el domingo o en un día cerrado decía «✓» y
      el servidor la rechazaba después como «turno lleno»; el cartel decía «de 12 · de 13» siempre.
   4. 🎧🏪 Cada ATC y cada RPT salían «⚠️ SIN MONTO ANOTADO — preguntar antes de entregar» para el
      chofer (tarjeta, hoja de ruta, WhatsApp, «Entregado», fichas), y «➕ Cobré algo igual»
      anotaba plata que Contabilidad no ve.
   5. 🎟️ Con un turno forzado de más, tres avisos seguían diciendo «(12/12)» (§4fh).
   6. 💰 Administración contaba las ATC y las RPT como «por cobrar» (chip, ficha y resumen).

   Reloj clavado en el miércoles 23/09/2026 10:00 de Bolivia: las fechas no se pudren.
   Red cortada, servidor simulado, datos sintéticos. Se corre:  node tests/test_rev_entregas.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev_entregas.js */
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
  window._atcConDev=function(id, fecha, turno){
    STATE=STATE.filter(function(p){ return p.id!==id; });
    STATE.push(_P({id:id, oc:'ATC 09-0'+id.length, fecha:'2026-09-21', entregado:true, cliente:'CLIENTE '+id,
      productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:{mot:'Hundimiento'}}]}));
    saveMirror();
    abrirProgramarDevAtc(id);
    document.getElementById('pdev-fecha').value=fecha; segSet('pdev-turno', turno);
    guardarProgramarDevAtc(id);
    return findById(id);
  };
  window._atcVer=function(id){ var p=findById(id), a=atcDe(p)||{};
    return { fecha:p.fecha, turno:p.turno, pdev:a.pdev||'', pturno:a.pturno||'', ent:a.ent||'', rf:a.rf||'',
             enDev:atcEnDevolucion(p), chip:atcChip(p).replace(/<[^>]+>/g,''), estado:atcEstado(p),
             recFabDesde:atcRecogerFabDesde(p), alertaHoy:atcRecogerFabPend(p, todayStr()) }; };
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

  // ═══ 1. La devolución de una ATC se mueve con el viaje ═══════════════════════════════
  console.log('\n── 1. ATC con la devolución programada: moverla por cualquier camino mueve la devolución ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={};
      // (a) 📅 Reprogramar desde la ficha de carga: del viernes 25 AM al lunes 28 PM
      _atcConDev('a1','2026-09-25','AM');
      out.antes=_atcVer('a1');
      MODAL_KIND='carga'; reprogramarPedido('a1'); REPRO.fecha='2026-09-28'; REPRO.turno='PM'; reproConfirmar();
      out.repro=_atcVer('a1');
      out.guardado=(function(){ var s=window._saves[window._saves.length-1]; var a=(s&&s.rec&&atcDe(s.rec))||{}; return {fecha:s&&s.rec.fecha, pdev:a.pdev||''}; })();
      // …y el lunes el chofer la tilda ✅: la ATC queda cerrada
      choEntregado('a1');
      out.entregada=_atcVer('a1');
      // (b) el turno desde la ficha de carga (🌅/🌆): la devolución cambia de turno también
      _atcConDev('b1','2026-09-25','AM');
      cambiarTurno('b1','PM');
      out.turno=_atcVer('b1');
      // (c) ✏️ Editar desde el formulario, cambiando la fecha
      _atcConDev('c1','2026-09-25','AM');
      EDIT_DESDE='admin'; editPedido('c1');
      await new Promise(function(r){ setTimeout(r,250); });
      document.getElementById('f-fecha').value='2026-09-29'; segSet('f-turno','AM');
      submitPedido();
      await new Promise(function(r){ setTimeout(r,400); });
      out.form=_atcVer('c1');
      // (d) control: una ATC SIN devolución (su viaje es el RECOJO) se reprograma como siempre
      STATE.push(_P({id:'d1', oc:'ATC 09-099', fecha:'2026-09-25', cliente:'RECOJO', productos:[{desc:'SOFT',cant:1,atc:{mot:'Ruido'}}]}));
      MODAL_KIND='carga'; reprogramarPedido('d1'); REPRO.fecha='2026-09-28'; REPRO.turno='AM'; reproConfirmar();
      var d=findById('d1'); out.recojo={fecha:d.fecha, pdev:(atcDe(d)||{}).pdev||'', recogida:atcRecogida(d), chip:atcChip(d).replace(/<[^>]+>/g,'')};
      return out;
    }, BASE);
    chk('punto de partida: la devolución del viernes 25 AM vive en su día y el chofer la ve como «🔁 devolución»',
        r.antes.fecha==='2026-09-25' && r.antes.pdev==='2026-09-25' && r.antes.enDev && /devolución/.test(r.antes.chip), J(r.antes));
    chk('⚠️ 📅 Reprogramar al lunes 28 PM mueve también la devolución (antes quedaba en el viernes 25 AM)',
        r.repro.fecha==='2026-09-28' && r.repro.pdev==='2026-09-28' && r.repro.pturno==='PM', J(r.repro));
    chk('⚠️ …y el chofer la sigue viendo como «🔁 ATC · devolución», no como un recojo «🎧 ATC»',
        r.repro.enDev===true && /devolución/.test(r.repro.chip), r.repro.chip);
    chk('⚠️ …el aviso «🏭 Recoger de fábrica» cuenta desde el día nuevo (vie 25 = 2 hábiles antes del lun 28) y hoy todavía no suena',
        r.repro.recFabDesde==='2026-09-25' && r.repro.alertaHoy===false, J([r.repro.recFabDesde, r.repro.alertaHoy]));
    chk('…y la planilla recibe la devolución en el día nuevo', r.guardado.fecha==='2026-09-28' && r.guardado.pdev==='2026-09-28', J(r.guardado));
    chk('⚠️ el ✅ del chofer en el día nuevo CIERRA la ATC (antes quedaba abierta para siempre)',
        r.entregada.ent==='2026-09-28' && r.entregada.estado==='cerrada', J(r.entregada));
    chk('⚠️ cambiar el turno desde la ficha de carga cambia el turno de la devolución',
        r.turno.turno==='PM' && r.turno.pturno==='PM' && r.turno.pdev==='2026-09-25' && r.turno.enDev, J(r.turno));
    chk('⚠️ ✏️ Editar cambiando la fecha también se lleva la devolución (martes 29)',
        r.form.fecha==='2026-09-29' && r.form.pdev==='2026-09-29' && r.form.enDev && /devolución/.test(r.form.chip), J(r.form));
    chk('control: una ATC que todavía es el RECOJO se reprograma igual que siempre, sin inventarle devolución',
        r.recojo.fecha==='2026-09-28' && r.recojo.pdev==='' && r.recojo.recogida==='2026-09-28' && !/devolución/.test(r.recojo.chip), J(r.recojo));
    await page.close();
  }

  // ═══ 2. Tildar y destildar la devolución no deja nada puesto ═════════════════════════
  console.log('\n── 2. ✅ sin querer y ✅ de nuevo: la ATC vuelve exactamente a como estaba ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base);
      STATE=[]; var out={};
      _atcConDev('e1','2026-09-25','AM');
      out.antes=_atcVer('e1'); out.bloqueAntes=recogerFabPendientes(todayStr()).length;
      choEntregado('e1'); out.tildada=_atcVer('e1');
      choEntregado('e1'); out.destildada=_atcVer('e1'); out.bloqueDespues=recogerFabPendientes(todayStr()).length;
      // control: si logística SÍ la trajo de la fábrica (✓ Recogido), el ✅ y su vuelta no se lo borran
      _atcConDev('f1','2026-09-25','AM');
      marcarRecogidoFab('f1');
      var rfMano=(atcDe(findById('f1'))||{}).rf||'';
      choEntregado('f1'); choEntregado('f1');
      out.aMano={rfMano:rfMano, despues:_atcVer('f1')};
      // y desde la tabla de Administración (🚚 de la fila) pasa lo mismo que en la ficha del chofer
      _atcConDev('g1','2026-09-25','AM');
      quickEntregado('g1'); quickEntregado('g1');
      out.tabla=_atcVer('g1');
      return out;
    }, BASE);
    chk('punto de partida: el viernes 25 hay que ir a buscarla a la fábrica y hoy (2 hábiles antes) suena el aviso',
        r.antes.rf==='' && r.antes.alertaHoy===true && r.antes.estado==='recogerfab' && r.bloqueAntes===1, J(r.antes));
    chk('el ✅ la cierra y anota solo el «recogido de fábrica», como siempre',
        r.tildada.ent==='2026-09-25' && r.tildada.rf==='2026-09-25' && r.tildada.estado==='cerrada', J(r.tildada));
    chk('⚠️ al destildar el «recogido de fábrica» que puso el ✅ se va (antes quedaba y apagaba el aviso)',
        r.destildada.ent==='' && r.destildada.rf==='', J(r.destildada));
    chk('⚠️ …y el aviso «🏭 Recoger de fábrica» vuelve a sonar para logística',
        r.destildada.alertaHoy===true && r.destildada.estado==='recogerfab' && r.bloqueDespues===1, J([r.destildada.estado, r.bloqueDespues]));
    chk('control: el «✓ Recogido» que puso logística a mano sobrevive al ✅ y su vuelta',
        !!r.aMano.rfMano && r.aMano.despues.rf===r.aMano.rfMano && r.aMano.despues.ent==='', J(r.aMano));
    chk('⚠️ lo mismo desde el 🚚 de la tabla de Administración', r.tabla.rf==='' && r.tabla.alertaHoy===true, J(r.tabla));
    await page.close();
  }

  // ═══ 3. Programar la devolución respeta los días del camión ══════════════════════════
  console.log('\n── 3. 🔁 Programar la devolución: sábado solo AM (15), domingo cerrado, día cerrado y turno lleno ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base);
      STATE=[]; var out={};
      window._confirms=[]; window._resp=false;
      confirm=function(m){ window._confirms.push(String(m)); return window._resp; };
      var recogida=function(id){ STATE=STATE.filter(function(p){ return p.id!==id; });
        STATE.push(_P({id:id, oc:'ATC 09-1'+id.length, fecha:'2026-09-21', entregado:true, cliente:'CLIENTE '+id,
          productos:[{desc:'SOFT', cant:1, atc:{mot:'Ruido'}}]})); saveMirror(); };
      var programar=function(id, f, t){ window._confirms=[]; window._saves=[];
        abrirProgramarDevAtc(id); document.getElementById('pdev-fecha').value=f; segSet('pdev-turno',t);
        guardarProgramarDevAtc(id);
        var p=findById(id), a=atcDe(p)||{}, s=window._saves[window._saves.length-1];
        return { fecha:p.fecha, pdev:a.pdev||'', confirms:window._confirms.slice(), mandado:window._saves.length, forzar:!!(s&&s.opts&&s.opts.forzar) }; };
      recogida('s1');
      abrirProgramarDevAtc('s1');
      out.txtSabado=abrirProgramarDevAtc._cupos('2026-09-26').replace(/<[^>]+>/g,'');
      out.txtDomingo=abrirProgramarDevAtc._cupos('2026-09-27').replace(/<[^>]+>/g,'');
      out.txtJueves=abrirProgramarDevAtc._cupos('2026-09-24').replace(/<[^>]+>/g,'');
      closeModal();
      // sábado a la tarde: se avisa, y si dicen que no, no se programa nada
      out.sabPMno=programar('s1','2026-09-26','PM');
      // …y si confirman (administración decide, como en 📅 Reprogramar), va con `forzar`
      window._resp=true; out.sabPMsi=programar('s1','2026-09-26','PM');
      window._resp=false; recogida('d1'); out.domingo=programar('d1','2026-09-27','AM');
      DIAS_CERRADOS=['2026-09-25']; recogida('c1'); out.cerrado=programar('c1','2026-09-25','AM');
      DIAS_CERRADOS=[];
      // control: un jueves con lugar se programa sin preguntar nada y sin forzar
      recogida('j1'); out.jueves=programar('j1','2026-09-24','AM');
      return out;
    }, BASE);
    chk('⚠️ el cartel de cupos del SÁBADO dice que entran 15 a la mañana y que no hay tarde (antes «de 12 · PM de 13»)',
        /de 15/.test(r.txtSabado) && !/de 13/.test(r.txtSabado) && /no hay/i.test(r.txtSabado), r.txtSabado);
    chk('⚠️ …y el del DOMINGO, que no se entrega', /domingo/i.test(r.txtDomingo) && !/de 12/.test(r.txtDomingo), r.txtDomingo);
    chk('control: un día hábil sigue diciendo 12 y 13', /de 12/.test(r.txtJueves) && /de 13/.test(r.txtJueves), r.txtJueves);
    chk('⚠️ programar un SÁBADO PM avisa antes (antes decía «✓ programada» y el servidor lo rechazaba como «turno lleno»)',
        r.sabPMno.confirms.length===1 && /SÁBADO/.test(r.sabPMno.confirms[0]), J(r.sabPMno.confirms));
    chk('…y si dicen que no, la ATC queda como estaba y no se manda nada', r.sabPMno.pdev==='' && r.sabPMno.fecha==='2026-09-21' && r.sabPMno.mandado===0, J(r.sabPMno));
    chk('…y si administración confirma, se programa y va con `forzar` (el portero la dejaría afuera)', r.sabPMsi.pdev==='2026-09-26' && r.sabPMsi.forzar===true, J(r.sabPMsi));
    chk('⚠️ el DOMINGO también avisa y no programa sin confirmar', r.domingo.confirms.length===1 && /DOMINGO/.test(r.domingo.confirms[0]) && r.domingo.pdev==='', J(r.domingo));
    chk('⚠️ un día CERRADO también', r.cerrado.confirms.length===1 && /CERRADO/.test(r.cerrado.confirms[0]) && r.cerrado.pdev==='', J(r.cerrado));
    chk('control: un jueves con lugar se programa como siempre, sin preguntar y sin forzar',
        r.jueves.confirms.length===0 && r.jueves.pdev==='2026-09-24' && r.jueves.forzar===false && r.jueves.mandado===1, J(r.jueves));
    await page.close();
  }

  // ═══ 4. El chofer no cobra una ATC ni una RPT ═══════════════════════════════════════
  console.log('\n── 4. 🎧🏪 En la puerta: ni una ATC ni una RPT se cobran (§4fy), tampoco con «➕ Cobré algo igual» ──');
  {
    const page = await nueva(null, 380);
    const r = await page.evaluate(async (base) => {
      eval(base);
      var hoy=todayStr();
      STATE=[ _P({id:'atc', fecha:hoy, oc:'ATC 09-001', cliente:'CLIENTE ATC', productos:[{desc:'SOFT',cant:1,atc:{mot:'Cotización'}}]}),
              _P({id:'rpt', fecha:hoy, oc:'RPT 09-002', cliente:'Buenos Aires', entregado:true, productos:[{desc:'SOFT',cant:3,rtipo:'Reposición'}]}),
              /* control: una VENTA a la que nadie le anotó el monto — ahí sí hay que preguntar */
              _P({id:'deb', fecha:hoy, oc:'09-011', cliente:'CLIENTE DEB', productos:[{desc:'SOFT',cant:1}]}) ];
      saveMirror();
      var out={};
      // lo que le dicen al chofer de la plata: hoja de ruta (pantalla y WhatsApp), «Entregado» y la ficha
      out.rutaTxt={atc:cobroRutaTxt(findById('atc')).t, rpt:cobroRutaTxt(findById('rpt')).t, deb:cobroRutaTxt(findById('deb')).t};
      var wa=''; window.open=function(u){ wa=decodeURIComponent(String(u)); return null; }; copyText=function(){};
      abrirRuta(); setRutaDia('hoy'); out.rutaPantalla=(document.getElementById('ruta-body')||{}).textContent.replace(/\s+/g,' ');
      rutaWhatsapp(0); closeRuta(); out.rutaWA=wa;
      ENTREGAS_FECHA=hoy; abrirEntregas();
      out.entregas={}; [].forEach.call(document.querySelectorAll('#entregas-body .ent-card'), function(c){ var t=c.textContent.replace(/\s+/g,' ');
        out.entregas[/RPT 09-002/.test(t)?'rpt':/ATC 09-001/.test(t)?'atc':/CLIENTE DEB/.test(t)?'deb':'otro']=t; });
      closeEntregas();
      showPedidoModal('rpt'); out.fichaRpt=((document.getElementById('modal-box')||{}).textContent.replace(/\s+/g,' ').match(/Cobro.{0,30}/)||[''])[0]; closeModal();
      showPedidoModal('deb'); out.fichaDeb=((document.getElementById('modal-box')||{}).textContent.replace(/\s+/g,' ').match(/Cobro.{0,30}/)||[''])[0]; closeModal();
      // la tarjeta del chofer
      showView('chofer'); llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('hoy');
      await new Promise(function(r){ setTimeout(r,150); });
      var tarj={};
      [].forEach.call(document.querySelectorAll('#cho-lista .cho-card'), function(c){ var t=c.textContent.replace(/\s+/g,' '); tarj[/CLIENTE ATC/.test(t)?'atc':/Buenos Aires/.test(t)?'rpt':/CLIENTE DEB/.test(t)?'deb':'otro']=t; });
      out.atcOfrece=/Cobré algo igual/.test(tarj.atc||''); out.rptOfrece=/Cobré algo igual/.test(tarj.rpt||''); out.debOfrece=/Cobré algo igual/.test(tarj.deb||'');
      out.atcTxt=((tarj.atc||'').match(/Cobrar.{0,70}/)||[''])[0]; out.rptTxt=((tarj.rpt||'').match(/Cobrar.{0,70}/)||[''])[0];
      // y si igual se llama al cobro (un botón viejo en pantalla)
      window._toasts=[];
      choCobrarMetodo('atc','Efectivo'); choCobrarMetodo('rpt','QR');
      out.atc=findById('atc').metodoPago; out.rpt=findById('rpt').metodoPago; out.avisos=window._toasts.slice();
      // control: en una venta el chofer sigue pudiendo anotar lo que le dieron
      choCobrarMetodo('deb','Efectivo'); out.deb=findById('deb').metodoPago;
      return out;
    }, BASE);
    chk('⚠️ la tarjeta de una ATC ya no manda a preguntar por la plata ni ofrece «➕ Cobré algo igual»', r.atcOfrece===false && !/Sin monto anotado/i.test(r.atcTxt) && /no se cobra/i.test(r.atcTxt), r.atcTxt);
    chk('⚠️ …ni la de una reposición de tienda', r.rptOfrece===false && !/Sin monto anotado/i.test(r.rptTxt), r.rptTxt);
    chk('⚠️ y si igual se llama al cobro, no se anota nada y se dice por qué (Contabilidad no lo vería nunca)',
        r.atc==='' && r.rpt==='' && r.avisos.some(function(t){ return /no se cobra/.test(t); }), J([r.atc, r.rpt, r.avisos]));
    chk('control: en una venta sin monto el chofer sigue viendo el botón y puede anotar lo que le dieron', r.debOfrece===true && /Efectivo 300/.test(r.deb), r.deb);
    chk('⚠️ la hoja de ruta ya no dice «SIN MONTO ANOTADO — preguntar antes de entregar» en una ATC ni en una RPT',
        !/SIN MONTO/.test(r.rutaTxt.atc) && !/SIN MONTO/.test(r.rutaTxt.rpt) && /no se cobra/i.test(r.rutaTxt.rpt), J(r.rutaTxt));
    chk('control: en una VENTA sin monto la hoja de ruta sigue mandando a preguntar', /SIN MONTO ANOTADO/.test(r.rutaTxt.deb), r.rutaTxt.deb);
    chk('⚠️ …ni en la pantalla de la ruta ni en el WhatsApp para el chofer (salvo la venta sin monto: una sola vez)',
        (r.rutaPantalla.match(/SIN MONTO/g)||[]).length===1 && (r.rutaWA.match(/SIN MONTO/g)||[]).length===1, J([(r.rutaPantalla.match(/SIN MONTO/g)||[]).length, (r.rutaWA.match(/SIN MONTO/g)||[]).length]));
    chk('⚠️ «Entregado» no pinta la reposición entregada ni la ATC pendiente como «SIN MONTO ANOTADO»',
        !!r.entregas.rpt && !/SIN MONTO/.test(r.entregas.rpt) && !!r.entregas.atc && !/SIN MONTO/.test(r.entregas.atc), J([r.entregas.rpt, r.entregas.atc]).slice(0,260));
    chk('control: la venta sin monto sí sigue marcada en «Entregado»', /SIN MONTO/.test(r.entregas.deb||''), (r.entregas.deb||'').slice(0,120));
    chk('⚠️ la ficha de Administración de la RPT dice que no se cobra', /no se cobra/i.test(r.fichaRpt) && !/SIN MONTO/.test(r.fichaRpt), r.fichaRpt);
    chk('control: la ficha de una venta sin monto sigue diciendo «SIN MONTO ANOTADO»', /SIN MONTO/.test(r.fichaDeb), r.fichaDeb);
    await page.close();
  }

  // ═══ 5. Con un turno forzado de más, los avisos dicen cuántos hay (§4fh) ══════════════
  console.log('\n── 5. 13 pedidos en un turno de 12: los otros tres avisos también cuentan, no repiten el límite ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var vie='2026-09-25'; STATE=[];
      for(var i=0;i<13;i++) STATE.push(_P({id:'f'+i, fecha:vie, turno:'AM', cliente:'FORZADO '+i, nroDia:i+1}));
      STATE.push(_P({id:'tarde', fecha:vie, turno:'PM', cliente:'EL DE LA TARDE'}));
      STATE.push(_P({id:'otro', fecha:'2026-09-24', turno:'AM', cliente:'OTRO DIA'}));
      saveMirror();
      var out={};
      window._toasts=[]; cambiarTurno('tarde','AM'); out.turno=window._toasts.slice();
      out.repro=reproAvisos(findById('otro'), vie, 'AM');
      // el formulario: un pedido NUEVO para el viernes a la mañana
      showView('form'); resetForm();
      document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
      document.getElementById('f-cliente').value='NUEVO'; document.getElementById('f-celular').value='70000000';
      document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av. X'; document.getElementById('f-nota').value='77';
      document.getElementById('f-fecha').value=vie; segSet('f-turno','AM');
      var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='SOFT ICE';
      var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190';
      var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
      window._toasts=[]; submitPedido();
      await new Promise(function(r){ setTimeout(r,300); });
      out.form=window._toasts.filter(function(t){ return /lleno/.test(t); });
      out.nuevoEntro=STATE.some(function(p){ return p.cliente==='NUEVO'; });
      return out;
    }, BASE);
    chk('⚠️ pasar un pedido al turno AM ya forzado: el aviso dice «(13/12)», no «(12/12)»', r.turno.some(function(t){ return /\(13\/12\)/.test(t); }) && !r.turno.some(function(t){ return /\(12\/12\)/.test(t); }), J(r.turno));
    chk('⚠️ 📅 Reprogramar a ese turno: el aviso también cuenta', r.repro.some(function(t){ return /\(13\/12\)/.test(t); }), J(r.repro));
    chk('⚠️ el formulario que no deja cargar un pedido nuevo también', r.form.some(function(t){ return /\(13\/12\)/.test(t); }) && !r.nuevoEntro, J(r.form));
    await page.close();
  }

  // ═══ 6. Administración: «por cobrar» no cuenta lo que no se cobra ════════════════════
  console.log('\n── 6. 💰 Administración: las ATC y las RPT no son «por cobrar» (chip, ficha y resumen) ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var hoy=todayStr();
      STATE=[ _P({id:'atc', fecha:hoy, oc:'ATC 09-001', cliente:'CLIENTE ATC', productos:[{desc:'SOFT',cant:1,atc:{mot:'Ruido'}}]}),
              _P({id:'rpt', fecha:hoy, oc:'RPT 09-002', cliente:'Buenos Aires', productos:[{desc:'SOFT',cant:3,rtipo:'Reposición'}]}),
              _P({id:'deb', fecha:hoy, oc:'09-011', cliente:'DEBE', saldo:700, acuenta:300}),
              _P({id:'pag', fecha:hoy, oc:'09-012', cliente:'PAGADA', pagado:true, metodoPago:'Efectivo 900 @'+hoy+' #55'}) ];
      saveMirror();
      showView('admin'); await new Promise(function(r){ setTimeout(r,150); });
      segSet('adm-mode','dia'); document.getElementById('adm-dia').value=hoy; QUICK_FILTER=''; renderAdmin();
      return { mini:RESUMEN_MINI, chip:admBaseList().filter(quickTest('cobrar')).map(function(p){ return p.cliente; }),
               fichas:(document.getElementById('adm-metrics')||{}).textContent.replace(/\s+/g,' '),
               metodos:((document.getElementById('adm-metodos')||{}).textContent.match(/Por cobrar: ?\d+/)||[''])[0] };
    }, BASE);
    chk('⚠️ el chip «💰 Por cobrar» trae solo la venta que debe (antes también la ATC y la RPT)', J(r.chip)===J(['DEBE']), J(r.chip));
    chk('⚠️ la ficha «Por cobrar» y el resumen plegado cuentan 1, no 3', /Por cobrar ?1 ?pedidos pendientes/.test(r.fichas) && /1 por cobrar/.test(r.mini) && /Por cobrar: ?1$/.test(r.metodos), J([r.mini, r.metodos]));
    chk('control: el total de pedidos y los pagados no cambian', /Pedidos4/.test(r.fichas) && /Pagados1/.test(r.fichas) && /^4 pedidos/.test(r.mini), r.fichas.slice(0,90));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores.slice(0,3)));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
