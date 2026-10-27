/* 🎨 ARRIBA DEL PEDIDO, LA C (§4nj, 27/10; dueño: «esta webada hay que modernizar», eligió la C de las muestras, «no veo el botón ver
   pedidos… pulir un poco más», y con la C pulida: «C ok, publica las dos»).
   Lo que cuida esta prueba:
   · Sin `FH_PRUEBA` (las demás pruebas) todo sigue como antes: el encabezado nuevo escondido, el cartel de cupos y la conexión a la vista.
   · Con `FH_PRUEBA`: el encabezado reemplaza A LA VISTA la conexión, el cartel y los dos enlaces de ayuda, que se siguen armando igual.
   · Una tarjeta por turno con los libres de `limTurno`/`cuposUsadosTurno`, «👀 Ver los N pedidos» SIEMPRE (abre `verCuposTurno`), el turno del
     pedido marcado; «¡Quedan pocos!» y «Lleno» con su aviso de una línea; más de los que entran; sábado sin tarde; feriado, domingo y día
     cerrado reemplazan las tarjetas; sin conexión lo dice; Novedades con su punto hasta abrirla; «Corregir pedido» editando; venta de tienda
     sin camión; en el celular entra sin correr la página.
   Reloj clavado: martes 27/10/2026 10:00 de Bolivia; los pedidos son del miércoles 28.   Se corre:  node tests/test_arriba_pedido.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-27T10:00:00-04:00';

function PREPARAR(){
  CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_REFRESCO=Date.now(); ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  try{ localStorage.removeItem('me_novedades_visto'); }catch(e){}
  var n=0;
  window.P=function(f, t){ n++; return { id:'x'+n, oc:'10-'+(100+n), vendedor:'Carola Chavez', cliente:'CLIENTE '+n, fecha:f, turno:t,
    productos:[{desc:'COLCHON SOFT',medida:'100x190',cant:1}], saldo:10, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:1, rev:1, fotos:[] }; };
  /* `am` y `pm` pedidos para ese día; deja la fecha y el turno del formulario y repinta. */
  window.DIA=function(f, am, pm, turno){
    STATE=[]; for(var i=0;i<am;i++) STATE.push(P(f,'AM')); for(var j=0;j<pm;j++) STATE.push(P(f,'PM'));
    document.getElementById('f-fecha').value=f; segSet('f-turno', turno||'AM'); renderConnEstado(); renderCupoForm();
    var b=document.getElementById('fh');
    var t=function(k){ var c=b.querySelector('.fh-t[data-t="'+k+'"]'); return c ? { sel:c.classList.contains('sel'), k:(c.className.match(/k-\w+/)||[''])[0],
      tag:(c.querySelector('em')||{}).textContent||'', n:((c.querySelector('.fh-n')||{}).textContent||'').replace(/\s+/g,' ').trim(), ver:(c.querySelector('.fh-ver')||{}).textContent||'' } : null; };
    return { vis:!b.hidden, AM:t('AM'), PM:t('PM'), alertas:[].map.call(b.querySelectorAll('.fh-alerta'), function(a){ return a.className.replace('fh-alerta ','')+'|'+a.textContent.replace(/\s+/g,' ').trim(); }),
             cerrado:((b.querySelector('.fh-cerrado')||{}).textContent||'').replace(/\s+/g,' ').trim(), dia:((b.querySelector('.fh-dia')||{}).textContent||'').replace(/\s+/g,' ').trim(),
             vivo:((b.querySelector('.fh-vivo')||{}).textContent||''), vivoOff:!!b.querySelector('.fh-vivo.off'), h3:((b.querySelector('h3')||{}).textContent||''),
             cartel:document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim() };
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, h, init){
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:h||900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(init) await ctx.addInitScript(init);
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  }
  const vis = sel => 'getComputedStyle(document.querySelector("'+sel+'")).display!=="none"';

  // ── sin la bandera: como antes ──
  let page = await abrir();
  let r = await page.evaluate(() => { var o=DIA('2026-10-28', 5, 2); o.cupoVis=getComputedStyle(document.getElementById('cupo-form')).display!=='none';
    o.ayudaVis=[].every.call(document.querySelectorAll('.fh-viejo'), function(a){ return getComputedStyle(a).display!=='none'; }); return o; });
  chk('sin `FH_PRUEBA` (las demás pruebas) queda como antes: el encabezado nuevo escondido y el cartel de cupos y la ayuda a la vista', !r.vis && r.cupoVis && r.ayudaVis, r);
  await page._ctx.close();

  // ── con la bandera ──
  page = await abrir(1440, 900, ()=>{ window.FH_PRUEBA=1; });
  r = await page.evaluate(() => { var o=DIA('2026-10-28', 5, 2);
    o.ocultos=['conn-form','cupo-form'].map(function(id){ return getComputedStyle(document.getElementById(id)).display; }).concat([].map.call(document.querySelectorAll('.fh-viejo'), function(a){ return getComputedStyle(a).display; }));
    o.links=[].map.call(document.querySelectorAll('#fh .fh-ic'), function(a){ return a.getAttribute('href')+'|'+a.getAttribute('target'); });
    o.punto=!!document.querySelector('#fh .fh-ic .pt'); return o; });
  chk('el encabezado reemplaza a la vista la conexión, el cartel de cupos y los dos enlaces (que se siguen armando: el cartel dice lo de siempre)',
      r.vis && r.ocultos.every(d=>d==='none') && /Cupos del 28\/10\/2026/.test(r.cartel), { ocultos:r.ocultos, cartel:r.cartel });
  chk('arriba: «Nuevo pedido», «En línea», y Guía y Novedades con sus páginas de siempre (en otra pestaña)',
      r.h3==='Nuevo pedido' && r.vivo==='En línea' && !r.vivoOff && r.links.join()==='tutorial.html|_blank,guia-vendedor.html|_blank', r);
  chk('«🚚 Camión del miércoles 28/10»', /Camión del miércoles 28\/10/.test(r.dia), r.dia);
  chk('mañana (el turno del pedido): 7 libres de 12, «Tu turno», «👀 Ver los 5 pedidos»', r.AM.sel && r.AM.tag==='Tu turno' && /^7libres de 12/.test(r.AM.n) && r.AM.ver==='👀 Ver los 5 pedidos', r.AM);
  chk('tarde: 11 libres de 13 y su «👀 Ver los 2 pedidos» también (con lugar de sobra), sin marcar', !r.PM.sel && /^11libres de 13/.test(r.PM.n) && r.PM.ver==='👀 Ver los 2 pedidos', r.PM);
  chk('con lugar de sobra no hay ningún aviso abajo', r.alertas.length===0, r.alertas);
  chk('Novedades con su punto rosa hasta abrirla', r.punto, r);
  r = await page.evaluate(() => { document.querySelector('#fh .fh-t[data-t="PM"] .fh-ver').click(); var m=document.getElementById('modal'), t=(document.querySelector('#modal-box h3')||{}).textContent||'';
    var o={ abre:m.classList.contains('on'), t:t }; closeModal(); return o; });
  chk('«👀 Ver los 2 pedidos» abre la lista de ese turno (la de siempre)', r.abre && /Turno PM del 28\/10\/2026/.test(r.t), r);
  r = await page.evaluate(() => DIA('2026-10-28', 11, 2));
  chk('quedan pocos: «¡Quedan pocos!» en la mañana y abajo «⚠️ Queda 1 lugar a la mañana. Si se llena, pasalo a la tarde u otro día.»',
      r.AM.tag==='¡Quedan pocos!' && r.AM.k==='k-warn' && r.alertas.join()==='k-warn|⚠️ Queda 1 lugar a la mañana. Si se llena, pasalo a la tarde u otro día.', r);
  r = await page.evaluate(() => DIA('2026-10-28', 12, 2));
  chk('lleno: «Lleno», 0 libres y «🚫 La mañana del miércoles 28/10 está llena (12 de 12): pasalo a la tarde u otro día.»',
      r.AM.tag==='Lleno' && /^0libres de 12/.test(r.AM.n) && r.alertas.join()==='k-full|🚫 La mañana del miércoles 28/10 está llena (12 de 12): pasalo a la tarde u otro día.', r);
  r = await page.evaluate(() => DIA('2026-10-28', 13, 2));
  chk('con uno forzado (13 de 12) lo dice: «Hay 1 más de los 12 que entran…»', /Hay 1 más de los 12 que entran \(administración forzó alguno\): sacando uno sigue lleno\./.test(r.alertas.join()) && r.AM.ver==='👀 Ver los 13 pedidos', r.alertas);
  r = await page.evaluate(() => DIA('2026-10-28', 5, 13, 'PM'));
  chk('con la tarde elegida, la marcada es la tarde (y llena: «pasalo a la mañana»)', r.PM.sel && !r.AM.sel && /La tarde del miércoles 28\/10 está llena \(13 de 13\): pasalo a la mañana u otro día/.test(r.alertas.join()), r);
  r = await page.evaluate(() => DIA('2026-10-31', 9, 0));
  chk('sábado: la mañana con sus 15 y la tarde apagada («El camión no sale los sábados a la tarde»), sin aviso', /^6libres de 15/.test(r.AM.n) && r.PM.k==='k-off' && /no sale los sábados a la tarde/.test(r.PM.n) && !r.PM.ver && r.alertas.length===0, r);
  r = await page.evaluate(() => DIA('2026-10-31', 14, 0));
  chk('sábado casi lleno: «Si se llena, elegí otro día» (no hay tarde)', /Queda 1 lugar a la mañana\. Si se llena, elegí otro día\./.test(r.alertas.join()), r.alertas);
  r = await page.evaluate(() => DIA('2026-11-02', 0, 0));
  chk('feriado: en vez de las tarjetas, «🚫 Feriado: Todos Santos. El camión no sale; elegí otra fecha.»', !r.AM && /^🚫 Feriado: Todos Santos\. El camión no sale; elegí otra fecha\./.test(r.cerrado), r);
  r = await page.evaluate(() => DIA('2026-11-01', 0, 0));
  chk('domingo: «🚫 Los domingos no se agenda. Elegí otra fecha.»', !r.AM && /Los domingos no se agenda/.test(r.cerrado), r);
  r = await page.evaluate(() => { DIAS_CERRADOS.push('2026-10-29'); var o=DIA('2026-10-29', 3, 0); DIAS_CERRADOS.pop(); return o; });
  chk('día cerrado por administración: «🔒 El jueves 29/10 está cerrado…»', !r.AM && /🔒 El jueves 29\/10 está cerrado: administración ya armó el camión/.test(r.cerrado), r);
  r = await page.evaluate(() => { CARGA_ESTADO='error'; ULTIMO_ERROR='sin internet'; var o=DIA('2026-10-28', 5, 2); CARGA_ESTADO='ok'; ULTIMO_ERROR=''; return o; });
  chk('sin conexión: la pastilla en ámbar «Sin conexión» y abajo lo que dice la conexión de siempre', r.vivoOff && r.vivo==='Sin conexión' && /^k-off\|📡 Sin respuesta del servidor/.test(r.alertas[0]||''), r);
  r = await page.evaluate(() => { document.querySelector('#fh .fh-ic[href="guia-vendedor.html"]').addEventListener('click', function(e){ e.preventDefault(); }, true);
    fhNovedadVista(); return new Promise(function(res){ setTimeout(function(){ res({ punto:!!document.querySelector('#fh .fh-ic .pt'), ls:localStorage.getItem('me_novedades_visto') }); }, 150); }); });
  chk('abrir Novedades saca el punto (se recuerda en el aparato)', !r.punto && r.ls==='2026-10-27', r);
  r = await page.evaluate(() => { EDIT_ID='x1'; var o=DIA('2026-10-28', 5, 2); EDIT_ID=null; return o; });
  chk('corrigiendo un pedido dice «Corregir pedido»', r.h3==='Corregir pedido', r.h3);
  r = await page.evaluate(() => { var v=document.getElementById('view-form'); v.classList.add('venta-tienda'); DIA('2026-10-28', 5, 2);
    var o={ turnos:getComputedStyle(document.querySelector('#fh .fh-turnos')).display, dia:getComputedStyle(document.querySelector('#fh .fh-dia')).display, top:getComputedStyle(document.querySelector('#fh .fh-top')).display };
    v.classList.remove('venta-tienda'); return o; });
  chk('venta de tienda (no va en el camión): queda solo el título y la ayuda', r.turnos==='none' && r.dia==='none' && r.top!=='none', r);
  await page._ctx.close();

  page = await abrir(390, 844, ()=>{ window.FH_PRUEBA=1; });
  r = await page.evaluate(() => { DIA('2026-10-28', 11, 2); var b=document.getElementById('fh'), rb=b.getBoundingClientRect(), t=[].map.call(b.querySelectorAll('.fh-t'), function(c){ return Math.round(c.getBoundingClientRect().top); });
    return { pagina:document.documentElement.scrollWidth<=innerWidth+1, dentro:rb.left>=0 && rb.right<=innerWidth+1, juntas:t.length===2 && t[0]===t[1],
             tx:[].map.call(b.querySelectorAll('.fh-ic .tx'), function(x){ return getComputedStyle(x).display; }), unaLinea:(function(){ var e=b.querySelector('.fh-top'), h=e.getBoundingClientRect().height; return h<44; })() }; });
  chk('celular (390 px): entra sin correr la página, las dos tarjetas lado a lado y la ayuda solo con su ícono en una línea', r.pagina && r.dentro && r.juntas && r.tx.every(d=>d==='none') && r.unaLinea, r);
  await page._ctx.close();

  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
