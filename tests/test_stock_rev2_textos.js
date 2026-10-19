/* ✏️ TEXTOS Y PANTALLA DE STOCK (18/10, §4ls — revisión 2, prioridad 2: «una sola palabra por concepto», sin cambiar ninguna cuenta).

   LO QUE ESTA PRUEBA CUIDA (las «TX» fallan contra la página de antes, `084071b`; los «control» pasan en las dos):
   TX1  VV2   «Pedí N · traé M» igual en todas las vistas: la cinta, la ficha, la tabla, el chip «🚚 Traer» del Plan y el galpón Moreno
              cuentan lo que se trae JUNTO con un pedido a fábrica (como «📋 Copiar el pedido»).
   TX2  VV4   La copia de «Qué producir» dice «— hay N (PTF a · Banzer b · Moreno c)»: lo en camino va aparte, no adentro de «hay».
   TX3  VV5   «⛔ Ya falta para lo vendido» solo si lo que llega NO lo cubre a tiempo; si lo cubre, «🚚 Lo vendido lo cubre lo que llega el…».
   TX4  VV6   Sin ritmo de 15 días pero con el del mes: «Se corta en ~N días, al ritmo del mes», la MISMA cuenta de «Cubre hasta».
   TX5  VV7   «🚚 Ya pedido»: «Confirmar la llegada: hay un faltante antes de recibir» solo si es cierto; si no, «Con lo pedido alcanza hasta…».
   TX6  VV8   La columna «En camino» nunca dice «llegan ~» con una fecha que ya pasó: lo atrasado va aparte («⚠️ … atrasados: reclamar»).
   TX7  VV9   «⚠️ Revisar saldo · pedí 3 · traé 1 de Moreno» y «Reposición calculada: fabricar 3 + traer 1», nunca «reposición 4».
   TX8  VV10  «✅ Alcanza esta semana · el plan pide N en 15 días» cuando el plan pide para 15 días o el mes.
   TX9  H4    Con 0 en PTF, Banzer y Moreno, nada vendido y nada en el plan: «📦 Sin stock: se fabrica a pedido», nunca «✅ Alcanza».
   TX10 Mes-VM5/VM10  El Plan dice «15 días · incluye los 7» y «<mes> · además de 15 días»; el gráfico «(producir, además de 15 días)».
   TX11 VV12/VF8  El cartel «No es el Excel del día» nombra PTF; el domingo dice «Falta el del sáb…» (no «Subí el de hoy») y el cuadrito
              no dice «el de del».
   TX12 VF6   «MORENO: medido N … · lo que se pide hoy se entrega desde el …»: lo medido y la regla de las 48 h, por separado.
   TX13 VF5   «Se corta» nunca cae en domingo o feriado: el primer día con entregas que queda corto (el lunes).
   TX14 VF4/Man-VM10  «🚚 Programar recogida» un sábado propone el lunes y no acepta el domingo; una recogida guardada para el domingo
              llega el lunes; «🚚 Recogida programada» (no «🚚 Ya pedido»).
   TX15 V-REV-4/5/8/9  La ventana de «Aplicar» tiene las MISMAS cajas que el cuadro fijo (sin respaldo, 💡, «📥 almacén mal»); lo marcado
              📥 entra en «📥 Hay que ir a buscar»; la Lista de carga avisa «⚠️ sin stock detrás»; «y N más» en las listas cortadas.
   TX16 Cie-C4/C6/C7  El GPS no dice «volvió sin pararse ahí» con un pin aproximado; la ayuda ya no dice «vienen tildados»; «Hoy PM»
              no se ofrece a las 17:00 sin dato del camión (sí a las 11:00, o con el GPS diciendo que todavía no salió).
   TX17 VB-4/6/7/8/9  «Más vistas» se arma al abrirlo; la barra del celular entra; «↩️ Deshacer» después de «Ya pedí»; contraste;
              «📋 Copiar lo vendido que falta»; Escape cierra el cartel final de «Aplicar»; la ✕ de una recogida dice «recogida».
   TX18 Man-VM7/VM9/VM10  El segundo «Ya pedí N más» del día se anota; desmarcar 🏭 limpia «En producción»; «más» solo con un «Ya pedí»
              vigente; el vencido parcial dice cuánto llegó.
   TX19 BP3/BP4/BP6  «de lo vendido (no se reparte)»; barrios con la misma zona escrita de dos formas se juntan y «POR CONFIRMAR» no es
              barrio; el plan de Banzer o PTF dice que es de movimientos (sin las palabras pedir/producir/fabricar).
   TX20 T4    «Qué va a pedir cada tienda»: lo que no llegó no es «recibió»; en una RPT la pregunta dice «la sucursal espera».
   TX21 VI-2/VI-7/VI-9  El «49» con 105x190 avisa «el de 105x190 es CH1159»; «ECOFLEX» propone el NUEVO ECO FLEX; el histórico con
              medida «OTROS» va a la medida del nombre.

   Reloj CLAVADO (cada parte dice a qué hora). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_rev2_textos.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_084071b.html node tests/test_stock_rev2_textos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  window._saves=0;
  apiSave=function(rec){ window._saves++; return Promise.resolve({ ok:true, pedido:rec }); };
  apiGeocode=function(links){ return Promise.resolve({ ok:true, geo:links.map(function(u){ return { link:u, lat:null, lng:null }; }) }); };
  window._toasts=[]; var _t0=toast; toast=function(m){ window._toasts.push(String(m)); try{ _t0.apply(null, arguments); }catch(e){} };
  window._confirms=[]; window.confirm=function(m){ window._confirms.push(String(m)); return true; };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='01-05-025  Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._ts=function(f, h){ return new Date(f+'T'+(h||'09:00:00')+'-04:00').getTime(); };
  window._d=function(n){ return stockSumarDias(todayStr(), n); };
  window._stock=function(fn, opt){
    opt=opt||{}; var f=opt.f||todayStr(), hora=opt.hora||'10:05:32', t=_ts(f, '10:10:00');
    var st={ v:2, pv:3, c:{ f:opt.fPtf||f, hora:hora, u:{}, solo0:true, alm:_LOG, cod:{}, t:t }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:opt.fBz||f, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.g[_IM]={ f:opt.fIm||f, hora:hora, u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(fn) fn(st);
    return st;
  };
  var n=0;
  window._ped=function(o){ n++; var f=(o && o.fecha!=null) ? o.fecha : _d(-3);
    return Object.assign({ id:'r'+n, oc:'10-'+(100+n), fecha:f, turno:'AM', cliente:'CLIENTE '+n, vendedor:'Maria Flores', celular:'70000000', zona:'',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:(f && f<=todayStr()) ? _ts(f) : Date.now(), entregado:false, productos:[] }, o); };
  window._lin=function(cod, d, m, cant, extra){ return Object.assign({ codigo:cod, desc:d, medida:m, cant:cant }, extra||{}); };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; stockOlvidarIndice();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._txt=function(el){ return el ? String(el.textContent||'').replace(/\s+/g,' ') : ''; };
  window._copia=function(fn){ var out='', _cp=copyText; copyText=function(t){ out=t; }; try{ fn(); } finally { copyText=_cp; } return out; };
  /* Un producto de la lista con algunos campos cambiados, para leer cómo lo DICE la tabla (la cuenta no se toca). */
  window._conFila=function(k, cambios, fn){
    var _sd=stockData;
    stockData=function(){ var d=_sd.apply(null, arguments); d.lista.forEach(function(o){ if(o.k===k) Object.assign(o, cambios); }); return d; };
    try{ return fn(); } finally { stockData=_sd; }
  };
  // El escenario de casi todo el archivo (TITANIO ICE en cinco medidas).
  window._base=async function(){
    var KT=_k('CH1201','TITANIO ICE','160x190'), KO=_k('CH1220','TITANIO ICE','140x190'), KA=_k('CH1221','TITANIO ICE','180x190'), KB=_k('CH1222','TITANIO ICE','200x200');
    var st=_stock(function(st){ st.c.u[KT]=0; st.c.u[KO]=0; st.c.u[KA]=0; st.c.u[KB]=0; st.g[_IM].u[KT]=1; st.g[_IM].u[KB]=2; st.g[_BZ].u[KA]=1; });
    var P=[
      _ped({ id:'pT', fecha:_d(1), productos:[_lin('CH1201','TITANIO ICE','160x190',4)] }),                                       // 4 vendidos, 1 en Moreno → pedí 3 · traé 1
      _ped({ id:'pO', fecha:todayStr(), vehiculo:'Foton nuevo', chofer:'Luis Pierre', productos:[_lin('CH1220','TITANIO ICE','140x190',1,{ chk:'ok' })] }),   // ✔ sin stock detrás
      _ped({ id:'pA', fecha:_d(2), productos:[_lin('CH1221','TITANIO ICE','180x190',1,{ chk:'im', chkDe:'' })] }),               // dice IM, está en Banzer
      _ped({ id:'pB', fecha:_d(3), productos:[_lin('CH1222','TITANIO ICE','200x200',1,{ chk:'im', chkDe:'' })] })                // 📥 marcada, de IM
    ];
    await _cargar(P, st);
    return { KT:KT, KO:KO, KA:KA, KB:KB };
  };
}
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.message || e) }; } }, [fn.toString(), arg]);

