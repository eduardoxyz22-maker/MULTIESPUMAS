/* 🚚 «SALIÓ»: EL CAMIÓN Y EL ✅ DE LO QUE LLEVA, EN UN TOQUE (15/11/2026, mejora 312; dueño: «312»).
   Del 12 al 14/11 solo 2 de 53 entregas tenían camión anotado y el ✅ se ponía de a uno con «Entregó». Arriba de «Hoy», un botón por
   camión: abre lo de ese turno sin ✅ (tildado lo que tiene ese camión o lo que el GPS o la zona le ponen) y un toque pone el ✅, el
   camión, el chofer de ese día y la hora de salida. «Entregó» en una ficha sin camión pregunta primero en cuál salió.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `SALIO_PRUEBA` nada cambia: la barra no sale y «Entregó» marca directo, como siempre.
   2. La barra: un botón por camión con su chofer de hoy y cuántos lleva sin ✅, y «✅ Todo el turno»; mirar no guarda nada.
   3. «🚚 Salió el Foton nuevo»: tildado lo suyo (c1), lo que el GPS le pone (s1) y lo que la zona le pone (z1); sin camión (s3) y lo de
      la tarde (pm1), destildados. El botón dice cuántos y la hora; el resumen dice qué va a marcar.
   4. Confirmar (con s3 y pm1 tildados): ✅ en los 5 con su registro del día, camión + chofer de hoy (Luis Pierre, rotan) en los que no
      tenían, pm1 pasa a la mañana con `adelanto` y `forzar`, y el camión queda «salió 10:00». Nada más se tocó.
   5. Un camión que el GPS ya vio salir no recibe otra hora a mano.
   6. Sin lectura de la planilla no se marca nada.
   7. «Entregó» en una ficha sin camión: pregunta (sin guardar), elegir el camión lo guarda junto con el ✅ (un guardado), «Lo retiró el
      cliente / sin camión» marca sin camión, Cancelar no toca nada; desde la ficha grande vuelve a la ficha.
   8. «✅ Todo el turno»: cada pedido con su camión, el sin camión con su selector (elegir lo tilda), lo que retira el cliente aparte;
      confirmar pone el camión elegido y no anota ninguna salida.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_salio_camion.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  page.__resp=[]; page.on('dialog', d => { const r=page.__resp.length?page.__resp.shift():true; r?d.accept():d.dismiss(); });
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const armar = () => ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_CIERRE_PEND); localStorage.removeItem('me_gps_dia'); localStorage.removeItem('me_adelanto_hecho'); }catch(e){}
    ADELANTO_MEM={};
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    var hoy=todayStr(), P=almUbic('ptf'), n=0;
    var pin=function(i){ return { lat:P.lat+0.02*i, lng:P.lng+0.01 }; };
    var V=function(id, veh, i, o){ n++; return Object.assign({ id:id, oc:'11-'+(800+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', vehiculo:veh,
      chofer:veh?(VEHICULOS[veh]||[])[0]:'', zona:'Norte', direccion:'Calle '+n, productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true,
      entregado:false, maps:'https://www.google.com/maps?q='+pin(i).lat+','+pin(i).lng, ts:1, fotos:[], rev:3 }, o||{}); };
    STATE=[
      V('c1', 'Foton nuevo', 1, { chofer:'Luis Pierre' }),                                   // del Foton nuevo (hoy lo maneja Luis Pierre)
      V('s1', '', 2, { zona:'Urbari' }),                                                      // sin camión: el GPS vio al Foton nuevo en su puerta
      V('z1', '', 1, { zona:'Norte' }),                                                       // sin camión: la zona («ya va a Norte»)
      V('s3', '', 15, { zona:'Plan 3000' }),                                                  // sin camión, lejos de todo: nadie lo propone
      V('w1', 'Foton encarpado', 5, { zona:'Centro' }),                                       // de otro camión
      V('pm1', 'Foton nuevo', 3, { turno:'PM', zona:'Norte', chofer:'Luis Pierre' }),         // de la tarde, en el Foton nuevo
      V('pm2', '', 16, { turno:'PM', zona:'Plan 3000' }),                                     // de la tarde, sin camión
      V('e1', 'Foton nuevo', 4, { entregado:true }),                                          // ya entregado
      V('r1', '', 7, { observaciones:'EL CLIENTE RECOGE DE FABRICA', zona:'Centro' }),        // lo retira el cliente
      V('t1', '', 6, { direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA' }),               // venta de tienda
      V('o1', 'Foton nuevo', 8, { fecha:proximoDiaEntrega() })                                // otro día
    ];
    window.__DIA={ f:hoy, t:Date.now(), u:{
      '6663CCP':{ ev:[], par:[ ['09:20','09:30', pin(1).lat, pin(1).lng, ['c1'], 0, 20], ['09:40','09:50', pin(2).lat, pin(2).lng, ['s1'], 0, 30] ] },
      '6409TIG':{ s:'09:30', ev:[['09:30','sal','ptf',0]], par:[] } } };
    gpsDiaTomar(JSON.parse(JSON.stringify(window.__DIA)));
    window._env=[]; window.__falla=false;
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); window._env.push(c);
      if(c.action==='save'){ var p=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, version:'2026-11-14-a', pedido:p, mode:'update', ahora:Date.now() }); }
      return Promise.resolve({ ok:true, version:'2026-11-14-a' }); };
    apiList=function(){ if(window.__falla) return Promise.reject(new Error('Failed to fetch')); return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)).concat([{ id:'__carga_chk__', observaciones:textoCargaChk(CARGA_CHK), rev:(REESCRITA_REV&&REESCRITA_REV['__carga_chk__'])||1 }]) }); };
    CARGA_CHK={}; CARGA_CAMBIOS={};
    QUICK_FILTER='todos'; ADM_HOY_DEF=false;
    showView('admin');
  });
  const saves = () => ev(() => window._env.filter(function(c){ return c.action==='save' && String(c.pedido.id).indexOf('__')!==0; }).map(function(c){
    var p=c.pedido; return p.id+'|ent='+(p.entregado?1:0)+'|'+(p.vehiculo||'-')+'|'+(p.chofer||'-')+'|'+p.turno+'|adel='+(c.adelanto||0)+'|forzar='+(c.forzar?1:0); }));

  await armar(); await page.waitForTimeout(200);

  console.log('\n── 1. Sin SALIO_PRUEBA: nada cambia ──');
  let r = await ev(() => {
    renderAdmin();
    var el=document.getElementById('adm-salio');
    quickEntregado('s3');
    var abierta=document.getElementById('modal').classList.contains('on') && /¿En qué camión salió\?/.test(document.getElementById('modal-box').innerText);
    return { hidden:!el || el.hidden, ent:findById('s3').entregado, abierta:abierta };
  });
  chk('la barra «¿Salió un camión?» no aparece', r.hidden, r);
  chk('«Entregó» en una ficha sin camión marca directo, sin preguntar', r.ent===true && !r.abierta, r);
  await page.waitForTimeout(250);

  await armar(); await page.waitForTimeout(200);
  console.log('\n── 2. La barra de arriba de «Hoy» ──');
  r = await ev(() => {
    window.SALIO_PRUEBA=true; window._env=[];
    renderAdmin();
    var el=document.getElementById('adm-salio');
    var bts=[].map.call(el.querySelectorAll('.sal-cam'), function(b){ return b.innerText.replace(/\s+/g,' ').trim(); });
    var tu=[].map.call(el.querySelectorAll('.sal-tu button'), function(b){ return b.innerText.trim()+(b.classList.contains('on')?'*':''); });
    return { vis:!el.hidden, bts:bts, tu:tu, pie:(el.querySelector('.sal-pie')||{}).innerText||'', env:window._env.length };
  });
  chk('se ve, con un botón por camión y «✅ Todo el turno»', r.vis && r.bts.length===5 && /Salió el Carry/.test(r.bts.join('|')) && /Todo el turno/.test(r.bts[4]), r.bts);
  chk('el Foton nuevo: su chofer de hoy (Luis Pierre), 3 sin ✅ (c1, el que vio el GPS y el de su zona) y el ya entregado', /Salió el Foton nuevo ?Luis Pierre · 3 pedidos sin ✅ ?✅ 1 ya entregado/.test(r.bts.join('|')), r.bts);
  chk('el Carry: el GPS ya lo vio salir a las 09:30', /Salió el Carry.*salió 09:30/.test(r.bts.join('|')), r.bts);
  chk('el turno: mañana (5 sin ✅, sin contar lo que retira el cliente) elegido · tarde 2', r.tu[0]==='🌅 Mañana · 5*' && r.tu[1]==='🌆 Tarde · 2', r.tu);
  chk('avisa el que no tiene camión ni propuesta', /1 pedido de la mañana sin camión/.test(r.pie), r.pie);
  chk('mirar no guarda nada', r.env===0, r.env);

  console.log('\n── 3. «🚚 Salió el Foton nuevo» ──');
  r = await ev(() => {
    salioAbrir('Foton nuevo');
    var box=document.getElementById('modal-box');
    var chk={}; [].forEach.call(box.querySelectorAll('.sal-chk'), function(c){ chk[c.getAttribute('data-id')]=c.checked; });
    return { tit:(box.querySelector('h3')||{}).innerText, chk:chk, btn:document.getElementById('sal-ok').innerText, que:document.getElementById('sal-que').innerText, txt:box.innerText, env:window._env.length };
  });
  chk('título «🚚 Salió el Foton nuevo»', r.tit==='🚚 Salió el Foton nuevo', r.tit);
  chk('tildados: c1 (suyo), s1 (GPS) y z1 (zona); destildados: s3 (sin camión) y pm1 (tarde)', r.chk.c1 && r.chk.s1 && r.chk.z1 && r.chk.s3===false && r.chk.pm1===false, r.chk);
  chk('no aparecen: el de otro camión, el entregado, el que retira, la venta de tienda, el de otro día, el de la tarde sin camión', !('w1' in r.chk) && !('e1' in r.chk) && !('r1' in r.chk) && !('t1' in r.chk) && !('o1' in r.chk) && !('pm2' in r.chk), Object.keys(r.chk));
  chk('dice de dónde sale cada propuesta (GPS / zona)', /el GPS lo vio en la puerta/.test(r.txt) && /ya va a Norte/.test(r.txt), r.txt.slice(0,400));
  chk('el botón: «✅ Salieron estos 3 con el Foton nuevo · 10:00»', r.btn==='✅ Salieron estos 3 con el Foton nuevo · 10:00', r.btn);
  chk('el resumen dice qué va a marcar (✅, camión y chofer en 2, la salida)', /Entregado en los 3/.test(r.que) && /camión Foton nuevo y chofer Luis Pierre en 2/.test(r.que) && /Salió 10:00/.test(r.que), r.que);
  chk('abrir no guarda nada', r.env===0, r.env);

  console.log('\n── 4. Confirmar ──');
  r = await ev(async () => {
    salioTildar('s3', true); salioTildar('pm1', true);
    var que=document.getElementById('sal-que').innerText, btn=document.getElementById('sal-ok').innerText;
    var res=await salioConfirmar();
    await new Promise(function(ok){ setTimeout(ok, 250); });
    var hoy=todayStr(), f=function(id){ var p=findById(id); return { ent:!!p.entregado, v:p.vehiculo||'', ch:p.chofer||'', t:p.turno, eF:(p.productos[0]||{}).eF||'', eT:!!(p.productos[0]||{}).eT }; };
    return { que:que, btn:btn, res:{ leyo:res.leyo, hechos:res.hechos, marco:res.marco, ad:res.adelantados }, salio:camionSalio(hoy, 'Foton nuevo'), salioCarry:salioClave(hoy,'Carry'),
      c1:f('c1'), s1:f('s1'), z1:f('z1'), s3:f('s3'), pm1:f('pm1'), w1:f('w1'), pm2:f('pm2'), titRes:(document.querySelector('#modal-box h3')||{}).innerText, resTxt:document.getElementById('modal-box').innerText };
  });
  chk('antes de confirmar, el resumen avisa que 1 de la tarde pasa a la mañana', /1 de la tarde pasa a la mañana/.test(r.que) && /Salieron estos 5/.test(r.btn), r.que);
  chk('releyó y marcó 5, pasó 1 a la mañana y anotó la salida', r.res.leyo && r.res.hechos===5 && r.res.ad===1 && r.res.marco, r.res);
  chk('✅ en c1, s1, z1, s3 y pm1, con el registro del día (eF = hoy)', ['c1','s1','z1','s3','pm1'].every(function(k){ return r[k].ent && r[k].eF==='2026-11-05' && r[k].eT; }), r);
  chk('camión Foton nuevo y chofer Luis Pierre (el de hoy, no el primero de la lista) en s1, z1 y s3', ['s1','z1','s3'].every(function(k){ return r[k].v==='Foton nuevo' && r[k].ch==='Luis Pierre'; }), [r.s1, r.z1, r.s3]);
  chk('pm1 pasó a la mañana', r.pm1.t==='AM', r.pm1);
  chk('w1 y pm2 no se tocaron', !r.w1.ent && !r.pm2.ent && r.pm2.v==='', [r.w1, r.pm2]);
  chk('«🚚 Salió 10:00» en el Foton nuevo (el GPS no lo había visto salir); el Carry no se tocó', r.salio==='10:00' && r.salioCarry==='', r);
  chk('la ventana del resultado: «🚚 Salió el Foton nuevo · 10:00» con los 5', /Salió el Foton nuevo · 10:00/.test(r.titRes) && /5 entregas con ✅/.test(r.resTxt) && /Pasaron a la mañana/.test(r.resTxt), r.titRes);
  let s = await saves();
  chk('pm1 se guardó primero con adelanto y forzar (el bot le avisa que va en camino) y después con el ✅', s.indexOf('pm1|ent=0|Foton nuevo|Luis Pierre|AM|adel=1|forzar=1')>=0 && s.indexOf('pm1|ent=1|Foton nuevo|Luis Pierre|AM|adel=0|forzar=0')>s.indexOf('pm1|ent=0|Foton nuevo|Luis Pierre|AM|adel=1|forzar=1'), s);
  chk('un guardado por pedido con el ✅ y el camión juntos (s1, z1, s3)', ['s1','z1','s3'].every(function(k){ return s.filter(function(x){ return x.indexOf(k+'|')===0; }).length===1 && s.indexOf(k+'|ent=1|Foton nuevo|Luis Pierre|AM|adel=0|forzar=0')>=0; }), s);
  chk('ningún otro pedido se guardó', s.every(function(x){ return /^(c1|s1|z1|s3|pm1)\|/.test(x); }), s);
  r = await ev(() => { var p=findById('s1'); var h=(p.productos[0]||{}).eH||[]; return { d:(h[h.length-1]||{}).d||'(sin historia: ENT_HIST apagado en Playwright)' }; });
  chk('la marca dice desde dónde (si la historia del ✅ está prendida)', /Salió el Foton nuevo|sin historia/.test(r.d), r.d);

  console.log('\n── 5. Un camión que el GPS ya vio salir ──');
  r = await ev(async () => {
    closeModal(); window._env=[];
    findById('w1').vehiculo='Carry'; findById('w1').chofer='Omar';
    salioAbrir('Carry');
    var res=await salioConfirmar(); await new Promise(function(ok){ setTimeout(ok, 200); });
    return { hechos:res.hechos, marco:res.marco, clave:salioClave(todayStr(),'Carry'), salio:camionSalio(todayStr(),'Carry'), w1:findById('w1').entregado };
  });
  chk('marca el ✅ de w1 pero no anota otra hora: sigue la del GPS (09:30)', r.hechos===1 && r.w1 && !r.marco && r.clave==='' && r.salio==='09:30', r);

  console.log('\n── 6. Sin lectura de la planilla, nada ──');
  await armar(); await page.waitForTimeout(150);
  r = await ev(async () => {
    window.SALIO_PRUEBA=true; window._env=[];
    salioAbrir('Foton nuevo'); window.__falla=true;
    var res=await salioConfirmar(); await new Promise(function(ok){ setTimeout(ok, 200); });
    window.__falla=false;
    return { res:res, c1:findById('c1').entregado, s1:findById('s1').vehiculo, saves:window._env.filter(function(c){ return c.action==='save'; }).map(function(c){ return c.pedido.id; }), toast:(document.getElementById('toast')||{}).innerText||'' };
  });
  chk('no marca nada ni guarda, y lo dice', r.res && r.res.leyo===false && !r.c1 && r.s1==='' && r.saves.filter(function(x){ return String(x).indexOf('__')!==0; }).length===0 && /no se marcó nada/.test(r.toast), r);

  console.log('\n── 7. «Entregó» en una ficha sin camión ──');
  await armar(); await page.waitForTimeout(150);
  r = await ev(() => {
    window.SALIO_PRUEBA=true; window._env=[];
    quickEntregado('pm2');
    var box=document.getElementById('modal-box'), abierta=document.getElementById('modal').classList.contains('on');
    var bts=[].map.call(box.querySelectorAll('.sal-pb'), function(b){ return b.getAttribute('data-v')+(b.classList.contains('on')?'*':''); });
    return { abierta:abierta, tit:(box.querySelector('h3')||{}).innerText, bts:bts, ent:findById('pm2').entregado, env:window._env.length };
  });
  chk('pregunta «¿En qué camión salió?» con un botón por camión, sin guardar nada', r.abierta && r.tit==='🚚 ¿En qué camión salió?' && r.bts.length===4 && !r.ent && r.env===0, r);
  r = await ev(async () => {
    var b=document.querySelector('#modal-box .sal-pb[data-v="Carry"]'); b.click();
    await new Promise(function(ok){ setTimeout(ok, 250); });
    var p=findById('pm2'), sv=window._env.filter(function(c){ return c.action==='save'; });
    return { ent:p.entregado, v:p.vehiculo, ch:p.chofer, n:sv.length, last:sv.length?{ ent:sv[0].pedido.entregado, v:sv[0].pedido.vehiculo, ch:sv[0].pedido.chofer }:null, abierta:document.getElementById('modal').classList.contains('on') };
  });
  chk('elegir el Carry: ✅ + camión Carry + chofer Omar (sin pedidos hoy: el primero), en UN guardado', r.ent && r.v==='Carry' && r.ch==='Omar' && r.n===1 && r.last.ent && r.last.v==='Carry' && r.last.ch==='Omar', r);
  r = await ev(async () => {
    window._env=[];
    quickEntregado('s3'); var b=[].filter.call(document.querySelectorAll('#modal-box .modal-actions button'), function(x){ return /Cancelar/.test(x.innerText); })[0]; b.click();
    await new Promise(function(ok){ setTimeout(ok, 150); });
    var can={ ent:findById('s3').entregado, v:findById('s3').vehiculo, n:window._env.length, abierta:document.getElementById('modal').classList.contains('on') };
    quickEntregado('s3'); var b2=[].filter.call(document.querySelectorAll('#modal-box .modal-actions button'), function(x){ return /Lo retiró el cliente/.test(x.innerText); })[0]; b2.click();
    await new Promise(function(ok){ setTimeout(ok, 250); });
    return { can:can, ent:findById('s3').entregado, v:findById('s3').vehiculo, n:window._env.filter(function(c){ return c.action==='save'; }).length };
  });
  chk('Cancelar: no toca nada', !r.can.ent && r.can.v==='' && r.can.n===0 && !r.can.abierta, r.can);
  chk('«Lo retiró el cliente / sin camión»: marca ✅ sin camión', r.ent && r.v==='' && r.n===1, r);
  r = await ev(async () => {
    window._env=[];
    showPedidoModal('z1'); toggleEntregado('z1');
    var preg=/¿En qué camión salió\?/.test(document.getElementById('modal-box').innerText);
    var on=[].map.call(document.querySelectorAll('#modal-box .sal-pb.on'), function(b){ return b.getAttribute('data-v'); });
    document.querySelector('#modal-box .sal-pb[data-v="Foton nuevo"]').click();
    await new Promise(function(ok){ setTimeout(ok, 250); });
    var p=findById('z1');
    return { preg:preg, on:on, ent:p.entregado, v:p.vehiculo, ch:p.chofer, ficha:document.getElementById('modal').classList.contains('on') && !/¿En qué camión salió\?/.test(document.getElementById('modal-box').innerText) };
  });
  chk('desde la ficha grande: pregunta con el de la zona marcado, guarda y vuelve a la ficha', r.preg && r.on.join()==='Foton nuevo' && r.ent && r.v==='Foton nuevo' && r.ch==='Luis Pierre' && r.ficha, r);

  console.log('\n── 8. «✅ Todo el turno» ──');
  await armar(); await page.waitForTimeout(150);
  r = await ev(() => {
    window.SALIO_PRUEBA=true; window._env=[];
    closeModal(); salioAbrir('');
    var box=document.getElementById('modal-box');
    var chk={}; [].forEach.call(box.querySelectorAll('.sal-chk'), function(c){ chk[c.getAttribute('data-id')]=c.checked; });
    var sels=[].map.call(box.querySelectorAll('.sal-cam-sel'), function(s){ return s.getAttribute('data-id')+'='+s.value; });
    return { tit:(box.querySelector('h3')||{}).innerText, chk:chk, sels:sels, txt:box.innerText };
  });
  chk('título «✅ Lo que salió a la mañana»', r.tit==='✅ Lo que salió a la mañana', r.tit);
  chk('tildado lo que tiene camión o propuesta (c1, w1, s1, z1); s3 y lo que retira (r1) sin tildar; lo de la tarde no está', r.chk.c1 && r.chk.w1 && r.chk.s1 && r.chk.z1 && r.chk.s3===false && r.chk.r1===false && !('pm1' in r.chk), r.chk);
  chk('los sin camión con su selector (el del GPS ya elegido)', r.sels.indexOf('s1=Foton nuevo')>=0 && r.sels.indexOf('z1=Foton nuevo')>=0 && r.sels.indexOf('s3=')>=0, r.sels);
  chk('lo que retira el cliente va aparte', /Lo retira el cliente · 1/.test(r.txt), r.txt.slice(-500));
  r = await ev(async () => {
    salioCamElegir('s3', 'Carry');
    var tild=document.querySelector('#modal-box .sal-chk[data-id="s3"]').checked, btn=document.getElementById('sal-ok').innerText;
    var res=await salioConfirmar(); await new Promise(function(ok){ setTimeout(ok, 250); });
    var hoy=todayStr();
    return { tild:tild, btn:btn, hechos:res.hechos, marco:res.marco, s3:findById('s3').vehiculo+'|'+findById('s3').chofer, w1:findById('w1').entregado, r1:findById('r1').entregado,
      salio:['Foton nuevo','Foton encarpado','Carry'].map(function(v){ return salioClave(hoy, v); }).join(''), tit:(document.querySelector('#modal-box h3')||{}).innerText };
  });
  chk('elegir el camión de s3 lo tilda; el botón dice «Confirmar 5 entregas de la mañana»', r.tild && r.btn==='✅ Confirmar 5 entregas de la mañana', r);
  chk('confirma 5, s3 con el Carry y su chofer, lo que retira no se tocó', r.hechos===5 && r.s3==='Carry|Omar' && r.w1 && !r.r1, r);
  chk('«Todo el turno» no anota la salida de ningún camión', !r.marco && r.salio==='', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
