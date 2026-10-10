/* ✨ MÁS VISTAS QUE SOLO MIRAN (§4im, 09/10; dueño: *«implementa todo menos A, C, D; me gusta la B, y la salud del día es solo
   para administración al poner la clave»*). Cada una sale de lo que ya hay y nada se guarda en la planilla:
     1. 🚛 El camión cargándose (Lista de carga): los MISMOS tildes, en bultos.
     2. 🏆 Los más vendidos (Stock): las entregas con las reglas de la rotación, semana por semana.
     3. 📅 El calendario de entregas (Administración): pedidos por día y turno, como el cupo.
     4. 🔔 Los avisos con movimiento (Stock): lo que pasó a pedir desde la última vez que este equipo miró.
     5. 🌅 La salud del día: al poner la clave de Administración, una vez por mañana.
     6. 🛤️ El viaje del pedido (Mis pedidos): dónde está cada pedido.
   Reloj clavado en el viernes 09/10/2026 a las 10:00 de Bolivia. Solo datos sintéticos.
   Se corre:  node tests/test_vistas_4im.js        Dientes:  PEDIDOS=/ruta/a/pedidos_bf34dab.html node tests/test_vistas_4im.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(typeof c==='function'){ try{ c=!!c(); }catch(err){ c=false; } } c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const SHOTS = process.env.SHOTS || '';

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:820 }, timezoneId:'America/La_Paz', deviceScaleFactor:SHOTS?2:1 });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-09T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const ev = async (fn,arg) => { try{ return await page.evaluate(fn,arg); }catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(()=>{
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; if(window.CARGA_TIMER) clearTimeout(CARGA_TIMER); if(window.CARGA_TIC) clearInterval(CARGA_TIC);
    window._guardados=0;
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(rec){ window._guardados++; return Promise.resolve({ ok:true, pedido:rec }); };
    guardarCargaChk=function(){};   // los tildes de la carga: en la prueba no viajan
    try{ ['me_vis_avisos','me_salud_dia','me_vis_4ik'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){} visPrefSet('masVistas',true);   /* §4iv: estas vistas viven en «Más vistas», plegado */
    var hoy=todayStr(), dia=function(n){ return stockSumarDias(hoy, n); };
    var PR={ semi:{ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107' }, tit:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
             oro:{ desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761' }, eco:{ desc:'NUEVO ECO FLEX', medida:'105x190', codigo:'CH1331' } };
    var K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); }); window._K=K;
    var LOG='PRODUCTOS TERMINADOS FAB.';
    STOCK={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{} }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    STOCK.al[LOG]='log'; STOCK.c.u[K.semi]=30; STOCK.c.u[K.tit]=40; STOCK.c.u[K.oro]=50; STOCK.c.u[K.eco]=30; STOCK_CARGADO=true;
    var n=0, P=function(o){ n++; return Object.assign({ id:'v'+n, oc:'10-'+(100+n), vendedor:'Maria Flores', cliente:'CLIENTE '+n, celular:'7000'+(1000+n),
      turno:'AM', zona:'Norte', direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now()-n*60000, metodoPago:'', observaciones:'', estado:'',
      entregado:false, vehiculo:'', chofer:'', garantia:'', nota:String(500+n), acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[] }, o); };
    var L=[];
    /* 🏆 6 semanas de entregas: el TITANIO empieza abajo y termina primero; el ORO al revés. */
    var plan=[ [1,4,2],[1,4,2],[2,3,2],[3,3,2],[4,2,2],[6,1,2] ];   // [tit, oro, eco] por semana, de la más vieja a la de hoy
    plan.forEach(function(w,i){ var base=-7*(5-i)-1;
      [['tit',w[0]],['oro',w[1]],['eco',w[2]]].forEach(function(t){ for(var j=0;j<t[1];j++) L.push(P({ fecha:dia(base-(j%3)), entregado:true, productos:[Object.assign({ cant:1, chk:'ok' }, PR[t[0]])] })); }); });
    /* 🚛 Hoy: el Carry lleva 3 pedidos (2 + 1 + 3 bultos). */
    L.push(P({ id:'c1', fecha:hoy, vehiculo:'Carry', chofer:'Luis Pierre', productos:[Object.assign({ cant:2, chk:'ok' }, PR.oro)] }));
    L.push(P({ id:'c2', fecha:hoy, vehiculo:'Carry', chofer:'Luis Pierre', turno:'PM', productos:[Object.assign({ cant:1, chk:'ok' }, PR.tit)] }));
    L.push(P({ id:'c3', fecha:hoy, vehiculo:'Carry', chofer:'Luis Pierre', entregado:true, productos:[Object.assign({ cant:3, chk:'ok' }, PR.eco)] }));
    /* 📅 Mañana (sábado): 4 en la mañana. El domingo, nada. */
    for(var m=0;m<4;m++) L.push(P({ fecha:dia(1), productos:[Object.assign({ cant:1 }, PR.oro)] }));
    /* 🛤️ Mis pedidos de Carola: uno para el martes ya listo, uno sin stock, uno de hoy listo, uno de ayer. */
    var C=function(o){ return P(Object.assign({ vendedor:'Carola Chavez', zona:'Centro', maps:'https://www.google.com/maps?q=-17.78,-63.18' }, o)); };
    L.push(C({ id:'m1', fecha:dia(4), productos:[Object.assign({ cant:1, chk:'ok' }, PR.oro)] }));
    L.push(C({ id:'m2', fecha:dia(4), productos:[Object.assign({ cant:1, chk:'no' }, PR.semi)] }));
    L.push(C({ id:'m3', fecha:hoy, chofer:'Luis Pierre', vehiculo:'Carry', productos:[Object.assign({ cant:1, chk:'ok' }, PR.tit)] }));
    L.push(C({ id:'m4', fecha:dia(-1), productos:[Object.assign({ cant:1, chk:'ok' }, PR.tit)] }));
    L.push(C({ id:'m5', fecha:dia(5), productos:[Object.assign({ cant:1 }, PR.eco)] }));
    STATE=L; if(typeof stockOlvidarIndice==='function') stockOlvidarIndice();
  });

  console.log('\n── 1. 🚛 El camión cargándose ──');
  let r = await ev(()=>{
    CARGA_DIA='hoy'; abrirCarga();
    var cam=[].filter.call(document.querySelectorAll('#carga-body .carga-cam'), function(c){ return c.getAttribute('data-veh')==='Carry'; })[0];
    var t0=cam?cam.querySelector('.cc-txt').innerText:'';
    var cajas=cam?[].slice.call(cam.querySelectorAll('input[type=checkbox][data-k]')):[];
    cajas[0].click(); var t1=cam.querySelector('.cc-txt').innerText, k0=cajas[0].getAttribute('data-k'), en=!!CARGA_CHK[k0];
    cajas.forEach(function(c){ if(!c.checked) c.click(); }); var t2=cam.querySelector('.cc-txt').innerText, llenos=cam.querySelectorAll('.cc-bulto.on').length;
    return { hay:!!cam, n:cajas.length, t0:t0, t1:t1, t2:t2, en:en, llenos:llenos };
  });
  chk('cada camión de la Lista de carga trae su camioncito: «🚛 0 de 7 bultos» (2 + 1 + 3 + 1 de Carola, del Carry)', ()=>(r.hay && /0 de 7 bultos/.test(r.t0)), r);
  chk('tildar un producto lo carga en el camión y es el MISMO tilde de la lista (CARGA_CHK)', ()=>(/[1-4] de 7 bultos/.test(r.t1) && r.en), r);
  chk('todo tildado: «✅ Cargado entero» y los 12 lugares llenos', ()=>(/Cargado entero/.test(r.t2) && r.llenos===12), r);
  if(SHOTS){ await ev(()=>{ var c=document.querySelector('#carga-body .carga-cam'); [].slice.call(c.querySelectorAll('input[data-k]')).slice(1).forEach(function(x){ if(x.checked) x.click(); }); c.scrollIntoView(); }); await page.waitForTimeout(700); await page.screenshot({ path:path.join(SHOTS,'w1_camion.png') }); }
  await ev(()=>{ closeCarga(); });

  console.log('\n── 2. 🏆 Los más vendidos ──');
  r = await ev(()=>{
    var R=stockRankingDatos();
    abrirStock();
    var filas=document.querySelectorAll('#rk .rk-fila').length;
    var ultima=function(){ return [].slice.call(document.querySelectorAll('#rk .rk-fila')).sort(function(a,b){ return parseFloat(a.style.top)-parseFloat(b.style.top); }).map(function(f){ return f.querySelector('.rk-nom').innerText.replace(/\s+/g,' ').trim(); }); };
    var hoyO=ultima(); stockRankingSemana(0); var antes=ultima();
    var fl=[];
    for(var i=1;i<6;i++){ stockRankingSemana(i); [].forEach.call(document.querySelectorAll('#rk .rk-fila'), function(f){ var t=f.querySelector('.flecha').textContent; if(t) fl.push(i+'|'+f.getAttribute('data-k')+':'+t); }); }
    stockRankingSemana(5);
    return { semanas:R.S.length, ks:R.ks, filas:filas, hoyO:hoyO, antes:antes, fl:fl, sem:(document.getElementById('rk-sem')||{}).innerText };
  });
  chk('6 semanas y los productos que más salieron (sin los de tienda)', ()=>(r.semanas===6 && r.ks.length===3 && r.filas===3), r);
  chk('la semana de hoy pone primero al TITANIO; la primera, al ORO', ()=>(/^TITANIO/.test(r.hoyO[0]) && /^ORO/.test(r.antes[0])), { hoy:r.hoyO, antes:r.antes });
  chk('la flecha dice que el TITANIO subió respecto de la semana anterior (y quién bajó)', ()=>(r.fl.some(function(x){ return /\|TITANIO ICE\|160X190: ▲/.test(x); }) && r.fl.some(function(x){ return /▼/.test(x); })), r.fl);
  chk('dice de qué semana es', ()=>/Semana del .+ al 09\/10/.test(r.sem), r.sem);

  console.log('\n── 4. 🔔 Los avisos con movimiento ──');
  r = await ev(()=>{ return { banner:!!document.getElementById('stk-avisos-nuevos'), guard:!!localStorage.getItem('me_vis_avisos') }; });
  chk('la primera vez no avisa nada (no hay contra qué comparar) y anota lo que vio', ()=>(!r.banner && r.guard), r);
  r = await ev(async()=>{
    closeStock();
    /* Entran 10 ventas del SEMIORTOPÉDICO para mañana con 30 en el depósito… y el Excel nuevo dice 2. */
    for(var i=0;i<6;i++) STATE.push(Object.assign({}, STATE[0], { id:'s'+i, fecha:stockSumarDias(todayStr(), 1+(i%3)), entregado:false, productos:[{ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107', cant:2, chk:'' }] }));
    STOCK.c.u[_K.semi]=2; stockOlvidarIndice();
    abrirStock(); await new Promise(function(ok){ setTimeout(ok,50); });
    var b=document.getElementById('stk-avisos-nuevos'), tr=document.querySelector('#stock-body tr[data-stock-k="'+_K.semi+'"]');
    var o=stockData().lista.filter(function(x){ return x.k===_K.semi; })[0];
    return { banner:b?b.innerText.replace(/\s+/g,' '):'', late:!!(tr && tr.classList.contains('stk-late')), aviso:o&&o.aviso };
  });
  chk('el SEMIORTOPÉDICO pasó a pedir: cartel con 🔔 que lo nombra', ()=>(/(urgente|pedir)/.test(r.aviso) && /1 producto pasó a pedir/.test(r.banner) && /ESPECIAL SEMIORTOPEDICO/.test(r.banner)), r);
  chk('…y su fila de la tabla late', ()=>r.late, r);
  if(SHOTS){ await ev(()=>{ var b=document.getElementById('stk-avisos-nuevos'); if(b) b.scrollIntoView(); }); await page.waitForTimeout(500); await page.screenshot({ path:path.join(SHOTS,'w4_avisos.png') });
    await ev(()=>{ var b=document.getElementById('vis-rank'); if(b) b.scrollIntoView(); stockRankingSemana(5); }); await page.waitForTimeout(1000); await page.screenshot({ path:path.join(SHOTS,'w2_ranking.png') }); }
  r = await ev(()=>{ closeStock(); abrirStock(); return !!document.getElementById('stk-avisos-nuevos'); });
  chk('al volver a abrir Stock ya no avisa lo mismo', ()=>r===false, r);
  await ev(()=>{ closeStock(); });

  console.log('\n── 3. 📅 El calendario de entregas ──');
  r = await ev(()=>{
    showView('admin'); ADM_CAL_DIA=''; visPrefSet('cal', true); var el=document.getElementById('adm-cal'); if(el) el.innerHTML=''; admCalPintar();
    var C=admCalDatos(todayStr().slice(0,7)), man=stockSumarDias(todayStr(),1);
    var celda=document.querySelector('#adm-cal .cal-dia[data-f="'+man+'"]'), dom=document.querySelector('#adm-cal .cal-dia[data-f="'+stockSumarDias(todayStr(),2)+'"]');
    admCalVer(man);
    var det=(document.querySelector('#adm-cal .cal-det')||{}).innerText||'';
    admCalAbrirDia();
    return { hoy:C.D[todayStr()], man:C.D[man], celda:celda?celda.innerText.replace(/\s+/g,' '):'', dom:dom?dom.className+' '+dom.innerText:'', det:det, dia:(document.getElementById('adm-dia')||{}).value, modo:segVal('adm-mode') };
  });
  chk('cuenta por día y turno: hoy 4 (3 AM y 1 PM), mañana 6 (4 + 2 de las ventas del paso 4)', ()=>(r.hoy.n===4 && r.hoy.AM===3 && r.hoy.PM===1 && r.man.n===6), r);
  chk('cada día dice cuántos pedidos, y el domingo va rayado y con ⚠️ los 2 que quedaron agendados ahí', ()=>(/6 pedidos/.test(r.celda) && /cerrado/.test(r.dom) && /2 ⚠️/.test(r.dom)), r);
  chk('tocar un día dice mañana y tarde contra el cupo (sábado: solo AM, 6/15)', ()=>(/AM 6\/15/.test(r.det) && !/PM/.test(r.det)), r.det);
  chk('«Ver los pedidos de ese día» deja Administración en ese día', ()=>(r.modo==='dia' && r.dia==='2026-10-10'), r);
  if(SHOTS){ await ev(()=>{ UNLOCKED=true; document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; CARGA_ESTADO='ok'; cargaBanner(); ADM_CAL_DIA=stockSumarDias(todayStr(),1); renderAdmin(); var c=document.getElementById('adm-cal'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(500); await page.screenshot({ path:path.join(SHOTS,'w3_calendario.png') }); }

  console.log('\n── 5. 🌅 La salud del día ──');
  r = await ev(()=>{
    var M=saludDatos(), a=saludDelDia(), ov=document.getElementById('salud-overlay'), vis=ov&&ov.style.display, n=ov?ov.querySelectorAll('.salud-m').length:0, t=ov?ov.innerText.replace(/\s+/g,' '):'';
    saludCerrar(); var b=saludDelDia(); var c=saludDelDia(true); saludCerrar();
    return { M:M.map(function(m){ return m.t+'|'+m.txt; }), a:a, vis:vis, n:n, t:t, b:b, c:c };
  });
  chk('cuatro medidores: entregas de hoy, stock, cupos de mañana y lo que llega', ()=>(r.a===true && r.vis==='flex' && r.n===4), r.M);
  chk('entregas de hoy = las marcadas de las de hoy (1 de 4)', ()=>r.M[0]==='Entregas de hoy|1 de 4 marcadas', r.M);
  chk('cupos de mañana (sábado) = 6 ocupados de 15 (§4jd: dice ocupados y libres)', ()=>/\|6 ocupados de 15 · 9 libres/.test(r.M[2]), r.M);
  chk('una vez por mañana: la segunda no sale; con el botón 🌅, sí', ()=>(r.b===false && r.c===true), r);
  r = await ev(()=>{ try{ localStorage.removeItem('me_salud_dia'); }catch(e){} UNLOCKED=false; var s=document.createElement('div'); return { boton:!!document.getElementById('adm-salud-btn'), fuente:/saludDelDia\(\)/.test(String(tryUnlock)) }; });
  chk('sale al poner la clave de Administración (tryUnlock) y hay un botón para volver a verla', ()=>(r.boton && r.fuente), r);
  if(SHOTS){ await ev(()=>{ saludDelDia(true); }); await page.waitForTimeout(1600); await page.screenshot({ path:path.join(SHOTS,'w5_salud.png') }); await ev(()=>{ saludCerrar(); }); }

  console.log('\n── 6. 🛤️ El viaje del pedido ──');
  r = await ev(()=>{
    var v=function(id){ var V=pedidoViajeDatos(findById(id)); return { ahora:V.ahora, lbl:V.ahora>=0?V.pasos[V.ahora].lbl:'' }; };
    return { m1:v('m1'), m2:v('m2'), m3:v('m3'), m4:v('m4'), m5:v('m5') };
  });
  chk('listo y para el martes: espera su fecha (paso «agendado»)', ()=>(r.m1.ahora===2 && /\d\d\/10/.test(r.m1.lbl)), r.m1);
  chk('con un producto sin stock: está en «Sin stock»', ()=>(r.m2.ahora===1 && r.m2.lbl==='Sin stock'), r.m2);
  chk('listo y es hoy: «En camino»', ()=>(r.m3.ahora===3 && r.m3.lbl==='En camino'), r.m3);
  chk('de ayer: entregado (la regla de siempre: fecha pasada)', ()=>r.m4.ahora===-1, r.m4);
  chk('sin revisar: «Sin revisar»', ()=>(r.m5.ahora===1 && r.m5.lbl==='Sin revisar'), r.m5);
  r = await ev(async()=>{
    showView('mis'); await new Promise(function(ok){ setTimeout(ok,150); });
    document.getElementById('mis-vendedor').value='Carola Chavez'; MIS_FILTER='todos'; renderMis();
    var chicos=document.querySelectorAll('#mis-lista .viaje.chico').length;
    showMisModal('m2'); var m=document.querySelector('.modal .viaje, #modal .viaje, .viaje:not(.chico)'); var t=m?m.innerText.replace(/\s+/g,' '):''; closeModal();
    return { chicos:chicos, t:t };
  });
  chk('cada tarjeta de Mis pedidos lleva su viaje chiquito', ()=>r.chicos>=5, r);
  chk('la ficha lo trae grande, con el paso de ahora nombrado', ()=>(/Cargado/.test(r.t) && /Sin stock/.test(r.t) && /Entregado/.test(r.t)), r.t);
  if(SHOTS){ await page.setViewportSize({ width:390, height:844 }); await ev(()=>{ renderMis(); }); await page.waitForTimeout(400); await ev(()=>{ closeModal(); var c=document.querySelector('#mis-lista .cho-card'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(600); await page.screenshot({ path:path.join(SHOTS,'w6_viaje_cel.png') });
    await ev(()=>{ showMisModal('m1'); }); await page.waitForTimeout(500); await page.screenshot({ path:path.join(SHOTS,'w6_viaje_ficha.png') }); await ev(()=>{ closeModal(); }); await page.setViewportSize({ width:1180, height:820 }); }

  console.log('\n── 7. Solo miran ──');
  r = await ev(()=>window._guardados);
  chk('ninguna guardó pedidos en la planilla', r===0, r);
  chk('ningún error de JavaScript', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
