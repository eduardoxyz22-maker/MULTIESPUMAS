/* 🎧🚚 CUARTA REVISIÓN (26/09/2026) — pendientes CONFIRMADOS de §4gc que Codex pidió priorizar.
   Cada sección dice qué pasaba.

   1. 🎧 Mover una ATC cuya devolución YA SE ENTREGÓ (📅 Reprogramar, el turno de la ficha de carga,
      ✏️ Editar) dejaba `pdev` en el día viejo: el chip volvía a «🎧 ATC» (el de un recojo) y, si después
      se destildaba el ✅, la ATC no se reabría — «✅ Entregada» en la pestaña ATC y «⏳ Pendiente» para
      el chofer. El `antes` de `atcSeguirViaje` salía de `atcEnDevolucion`, que da falso con el ✅ puesto.

   Reloj clavado en el miércoles 23/09/2026 10:00 de Bolivia: las fechas no se pudren.
   Red cortada, servidor simulado (la planilla vive en `window.SRV`), datos sintéticos (el repo es público).
   Se corre:  node tests/test_rev4_atc_flete.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev4_atc_flete.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,320)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MIERCOLES = '2026-09-23T10:00:00-04:00';

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  /* Los diálogos se contestan desde Node (un evaluate dentro del handler se cuelga). */
  const D = { confirm:true, vistos:[] };
  const nueva = async (ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', async d=>{ D.vistos.push(d.type()+': '+d.message()); if(d.type()==='prompt') await d.accept(''); else if(D.confirm===false) await d.dismiss(); else await d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
      document.getElementById('admin-lock').style.display='none';
      document.getElementById('admin-content').style.display='block';
      try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      /* El servidor: guardar sella la fila y la deja en `SRV`; listar la devuelve. */
      window.SRV=[]; window._saves=[];
      apiPost=function(b){
        if(b.action==='save'){
          var c=JSON.parse(JSON.stringify(b.pedido)); c.rev=(Number(c.rev)||0)+1;
          window._saves.push(JSON.parse(JSON.stringify(c)));
          window.SRV=window.SRV.filter(function(x){ return x.id!==c.id; }).concat([c]);
          return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(c))});
        }
        if(b.action==='delete'){ window.SRV=window.SRV.filter(function(x){ return x.id!==b.id; }); return Promise.resolve({ok:true}); }
        if(b.action==='list') return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))});
        return Promise.resolve({ok:true});
      };
      apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))}); },0); }); };
      apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
      // La imagen «subida»: sin red, el achicado y la subida se simulan (el resto es el camino real).
      fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
      window.__FOTO='F0';
      subirFoto=function(){ return Promise.resolve({ok:true, fotoId:window.__FOTO}); };
      window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
      window.espera=function(ms){ return new Promise(function(r){ setTimeout(r, ms||60); }); };
      window.P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:todayStr(), oc:'', nota:'', vendedor:'Carola Chavez',
        cliente:'C', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Av. Banzer 123', maps:'https://www.google.com/maps?q=-17.7,-63.1',
        pagado:false, saldo:0, acuenta:0, metodoPago:'', ts:Date.parse('2026-09-20T10:00:00-04:00'), observaciones:'', estado:'', entregado:false,
        vehiculo:'Foton nuevo', chofer:'Luis Pierre', garantia:'', facturarA:'', nit:'1', nroDia:1, verificado:true, fotos:[],
        productos:[{desc:'COLCHON SOFT', medida:'140x190', cant:1}] }, o); };
      // Carga la planilla como quien entra (se relee: `cobradoBs` no viaja, §4fg).
      window.cargar=async function(filas){
        closeModal();
        window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
        STATE=[]; RETIROS=[];
        SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
        await refrescarEstado();
      };
      // El botón de la ficha cuyo onclick llama a `fn` (y, si se dice, con ese texto).
      window.boton=function(fn, txt){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){
        return new RegExp(fn).test(b.getAttribute('onclick')||'') && (txt==null || txt.test(b.textContent)); })[0]||null; };
      window.tipear=function(o){ for(var id in o){ var e=document.getElementById(id); if(e) e.value=o[id]; } };
      // Sube una imagen al pago que se está por registrar, por el camino de 📎 (sin red).
      window.subir=function(id, fid){ window.__FOTO=fid; ctaAdjuntar(id);
        return onCompElegido({ target:{ files:[new Blob(['x'],{type:'image/jpeg'})], dataset:{pedido:id} } }) || espera(30); };
      window.txt=function(el){ return el ? el.textContent.replace(/\s+/g,' ').trim() : ''; };
    });
    return page;
  };

  // ═══ 1. 🎧 La devolución YA ENTREGADA se mueve con el viaje y destildar la reabre ═══════════
  console.log('\n── 1. 🎧 Mover una devolución YA ENTREGADA: sigue siendo la devolución, y destildar el ✅ la reabre ──');
  {
    const page = await nueva();
    D.confirm=true;
    const r = await page.evaluate(async () => {
      var atc=function(id, fecha, turno, entregado){ return P({ id:id, oc:'ATC 09-0'+id.slice(-2), cliente:'CLIENTE '+id, fecha:fecha, turno:turno, entregado:!!entregado,
        productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:{mot:'Hundimiento'}}] }); };
      await cargar([ atc('A11','2026-09-21','AM',true), atc('A12','2026-09-21','AM',true), atc('A13','2026-09-21','AM',true),
                     atc('A14','2026-09-22','PM',true), atc('A15','2026-09-21','AM',true) ]);
      var programar=function(id, f, t){ abrirProgramarDevAtc(id); document.getElementById('pdev-fecha').value=f; segSet('pdev-turno', t); guardarProgramarDevAtc(id); };
      var ver=function(id){ var p=findById(id), a=atcDe(p)||{};
        return { fecha:p.fecha, turno:normTurno(p.turno), entregado:!!p.entregado, pdev:a.pdev||'', pturno:a.pturno||'', ent:a.ent||'', rf:a.rf||'',
                 rec:atcRecogida(p), estado:atcEstado(p), chip:atcChip(p).replace(/<[^>]+>/g,'') }; };
      var enSrv=function(id){ var s=window.SRV.filter(function(x){ return x.id===id; })[0], a=(s&&atcDe(s))||{};
        return { fecha:s?s.fecha:'', entregado:!!(s&&s.entregado), pdev:a.pdev||'', pturno:a.pturno||'', ent:a.ent||'' }; };
      var out={};
      // Las tres: recogidas el lunes 21, devolución HOY a la tarde, y el chofer la entregó ✅.
      ['A11','A12','A13'].forEach(function(id){ programar(id,'2026-09-23','PM'); choEntregado(id); });
      await espera(100);
      out.entregada=ver('A11');
      // (a) 📅 Reprogramar desde la ficha de carga al viernes 25 AM
      MODAL_KIND='carga'; reprogramarPedido('A11'); REPRO.fecha='2026-09-25'; REPRO.turno='AM'; reproConfirmar();
      await espera(100);
      out.repro=ver('A11'); out.reproSrv=enSrv('A11');
      // …no se la había entregado: el chofer destilda el ✅ (confirmando)
      closeModal(); choEntregado('A11'); await espera(100);
      out.reproDestildada=ver('A11'); out.reproDestildadaSrv=enSrv('A11');
      // …y así la ven todos: la pestaña ATC, la ficha del chofer y el bloque «🏭 Recoger de fábrica»
      showViewAhora('atc'); segSet('atc-mode','todo'); renderAtc();
      var th=[].map.call(document.querySelectorAll('#tbl-atc thead th'), function(x){ return x.textContent.trim(); });
      var fila=[].filter.call(document.querySelectorAll('#tbl-atc tbody tr'), function(tr){ return tr.textContent.indexOf('CLIENTE A11')>=0; })[0];
      out.matriz = fila ? { estado:txt(fila.children[th.indexOf('Estado')]), alCliente:txt(fila.children[th.indexOf('✅ Al cliente')]) } : null;
      showView('chofer'); await espera(150);
      llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('todos');
      var card=[].filter.call(document.querySelectorAll('#cho-lista .cho-card'), function(c){ return c.textContent.indexOf('CLIENTE A11')>=0; })[0];
      out.tarjeta=card?txt(card):'(no está)';
      out.bloqueA11=txt((function(){ var d=document.createElement('div'); d.innerHTML=recogerFabHtml(todayStr()); return d; })());
      // (b) el turno desde la ficha de carga (🌅): la devolución de la tarde pasa a la mañana
      cambiarTurno('A12','AM'); await espera(100);
      out.turno=ver('A12'); out.turnoSrv=enSrv('A12');
      closeModal(); choEntregado('A12'); await espera(100);
      out.turnoDestildada=ver('A12');
      var bl=document.createElement('div'); bl.innerHTML=recogerFabHtml(todayStr());
      var renglon=[].filter.call(bl.querySelectorAll('div'), function(d){ return /CLIENTE A12/.test(d.textContent) && !/CLIENTE A11/.test(d.textContent); }).pop();
      out.bloqueA12=txt(renglon);
      // (c) ✏️ Editar cambiando la fecha al lunes 28 AM
      closeModal(); EDIT_DESDE='admin'; editPedido('A13'); await espera(250);
      document.getElementById('f-fecha').value='2026-09-28'; segSet('f-turno','AM');
      submitPedido(); await espera(600);
      out.form=ver('A13'); out.formSrv=enSrv('A13');
      closeModal(); quickEntregado('A13'); await espera(100);          // destildar desde la tabla de Administración
      out.formDestildada=ver('A13');
      // (d) control: un RECOJO tildado (sin devolución programada) se mueve sin que le aparezca una devolución
      MODAL_KIND='carga'; reprogramarPedido('A14'); REPRO.fecha='2026-09-24'; REPRO.turno='AM'; reproConfirmar(); await espera(100);
      out.recojo=ver('A14');
      // (e) control: una devolución SIN entregar se sigue moviendo como siempre (§4ga)
      programar('A15','2026-09-25','AM'); await espera(60);
      closeModal(); MODAL_KIND='carga'; reprogramarPedido('A15'); REPRO.fecha='2026-09-29'; REPRO.turno='PM'; reproConfirmar(); await espera(100);
      out.sinEntregar=ver('A15');
      // (f) control: «↺ Quitar la devolución» después de todo vuelve al recojo del lunes 21 AM, con su ✅
      closeModal(); quitarProgramarDevAtc('A11'); await espera(100);
      out.quitada=ver('A11');
      return out;
    });
    chk('punto de partida: la devolución de hoy, entregada ✅, está cerrada y sigue diciendo «devolución»',
        r.entregada.estado==='cerrada' && r.entregada.ent==='2026-09-23' && r.entregada.entregado && /devolución/.test(r.entregada.chip), J(r.entregada));
    chk('⚠️ 📅 Reprogramar al viernes 25 AM se lleva la devolución (antes `pdev` quedaba en el 23 y el chip volvía a «🎧 ATC»)',
        r.repro.fecha==='2026-09-25' && r.repro.pdev==='2026-09-25' && r.repro.pturno==='AM' && /devolución/.test(r.repro.chip), J(r.repro));
    chk('⚠️ …y a la planilla va la devolución en el día nuevo', r.reproSrv.fecha==='2026-09-25' && r.reproSrv.pdev==='2026-09-25', J(r.reproSrv));
    chk('⚠️ destildar el ✅ en el día nuevo REABRE la ATC (antes quedaba «✅ Entregada» con el chofer en «⏳ Pendiente»)',
        r.reproDestildada.ent==='' && r.reproDestildada.estado!=='cerrada' && r.reproDestildada.entregado===false && /devolución/.test(r.reproDestildada.chip), J(r.reproDestildada));
    chk('⚠️ …y se va también el «recogido de fábrica» que había puesto el ✅ (rfAuto, §4ga): hay que ir a buscarla',
        r.reproDestildada.rf==='' && r.reproDestildada.estado==='recogerfab', J(r.reproDestildada));
    chk('⚠️ …y la planilla la recibe reabierta', r.reproDestildadaSrv.ent==='' && r.reproDestildadaSrv.entregado===false && r.reproDestildadaSrv.pdev==='2026-09-25', J(r.reproDestildadaSrv));
    chk('⚠️ la pestaña ATC ya no la da por «✅ Entregada» y la columna «✅ Al cliente» queda vacía',
        !!r.matriz && !/Entregada/.test(r.matriz.estado) && /Recoger de fábrica/.test(r.matriz.estado) && r.matriz.alCliente==='—', J(r.matriz));
    chk('⚠️ la ficha del chofer: «⏳ Pendiente» y «🔁 ATC · devolución»', /Pendiente/.test(r.tarjeta) && /ATC · devolución/.test(r.tarjeta) && !/✓ Entregado/.test(r.tarjeta), r.tarjeta.slice(0,200));
    chk('⚠️ …y logística la ve en «🏭 Recoger de fábrica» para el viernes 25', /CLIENTE A11/.test(r.bloqueA11) && /se entrega el 25\/09 AM/.test(r.bloqueA11), r.bloqueA11.slice(0,220));
    chk('⚠️ cambiar el turno desde la ficha de carga cambia el turno de la devolución entregada (antes quedaba PM)',
        r.turno.turno==='AM' && r.turno.pturno==='AM' && r.turno.pdev==='2026-09-23' && /devolución/.test(r.turno.chip) && r.turnoSrv.pturno==='AM', J([r.turno, r.turnoSrv]));
    chk('⚠️ …destildada, se reabre y el aviso de fábrica dice el turno nuevo («23/09 AM»)',
        r.turnoDestildada.ent==='' && r.turnoDestildada.estado!=='cerrada' && /se entrega el 23\/09 AM/.test(r.bloqueA12), J([r.turnoDestildada.estado, r.bloqueA12]));
    chk('⚠️ ✏️ Editar cambiando la fecha (lunes 28 AM) se lleva la devolución entregada, también a la planilla',
        r.form.fecha==='2026-09-28' && r.form.pdev==='2026-09-28' && r.form.pturno==='AM' && /devolución/.test(r.form.chip) && r.formSrv.pdev==='2026-09-28', J([r.form, r.formSrv]));
    chk('⚠️ …y destildarla desde la tabla de Administración la reabre', r.formDestildada.ent==='' && r.formDestildada.entregado===false && r.formDestildada.estado!=='cerrada', J(r.formDestildada));
    chk('control: un RECOJO tildado se reprograma sin inventarle devolución (sigue «🎧 ATC»)',
        r.recojo.fecha==='2026-09-24' && r.recojo.pdev==='' && r.recojo.rec==='2026-09-24' && !/devolución/.test(r.recojo.chip), J(r.recojo));
    chk('control: una devolución SIN entregar se sigue moviendo con el viaje (§4ga)',
        r.sinEntregar.fecha==='2026-09-29' && r.sinEntregar.pdev==='2026-09-29' && r.sinEntregar.pturno==='PM', J(r.sinEntregar));
    chk('control: «↺ Quitar la devolución» vuelve al recojo del lunes 21 AM, ya recogido, sin devolución',
        r.quitada.fecha==='2026-09-21' && r.quitada.turno==='AM' && r.quitada.entregado===true && r.quitada.pdev==='', J(r.quitada));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
