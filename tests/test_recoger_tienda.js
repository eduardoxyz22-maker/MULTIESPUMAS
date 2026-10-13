/* 🏬 RECOGER DE UNA TIENDA (13/10, dueño, con la ficha de un pedido: «a veces no hay stock en fábrica y los vendedores piden que
   recojan de sus tiendas; falta el botón "tienda" y elegir la sucursal»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. La ficha tiene «🏬 Tienda»: abre las sucursales propias (sin Tiendas Roho), con la del vendedor primero.
   2. Elegir una marca la línea como un 📥 de esa tienda (chk 'im' + chkDe 'Tienda <sucursal>'): el botón dice la sucursal, el
      renglón, el estado del pedido y la columna «Sale de» la nombran, y la fila queda «a recoger». Tocarla otra vez la saca.
   3. Lo de una tienda NO es stock del panel: no se reserva (comp), no baja PTF al entregarse y no cuenta en el control del Excel;
      la venta SÍ cuenta para la rotación.
   4. La revisión automática no la toca ni la reserva de PTF/Banzer/Moreno, y lo dice («🏬 se recogen de una tienda»).
   5. Una tienda nunca «se parece» a un almacén (`recogerMismo`), y el IM de siempre sigue andando.
   6. «📍 Lo del día, por lugar» la pone en su columna; la Lista de carga y el chofer dicen «recoger de Tienda …».
   Datos SINTÉTICOS. Reloj clavado el miércoles 14/10/2026, 10:00 de Bolivia.
   Se corre:  node tests/test_recoger_tienda.js   (dientes: PEDIDOS=<panel viejo> node tests/test_recoger_tienda.js) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._saves=[];
    apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(rec)) }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    window.LOG='PRODUCTOS TERMINADOS FAB.'; window.IMN='IM - PRODUCTOTERMINADO';
    window.K=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' });
    window._tit=function(n,x){ return Object.assign({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:n }, x||{}); };
    window._P=function(o){ return Object.assign({ id:'p1', fecha:todayStr(), oc:'10-254', vendedor:'Maria Flores', cliente:'DON PRUEBA', celular:'70000000',
      turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false,
      vehiculo:'Foton nuevo', chofer:'Luis Eyzaguirre', garantia:'', nota:'1503', acuenta:0, facturarA:'', nit:'1', nroDia:1, verificado:false, fotos:[] }, o); };
    window._alm=function(aca, im){
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-2*3600000 }; STOCK.c.u[K]=aca;
      STOCK.g={}; if(im!=null){ STOCK.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-2*3600000, rs:{} }; STOCK.g[IMN].u[K]=im; }
      STOCK.al={}; STOCK.al[LOG]='log'; if(im!=null) STOCK.al[IMN]='otro'; STOCK.p=[];
      stockOlvidarIndice(); REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
    };
    window._fila=function(){ return stockData().lista.filter(function(o){ return o.k===K; })[0]||{}; };
    window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._txt=function(el){ return el ? el.textContent.replace(/\s+/g,' ').trim() : ''; };
  });

  console.log('\n── 1. El botón «🏬 Tienda» en la ficha: las tiendas propias, la del vendedor primero ──');
  let r = await ev(async () => {
    _alm(0, 0);
    STATE=[ _P({ id:'a', fecha:stockSumarDias(todayStr(),1), productos:[_tit(2)] }) ];
    showPedidoModal('a'); await _esperar(60);
    var btn=[].filter.call(document.querySelectorAll('#modal-box .chkbtn'), function(b){ return /Tienda/.test(b.textContent); })[0];
    var hay=!!btn; if(btn) btn.click(); await _esperar(60);
    var ops=[].map.call(document.querySelectorAll('#modal-box .tda-elige button'), function(b){ return _txt(b); });
    return { hay:hay, ops:ops };
  });
  chk('la ficha tiene «🏬 Tienda» al lado de «📥 IM»', r.hay, r);
  chk('…abre las tiendas propias, sin Tiendas Roho (es de ROHO)', r.ops && r.ops.length===6 && !r.ops.some(function(t){ return /Roho/i.test(t); }), r.ops);
  chk('…con la de la vendedora primero (María Flores → Buenos Aires)', r.ops && /^Buenos Aires · de Maria/.test(r.ops[0]||''), r.ops && r.ops[0]);

  console.log('\n── 2. Elegir una tienda marca la línea; tocarla otra vez la saca ──');
  r = await ev(async () => {
    var b=[].filter.call(document.querySelectorAll('#modal-box .tda-elige button'), function(b){ return /^Mia Plaza/.test(_txt(b)); })[0];
    b.click(); await _esperar(80);
    var p=findById('a'), x=p.productos[0], g=((window._saves[window._saves.length-1]||{}).productos||[])[0]||{};
    var btn=[].filter.call(document.querySelectorAll('#modal-box .chkbtn'), function(b){ return /🏬/.test(b.textContent) && !b.closest('.tda-elige'); })[0];
    var out={ chk:x.chk, de:x.chkDe, gChk:g.chk, gDe:g.chkDe, btn:_txt(btn), on:!!(btn && btn.classList.contains('tda')), abierta:!!document.querySelector('#modal-box .tda-elige'),
      tag:prodLugarTag(x).replace(/<[^>]+>/g,'').trim(), estado:estadoStock(p).txt, fila:rowKind(p), sale:pedidoLugaresHtml(p).replace(/<[^>]+>/g,'').trim(),
      ver:p.verificado, rec:esRecoger(x), tienda:recogeDeTienda(x), corto:recogerCorto(x) };
    btn.click(); await _esperar(60);
    var b2=[].filter.call(document.querySelectorAll('#modal-box .tda-elige button'), function(b){ return /^Mia Plaza/.test(_txt(b)); })[0];
    out.onEnLista=!!(b2 && b2.classList.contains('tda'));
    b2.click(); await _esperar(60);
    out.despues=findById('a').productos[0].chk||''; out.despuesDe=findById('a').productos[0].chkDe||'';
    return out;
  });
  chk('elegir «Mia Plaza» guarda la línea como 📥 de «Tienda Mia Plaza» (chk im + chkDe), también en lo que va a la planilla', r.chk==='im' && r.de==='Tienda Mia Plaza' && r.gChk==='im' && r.gDe==='Tienda Mia Plaza', r);
  chk('…el botón dice «🏬 Mia Plaza» encendido y la lista se cierra', r.btn==='🏬 Mia Plaza' && r.on && !r.abierta, r);
  chk('…el renglón y la columna «Sale de» dicen «🏬 Tienda Mia Plaza»', r.tag==='🏬 Tienda Mia Plaza' && r.sale==='🏬 Tienda Mia Plaza', [r.tag, r.sale]);
  chk('…el pedido queda «Recoger de Tienda Mia Plaza», sin verificar y con la fila de «a recoger»', /Recoger de Tienda Mia Plaza/.test(r.estado) && r.fila==='im' && r.ver===false && r.rec && r.tienda==='Mia Plaza' && r.corto==='Tienda Mia Plaza', r);
  chk('tocar la tienda elegida otra vez saca la marca', r.onEnLista && r.despues==='' && r.despuesDe==='', [r.onEnLista, r.despues, r.despuesDe]);

  console.log('\n── 3. Lo de una tienda no es stock del panel: ni reserva ni baja PTF; la venta sí cuenta para la rotación ──');
  r = await ev(() => {
    _alm(2, 5);
    var ay=stockSumarDias(todayStr(),-1), m1=stockSumarDias(todayStr(),1);
    STATE=[ _P({ id:'t', fecha:m1, productos:[_tit(3, { chk:'im', chkDe:'Tienda Central' })] }),
            _P({ id:'n', fecha:m1, oc:'10-255', productos:[_tit(1)] }) ];
    var o=_fila(), comp=o.comp, v=o.vendidos, vr=o.vendidosRotacion;
    var cmp=stockComprometido(K, stockSumarDias(todayStr(),30));
    /* entregados ayer: lo de la tienda no baja PTF (el Excel de hoy 08:00 ya lo… no: el control mira la ventana del día) */
    STATE=[ _P({ id:'t2', fecha:ay, entregado:true, productos:[_tit(3, { chk:'im', chkDe:'Tienda Central' })] }),
            _P({ id:'n2', fecha:ay, oc:'10-256', entregado:true, productos:[_tit(1, { chk:'ok' })] }) ];
    var sal=stockSalidas(K, stockSumarDias(todayStr(),-5), todayStr());
    var o2=_fila();
    /* lo mismo con «📥 IM» (Moreno): ese sí espera stock — la regla de siempre no cambió */
    STATE=[ _P({ id:'m', fecha:m1, productos:[_tit(3, { chk:'im' })] }) ];
    var o3=_fila();
    return { comp:comp, v:v, vr:vr, cmp:cmp, sal:sal, vr2:o2.vendidosRotacion, comp3:o3.comp };
  });
  chk('⚠️ 3 «🏬 Tienda Central» + 1 sin marcar: lo comprometido de acá es 1 (no 4)', r.comp===1 && r.cmp===1, r);
  chk('entregadas: lo de la tienda no sale de PTF (salidas = 1)', r.sal===1, r);
  chk('…pero SÍ cuenta como venta para la rotación (4 vendidos ayer: 3 de la tienda + 1)', r.vr2===4, r);
  chk('«📥 IM» (Moreno) sigue esperando stock como siempre (comp 3)', r.comp3===3, r);

  console.log('\n── 4. La revisión automática no toca lo marcado de una tienda ni lo reserva ──');
  r = await ev(() => {
    _alm(1, 0);
    var m1=stockSumarDias(todayStr(),1), m2=stockSumarDias(todayStr(),2);
    STATE=[ _P({ id:'t', fecha:m1, productos:[_tit(1, { chk:'im', chkDe:'Tienda Charcas' })] }),
            _P({ id:'n', fecha:m2, oc:'10-257', productos:[_tit(1)] }) ];
    var R=stockAsignar(), lin={};
    R.pedidos.forEach(function(p){ (p.lineas||[]).forEach(function(l){ lin[p.p ? p.p.id : (p.id||'?')]=l.ahora; }); });
    var tocaT=R.pedidos.some(function(p){ return ((p.p||p).id)==='t'; });
    var ln=(R.pedidos.filter(function(p){ return ((p.p||p).id)==='n'; })[0]||{}).lineas||[];
    return { tocaT:tocaT, n:ln.map(function(l){ return l.ahora; }), deTienda:R.tot.deTienda, faltan:(R.faltan||[]).length };
  });
  chk('⚠️ la revisión no propone nada para la línea de la tienda', r.tocaT===false, r);
  chk('…y la unidad de PTF queda para el otro pedido («✔ hay»), no se la come la de la tienda', JSON.stringify(r.n)==='["ok"]', r);
  chk('…y lo cuenta: «🏬 se recogen de una tienda» = 1', r.deTienda===1, r);

  console.log('\n── 5. Una tienda nunca se parece a un almacén; el IM de siempre sigue andando ──');
  r = await ev(() => ({ a:recogerMismo('Tienda Central','01-05-099 ALMACEN CENTRAL'), b:recogerMismo('Tienda Central','tienda central'), c:recogerMismo('Tienda Central','Tienda Charcas'),
    d:recogerMismo('','IM - PRODUCTOTERMINADO'), e:recogeTiendaDe('IM - PRODUCTOTERMINADO'), f:recogerAlmCorto(''), g:recogerAlmCorto('Tienda mia plaza') }));
  chk('«Tienda Central» ≠ «ALMACEN CENTRAL»; «tienda central» = «Tienda Central»; Central ≠ Charcas', r.a===false && r.b===true && r.c===false, r);
  chk('IM sigue siendo IM («' + r.f + '»), y una tienda escrita en minúsculas sale con su nombre', r.d===true && r.e==='' && r.f==='IM' && r.g==='Tienda Mia Plaza', r);

  console.log('\n── 6. «Lo del día, por lugar», la Lista de carga y el chofer ──');
  r = await ev(async () => {
    _alm(5, 0);
    STATE=[ _P({ id:'t', productos:[_tit(2, { chk:'im', chkDe:'Tienda Mutualista' }), _tit(1, { desc:'TITANIO LATEX', codigo:'CH1210', chk:'ok' })] }) ];
    ADM_LUG_DIA='hoy'; var D=admLugaresDatos(todayStr()), h=admLugaresHtml().replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    var G=cargaAgrupar(STATE), V=G.byV['Foton nuevo'], alm=Object.keys(V.prodAlm[cargaProdKey(STATE[0].productos[0])]||{});
    var cv=cargaVivaDatos(), lin=(cv.porK['Foton nuevo']||{}).lineas||[], l0=lin.filter(function(l){ return l.rec>0; })[0]||{};
    return { tda:D.C.tda.map(function(x){ return x.de+' '+x.u; }), trae:D.C.trae.length, h:/🏬 Tienda · ir a buscar/.test(h), alm:alm, cvAlm:l0.alm||'', cvIm:Object.keys(cv.im.alm) };
  });
  chk('«📍 Lo del día, por lugar» la pone en «🏬 Tienda · ir a buscar» (Mutualista 2), no en Moreno', JSON.stringify(r.tda)==='["Mutualista 2"]' && r.trae===0 && r.h, r);
  chk('la Lista de carga y los camiones la nombran «Tienda Mutualista»', JSON.stringify(r.alm)==='["Tienda Mutualista"]' && r.cvAlm==='Tienda Mutualista' && JSON.stringify(r.cvIm)==='["Tienda Mutualista"]', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
