/* 🛰️ EL GPS COMPLETA EL CAMIÓN QUE FALTÓ (13/11/2026, idea 133, dueño: «136, 143, 129, 133»; bitácora §4po).
   Un pedido de HOY sin camión asignado que el GPS vio en su puerta: el panel PROPONE «lo llevó <camión> · <chofer>» y una persona
   lo acepta de a uno o «Asignar los N». Nada se asigna solo.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. La propuesta sale para el pedido sin camión que vio el GPS, con el camión que se paró y el chofer de los pedidos de ese camión hoy
      (rotan, §4om: Luis Pierre, no el primero de la lista); con un camión sin pedidos hoy, el primero de la lista (Carry → Omar).
   2. No sale para: un pedido que ya tiene camión, uno de otro día, una venta de tienda, uno que retira el cliente, uno que no vio.
   3. Mirar no guarda nada. El cartel de Administración (tabla y fichas) dice los N y lleva «Asignar los N».
   4. «Asignar» pone camión y chofer, guarda con guardarDurable y la propuesta se va.
   5. «Asignar los N» asigna todos los que quedan (un guardado por pedido) y el cartel se va.
   6. Cierre de entregas: la fila del que vio el GPS sin camión dice «· lo llevó <camión>» con su «Asignar», y el resumen lo cuenta.
   7. Sin el día del GPS: nada.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 15:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_gps_camion.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_CIERRE_PEND); localStorage.removeItem('me_gps_dia'); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    var hoy=todayStr(), P=almUbic('ptf'), n=0;
    var pin=function(i){ return { lat:P.lat+0.02*i, lng:P.lng+0.01 }; };
    var V=function(id, veh, i, o){ n++; return Object.assign({ id:id, oc:'11-'+(800+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', vehiculo:veh,
      chofer:veh?(VEHICULOS[veh]||[])[0]:'', zona:'Norte', direccion:'Calle '+n, productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true,
      entregado:false, maps:'https://www.google.com/maps?q='+pin(i).lat+','+pin(i).lng, ts:1, fotos:[], rev:1 }, o||{}); };
    STATE=[
      V('c1', 'Foton nuevo', 1, { chofer:'Luis Pierre' }),                      // el Foton nuevo hoy lo maneja Luis Pierre (rotan)
      V('s1', '', 2),                                                              // sin camión, el Foton nuevo se paró en su puerta
      V('s2', '', 3, { turno:'PM' }),                                              // sin camión, el Carry (sin pedidos hoy) se paró en su puerta
      V('s3', '', 4),                                                              // sin camión, nadie se paró
      V('w1', 'Foton encarpado', 5),                                               // con camión: no se propone aunque otro se paró ahí
      V('t1', '', 6, { direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA' }),   // venta de tienda
      V('r1', '', 7, { observaciones:'EL CLIENTE RECOGE DE FABRICA' }),           // la retira el cliente
      V('o1', '', 8, { fecha:proximoDiaEntrega() })                                // otro día
    ];
    window.__DIA={ f:hoy, t:Date.now(), u:{
      '6663CCP':{ s:'09:00', ev:[['09:00','sal','ptf',0]], par:[
        ['10:00','10:10', pin(1).lat, pin(1).lng, ['c1'], 0, 20],
        ['10:20','10:42', pin(2).lat, pin(2).lng, ['s1'], 0, 40],
        ['11:00','11:10', pin(5).lat, pin(5).lng, ['w1'], 0, 15],
        ['11:20','11:30', pin(6).lat, pin(6).lng, ['t1'], 0, 15],
        ['11:40','11:50', pin(7).lat, pin(7).lng, ['r1'], 0, 15],
        ['12:00','12:10', pin(8).lat, pin(8).lng, ['o1'], 0, 15] ] },
      '6409TIG':{ s:'09:30', ev:[['09:30','sal','ptf',0]], par:[ ['10:50','11:05', pin(3).lat, pin(3).lng, ['s2'], 0, 30] ] } } };
    gpsDiaTomar(JSON.parse(JSON.stringify(window.__DIA)));
    window.__SAVES=[];
    apiSave=function(rec){ window.__SAVES.push(JSON.parse(JSON.stringify(rec))); var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    QUICK_FILTER='todos'; ADM_HOY_DEF=false;
  });

  console.log('\n── 1-2. Qué se propone y qué no ──');
  let r = await ev(() => {
    var V=gpsCamionPropuestas();
    return { V:V.map(function(o){ return o.p.id+'→'+o.veh+'·'+o.chofer; }), dia:gpsDiaHay(),
      no:['c1','s3','w1','t1','r1','o1'].map(function(id){ return id+':'+(gpsCamionPropDe(findById(id))?'SÍ':'no'); }),
      ll:['w1','t1','r1'].map(function(id){ var l=gpsLlegadaDe(findById(id)); return id+':'+(l?l.veh:'-'); }), saves:window.__SAVES.length };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('s1 (sin camión, el Foton nuevo en su puerta) → «Foton nuevo · Luis Pierre» (el chofer de hoy del camión, no el primero de la lista)', r.V && r.V[0]==='s1→Foton nuevo·Luis Pierre', r);
  chk('s2 (el Carry, sin pedidos hoy) → «Carry · Omar» (el primero de la lista); en el orden en que el GPS los vio', r.V && r.V.length===2 && r.V[1]==='s2→Carry·Omar', r.V);
  chk('no se propone: con camión (c1, w1), no visto (s3), venta de tienda (t1), la retira el cliente (r1), otro día (o1)', r.no && r.no.every(function(x){ return /:no$/.test(x); }), r.no);
  chk('…aunque el GPS sí se paró en la puerta de w1, t1 y r1 (la regla es del camión que falta, no del GPS)', r.ll && r.ll.join(',')==='w1:Foton nuevo,t1:Foton nuevo,r1:Foton nuevo', r.ll);
  chk('mirar no guarda nada', r.saves===0, r.saves);

  console.log('\n── 3. El cartel en Administración ──');
  r = await ev(() => {
    showView('admin'); renderAdmin();
    var el=document.getElementById('adm-gps-ent'), bar=el.querySelector('#gps-cam-bar');
    var out={ hidden:el.hidden, txt:bar ? bar.innerText.replace(/\s+/g,' ').trim() : '', filas:bar ? [].map.call(bar.querySelectorAll('.gps-cam-f'), function(f){ return f.getAttribute('data-id'); }) : [],
      todos:(document.getElementById('gps-cam-todos')||{}).textContent||'' };
    window.ADM_FICHAS_PRUEBA=true; renderAdmin();
    var box=document.getElementById('adm-fichas'), fb=box && box.querySelector('#gps-cam-bar'), sig=fb && fb.nextElementSibling;
    out.fichas=!!fb; out.fichasAntesDelTurno=!!(sig && sig.classList.contains('af-g')); out.fuera=!document.getElementById('adm-gps-ent').hidden;
    window.ADM_FICHAS_PRUEBA=false; renderAdmin();
    return out;
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('tabla: el cartel «2 pedidos de hoy sin camión: el GPS vio un camión en su puerta»', !r.hidden && /2 pedidos de hoy sin camión: el GPS vio un camión en su puerta/.test(r.txt), r.txt);
  chk('…cada uno con «→ lo llevó <camión · chofer>» y su «🚚 Asignar»', r.filas.join(',')==='s1,s2' && /CLIENTE S1 .*llegó 10:20 → lo llevó Foton nuevo · Luis Pierre/.test(r.txt) && /lo llevó Carry · Omar/.test(r.txt), r);
  chk('…«🚚 Asignar los 2» y la aclaración: propuesta, solo hoy', r.todos==='🚚 Asignar los 2' && /nada se asigna solo/.test(r.txt) && /días anteriores no queda guardado/.test(r.txt), r);
  chk('fichas: el cartel va adentro, antes del primer turno de hoy (y no arriba)', r.fichas && r.fichasAntesDelTurno && !r.fuera, r);

  console.log('\n── 4. «Asignar» uno ──');
  r = await ev(async () => {
    var b=document.querySelector('#gps-cam-bar .gps-cam-uno[data-id="s1"]'); b.click();
    await new Promise(res=>setTimeout(res, 80));
    var s1=findById('s1'), sv=window.__SAVES.filter(function(x){ return x.id==='s1'; });
    var bar=document.getElementById('gps-cam-bar');
    return { veh:s1.vehiculo, ch:s1.chofer, saves:window.__SAVES.length, sv:sv.length && (sv[0].vehiculo+'·'+sv[0].chofer), filas:bar ? [].map.call(bar.querySelectorAll('.gps-cam-f'), function(f){ return f.getAttribute('data-id'); }) : [],
      todos:!!document.getElementById('gps-cam-todos'), cola:getPending().filter(function(q){ return q.id==='s1'; }).length, txt:bar ? bar.innerText.replace(/\s+/g,' ') : '' };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('s1 queda con el Foton nuevo y Luis Pierre, y se guarda (uno solo)', r.veh==='Foton nuevo' && r.ch==='Luis Pierre' && r.saves===1 && r.sv==='Foton nuevo·Luis Pierre', r);
  chk('…por el camino durable: con el «sí» del servidor sale de la cola', r.cola===0, r.cola);
  chk('la propuesta de s1 se va; queda s2, sin «Asignar los N» (es uno)', r.filas.join(',')==='s2' && !r.todos && /1 pedido de hoy sin camión/.test(r.txt), r);

  console.log('\n── 5. «Asignar los N» ──');
  r = await ev(async () => {
    /* otro pedido sin camión que el Foton nuevo vio, y uno que mientras tanto recibió camión (no se toca) */
    var P=almUbic('ptf'), hoy=todayStr();
    STATE.push(Object.assign({}, findById('s3'), { id:'s4', oc:'11-899', cliente:'CLIENTE S4', maps:'https://www.google.com/maps?q='+(P.lat+0.2)+','+(P.lng+0.01) }));
    var D=JSON.parse(JSON.stringify(window.__DIA)); D.t=Date.now()+1000; D.u['6663CCP'].par.push(['13:00','13:15', P.lat+0.2, P.lng+0.01, ['s4'], 0, 10]);
    gpsDiaTomar(D); renderAdmin();
    var antes=(document.getElementById('gps-cam-todos')||{}).textContent||'';
    var s0=window.__SAVES.length;
    var rr=await gpsCamionAsignarTodos();
    await new Promise(res=>setTimeout(res, 80));
    var nuevos=window.__SAVES.slice(s0).map(function(x){ return x.id+'→'+x.vehiculo+'·'+x.chofer; }).sort();
    return { antes:antes, nuevos:nuevos, n:rr && rr.length, quedan:gpsCamionPropuestas().length, bar:!!document.getElementById('gps-cam-bar'), s3:findById('s3').vehiculo };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('el cartel dice «🚚 Asignar los 2» (s2 y s4)', r.antes==='🚚 Asignar los 2', r.antes);
  chk('asigna los 2: s2 → Carry · Omar, s4 → Foton nuevo · Luis Pierre; un guardado por pedido', r.n===2 && r.nuevos.join(',')==='s2→Carry·Omar,s4→Foton nuevo·Luis Pierre', r.nuevos);
  chk('…no queda ninguna propuesta y el cartel se va; s3 (no visto) sigue sin camión', r.quedan===0 && !r.bar && r.s3==='', r);

  console.log('\n── 6. Cierre de entregas ──');
  r = await ev(async () => {
    /* uno nuevo sin camión que el Carry vio */
    var P=almUbic('ptf');
    STATE.push(Object.assign({}, findById('s3'), { id:'s5', oc:'11-898', cliente:'CLIENTE S5', maps:'https://www.google.com/maps?q='+(P.lat+0.3)+','+(P.lng+0.01) }));
    var D=JSON.parse(JSON.stringify(gpsDiaCargar())); D.t=Number(D.t)+1000; D.u['6409TIG'].par.push(['13:30','13:40', P.lat+0.3, P.lng+0.01, ['s5'], 0, 10]);
    gpsDiaTomar(D);
    abrirCierreEntregas();
    var box=document.getElementById('modal-box');
    var fila=function(id){ var i=box.querySelector('.cie-ent-chk[data-id="'+id+'"]'); var row=i && i.closest('.cie-row'); return row ? row.innerText.replace(/\s+/g,' ') : null; };
    var out={ s5:fila('s5'), s3:fila('s3'), s1:fila('s1'), res:(box.querySelector('.cie-gps-res')||{}).innerText||'' };
    var s0=window.__SAVES.length, chk5=box.querySelector('.cie-ent-chk[data-id="s5"]').checked;
    box.querySelector('.cie-gps-cam-btn[data-id="s5"]').click();
    await new Promise(res=>setTimeout(res, 80));
    var box2=document.getElementById('modal-box');
    var i5=box2.querySelector('.cie-ent-chk[data-id="s5"]');
    out.tildo=!chk5 && !!i5 && !i5.checked;   // el botón está adentro del <label>: tocarlo NO tilda el pedido
    out.s5b=i5 ? i5.closest('.cie-row').innerText.replace(/\s+/g,' ') : null;
    out.veh=findById('s5').vehiculo; out.ch=findById('s5').chofer; out.saves=window.__SAVES.length-s0;
    out.abierto=!!box2.querySelector('.cie-ent');
    closeModal();
    return out;
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('la fila de s5 (sin camión, la vio el Carry) dice «sin camión · … · lo llevó Carry · Omar» con «🚚 Asignar»', r.s5 && /sin camión/.test(r.s5) && /· lo llevó Carry · Omar/.test(r.s5) && /🚚 Asignar/.test(r.s5), r.s5);
  chk('…la de s3 (no vista) y la de s1 (ya tiene camión) no', r.s3 && !/lo llevó/.test(r.s3) && r.s1 && !/lo llevó/.test(r.s1), [r.s3, r.s1]);
  chk('el resumen del GPS lo cuenta («1 sin camión: el GPS dice cuál lo llevó»)', /1 sin camión: el GPS dice cuál lo llevó/.test(r.res), r.res);
  chk('«Asignar» desde el cierre: Carry · Omar, un guardado, el cierre sigue abierto y la fila ya no lo propone', r.veh==='Carry' && r.ch==='Omar' && r.saves===1 && r.abierto && r.s5b && !/lo llevó/.test(r.s5b) && /Carry · Omar/.test(r.s5b), r);
  chk('…y tocar «Asignar» no tilda el pedido como entregado', r.tildo, r.tildo);

  console.log('\n── 7. Sin el día del GPS: nada ──');
  r = await ev(() => {
    STATE.push(Object.assign({}, findById('s3'), { id:'s6', oc:'11-897', cliente:'CLIENTE S6' }));
    GPS_DIA={ f:todayStr(), t:0, u:{} }; try{ localStorage.removeItem('me_gps_dia'); }catch(e){} GPS_VER++;
    renderAdmin();
    return { V:gpsCamionPropuestas().length, bar:!!document.getElementById('gps-cam-bar'), html:gpsCamionCierreHtml(findById('s3')) };
  });
  chk('sin GPS de hoy: ni propuestas, ni cartel, ni «lo llevó»', r.V===0 && !r.bar && r.html==='', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