const ERRS=[];   // los errores de TODAS las páginas que abre la prueba
async function abrir(browser, file, reloj, vp){
  const ctx = await browser.newContext({ viewport:vp||{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page._err=[]; page.on('pageerror', e => { page._err.push(e.message); ERRS.push(e.message); }); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + file, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR.toString()+')()');
  page._ctx=ctx;
  return page;
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let r;
  // Viernes 16/10, 12:00 (el día de la planilla real).
  let page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');

  // ═══ TX1. VV2 ═══
  console.log('\n── TX1. «Pedí N · traé M» igual en todas las vistas (VV2) ──');
  r = await corre(page, async () => {
    var K=await _base(), o=_fila(K.KT), d=stockData();
    abrirStock();
    var chipTr=document.querySelector('#stk-plan .pl-chip[data-f="tr"] b');
    var esperadoTr=d.lista.filter(function(x){ return (x.recoger||0)>0 || x.aviso==='traer'; }).length;
    var fila=document.querySelector('#stock-body tr[data-stock-k="'+K.KT+'"]');
    var galp=document.querySelector('#vis-galp .galp[data-galp="trae"]');
    var fic=document.createElement('div'); fic.innerHTML=sfFichaHtml(o, null);
    var cinta=[].filter.call(document.querySelectorAll('#stk-cinta .ci-col'), function(b){ return b.getAttribute('data-k')===K.KT; }).map(_txt)[0]||'';
    var placaTr=_txt(document.querySelector('#stk-cinta .ci-tr .ci-placa'));
    return { aviso:o.aviso, fab:o.fabricar, rec:o.recoger, accion:sfAccion(o), cintaCant:cintaCant(o), cinta:cinta, ficha:_txt(fic), chipTr:chipTr?chipTr.textContent:'', esperadoTr:esperadoTr,
             fila:_txt(fila), galp:_txt(galp), placaTr:placaTr };
  });
  chk('control: 4 vendidos y 1 en Moreno → «🚨 Pedí 3 ya · traé 1 de Moreno» (la cuenta no cambia: fabricar 3, recoger 1)', r && r.fab===3 && r.rec===1 && /Pedí 3 ya · traé 1 de Moreno/.test(r.accion||''), r);
  chk('TX1 la cinta dice «pedí 3 · traé 1» (antes solo «pedí 3»)', r && r.cintaCant==='pedí 3 · traé 1' && /pedí 3 · traé 1/.test(r.cinta), r && { c:r.cintaCant, cinta:r.cinta });
  chk('TX1 la ficha dice «a pedir · + 1 de Moreno»', r && /a pedir · \+ 1 de Moreno/.test(r.ficha||''), r && r.ficha);
  chk('TX1 la tabla dice cuántos traer: «pedí 3 ya y traé 1 de Moreno (hay 1 en …)»', r && /pedí 3 ya y traé 1 de Moreno \(hay 1 en/.test(r.fila||''), r && r.fila);
  chk('TX1 el chip «🚚 Traer» del Plan cuenta lo que se trae junto con un pedido (como la copia TRAER)', r && Number(r.chipTr)===r.esperadoTr && r.esperadoTr===2, r && { chip:r.chipTr, esp:r.esperadoTr });
  chk('TX1 el galpón Moreno y la placa de la cinta lo dicen: «(+1 junto con un pedido)»', r && /\+1 junto con un pedido/.test(r.galp||'') && /\+1 junto con un pedido/.test(r.placaTr||''), r && { g:r.galp, p:r.placaTr });

  // ═══ TX2. VV4 ═══
  console.log('\n── TX2. «Hay» con su desglose en la copia para la fábrica (VV4) ──');
  r = await corre(page, async () => {
    var t=_copia(function(){ copiarProducirTodo('sem'); });
    return { t:t, linea:(t.match(/TITANIO ICE[^\n]*160[^\n]*/)||[''])[0] };
  });
  chk('TX2 «📋 7 días» dice «— hay 1 (PTF 0 · Banzer 0 · Moreno 1)», el mismo «Hay» del Plan', r && /— hay 1 \(PTF 0 · Banzer 0 · Moreno 1\)/.test(r.linea||''), r && r.linea);

  // ═══ TX3. VV5 ═══
  console.log('\n── TX3. «⛔ Ya falta» solo si lo que llega no lo cubre (VV5) ──');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    var st=_stock(function(st){ st.c.u[K]=0; st.p=[{ id:'fp1', k:K, u:1, fab:'MORENO', f:_d(-1), esp:_d(3), r:'' }]; });
    await _cargar([ _ped({ fecha:_d(5), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ], st);
    var o=_fila(K), r1=sfReloj(o);
    // control: sin lo que llega, sí falta
    var st2=_stock(function(st){ st.c.u[K]=0; });
    await _cargar([ _ped({ fecha:_d(5), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ], st2);
    var r2=sfReloj(_fila(K));
    return { conLlegada:r1.txt, sinLlegada:r2.txt, dias:o.dias, aviso:o.aviso };
  });
  chk('TX3 llega 1 el 19/10 para una venta del 21/10: «🚚 Lo vendido lo cubre lo que llega el lun 19/10», no «⛔ Ya falta»', r && /Lo vendido lo cubre lo que llega el lun 19\/10/.test(r.conLlegada||'') && !/Ya falta/.test(r.conLlegada||''), r);
  chk('control: sin nada que llegue, sigue «⛔ Ya falta para lo vendido»', r && /Ya falta para lo vendido/.test(r.sinLlegada||''), r);

  // ═══ TX4. VV6 ═══
  console.log('\n── TX4. «Se corta» al ritmo del mes, la misma cuenta de «Cubre hasta» (VV6) ──');
  r = await corre(page, async () => {
    var K=_k('CH1220','TITANIO ICE','140x190');
    var P=[-17,-19,-21,-23].map(function(n){ return _ped({ fecha:_d(n), ts:_ts(_d(n)), entregado:true, productos:[_lin('CH1220','TITANIO ICE','140x190',2)] }); });
    await _cargar(P, _stock(function(st){ st.c.u[K]=4; }));
    var o=_fila(K), rel=sfReloj(o), n=(typeof stockCubreMesDias==='function') ? stockCubreMesDias(o) : null;
    var cub=producirCubreTxt({ o:o, hay:stockHaySalir(o)+stockEnCaminoSeguro(o)+(o.enOtros||0) });
    return { porDia:o.porDia, porDiaMes:o.porDiaMes, dias:o.dias, reloj:rel.txt, n:n, cubre:cub.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ') };
  });
  chk('control: sin ritmo de 15 días (0) y con el del mes (>0), y la proyección no se corta', r && r.porDia===0 && r.porDiaMes>0 && r.dias==null, r);
  chk('TX4 el Plan dice «⏳ Se corta en ~N días, al ritmo del mes» con el MISMO N que «Cubre hasta» de Qué producir (no «Alcanza más de 45 días»)',
    r && r.n!=null && new RegExp('Se corta en ~'+r.n+' día').test(r.reloj||'') && new RegExp('~'+r.n+' días').test(r.cubre||''), r);

  // ═══ TX5-TX7. VV7, VV8, VV9 (cómo lo DICE la tabla) ═══
  console.log('\n── TX5-TX7. La tabla: «Confirmar la llegada», «llegan» y «Reposición» (VV7, VV8, VV9) ──');
  r = await corre(page, async () => {
    var K=await _base(), out={};
    var leer=function(k){ abrirStock(); return _txt(document.querySelector('#stock-body tr[data-stock-k="'+k+'"]')); };
    out.vv7=_conFila(K.KA, { aviso:'pedido', corte:_d(10), dias:10, pedidos:[{ u:2, llega:_d(3), fab:'MORENO', tipo:'fabrica' }], enCamino:2, reclamar:[] }, function(){ return leer(K.KA); });
    out.vv7b=_conFila(K.KA, { aviso:'pedido', corte:_d(2), dias:2, pedidos:[{ u:2, llega:_d(3), fab:'MORENO', tipo:'fabrica' }], enCamino:2, reclamar:[] }, function(){ return leer(K.KA); });
    out.vv8=_conFila(K.KA, { aviso:'pedido', corte:null, dias:null, pedidos:[{ u:11, llega:_d(-2), fab:'MORENO', tipo:'fabrica' }, { u:9, llega:_d(3), fab:'MORENO', tipo:'fabrica' }], enCamino:20, reclamar:[{ u:11, llega:_d(-2) }] }, function(){ return leer(K.KA); });
    out.vv9=_conFila(K.KT, { aviso:'revisar', revisarStock:true, confirmadoAqui:3, deposito:0, fabricar:3, recoger:1, pedir:4 }, function(){ return leer(K.KT); });
    /* (§4ls, corrector) Lo que rota pasa a «traer» por el punto de pedido aunque no se corte en 45 días (`o.dias` null): no «se corta en null días». */
    out.nul=_conFila(K.KT, { aviso:'traer', dias:null, corte:null, objS:10, objPP:6, recoger:2, pedir:2, fabricar:0, revisarStock:false }, function(){ return leer(K.KT); });
    return out;
  });
  chk('TX7b (234e277) «🚚 traer» de lo que rota sin corte en 45 días: «lo libre llegó al punto de pedido, pero ya está fabricado», nunca «se corta en null días»',
      r && /lo libre llegó al punto de pedido, pero/.test(r.nul||'') && !/null/.test(r.nul||''), r && (r.nul||'').slice(0,300));
  chk('TX5 con el corte DESPUÉS de la llegada: «Con lo pedido alcanza hasta el …», no «hay un faltante antes de recibir»', r && /Con lo pedido alcanza hasta el/.test(r.vv7||'') && !/faltante antes de recibir/.test(r.vv7||''), r && r.vv7);
  chk('control: con el corte ANTES de la llegada sigue «Confirmar la llegada: hay un faltante antes de recibir»', r && /faltante antes de recibir/.test(r.vv7b||''), r && r.vv7b);
  chk('TX6 «En camino»: «9 llegan ~19/10» y «⚠️ 11 atrasados desde el 14/10 (reclamar)», nunca «llegan ~14/10»', r && /9 llegan ~19\/10/.test(r.vv8||'') && /11 atrasados desde el 14\/10/.test(r.vv8||'') && !/llegan ~14\/10/.test(r.vv8||''), r && r.vv8);
  chk('TX7 «⚠️ Revisar saldo · pedí 3 · traé 1 de Moreno» y «fabricar 3 + traer 1 de Moreno», nunca «reposición 4»', r && /Revisar saldo · pedí 3 · traé 1 de Moreno/.test(r.vv9||'') && /fabricar 3 \+ traer 1 de Moreno/.test(r.vv9||'') && !/reposición 4/.test(r.vv9||''), r && r.vv9);

  // ═══ TX8-TX9. VV10, H4 ═══
  console.log('\n── TX8-TX9. «✅ Alcanza» que dice lo que pide el plan, y «Sin stock» (VV10, H4) ──');
  r = await corre(page, async () => {
    var base={ aviso:'', paraSalir:5, enOtros:0, comp:0, compPor:{}, pedidos:[], enCamino:0, dias:null, lead:4, deposito:5 };
    var a=sfAccion(Object.assign({}, base, { _pQuin:6, _pMes:14 }));
    var c=sfAccion(Object.assign({}, base));
    var cero=Object.assign({}, base, { paraSalir:0, deposito:0, _pQuin:0, _pMes:0 });
    return { conPlan:a, sinPlan:c, h4:sfAccion(cero), h4r:sfReloj(cero).txt };
  });
  chk('TX8 con el plan pidiendo 6 para 15 días: «✅ Alcanza esta semana · el plan pide 6 en 15 días»', r && r.conPlan==='✅ Alcanza esta semana · el plan pide 6 en 15 días', r);
  chk('control: sin nada en el plan sigue «✅ Alcanza»', r && r.sinPlan==='✅ Alcanza', r);
  chk('TX9 con 0 en todos lados y nada vendido: «📦 Sin stock: se fabrica a pedido» y «Sin stock · se hace a pedido» (no «Alcanza»)', r && r.h4==='📦 Sin stock: se fabrica a pedido' && r.h4r==='Sin stock · se hace a pedido', r);

  // ═══ TX10. Mes-VM5, Mes-VM10 ═══
  console.log('\n── TX10. El Plan dice que 15 días incluye los 7 y el mes va además (Mes-VM5, Mes-VM10) ──');
  r = await corre(page, async () => {
    await _base(); visPrefSet('masVistas', true); abrirStock();
    var th=_txt(document.querySelector('#stk-plan thead')), cab=_txt(document.querySelector('#stk-plan .pl-cab'));
    var graf=document.querySelector('#producir .qp-ley');
    return { th:th, cab:cab, graf:_txt(graf) };
  });
  chk('TX10 las columnas dicen «15 días · incluye los 7» y «… · además de 15 días»', r && /15 días · incluye los 7/.test(r.th||'') && /además de 15 días/.test(r.th||'') && /incluye los 7: no sumar/.test(r.cab||''), r);
  chk('TX10 el gráfico de Qué producir dice «(producir, además de 15 días)», no «(probable)»', r && /producir, además de 15 días/.test(r.graf||'') && !/probable/.test(r.graf||''), r && r.graf);

  // ═══ TX12. VF6 ═══
  console.log('\n── TX12. Lo medido y la regla, por separado (VF6) ──');
  r = await corre(page, async () => stockFabricasTxt(stockTiemposFabrica()));
  chk('TX12 «MORENO: … · lo que se pide hoy se entrega desde el …», sin «tarda ~N días (medido…)»', typeof r==='string' && /MORENO: /.test(r) && /se entrega desde el /.test(r) && !/tarda ~/.test(r), r);

  // ═══ TX13. VF5 ═══
  console.log('\n── TX13. «Se corta» nunca un domingo (VF5) ──');
  r = await corre(page, async () => {
    var o={ aviso:'pedir', paraSalir:3, deposito:3, enOtros:0, comp:0, compPor:{}, pedidos:[], enCamino:0, dias:9, corte:'2026-10-25', lead:4, porDia:0.3 };
    var cTxt=sfReloj(o).txt, tm=document.createElement('div'); tm.innerHTML=stockTermoFila(o, todayStr());
    return { reloj:cTxt, termo:_txt(tm) };
  });
  chk('TX13 con el corte el domingo 25/10, «Se corta el lun 26/10» (en el Plan y en el termómetro)', r && /Se corta el lun 26\/10/.test(r.reloj||'') && /se corta el lun 26\/10/.test(r.termo||'') && !/dom 25\/10/.test((r.reloj||'')+(r.termo||'')), r);

  // ═══ TX15. V-REV-4/5/8/9 ═══
  console.log('\n── TX15. La revisión automática y la Lista de carga (V-REV-4, 5, 8, 9) ──');
  r = await corre(page, async () => {
    var K=await _base(); visPrefSet('masVistas', true);
    abrirStock();
    var fija=_txt(document.querySelector('#stock-body'));
    abrirStockRevisar();
    var modal=_txt(document.getElementById('modal-box'));
    var bots=[].map.call(document.querySelectorAll('#modal-box button'), function(b){ return b.textContent.trim(); });
    var traer=(REVSTK.traerIM||[]).map(function(o){ return o.k; });
    closeModal();
    CARGA_DIA='hoy'; showView('carga'); renderCarga();
    var carga=_txt(document.getElementById('carga-body'));
    var L=[]; for(var i=0;i<12;i++) L.push({ id:'x'+i, oc:'10-'+i, fecha:_d(1), nom:'P'+i, u:1, en:[{ alm:'PTF', u:1, aca:true }] });
    var S=[]; for(var j=0;j<12;j++) S.push({ para:{ id:'a'+j, oc:'10-'+j, fecha:_d(1) }, nom:'P'+j, falta:1, cubre:1, de:[{ id:'b'+j, oc:'10-'+(50+j), fecha:_d(9), u:1 }] });
    var d1=document.createElement('div'); d1.innerHTML=revNoHayConStockHtml(L); var d2=document.createElement('div'); d2.innerHTML=revSoltarHtml(S);
    var d3=document.createElement('div'); d3.innerHTML=revSinRespaldoHtml([{ id:'s1', oc:'10-1', fecha:_d(1), nom:'X', u:1, faltan:1 }]);
    return { K:K, fija:fija, modal:modal, bots:bots, traer:traer, carga:carga, nh:_txt(d1), so:_txt(d2), sr:_txt(d3) };
  });
  chk('TX15 (V-REV-4) la ventana de «Aplicar» muestra las «✔ sin stock que la respalde», como el cuadro fijo', r && /sin stock que la respalde/.test(r.modal||'') && /sin stock que la respalde/.test(r.fija||''), r && (r.modal||'').slice(0,300));
  chk('TX15 (V-REV-4) el cuadro fijo muestra «📥 el almacén que dice la marca no tiene esas unidades» (antes solo la ventana)', r && /el almacén que dice la marca no tiene esas unidades/.test(r.fija||''), r && (r.fija||'').slice(0,300));
  chk('TX15 (V-REV-5) lo marcado 📥 de IM entra en «📥 Hay que ir a buscar» (antes la lista quedaba vacía)', r && r.traer && r.K && r.traer.indexOf(r.K.KB)>=0, r && r.traer);
  chk('TX15 (V-REV-8) la Lista de carga de hoy dice «⚠️ 1 sin stock detrás: revisá» en la línea marcada ✔ sin stock', r && /1 sin stock detrás: revisá/.test(r.carga||''), r && (r.carga||'').slice(0,400));
  chk('TX15 (V-REV-9) las listas cortadas dicen «y 4 más» (✗ con stock y 💡), y el título de sin respaldo nombra «📥 recoger»', r && /y 4 más/.test(r.nh||'') && /y 4 más/.test(r.so||'') && /«✔ hay» o «📥 recoger»/.test(r.sr||''), r && { nh:(r.nh||'').slice(-60), so:(r.so||'').slice(-60), sr:(r.sr||'').slice(0,90) });
  chk('TX17 (VB-9) el botón de la revisión se llama «📋 Copiar lo vendido que falta» (no igual al de la barra)', r && r.bots && r.bots.some(function(b){ return /Copiar lo vendido que falta/.test(b); }) && !r.bots.some(function(b){ return /^📋 Copiar pedido a fábrica$/.test(b); }), r && r.bots);

  // ═══ TX16. Cie-C4, C6, C7 (16/10 a las 12:00 y 17:00) ═══
  console.log('\n── TX16. El cierre de entregas (Cie-C4, Cie-C6, Cie-C7) ──');
  r = await corre(page, async () => {
    var p=_ped({ id:'gc1', fecha:todayStr(), vehiculo:'Foton nuevo', maps:'https://www.google.com/maps?q=-17.783,-63.182&aprox=1', productos:[_lin('CH1201','TITANIO ICE','160x190',1)] });
    var p2=Object.assign({}, p, { id:'gc2', maps:'https://www.google.com/maps?q=-17.783,-63.182' });
    var _g=gpsDiaDe, _v=gpsVolvioDelTodo, _l=gpsLlegadaDe;
    gpsDiaDe=function(){ return { ev:[['15:00','sal','',0],['15:40','lle','ptf']] }; }; gpsVolvioDelTodo=function(){ return true; }; gpsLlegadaDe=function(){ return null; };
    var g1=null, g2=null; try{ g1=cierreEntGps(p); g2=cierreEntGps(p2); } finally { gpsDiaDe=_g; gpsVolvioDelTodo=_v; gpsLlegadaDe=_l; }
    var b=document.querySelector('[onclick="abrirCierreEntregas()"]');
    var ayuda=JSON.stringify(ASIS_AYUDA.filter(function(a){ return /cierre de entregas/i.test(a.q); }));
    var pm=cierreEntRpDias(_ped({ fecha:todayStr(), turno:'AM', vehiculo:'Foton nuevo' })).map(function(x){ return x.x; });
    return { g1:g1&&g1.k, g2:g2&&g2.k, title:b?b.title:'', ayuda:ayuda, pm:pm };
  });
  chk('TX16 (Cie-C4) con la ubicación aproximada el GPS no dice «volvió sin pararse ahí» (≈ aproximada)', r && r.g1==='aprox', r);
  chk('control: con el pin exacto sigue «el camión volvió sin pararse ahí»', r && r.g2==='novio', r);
  chk('TX16 (Cie-C6) el botón y Bloki ya no dicen «tildada como propuesta» / «Vienen tildados»: «Tildá uno por uno lo que salió»', r && !/tildada como propuesta/.test(r.title||'') && /Tildá uno por uno/.test(r.title||'') && !/Vienen tildados/.test(r.ayuda||'') && /Tildá uno por uno/.test(r.ayuda||''), r && { t:r.title, a:(r.ayuda||'').slice(0,200) });
  chk('control: a las 12:00 «Hoy PM» se ofrece para un pedido de la mañana', r && r.pm && /Hoy PM/.test(r.pm[0]||''), r && r.pm);
  await page._ctx.close();

  page = await abrir(browser, PEDIDOS, '2026-10-16T17:00:00-04:00');
  r = await corre(page, async () => {
    var p=_ped({ fecha:todayStr(), turno:'AM', vehiculo:'Foton nuevo' });
    var sin=cierreEntRpDias(p).map(function(x){ return x.x; });
    var _g=gpsDiaDe; gpsDiaDe=function(v){ return v==='Foton nuevo' ? { ev:[] } : null; };
    var con; try{ con=cierreEntRpDias(p).map(function(x){ return x.x; }); } finally { gpsDiaDe=_g; }
    return { sin:sin, con:con };
  });
  chk('TX16 (Cie-C7) a las 17:00 sin dato del camión NO se ofrece «Hoy PM»', r && r.sin && !r.sin.some(function(x){ return /Hoy PM/.test(x); }), r);
  chk('TX16 (Cie-C7) …y sí, si el GPS de su camión está al día y no lo vio salir a la tarde', r && r.con && /Hoy PM/.test(r.con[0]||''), r);
  await page._ctx.close();

  // ═══ TX17-TX18. VB-4, VB-7, VB-8, VB-9; Man-VM7, VM9, VM10 ═══
  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  console.log('\n── TX17. Botones (VB-4, VB-7, VB-8, VB-9) ──');
  r = await corre(page, async () => {
    var K=await _base(), out={};
    // VB-4: el equipo (no Playwright) arma «Más vistas» al abrirlo
    window.MAS_VISTAS_PRUEBA=true; visPrefSet('masVistas', false); abrirStock();
    out.cerradoTabla=!!document.getElementById('stk-tabla-caja');
    var det=document.getElementById('stk-mas'); det.open=true; await new Promise(function(res){ setTimeout(res, 60); });
    out.abiertoTabla=!!document.getElementById('stk-tabla-caja');
    // …y cerrado, lo de afuera de «Más vistas» anda igual (buscar, filtrar el Plan, frenar la cinta, volver a abrir Stock)
    det.open=false; visPrefSet('masVistas', false); await new Promise(function(res){ setTimeout(res, 30); });
    stockBuscar('TITANIO'); stockBuscar(''); planFiltro('tr'); planFiltro('todos'); CINTA_PAUSA=!CINTA_PAUSA; renderStock(); CINTA_PAUSA=!CINTA_PAUSA;
    closeStock(); abrirStock(); await new Promise(function(res){ setTimeout(res, 1200); });
    out.cerradoOtraVez=!document.getElementById('stk-tabla-caja') && !!document.getElementById('stk-plan');
    window.MAS_VISTAS_PRUEBA=false; visPrefSet('masVistas', false);
    // VB-8
    abrirStock(); var bc=document.querySelector('#stk-plan .pl-copiar'); out.copiarBg=bc ? getComputedStyle(bc).backgroundColor : '';
    // VB-7: «↩️ Deshacer»
    planYaPedi(K.KT, true); abrirStock();
    out.undo=_txt(document.getElementById('pl-ya-undo'));
    out.yaAntes=(STOCK.p||[]).filter(function(q){ return q.ya && q.k===K.KT; }).length;
    var chkIn=document.querySelector('#stk-plan .pl-ya-chk input'); out.chkW=chkIn ? chkIn.getBoundingClientRect().width : 0;
    if(typeof planYaDeshacer==='function') planYaDeshacer();
    out.yaDespues=(STOCK.p||[]).filter(function(q){ return q.ya && q.k===K.KT; }).length;
    // VB-9: Escape cierra el cartel final de «Aplicar»
    revStkMostrarAvance(1, 1, 'X', '✅ Listo', ''); document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape' }));
    out.avance=!!document.getElementById('revstk-avance'); var av=document.getElementById('revstk-avance'); if(av) av.remove();
    // VB-9: la ✕ de una recogida
    STOCK.p=(STOCK.p||[]).concat([{ id:'rc1', k:K.KB, u:1, tipo:'recogida', de:_IM, fab:'', f:todayStr(), esp:_d(1), r:'' }]);
    window._confirms.length=0; cancelarStockPedido('rc1'); out.conf=window._confirms[0]||'';
    return out;
  });
  chk('TX17 (VB-4) cerrado, «Más vistas» no arma la tabla completa; al abrirlo, sí', r && r.cerradoTabla===false && r.abiertoTabla===true, r);
  chk('TX17 (VB-4) cerrado otra vez: el Plan está y la tabla no, después de buscar, filtrar y frenar la cinta', r && r.cerradoOtraVez===true, r && r.cerradoOtraVez);
  chk('TX17 (VB-8) «📋 Copiar el pedido para fábrica» con el teal oscuro (#0f766e, ~5,5:1), no blanco sobre #00B5AD (2,56:1)', r && r.copiarBg==='rgb(15, 118, 110)', r && r.copiarBg);
  chk('TX17 (VB-7) después de «Ya pedí» el Plan muestra arriba «✓ Anotaste Ya pedí 3 … ↩️ Deshacer», y deshacer lo saca', r && /Anotaste Ya pedí 3/.test(r.undo||'') && /Deshacer/.test(r.undo||'') && r.yaAntes===1 && r.yaDespues===0, r);
  chk('TX17 (VB-7) la casilla «Ya pedí» mide al menos 22 px', r && r.chkW>=21.5, r && r.chkW);
  chk('TX17 (VB-9) Escape cierra el cartel final de «Aplicar»', r && r.avance===false, r);
  chk('TX17 (VB-9) la ✕ de una RECOGIDA pregunta «¿Sacar esta recogida…?», no «este pedido a fábrica»', r && /recogida de Moreno/.test(r.conf||'') && !/pedido a fábrica/.test(r.conf||''), r && r.conf);

  console.log('\n── TX18. «Ya pedí», 🏭 y la recogida (Man-VM7, Man-VM9, Man-VM10) ──');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190'), out={};
    await _cargar([ _ped({ id:'v1', fecha:_d(1), productos:[_lin('CH1201','TITANIO ICE','160x190',5)] }) ], _stock(function(st){ st.c.u[K]=0; }));
    planYaPedi(K, true);                                                         // A
    var A=(STOCK.p||[]).filter(function(q){ return q.ya && q.k===K; })[0];
    STATE.push(_ped({ id:'v2', fecha:_d(2), productos:[_lin('CH1201','TITANIO ICE','160x190',3)] })); stockOlvidarIndice();
    planYaPedi(K, true);                                                         // B («3 más»)
    planYaPedi(K, false, A.id);                                                  // se destilda A
    var antes=(STOCK.p||[]).filter(function(q){ return q.ya && q.k===K; }).length, fab=_fila(K).fabricar;
    planYaPedi(K, true);                                                         // otra vez: tiene que anotarse
    var desp=(STOCK.p||[]).filter(function(q){ return q.ya && q.k===K; });
    out.vm7={ antes:antes, despues:desp.length, fab:fab, u:desp.map(function(q){ return q.u; }) };
    // Man-VM9
    /* ✏️ (18/10, §4ls, corrector, a conciencia) Como lo llama `setProdProduccion` al APAGAR el 🏭 (`seQuito`): sin esa marca, un estado
       puesto a mano (`setEstado`) también se borraba al tocar cualquier otra línea. */
    var p={ id:'m9', estado:'En producción', productos:[{ desc:'TITANIO ICE', medida:'160x190', cant:1, codigo:'CH1201' }] };
    syncVerificado(p, true); out.vm9=p.estado;
    // Man-VM10 (1): «más» solo con un «Ya pedí» vigente; (2) el vencido parcial
    STOCK.p=[{ id:'fyv', k:K, u:2, total:5, ru:3, fab:'MORENO', f:_d(-9), arr:_d(-9), esp:_d(-5), r:'', ya:1 }];
    var o=_fila(K); var h=document.createElement('div'); h.innerHTML=planYaHtml(o); out.vm10=_txt(h);
    // (4) la recogida programada
    out.rec=sfAccion({ aviso:'pedido', pedidos:[{ u:1, tipo:'recogida', llega:_d(1) }], reclamar:[] });
    out.fab=sfAccion({ aviso:'pedido', pedidos:[{ u:1, tipo:'fabrica', llega:_d(3) }], reclamar:[] });
    return out;
  });
  chk('TX18 (Man-VM7) el segundo «Ya pedí N más» del día después de destildar el primero SE ANOTA (antes salía sin hacer nada)', r && r.vm7 && r.vm7.despues===r.vm7.antes+1 && r.vm7.u.indexOf(r.vm7.fab)>=0, r && r.vm7);
  chk('TX18 (Man-VM9) sin ninguna línea 🏭 ni ✗, el pedido deja de decir «En producción»', r && r.vm9==='', r && r.vm9);
  chk('TX18 (Man-VM10) con solo un «Ya pedí» vencido, la casilla no dice «más»; y el vencido parcial dice «llegaron 3 y faltan 2»', r && /Ya pedí \d+(?! más)/.test(r.vm10||'') && !/ más/.test((r.vm10||'').split('Ya no se cuenta')[1]||'') && /llegaron 3 y faltan 2/.test(r.vm10||''), r && r.vm10);
  chk('TX18 (Man-VM10) una recogida programada dice «🚚 Recogida programada»; un pedido a fábrica sigue «🚚 Ya pedido»', r && /^🚚 Recogida programada/.test(r.rec||'') && /^🚚 Ya pedido/.test(r.fab||''), r);

  // ═══ TX19. BP3, BP4, BP6 ═══
  console.log('\n── TX19. Banzer o PTF (BP3, BP4, BP6) ──');
  r = await corre(page, async () => {
    var out={};
    out.bp3=almPlanMovTxt({ cubreB:2, pasar:0, deM:[], noReparte:true }, false).join(' | ');
    out.bp3b=almPlanMovTxt({ cubreB:2, pasar:0, deM:[] }, false).join(' | ');
    var hoy=todayStr(), ents=[];
    var mk=function(z, n){ ents.push({ f:stockSumarDias(hoy,-n), zk:almZonaClave(z), zona:z, lado:{ P:1, B:0 }, pt:null }); };
    [3,5,8,10,12].forEach(function(n){ mk('EQUIPETROL', n); }); [33,35,40,45,50].forEach(function(n){ mk('ZONA EQUIPETROL', n); });
    [2,4,6,9].forEach(function(n){ mk('POR CONFIRMAR', n); });
    var T=almTendencias({ ents:ents, hoy:hoy });
    out.bp4=T.map(function(z){ return z.nombre+':'+z.n+':'+z.tipo; });
    await _base(); ALM_DATA=null; ALM_PLAN_H=15;
    out.bp6=_copia(function(){ almCopiarPlan(); });
    return out;
  });
  chk('TX19 (BP3) lo que no se reparte dice «de lo vendido (… no se reparte …)», no «de las entregas de la zona de PTF»', r && /de lo vendido \(este producto se vende poco y no se reparte/.test(r.bp3||'') && !/zona de PTF/.test(r.bp3||''), r && r.bp3);
  chk('control: lo que se reparte sigue «de las entregas de la zona de PTF»', r && /de las entregas de la zona de PTF/.test(r.bp3b||''), r && r.bp3b);
  chk('TX19 (BP4) «EQUIPETROL» y «ZONA EQUIPETROL» son UN barrio (10 entregas, igual) y «POR CONFIRMAR» no es un barrio', r && r.bp4 && r.bp4.length===1 && /:10:igual$/.test(r.bp4[0]) && !r.bp4.some(function(x){ return /CONFIRMAR/i.test(x); }), r && r.bp4);
  chk('TX19 (BP6) el plan copiado dice que es de MOVIMIENTOS y no dice «pedir», «producir» ni «fabricar»', r && /plan de MOVIMIENTOS/.test(r.bp6||'') && !/pedir|producir|fabricar/i.test(r.bp6||''), r && (r.bp6||'').slice(0,300));

  // ═══ TX20. T4 ═══
  console.log('\n── TX20. «Qué va a pedir cada tienda» y la pregunta de una RPT (T4) ──');
  r = await corre(page, async () => {
    var KC=_k('CH1201','TITANIO ICE','160x190'), KM=_k('CD1403','ALMOHADA','50x70');
    var P=[ _ped({ id:'t1', oc:'RPT 10-001', cliente:'Central', fecha:_d(4), ts:_ts(_d(-2)), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }),         // pendiente: todavía no llegó
            _ped({ id:'t2', oc:'RPT 10-002', cliente:'Central', fecha:_d(-3), ts:_ts(_d(-5)), productos:[_lin('CH1201','TITANIO ICE','160x190',1),_lin('CH1201','TITANIO ICE','160x190',2,{ chk:'no' })] }),
            _ped({ id:'t3', oc:'RPT 10-003', cliente:'Central', fecha:_d(-2), ts:_ts(_d(-3)), productos:[_lin('CD1403','ALMOHADA','50x70',10)] }) ];
    await _cargar(P, _stock());
    var L=stockTiendas(stockMesSiguiente(todayStr())), c=L.filter(function(t){ return t.n==='Central'; })[0]||{ filas:[] };
    var ft=c.filas.filter(function(f){ return f.k===KC; })[0]||{}, fa=c.filas.filter(function(f){ return f.k===KM; })[0]||{};
    var _dt=docTipoSel; docTipoSel=function(){ return 'RPT'; };
    var q; try{ q=saldoAlertaTxt({ tipo:'pedir', faltan:1, espera:4, fecha:'', pend:0 }); } finally { docTipoSel=_dt; }
    return { r:ft.r, nvAlm:fa.nv, vAlm:fa.v, q:q };
  });
  chk('TX20 de TITANIO ICE, Central «recibió» solo lo que le llegó: 1 (ni las 2 pendientes ni las 2 ✗)', r && r.r===1, r);
  chk('TX20 la RPT de almohadas cuenta como venta (10) pero no como «1 venta»', r && r.vAlm===10 && !r.nvAlm, r);
  chk('TX20 en una RPT la pregunta dice «la sucursal espera», no «el cliente espera»', r && /la sucursal espera/.test(r.q||'') && !/el cliente espera/.test(r.q||''), r && r.q);

  // ═══ TX21. VI-2, VI-7, VI-9 ═══
  console.log('\n── TX21. Identidad: el código sin medida, «ECOFLEX» y el histórico (VI-2, VI-7, VI-9) ──');
  r = await corre(page, async () => {
    var out={};
    var c49=saldoCodigoOtro({ codigo:'49', desc:'SOMIER PLATA SEMIORTOPEDICO', medida:'105x190' });
    var cBir=saldoCodigoOtro({ codigo:'CH2172', desc:'SOMIER BiRELAX', medida:'160x200' });
    var cBir2=saldoCodigoOtro({ codigo:'CH2172', desc:'SOMIER BiRELAX', medida:'160x190' });
    out.c49=c49 && { por:c49.por, bien:c49.bien }; out.cBir=cBir; out.cBir2=cBir2 && cBir2.bien;
    var KE=_k('CH1332','NUEVO ECO FLEX','140x190');
    await _cargar([], _stock(function(st){ st.c.u[KE]=6; }));
    var clave=stockInfo({ desc:'ECOFLEX', medida:'140x190', codigo:'' }).k;
    var cand=saldoCandidatos(clave, saldoDatos());
    out.eco={ clave:clave, cand:cand.map(function(c){ return c.k; }), KE:KE };
    var idx=ventasHistIndex();
    // Los renglones con «OTROS» cuyo NOMBRE trae una medida: ninguno puede quedar en «…|OTROS» (uno sin medida en el nombre, como
    // una reparación, no tiene adónde ir y queda como estaba).
    out.otros=VENTAS_HIST.filas.filter(function(f){ return /^OTROS$/i.test(String(f[2]||'').trim()) && medidaDeTexto(f[1]); })
      .map(function(f){ var m=medidaDeTexto(f[1]); return stockInfo({ desc:f[1], medida:m, codigo:f[0] }).k; })
      .filter(function(k){ return !idx[k]; });
    out.otros=out.otros.concat(Object.keys(idx).filter(function(k){ return /^ALMOHADA\|OTROS$/.test(k); }));
    out.almo=Object.keys(idx).filter(function(k){ return /^ALMOHADA\|50X70/i.test(k); });
    return out;
  });
  chk('TX21 (VI-2) el «49» con 105x190: «el código es de otra medida» y el bueno es CH1159', r && r.c49 && r.c49.por==='medida' && r.c49.bien && r.c49.bien.indexOf('CH1159')>=0, r && r.c49);
  chk('TX21 (VI-2) …y CH2172 «ESPECIAL» con 160x190 avisa que el bueno es CH1771', r && r.cBir2 && r.cBir2.indexOf('CH1771')>=0, r && r.cBir2);
  chk('control: CH2172 con una medida que el catálogo no tiene (160x200, a medida) sigue sin aviso', r && r.cBir===null, r && r.cBir);
  chk('TX21 (VI-7) «ECOFLEX 140» propone el NUEVO ECO FLEX 140 del almacén (¿Es …?)', r && r.eco && r.eco.cand.indexOf(r.eco.KE)>=0, r && r.eco);
  chk('TX21 (VI-9) el histórico con la medida «OTROS» va a la medida escrita en el nombre (MPT0013 «ALMOHADA 50X70» → la 50x70, no ALMOHADA|OTROS)', r && r.otros && r.otros.length===0 && r.almo && r.almo.length>0, r && { otros:r.otros, almo:r.almo });
  await page._ctx.close();

  // ═══ TX14. VF4 (sábado 17/10) ═══
  console.log('\n── TX14. La recogida un sábado (VF4, Man-VM10) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-17T10:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    await _cargar([ _ped({ fecha:_d(2), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ], _stock(function(st){ st.c.u[K]=0; st.g[_IM].u[K]=3; }));
    abrirStockRecogida(K);
    var prop=(document.getElementById('stk-rec-f')||{}).value;
    document.getElementById('stk-rec-f').value='2026-10-18';
    var n0=(STOCK.p||[]).length; guardarStockRecogida(); var n1=(STOCK.p||[]).length;
    try{ closeModal(); }catch(e){}
    var esp=stockEsperado({ tipo:'recogida', esp:'2026-10-18', f:'2026-10-17' });
    abrirStockRecogida(K); document.getElementById('stk-rec-u').value='1'; window._toasts.length=0; guardarStockRecogida();
    var tt=window._toasts.filter(function(t){ return /Anotada la recogida/.test(t); })[0]||'';
    return { prop:prop, guardoDomingo:n1>n0, esp:esp, toast:tt };
  });
  chk('TX14 el sábado el modal propone el lunes 19/10 (el día hábil siguiente), no el domingo', r && r.prop==='2026-10-19', r);
  chk('TX14 …y no deja anotarla para el domingo 18/10', r && r.guardoDomingo===false, r);
  chk('TX14 una recogida guardada para el domingo llega el lunes (la proyección y el cuadrito)', r && r.esp==='2026-10-19', r);
  chk('TX17 (VB-9) el aviso dice «1 unidad», no «1 unidades»', r && /Anotada la recogida: 1 unidad de/.test(r.toast||''), r && r.toast);
  await page._ctx.close();

  // ═══ TX11. VV12, VF8 (viernes con PTF viejo; domingo 18/10) ═══
  console.log('\n── TX11. El cartel del Excel viejo (VV12, VF8) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    await _cargar([], _stock(null, { fPtf:_d(-1) }));
    abrirStock(); return _txt(document.getElementById('stk-cortes-viejos'));
  });
  chk('TX11 (VV12) con SOLO el Excel de PTF viejo, el cartel lo dice («PTF es del 15/10»)', /PTF es del 15\/10/.test(r||''), r);
  await page._ctx.close();
  page = await abrir(browser, PEDIDOS, '2026-10-18T10:00:00-04:00');
  r = await corre(page, async () => {
    await _cargar([], _stock(function(st){ st.g[_BZ].u[_k('CH1201','TITANIO ICE','160x190')]=1; }, { f:'2026-10-16' }));
    abrirStock();
    return { cartel:_txt(document.getElementById('stk-cortes-viejos')), avisos:saldoAvisos() };
  });
  chk('TX11 (VF8) el domingo el cartel dice «Falta el del sáb 17/10 (hoy es domingo…)», no «Subí el de hoy», y nombra PTF',
    r && /Falta el del sáb 17\/10/.test(r.cartel||'') && !/Subí el de hoy/.test(r.cartel||'') && /PTF/.test(r.cartel||''), r && r.cartel);
  chk('TX11 (VF8) el cuadrito no dice «el de del»: «El Excel de Banzer es del 16/10: falta el del 17/10 (hoy es domingo…)»',
    r && r.avisos && !r.avisos.some(function(a){ return /el de del/.test(a); }) && r.avisos.some(function(a){ return /Banzer es del 16\/10: falta el del 17\/10/.test(a); }), r && r.avisos);
  await page._ctx.close();

  // ═══ TX17. VB-6 (celular, 390 px) ═══
  console.log('\n── TX17. La barra de Stock en el celular (VB-6) ──');
  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00', { width:390, height:844 });
  r = await corre(page, async () => {
    await _base(); abrirStock();
    var bar=document.querySelector('#stock-overlay > div.no-print');
    return { h:bar ? bar.getBoundingClientRect().height : 0, ancho:document.documentElement.scrollWidth };
  });
  chk('TX17 (VB-6) en 390 px la barra fija de arriba ocupa menos de 250 px (antes ~400, media pantalla)', r && r.h>0 && r.h<250, r);
  chk('control: la página no se sale de costado', r && r.ancho<=392, r);
  const errores=page._err.slice();
  await page._ctx.close();

  // ═══ TX30. Lo que encontraron los verificadores (§4ls, corrector) ═══
  console.log('\n── TX30. Descontinuado sin stock, días hábiles, tiendas, ATC, pedido único, candidatos, carga, estado a mano, «en N días», pedí 0, Moreno, cinta ──');
  page = await abrir(browser, PEDIDOS, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var out={}, KJ=_k('CH1075','ESPECIAL JUNIOR','105x190'), KT=_k('CH1201','TITANIO ICE','160x190'), KU=_k('CH1129','TITANIO LATEX','140x190');
    /* (H4) Lo que ya no se fabrica, con 0 en todos lados y nada vendido; (H4 a medias) un «pedido único» con 0 en todos lados. */
    await _cargar([ _ped({ fecha:_d(-3), entregado:true, productos:[_lin('CH1129','TITANIO LATEX','140x190',1)] }) ],
                  _stock(function(st){ st.c.u[KJ]=0; st.g[_BZ].u[KJ]=0; st.g[_IM].u[KJ]=0; st.c.u[KU]=0; st.g[_BZ].u[KU]=0; st.g[_IM].u[KU]=0; }));
    var oj=_fila(KJ), ou=_fila(KU);
    out.desc={ acc:oj&&sfAccion(oj), rel:oj&&sfReloj(oj).txt }; out.unico={ aviso:ou&&ou.aviso, rel:ou&&sfReloj(ou).txt };
    /* (VF5 / VV7) «en N días» hasta el día que se muestra, y «alcanza hasta» = el día hábil antes del corte. */
    out.enDias=stockCorteEnDias({ corte:'2026-10-25', dias:9 }); out.hasta=stockAlcanzaHasta({ corte:'2026-10-26' });
    /* (T8) «Recoger de una tienda» no va en «Vendido sin entregar · consume depósito». */
    await _cargar([ _ped({ id:'t1', fecha:_d(2), productos:[_lin('CH1201','TITANIO ICE','160x190',1,{ chk:'im', chkDe:'Tienda Mia Plaza' })] }),
                    _ped({ id:'t2', fecha:_d(2), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }),
                    _ped({ id:'a1', oc:'ATC 10-001', fecha:_d(6), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ], _stock(function(st){ st.c.u[KT]=3; }));
    out.pend=stockPedidosDetalle(KT).pendientes.map(function(g){ return g.p.id; });
    /* (T9) La ficha «🎧 ATC» de la revisión con el filtro de días: la del 22/10 no entra con «Hoy». */
    REVSTK_DIAS='hoy'; out.atcHoy=stockAsignar().tot.atc; REVSTK_DIAS='todos'; out.atcTodos=stockAsignar().tot.atc;
    /* (V-REV-8) La revisión de la Lista de carga se arma UNA vez mientras no cambien los datos. */
    var A1=cargaSinRespAsignar(), A2=cargaSinRespAsignar(); saveMirror(); var A3=cargaSinRespAsignar();
    out.memo={ igual:A1===A2, nueva:A3!==A2 };
    /* (Man-VM9) Un estado puesto A MANO no se borra al marcar ✔ en OTRA línea; apagar el 🏭 sí lo limpia. */
    await _cargar([ _ped({ id:'e1', fecha:_d(4), productos:[_lin('CH1201','TITANIO ICE','160x190',1), _lin('CH1201','TITANIO ICE','160x190',1)] }) ], _stock(function(st){ st.c.u[KT]=3; }));
    var pe=findById('e1'); pe.estado='No hay'; setProdChk('e1', 0, 'ok', ''); out.manual=findById('e1').estado;
    setProdProduccion('e1', 1, 'MORENO'); setProdProduccion('e1', 1, 'MORENO'); out.trasProd=findById('e1').estado;
    /* (VV5) 0 en PTF y Banzer, 5 en Moreno, 6 vendidos y 2 que llegan antes: no es «⛔ Ya falta». */
    await _cargar([ _ped({ fecha:_d(4), productos:[_lin('CH1201','TITANIO ICE','160x190',6)] }) ],
                  _stock(function(st){ st.c.u[KT]=0; st.g[_BZ].u[KT]=0; st.g[_IM].u[KT]=5; st.p=[{ id:'f1', k:KT, u:2, fab:'MORENO', f:_d(-2), esp:_d(2), r:'' }]; }));
    out.moreno=sfReloj(_fila(KT)).txt;
    /* (VV2) Sin ningún «solo traer», el carril de «Traer» igual aparece con lo que va junto con un pedido. */
    await _cargar([ _ped({ fecha:_d(1), productos:[_lin('CH1201','TITANIO ICE','160x190',4)] }) ], _stock(function(st){ st.c.u[KT]=0; st.g[_IM].u[KT]=1; }));
    var dd=stockData(); out.cinta=/junto con un pedido/.test(stockCintaHtml(dd)); out.trSolo=dd.lista.filter(function(o){ return planGrupoDe(o)==='tr'; }).length;
    /* (VI-7) Los candidatos por PALABRAS ENTERAS: «SOMIER» 140 no propone el SOMIER BAHIA BEIGE ni «PEDIC» el ESPECIAL ORTOPEDICO; «ECOFLEX»
       sigue proponiendo el NUEVO ECO FLEX. */
    var KS1=stockClaveCruda({ desc:'SOMIER BAHIA BEIGE', medida:'140x190' }), KS2=stockClaveCruda({ desc:'ESPECIAL ORTOPEDICO D/C', medida:'140x190' }), KE=_k('CH1332','NUEVO ECO FLEX','140x190');
    await _cargar([], _stock(function(st){ st.c.u[KS1]=3; st.c.u[KS2]=2; st.c.u[KE]=6; }));
    var cand=function(d){ return saldoCandidatos(stockInfo({ desc:d, medida:'140x190', codigo:'' }).k, saldoDatos()).map(function(c){ return c.k; }); };
    out.cand={ somier:cand('SOMIER'), pedic:cand('PEDIC'), eco:cand('ECOFLEX'), KS1:KS1, KS2:KS2, KE:KE };
    /* (Man-VM8 en la tabla, VV9) «⚠️ Revisar saldo» sin nada que pedir no dice «pedí 0». */
    var KB=await _base();
    out.revisar=_conFila(KB.KT, { aviso:'revisar', revisarStock:true, confirmadoAqui:3, deposito:0, fabricar:0, recoger:0, pedir:0 }, function(){ abrirStock(); var t=_txt(document.querySelector('#stock-body tr[data-stock-k="'+KB.KT+'"]')); try{ closeStock(); }catch(e){} return t; });
    return out;
  });
  chk('TX30a (H4) lo que YA NO SE FABRICA con 0 en todos lados dice «🛑 Sin stock: ya no se fabrica», nunca «se fabrica a pedido»',
      r && r.desc && /Sin stock: ya no se fabrica/.test(r.desc.acc||'') && /ya no se fabrica/.test(r.desc.rel||'') && !/a pedido/.test((r.desc.acc||'')+(r.desc.rel||'')), r && r.desc);
  chk('TX30b (H4) un «pedido único» con 0 en los tres almacenes no dice «Alcanza más de 45 días»', r && r.unico && r.unico.aviso==='unico' && !/Alcanza/.test(r.unico.rel||'') && /Sin stock/.test(r.unico.rel||''), r && r.unico);
  chk('TX30c (VF5) «en N días» cuenta hasta el día que se muestra (corte el domingo 25 → lunes 26/10 = en 10 días); (VV7) «alcanza hasta» el sábado 24',
      r && r.enDias==='en 10 días' && r.hasta==='2026-10-24', r && [r.enDias, r.hasta]);
  chk('TX30d (T8) «recoger de una tienda» no figura en «Vendido sin entregar · consume depósito»; lo demás sí', r && r.pend && r.pend.indexOf('t1')<0 && r.pend.indexOf('t2')>=0, r && r.pend);
  chk('TX30e (T9) la ficha «🎧 ATC» respeta el filtro de días: con «Hoy» la del 22/10 no cuenta (0); con «Todos», 1', r && r.atcHoy===0 && r.atcTodos===1, r && [r.atcHoy, r.atcTodos]);
  chk('TX30f (V-REV-8) la Lista de carga reusa la revisión mientras no cambien los datos, y la rehace cuando cambian', r && r.memo && r.memo.igual && r.memo.nueva, r && r.memo);
  chk('TX30g (Man-VM9) el «No hay» puesto a mano sigue al marcar ✔ en otra línea; prender y apagar el 🏭 lo corrige', r && r.manual==='No hay' && r.trasProd==='', r && [r.manual, r.trasProd]);
  chk('TX30h (VV5) con 5 en Moreno y 2 en camino para 6 vendidos, no dice «⛔ Ya falta»: se cubre trayendo de Moreno', r && r.moreno && !/Ya falta/.test(r.moreno), r && r.moreno);
  chk('TX30i (VV2) sin ningún «solo traer», el carril «Traer» aparece con «(+1 junto con un pedido)»', r && r.cinta===true && r.trSolo===0, r && [r.cinta, r.trSolo]);
  chk('TX30l (VI-7) «SOMIER» no propone el SOMIER BAHIA BEIGE ni «PEDIC» el ESPECIAL ORTOPEDICO (palabras enteras); «ECOFLEX» sí el NUEVO ECO FLEX',
      r && r.cand && r.cand.somier.indexOf(r.cand.KS1)<0 && r.cand.pedic.indexOf(r.cand.KS2)<0 && r.cand.eco.indexOf(r.cand.KE)>=0, r && r.cand);
  chk('TX30j «⚠️ Revisar saldo» sin nada que pedir no dice «pedí 0» ni «fabricar 0»', r && /Revisar saldo/.test(r.revisar||'') && !/pedí 0/.test(r.revisar||'') && !/fabricar 0/.test(r.revisar||''), r && (r.revisar||'').slice(0,300));
  await page._ctx.close();
  page = await abrir(browser, PEDIDOS, '2026-10-21T12:00:00-04:00');
  r = await corre(page, async () => ({ uno:stockFabricaTxt({ dias:4, medido:true, base:4, n:6 }, 'MORENO'),
                                       todas:stockFabricasTxt({ de:function(){ return { dias:4, medido:true, base:4, n:6 }; } }) }));
  chk('TX30k (VF6) el miércoles 21/10 con Moreno medido 4 días la barra dice «se entrega desde el lun 26/10», nunca el domingo 25',
      r && /lun 26\/10/.test(r.uno||'') && !/dom 25\/10/.test(r.uno||'') && /lun 26\/10/.test(r.todas||'') && !/dom 25/.test(r.todas||''), r);
  await page._ctx.close();

  chk('sin errores de JavaScript en ninguna de las páginas (también con «Más vistas» cerrado)', ERRS.length===0, ERRS.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
