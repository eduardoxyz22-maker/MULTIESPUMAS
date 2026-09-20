/* 🧰 LOS MEDIA Y BAJA DE §4er QUE SE ARREGLARON JUNTOS (§4ew).

   Entregas: la plata cobrada por el chofer en Bs 0 desde otra compu (`p.cobradoBs` no viaja);
   «👑 Ver todos» anotaba el efectivo en la mano del nombre del desplegable; la foto de la
   entrega se perdía si otro dispositivo guardó el pedido mientras subía; cambiar solo el
   turno en un día cerrado y «Quitar la devolución» de una ATC chocaban con el portero.
   Contabilidad: tras «Registrar pago» la ventana mostraba el flete; el WhatsApp y el Excel
   del cuadre comparaban el arqueo global con un total filtrado; borrar un retiro no miraba la
   respuesta; «Registrar pago» aceptaba fecha a futuro.
   Administración: 🔄 Actualizar sin tope; el aviso de reposiciones vs. el filtro Mes; «Hay»
   con depósito negativo; el buscador sin acentos.

   Red cortada, servidor simulado, fixtures sintéticos. Se corre:  node tests/test_medias.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_medias.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);

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
  window._apiSaveReal=window._apiSaveReal||apiSave;
  apiSave=function(rec, opts){ window._saves.push({rec:JSON.parse(JSON.stringify(rec)), opts:opts||null}); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); };
  apiDelete=function(){ return Promise.resolve({ok:true}); };
  apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  downloadBlob=function(){};
  window.hoy=todayStr();
  window._atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
  window._adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  window.elegirChofer=function(n){ var s=document.getElementById('cho-nombre'); if(!s) return; var hay=false; for(var i=0;i<s.options.length;i++) if(s.options[i].value===n) hay=true;
    if(!hay){ var o=document.createElement('option'); o.value=o.textContent=n; s.appendChild(o); } s.value=n; };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed) => {
    const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>{ if(d.type()==='prompt') d.accept('800'); else d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    if(fixed) await page.clock.setFixedTime(new Date(fixed));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ Entregas ═══════════════════════════════════════════════════════════════════
  console.log('\n── Entregas: la plata del chofer desde otra compu, «Ver todos», la foto, el turno y la devolución ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base);
      // la lista viene del servidor: sin cobradoBs, solo el historial
      STATE=[ window._P({id:'a', chofer:'Luis Pierre', vehiculo:'Foton nuevo', pagado:true, saldo:0, metodoPago:'Efectivo 1500 @'+hoy+' #1 >Luis Pierre', productos:[{desc:'A',cant:1,precio:1500}]}),
              window._P({id:'b', chofer:'Luis Pierre', vehiculo:'Foton nuevo', pagado:false, saldo:300, productos:[{desc:'B',cant:1,precio:300}]}) ];
      showView('chofer'); elegirChofer('Luis Pierre'); CHO_FILTER='todos'; renderChofer();
      var metricas=document.getElementById('cho-metrics').textContent.replace(/\s+/g,' ');
      showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; admTopeReset(); renderAdmin();
      var rend=(document.getElementById('tbl-rendicion')||{}).textContent||'';
      return { metricas:metricas, rend:rend.replace(/\s+/g,' ') };
    }, BASE);
    chk('⚠️ «Cobrado» del chofer sale del historial (Bs 1.500), no de un campo que no viaja en la planilla', /Cobrado/.test(r.metricas) && /1\.500,00/.test(r.metricas), r.metricas.slice(0,160));
    chk('…y la rendición por chofer de Administración también', /Luis Pierre/.test(r.rend) && /1\.500,00/.test(r.rend), r.rend.slice(0,120));
    await page.close();
  }
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({id:'g', chofer:'Jonathan Monje', vehiculo:'Foton nuevo', pagado:false, saldo:800, productos:[{desc:'G',cant:1,precio:800}]}) ];
      showView('chofer'); elegirChofer('Luis Pierre'); CHO_TODOS=true; renderChofer();
      await new Promise(r=>setTimeout(r,120));           // que termine el refresco que dispara showView (su foto de STATE es de ANTES del cobro)
      window.prompt=function(){ return '800'; };
      choCobrarMetodo('g','Efectivo'); await new Promise(r=>setTimeout(r,100));
      var p=findById('g'), c=parseCobros(p.metodoPago)[0]||{};
      return { recibio:c.recibio||'', monto:c.monto, pagado:p.pagado };
    }, BASE);
    chk('⚠️ en «👑 Ver todos», el efectivo de un pedido de OTRO chofer queda en la mano del chofer del pedido, no del nombre del desplegable', r.recibio==='Jonathan Monje' && r.monto===800 && r.pagado===true, J(r));
    await page.close();
  }
  {
    // la foto de la entrega vs. un guardado ajeno mientras subía
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({id:'f', chofer:'Luis Pierre', rev:3, fotos:[], productos:[{desc:'F',cant:1}]}) ];
      var servidor=Object.assign({}, JSON.parse(JSON.stringify(STATE[0])), { rev:4, saldo:0, pagado:true, metodoPago:'Efectivo 900 @'+hoy+' #9' });   // contabilidad registró el pago mientras tanto
      apiSave=window._apiSaveReal;
      var n=0;
      apiPost=function(payload){
        if(payload&&payload.action==='save'){
          n++; var rec=JSON.parse(JSON.stringify(payload.pedido)); window._saves.push({rec:rec});
          if(n===1) return Promise.resolve({ok:false, error:'conflicto', pedido:JSON.parse(JSON.stringify(servidor))});   // sello viejo
          servidor=Object.assign({}, servidor, rec, {rev:5}); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(servidor))});
        }
        if(payload&&payload.action==='list') return Promise.resolve({ok:true, pedidos:[JSON.parse(JSON.stringify(servidor))]});
        return Promise.resolve({ok:true});
      };
      apiList=function(){ return apiPost({action:'list'}); };
      apiFoto=function(){ return Promise.resolve({ok:true, fotoId:'F_NUEVA'}); };
      fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
      FOTO_PEDIDO_ID='f'; window._toasts=[];
      onFotoElegida({ target:{ files:[{}] } });
      await new Promise(r=>setTimeout(r,600));
      var p=findById('f');
      return { guardados:n, fotos:fotosDe(p), servidorFotos:fotosDe(servidor), pagado:p.pagado, rev:p.rev, toasts:window._toasts.slice() };
    }, BASE);
    chk('⚠️ con el sello viejo el primer guardado choca, y la foto se vuelve a pegar sobre la fila del servidor: queda en la planilla', r.guardados===2 && r.servidorFotos.join(',')==='F_NUEVA' && r.fotos.join(',')==='F_NUEVA', J(r));
    chk('…sin perder lo que el otro dispositivo guardó (el pago) y con el sello nuevo', r.pagado===true && r.rev===5, J([r.pagado, r.rev]));
    chk('…y «Foto guardada ✓» sale recién cuando el servidor dijo que sí', r.toasts.indexOf('Foto guardada ✓')===r.toasts.length-1, J(r.toasts));
    await page.close();
  }
  {
    // cambiar solo el turno en un día cerrado, y quitar la devolución de una ATC
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var f=window._adel(2); while(diaDomingo(f)||diaSabado(f)) f=isoLocal(new Date(new Date(f+'T12:00:00').getTime()+86400000));
      STATE=[ window._P({id:'t', fecha:f, turno:'AM', productos:[{desc:'T',cant:1}]}),
              window._P({id:'u', fecha:f, turno:'AM', productos:[{desc:'U',cant:1}]}) ];
      DIAS_CERRADOS=[f];
      cambiarTurno('t','PM'); await new Promise(r=>setTimeout(r,50));
      var cerrado={ turno:findById('t').turno, opts:(window._saves[window._saves.length-1]||{}).opts };
      DIAS_CERRADOS=[]; window._saves=[];
      cambiarTurno('u','PM'); await new Promise(r=>setTimeout(r,50));
      var abierto={ turno:findById('u').turno, opts:(window._saves[window._saves.length-1]||{}).opts };
      // ATC con devolución programada para pasado mañana, recogida ayer (día que ya pasó)
      var ayer=window._atras(1);
      var atc=window._P({id:'w', oc:'ATC 09-001', fecha:window._adel(2), turno:'AM', productos:[{desc:'W',cant:1}]});
      mergeAtcDatos(atc, { rec:ayer, pdev:window._adel(2), pturno:'AM' });
      STATE.push(atc); window._saves=[];
      quitarProgramarDevAtc('w'); await new Promise(r=>setTimeout(r,50));
      var q=findById('w');
      return { cerrado:cerrado, abierto:abierto, atc:{ fecha:q.fecha, pdev:(atcDe(q)||{}).pdev||'', opts:(window._saves[window._saves.length-1]||{}).opts } };
    }, BASE);
    chk('⚠️ cambiar solo el turno de un pedido que YA está en un día cerrado va con `forzar` (el portero del servidor lo rechazaba)', r.cerrado.turno==='PM' && !!(r.cerrado.opts&&r.cerrado.opts.forzar), J(r.cerrado));
    chk('…y en un día abierto sigue yendo sin forzar', r.abierto.turno==='PM' && !(r.abierto.opts&&r.abierto.opts.forzar), J(r.abierto));
    chk('⚠️ «Quitar la devolución» vuelve al día del recojo (que ya pasó) con `forzar`: el servidor ya no contesta «día cerrado»', r.atc.fecha===await page.evaluate(()=>window._atras(1)) && r.atc.pdev==='' && !!(r.atc.opts&&r.atc.opts.forzar), J(r.atc));
    await page.close();
  }

  // ═══ Contabilidad ═════════════════════════════════════════════════════════════════
  console.log('\n── Contabilidad: la ventana tras el pago, el cuadre filtrado, borrar un retiro, la fecha a futuro ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var hist=textoCobros([{ anticipo:true, metodo:'Efectivo', monto:500, fecha:hoy, nota:'800', comps:['A1'] },{ envio:true, metodo:'Efectivo', monto:50, fecha:hoy, nota:'800', comps:['F1'] }]);
      STATE=[ window._P({id:'d1', nota:'800', oc:'09-800', cliente:'CON FLETE COBRADO', acuenta:500, saldo:700, pagado:false, metodoPago:hist, productos:[{desc:'D',cant:1,precio:1200}]}) ];
      showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); renderConta();
      showContaModal('d1'); ctaSetTipo('d1','pago');
      document.getElementById('cta-pago-monto').value='700'; document.getElementById('cta-pago-fecha').value=hoy; document.getElementById('cta-pago-nota').value='801';
      CTA_PAGO.comps=['R2'];
      ctaRegistrarPago('d1');
      var m=document.getElementById('modal').textContent.replace(/\s+/g,' ');
      var wa=(document.getElementById('wa-pago')||{}).value||'';
      closeModal();
      // fecha a futuro
      STATE=[ window._P({id:'h1', nota:'970', cliente:'FUTURO', saldo:700, productos:[{desc:'H',cant:1,precio:700}]}) ];
      showContaModal('h1'); ctaSetTipo('h1','pago');
      document.getElementById('cta-pago-monto').value='700'; document.getElementById('cta-pago-fecha').value=window._adel(5); document.getElementById('cta-pago-nota').value='970';
      CTA_PAGO.comps=['R9']; window._toasts=[];
      ctaRegistrarPago('h1');
      var h=findById('h1'); closeModal();
      return { ventana:m.slice(m.indexOf('Listo'), m.indexOf('Listo')+140), wa1:wa.split('\n')[0], waMonto:(wa.match(/Monto: \*([^*]+)\*/)||[])[1], futuro:{ saldo:h.saldo, cobros:cobrosDe(h).length, toast:window._toasts[window._toasts.length-1] } };
    }, BASE);
    chk('⚠️ tras «Registrar pago» la ventana muestra EL PAGO (Bs 700), no el flete cobrado antes', /700,00/.test(r.ventana) && !/recargo/i.test(r.ventana), r.ventana);
    chk('…y el WhatsApp también', /PAGO COMPLETO/.test(r.wa1) && r.waMonto==='Bs 700,00', r.wa1+' · '+r.waMonto);
    chk('«Registrar pago» rechaza una fecha a futuro (como «Corregir»)', r.futuro.saldo===700 && r.futuro.cobros===0 && /a futuro/.test(r.futuro.toast||''), J(r.futuro));
    await page.close();
  }
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      ARQUEO={}; RETIROS=[];
      window._xl=null; var _b=buildXlsx; buildXlsx=function(sheets){ window._xl=sheets; return _b(sheets); };
      STATE=[ window._P({id:'e1', nota:'900', vendedor:'Carola Chavez', cliente:'EFECTIVO CAROLA', pagado:true, metodoPago:'Efectivo 600 @'+hoy+' #900 %X', productos:[{desc:'E',cant:1,precio:600}]}),
              window._P({id:'e2', nota:'901', vendedor:'Maria Flores', cliente:'EFECTIVO MARIA', pagado:true, metodoPago:'Efectivo 600 @'+hoy+' #901 %Y', productos:[{desc:'E',cant:1,precio:600}]}) ];
      showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre'); llenarSelectContaVendedor();
      document.getElementById('cua-mes').value=hoy.slice(0,7); segSet('cua-mode','mes'); setCuadreModo('mes');
      document.getElementById('cua-vendedor').value=''; renderCuadre();
      setCuadreArqueo('Efectivo','1200');
      var todos=cuadreTexto().split('\n').filter(function(l){ return /Efectivo:/.test(l); })[0];
      document.getElementById('cua-vendedor').value='Carola Chavez'; renderCuadre();
      var txt=cuadreTexto();
      exportCuadre();
      var rows=window._xl[0].matrix, i=rows.findIndex(function(r){ return r[0] && /CIERRE POR FORMA DE PAGO/.test(String(r[0].v||r[0])); });
      var filaEf=rows[i+1].map(function(c){ return (c && c.v!=null) ? c.v : c; });
      var tit=String((rows[i][0]||{}).v||rows[i][0]);
      // borrar un retiro: con el servidor diciendo que no, sin red, y con ok
      await new Promise(r=>setTimeout(r,120));           // que termine el refresco en vuelo (traería RETIROS vacío y el 2° y 3° borrado no encontrarían nada)
      RETIROS=[ filaDeRetiro({id:RETIRO_PREF+'1', entrega:'Carola Chavez', retira:'Contabilidad', monto:500, tipo:'Facturado', notas:['1'], fotos:[], fecha:hoy, obs:''}),
                filaDeRetiro({id:RETIRO_PREF+'2', entrega:'Carola Chavez', retira:'Contabilidad', monto:200, tipo:'Facturado', notas:['2'], fotos:[], fecha:hoy, obs:''}),
                filaDeRetiro({id:RETIRO_PREF+'3', entrega:'Carola Chavez', retira:'Contabilidad', monto:100, tipo:'Facturado', notas:['3'], fotos:[], fecha:hoy, obs:''}) ];
      window._toasts=[]; apiDelete=function(){ return Promise.resolve({ok:false, error:'not found'}); };
      borrarRetiro(RETIRO_PREF+'1'); await new Promise(r=>setTimeout(r,50));
      var t1=window._toasts.slice();
      window._toasts=[]; apiDelete=function(){ return Promise.reject(new Error('Failed to fetch')); };
      borrarRetiro(RETIRO_PREF+'2'); await new Promise(r=>setTimeout(r,50));
      var t2=window._toasts.slice();
      window._toasts=[]; apiDelete=function(){ return Promise.resolve({ok:true}); };
      borrarRetiro(RETIRO_PREF+'3'); await new Promise(r=>setTimeout(r,50));
      var t3=window._toasts.slice();
      return { todos:todos, waEfectivo:txt.split('\n').filter(function(l){ return /Efectivo:/.test(l); })[0], nota:/solo lo de Carola/.test(txt), excel:filaEf, tit:tit, t1:t1, t2:t2, t3:t3 };
    }, BASE);
    chk('con Todos, el WhatsApp del cuadre compara con el arqueo (1.200 ✅ cuadra)', /1\.200,00/.test(r.todos) && /cuadra/.test(r.todos), r.todos);
    chk('⚠️ con filtro por vendedora, el WhatsApp NO compara el total parcial con el arqueo global (antes: «sobra Bs 600»)', /600,00/.test(r.waEfectivo) && !/sobra|falta/.test(r.waEfectivo) && r.nota===true, r.waEfectivo);
    chk('⚠️ …ni el Excel: la fila de Efectivo va sin contado ni diferencia y el título lo dice', r.excel[7]===600 && (r.excel[8]===''||r.excel[8]==null) && (r.excel[9]===''||r.excel[9]==null) && /solo Carola/.test(r.tit), J(r.excel)+' · '+r.tit);
    chk('⚠️ borrar un retiro mira la respuesta: si el servidor dice que no, lo avisa (antes: «Retiro borrado» y volvía con la lista)', !r.t1.some(function(t){ return /Retiro borrado/.test(t); }) && r.t1.some(function(t){ return /No se pudo borrar el retiro/.test(t); }), J(r.t1));
    chk('…sin red también avisa, sin error JS', r.t2.some(function(t){ return /Sin conexión/.test(t); }), J(r.t2));
    chk('…y con ok dice «Retiro borrado»', r.t3.some(function(t){ return /Retiro borrado/.test(t); }), J(r.t3));
    await page.close();
  }

  // ═══ Administración ═══════════════════════════════════════════════════════════════
  console.log('\n── Administración: 🔄 Actualizar con tope, reposiciones atrasadas, «Hay» negativo, buscador ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({id:'a', productos:[{desc:'A',cant:1}]}) ];
      CARGA_TOPE=300;                                       // para no esperar 45 s en el test
      apiList=function(){ return new Promise(function(){}); };   // Google abre la conexión y no contesta nunca
      window._toasts=[];
      loadFromServer(true);
      var b=document.getElementById('adm-refresh');
      var durante={ disabled:b.disabled };
      await new Promise(function(r){ setTimeout(r,900); });
      return { durante:durante, despues:{ disabled:b.disabled, txt:b.textContent.trim() }, toast:window._toasts[window._toasts.length-1]||'' };
    }, BASE);
    chk('⚠️ 🔄 Actualizar con un fetch que nunca contesta se corta solo: el botón vuelve y dice por qué (antes quedaba «Cargando…» para siempre)', r.durante.disabled===true && r.despues.disabled===false && !/Cargando/.test(r.despues.txt) && /No se pudo actualizar/.test(r.toast), J(r));
    await page.close();
  }
  {
    const page = await nueva('2026-09-20T14:00:00Z');
    const r = await page.evaluate((base) => {
      eval(base);
      STATE=[ window._P({id:'rptv', oc:'RPT 08-003', cliente:'Charcas', fecha:'2026-08-28', entregado:false, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:2}]}),
              window._P({id:'n1', fecha:todayStr(), productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1}]}) ];
      showView('admin'); segSet('adm-mode','mes'); document.getElementById('adm-mes').value=todayStr().slice(0,7);
      QUICK_FILTER=''; admTopeReset(); renderAdmin();
      var aviso=(document.getElementById('adm-rpt')||{}).textContent.replace(/\s+/g,' ').trim();
      var btn=document.querySelector('#adm-rpt button');
      if(btn) btn.click();
      var filas=document.querySelectorAll('#tbl-pedidos tbody tr').length;
      return { aviso:aviso.slice(0,80), modo:segVal('adm-mode'), filtro:QUICK_FILTER, filas:filas };
    }, BASE);
    chk('⚠️ «ver las reposiciones» del aviso pasa a «Todo» con el filtro puesto: la RPT de agosto se ve (antes: tabla vacía en modo Mes)', /1 reposición/.test(r.aviso) && r.modo==='todo' && r.filtro==='rpt' && r.filas===1, J(r));
    await page.close();
  }
  {
    const page = await nueva('2026-09-20T14:00:00Z');
    const r = await page.evaluate((base) => {
      eval(base);
      var K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'}), H=function(n){ return [{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}]; };
      STATE=[];
      [1,3,5,7].forEach(function(n,i){ STATE.push(window._P({id:'h'+i, fecha:window._atras(n), entregado:true, pagado:true, productos:H(2)})); });   // 8 salidas después del conteo
      STOCK=stockVacio(); STOCK.c={ f:window._atras(10), hora:'09:00', u:{}, solo0:true }; STOCK.c.u[K]=3;   // contado 3, salieron 8 → depósito −5
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} } }; STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=5;
      stockOlvidarIndice();
      var d=stockData(), o=d.lista.filter(function(x){ return x.k===K; })[0];
      var R=stockProducir(d), f=null; R.bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===K) f=x; }); });
      // el buscador de la tabla
      STATE=[ window._P({id:'a', cliente:'JUAN PÉREZ', productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1}]}),
              window._P({id:'b', cliente:'ANA LOPEZ', vendedor:'Carola Chávez', productos:[{desc:'COLCHÓN SOFT',medida:'140x190',codigo:'',cant:1}]}) ];
      showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; admTopeReset();
      var buscar=function(q){ document.getElementById('adm-search').value=q; renderAdmin(); return document.querySelectorAll('#tbl-pedidos tbody tr').length; };
      var bus={ perez:buscar('perez'), chavez:buscar('chavez'), colchon:buscar('colchon'), soft:buscar('soft'), Perez:buscar('PÉREZ') };
      document.getElementById('adm-search').value='';
      return { deposito:o.deposito, enOtros:o.enOtros, hay:f&&f.hay, bus:bus };
    }, BASE);
    chk('⚠️ «Hay» del plan con depósito negativo (−5) y 5 en Moreno = 5, no 0 (el negativo ya no se come lo de Moreno)', r.deposito===-5 && r.enOtros===5 && r.hay===5, J(r));
    // «chavez» = 2: Carola Chávez (con tilde) y Carola Chavez (la vendedora por defecto del otro pedido) — justamente lo que se busca
    chk('⚠️ el buscador de la tabla no mira acentos ni mayúsculas: «perez» encuentra a PÉREZ, «chavez» a Chávez y a Chavez, «colchon» al COLCHÓN', r.bus.perez===1 && r.bus.chavez===2 && r.bus.colchon===1 && r.bus.soft===1 && r.bus.Perez===1, J(r.bus));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
