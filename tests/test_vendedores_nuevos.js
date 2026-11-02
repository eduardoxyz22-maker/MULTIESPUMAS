/* 👥 DOS VENDEDORES NUEVOS (02/11/2026, dueño: «añades dos nuevos vendedores Andrea orias y Fabián godoy»; los dos de Heaven,
   Andrea en la «Nueva tienda banzer» y Fabián en «Ventura mall»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Están en la lista de vendedores (formulario, «¿Quién está usando el panel?») y son de Heaven: marca, bancos BISA/Económico.
   2. Cada uno con su tienda: las ventas de tienda y «🏬 recoger de tienda» los ponen en la suya primero.
   3. Las tiendas nuevas están en la lista (RPT, venta de tienda, recoger de tienda, stock de tiendas) SIN zona ni pin inventados.
   4. ⚠️ «Tienda Banzer» NO es el almacén Banzer: recoger de la tienda no reserva ni descuenta del almacén, la marca se guarda
      «Tienda Banzer» (sin «Tienda Tienda»), y una página sin F5 que la lea igual la toma como tienda.
   5. El bot (.gs): el mismo reparto de marcas que la página y «tu vendedor» para Fabián.
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
  chk('⚠️ sin zona ni ubicación hasta que el dueño las dé (una zona inventada desvía la ruta)', r.tb && !r.tb.z && !r.tb.m && r.vm && !r.vm.z && !r.vm.m, r);
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

  chk('sin errores de la página', !errores.length, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
