/* 🧑‍💼 EDUARDO: LAS IDEAS A–K (12/10). El dueño eligió «A,B,C,D,E,F,G,H,I,K» (la J, recordar el pago, no).

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `8485847`, que no tiene nada de esto):
   A. Dice de cuándo son los datos: «Datos de las 10:42» o, sin conexión, «te muestro lo de hace 3 h».
   B. «⏰ En 1 hora» y «🌙 Mañana» además de «Entendido»; «Entendido» vence a las 24 h; lo guardado como día (antes) sigue escondido.
   C. Quien entró como logística, SIN clave y en otra pestaña: «✗ no hay» de hoy, lo que hay que traer de Moreno y los camiones sin cargar.
   D. Al guardar con algo que se fabrica o se trae de Moreno: el mensaje para el cliente con el día que dice el cuadrito, y 💬.
   E. A la mañana, el resumen del día según quién entró (vendedora / logística), tres líneas con «Ver cuáles»; a la tarde, nada.
   F. La ayuda entiende «plata», un error de tipeo y empieza por la pestaña donde estás.
   G. Las respuestas nuevas, y que TODOS los lugares que señala la ayuda existan (si un botón cambia de nombre, esto avisa).
   H. En el celular, mientras se escribe, Eduardo se achica.
   I. La primera vez que una vendedora elige su nombre, Eduardo ofrece el recorrido (una sola vez); el recorrido va paso a paso.
   K. Lo que le preguntan y no sabe queda anotado en la fila del sistema `__asis_preguntas__` (que NO es un pedido) y lo ve Administración.
   Datos SINTÉTICOS. Reloj clavado en el miércoles 14/10/2026.
   Se corre:  node tests/test_asistente_ak.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._saves=[];
  apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); window._saves.push(r); return Promise.resolve({ ok:true, pedido:r }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  var n=0, hoy=todayStr();
  window.V=function(o){ n++; return Object.assign({ id:'k'+n, oc:'10-'+(400+n), nota:String(900+n), vendedor:'Mirian Salazar', cliente:'CLIENTE K'+n, fecha:hoy, turno:'AM',
    productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:3000,chk:'ok'}], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false,
    ts:Date.now()-86400000, fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'70000000', zona:'Norte' }, o); };
  window.FIX=function(){ n=0; return [
    V({ cliente:'NO HAY UNO', productos:[{desc:'COLCHON ROTO',medida:'140x190',cant:1,precio:1,chk:'no'}] }),     // hoy, ✗ no hay
    V({ cliente:'TRAER UNO', productos:[{desc:'COLCHON MORENO',medida:'140x190',cant:2,precio:1,chk:'im'}] }),    // hoy, 📥 de Moreno
    V({ cliente:'EN CARRY', vehiculo:'Carry', chofer:'Luis Pierre' }),                                            // hoy, en un camión sin cargar
    V({ cliente:'DEBE', fecha:stockSumarDias(hoy,-5), entregado:true, pagado:false, saldo:800 }),                // vendedora: con saldo
    V({ cliente:'MAÑANA', fecha:proximoDiaEntrega() })
  ]; };
  /* el stock del ejemplo (lo mismo que test_saldo_almacen): TITANIO ICE 0 acá y 2 en Moreno · PILLOW nada · ALMOHADA 5 acá */
  window.PR={ TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }, PIL:{ desc:'PILLOW PEDIC', medida:'140x190', codigo:'CH1682' }, ALM:{ desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' } };
  window.STK=function(){
    var LOG='PRODUCTOS TERMINADOS FAB.', IMN='IM - PRODUCTOTERMINADO', K={}; Object.keys(PR).forEach(function(k){ K[k]=stockClave(PR[k]); });
    var st={ c:{ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[IMN]='otro';
    st.c.u[K.ALM]=5; st.g[IMN].u[K.TIT]=2;
    STOCK=st; STOCK_CARGADO=true; stockOlvidarIndice(); SALDO_CACHE=null;
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (hora, ancho) => {
    const page = await browser.newPage({ viewport:{ width:ancho||1180, height:900 }, timezoneId:'America/La_Paz', hasTouch:!!(ancho && ancho<700) });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.addInitScript(() => { window.ASIS_PRUEBA=1; });
    await page.clock.install({ time:new Date('2026-10-14T'+(hora||'18:00')+':00-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.clock.runFor(1700);
    await page.evaluate(PREPARAR);
    return page;
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  /* ---------------------------------------------------------------- A */
  console.log('\n── A. De cuándo son los datos ──');
  let page = await abrir('18:00');
  let r = await ev(page, () => {
    STATE=FIX(); ULTIMO_REFRESCO=new Date('2026-10-14T17:42:00-04:00').getTime(); CARGA_ESTADO='ok';
    var a=asisDatos();
    asisAbrir('avisos'); var en=(document.querySelector('#asis-panel .asis-datos')||{}).textContent||'';
    CARGA_ESTADO='error'; localStorage.setItem(LS_LECTURA_T, String(Date.now()-3*3600000)); ULTIMO_REFRESCO=0;
    var b=asisDatos(); asisCerrar();
    return { a:a, en:en, b:b };
  });
  chk('con la lectura buena: «Datos de las 17:42» (hora de Bolivia), y se ve en la ventana', r.a && r.a.ok && /Datos de las 17:42/.test(r.a.t) && /17:42/.test(r.en), r);
  chk('sin conexión: «te muestro lo de hace 3 h»', r.b && !r.b.ok && /Sin conexión/.test(r.b.t) && /hace 3 h/.test(r.b.t), r);

  /* ---------------------------------------------------------------- B */
  console.log('\n── B. En 1 hora · Mañana · Entendido vence ──');
  r = await ev(page, async () => {
    CARGA_ESTADO='ok'; ULTIMO_REFRESCO=Date.now(); quienRol(''); setVendedorMem('Mirian Salazar');
    STATE=FIX(); STATE.push(V({ cliente:'SIN PIN', fecha:stockSumarDias(todayStr(),3), maps:'' }));
    showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar'; await new Promise(function(res){ setTimeout(res, 200); });
    var k=asisAvisos().filter(function(a){ return /^sinub\|/.test(a.k); })[0];
    asisAbrir('avisos');
    var bts=[].map.call(document.querySelectorAll('#asis-panel .asis-av')[0].querySelectorAll('.asis-b'), function(b){ return b.textContent; });
    asisEnUnaHora(k.k); var tras=asisAvisos().some(function(a){ return a.k===k.k; });
    var v=asisVistos(), hasta=v[k.k];
    return { k:k&&k.k, bts:bts, tras:tras, dif:Math.round((hasta-Date.now())/60000) };
  });
  chk('cada aviso trae «⏰ En 1 hora», «🌙 Mañana» y «Entendido»', r.bts && r.bts.indexOf('⏰ En 1 hora')>=0 && r.bts.indexOf('🌙 Mañana')>=0 && r.bts.indexOf('Entendido')>=0, r);
  chk('«En 1 hora» lo esconde por 60 minutos', r.tras===false && r.dif===60, r);
  await page.clock.runFor(61*60000);
  r = await ev(page, () => ({ vuelve:asisAvisos().some(function(a){ return /^sinub\|/.test(a.k); }) }));
  chk('…y a la hora vuelve', r.vuelve, r);
  r = await ev(page, () => {
    var k=asisAvisos().filter(function(a){ return /^sinub\|/.test(a.k); })[0].k;
    asisEntendido(k); var h=asisVistos()[k], d=Math.round((h-Date.now())/3600000);
    asisManana(k); var m=new Date(asisVistos()[k]-4*3600000).toISOString().slice(0,16);
    var v=asisVistos(); v[k]=todayStr(); nxLS('me_asis_vistos', v); var viejoHoy=!asisAvisos().some(function(a){ return a.k===k; });
    v[k]=stockSumarDias(todayStr(),-3); nxLS('me_asis_vistos', v); var viejo3=asisAvisos().some(function(a){ return a.k===k; });
    return { d:d, m:m, man:tomorrowStr(), viejoHoy:viejoHoy, viejo3:viejo3 };
  });
  chk('«Entendido» = 24 h (antes: para siempre)', r.d===24, r);
  chk('«Mañana» = mañana a las 8:00 de Bolivia', r.m===r.man+'T08:00', r);
  chk('lo guardado con el formato de antes (el día) sigue escondido hoy, y uno de hace 3 días ya venció', r.viejoHoy && r.viejo3, r);

  /* ---------------------------------------------------------------- C */
  console.log('\n── C. Logística, sin clave y en otra pestaña ──');
  r = await ev(page, async () => {
    asisCerrar(); UNLOCKED=false; try{ localStorage.removeItem(LS_ADM_DEV); }catch(e){} setVendedorMem(''); quienRol('logistica');
    STATE=FIX(); CARGA_CHK={}; showView('mis'); await new Promise(function(res){ setTimeout(res, 200); });
    var A=asisAvisos(), ks=A.map(function(a){ return a.k.split('|')[0]+':'+a.t; });
    var nh=A.filter(function(a){ return /^l-nohay/.test(a.k); })[0], rc=A.filter(function(a){ return /^l-rec/.test(a.k); })[0], cm=A.filter(function(a){ return /^l-cam/.test(a.k); })[0];
    quienRol(''); setVendedorMem('Mirian Salazar'); var vend=asisAvisos().some(function(a){ return /^l-/.test(a.k); });
    return { ks:ks, nh:nh && nh.lista.map(function(x){ return x.t; }), rc:rc && rc.lista.map(function(x){ return x.t; }), cm:cm && cm.x, vend:vend, vista:asisVista() };
  });
  chk('«✗ no hay» de hoy, con la lista', r.nh && r.nh.length===1 && r.nh[0]==='NO HAY UNO', r);
  chk('lo que hay que traer de Moreno', r.rc && r.rc.indexOf('TRAER UNO')>=0, r);
  chk('los camiones de hoy sin terminar de cargar', /Carry: 0 de 1/.test(r.cm||'') && r.ks.some(function(k){ return /^l-cam:1 camión de hoy/.test(k); }), r);
  chk('una vendedora no los ve', r.vend===false, r);

  /* ---------------------------------------------------------------- D */
  console.log('\n── D. Al guardar: el mensaje para el cliente según el cuadrito ──');
  r = await ev(page, async () => {
    STATE=FIX(); STK(); ASIS.alGuardar=[];
    var rec=V({ id:'nuevo1', cliente:'JUAN PEREZ', fecha:proximoDiaEntrega(), productos:[Object.assign({ cant:1 }, PR.TIT), Object.assign({ cant:1 }, PR.PIL), Object.assign({ cant:1 }, PR.ALM)] });
    STATE.push(rec); SALDO_CACHE=null;
    asisAlGuardar(rec, false);
    var a=ASIS.alGuardar.filter(function(x){ return /^g-esp\|/.test(x.k); })[0];
    var edu=asisMsgEspera(Object.assign({}, rec, { vendedor:'Eduardo Añez' }));
    var todoHay=asisMsgEspera(Object.assign({}, rec, { productos:[Object.assign({ cant:1 }, PR.ALM)] }));
    return { t:a && a.t, b:a && a.b[0], msg:a && a.msg, edu:edu, todoHay:todoHay, primero:ASIS.alGuardar[0] && ASIS.alGuardar[0].k };
  });
  chk('avisa «Avisale a Juan cuándo le llega», primero', /Avisale a Juan cuándo le llega/.test(r.t||'') && /^g-esp/.test(r.primero||''), r);
  chk('el mensaje dice qué se fabrica y qué se trae, con su día', /PILLOW PEDIC 140x190: se fabrica, llegaría el \w+ \d\d\/\d\d/.test(r.msg||'') && /TITANIO ICE 160x190: lo traemos de nuestro depósito, llegaría el/.test(r.msg||''), r.msg);
  chk('lo que hay a mano no se nombra, y cierra con el día de entrega', !/ALMOHADA/.test(r.msg||'') && /📅 Te lo entregamos el/.test(r.msg||''), r.msg);
  chk('con celular: «💬 Mandar por WhatsApp»', r.b==='💬 Mandar por WhatsApp', r);
  chk('ni para Eduardo, ni si todo está a mano', r.edu===null && r.todoHay===null, r);

  /* ---------------------------------------------------------------- F + G */
  console.log('\n── F. La ayuda entiende cómo habla la gente ──');
  r = await ev(page, async () => {
    var q=function(t){ var i=asisBuscar(t)[0]; return i==null ? '' : ASIS_AYUDA[i].q; };
    showView('conta'); await new Promise(function(res){ setTimeout(res, 150); });
    var primeroConta=ASIS_AYUDA[asisBuscar('')[0]].v;
    showView('mis'); await new Promise(function(res){ setTimeout(res, 150); });
    return { plata:q('¿dónde pongo la plata?'), tipeo:q('reprogramr'), cobrr:q('como cobrr el flete'), deposito:q('deposito'), raro:asisBuscar('xyzw').length, primeroConta:primeroConta };
  });
  chk('«plata» lleva al pago', /pago/.test(r.plata), r);
  chk('perdona errores de tipeo («reprogramr», «cobrr»)', /reprogramar/.test(r.tipeo) && /flete/.test(r.cobrr), r);
  chk('«depósito» lleva al pago', /pago/.test(r.deposito), r);
  chk('una palabra rara sigue sin encontrar nada', r.raro===0, r);
  chk('sin escribir, empieza por la pestaña donde estás', r.primeroConta==='conta', r);
  console.log('\n── G. Las respuestas nuevas y que todo lo que señala exista ──');
  r = await ev(page, () => {
    var nuevas=['reprogramar','flete','sigo una ATC','cierro un día','recorrido del camión','Me mostrás el panel'].map(function(t){ return ASIS_AYUDA.some(function(a){ return a.q.indexOf(t)>=0; }); });
    var faltan=ASIS_AYUDA.filter(function(a){ return ![].concat(a.f).some(function(sel){ try{ return !!document.querySelector(sel); }catch(e){ return false; } }); }).map(function(a){ return a.q; });
    return { nuevas:nuevas, faltan:faltan, n:ASIS_AYUDA.length };
  });
  chk('están las 6 respuestas nuevas', r.nuevas && r.nuevas.every(Boolean), r);
  chk('cada respuesta señala algo que EXISTE en la página (si un botón cambia de nombre, esto se pone rojo)', r.faltan && r.faltan.length===0, r);

  /* ---------------------------------------------------------------- I */
  console.log('\n── I. El recorrido guiado ──');
  r = await ev(page, async () => {
    try{ localStorage.removeItem('me_asis_tour'); }catch(e){}
    quienElegir('Mirian Salazar'); await new Promise(function(res){ setTimeout(res, 2800); });
    var gl=document.getElementById('asis-globo'), ofrece=!gl.hidden && /Te muestro el panel/.test(gl.innerText), ls=localStorage.getItem('me_asis_tour');
    gl.hidden=true; quienElegir('Mirian Salazar'); await new Promise(function(res){ setTimeout(res, 2800); });
    var otraVez=!gl.hidden && /Te muestro el panel/.test(gl.innerText);
    asisTourEmpezar(); await new Promise(function(res){ setTimeout(res, 700); });
    var c=document.getElementById('asis-tour'), p1=c && c.innerText.replace(/\s+/g,' '), f1=ASIS_FOCO && ASIS_FOCO.id;
    var pasos=[p1]; for(var i=0;i<6;i++){ asisTourPaso(1); await new Promise(function(res){ setTimeout(res, 700); }); pasos.push(c.innerText.replace(/\s+/g,' ')); }
    var focoMis=asisVista();
    asisTourPaso(1); await new Promise(function(res){ setTimeout(res, 300); });
    return { ofrece:ofrece, ls:ls, otraVez:otraVez, p1:p1, f1:f1, ult:pasos[6], vista5:focoMis, fin:c.hidden };
  });
  chk('la primera vez que elige su nombre, Eduardo ofrece el recorrido (una sola vez)', r.ofrece && r.ls && !r.otraVez, r);
  chk('el recorrido arranca por «Tu nombre» (paso 1 de 7) iluminando el campo', /Paso 1 de 7/.test(r.p1||'') && r.f1==='f-vendedor', r);
  chk('termina en Eduardo con «¡Listo!» y se cierra', /Paso 7 de 7/.test(r.ult||'') && /Listo/.test(r.ult||'') && r.fin, r);

  /* ---------------------------------------------------------------- K */
  console.log('\n── K. Lo que le preguntan y no sabe ──');
  r = await ev(page, async () => {
    UNLOCKED=false; quienRol(''); setVendedorMem('Mirian Salazar'); STATE=FIX(); window._saves=[];
    asisAbrir('ayuda'); ASIS.q='factura con nit extranjero'; asisAyudaLista();
    await new Promise(function(res){ setTimeout(res, 3300); });
    var ls=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    CONNECTED=true; ULTIMO_REFRESCO=Date.now(); CARGA_ESTADO='ok';
    asisPreguntasMandar(); await new Promise(function(res){ setTimeout(res, 300); });
    var s=window._saves.filter(function(x){ return x.id==='__asis_preguntas__'; })[0], o=s ? JSON.parse(s.observaciones) : null;
    var ls2=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    var esSis=esFilaSistema(s||{}), enMis=(function(){ showView('mis'); document.getElementById('mis-vendedor').value=''; try{ renderMis(); }catch(e){} return /PREGUNTAS A EDUARDO/.test(document.getElementById('view-mis').innerText); })();
    var vend=asisPreguntasHtml(); UNLOCKED=true; var adm=asisPreguntasHtml(); UNLOCKED=false; CONNECTED=false; asisCerrar();
    return { ls:ls.map(function(x){ return x.t+'|'+x.v; }), q:o && o.q.map(function(x){ return x.t; }), ls2:ls2.length, esSis:esSis, enMis:enMis, vend:vend, adm:/factura con nit extranjero/.test(adm) };
  });
  chk('una búsqueda sin respuesta, quieta 3 s, se anota con quién preguntó', r.ls && r.ls[0]==='factura con nit extranjero|Mirian Salazar', r);
  chk('con conexión va a la fila del sistema «__asis_preguntas__» y sale de la espera del aparato', r.q && r.q.indexOf('factura con nit extranjero')>=0 && r.ls2===0, r);
  chk('esa fila NO es un pedido (no aparece en las listas)', r.esSis && !r.enMis, r);
  chk('solo Administración ve la lista', r.vend==='' && r.adm, r);

  /* ---------------------------------------------------------------- E */
  console.log('\n── E. El resumen del día, a la mañana ──');
  await page.close();
  page = await abrir('09:10');
  r = await ev(page, async () => {
    quienRol(''); setVendedorMem('Mirian Salazar'); STATE=FIX();
    showView('mis'); document.getElementById('mis-vendedor').value='Mirian Salazar'; await new Promise(function(res){ setTimeout(res, 200); });
    var A=asisAvisos(), R=A[0];
    asisAbrir('avisos'); var bt=document.querySelector('#asis-panel .asis-res .asis-b'); if(bt) bt.click();
    var li=[].map.call(document.querySelectorAll('#asis-panel .asis-res .asis-li button'), function(b){ return b.innerText.replace(/\s+/g,' '); });
    asisCerrar(); quienRol('logistica'); setVendedorMem('');
    var L=asisAvisos().filter(function(a){ return /^dia\|/.test(a.k); })[0];
    return { k:R&&R.k, t:R&&R.t, res:R&&R.res.map(function(x){ return x.t; }), li:li, log:L&&L.res.map(function(x){ return x.t; }) };
  });
  chk('a las 9: el primer aviso es «☀️ Tu día, Mirian» con tres líneas', /^dia\|/.test(r.k||'') && /Tu día, Mirian/.test(r.t||'') && r.res && r.res.length===3, r);
  chk('las líneas dicen hoy, mañana y los clientes con saldo', r.res && /Hoy se entregan 3 pedidos tuyos/.test(r.res[0]) && /Mañana|El /.test(r.res[1]) && /1 cliente con saldo/.test(r.res[2]), r);
  chk('«Ver cuáles» de una línea muestra sus pedidos', r.li && r.li.length===3, r);
  chk('logística ve el suyo (salen hoy, mañana, lo de Moreno)', r.log && r.log.length===3 && /Hoy salen 3 pedidos · 2 sin camión/.test(r.log[0]) && /Moreno/.test(r.log[2]), r);
  await page.clock.runFor(6*3600000);
  r = await ev(page, () => ({ hay:asisAvisos().some(function(a){ return /^dia\|/.test(a.k); }) }));
  chk('a la tarde ya no sale', r.hay===false, r);
  await page.close();

  /* ---------------------------------------------------------------- H */
  console.log('\n── H. En el celular, mientras se escribe, Eduardo se achica ──');
  page = await abrir('11:00', 390);
  r = await ev(page, async () => {
    var y=document.getElementById('asis-yo'); if(!y) return { sin:true };
    var antes=y.getBoundingClientRect().height;
    var c=document.getElementById('f-cliente'); c.focus(); await new Promise(function(res){ setTimeout(res, 400); });
    var cls=document.body.classList.contains('asis-escribe'), durante=y.getBoundingClientRect().height;
    c.blur(); await new Promise(function(res){ setTimeout(res, 500); });
    return { cls:cls, antes:antes, durante:durante, fuera:document.body.classList.contains('asis-escribe') };
  });
  chk('al escribir se achica (y vuelve al salir del campo)', r.cls && r.durante<r.antes*0.7 && r.fuera===false, r);
  await page.close();

  chk('sin errores de la página', !errores.length, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
