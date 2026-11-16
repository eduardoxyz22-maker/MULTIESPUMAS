/* 🎨 MEJORAS 418-424, 427 y 428 (16/11/2026; dueño: «todas menos la 403») — lo que se ve en Contabilidad: Ventas, Cuadre y Cobranza.
   SOLO DIBUJO: ninguna cuenta cambia y los textos que se copian o se bajan tampoco.

   LO QUE ESTA PRUEBA CUIDA
   418 · «Para hacer» con cuánto va hecho: «N de M ya tienen su N°», «N de M pagadas», «N de M pagos completos», con la barrita; el número
         grande de lo que falta, igual.
   419 · La tabla de Ventas: cada fila con la franja de su estado (`cxEstadoVenta`, la de las tarjetas) y la pastilla «✅ Pagada» /
         «⏳ Debe Bs …» debajo del N° de nota; las celdas de siempre siguen ahí.
   420 · Los filtros en dos renglones («Estado» y «Cómo pagaron»), las MISMAS fichas y sus números, «Con saldo · Bs …», «A cuenta …
         · recargos …» a la derecha; la línea gris (#cta-resumen) se sigue armando, escondida; tocar una ficha sigue filtrando.
   421 · El semáforo adentro de la tabla del cierre: luz por forma (verde cuadra, rojo con diferencia, ámbar falta contar), «Diferencia ·
         estado», las tres pastillas arriba, el semáforo de antes escondido (pero armado) y tocar la fila lleva al campo.
   422 · El detalle de los pagos con un renglón por día: el día, cuántos pagos, el total y cómo entró (suma de las filas de ese día).
   423 · «Falta cobrar» con la columna «Pagado» (venta − saldo): «nada» en rojo, «N %»; y en Cobranza → «Lo que va a entrar».
   424 · Mayoristas → Por cliente: el borde de arriba rojo si hay vencido, la barra partida y los dos montos («—» si es cero).
   427 · Los ceros en gris: en una celda de tabla, «Bs 0,00» se ve como una rayita (::after) pero el TEXTO no cambia.
   428 · Cuadre: «Por cobrar» pegada al costado al bajar (sticky, con las dos columnas).
   Y sin las banderas, todo como antes.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026 10:00 de Bolivia.
   Se corre:  node tests/test_v418_conta.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const BANDERAS = ['CX_TOP_PRUEBA','CX_AVANCE_PRUEBA','CTA_ESTADO_PRUEBA','CX_CHIPS2_PRUEBA','SEM_TABLA_PRUEBA','CUA_DIA_PRUEBA','PC_BARRA_PRUEBA','CBZ_BARRA_PRUEBA','CERO_GRIS_PRUEBA','PLATA_PRUEBA','CUA_PEGADO_PRUEBA'];

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  try{ localStorage.removeItem('me_cx_dup_ok'); localStorage.removeItem('me_cx_tabla'); }catch(e){}
  var n=0, L=function(a){ return textoCobros(a); };
  var V=function(vend, reg, fecha, bs, o){
    o=o||{}; n++;
    var prods=o.prods||[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:bs}];
    if(o.doc){ prods[0].fdoc=o.doc; prods[0].fdocn=String(500+n); }
    return { id:'c'+n, oc:o.oc||('11-'+(300+n)), nota:o.nota||String(800+n), vendedor:vend, cliente:o.cliente||('CLIENTE C'+n), fecha:fecha, turno:fecha?'AM':'',
             productos:prods, saldo:o.saldo!=null?o.saldo:0, acuenta:o.acuenta||0, pagado:!!o.pagado,
             metodoPago:o.met||'', entregado:!!o.ent, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[], chofer:'', vehiculo:'' };
  };
  window.FIX=function(){
    n=0;
    return [
      // c1 pagada en efectivo, con factura, ya en el sistema
      V('Mauricio Merida','2026-11-03','2026-11-05',5000,{ pagado:true, doc:'F', met:L([{metodo:'Efectivo',monto:5000,fecha:'2026-11-03',nota:'801',comps:['F1']}])+' · REGISTRADO' }),
      // c2 pagada con QR BISA, con remisión
      V('Juan Pablo Paredes','2026-11-04','2026-11-06',3000,{ pagado:true, doc:'R', met:L([{metodo:'QR',banco:'BISA',monto:3000,fecha:'2026-11-04',nota:'802',comps:['F2']}]) }),
      // c3 con saldo: 1.000 a cuenta, debe 2.000 (sin factura)
      V('Maria Flores','2026-11-05','2026-11-15',3000,{ saldo:2000, acuenta:1000, ent:true, met:L([{metodo:'Efectivo',monto:1000,fecha:'2026-11-05',nota:'803',comps:['F3'],anticipo:true}]) }),
      // c4 no pagó nada (sin factura)
      V('Isabel Robledo','2026-11-05','2026-11-14',1500,{ saldo:1500, ent:true }),
      // c5 pagada con tarjeta el 05/11, pago SIN recibo (un pago sin terminar)
      V('Carola Chavez','2026-11-05','2026-11-20',2000,{ pagado:true, doc:'F', met:L([{metodo:'Tarjeta',monto:2000,fecha:'2026-11-05',nota:'',comps:['F5']}]) }),
      // cargada en OCTUBRE para entregar el 25/11, con 1.500 a cuenta: no es de las ventas de noviembre, sí de «Lo que va a entrar»
      V('Carola Chavez','2026-10-20','2026-11-25',4000,{ saldo:2500, acuenta:1500, met:L([{metodo:'Efectivo',monto:1500,fecha:'2026-10-20',nota:'810',comps:['F9'],anticipo:true}]) }),
      // mayoristas (Eduardo): Multicenter vencido (a 60 días) y otro por vencer
      V('Eduardo Añez','2026-08-08','2026-08-10',2000,{ cliente:'MULTICENTER', saldo:2000, nota:'30791', oc:'08-050' }),
      V('Eduardo Añez','2026-11-02','2026-11-03',1500,{ cliente:'MULTICENTER', saldo:1500, nota:'33100', oc:'11-300' })
    ];
  };
  window._txt=function(sel){ var e=typeof sel==='string' ? document.querySelector(sel) : sel; return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window.VER=function(){
    closeModal(); segSet('cta-tab','ventas'); setContaTab('ventas');
    var s=document.getElementById('cta-vendedor'); llenarSelectContaVendedor(); if(s) s.value='';
    document.getElementById('cta-search').value=''; document.getElementById('cta-mes').value='2026-11';
    segSet('cta-mode','mes'); setContaModo('mes'); segSet('cta-base','ingreso'); setContaBase();
  };
  window.CUADRE=function(){
    closeModal(); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    document.getElementById('cua-mes').value='2026-11'; var s=document.getElementById('cua-vendedor'); if(s) s.value='';
    segSet('cua-mode','mes'); setCuadreModo('mes');
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, banderas){
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    if(banderas) await page.evaluate((bs)=>{ bs.forEach(function(b){ window[b]=1; }); }, banderas);
    await page.evaluate(()=>{ UNLOCKED=true; showView('conta'); }); await page.waitForTimeout(150);
    await page.evaluate(()=>{ STATE=FIX(); });
    page._ctx=ctx; return page;
  }
  const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  /* ── sin las banderas: como antes ── */
  console.log('\n── 0. Sin las banderas, todo como antes ──');
  let page = await abrir(1366, ['CX_TOP_PRUEBA']);
  let r = await ev(page, async () => {
    VER(); await new Promise(function(res){ setTimeout(res, 80); });
    var o={ av:document.querySelectorAll('.m418').length, est:document.querySelectorAll('#tbl-conta tr.m419, .m419-st').length, chips2:document.querySelectorAll('.m420-row').length,
            resumen:document.getElementById('cta-resumen').offsetHeight>0 };
    CUADRE(); await new Promise(function(res){ setTimeout(res, 80); });
    o.sem=document.getElementById('cx-semaforo').offsetHeight>0; o.m421=document.querySelectorAll('.m421-est, .m421-res').length; o.m422=document.querySelectorAll('tr.m422-dia').length;
    o.m428=getComputedStyle(document.getElementById('cua-pendientes')).position; o.cero=document.querySelectorAll('.m427-c, .m427-g').length;
    abrirPorCobrar('ventas'); o.m423=document.querySelectorAll('.m423').length; closeModal();
    return o; });
  chk('0a. sin banderas: ni barritas, ni franjas, ni filtros en dos renglones, la línea gris a la vista', r.av===0 && r.est===0 && r.chips2===0 && r.resumen, r);
  chk('0b. sin banderas: el semáforo a la vista, la tabla del cierre sin luces, el detalle sin días, sin ceros grises, «Por cobrar» sin pegar', r.sem && r.m421===0 && r.m422===0 && r.m423===0 && r.cero===0 && r.m428!=='sticky', r);
  await page._ctx.close();

  page = await abrir(1366, BANDERAS);

  /* ── 418 ── */
  console.log('\n── 418. «Para hacer» con cuánto va hecho ──');
  r = await ev(page, async () => {
    VER(); await new Promise(function(res){ setTimeout(res, 80); });
    var it={}; [].forEach.call(document.querySelectorAll('#cx-top .ah-it'), function(x){ var b=x.querySelector('.ah-tx b').textContent; it[b]={ n:x.querySelector('.ah-n').textContent, av:_txt(x.querySelector('.m418')), w:(x.querySelector('.m418-b i')||{style:{}}).style.width }; });
    var list=contaLista();
    return { it:it, req:list.filter(docVentaRequerida).length, sdoc:list.filter(docVentaFalta).length, pag:list.filter(function(p){ return p.pagado; }).length, tot:list.length, pst:nxPstLista().length };
  });
  const it=(re)=>{ const k=Object.keys(r.it||{}).find(x=>re.test(x)); return k ? r.it[k] : {}; };
  const doc=it(/factura o nota/), deb=it(/Ventas con saldo/), pst=it(/Pagos sin terminar/);
  chk('418a. «Sin N° de factura…»: el número de lo que falta igual y debajo «N de M ya tienen su N° · %»', doc.n===String(r.sdoc) && doc.av===((r.req-r.sdoc)+' de '+r.req+' ya tienen su N° · '+Math.round((r.req-r.sdoc)/r.req*100)+' %'), [doc, r.req, r.sdoc]);
  chk('418b. «Ventas con saldo»: «N de M pagadas» (la ficha «Pagadas» contra todas)', deb.av===(r.pag+' de '+r.tot+' pagadas · '+Math.round(r.pag/r.tot*100)+' %'), [deb, r.pag, r.tot]);
  chk('418c. «Pagos sin terminar»: «N de M pagos completos» (los pagos del mes de nxPstLista)', /^\d+ de \d+ pagos completos · \d+ %$/.test(pst.av||'') && pst.n===String(r.pst) && pst.av.indexOf((4-r.pst)+' de 4 pagos completos')===0, [pst, r.pst]);
  chk('418d. la barrita mide lo hecho', doc.w===Math.round((r.req-r.sdoc)/r.req*100)+'%', doc.w);

  /* ── 419 ── */
  console.log('\n── 419. Si pagó o debe, en cada fila ──');
  r = await ev(page, () => {
    var out={}; [].forEach.call(document.querySelectorAll('#tbl-conta tbody tr'), function(tr){ var m=(tr.getAttribute('onclick')||'').match(/'(c\d+)'/); if(!m) return;
      var p=STATE.filter(function(x){ return x.id===m[1]; })[0], e=cxEstadoVenta(p);
      out[m[1]]={ cls:tr.className, pill:_txt(tr.querySelector('.m419-st')), esp:e, franja:getComputedStyle(tr.cells[0]).boxShadow, celdas:tr.cells.length, nota:_txt(tr.cells[2]) }; });
    return out;
  });
  chk('419a. cada fila con la clase y la pastilla de su estado (la de las tarjetas)', Object.keys(r).length>=5 && Object.keys(r).every(function(k){ return r[k].cls==='m419 '+r[k].esp.cls && r[k].pill===r[k].esp.txt; }), r);
  chk('419b. la pagada «✅ Pagada» con franja verde; la que debe «⏳ Debe Bs 2.000,00» con franja ámbar', r.c1 && r.c1.pill==='✅ Pagada' && /34, 160, 107/.test(r.c1.franja) && r.c3 && r.c3.pill==='⏳ Debe Bs 2.000,00' && /217, 119, 6/.test(r.c3.franja), [r.c1, r.c3]);
  chk('419c. las celdas de siempre siguen (14 columnas, la nota y la OC)', r.c1 && r.c1.celdas===14 && /^801 /.test(r.c1.nota), r.c1);

  /* ── 420 ── */
  console.log('\n── 420. Los filtros en dos renglones ──');
  r = await ev(page, async () => {
    var rows=[].map.call(document.querySelectorAll('#cx-chips .m420-row'), function(x){ return { lb:_txt(x.querySelector('.m420-lb')), chips:[].map.call(x.querySelectorAll('.cx-chip'), function(c){ return _txt(c); }), tot:_txt(x.querySelector('.m420-tot')) }; });
    var o={ rows:rows, resumenOculto:document.getElementById('cta-resumen').offsetHeight===0, resumenArmado:document.getElementById('cta-resumen').textContent.length>20 };
    var b=[].filter.call(document.querySelectorAll('#cx-chips .cx-chip'), function(c){ return /Con saldo/.test(c.textContent); })[0];
    if(b){ b.click(); await new Promise(function(res){ setTimeout(res, 50); }); o.filtro=CX_FILTRO && CX_FILTRO.k; o.filas=document.querySelectorAll('#tbl-conta tbody tr[onclick]').length; cxFiltro(null); }
    return o;
  });
  const est=r.rows[0]||{}, met=r.rows[1]||{};
  chk('420a. «Estado» y «Cómo pagaron», cada uno en su renglón', est.lb==='ESTADO' || est.lb==='Estado', r.rows);
  chk('420b. en Estado las fichas de siempre con su número («Todas 5», «Con saldo 2 · Bs 3.500»)', est.chips && est.chips[0]==='📋 Todas 5' && est.chips.some(function(c){ return c==='⏳ Con saldo 2 · Bs 3.500'; }), est.chips);
  chk('420c. en Cómo pagaron, los métodos (Efectivo, QR BISA, Tarjeta) y a la derecha «A cuenta Bs 1.000»', met.chips && met.chips.some(function(c){ return /Efectivo 2/.test(c); }) && met.chips.some(function(c){ return /QR BISA 1/.test(c); }) && /A cuenta Bs 1\.000/.test(met.tot), met);
  chk('420d. la línea gris se sigue armando, escondida', r.resumenOculto && r.resumenArmado, r);
  chk('420e. tocar «Con saldo» sigue filtrando la tabla (2 filas)', r.filtro==='debe' && r.filas===2, r);

  /* ── 421, 422, 427, 428 ── */
  console.log('\n── 421. El semáforo adentro de la tabla del cierre ──');
  r = await ev(page, async () => {
    CUADRE(); await new Promise(function(res){ setTimeout(res, 80); });
    setCuadreArqueo('Efectivo', '6000'); await new Promise(function(res){ setTimeout(res, 200); });
    setCuadreArqueo('QR BISA', '2800'); await new Promise(function(res){ setTimeout(res, 300); });
    var box=document.querySelector('#cua-cierre .cua-box'), filas={};
    [].forEach.call(box.querySelectorAll('tbody tr[data-forma]'), function(tr){ filas[tr.getAttribute('data-forma')]={ cls:tr.className, est:_txt(tr.querySelector('.m421-est')) }; });
    var th=[].map.call(box.querySelectorAll('thead th'), function(t){ return t.textContent; });
    return { filas:filas, th:th[th.length-1], res:_txt(box.querySelector('.m421-res')), tit:_txt(box.querySelector('.cua-t')),
             semOculto:document.getElementById('cx-semaforo').offsetHeight===0, semArmado:document.querySelectorAll('#cx-semaforo .cx-fp').length };
  });
  chk('421a. Efectivo cuadra (verde), QR BISA con diferencia (rojo), Tarjeta falta contar (ámbar)', r.filas.Efectivo && r.filas.Efectivo.cls==='m421-ok' && /✅ cuadra/.test(r.filas.Efectivo.est) &&
      r.filas['QR BISA'] && r.filas['QR BISA'].cls==='m421-mal' && /falta Bs 200/.test(r.filas['QR BISA'].est) && r.filas.Tarjeta && r.filas.Tarjeta.cls==='m421-pend' && r.filas.Tarjeta.est==='✍️ falta contar', r.filas);
  chk('421b. «Diferencia · estado» y arriba «✅ 1 cuadra · ⚠️ 1 con diferencia · ✍️ 1 falta contar»', r.th==='Diferencia · estado' && /✅ 1 cuadra/.test(r.res) && /⚠️ 1 con diferencia/.test(r.res) && /✍️ 1 falta contar/.test(r.res) && /^🚦/.test(r.tit), r);
  chk('421c. el semáforo de antes se sigue armando, escondido', r.semOculto && r.semArmado===3, r);
  r = await ev(page, async () => {
    var tr=document.querySelector('#cua-cierre tbody tr[data-forma="Tarjeta"]'); tr.cells[0].click(); await new Promise(function(res){ setTimeout(res, 120); });
    var a=document.activeElement; return { foco:a && a.classList.contains('cua-arqueo') ? a.getAttribute('data-forma') : (a ? a.tagName : '') };
  });
  chk('421d. tocar la fila lleva al campo de lo contado', r.foco==='Tarjeta', r);

  console.log('\n── 422. El detalle de los pagos, día por día ──');
  r = await ev(page, () => {
    var trs=[].slice.call(document.querySelectorAll('#cua-detalle tbody tr')), dias=[], cur=null;
    trs.forEach(function(tr){ if(tr.classList.contains('m422-dia')){ cur={ t:_txt(tr), n:0, suma:0 }; dias.push(cur); } else if(cur){ cur.n++; cur.suma+=parseMonto(tr.cells[6].textContent.replace('Bs','').trim()); } });
    return { dias:dias, cols:trs[0] ? [].reduce.call(trs[0].cells, function(s,c){ return s+(c.colSpan||1); }, 0) : 0 };
  });
  const d05=(r.dias||[]).find(x=>/05\/11/.test(x.t))||{};
  chk('422a. un renglón por día antes de sus pagos (9 columnas, como la tabla)', r.dias.length>=3 && r.cols===9 && r.dias.every(function(d){ return d.n>0; }), r);
  chk('422b. el jueves 05/11: «📅 Jueves 05/11», cómo entró, «2 pagos» y el total = la suma de sus filas', /^📅 Jueves 05\/11/.test(d05.t) && /💳 Tarjeta Bs 2\.000/.test(d05.t) && /💵 Efectivo Bs 1\.000/.test(d05.t) && /2 pagos/.test(d05.t) && d05.suma===3000 && /Bs 3\.000/.test(d05.t), d05);

  console.log('\n── 427. Los ceros en gris (el texto no cambia) ──');
  r = await ev(page, () => {
    var c=document.querySelectorAll('#cta-pane-cuadre .m427-c'), x=c[0], td=x && x.closest('td');
    return { n:c.length, txt:x ? x.textContent.replace(/\s+/g,' ').trim() : '', tdTxt:td ? td.innerText.replace(/\s+/g,' ').trim() : '', after:x ? getComputedStyle(x, '::after').content : '', fs:x ? getComputedStyle(x).fontSize : '',
             guion:document.querySelectorAll('#cta-pane-cuadre td.m427-g').length, fichas:document.querySelectorAll('#cua-metrics .m427-c, #cx-semaforo .m427-c').length };
  });
  chk('427a. un «Bs 0,00» de una celda se VE como «—» (::after) y el texto sigue siendo «Bs 0,00»', r.n>0 && /^Bs 0(,00)?$/.test(r.txt) && /Bs 0/.test(r.tdTxt) && r.after==='"—"' && r.fs==='0px', r);
  chk('427b. las «—» que ya había, en el mismo gris; las fichas grandes no se tocan', r.guion>0 && r.fichas===0, r);

  console.log('\n── 428. «Por cobrar» acompaña al bajar ──');
  r = await ev(page, async () => {
    var pe=document.getElementById('cua-pendientes'), al=document.getElementById('cua-alertas');
    return { pos:getComputedStyle(pe).position, top:getComputedStyle(pe).top, alinea:getComputedStyle(pe.parentNode).alignItems };
  });
  chk('428a. con dos columnas, «Por cobrar» es sticky debajo del encabezado y la grilla alinea arriba', r.pos==='sticky' && r.alinea==='start' && parseFloat(r.top)>=12, r);

  /* ── 423 ── */
  console.log('\n── 423. Falta cobrar: lo que ya pagó ──');
  r = await ev(page, async () => {
    VER(); await new Promise(function(res){ setTimeout(res, 60); });
    abrirPorCobrar('ventas');
    var th=[].map.call(document.querySelectorAll('#pc-lista table.mini thead th'), function(t){ return t.textContent; });
    var filas={}; [].forEach.call(document.querySelectorAll('#pc-lista tr.pc-fila'), function(tr){ filas[tr.getAttribute('data-id')]={ p:_txt(tr.querySelector('.m423')), cero:!!tr.querySelector('.m423.cero'), w:(tr.querySelector('.m423-b i')||{style:{}}).style.width, n:tr.cells.length }; });
    closeModal(); return { th:th, filas:filas };
  });
  chk('423a. la columna «Pagado» entre «Venta» y «Saldo»', JSON.stringify(r.th)===JSON.stringify(['Cliente','Vendedor','Desde','Venta','Pagado','Saldo']), r.th);
  chk('423b. pagó 1.000 de 3.000 → «33 %»; no pagó nada → «nada» en rojo', r.filas.c3 && r.filas.c3.p==='33 %' && r.filas.c3.w==='33%' && r.filas.c4 && r.filas.c4.p==='nada' && r.filas.c4.cero, r.filas);
  r = await ev(page, async () => {
    cbzAbrir(); await new Promise(function(res){ setTimeout(res, 60); }); try{ cbzTab('ent'); }catch(e){}
    var t=[].map.call(document.querySelectorAll('#cbz .cbz-t tbody tr'), function(tr){ return _txt(tr.querySelector('.m423')); });
    closeModal(); return { t:t };
  });
  chk('423c. en Cobranza → «Lo que va a entrar», debajo de «Ya cobrado» la misma barrita', r.t.length>0 && r.t.every(function(x){ return /^(nada|\d+ %)$/.test(x); }), r);

  /* ── 424 ── */
  console.log('\n── 424. Mayoristas: la barra roja y verde ──');
  r = await ev(page, async () => {
    closeModal(); segSet('cta-tab','mayor'); setContaTab('mayor'); await new Promise(function(res){ setTimeout(res, 60); });
    cbzAbrir(); await new Promise(function(res){ setTimeout(res, 60); }); try{ cbzTab('cli'); }catch(e){}
    var c=document.querySelector('#cbz .cbz-cli[data-k="Multicenter"]'), D=cbzMayDatos().filter(function(x){ return x.k==='Multicenter'; })[0]||{};
    var o={ hay:!!c, cls:c ? c.className : '', l:c ? _txt(c.querySelector('.m424-l')) : '', wv:c ? c.querySelector('.m424-b i.v').style.width : '', wp:c ? c.querySelector('.m424-b i.p').style.width : '',
            cajitasOcultas:c ? c.querySelector('.cbz-cts').offsetHeight===0 : false, borde:c ? getComputedStyle(c, '::before').backgroundColor : '', venc:D.venc, pv:D.pv };
    closeModal(); return o;
  });
  chk('424a. Multicenter con vencido: borde rojo y la barra partida con los montos de cbzMayDatos', r.hay && /m424 m424-v/.test(r.cls) && r.borde==='rgb(220, 38, 38)' &&
      r.l.indexOf('VENCIDO Bs '+Math.round(r.venc).toLocaleString('es-BO'))===0 && r.l.indexOf('POR VENCER Bs '+Math.round(r.pv).toLocaleString('es-BO'))>0, r);
  chk('424b. las cajitas de antes quedan escondidas y la barra mide lo vencido contra lo por vencer', r.cajitasOcultas && Math.abs(parseFloat(r.wv)-r.venc/(r.venc+r.pv)*100)<0.1, r);

  /* ── Las cuentas no cambian: las fichas de Ventas con y sin banderas ── */
  console.log('\n── Nada cambia en las cuentas ──');
  r = await ev(page, async (bs) => {
    closeModal(); VER(); await new Promise(function(res){ setTimeout(res, 60); });
    var con=document.getElementById('cta-resumen').textContent, fc=[].map.call(document.querySelectorAll('#cta-metrics .mc'), function(e){ return e.textContent; }).join('|');
    bs.forEach(function(b){ if(b!=='CX_TOP_PRUEBA') window[b]=0; }); VER(); await new Promise(function(res){ setTimeout(res, 60); });
    var sin=document.getElementById('cta-resumen').textContent, fs=[].map.call(document.querySelectorAll('#cta-metrics .mc'), function(e){ return e.textContent; }).join('|');
    return { igual:con===sin && fc===fs && fc.length>20, con:con.slice(0,200) };
  }, BANDERAS);
  chk('la línea gris (y sus números) es la misma con y sin las mejoras', r && r.igual, r);

  await page._ctx.close();
  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
