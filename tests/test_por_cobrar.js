/* ⏳ QUIÉN DEBE: «FALTA COBRAR» SE TOCA Y DICE QUIÉNES SON (dueño, 06/10, §4hr).

   *«En cuadre y conciliación los vendedores sale que tienen por cobrar pero contabilidad no sabe qué clientes son, tampoco
   sale en el bot de revisar antes de cerrar y en ventas tampoco. En la ficha de falta por cobrar al dar click debería abrir
   una pestaña que muestre los clientes y al dar otro click llevar a esos clientes.»*

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, que no tiene nada de esto):
   1. Contabilidad → Ventas: la ficha «Falta cobrar» se toca y abre la lista con la MISMA cuenta que la ficha (vendedor,
      mes y búsqueda de la pantalla), de la venta más vieja a la más nueva. «⏳ Con saldo» del resumen abre la misma lista.
   2. Tocar un cliente abre SU venta, con «← Volver a la lista»; volver muestra la lista otra vez. Abrir la misma venta desde
      otro lado, con la ventana cerrada, no muestra el botón.
   3. Después de cobrarla, la venta ya no está en la lista (se arma al abrir).
   4. Sin saldo, la ficha dice «✅ Nada» y no se toca.
   5. Cuadre y conciliación: la ficha «Por cobrar» se toca y abre la lista del período y la vendedora del Cuadre.
   6. «Revisar antes de cerrar» tiene el renglón «⏳ N ventas con saldo por cobrar», abierto, con los nombres; un nombre abre
      su venta y, con más de 8, «… y N más ›» abre la lista entera.
   7. «📋 Copiar la lista» copia los clientes con su saldo; el texto del Cuadre no repite el renglón en «Revisar».
   8. En el celular (390 px) la lista entra sin correr la página de costado.

   Datos SINTÉTICOS (el repo es público). Reloj clavado en el martes 20/10/2026 a las 11:00 de Bolivia.
   Se corre:  node tests/test_por_cobrar.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_por_cobrar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  var n=0;
  /* Una venta de Carola (salvo `o.vend`), cargada el día `reg`: `total` y lo que ya pagó (`acuenta`). */
  var V=function(cliente, reg, total, acuenta, o){
    o=o||{}; n++;
    var saldo=Math.max(0, total-(acuenta||0));
    return { id:'v'+n, oc:o.oc||('10-'+(400+n)), nota:String(1200+n), vendedor:o.vend||'Carola Chavez', cliente:cliente, celular:'7000000'+n,
             fecha:o.fecha||reg, turno:'AM', productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:total}],
             acuenta:acuenta||0, saldo:saldo, pagado:saldo<0.01, metodoPago:(acuenta?('Efectivo'):''), entregado:false,
             ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] };
  };
  window.FIX=function(){
    n=0;
    return [
      V('CLIENTE PAGADO',    '2026-10-02', 3000, 3000),
      V('CLIENTE VIEJO',     '2026-10-01', 5000, 1000),                     // debe 4.000, la más vieja (19 días)
      V('CLIENTE NUEVO',     '2026-10-15', 2000,  500),                     // debe 1.500 (5 días)
      V('CLIENTE DE MARIA',  '2026-10-05', 4000,    0, { vend:'Maria Flores' }),   // de otra vendedora
      V('CLIENTE SEPTIEMBRE','2026-09-20', 1000,    0),                     // de otro mes
      V('MIA PLAZA',         '2026-10-03', 9000,    0, { oc:'RPT 10-001' }) // una RPT no se cobra
    ];
  };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._modal=function(){ var m=document.getElementById('modal'); return { on:!!(m && m.classList.contains('on')), txt:_txt('#modal-box') }; };
  window._filas=function(){ return [].slice.call(document.querySelectorAll('#modal-box .pc-fila')).map(function(tr){ return tr.innerText.replace(/\s+/g,' ').trim(); }); };
  window.VER=function(vend, mes, q){
    closeModal();
    segSet('cta-tab','ventas'); setContaTab('ventas');
    llenarSelectContaVendedor(); var s=document.getElementById('cta-vendedor'); if(s) s.value=vend||'';
    document.getElementById('cta-search').value=q||'';
    document.getElementById('cta-mes').value=mes||'2026-10';
    segSet('cta-mode','mes'); setContaModo('mes');
    segSet('cta-base','ingreso'); setContaBase();
  };
  window.CUADRE=function(vend){
    closeModal();
    segSet('cta-tab','cuadre'); setContaTab('cuadre');
    var s=document.getElementById('cua-vendedor'); if(s){ if(![].slice.call(s.options).some(function(o){ return o.value===vend; })){ var op=document.createElement('option'); op.value=vend; op.textContent=vend; s.appendChild(op); } s.value=vend||''; }
    var m=document.getElementById('cua-mes'); if(m) m.value='2026-10';
    segSet('cua-mode','mes'); setCuadreModo('mes');
    renderCuadre();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-20T11:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(150);
  await ev(() => { STATE=FIX(); });

  const hay = await ev(() => ({ abrir:typeof abrirPorCobrar==='function' }));
  if(!hay.abrir) chk('el panel tiene la lista de lo que falta cobrar (abrirPorCobrar)', false, 'no existe: es la página de antes de §4hr');

  // ═══ 1. Ventas: la ficha se toca y abre quiénes deben ═════════════════════════════════════════
  console.log('\n── 1. Contabilidad → Ventas, Carola, octubre ──');
  let r = await ev(() => {
    VER('Carola Chavez','2026-10');
    var fichas=[].slice.call(document.querySelectorAll('#cta-metrics .mc'));
    var falta=fichas.filter(function(e){ return /FALTA COBRAR/i.test(e.innerText); })[0];
    return { txt:falta?falta.innerText.replace(/\s+/g,' ').trim():'', toca:!!(falta && falta.classList.contains('mc-toca')) };
  });
  chk('la ficha dice Bs 5.500,00 de 2 ventas con saldo (la pagada, la de Maria, la de septiembre y la RPT no cuentan)',
      /FALTA COBRAR Bs 5\.500,00 2 ventas con saldo/i.test(r.txt), r);
  chk('⚠️ …y se puede tocar: «👆 Tocá para ver quiénes son»', r.toca && /Tocá para ver quiénes son/.test(r.txt), r);
  await page.click('#cta-metrics .mc-toca');
  await page.waitForTimeout(150);
  r = await ev(() => ({ m:_modal(), filas:_filas() }));
  chk('⚠️ tocarla abre la lista «⏳ Falta cobrar · Bs 5.500,00» con 2 ventas de Carola Chavez en octubre', r.m.on && /Falta cobrar · Bs 5\.500,00/.test(r.m.txt) && /2 ventas con saldo · Carola Chavez · octubre de 2026/.test(r.m.txt), r.m.txt.slice(0,200));
  chk('…de la más vieja a la más nueva: CLIENTE VIEJO (debe Bs 4.000, 19 d) y después CLIENTE NUEVO (Bs 1.500, 5 d)',
      r.filas.length===2 && /^CLIENTE VIEJO/.test(r.filas[0]) && /4\.000,00/.test(r.filas[0]) && /19 d/.test(r.filas[0]) && /^CLIENTE NUEVO/.test(r.filas[1]) && /1\.500,00/.test(r.filas[1]), r.filas);
  chk('…con nota, número de pedido y celular para ubicarlos', /nota 1202/.test(r.filas[0]||'') && /70000002/.test(r.filas[0]||''), r.filas[0]);

  // ═══ 2. Un cliente → su venta → volver a la lista ═══════════════════════════════════════════════
  console.log('\n── 2. Tocar un cliente lleva a su venta, y se vuelve ──');
  await page.click('#modal-box .pc-fila >> nth=0');
  await page.waitForTimeout(150);
  r = await ev(() => ({ m:_modal(), volver:!!document.getElementById('pc-volver') }));
  chk('⚠️ tocar CLIENTE VIEJO abre SU venta (la ficha de Contabilidad, con el saldo y para registrar el pago)', r.m.on && /CLIENTE VIEJO/.test(r.m.txt) && /Registrar pago|Falta cobrar|FALTA/i.test(r.m.txt), r.m.txt.slice(0,160));
  chk('…con «← Volver a la lista de lo que falta cobrar»', r.volver);
  await page.click('#pc-volver');
  await page.waitForTimeout(150);
  r = await ev(() => ({ m:_modal(), filas:_filas() }));
  chk('volver muestra la lista otra vez', r.m.on && r.filas.length===2 && /Falta cobrar/.test(r.m.txt), r.filas);
  r = await ev(() => { closeModal(); showContaModal('v2'); return { volver:!!document.getElementById('pc-volver') }; });
  chk('abrir la misma venta desde otro lado (la ventana estaba cerrada) NO muestra «Volver a la lista»', !r.volver);

  // ═══ 3. «Con saldo» del resumen y después de cobrar ════════════════════════════════════════════
  console.log('\n── 3. El resumen y después de cobrar ──');
  r = await ev(() => { VER('Carola Chavez','2026-10'); var a=document.getElementById('cta-con-saldo'); if(a) a.click(); return { link:!!a, m:_modal(), filas:_filas() }; });
  chk('«⏳ Con saldo: 2 (Bs 5.500,00)» del resumen también abre la lista', r.link && r.m.on && r.filas.length===2, r);
  r = await ev(() => { var p=findById('v3'); p.saldo=0; p.pagado=true; p.metodoPago='Efectivo 1500 @2026-10-20'; VER('Carola Chavez','2026-10'); abrirPorCobrar('ventas'); return { filas:_filas(), m:_modal() }; });
  chk('⚠️ cobrada CLIENTE NUEVO, ya no está en la lista (queda CLIENTE VIEJO, Bs 4.000,00)', r.filas.length===1 && /^CLIENTE VIEJO/.test(r.filas[0]) && /Falta cobrar · Bs 4\.000,00/.test(r.m.txt), r.filas);
  r = await ev(() => { VER('Carola Chavez','2026-10','viejo'); abrirPorCobrar('ventas'); return { filas:_filas(), m:_modal() }; });
  chk('con «viejo» en Buscar, la lista dice «solo lo que coincide»', r.filas.length===1 && /solo lo que coincide con «viejo»/.test(r.m.txt), r.m.txt.slice(0,200));
  r = await ev(() => { STATE=FIX(); VER('Maria Flores','2026-10'); var f=[].slice.call(document.querySelectorAll('#cta-metrics .mc')).filter(function(e){ return /FALTA COBRAR/i.test(e.innerText); })[0];
                       abrirPorCobrar('ventas'); return { ficha:f?f.innerText.replace(/\s+/g,' ').trim():'', filas:_filas() }; });
  chk('con Maria Flores elegida, solo su cliente (Bs 4.000,00)', r.filas.length===1 && /^CLIENTE DE MARIA/.test(r.filas[0]) && /4\.000,00/.test(r.ficha), r);

  // ═══ 4. Sin saldo ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Sin saldo ──');
  r = await ev(() => { STATE.forEach(function(p){ p.saldo=0; p.pagado=true; }); VER('Carola Chavez','2026-10');
                       var f=[].slice.call(document.querySelectorAll('#cta-metrics .mc')).filter(function(e){ return /FALTA COBRAR/i.test(e.innerText); })[0];
                       return { txt:f?f.innerText.replace(/\s+/g,' ').trim():'', toca:!!(f && f.classList.contains('mc-toca')) }; });
  chk('sin saldo: «✅ Nada» y la ficha no se toca', /✅ Nada/.test(r.txt) && !r.toca, r);

  // ═══ 5-6. Cuadre: la ficha y «Revisar antes de cerrar» ══════════════════════════════════════════
  console.log('\n── 5. Cuadre y conciliación, Carola, octubre ──');
  await ev(() => { STATE=FIX(); });
  r = await ev(() => {
    CUADRE('Carola Chavez');
    // por el TÍTULO exacto: «🚚 Transporte por cobrar» también dice «por cobrar»
    var f=[].slice.call(document.querySelectorAll('#cua-metrics .mc')).filter(function(e){ var l=e.querySelector('.mc-lbl'); return l && l.textContent.trim()==='Por cobrar'; })[0];
    return { txt:f?f.innerText.replace(/\s+/g,' ').trim():'', toca:!!(f && f.classList.contains('mc-toca')), al:_txt('#cua-alertas') };
  });
  chk('la ficha «Por cobrar» del Cuadre (Bs 5.500,00 · 2 ventas de octubre) se puede tocar', /POR COBRAR Bs 5\.500,00 2 ventas de octubre de 2026/i.test(r.txt) && r.toca, r.txt);
  await page.click('#cua-metrics .mc-toca');
  await page.waitForTimeout(150);
  r = await ev(() => ({ m:_modal(), filas:_filas() }));
  chk('…y abre la lista del Cuadre: los mismos 2 clientes, «Carola Chavez · octubre de 2026 (por la fecha de la venta)»',
      r.m.on && r.filas.length===2 && /Carola Chavez · octubre de 2026 \(por la fecha de la venta\)/.test(r.m.txt), r.m.txt.slice(0,220));
  console.log('\n── 6. «Revisar antes de cerrar» ──');
  r = await ev(() => { closeModal(); CUADRE('Carola Chavez'); var a=cuadreAlertas(cuadrePagos()).filter(function(x){ return x.k==='cobrar'; })[0];
                       return { al:_txt('#cua-alertas'), sev:a&&a.sev, n:a?(a.det||[]).length:0, chips:[].slice.call(document.querySelectorAll('#cua-alertas .cua-chip')).map(function(e){ return e.innerText.trim(); }) }; });
  chk('⚠️ «Revisar antes de cerrar» dice «⏳ 2 ventas con saldo por cobrar — Bs 5.500,00 que todavía no entró»',
      /2 ventas con saldo por cobrar — Bs 5\.500,00 que todavía no entró/.test(r.al), r.al.slice(0,300));
  chk('…en «🔴 Plata en juego», abierto: los nombres a la vista sin tocar nada', r.sev==='plata' && r.chips.some(function(t){ return /^CLIENTE VIEJO · Bs 4\.000,00 · Carola Chavez · 19 d$/.test(t); }), r.chips);
  await page.click('#cua-alertas .cua-chip:has-text("CLIENTE VIEJO")');
  await page.waitForTimeout(150);
  r = await ev(() => ({ m:_modal() }));
  chk('tocar el nombre abre esa venta', r.m.on && /CLIENTE VIEJO/.test(r.m.txt), r.m.txt.slice(0,120));
  r = await ev(() => {
    closeModal();
    var extra=[]; for(var i=0;i<10;i++){ var p=JSON.parse(JSON.stringify(STATE[1])); p.id='x'+i; p.cliente='DEUDOR '+i; p.nota=String(1300+i); p.oc='10-'+(500+i); extra.push(p); }
    STATE=STATE.concat(extra); CUADRE('Carola Chavez');
    var mas=[].slice.call(document.querySelectorAll('#cua-alertas .cua-chip')).filter(function(e){ return /y \d+ más/.test(e.innerText); })[0];
    if(mas) mas.click();
    return { mas:mas?mas.innerText.trim():'', m:_modal(), filas:_filas() };
  });
  chk('con 12 deudores, «… y 4 más ›» abre la lista entera (12 ventas)', /y 4 más/.test(r.mas) && r.m.on && r.filas.length===12, [r.mas, r.filas.length]);

  // ═══ 7. Copiar la lista, y el texto del Cuadre ═══════════════════════════════════════════════════
  console.log('\n── 7. Copiar ──');
  r = await ev(() => {
    STATE=FIX(); CUADRE('Carola Chavez'); window._copiado='';
    copyText=function(t){ window._copiado=t; };
    abrirPorCobrar('cuadre');
    var b=[].slice.call(document.querySelectorAll('#modal-box button')).filter(function(e){ return /Copiar la lista/.test(e.innerText); })[0]; if(b) b.click();
    return { copiado:window._copiado, texto:cuadreTexto() };
  });
  chk('«📋 Copiar la lista» copia el total y cada cliente con su saldo', /Falta cobrar\* · Carola Chavez · octubre de 2026: \*Bs 5\.500,00\* en 2 ventas/.test(r.copiado) && /• CLIENTE VIEJO · nota 1202 · Bs 4\.000,00/.test(r.copiado), r.copiado);
  chk('el texto del Cuadre dice «⏳ Por cobrar» una vez y no lo repite en «🔎 Revisar»',
      /⏳ Por cobrar de lo vendido en el período/.test(r.texto) && !/saldo por cobrar/.test(r.texto), r.texto.slice(-400));

  // ═══ 8. En el celular ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 8. Celular 390 px ──');
  const cel = await (await browser.newContext({ viewport:{ width:390, height:844 }, timezoneId:'America/La_Paz', hasTouch:true, isMobile:true })).newPage();
  cel.on('pageerror', e => errores.push('[cel] '+e.message)); cel.on('dialog', d => d.accept());
  await cel.route(/^https?:/, r => r.abort());
  await cel.clock.setFixedTime(new Date('2026-10-20T11:00:00-04:00'));
  await cel.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await cel.waitForTimeout(350);
  await cel.evaluate(PREPARAR);
  await cel.evaluate(() => { showView('conta'); });
  await cel.waitForTimeout(150);
  await cel.evaluate(() => { STATE=FIX(); VER('Carola Chavez','2026-10'); });
  await cel.tap('#cta-metrics .mc-toca');
  await cel.waitForTimeout(200);
  r = await cel.evaluate(() => ({ on:document.getElementById('modal').classList.contains('on'), ancho:document.documentElement.scrollWidth, vw:window.innerWidth, filas:_filas().length }));
  chk('en 390 px la lista abre con un toque y la página no se corre de costado', r.on && r.filas===2 && r.ancho<=r.vw+1, r);

  chk('sin errores de JavaScript', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e => { console.error('✗ reventó:', e); console.log('\n'+PASS+' bien · '+(FAIL+1)+' mal'); process.exit(1); });
