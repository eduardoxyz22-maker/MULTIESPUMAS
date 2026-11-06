/* 👥 DOS VENDEDORES NUEVOS (02/11/2026, dueño: «añades dos nuevos vendedores Andrea orias y Fabián godoy»; los dos de Heaven,
   Andrea en la «Nueva tienda banzer» y Fabián en «Ventura mall»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Están en la lista de vendedores (formulario, «¿Quién está usando el panel?») y son de Heaven: marca, bancos BISA/Económico.
   2. Cada uno con su tienda: las ventas de tienda y «🏬 recoger de tienda» los ponen en la suya primero.
   3. Las tiendas nuevas están en la lista (RPT, venta de tienda, recoger de tienda, stock de tiendas) SIN zona ni pin inventados.
      (06/11) Ya con las del dueño: Tienda Banzer en el pin del almacén Banzer, zona Norte; Ventura Mall con su enlace, zona Sur.
   4. ⚠️ «Tienda Banzer» NO es el almacén Banzer: recoger de la tienda no reserva ni descuenta del almacén, la marca se guarda
      «Tienda Banzer» (sin «Tienda Tienda»), y una página sin F5 que la lea igual la toma como tienda.
   5. El bot (.gs): el mismo reparto de marcas que la página y «tu vendedor» para Fabián.
   6. Con ventas: Contabilidad (filtro, fichas de marca, caja de Heaven), Proyección, Cierre comercial, Retiros, «Quién vendió qué»,
      Clientes (Excel), Mis pedidos (los suyos y «👑 Ver todos») y «¿Quién está usando el panel?». Heaven suma lo de los dos.
   Datos SINTÉTICOS. Reloj clavado el martes 03/11/2026, 10:00 de Bolivia.
   Se corre:  node tests/test_vendedores_nuevos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-03T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(rec)) }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  });

  console.log('\n── 1. En la lista y de Heaven ──');
  let r = await ev(() => {
    var dl=document.getElementById('dl-vendedores'), ops=dl ? [].map.call(dl.querySelectorAll('option'), function(o){ return o.value||o.textContent; }) : [];
    return { lista:VENDEDORES.slice(), ops:ops, mA:marcaDe('Andrea Orias'), mF:marcaDe('Fabián Godoy'), mF2:marcaDe('Fabian Godoy'),
      bA:bancosDeVendedor('Andrea Orias').join(','), bF:bancosDeVendedor('FABIAN GODOY').join(',') };
  });
  chk('Andrea Orias y Fabián Godoy están en VENDEDORES', r.lista.indexOf('Andrea Orias')>=0 && r.lista.indexOf('Fabián Godoy')>=0, r.lista.join(' · '));
  chk('…y en la lista del campo «Vendedor» del formulario', r.ops.some(function(x){ return /Andrea Orias/.test(x); }) && r.ops.some(function(x){ return /Fabián Godoy/.test(x); }), r.ops.join(' · '));
  chk('…antes de Eduardo y ROHO (los vendedores van primero)', r.lista.indexOf('Fabián Godoy')<r.lista.indexOf('Eduardo Añez'), r.lista.join(' · '));
  chk('los dos son de Heaven (con o sin tilde)', r.mA==='heaven' && r.mF==='heaven' && r.mF2==='heaven', r);
  chk('…y cobran por QR con BISA y Económico, como el resto de Heaven', r.bA==='BISA,Económico' && r.bF==='BISA,Económico', r);

  console.log('\n── 2. Cada uno con su tienda ──');
  r = await ev(() => ({ a:sucursalDeVendedor('Andrea Orias'), f:sucursalDeVendedor('Fabián Godoy'), i:sucursalDeVendedor('Isabel Robledo'),
    // una venta de tienda vieja (sin la sucursal en la dirección) cae en la del vendedor
    va:sucursalDeVenta({ id:'t1', vendedor:'Andrea Orias', direccion:DIR_TIENDA, zona:ZONA_TIENDA, productos:[] }),
    vf:sucursalDeVenta({ id:'t2', vendedor:'Fabián Godoy', direccion:DIR_TIENDA+' · Ventura Mall', zona:ZONA_TIENDA, productos:[] }) }));
  chk('Andrea → Tienda Banzer, Fabián → Ventura Mall (Isabel sigue en Mia Plaza)', r.a==='Tienda Banzer' && r.f==='Ventura Mall' && r.i==='Mia Plaza', r);
  chk('…y sus ventas de tienda caen en su tienda', r.va==='Tienda Banzer' && r.vf==='Ventura Mall', r);

  console.log('\n── 3. Las tiendas nuevas, sin zona ni pin inventados ──');
  r = await ev(() => {
    var tb=sucursalDe('Tienda Banzer'), vm=sucursalDe('ventura mall');
    showView('form'); resetForm();
    llenarTiendaSuc();
    var sel=document.getElementById('f-tienda-suc'), ops=sel ? [].map.call(sel.options, function(o){ return o.value; }) : [];
    return { tb:tb, vm:vm, recoger:recogerTiendas(), tst:tstTiendas(), ops:ops, rpt:sucursalDeRpt({ cliente:'TIENDA BANZER' }), rpt2:sucursalDeRpt({ cliente:'Reposición Ventura Mall' }) };
  });
  chk('«Tienda Banzer» y «Ventura Mall» están en SUCURSALES', !!(r.tb && r.vm), r);
  /* (06/11) Cambiado a conciencia: el dueño dio las dos («la tienda banzer está en el mismo lugar que almacén banzer», «eso es zona NORTE»;
     Ventura «está en zona sur» con su enlace de Maps). Nada inventado: son sus palabras. */
  chk('las zonas son las que dio el dueño: Tienda Banzer → Norte, Ventura Mall → Sur', r.tb && r.tb.z==='Norte' && r.vm && r.vm.z==='Sur', r);
  const rp = await ev(() => { var tb=sucursalDe('Tienda Banzer'), c=coordsDeLink(tb.m), b=ALM_UBIC.filter(function(a){ return a.id==='banzer'; })[0];
    var vm=sucursalDe('Ventura Mall'), cv=coordsDeLink(vm.m);
    return { m:tb.m, c:c, b:b ? [b.lat, b.lng] : null, aprox:esUbicAprox(tb.m), cv:cv, aproxV:esUbicAprox(vm.m) }; });
  chk('la Tienda Banzer tiene el pin del almacén Banzer (el dueño: «está en el mismo lugar»), como puerta y no «la cuadra»',
    rp.c && rp.b && Math.abs(rp.c.lat-rp.b[0])<1e-6 && Math.abs(rp.c.lng-rp.b[1])<1e-6 && !rp.aprox, rp);
  chk('Ventura Mall con el pin de su enlace (-17.8160082, -63.214758), al sur de la plaza, como puerta',
    rp.cv && Math.abs(rp.cv.lat+17.8160082)<1e-6 && Math.abs(rp.cv.lng+63.214758)<1e-6 && rp.cv.lat<-17.7836 && !rp.aproxV, rp);
  chk('se pueden elegir en «¿de qué tienda?» de la venta de tienda', r.ops.indexOf('Tienda Banzer')>=0 && r.ops.indexOf('Ventura Mall')>=0, r.ops.join(' · '));
  chk('…en «🏬 recoger de tienda» y en el stock de las tiendas', r.recoger.indexOf('Tienda Banzer')>=0 && r.tst.indexOf('Ventura Mall')>=0, r.recoger.join(' · '));
  chk('una reposición a «TIENDA BANZER» o a «Ventura Mall» va a la tienda', r.rpt==='Tienda Banzer' && r.rpt2==='Ventura Mall', r);

  console.log('\n── 4. ⚠️ La Tienda Banzer NO es el almacén Banzer ──');
  r = await ev(() => {
    var guardado=null; var _set=setProdChk;
    setProdChk=function(id, i, chk, de){ guardado={ chk:chk, de:de }; };
    try{ tiendaElegir('p1', 0, 'Tienda Banzer'); } finally { setProdChk=_set; }
    var x={ chk:'im', chkDe:'Tienda Banzer' }, viejo={ chk:'im', chkDe:'Tienda Tienda Banzer' };
    return {
      guardado:guardado,
      t:recogeDeTienda(x), tViejo:recogeDeTienda(viejo), corto:recogerAlmCorto('Tienda Banzer'),
      clave:recogerClave('Tienda Banzer'), claveAlm:recogerClave('Banzer'),
      mismo:recogerMismo('Tienda Banzer','Banzer'), mismo2:recogerMismo('Tienda Banzer','01-05-025  Almacen Distribucion Banzer'),
      salida:almEsSalida('Tienda Banzer'), salidaAlm:almEsSalida('Banzer'),
      // el Excel de la tienda («TIENDA BANZER» en el sistema) NO se toma por el almacén de distribución, y el de distribución no por la tienda
      deFab:tstEsDeFabrica('TIENDA BANZER'), deFabAlm:tstEsDeFabrica('01-05-025  Almacen Distribucion Banzer'),
      tdaDe:tstTiendaDe('TIENDA BANZER'),
      retira:(fichaRetira({ id:'r1', direccion:'EL CLIENTE RETIRA EN TIENDA BANZER', observaciones:'' })||{}),
      retiraAlm:(fichaRetira({ id:'r2', direccion:'RECOGERÁ DE ALMACÉN BANZER', observaciones:'' })||{})
    };
  });
  chk('elegir la tienda guarda «Tienda Banzer», sin «Tienda Tienda»', r.guardado && r.guardado.chk==='im' && r.guardado.de==='Tienda Banzer', r.guardado);
  chk('…y se lee como la tienda (también una marca vieja con la palabra repetida)', r.t==='Tienda Banzer' && r.tViejo==='Tienda Banzer' && r.corto==='Tienda Banzer', r);
  chk('⚠️ su clave es de TIENDA y nunca «se parece» al almacén Banzer', r.clave==='tienda:tienda banzer' && r.claveAlm!==r.clave && !r.mismo && !r.mismo2, r);
  chk('⚠️ no es un almacén de salida (el almacén Banzer sí)', !r.salida && r.salidaAlm, r);
  chk('⚠️ su Excel entra en «Stock de las tiendas»; el del almacén de distribución no', !r.deFab && r.deFabAlm && r.tdaDe==='Tienda Banzer', r);
  chk('«retira en tienda Banzer» es la tienda; «almacén Banzer» sigue siendo el almacén', /Tienda Banzer/.test(JSON.stringify(r.retira)) && !/Tienda Banzer/.test(JSON.stringify(r.retiraAlm)) && /Banzer/.test(JSON.stringify(r.retiraAlm)), { t:r.retira, a:r.retiraAlm });

  r = await ev(() => {
    STOCK=stockVacio(); STOCK_CARGADO=true;
    var LOG='PRODUCTOS TERMINADOS FAB.', BZ='01-05-025  Almacen Distribucion Banzer';
    var K=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' });
    STOCK.c={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-2*3600000 }; STOCK.c.u[K]=2;
    STOCK.g={}; STOCK.g[BZ]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-2*3600000, rs:{} }; STOCK.g[BZ].u[K]=3;
    STOCK.al={}; STOCK.al[LOG]='log'; STOCK.al[BZ]='sale'; STOCK.p=[];
    STATE=[{ id:'p1', fecha:proximoDiaEntrega(), oc:'11-001', vendedor:'Andrea Orias', cliente:'DOÑA PRUEBA', celular:'70000000', turno:'AM', zona:'Norte',
      direccion:'Calle 1', maps:'', pagado:true, saldo:0, ts:Date.now()-3600000, metodoPago:'', observaciones:'', estado:'', entregado:false,
      vehiculo:'', chofer:'', garantia:'', nota:'1', acuenta:0, facturarA:'', nit:'1', nroDia:1, verificado:false, fotos:[],
      productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, chk:'im', chkDe:'Tienda Banzer' }] }];
    stockOlvidarIndice(); if(typeof SALDO_CACHE!=='undefined') SALDO_CACHE=null;
    var o=stockData().lista.filter(function(x){ return x.k===K; })[0]||{};
    return { comp:o.comp||0, hay:stockHaySalir(o) };
  });
  chk('⚠️ recoger de la Tienda Banzer no aparta nada del almacén Banzer ni de PTF', r.comp===0 && r.hay===5, r);

  console.log('\n── 5. El bot: la misma lista de marcas y «tu vendedor» para Fabián ──');
  {
    const html = fs.readFileSync(PEDIDOS, 'utf8'), gs = fs.readFileSync(GS, 'utf8');
    const bloque = html.slice(html.indexOf('var MARCAS=['), html.indexOf('];', html.indexOf('var MARCAS=[')) + 2);
    const MARCAS = vm.runInNewContext(bloque.replace('var MARCAS=', '(').replace(/;$/, ')'));
    const gb = gs.slice(gs.indexOf('var WA_MARCAS = ['), gs.indexOf('];', gs.indexOf('var WA_MARCAS = [')) + 2);
    const WA = vm.runInNewContext(gb.replace('var WA_MARCAS = ', '(').replace(/;$/, ')'));
    const heav = (MARCAS.filter(m => m.k === 'heaven')[0] || {}).vendedores || [];
    const waHeav = (WA.filter(m => /Heaven/.test(m.lbl))[0] || {}).vendedores || [];
    chk('en el .gs, Andrea y Fabián firman «Heaven Colchones»', waHeav.indexOf('Andrea Orias') >= 0 && waHeav.indexOf('Fabián Godoy') >= 0, waHeav.join(' · '));
    chk('…la misma lista que la página', heav.slice().sort().join('|') === waHeav.slice().sort().join('|'), { pag:heav, gs:waHeav });
    const ctx = {}; vm.createContext(ctx);
    const fn = gs.slice(gs.indexOf('function waNorm_('), gs.indexOf('}', gs.indexOf('function waNorm_(')) + 1) + '\n' +
      gs.slice(gs.indexOf('var WA_VENDEDOR_HOMBRE'), gs.indexOf('function waContactoVend_('));
    vm.runInContext(fn, ctx);
    chk('«tu vendedor» para Fabián (con o sin tilde) y «tu vendedora» para Andrea',
      ctx.waTuVend_('Fabián Godoy') === 'tu vendedor' && ctx.waTuVend_('FABIAN GODOY') === 'tu vendedor' && ctx.waTuVend_('Andrea Orias') === 'tu vendedora',
      [ctx.waTuVend_('Fabián Godoy'), ctx.waTuVend_('Andrea Orias')]);
  }

  console.log('\n── 6. Con ventas de verdad: salen en cada pantalla y suman para Heaven ──');
  /* Ventas SINTÉTICAS de noviembre: Andrea Bs 3.000 (entrega el 04/11) + una venta de tienda de Bs 1.500 en la Tienda Banzer (cargada el 02/11),
     Fabián Bs 2.000 (05/11), Isabel Bs 1.000 (Heaven, para comparar) y Mauricio Bs 800 (Sueña). Heaven = 7.500, Sueña = 800, total 8.300. */
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(200);             // showView relee con la foto de STATE de ese momento: después, el fixture
  r = await ev(() => {
    loadFromServer=function(){}; if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    var n=0;
    var V=function(vend, reg, fecha, bs, o){ o=o||{}; n++;
      return Object.assign({ id:'n'+n, oc:'11-'+(100+n), nota:String(900+n), vendedor:vend, cliente:'CLIENTE N'+n, celular:'7000000'+n, fecha:fecha, turno:fecha?'AM':'',
        productos:[{ desc:'COLCHON TITANIO', medida:'140x190', cant:1, precio:bs }], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
        zona:'Norte', direccion:'Calle '+n, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }, o); };
    STATE=[ V('Andrea Orias','2026-11-02','2026-11-04',3000),
            V('Andrea Orias','2026-11-02','',1500,{ direccion:DIR_TIENDA+' · Tienda Banzer', zona:ZONA_TIENDA, cliente:'CLIENTE TIENDA BANZER' }),
            V('Fabián Godoy','2026-11-02','2026-11-05',2000),
            V('Isabel Robledo','2026-11-02','2026-11-04',1000),
            V('Mauricio Merida','2026-11-02','2026-11-04',800) ];
    var out={};
    var fichas=function(id){ return [].slice.call(document.querySelectorAll('#'+id+' .mc')).map(function(e){ return e.innerText.replace(/\s+/g,' ').trim(); }); };
    var ver=function(vend){
      segSet('cta-tab','ventas'); setContaTab('ventas');
      llenarSelectContaVendedor(); var s=document.getElementById('cta-vendedor'); s.value=vend||'';
      document.getElementById('cta-search').value=''; document.getElementById('cta-mes').value='2026-11';
      segSet('cta-mode','mes'); setContaModo('mes'); segSet('cta-base','entrega'); setContaBase();
      return { top:fichas('cta-metrics'), marcas:fichas('cta-marcas'), tabla:(document.getElementById('cta-tbody')||document.body).innerText };
    };
    var ops=function(id){ var e=document.getElementById(id); return e ? [].map.call(e.options, function(o){ return o.value||o.textContent; }) : []; };
    out.todos=ver(''); out.ctaOps=ops('cta-vendedor'); out.cuaOps=ops('cua-vendedor');
    out.andrea=ver('Andrea Orias'); out.fabian=ver('Fabián Godoy');
    out.marca=totalPorMarca([{ p:STATE[0], monto:100 }, { p:STATE[2], monto:50 }, { p:STATE[4], monto:10 }]);
    // 📈 Proyección (con la contraseña)
    UNLOCKED=true; try{ mostrarBotonesTodos(); }catch(e){}
    segSet('cta-tab','proy'); setContaTab('proy'); try{ renderProyeccion(); }catch(e){ out.pryErr=String(e); }
    out.pry=(document.getElementById('pry-vendedores')||{}).innerText||'';
    out.pryV=pryVentas().filter(function(x){ return /Andrea|Fabi/.test(x.v); }).map(function(x){ return x.v+'|'+x.g+'|'+x.bs; });
    // 🏁 Cierre comercial: cada uno en su fila de Heaven
    try{ out.ccm=ccmDatos('2026-11').filas.filter(function(f){ return /Andrea|Fabi/.test(f.v); }).map(function(f){ return f.v+'|'+f.g+'|'+f.bs; }); }catch(e){ out.ccmErr=String(e); }
    // Las listas para elegir vendedor: Retiros, «Quién vendió qué», Clientes (Excel)
    try{ abrirRetiros(); }catch(e){ out.retErr=String(e); } out.ret=ops('ret-filtro-vend').concat(ops('ret-entrega')); try{ closeRetiros(); }catch(e){}
    try{ busLlenarVendedores(); }catch(e){} out.bus=ops('bus-vend');
    try{ out.cli=cliVendedores().map(function(x){ return typeof x==='string' ? x : (x.v||x.n||JSON.stringify(x)); }); }catch(e){ out.cliErr=String(e); }
    return out;
  });
  await page.waitForTimeout(50);
  const num = t => { const m = /Bs ([\d.]+,\d\d)/.exec(t || ''); return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN; };
  const heav = (r.todos && r.todos.marcas || []).filter(t => /HEAVEN/i.test(t))[0] || '', suen = (r.todos && r.todos.marcas || []).filter(t => /SUEÑA/i.test(t))[0] || '';
  chk('Contabilidad: los dos en el filtro de vendedor de Ventas y del Cuadre', ['Andrea Orias','Fabián Godoy'].every(v => (r.ctaOps||[]).indexOf(v)>=0 && (r.cuaOps||[]).indexOf(v)>=0), [r.ctaOps, r.__error]);
  chk('«Vendido en el período» Bs 8.300 y 💚 Heaven Bs 7.500 (Andrea 3.000 + su venta de tienda 1.500 + Fabián 2.000 + Isabel 1.000)', num(r.todos && r.todos.top[0])===8300 && num(heav)===7500, r.todos && [r.todos.top[0], r.todos.marcas]);
  chk('…🛏️ Sueña Bs 800 y ninguna venta en «⚠️ Sin marca»', num(suen)===800 && !(r.todos.marcas||[]).some(t => /SIN MARCA/i.test(t)), r.todos && r.todos.marcas);
  chk('con Andrea elegida: solo Heaven, Bs 4.500; con Fabián: Bs 2.000', num((r.andrea.marcas||[])[0])===4500 && num((r.fabian.marcas||[])[0])===2000 && /HEAVEN/i.test((r.andrea.marcas||[])[0]||''), [r.andrea.marcas, r.fabian.marcas]);
  chk('la plata que entra de sus ventas cuenta para la caja de Heaven', r.marca && r.marca.heaven.bs===150 && r.marca.suena.bs===10 && r.marca.otros.bs===0, r.marca);
  chk('📈 Proyección: los dos en «Por vendedor» y sus ventas son de Heaven', /Andrea Orias/.test(r.pry) && /Fabián Godoy/.test(r.pry) && !r.pryErr &&
      (r.pryV||[]).indexOf('Andrea Orias|heaven|3000')>=0 && (r.pryV||[]).indexOf('Fabián Godoy|heaven|2000')>=0, { err:r.pryErr, v:r.pryV, txt:(r.pry||'').slice(0,300) });
  chk('🏁 Cierre comercial: cada uno con su fila de Heaven y lo vendido', !r.ccmErr && (r.ccm||[]).some(x => /^Andrea Orias\|heaven\|4500/.test(x)) && (r.ccm||[]).some(x => /^Fabián Godoy\|heaven\|2000/.test(x)), [r.ccm, r.ccmErr]);
  chk('Retiros, «Quién vendió qué» y Clientes (Excel) los ofrecen', ['Andrea Orias','Fabián Godoy'].every(v => (r.ret||[]).indexOf(v)>=0 && (r.bus||[]).indexOf(v)>=0 && (r.cli||[]).some(x => x.indexOf(v)>=0)), { ret:r.ret, bus:r.bus, cli:r.cli, err:r.cliErr });

  // 📋 Mis pedidos: Andrea ve los suyos; «👑 Ver todos» la cuenta en el equipo. 👋 «¿Quién está usando el panel?» los ofrece.
  r = await ev(async () => {
    showView('mis'); await new Promise(res => setTimeout(res, 150));
    var inp=document.getElementById('mis-vendedor'); inp.value='Andrea Orias'; renderMis();
    var lista=(document.getElementById('mis-lista')||{}).innerText||'';
    MIS_TODOS=true; UNLOCKED=true; renderMis();
    var todos=document.body.innerText;
    MIS_TODOS=false;
    window.QUIEN_PRUEBA=true; try{ quienAbrir(true); }catch(e){}
    var quien=[].map.call(document.querySelectorAll('#quien .quien-b'), function(b){ return b.getAttribute('data-v')||''; }).filter(function(t){ return /Andrea|Fabi/.test(t); });
    try{ quienCerrar(); }catch(e){} window.QUIEN_PRUEBA=false;
    return { lista:lista, todos:/Andrea Orias/.test(todos) && /Fabián Godoy/.test(todos), quien:quien };
  });
  chk('📋 Mis pedidos de Andrea: sus dos ventas (y no las de Fabián)', /CLIENTE N1/.test(r.lista) && /CLIENTE TIENDA BANZER|N2/.test(r.lista) && !/CLIENTE N3/.test(r.lista), (r.lista||'').slice(0,300));
  chk('…«👑 Ver todos» los muestra a los dos', r.todos === true, r);
  chk('👋 «¿Quién está usando el panel?» tiene un botón para cada uno', r.quien && r.quien.some(t => /Andrea/.test(t)) && r.quien.some(t => /Fabi/.test(t)), r.quien);

  chk('sin errores de la página', !errores.length, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
