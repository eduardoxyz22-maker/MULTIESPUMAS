/* 🧭↩️🎨 LA 5, LA 7 Y LA 9 DEL MUESTRARIO (§4ni, 27/10; dueño: «la 9 me gusta todo menos el icono nuevo del bot… Además quiero: 5, 7, 9»).
   Lo que cuida esta prueba:
   9. Íconos propios con color en las pestañas de arriba (la del Bot sigue con 🤖) y en la fila de botones de cada ficha de Administración;
      las pestañas no crecen, los seis botones entran en 320 px y se mueven UNA vez al pasar el mouse (solo con `ICO_PRUEBA` en las pruebas).
   5. Al cambiar de pestaña, un «fantasma» con el color de la de antes se corre hasta la nueva (en el celular, la rayita de abajo) y lo de
      abajo entra desde el lado que corresponde (el formulario solo aparece); al terminar no queda nada colgado; apagado en las pruebas
      salvo `NAV_PRUEBA` y con «reducir movimiento».
   7. «Deshacer» durante 5 s después de Entregó (ficha chica y grande), del cambio de turno y de borrar: vuelve EXACTAMENTE a como estaba
      (el registro del cierre `eF/eT/eQ` y la ATC incluidos), borrar espera los 5 s antes de ir a la planilla (`realDelete`), uno nuevo
      cumple el anterior, esconder la página lo cumple, Ctrl+Z deshace; sin `DESH_PRUEBA`, todo como antes.
   Reloj clavado: martes 27/10/2026 10:00 de Bolivia; los pedidos son del miércoles 28.   Se corre:  node tests/test_mejoras_5_7_9.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-27T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  window.ADM_FICHAS_PRUEBA=1;
  var n=0;
  window.P=function(cli, o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(200+n), vendedor:'Carola Chavez', cliente:cli, fecha:'2026-10-28', turno:'AM', zona:'Equipetrol',
    direccion:'Calle 1', productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1,chk:'ok'}], saldo:100, acuenta:0, pagado:false, metodoPago:'', entregado:false,
    ts:Date.now(), rev:5, fotos:[] }, o||{}); };
  window.FIX=function(){ n=0; return [ P('ROSA QUISPE'), P('JUAN PEREZ',{turno:'PM'}), P('ANA LOPEZ'),
    P('LUIS ROCA',{ fecha:'2026-10-26', entregado:true, productos:[{desc:'SOFT',medida:'100x190',cant:1,eF:'2026-10-26',eT:1761500000000,eQ:'Ernesto'}] }),
    P('MARIA ATC',{ oc:'ATC 10-009', productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1,atc:{mot:'Hundimiento',pdev:'2026-10-28',pturno:'AM',rf:'',ent:''}}] }) ]; };
  window.GD=0; var gd=guardarDurable; guardarDurable=function(){ GD++; return gd.apply(this, arguments); };
  window.RD=[]; var rd=realDelete; realDelete=function(id){ RD.push(id); return rd.apply(this, arguments); };
  STATE=FIX(); UNLOCKED=true;
  try{ document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; }catch(e){}
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[], dialogos=[];
  async function abrir(w, init, h, opts){
    const ctx = await browser.newContext(Object.assign({ viewport:{ width:w||1440, height:h||900 }, timezoneId:'America/La_Paz' }, opts||{}));
    await ctx.route(/^https?:\/\//, r=>r.abort());
    await ctx.addInitScript(init || (()=>{}));
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>{ dialogos.push(d.message()); d.accept(); });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  }

  // ═══ 9 · Los íconos ═══
  console.log('\n── 9. Íconos propios en las pestañas y en la ficha de Administración ──');
  let page = await abrir();
  let r = await page.evaluate(() => {
    var ids=['tab-form','tab-mis','tab-chofer','tab-conta','tab-atc','tab-admin'];
    var tabs=ids.map(function(id){ var b=document.getElementById(id), ic=b.querySelector('.t-ic'), box=ic.querySelector('.ico-b');
      return { id:id, box:!!box, svg:!!(box && box.querySelector('svg path, svg rect, svg ellipse, svg circle')), emoji:ic.textContent.trim(), c1:box?box.style.getPropertyValue('--c1'):'' }; });
    var bot=document.querySelector('#tab-bot .t-ic');
    showView('admin'); renderAdmin();
    var f=document.querySelector('#adm-fichas .af-f[data-pid="p1"]'), f2=document.querySelector('#adm-fichas .af-f[data-pid="p2"]');
    var bs=f ? [].map.call(f.querySelectorAll('.af-tb button'), function(b){ return { t:b.querySelector('small').textContent, box:!!b.querySelector('.ico-b svg'), em:b.textContent.replace(b.querySelector('small').textContent,'').trim() }; }) : [];
    var man=f2 ? [].filter.call(f2.querySelectorAll('.af-tb button'), function(b){ return /A mañana/.test(b.textContent); })[0] : null;
    var nav=document.querySelector('.nav');
    return { tabs:tabs, bot:{ txt:bot.textContent.trim(), box:!!bot.querySelector('.ico-b') }, bs:bs, man:man ? man.querySelector('.ico-b').style.getPropertyValue('--c1') : null,
             alto:[].map.call(nav.querySelectorAll('button:not([hidden])'), function(b){ return Math.round(b.getBoundingClientRect().height); }) };
  });
  chk('las 6 pestañas (Chofer escondida incluida) llevan su cuadradito de color con el dibujo, sin emoji', r.tabs.every(t=>t.box && t.svg && t.emoji===''), r.tabs);
  chk('…cada una con su color', new Set(r.tabs.map(t=>t.c1)).size>=5, r.tabs.map(t=>t.c1));
  chk('la del Bot sigue con 🤖 (dueño: «me gusta el icono actual del robot de colores»)', r.bot.txt==='🤖' && !r.bot.box, r.bot);
  chk('la ficha de Administración: Entregó, WhatsApp, Editar, Reprog., A tarde y Borrar, cada uno con su ícono y sin emoji',
      r.bs.map(b=>b.t).join(',')==='Entregó,WhatsApp,Editar,Reprog.,A tarde,Borrar' && r.bs.every(b=>b.box && b.em===''), r.bs);
  chk('«A mañana» (un pedido de la tarde) lleva el sol amarillo; «A tarde», el naranja', r.man==='#facc15', r.man);
  chk('las pestañas no crecen con el cuadradito (≤ 44 px de alto en la compu)', r.alto.every(h=>h<=44), r.alto);
  // en las pruebas no se mueven…
  await page.hover('#adm-fichas .af-f[data-pid="p1"] .af-tb button'); await page.waitForTimeout(100);
  r = await page.evaluate(() => document.querySelectorAll('.ico-vivo').length);
  chk('en las pruebas los íconos no se mueven (sin `ICO_PRUEBA`)', r===0, r);
  // …y con la bandera, una vez
  await page.evaluate(() => { window.ICO_PRUEBA=1; });
  await page.mouse.move(5,5); await page.hover('#adm-fichas .af-f[data-pid="p1"] .af-tb button:nth-child(2)'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ n:document.querySelectorAll('.ico-vivo').length, wa:!!document.querySelector('#adm-fichas .af-f[data-pid="p1"] .af-tb button:nth-child(2) .ico-b.ico-vivo') }));
  chk('con `ICO_PRUEBA`, pasar el mouse por «WhatsApp» lo mueve (solo ese)', r.n===1 && r.wa, r);
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => document.querySelectorAll('.ico-vivo').length);
  chk('…y a los 1,4 s se queda quieto', r===0, r);
  await page._ctx.close();
  page = await abrir(320, null, 700);
  r = await page.evaluate(() => { showView('admin'); renderAdmin();
    var f=document.querySelector('#adm-fichas .af-f'), tb=f.querySelector('.af-tb');
    return { cabe:tb.scrollWidth<=f.clientWidth+1, tapadas:[].filter.call(tb.querySelectorAll('button'), function(b){ var s=b.querySelector('small'); return s.scrollWidth>b.clientWidth+1; }).length,
             nav:Math.round(document.querySelector('.nav').getBoundingClientRect().height) }; });
  chk('320 px: los seis botones con ícono entran en la ficha y ninguna etiqueta se sale', r.cabe && r.tapadas===0, r);
  chk('320 px: la barra de pestañas de abajo queda del alto de antes (≤ 60 px; lo publicado mide 59)', r.nav<=60, r);
  await page._ctx.close();

  // ═══ 5 · Las pestañas que se deslizan ═══
  console.log('\n── 5. Pestañas que se deslizan ──');
  page = await abrir();
  r = await page.evaluate(() => { showView('admin'); return { fant:document.querySelectorAll('.nav-fant').length, cl:document.getElementById('view-admin').className }; });
  chk('en las pruebas no se desliza nada (sin `NAV_PRUEBA`)', r.fant===0 && !/vista-/.test(r.cl), r);
  r = await page.evaluate(() => { window.NAV_PRUEBA=1; showView('form');
    var antes=getComputedStyle(document.getElementById('tab-admin')).backgroundColor;
    return new Promise(function(res){ setTimeout(function(){ showView('mis');
      var g=document.querySelector('.nav-fant'), b=document.getElementById('tab-mis'), v=document.getElementById('view-mis');
      var o={ fant:document.querySelectorAll('.nav-fant').length, col:g?g.style.backgroundColor:'', llega:b.classList.contains('nav-llega'), bgNueva:getComputedStyle(b).backgroundColor, cl:v.className };
      setTimeout(function(){ var g2=document.querySelector('.nav-fant'), rb=b.getBoundingClientRect(), rn=document.querySelector('.nav').getBoundingClientRect();
        o.mitad=g2 ? { x:parseFloat(getComputedStyle(g2).left), w:parseFloat(getComputedStyle(g2).width), meta:rb.left-rn.left } : null;
        setTimeout(function(){ o.fin={ fant:document.querySelectorAll('.nav-fant').length, llega:document.querySelectorAll('.nav-llega').length, cl:v.className, bg:getComputedStyle(b).backgroundColor, color:getComputedStyle(b).color }; res(o); }, 1000);
      }, 200);
    }, 900); }); });
  chk('de «Nuevo pedido» a «Mis pedidos»: sale el fantasma con el color de la pestaña de antes', r.fant===1 && r.col!=='' && !/rgba\(0, 0, 0, 0\)/.test(r.col), r);
  chk('…la nueva queda transparente mientras llega', r.llega && /rgba\(0, 0, 0, 0\)|transparent/.test(r.bgNueva), r);
  chk('…y lo de abajo entra desde la DERECHA (la pestaña nueva está a la derecha)', /vista-der/.test(r.cl), r.cl);
  chk('…a mitad de camino el fantasma va hacia la nueva', r.mitad && Math.abs(r.mitad.x - r.mitad.meta) < 60, r.mitad);
  chk('…al terminar no queda nada colgado y la pestaña tiene su color', r.fin.fant===0 && r.fin.llega===0 && !/vista-/.test(r.fin.cl) && !/rgba\(0, 0, 0, 0\)/.test(r.fin.bg), r.fin);
  r = await page.evaluate(() => new Promise(function(res){ showView('atc'); setTimeout(function(){ showView('mis');
    var o={ mis:document.getElementById('view-mis').className };
    setTimeout(function(){ showView('form'); o.form=document.getElementById('view-form').className;
      setTimeout(function(){ o.fin={ fant:document.querySelectorAll('.nav-fant').length, llega:document.querySelectorAll('.nav-llega').length,
        bg:getComputedStyle(document.getElementById('tab-form')).backgroundColor }; res(o); }, 1100); }, 120); }, 900); }));
  chk('volviendo a una pestaña de la izquierda, lo de abajo entra desde la IZQUIERDA', /vista-izq/.test(r.mis), r.mis);
  chk('el formulario solo aparece (tiene la barra de pasos fija: nada de correrlo)', /vista-fade/.test(r.form), r.form);
  chk('dos cambios seguidos (a mitad del primero): al final, nada colgado y la pestaña con su color', r.fin.fant===0 && r.fin.llega===0 && !/rgba\(0, 0, 0, 0\)/.test(r.fin.bg), r.fin);
  r = await page.evaluate(() => { showView('form'); var o=document.querySelectorAll('.nav-fant').length; return o; });
  chk('elegir la MISMA pestaña no anima nada', r===0, r);
  await page._ctx.close();
  page = await abrir(390, null, 844);
  r = await page.evaluate(() => new Promise(function(res){ window.NAV_PRUEBA=1; showView('form'); setTimeout(function(){
    var bar=getComputedStyle(document.getElementById('tab-form'),'::after').backgroundColor; showView('conta');
    var g=document.querySelector('.nav-fant'); res({ w:g?parseFloat(g.style.width):0, h:g?parseFloat(g.style.height):0, col:g?g.style.backgroundColor:'', bar:bar }); }, 800); }));
  chk('en el celular el fantasma es la rayita de abajo (22 × 3), con su color', r.w===22 && r.h===3 && r.col===r.bar, r);
  await page._ctx.close();
  page = await abrir(1440, null, 900, { reducedMotion:'reduce' });
  r = await page.evaluate(() => { window.NAV_PRUEBA=1; window.ICO_PRUEBA=1; showView('mis'); return { fant:document.querySelectorAll('.nav-fant').length, cl:document.getElementById('view-mis').className, vivo:document.querySelectorAll('.ico-vivo').length }; });
  chk('con «reducir movimiento» del aparato: ni fantasma, ni vista que entra, ni íconos que se mueven', r.fant===0 && !/vista-/.test(r.cl) && r.vivo===0, r);
  await page._ctx.close();

  // ═══ 7 · Deshacer ═══
  console.log('\n── 7. «Deshacer» durante 5 segundos ──');
  page = await abrir();
  r = await page.evaluate(() => { showView('admin'); renderAdmin(); quickEntregado('p1'); var d=document.getElementById('desh');
    deletePedido('p3'); return { ver:d.classList.contains('ver'), ent:findById('p1').entregado, borrado:!findById('p3'), RD:RD.slice(), DESH:!!DESH }; });
  chk('sin `DESH_PRUEBA`, todo como antes: Entregó marca, Borrar borra en el acto (realDelete) y no sale «Deshacer»', !r.ver && r.ent && r.borrado && r.RD.join()==='p3' && !r.DESH, r);
  await page._ctx.close();

  page = await abrir();
  r = await page.evaluate(() => { window.DESH_PRUEBA=1; showView('admin'); renderAdmin(); GD=0;
    var antes=JSON.stringify(findById('p1').productos);
    quickEntregado('p1');
    var d=document.getElementById('desh'), t=document.getElementById('toast');
    return { ver:d.classList.contains('ver'), txt:document.getElementById('desh-txt').textContent, ent:findById('p1').entregado, eF:findById('p1').productos[0].eF, GD:GD,
             toastVisible:/\bshow\b/.test(t.className), antes:antes, ms:DESH_MS, bodyOn:document.body.classList.contains('desh-on') }; });
  chk('Entregó en la ficha chica: se marca y se GUARDA en el acto (como siempre)', r.ent && r.GD===1, r);
  chk('…y sale «↩️ Deshacer» con el nombre: «✅ ROSA QUISPE: entregado»', r.ver && r.txt==='✅ ROSA QUISPE: entregado' && r.bodyOn, r);
  chk('…el aviso verde «Entregado ✓» no queda duplicado abajo', !r.toastVisible, r);
  chk('…entregado antes de su día (el 28): anotó que salió hoy (eF = 27/10)', r.eF==='2026-10-27', r.eF);
  chk('…la barra dura 5 segundos', r.ms===5000, r.ms);
  const antesP1 = r.antes;
  await page.click('#desh-btn'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ ent:findById('p1').entregado, prods:JSON.stringify(findById('p1').productos), GD:GD, ver:document.getElementById('desh').classList.contains('ver'),
                                   toast:document.getElementById('toast').textContent, DESH:!!DESH, on:document.body.classList.contains('desh-on') }));
  chk('«Deshacer»: vuelve a NO entregado, sin el «salió hoy», y lo guarda otra vez', !r.ent && r.prods===antesP1 && r.GD===2, r);
  chk('…se va la barra y lo dice: «↩️ Listo: ROSA QUISPE quedó como estaba»', !r.ver && !r.DESH && !r.on && /quedó como estaba/.test(r.toast), r);
  // destildar uno ya entregado (con su registro del cierre) y deshacer: vuelve el registro ENTERO (tocar dos veces lo perdía)
  r = await page.evaluate(() => { var a=JSON.stringify(findById('p4').productos); quickEntregado('p4'); var mid={ ent:findById('p4').entregado, eF:findById('p4').productos[0].eF||'', txt:document.getElementById('desh-txt').textContent };
    deshDeshacer(); return { a:a, mid:mid, ent:findById('p4').entregado, d:JSON.stringify(findById('p4').productos) }; });
  chk('destildar un entregado del cierre saca el registro; «Deshacer» lo devuelve ENTERO (eF, eT y eQ)', !r.mid.ent && r.mid.eF==='' && /ya no figura entregado/.test(r.mid.txt) && r.ent && r.d===r.a, r);
  // la ATC con su devolución: el ✅ anota la entrega en la ATC; deshacer la deja como estaba
  r = await page.evaluate(() => { var a=JSON.stringify(atcDe(findById('p5'))); quickEntregado('p5'); var mid=JSON.stringify(atcDe(findById('p5'))); deshDeshacer();
    return { a:a, mid:mid, d:JSON.stringify(atcDe(findById('p5'))), ent:findById('p5').entregado }; });
  chk('una ATC en su devolución: el ✅ la cierra y «Deshacer» la deja como estaba (sin «entregada»)', r.mid!==r.a && r.d===r.a && !r.ent, r);
  // la ficha grande
  r = await page.evaluate(() => { showPedidoModal('p1'); toggleEntregado('p1'); var o={ ver:document.getElementById('desh').classList.contains('ver'), ent:findById('p1').entregado };
    deshDeshacer(); o.ent2=findById('p1').entregado; o.modal=document.getElementById('modal').classList.contains('on'); o.sw=(document.querySelector('#modal-box')||{}).innerText||''; closeModal(); return o; });
  chk('la ficha grande también: «🚚 Entregado» ofrece deshacer y deshacer deja la ficha abierta con lo de antes', r.ver && r.ent && !r.ent2 && r.modal, { ver:r.ver, ent:r.ent, ent2:r.ent2, modal:r.modal });
  // sin tocar: a los 5 s se va y queda hecho
  r = await page.evaluate(() => new Promise(function(res){ DESH_MS=600; quickEntregado('p3'); setTimeout(function(){ res({ ver:document.getElementById('desh').classList.contains('ver'), ent:findById('p3').entregado, DESH:!!DESH }); }, 900); }));
  chk('sin tocar «Deshacer», la barra se va sola y la entrega queda hecha', !r.ver && r.ent && !r.DESH, r);
  await page.evaluate(() => { DESH_MS=5000; });

  // el turno
  console.log('');
  r = await page.evaluate(() => { dialogosN=0; var a=findById('p1').turno; admTurnoCambiar('p1'); var o={ a:a, t:findById('p1').turno, txt:document.getElementById('desh-txt').textContent,
    ver:document.getElementById('desh').classList.contains('ver'), modal:document.getElementById('modal').classList.contains('on') };
    deshDeshacer(); o.t2=findById('p1').turno; o.modal2=document.getElementById('modal').classList.contains('on'); o.DESH=!!DESH; o.toast=document.getElementById('toast').textContent; return o; });
  chk('«A tarde» en la ficha chica: pasa a la tarde y sale «Deshacer» con los cupos que quedan', r.a==='AM' && r.t==='PM' && r.ver && /ROSA QUISPE pasó a la tarde · quedan \d+ cupos?/.test(r.txt), r);
  chk('…«Deshacer» la vuelve a la mañana (por `cambiarTurno`, que mira cupos y día cerrado), sin abrir la ficha', r.t2==='AM' && !r.modal2, r);
  chk('…y deshacer no ofrece otro «Deshacer» (dice los cupos como siempre)', !r.DESH && /Pasa al turno AM/.test(r.toast), r);
  r = await page.evaluate(() => { var lim=limTurno('2026-10-28','PM'), extra=[];
    for(var i=0;i<lim;i++) extra.push(P('LLENO '+i,{ id:'x'+i, turno:'PM' })); STATE=STATE.concat(extra);
    admTurnoCambiar('p3'); return { t:findById('p3').turno, DESH:!!DESH }; });
  chk('si la tarde está llena no cambia nada y no ofrece «Deshacer»', r.t==='AM' && !r.DESH, r);
  await page._ctx.close();

  // borrar
  page = await abrir();
  r = await page.evaluate(() => { window.DESH_PRUEBA=1; showView('admin'); renderAdmin();
    setPending([JSON.parse(JSON.stringify(findById('p2')))]);
    deletePedido('p2');
    var o={ fuera:!findById('p2'), RD:RD.slice(), aqui:borradoAqui('p2'), cola:getPending().filter(function(q){ return q.id==='p2'; }).length, txt:document.getElementById('desh-txt').textContent,
            ficha:!!document.querySelector('#adm-fichas .af-f[data-pid="p2"]') };
    mergePending([JSON.parse(JSON.stringify(P('JUAN PEREZ',{ id:'p2', turno:'PM' })))]);
    o.vuelveConLectura=!!findById('p2');
    return o; });
  chk('Borrar: sale de la pantalla en el acto, pero NO va a la planilla todavía (realDelete sin llamar)', r.fuera && !r.ficha && r.RD.length===0, r);
  chk('…dice «🗑 JUAN PEREZ · 10-202: se borra en 5 segundos»', r.txt==='🗑 JUAN PEREZ · 10-202: se borra en 5 segundos', r.txt);
  chk('…una lectura de la planilla no lo vuelve a poner, y su guardado en cola espera aparte', r.aqui && !r.vuelveConLectura && r.cola===0, r);
  await page.click('#desh-btn'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ esta:!!findById('p2'), aqui:borradoAqui('p2'), cola:getPending().filter(function(q){ return q.id==='p2'; }).length, RD:RD.slice(),
                                   ficha:!!document.querySelector('#adm-fichas .af-f[data-pid="p2"]'), toast:document.getElementById('toast').textContent }));
  chk('«Deshacer»: vuelve a la lista (y a las fichas) con su guardado en cola, sin haber tocado la planilla', r.esta && r.ficha && !r.aqui && r.cola===1 && r.RD.length===0, r);
  chk('…y lo dice: «↩️ No se borró: JUAN PEREZ sigue en la lista»', /No se borró: JUAN PEREZ sigue en la lista/.test(r.toast), r.toast);
  r = await page.evaluate(() => new Promise(function(res){ DESH_MS=500; setPending([]); deletePedido('p2'); setTimeout(function(){ res({ RD:RD.slice(), esta:!!findById('p2'), toast:document.getElementById('toast').textContent }); }, 800); }));
  chk('sin tocar «Deshacer»: a los 5 s se borra de verdad, por el camino de siempre (realDelete)', r.RD.join()==='p2' && !r.esta && /eliminado/i.test(r.toast), r);
  r = await page.evaluate(() => { DESH_MS=5000; RD.length=0; deletePedido('p3'); var o={ RD1:RD.slice() }; quickEntregado('p1'); o.RD2=RD.slice(); o.esta=!!findById('p3'); o.txt=document.getElementById('desh-txt').textContent; deshCumplir(); return o; });
  chk('otra acción durante los 5 s cumple la anterior en el acto (el borrado se manda) y ofrece deshacer la nueva', r.RD1.length===0 && r.RD2.join()==='p3' && !r.esta && /ROSA QUISPE: entregado/.test(r.txt), r);
  r = await page.evaluate(() => { RD.length=0; deletePedido('p1'); var o={ antes:RD.length };
    Object.defineProperty(document, 'visibilityState', { configurable:true, get:function(){ return 'hidden'; } }); document.dispatchEvent(new Event('visibilitychange'));
    o.despues=RD.slice(); delete document.visibilityState; return o; });
  chk('si la página se esconde (cambia de app, cierra) durante los 5 s, el borrado se manda en ese momento', r.antes===0 && r.despues.join()==='p1', r);
  r = await page.evaluate(() => { STATE.push(P('PEDRO CTRLZ',{ id:'z1' })); RD.length=0; deletePedido('z1'); var o={ fuera:!findById('z1') };
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key:'z', ctrlKey:true, bubbles:true })); o.esta=!!findById('z1'); o.RD=RD.length; return o; });
  chk('Ctrl+Z (fuera de un campo de texto) deshace', r.fuera && r.esta && r.RD===0, r);
  dialogos.length=0;
  r = await page.evaluate(() => { ctaEliminarVenta('z1'); return { fuera:!findById('z1'), RD:RD.length, DESH:!!DESH }; });
  chk('«Eliminar esta venta» de Contabilidad: la pregunta dice «tenés 5 segundos para deshacerlo» y espera igual', r.fuera && r.RD===0 && r.DESH && dialogos.some(m=>/5 segundos para deshacerlo/.test(m)), { r, dialogos });
  await page.evaluate(() => { deshDeshacer(); });
  await page._ctx.close();

  page = await abrir(390, null, 844);
  r = await page.evaluate(() => { window.DESH_PRUEBA=1; showView('admin'); renderAdmin(); quickEntregado('p1');
    var d=document.getElementById('desh').getBoundingClientRect(), n=document.querySelector('.nav').getBoundingClientRect(), b=document.getElementById('desh-btn').getBoundingClientRect();
    return { abajo:Math.round(d.bottom), nav:Math.round(n.top), alto:Math.round(b.height), ancho:Math.round(d.width) }; });
  await page.waitForTimeout(400);
  const r2 = await page.evaluate(() => { var d=document.getElementById('desh').getBoundingClientRect(), n=document.querySelector('.nav').getBoundingClientRect(); return { abajo:Math.round(d.bottom), nav:Math.round(n.top), dentro:d.left>=0 && d.right<=innerWidth }; });
  chk('en el celular la barra «Deshacer» queda ENCIMA de las pestañas de abajo y entra en la pantalla', r2.abajo<=r2.nav && r2.dentro, r2);
  chk('…y el botón se toca con el dedo (≥ 40 px)', r.alto>=40, r);
  await page._ctx.close();

  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
