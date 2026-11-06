/* §4ok-E7 (05/11) LOS SALDOS QUE QUEDARON DE MESES ANTERIORES SE VEN EN EL MES EN CURSO.
   El control del cierre de octubre decía «N ventas con saldo: pasan al mes que viene como falta cobrar», pero en noviembre no salían en
   ningún lado: Contabilidad, el Cuadre y «Para hacer» cuentan solo lo del mes. Con la planilla del 02/11: Maria Bs 6.650 y Bs 5.646,
   Jonathan Bs 2.220.

   LO QUE CUIDA (datos inventados; reloj clavado el jueves 05/11/2026 a las 10:00 de Bolivia):
   1. Ventas (Mes = noviembre, por entrega agendada): lo ya entregado en octubre con saldo sale APARTE «+ Bs 8.500,00 de meses anteriores (3)»
      en la ficha «Falta cobrar»; el número del mes y lo vendido NO cambian.
   2. No entran: lo pagado, una RPT, lo entregado antes de octubre (`SALDO_ANT_DESDE`) ni, por fecha de ingreso, lo cargado en octubre que
      todavía no se entregó. Por fecha de ingreso sí entra lo cargado en octubre y ya entregado en noviembre (no está en la lista del mes).
   3. Con una vendedora elegida, solo las suyas; sin nada del mes, la ficha dice «✅ Nada del mes» y se toca igual.
   4. «Ver quiénes» las muestra en su propia sección «🗓️ De meses anteriores», con nombre, y «📋 Copiar la lista» las trae aparte.
   5. Mirando octubre (un mes que ya pasó) no aparece nada de esto.
   6. El Cuadre (por la fecha de la venta): la ficha «Por cobrar» lo dice aparte y el texto del Cuadre también.
   7. «Para hacer» de la vendedora (Mis pedidos) y de Contabilidad: «Saldo de meses anteriores».
   Se corre:  node tests/test_saldos_anteriores.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  var n=0;
  var V=function(cliente, reg, fecha, total, acuenta, o){
    o=o||{}; n++;
    var saldo=Math.max(0, total-(acuenta||0));
    return { id:'v'+n, oc:o.oc||('10-'+(400+n)), nota:String(1200+n), vendedor:o.vend||'Carola Chavez', cliente:cliente, celular:'7100000'+n,
             fecha:fecha, turno:'AM', productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:total}],
             acuenta:acuenta||0, saldo:saldo, pagado:saldo<0.01, metodoPago:(acuenta?'Efectivo':''), entregado:!!o.ent,
             ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] };
  };
  window.FIX=function(){
    n=0;
    return [
      V('OCT VEINTE',     '2026-10-15', '2026-10-20', 5000, 1000),                 // v1 · anterior: debe 4.000
      V('OCT TREINTAYUNO','2026-10-30', '2026-10-31', 1500,    0),                 // v2 · anterior: debe 1.500
      V('NOV TRES',       '2026-10-29', '2026-11-03', 2000,    0),                 // v3 · entrega nov (ingreso oct, ya entregada)
      V('NOV DIEZ',       '2026-10-28', '2026-11-10',  800,    0),                 // v4 · entrega nov, todavía no salió
      V('SEPTIEMBRE',     '2026-09-10', '2026-09-15',  900,    0),                 // v5 · antes de SALDO_ANT_DESDE: no
      V('OCT PAGADA',     '2026-10-05', '2026-10-10', 3000, 3000),                 // v6 · pagada: no
      V('NOV CUATRO',     '2026-11-02', '2026-11-04',  700,    0),                 // v7 · del mes
      V('MIA PLAZA',      '2026-10-03', '2026-10-06', 9000,    0, { oc:'RPT 10-001' }),   // v8 · RPT: no
      V('DE MARIA',       '2026-10-08', '2026-10-12', 3000,    0, { vend:'Maria Flores' }) // v9 · anterior de Maria
    ];
  };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._ficha=function(box, re){ var f=[].slice.call(document.querySelectorAll(box+' .mc')).filter(function(e){ return re.test(e.innerText); })[0];
    return { txt:f ? f.innerText.replace(/\s+/g,' ').trim() : '', toca:!!(f && f.classList.contains('mc-toca')) }; };
  window.VER=function(vend, mes, base){
    try{ closeModal(); }catch(e){}
    segSet('cta-tab','ventas'); setContaTab('ventas');
    llenarSelectContaVendedor(); var s=document.getElementById('cta-vendedor'); if(s) s.value=vend||'';
    document.getElementById('cta-search').value='';
    document.getElementById('cta-mes').value=mes||'2026-11';
    segSet('cta-mode','mes'); setContaModo('mes');
    segSet('cta-base', base||'entrega'); setContaBase();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(150);
  await ev(() => { STATE=FIX(); });

  /* 1 · Ventas, por entrega agendada, Todos */
  let r = await ev(() => { VER('', '2026-11', 'entrega');
    var A=contaSaldosAnteriores(); return { ids:A.map(function(x){ return x.p.id; }).sort(), falta:_ficha('#cta-metrics', /FALTA COBRAR/i), vend:_ficha('#cta-metrics', /VENDIDO EN EL PER/i), ant:(CX_TOP_M.ant||[]).length }; });
  chk('1 · lo entregado en octubre con saldo: OCT VEINTE, OCT TREINTAYUNO y DE MARIA (v1, v2, v9)', JSON.stringify(r.ids)==='["v1","v2","v9"]', r.ids);
  chk('1 · la ficha «Falta cobrar» sigue con lo del MES (Bs 3.500,00 de 3 ventas) y dice aparte «+ Bs 8.500,00 de meses anteriores (3)»',
      /FALTA COBRAR Bs 3\.500,00 3 ventas con saldo/i.test(r.falta?.txt) && /\+ Bs 8\.500,00 de meses anteriores \(3\)/.test(r.falta?.txt) && r.falta?.toca, r.falta);
  chk('1 · lo vendido del mes no cambia (Bs 3.500,00, 3 ventas)', /Bs 3\.500,00 3 ventas/.test(r.vend?.txt), r.vend?.txt);
  chk('1 · «Para hacer» de Contabilidad lee lo mismo (CX_TOP_M.ant = 3)', r.ant===3, r.ant);

  /* 2 · por fecha de ingreso */
  r = await ev(() => { VER('', '2026-11', 'ingreso'); return contaSaldosAnteriores().map(function(x){ return x.p.id; }).sort(); });
  chk('2 · por ingreso: también NOV TRES (cargada en octubre, entregada el 03/11) y NO «NOV DIEZ» (todavía no salió)', JSON.stringify(r)==='["v1","v2","v3","v9"]', r);
  chk('2 · nunca la pagada, la RPT ni la de septiembre (antes de SALDO_ANT_DESDE)', (r.indexOf?r.indexOf('v6'):0)<0 && (r.indexOf?r.indexOf('v8'):0)<0 && (r.indexOf?r.indexOf('v5'):0)<0, r);

  /* 3 · una vendedora */
  r = await ev(() => { VER('Carola Chavez', '2026-11', 'entrega'); return contaSaldosAnteriores().map(function(x){ return x.p.id; }).sort(); });
  chk('3 · con Carola elegida, solo las suyas (v1, v2)', JSON.stringify(r)==='["v1","v2"]', r);
  r = await ev(() => { VER('Maria Flores', '2026-11', 'entrega'); return _ficha('#cta-metrics', /FALTA COBRAR/i); });
  chk('3 · Maria sin nada del mes: «✅ Nada del mes» + «Bs 3.000,00 de meses anteriores (1)», y se toca', /Nada del mes/.test(r.txt) && /\+ Bs 3\.000,00 de meses anteriores \(1\)/.test(r.txt) && r.toca, r);

  /* 4 · la lista y copiar */
  r = await ev(() => { VER('', '2026-11', 'entrega'); abrirPorCobrar('ventas');
    var m=document.getElementById('modal-box'), sec=m && m.querySelector('.pc-ant');
    window._cop=''; var c0=copyText; copyText=function(t){ window._cop=t; }; copiarPorCobrar('ventas'); copyText=c0;
    return { tit:_txt('#modal-box .modal-h'), sec:sec ? sec.innerText.replace(/\s+/g,' ') : '', filasAnt:sec ? sec.querySelectorAll('.pc-fila').length : 0,
             filasTodas:m ? m.querySelectorAll('.pc-fila').length : 0, cop:window._cop }; });
  chk('4 · «Ver quiénes»: arriba «Falta cobrar · Bs 3.500,00 + Bs 8.500,00 de meses anteriores»', /Falta cobrar · Bs 3\.500,00 \+ Bs 8\.500,00 de meses anteriores/.test(r.tit||''), r.tit);
  chk('4 · …y su sección «🗓️ De meses anteriores · Bs 8.500,00» con las 3, que dice que no son ventas de noviembre', /De meses anteriores · Bs 8\.500,00/.test(r.sec||'') && r.filasAnt===3 && /no son ventas de noviembre/.test(r.sec||'') && /OCT VEINTE/.test(r.sec||'') && /DE MARIA/.test(r.sec||''), r);
  chk('4 · la lista del mes sigue con sus 3 (6 filas en total)', r.filasTodas===6, r.filasTodas);
  chk('4 · «📋 Copiar la lista» las trae aparte', /De meses anteriores\* \(ya entregadas, aparte\): \*Bs 8\.500,00\* en 3 ventas/.test(r.cop||'') && /OCT TREINTAYUNO/.test(r.cop||''), String(r.cop).slice(-300));
  r = await ev(() => { closeModal(); VER('', '2026-10', 'entrega'); return { n:contaSaldosAnteriores().length, falta:_ficha('#cta-metrics', /FALTA COBRAR/i).txt }; });
  chk('5 · mirando octubre no aparece nada de meses anteriores', r.n===0 && !/meses anteriores/.test(r.falta||''), r);

  /* 6 · el Cuadre */
  r = await ev(() => {
    segSet('cta-tab','cuadre'); setContaTab('cuadre');
    var s=document.getElementById('cua-vendedor'); if(s) s.value='';
    document.getElementById('cua-mes').value='2026-11'; segSet('cua-mode','mes'); setCuadreModo('mes'); renderCuadre();
    return { ids:cuadreSaldosAnteriores().map(function(x){ return x.p.id; }).sort(), ficha:_ficha('#view-conta', /^\s*POR COBRAR/i), txt:cuadreTexto() }; });
  chk('6 · el Cuadre (por la fecha de la venta): v1, v2, v3 y v9', JSON.stringify(r.ids)==='["v1","v2","v3","v9"]', r.ids);
  chk('6 · la ficha «Por cobrar» lo dice aparte (+ Bs 10.500,00 de meses anteriores (4))', /\+ Bs 10\.500,00 de meses anteriores \(4\)/.test(r.ficha?.txt) && r.ficha?.toca, r.ficha);
  chk('6 · el texto del Cuadre: «🗓️ Y de meses anteriores (ya entregadas, aparte): *Bs 10.500,00* en 4 ventas»', /Y de meses anteriores \(ya entregadas, aparte\): \*Bs 10\.500,00\* en 4 ventas/.test(r.txt), (r.txt||'').slice(-400));

  /* 7 · «Para hacer» de la vendedora */
  r = await ev(() => { var f=function(v){ var mine=STATE.filter(function(p){ return mismoVendedor(p.vendedor, v); }); var I=misHacerDatos(v, mine); return I.filter(function(o){ return o.ic==='🗓️'; }).map(function(o){ return o.n+'|'+o.t+'|'+o.s; })[0]||''; };
    var c=f('Carola Chavez'), m=f('Maria Flores'); misVerLista('saldoAnt'); var lista=_txt('#modal-box'); closeModal(); return { c:c, m:m, lista:lista }; });
  chk('7 · Mis pedidos de Carola: «Saldo de meses anteriores» con 2 (Bs 5.500,00)', /^2\|Saldo de meses anteriores\|Bs 5\.500,00/.test(r.c), r.c);
  chk('7 · …y el de Maria con 1 (Bs 3.000,00), con su lista', /^1\|Saldo de meses anteriores\|Bs 3\.000,00/.test(r.m) && /DE MARIA/.test(r.lista), r);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
