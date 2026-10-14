/* 🚀 LO DE LA TARDE QUE SALE CARGADO A LA MAÑANA (14/10, §4lb). El dueño: *«si un pedido está agendado para la tarde y Ernesto lo carga
   en la mañana y despacha, que avise al cliente que está cargado y en camino para entregarse en la mañana»* · *«Ernesto no va a
   "reprogramar": marcar entrega en la mañana eso ya es reprogramar»* · *«solo los pedidos de la tarde que se adelantan a la mañana»* ·
   *«debería ser automático, al marcar cargado y saliendo»*.
   ⚠️ LO QUE CUIDA (rojo contra lo publicado, `2bd1bf3`):
   1. «🚚 Ya salió» antes de las 12:00: los pedidos de HOY de ESE camión, de la TARDE, con todo tildado en «🌆 Tarde», pasan a la
      MAÑANA con `adelanto` y `forzar`; sus tildes pasan a «🌅 Mañana» y el camión ya no figura con carga pendiente.
   2. Se quedan como están: el de la tarde a medio cargar, el ✗ no hay, el de la mañana, el sin turno, el de otro camión, el entregado.
   3. Después de las 12:00 no se adelanta nada.
   4. El GPS: una salida de esta mañana, reciente, en un aparato de logística/Administración → lo mismo, una sola vez; una vieja (más
      de 60 min) o el mismo viaje que ya se marcó a mano, no; sin ser de logística, no.
   Datos SINTÉTICOS, reloj clavado en el miércoles 14/10/2026 10:42 de Bolivia.  Se corre:  node tests/test_adelanto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message));
  page.__resp=[]; page.on('dialog', d => { const r=page.__resp.length?page.__resp.shift():true; r?d.accept():d.dismiss(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-14T10:42:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const armar = () => ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    try{ localStorage.removeItem('me_adelanto_hecho'); }catch(e){} ADELANTO_MEM={};
    loadFromServer=function(){};
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)).concat([{ id:'__carga_chk__', observaciones:textoCargaChk(CARGA_CHK), rev:REESCRITA_REV&&REESCRITA_REV['__carga_chk__']||1 }]) }); };
    /* el servidor de mentira: anota lo que llega y lo devuelve con el sello siguiente */
    window._env=[];
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); window._env.push(c);
      if(c.action==='save'){ var p=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, version:'2026-10-14-a', pedido:p, mode:'update', ahora:Date.now() }); }
      return Promise.resolve({ ok:true, version:'2026-10-14-a' }); };
    var hoy=todayStr(), n=0;
    var V=function(o){ n++; return Object.assign({ id:'d'+n, oc:'10-'+(900+n), cliente:'CLI '+n, fecha:hoy, turno:'PM', vendedor:'Mirian Salazar', chofer:'Luis Pierre', vehiculo:'Carry',
      productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true, entregado:false, maps:'', ts:1, fotos:[], rev:5 }, o); };
    STATE=[
      V({ cliente:'ANA TARDE CARGADA' }),                                                                         // d1 → mañana
      V({ cliente:'BETO TARDE DOS COSAS', productos:[{ desc:'SOFT', medida:'160x200', cant:2, chk:'ok' }, { desc:'ALMOHADA FIBRA', medida:'50x70', cant:1, chk:'ok' }] }),   // d2 → mañana
      V({ cliente:'CARLA A MEDIO CARGAR', productos:[{ desc:'MEMORY FLEX', medida:'140x190', cant:1, chk:'ok' }, { desc:'SOMIER ORO', medida:'140x190', cant:1, chk:'ok' }] }),   // d3 se queda
      V({ cliente:'DANI DE LA MAÑANA', turno:'AM' }),                                                            // d4 se queda
      V({ cliente:'ELSA OTRO CAMION', vehiculo:'Foton nuevo', chofer:'Luis Eyzaguirre' }),                         // d5 se queda (por ahora)
      V({ cliente:'FABIO NO HAY', productos:[{ desc:'BAHIA', medida:'140x190', cant:1, chk:'no' }] }),             // d6 se queda
      V({ cliente:'GINA SIN TURNO', turno:'' }),                                                                  // d7 se queda
      V({ cliente:'HUGO ENTREGADO', entregado:true }),                                                            // d8 se queda
      V({ cliente:'IVAN MAÑANA PASADO', fecha:proximoDiaEntrega() })                                               // d9 se queda (otro día)
    ];
    CARGA_CHK={}; CARGA_CAMBIOS={};
    var t=function(veh, prod, turno){ CARGA_CHK[cargaChkKey(hoy, veh, prod, '', turno)]=1; };
    t('Carry','TITANIO LATEX 140x190','PM'); t('Carry','SOFT 160x200','PM'); t('Carry','ALMOHADA FIBRA 50x70','PM');
    t('Carry','MEMORY FLEX 140x190','PM');                         // a CARLA le falta el somier
    t('Carry','TITANIO LATEX 140x190','AM');                        // DANI (mañana) y GINA (sin turno = mañana)
    t('Carry','BAHIA 140x190','PM');                                // FABIO: tildado, pero ✗ no hay
    t('Foton nuevo','TITANIO LATEX 140x190','PM');                  // ELSA
    CV_DIA='hoy'; showView('admin');
  });
  await armar();
  await page.waitForTimeout(300);

  console.log('\n── 1. «🚚 Ya salió» a las 10:42: lo de la tarde que va entero, a la mañana ──');
  page.__resp=[true];   // le falta tildar el somier de CARLA: «¿Salió igual?» → sí
  let r = await ev(async () => {
    var antes=STATE.map(function(p){ return p.id+':'+p.turno; }).join(' ');
    camionSalioMarcar('Carry', true);
    await new Promise(function(res){ setTimeout(res, 900); });
    var t={}; STATE.forEach(function(p){ t[p.cliente]=p.turno; });
    var saves=window._env.filter(function(c){ return c.action==='save' && c.pedido && String(c.pedido.id).indexOf('__')!==0; });
    var chk=window._env.filter(function(c){ return c.action==='save' && c.pedido && c.pedido.id==='__carga_chk__'; }).pop();
    var hoy=todayStr(), d1=findById('d1'), d2=findById('d2');
    return { antes:antes, t:t,
      saves:saves.map(function(c){ return c.pedido.cliente+'|'+c.pedido.turno+'|adel='+(c.adelanto||0)+'|forzar='+(c.forzar?1:0); }),
      amKeys:[isCargaChk(cargaChkKey(hoy,'Carry','TITANIO LATEX 140x190','','AM')), isCargaChk(cargaChkKey(hoy,'Carry','SOFT 160x200','','AM')), isCargaChk(cargaChkKey(hoy,'Carry','ALMOHADA FIBRA 50x70','','AM'))],
      cargados:[depCargado(d1, d1.productos[0]).u, depCargado(d2, d2.productos[0]).u, depCargado(d2, d2.productos[1]).u],
      celda:chk ? chk.pedido.observaciones : '',
      toast:(document.getElementById('toast')||{}).textContent||'' };
  });
  chk('ANA y BETO (de la tarde, todo tildado en «🌆 Tarde» del Carry) pasan a la MAÑANA', r.t && r.t['ANA TARDE CARGADA']==='AM' && r.t['BETO TARDE DOS COSAS']==='AM', r.t);
  chk('…cada uno guardado con `adelanto` y `forzar` (el día ya está cerrado), y ningún otro pedido se tocó',
      r.saves && r.saves.length===2 && r.saves.indexOf('ANA TARDE CARGADA|AM|adel=1|forzar=1')>=0 && r.saves.indexOf('BETO TARDE DOS COSAS|AM|adel=1|forzar=1')>=0, r.saves);
  chk('se quedan: CARLA (le falta el somier), FABIO (✗ no hay), DANI (mañana), GINA (sin turno), ELSA (otro camión), HUGO (entregado), IVAN (otro día)',
      r.t['CARLA A MEDIO CARGAR']==='PM' && r.t['FABIO NO HAY']==='PM' && r.t['DANI DE LA MAÑANA']==='AM' && r.t['GINA SIN TURNO']==='' && r.t['ELSA OTRO CAMION']==='PM' && r.t['HUGO ENTREGADO']==='PM' && r.t['IVAN MAÑANA PASADO']==='PM', r.t);
  chk('sus tildes pasan a «🌅 Mañana»: el camión que salió no figura con su carga pendiente', r.amKeys.every(Boolean) && JSON.stringify(r.cargados)==='[1,2,1]', { am:r.amKeys, cargados:r.cargados });
  chk('…y van a la fila de los tildes de la carga, para todo el equipo', /\|Carry\|SOFT 160x200(?!\|~PM)/.test(r.celda) && /🚚 SALIÓ\|10:42/.test(r.celda), r.celda);
  chk('el aviso lo dice: «salió a las 10:42 con 2 pedidos de la TARDE… pasan a la MAÑANA (ANA…, BETO…). El bot les avisa»', /10:42 con 2 pedidos de la TARDE/.test(r.toast) && /pasan a la MAÑANA/.test(r.toast) && /ANA TARDE CARGADA/.test(r.toast) && /bot les avisa/.test(r.toast), r.toast);
  r = await ev(async () => { var n=window._env.length; adelantoAlSalir('Carry', '10:50'); await new Promise(function(res){ setTimeout(res, 300); });
    return window._env.filter(function(c, i){ return i>=n && c.action==='save' && String(c.pedido.id).indexOf('__')!==0; }).length; });
  chk('volver a revisar el mismo camión no guarda nada (ya no son de la tarde)', r===0, r);

  console.log('\n── 2. Después de las 12:00 no se adelanta ──');
  await page.clock.setFixedTime(new Date('2026-10-14T12:05:00-04:00'));
  r = await ev(async () => { var n=window._env.length; camionSalioMarcar('Foton nuevo', true); await new Promise(function(res){ setTimeout(res, 500); });
    return { hora:camionSalio(todayStr(), 'Foton nuevo'), elsa:findById('d5').turno, saves:window._env.filter(function(c, i){ return i>=n && c.action==='save' && String(c.pedido.id).indexOf('__')!==0; }).length }; });
  chk('el Foton nuevo sale a las 12:05: ELSA (tarde, cargada) sigue en la tarde', r.hora==='12:05' && r.elsa==='PM' && r.saves===0, r);

  console.log('\n── 3. El GPS ──');
  await page.clock.setFixedTime(new Date('2026-10-14T10:42:00-04:00'));
  await armar();
  r = await ev(async () => {
    window.ADELANTO_PRUEBA=true;
    var hoy=todayStr();
    gpsDiaTomar({ f:hoy, t:Date.now(), u:{ '6409TIG':{ s:'10:20', ul:'10:20' }, '6663CCP':{ s:'08:30', ul:'08:30' } } });
    adelantoRevisarGps();
    await new Promise(function(res){ setTimeout(res, 1200); });
    var saves=window._env.filter(function(c){ return c.action==='save' && String(c.pedido.id).indexOf('__')!==0; });
    var n=window._env.length;
    adelantoRevisarGps();   // la lectura siguiente: la misma salida ya se revisó
    await new Promise(function(res){ setTimeout(res, 600); });
    return { ana:findById('d1').turno, beto:findById('d2').turno, elsa:findById('d5').turno,
      saves:saves.map(function(c){ return c.pedido.cliente+'|adel='+(c.adelanto||0); }),
      otra:window._env.filter(function(c, i){ return i>=n && c.action==='save' && String(c.pedido.id).indexOf('__')!==0; }).length };
  });
  chk('el GPS vio salir al Carry a las 10:20 (hace 22 min): ANA y BETO pasan a la mañana con `adelanto`', r.ana==='AM' && r.beto==='AM' && r.saves && r.saves.length===2 && r.saves.every(function(s){ return /adel=1$/.test(s); }), r);
  chk('el Foton nuevo salió a las 08:30 (hace más de 60 min): lo tildado después no es lo que se llevó, ELSA sigue en la tarde', r.elsa==='PM', r);
  chk('la lectura siguiente no repite nada', r.otra===0, r);

  await armar();
  r = await ev(async () => {
    window.ADELANTO_PRUEBA=true; var hoy=todayStr();
    CARGA_CHK[cargaChkKey(hoy, 'Carry', CARGA_SALIO)+'|10:25']=1;      // logística ya marcó «Ya salió» a mano (y se revisó en ese momento)
    gpsDiaTomar({ f:hoy, t:Date.now()+1000, u:{ '6409TIG':{ s:'10:20', ul:'10:20' } } });
    adelantoRevisarGps(); await new Promise(function(res){ setTimeout(res, 800); });
    var a=findById('d1').turno;
    UNLOCKED=false; try{ localStorage.removeItem(LS_ADM_DEV); }catch(e){} quienRol('');
    delete CARGA_CHK[cargaChkKey(hoy, 'Carry', CARGA_SALIO)+'|10:25'];
    gpsDiaTomar({ f:hoy, t:Date.now()+2000, u:{ '6409TIG':{ s:'10:21', ul:'10:21' } } });
    adelantoRevisarGps(); await new Promise(function(res){ setTimeout(res, 800); });
    return { mano:a, vendedora:findById('d1').turno, adm:asisVeAdm() };
  });
  chk('si ya se marcó «Ya salió» a mano para ese viaje, el GPS no lo vuelve a hacer', r.mano==='PM', r);
  chk('en el aparato de una vendedora (no logística ni Administración), el GPS no mueve nada', r.adm===false && r.vendedora==='PM', r);

  chk('sin errores de la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exitCode = FAIL ? 1 : 0;
})();
