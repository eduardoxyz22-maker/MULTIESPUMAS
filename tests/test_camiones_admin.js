/* 🚛 LOS CAMIONES DE ADMINISTRACIÓN (§4hz, 08/10).
   El dueño, con la muestra en video: «que solo se vea en administración, no en la pestaña lista de carga, reemplazá lo de
   Codex». Arriba del resumen de Administración: la imagen de los depósitos (hecha con ChatGPT), los carteles de PTF, Banzer
   y Moreno, y a la derecha cada camión con su carga y los renglones para tildar AHÍ MISMO.

   Lo que se prueba (pedidos inventados, reloj clavado en el jueves 08/10/2026 a las 10:00 de Bolivia):
     1. Dónde vive: en Administración, arriba del resumen; NO en la Lista de carga; la escena de Codex ya no está.
     2. Los camiones: los cuatro de VEHICULOS aunque no tengan pedidos + «Sin vehículo» si hay pedidos sin camión.
     3. La cuenta: bultos por camión, lo de fábrica y lo de Banzer, lo que hay que ir a buscar a Moreno.
     4. Los tildes son LOS MISMOS de la Lista de carga, en los dos sentidos, con la misma clave.
     5. Completar un camión: «Listo para salir» en el panel, en el chip y en el cartel.
     6. Hoy / Mañana: cada día con sus pedidos y su fecha en la clave.
     7. «Ver sus paradas» abre la Lista de carga en ese día. 7b (§4ic): tocar Banzer o Moreno abre SU panel al costado.
     8. Dos botones separados (§4ib): «Ocultar camiones» y «Ocultar resumen»; las líneas de color van en el piso, debajo de
        cada camión; en el celular no se sale de la pantalla; sin errores. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const J=x=>JSON.stringify(x);
const ARCH = 'file://' + (process.env.PEDIDOS||require('path').resolve('pedidos.html'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route('https://**', r=>r.abort());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);

  const hay = await page.evaluate(() => typeof cargaVivaDatos==='function' && !!document.getElementById('carga-viva'));
  if(!hay){ chk('el panel tiene los camiones en Administración', false); console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1); }

  await page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    /* Un servidor de mentira que guarda las filas del sistema (los tildes de la carga viajan en una): si no, la relectura
       de después de tildar los borraba y la prueba medía otra cosa. */
    window._SRV={};
    apiSave=function(rec){ var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number((_SRV[r.id]||{}).rev)||0)+1; _SRV[r.id]=r; return Promise.resolve({ok:true, pedido:r}); };
    apiList=function(){ var l=JSON.parse(JSON.stringify(STATE.filter(function(p){ return !esFilaSistema(p); })));
      Object.keys(_SRV).forEach(function(k){ if(esFilaSistema(_SRV[k])) l.push(JSON.parse(JSON.stringify(_SRV[k]))); });
      return Promise.resolve({ok:true,pedidos:l}); };
    try{ localStorage.removeItem(LS_RESUMEN); localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), man=proximoDiaEntrega(), n=0;
    var P=function(f,veh,chofer,cli,prods){ n++; return { id:'cv'+n, fecha:f, oc:'10-'+(30+n), vendedor:'Maria Flores', cliente:cli, celular:'7', turno:'AM', zona:'Norte',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:veh, chofer:chofer,
      garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:n, verificado:false, fotos:[], productos:prods }; };
    var x=function(c,d,m,cant,extra){ return Object.assign({codigo:c,desc:d,medida:m,cant:cant},extra||{}); };
    STATE=[
      P(hoy,'Foton nuevo','Luis Eyzaguirre','CLIENTE A',[x('CH1129','TITANIO LATEX','140x190',2)]),
      P(hoy,'Foton nuevo','Luis Eyzaguirre','CLIENTE B',[x('CH1107','ESPECIAL SEMIORTOPEDICO','140x190',3,{chk:'im'})]),
      P(hoy,'Foton encarpado','Cristhian','CLIENTE C',[x('CH1761','ORO BI RELAX','140x190',2,{chk:'ok',chkDe:'Banzer'}),x('CH1121','HEAVEN TROPICAL','140x190',1)]),
      P(hoy,'','','CLIENTE D',[x('CH1130','TITANIO LATEX','160x190',1)]),
      P(man,'Carry','Luis Pierre','CLIENTE E',[x('CH1036','ORO ANATOMICO VISCOLASTICO','140x190',4)])
    ];
    STOCK=stockVacio(); STOCK_CARGADO=true; STOCK.al={'Banzer':'sale'};
    CARGA_CHK={}; saveMirror();
    showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    CV_DIA='hoy'; CV_SEL='Foton nuevo'; cargaVivaPintar();
  });

  // ══ 1. Dónde vive ══
  console.log('\n── 1. En Administración, no en la Lista de carga; lo de Codex ya no está ──');
  let r = await page.evaluate(() => {
    var box=document.getElementById('carga-viva'), img=box && box.querySelector('.cv-lienzo img');
    return { enResumen:!document.getElementById('adm-resumen') && !!box.closest('#view-admin') && (box.nextElementSibling===document.getElementById('adm-cal') || (box.nextElementSibling && box.nextElementSibling.id==='carga-viva-linea' && box.nextElementSibling.nextElementSibling===document.getElementById('adm-cal'))), primero:true,
      img:img?img.getAttribute('src'):'', enCarga:!!document.querySelector('#carga-overlay #carga-viva, #carga-overlay .cv-caja'),
      codex:!!document.getElementById('adm-logistica') || !!document.querySelector('script[src*="admin-logistica"],link[href*="admin-logistica"]') || typeof window.AdminLogistica!=='undefined',
      titulo:(document.getElementById('cv-dia')||{}).textContent||'' };
  });
  chk('⚠️ la tira está en Administración, arriba del 📅 calendario (dueño, 09/10); el resumen ya no existe (§4io: lo sacó el dueño)', r.enResumen && r.primero, J(r));
  chk('…con la imagen de los depósitos (carga-viva/escena.jpg)', /^carga-viva\/escena\.jpg/.test(r.img), r.img);
  chk('⚠️ NO aparece en la Lista de carga (dueño: «solo en administración»)', !r.enCarga);
  chk('⚠️ la escena 3D de Codex ya no está (ni su caja, ni su script, ni su hoja de estilo)', !r.codex);
  chk('el título dice el día', /Camiones de hoy/.test(r.titulo), r.titulo);

  // ══ 2 y 3. Camiones y cuentas ══
  console.log('\n── 2-3. Los camiones y sus cuentas ──');
  r = await page.evaluate(() => {
    var D=cargaVivaDatos(), c=function(k){ var x=D.porK[k]; return x?{t:x.total,d:x.dentro,est:x.est,fab:x.fabTotal,n:x.lineas.length}:null; };
    var chips=[].map.call(document.querySelectorAll('#cv-panel .cv-chip'),function(b){ return b.textContent.trim(); });
    var pin=function(id){ var e=document.getElementById('cv-pin-'+id); return e?e.textContent.replace(/\s+/g,' ').trim():''; };
    return { chips:chips, nuevo:c('Foton nuevo'), carpa:c('Foton encarpado'), carry:c('Carry'), sin:c('Sin vehículo'), bz:D.bz, im:D.im.u,
      pinPtf:pin('ptf'), pinBz:pin('bz'), pinIm:pin('im'), panel:document.getElementById('cv-panel').innerText.replace(/\s+/g,' ') };
  });
  chk('⚠️ los cuatro camiones de VEHICULOS + «Sin vehículo»', J(r.chips)===J(['Carry','Foton nuevo','Foton encarpado','Foton insumo','Sin vehículo']), J(r.chips));
  chk('Foton nuevo: 5 bultos en fábrica (2 + 3), nada tildado, cargando', r.nuevo && r.nuevo.t===5 && r.nuevo.d===0 && r.nuevo.est==='carga' && r.nuevo.fab===5, J(r.nuevo));
  chk('Foton encarpado: 3 bultos, 2 en Banzer y 1 en fábrica', r.carpa && r.carpa.t===3 && r.carpa.fab===1 && r.carpa.n===2, J(r.carpa));
  chk('el Carry no tiene pedidos HOY: «sin carga»', r.carry && r.carry.t===0 && r.carry.est==='nada', J(r.carry));
  chk('el pedido sin camión va a «Sin vehículo»', r.sin && r.sin.t===1 && r.sin.est==='sin', J(r.sin));
  chk('⚠️ el cartel de Banzer suma lo que se carga allá (2 bultos) y el de Moreno lo que hay que traer (3)', r.bz.total===2 && r.im===3 && /Cargar en Banzer/.test(r.pinBz) && /0 de 2 bultos/.test(r.pinBz) && /Ir a buscar a Moreno/.test(r.pinIm) && /3 bultos para traer/.test(r.pinIm), J({bz:r.bz, im:r.im, pinBz:r.pinBz, pinIm:r.pinIm}));
  chk('el cartel de PTF es el camión elegido', /Foton nuevo/.test(r.pinPtf) && /0 de 5 bultos en PTF/.test(r.pinPtf), r.pinPtf);
  chk('el panel dice chofer, paradas, carga y lo que falta, con el aviso de recoger', /Luis Eyzaguirre · 2 paradas/.test(r.panel) && /0 \/ 5 bultos/.test(r.panel) && /Faltan 5 bultos/.test(r.panel) && /3 recoger de Moreno/.test(r.panel), r.panel.slice(0,300));

  // ══ 4. Los mismos tildes que la Lista de carga ══
  console.log('\n── 4. Tildar acá es tildar en la Lista de carga (y al revés) ──');
  r = await page.evaluate(async () => {
    var fila=document.querySelector('#cv-panel .cv-fila[data-l="fabrica"]'), k=fila.getAttribute('data-k');
    cvTildar(fila); await new Promise(r=>setTimeout(r,50));
    var D=cargaVivaDatos(), conChk=isCargaChk(k);
    CARGA_DIA='hoy'; abrirCarga(); setCargaDia('hoy');
    var cb=[].filter.call(document.querySelectorAll('#carga-body input[type=checkbox]'),function(i){ return i.getAttribute('data-k')===k; })[0];
    var enLista=!!(cb && cb.checked);
    // y al revés: tildar en la lista el otro renglón del Foton nuevo
    var otro=[].filter.call(document.querySelectorAll('#carga-body .carga-cam[data-veh="Foton nuevo"] input[type=checkbox]'),function(i){ return !i.checked; })[0];
    otro.checked=true; otro.dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,50));
    closeCarga(); renderAdmin(); await new Promise(r=>setTimeout(r,50));
    var D2=cargaVivaDatos();
    return { k:k, conChk:conChk, dentro1:D.porK['Foton nuevo'].dentro, enLista:enLista, dentro2:D2.porK['Foton nuevo'].dentro, est2:D2.porK['Foton nuevo'].est,
      fechaEnClave:k.split('|')[0]===todayStr() };
  });
  chk('⚠️ tildar en el panel guarda el tilde con la clave de la Lista de carga (fecha de hoy)', r.conChk && r.fechaEnClave && r.dentro1>0, J(r));
  chk('⚠️ …y en la Lista de carga ese renglón aparece tildado', r.enLista);
  chk('⚠️ tildar en la Lista de carga lo suma en el panel de Administración', r.dentro2===5, J({dentro2:r.dentro2}));

  // ══ 5. Completar ══
  console.log('\n── 5. Camión completo: «Listo para salir» ──');
  await page.waitForTimeout(3600);   // que se vaya el papel picado de antes
  r = await page.evaluate(() => {
    CV_SEL='Foton nuevo'; cargaVivaPintar();
    var chip=document.querySelector('#cv-panel .cv-chip[data-k="Foton nuevo"] i');
    return { est:cargaVivaDatos().porK['Foton nuevo'].est, panel:document.getElementById('cv-panel').innerText.replace(/\s+/g,' '),
      pin:document.getElementById('cv-pin-ptf').textContent.replace(/\s+/g,' '), pinCls:document.getElementById('cv-pin-ptf').className,
      chip:chip?chip.getAttribute('style'):'', accion:document.getElementById('cv-accion').textContent };
  });
  chk('⚠️ el panel dice «Listo para salir» y «Todo tildado en la Lista de carga»', r.est==='ok' && /Listo para salir/.test(r.panel) && /Todo tildado en la Lista de carga/.test(r.panel), r.panel.slice(0,200));
  chk('el cartel de PTF y el chip se ponen en verde', /ok/.test(r.pinCls) && /todo cargado en PTF/.test(r.pin) && /cv-verde/.test(r.chip), J({pin:r.pin, cls:r.pinCls, chip:r.chip}));
  chk('el botón sobre la imagen dice «Listo para salir»', /Listo para salir/.test(r.accion), r.accion);
  r = await page.evaluate(async () => {
    CV_SEL='Foton encarpado'; cargaVivaPintar();
    var filas=[].slice.call(document.querySelectorAll('#cv-panel .cv-fila:not(.on)'));
    filas.forEach(function(f){ cvTildar(document.querySelector('#cv-panel .cv-fila[data-k="'+CSS.escape(f.getAttribute('data-k'))+'"]')); });
    await new Promise(r=>setTimeout(r,120));
    /* (§4jh) la fiesta sale recién con el guardado confirmado: a los 120 ms todavía no, y el panel dice «Guardando…» */
    var antes=document.querySelectorAll('#cv-capa .cv-chispa').length, sync=(document.getElementById('cv-sync')||{}).textContent||'';
    await new Promise(r=>setTimeout(r,1800));
    var conf=document.querySelectorAll('#cv-capa .cv-chispa').length, faros=document.querySelectorAll('#cv-faros-bz .cv-faro.fuerte').length + document.querySelectorAll('#cv-faros-ptf .cv-faro.fuerte').length;
    return { est:cargaVivaDatos().porK['Foton encarpado'].est, bz:cargaVivaDatos().bz, conf:conf, faros:faros, listo:!!document.querySelector('#cv-panel .cv-listo'), antes:antes, sync:sync, sync2:(document.getElementById('cv-sync')||{}).textContent||'' };
  });
  chk('⚠️ tildar los dos renglones del encarpado (fábrica y Banzer) lo completa, con papel picado y luces', r.est==='ok' && r.listo && r.conf>0 && r.faros>0, J(r));
  chk('(§4jh) …pero el papel picado espera al guardado confirmado: antes dice «Guardando…», después «✓ Guardado»', r.antes===0 && /Guardando/.test(r.sync) && /Guardado en la planilla/.test(r.sync2), J({antes:r.antes, sync:r.sync, sync2:r.sync2}));
  chk('…y el cartel de Banzer queda 2 de 2', r.bz.total===2 && r.bz.dentro===2, J(r.bz));

  // ══ 6. Hoy / Mañana ══
  console.log('\n── 6. Hoy y mañana ──');
  r = await page.evaluate(() => {
    document.getElementById('cv-manana').click();
    var D=cargaVivaDatos(), carry=D.porK['Carry'], k=carry.lineas[0]&&carry.lineas[0].key;
    var out={ titulo:document.getElementById('cv-dia').textContent, sel:CV_SEL, carry:{t:carry.total,est:carry.est}, nuevo:D.porK['Foton nuevo'].total,
      fecha:k?k.split('|')[0]:'', man:proximoDiaEntrega(), on:document.getElementById('cv-manana').className };
    document.getElementById('cv-hoy').click();
    out.vuelve=cargaVivaDatos().porK['Foton nuevo'].total;
    return out;
  });
  chk('⚠️ «Mañana» muestra los pedidos de mañana (el Carry con 4) y su clave lleva esa fecha', /mañana/.test(r.titulo) && r.carry.t===4 && r.nuevo===0 && r.fecha===r.man && r.on==='on' && r.sel==='Carry', J(r));
  chk('volver a «Hoy» trae los de hoy', r.vuelve===5, J({vuelve:r.vuelve}));

  // ══ 7. Ver sus paradas ══
  console.log('\n── 7. «Ver sus paradas en la Lista de carga» ──');
  r = await page.evaluate(() => {
    CV_SEL='Foton encarpado'; cargaVivaPintar();
    document.querySelector('#cv-panel .cv-ir').click();
    var ov=document.getElementById('carga-overlay'), info=document.getElementById('carga-info').textContent;
    var out={ abierta:ov.style.display==='flex', dia:CARGA_DIA, info:info, enLista:!!document.querySelector('#carga-body .carga-cam[data-veh="Foton encarpado"]') };
    closeCarga(); return out;
  });
  chk('abre la Lista de carga en ese día, con el bloque del camión', r.abierta && r.dia==='hoy' && /hoy/.test(r.info) && r.enLista, J(r));

  // ══ 7b. Tocar Banzer o Moreno abre SU panel al costado, no otra pantalla (§4ic) ══
  console.log('\n── 7b. Banzer y Moreno abren su panel al costado (§4ic) ──');
  r = await page.evaluate(() => {
    var ov=document.getElementById('carga-overlay'), abierta=function(){ return ov.style.display==='flex'; }, txt=function(){ return document.getElementById('cv-panel').innerText.replace(/\s+/g,' '); };
    CV_DIA='hoy'; CV_SEL='Foton nuevo'; CV_VISTA=''; cargaVivaPintar();
    var o={};
    document.getElementById('cv-pin-bz').click();
    o.bz={ lista:abierta(), txt:txt(), filas:document.querySelectorAll('#cv-panel .cv-fila').length, pinMarcado:/vista/.test(document.getElementById('cv-pin-bz').className) };
    var k=document.querySelector('#cv-panel .cv-fila').getAttribute('data-k'); setCargaChk(k,false); cargaVivaPintar();   // las secciones de antes ya lo tildaron
    document.querySelector('#cv-panel .cv-fila[data-k="'+k.replace(/"/g,'\\"')+'"]').click();
    o.tilde={ k:k, on:isCargaChk(k), sigue:CV_VISTA, txt:txt() };
    setCargaChk(k,false); cargaVivaPintar();
    document.getElementById('cv-pin-im').click();
    o.im={ lista:abierta(), txt:txt() };
    document.querySelector('#carga-viva img.cv-cuerpo[data-id="bz"]').click();
    o.cuerpoBz=CV_VISTA;
    document.querySelector('#cv-panel .cv-volver').click();
    o.volver={ vista:CV_VISTA, txt:txt() };
    document.getElementById('cv-pin-im').click();
    document.querySelector('#cv-panel .cv-chip[data-k="Carry"]') ? 0 : 0;
    var chips=document.querySelectorAll('#cv-panel .cv-chip'); o.chipsEnLugar=chips.length;
    document.getElementById('cv-pin-ptf').click();
    o.ptf={ lista:abierta(), vista:CV_VISTA, txt:txt() };
    if(abierta()) closeCarga();
    return o;
  });
  chk('§4ic: tocar «Cargar en Banzer» abre el panel de Banzer al costado (no la Lista de carga), con el camión y lo que lleva',
    !r.bz.lista && /CARGAR EN BANZER/.test(r.bz.txt) && /Foton encarpado/.test(r.bz.txt) && /2× ORO BI RELAX/.test(r.bz.txt) && r.bz.filas===1 && r.bz.pinMarcado, J(r.bz));
  chk('§4ic: tildar en el panel de Banzer es el mismo tilde de la Lista de carga, y el panel sigue en Banzer', r.tilde.on && r.tilde.sigue==='bz' && /Todo cargado en Banzer/.test(r.tilde.txt), J(r.tilde));
  chk('§4ic: tocar «Ir a buscar a Moreno» abre el panel de Moreno: qué traer y para qué camión', !r.im.lista && /IR A BUSCAR/.test(r.im.txt) && /3× ESPECIAL SEMIORTOPEDICO/.test(r.im.txt) && /Foton nuevo/.test(r.im.txt), J(r.im));
  chk('§4ic: tocar el camión de Banzer en la imagen también abre su panel', r.cuerpoBz==='bz', J(r.cuerpoBz));
  chk('§4ic: «← Volver al camión» y el cartel de PTF vuelven al camión elegido, sin abrir otra pantalla',
    r.volver.vista==='' && /CAMIÓN ELEGIDO/.test(r.volver.txt) && !r.ptf.lista && r.ptf.vista==='' && /Foton nuevo/.test(r.ptf.txt), J({volver:r.volver.vista, ptf:r.ptf}));

  r = await page.evaluate(() => {
    CV_DIA='hoy'; CV_VISTA=''; cvElegir('Carry');
    var txt=document.getElementById('cv-panel').innerText.replace(/\s+/g,' '), b=[].slice.call(document.querySelectorAll('#cv-panel .cv-volver')).filter(function(x){ return /sin camión/.test(x.textContent); })[0];
    if(b) b.click();
    return { txt:txt, boton:!!b, sel:CV_SEL };
  });
  chk('§4id: un camión sin pedidos dice que ningún pedido lo tiene asignado, cuántos esperan camión, y lleva a «Sin vehículo»',
    /Ningún pedido de hoy tiene asignado el Carry/.test(r.txt) && /1 pedido sin camión/.test(r.txt) && r.boton && r.sel==='Sin vehículo', J(r));

  r = await page.evaluate(async () => {
    CV_DIA='hoy'; CV_VISTA=''; cvElegir('Sin vehículo');
    var s=document.querySelector('#cv-panel select.cv-sel'), id=s && s.getAttribute('data-id'), txt=document.getElementById('cv-panel').innerText.replace(/\s+/g,' ');
    var opciones=s ? [].slice.call(s.options).map(function(o){ return o.value||o.textContent; }) : [];
    s.value='Carry'; s.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(function(r){ setTimeout(r,150); });
    var p=findById(id), D=cargaVivaDatos();
    var o={ id:id, txt:txt, opciones:opciones, veh:p.vehiculo, chofer:p.chofer, guardado:!!(_SRV[id] && _SRV[id].vehiculo==='Carry'),
      sinQueda:!!D.porK['Sin vehículo'], carry:D.porK['Carry'] && D.porK['Carry'].paradas, enTabla:vehiculoDe(p) };
    p.vehiculo=''; p.chofer=''; persistPedido(p);   // dejar el fixture como estaba
    return o;
  });
  chk('§4ie: en «Sin vehículo» cada pedido trae su selector de camión (los cuatro de VEHICULOS)',
    /ASIGNAR CAMIÓN/.test(r.txt) && /CLIENTE D/.test(r.txt) && ['Carry','Foton nuevo','Foton encarpado','Foton insumo'].every(function(v){ return r.opciones.indexOf(v)>=0; }), J({txt:r.txt.slice(0,200), op:r.opciones}));
  chk('§4ie: elegir el camión lo guarda en el pedido (vehículo y chofer, como la columna de la tabla) y pasa a ese camión',
    r.veh==='Carry' && r.chofer==='Luis Pierre' && r.guardado && !r.sinQueda && r.carry===1, J(r));

  // ══ 8. Plegar, celular, errores ══
  console.log('\n── 8. Dos botones separados (§4ib); celular; errores ──');
  r = await page.evaluate(() => {
    var vis=function(id){ var e=document.getElementById(id); for(var n=e; n && n!==document.body; n=n.parentElement){ if(n.style && n.style.display==='none') return false; } return !!e; };
    var o={};
    o.resOff={ cam:vis('carga-viva') && !!document.querySelector('#carga-viva .cv-caja'), sinBoton:!document.getElementById('adm-resumen-btn'), sinFn:typeof window.toggleResumenAdm==='undefined' };
    toggleCamionesAdm();
    o.camOff={ cam:vis('carga-viva'), vacio:document.getElementById('carga-viva').innerHTML==='', tabla:vis('tbl-pedidos'), btn:document.getElementById('adm-camiones-btn').textContent, guardado:localStorage.getItem('pedidos_camiones_adm') };
    renderAdmin();
    o.trasRender={ cam:vis('carga-viva'), vacio:document.getElementById('carga-viva').innerHTML==='' };
    toggleCamionesAdm();
    o.camOn={ cam:vis('carga-viva') && !!document.querySelector('#carga-viva .cv-caja'), btn:document.getElementById('adm-camiones-btn').textContent };
    return o;
  });
  chk('el botón «Ocultar resumen» ya no está (§4io, el resumen se sacó) y los camiones se ven', r.resOff.cam && r.resOff.sinBoton && r.resOff.sinFn, J(r.resOff));
  chk('«🙈 Ocultar camiones» esconde solo los camiones (no se dibujan) y la tabla queda a la vista', !r.camOff.cam && r.camOff.vacio && r.camOff.tabla && /Ver camiones/.test(r.camOff.btn) && r.camOff.guardado==='0', J(r.camOff));
  chk('escondidos siguen escondidos aunque Administración se repinte', !r.trasRender.cam && r.trasRender.vacio, J(r.trasRender));
  chk('«👁️ Ver camiones» los vuelve a mostrar', r.camOn.cam && /Ocultar camiones/.test(r.camOn.btn), J(r.camOn));
  r = await page.evaluate(() => {
    var l=document.querySelector('#carga-viva .cv-lienzo'), hijos=[].slice.call(l.children), huella=document.getElementById('cv-h-ptf');
    var svgH=huella && huella.closest('svg'), cuerpos=[].slice.call(l.querySelectorAll('img.cv-cuerpo')), faro=document.getElementById('cv-faros-ptf');
    return { cuerpos:cuerpos.length, recorte:cuerpos.every(function(i){ return /polygon/.test(i.style.clipPath); }),
      encima:cuerpos.length && cuerpos.every(function(i){ return hijos.indexOf(i)>hijos.indexOf(svgH); }),
      farosArriba:!!faro && hijos.indexOf(faro.closest('svg'))>hijos.indexOf(cuerpos[cuerpos.length-1]) };
  });
  chk('§4ib: los tres camiones se vuelven a dibujar ENCIMA de la huella (las líneas quedan en el piso) y las luces encima de todo', r.cuerpos===3 && r.recorte && r.encima && r.farosArriba, J(r));
  await page.setViewportSize({ width:390, height:844 });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => { cargaVivaPintar(); var b=document.getElementById('carga-viva').getBoundingClientRect(), m=document.querySelector('#carga-viva .cv-mapa').getBoundingClientRect();
    return { pagina:document.documentElement.scrollWidth, der:Math.round(b.right), caja:Math.round(b.width), mapa:Math.round(m.width) }; });
  chk('en el celular (390 px) no se sale de la pantalla y la imagen ocupa el ancho de la caja', r.pagina<=392 && r.der<=392 && r.mapa>=r.caja-30, J(r));
  chk('sin errores de JS', errors.length===0, errors.join(' | '));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
