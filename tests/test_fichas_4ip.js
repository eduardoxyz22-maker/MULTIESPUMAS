/* 🃏 MIS PEDIDOS CON MENOS LETRAS Y STOCK EN FICHAS (§4ip, 09/10; dueño, con la página de muestras: *«la 13 no me gustó
   quítala, lo demás aplica»*). Todo solo mira: nada se guarda en la planilla.
     1. 🧾 Mis pedidos: el borde dice cómo está el pedido, íconos en vez de títulos, el camioncito y el sello, y WhatsApp.
     2. 🃏 Stock: una ficha por producto con la MISMA cuenta de la tabla (que sigue entera, plegada abajo).
     3. 🗂️ El catálogo en colores.
     4. 📈 La historia de 30 días al tocar una ficha (salidas siempre; la línea, con la hoja del historial).
     5. 📥 El Excel del día: qué subió y qué bajó, una sola vez.
   Reloj clavado en el viernes 09/10/2026 a las 10:00 de Bolivia. Solo datos sintéticos.
   Se corre:  node tests/test_fichas_4ip.js        Dientes:  PEDIDOS=/ruta/a/pedidos_7642388.html node tests/test_fichas_4ip.js
   Capturas:  SHOTS=/carpeta node tests/test_fichas_4ip.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(typeof c==='function'){ try{ c=!!c(); }catch(err){ c=false; } } c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const SHOTS = process.env.SHOTS || '';
const sfDiaTxtNode = iso => { const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2] : ''; };

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz', deviceScaleFactor:SHOTS?2:1 });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-09T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const ev = async (fn,arg) => { try{ return await page.evaluate(fn,arg); }catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(()=>{
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; if(window.CARGA_TIMER) clearTimeout(CARGA_TIMER); if(window.CARGA_TIC) clearInterval(CARGA_TIC);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
    try{ ['me_vis_avisos','me_salud_dia','me_vis_4ik'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
    var hoy=todayStr(), dia=function(n){ return stockSumarDias(hoy, n); };
    var PR={ semi:{ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107' }, tit:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
             oro:{ desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761' }, eco:{ desc:'NUEVO ECO FLEX', medida:'105x190', codigo:'CH1331' } };
    var K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); }); window._K=K;
    var LOG='PRODUCTOS TERMINADOS FAB.';
    STOCK={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{} }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    STOCK.al[LOG]='log'; STOCK.c.u[K.semi]=0; STOCK.c.u[K.tit]=40; STOCK.c.u[K.oro]=3; STOCK.c.u[K.eco]=30; STOCK_CARGADO=true;
    var n=0, P=function(o){ n++; return Object.assign({ id:'v'+n, oc:'10-'+(100+n), vendedor:'Maria Flores', cliente:'CLIENTE '+n, celular:'7000'+(1000+n),
      turno:'AM', zona:'Norte', direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now()-n*60000, metodoPago:'', observaciones:'', estado:'',
      entregado:false, vehiculo:'', chofer:'', garantia:'', nota:String(500+n), acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[] }, o); };
    var L=[];
    /* Entregas de los últimos 15 días: el ORO rota mucho (y hay poco), el TITANIO poco (y hay mucho). */
    for(var i=1;i<=12;i++) L.push(P({ fecha:dia(-i), entregado:true, productos:[Object.assign({ cant:1, chk:'ok' }, PR.oro)] }));
    for(var j=1;j<=4;j++) L.push(P({ fecha:dia(-2*j), entregado:true, productos:[Object.assign({ cant:1, chk:'ok' }, PR.tit)] }));
    for(var e2=1;e2<=5;e2++) L.push(P({ fecha:dia(-3*e2), entregado:true, productos:[Object.assign({ cant:1, chk:'ok' }, PR.eco)] }));
    /* Mis pedidos de Carola: uno que va bien, uno sin stock, uno que debe plata, uno entregado (con ✅). */
    var C=function(o){ return P(Object.assign({ vendedor:'Carola Chavez', zona:'Centro', maps:'https://www.google.com/maps?q=-17.78,-63.18' }, o)); };
    L.push(C({ id:'m1', fecha:dia(4), productos:[Object.assign({ cant:1, chk:'ok' }, PR.tit)] }));
    L.push(C({ id:'m2', fecha:dia(4), productos:[Object.assign({ cant:2, chk:'no' }, PR.semi)] }));
    L.push(C({ id:'m3', fecha:dia(5), pagado:false, saldo:500, acuenta:1000, productos:[Object.assign({ cant:1, chk:'ok' }, PR.eco)] }));
    L.push(C({ id:'m4', fecha:hoy, entregado:true, chofer:'Luis Pierre', vehiculo:'Carry', productos:[Object.assign({ cant:1, chk:'ok' }, PR.tit)] }));
    for(var v=0; v<4; v++) L.push(P({ fecha:dia(2+v), productos:[Object.assign({ cant:2 }, PR.oro)] }));   // vendido sin entregar del ORO
    STATE=L; if(typeof stockOlvidarIndice==='function') stockOlvidarIndice();
  });

  /* ══ 1. Mis pedidos ══ */
  console.log('\n── 1. 🧾 Mis pedidos: borde por estado, íconos, camioncito, sello y WhatsApp ──');
  let r = await ev(async()=>{
    showView('mis'); await new Promise(function(ok){ setTimeout(ok,150); });
    document.getElementById('mis-vendedor').value='Carola Chavez'; MIS_FILTER='todos';
    renderMis(); if(typeof closeModal==='function') closeModal();
    var card=function(id){ return [].filter.call(document.querySelectorAll('#mis-lista .cho-card'), function(c){ return (c.getAttribute('onclick')||'').indexOf("'"+id+"'")>=0; })[0]; };
    var o={};
    ['m1','m2','m3','m4'].forEach(function(id){ var c=card(id); o[id]= c ? { cls:c.className, cami:!!c.querySelector('.viaje.chico .viaje-cami'), left:(c.querySelector('.viaje-cami')||{style:{}}).style.left,
      para:!!c.querySelector('.viaje.chico.para'), sello:!!c.querySelector('.mis-sello'), wa:((c.querySelector('a[href*="wa.me"]')||{}).getAttribute||function(){return '';}).call(c.querySelector('a[href*="wa.me"]')||{getAttribute:function(){return '';}},'href'),
      iconos:c.querySelectorAll('.mis-ico .mi').length, etiquetas:c.querySelectorAll('.cho-row .k').length } : null; });
    return o;
  });
  chk('cada tarjeta tiene su color: va bien (m1), falta stock (m2), debe plata (m3), entregado (m4)',
    ()=>(/mis-est-va/.test(r.m1.cls) && /mis-est-mal/.test(r.m2.cls) && /mis-est-debe/.test(r.m3.cls) && /mis-est-ok/.test(r.m4.cls)), r);
  chk('íconos en vez de «PRODUCTOS / DIRECCIÓN / COBRO / CHOFER» (no queda ningún título en mayúsculas)', ()=>(r.m1.iconos>=4 && r.m1.etiquetas===0), r.m1);
  chk('el camioncito está en cada tarjeta, parado en su paso (m1: día de entrega, 50 %; m4 entregado: al final, 90 %)', ()=>(r.m1.cami && parseFloat(r.m1.left)===50 && parseFloat(r.m4.left)===90), [r.m1.left, r.m4.left]);
  chk('sin stock, el camioncito se frena en rojo', ()=>(r.m2.para && !r.m1.para), r.m2);
  chk('el sello «ENTREGADO» solo en el entregado', ()=>(r.m4.sello && !r.m1.sello && !r.m2.sello), [r.m4.sello, r.m1.sello]);
  chk('💬 WhatsApp abre el chat del cliente con +591', ()=>(/^https:\/\/wa\.me\/5917000\d{4}$/.test(r.m1.wa)), r.m1.wa);
  r = await ev(()=>({ a:misWaCliente('7 123 4567'), b:misWaCliente('+591 71234567'), c:misWaCliente('3-345678'), d:misWaCliente('') }));
  chk('WhatsApp solo con un celular de Bolivia (7/6 + 7 dígitos), si no, no hay botón', ()=>(r.a==='https://wa.me/59171234567' && r.b==='https://wa.me/59171234567' && r.c==='' && r.d===''), r);
  if(SHOTS){ await page.setViewportSize({ width:390, height:844 }); await ev(()=>{ MIS_SELLO_VISTO={}; VIAJE_VISTO={}; renderMis(); }); await page.waitForTimeout(400); await ev(()=>{ closeModal(); var c=document.querySelector('#mis-lista .cho-card'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(1300);
    await page.screenshot({ path:path.join(SHOTS,'f1_mis_cel.png') }); await page.setViewportSize({ width:1180, height:900 }); }

  /* ══ 2. Stock en fichas ══ */
  console.log('\n── 2. 🃏 Stock en fichas: la misma cuenta de la tabla, lo urgente primero ──');
  r = await ev(()=>{
    abrirStock(); renderStock();
    var d=stockData(), por={}; d.lista.forEach(function(o){ por[o.k]=o; });
    var fichas=[].slice.call(document.querySelectorAll('#stk-fichas .sf-ficha'));
    var malas=fichas.filter(function(f){ var o=por[f.getAttribute('data-k')]; return !o || f.querySelector('.sf-hacer').textContent!==sfAccion(o); }).map(function(f){ return f.getAttribute('data-k'); });
    var rangos=fichas.map(function(f){ var o=por[f.getAttribute('data-k')]; return (o.aviso in SF_ORDEN)?SF_ORDEN[o.aviso]:9; });
    var ordenado=rangos.every(function(x,i){ return i===0 || rangos[i-1]<=x; });
    var det=document.getElementById('stk-tabla-det');
    var oro=por[_K.oro], fOro=document.querySelector('#stk-fichas .sf-ficha[data-k="'+CSS.escape(_K.oro)+'"]');
    return { n:fichas.length, malas:malas, ordenado:ordenado, rangos:rangos, det:!!det, abierta:det?det.open:null,
      filasTabla:det?det.querySelectorAll('tr[data-stock-k]').length:0,
      oro:{ aviso:oro&&oro.aviso, fab:oro&&oro.fabricar, txt:fOro?fOro.innerText.replace(/\s+/g,' '):'' },
      tit:(document.querySelector('#stk-fichas .sf-ficha[data-k="'+CSS.escape(_K.tit)+'"]')||{}).innerText||'' };
  });
  chk('hay una ficha por producto que se mueve', ()=>(r.n>=3), r.n);
  chk('⚠️ cada ficha dice lo mismo que «Qué hacer» de la tabla (`sfAccion` sobre la MISMA fila de `stockData`)', ()=>(r.malas.length===0), r.malas);
  chk('lo urgente va primero (🚨 → traer → pedir → …)', ()=>r.ordenado, r.rangos);
  chk('el ORO (rota mucho y hay 3) pide producir: la ficha dice cuánto, y es el mismo número de la tabla', ()=>((r.oro.aviso==='urgente'||r.oro.aviso==='pedir') && r.oro.fab>0 && r.oro.txt.indexOf('Pedí '+r.oro.fab)>=0), r.oro);
  chk('⏳ la ficha dice cuándo se corta, con el día de la semana', ()=>(/Se corta (hoy|el (lun|mar|mié|jue|vie|sáb|dom) \d\d\/\d\d)|Ya falta/.test(r.oro.txt)), r.oro.txt);
  chk('el TITANIO (sobra) dice que alcanza', ()=>(/Alcanza|Sobra/.test(r.tit)), r.tit.replace(/\s+/g,' '));
  chk('la tabla completa sigue ENTERA, plegada abajo (cerrada de entrada)', ()=>(r.det && r.abierta===false && r.filasTabla>=3), r);

  /* ══ 3. Catálogo ══ */
  console.log('\n── 3. 🗂️ El catálogo en colores ──');
  r = await ev(()=>{
    var c=document.getElementById('stk-catalogo'), cel=c?[].slice.call(c.querySelectorAll('.sf-cel[data-k]')):[];
    var d=stockData(), por={}; d.lista.forEach(function(o){ por[o.k]=o; });
    var mal=cel.filter(function(b){ var o=por[b.getAttribute('data-k')]; return !o || !b.classList.contains('sf-'+sfEstado(o)); }).length;
    return { hay:!!c, n:cel.length, mal:mal, oro:(c&&c.querySelector('.sf-cel[data-k="'+CSS.escape(_K.oro)+'"]')||{}).className||'' };
  });
  chk('una casilla por producto y medida, con el color de su ficha', ()=>(r.hay && r.n>=3 && r.mal===0), r);
  chk('el ORO se ve en rojo o ámbar', ()=>(/sf-(bad|warn)/.test(r.oro)), r.oro);
  if(SHOTS){ await ev(()=>{ closeModal(); var f=document.getElementById('stk-fichas'); if(f) f.scrollIntoView(); }); await page.waitForTimeout(400); await page.screenshot({ path:path.join(SHOTS,'f2_fichas.png') });
    await ev(()=>{ var f=document.getElementById('stk-catalogo'); if(f) f.scrollIntoView(); }); await page.waitForTimeout(300); await page.screenshot({ path:path.join(SHOTS,'f3_catalogo.png') }); }

  /* ══ 4. Historia ══ */
  console.log('\n── 4. 📈 La historia de 30 días ──');
  r = await ev(()=>{
    SERVER_VER='2026-10-06-a'; sfElegir(_K.oro);
    var m=document.getElementById('modal-box')||document.body, t=(m.innerText||'').replace(/\s+/g,' ');
    var o={ svg:!!m.querySelector('.sf-hist svg'), salidas:m.querySelectorAll('.sf-hist svg rect').length, aviso:/servidor/.test(t) };
    closeModal(); return o;
  });
  chk('tocar la ficha abre su historia: las salidas de cada día salen de los pedidos (12 días con entregas)', ()=>(r.svg && r.salidas===12), r);
  chk('con el servidor de antes dice que la línea aparece con el servidor nuevo', ()=>r.aviso, r);
  r = await ev(async()=>{
    SERVER_VER='2026-10-09-a'; SF_HIST_CACHE=null;
    var hoy=todayStr(), k=_K.oro, dias=[];
    [[-6,8],[-5,7],[-4,12],[-3,11],[-2,10],[-1,9]].forEach(function(x){ var u={}; u[k]=x[1]; dias.push({ fecha:stockSumarDias(hoy,x[0]), datos:{ PTF:{ f:stockSumarDias(hoy,x[0]), u:u } } }); });
    window._pedidos=[];
    apiPost=function(b){ window._pedidos.push(b.action); if(b.action==='histStockLeer') return Promise.resolve({ ok:true, dias:dias }); return Promise.resolve({ ok:false }); };
    sfElegir(_K.oro); await new Promise(function(ok){ setTimeout(ok,60); });
    var m=document.getElementById('modal-box')||document.body;
    var o={ linea:!!m.querySelector('.sf-hist polyline'), entra:[].slice.call(m.querySelectorAll('.sf-hist svg text')).map(function(t){ return t.textContent; }).filter(function(t){ return /^\+/.test(t); }), pidio:window._pedidos };
    closeModal(); return o;
  });
  chk('con el servidor nuevo dibuja la línea de lo que había (de la hoja «Historial stock»)', ()=>(r.linea && r.pidio.indexOf('histStockLeer')>=0), r);
  chk('y marca lo que entró: el día que el saldo subió (+5 el 05/10: de 7 a 12 con 1 salida = 6)', ()=>(r.entra.indexOf('+6')>=0), r.entra);
  if(SHOTS){ await ev(()=>{ sfElegir(_K.oro); }); await page.waitForTimeout(300); await page.screenshot({ path:path.join(SHOTS,'f4_historia.png') }); await ev(()=>closeModal()); }

  /* ══ 5. El Excel del día ══ */
  console.log('\n── 5. 📥 El Excel del día: qué subió y qué bajó, una sola vez ──');
  r = await ev(()=>{
    STOCK_DELTA_ANTES=sfFotoDe(stockData().lista);
    STOCK.c.u[_K.oro]+=5; STOCK.c.u[_K.tit]-=3; stockOlvidarIndice(); renderStock();
    var f=function(k){ var x=document.querySelector('#stk-fichas .sf-ficha[data-k="'+CSS.escape(k)+'"] .sf-flota'); return x?x.textContent:''; };
    var o={ banner:(document.getElementById('sf-excel')||{}).innerText||'', oro:f(_K.oro), tit:f(_K.tit), eco:f(_K.eco) };
    renderStock(); o.otra=f(_K.oro); return o;
  });
  chk('el cartel dice cuántos subieron y cuántos bajaron', ()=>(/1 producto subieron/.test(r.banner) && /1 bajaron/.test(r.banner)), r.banner);
  chk('la ficha que subió muestra «+5» y la que bajó «−3»; la que no cambió, nada', ()=>(r.oro==='+5' && r.tit==='−3' && r.eco===''), r);
  chk('al repintar no se repite (una sola vez)', ()=>(r.otra===''), r.otra);

  /* ══ 6. 📍 De dónde sale cada producto, a la vista de logística (§4iq) ══ */
  console.log('\n── 6. 📍 Logística ve de dónde se carga: PTF, Banzer, Moreno ──');
  r = await ev(async()=>{
    var t=function(x){ var d=document.createElement('div'); d.innerHTML=prodLugarTag(x); return d.textContent.replace(/\s+/g,' ').trim(); };
    var o={ ptf:t({ desc:'A', cant:1, chk:'ok' }), bz:t({ desc:'A', cant:2, chk:'ok', chkDe:'Banzer' }),
      mor:t({ desc:'A', cant:1, chk:'im' }), parte:t({ desc:'A', cant:2, chk:'ok', chkDes:[{ de:'', u:1 },{ de:'Banzer', u:1 }] }),
      no:t({ desc:'A', cant:1, chk:'no' }), nada:t({ desc:'A', cant:1 }) };
    var p=findById('m1'); p.productos[0].chkDe='Banzer';
    UNLOCKED=true; document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); await new Promise(function(ok){ setTimeout(ok,150); }); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    var fila=[].filter.call(document.querySelectorAll('#tbl-pedidos tbody tr'), function(tr){ return /CLIENTE/.test(tr.textContent) && tr.querySelector('.lug'); });
    o.tabla=[].map.call(document.querySelectorAll('#tbl-pedidos .prod-cell .lug'), function(x){ return x.textContent; });
    showPedidoModal('m1'); o.ficha=[].map.call(document.querySelectorAll('#modal-box .prod-rev .lug'), function(x){ return x.textContent; }); closeModal();
    return o;
  });
  chk('✔ de acá = «🏭 PTF», ✔ en Banzer = «🏪 Banzer», 📥 = «📥 Moreno», partido = «PTF 1 + Banzer 1», ✗ = «No hay», sin marcar = nada',
    ()=>(r.ptf==='🏭 PTF' && r.bz==='🏪 Banzer' && r.mor==='📥 Moreno' && r.parte==='🏭 PTF 1 🏪 Banzer 1' && r.no==='✗ No hay' && r.nada===''), r);
  chk('la tabla de Administración lo muestra al lado de cada producto', ()=>(r.tabla.indexOf('🏪 Banzer')>=0 && r.tabla.indexOf('✗ No hay')>=0), r.tabla);
  chk('y la ficha del pedido también (antes era un globito que en el iPad no se ve)', ()=>(r.ficha.indexOf('🏪 Banzer')>=0), r.ficha);

  /* ══ 7. A: la columna «Sale de» · E: lo del día, por lugar (§4ir, dueño: «A, E») ══ */
  console.log('\n── 7. 📍 A: columna «Sale de» · E: «Lo del día, por lugar» ──');
  r = await ev(async()=>{
    var hoy=todayStr(), man=proximoDiaEntrega(), PR=function(d,m){ return { desc:d, medida:m, codigo:'' }; };
    var Q=function(o){ return Object.assign({ oc:'10-9'+o.id.slice(-1), vendedor:'Maria Flores', celular:'70001234', turno:'AM', zona:'Norte', direccion:'Calle', maps:'',
      pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'Carry', chofer:'Luis Pierre', garantia:'', nota:'1',
      acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[] }, o); };
    STATE.push(Q({ id:'h1', fecha:hoy, cliente:'ANA PEREZ', productos:[Object.assign({ cant:2, chk:'ok' }, PR('TITANIO ICE','160x190'))] }));
    STATE.push(Q({ id:'h2', fecha:hoy, cliente:'BETO ROCA', vehiculo:'NPR', productos:[Object.assign({ cant:1, chk:'ok', chkDe:'Banzer' }, PR('ORO BI RELAX','140x190')),
      Object.assign({ cant:1, chk:'im' }, PR('NUEVO ECO FLEX','105x190'))] }));
    STATE.push(Q({ id:'h3', fecha:hoy, cliente:'CIRO DIAZ', productos:[Object.assign({ cant:3, chk:'ok', chkDes:[{ de:'', u:1 },{ de:'Banzer', u:2 }] }, PR('ORO BI RELAX','140x190')),
      Object.assign({ cant:1, chk:'no' }, PR('ESPECIAL SEMIORTOPEDICO','140x190')), Object.assign({ cant:1 }, PR('SIN MARCA','140x190'))] }));
    STATE.push(Q({ id:'h4', fecha:hoy, cliente:'DORA SOSA', productos:[Object.assign({ cant:1 }, PR('SIN MARCA','140x190'))] }));
    STATE.push(Q({ id:'h5', fecha:man, cliente:'EVA LUNA', productos:[Object.assign({ cant:4, chk:'ok', chkDe:'Banzer' }, PR('TITANIO ICE','160x190'))] }));
    try{ localStorage.removeItem('me_vis_4ik'); }catch(e){}
    ADM_LUG_DIA='hoy'; segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    var o={};
    var ths=[].map.call(document.querySelectorAll('#tbl-pedidos thead th'), function(th){ return th.textContent.replace(/[▲▼↕]/g,'').trim(); });
    o.cab=ths.slice(0,4);
    var celda=function(id){ var tr=document.querySelector('#tbl-pedidos tbody tr[data-id="'+id+'"]'); if(!tr) tr=[].filter.call(document.querySelectorAll('#tbl-pedidos tbody tr'), function(t){ return t.innerHTML.indexOf("'"+id+"'")>=0; })[0];
      var td=tr && tr.querySelector('td.sale-de'); return td ? [].map.call(td.querySelectorAll('.lug'), function(x){ return x.textContent; }).join(' | ') || td.textContent.trim() : null; };
    o.h1=celda('h1'); o.h2=celda('h2'); o.h3=celda('h3'); o.h4=celda('h4');
    var det=document.getElementById('adm-lugares-det');
    var col=function(c){ return [].map.call(document.querySelectorAll('#adm-lugares .lugd-'+c+' li'), function(li){ return li.textContent.replace(/\s+/g,' ').trim(); }); };
    var tot=function(c){ var b=document.querySelector('#adm-lugares .lugd-'+c+' .lugd-h b'); return b ? b.textContent : null; };
    o.det=!!det; o.abierto=det && det.open; o.arribaTabla=!!(det && (document.getElementById('adm-lugares').compareDocumentPosition(document.getElementById('tbl-pedidos')) & 4));
    o.aca=col('aca'); o.sale=col('sale'); o.trae=col('trae'); o.no=col('no'); o.tAca=tot('aca'); o.tSale=tot('sale'); o.tTrae=tot('trae');
    o.sub=(document.querySelector('#adm-lugares .lugd-cab .vis-sub')||{}).textContent||'';
    var li=document.querySelector('#adm-lugares .lugd-trae li'); if(li) li.click();
    o.abre=((document.getElementById('modal-box')||{}).textContent||'').indexOf('BETO ROCA')>=0; closeModal();
    ADM_LUG_DIA='manana'; admLugaresPintar(); o.man=col('sale'); o.manAca=col('aca');
    det=document.getElementById('adm-lugares-det'); det.open=false; det.dispatchEvent(new Event('toggle')); await new Promise(function(ok){ setTimeout(ok,30); });
    admLugaresPintar(); o.cerradoQueda=document.getElementById('adm-lugares-det').open===false;
    det=document.getElementById('adm-lugares-det'); det.open=true; det.dispatchEvent(new Event('toggle')); ADM_LUG_DIA='hoy'; admLugaresPintar();
    return o;
  });
  chk('A: la columna «Sale de» va pegada al N° (Acciones · N° · Sale de · Entrega)', ()=>(r.cab[1].indexOf('N°')===0 && r.cab[2]==='Sale de' && r.cab[3].indexOf('Entrega')===0), r.cab);
  chk('A: un lugar solo = su nombre sin números (h1: «🏭 PTF»)', ()=>(r.h1==='🏭 PTF'), r.h1);
  chk('A: dos lugares = cada uno con sus unidades (h2: Banzer 1 y Moreno 1)', ()=>(r.h2==='🏪 Banzer 1 | 📥 Moreno 1'), r.h2);
  chk('A: lo partido se suma por lugar y lo que falta se dice (h3: PTF 1, Banzer 2, Falta 1)', ()=>(r.h3==='🏭 PTF 1 | 🏪 Banzer 2 | ✗ Falta 1'), r.h3);
  chk('A: sin ninguna marca, «—»', ()=>(r.h4==='—'), r.h4);
  chk('E: la caja está arriba de la tabla, abierta de entrada', ()=>(r.det && r.abierto && r.arribaTabla), r);
  chk('E: PTF = lo de acá (TITANIO ×2 de Ana y ORO ×1 de Ciro), 3 unidades', ()=>(r.aca.length===2 && r.tAca==='3' && r.aca.some(function(t){ return /TITANIO ICE 160x190 × 2.*ANA PEREZ · Carry/.test(t); })), [r.aca, r.tAca]);
  chk('E: Banzer = 1 de Beto + 2 de Ciro (3 unidades), con el camión', ()=>(r.sale.length===2 && r.tSale==='3' && r.sale.some(function(t){ return /BETO ROCA · NPR/.test(t); })), [r.sale, r.tSale]);
  chk('E: Moreno = ir a buscar el ECO FLEX de Beto', ()=>(r.trae.length===1 && /NUEVO ECO FLEX.*× 1.*de Moreno/.test(r.trae[0]) && r.tTrae==='1'), r.trae);
  chk('E: lo que falta va aparte, para avisar', ()=>(r.no.length===1 && /SEMIORTOPEDICO/.test(r.no[0])), r.no);
  chk('E: dice cuántos productos no se revisaron todavía (2 sin marca)', ()=>(/2 productos sin revisar/.test(r.sub)), r.sub);
  chk('E: tocar un renglón abre el pedido', ()=>r.abre, r.abre);
  chk('E: «Mañana» muestra lo del próximo día de camión (EVA LUNA ×4 en Banzer) y no lo de hoy', ()=>(r.man.length===1 && /EVA LUNA/.test(r.man[0]) && r.manAca.length===0), [r.man, r.manAca]);
  chk('E: si la cerrás, queda cerrada al repintar', ()=>r.cerradoQueda, r.cerradoQueda);
  if(SHOTS){ await ev(()=>{ closeStock(); closeModal(); var e=document.getElementById('adm-lugares'); if(e) e.scrollIntoView(); }); await page.waitForTimeout(300); await page.screenshot({ path:path.join(SHOTS,'f5_lugares.png') });
    await ev(()=>{ QUICK_FILTER=''; var s=document.getElementById('adm-search'); if(s){ s.value=''; } segSet('adm-mode','hoy'); renderAdmin(); var t=document.getElementById('tbl-pedidos'); if(t) t.scrollIntoView(); }); await page.waitForTimeout(300);
    await page.screenshot({ path:path.join(SHOTS,'f6_tabla.png') });
    await page.setViewportSize({ width:390, height:844 }); await ev(()=>{ var e=document.getElementById('adm-lugares'); if(e) e.scrollIntoView(); }); await page.waitForTimeout(300);
    await page.screenshot({ path:path.join(SHOTS,'f7_lugares_cel.png') }); await page.setViewportSize({ width:1180, height:900 }); }

  /* ══ 8. 🌡️ El termómetro en barras (§4it, dueño con la muestra 2: «¿cómo quedó o no se hizo?») ══ */
  console.log('\n── 8. 🌡️ El termómetro de cada producto, en barras ──');
  r = await ev(async()=>{
    closeModal(); try{ var j=JSON.parse(localStorage.getItem('me_vis_4ik')||'{}'); delete j.termo; localStorage.setItem('me_vis_4ik', JSON.stringify(j)); }catch(e){}
    abrirStock(); await new Promise(function(ok){ setTimeout(ok,120); });
    var d=stockData(), oro=d.lista.filter(function(o){ return o.k===_K.oro; })[0], tit=d.lista.filter(function(o){ return o.k===_K.tit; })[0];
    var caja=document.getElementById('stk-termo'), fila=function(k){ return caja && caja.querySelector('.tm-fila[data-k="'+k.replace(/"/g,'\\"')+'"]'); };
    var fo=fila(_K.oro), pos=function(el){ return el ? parseFloat(el.style.left) : null; };
    var o={ hay:!!caja, abierto:caja&&caja.open, entreFichasYCatalogo:!!(caja && document.getElementById('stk-fichas').compareDocumentPosition(caja)&4 && caja.compareDocumentPosition(document.getElementById('stk-catalogo'))&4),
      oro:{ dias:oro.dias, corte:oro.corte, lead:oro.lead, aviso:oro.aviso, punto:pos(fo&&fo.querySelector('.tm-punto')), cami:pos(fo&&fo.querySelector('.tm-cami')), sin:fo?((fo.querySelector('.tm-sin')||{}).textContent||''):null,
        pie:fo?((fo.querySelector('.tm-pie')||{}).textContent||''):null, nom:fo?fo.querySelector('.tm-nom').textContent:'' },
      titEsta:!!fila(_K.tit), titDias:tit.dias, titAviso:tit.aviso, orden:caja?[].map.call(caja.querySelectorAll('.tm-fila'), function(f){ var o=d.lista.filter(function(x){ return x.k===f.getAttribute('data-k'); })[0]; return o&&o.dias!=null?o.dias:999; }):[], eje:caja?caja.querySelectorAll('.tm-dias span').length:0 };
    return o;
  });
  chk('la caja «🌡️ El termómetro de cada producto» está entre las fichas y el catálogo, abierta', ()=>(r.hay && r.abierto && r.entreFichasYCatalogo), r);
  chk('el 🔴 del ORO cae en el día que se corta (la MISMA cuenta de «⏳ Se corta el…» de su ficha)', ()=>(r.oro.dias!=null && Math.abs(r.oro.punto - r.oro.dias/17*100)<0.05 && r.oro.pie.indexOf(sfDiaTxtNode(r.oro.corte))>=0), r.oro);
  chk('el 🚚 cae en hoy + lo que tarda la fábrica («si pedís hoy»), y entre los dos la franja «N días sin stock»', ()=>{ var n=Math.max(1,r.oro.lead); return Math.abs(r.oro.cami - n/17*100)<0.05 && (n>r.oro.dias ? r.oro.sin!==null && r.oro.pie.indexOf((n-r.oro.dias)+' día'+((n-r.oro.dias)===1?'':'s')+' sin stock')>=0 : true) && /si pedís hoy/.test(r.oro.pie); }, r.oro);
  chk('el que se corta primero va arriba (ordenados por el día del corte)', ()=>(r.orden.length>=2 && r.orden.every(function(x,i,A){ return i===0 || A[i-1]<=x; })), r.orden);
  chk('el TITANIO (sobra, no se corta en estos días) no ocupa lugar', ()=>(!r.titEsta), [r.titDias, r.titAviso]);
  chk('abajo de cada nombre: hay · vendidos · por día; arriba, los días', ()=>(/hay \d+ · vendidos \d+ · [\d,]+ por día/.test(r.oro.nom) && r.eje===9), r.oro.nom);
  if(SHOTS){ await ev(()=>{ var e=document.getElementById('stk-termo'); if(e) e.scrollIntoView(); }); await page.waitForTimeout(300); await page.screenshot({ path:path.join(SHOTS,'f8_termo.png') });
    await page.setViewportSize({ width:390, height:844 }); await ev(()=>{ renderStock(); var e=document.getElementById('stk-termo'); if(e) e.scrollIntoView(); }); await page.waitForTimeout(300);
    await page.screenshot({ path:path.join(SHOTS,'f9_termo_cel.png') }); await page.setViewportSize({ width:1180, height:900 }); }

  /* ══ 9. 🛍️ Las bolsas fuera del stock (dueño, 09/10: «las bolsas sacalas del stock») ══ */
  console.log('\n── 9. 🛍️ Las bolsas no son stock ──');
  r = await ev(async()=>{
    var K1=stockClave({ desc:'BOLSA PARA ALMOHADAS', medida:'50x70' }), K2=stockClave({ desc:'BOLSA PARA COLCHON', medida:'140x190' });
    STOCK.c.u[K1]=0; STOCK.c.u[K2]=1;
    STATE.push(Object.assign({}, findById('m1'), { id:'b1', productos:[{ desc:'BOLSA PARA ALMOHADAS', medida:'50x70', cant:50 }, { desc:'BOLSA PARA COLCHON', medida:'140x190', cant:2 }] }));
    stockOlvidarIndice(); var d=stockData();
    var o={ k1:K1, enLista:d.lista.filter(function(x){ return /^BOLSA/.test(x.k); }).map(function(x){ return x.k; }),
      t1:esProdDeTienda({ desc:'BOLSA PARA ALMOHADAS', medida:'50x70' }), t2:esTextoDeTienda(K2),
      colchon:esProdDeTienda({ desc:'COLCHON RESORTES EN BOLSA', medida:'140x190' }), tit:esProdDeTienda({ desc:'TITANIO ICE', medida:'160x190' }) };
    STATE=STATE.filter(function(p){ return p.id!=='b1'; }); delete STOCK.c.u[K1]; delete STOCK.c.u[K2]; stockOlvidarIndice();
    return o;
  });
  chk('una bolsa (de pedido o del Excel) no entra al stock: ni ficha, ni «pedir», ni fábrica', ()=>(r.t1 && r.t2 && r.enLista.length===0), r);
  chk('…solo si el nombre EMPIEZA con BOLSA: «COLCHON RESORTES EN BOLSA» y el TITANIO siguen siendo stock', ()=>(!r.colchon && !r.tit), r);

  chk('ningún error de JavaScript', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
