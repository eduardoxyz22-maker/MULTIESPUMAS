/* 📍 «✅ LOS QUE VIO EL GPS» DONDE LOGÍSTICA MARCA (05/11/2026, plan del jueves, item 106, §4ok-106).
   Logística marca los ✅ en Administración; lo del GPS solo estaba en el Cierre de entregas, que nadie abría.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Cada pedido de HOY que el GPS vio en la puerta dice «📍 Llegó HH:MM (GPS)» al lado de «Entregó»: en la tabla y en la ficha.
      Lo que no vio, lo de otro día y lo ya entregado no lo dicen.
   2. Arriba del día de hoy: «✅ Marcar entregados los N que vio el GPS» (en la tabla arriba de la lista; con las fichas, adentro, antes
      del primer turno de hoy). Mirar NO marca nada (dueño, 12/10: nada se marca ✅ solo).
   3. El botón abre la lista con todos tildados; se destilda lo que no se entregó; sin «¿Quién confirma?» no guarda.
   4. Confirmar = el camino del Cierre de entregas: relee la planilla, guarda con guardarDurable SOLO lo tildado, con eF = hoy y eQ = quién.
   5. Reprogramado mientras tanto (la relectura lo trae con otro día) → se saltea y se dice.
   6. Sin lectura: no marca nada, queda pendiente y se aplica sola con la próxima lectura buena (`me_cierre_pend`).
   7. Sin GPS de hoy: ni cartel ni «Llegó».
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 15:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_gps_entregados_adm.js */
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
    try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_CIERRE_PEND); localStorage.removeItem('me_cierre_quien'); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    var hoy=todayStr(), P=almUbic('ptf'), n=0;
    window.__P=P;
    var V=function(veh, o){ n++; return Object.assign({ id:'g'+n, oc:'11-'+(800+n), cliente:'CLIENTE '+n, fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', vehiculo:veh,
      chofer:veh?(VEHICULOS[veh]||[])[0]:'', zona:'Norte', direccion:'Calle '+n, productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true,
      entregado:false, maps:'https://www.google.com/maps?q='+(P.lat+0.02*n)+','+(P.lng+0.01), ts:1, fotos:[], rev:1 }, o||{}); };
    STATE=[ V('Foton nuevo'), V('Foton nuevo', { turno:'PM' }), V('Carry'), V('Foton nuevo', { entregado:true }), V('Foton nuevo', { fecha:proximoDiaEntrega() }) ];
    var pin=function(i){ return { lat:P.lat+0.02*i, lng:P.lng+0.01 }; };
    /* el camión 6663-CCP (Foton nuevo) se paró en la puerta de g1 (10:20-10:42), de g2 (11:05-11:20) y de g4 (ya entregado) */
    window.__DIA={ f:hoy, t:Date.now(), u:{ '6663CCP':{ s:'09:00', ev:[['09:00','sal','ptf',0]], par:[
      ['10:20','10:42', pin(1).lat, pin(1).lng, ['g1'], 0, 40],
      ['11:05','11:20', pin(2).lat, pin(2).lng, ['g2'], 0, 30],
      ['11:40','11:50', pin(4).lat, pin(4).lng, ['g4'], 0, 25] ] }, '6409TIG':{ s:'09:30', ev:[['09:30','sal','ptf',0]], par:[] } } };
    gpsDiaTomar(JSON.parse(JSON.stringify(window.__DIA)));
    window.__SAVES=[]; window.__LISTAS=0; window.__LISTA_CAMBIA=null;
    apiSave=function(rec){ window.__SAVES.push(JSON.parse(JSON.stringify(rec))); var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
    apiList=function(){ window.__LISTAS++; var L=JSON.parse(JSON.stringify(STATE)); if(window.__LISTA_CAMBIA) L=window.__LISTA_CAMBIA(L); return Promise.resolve({ ok:true, pedidos:L }); };
    QUICK_FILTER='todos'; ADM_HOY_DEF=false;
  });

  console.log('\n── 1. «📍 Llegó HH:MM (GPS)» al lado de «Entregó» ──');
  let r = await ev(() => {
    showView('admin'); renderAdmin();
    var fila=function(id){ var tr=[].filter.call(document.querySelectorAll('#tbl-pedidos tbody tr'), function(t){ return /'(g\d+)'/.exec(t.getAttribute('onclick')||'') && /'(g\d+)'/.exec(t.getAttribute('onclick'))[1]===id; })[0];
      return tr ? tr.querySelector('td').innerText.replace(/\s+/g,' ').trim() : null; };
    return { g1:fila('g1'), g2:fila('g2'), g3:fila('g3'), g4:fila('g4'), g5:fila('g5'), ll1:(function(){ var l=gpsLlegadaDe(findById('g1')); return l ? gpsHoraTxt(l.t0) : null; })() };
  });
  chk('el GPS vio el camión en la puerta de g1 a las 10:20 (gpsLlegadaDe)', r.ll1==='10:20', r);
  chk('tabla: g1 dice «📍 Llegó 10:20 (GPS)» en Acciones, al lado del 🚚', r.g1 && /🚚\s*📍 Llegó 10:20 \(GPS\)/.test(r.g1), r.g1);
  chk('tabla: g2 «📍 Llegó 11:05 (GPS)»', r.g2 && /📍 Llegó 11:05 \(GPS\)/.test(r.g2), r.g2);
  chk('…el que no vio (g3, Carry sin paradas) y el de mañana (g5) no lo dicen', r.g3!==null && !/Llegó/.test(r.g3) && r.g5!==null && !/Llegó/.test(r.g5), [r.g3, r.g5]);

  console.log('\n── 2. El cartel de arriba del día de hoy; mirar no marca nada ──');
  r = await ev(() => {
    var el=document.getElementById('adm-gps-ent');
    return { hidden:el.hidden, txt:el.innerText.replace(/\s+/g,' ').trim(), saves:window.__SAVES.length, ent:STATE.filter(function(p){ return p.entregado; }).map(function(p){ return p.id; }) };
  });
  chk('tabla: arriba de la lista «✅ Marcar entregados los 2 que vio el GPS» (g4 ya tenía ✅: no cuenta)', !r.hidden && /Marcar entregados los 2 que vio el GPS/.test(r.txt) && /puerta de 2 pedidos/.test(r.txt), r.txt);
  chk('⚠️ mirar no guarda ni marca nada (solo g4, que ya estaba)', r.saves===0 && r.ent.join(',')==='g4', r);

  r = await ev(() => {
    window.ADM_FICHAS_PRUEBA=true; renderAdmin();
    var box=document.getElementById('adm-fichas'), bar=box.querySelector('#adm-gps-bar');
    var sig=bar ? bar.nextElementSibling : null, f1=box.querySelector('.af-f[data-pid="g1"]'), f3=box.querySelector('.af-f[data-pid="g3"]'), f4=box.querySelector('.af-f[data-pid="g4"]');
    var entBtn=function(f){ return f ? [].filter.call(f.querySelectorAll('.af-tb button'), function(b){ return /Entregó/.test(b.innerText); })[0] : null; };
    var out={ fuera:!document.getElementById('adm-gps-ent').hidden, bar:!!bar, sig:sig ? sig.innerText.replace(/\s+/g,' ').trim() : '', primero:!!(bar && box.querySelector('.af-g')===sig),
      f1:f1 ? (f1.querySelector('.af-gps')||{}).innerText : null, b1:(entBtn(f1)||{}).className||'', f3:f3 ? !!f3.querySelector('.af-gps') : null, b3:(entBtn(f3)||{}).className||'',
      f4cls:(entBtn(f4)||{}).className||'' };
    window.ADM_FICHAS_PRUEBA=false; renderAdmin();
    return out;
  });
  chk('fichas: el cartel va ADENTRO, justo antes del primer turno de hoy (y no repetido arriba)', r.bar && !r.fuera && /🌅 Mañana/.test(r.sig) && r.primero, r);
  chk('fichas: la de g1 dice «📍 Llegó 10:20 (GPS)» y su «Entregó» queda resaltado', r.f1==='📍 Llegó 10:20 (GPS)' && /\bgps\b/.test(r.b1), r);
  chk('…la de g3 no; la de g4 (entregada) sigue con «Entregó» prendido', r.f3===false && !/\bgps\b/.test(r.b3) && /\bon\b/.test(r.f4cls), r);

  console.log('\n── 3. La lista para destildar; «¿Quién confirma?» ──');
  r = await ev(async () => {
    document.getElementById('adm-gps-btn').click();
    await new Promise(res=>setTimeout(res, 50));
    var box=document.getElementById('modal-box'), chks=[].map.call(box.querySelectorAll('.agp-chk'), function(c){ return c.getAttribute('data-id')+':'+c.checked; });
    var txt=box.innerText;
    var c2=box.querySelector('.agp-chk[data-id="g2"]'); c2.click();
    var btn=document.getElementById('adm-gps-confirmar').textContent;
    document.getElementById('adm-gps-quien').value='';
    var rq=await admGpsEntConfirmar();
    return { chks:chks, txt:txt, btn:btn, rq:rq, saves:window.__SAVES.length, abierto:!!document.getElementById('adm-gps-confirmar') };
  });
  chk('la lista trae g1 y g2, los dos tildados, con lo que vio el GPS', r.chks.join(',')==='g1:true,g2:true' && /el camión estuvo ahí de 10:20 a 10:42/.test(r.txt), r);
  chk('destildar g2 → «✅ Confirmar 1 entrega»', r.btn==='✅ Confirmar 1 entrega', r.btn);
  chk('sin «¿Quién confirma?» no guarda nada', r.rq===null && r.saves===0 && r.abierto, r);

  console.log('\n── 4. Confirmar: relee y guarda SOLO lo tildado, como el cierre ──');
  r = await ev(async () => {
    document.getElementById('adm-gps-quien').value='Ernesto';
    var l0=window.__LISTAS, rq=await admGpsEntConfirmar();
    await new Promise(res=>setTimeout(res, 50));
    var g1=findById('g1'), g2=findById('g2'), s=window.__SAVES;
    return { leyo:window.__LISTAS>l0, hechos:rq && rq.hechos, ids:s.map(function(x){ return x.id; }), ent1:g1.entregado, ent2:g2.entregado,
      eF:(s[0] && s[0].productos[0].eF), eQ:(s[0] && s[0].productos[0].eQ), eT:!!(s[0] && s[0].productos[0].eT), recEnt:s[0] && s[0].entregado,
      quien:cierreEntQuien(), res:(document.getElementById('modal-box')||{}).innerText||'' };
  });
  chk('relee la planilla antes de marcar', r.leyo, r);
  chk('guarda UNO: g1 con ✅ (g2 destildado no se toca)', r.hechos===1 && r.ids.join(',')==='g1' && r.ent1===true && r.ent2===false && r.recEnt===true, r);
  chk('…con el registro del cierre adentro del producto: eF = hoy (05/11), eQ = Ernesto, eT', r.eF==='2026-11-05' && r.eQ==='Ernesto' && r.eT, r);
  chk('…el nombre queda recordado y la ventana dice «1 entrega confirmada»', r.quien==='Ernesto' && /1 entrega confirmada/.test(r.res), r.res.slice(0,200));

  r = await ev(() => { closeModal(); renderAdmin(); var el=document.getElementById('adm-gps-ent'); return { hidden:el.hidden, txt:el.innerText.replace(/\s+/g,' ') }; });
  chk('después, el cartel cuenta solo el que falta (g2): «Marcar entregado el 1 que vio el GPS»', !r.hidden && /Marcar entregado el 1 que vio el GPS/.test(r.txt) && /puerta de 1 pedido de hoy que todavía no tiene ✅/.test(r.txt), r.txt);

  console.log('\n── 5. Reprogramado mientras tanto: se saltea ──');
  r = await ev(async () => {
    window.__SAVES=[];
    admGpsEntAbrir(); document.getElementById('adm-gps-quien').value='Ernesto';
    window.__LISTA_CAMBIA=function(L){ L.forEach(function(p){ if(p.id==='g2'){ p.fecha=proximoDiaEntrega(); p.rev=5; } }); return L; };
    var rq=await admGpsEntConfirmar(); window.__LISTA_CAMBIA=null;
    return { hechos:rq && rq.hechos, saltados:rq && rq.saltados, saves:window.__SAVES.length, ent2:findById('g2').entregado, res:(document.getElementById('modal-box')||{}).innerText||'' };
  });
  chk('g2 reprogramado desde otro equipo: no se marca y se dice por qué', r.hechos===0 && r.saltados===1 && r.saves===0 && r.ent2===false && /lo reprogramaron/.test(r.res), r);

  console.log('\n── 6. Sin lectura: queda pendiente y se aplica sola después ──');
  r = await ev(async () => {
    closeModal(); window.__SAVES=[];
    var g2=findById('g2'); g2.fecha=todayStr(); upsert(g2);
    admGpsEntAbrir(); document.getElementById('adm-gps-quien').value='Ernesto';
    CONNECTED=false;
    var rq=await admGpsEntConfirmar();
    var pend=cierreEntPendiente(), ent=findById('g2').entregado, saves=window.__SAVES.length;
    CONNECTED=true; await refrescarEstadoYa(); await new Promise(res=>setTimeout(res, 80));
    return { pendiente:rq && rq.pendiente, pend:pend && pend.ids, ent:ent, saves:saves, despues:findById('g2').entregado, savesD:window.__SAVES.map(function(x){ return x.id; }), quedo:!!cierreEntPendiente() };
  });
  chk('sin señal no marca nada: queda pendiente en el aparato', r.pendiente===true && (r.pend||[]).join(',')==='g2' && r.ent===false && r.saves===0, r);
  chk('…con la próxima lectura buena se aplica sola (g2 ✅, guardado) y se borra el pendiente', r.despues===true && r.savesD.join(',')==='g2' && !r.quedo, r);

  console.log('\n── 7. Sin GPS de hoy: nada ──');
  r = await ev(() => {
    closeModal();
    GPS_DIA={ f:todayStr(), t:Date.now()+5000, u:{} }; try{ localStorage.setItem(GPS_DIA_LS, JSON.stringify(GPS_DIA)); }catch(e){} GPS_VER++;
    STATE.push({ id:'g9', oc:'11-899', cliente:'CLIENTE 9', fecha:todayStr(), turno:'AM', vendedor:'Mirian Salazar', vehiculo:'Foton nuevo', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1 }], entregado:false, ts:1 });
    renderAdmin();
    return { hidden:document.getElementById('adm-gps-ent').hidden, tabla:document.getElementById('tbl-pedidos').innerText.indexOf('Llegó')>=0, vio:admGpsVio().length };
  });
  chk('sin el día del GPS: ni cartel ni «Llegó»', r.hidden && !r.tabla && r.vio===0, r);

  chk('sin errores de la página', !errores.length, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
