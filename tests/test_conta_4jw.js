/* ✨ CONTABILIDAD CON EL ESTILO NUEVO (§4jw, 12/10). El dueño, con las muestras A–K: *«Ok pásalas y publica»*.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `258e672`, que no tiene nada de esto):
   A. Las 4 fichas de Ventas con su color y su dibujito (sin letras dentro del dibujo: las fichas se leen igual) y la barra de
      cobrado contra lo que falta, con los mismos números de las fichas.
   B. La dona de las marcas: las mismas marcas y montos que las fichas de marca; tocar una dice vendido, cobrado y falta.
   C. Los botones en tres grupos, con su número: «👯 Dos veces» y «⏳ Deben».
   D. Los chips cuentan con la regla del resumen y filtran SOLO la tabla (las fichas siguen siendo de todo); tocarlo otra vez lo saca.
   E. En pantalla angosta, las ventas en tarjetas (borde por estado, sello REGISTRADO); se puede volver a la tabla.
   F. Cargadas dos veces: cartel con «Ver cuáles»; «Son distintas» deja de marcar ese par en esta compu (tabla, resumen y botón).
   G. El semáforo del cierre: verde si lo contado da, ámbar con la diferencia, «falta contar»; todo cerrado → festejo.
   H. Quién tiene el efectivo: lo de `cuadreEfectivo`; «Retiro» abre el retiro ya llenado.
   I. Cada aviso de «Revisar antes de cerrar» con su botón (abre la venta, o la lista de los que deben).
   J. La plata que entró día por día: los totales por día y por forma de pago son los del cuadre.
   K. 📈 Proyección: una ficha por marca con la curva; lo vendido y la proyección son los de `proyeccionMes`.
   Nada de esto cambia una cuenta: al final se comparan las fichas de siempre con y sin los chips.

   Datos SINTÉTICOS (el repo es público). Reloj clavado en el viernes 18/09/2026, hora de Bolivia.
   Se corre:  node tests/test_conta_4jw.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_258e672.html node tests/test_conta_4jw.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const SHOTS = process.env.SHOTS || '';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  try{ localStorage.removeItem('me_cx_dup_ok'); localStorage.removeItem('me_cx_tabla'); }catch(e){}
  var n=0;
  var L=function(a){ return textoCobros(a); };
  var V=function(vend, reg, fecha, bs, o){
    o=o||{}; n++;
    return { id:'c'+n, oc:o.oc||('09-'+(300+n)), nota:o.nota||String(800+n), vendedor:vend, cliente:o.cliente||('CLIENTE C'+n), fecha:fecha, turno:fecha?'AM':'',
             productos:o.prods||[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:bs}], saldo:o.saldo!=null?o.saldo:0, acuenta:o.acuenta||0, pagado:!!o.pagado,
             metodoPago:o.met||'', entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[], chofer:'', vehiculo:'' };
  };
  window.FIX=function(){
    n=0;
    return [
      // pagada en efectivo el 10/09, registrada en el sistema
      V('Mauricio Merida','2026-09-10','2026-09-12',5000,{ pagado:true, met:L([{metodo:'Efectivo',monto:5000,fecha:'2026-09-10',nota:'801',comps:['F1']}])+' · REGISTRADO' }),
      // pagada con QR BISA el 11/09
      V('Juan Pablo Paredes','2026-09-11','2026-09-14',3000,{ pagado:true, met:L([{metodo:'QR',banco:'BISA',monto:3000,fecha:'2026-09-11',nota:'802',comps:['F2']}]) }),
      // con saldo: 1.000 a cuenta en efectivo, debe 2.000
      V('Maria Flores','2026-09-12','2026-09-15',3000,{ saldo:2000, acuenta:1000, met:L([{metodo:'Efectivo',monto:1000,fecha:'2026-09-12',nota:'803',comps:['F3'],anticipo:true}]) }),
      // dos veces: misma nota 900 en el talonario de Isabel
      V('Isabel Robledo','2026-09-13','2026-09-16',2000,{ nota:'900', cliente:'PEPITO', pagado:true, met:L([{metodo:'Tarjeta',monto:2000,fecha:'2026-09-13',nota:'900',comps:['F4']}]) }),
      V('Isabel Robledo','2026-09-14','2026-09-17',1500,{ nota:'900', cliente:'JUANITO', saldo:1500 }),
      // con recargo por entrega pactado
      V('Carola Chavez','2026-09-15','2026-09-18',4000,{ saldo:4000, met:L([{metodo:'',monto:150,envio:true}]) })
    ];
  };
  window._fichas=function(id){ return [].slice.call(document.querySelectorAll('#'+id+' .mc')).map(function(e){ return e.innerText.replace(/\s+/g,' ').trim(); }); };
  window.VER=function(){
    segSet('cta-tab','ventas'); setContaTab('ventas');
    var s=document.getElementById('cta-vendedor'); llenarSelectContaVendedor(); if(s) s.value='';
    document.getElementById('cta-search').value='';
    document.getElementById('cta-mes').value='2026-09';
    segSet('cta-mode','mes'); setContaModo('mes');
    segSet('cta-base','ingreso'); setContaBase();
  };
  window.CUADRE=function(){
    segSet('cta-tab','cuadre'); setContaTab('cuadre');
    document.getElementById('cua-mes').value='2026-09';
    var s=document.getElementById('cua-vendedor'); if(s) s.value='';
    segSet('cua-mode','mes'); setCuadreModo('mes');
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-09-18T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const foto = async (n) => { if(SHOTS) await page.screenshot({ path:SHOTS+'/cx_'+n+'.png', fullPage:false }); };
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(150);
  await ev(() => { STATE=FIX(); VER(); });
  await page.waitForTimeout(120);

  // ═══ A. Fichas vivas + barra ═══════════════════════════════════════════════════════════════════
  console.log('\n── A. Las fichas vivas y la barra ──');
  let r = await ev(() => {
    var cs=document.querySelectorAll('#cta-metrics .mc');
    return { n:cs.length, f:[].map.call(cs, function(c){ return c.className; }), esc:document.querySelectorAll('#cta-metrics .cx-esc svg').length,
             letras:[].map.call(document.querySelectorAll('#cta-metrics .cx-esc'), function(e){ return e.textContent.trim(); }).join(''),
             fichas:_fichas('cta-metrics'), barra:((document.querySelector('#cx-vivo .cx-barra-box')||{}).textContent||'').replace(/\s+/g,' ') };
  });
  chk('las 4 fichas de siempre llevan su color y su dibujito (cx-f1…cx-f4), sin letras dentro del dibujo',
      r.n===4 && r.esc===4 && r.letras==='' && /cx-f1/.test(r.f[0]) && /cx-f4/.test(r.f[3]), r);
  chk('«Falta cobrar» late mientras haya saldo (cx-debe)', /cx-debe/.test(r.f[2]||''), r.f);
  chk('las fichas dicen lo mismo de siempre: vendido Bs 18.500,00 en 6 ventas', /^VENDIDO EN EL PERÍODO Bs 18\.500,00 6 ventas/i.test(r.fichas[0]||''), r.fichas);
  chk('la barra: cobrado 59% (11.000 de 18.500), falta 41% (7.500) y 5 de 6 por cargar al sistema',
      /Cobrado 59%/.test(r.barra) && /Falta 41%/.test(r.barra) && /Por cargar al sistema: 5 de 6 \(83%\)/.test(r.barra), r.barra);

  // ═══ B. La dona ════════════════════════════════════════════════════════════════════════════════
  console.log('\n── B. La dona de las marcas ──');
  r = await ev(() => {
    var mks=[].map.call(document.querySelectorAll('#cx-vivo .cx-mk'), function(b){ return b.innerText.replace(/\s+/g,' ').trim(); });
    var arcos=document.querySelectorAll('#cx-vivo .cx-arco').length;
    var marcas=_fichas('cta-marcas');
    cxMarcaElegir('heaven');
    var det=(document.querySelector('#cx-vivo .cx-mk-det')||{}).innerText||'';
    var on=[].map.call(document.querySelectorAll('#cx-vivo .cx-mk.on'), function(b){ return b.innerText; }).join('|');
    cxMarcaElegir('heaven');
    var det2=(document.querySelector('#cx-vivo .cx-mk-det')||{}).innerText||'';
    return { mks:mks, arcos:arcos, marcas:marcas, det:det.replace(/\s+/g,' '), on:on, det2:det2 };
  });
  var heaF=(r.marcas||[]).filter(function(t){ return /HEAVEN/i.test(t); })[0]||'';
  chk('un arco y un botón por marca con ventas, con los MISMOS montos que las fichas de marca',
      r.arcos===r.mks.length && r.mks.length===r.marcas.length && r.mks.length>=2 && /Bs 10\.500,00/.test(heaF) && r.mks.some(function(t){ return /Heaven.*Bs 10\.500/.test(t); }), r);
  chk('tocar Heaven dice vendido, cobrado y lo que falta de Heaven (Bs 10.500 · cobrado Bs 3.000 · falta Bs 7.500)',
      /Vendido Bs 10\.500,00/.test(r.det) && /Cobrado Bs 3\.000,00/.test(r.det) && /Falta Bs 7\.500,00/.test(r.det) && /Heaven/.test(r.on), r.det);
  chk('tocarla otra vez vuelve a la ayuda', /Tocá una marca/.test(r.det2), r.det2);

  // ═══ C. Botones en grupos ══════════════════════════════════════════════════════════════════════
  console.log('\n── C. Los botones en tres grupos ──');
  r = await ev(() => ({
    grupos:[].map.call(document.querySelectorAll('#cx-grupos .cx-gr-t'), function(e){ return e.textContent.trim(); }),
    bajar:document.querySelectorAll('.cx-gr-bajar button').length, revisar:document.querySelectorAll('.cx-gr-revisar button').length, cargar:document.querySelectorAll('.cx-gr-cargar button').length,
    dup:document.getElementById('cx-dup-btn').innerText.replace(/\s+/g,' '), deben:document.getElementById('cx-deben-btn').innerText.replace(/\s+/g,' '),
    ids:['cta-productos-mes','nx-cierre-btn0','nx-pst-btn'].every(function(i){ return !!document.getElementById(i); })
  }));
  chk('tres grupos: Bajar (4, con 📁 Comprobantes desde §4mg), Revisar (3), Cargar (2), con los botones de siempre', r.grupos.join('|')==='⬇️ Bajar|🔎 Revisar|➕ Cargar' && r.bajar===4 && r.revisar===3 && r.cargar===2 && r.ids, r);
  chk('«👯 Dos veces» con 2 y «⏳ Deben» con 3', /Dos veces 2/.test(r.dup) && /Deben 3/.test(r.deben), r);

  // ═══ D. Chips ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── D. Los chips filtran la tabla ──');
  r = await ev(() => {
    var chips=[].map.call(document.querySelectorAll('#cx-chips .cx-chip'), function(b){ return b.innerText.replace(/\s+/g,' ').trim(); });
    var filas0=document.querySelectorAll('#tbl-conta tbody tr').length, fichas0=_fichas('cta-metrics').join('|');
    cxFiltro('debe');
    var filas1=[].map.call(document.querySelectorAll('#tbl-conta tbody tr'), function(t){ return t.textContent; });
    var fichas1=_fichas('cta-metrics').join('|'), pie=((document.querySelector('.cx-chips-pie')||{}).textContent||'').replace(/\s+/g,' ');
    cxFiltro('met','QR BISA');
    var filasQR=[].map.call(document.querySelectorAll('#tbl-conta tbody tr'), function(t){ return t.textContent; });
    cxFiltro('met','QR BISA');
    var filas2=document.querySelectorAll('#tbl-conta tbody tr').length;
    return { chips:chips, filas0:filas0, filas1:filas1.length, deben:filas1.every(function(t){ return /PEPITO|JUANITO|CLIENTE C3|CLIENTE C6/.test(t); }), mismo:fichas0===fichas1,
             pie:pie, qr:filasQR.length, qrOk:/CLIENTE C2/.test(filasQR[0]||''), filas2:filas2 };
  });
  chk('los chips cuentan como el resumen: Todas 6 · Pagadas 3 · Con saldo 3 · Por cargar 5 · Con recargo 1 · Dos veces 2 · y los métodos',
      r.chips.indexOf('📋 Todas 6')===0 && r.chips.indexOf('✅ Pagadas 3')>0 && r.chips.indexOf('⏳ Con saldo 3')>0 && r.chips.indexOf('📥 Por cargar al sistema 5')>0 &&
      r.chips.indexOf('🚚 Con recargo 1')>0 && r.chips.indexOf('👯 Dos veces 2')>0 && r.chips.indexOf('📱 QR BISA 1')>0, r.chips);
  chk('«Con saldo» deja 3 renglones en la tabla y las fichas de arriba no cambian', r.filas0===6 && r.filas1===3 && r.mismo, r);
  chk('…y lo dice: «Mostrando 3 de 6»', /Mostrando 3 de 6/.test(r.pie), r.pie);
  chk('un método filtra las ventas con ese pago, y tocarlo otra vez vuelve a todas', r.qr===1 && r.qrOk && r.filas2===6, r);

  // ═══ F. Dos veces ══════════════════════════════════════════════════════════════════════════════
  console.log('\n── F. Cargadas dos veces ──');
  r = await ev(() => {
    var b0=(document.querySelector('#cx-dup .cx-dup')||{}).innerText||'';
    cxDupAbrir();
    var pares=[].map.call(document.querySelectorAll('#cx-dup .cx-par'), function(p){ return p.innerText.replace(/\s+/g,' '); });
    var abrir=document.querySelectorAll('#cx-dup .cx-par-p .btn').length;
    var k=document.querySelector('#cx-dup .cx-par-ok').getAttribute('data-k');
    cxDupDistintas(k);
    return { b0:b0.replace(/\s+/g,' '), pares:pares, abrir:abrir, despues:(document.getElementById('cx-dup')||{}).innerText||'', chip:document.querySelectorAll('#tbl-conta .dup-chip, #tbl-conta [class*="dup"]').length,
             res:document.getElementById('cta-resumen').textContent, btn:document.getElementById('cx-dup-btn').innerText, ls:localStorage.getItem('me_cx_dup_ok')||'' };
  });
  chk('el cartel dice «2 ventas que pueden estar cargadas dos veces» con «Ver cuáles»', /2 ventas que pueden estar cargadas dos veces/.test(r.b0) && /Ver cuáles/.test(r.b0), r.b0);
  chk('«Ver cuáles» muestra el par: misma nota 900 de Isabel, PEPITO y JUANITO, cada uno con «Abrir»',
      r.pares.length===1 && /Misma nota 900/.test(r.pares[0]) && /PEPITO/.test(r.pares[0]) && /JUANITO/.test(r.pares[0]) && r.abrir===2, r.pares);
  chk('«Son distintas» lo anota en esta compu y deja de avisar (cartel, resumen y botón)',
      /marcado «son distintas»/.test(r.despues) && !/dos veces/.test(r.res) && /Dos veces ✓/.test(r.btn) && /c4/.test(r.ls), { btn:r.btn, ls:r.ls, resDup:/dos veces/.test(r.res), despues:r.despues });
  await ev(() => { cxDupVolver(); });

  // ═══ E. Tarjetas en angosto ════════════════════════════════════════════════════════════════════
  console.log('\n── E. En el iPad parado: tarjetas ──');
  await page.setViewportSize({ width:820, height:1100 });
  await page.waitForTimeout(250);
  r = await ev(() => {
    renderConta();
    var cs=[].slice.call(document.querySelectorAll('#cx-cards .cx-vc'));
    var tw=document.getElementById('cx-tw');
    var out={ n:cs.length, twVisible:!!(tw && tw.offsetHeight), sello:cs.filter(function(c){ return /REGISTRADO/.test(c.innerText); }).length,
      clases:cs.map(function(c){ return c.className.replace('cx-vc ',''); }), sw:document.documentElement.scrollWidth, iw:window.innerWidth,
      vista:(document.querySelector('.cx-vista-btn')||{}).innerText||'' };
    var c3=cs.filter(function(c){ return /CLIENTE C3/.test(c.innerText); })[0]; c3.click();
    out.modal=/CLIENTE C3/.test((document.querySelector('.modal-b')||{}).innerText||'');
    try{ closeModal(); }catch(e){}
    cxVistaCambiar();
    out.twTabla=!!(tw && tw.offsetHeight); out.cardsTabla=document.querySelectorAll('#cx-cards .cx-vc').length;
    cxVistaCambiar();
    return out;
  });
  await foto('E_ipad');
  chk('a 820 px las 6 ventas van en tarjetas y la tabla se esconde, sin scroll de costado', r.n===6 && !r.twVisible && r.sw<=r.iw, r);
  chk('borde por estado (pagada, con saldo) y el sello REGISTRADO en la que ya está en el sistema',
      r.sello===1 && r.clases.filter(function(c){ return /cx-reg/.test(c); }).length===1 && r.clases.filter(function(c){ return /^st-sal/.test(c); }).length===3 && r.clases.filter(function(c){ return /^st-ok/.test(c); }).length===3, r.clases);
  chk('tocar una tarjeta abre la venta', r.modal, r);
  chk('«📋 Ver como tabla» vuelve a la tabla (y se recuerda en esta compu)', /Ver como tabla/.test(r.vista) && r.twTabla && r.cardsTabla===0, r);
  await page.setViewportSize({ width:390, height:844 });
  await page.waitForTimeout(250);
  r = await ev(() => { renderConta(); return { n:document.querySelectorAll('#cx-cards .cx-vc').length, sw:document.documentElement.scrollWidth, iw:window.innerWidth }; });
  await foto('E_cel');
  chk('en el celular también, sin scroll de costado', r.n===6 && r.sw<=r.iw, r);
  await page.setViewportSize({ width:1180, height:900 });
  await page.waitForTimeout(250);
  r = await ev(() => { renderConta(); return { n:document.querySelectorAll('#cx-cards .cx-vc').length, tw:!!document.getElementById('cx-tw').offsetHeight }; });
  chk('en pantalla ancha sigue la tabla', r.n===0 && r.tw, r);
  await foto('A_ventas');

  // ═══ G-J. Cuadre ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── G. El semáforo del cierre ──');
  await ev(() => { ARQUEO={}; CUADRE(); });
  await page.waitForTimeout(150);
  r = await ev(() => {
    var cs=[].map.call(document.querySelectorAll('#cx-semaforo .cx-fp'), function(c){ return { cls:c.className, t:c.innerText.replace(/\s+/g,' ') }; });
    return { cs:cs, pie:(document.querySelector('#cx-semaforo .cx-sem-pie')||{}).innerText||'' };
  });
  chk('una tarjeta por forma de pago (Efectivo, QR BISA, Tarjeta) con lo cobrado, y «falta contar»',
      r.cs.length===3 && /Efectivo/.test(r.cs[0].t) && /Bs 6\.000,00/.test(r.cs[0].t) && r.cs.every(function(c){ return /cx-pend/.test(c.cls); }) && /Faltan contar 3/.test(r.pie), r);
  r = await ev(async () => {
    setCuadreArqueo('Efectivo','5900'); setCuadreArqueo('QR BISA','3000');
    await new Promise(function(res){ setTimeout(res, 60); });
    var cs=[].map.call(document.querySelectorAll('#cx-semaforo .cx-fp'), function(c){ return { cls:c.className, t:c.innerText.replace(/\s+/g,' ') }; });
    return { cs:cs, pie:(document.querySelector('#cx-semaforo .cx-sem-pie')||{}).innerText||'' };
  });
  chk('lo contado se lee de la tabla del cierre: Efectivo ámbar «Faltan Bs 100,00», QR BISA verde «Cierra»',
      /cx-mal/.test(r.cs[0].cls) && /Faltan Bs 100,00/.test(r.cs[0].t) && /cx-ok/.test(r.cs[1].cls) && /Cierra/.test(r.cs[1].t), r);
  r = await ev(async () => {
    cxIrArqueo('Tarjeta');
    var foco=document.activeElement && document.activeElement.getAttribute('data-forma');
    setCuadreArqueo('Efectivo','6000'); setCuadreArqueo('Tarjeta','2000');
    await new Promise(function(res){ setTimeout(res, 60); });
    return { foco:foco, fiesta:(document.querySelector('#cx-semaforo .cx-fiesta')||{}).innerText||'', ok:document.querySelectorAll('#cx-semaforo .cx-ok').length };
  });
  chk('tocar una tarjeta lleva a su casilla en la tabla', r.foco==='Tarjeta', r);
  chk('todo contado y sin diferencia → «🎉 El cuadre cierra»', r.ok===3 && /El cuadre cierra/.test(r.fiesta), r);
  await foto('G_cuadre');

  console.log('\n── H. Quién tiene el efectivo ──');
  r = await ev(() => {
    var E=cuadreEfectivo().filas.filter(function(o){ return Math.abs(o.falta)>0.01; });
    var cs=[].map.call(document.querySelectorAll('#cx-mano .cx-mano'), function(c){ return c.innerText.replace(/\s+/g,' '); });
    var b=document.querySelector('#cx-mano .cx-mano-btn'); var nom=b && b.getAttribute('data-n'), m=b && b.getAttribute('data-m');
    b.click();
    var ov=document.getElementById('retiros-overlay').style.display, ent=(document.getElementById('ret-entrega')||{}).value, mon=(document.getElementById('ret-monto')||{}).value;
    try{ closeRetiros(); }catch(e){}
    return { E:E.map(function(o){ return o.nombre+':'+o.falta; }), cs:cs, nom:nom, m:m, ov:ov, ent:ent, mon:mon };
  });
  chk('una ficha por persona con el efectivo en la mano, lo mismo que la tabla de retiros (Mauricio 5.000, Maria 1.000)',
      r.cs.length===r.E.length && r.cs.length===2 && /Mauricio Merida Bs 5\.000,00/.test(r.cs[0]) && /Maria Flores Bs 1\.000,00/.test(r.cs[1]), r);
  chk('«Retiro» abre el retiro de efectivo con la persona y el monto ya puestos', r.ov==='flex' && r.ent==='Mauricio Merida' && r.mon==='5000', r);

  console.log('\n── I. Los avisos con su botón ──');
  r = await ev(() => {
    var av=[].map.call(document.querySelectorAll('#cua-alertas .cua-av'), function(a){
      var k=((a.getAttribute('onclick')||'').match(/cuaToggleAviso\('([^']+)'\)/)||[])[1]; var b=a.querySelector('.cx-av-btn');
      return { k:k, btn:b?b.textContent:'', on:a.classList.contains('on') };
    });
    var cob=document.querySelector('#cua-alertas .cx-av-btn[onclick*="abrirPorCobrar"]');
    var antes=av.map(function(a){ return a.k+':'+a.on; }).join(',');
    if(cob) cob.click();
    var lista=/Falta cobrar/.test((document.querySelector('.modal-h')||{}).innerText||'');
    try{ closeModal(); }catch(e){}
    var dup=document.querySelector('#cua-alertas .cx-av-btn[data-id]');
    var despues=[].map.call(document.querySelectorAll('#cua-alertas .cua-av'), function(a){ return ((a.getAttribute('onclick')||'').match(/cuaToggleAviso\('([^']+)'\)/)||[])[1]+':'+a.classList.contains('on'); }).join(',');
    return { av:av, lista:lista, dup:!!dup, mismo:antes===despues };
  });
  chk('«⏳ con saldo por cobrar» trae «💰 Ver quiénes deben» y abre la lista', r.av.some(function(a){ return a.k==='cobrar' && /Ver quiénes deben/.test(a.btn); }) && r.lista, r.av);
  chk('los avisos con ventas traen un botón que abre la venta (👯 Comparar, 📥 Abrir…)', r.dup && r.av.some(function(a){ return a.k==='dup' && /Comparar/.test(a.btn); }), r.av);
  chk('tocar el botón no pliega ni abre el aviso', r.mismo, r);

  console.log('\n── J. La plata que entró, día por día ──');
  r = await ev(() => {
    var D=CX_TIEMPO.datos||[], cols=document.querySelectorAll('#cx-tiempo .cx-t-col').length, tit=(document.querySelector('#cx-tiempo .cua-t')||{}).textContent||'';
    var d10=D.filter(function(b){ return b.k==='2026-09-10'; })[0], d12=D.filter(function(b){ return b.k==='2026-09-12'; })[0];
    var tot=0; cuadrePagos().forEach(function(c){ tot+=c.monto; });
    var i=D.indexOf(d12); cxTiempoVer(i);
    return { n:D.length, cols:cols, tit:tit, d10:d10&&d10.g, d12:d12&&d12.tot, tot:tot, det:document.getElementById('cx-t-det').innerText };
  });
  chk('30 barras (los días de septiembre), con el total del cuadre: Bs 11.000,00 en 4 cobros', r.n===30 && r.cols===30 && /Bs 11\.000,00 en 4 cobros/.test(r.tit) && r.tot===11000, r);
  chk('el 10/09: Bs 5.000 en efectivo; tocar el 12/09 dice lo que entró ese día', r.d10 && r.d10.ef===5000 && r.d12===1000 && /12\/09 · Bs 1\.000,00 en 1 cobro — Efectivo Bs 1\.000,00/.test(r.det), r);
  r = await ev(async () => { segSet('cua-mode','dia'); setCuadreModo('dia'); document.getElementById('cua-dia').value='2026-09-13'; renderCuadre();
    await new Promise(function(res){ setTimeout(res, 40); });
    var D=CX_TIEMPO.datos||[]; return { ks:D.map(function(b){ return b.k; }), tot:D.map(function(b){ return b.tot; }) }; });
  chk('en «Día», ese día y los 6 de antes (07 al 13/09), con lo de cada uno', r.ks.length===7 && r.ks[0]==='2026-09-07' && r.ks[6]==='2026-09-13' && r.tot[3]===5000 && r.tot[6]===2000, r);
  await ev(() => { segSet('cua-mode','mes'); setCuadreModo('mes'); });

  // ═══ K. Proyección ═════════════════════════════════════════════════════════════════════════════
  console.log('\n── K. Proyección por marca, con la curva ──');
  await ev(() => { UNLOCKED=true; try{ mostrarBotonesTodos(); }catch(e){} segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-09'; renderProyeccion(); });
  await page.waitForTimeout(150);
  r = await ev(() => {
    var R=proyeccionMes('2026-09');
    var cs=[].map.call(document.querySelectorAll('#cx-pry .cx-kf'), function(c){ return c.innerText.replace(/\s+/g,' '); });
    var ms=R.marcas.filter(function(m){ return m.tot.n; }).map(function(m){ return m.g.lbl+':'+Math.round(m.tot.vendido)+':'+Math.round(m.tot.proy); });
    return { cs:cs, ms:ms, lineas:document.querySelectorAll('#cx-pry .cx-k-l').length, punt:document.querySelectorAll('#cx-pry .cx-k-p').length,
             fmt:R.marcas.filter(function(m){ return m.tot.n; }).map(function(m){ return fmtBs0(m.tot.vendido)+'|'+fmtBs0(m.tot.proy); }) };
  });
  chk('una ficha por marca con ventas, con su línea llena y la punteada hasta el cierre', r.cs.length===r.ms.length && r.cs.length>=2 && r.lineas===r.cs.length && r.punt===r.cs.length, r);
  chk('lo vendido y «llegaría a» son los de proyeccionMes', r.cs.every(function(t, i){ var f=r.fmt[i].split('|'); return t.indexOf(f[0])>=0 && t.indexOf(f[1])>=0; }), r);
  chk('la meta dice que todavía no hay dónde cargarla', r.cs.every(function(t){ return /Meta: todavía no hay dónde cargarla/.test(t); }), r.cs);
  await foto('K_proy');

  // ═══ A+. Las fichas de marca y las del Cuadre, con el mismo estilo (dueño, 11/10) ═══════════════════
  console.log('\n── A+. Fichas de marca, del Cuadre y de Proyección con color y dibujito ──');
  r = await ev(async () => {
    var pry=[].map.call(document.querySelectorAll('#pry-metrics .mc'), function(c){ return c.classList.contains('cx-v'); });
    VER(); await new Promise(function(res){ setTimeout(res, 60); });
    var mk=[].map.call(document.querySelectorAll('#cta-marcas .mc'), function(c){ return { v:c.classList.contains('cx-v'), ico:!!c.querySelector('.cx-esc svg'), pct:!!c.querySelector('.cx-pct i'), txt:c.innerText.replace(/\s+/g,' ') }; });
    CUADRE(); await new Promise(function(res){ setTimeout(res, 60); });
    var cu=[].map.call(document.querySelectorAll('#cua-metrics .mc'), function(c){ return c.classList.contains('cx-v') && !!c.querySelector('.cx-esc svg'); });
    var letras=[].map.call(document.querySelectorAll('#cua-metrics .cx-esc, #cta-marcas .cx-esc'), function(e){ return e.textContent.trim(); }).join('');
    return { pry:pry, mk:mk, cu:cu, letras:letras };
  });
  chk('Sueña y Heaven en Ventas: con su color, dibujito y la barrita del % (el texto sigue igual)',
      r.mk.length>=2 && r.mk.every(function(m){ return m.v && m.ico && m.pct; }) && /% de lo vendido/.test(r.mk[0].txt), r.mk);
  chk('todas las fichas del Cuadre y de Proyección con el estilo nuevo, sin letras dentro del dibujo',
      r.cu.length>=8 && r.cu.every(Boolean) && r.pry.length>=2 && r.pry.every(Boolean) && r.letras==='', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
