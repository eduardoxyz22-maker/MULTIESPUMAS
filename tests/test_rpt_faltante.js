/* 🏪 LA REPOSICIÓN QUE NO FUE ENTERA PIDE MANDAR LO QUE FALTÓ (30/10, propuesta 83; dueño: «83»).

   En octubre la RPT 09-020 de Central y la 10-016 de Carmelo se tildaron ✅ con 11 unidades marcadas ✗ (no hay) o mandadas a
   fabricar sin llegar. Central volvió a pedir lo mismo 17 días después; de Carmelo el panel no sabe si fueron.

   LO QUE CUIDA:
   1. Qué faltó: un ✗ entero (menos lo anotado como llegado), un 🏭 que NO PUDO llegar antes de entregarse (pedido el 27/10, entregado
      el 28/10), pero no un 🏭 pedido hace días (casi seguro llegó: logística no anota «llegó») ni uno re-marcado ✔.
   2. Sin `RPT_FALTA_PRUEBA`, en Playwright no sale ninguna ventana (las pruebas viejas tildan RPT).
   3. Al tildar ✅ desde la ficha pregunta; «Sí, armarla» arma la RPT nueva: N° siguiente de RPT, la MISMA sucursal (cliente, zona,
      dirección, pin, celular) y vendedora, los renglones que faltaron (cantidad, `rtipo`, `robs`) sin marcas de stock, el próximo día
      con lugar a la MAÑANA (saltea uno lleno), la nota «Lo que faltó de la RPT 10-016», guardada por el camino de siempre; la original
      queda marcada y se vuelve a la ficha.
   4. Con la marca no vuelve a preguntar (destildar y tildar), y `heredarMarcas` la conserva al corregir.
   5. Administración: el chip «🏪 Reposiciones» cuenta las entregadas con faltantes sin resolver de los últimos 30 días y `#adm-rpt`
      las lista con «Armar la de lo que faltó»; «No, ya se resolvió» las saca.
   6. El cierre de entregas pregunta adentro de su resultado.

   Reloj CLAVADO (miércoles 28/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_rpt_faltante.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rpt_faltante.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-28T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  /* Con el panel viejo (dientes) las funciones nuevas no existen: lo que no vino, vacío, para que cada comprobación diga ✗ y no se corte. */
  const D = (r, d) => Object.assign({}, d, (r && !r.__error) ? r : {});

  const arranque = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_cierre_quien'); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var al=document.getElementById('admin-lock'); if(al) al.style.display='none';
    var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
    var ts=function(f){ return new Date(f+'T11:00:00-04:00').getTime(); }, n=0;
    var P=function(o){ n++; return Object.assign({ id:'x'+n, oc:'10-'+(200+n), nota:String(3000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:'2026-10-29', turno:'AM', zona:'Norte',
      direccion:'Calle '+n, maps:'', vendedor:'Carola Chavez', productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'CH1001', cant:1 }], saldo:0, acuenta:0, pagado:true,
      metodoPago:'Efectivo 100 @2026-10-20 #1 %IMG', ts:ts('2026-10-20'), entregado:false, verificado:false, estado:'', vehiculo:'', chofer:'', nroDia:n, fotos:[] }, o); };
    var L=[];
    // el jueves 29/10 a la mañana está LLENO (12 de 12): la reposición nueva tiene que ir al viernes 30/10
    for(var i=0;i<12;i++) L.push(P({ id:'lleno'+i }));
    L.push(P({ id:'r16', oc:'RPT 10-016', nota:'', cliente:'Carmelo', zona:'Feria', direccion:'Av. Carmelo 1', maps:'https://www.google.com/maps?q=-17.79,-63.15', celular:'71111111',
      vendedor:'Juan Pablo Paredes', fecha:'2026-10-28', metodoPago:'', pagado:false, ts:ts('2026-10-24'), productos:[
        { desc:'COLCHON SOFT', medida:'140x190', codigo:'CH1001', cant:5, chk:'no', rtipo:'Reposición', robs:'urgente' },
        { desc:'SOMIER SUEÑA', medida:'140x190', codigo:'SM1400', cant:2, enProd:true, prodF:'2026-10-27' },               // pedido ayer: no pudo llegar
        { desc:'COLCHON CONFORT', medida:'105x190', codigo:'CH2000', cant:3, chk:'ok', chkDe:'Banzer' },
        { desc:'ALMOHADA', medida:'50x70', codigo:'CD1403', cant:20, enProd:true, prodF:'2026-10-20' },                  // pedida el 20: pudo llegar
        { desc:'COLCHON SMART', medida:'105x190', codigo:'CH3000', cant:3, chk:'ok', enProd:true, prodF:'2026-10-27' },  // re-marcada ✔: llegó
        { desc:'COLCHON TITANIO', medida:'160x190', codigo:'CH1220', cant:4, chk:'no', enProd:true, prodF:'2026-10-20', prodU:1, rtipo:'Adicional' }  // ✗ con 1 llegada
      ] }));
    L.push(P({ id:'r15', oc:'RPT 10-015', nota:'', cliente:'Central', zona:'Central', fecha:'2026-10-20', entregado:true, metodoPago:'', pagado:false, ts:ts('2026-10-18'),
      productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1221', cant:1, chk:'no' }] }));
    L.push(P({ id:'r05', oc:'RPT 09-005', nota:'', cliente:'Mia Plaza', fecha:'2026-09-10', entregado:true, metodoPago:'', pagado:false, ts:ts('2026-09-08'),
      productos:[{ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:1, chk:'no' }] }));                       // hace 48 días: no
    L.push(P({ id:'r14', oc:'RPT 10-014', nota:'', cliente:'Charcas', fecha:'2026-10-21', entregado:true, metodoPago:'', pagado:false, ts:ts('2026-10-19'),
      productos:[{ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:1, chk:'no', rpf:{ r:'no', t:1 } }] }));  // ya resuelta
    L.push(P({ id:'r13', oc:'RPT 10-013', nota:'', cliente:'Mutualista', zona:'Mutualista', fecha:'2026-10-28', metodoPago:'', pagado:false, ts:ts('2026-10-22'), vendedor:'Mauricio Merida',
      productos:[{ desc:'COLCHON SOFT', medida:'160x190', codigo:'CH1002', cant:2, chk:'no' }, { desc:'COLCHON SOFT', medida:'105x190', codigo:'CH1003', cant:1, chk:'ok' }] }));
    L.push(P({ id:'r12', oc:'RPT 10-012', nota:'', cliente:'Central', fecha:'2026-10-28', metodoPago:'', pagado:false, ts:ts('2026-10-22'),
      productos:[{ desc:'COLCHON SOFT', medida:'160x190', codigo:'CH1002', cant:2, chk:'ok' }] }));                       // entera: no pregunta
    window._L=L; STATE=JSON.parse(JSON.stringify(L)); saveMirror();
    window._saves=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(r, o){ window._saves.push({ rec:JSON.parse(JSON.stringify(r)), opts:o||null }); var g=JSON.parse(JSON.stringify(r)); g.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:g }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
    showView('admin'); await new Promise(function(r){ setTimeout(r, 250); });
    STATE=JSON.parse(JSON.stringify(window._L));
    window._modal=function(){ var m=document.getElementById('modal'); return m && m.classList.contains('on') ? (m.innerText||'') : ''; };
    return { ok:true };
  });
  if(arranque.__error) console.log('arranque:', arranque.__error);

  /* 1 */
  console.log('\n── 1. Qué faltó ──');
  let r = await ev(() => {
    var F=rptFaltantes(findById('r16'));
    return { F:F.map(function(f){ return f.u+' '+f.x.desc+' '+f.por; }), u:rptFaltaU(F), r12:rptFaltantes(findById('r12')).length, venta:rptFaltantes(findById('lleno0')).length, dia:rptFaltaDia() };
  }); r=D(r, { F:[] });
  chk('1a. faltaron 5 SOFT (✗), 2 SOMIER (🏭 pedido ayer) y 3 TITANIO (✗ con 1 que llegó): 10', r.F.join(' | ')==='5 COLCHON SOFT no | 2 SOMIER SUEÑA prod | 3 COLCHON TITANIO prod' && r.u===10, r);
  chk('1b. la ALMOHADA pedida el 20 (pudo llegar) y el SMART re-marcado ✔ no cuentan; una RPT entera y una venta, nada', r.F.join().indexOf('ALMOHADA')<0 && r.F.join().indexOf('SMART')<0 && r.r12===0 && r.venta===0, r);
  chk('1c. el próximo día con lugar a la mañana es el viernes 30/10 (el jueves está lleno)', r.dia==='2026-10-30', r.dia);

  /* 2 */
  console.log('\n── 2. En Playwright, sin la bandera, no sale ──');
  r = await ev(async () => {
    closeModal(); quickEntregado('r16'); await new Promise(function(res){ setTimeout(res, 150); });
    var t=_modal(); var p=findById('r16'); p.entregado=false; upsert(p); closeModal();
    return { t:t, cierre:rptFaltaCierreHtml([findById('r13')]) };
  }); r=D(r, { t:'', cierre:null });
  chk('2. sin RPT_FALTA_PRUEBA no se abre ninguna ventana ni el recuadro del cierre', !/no fue entera/.test(r.t) && r.cierre==='', r.t.slice(0,100));

  /* 3 */
  console.log('\n── 3. Desde la ficha: «Sí, armarla» ──');
  r = await ev(async () => {
    window.RPT_FALTA_PRUEBA=true; _saves=[];
    showPedidoModal('r16'); toggleEntregado('r16');
    await new Promise(function(res){ setTimeout(res, 150); });
    var t=_modal(), btns=[].map.call(document.querySelectorAll('#rptf-modal .rptf-btns button'), function(b){ return b.textContent; });
    var si=[].slice.call(document.querySelectorAll('#rptf-modal .rptf-btns button')).filter(function(b){ return /Sí, armarla/.test(b.textContent); })[0];
    if(si) si.click();
    await new Promise(function(res){ setTimeout(res, 500); });
    var nueva=STATE.filter(function(p){ return /Lo que faltó de la RPT 10-016/.test(p.observaciones||''); })[0]||null, orig=findById('r16');
    var svN=nueva ? _saves.filter(function(s){ return s.rec.id===nueva.id; }).length : 0;
    var svO=_saves.filter(function(s){ return s.rec.id==='r16' && s.rec.productos[0].rpf; }).length;
    return { t:t, btns:btns, nueva:nueva, svN:svN, svO:svO, marca:orig.productos.map(function(x){ return x.rpf ? (x.rpf.r+':'+x.rpf.n) : ''; }), ficha:_modal(), toasts:_toasts.slice(-2) };
  }); r=D(r, { t:'', btns:[], marca:[0], toasts:[], ficha:'' });
  chk('3a. al tildar ✅ en la ficha pregunta con la frase del dueño y los dos botones', /Esta reposición iba con 10 productos que no había: ¿armamos otra reposición con lo que faltó\?/.test(r.t) && r.btns.join('|')==='Sí, armarla|No, ya se resolvió', r.t.slice(0,300));
  chk('3b. dice adónde y cuándo: Carmelo, el 30/10/2026 a la mañana', /Carmelo/.test(r.t) && /30\/10\/2026 a la mañana/.test(r.t), r.t.slice(0,400));
  var nv=r.nueva||{};
  chk('3c. armó la RPT 10-017 para la MISMA sucursal (cliente, zona, dirección, pin, celular) y vendedora', nv.oc==='RPT 10-017' && nv.cliente==='Carmelo' && nv.zona==='Feria' && nv.direccion==='Av. Carmelo 1' && /-17\.79/.test(nv.maps||'') && nv.celular==='71111111' && nv.vendedor==='Juan Pablo Paredes', nv);
  chk('3d. el viernes 30/10 a la mañana, sin entregar, con la nota «Lo que faltó de la RPT 10-016»', nv.fecha==='2026-10-30' && nv.turno==='AM' && !nv.entregado && nv.observaciones==='Lo que faltó de la RPT 10-016', nv);
  var pr=(nv.productos||[]);
  chk('3e. con los renglones que faltaron (5, 2 y 3), su tipo y observación, y SIN marcas de stock',
      pr.map(function(x){ return x.cant+' '+x.desc; }).join(' | ')==='5 COLCHON SOFT | 2 SOMIER SUEÑA | 3 COLCHON TITANIO' && pr[0].rtipo==='Reposición' && pr[0].robs==='urgente' && pr[2].rtipo==='Adicional' &&
      pr.every(function(x){ return !x.chk && !x.enProd && !x.prodF && !x.rpf; }), pr);
  chk('3f. se guardó (durable) y la original quedó marcada «sí → RPT 10-017» en todos sus productos', r.svN>=1 && r.svO>=1 && r.marca.every(function(m){ return m==='si:RPT 10-017'; }), r.marca);
  chk('3g. avisa el número y vuelve a la ficha de la original', r.toasts.some(function(t){ return /armé la RPT 10-017/.test(t); }) && /RPT 10-016|Carmelo/.test(r.ficha) && !/no fue entera/.test(r.ficha), r.toasts);

  /* 4 */
  console.log('\n── 4. No vuelve a preguntar ──');
  r = await ev(async () => {
    closeModal(); var n0=STATE.length;
    quickEntregado('r16'); quickEntregado('r16'); await new Promise(function(res){ setTimeout(res, 150); });
    var t=_modal();
    var h=heredarMarcas([{ desc:'COLCHON SOFT', medida:'140x190', codigo:'CH1001', cant:5 }], findById('r16').productos);
    closeModal();
    return { t:t, n:STATE.length-n0, ent:findById('r16').entregado, h:h[0].rpf ? h[0].rpf.r : '' };
  }); r=D(r, { t:'' });
  chk('4a. destildar y volver a tildar no pregunta ni arma otra', !/no fue entera/.test(r.t) && r.n===0 && r.ent===true, r);
  chk('4b. corregir la RPT conserva la marca (heredarMarcas)', r.h==='si', r);

  /* 5 */
  console.log('\n── 5. Administración: el chip y la lista ──');
  r = await ev(async () => {
    renderAdmin(); renderRptAtrasadas(); renderChips();
    var chip=document.querySelector('#adm-chips .qchip[data-k="rpt"]'), box=document.getElementById('adm-rpt');
    var a={ chip:chip?chip.textContent.replace(/\s+/g,' '):'', alerta:chip?chip.classList.contains('qchip-alerta'):false, box:box?box.textContent.replace(/\s+/g,' '):'' };
    var hacer=admHacerDatos().filter(function(o){ return o.k==='rpt-f'; })[0]; a.hacer=hacer?(hacer.n+' '+hacer.t):'';
    var b=box?[].slice.call(box.querySelectorAll('button')).filter(function(x){ return /Armar la de lo que faltó/.test(x.textContent); })[0]:null;
    if(b) b.click();
    await new Promise(function(res){ setTimeout(res, 100); });
    a.modal=_modal();
    var no=[].slice.call(document.querySelectorAll('#rptf-modal .rptf-btns button')).filter(function(x){ return /No, ya se resolvió/.test(x.textContent); })[0];
    var n0=STATE.length; if(no) no.click();
    await new Promise(function(res){ setTimeout(res, 200); });
    renderRptAtrasadas(); renderChips();
    var chip2=document.querySelector('#adm-chips .qchip[data-k="rpt"]');
    a.despues={ chip:chip2?chip2.textContent.replace(/\s+/g,' '):'', box:(document.getElementById('adm-rpt')||{}).textContent||'', marca:(findById('r15').productos[0].rpf||{}).r, nuevas:STATE.length-n0, cerrado:!_modal() };
    return a;
  }); r=D(r, { chip:'', box:'', modal:'', despues:{} });
  chk('5a. el chip «🏪 Reposiciones» parpadea con «🔴 1 con faltantes» (la de Central del 20/10; ni la de 48 días ni la ya resuelta)', /🔴 1 con faltantes/.test(r.chip) && r.alerta, r.chip);
  chk('5b. #adm-rpt la lista con lo que faltó y «Armar la de lo que faltó», y «Para hacer» la cuenta', /1 reposición entregada con faltantes/.test(r.box) && /RPT 10-015/.test(r.box) && /faltaron 1: 1 TITANIO ICE 160x190 ✗/.test(r.box) && /Armar la de lo que faltó/.test(r.box) && r.hacer==='1 Reposiciones entregadas con faltantes', r.box+' · '+r.hacer);
  chk('5c. «Armar la de lo que faltó» abre la pregunta aunque sea Playwright (la tocó una persona)', /no fue entera/.test(r.modal) && /1 producto que no había/.test(r.modal), r.modal.slice(0,200));
  chk('5d. «No, ya se resolvió» la marca, no arma nada, cierra y la saca del chip y de la lista', r.despues.marca==='no' && r.despues.nuevas===0 && r.despues.cerrado && !/con faltantes/.test(r.despues.chip) && !/con faltantes/.test(r.despues.box), r.despues);

  /* 6 */
  console.log('\n── 6. El cierre de entregas ──');
  r = await ev(async () => {
    closeModal(); _saves=[];
    abrirCierreEntregas(); await new Promise(function(res){ setTimeout(res, 100); });
    ['r13','r12'].forEach(function(id){ cierreEntToggle(id, true); });   // (nada viene tildado: logística tilda lo que salió)
    var q=document.getElementById('cie-ent-quien'); if(q) q.value='Ernesto';
    await confirmarCierreEntregas(); await new Promise(function(res){ setTimeout(res, 150); });
    var boxes=[].map.call(document.querySelectorAll('.rptf-box'), function(b){ return b.id+' '+b.textContent.replace(/\s+/g,' '); });
    var si=document.querySelector('#rptf-c-r13 .rptf-btns button'); if(si) si.click();
    await new Promise(function(res){ setTimeout(res, 500); });
    var nueva=STATE.filter(function(p){ return /Lo que faltó de la RPT 10-013/.test(p.observaciones||''); })[0]||null;
    return { boxes:boxes, box13:(document.getElementById('rptf-c-r13')||{}).textContent||'', nueva:nueva?{ oc:nueva.oc, fecha:nueva.fecha, cli:nueva.cliente, pr:nueva.productos.map(function(x){ return x.cant+' '+x.desc+' '+x.medida; }) }:null, marca:(findById('r13').productos[0].rpf||{}).r, ent:findById('r13').entregado };
  }); r=D(r, { boxes:[], box13:'' });
  chk('6a. el resultado del cierre pregunta por la RPT 10-013 (iba con 2 que no había) y no por la 10-012 (entera)', r.boxes.length===1 && /rptf-c-r13/.test(r.boxes[0]) && /iba con 2 productos que no había/.test(r.boxes[0]), r.boxes);
  chk('6b. «Sí, armarla» ahí mismo arma la RPT 10-018 para Mutualista el 30/10 con los 2 SOFT 160x190, y el recuadro lo dice', r.ent && r.nueva && r.nueva.oc==='RPT 10-018' && r.nueva.cli==='Mutualista' && r.nueva.fecha==='2026-10-30' && r.nueva.pr.join()==='2 COLCHON SOFT 160x190' && r.marca==='si' && /armé la RPT 10-018/.test(r.box13), r);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
