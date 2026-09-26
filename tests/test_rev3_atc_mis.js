/* 🎧📋 TERCERA REVISIÓN: 🎧 ATC Y 📋 MIS PEDIDOS (26/09/2026) — lo que había quedado reportado en
   §4gb y en las revisiones de esas dos pestañas. Cada sección dice qué pasaba.

   Reloj clavado en el miércoles 23/09/2026 10:00 de Bolivia: las fechas no se pudren.
   Red cortada, servidor simulado, datos sintéticos (el repo es público).
   Se corre:  node tests/test_rev3_atc_mis.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev3_atc_mis.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
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
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'https://www.google.com/maps?q=-17.7,-63.1',pagado:false,saldo:0,
    ts:Date.parse('2026-09-20T10:00:00-04:00'),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  /* Una ATC: el recojo en su día y turno, y lo que diga \`atc\`. */
  window._atc=function(id, fecha, turno, entregado, atc){
    STATE=STATE.filter(function(p){ return p.id!==id; });
    STATE.push(_P({id:id, oc:'ATC 09-0'+id.length+id.charCodeAt(0), fecha:fecha, turno:turno, entregado:!!entregado, cliente:'CLIENTE '+id,
      productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:Object.assign({mot:'Hundimiento'}, atc||{})}]}));
    saveMirror();
    return findById(id);
  };
  /* «🔁 Programar devolución» con el botón de siempre. */
  window._programar=function(id, fecha, turno){
    abrirProgramarDevAtc(id);
    document.getElementById('pdev-fecha').value=fecha; segSet('pdev-turno', turno);
    guardarProgramarDevAtc(id);
    return findById(id);
  };
  window._ver=function(id){ var p=findById(id), a=atcDe(p)||{};
    return { fecha:p.fecha, turno:p.turno||'', entregado:!!p.entregado, pdev:a.pdev||'', ent:a.ent||'',
             recojo:atcRecogida(p), estado:atcEstado(p), chip:atcChip(p).replace(/<[^>]+>/g,'') }; };
  window._ultimo=function(){ var s=window._saves[window._saves.length-1]; if(!s) return null; var a=atcDe(s.rec)||{};
    return { fecha:s.rec.fecha, turno:s.rec.turno||'', rec:a.rec||'', pdev:a.pdev||'', forzar:!!(s.opts&&s.opts.forzar) }; };
  /* La celda «🚚 Recojo» de la matriz de ATC, como la ve logística. */
  window._celdaRecojo=function(id){
    showViewAhora('atc'); segSet('atc-mode','todo'); renderAtc();
    var th=[].map.call(document.querySelectorAll('#tbl-atc thead th'), function(x){ return x.textContent.trim(); });
    var col=th.indexOf('🚚 Recojo'), cli='CLIENTE '+id;
    var fila=[].filter.call(document.querySelectorAll('#tbl-atc tbody tr'), function(tr){ return tr.textContent.indexOf(cli)>=0; })[0];
    return fila ? fila.children[col].textContent.trim() : '(no está)';
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

  // ═══ 1. «↺ Quitar la devolución» devuelve el recojo con SU turno, y sin `rec` viejo ═══
  /* Ponía `turno=''` (el recojo de la TARDE volvía como de la mañana: el cupo lo contaba en AM) y
     dejaba `a.rec` puesto, así que si después se movía el recojo con 📅, la matriz seguía mostrando el
     día viejo y lo daba por recogido. Ahora el turno del recojo se guarda al programar (`rturno`,
     adentro del JSON de la ATC, sin columna nueva) y vuelve al quitar; `rec` se borra al quitar, y
     una fila que ya quedó con `rec` suelto (sin devolución) se lee por su fecha. */
  console.log('\n── 1. 🔁 Quitar la devolución: el recojo vuelve con su turno y la matriz sigue a la fecha ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={};
      // (a) El recojo es HOY a la TARDE y el chofer no lo tildó; confirman «ya lo recogieron» y se programa
      //     la devolución para el lunes 28 AM. Después se dan cuenta de que era un error y la quitan.
      _atc('a1','2026-09-23','PM', false);
      _programar('a1','2026-09-28','AM');
      out.programada=_ver('a1');
      window._saves=[];
      quitarProgramarDevAtc('a1');
      out.quitada=_ver('a1'); out.mandado=_ultimo();
      out.cupoPM=cuposUsadosTurno('2026-09-23','PM'); out.cupoAM=cuposUsadosTurno('2026-09-23','AM');
      // …el chofer no había ido: destilda el ✅ y logística mueve el recojo con 📅 al jueves 24 PM
      choEntregado('a1');
      MODAL_KIND='carga'; reprogramarPedido('a1'); REPRO.fecha='2026-09-24'; REPRO.turno='PM'; reproConfirmar();
      out.movida=_ver('a1');
      out.celda=_celdaRecojo('a1');
      // (b) «🔁 Cambiar devolución» sobre una ya programada NO pisa el turno del recojo con el de la devolución
      _atc('b1','2026-09-21','PM', true);
      _programar('b1','2026-09-28','AM');
      _programar('b1','2026-09-29','AM');
      quitarProgramarDevAtc('b1');
      out.cambiada=_ver('b1');
      // (c) una fila que ya quedó así (quitada con el panel de antes y el recojo movido al martes 22 con 📅):
      //     `rec` suelto con el día viejo y sin devolución
      _atc('c1','2026-09-22','PM', true, {rec:'2026-09-21'});
      out.vieja={ recojo:atcRecogida(findById('c1')), celda:_celdaRecojo('c1') };
      _programar('c1','2026-09-28','AM');
      out.viejaProg=(atcDe(findById('c1'))||{}).rec||'';
      quitarProgramarDevAtc('c1');
      out.viejaQuitada=_ver('c1');
      // (d) el turno del recojo se llenó mientras la ATC estaba en su devolución: quitarla va con `forzar`
      //     (el recojo ya pasó: no le suma un bulto a ningún camión)
      _atc('d1','2026-09-23','PM', true);
      _programar('d1','2026-09-28','AM');
      for(var i=0;i<13;i++) STATE.push(_P({id:'lleno'+i, fecha:'2026-09-23', turno:'PM', cliente:'LLENO '+i, productos:[{desc:'X',cant:1}]}));
      window._saves=[];
      quitarProgramarDevAtc('d1');
      out.llena=_ultimo();
      // (e) control: una ATC que todavía es el RECOJO (sin devolución) se sigue leyendo por su fecha
      _atc('e1','2026-09-25','AM', false);
      out.recojo=_ver('e1');
      return out;
    }, BASE);
    chk('punto de partida: programada, la ATC vive en el lunes 28 AM', r.programada.fecha==='2026-09-28' && r.programada.turno==='AM' && r.programada.pdev==='2026-09-28', J(r.programada));
    chk('⚠️ quitarla vuelve al recojo de HOY con su turno de la TARDE (antes: turno vacío = AM)',
        r.quitada.fecha==='2026-09-23' && r.quitada.turno==='PM' && r.quitada.pdev==='' && r.quitada.entregado===true, J(r.quitada));
    chk('⚠️ …y a la planilla va con el turno PM y sin el `rec` viejo', r.mandado && r.mandado.turno==='PM' && r.mandado.rec==='' && r.mandado.pdev==='', J(r.mandado));
    chk('⚠️ …y el cupo la cuenta en la TARDE, no en la mañana', r.cupoPM===1 && r.cupoAM===0, J([r.cupoPM, r.cupoAM]));
    chk('⚠️ movido el recojo con 📅 al jueves 24, la ATC dice ese día (antes seguía en el 23, el `rec` viejo)',
        r.movida.fecha==='2026-09-24' && r.movida.recojo==='2026-09-24', J(r.movida));
    chk('⚠️ …y vuelve a «🚚 Por recoger»: el recojo nuevo no pasó (antes «🏭 En fábrica»)', r.movida.estado==='sinrecoger', r.movida.estado);
    chk('⚠️ …y la matriz lo muestra en la columna «🚚 Recojo»', r.celda==='24/09', r.celda);
    chk('⚠️ «Cambiar devolución» y después quitarla: vuelve al recojo del lunes 21 con SU turno (PM), no el de la devolución',
        r.cambiada.fecha==='2026-09-21' && r.cambiada.turno==='PM' && r.cambiada.pdev==='', J(r.cambiada));
    chk('⚠️ una fila con `rec` suelto (quitada con el panel de antes) se lee por su fecha: martes 22, no lunes 21',
        r.vieja.recojo==='2026-09-22' && r.vieja.celda==='22/09', J(r.vieja));
    chk('⚠️ …programarle la devolución guarda el recojo de verdad (22), y quitarla vuelve al 22 PM',
        r.viejaProg==='2026-09-22' && r.viejaQuitada.fecha==='2026-09-22' && r.viejaQuitada.turno==='PM', J([r.viejaProg, r.viejaQuitada]));
    chk('⚠️ con el turno del recojo lleno (13 de 13), quitarla va con `forzar` y con su turno (si no, el portero contesta «turno lleno»)',
        r.llena && r.llena.forzar===true && r.llena.turno==='PM' && r.llena.fecha==='2026-09-23', J(r.llena));
    chk('control: una ATC que todavía es el recojo se lee por su fecha y sigue «🚚 Por recoger»',
        r.recojo.recojo==='2026-09-25' && r.recojo.estado==='sinrecoger' && !/devolución/.test(r.recojo.chip), J(r.recojo));
    await page.close();
  }

  // ═══ 2. El chip de la devolución sigue diciendo «devolución» con el ✅ puesto ═══════════
  /* Con el ✅ de la devolución el chip volvía de «🔁 ATC · devolución» a «🎧 ATC» (el de un RECOJO),
     porque `atcDevProg` da vacío apenas hay `ent`; y el WhatsApp del pedido decía «📦 Se le recoge…»
     de un producto que se le acababa de devolver. */
  console.log('\n── 2. ✅ La devolución entregada sigue siendo la devolución (chip y WhatsApp) ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={};
      var piezas={r_col:true, r_pat:true};
      // la devolución es HOY a la tarde; el chofer la entrega
      _atc('d2','2026-09-21','PM', true, piezas);
      _programar('d2','2026-09-23','PM');
      out.antes=_ver('d2');
      choEntregado('d2');
      out.entregada=_ver('d2');
      showView('chofer'); llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('hoy');
      await new Promise(function(r){ setTimeout(r,150); });
      var card=[].filter.call(document.querySelectorAll('#cho-lista .cho-card'), function(c){ return c.textContent.indexOf('CLIENTE d2')>=0; })[0];
      out.tarjeta=card?card.textContent.replace(/\s+/g,' '):'(no está)';
      out.wa=pedidoText(findById('d2'));
      // …y si la destildan (confirmando), vuelve a ser la devolución pendiente, como siempre
      choEntregado('d2');
      out.destildada=_ver('d2');
      // control: un RECOJO tildado sigue siendo «🎧 ATC» y su WhatsApp sí dice qué se le recoge
      _atc('r2','2026-09-23','AM', false, piezas);
      choEntregado('r2');
      out.recojo=_ver('r2'); out.waRecojo=pedidoText(findById('r2'));
      return out;
    }, BASE);
    chk('punto de partida: la devolución de hoy dice «🔁 ATC · devolución»', /devolución/.test(r.antes.chip) && r.antes.entregado===false, J(r.antes));
    chk('⚠️ entregada (✅), el chip SIGUE diciendo «devolución» (antes volvía a «🎧 ATC», el de un recojo)',
        r.entregada.estado==='cerrada' && r.entregada.entregado===true && /devolución/.test(r.entregada.chip), J(r.entregada));
    chk('⚠️ …también en la ficha del chofer, junto a «Entregado»', /ATC · devolución/.test(r.tarjeta) && /Entregado/.test(r.tarjeta), r.tarjeta.slice(0,200));
    chk('⚠️ …y el WhatsApp del pedido no dice «Se le recoge» de lo que se le acaba de devolver', !/Se le recoge/.test(r.wa) && /Atención al cliente/.test(r.wa), r.wa);
    chk('destildada, vuelve a ser la devolución pendiente (sin cambios)', r.destildada.estado!=='cerrada' && r.destildada.entregado===false && /devolución/.test(r.destildada.chip), J(r.destildada));
    chk('control: un RECOJO tildado sigue siendo «🎧 ATC», sin «devolución»', r.recojo.entregado===true && /ATC/.test(r.recojo.chip) && !/devolución/.test(r.recojo.chip), J(r.recojo));
    chk('control: …y su WhatsApp sí dice qué se le recoge', /Se le recoge: Colchón · Patas/.test(r.waRecojo), r.waRecojo);
    await page.close();
  }

  // ═══ 3. Completar un borrador de Kommo desde Administración vuelve a Administración ═══
  /* `completarBorrador` ponía siempre `EDIT_DESDE='mis'`: el de un borrador «sin vendedora», que solo
     se ve en ADMINISTRACIÓN, terminaba en «Mis pedidos» (desde a93ca79, con el WhatsApp encima). */
  console.log('\n── 3. 📥 El borrador «sin vendedora» completado desde Administración vuelve a Administración ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var out={};
      var borr=function(id, vend, cli){ return _P({id:id, estado:'Borrador Kommo', vendedor:vend, cliente:cli, fecha:'', turno:'', oc:'', zona:'', direccion:'', maps:'',
                  nota:'', saldo:3000, nroDia:0, ts:Date.parse('2026-09-23T08:00:00-04:00'), rev:3, chofer:'', vehiculo:'', verificado:false,
                  productos:[{desc:'TITANIO ICE', medida:'160x190', cant:1, precio:3000}]}); };
      var armar=function(lista){
        window._pl=JSON.parse(JSON.stringify(lista));
        apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
        STATE=[]; BORRADORES=JSON.parse(JSON.stringify(lista)); saveBorrMirror(); saveMirror();
      };
      var choques=0, llamadas=0;
      apiSave=function(rec){
        llamadas++;
        if(choques>0){ choques--; var v=window._pl.filter(function(x){ return x.id===rec.id; })[0]; return Promise.resolve({ok:false, error:'conflicto', pedido:JSON.parse(JSON.stringify(v))}); }
        var c=JSON.parse(JSON.stringify(rec)); c.rev=(Number(rec.rev)||0)+1; c.nroDia=c.nroDia||1;
        window._pl=window._pl.filter(function(x){ return x.id!==rec.id; }).concat([c]); return Promise.resolve({ok:true,pedido:c}); };
      var completarDesde=async function(vista, id, conChoque){
        choques=conChoque?1:0; llamadas=0;
        showView(vista); await new Promise(function(r){ setTimeout(r,200); });
        if(vista==='admin') renderAdmin(); else { document.getElementById('mis-vendedor').value='Carola Chavez'; renderMis(); }
        var caja=document.getElementById(vista==='admin'?'adm-borradores':'mis-borradores');
        var btn=[].filter.call(caja.querySelectorAll('button'), function(b){ return /Completar la entrega/.test(b.textContent); })[0];
        if(!btn) return { sinBoton:true, caja:caja.textContent.replace(/\s+/g,' ').slice(0,120) };
        btn.click();
        await new Promise(function(r){ setTimeout(r,150); });
        var llenar=function(){
          document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
          document.getElementById('f-fecha').value='2026-09-24';
          document.getElementById('f-nota').value='9'+id.length+'01';
          document.getElementById('f-zona').value='Norte';
          document.getElementById('f-direccion').value='Calle 1';
          segSet('f-turno','AM');
        };
        llenar(); submitPedido();
        await new Promise(function(r){ setTimeout(r,700); });
        if(conChoque){ llenar(); submitPedido(); await new Promise(function(r){ setTimeout(r,700); }); }   // el formulario se reabrió con lo nuevo
        var mb=document.getElementById('modal-box');
        var o={ enAdmin:document.getElementById('view-admin').classList.contains('active'),
                enMis:document.getElementById('view-mis').classList.contains('active'),
                modal:mb?mb.textContent.replace(/\s+/g,' ').slice(0,160):'', wa:(document.getElementById('wa-text')||{}).value||'', llamadas:llamadas,
                fila:window._pl.filter(function(x){ return x.id===id; }).map(function(x){ return (x.estado||'')+'|'+x.fecha; })[0] };
        closeModal();
        return o;
      };
      armar([borr('kommo-901','Cuenta General','HUERFANO UNO')]);
      out.admin=await completarDesde('admin','kommo-901', false);
      armar([borr('kommo-902','Cuenta General','HUERFANO DOS')]);
      out.adminChoque=await completarDesde('admin','kommo-902', true);
      armar([borr('kommo-903','Carola Chavez','DE CAROLA')]);
      out.mis=await completarDesde('mis','kommo-903', false);
      return out;
    }, BASE);
    chk('punto de partida: desde Administración se guarda como pedido nuevo', r.admin.fila==='|2026-09-24', J(r.admin));
    chk('⚠️ completado desde Administración VUELVE a Administración (antes caía en «Mis pedidos»)', r.admin.enAdmin===true && r.admin.enMis===false, J([r.admin.enAdmin, r.admin.enMis]));
    chk('…y el mensaje para el grupo sale igual, como con todo pedido nuevo', /Pedido guardado/.test(r.admin.modal) && /HUERFANO UNO/.test(r.admin.wa), r.admin.modal);
    chk('⚠️ si al guardar chocó (lo tocó otra persona) y se reabre el formulario, igual vuelve a Administración',
        r.adminChoque.llamadas===2 && r.adminChoque.fila==='|2026-09-24' && r.adminChoque.enAdmin===true && /Pedido guardado/.test(r.adminChoque.modal), J(r.adminChoque));
    chk('control: completado desde «Mis pedidos» vuelve a Mis pedidos, con el mensaje', r.mis.enMis===true && r.mis.enAdmin===false && /Pedido guardado/.test(r.mis.modal) && /DE CAROLA/.test(r.mis.wa), J(r.mis));
    await page.close();
  }

  // ═══ 4. El aviso diario de Mis pedidos: una vez por día, con o sin tilde ════════════
  /* La clave del día usaba el nombre crudo: con «Carola Chávez» y «Carola Chavez» (la misma para
     `mismoVendedor`) el aviso se abría dos veces el mismo día. */
  console.log('\n── 4. 🔔 El aviso «Avisá a estos clientes» se abre UNA vez por día, se escriba como se escriba el nombre ──');
  {
    const page = await nueva(null, 380);
    const r = await page.evaluate(async (base) => {
      eval(base);
      Object.keys(localStorage).forEach(function(k){ if(k.indexOf('me_aviso_')===0) localStorage.removeItem(k); });
      STATE=[ _P({id:'sin1', cliente:'SIN STOCK CAROLA', fecha:'2026-09-24', productos:[{desc:'SOFT', medida:'140x190', cant:1, chk:'no'}]}),
              _P({id:'sin2', cliente:'SIN STOCK MIRIAN', vendedor:'Mirian Salazar', fecha:'2026-09-24', productos:[{desc:'SOFT', medida:'160x200', cant:1, chk:'no'}]}),
              _P({id:'sin3', cliente:'SIN STOCK MARIA', vendedor:'Maria Flores', fecha:'2026-09-24', productos:[{desc:'SOFT', medida:'100x190', cant:1, chk:'no'}]}) ];
      saveMirror();
      localStorage.setItem('me_aviso_maria_flores_2026-09-23','1');   // la marca que dejó hoy el panel de antes
      showView('mis'); await new Promise(function(r){ setTimeout(r,200); });
      var abierto=function(){ var m=document.getElementById('modal'); return !!(m && m.classList.contains('on') && /Avisá a estos clientes/.test(document.getElementById('modal-box').textContent)); };
      var mirar=async function(nombre){
        closeModal(); MIS_TODOS=false; MIS_FILTER='todos';
        document.getElementById('mis-vendedor').value=nombre; renderMis();
        await new Promise(function(r){ setTimeout(r,500); });
        var a=abierto(); closeModal(); return a;
      };
      var out={};
      out.primera=await mirar('Carola Chávez');
      out.sinTilde=await mirar('Carola Chavez');
      out.mayus=await mirar('CAROLA CHÁVEZ');
      out.otra=await mirar('Mirian Salazar');
      out.yaVista=await mirar('Maria Flores');
      out.claves=Object.keys(localStorage).filter(function(k){ return k.indexOf('me_aviso_')===0; }).sort();
      return out;
    }, BASE);
    chk('punto de partida: la primera vez del día se abre solo', r.primera===true, J(r));
    chk('⚠️ con «Carola Chavez» (sin tilde) NO se vuelve a abrir el mismo día (antes: otra clave, otra vez)', r.sinTilde===false, J(r));
    chk('control: …ni con «CAROLA CHÁVEZ» (las mayúsculas ya se ignoraban)', r.mayus===false, J(r));
    chk('control: otra vendedora sí recibe el suyo', r.otra===true, J(r));
    chk('control: la marca que dejó hoy el panel de antes (nombre sin tildes) sigue valiendo: publicar no le reabre el aviso', r.yaVista===false, J(r));
    chk('⚠️ …y queda UNA marca por vendedora y por día, con la misma forma de antes',
        J(r.claves)===J(['me_aviso_carola_chavez_2026-09-23','me_aviso_maria_flores_2026-09-23','me_aviso_mirian_salazar_2026-09-23']), J(r.claves));
    await page.close();
  }

  // ═══ 5. Mis pedidos: el que espera en la cola de este dispositivo lo dice ═══════════
  /* El cartel de arriba contaba cuántos no llegaron, pero la ficha de cada uno era igual a las
     demás: nada decía CUÁL no estaba en la planilla (ni en la ventana, de donde se copia al grupo). */
  console.log('\n── 5. ⏳ Mis pedidos: la ficha de un pedido que todavía no llegó a la planilla dice «sin enviar» ──');
  {
    const page = await nueva(null, 380);
    const r = await page.evaluate(async (base) => {
      eval(base);
      var q=_P({id:'en-cola', cliente:'CARGADO SIN SEÑAL', fecha:'2026-09-24'});
      var ok=_P({id:'ya-esta', cliente:'YA ESTA EN LA PLANILLA', fecha:'2026-09-24'});
      STATE=[ok, q]; saveMirror(); setPending([q]);
      var falla=true;
      apiSave=function(rec){ return falla ? Promise.reject(new Error('Failed to fetch')) : Promise.resolve({ok:true, pedido:Object.assign({}, rec, {rev:1})}); };
      showView('mis'); await new Promise(function(r){ setTimeout(r,200); });
      var ficha=function(id){
        MIS_TODOS=false; MIS_FILTER='todos'; document.getElementById('mis-vendedor').value='Carola Chavez'; renderMis();
        var c=[].filter.call(document.querySelectorAll('#mis-lista .cho-card'), function(x){ return (x.getAttribute('onclick')||'').indexOf("'"+id+"'")>=0; })[0];
        return c ? c.textContent.replace(/\s+/g,' ') : '(no está)';
      };
      var out={ cola:ficha('en-cola'), otra:ficha('ya-esta'), cartel:(document.getElementById('mis-cola').textContent||'').replace(/\s+/g,' ') };
      showMisModal('en-cola'); out.ventana=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
      showMisModal('ya-esta'); out.ventanaOtra=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
      out.ancho={doc:document.documentElement.scrollWidth, vista:window.innerWidth};
      // vuelve la señal: se manda y la ficha deja de decirlo
      falla=false; await flushPending(); await new Promise(function(r){ setTimeout(r,100); });
      out.despues=ficha('en-cola'); out.colaDespues=getPending().length;
      return out;
    }, BASE);
    chk('punto de partida: el cartel de arriba cuenta 1 sin llegar', /1 guardado de este dispositivo todavía NO llegó/.test(r.cartel), r.cartel.slice(0,120));
    chk('⚠️ la ficha del pedido en la cola dice «⏳ sin enviar» (antes era una ficha más)', /⏳ sin enviar/.test(r.cola), r.cola.slice(0,200));
    chk('…y la de un pedido que ya está en la planilla, no', r.otra!=='(no está)' && !/sin enviar/.test(r.otra), r.otra.slice(0,160));
    chk('⚠️ la ventana del pedido en la cola avisa que todavía no está en la planilla (y que no lo pase al grupo)',
        /todavía NO llegó a la planilla/.test(r.ventana) && /grupo/.test(r.ventana), r.ventana.slice(0,240));
    chk('…y la de un pedido que ya está, no', !/NO llegó a la planilla/.test(r.ventanaOtra), r.ventanaOtra.slice(0,160));
    chk('en el celular (380 px) la ficha con el aviso no se sale de la pantalla', r.ancho.doc<=r.ancho.vista, J(r.ancho));
    chk('con señal se manda y la ficha deja de decir «sin enviar»', r.colaDespues===0 && !/sin enviar/.test(r.despues), r.despues.slice(0,160));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
