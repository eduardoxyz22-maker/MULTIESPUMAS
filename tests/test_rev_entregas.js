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

  chk('sin errores JS', errores.length===0, J(errores.slice(0,3)));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
