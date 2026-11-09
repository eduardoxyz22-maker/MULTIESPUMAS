/* 🚚 LOS CHOFERES DEL 06/11/2026 Y QUE ROTAN. El dueño mandó la lista nueva: *«Carry Omar-Ysrael · Fotón nuevo Fernando-Luis Pierre ·
   Fotón encarpado Cristhian-Diego · Fotón insumo Miguel Melgar… Es rotativo sí»*.
   ⚠️ LO QUE CUIDA (rojo contra `b2ef22b`):
   1. La lista de cada camión; al elegir el camión se pone el PRIMERO (Carry → Omar).
   2. Como rotan, elegir un chofer de la lista de otro camión NO cambia el camión que el pedido ya tiene (antes lo pasaba al «suyo»).
      Un pedido SIN camión sí toma el de la lista (también desde el mapa).
   3. Un pedido viejo con un chofer que ya no está (Luis Eyzaguirre) lo sigue mostrando en su desplegable.
   4. El chofer que se muestra para un camión es el de sus pedidos (`choferDeCamion`), y si ninguno lo dice, el primero de la lista.
   Datos SINTÉTICOS.  Se corre:  node tests/test_choferes_rotan.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-06T10:42:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    window._guardados=[]; apiSave=function(p){ window._guardados.push(JSON.parse(JSON.stringify(p))); return Promise.resolve({ ok:true, pedido:p }); };
    var hoy=todayStr(), n=0;
    window.V=function(o){ n++; return Object.assign({ id:'r'+n, oc:'11-'+(800+n), cliente:'CLI '+n, fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', chofer:'', vehiculo:'',
      productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true, entregado:false, maps:'', ts:1, fotos:[] }, o); };
    STATE=[ V({ id:'a' }), V({ id:'b', vehiculo:'Carry', chofer:'Omar' }), V({ id:'c' }), V({ id:'d', vehiculo:'Foton nuevo', chofer:'Luis Eyzaguirre' }),
            V({ id:'e', vehiculo:'Foton encarpado', chofer:'Luis Pierre' }), V({ id:'f', vehiculo:'Foton encarpado', chofer:'Luis Pierre' }), V({ id:'g', vehiculo:'Foton encarpado', chofer:'Diego' }) ];
    showView('admin');
  });
  await page.waitForTimeout(300);

  console.log('\n── 1. La lista del 06/11 ──');
  let r = await ev(() => ({ v:JSON.parse(JSON.stringify(VEHICULOS)), todos:allChoferes() }));
  chk('1a. cada camión con sus choferes, como los mandó el dueño', JSON.stringify(r.v)===JSON.stringify({ 'Carry':['Omar','Ysrael'], 'Foton nuevo':['Fernando','Luis Pierre'],
    'Foton encarpado':['Cristhian','Diego'], 'Foton insumo':['Miguel Melgar'] }), r.v);
  chk('1b. siete choferes, sin Luis Eyzaguirre ni Giordano', r.todos.length===7 && r.todos.indexOf('Luis Eyzaguirre')<0 && r.todos.indexOf('Giordano')<0, r.todos);
  r = await ev(() => { setVehiculo('a','Carry'); var p=findById('a'); return { v:p.vehiculo, c:p.chofer }; });
  chk('1c. elegir el Carry pone a Omar, el primero de la lista', r.v==='Carry' && r.c==='Omar', r);

  console.log('\n── 2. Rotan: elegir el chofer no cambia el camión ──');
  r = await ev(() => { setChofer('b','Fernando'); var p=findById('b'); return { v:p.vehiculo, c:p.chofer }; });
  chk('2a. ⚠️ el Carry con Fernando (que figura en el Foton nuevo) sigue siendo el Carry', r.v==='Carry' && r.c==='Fernando', r.v+' / '+r.c);
  await page.waitForTimeout(500);   // el guardado sale un momento después (`guardarDurable`)
  r = await ev(() => ({ g:window._guardados.filter(function(x){ return x.id==='b'; }).pop() }));
  chk('2b. …y así se guarda', r.g && r.g.vehiculo==='Carry' && r.g.chofer==='Fernando', r.g && [r.g.vehiculo, r.g.chofer]);
  r = await ev(() => { setChofer('c','Miguel Melgar'); var p=findById('c'); return { v:p.vehiculo, c:p.chofer }; });
  chk('2c. un pedido SIN camión toma el de la lista del chofer (Miguel Melgar → Foton insumo)', r.v==='Foton insumo' && r.c==='Miguel Melgar', r);
  r = await ev(() => { MAPA_MARKERS={}; try{ asignarChoferMapa('g','Ysrael'); }catch(e){ return { err:String(e) }; } var p=findById('g'); return { v:p.vehiculo, c:p.chofer }; });
  chk('2d. desde el mapa, igual: el Foton encarpado con Ysrael sigue siendo el Foton encarpado', r.v==='Foton encarpado' && r.c==='Ysrael', r);

  console.log('\n── 3. El chofer que ya no está ──');
  r = await ev(() => ({ op:choferesParaSelect(findById('d')), veh:vehiculoDe(findById('d')), sel:choferSelect(findById('d')) }));
  chk('3a. el pedido de Luis Eyzaguirre lo sigue mostrando elegido en su desplegable', r.op.indexOf('Luis Eyzaguirre')>=0 && /<option selected>Luis Eyzaguirre<\/option>/.test(r.sel), r.op);
  chk('3b. …y sigue en su camión', r.veh==='Foton nuevo', r.veh);

  console.log('\n── 4. El chofer de un camión es el de sus pedidos ──');
  r = await ev(() => ({ enc:choferDeCamion('Foton encarpado', STATE), ins:choferDeCamion('Foton insumo', []), carry:choferDeCamion('Carry', STATE) }));
  chk('4a. el Foton encarpado hoy lo maneja Luis Pierre (2 de sus 3 pedidos)', r.enc==='Luis Pierre', r.enc);
  chk('4b. sin pedidos, el primero de la lista (Foton insumo → Miguel Melgar)', r.ins==='Miguel Melgar', r.ins);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
